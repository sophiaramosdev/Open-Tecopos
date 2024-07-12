import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";
import db from "../../database/connection";
import User from "../../database/models/user";
import Product from "../../database/models/product";
import ProductPrice from "../../database/models/productPrice";
import Area from "../../database/models/area";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import StockMovement from "../../database/models/stockMovement";
import {
    exchangeCurrency,
    internalCheckerResponse,
    mathOperation,
    obtainFeatureImageFromProduct,
} from "../../helpers/utils";
import Price from "../../database/models/price";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Image from "../../database/models/image";
import { pag_params } from "../../database/pag_params";
import Supply from "../../database/models/supply";
import Shift from "../../database/models/shift";
import MovementStateRecord from "../../database/models/movementStateRecord";
import ProductState from "../../database/models/productState";
import ProductionOrder from "../../database/models/productionOrder";
import ProductProductionOrder from "../../database/models/productProductionOrder";
import EconomicCycle from "../../database/models/economicCycle";
import { productQueue } from "../../bull-queue/product";
import { config_transactions } from "../../database/seq-transactions";
import { socketQueue } from "../../bull-queue/socket";
import { wooQueue } from "../../bull-queue/wocommerce";
import Logger from "../../lib/logger";
import Variation from "../../database/models/variation";
import {
    addProductsToStockArea,
    newProductElaboration,
    substractProductsFromStockArea,
} from "../helpers/products";
import ProductFixedCost from "../../database/models/productFixedCost";
import Recipe from "../../database/models/recipe";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import { ProductItemMove } from "../helpers/interfaces";
import {
    getActiveEconomicCycleCache,
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";

//Interfaces
interface ProductItem {
    quantity: number;
    productId: number;
    variationId: number;
    fraction: number;
    transferCost: boolean;
}

interface StockProductMovementItem {
    productId: number;
    price: {
        amount: number;
        codeCurrency: string;
    };
    quantity: number;
    supplierId?: number;
    variationId?: number;
    accountId?: number;
    accountTagId?: number;
    documentId?: number;
}

export const entryStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const {
            quantity,
            productId,
            description,
            price,
            supplierId,
            stockAreaId,
            variationId,
        } = req.body;

        const [product, availableCurrencies] = await Promise.all([
            Product.findByPk(productId, {
                include: [ProductPrice],
                transaction: t,
            }),
            AvailableCurrency.findAll({
                where: {
                    businessId: user.businessId,
                },
                include: [Currency],
            }),
        ]);

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //->BLOCK Product
        await Product.findByPk(productId, {
            lock: true,
            transaction: t,
        });

        await StockAreaProduct.findOne({
            where: {
                productId,
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });
        //-> END Block Product

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        //Add products to Stock
        const result = await addProductsToStockArea(
            {
                products: [
                    {
                        productId,
                        quantity,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId: stockAreaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "entryStockProduct/addProductsToStockArea",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        const movement = StockMovement.build({
            quantity,
            productId,
            supplierId,
            description,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            areaId: stockAreaId,
            operation: "ENTRY",
            costBeforeOperation: product.averageCost,
            economicCycleId: activeEconomicCycle?.id,
            variationId,
        });

        await movement.save({ transaction: t });

        let itemCost = 0;
        if (isNaN(product.averageCost)) {
            t.rollback();
            return res.status(400).json({
                message: `El costo del producto ${product.name} es indeterminado, por favor defina su valor antes de continuar.`,
            });
        }

        if (!price) {
            const new_entry_price = Price.build({
                amount: mathOperation(
                    product.averageCost,
                    quantity,
                    "multiplication",
                    2
                ),
                codeCurrency: costCurrency,
            });

            await new_entry_price.save({ transaction: t });
            movement.priceId = new_entry_price.id;

            itemCost = product.averageCost;
        } else if (isNaN(price)) {
            if (!price.codeCurrency) {
                t.rollback();
                return res.status(400).json({
                    message: `El campo tipo de moneda no fue proporcionado`,
                });
            }

            if (!price.amount || isNaN(price.amount)) {
                t.rollback();
                return res.status(400).json({
                    message: `El campo cantidad no fue proporcionado.`,
                });
            }

            const found_currency = availableCurrencies.find(
                item => item.currency.code === price.codeCurrency
            );

            if (!found_currency) {
                t.rollback();
                return res.status(400).json({
                    message: `La moneda proporcionada no fue encontrada.`,
                });
            }

            itemCost = price.amount;
            if (found_currency.currency.code !== costCurrency) {
                itemCost =
                    exchangeCurrency(price, costCurrency, availableCurrencies)
                        ?.amount || 0;
            }

            const new_entry_price = Price.build({
                amount: mathOperation(
                    price.amount,
                    quantity,
                    "multiplication",
                    2
                ),
                codeCurrency: price.codeCurrency,
            });

            await new_entry_price.save({ transaction: t });
            movement.priceId = new_entry_price.id;
        } else {
            const new_entry_price = Price.build({
                amount: mathOperation(price, quantity, "multiplication", 2),
                codeCurrency: main_currency.currency.code,
            });

            await new_entry_price.save({ transaction: t });
            movement.priceId = new_entry_price.id;

            itemCost = price;
        }

        await movement.save({ transaction: t });

        //Updating averageCost
        if (itemCost !== 0 && !product.isCostDefined) {
            //Ignoring operation in case cost not where introduced
            if (product.totalQuantity === 0 || product.averageCost === 0) {
                product.averageCost = itemCost;
            } else {
                const averageCost =
                    (product.averageCost * product.totalQuantity +
                        itemCost * quantity) /
                    (product.totalQuantity + quantity);
                product.averageCost = mathOperation(
                    averageCost,
                    0,
                    "addition",
                    precission_after_coma
                );
            }
        }

        //Update dependants values
        product.totalQuantity = mathOperation(
            product.totalQuantity,
            quantity,
            "addition",
            precission_after_coma
        );

        await product.save({ transaction: t });

        await t.commit();
        res.status(200).json(movement);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "NEW_BULK_ENTRY",
                params: {
                    stockAreaId,
                    products: [
                        {
                            productId: product.id,
                            quantity,
                        },
                    ],
                    businessId: user.businessId,
                    costMustBePropagated: true,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [product.id],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [product.id],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const bulkEntryStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const {
            products,
            stockAreaId,
            description,
            accountId,
            accountTagId,
            documentId,
        } = req.body;

        //Generals
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Block products
        await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });

        await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                businessId: user.businessId,
            },
            lock: true,
            transaction: t,
        });
        //-> END

        const retrieve_products = await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                businessId: user.businessId,
            },
            include: [{ model: Supply, as: "supplies" }, ProductFixedCost],
            transaction: t,
        });

        const available_currencies = await getCurrenciesCache(user.businessId);

        const main_currency = available_currencies.find(item => item.isMain)!
            .currency.code;

        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency;

        let bulkMovements = [];
        let bulkUpdateProducts: Array<{ id: number; averageCost: number }> = [];

        for (const product of products as StockProductMovementItem[]) {
            const found = retrieve_products.find(
                item => item.id === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            if (found.type === "WASTE") {
                t.rollback();
                return res.status(400).json({
                    message: `No puede realizar entradas a productos de tipo Desperdicio. Operación no permitida.`,
                });
            }

            if (found.recipeId) {
                t.rollback();
                return res.status(400).json({
                    message: `No puede realizar entradas a productos que tienen una receta asociada. Operación no permitida.`,
                });
            }

            // if (found.supplies.length > 0 || found.fixedCosts.length > 0) {
            //     t.rollback();
            //     return res.status(400).json({
            //         message: `No puede realizar entradas a productos que tienen una Ficha Técnica o Costos fijos definidos. Operación no permitida.`,
            //     });
            // }

            let mov: any = {
                quantity: product.quantity,
                productId: product.productId,
                supplierId: product.supplierId,
                variationId: product.variationId,
                description,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                areaId: stockAreaId,
                operation: "ENTRY",
                costBeforeOperation: found.averageCost,
                economicCycleId: activeEconomicCycle?.id,
            };

            //Acting depending the price received
            let unitaryCost = found.averageCost;

            if (isNaN(unitaryCost)) {
                t.rollback();
                return res.status(400).json({
                    message: `El costo del producto ${found.name} es indeterminado, por favor defina su valor antes de continuar.`,
                });
            }

            if (product.price) {
                //Validations
                if (!product.price.amount || isNaN(product.price.amount)) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El campo precio del producto ${found.name} no fue proporcionado.`,
                    });
                }

                if (!product.price.codeCurrency) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Debe definir una moneda en el producto ${found.name}`,
                    });
                }

                unitaryCost = product.price.amount;
                mov.price = {
                    amount: mathOperation(
                        product.price.amount,
                        product.quantity,
                        "multiplication",
                        2
                    ),
                    codeCurrency: product.price.codeCurrency,
                };

                const found_currency = available_currencies.find(
                    item => item.currency.code === product.price.codeCurrency
                );

                if (!found_currency) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La moneda del producto ${found.name} no es válida.`,
                    });
                }

                if (costCurrency !== product.price.codeCurrency) {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === product.price.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada.`,
                        });
                    }

                    unitaryCost =
                        exchangeCurrency(
                            product.price,
                            costCurrency,
                            available_currencies
                        )?.amount || 0;
                }
            } else {
                mov.price = {
                    amount: mathOperation(
                        found.averageCost,
                        product.quantity,
                        "multiplication",
                        2
                    ),
                    codeCurrency: main_currency,
                };
            }

            bulkMovements.push(mov);

            //Cost
            if (!found.isCostDefined) {
                if (found.totalQuantity !== 0) {
                    unitaryCost =
                        (found.averageCost * found.totalQuantity +
                            unitaryCost * product.quantity) /
                        (found.totalQuantity + product.quantity);
                    unitaryCost = mathOperation(
                        unitaryCost,
                        0,
                        "addition",
                        precission_after_coma
                    );
                }
            } else {
                unitaryCost = found.averageCost;
            }

            if (found.averageCost !== unitaryCost) {
                bulkUpdateProducts.push({
                    id: found.id,
                    averageCost: unitaryCost,
                });
            }
        }

        //TODO:
        if (accountId) {
        }

        //Add products to Stock
        //Normalyzing data
        const productToAdd = products.map((item: StockProductMovementItem) => {
            return {
                productId: item.productId,
                variationId: item.variationId,
                quantity: item.quantity,
            };
        });

        const result = await addProductsToStockArea(
            {
                products: productToAdd,
                precission_after_coma,
                areaId: stockAreaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "bulkEntryStockProduct/addProductsToStockArea",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            include: [{ model: Price, as: "price" }],
            transaction: t,
            returning: true,
        });

        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["averageCost"],
                transaction: t,
            });
        }

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();
        res.status(200).json(to_return);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "NEW_BULK_ENTRY",
                params: {
                    stockAreaId,
                    products,
                    businessId: user.businessId,
                    costMustBePropagated: true,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: products.map(
                        (item: StockProductMovementItem) => item.productId
                    ),
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const moveStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const {
            quantity,
            productId,
            description,
            movedToId,
            variationId,
            areaId,
        } = req.body;

        //Validations
        if (areaId === movedToId) {
            t.rollback();
            return res.status(400).json({
                message: `No pueden realizarse operaciones de traslado en la misma área.`,
            });
        }

        //->BLOCK Product
        await Product.findByPk(productId, {
            lock: true,
            transaction: t,
        });

        await StockAreaProduct.findAll({
            where: {
                productId,
                areaId: {
                    [Op.or]: [areaId, movedToId],
                },
            },
            lock: true,
            transaction: t,
        });
        //-> END Block Product

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //From
        const result_from = await substractProductsFromStockArea(
            {
                products: [
                    {
                        quantity,
                        productId,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "moveStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        const movement = StockMovement.build({
            quantity: Math.abs(quantity) * -1,
            productId,
            description,
            movedToId,
            areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "MOVEMENT",
            variationId: variationId ?? null,
            economicCycleId: activeEconomicCycle?.id,
        });

        await movement.save({ transaction: t });

        //To
        const result_to = await addProductsToStockArea(
            {
                products: [
                    {
                        quantity,
                        productId,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId: movedToId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_to)) {
            t.rollback();
            Logger.warn(
                result_to.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "moveStockProduct/addProductsToStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_to.status).json({
                message: result_to.message,
            });
        }

        const movement_to = StockMovement.build({
            quantity,
            productId,
            description,
            areaId: movedToId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "ENTRY",
            parentId: movement.id,
            variationId: variationId ?? null,
            economicCycleId: activeEconomicCycle?.id,
        });

        await movement_to.save({ transaction: t });

        await t.commit();

        res.status(200).json({
            movementFrom: movement,
            movementTo: movement_to,
        });

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "NEW_BULK_ENTRY",
                params: {
                    stockAreaId: areaId,
                    products: [
                        {
                            productId,
                            quantity,
                        },
                    ],
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        socketQueue.add(
            {
                code: "BULK_MOVEMENT_OUT",
                params: {
                    stockAreaId: movedToId,
                    products: [
                        {
                            productId,
                            quantity,
                        },
                    ],
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [productId],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
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

export const bulkMoveStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { products, stockAreaFromId, stockAreaToId, description } =
            req.body;

        //Validations
        if (stockAreaFromId === stockAreaToId) {
            t.rollback();
            return res.status(400).json({
                message: `No pueden realizarse operaciones de traslado en la misma área.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //--> INIT BLOCK Resources
        await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: [stockAreaFromId, stockAreaToId],
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const retrieve_products_from = await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaFromId,
            },
            include: [Product],
            transaction: t,
        });

        let bulkMovements = [];

        for (const product of products as StockProductMovementItem[]) {
            const found = retrieve_products_from.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado en el área de origen proporcionada.`,
                });
            }

            let movement: any = {
                quantity: Math.abs(product.quantity),
                productId: product.productId,
                description,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                areaId: stockAreaToId,
                operation: "ENTRY",
                economicCycleId: activeEconomicCycle?.id,
                variationId: product.variationId,
                parent: {
                    quantity: Math.abs(product.quantity) * -1,
                    productId: product.productId,
                    variationId: product.variationId,
                    description,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    areaId: stockAreaFromId,
                    movedToId: stockAreaToId,
                    operation: "MOVEMENT",
                    economicCycleId: activeEconomicCycle?.id,
                },
            };

            bulkMovements.push(movement);
        }

        //From
        const productToSubstract = products.map(
            (item: StockProductMovementItem) => {
                return {
                    productId: Number(item.productId),
                    variationId: item.variationId
                        ? Number(item.variationId)
                        : undefined,
                    quantity: item.quantity,
                };
            }
        );

        const result_from = await substractProductsFromStockArea(
            {
                products: productToSubstract,
                precission_after_coma,
                areaId: stockAreaFromId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "bulkMoveStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //To
        //Normalyzing data
        const productToAdd = products.map((item: StockProductMovementItem) => {
            return {
                productId: Number(item.productId),
                variationId: item.variationId
                    ? Number(item.variationId)
                    : undefined,
                quantity: item.quantity,
            };
        });

        const result_to = await addProductsToStockArea(
            {
                products: productToAdd,
                precission_after_coma,
                areaId: stockAreaToId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_to)) {
            t.rollback();
            Logger.warn(
                result_to.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "bulkMoveStockProduct/addProductsToStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_to.status).json({
                message: result_to.message,
            });
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            include: [{ model: StockMovement, as: "parent" }],
            transaction: t,
            returning: true,
        });

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "NEW_BULK_ENTRY",
                params: {
                    stockAreaId: stockAreaToId,
                    products,
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        socketQueue.add(
            {
                code: "BULK_MOVEMENT_OUT",
                params: {
                    stockAreaId: stockAreaFromId,
                    products,
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: products.map(
                            (item: StockProductMovementItem) => item.productId
                        ),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
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

export interface TransformableItem {
    baseProductId: number;
    baseVariationId: number;
    quantityBaseProduct: number;
    transformedProductId: number;
    transformedVariationId: number;
    quantityTransformedProduct: number;
    unitaryFractionCost: number;
}

export const bulkTransformStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { products, stockAreaId, description } = req.body;

        //Validations
        const area = await getAreaCache(stockAreaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `El área de origen proporcinada no fue encontrada`,
            });
        }

        if (area.type !== "STOCK") {
            t.rollback();
            return res.status(404).json({
                message: `El área de origen proporcinada no es de tipo Almacén`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(403).json({
                message: `No tiene acceso al área de origen proporcionada.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //--> INIT BLOCK Resources
        const blockedProducts = [
            ...products.map((item: TransformableItem) => item.baseProductId),
            ...products.map(
                (item: TransformableItem) => item.transformedProductId
            ),
        ];

        await Product.findAll({
            where: {
                id: blockedProducts,
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId: blockedProducts,
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const [
            retrieve_products,
            all_product_to_transform,
            available_currencies,
        ] = await Promise.all([
            StockAreaProduct.findAll({
                where: {
                    productId: products.map(
                        (item: TransformableItem) => item.baseProductId
                    ),
                    areaId: stockAreaId,
                },
                include: [Product],
                transaction: t,
            }),
            Product.findAll({
                where: {
                    id: products.map(
                        (item: TransformableItem) => item.transformedProductId
                    ),
                    businessId: user.businessId,
                },
                transaction: t,
            }),
            AvailableCurrency.findAll({
                where: {
                    businessId: user.businessId,
                },
                include: [Currency],
            }),
        ]);

        const main_currency = available_currencies.find(item => item.isMain)
            ?.currency.code;

        let bulkMovements = [];
        let bulkToEntry = [];
        let bulkToSubstract = [];

        for (const product of products as TransformableItem[]) {
            const found = retrieve_products.find(
                item => item.productId === product.baseProductId
            );

            const full_product_to_transform = all_product_to_transform.find(
                item => item.id === product.transformedProductId
            );

            if (!product.unitaryFractionCost) {
                t.rollback();
                return res.status(400).json({
                    message: `Debe definir una fracción unitaria de costo.`,
                });
            }

            if (product.unitaryFractionCost === 0) {
                t.rollback();
                return res.status(400).json({
                    message: `La fracción unitaria de costo no puede ser cero.`,
                });
            }

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.baseProductId} no fue encontrado.`,
                });
            }

            if (!full_product_to_transform) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.transformedProductId} no fue encontrado.`,
                });
            }

            const boughtUnitaryPrice =
                found.product.averageCost * product.unitaryFractionCost;
            // 1 [measure destination] = (fraction) [measure from]

            let transformedUnitaryCost;
            if (full_product_to_transform.totalQuantity !== 0) {
                transformedUnitaryCost =
                    (full_product_to_transform.averageCost *
                        full_product_to_transform.totalQuantity +
                        boughtUnitaryPrice *
                            product.quantityTransformedProduct) /
                    (full_product_to_transform.totalQuantity +
                        product.quantityTransformedProduct);
            } else {
                transformedUnitaryCost = boughtUnitaryPrice;
            }

            const costBeforeOperation = full_product_to_transform.averageCost;
            full_product_to_transform.averageCost = transformedUnitaryCost;
            full_product_to_transform.save({ transaction: t });

            let movement: any = {
                quantity: Math.abs(product.quantityTransformedProduct),
                productId: product.transformedProductId,
                variationId: product.transformedVariationId,
                description,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                areaId: stockAreaId,
                operation: "ENTRY",
                economicCycleId: activeEconomicCycle?.id,
                costBeforeOperation,
                parent: {
                    quantity: Math.abs(product.quantityBaseProduct) * -1,
                    productId: product.baseProductId,
                    variationId: product.baseVariationId,
                    description,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    areaId: stockAreaId,
                    operation: "TRANSFORMATION",
                    economicCycleId: activeEconomicCycle?.id,
                },
                price: {
                    amount: mathOperation(
                        boughtUnitaryPrice,
                        product.quantityTransformedProduct,
                        "multiplication",
                        2
                    ),
                    codeCurrency: main_currency,
                },
            };

            bulkMovements.push(movement);

            //Updating quantities in Stocks
            //From
            bulkToSubstract.push({
                productId: found.productId,
                variationId: product.baseVariationId,
                quantity: Math.abs(product.quantityBaseProduct),
            });

            //To
            bulkToEntry.push({
                productId: product.transformedProductId,
                variationId: product.transformedVariationId,
                quantity: Math.abs(product.quantityTransformedProduct),
            });
        }

        //Moving in stocks
        if (bulkToEntry.length !== 0) {
            const result = await addProductsToStockArea(
                {
                    products: bulkToEntry,
                    precission_after_coma,
                    areaId: stockAreaId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.warn(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "bulkAdjustStockProduct/addProductsToStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }
        }

        if (bulkToSubstract.length !== 0) {
            const result_from = await substractProductsFromStockArea(
                {
                    products: bulkToSubstract,
                    precission_after_coma,
                    areaId: stockAreaId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result_from)) {
                t.rollback();
                Logger.warn(
                    result_from.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "bulkAdjustStockProduct/substractProductsFromStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_from.status).json({
                    message: result_from.message,
                });
            }
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            include: [
                { model: StockMovement, as: "parent" },
                { model: Price, as: "price" },
            ],
            transaction: t,
            returning: true,
        });

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        //Sockets
        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: blockedProducts,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: blockedProducts,
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        //Only READYFORSALE
        // const forSaleType = [
        //     "MENU",
        //     "STOCK",
        //     "COMBO",
        //     "VARIATION",
        //     "SERVICE",
        //     "ADDON",
        // ];
        // if (forSaleType.includes(product_to_emit!.type)) {
        //     //MovedTo
        //     req.io.to(`business:${user.businessId}`).emit("products", {
        //         action: "add_stock",
        //         data: {
        //             product: product_to_emit,
        //             quantity,
        //             movedToId,
        //         },
        //         from: user.id,
        //     });

        //     //MovedFrom
        //     req.io.to(`business:${user.businessId}`).emit("products", {
        //         action: "remove_quantity_stock",
        //         data: {
        //             product: product_to_emit,
        //             quantity,
        //             areaId,
        //         },
        //         from: user.id,
        //     });
        // }
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

export const bulkOutStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { products, description, stockAreaId } = req.body;

        if (!description) {
            t.rollback();
            return res.status(400).json({
                message: `Description field is missing`,
            });
        }

        //--> INIT BLOCK Resources
        await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const retrieve_products = await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            transaction: t,
        });

        let bulkMovements = [];

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        //Normalize data
        const productToSubstract = products.map(
            (item: StockProductMovementItem) => {
                return {
                    productId: item.productId,
                    variationId: item.variationId,
                    quantity: item.quantity,
                };
            }
        );

        const result_from = await substractProductsFromStockArea(
            {
                products: productToSubstract,
                precission_after_coma,
                areaId: stockAreaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "bulkOutStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        for (const product of products as StockProductMovementItem[]) {
            const found = retrieve_products.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            let mov: any = {
                quantity: Math.abs(product.quantity) * -1,
                productId: product.productId,
                supplierId: product.supplierId,
                description,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                areaId: stockAreaId,
                operation: "OUT",
                variationId: product.variationId,
                economicCycleId: activeEconomicCycle?.id,
            };

            bulkMovements.push(mov);
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            transaction: t,
            returning: true,
        });

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "BULK_OUT",
                params: {
                    stockAreaId,
                    products,
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: products.map(
                            (item: StockProductMovementItem) => item.productId
                        ),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: products.map(
                        (item: StockProductMovementItem) => item.productId
                    ),
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Only for Tablet use
export const outStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { quantity, productId, variationId, description, areaId } =
            req.body;

        if (!description) {
            t.rollback();
            return res.status(400).json({
                message: `Description field is missing`,
            });
        }

        //-> Blocking products
        const product = await Product.findByPk(productId, {
            lock: true,
            transaction: t,
        });

        await StockAreaProduct.findOne({
            where: {
                productId,
                areaId,
            },
            lock: true,
            transaction: t,
        });
        //-> END Blocking products

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const result_from = await substractProductsFromStockArea(
            {
                products: [
                    {
                        quantity,
                        productId,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "outStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        const movement = StockMovement.build({
            quantity: Math.abs(quantity) * -1,
            productId,
            description,
            areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "OUT",
            variationId,
            economicCycleId: activeEconomicCycle?.id,
        });

        await movement.save({ transaction: t });

        await t.commit();
        res.status(200).json(movement);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "BULK_OUT",
                params: {
                    stockAreaId: areaId,
                    products: [
                        {
                            productId: product.id,
                            quantity,
                        },
                    ],
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [product.id],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [product.id],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const bulkWasteStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { products, description, stockAreaId } = req.body;

        if (!description) {
            t.rollback();
            return res.status(400).json({
                message: `Description field is missing`,
            });
        }

        //--> INIT BLOCK Resources
        await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const retrieve_products = await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            transaction: t,
        });

        let bulkMovements = [];

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        //Normalizing data
        const productToSubstract = products.map(
            (item: StockProductMovementItem) => {
                return {
                    productId: item.productId,
                    variationId: item.variationId,
                    quantity: item.quantity,
                };
            }
        );

        const result_from = await substractProductsFromStockArea(
            {
                products: productToSubstract,
                precission_after_coma,
                areaId: stockAreaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "bulkWasteStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        for (const product of products as StockProductMovementItem[]) {
            const found = retrieve_products.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            let mov: any = {
                quantity: Math.abs(product.quantity) * -1,
                productId: product.productId,
                supplierId: product.supplierId,
                description,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                areaId: stockAreaId,
                operation: "WASTE",
                variationId: product.variationId,
                economicCycleId: activeEconomicCycle?.id,
            };

            bulkMovements.push(mov);
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            transaction: t,
            returning: true,
        });

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "BULK_OUT",
                params: {
                    stockAreaId,
                    products,
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: products.map(
                            (item: StockProductMovementItem) => item.productId
                        ),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: products.map(
                        (item: StockProductMovementItem) => item.productId
                    ),
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Only for Tablet use
export const wasteStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { quantity, productId, variationId, description, areaId } =
            req.body;

        if (!description) {
            t.rollback();
            return res.status(400).json({
                message: `Description field is missing`,
            });
        }

        //-> Blocking products
        const product = await Product.findByPk(productId, {
            lock: true,
            transaction: t,
        });

        await StockAreaProduct.findOne({
            where: {
                productId,
                areaId,
            },
            lock: true,
            transaction: t,
        });
        //-> END Blocking products

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Find the StockArea product I am outing
        const stock_area_product = await StockAreaProduct.findOne({
            where: {
                productId,
                areaId,
            },
            include: [Product, StockAreaVariation],
            transaction: t,
        });

        if (!stock_area_product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado en el área especificada`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const result_from = await substractProductsFromStockArea(
            {
                products: [
                    {
                        quantity,
                        productId,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "outStockProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        const movement = StockMovement.build({
            quantity: Math.abs(quantity) * -1,
            productId,
            description,
            areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "WASTE",
            variationId,
            economicCycleId: activeEconomicCycle?.id,
        });

        await movement.save({ transaction: t });

        await t.commit();
        res.status(200).json(movement);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "BULK_OUT",
                params: {
                    stockAreaId: areaId,
                    products: [
                        {
                            productId: product.id,
                            quantity,
                        },
                    ],
                    businessId: user.businessId,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [product.id],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [product.id],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Only for tablet use
//Use bulkAdjustStockProduct insted
export const adjustStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { quantity, productId, description, variationId, areaId } =
            req.body;

        const product = await Product.findByPk(productId);

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //--> INIT BLOCK Resources
        await Product.findAll({
            where: {
                id: productId,
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId,
                areaId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        //Find the StockArea product I am outing
        const stock_area_product = await StockAreaProduct.findOne({
            where: {
                productId,
                areaId,
            },
            transaction: t,
        });

        if (!stock_area_product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado en el área especificada`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const movement = StockMovement.build({
            productId,
            description,
            areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            variationId,
            economicCycleId: activeEconomicCycle?.id,
        });

        //Checking what to do
        let difference;
        if (stock_area_product.quantity < 0) {
            difference = mathOperation(
                quantity,
                Math.abs(stock_area_product.quantity),
                "addition",
                precission_after_coma
            );

            movement.operation = "ENTRY";

            //Add products to Stock
            const result = await addProductsToStockArea(
                {
                    products: [
                        {
                            productId,
                            quantity: Math.abs(difference),
                            variationId,
                        },
                    ],
                    precission_after_coma,
                    areaId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.warn(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "adjustStockProduct/addProductsToStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }
        } else {
            if (stock_area_product.quantity > Number(quantity)) {
                difference =
                    mathOperation(
                        stock_area_product.quantity,
                        quantity,
                        "subtraction",
                        precission_after_coma
                    ) * -1;
                movement.operation = "OUT";

                const result_from = await substractProductsFromStockArea(
                    {
                        products: [
                            {
                                quantity: Math.abs(difference),
                                productId,
                                variationId,
                            },
                        ],
                        precission_after_coma,
                        areaId,
                        businessId: user.businessId,
                    },
                    t
                );

                if (!internalCheckerResponse(result_from)) {
                    t.rollback();
                    Logger.warn(
                        result_from.message ||
                            "Ha ocurrido un error inesperado.",
                        {
                            origin: "adjustStockProduct/substractProductsFromStockArea",
                            "X-App-Origin": req.header("X-App-Origin"),
                        }
                    );
                    return res.status(result_from.status).json({
                        message: result_from.message,
                    });
                }
            } else {
                difference = mathOperation(
                    quantity,
                    stock_area_product.quantity,
                    "subtraction",
                    precission_after_coma
                );
                movement.operation = "ENTRY";

                //Add products to Stock
                const result = await addProductsToStockArea(
                    {
                        products: [
                            {
                                productId,
                                quantity: Math.abs(difference),
                                variationId,
                            },
                        ],
                        precission_after_coma,
                        areaId,
                        businessId: user.businessId,
                    },
                    t
                );

                if (!internalCheckerResponse(result)) {
                    t.rollback();
                    Logger.warn(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "adjustStockProduct/addProductsToStockArea",
                            "X-App-Origin": req.header("X-App-Origin"),
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }
            }
        }

        movement.quantity = difference;

        await movement.save({ transaction: t });

        await t.commit();
        res.status(200).json(movement);

        if (movement.quantity < 0) {
            //Generating task to send via Sockets
            socketQueue.add(
                {
                    code: "BULK_OUT",
                    params: {
                        stockAreaId: areaId,
                        products: [
                            {
                                productId,
                                quantity: Math.abs(movement.quantity),
                            },
                        ],
                        businessId: user.businessId,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        } else {
            socketQueue.add(
                {
                    code: "NEW_BULK_ENTRY",
                    params: {
                        stockAreaId: areaId,
                        products: [
                            {
                                productId,
                                quantity: Math.abs(movement.quantity),
                            },
                        ],
                        businessId: user.businessId,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [productId],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const bulkAdjustStockProduct = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const user: User = req.user;
        const { products, description, stockAreaId } = req.body;

        if (!description) {
            t.rollback();
            return res.status(400).json({
                message: `Description field is missing`,
            });
        }

        const area = await getAreaCache(stockAreaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `El área de destino proporcinada no fue encontrada`,
            });
        }

        if (area.type !== "STOCK") {
            t.rollback();
            return res.status(404).json({
                message: `El área de origen proporcinada no es de tipo Almacén`,
            });
        }

        //--> INIT BLOCK Resources
        await Product.findAll({
            where: {
                id: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
            },
            lock: true,
            transaction: t,
        });
        await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const retrieve_products = await StockAreaProduct.findAll({
            where: {
                productId: products.map(
                    (item: StockProductMovementItem) => item.productId
                ),
                areaId: stockAreaId,
            },
            include: [Product, StockAreaVariation],
            transaction: t,
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        let bulkMovements = [];
        let bulkToEntry = [];
        let bulkToSubstract = [];

        //For sockets
        let listIdsToEntry: Array<number> = [];
        let listIdsToOut: Array<number> = [];

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        for (const product of products as StockProductMovementItem[]) {
            const found = retrieve_products.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            let mov: any = {
                productId: found.productId,
                description,
                areaId: stockAreaId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                variationId: product.variationId,
                economicCycleId: activeEconomicCycle?.id,
            };

            //Checking what to do
            let difference;
            let quantityInStock;
            if (found.type === "VARIATION") {
                const foundVariation = found.variations.find(
                    item => item.variationId === product.variationId
                );
                if (!foundVariation) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${found.product.name} con id de variacion ${product.variationId} no fue encontrado.`,
                    });
                }

                quantityInStock = foundVariation.quantity;
            } else {
                quantityInStock = found.quantity;
            }

            if (quantityInStock < 0) {
                difference = mathOperation(
                    product.quantity,
                    Math.abs(quantityInStock),
                    "addition",
                    precission_after_coma
                );

                mov.operation = "ENTRY";

                listIdsToEntry.push(product.productId);
                bulkToEntry.push({
                    productId: product.productId,
                    variationId: product.variationId,
                    quantity: Math.abs(difference),
                });
            } else {
                if (quantityInStock > product.quantity) {
                    difference =
                        mathOperation(
                            quantityInStock,
                            product.quantity,
                            "subtraction",
                            precission_after_coma
                        ) * -1;

                    mov.operation = "OUT";

                    listIdsToOut.push(product.productId);
                    bulkToSubstract.push({
                        productId: product.productId,
                        variationId: product.variationId,
                        quantity: Math.abs(difference),
                    });
                } else {
                    difference = mathOperation(
                        product.quantity,
                        quantityInStock,
                        "subtraction",
                        precission_after_coma
                    );

                    mov.operation = "ENTRY";

                    listIdsToEntry.push(product.productId);
                    bulkToEntry.push({
                        productId: product.productId,
                        variationId: product.variationId,
                        quantity: Math.abs(difference),
                    });
                }
            }

            mov.quantity = difference;
            bulkMovements.push(mov);
        }

        //Moving in stocks
        if (bulkToEntry.length !== 0) {
            const result = await addProductsToStockArea(
                {
                    products: bulkToEntry,
                    precission_after_coma,
                    areaId: stockAreaId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.warn(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "bulkAdjustStockProduct/addProductsToStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }
        }

        if (bulkToSubstract.length !== 0) {
            const result_from = await substractProductsFromStockArea(
                {
                    products: bulkToSubstract,
                    precission_after_coma,
                    areaId: stockAreaId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result_from)) {
                t.rollback();
                Logger.warn(
                    result_from.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "bulkAdjustStockProduct/substractProductsFromStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_from.status).json({
                    message: result_from.message,
                });
            }
        }

        const updated = await StockMovement.bulkCreate(bulkMovements, {
            transaction: t,
            returning: true,
        });

        const to_return = await StockMovement.scope("reduced").findAll({
            where: {
                id: updated.map(item => item.id),
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);

        if (listIdsToEntry.length > 0) {
            //Generating task to send via Sockets
            socketQueue.add(
                {
                    code: "BULK_OUT",
                    params: {
                        stockAreaId,
                        products: products.filter(
                            (item: StockProductMovementItem) =>
                                listIdsToOut.includes(item.productId)
                        ),
                        businessId: user.businessId,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (listIdsToOut.length > 0) {
            socketQueue.add(
                {
                    code: "NEW_BULK_ENTRY",
                    params: {
                        stockAreaId,
                        products: products.filter(
                            (item: StockProductMovementItem) =>
                                listIdsToEntry.includes(item.productId)
                        ),
                        businessId: user.businessId,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: products.map(
                            (item: StockProductMovementItem) => item.productId
                        ),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: products.map(
                        (item: StockProductMovementItem) => item.productId
                    ),
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Descomposition
export const manufacturedProduct = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { products, productId, areaId, variationId, quantity } = req.body;

        //Find the StockArea product I am outing
        const [product, manufacturers] = await Promise.all([
            Product.findByPk(productId, {
                include: [
                    {
                        model: Product,
                        as: "listManufacturations",
                        through: {
                            attributes: [],
                        },
                    },
                ],
            }),
            Product.findAll({
                where: {
                    id: products.map((item: any) => item.productId),
                    businessId: user.businessId,
                },
            }),
        ]);

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Creating products
        let bulkMovements = [];
        let bulkToEntry = [];

        //Creating the new processed operation
        const parentMovement = StockMovement.build({
            quantity: Math.abs(quantity) * -1,
            productId,
            areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "PROCESSED",
            variationId,
            costBeforeOperation: product.averageCost,
            economicCycleId: activeEconomicCycle?.id,
        });

        await parentMovement.save({ transaction: t });

        const result_from = await substractProductsFromStockArea(
            {
                products: [
                    {
                        quantity,
                        productId,
                        variationId,
                    },
                ],
                precission_after_coma,
                areaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "manufacturedProduct/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //Analyzing manufacturer products to create
        if (products.length !== 0) {
            //Analyzing cost transfering
            let totalBaseUnityToProcess = 0;
            let totalBaseUnityToBeTransfer = 0;
            products.forEach((item: ProductItem) => {
                totalBaseUnityToProcess += item.fraction;

                if (item.transferCost) {
                    totalBaseUnityToBeTransfer += item.fraction;
                }
            });

            const newUnitaryCostToBeTransfer = mathOperation(
                (totalBaseUnityToProcess * product.averageCost) /
                    totalBaseUnityToBeTransfer,
                0,
                "addition",
                precission_after_coma
            );

            for (const manufacturer of products as ProductItem[]) {
                const found_manufacturer = manufacturers.find(
                    item => item.id === manufacturer.productId
                );

                if (!found_manufacturer) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con id ${manufacturer.productId} no fue encontrado`,
                    });
                }

                //Creating operation movement
                bulkMovements.push({
                    quantity: manufacturer.quantity,
                    productId: manufacturer.productId,
                    variationId: manufacturer.variationId,
                    areaId,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    operation: "ENTRY",
                    costBeforeOperation: found_manufacturer.averageCost,
                    parentId: parentMovement.id,
                    economicCycleId: activeEconomicCycle?.id,
                });

                //Merging costs if transfer cost is true
                let costUnitProcessed = 0;
                if (manufacturer.transferCost) {
                    const totalToDivide =
                        newUnitaryCostToBeTransfer * manufacturer.fraction;

                    costUnitProcessed = mathOperation(
                        totalToDivide,
                        manufacturer.quantity,
                        "division",
                        precission_after_coma
                    );
                } else {
                    costUnitProcessed = found_manufacturer.averageCost;
                }

                let costMerged = 0;
                if (
                    found_manufacturer.totalQuantity === 0 &&
                    manufacturer.transferCost
                ) {
                    //Special case when no averageCost defined or product is out of stock
                    costMerged = costUnitProcessed;
                } else if (manufacturer.transferCost) {
                    costMerged = mathOperation(
                        (found_manufacturer.totalQuantity *
                            found_manufacturer.averageCost +
                            manufacturer.quantity * costUnitProcessed) /
                            (found_manufacturer.totalQuantity +
                                manufacturer.quantity),
                        0,
                        "addition",
                        precission_after_coma
                    );
                } else {
                    costMerged = found_manufacturer.averageCost;
                }

                bulkToEntry.push({
                    productId: manufacturer.productId,
                    quantity: manufacturer.quantity,
                    variationId: manufacturer.variationId,
                });
            }
        }

        const result = await addProductsToStockArea(
            {
                products: bulkToEntry,
                precission_after_coma,
                areaId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "bulkEntryStockProduct/addProductsToStockArea",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        //Creating Movements if exist
        if (bulkMovements.length !== 0) {
            await StockMovement.bulkCreate(bulkMovements, {
                transaction: t,
            });
        }

        await t.commit();
        res.status(204).json({
            message: `Operation completed`,
        });

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [
                        ...products.map((item: any) => item.productId),
                        productId,
                    ],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const findAllStockMovements = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const {
            per_page,
            page,
            search,
            order,
            orderBy,
            dateFrom,
            dateTo,
            operation,
            type,
            fullMovements,
            all_data,
            ...params
        } = req.query;

        //Preparing search
        let where_clause: any = {};
        let where_product_clause: any = {};

        //Delimiting to stcok
        if (!fullMovements) {
            where_clause.operation = {
                [Op.not]: ["REMOVED"],
            };
        }

        const searchable_fields = [
            "productId",
            "movedById",
            "supplierId",
            "approvedById",
            "areaId",
            "movedToId",
            "accountable",
            "economicCycleId",
            "shiftId",
            "dispatchId",
            "productionOrderId",
        ];
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

            where_product_clause.type = {
                [Op.or]: productTypes,
            };
        }

        if (operation) {
            const operationTypes = operation.split(",");

            const allTypes = [
                "ENTRY",
                "MOVEMENT",
                "PROCESSED",
                "OUT",
                "SALE",
                "REMOVED",
                "WASTE",
                "TRANSFORMATION",
            ];

            for (const item of operationTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }

            where_clause.operation = {
                [Op.or]: operationTypes,
            };
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

        const found_stock_movements = await StockMovement.findAndCountAll({
            distinct: true,
            include: [
                {
                    model: User,
                    as: "movedBy",
                    attributes: ["id", "username", "email", "displayName"],
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
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "measure"],
                    paranoid: false,
                    include: [
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    where: where_product_clause,
                },
                {
                    model: Variation,
                    attributes: ["id", "name"],
                },
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "name"],
                    paranoid: false,
                },
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_stock_movements.count / limit);
        if (found_stock_movements.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_stock_movements.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_stock_movements.rows,
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

export const deleteStockMovement = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { description } = req.body;
        const { id } = req.params;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id, {
            include: [
                { model: Product, as: "product" },
                {
                    model: StockMovement,
                    as: "parent",
                    include: [
                        {
                            model: Product,
                            attributes: ["id", "name", "measure", "type"],
                            paranoid: false,
                        },
                    ],
                },
            ],
        });

        if (!movement) {
            t.rollback();
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        if (!activeEconomicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No se encontró ningún ciclo económico abierto. Acceso denegado.`,
            });
        }

        if (movement.economicCycleId !== activeEconomicCycle.id) {
            t.rollback();
            return res.status(400).json({
                message: `Solo es posible eliminar operaciones en el mismo ciclo económico en que fueron creadas. Acceso denegado.`,
            });
        }

        if (movement.movedById !== user.id) {
            t.rollback();
            return res.status(400).json({
                message: `Solo los creadores de la operación pueden eliminarla. Acceso denegado.`,
            });
        }

        if (
            movement.operation === "SALE" ||
            movement.operation === "WASTE" ||
            !movement.accountable
        ) {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre este recurso.`,
            });
        }

        if (movement.parentId) {
            t.rollback();
            return res.status(400).json({
                message: `Las operaciones de eliminado solo pueden realizarse sobre acciones bases.`,
            });
        }

        if (movement.dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre movimientos que involucran despachos.`,
            });
        }

        if (movement.productionOrderId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre movimientos que involucran órdenes de producción.`,
            });
        }

        let bulkAddStockProducts = [];
        let bulkUpdateStockProducts = [];
        let idsToRemove = [];
        let bulkUpdateProducts = [];

        //Quit original movement from accountability and associating deleted Movement
        const removed_movement = StockMovement.build({
            quantity: movement.quantity * -1,
            productId: movement.productId,
            description,
            areaId: movement.areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "REMOVED",
            accountable: false,
        });

        await removed_movement.save({
            transaction: t,
        });

        movement.accountable = false;
        movement.removedOperationId = removed_movement.id;
        await movement.save({ transaction: t });

        //Acting depending operation
        switch (movement.operation) {
            case "ENTRY": {
                //Finding Area product and updating quantities in Area Stock
                const stockAreaProduct = await StockAreaProduct.findOne({
                    where: {
                        productId: movement.productId,
                        areaId: movement.areaId,
                    },
                });

                if (!stockAreaProduct) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${movement.product.name} ya no se encuentra en el área original. La operación no pudo ser completada.`,
                    });
                }

                if (stockAreaProduct.quantity - movement.quantity === 0) {
                    idsToRemove.push(stockAreaProduct.id);
                } else {
                    bulkUpdateStockProducts.push({
                        id: stockAreaProduct.id,
                        quantity: mathOperation(
                            stockAreaProduct.quantity,
                            movement.quantity,
                            "subtraction",
                            precission_after_coma
                        ),
                    });
                }

                //Updating quantities in Central STOCK
                bulkUpdateProducts.push({
                    id: movement.productId,
                    averageCost: movement.costBeforeOperation,
                    totalQuantity: mathOperation(
                        movement.product.totalQuantity,
                        movement.quantity,
                        "subtraction",
                        precission_after_coma
                    ),
                });

                const found_stocks_products = await StockAreaProduct.findAll({
                    where: {
                        areaId: movement.areaId,
                    },
                });

                //Finding all processed child operations
                const child_movements = await StockMovement.findAll({
                    where: {
                        parentId: movement.id,
                    },
                    include: [{ model: Product, as: "product" }],
                });

                for (const childmov of child_movements) {
                    const removed_entry = StockMovement.build({
                        quantity: childmov.quantity * -1,
                        productId: childmov.productId,
                        description,
                        areaId: childmov.areaId,

                        //Managed values
                        businessId: user.businessId,
                        movedById: user.id,
                        operation: "REMOVED",
                        accountable: false,
                    });

                    await removed_entry.save({ transaction: t });

                    //Quit original movement from accountability and associating deleted Movement
                    childmov.accountable = false;
                    childmov.removedOperationId = removed_entry.id;
                    await childmov.save({ transaction: t });

                    const quantity = Math.abs(childmov.quantity);

                    //Updating quantities in Central STOCK
                    bulkUpdateProducts.push({
                        id: childmov.productId,
                        averageCost: childmov.costBeforeOperation,
                        totalQuantity: mathOperation(
                            childmov.product.totalQuantity,
                            quantity,
                            "addition",
                            precission_after_coma
                        ),
                    });

                    //Finding Area product and updating quantities
                    const childStockAreaProduct = found_stocks_products.find(
                        item => item.productId === childmov.productId
                    );

                    if (!childStockAreaProduct) {
                        bulkAddStockProducts.push({
                            productId: childmov.productId,
                            areaId: childmov.areaId,
                            quantity,
                            type: childmov.product.type,
                        });
                    } else {
                        if (childStockAreaProduct.quantity + quantity === 0) {
                            idsToRemove.push(childStockAreaProduct.id);
                        } else {
                            bulkUpdateStockProducts.push({
                                id: childStockAreaProduct.id,
                                quantity: mathOperation(
                                    childStockAreaProduct.quantity,
                                    quantity,
                                    "addition",
                                    precission_after_coma
                                ),
                            });
                        }
                    }
                }

                //Checking if entry was due to a production
                if (movement.productionOrderId) {
                    const productionOrder = await ProductionOrder.findByPk(
                        movement.productionOrderId,
                        {
                            include: [ProductProductionOrder],
                        }
                    );

                    if (!productionOrder) {
                        t.rollback();
                        return res.status(404).json({
                            message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
                        });
                    }

                    if (productionOrder.status !== "ACTIVE") {
                        t.rollback();
                        return res.status(404).json({
                            message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
                        });
                    }

                    //Updating orderproduction if origin is from SERIAL
                    const found_product_production =
                        productionOrder.products.find(
                            item => item.productId === movement.productId
                        );

                    if (!found_product_production) {
                        t.rollback();
                        return res.status(404).json({
                            message: `El producto con id ${movement.productId} no está dentro de la orden de producción.`,
                        });
                    }

                    found_product_production.realProduced = mathOperation(
                        found_product_production.realProduced,
                        movement.quantity,
                        "subtraction",
                        precission_after_coma
                    );
                    found_product_production.save({ transaction: t });

                    productionOrder.totalProduced = mathOperation(
                        productionOrder.totalProduced,
                        movement.quantity,
                        "subtraction",
                        precission_after_coma
                    );
                    productionOrder.save({ transaction: t });
                }

                break;
            }
            case "MOVEMENT":
                //Finding Area product and updating quantities
                const stockAreaProduct = await StockAreaProduct.findOne({
                    where: {
                        productId: movement.productId,
                        areaId: movement.areaId,
                    },
                });

                const quantity = Math.abs(movement.quantity);

                if (!stockAreaProduct) {
                    bulkAddStockProducts.push({
                        productId: movement.productId,
                        areaId: movement.areaId,
                        quantity,
                        type: movement.product.type,
                    });
                } else {
                    if (stockAreaProduct.quantity + quantity === 0) {
                        idsToRemove.push(stockAreaProduct.id);
                    } else {
                        bulkUpdateStockProducts.push({
                            id: stockAreaProduct.id,
                            quantity: mathOperation(
                                stockAreaProduct.quantity,
                                quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    }
                }

                //Finding product where moved To (childs)
                const movement_to = await StockMovement.findOne({
                    where: {
                        parentId: movement.id,
                    },
                    include: [{ model: Product, as: "product" }],
                });

                if (movement_to) {
                    const child_movement = StockMovement.build({
                        quantity: movement_to.quantity * -1,
                        productId: movement_to.productId,
                        description,
                        areaId: movement_to.areaId,

                        //Managed values
                        businessId: user.businessId,
                        movedById: user.id,
                        operation: "REMOVED",
                        accountable: false,
                    });
                    await child_movement.save({ transaction: t });

                    //Quit child original movement from accountability and associating deleted Movement
                    movement_to.accountable = false;
                    movement_to.removedOperationId = child_movement.id;
                    await movement_to.save({ transaction: t });

                    //Finding Area product and updating quantities
                    const childStockAreaProduct =
                        await StockAreaProduct.findOne({
                            where: {
                                productId: movement_to.productId,
                                areaId: movement_to.areaId,
                            },
                        });

                    if (!childStockAreaProduct) {
                        t.rollback();
                        return res.status(400).json({
                            message: `El producto ${movement_to.product.name} ya no se encuentra en el área original. La operación no pudo ser completada.`,
                        });
                    }

                    if (childStockAreaProduct.quantity - quantity === 0) {
                        idsToRemove.push(childStockAreaProduct.id);
                    } else {
                        bulkUpdateStockProducts.push({
                            id: childStockAreaProduct.id,
                            quantity: mathOperation(
                                childStockAreaProduct.quantity,
                                quantity,
                                "subtraction",
                                precission_after_coma
                            ),
                        });
                    }
                }
                break;
            case "OUT": {
                const quantity = Math.abs(movement.quantity);

                //Finding Area product and updating quantities
                bulkUpdateProducts.push({
                    id: movement.productId,
                    averageCost: movement.product.averageCost,
                    totalQuantity: mathOperation(
                        movement.product.totalQuantity,
                        quantity,
                        "addition",
                        precission_after_coma
                    ),
                });

                //Finding Area product and removing it
                const stockAreaProduct = await StockAreaProduct.findOne({
                    where: {
                        productId: movement.productId,
                        areaId: movement.areaId,
                    },
                });

                if (!stockAreaProduct) {
                    bulkAddStockProducts.push({
                        productId: movement.productId,
                        areaId: movement.areaId,
                        quantity,
                        type: movement.product.type,
                    });
                } else {
                    if (stockAreaProduct.quantity + quantity === 0) {
                        idsToRemove.push(stockAreaProduct.id);
                    } else {
                        bulkUpdateStockProducts.push({
                            id: stockAreaProduct.id,
                            quantity: mathOperation(
                                stockAreaProduct.quantity,
                                quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    }
                }

                break;
            }
            case "PROCESSED": {
                const quantity = Math.abs(movement.quantity);

                //Updating quantities in Central STOCK
                bulkUpdateProducts.push({
                    id: movement.productId,
                    averageCost: movement.costBeforeOperation,
                    totalQuantity: mathOperation(
                        movement.product.totalQuantity,
                        quantity,
                        "addition",
                        precission_after_coma
                    ),
                });

                //Finding Area product and removing it
                const found_stocks_products = await StockAreaProduct.findAll({
                    where: {
                        areaId: movement.areaId,
                    },
                });

                const stockAreaProduct = found_stocks_products.find(
                    item => item.productId === movement.productId
                );

                if (!stockAreaProduct) {
                    bulkAddStockProducts.push({
                        productId: movement.productId,
                        areaId: movement.areaId,
                        quantity,
                        type: movement.product.type,
                    });
                } else {
                    if (stockAreaProduct.quantity + quantity === 0) {
                        idsToRemove.push(stockAreaProduct.id);
                    } else {
                        bulkUpdateStockProducts.push({
                            id: stockAreaProduct.id,
                            quantity: mathOperation(
                                stockAreaProduct.quantity,
                                quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    }
                }

                //Finding all processed child operations
                const child_movements = await StockMovement.findAll({
                    where: {
                        parentId: movement.id,
                    },
                    include: [{ model: Product, as: "product" }],
                });

                for (const childmov of child_movements) {
                    const removed_entry = StockMovement.build({
                        quantity: childmov.quantity * -1,
                        productId: childmov.productId,
                        description,
                        areaId: childmov.areaId,

                        //Managed values
                        businessId: user.businessId,
                        movedById: user.id,
                        operation: "REMOVED",
                        accountable: false,
                    });
                    await removed_entry.save({ transaction: t });

                    //Quit original movement from accountability and associating deleted Movement
                    childmov.accountable = false;
                    childmov.removedOperationId = removed_entry.id;
                    await childmov.save({ transaction: t });

                    const childQuantity = Math.abs(childmov.quantity);

                    //Updating quantities in Central STOCK
                    bulkUpdateProducts.push({
                        id: childmov.productId,
                        averageCost: childmov.costBeforeOperation,
                        totalQuantity: mathOperation(
                            childmov.product.totalQuantity,
                            childQuantity,
                            "subtraction",
                            precission_after_coma
                        ),
                    });

                    //Finding Area product and updating quantities
                    const childStockAreaProduct = found_stocks_products.find(
                        item => item.productId === childmov.productId
                    );

                    if (!childStockAreaProduct) {
                        bulkAddStockProducts.push({
                            productId: childmov.productId,
                            areaId: childmov.areaId,
                            quantity: childQuantity,
                            type: childmov.product.type,
                        });
                    } else {
                        if (
                            childStockAreaProduct.quantity - childQuantity ===
                            0
                        ) {
                            idsToRemove.push(childStockAreaProduct.id);
                        } else {
                            bulkUpdateStockProducts.push({
                                id: childStockAreaProduct.id,
                                quantity: mathOperation(
                                    childStockAreaProduct.quantity,
                                    childQuantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            });
                        }
                    }
                }

                break;
            }
        }

        if (bulkUpdateStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkUpdateStockProducts, {
                updateOnDuplicate: ["quantity"],
                transaction: t,
            });
        }

        if (bulkAddStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
                transaction: t,
            });
        }

        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["totalQuantity", "averageCost"],
                transaction: t,
            });
        }

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: t,
            });
        }

        const product_to_emit = await Product.scope("to_return").findByPk(
            movement.product.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(200).json(removed_movement);

        //Propagate the cost
        if (movement.operation === "ENTRY") {
            productQueue.add(
                {
                    code: "PROPAGATE_COST",
                    params: {
                        productId: movement.productId,
                        businessId: product_to_emit?.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [movement.productId],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [movement.productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        //To emit depending action
        const forSaleType = [
            "MENU",
            "STOCK",
            "COMBO",
            "VARIATION",
            "SERVICE",
            "ADDON",
        ];
        if (forSaleType.includes(movement.product.type)) {
            if (
                movement.operation === "ENTRY" ||
                movement.operation === "MOVEMENT"
            ) {
                req.io.to(`business:${user.businessId}`).emit("products", {
                    action: "remove_quantity_stock",
                    data: {
                        product: product_to_emit,
                        quantity: Math.abs(movement.quantity),
                        areaId: movement.areaId,
                    },
                    from: user.id,
                });
            } else if (
                movement.operation === "OUT" ||
                movement.operation === "PROCESSED"
            ) {
                req.io.to(`business:${user.businessId}`).emit("products", {
                    action: "add_stock",
                    data: {
                        product: product_to_emit,
                        quantity: Math.abs(movement.quantity),
                        movedToId: movement.areaId,
                    },
                    from: user.id,
                });
            }
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

export const deleteStockMovementFromProduction = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { id } = req.params;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id, {
            include: [{ model: Product, as: "product" }],
        });

        if (!movement) {
            t.rollback();
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        if (movement.operation !== "ENTRY") {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre este recurso.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const product = await Product.findByPk(movement.productId, {
            include: [
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            attributes: [
                                "id",
                                "name",
                                "measure",
                                "averageCost",
                                "type",
                            ],
                            as: "supply",
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
                },
            ],
        });

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let bulkAddStockProducts = [];
        let bulkUpdateStockProducts = [];
        let idsToRemove = [];
        let bulkUpdateProducts = [];

        //Removing movement
        const removed_movement = StockMovement.build({
            quantity: movement.quantity * -1,
            productId: movement.productId,
            description: "Eliminado desde el proceso productivo.",
            areaId: movement.areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "REMOVED",
            accountable: false,
        });

        await removed_movement.save({ transaction: t });

        //Associating deleted Movement
        await StockMovement.update(
            {
                accountable: false,
                removedOperationId: removed_movement.id,
            },
            {
                where: {
                    id: movement.id,
                },
                transaction: t,
            }
        );

        //Finding Area product and updating quantities in Area Stock
        const stockAreaProduct = await StockAreaProduct.findOne({
            where: {
                productId: movement.productId,
                areaId: movement.areaId,
            },
        });

        if (!stockAreaProduct) {
            t.rollback();
            return res.status(400).json({
                message: `El producto ${movement.product.name} ya no se encuentra en el área original. La operación no pudo ser completada.`,
            });
        }

        if (stockAreaProduct.quantity - movement.quantity === 0) {
            idsToRemove.push(stockAreaProduct.id);
        } else {
            bulkUpdateStockProducts.push({
                id: stockAreaProduct.id,
                quantity: mathOperation(
                    stockAreaProduct.quantity,
                    movement.quantity,
                    "subtraction",
                    precission_after_coma
                ),
            });
        }

        //Updating quantities in Central STOCK
        bulkUpdateProducts.push({
            id: movement.productId,
            totalQuantity: mathOperation(
                movement.product.totalQuantity,
                movement.quantity,
                "subtraction",
                precission_after_coma
            ),
        });

        const found_stocks_products = await StockAreaProduct.findAll({
            where: {
                areaId: movement.areaId,
            },
        });

        //Finding all processed child operations
        const child_movements = await StockMovement.findAll({
            where: {
                parentId: movement.id,
            },
            include: [{ model: Product, as: "product" }],
        });

        for (const childmov of child_movements) {
            const removed_entry = StockMovement.build({
                quantity: childmov.quantity * -1,
                productId: childmov.productId,
                areaId: childmov.areaId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "REMOVED",
                accountable: false,
            });

            await removed_entry.save({ transaction: t });

            //Quit original movement from accountability and associating deleted Movement
            childmov.accountable = false;
            childmov.removedOperationId = removed_entry.id;
            await childmov.save({ transaction: t });

            const quantity = Math.abs(childmov.quantity);

            //Updating quantities in Central STOCK
            bulkUpdateProducts.push({
                id: childmov.productId,
                totalQuantity: mathOperation(
                    childmov.product.totalQuantity,
                    quantity,
                    "addition",
                    precission_after_coma
                ),
            });

            //Finding Area product and updating quantities
            const childStockAreaProduct = found_stocks_products.find(
                item => item.productId === childmov.productId
            );

            if (!childStockAreaProduct) {
                bulkAddStockProducts.push({
                    productId: childmov.productId,
                    areaId: childmov.areaId,
                    quantity,
                    type: childmov.product.type,
                });
            } else {
                if (childStockAreaProduct.quantity + quantity === 0) {
                    idsToRemove.push(childStockAreaProduct.id);
                } else {
                    bulkUpdateStockProducts.push({
                        id: childStockAreaProduct.id,
                        quantity: mathOperation(
                            childStockAreaProduct.quantity,
                            quantity,
                            "addition",
                            precission_after_coma
                        ),
                    });
                }
            }
        }

        //Checking if entry was due to a production
        if (!movement.productionOrderId) {
            t.rollback();
            return res.status(400).json({
                message: `Este movimiento no esta asociado a ninguna órden de producción.`,
            });
        }

        const productionOrder = await ProductionOrder.findByPk(
            movement.productionOrderId,
            {
                include: [ProductProductionOrder],
            }
        );

        if (!productionOrder) {
            t.rollback();
            return res.status(404).json({
                message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
            });
        }

        if (productionOrder.status !== "ACTIVE") {
            t.rollback();
            return res.status(404).json({
                message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
            });
        }

        //Updating orderproduction if origin is from SERIAL
        const found_product_production = productionOrder.products.find(
            item => item.productId === movement.productId
        );

        if (!found_product_production) {
            t.rollback();
            return res.status(404).json({
                message: `El producto con id ${movement.productId} no está dentro de la orden de producción.`,
            });
        }

        found_product_production.realProduced = mathOperation(
            found_product_production.realProduced,
            movement.quantity,
            "subtraction",
            precission_after_coma
        );
        found_product_production.save({ transaction: t });

        productionOrder.totalProduced = mathOperation(
            productionOrder.totalProduced,
            movement.quantity,
            "subtraction",
            precission_after_coma
        );
        productionOrder.save({ transaction: t });

        if (bulkUpdateStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkUpdateStockProducts, {
                updateOnDuplicate: ["quantity"],
                transaction: t,
            });
        }

        if (bulkAddStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
                transaction: t,
            });
        }

        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["totalQuantity"],
                transaction: t,
            });
        }

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: t,
            });
        }

        let to_return_supplies: any = [];
        for (const item of product.supplies) {
            const cost = mathOperation(
                item.supply.averageCost,
                item.quantity,
                "multiplication",
                precission_after_coma
            );

            to_return_supplies.push({
                id: item.id,
                quantity: item.quantity,
                supplyId: item.supplyId,
                name: item.supply.name,
                measure: item.supply.measure,
                images: item.supply.images,
                performance: product.performance,
                cost,
            });
        }

        const to_return_production_order = await ProductionOrder.scope(
            "to_return"
        ).findByPk(movement.productionOrderId, { transaction: t });

        await t.commit();

        res.status(200).json({
            supplies: to_return_supplies,
            production_order: to_return_production_order,
        });

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [movement.productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Deprecated
export const deleteStockMovementFromSerialArea = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { id } = req.params;
        const { manufacturerAreaId } = req.body;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id, {
            include: [{ model: Product, as: "product" }],
        });

        if (!movement) {
            t.rollback();
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        if (movement.operation !== "ENTRY") {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre este recurso.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const product = await Product.findByPk(movement.productId, {
            include: [
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            attributes: [
                                "id",
                                "name",
                                "measure",
                                "averageCost",
                                "type",
                            ],
                            as: "supply",
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
                },
            ],
        });

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const area = await Area.findByPk(manufacturerAreaId, {
            include: [
                {
                    model: ProductState,
                    as: "entryState",
                    attributes: ["id", "name"],
                },
            ],
        });

        if (!area) {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no fue encontrada.`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no es de tipo procesado.`,
            });
        }

        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        let bulkAddStockProducts = [];
        let bulkUpdateStockProducts = [];
        let idsToRemove = [];
        let bulkUpdateProducts = [];

        //Removing movement
        const removed_movement = StockMovement.build({
            quantity: movement.quantity * -1,
            productId: movement.productId,
            description: "Eliminado desde el proceso productivo.",
            areaId: area.endStockId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "REMOVED",
            accountable: false,
        });

        await removed_movement.save({ transaction: t });

        //Associating deleted Movement
        await StockMovement.update(
            {
                accountable: false,
                removedOperationId: removed_movement.id,
            },
            {
                where: {
                    id: movement.id,
                },
                transaction: t,
            }
        );

        //Finding Area product and updating quantities in Area Stock
        const stockAreaProduct = await StockAreaProduct.findOne({
            where: {
                productId: movement.productId,
                areaId: area.endStockId,
            },
        });

        if (!stockAreaProduct) {
            t.rollback();
            return res.status(400).json({
                message: `El producto ${movement.product.name} ya no se encuentra en el área original. La operación no pudo ser completada.`,
            });
        }

        if (stockAreaProduct.quantity - movement.quantity === 0) {
            idsToRemove.push(stockAreaProduct.id);
        } else {
            bulkUpdateStockProducts.push({
                id: stockAreaProduct.id,
                quantity: mathOperation(
                    stockAreaProduct.quantity,
                    movement.quantity,
                    "subtraction",
                    precission_after_coma
                ),
            });
        }

        //Updating quantities in Central STOCK
        bulkUpdateProducts.push({
            id: movement.productId,
            totalQuantity: mathOperation(
                movement.product.totalQuantity,
                movement.quantity,
                "subtraction",
                precission_after_coma
            ),
        });

        const found_stocks_products = await StockAreaProduct.findAll({
            where: {
                areaId: area.initialStockId,
            },
        });

        //Finding all processed child operations
        const child_movements = await StockMovement.findAll({
            where: {
                parentId: movement.id,
            },
            include: [{ model: Product, as: "product" }],
        });

        for (const childmov of child_movements) {
            const removed_entry = StockMovement.build({
                quantity: childmov.quantity * -1,
                productId: childmov.productId,
                areaId: childmov.areaId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "REMOVED",
                accountable: false,
            });

            await removed_entry.save({ transaction: t });

            //Quit original movement from accountability and associating deleted Movement
            childmov.accountable = false;
            childmov.removedOperationId = removed_entry.id;
            await childmov.save({ transaction: t });

            const quantity = Math.abs(childmov.quantity);

            //Updating quantities in Central STOCK
            bulkUpdateProducts.push({
                id: childmov.productId,
                totalQuantity: mathOperation(
                    childmov.product.totalQuantity,
                    quantity,
                    "addition",
                    precission_after_coma
                ),
            });

            //Finding Area product and updating quantities
            const childStockAreaProduct = found_stocks_products.find(
                item => item.productId === childmov.productId
            );

            if (!childStockAreaProduct) {
                bulkAddStockProducts.push({
                    productId: childmov.productId,
                    areaId: childmov.areaId,
                    quantity,
                    type: childmov.product.type,
                });
            } else {
                if (childStockAreaProduct.quantity + quantity === 0) {
                    idsToRemove.push(childStockAreaProduct.id);
                } else {
                    bulkUpdateStockProducts.push({
                        id: childStockAreaProduct.id,
                        quantity: mathOperation(
                            childStockAreaProduct.quantity,
                            quantity,
                            "addition",
                            precission_after_coma
                        ),
                    });
                }
            }
        }

        //Checking if entry was due to a production
        if (movement.productionOrderId) {
            const productionOrder = await ProductionOrder.findByPk(
                movement.productionOrderId,
                {
                    include: [ProductProductionOrder],
                }
            );

            if (!productionOrder) {
                t.rollback();
                return res.status(404).json({
                    message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
                });
            }

            if (productionOrder.status !== "ACTIVE") {
                t.rollback();
                return res.status(404).json({
                    message: `El movimiento no puede ser eliminado por no encontrarse disponible la orden de producción.`,
                });
            }

            //Updating orderproduction if origin is from SERIAL
            const found_product_production = productionOrder.products.find(
                item => item.productId === movement.productId
            );

            if (!found_product_production) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${movement.productId} no está dentro de la orden de producción.`,
                });
            }

            found_product_production.realProduced = mathOperation(
                found_product_production.realProduced,
                movement.quantity,
                "subtraction",
                precission_after_coma
            );
            found_product_production.save({ transaction: t });

            productionOrder.totalProduced = mathOperation(
                productionOrder.totalProduced,
                movement.quantity,
                "subtraction",
                precission_after_coma
            );
            productionOrder.save({ transaction: t });
        }

        if (bulkUpdateStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkUpdateStockProducts, {
                updateOnDuplicate: ["quantity"],
                transaction: t,
            });
        }

        if (bulkAddStockProducts.length !== 0) {
            await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
                transaction: t,
            });
        }

        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["totalQuantity"],
                transaction: t,
            });
        }

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: t,
            });
        }

        let to_return_supplies: any = [];
        for (const item of product.supplies) {
            const cost = mathOperation(
                item.supply.averageCost,
                item.quantity,
                "multiplication",
                precission_after_coma
            );

            to_return_supplies.push({
                id: item.id,
                quantity: item.quantity,
                supplyId: item.supplyId,
                name: item.supply.name,
                measure: item.supply.measure,
                images: item.supply.images,
                performance: product.performance,
                cost,
            });
        }

        const stock_movement = await StockMovement.scope(
            "to_production"
        ).findByPk(movement.id, { transaction: t });

        await t.commit();

        if (movement.productionOrderId) {
            const [found_production_order, products_orders] = await Promise.all(
                [
                    ProductionOrder.findByPk(movement.productionOrderId, {
                        attributes: [
                            "id",
                            "status",
                            "observations",
                            "createdAt",
                            "closedDate",
                            "businessId",
                            "totalGoalQuantity",
                            "totalProduced",
                        ],
                        include: [
                            {
                                model: User,
                                as: "createdBy",
                                attributes: [
                                    "id",
                                    "email",
                                    "username",
                                    "displayName",
                                ],
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
                        ],
                    }),
                    ProductProductionOrder.findAll({
                        where: {
                            productionOrderId: movement.productionOrderId,
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
                            },
                        ],
                    }),
                ]
            );

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
                    });
                } else if (product.type === "RAW") {
                    rawMateriales.push({
                        productId: product.productId,
                        name: product.name,
                        measure: product.measure,
                        quantity: product.quantity,
                        image: obtainFeatureImageFromProduct(product.product),
                    });
                }
            }

            res.status(200).json({
                supplies: to_return_supplies,
                stock_movement,
                production_order: {
                    productionOrder: found_production_order,
                    rawMateriales,
                    endProducts,
                },
            });
        } else {
            res.status(200).json({
                supplies: to_return_supplies,
                stock_movement,
            });
        }

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "MANUFACTURER_STOCK_MOVEMENT_DELETE",
                params: {
                    movement: stock_movement,
                    area,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [movement.productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const deleteStockMovementFromStateArea = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { id } = req.params;
        const { manufacturerAreaId } = req.body;

        //Validations
        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id, {
            include: [{ model: Product, as: "product" }],
        });

        if (!movement) {
            t.rollback();
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        if (movement.operation !== "ENTRY") {
            t.rollback();
            return res.status(400).json({
                message: `No puede realizar operaciones sobre este recurso.`,
            });
        }

        const area = await Area.findByPk(manufacturerAreaId, {
            include: [
                {
                    model: ProductState,
                    as: "entryState",
                    attributes: ["id", "name"],
                },
            ],
        });

        if (!area) {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no fue encontrada.`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no es de tipo procesado.`,
            });
        }

        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este movimiento.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const foud_parent_movement = await StockMovement.findByPk(
            movement.parentId
        );

        if (!foud_parent_movement) {
            t.rollback();
            return res.status(400).json({
                message: `El movimiento padre no fue encontrado.`,
            });
        }

        //Removing movement
        const removed_movement = StockMovement.build({
            quantity: movement.quantity * -1,
            productId: movement.productId,
            description: "Eliminado desde el proceso productivo.",
            areaId: movement.areaId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "REMOVED",
            accountable: false,
        });

        await removed_movement.save({ transaction: t });

        //Quit original movement from accountability and associating deleted Movement
        await StockMovement.update(
            {
                accountable: false,
                removedOperationId: removed_movement.id,
                parentId: null,
            },
            {
                where: {
                    id: movement.id,
                },
                transaction: t,
            }
        );

        //Updating productStock
        //Transfering to initialStockArea
        const found_stock_product_to = await StockAreaProduct.findOne({
            where: {
                productId: movement.productId,
                areaId: area.initialStockId,
            },
        });

        if (found_stock_product_to) {
            found_stock_product_to.quantity = mathOperation(
                found_stock_product_to.quantity,
                movement.quantity,
                "addition",
                precission_after_coma
            );
            await found_stock_product_to.save({ transaction: t });
        } else {
            const new_entity = StockAreaProduct.build({
                quantity: movement.quantity,
                productId: movement.productId,
                areaId: area.initialStockId,
                type: movement.product.type,
            });
            await new_entity.save({ transaction: t });
        }

        //Substracting from original area
        const found_stock_product_from = await StockAreaProduct.findOne({
            where: {
                productId: movement.productId,
                areaId: area.endStockId,
            },
        });

        if (!found_stock_product_from) {
            t.rollback();
            return res.status(404).json({
                message: `El producto ${movement.product.name} ya no existe en el área de origen. Por favor, consulte al jefe de turno.`,
            });
        }

        if (found_stock_product_from.quantity > movement.quantity) {
            found_stock_product_from.quantity = mathOperation(
                found_stock_product_from.quantity,
                movement.quantity,
                "subtraction",
                precission_after_coma
            );
            await found_stock_product_from.save({ transaction: t });
        } else if (found_stock_product_from.quantity === movement.quantity) {
            await found_stock_product_from.destroy({ transaction: t });
        }

        //Adding a new State to parent movement
        const new_state_product = MovementStateRecord.build({
            stockMovementId: foud_parent_movement.id,
            madeById: user.id,
            status: area.entryState.name,
        });

        await new_state_product.save({ transaction: t });

        foud_parent_movement.productStateId = area.entryStateId;
        await foud_parent_movement.save({ transaction: t });

        //Data to return
        const original_movement = await StockMovement.scope(
            "to_production"
        ).findByPk(foud_parent_movement.id);
        const derived_movement = await StockMovement.scope(
            "to_production"
        ).findByPk(movement.id, { transaction: t });
        const stock_product = await StockAreaProduct.scope(
            "to_production"
        ).findOne({
            where: {
                productId: derived_movement?.product.id,
                areaId: area.endStockId,
            },
            transaction: t,
        });

        await t.commit();

        res.status(200).json({
            original_movement,
            derived_movement,
            stock_product,
        });

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "MANUFACTURER_STOCK_MOVEMENT_DELETE",
                params: {
                    movement: derived_movement,
                    area,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );
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

export const getStockMovement = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.scope("to_return").findByPk(id);

        if (!movement) {
            return res.status(404).json({
                message: `La operación del almacén no fue encontrada`,
            });
        }

        //Permission Check
        if (movement?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a acceder a este recurso`,
            });
        }

        res.status(200).json(movement);
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

export const deleteBulkStockMovements = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { dateFrom, dateEnd, areaId } = req.body;

        if (!areaId) {
            return res.status(400).json({
                message: `areaId field is missing`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(400).json({
                message: `Area provided not found`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(400).json({
                message: `Area provided not STOCK type`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (!dateFrom && !dateEnd) {
            return res.status(400).json({
                message: `Debe definir al menos una fecha`,
            });
        }

        let where_clause: any = {};

        //Date filtering
        if (dateFrom && dateEnd) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateEnd, "YYYY-MM-DD HH:mm")
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
            } else if (dateEnd) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateEnd, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        const afectedRows = await StockMovement.count({
            where: {
                ...where_clause,
                businessId: user.businessId,
                areaId,
            },
        });

        await StockMovement.destroy({
            where: {
                ...where_clause,
                businessId: user.businessId,
                areaId,
            },
        });

        res.status(200).json({
            message: `${afectedRows} deleted rows`,
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

export const editDescriptionStockMovement = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { description } = req.body;
        const { id } = req.params;

        //Validations
        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id);

        if (!movement) {
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este movimiento.`,
            });
        }

        //Checking access
        if (
            movement.movedById !== user.id &&
            !user.roles?.find(item => item.code === "OWNER")
        ) {
            return res.status(400).json({
                message: `You can't make operations over this movement`,
            });
        }

        movement.description = description;
        await movement.save();
        res.status(200).json(movement);
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

export const changeStateStockMovement = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { id } = req.params;
        const { manufacturerAreaId, nextStateId } = req.body;

        //Validations
        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const movement = await StockMovement.findByPk(id, {
            include: [Product],
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        if (!movement) {
            t.rollback();
            return res.status(404).json({
                message: `Stock Movement not found`,
            });
        }

        if (movement.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este movimiento.`,
            });
        }

        if (!["PROCESSED", "ENTRY", "MOVEMENT"].includes(movement.operation)) {
            t.rollback();
            return res.status(400).json({
                message: `No es posible cambiar el estado a este tipo de operación`,
            });
        }

        const area = await Area.findByPk(manufacturerAreaId, {
            include: [
                {
                    model: ProductState,
                    as: "productStates",
                },
            ],
        });

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            t.rollback();
            return res.status(404).json({
                message: `Area is not Manufacturer Type`,
            });
        }

        const found_state = area.productStates?.find(
            item => item.id === nextStateId
        );

        if (!found_state) {
            t.rollback();
            return res.status(404).json({
                message: `El estado proporcionado no es uno válido para esta área.`,
            });
        }

        let derivedId;
        if (found_state.id === area.outStateId) {
            const activeShift = await Shift.findOne({
                where: {
                    isActive: true,
                    businessId: user.businessId,
                },
            });

            //Creating associate movement
            const derivedMovement = StockMovement.build({
                quantity: movement.quantity,
                productId: movement.productId,
                areaId: area.endStockId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "ENTRY",
                shiftId: activeShift?.id,
                productionOrderId: movement.productionOrderId,
                productStateId: found_state.id,
                parentId: movement.id,
            });

            await derivedMovement.save({ transaction: t });
            derivedId = derivedMovement.id;

            //Updating productStock
            //Transfering to endStockArea
            const found_stock_product_to = await StockAreaProduct.findOne({
                where: {
                    productId: movement.productId,
                    areaId: area.endStockId,
                },
            });

            if (found_stock_product_to) {
                found_stock_product_to.quantity = mathOperation(
                    found_stock_product_to.quantity,
                    movement.quantity,
                    "addition",
                    precission_after_coma
                );
                await found_stock_product_to.save({ transaction: t });
            } else {
                const new_entity = StockAreaProduct.build({
                    quantity: movement.quantity,
                    productId: movement.productId,
                    areaId: area.endStockId,
                    type: movement.product.type,
                });
                await new_entity.save({ transaction: t });
            }

            //Substracting from original area
            const found_stock_product_from = await StockAreaProduct.findOne({
                where: {
                    productId: movement.productId,
                    areaId: area.initialStockId,
                },
            });

            if (!found_stock_product_from) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${movement.product.name} ya no existe en el área de origen. Por favor, consulte al jefe de turno.`,
                });
            }

            if (found_stock_product_from.quantity > movement.quantity) {
                found_stock_product_from.quantity = mathOperation(
                    found_stock_product_from.quantity,
                    movement.quantity,
                    "subtraction",
                    precission_after_coma
                );
                await found_stock_product_from.save({ transaction: t });
            } else if (
                found_stock_product_from.quantity === movement.quantity
            ) {
                await found_stock_product_from.destroy({ transaction: t });
            }
        }

        //Registering operation
        const record = MovementStateRecord.build({
            status: found_state.name,
            madeById: user.id,
            stockMovementId: movement.id,
        });

        movement.productStateId = found_state.id;

        await movement.save({ transaction: t });
        await record.save({ transaction: t });

        let to_return: any = {};
        const original_movement = await StockMovement.scope(
            "to_production"
        ).findByPk(movement.id, { transaction: t });
        to_return.original_movement = original_movement;

        if (derivedId) {
            const derived_movement = await StockMovement.scope(
                "to_production"
            ).findByPk(derivedId, { transaction: t });

            const stock_product = await StockAreaProduct.scope(
                "to_production"
            ).findOne({
                where: {
                    productId: derived_movement?.product.id,
                    areaId: area.endStockId,
                },
                transaction: t,
            });
            to_return.derived_movement = derived_movement;
            to_return.stock_product = stock_product;
        }

        await t.commit();
        res.status(200).json(to_return);

        if (found_state.id === area.outStateId) {
            //Generating task to send via Sockets
            socketQueue.add(
                {
                    code: "MANUFACTURER_STOCK_MOVEMENT_ADD",
                    params: {
                        stock_movement: to_return.derived_movement,
                        stock_product: to_return.stock_product,
                        area,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );
        }
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

export const produceAnElaboration = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const {
            quantity,
            productId,
            stockAreaId,
            productionOrderId,
            createdAt,
            createdById,
        } = req.body;

        const area = await getAreaCache(stockAreaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "STOCK") {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no es de tipo Almacén`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const result = await newProductElaboration(
            {
                quantity,
                productId,
                stockAreaFromId: stockAreaId,
                stockAreaToId: stockAreaId,
                precission_after_coma,
                businessId: user.businessId,
                userId: createdById || user.id,
                productionOrderId,
                createdAt,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "produceAnElaboration/newProductElaboration",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        const stock_product_to_return = await StockAreaProduct.scope(
            "to_production"
        ).findOne({
            where: {
                productId,
                areaId: stockAreaId,
            },
            transaction: t,
        });

        //Analyzing if order production is provided
        let to_return_production_order;
        if (productionOrderId) {
            const productionOrder = await ProductionOrder.findByPk(
                productionOrderId,
                {
                    include: [ProductProductionOrder, Area],
                }
            );

            if (!productionOrder) {
                t.rollback();
                return res.status(400).json({
                    message: `La orden de producción proporcionada no fue encontrada.`,
                });
            }

            if (productionOrder.status === "CLOSED") {
                t.rollback();
                return res.status(400).json({
                    message: `La orden de producción proporcionada ya fue cerrada.`,
                });
            }

            if (productionOrder.businessId !== user.businessId) {
                t.rollback();
                return res.status(403).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            const found_product_production = productionOrder.products.find(
                item => item.productId === productId
            );

            if (
                !found_product_production &&
                productionOrder.mode === "STRICT"
            ) {
                t.rollback();
                return res.status(400).json({
                    message: `No puede producir porque no se encuentra en la orden de producción.`,
                });
            }

            if (found_product_production) {
                if (
                    found_product_production.realProduced + quantity >
                        found_product_production.goalQuantity &&
                    productionOrder.area.limitProductionToOrderProduction
                ) {
                    const allowedProduction = mathOperation(
                        found_product_production.goalQuantity,
                        found_product_production.realProduced,
                        "subtraction",
                        precission_after_coma
                    );

                    t.rollback();
                    return res.status(400).json({
                        message: `No puede producir ${quantity} porque excede lo planificado. Solo es posible elaborar ${allowedProduction}. Por favor, ajuste la producción.`,
                    });
                }

                //Verifying product belong to end products

                if (found_product_production.type === "END") {
                    found_product_production.realProduced = mathOperation(
                        found_product_production.realProduced,
                        quantity,
                        "addition",
                        precission_after_coma
                    );
                    await found_product_production.save({ transaction: t });

                    productionOrder.totalProduced = mathOperation(
                        productionOrder.totalProduced,
                        quantity,
                        "addition",
                        precission_after_coma
                    );
                }
            }

            if (productionOrder.status === "CREATED") {
                productionOrder.status = "ACTIVE";
            }

            await productionOrder.save({ transaction: t });

            to_return_production_order = await ProductionOrder.scope(
                "to_return"
            ).findByPk(productionOrderId, { transaction: t });
        }

        let entry_movement;
        if (result.data.entry_movement_id) {
            entry_movement = await StockMovement.scope("to_return").findByPk(
                result.data.entry_movement_id,
                { transaction: t }
            );
        }

        await t.commit();
        res.status(200).json({
            entry_stock_movement: entry_movement,
            stock_product: stock_product_to_return,
            production_order: to_return_production_order,
            supplies: result.data.to_return_supplies,
        });

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const newElaboration = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { quantity, productId, stockAreaId } = req.body;

        const area = await getAreaCache(stockAreaId);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "STOCK") {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no es de tipo Almacén`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        const result = await newProductElaboration(
            {
                quantity,
                productId,
                stockAreaFromId: stockAreaId,
                stockAreaToId: stockAreaId,
                precission_after_coma,
                businessId: user.businessId,
                userId: user.id,
            },
            t
        );

        if (!internalCheckerResponse(result)) {
            t.rollback();
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "newElaboration/newProductElaboration",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        const to_return_movements = await StockMovement.scope(
            "to_production"
        ).findAll({
            where: {
                id: result.data.movements?.map((item: any) => item.id),
            },
        });
        const stock_product_to_return = await StockAreaProduct.scope(
            "to_production"
        ).findOne({
            where: {
                productId,
                areaId: stockAreaId,
            },
            transaction: t,
        });

        await t.commit();
        res.status(200).json({
            supplies: result.data.to_return_supplies,
            stock_movement: to_return_movements,
            stock_product: stock_product_to_return,
        });

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [productId],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [productId],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

//Deprecated
export const newProductionElaboration = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;
        const { quantity, productId, manufacturerAreaId, productionOrderId } =
            req.body;

        const area = await Area.findByPk(manufacturerAreaId, {
            include: [
                {
                    model: ProductState,
                    as: "outState",
                    attributes: ["id", "name"],
                },
            ],
        });

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            t.rollback();
            return res.status(400).json({
                message: `El área proporcionada no es de tipo Procesado`,
            });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        if (area.limitProductionToOrderProduction) {
            if (!productionOrderId) {
                t.rollback();
                return res.status(400).json({
                    message: `La orden de producción no fue proporcionada.`,
                });
            }

            const productionOrder = await ProductionOrder.findByPk(
                productionOrderId,
                {
                    include: [ProductProductionOrder],
                }
            );

            if (!productionOrder) {
                t.rollback();
                return res.status(400).json({
                    message: `La orden de producción proporcionada no fue encontrada.`,
                });
            }

            if (productionOrder.businessId !== user.businessId) {
                t.rollback();
                return res.status(403).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            //Updating orderproduction if origin is from SERIAL
            const found_product_production = productionOrder.products.find(
                item => item.productId === productId
            );

            if (!found_product_production) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${productId} no está dentro de la orden de producción.`,
                });
            }

            if (
                found_product_production.realProduced + quantity >
                found_product_production.goalQuantity
            ) {
                const allowedProduction = mathOperation(
                    found_product_production.goalQuantity,
                    found_product_production.realProduced,
                    "subtraction",
                    0
                );

                t.rollback();
                return res.status(400).json({
                    message: `No puede producir ${quantity} porque excede lo planificado. Solo es posible elaborar ${allowedProduction}. Por favor, ajuste la producción.`,
                });
            }

            found_product_production.realProduced = mathOperation(
                found_product_production.realProduced,
                quantity,
                "addition",
                precission_after_coma
            );
            found_product_production.save({ transaction: t });

            productionOrder.totalProduced = mathOperation(
                productionOrder.totalProduced,
                quantity,
                "addition",
                precission_after_coma
            );

            if (productionOrder.status === "CREATED") {
                productionOrder.status = "ACTIVE";
            }

            productionOrder.save({ transaction: t });
        }

        //Find the StockArea product I am outing
        const product = await Product.findByPk(productId, {
            include: [
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            as: "supply",
                        },
                    ],
                },
                {
                    model: Recipe,
                    include: [
                        {
                            model: ProductRawRecipe,
                            include: [Product],
                        },
                    ],
                },
            ],
        });

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Creating products
        let bulkMovements = [];

        const activeShift = await Shift.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Creating the new processed operation
        let body: any = {
            quantity: Math.abs(quantity),
            productId,
            areaId: area.endStockId,

            //Managed values
            businessId: user.businessId,
            movedById: user.id,
            operation: "ENTRY",
            shiftId: activeShift?.id,
            productionOrderId,
            productStateId: area.outStateId,
            economicCycleId: activeEconomicCycle?.id,
        };

        if (area.outState) {
            body = {
                ...body,
                records: [
                    {
                        status: area.outState.name,
                        madeById: user.id,
                    },
                ],
            };
        }

        const baseMovement = StockMovement.build(body, {
            include: [MovementStateRecord],
        });

        await baseMovement.save({ transaction: t });

        //New Elaboration Entry
        let productToAdd: Array<ProductItemMove> = [
            {
                productId,
                quantity: Math.abs(quantity),
            },
        ];
        const result_to = await addProductsToStockArea(
            {
                products: productToAdd,
                precission_after_coma,
                areaId: area.endStockId,
                businessId: user.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_to)) {
            t.rollback();
            Logger.warn(
                result_to.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newProductionElaboration/addProductsToStockArea",
                }
            );
            return res.status(result_to.status).json({
                message: result_to.message,
            });
        }

        //Substraction
        let productsToSubstract: Array<ProductItemMove> = [];
        let to_return_supplies: any = [];

        if (product.recipe) {
            for (const rawProduct of product.recipe.productsRawRecipe) {
                //Creating operation movement
                bulkMovements.push({
                    quantity:
                        mathOperation(
                            rawProduct.consumptionIndex,
                            quantity,
                            "multiplication",
                            precission_after_coma
                        ) * -1,
                    productId: rawProduct.productId,
                    areaId: area.initialStockId,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    operation: "PROCESSED",
                    shiftId: activeShift?.id,
                    productionOrderId,
                    parentId: baseMovement.id,
                    costBeforeOperation: rawProduct.product.averageCost,
                    economicCycleId: activeEconomicCycle?.id,
                });

                //To return
                const cost = mathOperation(
                    rawProduct.product.averageCost,
                    rawProduct.consumptionIndex,
                    "multiplication",
                    precission_after_coma
                );

                to_return_supplies.push({
                    id: rawProduct.productId,
                    quantity: rawProduct.consumptionIndex,
                    supplyId: rawProduct.productId,
                    name: rawProduct.product.name,
                    measure: rawProduct.product.measure,
                    images: rawProduct.product.images,
                    cost,
                });

                //Populating array
                productsToSubstract.push({
                    productId: rawProduct.productId,
                    quantity: mathOperation(
                        rawProduct.consumptionIndex,
                        quantity,
                        "multiplication",
                        precission_after_coma
                    ),
                });
            }
        } else {
            for (const supply of product.supplies) {
                //Creating operation movement
                bulkMovements.push({
                    quantity:
                        mathOperation(
                            supply.quantity,
                            quantity,
                            "multiplication",
                            precission_after_coma
                        ) * -1,
                    productId: supply.supplyId,
                    areaId: area.initialStockId,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    operation: "PROCESSED",
                    parentId: baseMovement.id,
                    shiftId: activeShift?.id,
                    productionOrderId,
                    costBeforeOperation: supply.supply.averageCost,
                    economicCycleId: activeEconomicCycle?.id,
                });

                //To return
                const cost = mathOperation(
                    supply.supply.averageCost,
                    supply.quantity,
                    "multiplication",
                    precission_after_coma
                );

                to_return_supplies.push({
                    id: supply.id,
                    quantity: supply.quantity,
                    supplyId: supply.supplyId,
                    name: supply.supply.name,
                    measure: supply.supply.measure,
                    images: supply.supply.images,
                    performance: product.performance,
                    cost,
                });

                //Populating array
                productsToSubstract.push({
                    productId: supply.supplyId,
                    quantity: mathOperation(
                        supply.quantity,
                        quantity,
                        "multiplication",
                        precission_after_coma
                    ),
                });
            }
        }

        const result_from = await substractProductsFromStockArea(
            {
                products: productsToSubstract,
                precission_after_coma,
                areaId: area.initialStockId,
                businessId: user.businessId,
                strictMode: "production",
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newProductionElaboration/substractProductsFromStockArea",
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        await StockMovement.bulkCreate(bulkMovements, {
            transaction: t,
            returning: true,
        });

        const stock_movement = await StockMovement.scope(
            "to_production"
        ).findByPk(baseMovement.id, { transaction: t });
        const stock_product_to_return = await StockAreaProduct.scope(
            "to_production"
        ).findOne({
            where: {
                productId,
                areaId: area.endStockId,
            },
            transaction: t,
        });

        await t.commit();

        if (area.limitProductionToOrderProduction) {
            const [found_production_order, products_orders] = await Promise.all(
                [
                    ProductionOrder.findByPk(productionOrderId, {
                        attributes: [
                            "id",
                            "status",
                            "observations",
                            "createdAt",
                            "closedDate",
                            "businessId",
                            "totalGoalQuantity",
                            "totalProduced",
                        ],
                        include: [
                            {
                                model: User,
                                as: "createdBy",
                                attributes: [
                                    "id",
                                    "email",
                                    "username",
                                    "displayName",
                                ],
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
                        ],
                    }),
                    ProductProductionOrder.findAll({
                        where: {
                            productionOrderId,
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
                            },
                        ],
                    }),
                ]
            );

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
                        image: product.product.images
                            ? product.product.images?.[0]?.thumbnail
                            : null,
                    });
                } else if (product.type === "RAW") {
                    rawMateriales.push({
                        productId: product.productId,
                        name: product.name,
                        measure: product.measure,
                        quantity: product.quantity,
                        image: product.product.images
                            ? product.product.images?.[0]?.thumbnail
                            : null,
                    });
                }
            }

            res.status(200).json({
                supplies: to_return_supplies,
                stock_movement,
                stock_product: stock_product_to_return,
                production_order: {
                    productionOrder: found_production_order,
                    rawMateriales,
                    endProducts,
                },
            });
        } else {
            res.status(200).json({
                supplies: to_return_supplies,
                stock_movement,
                stock_product: stock_product_to_return,
            });
        }

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "MANUFACTURER_STOCK_MOVEMENT_ADD",
                params: {
                    stock_movement,
                    stock_product: stock_product_to_return,
                    area,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        if (isWooActive) {
            wooQueue.add(
                {
                    code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                    params: {
                        productsIds: [productId],
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [
                        productId,
                        ...product.supplies.map(item => item.supplyId),
                    ],
                    businessId: user.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
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

export const getAllOperationsFromSerialArea = async (
    req: any,
    res: Response
) => {
    try {
        const user: User = req.user;
        const { productionOrderId, areaId } = req.params;

        if (isNaN(productionOrderId)) {
            return res.status(404).json({
                message: `El parámetro productionOrderId no fue introducido`,
            });
        }

        if (isNaN(areaId)) {
            return res.status(404).json({
                message: `El parámetro areaId no fue introducido`,
            });
        }

        const manufacturerArea = await getAreaCache(areaId);

        if (!manufacturerArea) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (manufacturerArea.type !== "MANUFACTURER") {
            return res.status(400).json({
                message: `El área no es de tipo Procesado`,
            });
        }

        const found_stock_movements = await StockMovement.scope(
            "to_production"
        ).findAll({
            where: {
                businessId: user.businessId,
                productionOrderId,
                areaId: manufacturerArea.endStockId,
                accountable: true,
                operation: {
                    [Op.or]: ["ENTRY", "OUT", "WASTE"],
                },
            },
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(found_stock_movements);
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

export const getAllShiftMovementsInArea = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { areaId } = req.params;

        const activeShift = await Shift.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        if (!activeShift) {
            return res.status(404).json({
                message: `No hay turnos activos. Por favor consulte a su jefe de turno.`,
            });
        }

        if (isNaN(areaId)) {
            return res.status(400).json({
                message: `El parámetro areaId no fue introducido`,
            });
        }

        const stockArea = await Area.findByPk(areaId);

        if (!stockArea) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (stockArea.type !== "STOCK") {
            return res.status(400).json({
                message: `El área no es de tipo Almacén`,
            });
        }

        const found_stock_movements = await StockMovement.scope(
            "to_production"
        ).findAll({
            where: {
                businessId: user.businessId,
                shiftId: activeShift.id,
                areaId: stockArea.id,
                operation: {
                    [Op.or]: ["ENTRY", "OUT", "WASTE"],
                },
            },
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(found_stock_movements);
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

export const getAllOperationsStateFromArea = async (
    req: any,
    res: Response
) => {
    try {
        const user: User = req.user;
        const { areaId, productStateId } = req.params;

        if (isNaN(areaId)) {
            return res.status(404).json({
                message: `El parámetro areaId no fue introducido`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            return res.status(400).json({
                message: `El área proporcionada no es de tipo Procesado`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const productState = await ProductState.findByPk(productStateId);

        if (!productState) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (productState.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const found_stock_movements = await StockMovement.scope(
            "to_production"
        ).findAll({
            where: {
                businessId: user.businessId,
                areaId: area.initialStockId,
                productStateId: productStateId,
                accountable: true,
                operation: {
                    [Op.or]: ["ENTRY", "OUT", "WASTE"],
                },
            },
            order: [["createdAt", "ASC"]],
        });

        res.status(200).json(found_stock_movements);
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

export const getAllOperationsDifferentStateFromArea = async (
    req: any,
    res: Response
) => {
    try {
        const user: User = req.user;
        const { areaId, productStates } = req.params;

        if (isNaN(areaId)) {
            return res.status(404).json({
                message: `El parámetro areaId no fue introducido`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            return res.status(400).json({
                message: `El área proporcionada no es de tipo Procesado`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const found_stock_movements = await StockMovement.scope(
            "to_production"
        ).findAll({
            where: {
                businessId: user.businessId,
                areaId: area.initialStockId,
                accountable: true,
                productStateId: {
                    [Op.not]: productStates.split(","),
                },
                operation: {
                    [Op.or]: ["ENTRY", "OUT", "WASTE"],
                },
            },
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json(found_stock_movements);
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
