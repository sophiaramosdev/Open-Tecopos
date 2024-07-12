import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import Person from "../../database/models/person";
import BusinessBranch from "../../database/models/businessBranch";
import PersonAccessRecord from "../../database/models/personAccessRecord";
import Area from "../../database/models/area";
import moment from "moment";
import Image from "../../database/models/image";
import Role from "../../database/models/role";
import ConfigurationKey from "../../database/models/configurationKey";
import PersonPost from "../../database/models/personPost";
import { getBaseReferenceOpenAndCloseAt } from "../../helpers/utils";
import { getAllBranchBusiness } from "../helpers/utils";
import PersonCategory from "../../database/models/personCategory";
import Business from "../../database/models/business";
import {
    getAreaCache,
    getBusinessConfigCache,
} from "../../helpers/redisStructure";

export const getLastMonthUserAccessRecords = async (
    req: any,
    res: Response
) => {
    try {
        const { barCode, areaId } = req.body;

        //Checking area
        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "ACCESSPOINT") {
            return res.status(400).json({
                message: `El área introducida no es de tipo Punto de acceso.`,
            });
        }

        //Obtaining all branch business if exist
        let moreBusiness: Array<number> = [area.businessId];
        const branches = await BusinessBranch.findAll({
            where: {
                businessBaseId: area.businessId,
            },
        });

        if (branches.length !== 0) {
            moreBusiness = moreBusiness.concat(
                branches.map(item => item.branchId)
            );
        }

        //Found person
        const person = await Person.findOne({
            where: {
                barCode,
                businessId: moreBusiness,
            },
        });

        if (!person) {
            return res.status(404).json({
                message: `La persona no fue encontrada, por favor consulte al administrador.`,
            });
        }

        const now = moment().endOf("day");
        const lastMonth = moment().subtract(1, "months").startOf("day");

        //Obtaining las registry
        const accessRecords = await PersonAccessRecord.scope(
            "to_return"
        ).findAll({
            where: {
                personId: person.id,
                createdAt: {
                    [Op.between]: [lastMonth.toDate(), now.toDate()],
                },
            },
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(accessRecords);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const registerAccess = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { barCode, areaId, managerBarCode } = req.body;
        // const user: User = req.user;

        let registeredById = 1; //Tecobot

        //Checking area
        const area = await getAreaCache(areaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "ACCESSPOINT") {
            t.rollback();
            return res.status(400).json({
                message: `El área introducida no es de tipo Punto de acceso.`,
            });
        }

        //Obtaining all branch business if exist
        let moreBusiness: Array<number> = [area.businessId];
        const branches = await BusinessBranch.findAll({
            where: {
                businessBaseId: area.businessId,
            },
        });

        if (branches.length !== 0) {
            moreBusiness = moreBusiness.concat(
                branches.map(item => item.branchId)
            );
        }

        //Found person
        const person = await Person.findOne({
            where: {
                barCode,
                businessId: moreBusiness,
            },
        });

        if (!person) {
            t.rollback();
            return res.status(404).json({
                message: `La persona no fue encontrada, por favor consulte al administrador.`,
            });
        }

        //Open and close dates
        const configurations = await getBusinessConfigCache(person.businessId);

        const enforce_business_open_close =
            configurations.find(
                item => item.key === "enforce_business_open_close"
            )?.value === "true";
        const business_startsat_working_hours = configurations.find(
            item => item.key === "business_startsat_working_hours"
        )?.value;
        const business_endsat_working_hours = configurations.find(
            item => item.key === "business_endsat_working_hours"
        )?.value;

        const maximum_day_working_hours =
            configurations.find(
                item => item.key === "maximum_day_working_hours"
            )?.value || "12";
        const disable_reentry_in_business =
            configurations.find(
                item => item.key === "disable_reentry_in_business"
            )?.value === "true";
        const allowed_roles_to_allow_reentry = configurations
            .find(item => item.key === "allowed_roles_to_allow_reentry")
            ?.value.split(",") || ["ADMIN", "OWNER"];

        const now = moment(new Date());
        const result = getBaseReferenceOpenAndCloseAt(
            business_startsat_working_hours || "0",
            business_endsat_working_hours || "23",
            now.format("YYYY-MM-DD HH:mm")
        );

        //Validating access
        if (
            enforce_business_open_close &&
            (now.isAfter(result.workEndsAt) ||
                now.isBefore(result.workStartsAt))
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El negocio no se encuentra abierto. Horario disponible: ${result.workStartsAt.format(
                    "DD/MM hh:mm A"
                )} - ${result.workEndsAt.format("DD/MM hh:mm A")}`,
            });
        }

        //Obtaining las registry
        const accessRecords = await PersonAccessRecord.findAll({
            where: {
                personId: person.id,
            },
            order: [["createdAt", "DESC"]],
            limit: 3,
        });

        let action: "ENTRY" | "EXIT" = "ENTRY";
        if (accessRecords.length !== 0) {
            if (moment().diff(accessRecords[0].createdAt, "second") < 40) {
                t.rollback();
                return res.status(400).json({
                    message: `No puede enviar registros de acceso en menos de un minuto. Por favor, espere...`,
                });
            }

            let previousAction = accessRecords[0];

            action = previousAction.type === "ENTRY" ? "EXIT" : "ENTRY";

            if (
                enforce_business_open_close &&
                previousAction.type === "ENTRY" &&
                moment(previousAction.createdAt).isBefore(result.workStartsAt)
            ) {
                action = "ENTRY";

                //If person has work more than maximun_daily_working_hours
            } else if (
                previousAction.type === "ENTRY" &&
                now.diff(moment(previousAction.createdAt), "hour") >
                    Number(maximum_day_working_hours)
            ) {
                action = "ENTRY";
            }

            const foundLastEntry = accessRecords.find(
                item => item.type === "ENTRY"
            );

            if (
                action === "ENTRY" &&
                !!foundLastEntry &&
                now.diff(moment(foundLastEntry.createdAt), "hour") <= 20 &&
                disable_reentry_in_business
            ) {
                if (!managerBarCode) {
                    t.rollback();
                    return res.status(200).json({
                        message: `Está intentando acceder por segunda vez en el día al negocio y esto requiere autorización. Por favor valide su acceso.`,
                        lastAccess: `${person.firstName} ${
                            person.lastName || ``
                        }. Última entrada: ${moment(
                            foundLastEntry.createdAt
                        ).format("DD/MM hh:mm A")}`,
                    });
                }

                const managerPerson = await User.findOne({
                    include: [
                        {
                            model: Person,
                            where: {
                                barCode: managerBarCode,
                                businessId: moreBusiness,
                            },
                        },
                        {
                            model: Role,
                            as: "roles",
                            attributes: ["code", "name"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                });

                if (!managerPerson) {
                    t.rollback();
                    return res.status(400).json({
                        message: `No tiene privilegios para autorizar una reentrada.`,
                    });
                }

                const roles: Array<string> =
                    managerPerson.roles?.map(item => item.code) || [];

                if (
                    !allowed_roles_to_allow_reentry.some(item =>
                        roles.includes(item)
                    )
                ) {
                    t.rollback();
                    return res.status(400).json({
                        message: `No tiene privilegios para autorizar una reentrada.`,
                    });
                }

                registeredById = managerPerson.id;
            }
        }

        const access = PersonAccessRecord.build({
            personId: person.id,
            areaId,
            type: action,
            registeredById,
        });

        await access.save({ transaction: t });

        person.isInBusiness = action === "ENTRY" ? true : false;
        await person.save({ transaction: t });

        await t.commit();

        const to_return = await PersonAccessRecord.scope("to_return").findByPk(
            access.id
        );

        res.status(201).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newPersonAccess = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { personId, areaId, registeredAt, recordType } = req.body;
        const user: User = req.user;

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Found person
        const person = await Person.findOne({
            where: {
                id: personId,
                businessId: moreBusiness,
            },
        });

        if (!person) {
            t.rollback();
            return res.status(404).json({
                message: `La persona no fue encontrada, por favor consulte al administrador.`,
            });
        }

        //Checking area
        const area = await getAreaCache(areaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "ACCESSPOINT") {
            t.rollback();
            return res.status(400).json({
                message: `El área introducida no es de tipo Punto de acceso.`,
            });
        }

        const access = PersonAccessRecord.build({
            personId: person.id,
            areaId,
            type: recordType,
            createdAt: registeredAt,
            registeredById: user.id,
        });

        await access.save({ transaction: t });

        await t.commit();

        const to_return = await PersonAccessRecord.scope("to_return").findByPk(
            access.id
        );

        res.status(201).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getSummarizeHumanResources = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        const people = await Person.findAll({
            where: {
                isActive: true,
                businessId: moreBusiness,
            },
            include: [PersonPost, PersonCategory, Business],
        });

        let listPosts: Array<{
            id: number | undefined;
            postName: string;
            quantity: number;
        }> = [];
        let listCategories: Array<{
            id: number;
            categoriesName: string;
            quantity: number;
        }> = [];
        let listBusiness: Array<{
            id: number;
            businessName: string;
            quantity: number;
        }> = [];

        let males = 0;
        let females = 0;
        let notSexDefined = 0;

        let inBusiness = 0;

        let nextMonthBirthdays: Array<{
            personName: string;
            birthDay: string;
            amountDaysRemain: number;
        }> = [];

        const now = moment();

        for (const person of people) {
            if (person.birthAt) {
                const thisYearBirthDay = moment(
                    `${now.format("YYYY")}-${moment(person.birthAt).format(
                        "MM-DD"
                    )}`
                );
                const amountDaysRemain = thisYearBirthDay.diff(now, "days");

                if (amountDaysRemain < 30 && amountDaysRemain >= 0) {
                    nextMonthBirthdays.push({
                        personName: `${person.firstName} ${
                            person.lastName || ``
                        }`,
                        birthDay: thisYearBirthDay.format("YYYY-MM-DD"),
                        amountDaysRemain,
                    });
                }
            }

            const foundPost = listPosts.find(
                item => item.id === (person.postId || 0)
            );
            if (!foundPost) {
                listPosts.push({
                    id: person.postId || 0,
                    postName: person.post?.name || `Sin definir`,
                    quantity: 1,
                });
            } else {
                listPosts = listPosts.map(item => {
                    if (item.id === person.post?.id) {
                        return {
                            ...item,
                            quantity: item.quantity + 1,
                        };
                    }
                    return item;
                });
            }

            const foundCategory = listCategories.find(
                item => item.id === (person.personCategoryId || 0)
            );
            if (!foundCategory) {
                listCategories.push({
                    id: person.personCategoryId || 0,
                    categoriesName:
                        person.personCategory?.name || `Sin definir`,
                    quantity: 1,
                });
            } else {
                listCategories = listCategories.map(item => {
                    if (item.id === person.personCategory?.id) {
                        return {
                            ...item,
                            quantity: item.quantity + 1,
                        };
                    }
                    return item;
                });
            }

            const foundBusiness = listBusiness.find(
                item => item.id === (person.businessId || 0)
            );
            if (!foundBusiness) {
                listBusiness.push({
                    id: person.businessId || 0,
                    businessName: person.business?.name || `Sin definir`,
                    quantity: 1,
                });
            } else {
                listBusiness = listBusiness.map(item => {
                    if (item.id === person.business?.id) {
                        return {
                            ...item,
                            quantity: item.quantity + 1,
                        };
                    }
                    return item;
                });
            }

            if (person.sex) {
                person.sex === "female" ? females++ : males++;
            } else {
                notSexDefined++;
            }

            person.isInBusiness ? inBusiness++ : inBusiness;
        }

        const totalPeopleInactive = await Person.count({
            where: {
                isActive: false,
                businessId: moreBusiness,
            },
        });

        const totalPeopleActive = people.length;

        res.status(200).json({
            listPosts,
            listCategories,
            listBusiness,
            males,
            females,
            notSexDefined,
            inBusiness,
            totalPeopleInactive,
            totalPeopleActive,
            totalGeneral: totalPeopleInactive + totalPeopleActive,
            nextMonthBirthdays,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deletePersonAccess = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const personAccess = await PersonAccessRecord.findByPk(id, {
            include: [Person],
        });

        if (!personAccess) {
            return res.status(404).json({
                message: `PersonAccessRecord not found`,
            });
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(personAccess.person.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await personAccess.destroy();

        res.status(200).json({
            message: `PersonAccessRecord deleted successfully`,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getDayAsistance = async (req: any, res: Response) => {
    try {
        const { dateFrom, businessId } = req.body;
        const user: User = req.user;

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(user.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Open and close dates
        const configurations = await getBusinessConfigCache(user.businessId);

        const business_startsat_working_hours = configurations.find(
            item => item.key === "business_startsat_working_hours"
        )?.value;
        const business_endsat_working_hours = configurations.find(
            item => item.key === "business_endsat_working_hours"
        )?.value;

        const result = getBaseReferenceOpenAndCloseAt(
            business_startsat_working_hours || "0",
            business_endsat_working_hours || "23",
            dateFrom
        );

        const allRecords = await PersonAccessRecord.findAll({
            include: [
                {
                    model: Person,
                    attributes: ["id", "firstName", "lastName"],
                    where: {
                        businessId: moreBusiness,
                    },
                    include: [
                        {
                            model: PersonPost,
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            where: {
                createdAt: {
                    [Op.gte]: moment(
                        result.workStartsAt,
                        "YYYY-MM-DD HH:mm"
                    ).format("YYYY-MM-DD HH:mm:ss"),
                    [Op.lte]: moment(
                        result.workEndsAt,
                        "YYYY-MM-DD HH:mm"
                    ).format("YYYY-MM-DD HH:mm:ss"),
                },
            },
        });

        let filteredData: Array<{
            person: Person;
            entries: Array<string>;
            exits: Array<string>;
        }> = [];
        for (const record of allRecords) {
            const foundPersonIndex = filteredData.findIndex(
                item => item.person.id === record.personId
            );

            let entries = [];
            let exits = [];
            if (record.type === "ENTRY") {
                entries.push(moment(record.createdAt).format("HH:mm"));
            } else {
                exits.push(moment(record.createdAt).format("HH:mm"));
            }

            if (foundPersonIndex !== -1) {
                filteredData[foundPersonIndex].entries =
                    filteredData[foundPersonIndex].entries.concat(entries);
                filteredData[foundPersonIndex].exits =
                    filteredData[foundPersonIndex].exits.concat(exits);
            } else {
                filteredData.push({
                    person: record.person,
                    entries,
                    exits,
                });
            }
        }

        res.status(201).json(filteredData);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getAllUserPersonInBusiness = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        //Obtaining all branch business if exist
        let moreBusiness: Array<number> = [user.businessId];
        const branches = await BusinessBranch.findAll({
            where: {
                businessBaseId: user.businessId,
            },
        });

        if (branches.length !== 0) {
            moreBusiness = moreBusiness.concat(
                branches.map(item => item.branchId)
            );
        }

        //Processing data according area type
        const area = await getAreaCache(id);

        if (!area) {
            return res.status(404).json({
                message: `El área introducida no fue encontrada.`,
            });
        }

        let allowedRoles: Array<string> = [];
        let dynamicIncluded: Array<any> = [
            {
                model: Image,
                as: "avatar",
                attributes: ["id", "src", "thumbnail", "blurHash"],
            },
        ];
        switch (area.type) {
            case "MANUFACTURER":
                allowedRoles = ["MANAGER_PRODUCTION"];
                dynamicIncluded.push(
                    {
                        model: Role,
                        as: "roles",
                        attributes: ["code", "name"],
                        through: {
                            attributes: [],
                        },
                        where: {
                            code: allowedRoles,
                        },
                    },
                    {
                        model: Area,
                        as: "allowedManufacturerAreas",
                        attributes: ["id", "name", "code"],
                        where: {
                            id,
                        },
                        through: {
                            attributes: [],
                        },
                    }
                );
                break;
            default:
                break;
        }

        const found_records = await Person.findAll({
            attributes: ["id", "firstName", "lastName", "isInBusiness"],
            where: { isInBusiness: true, businessId: moreBusiness },
            include: [
                {
                    model: User,
                    attributes: ["id", "username", "email", "displayName"],
                    required: true,
                    include: dynamicIncluded,
                },
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            order: [["firstName", "DESC"]],
        });

        res.status(200).json(found_records);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllAccessRecord = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            dateFrom,
            dateTo,
            all_data,
            ...params
        } = req.query;
        const user: User = req.user;

        //Obtaining all branch business if exist
        let moreBusiness: Array<number> = [user.businessId];
        const branches = await BusinessBranch.findAll({
            where: {
                businessBaseId: user.businessId,
            },
        });

        if (branches.length !== 0) {
            moreBusiness = moreBusiness.concat(
                branches.map(item => item.branchId)
            );
        }

        //Preparing search
        let where_clause: any = {};

        //Preparing search
        const searchable_fields = ["personId", "areaId", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_access = await PersonAccessRecord.findAndCountAll({
            attributes: ["id", "type", "createdAt"],
            distinct: true,
            where: { ...where_clause },
            include: [
                {
                    model: Person,
                    attributes: ["id", "firstName", "lastName"],
                    include: [
                        {
                            model: Image,
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                },
                {
                    model: User,
                    attributes: ["id", "displayName", "email"],
                },
                {
                    model: Area,
                    attributes: ["id", "name"],
                    where: {
                        businessId: moreBusiness,
                    },
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        let totalPages = Math.ceil(found_access.count / limit);
        if (found_access.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_access.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_access.rows,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
