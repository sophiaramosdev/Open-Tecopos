import { Request, Response } from "express";
import { Op, where, fn, col, literal } from "sequelize";

import db from "../database/connection";
import User from "../database/models/user";
import ShippingRegion from "../database/models/shippingRegion";
import { pag_params } from "../database/pag_params";
import Client from "../database/models/client";
import Address from "../database/models/address";
import Phone from "../database/models/phone";
import PhoneClient from "../database/models/phoneClient";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import OrderReceipt from "../database/models/orderReceipt";
import ConfigurationKey from "../database/models/configurationKey";
import Country from "../database/models/country";
import Logger from "../lib/logger";
import moment from "moment";
import Coupon from "../database/models/coupon";
import BusinessBranch from "../database/models/businessBranch";
import { getBusinessConfigCache } from "../helpers/redisStructure";
import CustomerCategory from "../database/models/customerCategory";
import { app_origin } from "../interfaces/nomenclators";

//Clients
export const addClientAndAssignToOrder = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { observations, address, phones, ...params } = req.body;
        const { orderId } = req.params;
        const user: User = req.user;

        const order = await OrderReceipt.findByPk(orderId);

        if (!order) {
            return res.status(404).json({
                message: `Order not found`,
            });
        }

        //Permission Check
        if (order?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let body: any = {
            ...params,
            observations,
            businessId: user.businessId,
            registrationWay: "pos",
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

        //Counting number of business Client
        const count = await Client.count({
            where: {
                businessId: moreBusiness,
            },
            paranoid: false,
        });

        //Generatig barCode
        const code = `C_${user.businessId.toString().padStart(4, "0")}${(
            count + 100
        )
            .toString()
            .padStart(5, "0")}`;

        body.barCode = code;

        //Validating client not be reapeated
        let where: Array<any> = [];
        if (params.ci) {
            where.push({
                ci: params.ci,
            });
        }

        if (params.contractNumber) {
            where.push({
                contractNumber: params.contractNumber,
            });
        }

        if (params.email) {
            where.push({
                email: params.email,
            });
        }

        const found = await Client.findOne({
            where: {
                [Op.or]: where,
                businessId: moreBusiness,
            },
        });

        if (found) {
            return res.status(400).json({
                message: `El cliente introducido ya existe`,
            });
        }

        const client: Client = Client.build(body, {
            include: [Address, Phone],
        });

        await client.save({ transaction: t });

        order.clientId = client.id;
        await order.save({ transaction: t });

        const to_return_client = await Client.scope("to_return").findByPk(
            client.id,
            { transaction: t }
        );
        const to_return_order = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            { transaction: t }
        );

        await t.commit();

        res.status(201).json({
            client: to_return_client,
            order: to_return_order,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const addClient = async (req: any, res: Response) => {
    const origin: app_origin = req.header("X-App-Origin");

    try {
        const { address, phones, customerCategoryId, ...params } = req.body;
        const user: User = req.user;

        let body: any = {
            ...params,
            businessId: user.businessId,
            registrationWay: origin === "Tecopos" ? "pos" : "administration",
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

        if (customerCategoryId) {
            const customerCategory = await CustomerCategory.findOne({
                where: {
                    id: customerCategoryId,
                    businessId: user.businessId,
                },
            });

            if (
                !customerCategory ||
                customerCategory.businessId !== user.businessId
            ) {
                return res.status(400).json({
                    message: `No se encontró la categoría de cliente con ID ${customerCategoryId} para su negocio.`,
                });
            }

            body = {
                ...body,
                customerCategoryId: customerCategory.id,
            };
        }

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

        //Counting number of business Client
        const count = await Client.count({
            where: {
                businessId: moreBusiness,
            },
            paranoid: false,
        });

        //Generatig barCode
        const code = `C_${user.businessId.toString().padStart(4, "0")}${(
            count + 100
        )
            .toString()
            .padStart(5, "0")}`;

        body.barCode = code;

        const lastCodeClient =
            (await Client.max("codeClient", {
                where: { businessId: user.businessId },
            })) || 0;

        //@ts-ignore
        body.codeClient = lastCodeClient + 1;

        //Validating client not be reapeated
        let where: Array<any> = [];
        if (params.ci) {
            where.push({
                ci: params.ci,
            });
        }

        if (params.contractNumber) {
            where.push({
                contractNumber: params.contractNumber,
            });
        }

        if (params.email) {
            where.push({
                email: params.email,
            });
        }

        const found = await Client.findOne({
            where: {
                [Op.or]: where,
                businessId: moreBusiness,
            },
        });

        if (found) {
            return res.status(400).json({
                message: `El cliente introducido ya existe`,
            });
        }
        const client: Client = Client.build(body, {
            include: [Address, Phone],
        });

        await client.save();

        const to_return = await Client.scope("to_return").findByPk(client.id);

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

export const removeClient = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const client = await Client.findByPk(id);

        if (!client) {
            return res.status(404).json({
                message: `El objeto cliente no fue encontrado.`,
            });
        }

        //Checking permissions
        if (client.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await client.destroy();
        res.status(204).json({});
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

export const getClient = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const client = await Client.findByPk(id);

        if (!client) {
            return res.status(404).json({
                message: `El objeto cliente no fue encontrado.`,
            });
        }

        //Checking permissions
        if (client.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Client.scope("to_return").findByPk(id);

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

export const editClientAndAssignToOrder = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id, orderId } = req.params;
        const { address, phones, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const order = await OrderReceipt.findByPk(orderId);

        if (!order) {
            return res.status(404).json({
                message: `Order not found`,
            });
        }

        //Permission Check
        if (order?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const modelKeys = Object.keys(Client.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `No tiene acceso a modificar el atributo ${att}.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const client = await Client.findByPk(id, {
            include: [
                Address,
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!client) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto cliente no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (client.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                client[att] = params[att];
            }
        });

        if (address) {
            if (client.address) {
                await Address.update(address, {
                    where: {
                        id: client.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                client.addressId = new_address.id;
                await client.save({ transaction: t });
            }
        }

        if (phones) {
            //Removing other phones
            const phone_clients = await PhoneClient.findAll({
                where: {
                    clientId: client.id,
                },
            });

            if (phone_clients.length !== 0) {
                await PhoneClient.destroy({
                    where: {
                        clientId: client.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_clients.map(item => item.phoneId),
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
                    clientId: client.id,
                    phoneId: phone.id,
                });
            }

            await PhoneClient.bulkCreate(addBulk, { transaction: t });
        }

        await client.save({ transaction: t });

        const configurations = await getBusinessConfigCache(user.businessId);

        const enable_delivery =
            configurations.find(item => item.key === "enable_delivery")
                ?.value === "true";
        const delivery_type = configurations.find(
            item => item.key === "delivery_type"
        )?.value;

        //Checking delivery
        if (enable_delivery && delivery_type === "BYREGION") {
            //TODO: Fix
            // const found_price = client?.address?.shippingRegion?.price;
            // if (found_price) {
            //     const new_price = Price.build({
            //         amount: found_price.amount,
            //         codeCurrency: found_price.codeCurrency,
            //     });
            //     await new_price.save({ transaction: t });
            //     //Check if order had already a price
            //     if (order.shippingPriceId) {
            //         await order.shippingPrice?.destroy({ transaction: t });
            //     }
            //     order.shippingPriceId = new_price.id;
            // }
        }

        order.clientId = client.id;
        await order.save({ transaction: t });

        const to_return_client = await Client.scope("to_return").findByPk(
            client.id,
            { transaction: t }
        );
        const to_return_order = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            { transaction: t }
        );

        await t.commit();

        res.status(200).json({
            client: to_return_client,
            order: to_return_order,
        });
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

export const editClient = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const {
            address,
            phones,
            customerCategoryId,
            ci,
            codeClient,
            contractNumber,
            ...params
        } = req.body;
        const user: User = req.user;

        const where_check: Partial<Client> = {};

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Client.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `No tiene acceso a modificar el atributo ${att}.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const client = await Client.findByPk(id, {
            include: [
                Address,
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!client) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto cliente no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (client.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (codeClient && !client.codeClient) {
            const latsCodeClient =
                (await Client.max("codeClient", {
                    where: { businessId: user.businessId },
                })) || 0;
            //@ts-ignore
            client.codeClient = latsCodeClient + 1;
        }

        if (contractNumber) {
            client.contractNumber = contractNumber;
        }

        if (ci) {
            // if (!ciRegex.test(ci)) {
            //     t.rollback();
            //     return res.status(404).json({ message: "Carnet de identidad invalido" })
            // }
            client.ci = ci;
            where_check.ci = ci;
        }
        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                client[att] = params[att];
            }
        });

        if (address) {
            if (client.address) {
                await Address.update(address, {
                    where: {
                        id: client.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                client.addressId = new_address.id;
                await client.save({ transaction: t });
            }
        }

        if (phones) {
            //Removing other phones
            const phone_clients = await PhoneClient.findAll({
                where: {
                    clientId: client.id,
                },
            });

            if (phone_clients.length !== 0) {
                await PhoneClient.destroy({
                    where: {
                        clientId: client.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_clients.map(item => item.phoneId),
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
                    clientId: client.id,
                    phoneId: phone.id,
                });
            }

            await PhoneClient.bulkCreate(addBulk, { transaction: t });
        }

        if (customerCategoryId) {
            const customerCategory = await CustomerCategory.findOne({
                where: {
                    id: customerCategoryId,
                    businessId: user.businessId,
                },
            });

            if (
                !customerCategory ||
                customerCategory.businessId !== user.businessId
            ) {
                t.rollback();
                return res.json({
                    message: `No se encontró la categoría de cliente con ID ${customerCategoryId} para su negocio.`,
                });
            }

            client.customerCategoryId = customerCategory.id;
        }

        if (Object.keys(where_check).length !== 0) {
            const clientExist = await Client.findOne({
                where: {
                    id:{
                        [Op.not]:client.id
                    },
                    ...where_check,
                },
            });

            if (clientExist) {
                t.rollback();
                return res.status(400).json({
                    message: "Ya existe un cliente con el mismo # de identificación.",
                });
            }
        }

        await client.save({ transaction: t });

        const client_to_emit = await Client.scope("to_return").findByPk(id, {
            transaction: t,
        });

        await t.commit();

        res.status(200).json(client_to_emit);
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

export const findAllClients = async (req: any, res: Response) => {
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
            coupons,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        let where_clause_phone: any = {};
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
                where(fn("unaccent", col("Client.firstName")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Client.lastName")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Client.email")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Client.ci")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Preparing search
        const searchable_fields = ["sex", "ci", "codeClient"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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

        if (search && !isNaN(search)) {
            where_clause_phone.number = { [Op.iLike]: `%${search}%` };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
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

        //that is because coupons must be include dinamically
        let includes: any = [
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
                where: where_clause_phone,
                through: {
                    attributes: [],
                },
                attributes: ["number", "description", "isMain", "isAvailable"],
                required: false,
            },
            CustomerCategory,
        ];

        if (coupons) {
            const allCoupos = coupons.split(",");
            includes.push({
                model: Coupon,
                as: "usedCoupons",
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            });
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_clients = await Client.findAndCountAll({
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            attributes: [
                "id",
                "firstName",
                "lastName",
                "email",
                "ci",
                "sex",
                "registrationWay",
                "birthAt",
                "observations",
                "externalId",
                "createdAt",
                "contractNumber",
                "codeClient",
            ],
            include: includes,
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_clients.count / limit);
        if (found_clients.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_clients.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_clients.rows,
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

export const createCustomerCategory = async (req: any, res: Response) => {
    try {
        const { name, description } = req.body;
        const user: User = req.user;

        const newCategory = await CustomerCategory.create({
            name,
            description,
            businessId: user.businessId,
        });

        res.status(201).json(newCategory);
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

export const getAllCustomerCategories = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data } = req.query;
        const user: User = req.user;

        let where_clause: any = {};

        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const categories = await CustomerCategory.findAndCountAll({
            where: { businessId: user.businessId, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
        });

        let totalPages = Math.ceil(categories.count / limit);
        if (categories.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: categories.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: categories.rows,
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

export const updateCustomerCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const { name, description } = req.body;
        const category = await CustomerCategory.findOne({
            where: { id, businessId: user.businessId },
        });

        if (!category) {
            return res
                .status(404)
                .json({ message: "CustomerCategory no encontrado" });
        }

        await category.update({ name, description });

        res.json(category);
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

export const deleteCustomerCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const category = await CustomerCategory.findOne({
            where: { id, businessId: user.businessId },
        });

        if (!category) {
            return res
                .status(404)
                .json({ message: "CustomerCategory no encontrado" });
        }

        await category.destroy();
        res.status(204).json();
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
