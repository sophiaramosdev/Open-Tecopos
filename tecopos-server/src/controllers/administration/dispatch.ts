import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";
import db from "../../database/connection";

import User from "../../database/models/user";
import { pag_params } from "../../database/pag_params";
import Image from "../../database/models/image";
import Area from "../../database/models/area";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Dispatch from "../../database/models/dispatch";
import Price from "../../database/models/price";
import DispatchProduct from "../../database/models/dispatchProduct";
import Product from "../../database/models/product";
import ProductPrice from "../../database/models/productPrice";
import AvailableCurrency from "../../database/models/availableCurrency";
import {
    exchangeCurrency,
    getProductPrice,
    internalCheckerResponse,
    mathOperation,
    obtainingProductPriceSystemPriceDefined,
} from "../../helpers/utils";
import Currency from "../../database/models/currency";
import SharedArea from "../../database/models/sharedArea";
import StockMovement from "../../database/models/stockMovement";
import PriceSystem from "../../database/models/priceSystem";
import ProductionOrder from "../../database/models/productionOrder";
import ProductProductionOrder from "../../database/models/productProductionOrder";
import OrderReceipt from "../../database/models/orderReceipt";
import SelledProduct from "../../database/models/selledProduct";
import EconomicCycle from "../../database/models/economicCycle";
import Business from "../../database/models/business";
import { config_transactions } from "../../database/seq-transactions";
import { socketQueue } from "../../bull-queue/socket";
import Logger from "../../lib/logger";
import { productQueue } from "../../bull-queue/product";
import {
    addProductsToStockArea,
    substractProductsFromStockArea,
    substractProductsFromStockAreaV2,
} from "../helpers/products";
import { SimpleProductItem } from "../../interfaces/models";
import Variation from "../../database/models/variation";
import {
    getActiveEconomicCycleCache,
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import BuyedReceipt from "../../database/models/buyedReceipt";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import BatchProductStockArea from "../../database/models/batchProductStockArea";
import BatchDispatchProduct from "../../database/models/batchDispatchProduct";
import Batch from "../../database/models/batch";

//Dispatched
interface ProductDispatchItem {
    stockAreaProductId: number;
    quantity: number;
    variationId: number;
    productName: string;
}

//Deprecated
// Used instead newDispatchV2 from 16-06-2024
export const newDispatch = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { mode, products, stockAreaFromId, stockAreaToId, observations } =
            req.body;
        const user: User = req.user;

        //Obtaining all the products
        const stockProducts = await StockAreaProduct.findAll({
            where: {
                id: products.map(
                    (item: ProductDispatchItem) => item.stockAreaProductId
                ),
            },
            include: [
                {
                    model: Product,
                    where: {
                        businessId: user.businessId,
                    },
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
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
                            model: Variation,
                            as: "variations",
                            include: [
                                {
                                    model: Price,
                                    as: "price",
                                },
                            ],
                        },
                    ],
                    paranoid: false,
                },
            ],
            transaction: t,
        });

        //Checking the products received
        for (const product of products) {
            const found = stockProducts.find(
                item => item.id === product.stockAreaProductId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} con id de area ${product.stockAreaProductId} no fue encontrado en el área definida.`,
                });
            }
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const mainCodeCurrency = availableCurrencies.find(item => item.isMain);
        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        if (stockAreaFromId === stockAreaToId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede hacer despachos hacia la misma área.`,
            });
        }

        //--> INIT BLOCK Resources
        await StockAreaProduct.findAll({
            where: {
                id: products.map(
                    (item: ProductDispatchItem) => item.stockAreaProductId
                ),
                areaId: stockAreaFromId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        //Obtaining active EconomicCycle
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
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        let bulkMovements = [];

        //From
        const productToSubstract = products.map((item: ProductDispatchItem) => {
            const foundStockProduct = stockProducts.find(
                element => element.id === item.stockAreaProductId
            );

            return {
                productId: Number(foundStockProduct?.productId),
                variationId: item.variationId
                    ? Number(item.variationId)
                    : undefined,
                quantity: item.quantity,
            };
        });

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
                    origin: "newDispatch/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //Creating each product
        let dispatchedProducts = [];
        for (const product of products as ProductDispatchItem[]) {
            const found = stockProducts.find(
                item => item.id === product.stockAreaProductId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.stockAreaProductId} no fue encontrado en el almacén.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: found.product.id,
                variationId: product.variationId,
                description: `Traslado de despacho`,
                movedToId: stockAreaToId,
                areaId: stockAreaFromId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
                economicCycleId: activeEconomicCycle?.id,
            });

            const productPrice = obtainingProductPriceSystemPriceDefined(
                found.product,
                product.variationId,
                activeEconomicCycle?.priceSystemId
            );
            let dispatchProduct: any = {
                name: found.product.name,
                quantity: product.quantity,
                variationId: product.variationId,
                measure: found.product.measure,
                universalCode: found.product.universalCode,
                productId: found.productId,
                cost: {
                    amount: found.product.averageCost || 0,
                    codeCurrency: costCurrency,
                },
            };

            if (productPrice) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: productPrice.price || 0,
                        codeCurrency:
                            productPrice.codeCurrency ||
                            mainCodeCurrency.currency.code,
                    },
                };
            }
            dispatchedProducts.push(dispatchProduct);
        }

        //Creating dispatch
        const dispatch: Dispatch = Dispatch.build(
            {
                businessId: user.businessId,
                observations,
                status: "CREATED",
                mode,
                createdById: user.id,
                stockAreaFromId: stockAreaFromId,
                stockAreaToId,
                products: dispatchedProducts,
                economicCycleId: activeEconomicCycle?.id,
            },
            {
                include: [
                    {
                        model: DispatchProduct,
                        as: "products",
                        include: [
                            { model: Price, as: "price" },
                            { model: Price, as: "cost" },
                        ],
                    },
                ],
            }
        );
        //res.send(dispatch)
        await dispatch.save({ transaction: t });

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );
        await t.commit();

        res.status(201).json(to_return);

        socketQueue.add(
            {
                code: "NEW_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
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
                    productsIds: to_return?.products.map(
                        item => item.productId
                    ),
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

interface ProductDispatchItemV2 {
    productId: number;
    quantity: number;
    variationId: number;
    productName: string;
    observations: string;
    noPackages: number;
    batches: Array<{
        batchId: number;
        quantity: number;
    }>;
}

/*
    Principles:
        - Create a new dispatch with the products received
        - Substract the products from the stock area
        - Create the movements associated with the dispatch
        - Create the dispatch products associated with the dispatch
        - Return the dispatch created

    Rules
        - A dispatch between business taken in destiny area salesPrices when product is ForSale

*/
export const newDispatchV2 = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const {
            products,
            stockAreaFromId,
            stockAreaToId,
            observations,
        }: {
            products: ProductDispatchItemV2[];
            stockAreaFromId: number;
            stockAreaToId: number;
            observations: string;
        } = req.body;
        const user: User = req.user;

        const ids = products.map(item => item.productId);

        //Obtaining all the products involved
        const fullProducts = await Product.findAll({
            where: {
                id: ids,
            },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
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
                    model: Variation,
                    as: "variations",
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: StockAreaProduct,
                    include: [StockAreaVariation, BatchProductStockArea],
                },
            ],
            paranoid: false,
            transaction: t,
        });

        let listStockProductIds = [];
        let fullBatches: Array<Batch> = [];
        let idsBatches: Array<number> = [];
        //Checking the products received
        for (const product of products) {
            const foundProduct = fullProducts.find(
                item => item.id === product.productId
            );

            if (!foundProduct) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} no fue encontrado en el negocio.`,
                });
            }

            const foundStockProduct = foundProduct?.stockAreaProducts?.find(
                item => item.productId === product.productId
            );

            if (!foundStockProduct) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} no fue encontrado en el área de origen definida.`,
                });
            }

            listStockProductIds.push(foundStockProduct.id);

            if (foundProduct.type === "VARIATION") {
                if (!product.variationId) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} es de tipo Variable y no fue recibida ninguna variación.`,
                    });
                }

                const foundVariationName = foundProduct.variations.find(
                    item => item.id === product.variationId
                );
                if (!foundVariationName) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} no posee la variación definida.`,
                    });
                }

                const foundVariation = foundStockProduct.variations.find(
                    item => item.variationId === product.variationId
                );

                if (!foundVariation) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} con la variación proporcionada no fue encontrado en el área de origen definida.`,
                    });
                }
            }

            const ids = product.batches?.map(item => item.batchId);
            if (ids && ids.length !== 0) {
                idsBatches = idsBatches.concat(ids);
            }
        }

        if (idsBatches.length !== 0) {
            fullBatches = await Batch.findAll({
                where: {
                    id: idsBatches,
                },
                transaction: t,
            });
        }

        //Configurations
        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const mainCodeCurrency = availableCurrencies.find(item => item.isMain);
        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        //Validations
        if (stockAreaFromId === stockAreaToId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede hacer despachos hacia la misma área.`,
            });
        }

        let bulkMovements = [];

        //From
        const productToSubstract = products.map(item => {
            return {
                productId: item.productId,
                variationId: item.variationId
                    ? Number(item.variationId)
                    : undefined,
                quantity: item.quantity,
                batches: item.batches,
            };
        });

        const result_from = await substractProductsFromStockAreaV2(
            {
                products: productToSubstract,
                stockAreaId: stockAreaFromId,
                businessId: user.businessId,
                mode: "strict",
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newDispatchV2/substractProductsFromStockAreaV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //Creating each product
        let dispatchedProducts = [];
        for (const product of products as ProductDispatchItemV2[]) {
            const productDetails = fullProducts.find(
                item => item.id === product.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado en el almacén.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: productDetails.id,
                variationId: product.variationId,
                description: `Traslado de despacho`,
                movedToId: stockAreaToId,
                areaId: stockAreaFromId,
                category: "DISPATCH",

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
                economicCycleId: activeEconomicCycle?.id,
            });

            const productPrice = getProductPrice(
                productDetails,
                product.variationId,
                availableCurrencies,
                [activeEconomicCycle?.priceSystemId.toString()]
            );

            let dispatchProduct: any = {
                name: productDetails.name,
                quantity: product.quantity,
                noPackages: product.noPackages,
                variationId: product.variationId,
                measure: productDetails.measure,
                universalCode: productDetails.universalCode,
                productId: productDetails.id,
                cost: {
                    amount: productDetails.averageCost || 0,
                    codeCurrency: costCurrency,
                },
            };

            if (productPrice) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: productPrice.amount || 0,
                        codeCurrency:
                            productPrice.codeCurrency ||
                            mainCodeCurrency.currency.code,
                    },
                };
            }

            if (product.batches) {
                dispatchProduct = {
                    ...dispatchProduct,
                    batches: product.batches.map(item => {
                        const foundBatch = fullBatches.find(batch => batch.id === item.batchId)

                        return {
                            ...item,
                            uniqueCode: foundBatch?.uniqueCode
                        }
                    }),
                };
            }

            dispatchedProducts.push(dispatchProduct);
        }

        //Creating dispatch
        const dispatch: Dispatch = Dispatch.build(
            {
                businessId: user.businessId,
                observations,
                status: "CREATED",
                mode: "MOVEMENT",
                createdById: user.id,
                stockAreaFromId: stockAreaFromId,
                stockAreaToId,
                products: dispatchedProducts,
                economicCycleId: activeEconomicCycle?.id,
            },
            {
                include: [
                    {
                        model: DispatchProduct,
                        as: "products",
                        include: [
                            { model: Price, as: "price" },
                            { model: Price, as: "cost" },
                            BatchDispatchProduct,
                        ],
                    },
                ],
            }
        );

        await dispatch.save({ transaction: t });

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );
        await t.commit();

        res.status(201).json(to_return);

        socketQueue.add(
            {
                code: "NEW_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
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
                    productsIds: to_return?.products.map(
                        item => item.productId
                    ),
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

//Adding products to dispatch
//Deprecated from 18/06/2024
//Use instead V2
export const addProductsToDispatch = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { dispatchId } = req.params;
        const { products, stockAreaFromId } = req.body;
        const user: User = req.user;

        if (!dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `El parámetro dispatchId no fue encontrado.`,
            });
        }

        const dispatch = await Dispatch.findOne({
            where: {
                id: dispatchId,
                businessId: user.businessId,
            },
            include: [DispatchProduct],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(400).json({
                message: `Despacho no encontrado.`,
            });
        }

        if (dispatch.status !== "CREATED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho no puede ser transformado a factura.`,
            });
        }

        if (dispatch.order) {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido asociado a una orden.`,
            });
        }

        //Obtaining all the products
        const stockProducts = await StockAreaProduct.findAll({
            where: {
                id: products.map(
                    (item: ProductDispatchItem) => item.stockAreaProductId
                ),
            },
            include: [
                {
                    model: Product,
                    where: {
                        businessId: user.businessId,
                    },
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
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
                    paranoid: false,
                },
            ],
            transaction: t,
        });

        //Checking the products received
        for (const product of products) {
            const found = stockProducts.find(
                item => item.id === product.stockAreaProductId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} con id de area ${product.stockAreaProductId} no fue encontrado en el área definida.`,
                });
            }
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const mainCodeCurrency = availableCurrencies.find(item => item.isMain);
        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        //--> INIT BLOCK Resources
        await StockAreaProduct.findAll({
            where: {
                id: products.map(
                    (item: ProductDispatchItem) => item.stockAreaProductId
                ),
                areaId: stockAreaFromId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        let bulkMovements = [];

        //From
        const productToSubstract = products.map((item: ProductDispatchItem) => {
            const foundStockProduct = stockProducts.find(
                element => element.id === item.stockAreaProductId
            );

            return {
                productId: Number(foundStockProduct?.productId),
                variationId: item.variationId
                    ? Number(item.variationId)
                    : undefined,
                quantity: item.quantity,
            };
        });

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
                    origin: "newDispatch/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //Creating each product
        let bulkAddDispatchedProducts = [];
        let updateDispatchedProductsQuantities = [];
        for (const product of products as ProductDispatchItem[]) {
            const found = stockProducts.find(
                item => item.id === product.stockAreaProductId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.stockAreaProductId} no fue encontrado en el almacén.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: found.product.id,
                variationId: product.variationId,
                description: `Traslado de despacho`,
                movedToId: dispatch.stockAreaToId,
                areaId: stockAreaFromId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
                economicCycleId: activeEconomicCycle?.id,
            });

            const foundExistingDispatchProduct = dispatch.products.find(
                item => item.productId === found.productId
            );

            if (!foundExistingDispatchProduct) {
                const itemPrice = getProductPrice(
                    found.product,
                    product.variationId,
                    availableCurrencies,
                    [activeEconomicCycle?.priceSystemId.toString()]
                );

                let dispatchProduct: any = {
                    name: found.product.name,
                    quantity: product.quantity,
                    variationId: product.variationId,
                    measure: found.product.measure,
                    universalCode: found.product.universalCode,
                    productId: found.productId,
                    cost: {
                        amount: found.product.averageCost || 0,
                        codeCurrency: costCurrency,
                    },
                    dispatchId: dispatch.id,
                };

                if (itemPrice) {
                    dispatchProduct = {
                        ...dispatchProduct,
                        price: {
                            amount: itemPrice.amount || 0,
                            codeCurrency:
                                itemPrice.codeCurrency ||
                                mainCodeCurrency.currency.code,
                        },
                    };
                }
                bulkAddDispatchedProducts.push(dispatchProduct);
                continue;
            }

            const newQuantity =
                foundExistingDispatchProduct.quantity + product.quantity;
            updateDispatchedProductsQuantities.push({
                id: foundExistingDispatchProduct.id,
                quantity: newQuantity,
            });
        }

        if (bulkAddDispatchedProducts.length !== 0) {
            await DispatchProduct.bulkCreate(bulkAddDispatchedProducts, {
                include: [
                    { model: Price, as: "price" },
                    { model: Price, as: "cost" },
                ],
                transaction: t,
            });
        }

        if (updateDispatchedProductsQuantities.length !== 0) {
            await DispatchProduct.bulkCreate(
                updateDispatchedProductsQuantities,
                {
                    updateOnDuplicate: ["quantity"],
                    transaction: t,
                }
            );
        }

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );
        await t.commit();

        res.status(201).json(to_return);

        socketQueue.add(
            {
                code: "NEW_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
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
                    productsIds: to_return?.products.map(
                        item => item.productId
                    ),
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

//Adding products to dispatch
export const addProductsToDispatchV2 = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { dispatchId } = req.params;
        const {
            products,
            stockAreaFromId,
        }: {
            products: ProductDispatchItemV2[];
            stockAreaFromId: number;
        } = req.body;
        const user: User = req.user;

        if (!dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `El parámetro dispatchId no fue encontrado.`,
            });
        }

        const dispatch = await Dispatch.findOne({
            where: {
                id: dispatchId,
                businessId: user.businessId,
            },
            include: [
                { model: DispatchProduct, include: [BatchDispatchProduct] },
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(400).json({
                message: `Despacho no encontrado.`,
            });
        }

        if (dispatch.status !== "CREATED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho no puede ser transformado a factura.`,
            });
        }

        if (dispatch.order) {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido asociado a una orden.`,
            });
        }

        const ids = products.map(item => item.productId);

        //Obtaining all the products
        const fullProducts = await Product.findAll({
            where: {
                id: ids,
                businessId: user.businessId,
            },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
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
                    model: Variation,
                    as: "variations",
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: StockAreaProduct,
                    include: [StockAreaVariation, BatchProductStockArea],
                },
            ],
            paranoid: false,
            transaction: t,
        });

        let listStockProductIds = [];
        let fullBatches: Array<Batch> = [];
        let idsBatches: Array<number> = [];
        //Checking the products received
        for (const product of products) {
            const foundProduct = fullProducts.find(
                item => item.id === product.productId
            );

            if (!foundProduct) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} no fue encontrado en el negocio.`,
                });
            }

            const foundStockProduct = foundProduct?.stockAreaProducts?.find(
                item => item.productId === product.productId
            );

            if (!foundStockProduct) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto ${product.productName} no fue encontrado en el área de origen definida.`,
                });
            }

            listStockProductIds.push(foundStockProduct.id);

            if (foundProduct.type === "VARIATION") {
                if (!product.variationId) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} es de tipo Variable y no fue recibida ninguna variación.`,
                    });
                }

                const foundVariationName = foundProduct.variations.find(
                    item => item.id === product.variationId
                );
                if (!foundVariationName) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} no posee la variación definida.`,
                    });
                }

                const foundVariation = foundStockProduct.variations.find(
                    item => item.variationId === product.variationId
                );

                if (!foundVariation) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto ${product.productName} con la variación proporcionada no fue encontrado en el área de origen definida.`,
                    });
                }
            }

            const ids = product.batches?.map(item => item.batchId);
            if (ids && ids.length !== 0) {
                idsBatches = idsBatches.concat(ids);
            }
        }
    
        if (idsBatches.length !== 0) {
            fullBatches = await Batch.findAll({
                where: {
                    id: idsBatches,
                },
                transaction: t,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const mainCodeCurrency = availableCurrencies.find(item => item.isMain);
        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
            });
        }

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await getActiveEconomicCycleCache(
            user.businessId
        );

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        let bulkMovements = [];
        //From
        const productToSubstract = products.map(item => {
            return {
                productId: item.productId,
                variationId: item.variationId
                    ? Number(item.variationId)
                    : undefined,
                quantity: item.quantity,
                batches: item.batches,
            };
        });

        const result_from = await substractProductsFromStockAreaV2(
            {
                products: productToSubstract,
                stockAreaId: stockAreaFromId,
                businessId: user.businessId,
                mode: "strict",
            },
            t
        );

        if (!internalCheckerResponse(result_from)) {
            t.rollback();
            Logger.warn(
                result_from.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newDispatchV2/substractProductsFromStockAreaV2",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        //Creating each product
        let bulkAddDispatchedProducts = [];
        let updateDispatchedProductsQuantities = [];
        let updateBatchesDispatchedProduct = [];
        let bulkAddBatchesDispatched = [];
        for (const product of products as ProductDispatchItemV2[]) {
            const productDetails = fullProducts.find(
                item => item.id === product.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado en el almacén.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: productDetails.id,
                variationId: product.variationId,
                description: `Traslado de despacho`,
                movedToId: dispatch.stockAreaToId,
                areaId: stockAreaFromId,
                category: "DISPATCH",

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
                economicCycleId: activeEconomicCycle?.id,
            });

            let foundExistingDispatchProduct;
            if (productDetails.type === "VARIATION") {
                foundExistingDispatchProduct = dispatch.products.find(
                    item => item.productId === product.productId && item.variationId === product.variationId
                );
            } else {
                foundExistingDispatchProduct = dispatch.products.find(
                    item => item.productId === product.productId
                );
            }

            if (!foundExistingDispatchProduct) {
                const itemPrice = getProductPrice(
                    productDetails,
                    product.variationId,
                    availableCurrencies,
                    [activeEconomicCycle?.priceSystemId.toString()]
                );

                let dispatchProduct: any = {
                    name: productDetails.name,
                    quantity: product.quantity,
                    noPackages: product.noPackages,
                    variationId: product.variationId,
                    measure: productDetails.measure,
                    universalCode: productDetails.universalCode,
                    productId: productDetails.id,
                    cost: {
                        amount: productDetails.averageCost || 0,
                        codeCurrency: costCurrency,
                    },
                    dispatchId: dispatch.id,
                };

                if (itemPrice) {
                    dispatchProduct = {
                        ...dispatchProduct,
                        price: {
                            amount: itemPrice.amount || 0,
                            codeCurrency:
                                itemPrice.codeCurrency ||
                                mainCodeCurrency.currency.code,
                        },
                    };
                }

                if (product.batches) {
                    dispatchProduct = {
                        ...dispatchProduct,
                        batches: product.batches.map(item => {
                            const foundBatch = fullBatches.find(batch => batch.id === item.batchId)
    
                            return {
                                ...item,
                                uniqueCode: foundBatch?.uniqueCode
                            }
                        }),
                    };
                }

                bulkAddDispatchedProducts.push(dispatchProduct);

                continue;
            }

            const newQuantity =
                foundExistingDispatchProduct.quantity + product.quantity;

            updateDispatchedProductsQuantities.push({
                id: foundExistingDispatchProduct.id,
                quantity: newQuantity,
                noPackages: mathOperation(foundExistingDispatchProduct.noPackages, product.noPackages, 'addition', precission_after_coma)
            });

            //Analyzing batches
            for (const batch of product.batches){
                const foundBatch = foundExistingDispatchProduct.batches.find(item => item.batchId === batch.batchId);

                if (foundBatch){
                    updateBatchesDispatchedProduct.push({
                        id: foundBatch.id,
                        quantity: mathOperation(foundBatch.quantity, batch.quantity, 'addition', precission_after_coma),
                    })
                } else {
                    const foundBatch = fullBatches.find(element => element.id === batch.batchId)

                    bulkAddBatchesDispatched.push({
                        uniqueCode: foundBatch?.uniqueCode,
                        quantity: batch.quantity,
                        batchId: batch.batchId,
                        dispatchProductId: foundExistingDispatchProduct.id,
                    })
                }
            }
        }

        if (bulkAddDispatchedProducts.length !== 0) {
            await DispatchProduct.bulkCreate(bulkAddDispatchedProducts, {
                include: [
                    { model: Price, as: "price" },
                    { model: Price, as: "cost" },
                    BatchDispatchProduct,
                ],
                transaction: t,
            });
        }

        if (updateDispatchedProductsQuantities.length !== 0) {
            await DispatchProduct.bulkCreate(
                updateDispatchedProductsQuantities,
                {
                    updateOnDuplicate: ["quantity", "noPackages"],
                    transaction: t,
                }
            );
        }

        if (bulkAddBatchesDispatched.length !== 0) {
            await BatchDispatchProduct.bulkCreate(bulkAddBatchesDispatched, {
                transaction: t,
            });
        }

        if (updateBatchesDispatchedProduct.length !== 0) {
            await BatchDispatchProduct.bulkCreate(
                updateBatchesDispatchedProduct,
                {
                    updateOnDuplicate: ["quantity"],
                    transaction: t,
                }
            );
        }

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );
        await t.commit();

        res.status(201).json(to_return);

        socketQueue.add(
            {
                code: "NEW_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
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
                    productsIds: to_return?.products.map(
                        item => item.productId
                    ),
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

//For the moment it is no possible to make dispatch with variable products from production orders
export const newDispatchFromProductionOrder = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction(config_transactions);

    try {
        const {
            productionOrderId,
            stockAreaFromId,
            stockAreaToId,
            observations,
        } = req.body;
        const user: User = req.user;

        const productionOrder = await ProductionOrder.findByPk(
            productionOrderId,
            {
                include: [
                    {
                        model: ProductProductionOrder,
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
                    },
                ],
                transaction: t,
            }
        );

        if (!productionOrder) {
            t.rollback();
            return res.status(404).json({
                message: `La orden de producción id ${productionOrderId} no fue encontrada.`,
            });
        }

        if (productionOrder.businessId !== user.businessId) {
            t.rollback();
            return res.status(403).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const raw_products = productionOrder.products.filter(
            item => item.type === "RAW"
        );

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Obtaining all the products
        const stockProducts = await StockAreaProduct.findAll({
            where: {
                productId: raw_products.map(item => item.productId),
                areaId: stockAreaFromId,
            },
            include: [
                {
                    model: Product,
                    where: {
                        businessId: user.businessId,
                    },
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
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
            transaction: t,
        });

        //Checking the products received
        for (const product of raw_products) {
            const found = stockProducts.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado en el área definida.`,
                });
            }
        }

        //--> INIT BLOCK Resources
        await StockAreaProduct.findAll({
            where: {
                productId: raw_products.map(item => item.productId),
                areaId: stockAreaFromId,
            },
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        const mainCodeCurrency = await AvailableCurrency.findOne({
            where: {
                businessId: user.businessId,
                isMain: true,
            },
            include: [Currency],
        });

        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `No existe moneda definida como principal. Por favor, contacte al propietario del negocio.`,
            });
        }

        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        if (stockAreaFromId === stockAreaToId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede hacer despachos hacia la misma área.`,
            });
        }

        //From
        const productToSubstract = raw_products.map(item => {
            return {
                productId: Number(item.productId),
                variationId: undefined,
                quantity: item.quantity,
            };
        });

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
                    origin: "newDispatchFromProductionOrder/substractProductsFromStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_from.status).json({
                message: result_from.message,
            });
        }

        let bulkMovements = [];

        //Creating each product
        let dispatchedProducts = [];
        for (const product of raw_products) {
            const found = stockProducts.find(
                item => item.productId === product.productId
            );

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado en el almacén.`,
                });
            }

            //Analyzing disponibility
            if (product.quantity > found.quantity) {
                t.rollback();
                return res.status(400).json({
                    message: `La cantidad proveída del producto ${found.product.name} excede la existencia en el almacén.`,
                });
            }

            //Creating all the movement associated
            bulkMovements.push({
                quantity: Math.abs(product.quantity) * -1,
                productId: found.product.id,
                description: `Traslado por despacho. Fecha de apertura del despacho: ${moment(
                    productionOrder.openDate
                ).format("DD/MM/YYYY")}`,
                movedToId: stockAreaToId,
                areaId: stockAreaFromId,

                //Managed values
                businessId: user.businessId,
                movedById: user.id,
                operation: "MOVEMENT",
            });

            const productPrice = obtainingProductPriceSystemPriceDefined(
                found.product,
                undefined,
                activeEconomicCycle?.priceSystemId
            );

            let dispatchProduct: any = {
                name: found.product.name,
                quantity: product.quantity,
                measure: found.product.measure,
                universalCode: found.product.universalCode,
                productId: found.productId,
                cost: {
                    amount: found.product.averageCost,
                    codeCurrency: costCurrency,
                },
            };

            if (productPrice) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: productPrice?.price,
                        codeCurrency: productPrice?.codeCurrency,
                    },
                };
            }

            dispatchedProducts.push(dispatchProduct);
        }

        //Creating dispatch
        const dispatch: Dispatch = Dispatch.build(
            {
                businessId: user.businessId,
                observations,
                status: "CREATED",
                mode: "MOVEMENT",
                createdById: user.id,
                stockAreaFromId: stockAreaFromId,
                stockAreaToId,
                products: dispatchedProducts,
                economicCycleId: activeEconomicCycle?.id,
            },
            {
                include: [
                    {
                        model: DispatchProduct,
                        as: "products",
                        include: [
                            { model: Price, as: "price" },
                            { model: Price, as: "cost" },
                        ],
                    },
                ],
            }
        );

        await dispatch.save({ transaction: t });

        //Updating production Order
        productionOrder.dispatchId = dispatch.id;
        await productionOrder.save({ transaction: t });

        //Updating the id of the dispatch in the movements
        bulkMovements = bulkMovements.map(item => {
            return {
                ...item,
                dispatchId: dispatch.id,
            };
        });

        if (bulkMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
            });
        }

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );

        await t.commit();

        res.status(201).json(to_return);

        //Checking products
        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: raw_products.map(item => item.productId),
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

export const newDispatchFromOrderReceipt = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { orderReceiptId, stockAreaToId, observations } = req.body;
        const user: User = req.user;

        const order = await OrderReceipt.findByPk(orderReceiptId, {
            include: [
                {
                    model: SelledProduct,
                    where: {
                        status: {
                            [Op.not]: ["REMOVED", "CANCELLED"],
                        },
                    },
                    include: [
                        {
                            model: Price,
                            as: "priceTotal",
                            attributes: ["amount", "codeCurrency"],
                        },
                        {
                            model: Price,
                            as: "priceUnitary",
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
                Area,
            ],
        });

        if (!order) {
            t.rollback();
            return res.status(404).json({
                message: `La orden con id ${order} no fue encontrada.`,
            });
        }

        if (order.businessId !== user.businessId) {
            t.rollback();
            return res.status(403).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (order.dispatchId) {
            t.rollback();
            return res.status(400).json({
                message: `La orden ya tiene un despacho asociado.`,
            });
        }

        const stock_products_in_order = order.selledProducts.filter(item =>
            ["STOCK", "VARIATION"].includes(item.type)
        );

        if (stock_products_in_order.length === 0) {
            t.rollback();
            return res.status(400).json({
                message: `La orden no tiene productos despachables de tipo Almacén o Variables.`,
            });
        }

        //Obtaining all the products
        const products = await Product.findAll({
            where: {
                businessId: user.businessId,
                id: stock_products_in_order.map(item => item.productId),
            },
            include: [
                {
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["amount", "codeCurrency"],
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
                    model: Variation,
                    as: "variations",
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                },
            ],
        });

        //Checking the products received
        for (const product of stock_products_in_order) {
            const found = products.find(item => item.id === product.productId);

            if (!found) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }
        }

        const mainCodeCurrency = await AvailableCurrency.findOne({
            where: {
                businessId: user.businessId,
                isMain: true,
            },
            include: [Currency],
        });

        if (!mainCodeCurrency) {
            t.rollback();
            return res.status(400).json({
                message: `No existe moneda definida como principal. Por favor, contacte al propietario del negocio.`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || mainCodeCurrency.currency.code;

        if (order.areaSales?.stockAreaId === stockAreaToId) {
            t.rollback();
            return res.status(400).json({
                message: `No puede hacer despachos hacia la misma área.`,
            });
        }

        //Obtaining active EconomicCycle
        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Creating each product
        let dispatchedProducts = [];
        for (const product of products) {
            const found_stock = stock_products_in_order.find(
                item => item.productId === product.id
            )!;

            let dispatchProduct: any = {
                name: product.name,
                variationId: found_stock.variationId,
                quantity: found_stock.quantity,
                measure: product.measure,
                universalCode: product.universalCode,
                productId: product.id,
                cost: {
                    amount: product.averageCost || 0,
                    codeCurrency: costCurrency,
                },
            };

            const productPrice = obtainingProductPriceSystemPriceDefined(
                product,
                found_stock.variationId,
                activeEconomicCycle?.priceSystemId
            );

            if (order.houseCosted) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: product.averageCost || 0,
                        codeCurrency: costCurrency,
                    },
                };
            } else if (productPrice) {
                dispatchProduct = {
                    ...dispatchProduct,
                    price: {
                        amount: productPrice.price || 0,
                        codeCurrency: productPrice.codeCurrency,
                    },
                };
            }

            dispatchedProducts.push(dispatchProduct);
        }

        //Creating dispatch
        const dispatch: Dispatch = Dispatch.build(
            {
                businessId: user.businessId,
                observations,
                status: "CREATED",
                mode: "SALE",
                createdById: user.id,
                stockAreaFromId: order.areaSales?.stockAreaId,
                stockAreaToId,
                products: dispatchedProducts,
                economicCycleId: activeEconomicCycle?.id,
            },
            {
                include: [
                    {
                        model: DispatchProduct,
                        as: "products",
                        include: [
                            { model: Price, as: "price" },
                            { model: Price, as: "cost" },
                        ],
                    },
                ],
            }
        );

        await dispatch.save({ transaction: t });

        //Updating order
        order.dispatchId = dispatch.id;
        await order.save({ transaction: t });

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
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

export const findAllDispatches = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            dateFrom,
            dateTo,
            stockAreaFromId,
            stockAreaToId,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "createdAt",
            "stockAreaFromId",
            "stockAreaToId",
            "mode",
            "status",
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

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        //Checking sharedAreas
        const [shared_areas, my_areas] = await Promise.all([
            SharedArea.findAll({
                where: {
                    sharedBusinessId: user.businessId,
                },
            }),
            Area.findAll({
                where: {
                    businessId: user.businessId,
                    type: "STOCK",
                },
            }),
        ]);

        if (stockAreaFromId) {
            const found = shared_areas.find(
                item => item.areaId === stockAreaFromId
            );
            const areaFrom = await getAreaCache(stockAreaFromId);

            if (!areaFrom) {
                return res.status(404).json({
                    message: `El área proporcionada no fue encontrada.`,
                });
            }

            if (!found && areaFrom.businessId !== user.businessId) {
                return res.status(403).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            where_clause.stockAreaFromId = stockAreaFromId;
        }

        if (stockAreaToId) {
            const found = shared_areas.find(
                item => item.areaId === stockAreaToId
            );
            const areaTo = await getAreaCache(stockAreaToId);

            if (!areaTo) {
                return res.status(404).json({
                    message: `El área proporcionada no fue encontrada.`,
                });
            }

            if (!found && areaTo.businessId !== user.businessId) {
                return res.status(403).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            where_clause.stockAreaToId = stockAreaToId;
        }

        if (!stockAreaFromId && !stockAreaToId) {
            where_clause = {
                ...where_clause,
                [Op.or]: [
                    {
                        stockAreaFromId: {
                            [Op.or]: my_areas.map(item => item.id),
                        },
                    },
                    {
                        stockAreaToId: {
                            [Op.or]: my_areas.map(item => item.id),
                        },
                    },
                ],
            };
        }

        const found_dispatches = await Dispatch.findAndCountAll({
            attributes: [
                "id",
                "observations",
                "status",
                "mode",
                "businessId",
                "createdAt",
                "rejectedAt",
                "receivedAt",
            ],
            distinct: true,
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: Area,
                    as: "stockAreaFrom",
                    attributes: ["id", "name", "businessId"],
                    include: [
                        {
                            model: Business,
                            attributes: ["id", "name"],
                            paranoid: false,
                        },
                    ],
                    paranoid: false,
                    required: false,
                },
                {
                    model: Area,
                    as: "stockAreaTo",
                    attributes: ["id", "name", "businessId"],
                    include: [
                        {
                            model: Business,
                            attributes: ["id", "name"],
                            paranoid: false,
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "createdBy",
                    attributes: ["username", "email", "displayName"],
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
                    as: "receivedBy",
                    attributes: ["username", "email", "displayName"],
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
                    as: "rejectedBy",
                    attributes: ["username", "email", "displayName"],
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
                    model: DispatchProduct,
                    attributes: [
                        "name",
                        "quantity",
                        "universalCode",
                        "measure",
                    ],
                    include: [
                        {
                            model: Price,
                            as: "price",
                            attributes: ["amount", "codeCurrency"],
                        },
                        {
                            model: Price,
                            as: "cost",
                            attributes: ["amount", "codeCurrency"],
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
                },
            ],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        let totalPages = Math.ceil(found_dispatches.count / limit);
        if (found_dispatches.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_dispatches.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: totalPages,
            items: found_dispatches.rows,
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

export const getDispatch = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const dispatch = await Dispatch.scope("to_return").findByPk(id);

        if (!dispatch) {
            return res.status(404).json({
                message: `El despacho no fue encontrado`,
            });
        }

        const my_areas = await Area.findAll({
            where: {
                businessId: user.businessId,
                type: "STOCK",
            },
        });

        const found = my_areas.find(
            item =>
                item.id === dispatch.stockAreaFrom?.id ||
                item.id === dispatch.stockAreaTo.id
        );

        if (!found) {
            return res.status(401).json({
                message: `No tiene permisos para aceptar este despacho. Consulte al propietario de negocio.`,
            });
        }

        res.status(200).json(dispatch);
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

//Only from Tecopos-Admin
export const acceptDispatch = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { dispatchId } = req.params;
        const user: User = req.user;

        if (!dispatchId) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const dispatch = await Dispatch.findByPk(dispatchId, {
            include: [
                {
                    model: Area,
                    as: "stockAreaTo",
                },
                {
                    model: User,
                    as: "receivedBy",
                    paranoid: false,
                },
                {
                    model: User,
                    as: "rejectedBy",
                    paranoid: false,
                },
                {
                    model: DispatchProduct,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                        {
                            model: Price,
                            as: "cost",
                        },
                    ],
                },
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(404).json({
                message: `El despacho no fue encontrado`,
            });
        }

        if (dispatch.status === "BILLED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ha sido transformado en factura y no puede aceptarse.`,
            });
        }

        if (dispatch.status === "REJECTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido rechazado por ${
                    dispatch.rejectedBy?.displayName ||
                    dispatch.rejectedBy?.username
                }`,
            });
        }

        if (dispatch.status === "ACCEPTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido aceptado por ${
                    dispatch.receivedBy?.displayName ||
                    dispatch.receivedBy?.username
                }`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const areaBusinessId = dispatch.stockAreaTo.businessId;
        const available_currencies = await getCurrenciesCache(areaBusinessId);

        const priceSystemBusinessTo = await PriceSystem.findOne({
            where: {
                businessId: areaBusinessId,
                isMain: true,
            },
        });

        if (!priceSystemBusinessTo) {
            t.rollback();
            return res.status(400).json({
                message: `El negocio de destino no tiene sistema de precio definido.`,
            });
        }

        const main_currency = available_currencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        dispatch.receivedById = user.id;
        dispatch.receivedAt = moment().toDate();
        dispatch.status = "ACCEPTED";

        //--> INIT BLOCK Resources
        const blockedProducts = Array.from(
            new Set([...dispatch.products.map(item => item.productId)])
        );

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
            },
            lock: true,
            transaction: t,
        });

        await Dispatch.findByPk(dispatchId, {
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: areaBusinessId,
            },
        });

        //Receiving products in the correspondent Area
        const [products, stock_products, full_products] = await Promise.all([
            Product.findAll({
                where: {
                    universalCode: dispatch.products.map(
                        item => item.universalCode
                    ),
                    businessId: areaBusinessId,
                },
            }),
            StockAreaProduct.findAll({
                where: {
                    areaId: dispatch.stockAreaToId,
                },
                include: [
                    {
                        model: Product,
                        where: {
                            universalCode: dispatch.products.map(
                                item => item.universalCode
                            ),
                            businessId: areaBusinessId,
                        },
                    },
                ],
            }),
            Product.findAll({
                where: {
                    universalCode: dispatch.products.map(
                        item => item.universalCode
                    ),
                },
                include: [
                    {
                        model: Price,
                        as: "onSalePrice",
                        attributes: ["amount", "codeCurrency"],
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
            }),
        ]);

        let bulkStockMovements = [];
        let bulkProduct = [];
        let bulkUpdateProducts: Array<{ id: number; averageCost: number }> = [];
        let productToAdd: Array<SimpleProductItem> = [];

        for (const dispProd of dispatch.products) {
            const found = stock_products.find(
                item => item.product.universalCode === dispProd.universalCode
            );

            if (found) {
                productToAdd.push({
                    productId: found.product.id,
                    variationId: dispProd.variationId,
                    quantity: dispProd.quantity,
                });

                //Creating asociated movements
                let movement: any = {};
                let unitaryCost;
                if (dispatch.mode === "SALE" && dispProd.price) {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.price.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    movement = {
                        price: {
                            amount: mathOperation(
                                dispProd.price.amount,
                                dispProd.quantity,
                                "multiplication",
                                precission_after_coma
                            ),
                            codeCurrency: dispProd.price.codeCurrency,
                        },
                    };

                    //Cost
                    unitaryCost = dispProd.price.amount;
                    if (found_currency.currency.code !== costCurrency) {
                        unitaryCost =
                            exchangeCurrency(
                                dispProd.price,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    if (
                        found.product.totalQuantity !== 0 &&
                        found.product.averageCost !== 0
                    ) {
                        unitaryCost =
                            (found.product.averageCost *
                                found.product.totalQuantity +
                                unitaryCost * dispProd.quantity) /
                            (found.product.totalQuantity + dispProd.quantity);

                        unitaryCost = mathOperation(
                            unitaryCost,
                            0,
                            "addition",
                            precission_after_coma
                        );
                    }
                } else {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.cost.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    unitaryCost = dispProd.cost.amount;
                    if (found_currency.currency.code !== costCurrency) {
                        unitaryCost =
                            exchangeCurrency(
                                dispProd.cost,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    if (
                        found.product.totalQuantity !== 0 &&
                        found.product.averageCost !== 0
                    ) {
                        unitaryCost =
                            (found.product.averageCost *
                                found.product.totalQuantity +
                                unitaryCost * dispProd.quantity) /
                            (found.product.totalQuantity + dispProd.quantity);
                        unitaryCost = mathOperation(
                            unitaryCost,
                            0,
                            "addition",
                            precission_after_coma
                        );
                    }

                    movement = {
                        price: {
                            amount: mathOperation(
                                dispProd.cost.amount,
                                dispProd.quantity,
                                "multiplication",
                                precission_after_coma
                            ),
                            codeCurrency: dispProd.cost.codeCurrency,
                        },
                    };
                }

                bulkStockMovements.push({
                    ...movement,
                    quantity: dispProd.quantity,
                    variationId: dispProd.variationId,
                    productId: found.product.id,
                    description: `Entrada a partir de despacho`,

                    //Managed values
                    businessId: areaBusinessId,
                    movedById: user.id,
                    areaId: dispatch.stockAreaToId,
                    operation: "ENTRY",
                    dispatchId,
                    economicCycleId: activeEconomicCycle?.id,
                });

                if (found.product.averageCost !== unitaryCost) {
                    bulkUpdateProducts.push({
                        id: found.product.id,
                        averageCost: unitaryCost,
                    });
                }
            } else {
                //Verifiying the product exist, if not creating it
                const existProduct = products.find(
                    item => item.universalCode === dispProd.universalCode
                );

                if (existProduct) {
                    productToAdd.push({
                        productId: existProduct.id,
                        variationId: dispProd.variationId,
                        quantity: dispProd.quantity,
                    });

                    //Creating asociated movements
                    let movement: any = {};
                    let unitaryCost;
                    if (dispatch.mode === "SALE" && dispProd.price) {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.price.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        movement = {
                            price: {
                                amount: mathOperation(
                                    dispProd.price.amount,
                                    dispProd.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                codeCurrency: dispProd.price.codeCurrency,
                            },
                        };

                        //Cost
                        unitaryCost = dispProd.price.amount || 0;
                        if (found_currency.currency.code !== costCurrency) {
                            unitaryCost =
                                exchangeCurrency(
                                    dispProd.price,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }

                        if (
                            existProduct.totalQuantity !== 0 &&
                            existProduct.averageCost !== 0
                        ) {
                            unitaryCost =
                                (existProduct.averageCost *
                                    existProduct.totalQuantity +
                                    unitaryCost * dispProd.quantity) /
                                (existProduct.totalQuantity +
                                    dispProd.quantity);

                            unitaryCost = mathOperation(
                                unitaryCost,
                                0,
                                "addition",
                                precission_after_coma
                            );
                        }
                    } else {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.cost.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        unitaryCost = dispProd.cost.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            unitaryCost =
                                exchangeCurrency(
                                    dispProd.cost,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }

                        if (
                            existProduct.totalQuantity !== 0 &&
                            existProduct.averageCost !== 0
                        ) {
                            unitaryCost =
                                (existProduct.averageCost *
                                    existProduct.totalQuantity +
                                    unitaryCost * dispProd.quantity) /
                                (existProduct.totalQuantity +
                                    dispProd.quantity);
                            unitaryCost = mathOperation(
                                unitaryCost,
                                0,
                                "addition",
                                precission_after_coma
                            );
                        }

                        movement = {
                            price: {
                                amount: mathOperation(
                                    dispProd.cost.amount,
                                    dispProd.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                codeCurrency: dispProd.cost.codeCurrency,
                            },
                        };
                    }

                    bulkStockMovements.push({
                        ...movement,
                        quantity: dispProd.quantity,
                        variationId: dispProd.variationId,
                        productId: existProduct.id,
                        description: `Entrada a partir de despacho`,

                        //Managed values
                        businessId: areaBusinessId,
                        movedById: user.id,
                        areaId: dispatch.stockAreaToId,
                        operation: "ENTRY",
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });

                    if (existProduct.averageCost !== unitaryCost) {
                        bulkUpdateProducts.push({
                            id: existProduct.id,
                            averageCost: unitaryCost,
                        });
                    }
                } else {
                    //Creating the product - This case is only when the product is share between businesses
                    const universalProduct = full_products.find(
                        item => item.universalCode === dispProd.universalCode
                    );

                    if (!universalProduct) {
                        //Improbable case
                        t.rollback();
                        return res.status(400).json({
                            message: `El producto ${dispProd.name} no fue encontrado en el sistema.`,
                        });
                    }

                    //TODO: To delete when solution enable
                    if (universalProduct.type === "VARIATION") {
                        t.rollback();
                        return res.status(400).json({
                            message: `No se pueden hacer despachos de productos variables entre negocios diferentes.`,
                        });
                    }

                    const productPrice =
                        obtainingProductPriceSystemPriceDefined(
                            universalProduct,
                            undefined
                        );

                    let itemCost;
                    if (dispatch.mode === "SALE" && dispProd.price) {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.price.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        itemCost = dispProd.price.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            itemCost =
                                exchangeCurrency(
                                    dispProd.price,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }
                    } else {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.cost.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        itemCost = dispProd.cost.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            itemCost =
                                exchangeCurrency(
                                    dispProd.cost,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }
                    }

                    const image = universalProduct.images?.[0];

                    let product: any = {
                        name: universalProduct.name,
                        universalCode: universalProduct.universalCode,
                        salesCode: universalProduct.salesCode,
                        description: universalProduct.description,
                        type: universalProduct.type,
                        showForSale: ["STOCK"].includes(universalProduct.type),
                        isPublicVisible: ["STOCK"].includes(
                            universalProduct.type
                        ),
                        qrCode: universalProduct.qrCode,
                        measure: universalProduct.measure,
                        averageCost: itemCost,
                        businessId: areaBusinessId,
                        stockLimit: true,
                        images: image
                            ? [
                                  {
                                      path: image.path,
                                      src: image.src,
                                      thumbnail: image.thumbnail,
                                  },
                              ]
                            : [],
                    };

                    if (["STOCK"].includes(universalProduct.type)) {
                        product = {
                            ...product,
                            prices: [
                                {
                                    price: productPrice?.price || 0,
                                    codeCurrency:
                                        productPrice?.codeCurrency ||
                                        main_currency.currency.code,
                                    isMain: true,
                                    priceSystemId: priceSystemBusinessTo?.id,
                                },
                            ],
                        };
                    }

                    bulkProduct.push(product);
                }
            }
        }

        let createdObjects;
        //Creating products in the corresponding Area
        if (bulkProduct.length !== 0) {
            createdObjects = await Product.bulkCreate(bulkProduct, {
                include: [
                    { model: Image, as: "images" },
                    { model: ProductPrice, as: "prices" },
                ],
                transaction: t,
                returning: true,
            });

            //Including new object created to the movements associated
            for (const product of createdObjects) {
                const dispProd = dispatch.products.find(
                    item => item.universalCode === product.universalCode
                );

                if (!dispProd) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${product.name} no fue encontrado o no fue satisfactoriamente agregado durante el proceso de creación.`,
                    });
                }

                productToAdd.push({
                    productId: product.id,
                    variationId: dispProd.variationId,
                    quantity: dispProd.quantity,
                });

                //Creating asociated movements
                let movement: any = {};
                if (dispatch.mode === "SALE" && dispProd.price) {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.price.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    let itemCost = dispProd.price.amount || 0;
                    if (found_currency.currency.code !== costCurrency) {
                        itemCost =
                            exchangeCurrency(
                                dispProd.price,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    movement = {
                        price: {
                            amount: itemCost,
                            codeCurrency: costCurrency,
                        },
                    };
                }

                bulkStockMovements.push({
                    ...movement,
                    quantity: dispProd.quantity,
                    variationId: dispProd.variationId,
                    productId: product.id,
                    description: `Entrada a partir de despacho`,

                    //Managed values
                    businessId: areaBusinessId,
                    movedById: user.id,
                    areaId: dispatch.stockAreaToId,
                    operation: "ENTRY",
                    dispatchId,
                    economicCycleId: activeEconomicCycle?.id,
                });
            }
        }

        //To
        const result_to = await addProductsToStockArea(
            {
                products: productToAdd,
                precission_after_coma,
                areaId: dispatch.stockAreaToId,
                businessId: dispatch.stockAreaTo.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_to)) {
            t.rollback();
            Logger.warn(
                result_to.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "acceptDispatch/addProductsToStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_to.status).json({
                message: result_to.message,
            });
        }

        if (bulkStockMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkStockMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
                returning: true,
            });
        }

        //Update cost
        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["averageCost"],
                transaction: t,
            });
        }

        await dispatch.save({ transaction: t });

        //To_return
        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );

        await t.commit();

        res.status(200).json(to_return);

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

export const acceptDispatchWithReturnProducts = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction(config_transactions);
    try {
        const { dispatchId } = req.params;
        const user: User = req.user;

        if (!dispatchId) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const dispatch = await Dispatch.findByPk(dispatchId, {
            include: [
                {
                    model: Area,
                    as: "stockAreaTo",
                },
                {
                    model: User,
                    as: "receivedBy",
                    paranoid: false,
                },
                {
                    model: User,
                    as: "rejectedBy",
                    paranoid: false,
                },
                {
                    model: DispatchProduct,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                        {
                            model: Price,
                            as: "cost",
                        },
                    ],
                },
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(404).json({
                message: `El despacho no fue encontrado`,
            });
        }

        if (dispatch.status === "BILLED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ha sido transformado en factura y no puede aceptarse.`,
            });
        }

        if (dispatch.status === "REJECTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido rechazado por ${
                    dispatch.rejectedBy?.displayName ||
                    dispatch.rejectedBy?.username
                }`,
            });
        }

        if (dispatch.status === "ACCEPTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido aceptado por ${
                    dispatch.receivedBy?.displayName ||
                    dispatch.receivedBy?.username
                }`,
            });
        }

        //--> INIT BLOCK Resources
        const blockedProducts = Array.from(
            new Set([...dispatch.products.map(item => item.productId)])
        );

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
            },
            lock: true,
            transaction: t,
        });

        await Dispatch.findByPk(dispatchId, {
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const areaBusinessId = dispatch.stockAreaTo.businessId;

        const available_currencies = await getCurrenciesCache(areaBusinessId);

        const priceSystemBusinessTo = await PriceSystem.findOne({
            where: {
                businessId: areaBusinessId,
                isMain: true,
            },
        });

        if (!priceSystemBusinessTo) {
            t.rollback();
            return res.status(400).json({
                message: `El negocio de destino no tiene sistema de precio definido.`,
            });
        }

        const main_currency = available_currencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        const costCurrency =
            configurations.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        let bulkStockMovements = [];
        let bulkProduct = [];
        let productToAdd: Array<SimpleProductItem> = [];
        let bulkUpdateProducts: Array<{ id: number; averageCost: number }> = [];

        dispatch.receivedById = user.id;
        dispatch.receivedAt = moment().toDate();
        dispatch.status = "ACCEPTED";

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: areaBusinessId,
            },
        });

        //Receiving products in the correspondent Area
        const [products, stock_products, full_products] = await Promise.all([
            Product.findAll({
                where: {
                    universalCode: dispatch.products.map(
                        item => item.universalCode
                    ),
                    businessId: areaBusinessId,
                },
                transaction: t,
            }),
            StockAreaProduct.findAll({
                where: {
                    areaId: dispatch.stockAreaToId,
                },
                include: [
                    {
                        model: Product,
                        where: {
                            universalCode: dispatch.products.map(
                                item => item.universalCode
                            ),
                            businessId: areaBusinessId,
                        },
                    },
                ],
                transaction: t,
            }),
            Product.findAll({
                where: {
                    universalCode: dispatch.products.map(
                        item => item.universalCode
                    ),
                },
                include: [
                    {
                        model: Price,
                        as: "onSalePrice",
                        attributes: ["amount", "codeCurrency"],
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
                transaction: t,
            }),
        ]);

        for (const dispProd of dispatch.products) {
            const found = stock_products.find(
                item => item.product.universalCode === dispProd.universalCode
            );

            if (found) {
                productToAdd.push({
                    productId: found.productId,
                    variationId: dispProd.variationId,
                    quantity: dispProd.quantity,
                });

                //Creating asociated movements
                let movement: any = {};
                let unitaryCost;
                if (dispatch.mode === "SALE" && dispProd.price) {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.price.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    movement = {
                        price: {
                            amount: mathOperation(
                                dispProd.price.amount,
                                dispProd.quantity,
                                "multiplication",
                                precission_after_coma
                            ),
                            codeCurrency: dispProd.price.codeCurrency,
                        },
                    };

                    //Cost
                    unitaryCost = dispProd.price.amount;
                    if (found_currency.currency.code !== costCurrency) {
                        unitaryCost =
                            exchangeCurrency(
                                dispProd.price,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    if (
                        found.product.totalQuantity !== 0 &&
                        found.product.averageCost !== 0
                    ) {
                        unitaryCost =
                            (found.product.averageCost *
                                found.product.totalQuantity +
                                unitaryCost * dispProd.quantity) /
                            (found.product.totalQuantity + dispProd.quantity);
                        unitaryCost = mathOperation(
                            unitaryCost,
                            0,
                            "addition",
                            precission_after_coma
                        );
                    }
                } else {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.cost.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    unitaryCost = dispProd.cost.amount;
                    if (found_currency.currency.code !== costCurrency) {
                        unitaryCost =
                            exchangeCurrency(
                                dispProd.cost,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    if (
                        found.product.totalQuantity !== 0 &&
                        found.product.averageCost !== 0
                    ) {
                        unitaryCost =
                            (found.product.averageCost *
                                found.product.totalQuantity +
                                unitaryCost * dispProd.quantity) /
                            (found.product.totalQuantity + dispProd.quantity);
                        unitaryCost = mathOperation(
                            unitaryCost,
                            0,
                            "addition",
                            precission_after_coma
                        );
                    }

                    movement = {
                        price: {
                            amount: mathOperation(
                                dispProd.cost.amount,
                                dispProd.quantity,
                                "multiplication",
                                precission_after_coma
                            ),
                            codeCurrency: main_currency?.currency.code,
                        },
                    };
                }

                bulkStockMovements.push({
                    ...movement,
                    quantity: dispProd.quantity,
                    variationId: dispProd.variationId,
                    productId: found.product.id,
                    description: `Entrada a partir de despacho`,

                    //Managed values
                    businessId: areaBusinessId,
                    movedById: user.id,
                    areaId: dispatch.stockAreaToId,
                    operation: "ENTRY",
                    dispatchId,
                    economicCycleId: activeEconomicCycle?.id,
                });

                if (found.product.averageCost !== unitaryCost) {
                    bulkUpdateProducts.push({
                        id: found.product.id,
                        averageCost: unitaryCost,
                    });
                }
            } else {
                //Verifiying the product exist, if not creating it
                const existProduct = products.find(
                    item => item.universalCode === dispProd.universalCode
                );

                if (existProduct) {
                    productToAdd.push({
                        productId: existProduct.id,
                        variationId: dispProd.variationId,
                        quantity: dispProd.quantity,
                    });

                    //Creating asociated movements
                    let movement: any = {};
                    let unitaryCost;
                    if (dispatch.mode === "SALE" && dispProd.price) {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.price.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        movement = {
                            price: {
                                amount: mathOperation(
                                    dispProd.price.amount,
                                    dispProd.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                codeCurrency: dispProd.price.codeCurrency,
                            },
                        };

                        //Cost
                        unitaryCost = dispProd.price.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            unitaryCost =
                                exchangeCurrency(
                                    dispProd.price,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }

                        if (
                            existProduct.totalQuantity !== 0 &&
                            existProduct.averageCost !== 0
                        ) {
                            unitaryCost =
                                (existProduct.averageCost *
                                    existProduct.totalQuantity +
                                    unitaryCost * dispProd.quantity) /
                                (existProduct.totalQuantity +
                                    dispProd.quantity);
                            unitaryCost = mathOperation(
                                unitaryCost,
                                0,
                                "addition",
                                precission_after_coma
                            );
                        }
                    } else {
                        let itemPrice = dispProd.cost.amount;

                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.cost.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        unitaryCost = dispProd.cost.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            unitaryCost =
                                exchangeCurrency(
                                    dispProd.cost,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }

                        if (
                            existProduct.totalQuantity !== 0 &&
                            existProduct.averageCost !== 0
                        ) {
                            unitaryCost =
                                (existProduct.averageCost *
                                    existProduct.totalQuantity +
                                    unitaryCost * dispProd.quantity) /
                                (existProduct.totalQuantity +
                                    dispProd.quantity);
                            unitaryCost = mathOperation(
                                unitaryCost,
                                0,
                                "addition",
                                precission_after_coma
                            );
                        }

                        movement = {
                            price: {
                                amount: mathOperation(
                                    dispProd.cost.amount,
                                    dispProd.quantity,
                                    "multiplication",
                                    precission_after_coma
                                ),
                                codeCurrency: dispProd.cost.codeCurrency,
                            },
                        };
                    }

                    bulkStockMovements.push({
                        ...movement,
                        quantity: dispProd.quantity,
                        variationId: dispProd.variationId,
                        productId: existProduct.id,
                        description: `Entrada a partir de despacho`,

                        //Managed values
                        businessId: areaBusinessId,
                        movedById: user.id,
                        areaId: dispatch.stockAreaToId,
                        operation: "ENTRY",
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });

                    if (existProduct.averageCost !== unitaryCost) {
                        bulkUpdateProducts.push({
                            id: existProduct.id,
                            averageCost: unitaryCost,
                        });
                    }
                } else {
                    //Creating the product - This case is only when the product is share between businesses
                    const universalProduct = full_products.find(
                        item => item.universalCode === dispProd.universalCode
                    );

                    if (!universalProduct) {
                        //Improbable case
                        t.rollback();
                        return res.status(400).json({
                            message: `El producto ${dispProd.name} no fue encontrado en el sistema.`,
                        });
                    }

                    //TODO: To delete when a solution found
                    if (universalProduct.type === "VARIATION") {
                        t.rollback();
                        return res.status(400).json({
                            message: `No se pueden hacer despachos de productos variables entre negocios diferentes.`,
                        });
                    }

                    const productPrice =
                        obtainingProductPriceSystemPriceDefined(
                            universalProduct,
                            undefined
                        );

                    let itemCost;
                    if (dispatch.mode === "SALE" && dispProd.price) {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.price.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        itemCost = dispProd.price.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            itemCost =
                                exchangeCurrency(
                                    dispProd.price,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }
                    } else {
                        const found_currency = available_currencies.find(
                            item =>
                                item.currency.code ===
                                dispProd.cost.codeCurrency
                        );

                        if (!found_currency) {
                            t.rollback();
                            return res.status(400).json({
                                message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                            });
                        }

                        itemCost = dispProd.cost.amount;
                        if (found_currency.currency.code !== costCurrency) {
                            itemCost =
                                exchangeCurrency(
                                    dispProd.cost,
                                    costCurrency,
                                    available_currencies
                                )?.amount || 0;
                        }
                    }

                    const image = universalProduct.images?.[0];

                    let product: any = {
                        name: universalProduct.name,
                        universalCode: universalProduct.universalCode,
                        salesCode: universalProduct.salesCode,
                        barCode: universalProduct.barCode,
                        description: universalProduct.description,
                        type: universalProduct.type,
                        showForSale: ["STOCK"].includes(universalProduct.type),
                        isPublicVisible: ["STOCK"].includes(
                            universalProduct.type
                        ),
                        qrCode: universalProduct.qrCode,
                        measure: universalProduct.measure,
                        averageCost: itemCost,
                        businessId: areaBusinessId,
                        stockLimit: true,
                        images: image
                            ? [
                                  {
                                      path: image.path,
                                      src: image.src,
                                      thumbnail: image.thumbnail,
                                  },
                              ]
                            : [],
                    };

                    if (["STOCK"].includes(universalProduct.type)) {
                        product = {
                            ...product,
                            prices: [
                                {
                                    price: productPrice?.price,
                                    codeCurrency: productPrice?.codeCurrency,
                                    isMain: true,
                                    priceSystemId: priceSystemBusinessTo?.id,
                                },
                            ],
                        };
                    }

                    bulkProduct.push(product);
                }
            }
        }

        let createdObjects;
        //Creating products with Product object include in the corresponding Area
        if (bulkProduct.length !== 0) {
            createdObjects = await Product.bulkCreate(bulkProduct, {
                include: [
                    { model: Image, as: "images" },
                    { model: ProductPrice, as: "prices" },
                ],
                transaction: t,
                returning: true,
            });

            //Including new object created to the movements associated
            for (const product of createdObjects) {
                const dispProd = dispatch.products.find(
                    item => item.universalCode === product.universalCode
                );

                if (!dispProd) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${product.name} no fue encontrado o no fue satisfactoriamente agregado durante el proceso de creación.`,
                    });
                }

                productToAdd.push({
                    productId: product.id,
                    variationId: dispProd.variationId,
                    quantity: dispProd.quantity,
                });

                //Creating asociated movements
                let movement: any = {};
                if (dispatch.mode === "SALE" && dispProd.price) {
                    const found_currency = available_currencies.find(
                        item =>
                            item.currency.code === dispProd.price.codeCurrency
                    );

                    if (!found_currency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La moneda proporcionada no fue encontrada y por ende no se pudo completar la recepción del despacho.`,
                        });
                    }

                    let itemCost = dispProd.price.amount;
                    if (found_currency.currency.code !== costCurrency) {
                        itemCost =
                            exchangeCurrency(
                                dispProd.price,
                                costCurrency,
                                available_currencies
                            )?.amount || 0;
                    }

                    movement = {
                        price: {
                            amount: itemCost,
                            codeCurrency: costCurrency,
                        },
                    };
                }

                bulkStockMovements.push({
                    ...movement,
                    quantity: dispProd.quantity,
                    variationId: dispProd.variationId,
                    productId: product.id,
                    description: `Entrada a partir de despacho`,

                    //Managed values
                    businessId: areaBusinessId,
                    movedById: user.id,
                    areaId: dispatch.stockAreaToId,
                    operation: "ENTRY",
                    dispatchId,
                    economicCycleId: activeEconomicCycle?.id,
                });
            }
        }

        //To
        const result_to = await addProductsToStockArea(
            {
                products: productToAdd,
                precission_after_coma,
                areaId: dispatch.stockAreaToId,
                businessId: dispatch.stockAreaTo.businessId,
            },
            t
        );

        if (!internalCheckerResponse(result_to)) {
            t.rollback();
            Logger.warn(
                result_to.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "acceptDispatch/addProductsToStockArea",
                    "X-App-Origin": req.header("X-App-Origin"),
                }
            );
            return res.status(result_to.status).json({
                message: result_to.message,
            });
        }

        if (bulkStockMovements.length !== 0) {
            //Creating movements
            await StockMovement.bulkCreate(bulkStockMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
                returning: true,
            });
        }

        //Update cost
        if (bulkUpdateProducts.length !== 0) {
            await Product.bulkCreate(bulkUpdateProducts, {
                updateOnDuplicate: ["averageCost"],
                transaction: t,
            });
        }

        await dispatch.save({ transaction: t });

        //To_return
        const [
            dispatch_to_return,
            products_to_emit_to_sales,
            products_to_emit_to_stock,
        ] = await Promise.all([
            Dispatch.scope("to_return").findByPk(dispatch.id, {
                transaction: t,
            }),
            StockAreaProduct.findAll({
                where: {
                    areaId: dispatch.stockAreaToId,
                    productId: dispatch.products.map(item => item.productId),
                },
                include: [
                    {
                        model: Product.scope("to_return"),
                        where: {
                            type: ["STOCK", "VARIATION"],
                            showForSale: true,
                            totalQuantity: {
                                [Op.gt]: 0,
                            },
                        },
                    },
                ],
                transaction: t,
            }),
            StockAreaProduct.scope("to_stock").findAll({
                where: {
                    areaId: dispatch.stockAreaToId,
                    productId: dispatch.products.map(item => item.productId),
                },
                transaction: t,
            }),
        ]);

        const productsForSale = products_to_emit_to_sales.map(stap => {
            const findQuantity =
                dispatch.products.find(
                    (item: any) => item.productId === stap.productId
                )?.quantity || 0;

            return {
                //@ts-ignore
                ...stap.product.dataValues,
                quantity: stap.quantity,
                extraQuantity: findQuantity,
                areaId: stap.areaId,
            };
        });

        const productsForStock = products_to_emit_to_stock.map(stap => {
            const findQuantity =
                dispatch.products.find(
                    (item: any) => item.productId === stap.productId
                )?.quantity || 0;
            return {
                //@ts-ignore
                ...stap.dataValues,
                quantity: stap.quantity,
                extraQuantity: findQuantity,
            };
        });

        //Finding all salesArea associated to the stock
        const salesAreas = await Area.findAll({
            where: {
                type: "SALE",
                businessId: user.businessId,
                stockAreaId: dispatch.stockAreaToId,
            },
        });

        await t.commit();

        res.status(200).json({
            dispatch: dispatch_to_return,
            productsForSale,
            productsForStock,
            saleAreaIds: salesAreas.map(item => item.id),
            stockAreaId: dispatch.stockAreaToId,
            action: "FULLACCEPTED",
        });

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "ACCEPT_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        socketQueue.add(
            {
                code: "NOTIFY_USER",
                params: {
                    userToId: dispatch.createdById,
                    message: `${
                        user.displayName || user.username
                    } ha aceptado su despacho generado para ${
                        dispatch.stockAreaTo.name
                    }`,
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
                    productsIds: blockedProducts,
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

//Method only for Tablets
export const rejectDispatchWithReturnProducts = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction(config_transactions);
    try {
        const { dispatchId, userAreaFromId } = req.params;
        const user: User = req.user;

        if (isNaN(dispatchId)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro dispatchId no fue introducido`,
            });
        }

        if (isNaN(userAreaFromId)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro userAreaFromId no fue introducido correctamente`,
            });
        }

        const dispatch = await Dispatch.findByPk(dispatchId, {
            include: [
                OrderReceipt,
                {
                    model: Area,
                    as: "stockAreaTo",
                },
                {
                    model: Area,
                    as: "stockAreaFrom",
                },
                {
                    model: User,
                    as: "receivedBy",
                    paranoid: false,
                },
                {
                    model: User,
                    as: "rejectedBy",
                    paranoid: false,
                },
                {
                    model: DispatchProduct,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                        {
                            model: Price,
                            as: "cost",
                        },
                        Product,
                    ],
                },
                OrderReceipt,
                ProductionOrder,
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(404).json({
                message: `El despacho no fue encontrado`,
            });
        }

        if (dispatch.status === "BILLED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ha sido transformado en factura y no puede aceptarse.`,
            });
        }

        if (dispatch.status === "REJECTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido rechazado por ${
                    dispatch.rejectedBy?.displayName ||
                    dispatch.rejectedBy?.username
                }`,
            });
        }

        if (dispatch.status === "ACCEPTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido aceptado por ${
                    dispatch.receivedBy?.displayName ||
                    dispatch.receivedBy?.username
                }`,
            });
        }

        if (
            dispatch.order &&
            ["BILLED", "CANCELLED"].includes(dispatch.order.status)
        ) {
            t.rollback();
            return res.status(404).json({
                message: `El despacho no puede ser rechazado debido a que la order asociada ha sido cerrada.`,
            });
        }

        //--> INIT BLOCK Resources
        const blockedProducts = Array.from(
            new Set([...dispatch.products.map(item => item.productId)])
        );

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
            },
            lock: true,
            transaction: t,
        });
        await Dispatch.findByPk(dispatchId, {
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        let bulkStockMovements = [];

        dispatch.rejectedById = user.id;
        dispatch.rejectedAt = moment().toDate();
        dispatch.status = "REJECTED";

        if (dispatch.order) {
            //@ts-ignore
            dispatch.order.dispatchId = null;
            await dispatch.save({ transaction: t });
        }

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Checking if rejection was made in the same economicCycle, if not, then new entry registered
        let mustBeAnEntry = false;
        if (
            !dispatch.economicCycleId ||
            !activeEconomicCycle ||
            (activeEconomicCycle &&
                activeEconomicCycle.id !== dispatch.economicCycleId)
        ) {
            mustBeAnEntry = true;
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Checking dependencies
        if (dispatch.order) {
            await OrderReceipt.update(
                {
                    dispatchId: null,
                },
                {
                    where: {
                        dispatchId,
                    },
                    transaction: t,
                }
            );
        }

        if (dispatch.productionOrder) {
            await ProductionOrder.update(
                {
                    dispatchId: null,
                },
                {
                    where: {
                        dispatchId,
                    },
                    transaction: t,
                }
            );
        }

        //Taking into account when dispatch is related with an order no returning must be done, otherwise normal procedure
        if (!dispatch.order) {
            //To
            //Normalyzing data
            const productToAdd = dispatch.products.map(item => {
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
                    areaId: dispatch.stockAreaFromId,
                    businessId: dispatch.stockAreaFrom.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result_to)) {
                t.rollback();
                Logger.warn(
                    result_to.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "rejectDispatchWithReturnProducts/addProductsToStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_to.status).json({
                    message: result_to.message,
                });
            }

            //If is not an entry, It thats means we need to remove all the movements made
            if (!mustBeAnEntry) {
                for (const dispProd of dispatch.products) {
                    bulkStockMovements.push({
                        quantity: dispProd.quantity,
                        productId: dispProd.productId,
                        variationId: dispProd.variationId,
                        description: `Operación procedente de cancelación de un despacho`,
                        areaId: dispatch.stockAreaFromId,

                        //Managed values
                        businessId: dispatch.businessId,
                        movedById: user.id,
                        operation: "REMOVED",
                        accountable: false,
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });
                }

                let stockCreatedObjects;
                if (bulkStockMovements.length !== 0) {
                    //Creating movements
                    stockCreatedObjects = await StockMovement.bulkCreate(
                        bulkStockMovements,
                        {
                            include: [{ model: Price, as: "price" }],
                            transaction: t,
                            returning: true,
                        }
                    );
                }

                let bulkMovementUpdate = [];

                const all_stock_movements = await StockMovement.findAll({
                    where: {
                        dispatchId: dispatch.id,
                    },
                });

                for (const movement of all_stock_movements) {
                    const found = stockCreatedObjects?.find(
                        item =>
                            item.productId === movement.productId &&
                            item.operation === "REMOVED"
                    );

                    if (found) {
                        bulkMovementUpdate.push({
                            id: movement.id,
                            removedOperationId: found.id,
                            quantity: movement.quantity,
                            accountable: false,
                        });
                    }
                }

                if (bulkMovementUpdate.length !== 0) {
                    await StockMovement.bulkCreate(bulkMovementUpdate, {
                        updateOnDuplicate: [
                            "removedOperationId",
                            "accountable",
                            "quantity",
                        ],
                        transaction: t,
                    });
                }
            } else {
                //Otherwise we must to register the products again as entry
                for (const product of dispatch.products) {
                    //Creating asociated movements
                    bulkStockMovements.push({
                        quantity: product.quantity,
                        productId: product.productId,
                        variationId: product.variationId,
                        description: `Entrada a partir del rechazo de despacho ocurrido el ${moment(
                            dispatch.createdAt
                        ).format("DD/MM/YYYY")}`,

                        //Managed values
                        businessId: user.businessId,
                        movedById: user.id,
                        areaId: dispatch.stockAreaFromId,
                        operation: "ENTRY",
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });
                }

                let stockCreatedObjects;
                if (bulkStockMovements.length !== 0) {
                    //Creating movements
                    stockCreatedObjects = await StockMovement.bulkCreate(
                        bulkStockMovements,
                        {
                            transaction: t,
                            returning: true,
                        }
                    );
                }

                let bulkMovementUpdate = [];

                const all_stock_movements = await StockMovement.findAll({
                    where: {
                        dispatchId: dispatch.id,
                    },
                });

                for (const movement of all_stock_movements) {
                    const found = stockCreatedObjects?.find(
                        item =>
                            item.productId === movement.productId &&
                            item.operation === "ENTRY"
                    );

                    if (found) {
                        bulkMovementUpdate.push({
                            id: movement.id,
                            parentId: found.id,
                            quantity: movement.quantity,
                        });
                    }
                }

                if (bulkMovementUpdate.length !== 0) {
                    await StockMovement.bulkCreate(bulkMovementUpdate, {
                        updateOnDuplicate: ["parentId", "quantity"],
                        transaction: t,
                    });
                }
            }

            await dispatch.save({ transaction: t });

            //To_return
            const [
                dispatch_to_return,
                products_to_emit_to_sales,
                products_to_emit_to_stock,
            ] = await Promise.all([
                Dispatch.scope("to_return").findByPk(dispatch.id, {
                    transaction: t,
                }),
                StockAreaProduct.findAll({
                    where: {
                        areaId: dispatch.stockAreaFromId,
                    },
                    include: [
                        {
                            model: Product.scope("to_return"),
                            where: {
                                type: ["STOCK", "VARIATION"],
                                showForSale: true,
                                id: dispatch.products.map(
                                    item => item.productId
                                ),
                                totalQuantity: {
                                    [Op.gt]: 0,
                                },
                            },
                        },
                    ],
                    transaction: t,
                }),
                StockAreaProduct.scope("to_stock").findAll({
                    where: {
                        areaId: dispatch.stockAreaFromId,
                        productId: dispatch.products.map(
                            item => item.productId
                        ),
                    },
                    transaction: t,
                }),
            ]);

            const productsForSale = products_to_emit_to_sales.map(stap => {
                const findQuantity =
                    dispatch.products.find(
                        (item: any) => item.productId === stap.productId
                    )?.quantity || 0;

                return {
                    //@ts-ignore
                    ...stap.product.dataValues,
                    quantity: stap.quantity,
                    extraQuantity: findQuantity,
                    areaId: stap.areaId,
                };
            });

            const productsForStock = products_to_emit_to_stock.map(stap => {
                const findQuantity =
                    dispatch.products.find(
                        (item: any) => item.productId === stap.productId
                    )?.quantity || 0;
                return {
                    //@ts-ignore
                    ...stap.dataValues,
                    quantity: stap.quantity,
                    extraQuantity: findQuantity,
                };
            });

            //Finding all salesArea associated to the stock
            const salesAreas = await Area.findAll({
                where: {
                    type: "SALE",
                    businessId: user.businessId,
                    stockAreaId: dispatch.stockAreaFromId,
                },
            });

            await t.commit();

            res.status(200).json({
                dispatch: dispatch_to_return,
                productsForSale,
                productsForStock,
                saleAreaIds: salesAreas.map(item => item.id),
                stockAreaId: dispatch.stockAreaFromId,
                action: "FULLREJECTED",
            });

            //Generating task to send via Sockets
            socketQueue.add(
                {
                    code: "REJECT_DISPATCH",
                    params: {
                        dispatchId: dispatch.id,
                        from: user.id,
                        fromName: user.displayName || user.username,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );

            socketQueue.add(
                {
                    code: "NOTIFY_USER",
                    params: {
                        userToId: dispatch.createdById,
                        message: `${
                            user.displayName || user.username
                        } ha rechazado el despacho generado para ${
                            dispatch.stockAreaTo.name
                        }`,
                        origin: req.header("X-App-Origin"),
                    },
                },
                { attempts: 1, removeOnComplete: true, removeOnFail: true }
            );

            return;
        }

        await dispatch.save({ transaction: t });

        const dispatch_to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            {
                transaction: t,
            }
        );

        await t.commit();

        res.status(200).json({
            dispatch: dispatch_to_return,
            action: "WITHORDERREJECTED",
        });

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "UPDATE_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
                    from: user.id,
                    fromName: user.displayName || user.username,
                    origin: req.header("X-App-Origin"),
                },
            },
            { attempts: 1, removeOnComplete: true, removeOnFail: true }
        );

        socketQueue.add(
            {
                code: "NOTIFY_USER",
                params: {
                    userToId: dispatch.createdById,
                    message: `${
                        user.displayName || user.username
                    } ha rechazado el despacho generado para ${
                        dispatch.stockAreaTo.name
                    }`,
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
                    productsIds: blockedProducts,
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

//Method for the Web
export const rejectDispatch = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    try {
        const { dispatchId } = req.params;
        const user: User = req.user;

        if (!dispatchId) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const dispatch = await Dispatch.findByPk(dispatchId, {
            include: [
                {
                    model: Area,
                    as: "stockAreaTo",
                },
                {
                    model: Area,
                    as: "stockAreaFrom",
                },
                {
                    model: User,
                    as: "receivedBy",
                    paranoid: false,
                },
                {
                    model: User,
                    as: "rejectedBy",
                    paranoid: false,
                },
                {
                    model: DispatchProduct,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                        {
                            model: Price,
                            as: "cost",
                        },
                        Product,
                    ],
                },
                OrderReceipt,
                ProductionOrder,
            ],
            transaction: t,
        });

        if (!dispatch) {
            t.rollback();
            return res.status(404).json({
                message: `El despacho no fue encontrado`,
            });
        }

        if (dispatch.status === "BILLED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ha sido transformado en factura y no puede aceptarse.`,
            });
        }

        if (dispatch.status === "REJECTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido rechazado por ${
                    dispatch.rejectedBy?.displayName ||
                    dispatch.rejectedBy?.username
                }`,
            });
        }

        if (dispatch.status === "ACCEPTED") {
            t.rollback();
            return res.status(400).json({
                message: `El despacho ya ha sido aceptado por ${
                    dispatch.receivedBy?.displayName ||
                    dispatch.receivedBy?.username
                }`,
            });
        }

        //--> INIT BLOCK Resources
        const blockedProducts = Array.from(
            new Set([...dispatch.products.map(item => item.productId)])
        );

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
            },
            lock: true,
            transaction: t,
        });

        await Dispatch.findByPk(dispatchId, {
            lock: true,
            transaction: t,
        });
        //--> END BLOCK Resources

        const activeEconomicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        //Checking if rejection was made in the same economicCycle, if not, then new entry registered
        let mustBeAnEntry = false;
        if (
            !dispatch.economicCycleId ||
            !activeEconomicCycle ||
            (activeEconomicCycle &&
                activeEconomicCycle.id !== dispatch.economicCycleId)
        ) {
            mustBeAnEntry = true;
        }

        let bulkStockMovements = [];

        dispatch.rejectedById = user.id;
        dispatch.rejectedAt = moment().toDate();
        dispatch.status = "REJECTED";

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);
        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //Checking dependencies
        if (dispatch.order) {
            await OrderReceipt.update(
                {
                    dispatchId: null,
                },
                {
                    where: {
                        dispatchId,
                    },
                    transaction: t,
                }
            );
        }

        if (dispatch.productionOrder) {
            await ProductionOrder.update(
                {
                    dispatchId: null,
                },
                {
                    where: {
                        dispatchId,
                    },
                    transaction: t,
                }
            );
        }

        if (dispatch.buyedReceipt) {
            await BuyedReceipt.update(
                {
                    dispatchId: null,
                },
                {
                    where: {
                        dispatchId,
                    },
                    transaction: t,
                }
            );
        }

        //Taking into account when dispatch is related with an order no returning must be done, otherwise normal procedure
        if (!dispatch.order) {
            //To
            //Normalyzing data
            const productToAdd = dispatch.products.map(item => {
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
                    areaId: dispatch.stockAreaFromId,
                    businessId: dispatch.stockAreaFrom.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result_to)) {
                t.rollback();
                Logger.warn(
                    result_to.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "rejectDispatch/addProductsToStockArea",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result_to.status).json({
                    message: result_to.message,
                });
            }

            //If is not an entry, It thats means we need to remove all the movements made
            if (!mustBeAnEntry) {
                for (const dispProd of dispatch.products) {
                    bulkStockMovements.push({
                        quantity: dispProd.quantity,
                        productId: dispProd.productId,
                        variationId: dispProd.variationId,
                        description: `Operación procedente de cancelación de un despacho`,
                        areaId: dispatch.stockAreaFromId,

                        //Managed values
                        businessId: dispatch.businessId,
                        movedById: user.id,
                        operation: "REMOVED",
                        accountable: false,
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });
                }

                let stockCreatedObjects;
                if (bulkStockMovements.length !== 0) {
                    //Creating movements
                    stockCreatedObjects = await StockMovement.bulkCreate(
                        bulkStockMovements,
                        {
                            include: [{ model: Price, as: "price" }],
                            transaction: t,
                            returning: true,
                        }
                    );
                }

                let bulkMovementUpdate = [];

                const all_stock_movements = await StockMovement.findAll({
                    where: {
                        dispatchId: dispatch.id,
                    },
                });

                for (const movement of all_stock_movements) {
                    const found = stockCreatedObjects?.find(
                        item =>
                            item.productId === movement.productId &&
                            item.operation === "REMOVED"
                    );

                    if (found) {
                        bulkMovementUpdate.push({
                            id: movement.id,
                            removedOperationId: found.id,
                            quantity: movement.quantity,
                            accountable: false,
                        });
                    }
                }

                if (bulkMovementUpdate.length !== 0) {
                    await StockMovement.bulkCreate(bulkMovementUpdate, {
                        updateOnDuplicate: [
                            "removedOperationId",
                            "accountable",
                            "quantity",
                        ],
                        transaction: t,
                    });
                }
            } else {
                //Otherwise we must to register the products again as entry
                for (const product of dispatch.products) {
                    //Creating asociated movements
                    bulkStockMovements.push({
                        quantity: product.quantity,
                        productId: product.productId,
                        variationId: product.variationId,
                        description: `Entrada a partir del rechazo de despacho ocurrido el ${moment(
                            dispatch.createdAt
                        ).format("DD/MM/YYYY")}`,

                        //Managed values
                        businessId: user.businessId,
                        movedById: user.id,
                        areaId: dispatch.stockAreaFromId,
                        operation: "ENTRY",
                        dispatchId,
                        economicCycleId: activeEconomicCycle?.id,
                    });
                }

                let stockCreatedObjects;
                if (bulkStockMovements.length !== 0) {
                    //Creating movements
                    stockCreatedObjects = await StockMovement.bulkCreate(
                        bulkStockMovements,
                        {
                            transaction: t,
                            returning: true,
                        }
                    );
                }

                let bulkMovementUpdate = [];

                const all_stock_movements = await StockMovement.findAll({
                    where: {
                        dispatchId: dispatch.id,
                    },
                });

                for (const movement of all_stock_movements) {
                    const found = stockCreatedObjects?.find(
                        item =>
                            item.productId === movement.productId &&
                            item.operation === "ENTRY"
                    );

                    if (found) {
                        bulkMovementUpdate.push({
                            id: movement.id,
                            parentId: found.id,
                            quantity: movement.quantity,
                        });
                    }
                }

                if (bulkMovementUpdate.length !== 0) {
                    await StockMovement.bulkCreate(bulkMovementUpdate, {
                        updateOnDuplicate: ["parentId", "quantity"],
                        transaction: t,
                    });
                }
            }
        }

        await dispatch.save({ transaction: t });

        const to_return = await Dispatch.scope("to_return").findByPk(
            dispatch.id,
            { transaction: t }
        );

        await t.commit();

        res.status(200).json(to_return);

        //Generating task to send via Sockets
        socketQueue.add(
            {
                code: "UPDATE_DISPATCH",
                params: {
                    dispatchId: dispatch.id,
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
                    productsIds: blockedProducts,
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

//Small reports
export const getPendingDispatches = async (req: any, res: Response) => {
    try {
        const { businessId } = req.params;
        const user: User = req.user;

        if (Number(businessId) !== user.businessId) {
            return res.status(403).json({
                message: "No tiene permisos para realizar esta acción.",
            });
        }

        const found_dispatches = await Dispatch.count({
            where: {
                businessId,
                status: "CREATED",
            },
        });

        res.status(200).json({
            pending: found_dispatches,
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
