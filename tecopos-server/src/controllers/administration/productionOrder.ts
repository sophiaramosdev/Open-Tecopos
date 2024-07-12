import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";
import moment from "moment";

import { pag_params } from "../../database/pag_params";
import ProductionOrder from "../../database/models/productionOrder";
import User from "../../database/models/user";
import Image from "../../database/models/image";
import Product from "../../database/models/product";
import Supply from "../../database/models/supply";
import {
    internalCheckerResponse,
    mathOperation,
    obtainFeatureImageFromProduct,
} from "../../helpers/utils";
import ProductProductionOrder from "../../database/models/productProductionOrder";
import ConfigurationKey from "../../database/models/configurationKey";
import Logger from "../../lib/logger";
import OrderProductionFixedCost from "../../database/models/orderProductionFixedCost";
import { productionOrderQueue } from "../../bull-queue/productionOrder";
import Area from "../../database/models/area";
import Recipe from "../../database/models/recipe";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import { getSuppliesDependencies } from "../helpers/products";
import { getBusinessConfigCache } from "../../helpers/redisStructure";
import ProductCategory from "../../database/models/productCategory";

export const findAllProductionOrders = async (req: any, res: Response) => {
    try {
        const { per_page, page, dateFrom, dateTo, notDispatched, ...params } =
            req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["createdById", "status", "areaId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["openDate"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["openDate"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["openDate"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        if (notDispatched) {
            where_clause = {
                ...where_clause,
                dispatchId: {
                    [Op.eq]: null,
                },
                [Op.or]: [
                    {
                        status: "ACTIVE",
                    },
                    {
                        status: {
                            [Op.or]: ["ACTIVE", "CREATED"],
                        },
                        openDate: {
                            [Op.lte]: moment().endOf("day").toDate(),
                        },
                    },
                ],
            };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_production_orders = await ProductionOrder.findAndCountAll({
            attributes: [
                "id",
                "name",
                "status",
                "observations",
                "createdAt",
                "closedDate",
                "openDate",
                "totalGoalQuantity",
                "totalProduced",
                "name",
                "totalCost",
                "plannedCost",
                "areaId",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "createdBy",
                    attributes: ["id", "email", "username", "displayName"],
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
                    model: Area,
                    attributes: ["id", "name"],
                    paranoid: false,
                },
            ],
            limit,
            offset,
            order: [["openDate", "DESC"]],
        });

        let totalPages = Math.ceil(found_production_orders.count / limit);
        if (found_production_orders.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_production_orders.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: totalPages,
            items: found_production_orders.rows,
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

export const getProductionOrdersToManufacturer = async (
    req: any,
    res: Response
) => {
    try {
        const { per_page, page, dateFrom, dateTo, notDispatched, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["createdById", "status", "areaId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        const found_production_orders = await ProductionOrder.findAll({
            attributes: [
                "id",
                "name",
                "status",
                "observations",
                "createdAt",
                "closedDate",
                "openDate",
                "totalGoalQuantity",
                "totalProduced",
            ],
            where: {
                businessId: user.businessId,
                [Op.or]: [
                    {
                        status: "ACTIVE",
                    },
                    {
                        status: {
                            [Op.or]: ["ACTIVE", "CREATED"],
                        },
                        openDate: {
                            [Op.lte]: moment().endOf("day").toDate(),
                        },
                    },
                ],
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "createdBy",
                    attributes: ["id", "email", "username", "displayName"],
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
                    model: Area,
                    attributes: ["id", "name"],
                    paranoid: false,
                },
            ],
            order: [["openDate", "DESC"]],
        });

        res.status(200).json(found_production_orders);
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

export const getProductionOrder = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (isNaN(id)) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const [found_production_order, products_orders] = await Promise.all([
            ProductionOrder.findByPk(id, {
                attributes: [
                    "id",
                    "name",
                    "status",
                    "observations",
                    "closedDate",
                    "businessId",
                    "totalGoalQuantity",
                    "totalProduced",
                    "openDate",
                    "plannedCost",
                ],
                include: [
                    {
                        model: User,
                        as: "createdBy",
                        attributes: ["id", "email", "username", "displayName"],
                        include: [
                            {
                                model: Image,
                                as: "avatar",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                            },
                        ],
                        paranoid: false,
                    },
                    {
                        model: Area,
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                ],
            }),
            ProductProductionOrder.findAll({
                where: {
                    productionOrderId: id,
                },
                include: [
                    {
                        model: Product,
                        include: [
                            {
                                model: Image,
                                as: "images",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                        paranoid: false,
                    },
                    {
                        model: ProductCategory,
                        attributes: ["id", "name", "description"],
                        paranoid: false,
                    },
                ],
            }),
        ]);

        if (!found_production_order) {
            return res.status(404).json({
                message: `ProductionOrder not found`,
            });
        }

        if (found_production_order.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre esta orden de producción.`,
            });
        }

        //Normalizing data
        let rawMateriales = [];
        let endProducts = [];

        for (const product of products_orders) {
            if (product.type === "END") {
                endProducts.push({
                    productId: product.productId,
                    name: product.name,
                    measure: product.measure,
                    goalQuantity: product.goalQuantity,
                    realProduced: product.realProduced,
                    image: obtainFeatureImageFromProduct(product.product),
                    productCategory: product.productCategory,
                });
            } else if (product.type === "RAW") {
                rawMateriales.push({
                    productId: product.productId,
                    averageCost: product.product.averageCost,
                    name: product.name,
                    measure: product.measure,
                    quantity: product.quantity,
                    image: obtainFeatureImageFromProduct(product.product),
                    productCategory: product.productCategory,
                });
            }
        }

        res.status(200).json({
            productionOrder: found_production_order,
            rawMateriales,
            endProducts,
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

interface ProductProductionOrderItem {
    productId: number;
    quantity: number;
}

export const createProductionOrder = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { products, observations, openDate, name, areaId, mode } =
            req.body;
        const user: User = req.user;

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Init procedure
        const criteria = products.map((item: ProductProductionOrderItem) => {
            return {
                id: item.productId,
                quantity: item.quantity,
            };
        });

        const result = await getSuppliesDependencies({
            criteria,
            precission_after_coma,
        });

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "createProductionOrder/getSuppliesDependencies",
                "X-App-Origin": req.header("X-App-Origin"),
                businessId: user.businessId,
                userId: user.id,
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        let bulkProducts: Array<{
            name: string;
            measure: string;
            goalQuantity: number;
            type: "RAW" | "END";
            quantity: number;
            productId: number;
            productCategoryId: number;
        }> = [];

        let totalGoalQuantity = 0;
        let totalPlannedCost = 0;

        //Creating each product
        for (const product of products as ProductProductionOrderItem[]) {
            const found = result.data.listAllProductsInvolved.find(
                (item: Product) => item.id === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            if (!["STOCK", "MANUFACTURED"].includes(found.type)) {
                t.rollback();
                return res.status(404).json({
                    message: `Solo pueden ser incluido en las órdenes de producción los productos de tipo Almacén/Procesado.`,
                });
            }

            //TODO:
            // if (measure) {
            //     if (found.measure !== measure) {
            //         t.rollback();
            //         return res.status(404).json({
            //             message: `Los productos finales de una orden de producción deben tener la misma unidad de medida.`,
            //         });
            //     }
            // } else {
            // }
            // measure = found.measure;

            //End product
            bulkProducts.push({
                name: found.name,
                measure: found.measure,
                goalQuantity: product.quantity,
                type: "END",
                quantity: 0,
                productId: found.id,
                productCategoryId: found.productCategoryId,
            });

            totalGoalQuantity += product.quantity;
        }

        //Finding Raw product from Final products
        for (const rawProduct of result.data.listRawProducts) {
            totalPlannedCost = mathOperation(
                totalPlannedCost,
                (rawProduct.product.averageCost || 0) *
                    rawProduct.totalQuantity,
                "addition",
                precission_after_coma
            );

            bulkProducts.push({
                name: rawProduct.product.name || ``,
                measure: rawProduct.product.measure || ``,
                goalQuantity: 0,
                type: "RAW",
                quantity: rawProduct.totalQuantity,
                productId: rawProduct.product.id,
                productCategoryId: rawProduct.productCategoryId,
            });
        }

        //Creating productionOrder
        const productionOrder: ProductionOrder = ProductionOrder.build(
            {
                name: name || "",
                businessId: user.businessId,
                createdById: user.id,
                observations,
                mode,
                status: "CREATED",
                products: bulkProducts,
                totalGoalQuantity,
                plannedCost: totalPlannedCost,
                areaId,
                openDate: moment(openDate, "YYYY-MM-DD")
                    .startOf("day")
                    .toDate(),
            },
            {
                include: [ProductProductionOrder],
            }
        );

        await productionOrder.save({ transaction: t });

        const to_return = await ProductionOrder.scope("to_return").findByPk(
            productionOrder.id,
            { transaction: t }
        );

        await t.commit();

        res.status(201).json(to_return);
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

export const duplicateProductionOrder = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { orderProductionId, observations, openDate } = req.body;
        const user: User = req.user;

        const order_found = await ProductionOrder.findByPk(orderProductionId, {
            include: [ProductProductionOrder, OrderProductionFixedCost],
        });

        if (!order_found) {
            t.rollback();
            return res.status(404).json({
                message: `La orden de producción no fue encontrada.`,
            });
        }

        if (order_found.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let bulkProducts: Array<{
            name: string;
            measure: string;
            goalQuantity: number;
            type: "RAW" | "END";
            quantity: number;
            productId: number;
            productCategoryId: number;
        }> = [];
        let bulkFixedCost: Array<{
            costAmount: number;
            description: string;
        }> = [];

        //Creating each product
        for (const product of order_found.products) {
            //End product
            bulkProducts.push({
                name: product.name,
                measure: product.measure,
                goalQuantity: product.goalQuantity,
                type: product.type,
                quantity: product.quantity,
                productId: product.productId,
                productCategoryId: product.productCategoryId,
            });
        }

        for (const fixedCost of order_found.fixedCosts) {
            bulkFixedCost.push({
                costAmount: fixedCost.costAmount,
                description: fixedCost.description,
            });
        }

        //Creating productionOrder
        const productionOrder: ProductionOrder = ProductionOrder.build(
            {
                name: order_found.name,
                businessId: user.businessId,
                createdById: user.id,
                observations,
                status: "CREATED",
                areaId: order_found.areaId,
                openDate: moment(openDate).toDate() || moment().toDate(),
                totalGoalQuantity: order_found.totalGoalQuantity,
                products: bulkProducts,
                fixedCosts: bulkFixedCost,
            },
            {
                include: [ProductProductionOrder, OrderProductionFixedCost],
            }
        );

        await productionOrder.save({ transaction: t });

        const to_return = await ProductionOrder.scope("to_return").findByPk(
            productionOrder.id,
            { transaction: t }
        );

        await t.commit();

        productionOrderQueue.add(
            {
                code: "UPDATE_PRODUCTION_ORDER_COST",
                params: {
                    productionOrderId: productionOrder.id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(201).json(to_return);
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

export const modifyProductionOrder = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { products, observations, status, openDate, name, areaId, mode } =
            req.body;
        const { id } = req.params;
        const user: User = req.user;

        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const found_production_order = await ProductionOrder.findByPk(id, {
            attributes: [
                "id",
                "status",
                "observations",
                "createdAt",
                "closedDate",
                "businessId",
            ],
        });

        if (!found_production_order) {
            t.rollback();
            return res.status(404).json({
                message: `ProductionOrder not found`,
            });
        }

        if (found_production_order.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este ciclo económico.`,
            });
        }

        if (found_production_order.status === "CLOSED") {
            t.rollback();
            return res.status(400).json({
                message: `No puede modificar la orden seleccionada. Orden cerrada.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Updates general
        found_production_order.observations = observations;
        if (name) found_production_order.name = name;
        if (areaId) found_production_order.areaId = areaId;

        if (openDate)
            found_production_order.openDate = moment(openDate).toDate();

        if (status) {
            const allowedType = ["CREATED", "ACTIVE", "CLOSED"];
            if (!allowedType.includes(status)) {
                t.rollback();
                return res.status(400).json({
                    message: `${status} is not an allowed type. Fields allowed: ${allowedType}`,
                });
            }

            found_production_order.status = status;
        }

        if (mode) {
            const allowedType = ["FLEXIBLE", "STRICT", "OPEN"];
            if (!allowedType.includes(mode)) {
                t.rollback();
                return res.status(400).json({
                    message: `${mode} is not an allowed type. Fields allowed: ${allowedType}`,
                });
            }

            found_production_order.mode = mode;
        }

        let totalGoalQuantity = 0;
        let totalPlannedCost = 0;
        if (products && products.length !== 0) {
            const [products_orders, dbProducts] = await Promise.all([
                ProductProductionOrder.findAll({
                    where: {
                        productionOrderId: id,
                        type: "END",
                    },
                    include: [
                        Product,
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                        },
                    ],
                }),
                Product.findAll({
                    where: {
                        id: products.map(
                            (item: ProductProductionOrderItem) => item.productId
                        ),
                    },
                    include: [
                        {
                            model: Supply,
                            as: "supplies",
                            include: [
                                {
                                    model: Product,
                                    as: "supply",
                                    include: [
                                        {
                                            model: ProductCategory,
                                            attributes: [
                                                "id",
                                                "name",
                                                "description",
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                            paranoid: false,
                        },
                        {
                            model: Recipe,
                            include: [
                                {
                                    model: ProductRawRecipe,
                                    include: [
                                        {
                                            model: Product,
                                            include: [
                                                {
                                                    model: ProductCategory,
                                                    attributes: [
                                                        "id",
                                                        "name",
                                                        "description",
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }),
            ]);

            let bulkAddProducts: Array<{
                name: string;
                measure: string;
                goalQuantity: number;
                type: "RAW" | "END";
                quantity: number;
                productId: number;
                productionOrderId: number;
                productCategoryId: number;
            }> = [];

            let removeIds: Array<number> = [];
            let bulkUpdateProducts: Array<{
                id: number;
                goalQuantity: number;
            }> = [];

            //Removing all RAW products
            await ProductProductionOrder.destroy({
                where: {
                    productionOrderId: id,
                    type: "RAW",
                },
            });

            //Creating each product
            for (const product of products as ProductProductionOrderItem[]) {
                const found_db = dbProducts.find(
                    item => item.id === product.productId
                );
                if (!found_db) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con id ${product.productId} no fue encontrado.`,
                    });
                }

                const found_store = products_orders.find(
                    item => product.productId === item.productId
                );

                if (found_store) {
                    //Analyzing if the number not affect the already produced
                    if (found_store.realProduced > product.quantity) {
                        t.rollback();
                        return res.status(404).json({
                            message: `No es posible modificar en ${product.quantity} la cantidad a producir de ${found_store.product.name} pues ya se han producido ${found_store.realProduced}.`,
                        });
                    }

                    bulkUpdateProducts.push({
                        id: found_store.id,
                        goalQuantity: product.quantity,
                    });
                } else {
                    bulkAddProducts.push({
                        name: found_db.name,
                        measure: found_db.measure,
                        goalQuantity: product.quantity,
                        type: "END",
                        quantity: 0,
                        productId: found_db.id,
                        productionOrderId: id,
                        productCategoryId: found_db.productCategoryId,
                    });
                }

                totalGoalQuantity += product.quantity;

                if (found_db.recipe) {
                    //Raw products from recipe
                    for (const rawProduct of found_db.recipe
                        .productsRawRecipe) {
                        totalPlannedCost = mathOperation(
                            totalPlannedCost,
                            rawProduct.product.averageCost *
                                rawProduct.consumptionIndex,
                            "addition",
                            precission_after_coma
                        );

                        const stored = bulkAddProducts.find(
                            item => item.productId === rawProduct.productId
                        );

                        if (stored) {
                            bulkAddProducts = bulkAddProducts.map(item => {
                                if (item.productId === stored.productId) {
                                    return {
                                        ...item,
                                        quantity: mathOperation(
                                            item.quantity,
                                            product.quantity *
                                                rawProduct.consumptionIndex,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    };
                                }

                                return item;
                            });
                        } else {
                            bulkAddProducts.push({
                                name: rawProduct.product.name,
                                measure: rawProduct.product.measure,
                                goalQuantity: 0,
                                type: "RAW",
                                quantity: mathOperation(
                                    rawProduct.consumptionIndex,
                                    product.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                productId: rawProduct.productId,
                                productionOrderId: id,
                                productCategoryId:
                                    rawProduct.product.productCategoryId,
                            });
                        }
                    }
                } else {
                    //Raw products
                    for (const supply of found_db.supplies) {
                        const stored = bulkAddProducts.find(
                            item =>
                                item.productId === supply.supply.id &&
                                item.type === "RAW"
                        );

                        if (stored) {
                            bulkAddProducts = bulkAddProducts.map(item => {
                                if (item.productId === stored.productId) {
                                    return {
                                        ...item,
                                        quantity: mathOperation(
                                            item.quantity,
                                            (supply.quantity /
                                                found_db.performance) *
                                                product.quantity,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    };
                                }

                                return item;
                            });
                        } else {
                            bulkAddProducts.push({
                                name: supply.supply.name,
                                measure: supply.supply.measure,
                                goalQuantity: 0,
                                type: "RAW",
                                quantity: mathOperation(
                                    supply.quantity / found_db.performance,
                                    product.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                productId: supply.supply.id,
                                productionOrderId: id,
                                productCategoryId:
                                    supply.supply.productCategoryId,
                            });
                        }
                    }
                }
            }

            //Analyzing END products to Delete
            for (const element of products_orders) {
                const found = products.find(
                    (item: ProductProductionOrderItem) =>
                        item.productId === element.productId
                );

                if (!found) {
                    if (element.realProduced !== 0) {
                        t.rollback();
                        return res.status(404).json({
                            message: `No es posible eliminar de la producción a ${element.product.name} pues ya se han producido ${element.realProduced}.`,
                        });
                    }

                    removeIds.push(element.id);
                }
            }

            if (bulkAddProducts.length !== 0) {
                await ProductProductionOrder.bulkCreate(bulkAddProducts, {
                    transaction: t,
                });
            }

            if (bulkUpdateProducts.length !== 0) {
                await ProductProductionOrder.bulkCreate(bulkUpdateProducts, {
                    updateOnDuplicate: ["goalQuantity"],
                    transaction: t,
                });
            }

            if (removeIds.length !== 0) {
                await ProductProductionOrder.destroy({
                    where: {
                        id: removeIds,
                    },
                    transaction: t,
                });
            }

            found_production_order.totalGoalQuantity = totalGoalQuantity;
        }

        await found_production_order.save({ transaction: t });

        const [production_order_to_return, products_orders_to_return] =
            await Promise.all([
                ProductionOrder.scope("to_return").findByPk(id, {
                    transaction: t,
                }),
                ProductProductionOrder.findAll({
                    where: {
                        productionOrderId: id,
                    },
                    include: [
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                            paranoid: false,
                        },
                    ],
                    transaction: t,
                }),
            ]);

        //Normalizing data
        let rawMateriales = [];
        let endProducts = [];

        for (const product of products_orders_to_return) {
            if (product.type === "END") {
                endProducts.push({
                    productId: product.productId,
                    name: product.name,
                    measure: product.measure,
                    goalQuantity: product.goalQuantity,
                    realProduced: product.realProduced,
                    productCategory: product.productCategory,
                });
            } else if (product.type === "RAW") {
                rawMateriales.push({
                    productId: product.productId,
                    name: product.name,
                    measure: product.measure,
                    quantity: product.quantity,
                    productCategory: product.productCategory,
                });
            }
        }

        const to_return = {
            productionOrder: production_order_to_return,
            rawMateriales,
            endProducts,
        };

        await t.commit();
        res.status(200).json(to_return);

        productionOrderQueue.add(
            {
                code: "UPDATE_PRODUCTION_ORDER_COST",
                params: {
                    productionOrderId: id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const closeProductionOrder = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const found_production_order = await ProductionOrder.findByPk(id);

        if (!found_production_order) {
            return res.status(404).json({
                message: `La orden de producción no fue encontrada.`,
            });
        }

        if (found_production_order.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este ciclo económico.`,
            });
        }

        if (found_production_order.status === "CLOSED") {
            return res.status(400).json({
                message: `No puede modificar la orden seleccionada. La orden ya ha sido cerrada.`,
            });
        }

        //Calculating totalCost
        const rawProducts = await ProductProductionOrder.findAll({
            where: {
                productionOrderId: found_production_order.id,
                type: "RAW",
            },
            include: [Product],
        });

        let totalCost = 0;
        rawProducts.forEach(rawProduct => {
            totalCost +=
                rawProduct.product.averageCost * rawProduct.realProduced;
        });

        //Finding all fixed costs
        const fixedCosts = await OrderProductionFixedCost.findAll({
            where: {
                productionOrderId: found_production_order.id,
            },
        });

        fixedCosts.forEach(fixedCost => {
            totalCost += fixedCost.costAmount;
        });

        found_production_order.totalCost = mathOperation(
            totalCost,
            0,
            "addition",
            2
        );
        found_production_order.status = "CLOSED";
        await found_production_order.save();

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

export const deleteProductionOrder = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const user: User = req.user;

        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const production_order = await ProductionOrder.findByPk(id);

        if (!production_order) {
            t.rollback();
            return res.status(404).json({
                message: `Production Order not found`,
            });
        }

        //Permission Check
        if (production_order.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a acceder a este recurso. Acceso denegado.`,
            });
        }

        if (production_order.status !== "CREATED") {
            t.rollback();
            return res.status(401).json({
                message: `Solo puede eliminar órdenes de producción en estado CREADA`,
            });
        }

        await production_order.destroy({ transaction: t });

        await t.commit();
        res.status(204).json({});
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

//Fixed cost
export const newProductionOrderFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        //Checking product received
        const productionOrder = await ProductionOrder.findByPk(id);

        if (!productionOrder) {
            return res.status(404).json({
                message: `La orden de producción introducido no fue encontrada.`,
            });
        }

        if (productionOrder.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const productionOrderFixedCost: OrderProductionFixedCost =
            OrderProductionFixedCost.build({
                ...params,
                productionOrderId: id,
            });

        await productionOrderFixedCost.save();

        const to_return = await OrderProductionFixedCost.scope(
            "to_return"
        ).findByPk(productionOrderFixedCost.id);

        productionOrderQueue.add(
            {
                code: "UPDATE_PRODUCTION_ORDER_COST",
                params: {
                    productionOrderId: id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

export const editProductionOrderFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(OrderProductionFixedCost.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "productId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const productionOrderFixedCost =
            await OrderProductionFixedCost.findByPk(id);

        if (!productionOrderFixedCost) {
            return res.status(404).json({
                message: `El objeto no fue encontrado`,
            });
        }

        //Checking production order permission
        const productionOrder = await ProductionOrder.findByPk(
            productionOrderFixedCost.productionOrderId
        );

        if (!productionOrder) {
            return res.status(404).json({
                message: `La orden de producción introducida no fue encontrada.`,
            });
        }

        if (productionOrder.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                productionOrderFixedCost[att] = params[att];
            }
        });

        await productionOrderFixedCost.save();

        const to_return = await OrderProductionFixedCost.scope(
            "to_return"
        ).findByPk(id);

        productionOrderQueue.add(
            {
                code: "UPDATE_PRODUCTION_ORDER_COST",
                params: {
                    productionOrderId: id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

export const findAllProductionOrderFixedCost = async (
    req: any,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { per_page, page, all_data } = req.query;
        const user: User = req.user;

        //Checking product received
        const productionOrder = await ProductionOrder.findByPk(id);

        if (!productionOrder) {
            return res.status(404).json({
                message: `La orden de producción introducida no fue encontrada.`,
            });
        }

        if (productionOrder.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_production_order_fixed_cost =
            await OrderProductionFixedCost.findAndCountAll({
                distinct: true,
                where: { productionOrderId: id, ...where_clause },
                attributes: ["id", "costAmount", "description"],
                limit: all_data ? undefined : limit,
                offset,
            });

        let totalPages = Math.ceil(
            found_production_order_fixed_cost.count / limit
        );
        if (found_production_order_fixed_cost.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_production_order_fixed_cost.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_production_order_fixed_cost.rows,
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

export const deleteProductionOrderFixedCost = async (
    req: any,
    res: Response
) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const productionOrderFixedCost =
            await OrderProductionFixedCost.findByPk(id);

        if (!productionOrderFixedCost) {
            return res.status(404).json({
                message: `ProductFixedCost not found`,
            });
        }

        //Checking product received
        const productionOrder = await ProductionOrder.findByPk(
            productionOrderFixedCost.productionOrderId
        );

        if (!productionOrder) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrada.`,
            });
        }

        if (productionOrder.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await productionOrderFixedCost.destroy();

        productionOrderQueue.add(
            {
                code: "UPDATE_PRODUCTION_ORDER_COST",
                params: {
                    productionOrderId: id,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json({
            message: `productionOrderFixedCost deleted successfully`,
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
