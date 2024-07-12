import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";

import User from "../../database/models/user";
import Area from "../../database/models/area";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Product from "../../database/models/product";
import Image from "../../database/models/image";
import ProductCategory from "../../database/models/productCategory";
import SalesCategory from "../../database/models/salesCategory";
import ProductPrice from "../../database/models/productPrice";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Variation from "../../database/models/variation";
import Price from "../../database/models/price";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import EconomicCycle from "../../database/models/economicCycle";
import StockAreaBook from "../../database/models/stockAreaBook";
import ConfigurationKey from "../../database/models/configurationKey";
import { exchangeCurrency, mathOperation } from "../../helpers/utils";
import Logger from "../../lib/logger";
import { obtainAreaProcessedMovements } from "../helpers/reports";
import {
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";

export const getProductStockArea = async (req: any, res: Response) => {
    try {
        const { id, areaId } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        if (!areaId) {
            return res.status(406).json({
                message: `areaEl parámetro id no fue introducido`,
            });
        }

        const area = await Area.findOne({
            where: {
                id: areaId,
                type: "STOCK",
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `Area stock not found`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const product_stock_area = await StockAreaProduct.scope(
            "to_return"
        ).findOne({
            where: {
                productId: id,
                areaId: areaId,
            },
        });

        if (!product_stock_area) {
            return res.status(404).json({
                message: `El producto no fue encontrado en el área definida.`,
            });
        }

        if (product_stock_area.product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        res.status(200).json(product_stock_area);
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

export const searchProductStockAreaByCode = async (req: any, res: Response) => {
    try {
        const { areaId } = req.params;
        const { barCode } = req.query;
        const user: User = req.user;

        if (!barCode) {
            return res.status(406).json({
                message: `El parámetro barCode no fue introducido`,
            });
        }

        if (!areaId) {
            return res.status(406).json({
                message: `areaEl parámetro id no fue introducido`,
            });
        }

        const area = await Area.findOne({
            where: {
                id: areaId,
                type: "STOCK",
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `Area stock not found`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const product_stock_area = await StockAreaProduct.findOne({
            attributes: ["id", "quantity", "productId", "type"],
            where: {
                areaId: areaId,
            },
            include: [
                {
                    model: Product,
                    attributes: [
                        "id",
                        "name",
                        "salesCode",
                        "description",
                        "promotionalText",
                        "type",
                        "showForSale",
                        "stockLimit",
                        "qrCode",
                        "barCode",
                        "totalQuantity",
                        "measure",
                        "suggested",
                        "onSale",
                        "alertLimit",
                        "isPublicVisible",
                        "averagePreparationTime",
                        "elaborationSteps",
                        "averageCost",
                        "businessId",
                        "productCategoryId",
                    ],
                    where: {
                        barCode,
                    },
                    include: [
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                        },
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                        {
                            model: ProductPrice,
                            attributes: [
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                    ],
                },
            ],
        });

        if (!product_stock_area) {
            return res.status(404).json({
                message: `El producto no fue encontrado en el área definida.`,
            });
        }

        if (product_stock_area.product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        res.status(200).json(product_stock_area);
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

export const findAllProductsArea = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            search,
            order,
            orderBy,
            all_data,
            type,
            ...params
        } = req.query;
        const { areaId } = req.params;
        const user: User = req.user;

        const area = await Area.findOne({
            where: {
                id: areaId,
                type: "STOCK",
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `Area stock not found.`,
            });
        }

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "showForSale",
            "measure",
            "isAlertable",
            "productCategoryId",
            "salesCategoryId",
            "isUnderAlertLimit",
            "supplierId",
            "barCode",
        ];
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

            where_clause[Op.or] = [
                where(fn("unaccent", col("name")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("barCode")), {
                    [Op.or]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        }

        if (type) {
            const productTypes = type.split(",");

            const allTypes = [
                "STOCK",
                "VARIATION",
                "RAW",
                "MANUFACTURED",
                "WASTE",
                "ASSET",
            ];

            for (const item of productTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }

            where_clause.type = {
                [Op.or]: productTypes,
            };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_products = await StockAreaProduct.findAndCountAll({
            distinct: true,
            where: {
                areaId,
            },
            attributes: ["id", "quantity"],
            include: [
                {
                    model: Product,
                    attributes: [
                        "id",
                        "name",
                        "salesCode",
                        "description",
                        "promotionalText",
                        "type",
                        "showForSale",
                        "stockLimit",
                        "qrCode",
                        "totalQuantity",
                        "measure",
                        "suggested",
                        "onSale",
                        "alertLimit",
                        "isPublicVisible",
                        "averagePreparationTime",
                        "elaborationSteps",
                        "averageCost",
                        "isAlertable",
                        "productCategoryId",
                        "salesCategoryId",
                        "groupName",
                        "groupConvertion",
                        "isWholesale",
                        "minimunWholesaleAmount",
                        "enableGroup",
                        "barCode",
                    ],
                    include: [
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                        },
                        {
                            model: SalesCategory,
                            attributes: ["id", "name", "description", "color"],
                        },
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                        {
                            model: ProductPrice,
                            attributes: [
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                        {
                            model: Product,
                            as: "listManufacturations",
                            attributes: [
                                "id",
                                "name",
                                "description",
                                "measure",
                            ],
                            through: {
                                attributes: [],
                            },
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
                        },
                    ],
                    where: {
                        ...where_clause,
                        businessId: user.businessId,
                    },
                },
                {
                    model: StockAreaVariation,
                    attributes: ["id", "quantity", "variationId"],
                    include: [
                        {
                            model: Variation,
                            attributes: ["id", "description", "onSale", "name"],
                            include: [
                                {
                                    model: Price,
                                    as: "price",
                                    attributes: ["codeCurrency", "amount"],
                                },
                                {
                                    model: Price,
                                    as: "onSalePrice",
                                    attributes: ["codeCurrency", "amount"],
                                },
                                {
                                    model: Image,
                                    attributes: [
                                        "id",
                                        "src",
                                        "thumbnail",
                                        "blurHash",
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            limit: all_data ? undefined : limit,
            //@ts-ignore
            order: ordenation,
            offset,
        });

        let totalPages = Math.ceil(found_products.count / limit);
        if (found_products.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_products.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_products.rows,
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

export const getAllStockProductToManufacturer = async (
    req: any,
    res: Response
) => {
    try {
        const { areaId } = req.params;
        const user: User = req.user;

        const area = await Area.findOne({
            where: {
                id: areaId,
                type: "STOCK",
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `Area stock not found.`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        const found_products = await StockAreaProduct.scope(
            "to_production"
        ).findAll({
            where: {
                areaId,
            },
        });

        res.status(200).json(found_products);
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

export const getStockQuickReport = async (req: any, res: Response) => {
    try {
        const { areaId } = req.params;
        const { type, ...params } = req.query;
        const user: User = req.user;

        if (isNaN(areaId)) {
            return res.status(406).json({
                message: `El parámetro id no es un parámetro válido.`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(404).json({
                message: `Area is not STOCK type`,
            });
        }

        //Permision check
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["productCategoryId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (type) {
            const productTypes = type.split(",");

            const allTypes = [
                "MENU",
                "STOCK",
                "COMBO",
                "VARIATION",
                "SERVICE",
                "ADDON",
                "RAW",
                "MANUFACTURED",
                "WASTE",
                "ASSET",
            ];

            for (const item of productTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }

            where_clause.type = {
                [Op.or]: productTypes,
            };
        }

        const stock_products = await StockAreaProduct.findAll({
            where: {
                areaId,
            },
            include: [
                {
                    model: Product,
                    where: where_clause,
                    include: [ProductPrice],
                },
            ],
        });

        const business_configs = await getBusinessConfigCache(user.businessId);
        const available_currencies = await getCurrenciesCache(user.businessId);

        const mainCurrency = available_currencies?.find(item => item.isMain)!
            .currency.code;

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || mainCurrency;

        let total_cost = 0;
        let total_estimated_sales = 0;
        for (const stockProduct of stock_products) {
            const unitaryCost = stockProduct.product.averageCost || 0;
            total_cost += unitaryCost * stockProduct.quantity;

            const found_price = stockProduct.product.prices.find(
                item => item.isMain
            );

            if (found_price) {
                let totalPrice = 0;
                if (found_price.codeCurrency !== costCurrency) {
                    const found = available_currencies.find(
                        item => item.currency.code === found_price.codeCurrency
                    );

                    if (found) {
                        totalPrice =
                            exchangeCurrency(
                                {
                                    amount: found_price.price,
                                    codeCurrency: found_price.codeCurrency,
                                },
                                costCurrency,
                                available_currencies
                            )?.amount || 0;

                        total_estimated_sales +=
                            totalPrice * stockProduct.quantity;
                    }
                } else {
                    total_estimated_sales +=
                        found_price.price * stockProduct.quantity;
                }
            }
        }

        res.status(200).json({
            total_products_type: stock_products.length,
            total_cost: {
                amount: mathOperation(total_cost, 0, "addition", 2),
                codeCurrency: costCurrency,
            },
            total_estimated_sales: {
                amount: mathOperation(total_estimated_sales, 0, "addition", 2),
                codeCurrency: costCurrency,
            },
            total_estimated_profits: {
                amount: mathOperation(
                    total_estimated_sales,
                    total_cost,
                    "subtraction",
                    2
                ),
                codeCurrency: costCurrency,
            },
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

export const getStockInvetory = async (req: any, res: Response) => {
    try {
        const { areaId, economicCycleId } = req.params;
        const user: User = req.user;

        const area = await Area.findOne({
            where: {
                id: areaId,
                businessId: user.businessId,
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `El área definida no fue encontrada.`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(406).json({
                message: `El área introducida no es de tipo Almacén.`,
            });
        }

        //Analyze if active Economic Cycle
        const economicCycle = await EconomicCycle.findByPk(economicCycleId);

        if (!economicCycle) {
            return res.status(404).json({
                message: `El ciclo económico no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (
            area.businessId !== user.businessId ||
            economicCycle.businessId !== user.businessId
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Find last operation
        const stock_area_book_actions = await StockAreaBook.findAll({
            where: {
                economicCycleId: economicCycle.id,
                areaId,
            },
            include: [{ model: User, as: "madeBy", paranoid: false }],
        });

        const close_action_found = stock_area_book_actions.find(
            item => item.operation === "CLOSED"
        );

        if (close_action_found) {
            //Exist a closed operation
            const open_action_found = stock_area_book_actions.find(
                item => item.operation === "OPEN"
            );

            return res.status(200).json({
                products: JSON.parse(close_action_found.state),
                openAction: {
                    madeAt: open_action_found?.createdAt,
                    madeBy: open_action_found?.madeBy?.displayName,
                },
                closedAction: {
                    madeAt: close_action_found.createdAt,
                    madeBy: close_action_found.madeBy?.displayName,
                },
            });
        }

        //Obtaining actual state due to is open the Inventory in the selected economic Cycle
        const found = stock_area_book_actions.find(
            item => item.operation === "OPEN"
        );

        if (!found) {
            return res.status(404).json({
                message: `No se encontró un inventario abierto correspondiente al área proporcionada.`,
            });
        }

        let openAction = {};

        openAction = {
            madeAt: found.createdAt,
            madeBy: found.madeBy?.displayName,
        };

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const result = await obtainAreaProcessedMovements({
            businessId: user.businessId,
            areaId: area.id,
            userId: user.id,
            precission: precission_after_coma,
            initialState: JSON.parse(found.state),
            initAt: found.createdAt,
            economicCyle: economicCycle,
        });

        return res.status(200).json({
            products: result.processed_data,
            openAction,
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

//Method only for tablet consultation
//Obtain the latest data if any economic cycle is open
export const getLastStockInvetory = async (req: any, res: Response) => {
    try {
        const { areaId } = req.params;
        const user: User = req.user;

        const area = await Area.findOne({
            where: {
                id: areaId,
                businessId: user.businessId,
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `El área definida no fue encontrada.`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(406).json({
                message: `El área introducida no es de tipo Almacén.`,
            });
        }

        //Analyze if active Economic Cycle
        const economicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        if (!economicCycle) {
            return res.status(404).json({
                message: `No hay ciclos económicos activos.`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Find last operation
        const stock_area_book_actions = await StockAreaBook.findAll({
            where: {
                economicCycleId: economicCycle.id,
                areaId,
            },
            include: [{ model: User, as: "madeBy", paranoid: false }],
        });

        const close_action_found = stock_area_book_actions.find(
            item => item.operation === "CLOSED"
        );

        if (close_action_found) {
            //Exist a closed operation
            const open_action_found = stock_area_book_actions.find(
                item => item.operation === "OPEN"
            );

            return res.status(200).json({
                products: JSON.parse(close_action_found.state),
                openAction: {
                    madeAt: open_action_found?.createdAt,
                    madeBy: open_action_found?.madeBy?.displayName,
                },
                closedAction: {
                    madeAt: close_action_found.createdAt,
                    madeBy: close_action_found.madeBy?.displayName,
                },
            });
        }

        //Obtaining actual state due to is open the Inventory in the selected economic Cycle
        const found = stock_area_book_actions.find(
            item => item.operation === "OPEN"
        );

        if (!found) {
            return res.status(404).json({
                message: `No se encontró un inventario abierto correspondiente al área proporcionada.`,
            });
        }

        let openAction = {};

        openAction = {
            madeAt: found.createdAt,
            madeBy: found.madeBy?.displayName,
        };

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const result = await obtainAreaProcessedMovements({
            businessId: user.businessId,
            areaId: area.id,
            userId: user.id,
            precission: precission_after_coma,
            initialState: JSON.parse(found.state),
            initAt: found.createdAt,
            economicCyle: economicCycle,
        });

        return res.status(200).json({
            products: result.processed_data,
            openAction,
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
