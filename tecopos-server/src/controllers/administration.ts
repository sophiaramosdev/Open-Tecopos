import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../database/connection";
import bcrypt from "bcryptjs";
import moment from "moment";

import Area from "../database/models/area";
import Resource from "../database/models/resource";
import SalesCategory from "../database/models/salesCategory";
import Product from "../database/models/product";
import StockAreaProduct from "../database/models/stockAreaProduct";
import { pag_params } from "../database/pag_params";
import User from "../database/models/user";
import Supplier from "../database/models/supplier";
import AvailableCurrency from "../database/models/availableCurrency";
import Currency from "../database/models/currency";
import PriceSystem from "../database/models/priceSystem";
import ProductManufacturation from "../database/models/productManufacturation";
import Image from "../database/models/image";
import Business from "../database/models/business";
import Address from "../database/models/address";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Phone from "../database/models/phone";
import GeneralConfigs from "../database/models/generalConfigs";
import { emailQueue } from "../bull-queue/email";
import { wooQueue } from "../bull-queue/wocommerce";
import Country from "../database/models/country";
import PhoneSupplier from "../database/models/phoneSupplier";
import Logger from "../lib/logger";
import { getAllBranchBusiness } from "./helpers/utils";
import {
    getAreaCache,
    getBusinessConfigCache,
    getLongTermKey,
} from "../helpers/redisStructure";
import { redisClient } from "../../app";
import ResourceProduct from "../database/models/productResource";
import ReservationPolicy from "../database/models/reservationPolicy";
import SelledProduct from "../database/models/selledProduct";
import { myBusinessToReturn } from "./helpers/business";
import ProductPrice from "../database/models/productPrice";

export const getGeneralConfigs = async (req: any, res: Response) => {
    try {
        const from = req.header("X-App-Origin");

        const generalConfigs = await GeneralConfigs.findAll({
            attributes: ["key", "value"],
            where: {
                isSensitive: false,
                origin: {
                    [Op.or]: [from, "General"],
                },
            },
        });
        res.status(200).json(generalConfigs);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            businessName: req.business?.name,
            userId: req.user.id,
            userName: req.user?.displayName,
            rute: `administration/getGeneralConfigs`,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Currency
export const addCurrency = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        //Check if currency already exist
        const currency_found = await AvailableCurrency.findOne({
            where: {
                currencyId: params.currencyId,
                businessId: user.businessId,
            },
            include: [Currency],
        });

        if (currency_found) {
            return res.status(400).json({
                message: `El negocio ya tiene configurada la moneda ${currency_found.currency.name}.`,
            });
        }

        if (params.isMain) {
            //Check if there is a MainCurrency defined
            const mainCurrency = await AvailableCurrency.findOne({
                where: {
                    businessId: user.businessId,
                    isMain: true,
                },
            });

            if (mainCurrency) {
                return res.status(400).json({
                    message: `Ya existe una moneda definida como principal.`,
                });
            }
        }

        const availableCurrency: AvailableCurrency = AvailableCurrency.build({
            ...params,
            businessId: user.businessId,
        });

        await availableCurrency.save();

        res.status(201).json(availableCurrency);
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.user.businessId,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const removeCurrency = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const availableCurrency = await AvailableCurrency.findByPk(id);

        if (!availableCurrency) {
            return res.status(404).json({
                message: `AvailableCurrency not found`,
            });
        }

        //Checking if action belongs to user Business
        if (availableCurrency.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await availableCurrency.destroy();
        res.status(204).json({});
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editCurrency = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { replyToChilds, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(AvailableCurrency.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "businessId",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "currencyId",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const availableCurrency = await AvailableCurrency.findByPk(id, {
            include: [Currency],
        });

        if (!availableCurrency) {
            t.rollback();
            return res.status(404).json({
                message: `AvailableCurrency not found`,
            });
        }

        //Checking if action belongs to user Business
        if (availableCurrency.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                availableCurrency[att] = params[att];
            }
        });

        await availableCurrency.save({ transaction: t });

        if (replyToChilds) {
            const moreBusiness = await getAllBranchBusiness(user);

            let businessToUpdate = [];
            const currencies = await AvailableCurrency.findAll({
                where: {
                    businessId: moreBusiness,
                    isMain: true,
                },
            });

            const mainCurrency = currencies.find(
                item => item.businessId === user.businessId
            );

            currencies
                .filter(item => item.businessId !== user.businessId)
                .forEach(item => {
                    if (item.currencyId === mainCurrency?.currencyId) {
                        businessToUpdate.push(item.businessId);
                    }
                });

            if (businessToUpdate.length > 0) {
                await AvailableCurrency.update(
                    {
                        exchangeRate: params.exchangeRate,
                    },
                    {
                        where: {
                            businessId: moreBusiness,
                            currencyId: availableCurrency.currencyId,
                        },
                        transaction: t,
                    }
                );
            }

            //Analyzing cache and remove key in case exist
            for await (const business of moreBusiness) {
                await redisClient.del(
                    getLongTermKey(business, "currencies", "get")
                );

                const business_to_emit = await myBusinessToReturn(
                    user,
                    business
                );

                if (!business_to_emit) {
                    return res.status(404).json({
                        message: `User has not a business associated`,
                    });
                }

                //Emit via socket
                (global as any).socket
                    .to(`business:${user.businessId}`)
                    .emit("business/update", {
                        data: {
                            business: business_to_emit,
                        },
                        from: user.id,
                        fromName: user.displayName || user.email,
                        origin: req.header("X-App-Origin"),
                    });
            }
        } else {
            //Analyzing cache and remove key in case exist
            await redisClient.del(
                getLongTermKey(user.businessId, "currencies", "get")
            );

            const business_to_emit = await myBusinessToReturn(user);

            if (!business_to_emit) {
                return res.status(404).json({
                    message: `User has not a business associated`,
                });
            }

            //Emit via socket
            (global as any).socket
                .to(`business:${user.businessId}`)
                .emit("business/update", {
                    data: {
                        business: business_to_emit,
                    },
                    from: user.id,
                    fromName: user.displayName || user.email,
                    origin: req.header("X-App-Origin"),
                });
        }

        await t.commit();

        res.status(200).json(availableCurrency);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllCurrencies = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, all_data } = req.query;
        const user: User = req.user;

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

        const found_product_states = await AvailableCurrency.findAndCountAll({
            attributes: [
                "id",
                "exchangeRate",
                "precissionAfterComma",
                "isActive",
                "isMain",
                "oficialExchangeRate",
            ],
            distinct: true,
            where: { businessId: user.businessId },
            limit: all_data ? undefined : limit,
            include: [
                {
                    model: Currency,
                    attributes: ["code", "name"],
                },
            ],
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_product_states.count / limit);
        if (found_product_states.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_product_states.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_product_states.rows,
        });
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//PriceSystem
export const addPriceSystem = async (req: any, res: Response) => {
    try {
        const { name } = req.body;
        const user: User = req.user;

        const priceSystem = PriceSystem.build({
            name,
            businessId: user.businessId,
        });

        await priceSystem.save();

        const to_return = await PriceSystem.scope("to_return").findByPk(
            priceSystem.id
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

export const removePriceSystem = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const priceSystem = await PriceSystem.findByPk(id);

        if (!priceSystem) {
            return res.status(404).json({
                message: `El sistema de precio no fue encontrado.`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(priceSystem.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (priceSystem.isMain) {
            return res.status(401).json({
                message: `No está autorizado a eliminar este sistema de precios.`,
            });
        }

        await priceSystem.destroy();

        //Removing all prices associated to a product
        await ProductPrice.destroy({
            where: {
                priceSystemId: id,
            },
        });

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

export const editPriceSystem = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const priceSystem = await PriceSystem.findByPk(id);

        if (!priceSystem) {
            return res.status(404).json({
                message: `El sistema de precio no fue encontrado.`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(priceSystem.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        priceSystem.name = name;
        await priceSystem.save();

        const to_return = await PriceSystem.scope("to_return").findByPk(
            priceSystem.id
        );

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

//Supplier
export const newSupplier = async (req: any, res: Response) => {
    try {
        const { address, phones, ...params } = req.body;
        const user = req.user;

        let body = {
            ...params,
            businessId: user.businessId,
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

        const supplier: Supplier = Supplier.build(body, {
            include: [Address, Phone],
        });

        await supplier.save();

        const to_return = await Supplier.scope("to_return").findByPk(
            supplier.id
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

export const editSupplier = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { address, phones, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Supplier.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        const supplier = await Supplier.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
            include: [
                Address,
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                    required: false,
                },
            ],
        });

        if (!supplier) {
            t.rollback();
            return res.status(404).json({
                message: `Supplier not found`,
            });
        }

        //Checking if action belongs to user Business
        if (supplier.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                supplier[att] = params[att];
            }
        });

        if (address) {
            if (supplier.address) {
                await Address.update(address, {
                    where: {
                        id: supplier.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                supplier.addressId = new_address.id;
                await supplier.save({ transaction: t });
            }
        }

        if (phones) {
            //Removing other phones
            const phone_supplier = await PhoneSupplier.findAll({
                where: {
                    supplierId: supplier.id,
                },
            });

            if (phone_supplier.length !== 0) {
                await PhoneSupplier.destroy({
                    where: {
                        supplierId: supplier.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_supplier.map(item => item.phoneId),
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
                    supplierId: supplier.id,
                    phoneId: phone.id,
                });
            }

            await PhoneSupplier.bulkCreate(addBulk, { transaction: t });
        }

        await supplier.save();
        await t.commit();

        const to_return = await Supplier.scope("to_return").findByPk(id);

        res.status(200).json(to_return);
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

export const getSupplier = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const supplier = await Supplier.findByPk(id, {
            attributes: [
                "id",
                "name",
                "observations",
                "businessId",
                "createdAt",
            ],
            include: [
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Address,
                    attributes: [
                        "street_1",
                        "street_2",
                        "description",
                        "city",
                        "postalCode",
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
                },
                {
                    model: Phone,
                    attributes: ["number", "description"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!supplier) {
            return res.status(404).json({
                message: `Supplier not found`,
            });
        }

        //Permission Check
        if (supplier?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Supplier.scope("to_return").findByPk(id);

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

export const deleteSupplier = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const supplier = await Supplier.findByPk(id);

        if (!supplier) {
            return res.status(404).json({
                message: `Supplier not found`,
            });
        }

        //Permission Check
        if (supplier?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await supplier.destroy();

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

export const findAllSuppliers = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, all_data, ...params } =
            req.query;
        const user = req.user;

        //Searchable
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
                where(fn("unaccent", col("Supplier.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_suppliers = await Supplier.findAndCountAll({
            attributes: ["id", "name", "observations"],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            include: [
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Address,
                    attributes: [
                        "street_1",
                        "street_2",
                        "description",
                        "city",
                        "postalCode",
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
                },
                {
                    model: Phone,
                    attributes: ["number", "description"],
                    through: {
                        attributes: [],
                    },
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_suppliers.count / limit);
        if (found_suppliers.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_suppliers.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_suppliers.rows,
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

//Resources
export const newResource = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { area } = req.params;
        const { ...params } = req.body;

        const found_area = await getAreaCache(area);

        if (!found_area) {
            return res.status(404).json({
                message: `Area provided not found`,
            });
        }

        if (found_area.type !== "SALE") {
            return res.status(404).json({
                message: `Area provided is not SALE type`,
            });
        }

        const resource: Resource = Resource.build({
            ...params,
            areaId: area,
            businessId: user.businessId,
        });

        await resource.save();

        const to_return = await Resource.findByPk(resource.id, {
            include: Area,
        });

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

export const editResource = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Resource.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "areaId", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const resource = await Resource.findByPk(id, { include: [Area] });

        if (!resource) {
            return res.status(404).json({
                message: `Resource not found`,
            });
        }

        //Permission Check
        if (resource.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                resource[att] = params[att];
            }
        });

        await resource.save();

        const to_return = await Resource.scope("to_return").findByPk(
            resource.id
        );
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

export const deleteResource = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const resource = await Resource.findByPk(id);

        if (!resource || resource.businessId !== user.businessId) {
            return res.status(404).json({
                message: `Recurso no encontrado`,
            });
        }

        const isRelation = await ResourceProduct.findAll({
            where: {
                resourceId: id,
            },
        });

        if (isRelation.length > 0) {
            return res.status(406).json({
                message: `El recurso no puede ser eliminado actualmente tiene relaciones con otros productos.`,
            });
        }

        const exitsReservationWith = SelledProduct.findAll({
            where: {
                startDateAt: {
                    [Op.gt]: new Date(),
                },
                resourceId: id,
            },
        });

        if ((await exitsReservationWith).length > 0) {
            return res.status(406).json({
                message: `El recurso no puede ser eliminado actualmente tiene reservas activas o próximas.`,
            });
        }

        await resource.destroy();

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

export const findAllResourcesByBusiness = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const {
            per_page,
            page,
            order,
            orderBy,
            all_data,
            search,
            productId,
            ...params
        } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["isAvailable", "isReservable", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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

            where_clause[Op.and] = [
                where(fn("unaccent", col("Resource.code")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        if (productId) {
            const product = await Product.findByPk(productId);
            if (!product) {
                return res
                    .status(404)
                    .json({ message: "El producto especificado no existe." });
            }
            const resources = await product.$get("resources");
            const resourceIds = resources.map((resource: any) => resource.id);
            where_clause.id = { [Op.in]: resourceIds };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["code", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_resources = await Resource.findAndCountAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: Area,
                    attributes: ["name"],
                    paranoid: false,
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_resources.count / limit);
        if (found_resources.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_resources.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_resources.rows,
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
export const findAllResources = async (req: any, res: Response) => {
    try {
        const { areaId } = req.params;
        const user: User = req.user;
        const { per_page, page, order, orderBy, all_data, search, ...params } =
            req.query;

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(400).json({
                message: `Area provided must be a SALE type`,
            });
        }

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["isAvailable", "isReservable", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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

            where_clause[Op.and] = [
                where(fn("unaccent", col("Resource.code")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["code", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_resources = await Resource.findAndCountAll({
            distinct: true,
            where: {
                areaId,
                ...where_clause,
            },
            include: [
                {
                    model: Area,
                    attributes: ["name"],
                    paranoid: false,
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_resources.count / limit);
        if (found_resources.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_resources.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_resources.rows,
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

//Sales Category
export const newSalesCategory = async (req: any, res: Response) => {
    try {
        const { index, ...params } = req.body;
        const user: User = req.user;

        //Validations
        const nameCategory = await SalesCategory.findOne({
            where: {
                businessId: user.businessId,
                name: params.name,
            },
        });

        if (nameCategory) {
            return res.status(400).json({
                message: `El nombre introducido ya existe como Categoría de venta.`,
            });
        }

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);

        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        //Obtain the last operationNumber
        let lastCategoryIndex: number = await SalesCategory.max("index", {
            where: {
                businessId: user.businessId,
            },
        });

        if (!lastCategoryIndex) {
            lastCategoryIndex = 1;
        } else {
            //@ts-ignore
            lastCategoryIndex += 1;
        }

        const salesCategory: SalesCategory = SalesCategory.build({
            businessId: user.businessId,
            index: index ? index : lastCategoryIndex,
            ...params,
        });

        await salesCategory.save();

        const to_return = await SalesCategory.scope("to_return").findByPk(
            salesCategory.id
        );

        //Woocommerce
        if (isWooActive && to_return?.visibleOnline) {
            wooQueue.add(
                {
                    code: "CREATE_CATEGORY",
                    params: {
                        salesCategory: salesCategory,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

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

export const editSalesCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(SalesCategory.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        //Validations
        if (params.name) {
            const nameCategory = await SalesCategory.findOne({
                where: {
                    businessId: user.businessId,
                    name: params.name,
                    [Op.not]: {
                        id,
                    },
                },
            });

            if (nameCategory) {
                return res.status(400).json({
                    message: `El nombre introducido ya existe como Categoría de venta.`,
                });
            }
        }

        const salesCategory = await SalesCategory.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!salesCategory) {
            return res.status(404).json({
                message: `SalesCategory not found`,
            });
        }

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        //Permission Check
        if (salesCategory.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                salesCategory[att] = params[att];
            }
        });

        await salesCategory.save();

        const to_return = await SalesCategory.scope("to_return").findByPk(
            salesCategory.id
        );

        //Woocommerce
        if (isWooActive) {
            if (to_return?.externalId && !to_return.visibleOnline) {
                wooQueue.add(
                    {
                        code: "DELETE_CATEGORY",
                        params: {
                            salesCategory: to_return,
                            businessId: user.businessId,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            } else if (to_return?.externalId) {
                wooQueue.add(
                    {
                        code: "UPDATE_CATEGORY",
                        params: {
                            salesCategory: salesCategory,
                            businessId: user.businessId,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            } else {
                wooQueue.add(
                    {
                        code: "CREATE_CATEGORY",
                        params: {
                            salesCategory: salesCategory,
                            businessId: user.businessId,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }

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

export const findAllSalesCategory = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, all_data, ...params } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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

            where_clause[Op.and] = [
                where(fn("unaccent", col("SalesCategory.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_scategories = await SalesCategory.findAndCountAll({
            attributes: [
                "id",
                "name",
                "description",
                "isActive",
                "index",
                "createdAt",
                "visibleOnline",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["index", "ASC"]],
        });

        let totalPages = Math.ceil(found_scategories.count / limit);
        if (found_scategories.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_scategories.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_scategories.rows,
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

export const getSalesCategoryActives = async (req: any, res: Response) => {
    try {
        const { areaId } = req.query;
        const user: User = req.user;

        let to_return: any = [];
        let area: Area | null;
        let where_area: any = {};

        if (areaId) {
            area = await Area.findByPk(areaId, { include: [SalesCategory] });

            if (!area) {
                return res.status(404).json({
                    message: `Area not found`,
                });
            }

            if (area.type !== "SALE") {
                return res.status(400).json({
                    message: `You must provied a valid SALE type area.`,
                });
            }

            if (area!.saleByCategory) {
                where_area.id = area!.salesCategories?.map(item => item.id);
            }
        }

        to_return = await SalesCategory.findAll({
            attributes: ["id", "name", "description", "index"],
            where: {
                isActive: true,
                ...where_area,
            },
            include: [
                {
                    model: Product,
                    attributes: [],
                    where: {
                        businessId: user.businessId,
                        showForSale: true,
                        [Op.or]: [
                            {
                                stockLimit: false,
                            },
                            {
                                stockLimit: true,
                                totalQuantity: {
                                    [Op.gt]: 0,
                                },
                            },
                        ],
                    },
                },
            ],
        });

        if (areaId) {
            const found_categories_stock = await SalesCategory.findAll({
                attributes: ["id", "name", "description", "index"],
                where: {
                    isActive: true,
                    ...where_area,
                },
                include: [
                    {
                        model: Product,
                        attributes: [],
                        where: {
                            businessId: user.businessId,
                            showForSale: true,
                            totalQuantity: {
                                [Op.gt]: 0,
                            },
                        },
                        include: [
                            {
                                model: StockAreaProduct,
                                attributes: [],
                                where: {
                                    areaId: area!.stockAreaId,
                                },
                                required: true,
                            },
                        ],
                    },
                ],
            });

            //Validating unique value
            let unique_value: SalesCategory[] = [];
            found_categories_stock.forEach(item => {
                const found = to_return.find(
                    (cat: SalesCategory) => cat.id === item.id
                );
                if (!found) {
                    unique_value.push(item);
                }
            });

            to_return = to_return.concat(unique_value);
        }

        return res.status(200).json(
            to_return
                .map((item: any) => {
                    return {
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        index: item.index,
                    };
                })
                .sort((a: SalesCategory, b: SalesCategory) => a.index - b.index)
        );
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

export const deleteSalesCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const salesCategory = await SalesCategory.findByPk(id);
        const copyToReturn: SalesCategory = {
            ...salesCategory?.dataValues,
        };

        if (!salesCategory) {
            return res.status(404).json({
                message: `SalesCategory not found`,
            });
        }

        //Permission Check
        if (salesCategory.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        await salesCategory.destroy();

        //Woocommerce
        if (isWooActive && copyToReturn.externalId) {
            wooQueue.add(
                {
                    code: "DELETE_CATEGORY",
                    params: {
                        salesCategory: copyToReturn,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(200).json({
            message: `Category deleted successfully`,
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

//Inventory
export const requestChangePassword = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { email } = req.body;
        const userToken: User = req.user;

        if (!email) {
            t.rollback();
            return res.status(409).json({
                message: `El parámetro email no fue proporcionado.`,
            });
        }

        //Checking if email exist
        const user = await User.findOne({
            where: { email },
        });

        if (!user) {
            t.rollback();
            return res.status(409).json({
                message: `El usuario con correo electrónico ${email} no fue encontrado en el sistema.`,
            });
        }

        if (userToken.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
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

//List manufacturation
export const manageManufacturers = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { listManufacturer } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //BaseProduct
        const baseProduct = await Product.findByPk(id);

        if (!baseProduct) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (baseProduct.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (!["RAW", "MANUFACTURED", "STOCK"].includes(baseProduct.type)) {
            t.rollback();
            return res.status(400).json({
                message: `El producto seleccionado no puede contener manufacturas.`,
            });
        }

        //Obtaining all products to check in an after process
        const products_found = await Product.findAll({
            where: {
                id: listManufacturer,
                businessId: user.businessId,
            },
        });

        //Checking if product has already manufacturer products
        const manufacturations = await ProductManufacturation.findAll({
            where: {
                baseProductId: id,
            },
        });

        if (manufacturations.length !== 0) {
            //Destroying all dependencies
            await ProductManufacturation.destroy({
                where: {
                    baseProductId: id,
                },
                transaction: t,
            });
        }

        if (listManufacturer.length !== 0) {
            let addBulk: any = [];

            for (const manufacturerId of listManufacturer as Array<number>) {
                const found_check = products_found.find(
                    item => item.id === manufacturerId
                );

                if (!found_check) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${manufacturerId} no fue encontrado.`,
                    });
                }

                if (
                    !["MANUFACTURED", "WASTE", "RAW", "STOCK"].includes(
                        found_check.type
                    )
                ) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Los derivados de un producto solo pueden ser productos de tipo Procesado/Desperdicio/Materia Prima/Almacén`,
                    });
                }

                addBulk.push({
                    baseProductId: id,
                    manufacturedProductId: manufacturerId,
                });
            }

            await ProductManufacturation.bulkCreate(addBulk, {
                transaction: t,
            });
        }

        const product_to_emit = await Product.scope("to_return").findByPk(id, {
            transaction: t,
        });

        await t.commit();
        res.status(200).json(product_to_emit);
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

export const getPaymentWays = async (req: any, res: Response) => {
    try {
        const to_return = [
            {
                name: "Efectivo",
                code: "CASH",
            },
            {
                name: "Transferencia",
                code: "TRANSFER",
            },
            {
                name: "Tarjeta crédito/debito",
                code: "CARD",
            },
            {
                name: "Puntos",
                code: "CREDIT_POINT",
            },
        ];

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

// Create a new reservation policy
export const createReservationPolicy = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { frequency, discount, description, isActive, type, quantity } =
            req.body;

        const availableTypes = ["DISCOUNT", "CANCELATION"];

        if (!availableTypes.includes(type)) {
            return res.status(400).json({
                message: "El tipo de política de reservación no es válido",
            });
        }
        const availableFrequency = ["days", "weeks", "months"];

        if (!availableFrequency.includes(frequency)) {
            return res.status(400).json({
                message: "El tipo de política de frecuencia no es válido",
            });
        }

        const durationInDays = convertToDays(frequency, quantity);
        const policy = await ReservationPolicy.findOne({
            where: {
                businessId: user.businessId,
                durationInDays,
                type,
            },
        });

        if (policy) {
            return res.status(400).json({
                message:
                    "Ya existe una política de reservación con esas características",
            });
        }

        const newPolicy = await ReservationPolicy.create({
            type,
            frequency,
            quantity,
            discount,
            durationInDays,
            description,
            isActive: isActive ?? false,
            businessId: user.businessId,
        });
        return res.status(201).json(newPolicy);
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

// findAllReservationPolicy
export const findAllReservationPolicy = async (req: any, res: Response) => {
    try {
        const { isActive, type } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        if (isActive) {
            where_clause["isActive"] = true;
        }
        if (type) {
            where_clause["type"] = type;
        }

        const reservationPolicy = await ReservationPolicy.findAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            order: [["createdAt", "DESC"]],
        });
        res.status(200).json({ items: reservationPolicy });
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

// Update a reservation policy
export const updateReservationPolicy = async (req: any, res: Response) => {
    try {
        const id = req.params.id;
        const user: User = req.user;
        const { frequency, discount, description, isActive, quantity } =
            req.body;

        const policy = await ReservationPolicy.findByPk(id);

        if (!policy || policy.businessId !== user.businessId) {
            return res.status(404).json({
                message: "La política de reservación no existe en su negocio",
            });
        }

        if (frequency) {
            const availableFrequency = ["days", "weeks", "months"];

            if (!availableFrequency.includes(frequency)) {
                return res.status(400).json({
                    message: "El tipo de política de frecuencia no es válido",
                });
            }
            const durationInDays = convertToDays(frequency, quantity);
            policy.frequency = frequency;
            policy.durationInDays = durationInDays;
        }

        if (discount) {
            policy.discount = discount;
        }
        if (description) {
            policy.description = description;
        }

        policy.isActive = !!isActive;
        if (quantity) {
            policy.quantity = quantity;
        }

        const durationInDays = convertToDays(frequency, quantity);

        const duplicatePolicy = await ReservationPolicy.findOne({
            where: {
                id: {
                    [Op.not]: policy.id,
                },
                businessId: user.businessId,
                durationInDays,
                type: policy.type,
            },
        });

        if (duplicatePolicy) {
            return res.status(400).json({
                message:
                    "Ya existe una política de reservación con esas características",
            });
        }

        await policy.save();

        const to_return = await ReservationPolicy.findByPk(policy.id);

        return res.status(201).json(to_return);
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

// Delete a reservation policy
export const deleteReservationPolicy = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;
        const policy = await ReservationPolicy.findByPk(id);

        if (!policy || policy.businessId !== user.businessId) {
            return res.status(404).json({
                message: "La política de reservación no existe en su negocio",
            });
        }

        await ReservationPolicy.destroy({
            where: { id },
        });

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

const convertToDays = (frequency: string, quantity: number) => {
    switch (frequency.toLowerCase()) {
        case "days":
            return quantity;
        case "weeks":
            return quantity * 7;
        case "months":
            return quantity * 30;
        default:
            return 0;
    }
};
