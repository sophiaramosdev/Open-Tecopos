import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";

import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";

import User from "../../database/models/user";
import EconomicCycle from "../../database/models/economicCycle";
import Image from "../../database/models/image";
import PriceSystem from "../../database/models/priceSystem";
import {
    exchangeCurrency,
    internalCheckerResponse,
    mathOperation,
} from "../../helpers/utils";
import Logger from "../../lib/logger";
import { closeEconomicCycle, openEconomicCycle } from "../helpers/reports";
import ConfigurationKey from "../../database/models/configurationKey";
import OrderReceipt from "../../database/models/orderReceipt";
import SelledProduct from "../../database/models/selledProduct";
import Price from "../../database/models/price";
import Variation from "../../database/models/variation";
import CurrencyPayment from "../../database/models/currencyPayment";
import Area from "../../database/models/area";
import Product from "../../database/models/product";
import { productDuplicator } from "../helpers/products";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import ProductPrice from "../../database/models/productPrice";
import { config_transactions } from "../../database/seq-transactions";
import { redisClient } from "../../../app";
import {
    getActiveEconomicCycleCache,
    getBusinessConfigCache,
    getCurrenciesCache,
    getLongTermKey,
} from "../../helpers/redisStructure";
import { economicCycleQueue } from "../../bull-queue/economicCycle";
import { SimplePrice } from "../../interfaces/commons";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";

//Economic Cycle
export const manageEconomicCycle = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { name, observations, priceSystemId } = req.body;
        const { operation } = req.params;
        const user: User = req.user;

        const allowedTypes = ["open", "close"];
        if (operation && !allowedTypes.includes(operation)) {
            t.rollback();
            return res.status(400).json({
                message: `${operation} is not an allowed operation. Operations allowed: ${allowedTypes}`,
            });
        }

        //Checking
        const activeEconomicCycle = await EconomicCycle.scope(
            "to_return"
        ).findOne({
            where: {
                businessId: user.businessId,
                isActive: true,
            },
        });

        //Generals
        if (operation === "open") {
            if (activeEconomicCycle) {
                t.rollback();
                return res.status(406).json({
                    message: `Ya existe un ciclo ecónomico abierto.`,
                });
            } else {
                const result = await openEconomicCycle(
                    {
                        businessId: user.businessId,
                        name,
                        userId: user.id,
                        observations,
                        priceSystemId,
                    },
                    t
                );

                if (!internalCheckerResponse(result)) {
                    t.rollback();
                    Logger.warn(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "manageEconomicCycle",
                            "X-App-Origin": req.header("X-App-Origin"),
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }

                const to_return = await EconomicCycle.scope(
                    "to_return"
                ).findByPk(result.data.economiccycle.id, { transaction: t });

                await t.commit();

                //Analyzing cache and remove key in case exist
                await redisClient.del(
                    getLongTermKey(user.businessId, "econocycle", "get")
                );

                return res.status(201).json(to_return);
            }
        } else {
            const result = await closeEconomicCycle(
                {
                    businessId: user.businessId,
                    userId: user.id,
                    isManualAction: true,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.warn(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "manageEconomicCycle",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(406).json({
                    message: result.message,
                });
            }

            const to_return = await EconomicCycle.scope("to_return").findByPk(
                result.data.economiccycle.id,
                { transaction: t }
            );

            await t.commit();

            //Analyzing cache and remove key in case exist
            await redisClient.del(
                getLongTermKey(user.businessId, "econocycle", "get")
            );

            if (activeEconomicCycle) {
                economicCycleQueue.add(
                    {
                        code: "AFTER_ECONOMIC_CYCLE_CLOSE",
                        params: {
                            businessId: user.businessId,
                            economicCycleId: activeEconomicCycle.id,
                            closedAt: moment().toDate(),
                        },
                    },
                    { attempts: 30, removeOnComplete: true, removeOnFail: true }
                );
            }

            return res.status(201).json(to_return);
        }
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

export const editEconomicCycle = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (isNaN(id)) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(EconomicCycle.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "openById",
            "closedById",
            "openDate",
            "closedDate",
            "isActive",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const economicCycle = await EconomicCycle.findByPk(id);

        let priceSystemHasChanged = false;
        if (
            params.priceSystemId &&
            params.priceSystemId !== economicCycle?.priceSystemId
        ) {
            priceSystemHasChanged = true;
        }

        if (!economicCycle) {
            return res.status(404).json({
                message: `economicCycle not found`,
            });
        }

        if (!economicCycle.isActive) {
            return res.status(404).json({
                message: `No puede editar ciclos económicos cerrados.`,
            });
        }

        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este ciclo económico.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                economicCycle[att] = params[att];
            }
        });

        await economicCycle.save();

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "econocycle", "get")
        );

        //Emit via Scokets
        if (priceSystemHasChanged) {
            req.io.to(`business:${user.businessId}`).emit("logout-app");
        }

        const to_return = await EconomicCycle.scope("to_return").findByPk(id);

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

export const deleteEconomicCycle = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const economicCycle = await EconomicCycle.findByPk(id);

        if (!economicCycle) {
            t.rollback();
            return res.status(404).json({
                message: `EconomicCycle not found`,
            });
        }

        //Permission Check
        if (economicCycle?.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        await economicCycle.destroy({ transaction: t });

        //Removing all orders associated to this economicCycle
        await OrderReceipt.destroy({
            where: {
                economicCycleId: id,
            },
            transaction: t,
        });

        await t.commit();

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "econocycle", "get")
        );

        res.status(204).json({});
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

export const getEconomicCycle = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const economicCycle = await EconomicCycle.scope("to_return").findByPk(
            id
        );

        if (!economicCycle) {
            return res.status(404).json({
                message: `EconomicCycle not found`,
            });
        }

        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Filtering according role
        if (
            user.roles?.some(
                item =>
                    item.code === "MANAGER_SHIFT" ||
                    item.code === "MANAGER_ECONOMIC_CYCLE"
            )
        ) {
            const last7Cycles = await EconomicCycle.findAll({
                where: {
                    businessId: user.businessId,
                },
                limit: 7,
                order: [["createdAt", "DESC"]],
            });

            const listCycles: Array<number> = last7Cycles.map(item => item.id);

            if (!listCycles.includes(economicCycle.id)) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }
        } else if (
            user.roles?.some(item => item.code === "MANAGER_SALES") &&
            !economicCycle.isActive
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json(economicCycle);
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

export const getActiveEconomicCycle = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const economicCycle = await EconomicCycle.scope("to_return").findOne({
            where: {
                businessId: user.businessId,
                isActive: true,
            },
        });

        if (!economicCycle) {
            return res.status(200).json(null); //That is because in some places you need to continues with the app despite there is no active economiccycle
        }

        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json(economicCycle);
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

export const findAllEconomicCycles = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            status,
            dateFrom,
            dateTo,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["isActive", "createdAt", "openDate"];

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

        //Order
        let ordenation;
        if (
            orderBy &&
            ["createdAt", "openDate", "closedDate"].includes(orderBy)
        ) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["openDate", "DESC"]];
        }

        //With pagination
        let limit = per_page ? parseInt(per_page) : pag_params.limit;
        //Filtering according role
        if (
            user.roles?.some(
                item =>
                    item.code === "MANAGER_SHIFT" ||
                    item.code === "MANAGER_ECONOMIC_CYCLE"
            )
        ) {
            limit = 7;
        } else if (user.roles?.some(item => item.code === "MANAGER_SALES")) {
            limit = 1;
        }

        let offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        let { count, rows } = await EconomicCycle.findAndCountAll({
            attributes: [
                "id",
                "name",
                "observations",
                "openDate",
                "closedDate",
                "priceSystemId",
                "isActive",
            ],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            include: [
                {
                    model: User,
                    as: "openBy",
                    attributes: [
                        "username",
                        "email",
                        "username",
                        "displayName",
                    ],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "closedBy",
                    attributes: [
                        "username",
                        "email",
                        "username",
                        "displayName",
                    ],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: PriceSystem,
                    attributes: ["id", "name", "isMain"],
                    paranoid: false,
                },
            ],
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(count / limit);

        if (limit === 7 || limit === 1) {
            totalPages = 1;
            count = limit;
        }
        if (count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: rows,
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

export const getAllAreaSalesDuplicator = async (req: any, res: Response) => {
    try {
        const user = req.user;

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);

        const duplicator_businessId = configurations.find(
            item => item.key === "duplicator_businessId"
        )?.value;

        if (!duplicator_businessId) {
            return res.status(400).json({
                message: `No hay un negocio duplicador gestionado.`,
            });
        }

        const found_areas = await Area.findAll({
            attributes: ["id", "name"],
            where: { businessId: duplicator_businessId, type: "SALE" },
        });

        res.status(200).json(found_areas);
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

interface AreaSalesItem {
    areasFromId: Array<number>;
    areaToId: number;
    keepSameData: boolean;
    plannedAmount?: number;
    codeCurrency?: string;
    allowedPaymentCurrencies?: string;
    ordersUpTo?: number;
    isFixedTransfers: boolean;
    isFixedMarkOrders: boolean;
    fixedCategories: Array<number>;
    excluedCategories: Array<number>;
    excludedProducts: Array<number>;
    includeTips: boolean;
    includeExtractions: boolean;
    includeDeposits: boolean;
    selectedOrders: Array<number>;
}

export const duplicatorEconomicCycle = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { economicCycleId, registerAt, salesAreas } = req.body;
        const user: User = req.user;

        //Obtaining the open Economic Cycle
        const economicCycle = await EconomicCycle.findByPk(economicCycleId);

        if (!economicCycle) {
            t.rollback();
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        //Permission Check
        if (economicCycle.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);

        const duplicator_businessId = configurations.find(
            item => item.key === "duplicator_businessId"
        )?.value;

        if (!duplicator_businessId) {
            t.rollback();
            return res.status(400).json({
                message: `No hay un negocio duplicador gestionado.`,
            });
        }

        //1. Creating economic cycle
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            Number(duplicator_businessId)
        );

        if (activeEconomicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `Existe un ciclo abierto en el negocio de destino. Por favor, ciérrelo para continuar.`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(
            Number(duplicator_businessId)
        );

        const duplicateEconomicCycle: EconomicCycle = EconomicCycle.build({
            name: economicCycle.name,
            businessId: Number(duplicator_businessId),
            openById: economicCycle.openById,
            openDate: `${moment(registerAt).format("YYYY-MM-DD")} ${moment(
                economicCycle.createdAt
            ).format("HH:mm")}`,
            isActive: true,
        });

        const priceSystem = await PriceSystem.findOne({
            where: {
                isMain: true,
                businessId: Number(duplicator_businessId),
            },
            transaction: t,
        });

        if (!priceSystem) {
            t.rollback();
            return res.status(404).json({
                message: `No se encontró un sistema de precios en el sistema`,
            });
        }

        duplicateEconomicCycle.priceSystemId = priceSystem.id;
        await duplicateEconomicCycle.save({ transaction: t });

        //Generals
        let bulkNewOrdersToCreate: Array<Partial<OrderReceipt>> = [];
        let bulkOperations = [];

        for (const procesatorArea of salesAreas as AreaSalesItem[]) {
            const allowedCurrencies =
                procesatorArea.allowedPaymentCurrencies || [];

            let currencyPayment: any = {
                model: CurrencyPayment,
                separate: true,
            };

            if (!procesatorArea.keepSameData && procesatorArea.codeCurrency) {
                currencyPayment.where = {
                    codeCurrency: [
                        procesatorArea.codeCurrency,
                        ...allowedCurrencies,
                    ],
                };
            }

            let pricesWhere: any = {};

            if (!procesatorArea.keepSameData) {
                pricesWhere = {
                    codeCurrency: [
                        procesatorArea.codeCurrency,
                        ...allowedCurrencies,
                    ],
                };
            }

            const ordersToDuplicate = await OrderReceipt.findAll({
                where: {
                    economicCycleId: economicCycle.id,
                    areaSalesId: procesatorArea.areasFromId,
                    status: {
                        [Op.not]: ["CANCELLED", "REFUNDED", "WITH_ERRORS"],
                    },
                },
                include: [
                    {
                        model: SelledProduct,
                        separate: true,
                        include: [
                            { model: Product, paranoid: false },
                            {
                                model: Price,
                                as: "priceTotal",
                            },
                            {
                                model: Price,
                                as: "priceUnitary",
                            },
                            { model: Variation },
                        ],
                    },
                    {
                        model: OrderReceiptPrice,
                        where: pricesWhere,
                    },
                    OrderReceiptTotal,
                    currencyPayment,
                    {
                        model: User,
                        as: "salesBy",
                        paranoid: false,
                    },
                    {
                        model: User,
                        as: "managedBy",
                        paranoid: false,
                    },
                    {
                        model: Area,
                        paranoid: false,
                    },
                    {
                        model: Price,
                        as: "shippingPrice",
                    },
                    {
                        model: Price,
                        as: "amountReturned",
                    },
                ],
                transaction: t,
            });

            //Duplicate products
            let productsToDuplicate: Array<number> = [];
            for (const order of ordersToDuplicate) {
                order.selledProducts.forEach(item => {
                    if (
                        !productsToDuplicate.includes(
                            item.product.universalCode
                        )
                    ) {
                        productsToDuplicate.push(item.product.universalCode);
                    }
                });
            }

            await productDuplicator(
                {
                    universalCodes: productsToDuplicate,
                    fromBusinessId: economicCycle.businessId,
                    toBusinessId: Number(duplicator_businessId),
                    duplicateProductCategory: true,
                    duplicateSalesCategory: true,
                },
                t
            );

            const foundAllProductInDestination = await Product.findAll({
                where: {
                    businessId: Number(duplicator_businessId),
                },
                include: [ProductPrice],
                transaction: t,
            });

            //2. Coping selled products
            let listAddedIds: Array<number> = [];
            let listRemainIds = ordersToDuplicate.map(item => item.id);
            let mandatoryIds = [];

            if (procesatorArea.keepSameData) {
                mandatoryIds = ordersToDuplicate.map(item => item.id);
            } else {
                //Analyzing firstly orders selected
                if (
                    procesatorArea.selectedOrders &&
                    procesatorArea.selectedOrders.length > 0
                ) {
                    for (const operationNumber of procesatorArea.selectedOrders) {
                        const foundOrder = ordersToDuplicate.find(
                            item =>
                                item.operationNumber === Number(operationNumber)
                        );
                        if (foundOrder) {
                            mandatoryIds.push(foundOrder.id);
                        }
                    }
                }

                for (const order of ordersToDuplicate) {
                    //2a. Finding order fixedTransfers
                    if (procesatorArea.isFixedTransfers) {
                        const foundTransfers = order.currenciesPayment.some(
                            item => item.paymentWay === "TRANSFER"
                        );
                        if (foundTransfers) {
                            mandatoryIds.push(order.id);
                        }
                    }

                    //2b. Finding fixing categories
                    if (
                        procesatorArea.fixedCategories &&
                        procesatorArea.fixedCategories.length > 0
                    ) {
                        const foundOrder = order.selledProducts.some(item =>
                            procesatorArea.fixedCategories.includes(
                                item.product.salesCategoryId
                            )
                        );

                        if (foundOrder) {
                            mandatoryIds.push(order.id);
                        }
                    }
                }
            }

            //3. Processing mandatories orders
            let totalAmount = 0;

            for (const orderId of mandatoryIds) {
                const foundOrder = ordersToDuplicate.find(
                    item => item.id === orderId
                );

                listRemainIds = listRemainIds.filter(
                    item => item.id !== orderId
                );

                if (foundOrder && !listAddedIds.includes(orderId)) {
                    listAddedIds.push(orderId);
                    let body: any = {
                        status: foundOrder.status,
                        businessId: Number(duplicator_businessId),
                        economicCycleId: duplicateEconomicCycle.id,
                        areaSalesId: procesatorArea.areaToId,
                        createdAt: `${moment(registerAt).format(
                            "YYYY-MM-DD"
                        )} ${moment(foundOrder.createdAt).format("HH:mm")}`,
                        updatedAt: `${moment(registerAt).format(
                            "YYYY-MM-DD"
                        )} ${moment(foundOrder.createdAt).format("HH:mm")}`,
                        managedById: foundOrder.managedById,
                        salesById: foundOrder.salesById,
                        origin: "pos",
                        name: foundOrder.name,
                        isForTakeAway: foundOrder.isForTakeAway,
                        closedDate: foundOrder.closedDate
                            ? `${moment(registerAt).format(
                                  "YYYY-MM-DD"
                              )} ${moment(foundOrder.closedDate).format(
                                  "HH:mm"
                              )}`
                            : null,
                        paidAt: foundOrder.paidAt
                            ? `${moment(registerAt).format(
                                  "YYYY-MM-DD"
                              )} ${moment(foundOrder.paidAt).format("HH:mm")}`
                            : null,
                        discount: foundOrder.discount,
                        houseCosted: foundOrder.houseCosted,
                        commission: foundOrder.commission,
                        prices: foundOrder.prices.map(item => {
                            return {
                                price: item.price,
                                codeCurrency: item.codeCurrency,
                            };
                        }),
                    };

                    let selledProducts = [];
                    let addBulkCurrencies = [];
                    for (const selled of foundOrder.selledProducts) {
                        const foundProduct = foundAllProductInDestination.find(
                            item =>
                                item.universalCode ===
                                selled.product.universalCode
                        );

                        let foundInFixedCategory = false;
                        let foundInExcluded = false;

                        //Analyzing product
                        if (
                            procesatorArea.fixedCategories &&
                            procesatorArea.fixedCategories.length > 0 &&
                            procesatorArea.fixedCategories.includes(
                                selled.product.salesCategoryId
                            )
                        ) {
                            foundInFixedCategory = true;
                        }

                        if (
                            (procesatorArea.excluedCategories &&
                                procesatorArea.excluedCategories.includes(
                                    selled.product.salesCategoryId
                                )) ||
                            (procesatorArea.excludedProducts &&
                                procesatorArea.excludedProducts.includes(
                                    selled.productId
                                ))
                        ) {
                            foundInExcluded = true;
                        }

                        let shouldByInclude = true;
                        if (foundInFixedCategory && foundInExcluded) {
                            shouldByInclude = false;
                        } else if (foundInExcluded) {
                            shouldByInclude = false;
                        }

                        let bodySelled: any = {
                            name: selled.name,
                            quantity: selled.quantity,
                            productId: foundProduct?.id || selled.productId,
                            type: foundProduct?.type || "STOCK",
                            economicCycleId: duplicateEconomicCycle.id,
                            imageId: selled.imageId,
                            addons: [],
                            observations: selled.observations,
                            variationId: selled.variationId,
                            priceUnitary: {
                                amount: selled.priceUnitary.amount,
                                codeCurrency: selled.priceUnitary.codeCurrency,
                            },
                            priceTotal: {
                                amount: selled.priceTotal.amount,
                                codeCurrency: selled.priceTotal.codeCurrency,
                            },
                        };

                        if (!shouldByInclude) {
                            let selectedName = false;
                            let productName = "";
                            let filteredProducts = [
                                ...foundAllProductInDestination,
                            ];
                            if (procesatorArea.excludedProducts) {
                                filteredProducts = filteredProducts.filter(
                                    item =>
                                        !procesatorArea.excludedProducts.includes(
                                            item.id
                                        )
                                );
                            }
                            if (procesatorArea.excluedCategories) {
                                filteredProducts = filteredProducts.filter(
                                    item =>
                                        !procesatorArea.excluedCategories.includes(
                                            item.salesCategoryId
                                        )
                                );
                            }

                            for (const searchableProduct of filteredProducts) {
                                const firstRound =
                                    searchableProduct.prices.find(
                                        item =>
                                            item.price ===
                                                selled.priceUnitary.amount &&
                                            item.codeCurrency ===
                                                procesatorArea.codeCurrency
                                    );

                                if (firstRound && !selectedName) {
                                    productName = searchableProduct.name;
                                    selectedName = true;
                                }
                            }

                            if (!selectedName) {
                                for (const searchableProduct of filteredProducts) {
                                    const secondRound =
                                        searchableProduct.prices.find(
                                            item =>
                                                selled.priceUnitary.amount <
                                                    item.price - 100 &&
                                                selled.priceUnitary.amount <
                                                    item.price + 100 &&
                                                item.codeCurrency ===
                                                    procesatorArea.codeCurrency
                                        );

                                    if (secondRound && !selectedName) {
                                        productName = searchableProduct.name;
                                        selectedName = true;
                                    }
                                }
                            }

                            bodySelled.name = productName || `Encargo`;
                        }

                        selledProducts.push(bodySelled);
                    }

                    //Registering operations and payments
                    for (const registerPay of foundOrder.currenciesPayment) {
                        addBulkCurrencies.push({
                            amount: registerPay.amount,
                            codeCurrency: registerPay.codeCurrency,
                            paymentWay: registerPay.paymentWay,
                        });

                        if (registerPay.paymentWay === "CASH") {
                            bulkOperations.push({
                                operation: "DEPOSIT_SALE",
                                amount: registerPay.amount,
                                codeCurrency: registerPay.codeCurrency,
                                type: "debit",
                                economicCycleId: duplicateEconomicCycle.id,
                                areaId: procesatorArea.areaToId,
                                madeById: foundOrder.salesById,
                                createdAt: `${moment(registerAt).format(
                                    "YYYY-MM-DD"
                                )} ${moment(registerPay.createdAt).format(
                                    "HH:mm"
                                )}`,
                            });
                        }
                    }

                    if (foundOrder.amountReturned) {
                        bulkOperations.push({
                            operation: "WITHDRAW_SALE",
                            amount:
                                Math.abs(foundOrder.amountReturned.amount) * -1,
                            codeCurrency:
                                foundOrder.amountReturned.codeCurrency,
                            type: "credit",
                            economicCycleId: duplicateEconomicCycle.id,
                            areaId: procesatorArea.areaToId,
                            madeById: foundOrder.salesById,
                            createdAt: `${moment(registerAt).format(
                                "YYYY-MM-DD"
                            )} ${moment(foundOrder.createdAt).format("HH:mm")}`,
                        });

                        body.amountReturned = {
                            amount: foundOrder.amountReturned.amount,
                            codeCurrency:
                                foundOrder.amountReturned.codeCurrency,
                        };
                    }

                    bulkNewOrdersToCreate.push({
                        ...body,
                        selledProducts,
                        currenciesPayment: addBulkCurrencies,
                    });

                    //Adding total amount
                    if (!procesatorArea.keepSameData) {
                        for (const total of foundOrder.totalToPay || []) {
                            if (
                                total.codeCurrency ===
                                procesatorArea.codeCurrency
                            ) {
                                totalAmount += total.amount;
                            } else {
                                const conversion = exchangeCurrency(
                                    {
                                        amount: total.amount,
                                        codeCurrency: total.codeCurrency,
                                    },
                                    procesatorArea.codeCurrency!,
                                    availableCurrencies
                                );

                                totalAmount += conversion?.amount || 0;
                            }
                        }
                    }
                }
            }

            if (!procesatorArea.keepSameData) {
                //4. Analyzing remain orders
                //4a. Diving remain orders into three pieces
                const third = listRemainIds.length / 3;
                const a = listRemainIds.slice(0, third);
                const b = listRemainIds.slice(third, 2 * third);
                const c = listRemainIds.slice(2 * third);
                let mixedArray = [];
                for (let i = 0; i < third; i++) {
                    a[i] && mixedArray.push(a[i]);
                    b[i] && mixedArray.push(b[i]);
                    c[i] && mixedArray.push(c[i]);
                }

                //Verifying no repeted order is included
                mixedArray = [...new Set(mixedArray)];

                while (
                    mixedArray.length > 0 &&
                    totalAmount < procesatorArea.plannedAmount!
                ) {
                    const orderId = mixedArray.shift();
                    const foundOrder = ordersToDuplicate.find(
                        item => item.id === orderId
                    );

                    if (foundOrder && !listAddedIds.includes(orderId)) {
                        //Analyzing if order has currency payments accepted
                        if (
                            allowedCurrencies.length !== 0 &&
                            foundOrder.currenciesPayment?.some(
                                item =>
                                    ![
                                        procesatorArea.codeCurrency,
                                        ...allowedCurrencies,
                                    ].includes(item.codeCurrency)
                            )
                        ) {
                            continue;
                        }

                        listAddedIds.push(foundOrder.id);

                        //Checking if enforce amount is activated
                        if (
                            procesatorArea.ordersUpTo &&
                            foundOrder.totalToPay[0].amount >
                                procesatorArea.ordersUpTo
                        ) {
                            continue;
                        }

                        let body: any = {
                            status: foundOrder.status,
                            businessId: Number(duplicator_businessId),
                            economicCycleId: duplicateEconomicCycle.id,
                            areaSalesId: procesatorArea.areaToId,
                            createdAt: `${moment(registerAt).format(
                                "YYYY-MM-DD"
                            )} ${moment(foundOrder.createdAt).format("HH:mm")}`,
                            updatedAt: `${moment(registerAt).format(
                                "YYYY-MM-DD"
                            )} ${moment(foundOrder.createdAt).format("HH:mm")}`,
                            managedById: foundOrder.managedById,
                            salesById: foundOrder.salesById,
                            origin: "pos",
                            name: foundOrder.name,
                            isForTakeAway: foundOrder.isForTakeAway,
                            closedDate: foundOrder.closedDate
                                ? `${moment(registerAt).format(
                                      "YYYY-MM-DD"
                                  )} ${moment(foundOrder.closedDate).format(
                                      "HH:mm"
                                  )}`
                                : null,
                            paidAt: foundOrder.paidAt
                                ? `${moment(registerAt).format(
                                      "YYYY-MM-DD"
                                  )} ${moment(foundOrder.paidAt).format(
                                      "HH:mm"
                                  )}`
                                : null,
                            discount: foundOrder.discount,
                            houseCosted: foundOrder.houseCosted,
                            commission: foundOrder.commission,
                        };

                        let selledProducts = [];
                        let addBulkCurrencies = [];
                        let prices = [];

                        for (const selled of foundOrder.selledProducts) {
                            const foundProduct =
                                foundAllProductInDestination.find(
                                    item =>
                                        item.universalCode ===
                                        selled.product.universalCode
                                );

                            let foundInFixedCategory = false;
                            let foundInExcluded = false;
                            //Analyzing product
                            if (
                                procesatorArea.fixedCategories &&
                                procesatorArea.fixedCategories.length > 0 &&
                                procesatorArea.fixedCategories.includes(
                                    selled.product.salesCategoryId
                                )
                            ) {
                                foundInFixedCategory = true;
                            }

                            if (
                                (procesatorArea.excluedCategories &&
                                    procesatorArea.excluedCategories.includes(
                                        selled.product.salesCategoryId
                                    )) ||
                                (procesatorArea.excludedProducts &&
                                    procesatorArea.excludedProducts.includes(
                                        selled.productId
                                    ))
                            ) {
                                foundInExcluded = true;
                            }

                            let shouldByInclude;
                            if (foundInFixedCategory && foundInExcluded) {
                                shouldByInclude = false;
                            } else if (foundInFixedCategory) {
                                shouldByInclude = true;
                            } else if (foundInExcluded) {
                                shouldByInclude = false;
                            } else {
                                shouldByInclude = true;
                            }

                            if (shouldByInclude) {
                                selledProducts.push({
                                    name: selled.name,
                                    quantity: selled.quantity,
                                    productId:
                                        foundProduct?.id || selled.productId,
                                    type: foundProduct?.type || "STOCK",
                                    economicCycleId: duplicateEconomicCycle.id,
                                    imageId: selled.imageId,
                                    addons: [],
                                    observations: selled.observations,
                                    variationId: selled.variationId,
                                    priceUnitary: {
                                        amount: selled.priceUnitary.amount,
                                        codeCurrency:
                                            selled.priceUnitary.codeCurrency,
                                    },
                                    priceTotal: {
                                        amount: selled.priceTotal.amount,
                                        codeCurrency:
                                            selled.priceTotal.codeCurrency,
                                    },
                                });

                                const foundIndex = prices.findIndex(
                                    item =>
                                        item.codeCurrency ===
                                        selled.priceTotal.codeCurrency
                                );

                                if (foundIndex !== -1) {
                                    prices[foundIndex].amount = mathOperation(
                                        prices[foundIndex].amount,
                                        selled.priceTotal.amount,
                                        "addition",
                                        2
                                    );
                                } else {
                                    prices.push({
                                        amount: selled.priceTotal.amount,
                                        codeCurrency:
                                            selled.priceTotal.codeCurrency,
                                    });
                                }
                            }
                        }

                        const defaultMethod =
                            foundOrder.currenciesPayment.shift()?.paymentWay ||
                            "CASH";
                        let addedReturn = false;

                        //Registering payments
                        if (!foundOrder.houseCosted) {
                            for (const price of prices) {
                                let priceToRegister = price.amount;
                                if (!addedReturn && foundOrder.amountReturned) {
                                    priceToRegister +=
                                        foundOrder.amountReturned.amount;
                                    addedReturn = true;
                                }

                                //Registering payment
                                addBulkCurrencies.push({
                                    amount: priceToRegister,
                                    codeCurrency: price.codeCurrency,
                                    paymentWay: defaultMethod,
                                });

                                if (defaultMethod === "CASH") {
                                    bulkOperations.push({
                                        operation: "DEPOSIT_SALE",
                                        amount: priceToRegister,
                                        codeCurrency: price.codeCurrency,
                                        type: "debit",
                                        economicCycleId:
                                            duplicateEconomicCycle.id,
                                        areaId: procesatorArea.areaToId,
                                        madeById: foundOrder.salesById,
                                        createdAt: `${moment(registerAt).format(
                                            "YYYY-MM-DD"
                                        )} ${moment(
                                            foundOrder.createdAt
                                        ).format("HH:mm")}`,
                                    });
                                }
                            }

                            if (foundOrder.amountReturned) {
                                bulkOperations.push({
                                    operation: "WITHDRAW_SALE",
                                    amount:
                                        Math.abs(
                                            foundOrder.amountReturned.amount
                                        ) * -1,
                                    codeCurrency:
                                        foundOrder.amountReturned.codeCurrency,
                                    type: "credit",
                                    economicCycleId: duplicateEconomicCycle.id,
                                    areaId: procesatorArea.areaToId,
                                    madeById: foundOrder.salesById,
                                    createdAt: `${moment(registerAt).format(
                                        "YYYY-MM-DD"
                                    )} ${moment(foundOrder.createdAt).format(
                                        "HH:mm"
                                    )}`,
                                });

                                body.amountReturned = {
                                    amount: foundOrder.amountReturned.amount,
                                    codeCurrency:
                                        foundOrder.amountReturned.codeCurrency,
                                };
                            }
                        }

                        body = {
                            ...body,
                            prices: prices.map(item => {
                                return {
                                    price: item.amount,
                                    codeCurrency: item.codeCurrency,
                                };
                            }),
                            currenciesPayment: addBulkCurrencies,
                            totalToPay: prices,
                            selledProducts,
                        };

                        if (selledProducts.length !== 0) {
                            bulkNewOrdersToCreate.push(body);
                        }

                        //Adding total amount
                        if (!procesatorArea.keepSameData) {
                            for (const total of prices || []) {
                                if (
                                    total.codeCurrency ===
                                    procesatorArea.codeCurrency
                                ) {
                                    totalAmount += total.amount;
                                } else {
                                    const conversion = exchangeCurrency(
                                        {
                                            amount: total.amount,
                                            codeCurrency: total.codeCurrency,
                                        },
                                        procesatorArea.codeCurrency!,
                                        availableCurrencies
                                    );

                                    totalAmount += conversion?.amount || 0;
                                }
                            }
                        }
                    }
                }
            }

            //Obtaining rate between real sale and planned
            let totalRealSale = 0;
            for (const order of ordersToDuplicate) {
                if (order.houseCosted) {
                    continue;
                }

                order.prices.forEach(item => {
                    if (item.codeCurrency === procesatorArea.codeCurrency) {
                        totalRealSale += item.price;
                    }
                });
            }
            const rate = procesatorArea.plannedAmount! / totalRealSale;

            //Get all Tips
            let realTip = 0;
            const plannedTip = Math.abs(realTip * rate);

            if (plannedTip > 0 && procesatorArea.includeTips) {
                bulkOperations.push({
                    operation: "DEPOSIT_TIP",
                    amount: plannedTip,
                    codeCurrency: procesatorArea.codeCurrency,
                    type: "debit",
                    economicCycleId: duplicateEconomicCycle.id,
                    areaId: procesatorArea.areaToId,
                    madeById: duplicateEconomicCycle.openById,
                    createdAt: `${moment(registerAt).format("YYYY-MM-DD")}`,
                });
            }

            if (
                procesatorArea.includeDeposits ||
                procesatorArea.includeExtractions
            ) {
                //Get all Cash operations
                const allCashOperations = await CashRegisterOperation.findAll({
                    where: {
                        economicCycleId: economicCycle.id,
                        codeCurrency: procesatorArea.codeCurrency,
                        areaId: procesatorArea.areasFromId,
                    },
                });

                let realExtractions = 0;
                let realDeposits = 0;
                let listExtractions = [];
                let listDeposits = [];
                for (const element of allCashOperations) {
                    if (element.operation === "DEPOSIT_TIP") {
                        realTip += element.amount;
                    } else if (element.operation === "MANUAL_DEPOSIT") {
                        realDeposits += element.amount;
                        listDeposits.push(element);
                    } else if (element.operation === "MANUAL_WITHDRAW") {
                        realExtractions += element.amount;
                        listExtractions.push(element);
                    }
                }

                const plannedDeposit = realDeposits * rate;
                const plannedExtraction = realExtractions * rate;

                let totalDeposit = 0;
                let totalExtraction = 0;

                if (procesatorArea.includeExtractions) {
                    while (
                        Math.abs(totalExtraction) <
                            Math.abs(plannedExtraction) &&
                        listExtractions.length > 0
                    ) {
                        const extraction = listExtractions.shift();
                        if (extraction) {
                            totalExtraction += extraction.amount;
                            bulkOperations.push({
                                operation: "MANUAL_WITHDRAW",
                                amount: Math.abs(extraction.amount) * -1,
                                codeCurrency: extraction.codeCurrency,
                                observations: extraction.observations,
                                type: "credit",
                                economicCycleId: duplicateEconomicCycle.id,
                                areaId: procesatorArea.areaToId,
                                madeById: extraction.madeById,
                                createdAt: `${moment(registerAt).format(
                                    "YYYY-MM-DD"
                                )} ${moment(extraction.createdAt).format(
                                    "HH:mm"
                                )}`,
                            });
                        }
                    }
                }

                if (procesatorArea.includeDeposits) {
                    while (
                        totalDeposit < plannedDeposit &&
                        listDeposits.length > 0
                    ) {
                        const deposit = listDeposits.shift();

                        if (deposit) {
                            totalDeposit += deposit.amount;
                            bulkOperations.push({
                                operation: "MANUAL_DEPOSIT",
                                amount: deposit.amount,
                                codeCurrency: deposit.codeCurrency,
                                observations: deposit.observations,
                                type: "credit",
                                economicCycleId: duplicateEconomicCycle.id,
                                areaId: procesatorArea.areaToId,
                                madeById: deposit.madeById,
                                createdAt: `${moment(registerAt).format(
                                    "YYYY-MM-DD"
                                )} ${moment(deposit.createdAt).format(
                                    "HH:mm"
                                )}`,
                            });
                        }
                    }
                }
            }

            bulkNewOrdersToCreate = bulkNewOrdersToCreate
                .sort(
                    //@ts-ignore
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                )
                .map((order, index) => {
                    let body: any = {};
                    if (
                        index === bulkNewOrdersToCreate.length - 2 &&
                        procesatorArea.includeTips
                    ) {
                        body.tipPrice = {
                            amount: plannedTip,
                            codeCurrency: procesatorArea.codeCurrency,
                        };
                    }

                    //Analyzing totalToPay
                    let totalPrices: Array<SimplePrice> = [];
                    for (const selledProduct of order.selledProducts || []) {
                        const found = totalPrices.find(
                            element =>
                                element.codeCurrency ===
                                selledProduct.priceUnitary.codeCurrency
                        );

                        const priceTotal = mathOperation(
                            selledProduct.priceUnitary.amount,
                            selledProduct.quantity,
                            "multiplication",
                            2
                        );

                        if (found) {
                            totalPrices = totalPrices.map(element => {
                                if (
                                    element.codeCurrency ===
                                    selledProduct.priceUnitary.codeCurrency
                                ) {
                                    return {
                                        ...element,
                                        amount: mathOperation(
                                            element.amount,
                                            priceTotal,
                                            "addition",
                                            2
                                        ),
                                    };
                                }

                                return element;
                            });
                        } else {
                            totalPrices.push({
                                amount: priceTotal,
                                codeCurrency:
                                    selledProduct.priceUnitary.codeCurrency,
                            });
                        }
                    }

                    //2. Analyzing discount
                    if (order.discount) {
                        for (const price of totalPrices) {
                            price.amount = mathOperation(
                                price.amount,
                                (price.amount * order.discount) / 100,
                                "subtraction",
                                2
                            );
                        }
                    }

                    //3. Analyzing commission
                    if (order.commission) {
                        for (const price of totalPrices) {
                            price.amount = mathOperation(
                                price.amount,
                                (price.amount * order.commission) / 100,
                                "addition",
                                2
                            );
                        }
                    }

                    //5. Adding shipping
                    if (order.shippingPrice) {
                        const found = totalPrices.find(
                            element =>
                                element.codeCurrency ===
                                order.shippingPrice?.codeCurrency
                        );

                        if (found) {
                            totalPrices = totalPrices.map(element => {
                                if (
                                    element.codeCurrency ===
                                    order.shippingPrice?.codeCurrency
                                ) {
                                    return {
                                        ...element,
                                        amount: mathOperation(
                                            element.amount,
                                            order.shippingPrice.amount,
                                            "addition",
                                            2
                                        ),
                                    };
                                }

                                return element;
                            });
                        }
                    }

                    //Registering totals to pay
                    let bulkTotal = [];
                    for (const price of totalPrices) {
                        bulkTotal.push({
                            amount: price.amount,
                            codeCurrency: price.codeCurrency,
                        });
                    }

                    return {
                        ...order,
                        operationNumber: index + 1,
                        ...body,
                        totalToPay: bulkTotal,
                    };
                });
        }

        if (bulkNewOrdersToCreate.length !== 0) {
            await OrderReceipt.bulkCreate(bulkNewOrdersToCreate, {
                include: [
                    {
                        model: SelledProduct,
                        as: "selledProducts",
                        include: [
                            { model: Price, as: "priceTotal" },
                            { model: Price, as: "priceUnitary" },
                        ],
                    },
                    {
                        model: Price,
                        as: "amountReturned",
                    },
                    {
                        model: Price,
                        as: "tipPrice",
                    },
                    { model: OrderReceiptPrice, as: "prices" },
                    { model: CurrencyPayment, as: "currenciesPayment" },
                    { model: OrderReceiptTotal, as: "totalToPay" },
                ],
                transaction: t,
            });
        }

        if (bulkOperations.length !== 0) {
            await CashRegisterOperation.bulkCreate(bulkOperations, {
                transaction: t,
            });
        }

        await t.commit();

        return res.status(200).json("sucess");
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
