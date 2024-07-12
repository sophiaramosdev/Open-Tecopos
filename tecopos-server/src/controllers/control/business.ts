import { Response } from "express";
import { Op } from "sequelize";
import moment, { Moment } from "moment";

import db from "../../database/connection";
import Business from "../../database/models/business";
import SubscriptionPlan from "../../database/models/subscriptionPlan";
import Price from "../../database/models/price";
import Area from "../../database/models/area";
import PriceSystem from "../../database/models/priceSystem";
import Currency from "../../database/models/currency";
import AvailableCurrency from "../../database/models/availableCurrency";
import Image from "../../database/models/image";
import ImageBusiness from "../../database/models/imageBusiness";
import { businessDefaultConfig } from "../../helpers/businessDefaultConfig";
import ConfigurationKey from "../../database/models/configurationKey";
import User from "../../database/models/user";
import BusinessCategory from "../../database/models/businessCategory";
import { emailQueue } from "../../bull-queue/email";
import BusinessBranch from "../../database/models/businessBranch";
import Product from "../../database/models/product";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Logger from "../../lib/logger";
import PaymentGateway from "../../database/models/paymentGateway";
import { redisClient } from "../../../app";
import { getUserTermKey } from "../../helpers/redisStructure";
import Role from "../../database/models/role";

//Business
export const newBusiness = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { images, ...params } = req.body;

        const allowedTypes = [
            "RESTAURANT",
            "SHOP",
            "DATES",
            "PRODUCTION",
            "STOCK",
        ];
        if (params.type && !allowedTypes.includes(params.type)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.type} is not an allowed type. Fields allowed: ${allowedTypes}`,
            });
        }

        //Verifying if DNI exist
        const business_dni_duplicate_found = await Business.findOne({
            where: {
                dni: params.dni,
            },
            paranoid: false,
        });

        if (business_dni_duplicate_found) {
            t.rollback();
            return res.status(400).json({
                message: `Ya existe un negocio con el DNI proporcionado. Por favor, seleccione otro.`,
            });
        }

        //Verifying if slug exist
        const slug_duplicate_found = await Business.findOne({
            where: {
                slug: params.slug,
            },
        });

        if (slug_duplicate_found) {
            t.rollback();
            return res.status(400).json({
                message: `Ya existe un negocio con el slug proporcionado. Por favor, seleccione otro.`,
            });
        }

        //Finding subscriptionPlan
        const customPlan = await SubscriptionPlan.findOne({
            where: {
                code: "CUSTOM",
            },
        });

        let added = {};
        if (
            params.subscriptionPlanPrice &&
            params.subscriptionPlanId === customPlan?.id
        ) {
            added = {
                subscriptionPlanPrice: params.subscriptionPlanPrice,
            };
        }

        const business: Business = Business.build(
            {
                ...params,
                ...added,
                licenceUntil: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            },
            {
                include: [
                    {
                        model: Price,
                        as: "subscriptionPlanPrice",
                    },
                ],
            }
        );

        //Default params
        business.status = "CREATED";
        await business.save({ transaction: t });

        //Creating main stock
        const area = Area.build({
            name: "Almacén principal",
            code: "AP",
            type: "STOCK",
            isMainStock: true,
            businessId: business.id,
        });

        await area.save({ transaction: t });

        //Creating main priceSystem
        const priceSystem = PriceSystem.build({
            name: "Principal",
            isMain: true,
            businessId: business.id,
        });

        await priceSystem.save({ transaction: t });

        //Creating currencies associated
        const currencies_availables = await Currency.findAll({
            where: {
                code: ["CUP", "USD", "EUR", "PTP", "MLC"],
            },
        });
        let business_currencies = [];
        for (const currency of currencies_availables) {
            const isMain = currency.code === "CUP";

            business_currencies.push({
                businessId: business.id,
                isActive: true,
                exchangeRate: 1,
                currencyId: currency.id,
                isMain,
            });
        }

        await AvailableCurrency.bulkCreate(business_currencies, {
            transaction: t,
        });

        //Images
        if (images) {
            const images_found = await Image.findAll({
                where: {
                    id: images,
                },
            });

            let bulkImages = [];
            for (const imageId of images) {
                const exist = images_found.find(item => item.id == imageId);

                if (!exist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La imagen con id ${imageId} no fue encontrada.`,
                    });
                }

                bulkImages.push({
                    imageId,
                    businessId: business.id,
                });
            }

            await ImageBusiness.bulkCreate(bulkImages, { transaction: t });
        }

        //Definig defaults configurations
        await ConfigurationKey.bulkCreate(businessDefaultConfig(business.id), {
            transaction: t,
        });

        //Adding defaults paymentGateways
        const defaultPaymentGateways = [
            {
                code: "G_TROPIPAY",
                businessId: business.id,
                isActive: false,
                name: "Tropipay",
            },
            {
                code: "G_TECOPAY",
                businessId: business.id,
                isActive: false,
                name: "Tecopay",
            },
            {
                code: "G_COD",
                businessId: business.id,
                isActive: false,
                name: "Pago en efectivo",
            },
            {
                code: "G_CHEQUE",
                businessId: business.id,
                isActive: false,
                name: "Transferencia bancaria directa",
            },
        ];

        await PaymentGateway.bulkCreate(defaultPaymentGateways, {
            transaction: t,
        });

        const business_to_emit = await Business.scope("to_control").findByPk(
            business.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(201).json(business_to_emit);
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

export const checkBusinessSlug = async (req: any, res: Response) => {
    try {
        const { slug } = req.body;

        //Verifying if slug exist
        const slug_duplicate_found = await Business.findOne({
            where: {
                slug,
            },
        });

        if (slug_duplicate_found) {
            return res.status(400).json({
                message: `Ya existe un negocio con el slug proporcionado. Por favor, seleccione otro.`,
            });
        }

        res.status(200).json({
            message: "El slug proporcionado se encuentra disponible.",
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

export const checkBusinessDNI = async (req: any, res: Response) => {
    try {
        const { dni } = req.body;

        //Verifying if DNI exist
        const business_dni_duplicate_found = await Business.findOne({
            where: {
                dni,
            },
            paranoid: false,
        });

        if (business_dni_duplicate_found) {
            return res.status(400).json({
                message: `Ya existe un negocio con el DNI proporcionado. Por favor, seleccione otro.`,
            });
        }

        res.status(200).json({
            message: "El DNI proporcionado se encuentra disponible.",
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

export const editBusiness = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const { subscriptionPlanPrice, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `id param is missing`,
            });
        }

        const allowedTypes = [
            "RESTAURANT",
            "SHOP",
            "DATES",
            "PRODUCTION",
            "STOCK",
        ];
        if (params.type && !allowedTypes.includes(params.type)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.type} is not an allowed type. Fields allowed: ${allowedTypes}`,
            });
        }

        const modelKeys = Object.keys(Business.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att) && !user.isSuperAdmin) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        const allowedStatus = ["ACTIVE", "INACTIVE"];
        if (params.status && !allowedStatus.includes(params.status)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.type} is not an allowed type. Fields allowed: ${allowedStatus}`,
            });
        }

        if (message) {
            t.rollback();
            return res.status(401).json({ message });
        }

        const business = await Business.findByPk(id, {
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code", "description"],
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: User,
                    as: "masterOwner",
                    attributes: ["displayName", "username", "email"],
                    paranoid: false,
                },
            ],
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio no fue encontrado`,
            });
        }

        let masterChanged = false;
        if (
            params.masterOwnerId &&
            business.masterOwnerId !== Number(params.masterOwnerId)
        ) {
            masterChanged = true;
        }

        if (subscriptionPlanPrice) {
            if (business.subscriptionPlanPrice) {
                if (
                    subscriptionPlanPrice.amount !==
                    business.subscriptionPlanPrice.amount
                ) {
                    business.subscriptionPlanPrice.amount =
                        subscriptionPlanPrice.amount;
                    await business.subscriptionPlanPrice.save({
                        transaction: t,
                    });
                }
            } else {
                const new_price = Price.build({
                    amount: subscriptionPlanPrice.amount,
                    codeCurrency: subscriptionPlanPrice.codeCurrency,
                });

                await new_price.save({ transaction: t });
                business.subscriptionPlanPriceId = new_price.id;
            }
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                business[att] = params[att];
            }
        });

        await business.save({ transaction: t });

        const business_to_emit = await Business.scope("to_control").findByPk(
            id,
            {
                transaction: t,
            }
        );

        await t.commit();

        //Send notification email
        if (masterChanged) {
            emailQueue.add(
                {
                    code: "MASTER_CHANGE",
                    params: {
                        businessId: business_to_emit?.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(200).json(business_to_emit);

        //Verifying redis users cache
        const users = await User.findAll({
            where: {
                businessId: business.id,
            },
        });

        for (const itemUser of users) {
            //Analyzing cache and remove key in case exist
            await redisClient.del(getUserTermKey(itemUser.id, "loginData"));
        }
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

//Branches
export const getAllBusinessBranches = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const business = await Business.findByPk(id, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: Image,
                            as: "logo",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                },
            ],
        });

        if (!business) {
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        res.status(200).json(business.branches);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const newBusinessBranch = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { branchId } = req.body;
        const { id } = req.params;

        //Analyzing business type
        const business = await Business.findByPk(id);

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        if (Number(branchId) === Number(id)) {
            t.rollback();
            return res.status(400).json({
                message: `No puede establecer como hijo al mismo negocio padre.`,
            });
        }

        if (business.mode !== "GROUP") {
            business.mode = "GROUP";
            await business.save({ transaction: t });
        }

        const branch: BusinessBranch = BusinessBranch.build({
            businessBaseId: id,
            branchId,
        });

        await branch.save({ transaction: t });

        const to_return = await Business.findByPk(branchId, {
            attributes: ["id", "name"],
            include: [
                {
                    model: Image,
                    as: "logo",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            transaction: t,
        });

        await t.commit();

        res.status(201).json(to_return);

        //Verifying redis users cache
        const users = await User.findAll({
            where: {
                businessId: business.id,
            },
            include: [
                {
                    model: Role,
                    where: {
                        code: ["GROUP_OWNER"],
                    },
                },
            ],
        });

        for (const itemUser of users) {
            //Analyzing cache and remove key in case exist
            await redisClient.del(getUserTermKey(itemUser.id, "loginData"));
        }
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

export const deleteBusinessBranch = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { businessId, branchId } = req.params;

        if (!businessId) {
            return res.status(406).json({
                message: `El parámetro businessId no fue introducido`,
            });
        }

        if (!branchId) {
            return res.status(406).json({
                message: `El parámetro branchId no fue introducido`,
            });
        }

        //Analyzing business type
        const business = await Business.findByPk(businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                    attributes: ["id", "name"],
                },
            ],
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        if (business.branches?.length === 0) {
            business.mode = "SIMPLE";

            await business.save({ transaction: t });
        }

        const branch = await BusinessBranch.findOne({
            where: {
                businessBaseId: businessId,
                branchId,
            },
        });

        if (!branch) {
            return res.status(404).json({
                message: `Branch not found`,
            });
        }

        await branch.destroy({ transaction: t });

        await t.commit();

        res.status(204).json({});

        //Verifying redis users cache
        const users = await User.findAll({
            where: {
                businessId: business.id,
            },
            include: [
                {
                    model: Role,
                    where: {
                        code: ["GROUP_OWNER"],
                    },
                },
            ],
        });

        for (const itemUser of users) {
            //Analyzing cache and remove key in case exist
            await redisClient.del(getUserTermKey(itemUser.id, "loginData"));
        }
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

export const checkQuantityProductConsistency = async (
    req: any,
    res: Response
) => {
    try {
        let productUpdatesQuantities: Array<{
            id: number;
            totalQuantity: number;
        }> = [];

        const products = await Product.findAll({
            where: {
                type: "STOCK",
            },
            include: [StockAreaProduct],
        });

        for (const product of products) {
            const totalQuantity =
                product.stockAreaProducts?.reduce(
                    (total, item) => (total += item.quantity),
                    0
                ) || 0;

            if (totalQuantity !== product.totalQuantity) {
                productUpdatesQuantities.push({
                    id: product.id,
                    totalQuantity,
                });
            }
        }

        await Product.bulkCreate(productUpdatesQuantities, {
            updateOnDuplicate: ["totalQuantity"],
        });

        res.status(200).json({
            total: productUpdatesQuantities.length,
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
