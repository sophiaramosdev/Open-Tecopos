import { Response } from "express";
import { Op, where, fn, col, literal } from 'sequelize';
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import PersonPost from "../../database/models/personPost";
import Address from "../../database/models/address";
import Phone from "../../database/models/phone";
import Person from "../../database/models/person";
import PhonePerson from "../../database/models/phonePerson";
import moment from "moment";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import Country from "../../database/models/country";
import Role from "../../database/models/role";
import UserRole from "../../database/models/userRole";
import PersonRecord from "../../database/models/personRecord";
import Image from "../../database/models/image";
import { getAllBranchBusiness } from "../helpers/utils";
import PersonCategory from "../../database/models/personCategory";
import Document from "../../database/models/document";
import { translatePropertyPerson } from "../../helpers/translator";

export const newPerson = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const {
            observations,
            address,
            phones,
            createNewUser,
            email,
            userId,
            roles,
            businessId,
            ...params
        } = req.body;
        const user: User = req.user;

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        let proviedBusinessId = user.businessId;
        if (businessId && moreBusiness.includes(businessId)) {
            proviedBusinessId = businessId;
        }

        //Analyzing if userId was provided
        let foundUser;
        if (userId) {
            foundUser = await User.findOne({
                where: {
                    id: userId,
                    businessId: moreBusiness,
                },
            });

            if (!foundUser) {
                t.rollback();
                return res.status(404).json({ message: `User not found` });
            }
        }

        //Checking if user must be created
        if (createNewUser) {
            let body: any = {
                displayName: `${params.firstName} ${params.lastName || ``}`,
                avatarId: params.profilePhotoId,
                businessId: proviedBusinessId,
            };

            if (email) {
                //Checking if email exist
                const existEmail = await User.findOne({
                    where: { email: email.trim().toLowerCase() },
                });

                if (existEmail) {
                    t.rollback();
                    return res.status(409).json({
                        message: `El correo electrónico: ${email} ya existe en el sistema.`,
                    });
                }

                body.email = email.trim().toLowerCase();
            }

            const new_user: User = User.build(body);

            let buildBaseUsername = email
                ? email.trim().toLowerCase().split("@")[0]
                : params.firstName.trim().toLowerCase();

            new_user.username =
                buildBaseUsername +
                `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;

            await new_user.save({ transaction: t });

            const all_roles = await Role.findAll({
                where: {
                    type: "ADMINISTRATION",
                },
            });

            const registerRoles = [...roles, "CUSTOMER"];

            let id_roles: Array<number> = [];
            if (roles) {
                const forbiddenRoles = ["OWNER", "GROUP_OWNER"];
                for (const role of registerRoles) {
                    const role_found = all_roles.find(
                        item => item.code === role
                    );

                    if (role_found) {
                        id_roles.push(role_found.id);
                    } else {
                        t.rollback();
                        return res.status(406).json({
                            message: `${role} is not a valid role.`,
                        });
                    }

                    if (
                        !user.roles?.find(item => item.code === "OWNER") &&
                        forbiddenRoles.includes(role_found.code)
                    ) {
                        t.rollback();
                        return res.status(401).json({
                            message: `No está autorizado a crear usuarios con el rol ${role}.`,
                        });
                    }
                }

                //Creating roles
                let roles_object: any = [];
                id_roles.forEach((id: number) => {
                    roles_object.push({
                        userId: new_user.id,
                        roleId: id,
                    });
                });

                await UserRole.bulkCreate(roles_object, { transaction: t });
            }

            foundUser = new_user;
        }

        let body: any = {
            ...params,
            observations,
            businessId: proviedBusinessId,
            userId: foundUser ? foundUser.id : null,
        };

        if (address) {
            body = {
                ...body,
                address,
            };
        }

        if (phones) {
            body = {
                ...body,
                phones,
            };
        }

        const person: Person = Person.build(body, {
            include: [Address, Phone],
        });

        await person.save({ transaction: t });

        //Counting number of business person
        const count = await Person.count({
            where: {
                businessId: moreBusiness,
            },
            paranoid: false,
        });

        //Generatig barCode
        const code = `${user.businessId.toString().padStart(4, "0")}${(
            count + 100
        )
            .toString()
            .padStart(5, "0")}`;

        person.barCode = code;

        await person.save({ transaction: t });

        //Registering action
        const record = PersonRecord.build({
            observations: `Registro de alta en el sistema.`,
            registeredById: user.id,
            personId: person.id,
            code: "HIGH_PERSON",
        });

        await record.save({ transaction: t });

        await t.commit();

        const to_return = await Person.scope("to_return").findByPk(person.id);

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

export const reducePerson = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { observations } = req.body;
        const { id } = req.params;
        const user: User = req.user;

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        const person = await Person.findByPk(id, {
            include: [User],
        });

        if (!person) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto persona no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(person.businessId) && !user.isSuperAdmin) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        person.isActive = false;
        await person.save({ transaction: t });

        //Registering action
        const record = PersonRecord.build({
            observations:
                `Registro de baja en el sistema.\n` + observations || ``,
            registeredById: user.id,
            personId: person.id,
            code: "LOW_PERSON",
        });

        await record.save({ transaction: t });

        await t.commit();

        const to_return = await PersonRecord.scope("to_return").findByPk(
            record.id
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

export const editPerson = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const {
            address,
            phones,
            businessId,
            email,
            roles,
            createNewUser,
            userId,
            ...params
        } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Obtaining all branch business if exist
        let proviedBusinessId = user.businessId;
        if (businessId && moreBusiness.includes(businessId)) {
            proviedBusinessId = businessId;
        }

        const modelKeys = Object.keys(Person.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const person = await Person.findByPk(id, {
            include: [
                Address,
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                },
                User,
            ],
        });

        if (!person) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto persona no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(person.businessId)&& !user.isSuperAdmin) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const changedProperties: any = [];
        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //check in not null and is not equals
                //@ts-ignore
                if (person[att] !== params[att]) {
                    changedProperties.push(
                        //@ts-ignore
                        `${translatePropertyPerson(att)}: ${person[att] ?? ""} por ${params[att]}`
                    );
                }
                //@ts-ignore
                person[att] = params[att];
            }
        });

        if (businessId) {
            person.businessId = proviedBusinessId;
        }

        if (address) {
            if (person.address) {
                await Address.update(address, {
                    where: {
                        id: person.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                person.addressId = new_address.id;
                await person.save({ transaction: t });
            }
        }

        if (phones) {
            //Removing other phones
            const phone_person = await PhonePerson.findAll({
                where: {
                    personId: person.id,
                },
            });

            if (phone_person.length !== 0) {
                await PhonePerson.destroy({
                    where: {
                        personId: person.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_person.map(item => item.phoneId),
                    },
                    transaction: t,
                });
            }

            //Creting new phones
            const phones_created = await Phone.bulkCreate(phones, {
                transaction: t,
                returning: true,
            });

            let addBulk = [];
            for (let phone of phones_created) {
                addBulk.push({
                    personId: person.id,
                    phoneId: phone.id,
                });
            }

            await PhonePerson.bulkCreate(addBulk, { transaction: t });
        }

        //TODO: registering when post or category changes
        //Checking and regisering changes
        // let listChanges = [];
        // if (params.postId && person.postId !== params.postId){
        //     const allPosts = await PersonPost.findAll({
        //         where: {
        //             businesId: user.businessId
        //         }
        //     })

        // }

        //Analyzing if userId was provided
        let foundUser;
        if (userId) {
            foundUser = await User.findOne({
                where: {
                    id: userId,
                    businessId: moreBusiness,
                },
            });

            if (!foundUser) {
                t.rollback();
                return res.status(404).json({ message: `User not found` });
            }

            person.userId = foundUser.id;
        }

        //Checking if user must be created
        if (createNewUser) {
            if (person.userId) {
                t.rollback();
                return res.status(400).json({
                    message: `La persona ya tiene un usuario creado.`,
                });
            }

            let body: any = {
                displayName: `${person.firstName} ${person.lastName || ``}`,
                avatarId: person.profilePhotoId,
                businessId: person.businessId,
            };

            if (email) {
                //Checking if email exist
                const existEmail = await User.findOne({
                    where: { email: email.trim().toLowerCase() },
                });

                if (existEmail) {
                    t.rollback();
                    return res.status(409).json({
                        message: `El correo electrónico: ${email} ya existe en el sistema.`,
                    });
                }

                body.email = email.trim().toLowerCase();
            }

            const new_user: User = User.build(body);

            let buildBaseUsername = email
                ? email.trim().toLowerCase().split("@")[0]
                : person.firstName.trim().toLowerCase();

            new_user.username =
                buildBaseUsername +
                `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;

            await new_user.save({ transaction: t });

            const all_roles = await Role.findAll({
                where: {
                    type: "ADMINISTRATION",
                },
            });

            const registerRoles = [...roles, "CUSTOMER"];

            let id_roles: Array<number> = [];
            if (roles) {
                const forbiddenRoles = ["OWNER", "GROUP_OWNER"];
                for (const role of registerRoles) {
                    const role_found = all_roles.find(
                        item => item.code === role
                    );

                    if (role_found) {
                        id_roles.push(role_found.id);
                    } else {
                        t.rollback();
                        return res.status(406).json({
                            message: `${role} is not a valid role.`,
                        });
                    }

                    if (
                        !user.roles?.find(item => item.code === "OWNER") &&
                        forbiddenRoles.includes(role_found.code)
                    ) {
                        t.rollback();
                        return res.status(401).json({
                            message: `No está autorizado a crear usuarios con el rol ${role}.`,
                        });
                    }
                }

                //Creating roles
                let roles_object: any = [];
                id_roles.forEach((id: number) => {
                    roles_object.push({
                        userId: new_user.id,
                        roleId: id,
                    });
                });

                await UserRole.bulkCreate(roles_object, { transaction: t });
            }

            person.userId = new_user.id;
        }

        await person.save({ transaction: t });

        //Analyzing if user is related, then update photo
        if (person.user) {
            person.user.avatarId = person.profilePhotoId;

            await person.user.save({ transaction: t });
        }

        const to_return = await Person.scope("to_return").findByPk(id, {
            transaction: t,
        });

        if(changedProperties.length !== 0){
            await PersonRecord.create(
                {
                    observations: `Propiedades modificadas: ${changedProperties.join(
                        ", "
                    )}`,
                    registeredById: user.id,
                    personId: person.id,
                    code: "EDIT_GENERAL_DATA",
                },
                { transaction: t }
            );
        }
        

        await t.commit();

        res.status(200).json(to_return);
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

export const findAllPeople = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            search,
            birthFrom,
            birthTo,
            countryId,
            provinceId,
            municipalityId,
            all_data,
            ...params
        } = req.query;
        const user: User = req.user;

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Preparing search
        let where_clause: any = {};
        let where_clause_address: any = {};

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.or] = [
                where(fn("unaccent", col("Person.firstName")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Person.lastName")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Preparing search
        const searchable_fields = [
            "sex",
            "isInBusiness",
            "birthAt",
            "businessId",
            "personCategoryId",
            "postId",
            "isActive",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["firstName", "ASC"]];
        }

        //Date filtering
        if (birthFrom && birthTo) {
            //Special case between dates
            where_clause["birthAt"] = {
                [Op.gte]: moment(birthFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(birthTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (birthFrom) {
                where_clause["birthAt"] = {
                    [Op.gte]: moment(birthFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (birthTo) {
                where_clause["birthAt"] = {
                    [Op.lte]: moment(birthTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //In address
        if (countryId) {
            where_clause_address.countryId = countryId;
        }

        if (provinceId) {
            where_clause_address.provinceId = provinceId;
        }

        if (municipalityId) {
            where_clause_address.municipalityId = municipalityId;
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_people = await Person.findAndCountAll({
            attributes: [
                "id",
                "firstName",
                "lastName",
                "sex",
                "birthAt",
                "isInBusiness",
                "personCategoryId",
                "postId",
                "businessId",
                "isActive",
            ],
            distinct: true,
            where: { businessId: moreBusiness, ...where_clause },
            include: [
                {
                    model: Address,
                    attributes: [
                        "street_1",
                        "street_2",
                        "description",
                        "city",
                        "postalCode",
                        "countryId",
                        "provinceId",
                        "municipalityId",
                    ],
                    include: [
                        {
                            model: Municipality,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Province,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Country,
                            attributes: ["id", "name", "code"],
                        },
                    ],
                    where: where_clause_address,
                    required: false,
                },
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                    attributes: [
                        "number",
                        "description",
                        "isMain",
                        "isAvailable",
                    ],
                    required: false,
                },
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: PersonPost,
                    attributes: ["id", "name", "code"],
                },
                {
                    model: PersonCategory,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_people.count / limit);
        if (found_people.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_people.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_people.rows,
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

export const deletePerson = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const person = await Person.findByPk(id);

        if (!person) {
            return res.status(404).json({
                message: `ProductState not found`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(person.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await PersonRecord.create({
            observations: `Se elimino del sistema`,
            registeredById: user.id,
            personId: person.id,
            code: "DELET_PERSON",
        });

        await person.destroy();

        res.status(200).json({
            message: `Person deleted successfully`,
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

export const getPerson = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        const person = await Person.findByPk(id);

        if (!person) {
            return res.status(404).json({
                message: `El objeto persona no fue encontrado.`,
            });
        }

        //Checking permissions
        if (!moreBusiness.includes(person.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Person.scope("to_return").findByPk(id);

        res.status(200).json(to_return);
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

export const newPersonRecord = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        const person = await Person.findByPk(id);

        if (!person) {
            return res.status(404).json({
                message: `Person not found`,
            });
        }

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(person.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const personRecord: PersonRecord = PersonRecord.build({
            ...params,
            registeredById: user.id,
            personId: id,
            code: "OBSERVATION",
        });

        await personRecord.save();

        const to_return = await PersonRecord.scope("to_return").findByPk(
            personRecord.id
        );

        res.status(201).json(to_return);
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

export const findAllPersonRecord = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { code, per_page, page, all_data } = req.query;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const person = await Person.findByPk(id);

        if (!person) {
            return res.status(404).json({
                message: `Person not found`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(person.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (code) {
            where_clause.code = code;
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_person_posts = await PersonRecord.findAndCountAll({
            attributes: ["id", "code", "observations", "createdAt"],
            distinct: true,
            where: { personId: id, ...where_clause },
            include: [
                {
                    model: User,
                    attributes: ["displayName", "username", "email"],
                    paranoid: false,
                },
                {
                    model: Document,
                    attributes: ["id", "path", "src"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        let totalPages = Math.ceil(found_person_posts.count / limit);
        if (found_person_posts.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_person_posts.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_person_posts.rows,
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

export const deletePersonRecord = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const personRecord = await PersonRecord.findByPk(id, {
            include: [Person],
        });

        if (!personRecord) {
            return res.status(404).json({
                message: `PersonRecord not found`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(personRecord.person.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await personRecord.destroy();

        res.status(200).json({
            message: `Record deleted successfully`,
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
