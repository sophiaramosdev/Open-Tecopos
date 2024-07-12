import { Request, Response } from "express";
import { Op, where, fn, col, QueryInterface } from "sequelize";
import moment from "moment";
import bcrypt from "bcryptjs";

import db from "../database/connection";

import Business from "../database/models/business";
import { pag_params } from "../database/pag_params";
import Area from "../database/models/area";
import User from "../database/models/user";
import Currency from "../database/models/currency";
import AvailableCurrency from "../database/models/availableCurrency";
import ConfigurationKey from "../database/models/configurationKey";
import BusinessCategory from "../database/models/businessCategory";
import PriceSystem from "../database/models/priceSystem";
import Image from "../database/models/image";
import ImageBusiness from "../database/models/imageBusiness";
import SubscriptionPlan from "../database/models/subscriptionPlan";
import Role from "../database/models/role";
import UserRole from "../database/models/userRole";
import Product from "../database/models/product";
import Price from "../database/models/price";
import Billing from "../database/models/billing";
import GeneralConfigs from "../database/models/generalConfigs";
import { emailQueue } from "../bull-queue/email";
import { isUserNameValid, mathOperation } from "../helpers/utils";
import Logger from "../lib/logger";
import OrderReceipt from "../database/models/orderReceipt";
import SelledProduct from "../database/models/selledProduct";
import BusinessBranch from "../database/models/businessBranch";
import { getCurrenciesCache, getUserTermKey } from "../helpers/redisStructure";
import { redisClient } from "../../app";

//General configs
export const getAllGeneralConfigs = async (req: any, res: Response) => {
    try {
        const generalConfigs = await GeneralConfigs.findAll({
            attributes: ["key", "value"],
        });
        res.status(200).json(generalConfigs);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getAllSubscriptionsPlan = async (req: any, res: Response) => {
    try {
        const subscriptions_plans = await SubscriptionPlan.findAll({
            attributes: ["id", "name", "code", "description"],
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
            ],
        });

        res.status(200).json(subscriptions_plans);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMyUser = async (req: any, res: Response) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: {
                exclude: [
                    "password",
                    "pinPassword",
                    "createdAt",
                    "updatedAt",
                    "deletedAt",
                    "businessId",
                ],
            },
            include: [
                {
                    model: Role,
                    as: "roles",
                    attributes: ["code", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
        });

        res.status(200).json(user);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getBusiness = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const business = await Business.scope("details_control").findOne({
            where: { id },
        });

        if (!business) {
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        //Obtaining currencies
        const availableCurrencies = await getCurrenciesCache(business.id);

        let mainCurrency = "";

        const exposed_data = availableCurrencies.map(item => {
            if (item.isMain) {
                mainCurrency = item.currency.code;
            }

            return {
                id: item.id,
                exchangeRate: item.exchangeRate,
                isMain: item.isMain,
                name: item.currency.name,
                code: item.currency.code,
                symbol: item.currency.symbol,
                isActive: item.isActive,
            };
        });

        //Obtaining parents
        const parentsIds = await BusinessBranch.findAll({
            where: {
                branchId: id,
            },
        });

        const parents = await Business.findAll({
            attributes: ["id", "name"],
            where: {
                id: parentsIds.map(item => item.businessBaseId),
            },
        });

        res.status(200).json({
            //@ts-ignore
            ...business.dataValues,
            parents,
            availableCurrencies: exposed_data,
            mainCurrency,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllBusinesses = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            dateFrom,
            dateTo,
            search,
            ...params
        } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["status", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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
                where(fn("unaccent", col("Business.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

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

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_businesses = await Business.findAndCountAll({
            attributes: [
                "id",
                "name",
                "status",
                "slug",
                "isActive",
                "dni",
                "licenceUntil",
                "type",
            ],
            distinct: true,
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code", "description"],
                },
            ],
            //@ts-ignore
            order: ordenation,
            limit,
            offset,
        });

        let totalPages = Math.ceil(found_businesses.count / limit);
        if (found_businesses.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_businesses.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_businesses.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteBusiness = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `id param is missing`,
            });
        }

        const business = await Business.findByPk(id);

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        //Permission Check
        if (!user.isSuperAdmin) {
            t.rollback();
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        //Removing all user associated
        const user_associated_found = await User.findAll({
            where: {
                businessId: business.id,
            },
        });

        await User.destroy({
            where: {
                id: user_associated_found.map(item => item.id),
            },
            transaction: t,
        });

        await business.destroy({ transaction: t });
        await t.commit();
        res.status(204).json({});
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Currency
export const newCurrency = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        if (!user.isSuperAdmin) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        const currency: Currency = Currency.build({
            ...params,
        });

        await currency.save();

        res.status(201).json(currency);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editCurrency = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!user.isSuperAdmin) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        if (!id) {
            return res.status(406).json({
                message: `id param is missing`,
            });
        }

        const modelKeys = Object.keys(Currency.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const currency = await Currency.findByPk(id);

        if (!currency) {
            return res.status(404).json({
                message: `Currency not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                currency[att] = params[att];
            }
        });

        await currency.save();
        res.status(200).json(currency);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllCurrencies = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, ...params } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["name", "code", "symbol"];
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
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const currencies_found = await Currency.findAndCountAll({
            distinct: true,
            where: {
                ...where_clause,
            },
            //@ts-ignore
            order: ordenation,
            limit,
            offset,
        });

        let totalPages = Math.ceil(currencies_found.count / limit);
        if (currencies_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: currencies_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: currencies_found.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteCurrency = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(406).json({
                message: `id param is missing`,
            });
        }

        const currency = await Currency.findByPk(id);

        if (!currency) {
            return res.status(404).json({
                message: `Currency not found`,
            });
        }

        //Permission Check
        if (!user.isSuperAdmin) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        await currency.destroy();

        res.status(204).json({});
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Configurations
export const newConfigurationKey = async (req: any, res: Response) => {
    try {
        const { key, value, businessId } = req.body;
        const user: User = req.user;

        if (!user.isSuperAdmin) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        if (!key || !value || !businessId) {
            return res.status(406).json({
                message: `key, value and businessId are mandatory`,
            });
        }

        const config: ConfigurationKey = ConfigurationKey.build({
            key,
            value,
            businessId,
        });

        await config.save();

        res.status(201).json(config);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editConfigurationKey = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { value } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `id param is missing`,
            });
        }

        const configKey = await ConfigurationKey.findByPk(id);

        if (!configKey) {
            return res.status(404).json({
                message: `ConfigurationKey not found`,
            });
        }

        if (!user.isSuperAdmin && configKey?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allowed to modify this property`,
            });
        }

        configKey.value = value;

        await configKey.save();
        res.status(200).json(configKey);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const checkConfigurationKeyInAllBusiness = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction();

    try {
        const { key, value, isSensitive } = req.body;
        const user: User = req.user;

        if (!user.isSuperAdmin) {
            t.rollback();
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        const allbusiness = await Business.findAll();

        let bulkConfigurations = [];
        for (const business of allbusiness) {
            const found_configuration = await ConfigurationKey.findOne({
                where: {
                    businessId: business.id,
                    key,
                },
            });

            if (!found_configuration) {
                bulkConfigurations.push({
                    key,
                    value,
                    businessId: business.id,
                    isSensitive,
                });
            }
        }

        let affected_rows = [];
        if (bulkConfigurations.length !== 0) {
            affected_rows = await ConfigurationKey.bulkCreate(
                bulkConfigurations,
                {
                    transaction: t,
                    returning: true,
                }
            );
        }

        await t.commit();

        res.status(201).json({ affected_rows: affected_rows.length || 0 });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Users
export const newUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const {
            email,
            username,
            roles,
            businessId,
            password,
            pinPassword,
            ...params
        } = req.body;

        //Checking if email exist
        const existEmail = await User.findOne({
            where: { email },
        });

        if (existEmail) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} ya existe en el sistema.`,
            });
        }

        //Checking if email exist
        const existUsername = await User.findOne({
            where: { username },
        });

        if (existUsername) {
            t.rollback();
            return res.status(409).json({
                message: `El nombre de usuario: ${username} ya existe en el sistema.`,
            });
        }

        const processedUsername = username.trim().toLowerCase();

        const isValidUsername = isUserNameValid(processedUsername);

        if (!isValidUsername) {
            t.rollback();
            return res.status(400).json({
                message: `El nombre de usuario solo puede contener letras, números.`,
            });
        }

        const new_user: User = User.build({
            email,
            businessId,
            username: processedUsername,
            ...params,
        });

        await new_user.save({ transaction: t });

        if (!params.isSuperAdmin) {
            const [all_roles] = await Promise.all([Role.findAll()]);

            let id_roles: Array<number> = [];
            if (roles) {
                for (const role of roles) {
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

            if (!businessId) {
                t.rollback();
                return res.status(400).json({
                    message: `businessId key is missing.`,
                });
            }

            //Checking if business exist
            const business = await Business.findByPk(businessId);

            if (!business) {
                t.rollback();
                return res.status(404).json({
                    message: `Business not found`,
                });
            }
        }

        //Crypt the password
        const salt = bcrypt.genSaltSync();
        const generatedPassword = Math.random().toString(36).slice(-8);
        new_user.password = bcrypt.hashSync(generatedPassword, salt);

        await new_user.save({ transaction: t });

        const user_to_emit = await User.findByPk(new_user.id, {
            attributes: {
                exclude: ["password", "pinPassword"],
            },
            include: [
                {
                    model: Role,
                    as: "roles",
                    attributes: ["code", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedStockAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedSalesAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedManufacturerAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            transaction: t,
        });

        await t.commit();

        //Send an email
        if (roles.includes("OWNER") || roles.includes("ADMIN")) {
            emailQueue.add(
                {
                    code: "NEW_ADMIN_USER",
                    params: {
                        email: user_to_emit!.email,
                        displayName:
                            user_to_emit?.displayName ??
                            user_to_emit?.username ??
                            "",
                        generatedPassword,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(201).json(user_to_emit);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { password, username, pinPassword, email, roles, ...params } =
            req.body;
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const user_found = await User.findByPk(id);

        if (!user_found) {
            t.rollback();
            return res.status(404).json({
                message: `User not found`,
            });
        }

        const modelKeys = Object.keys(User.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "lastLogin",
            "isLogued",
        ].forEach(att => {
            if (paramsKey.includes(att) && !user.isSuperAdmin) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        //Checking if email exist
        if (email) {
            const existEmail = await User.findOne({
                where: { email, id: { [Op.not]: user_found.id } },
            });

            if (existEmail) {
                t.rollback();
                return res.status(409).json({
                    message: `${email} already exist.`,
                });
            }

            user_found.email = email;
        }

        //Checking username
        if (username) {
            const existUsername = await User.findOne({
                where: {
                    username: username.trim().toLowerCase(),
                    id: { [Op.not]: user_found.id },
                },
            });

            if (existUsername) {
                t.rollback();
                return res.status(409).json({
                    message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
                });
            }

            user_found.username = username.trim().toLowerCase();

            const isValidUsername = isUserNameValid(user_found.username);

            if (!isValidUsername) {
                t.rollback();
                return res.status(400).json({
                    message: `El nombre de usuario solo puede contener letras, números.`,
                });
            }
        }

        const [all_roles] = await Promise.all([Role.findAll()]);

        if (roles) {
            let id_roles: Array<number> = [];
            for (const role of roles) {
                const role_found = all_roles.find(item => item.code === role);

                if (role_found) {
                    id_roles.push(role_found.id);
                } else {
                    t.rollback();
                    return res.status(406).json({
                        message: `${role} is not a valid role.`,
                    });
                }
            }

            //Deleting existing roles
            await UserRole.destroy({
                where: {
                    userId: user_found.id,
                },
                transaction: t,
            });

            //Creating roles
            let roles_object: any = [];
            id_roles.forEach((id: number) => {
                roles_object.push({
                    userId: user_found.id,
                    roleId: id,
                });
            });

            await UserRole.bulkCreate(roles_object, { transaction: t });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                user_found[att] = params[att];
            }
        });

        //Crypt the password
        if (password) {
            const salt = bcrypt.genSaltSync();
            user_found.password = bcrypt.hashSync(password, salt);
        }

        if (pinPassword) {
            const salt = bcrypt.genSaltSync();
            user_found.pinPassword = bcrypt.hashSync(pinPassword, salt);
        }

        await user_found.save({ transaction: t });

        const user_to_emit = await User.findByPk(user_found.id, {
            attributes: {
                exclude: ["password", "pinPassword"],
            },
            include: [
                {
                    model: Role,
                    as: "roles",
                    attributes: ["code", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedStockAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedSalesAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Area,
                    as: "allowedManufacturerAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            transaction: t,
        });

        await t.commit();

        res.status(201).json(user_to_emit);

        //Analyzing cache and remove key in case exist
        await redisClient.del(getUserTermKey(user_found.id, "loginData"));
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const requestChangePassword = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { email } = req.body;

        if (!email) {
            t.rollback();
            return res.status(409).json({
                message: `El parámetro email no fue proporcionado.`,
            });
        }

        //Checking if email exist
        const user = await User.findOne({
            where: { email },
            include: [
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

        if (!user) {
            t.rollback();
            return res.status(409).json({
                message: `El usuario con correo electrónico ${email} no fue encontrado en el sistema.`,
            });
        }

        const availableRoles = user.roles?.map(item => item.code);

        if (
            !availableRoles?.includes("OWNER") &&
            !availableRoles?.includes("ADMIN")
        ) {
            t.rollback();
            return res.status(400).json({
                message: `Solo puede solicitar cambios de contraseñas para usuarios de tipo Propietario de Negocios o Administradores.`,
            });
        }

        //Crypt the password
        const salt = bcrypt.genSaltSync();
        const generatedPassword = Math.random().toString(36).slice(-8);
        user.password = bcrypt.hashSync(generatedPassword, salt);

        await user.save({ transaction: t });

        await t.commit();

        //Send an email
        emailQueue.add(
            {
                code: "CHANGE_PASS_REQUEST",
                params: {
                    email: user!.email,
                    displayName: user?.displayName ?? user?.username ?? "",
                    generatedPassword,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json({
            message: "Operation completed",
        });
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteUser = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const user_found = await User.findByPk(id);

        if (!user_found) {
            return res.status(404).json({
                message: `User not found`,
            });
        }

        if (user_found.id === user.id) {
            return res.status(401).json({
                message: `You can't remove your own user. Action forbidden.`,
            });
        }

        await user_found.destroy();

        res.status(200).json({
            message: `User deleted successfully`,
        });

         //Analyzing cache and remove key in case exist
         await redisClient.del(getUserTermKey(user.id, "loginData"));

    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getUserById = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const user_found = await User.scope("to_return").findByPk(id);

        res.status(200).json(user_found);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllUser = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            search,
            dateFrom,
            dateTo,
            ...params
        } = req.query;

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause.username = { [Op.iLike]: `%${search}%` };
        }

        const searchable_fields = ["isActive", "isSuperAdmin", "businessId"];
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

        const users_found = await User.findAndCountAll({
            attributes: {
                exclude: ["password", "pinPassword"],
            },
            distinct: true,
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Role,
                    as: "roles",
                    attributes: ["name", "code"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Business,
                    as: "business",
                    attributes: ["id", "name"],
                },
            ],
            order: [["lastLogin", "DESC"]],
            limit,
            offset,
        });

        let totalPages = Math.ceil(users_found.count / limit);
        if (users_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: users_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: users_found.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const transformAllUsernames = async (req: any, res: Response) => {
    try {
        const users = await User.findAll();

        let bulkUsernames = [];
        for (const user of users) {
            const isValidUsername = isUserNameValid(user.username);

            if (!isValidUsername) {
                const clearUser = user.username
                    .toLowerCase()
                    .replace(/[^a-z0-9_\-\.]/g, "");

                bulkUsernames.push({
                    id: user.id,
                    username: clearUser,
                });
            }
        }

        const afectedRows = await User.bulkCreate(bulkUsernames, {
            updateOnDuplicate: ["username"],
            returning: true,
        });

        res.status(200).json(afectedRows.length);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Invoices
export const findAllBillingBusiness = async (req: any, res: Response) => {
    try {
        const { businessId } = req.params;
        const { per_page, page, order, orderBy, search } = req.query;

        if (!businessId) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const business = await Business.findByPk(businessId, {
            include: [SubscriptionPlan],
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado id no fue encontrado.`,
            });
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause.invoiceNumber = { [Op.iLike]: `%${search}%` };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const billing_found = await Billing.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "invoiceNumber",
                "status",
                "observations",
                "nextPayment",
                "createdAt",
            ],
            where: {
                businessId,
                ...where_clause,
            },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                },
            ],
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(billing_found.count / limit);
        if (billing_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: billing_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: billing_found.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllNextBusinessBilling = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search } = req.query;

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const businesses = await Business.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "name",
                "status",
                "dni",
                "licenceUntil",
                "type",
                "subscriptionPlanId",
            ],
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                    where: {
                        code: {
                            [Op.not]: "FREE",
                        },
                    },
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
            ],
            where: {
                status: ["CREATED", "ACTIVE"],
                licenceUntil: {
                    [Op.gte]: moment()
                        .subtract(7, "days")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    [Op.lte]: moment()
                        .add(7, "days")
                        .format("YYYY-MM-DD HH:mm:ss"),
                },
                ...where_clause,
            },
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(businesses.count / limit);
        if (businesses.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: businesses.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: businesses.rows,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newBusinessInvoice = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { businessId } = req.params;
        const { observations, discount, price, promotion, dateUntil } =
            req.body;
        const user: User = req.user;

        if (!businessId) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const business = await Business.findByPk(businessId, {
            include: [{ model: SubscriptionPlan, include: [Price] }, Price],
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio proporcionado id no fue encontrado.`,
            });
        }

        if (!price && !promotion) {
            t.rollback();
            return res.status(400).json({
                message: `Debe especificar un monto de pago.`,
            });
        }

        const [generalConfigs, last_billing] = await Promise.all([
            GeneralConfigs.findAll({
                attributes: ["key", "value"],
            }),
            Billing.findAll({
                where: {
                    businessId,
                },
                order: [["createdAt", "DESC"]],
                limit: 1,
            }),
        ]);

        //Analyzing price
        if (price && price.amount <= 0) {
            t.rollback();
            return res.status(400).json({
                message: `El monto proporcionado no es válido. La cantidad a proporcionar debe ser mayor que 0.`,
            });
        }

        const bill: any = Billing.build({
            observations,
            discount,
            subscriptionPlanId: business.subscriptionPlanId,
            businessId,
            registeredById: user.id,
            status: "APPROVED",
        });

        await bill.save({ transaction: t });

        let licenceValid;
        let addedPrice;
        if (promotion) {
            licenceValid = moment(dateUntil).add(1, "day").toDate();
            addedPrice = {
                amount: 0,
                codeCurrency: "USD",
            };
        } else {
            const allowedCurrencies = generalConfigs
                .find(item => item.key === "payment_currency_enabled")
                ?.value.split(",");

            if (!allowedCurrencies?.includes(price.codeCurrency)) {
                t.rollback();
                return res.status(400).json({
                    message: `La moneda de pago proporcionada no es válida.`,
                });
            }

            let totalToPay = price.amount;
            if (discount) {
                totalToPay = mathOperation(
                    price.amount,
                    price.amount * (discount / 100),
                    "subtraction",
                    2
                );
            }

            let lastPayment;
            if (last_billing[0]) {
                lastPayment = moment(last_billing[0].nextPayment);
            } else {
                lastPayment = moment(new Date());
            }

            let monthlyPlanPrice;
            if (business.subscriptionPlan.code === "CUSTOM") {
                monthlyPlanPrice = business.subscriptionPlanPrice;
            } else {
                monthlyPlanPrice = business.subscriptionPlan.price;
            }
            const amountMonths = price.amount / monthlyPlanPrice.amount;

            if (Number.isInteger(amountMonths)) {
                licenceValid = lastPayment.add(amountMonths, "months").toDate();
            } else {
                const numberDays = Math.round(amountMonths * 30);
                licenceValid = lastPayment.add(numberDays, "days").toDate();
            }

            addedPrice = {
                amount: totalToPay,
                codeCurrency: price.codeCurrency,
                paymentWay: price.paymentWay,
            };
        }

        //Creating invoiceNumber
        const invoiceNumber = `${business.dni}-${moment().format("YYYY")}-${
            bill.id
        }`;

        //Creating price
        const priceObj = Price.build(addedPrice);
        await priceObj.save({ transaction: t });

        bill.nextPayment = licenceValid;
        bill.invoiceNumber = invoiceNumber;
        business.licenceUntil = licenceValid;
        bill.priceId = priceObj.id;
        business.status = "ACTIVE";

        await business.save({ transaction: t });
        await bill.save({ transaction: t });

        const invoice_to_emit = await Billing.findByPk(bill.id, {
            attributes: [
                "id",
                "invoiceNumber",
                "status",
                "observations",
                "nextPayment",
                "createdAt",
            ],
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                },
            ],
            transaction: t,
        });

        await t.commit();

        res.status(201).json(invoice_to_emit);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteInvoiceBussiness = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const bill = await Billing.findByPk(id, {
            include: [Business],
        });

        if (!bill) {
            t.rollback();
            return res.status(404).json({
                message: `Invoice bill not found`,
            });
        }

        const last_billing = await Billing.findAll({
            where: {
                businessId: bill.businessId,
            },
            order: [["createdAt", "DESC"]],
            limit: 2,
        });

        if (last_billing[0] && last_billing[0].id !== Number(id)) {
            t.rollback();
            return res.status(406).json({
                message: `Solo puede eliminar la última factura registrada.`,
            });
        }

        let licenceUntil = null;
        if (last_billing[1]) {
            licenceUntil = last_billing[1].nextPayment;
        } else {
            licenceUntil = bill.business.createdAt;
        }

        //@ts-ignore
        bill.business.licenceUntil = licenceUntil;
        await bill.business.save({ transaction: t });

        await bill.destroy({ transaction: t });

        await t.commit();
        res.status(204).json({});
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getInvoice = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const bill = await Billing.findByPk(id, {
            attributes: [
                "id",
                "invoiceNumber",
                "status",
                "observations",
                "nextPayment",
                "createdAt",
                "discount",
            ],
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
                {
                    model: User,
                    as: "registeredBy",
                    attributes: ["displayName", "username", "email"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
        });

        if (!bill) {
            return res.status(404).json({
                message: `La factura no fue encontrada`,
            });
        }

        res.status(200).json(bill);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Configurations
export const editBusinessConfigurations = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { configs } = req.body;
        const { businessId } = req.params;

        const businessConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId,
                isSensitive: true,
            },
        });

        let updateBulk: Array<{ id: number; key: string; value: string }> = [];
        for (const element of configs) {
            const found = businessConfigurations.find(
                item => item.key === element.key
            );

            if (found) {
                updateBulk.push({
                    id: found.id,
                    key: found.key,
                    value: element.value,
                });
            } else {
                t.rollback();
                return res.status(404).json({
                    message: `La propiedad ${element.key} no fue encontrada.`,
                });
            }
        }

        const afectedRows = await ConfigurationKey.bulkCreate(updateBulk, {
            updateOnDuplicate: ["value"],
            transaction: t,
            returning: true,
        });

        await t.commit();

        res.status(200).json(
            afectedRows.map(item => {
                return {
                    key: item.key,
                    value: item.value,
                };
            })
        );
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
