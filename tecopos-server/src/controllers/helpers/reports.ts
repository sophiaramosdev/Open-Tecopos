import { Transaction } from "sequelize";
import moment from "moment";
import { Op, where, fn, col } from "sequelize";

import EconomicCycle from "../../database/models/economicCycle";
import Area from "../../database/models/area";
import PriceSystem from "../../database/models/priceSystem";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Product from "../../database/models/product";
import ProductCategory from "../../database/models/productCategory";
import StockAreaBook from "../../database/models/stockAreaBook";
import Image from "../../database/models/image";
import { InternalHelperResponse } from "./interfaces";
import OrderReceipt from "../../database/models/orderReceipt";
import User from "../../database/models/user";
import { GeneralAreaIncome } from "../../interfaces/models";
import StockMovement from "../../database/models/stockMovement";
import SelledProduct from "../../database/models/selledProduct";
import Price from "../../database/models/price";
import {
    exchangeCurrency,
    mathOperation,
    normalizingCurrenciesToMeta,
    truncateValue,
} from "../../helpers/utils";
import FundDestination from "../../database/models/fundDestination";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import {
    accountOperationType,
    cash_registers_operations,
    payments_ways,
} from "../../interfaces/nomenclators";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import CurrencyPayment from "../../database/models/currencyPayment";
import { getOrderStatus, getTitleOrderRecord } from "../../helpers/translator";
import Account from "../../database/models/account";
import AccountOperation from "../../database/models/accountOperation";
import ProductPrice from "../../database/models/productPrice";
import Logger from "../../lib/logger";
import Store from "../../database/models/store";
import {
    ExtendedPrice,
    IPVStateProduct,
    IPVStateVariation,
    SimplePrice,
} from "../../interfaces/commons";
import AccountTag from "../../database/models/accountTag";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Variation from "../../database/models/variation";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import Business from "../../database/models/business";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import OrderReceiptModifier from "../../database/models/orderReceiptModifier";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";

export const openEconomicCycle = async (
    initialData: {
        businessId: number;
        userId?: number;
        name?: string;
        observations?: string;
        priceSystemId?: number;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //1. Checking if any Economic Cycle is open
    const activeEconomicCycle = await EconomicCycle.findOne({
        where: {
            businessId: initialData.businessId,
            isActive: true,
        },
        transaction: childt,
    });

    if (activeEconomicCycle) {
        return {
            status: 400,
            message: `Ya existe un ciclo económico activo. Tome una acción con este antes de continuar.`,
        };
    }

    //Finding all stock areas associated to bussines
    const stock_areas_found = await Area.findAll({
        where: {
            businessId: initialData.businessId,
            type: "STOCK",
            isActive: true,
        },
        transaction: childt,
    });

    let bulkBooks = [];

    const economiccycle: EconomicCycle = EconomicCycle.build({
        name: initialData.name,
        observations: initialData.observations,
        businessId: initialData.businessId,
        openById: initialData.userId ?? 1,
        openDate: moment().toDate(),
        isActive: true,
    });

    if (initialData.priceSystemId) {
        //Checking systemPrice
        const priceSystem = await PriceSystem.findByPk(
            initialData.priceSystemId
        );

        if (!priceSystem) {
            return {
                status: 400,
                message: "El sistema de precios definido no fue encontrado.",
            };
        }

        economiccycle.priceSystemId = initialData.priceSystemId;
    } else {
        const priceSystem = await PriceSystem.findOne({
            where: {
                isMain: true,
                businessId: initialData.businessId,
            },
            transaction: childt,
        });

        if (!priceSystem) {
            return {
                status: 404,
                message: `No se encontró un sistema de precios en el sistema`,
            };
        }

        economiccycle.priceSystemId = priceSystem.id;
    }

    await economiccycle.save({ transaction: childt });

    //Transfering order to next economic cycle
    const configurations = await getBusinessConfigCache(initialData.businessId);

    const transfer_orders_to_next_economic_cycle =
        configurations.find(
            item => item.key === "transfer_orders_to_next_economic_cycle"
        )?.value === "true";

    if (transfer_orders_to_next_economic_cycle) {
        const foundAffectedOrders = await OrderReceipt.findAll({
            where: {
                economicCycleId: {
                    [Op.not]: null,
                },
                status: "PAYMENT_PENDING",
                businessId: initialData.businessId,
            },
            transaction: childt,
        });

        let listBulkUpdate = [];
        let listBulkToRecord = [];
        for (const order of foundAffectedOrders) {
            listBulkUpdate.push({
                economicCycleId: economiccycle.id,
                status: "IN_PROCESS",
                id: order.id,
            });

            listBulkToRecord.push({
                action: "ORDER_EDITED",
                title: getTitleOrderRecord("ORDER_EDITED"),
                details: `Cambio de estado de ${getOrderStatus(
                    order.status
                )} a En proceso por apertura de Ciclo económico.`,
                orderReceiptId: order.id,
                madeById: 1,
            });
        }

        await OrderReceipt.bulkCreate(listBulkUpdate, {
            updateOnDuplicate: ["status", "economicCycleId"],
            transaction: childt,
        });

        await OrderReceiptRecord.bulkCreate(listBulkToRecord, {
            transaction: childt,
        });
    }

    //Processing Inventory
    for (const area of stock_areas_found) {
        let processed_data: Array<IPVStateProduct> = [];

        let stock_area_book: any = {
            operation: "OPEN",
            madeById: initialData.userId ?? 1,
            areaId: area.id,
            economicCycleId: economiccycle.id,
        };

        const stock_area_products = await StockAreaProduct.findAll({
            where: {
                areaId: area.id,
            },
            include: [
                {
                    model: Product,
                    attributes: ["id", "name", "measure"],
                    include: [
                        ProductCategory,
                        {
                            model: Image,
                            as: "images",
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: StockAreaVariation,
                    include: [{ model: Variation, paranoid: false }],
                },
            ],
            transaction: childt,
        });

        for (const stock_product of stock_area_products) {
            let variations: any = [];
            //Analyzing if variations
            if (stock_product.type === "VARIATION") {
                stock_product.variations.forEach(item => {
                    variations.push({
                        variationId: item.variationId,
                        name: item.variation?.name,
                        inStock: item.quantity,
                        initial: item.quantity,
                        entry: 0,
                        movements: 0,
                        outs: 0,
                        sales: 0,
                        onlineSales: 0,
                        processed: 0,
                        waste: 0,
                    });
                });
            }

            processed_data.push({
                stockProductId: stock_product.id,
                productId: stock_product.productId,
                name: stock_product.product.name,
                image: stock_product.product.images?.[0]?.thumbnail,
                measure: stock_product.product.measure,
                productCategory:
                    stock_product.product?.productCategory?.name ??
                    "Sin categoría",
                productCategoryId:
                    stock_product.product?.productCategory?.id ?? null,
                inStock: stock_product.quantity,
                initial: stock_product.quantity,
                entry: 0,
                movements: 0,
                outs: 0,
                sales: 0,
                onlineSales: 0,
                processed: 0,
                waste: 0,
                variations,

                //New properties
                enableGroup: stock_product.product.enableGroup,
                groupName: stock_product.product.groupName,
                groupConvertion: stock_product.product.groupConvertion,
            });
        }

        stock_area_book.state = JSON.stringify(processed_data);

        bulkBooks.push(stock_area_book);
    }

    await StockAreaBook.bulkCreate(bulkBooks, {
        transaction: childt,
    });

    //Emit via Scokets - Send is open
    (global as any).socket
        ?.to(`business:${initialData.businessId}`)
        .emit("economicCycle/open", {
            from: initialData.userId ?? 1,
        });

    return {
        status: 200,
        data: { economiccycle },
    };
};

export const obtainAreaProcessedMovements = async (initialData: {
    businessId: number;
    areaId: number;
    userId?: number;
    precission?: string;
    initialState: Array<IPVStateProduct>;
    initAt: string | Date;
    economicCyle?: EconomicCycle;
    from?: "store" | "stock-book";
}) => {
    //Normalizing recevied values
    const precission_after_coma = initialData.precission;
    let processed_data: Array<IPVStateProduct> = [];
    let book_initial_state = initialData.initialState;

    let include_where: any = {};
    if (initialData.economicCyle) {
        include_where.economicCycleId = initialData.economicCyle.id;
    }

    let [
        area_movements,
        area_online_sales,
        sales_products,
        stock_area_products,
    ] = await Promise.all([
        StockMovement.findAll({
            where: {
                businessId: initialData.businessId,
                areaId: initialData.areaId,
                accountable: true,
                operation: {
                    [Op.or]: [
                        "MOVEMENT",
                        "ENTRY",
                        "OUT",
                        "PROCESSED",
                        "WASTE",
                        "TRANSFORMATION",
                        "SALE",
                    ],
                },
                createdAt: {
                    [Op.gte]: initialData.initAt,
                },
            },
            include: [
                {
                    model: Variation,
                    paranoid: false,
                },
            ],
        }),
        SelledProduct.findAll({
            where: {
                areaId: initialData.areaId,
                type: ["STOCK", "VARIATION"],
                createdAt: {
                    [Op.gte]: initialData.initAt,
                },
            },
            include: [
                {
                    model: OrderReceipt,
                    where: {
                        origin: ["online", "woo"],
                    },
                },
                {
                    model: Variation,
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "priceTotal",
                },
                {
                    model: Price,
                    as: "priceUnitary",
                },
            ],
        }),
        SelledProduct.findAll({
            where: {
                ...include_where,
                areaId: initialData.areaId,
                type: ["STOCK", "VARIATION"],
                createdAt: {
                    [Op.gte]: initialData.initAt,
                },
            },
            include: [
                {
                    model: OrderReceipt,
                    where: {
                        status: ["BILLED"],
                        origin: "pos",
                    },
                },
                {
                    model: Price,
                    as: "priceTotal",
                },
                {
                    model: Price,
                    as: "priceUnitary",
                },
            ],
        }),
        StockAreaProduct.findAll({
            where: {
                areaId: initialData.areaId,
            },
            include: [
                {
                    model: Product,
                    include: [
                        ProductCategory,
                        {
                            model: Image,
                            as: "images",
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: StockAreaVariation,
                    include: [
                        {
                            model: Variation,
                            paranoid: false,
                        },
                    ],
                },
            ],
        }),
    ]);

    //Finding all stock products
    let stock_movement_to_build: Partial<StockMovement>[] = [];
    const blankIPVStateVariation = {
        initial: 0,
        inStock: 0,
        entry: 0,
        movements: 0,
        outs: 0,
        sales: 0,
        onlineSales: 0,
        processed: 0,
        waste: 0,
    };

    //Creating generic functions
    const updateInitialBook = (productId: number) => {
        const initial_book_found = book_initial_state.find(
            item => item.productId === productId
        );
        if (initial_book_found) {
            book_initial_state = book_initial_state.filter(
                item => item.productId !== initial_book_found.productId
            );
        }

        let initial = initial_book_found?.initial;
        if (initialData.from === "store") {
            initial = initial_book_found?.inStock;
        }

        return {
            initial: initial || 0,
            variations: initial_book_found?.variations || [],
        };
    };

    const updateMovements = (productId: number) => {
        let entry = 0;
        let movements = 0;
        let outs = 0;
        let processed = 0;
        let waste = 0;
        let registered_sales = 0;
        let registered_online_sales = 0;

        let variations: Array<IPVStateVariation> = [];

        const product_movements = area_movements.filter(
            item => item.productId === productId
        );
        const ids = product_movements.map(item => item.id);

        if (product_movements.length !== 0) {
            product_movements.forEach(item => {
                if (item.operation === "ENTRY") {
                    entry = mathOperation(
                        entry,
                        item.quantity,
                        "addition",
                        precission_after_coma
                    );

                    //Analyzing VARIATION
                    if (item.variationId) {
                        const foundIndex = variations.findIndex(
                            element => element.variationId === item.variationId
                        );
                        if (foundIndex !== -1) {
                            variations[foundIndex].entry = mathOperation(
                                variations[foundIndex].entry,
                                item.quantity,
                                "addition",
                                precission_after_coma
                            );
                        } else {
                            variations.push({
                                ...blankIPVStateVariation,
                                entry: item.quantity,
                                variationId: item.variationId,
                                name: item.variation?.name,
                            });
                        }
                    }
                } else if (item.operation === "MOVEMENT") {
                    movements = mathOperation(
                        movements,
                        Math.abs(item.quantity),
                        "addition",
                        precission_after_coma
                    );

                    //Analyzing VARIATION
                    if (item.variationId) {
                        const foundIndex = variations.findIndex(
                            element => element.variationId === item.variationId
                        );
                        if (foundIndex !== -1) {
                            variations[foundIndex].movements = mathOperation(
                                variations[foundIndex].movements,
                                Math.abs(item.quantity),
                                "addition",
                                precission_after_coma
                            );
                        } else {
                            variations.push({
                                ...blankIPVStateVariation,
                                movements: Math.abs(item.quantity),
                                variationId: item.variationId,
                                name: item.variation?.name,
                            });
                        }
                    }
                } else if (item.operation === "OUT") {
                    outs = mathOperation(
                        outs,
                        Math.abs(item.quantity),
                        "addition",
                        precission_after_coma
                    );

                    //Analyzing VARIATION
                    if (item.variationId) {
                        const foundIndex = variations.findIndex(
                            element => element.variationId === item.variationId
                        );
                        if (foundIndex !== -1) {
                            variations[foundIndex].outs = mathOperation(
                                variations[foundIndex].outs,
                                Math.abs(item.quantity),
                                "addition",
                                precission_after_coma
                            );
                        } else {
                            variations.push({
                                ...blankIPVStateVariation,
                                outs: Math.abs(item.quantity),
                                variationId: item.variationId,
                                name: item.variation?.name,
                            });
                        }
                    }
                } else if (
                    item.operation === "PROCESSED" ||
                    item.operation === "TRANSFORMATION"
                ) {
                    processed = mathOperation(
                        processed,
                        Math.abs(item.quantity),
                        "addition",
                        precission_after_coma
                    );

                    //Analyzing VARIATION
                    if (item.variationId) {
                        const foundIndex = variations.findIndex(
                            element => element.variationId === item.variationId
                        );
                        if (foundIndex !== -1) {
                            variations[foundIndex].processed = mathOperation(
                                variations[foundIndex].processed,
                                Math.abs(item.quantity),
                                "addition",
                                precission_after_coma
                            );
                        } else {
                            variations.push({
                                ...blankIPVStateVariation,
                                processed: Math.abs(item.quantity),
                                variationId: item.variationId,
                                name: item.variation?.name,
                            });
                        }
                    }
                } else if (item.operation === "WASTE") {
                    waste = mathOperation(
                        waste,
                        Math.abs(item.quantity),
                        "addition",
                        precission_after_coma
                    );

                    //Analyzing VARIATION
                    if (item.variationId) {
                        const foundIndex = variations.findIndex(
                            element => element.variationId === item.variationId
                        );
                        if (foundIndex !== -1) {
                            variations[foundIndex].waste = mathOperation(
                                variations[foundIndex].waste,
                                Math.abs(item.quantity),
                                "addition",
                                precission_after_coma
                            );
                        } else {
                            variations.push({
                                ...blankIPVStateVariation,
                                waste: Math.abs(item.quantity),
                                variationId: item.variationId,
                                name: item.variation?.name,
                            });
                        }
                    }
                }

                //Removed temporary for info duplication
                // else if (item.operation === "SALE") {
                //     if (item.economicCycleId) {
                //         registered_sales = mathOperation(
                //             registered_sales,
                //             Math.abs(item.quantity),
                //             "addition",
                //             precission_after_coma
                //         );

                //         //Analyzing VARIATION
                //         if (item.variationId) {
                //             const foundIndex = variations.findIndex(
                //                 element =>
                //                     element.variationId === item.variationId
                //             );
                //             if (foundIndex !== -1) {
                //                 variations[foundIndex].sales = mathOperation(
                //                     variations[foundIndex].sales,
                //                     Math.abs(item.quantity),
                //                     "addition",
                //                     precission_after_coma
                //                 );
                //             } else {
                //                 variations.push({
                //                     ...blankIPVStateVariation,
                //                     sales: Math.abs(item.quantity),
                //                     variationId: item.variationId,
                //                     name: item.variation?.name,
                //                 });
                //             }
                //         }
                //     } else {
                //         registered_online_sales = mathOperation(
                //             registered_online_sales,
                //             Math.abs(item.quantity),
                //             "addition",
                //             precission_after_coma
                //         );

                //         //Analyzing VARIATION
                //         if (item.variationId) {
                //             const foundIndex = variations.findIndex(
                //                 element =>
                //                     element.variationId === item.variationId
                //             );
                //             if (foundIndex !== -1) {
                //                 variations[foundIndex].onlineSales =
                //                     mathOperation(
                //                         variations[foundIndex].onlineSales,
                //                         Math.abs(item.quantity),
                //                         "addition",
                //                         precission_after_coma
                //                     );
                //             } else {
                //                 variations.push({
                //                     ...blankIPVStateVariation,
                //                     onlineSales: Math.abs(item.quantity),
                //                     variationId: item.variationId,
                //                     name: item.variation?.name,
                //                 });
                //             }
                //         }
                //     }
                // }
            });

            //Deleting movements to avoid duplication in counting
            area_movements = area_movements.filter(
                item => !ids.includes(item.id)
            );
        }

        return {
            entry,
            movements,
            outs,
            processed,
            waste,
            registered_sales,
            registered_online_sales,
            variations,
        };
    };

    const updateSales = (productId: number) => {
        let sales = 0;
        let online_sales = 0;

        let variations: Array<IPVStateVariation> = [];
        let variationsPrices: Array<{ variationId: number; priceId: number }> =
            [];

        const found_sales = sales_products.filter(
            item => item.productId === productId
        );
        const ids = found_sales.map(item => item.id);

        if (found_sales.length !== 0) {
            found_sales.forEach(item => {
                sales = mathOperation(
                    sales,
                    item.quantity,
                    "addition",
                    precission_after_coma
                );

                //Analyzing VARIATION
                if (item.variationId) {
                    const foundIndex = variations.findIndex(
                        element => element.variationId === item.variationId
                    );
                    if (foundIndex !== -1) {
                        variations[foundIndex].sales = mathOperation(
                            variations[foundIndex].sales,
                            Math.abs(item.quantity),
                            "addition",
                            precission_after_coma
                        );
                    } else {
                        variations.push({
                            ...blankIPVStateVariation,
                            sales: Math.abs(item.quantity),
                            variationId: item.variationId,
                            name: item.variation?.name,
                        });
                        variationsPrices.push({
                            variationId: item.variationId,
                            priceId: item.priceUnitaryId,
                        });
                    }
                }
            });

            //Converting sales product in Sales Movements
            if (sales !== 0) {
                if (variations.length === 0) {
                    stock_movement_to_build.push({
                        quantity: Math.abs(sales) * -1,
                        productId,
                        areaId: initialData.areaId,
                        businessId: initialData.businessId,
                        movedById: initialData.userId ?? 1,
                        operation: "SALE",
                        description:
                            "Venta directa al cierre de Ciclo económico.",
                        priceId: found_sales[0].priceUnitaryId,
                        economicCycleId: initialData.economicCyle?.id,
                    });
                } else {
                    variations.forEach(item => {
                        const priceId = variationsPrices.find(
                            element => element.variationId === item.variationId
                        )?.priceId;

                        stock_movement_to_build.push({
                            quantity: Math.abs(sales) * -1,
                            productId,
                            variationId: item.variationId,
                            areaId: initialData.areaId,
                            businessId: initialData.businessId,
                            movedById: initialData.userId ?? 1,
                            operation: "SALE",
                            description:
                                "Venta directa al cierre de Ciclo económico.",
                            priceId: priceId || found_sales[0].priceUnitaryId,
                            economicCycleId: initialData.economicCyle?.id,
                        });
                    });
                }
            }

            sales_products = sales_products.filter(
                item => !ids.includes(item.id)
            );
        }

        const found_online_sales = area_online_sales.filter(
            item => item.productId === productId
        );
        const online_ids = area_online_sales.map(item => item.id);

        if (found_online_sales.length !== 0) {
            const variationId = found_online_sales[0].variationId;

            found_online_sales.forEach(item => {
                online_sales = mathOperation(
                    online_sales,
                    item.quantity,
                    "addition",
                    precission_after_coma
                );

                //Analyzing VARIATION
                if (item.variationId) {
                    const foundIndex = variations.findIndex(
                        element => element.variationId === item.variationId
                    );
                    if (foundIndex !== -1) {
                        variations[foundIndex].onlineSales = mathOperation(
                            variations[foundIndex].onlineSales,
                            Math.abs(item.quantity),
                            "addition",
                            precission_after_coma
                        );
                    } else {
                        variations.push({
                            ...blankIPVStateVariation,
                            onlineSales: Math.abs(item.quantity),
                            variationId: item.variationId,
                            name: item.variation?.name,
                        });
                    }
                }
            });

            //Converting sales product in Sales Movements
            if (online_sales !== 0) {
                stock_movement_to_build.push({
                    quantity: Math.abs(online_sales) * -1,
                    productId,
                    variationId,
                    areaId: initialData.areaId,
                    businessId: initialData.businessId,
                    movedById: initialData.userId ?? 1,
                    operation: "SALE",
                    description: "Venta en tienda online",
                    priceId: found_online_sales[0].priceUnitaryId,
                });
            }

            area_online_sales = area_online_sales.filter(
                item => !online_ids.includes(item.id)
            );
        }

        return {
            sales,
            online_sales,
            variations,
        };
    };

    const contactArrayVariations = (
        init: Array<IPVStateVariation>,
        append: Array<IPVStateVariation>
    ) => {
        let mixedArray = init;
        for (const stateVar of append) {
            const foundVariationIndex = mixedArray.findIndex(
                item => item.variationId === stateVar.variationId
            );
            if (foundVariationIndex !== -1) {
                mixedArray[foundVariationIndex].entry = mathOperation(
                    mixedArray[foundVariationIndex].entry,
                    stateVar.entry,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].movements = mathOperation(
                    mixedArray[foundVariationIndex].movements,
                    stateVar.movements,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].processed = mathOperation(
                    mixedArray[foundVariationIndex].processed,
                    stateVar.processed,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].outs = mathOperation(
                    mixedArray[foundVariationIndex].outs,
                    stateVar.outs,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].waste = mathOperation(
                    mixedArray[foundVariationIndex].waste,
                    stateVar.waste,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].onlineSales = mathOperation(
                    mixedArray[foundVariationIndex].onlineSales,
                    stateVar.onlineSales,
                    "addition",
                    precission_after_coma
                );
                mixedArray[foundVariationIndex].sales = mathOperation(
                    mixedArray[foundVariationIndex].sales,
                    stateVar.sales,
                    "addition",
                    precission_after_coma
                );
            } else {
                mixedArray.push(stateVar);
            }
        }

        return mixedArray;
    };

    const processArrayVariations = (
        stock_product: StockAreaProduct | undefined,
        init: Array<IPVStateVariation>
    ) => {
        let finalArray = [];

        for (const item of init) {
            const foundInStock = stock_product?.variations.find(
                element => element.variationId === item.variationId
            );
            let inStock = foundInStock?.quantity || 0;

            //Processing indirect sales
            let indirect_sales = mathOperation(
                item.initial,
                item.entry,
                "addition",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.outs,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.sales,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.processed,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.movements,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.waste,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                item.onlineSales,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                inStock,
                indirect_sales,
                "subtraction",
                precission_after_coma
            );

            //Registering operations if indirect sales is not cero
            const disregardValue = mathOperation(
                Math.abs(indirect_sales),
                0,
                "addition",
                precission_after_coma
                    ? Number(precission_after_coma) - 1
                    : precission_after_coma
            );
            if (!(disregardValue > 0)) {
                indirect_sales = 0;
            }

            //Sales
            const sales = mathOperation(
                item.sales,
                indirect_sales,
                "addition",
                precission_after_coma
            );

            finalArray.push({
                ...item,
                movements: item.movements * -1,
                outs: item.outs * -1,
                sales: sales * -1,
                onlineSales: item.onlineSales * -1,
                processed: item.processed * -1,
                waste: item.waste * -1,
                inStock,
            });
        }

        return finalArray;
    };

    //Processing actual existences
    for (const stock_product of stock_area_products) {
        let variations: Array<IPVStateVariation> = [];

        const initial = updateInitialBook(stock_product.productId);
        const movements_data = updateMovements(stock_product.productId);
        if (
            (movements_data.variations &&
                movements_data.variations.length !== 0) ||
            initial.variations.length !== 0
        ) {
            variations = contactArrayVariations(
                initial.variations,
                movements_data.variations
            );
        }

        const sales_data = updateSales(stock_product.productId);
        if (sales_data.variations.length !== 0) {
            variations = contactArrayVariations(
                variations,
                sales_data.variations
            );
        }

        if (variations.length !== 0) {
            variations = processArrayVariations(stock_product, variations);
        }

        const entry = movements_data.entry;
        const movements = movements_data.movements;
        const processed = movements_data.processed;
        const outs = movements_data.outs;
        const waste = movements_data.waste;
        const online_sales = mathOperation(
            sales_data.online_sales,
            movements_data.registered_online_sales,
            "addition",
            precission_after_coma
        );
        const direct_sales = mathOperation(
            sales_data.sales,
            movements_data.registered_sales,
            "addition",
            precission_after_coma
        );

        //Processing indirect sales
        let indirect_sales = mathOperation(
            initial.initial,
            entry,
            "addition",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            outs,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            direct_sales,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            processed,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            movements,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            waste,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            indirect_sales,
            online_sales,
            "subtraction",
            precission_after_coma
        );
        indirect_sales = mathOperation(
            stock_product.quantity,
            indirect_sales,
            "subtraction",
            precission_after_coma
        );

        //Registering operations if indirect sales is not cero
        const disregardValue = mathOperation(
            Math.abs(indirect_sales),
            0,
            "addition",
            precission_after_coma
                ? Number(precission_after_coma) - 1
                : precission_after_coma
        );
        if (disregardValue > 0) {
            stock_movement_to_build.push({
                quantity: Math.abs(indirect_sales) * -1,
                productId: stock_product.productId,
                areaId: initialData.areaId,
                businessId: initialData.businessId,
                movedById: 1,
                operation: "SALE",
                description:
                    "Venta indirecta (ajuste de sistema por proceso de elaboración/producto incluido en Combo o en Ficha de costo).",
                economicCycleId: initialData.economicCyle?.id,
            });
        } else {
            indirect_sales = 0;
        }

        //Sales
        const sales = mathOperation(
            direct_sales,
            Math.abs(indirect_sales),
            "addition",
            precission_after_coma
        );

        processed_data.push({
            stockProductId: stock_product.id,
            productId: stock_product.productId,
            name: stock_product.product.name,
            image: stock_product.product.images?.[0]?.thumbnail,
            measure: stock_product.product.measure,
            productCategory:
                stock_product.product.productCategory?.name ?? "Sin categoría",
            productCategoryId:
                stock_product.product.productCategory?.id ?? null,
            inStock: stock_product.quantity,
            entry,
            initial: initial.initial,
            movements: movements * -1,
            outs: outs * -1,
            sales: sales * -1,
            onlineSales: online_sales * -1,
            processed: processed * -1,
            waste: waste * -1,
            variations,

            //New properties
            enableGroup: stock_product.product.enableGroup,
            groupName: stock_product.product.groupName,
            groupConvertion: stock_product.product.groupConvertion,
        });
    }

    //Including products remains in open action
    if (book_initial_state.length !== 0) {
        const bookStockProducts = await StockAreaProduct.findAll({
            where: {
                id: book_initial_state.map(item => item.stockProductId),
            },
            include: [
                {
                    model: StockAreaVariation,
                    include: [
                        {
                            model: Variation,
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
        });

        for (const book_product of book_initial_state) {
            let variations: Array<IPVStateVariation> = [];

            const initial = book_product.initial;
            const movements_data = updateMovements(book_product.productId);

            if (
                (movements_data.variations &&
                    movements_data.variations.length !== 0) ||
                (book_product.variations &&
                    book_product.variations.length !== 0)
            ) {
                variations = contactArrayVariations(
                    book_product.variations,
                    movements_data.variations
                );
            }

            const sales_data = updateSales(book_product.productId);

            if (sales_data.variations.length !== 0) {
                variations = contactArrayVariations(
                    variations,
                    sales_data.variations
                );
            }

            if (variations.length !== 0) {
                const stock_product = bookStockProducts.find(
                    item => item.id === book_product.stockProductId
                );
                variations = processArrayVariations(stock_product, variations);
            }

            const entry = movements_data.entry;
            const movements = movements_data.movements;
            const processed = movements_data.processed;
            const outs = movements_data.outs;
            const waste = movements_data.waste;
            const online_sales = mathOperation(
                sales_data.online_sales,
                movements_data.registered_online_sales,
                "addition",
                precission_after_coma
            );
            const direct_sales = mathOperation(
                sales_data.sales,
                movements_data.registered_sales,
                "addition",
                precission_after_coma
            );

            //Processing indirect sales
            let indirect_sales = mathOperation(
                initial,
                entry,
                "addition",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                outs,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                direct_sales,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                processed,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                movements,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                waste,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                online_sales,
                "subtraction",
                precission_after_coma
            );

            const disregardValue = mathOperation(
                Math.abs(indirect_sales),
                0,
                "addition",
                precission_after_coma
                    ? Number(precission_after_coma) - 1
                    : precission_after_coma
            );

            if (disregardValue > 0) {
                stock_movement_to_build.push({
                    quantity: Math.abs(indirect_sales) * -1,
                    productId: book_product.productId,
                    areaId: initialData.areaId,
                    businessId: initialData.businessId,
                    movedById: 1,
                    operation: "SALE",
                    description:
                        "Venta indirecta (ajuste de sistema por proceso de elaboración/producto incluido en Combo o en Ficha de costo).",
                    economicCycleId: initialData.economicCyle?.id,
                });
            } else {
                indirect_sales = 0;
            }

            const sales = mathOperation(
                direct_sales,
                Math.abs(indirect_sales),
                "addition",
                precission_after_coma
            );

            processed_data.push({
                stockProductId: book_product.stockProductId,
                productId: book_product.productId,
                name: book_product.name,
                image: book_product.image,
                measure: book_product.measure,
                productCategory: book_product.productCategory,
                productCategoryId: book_product.productCategoryId,
                inStock: 0,
                initial,
                entry,
                movements: movements * -1,
                outs: outs * -1,
                sales: sales * -1,
                onlineSales: online_sales * -1,
                processed: processed * -1,
                waste: waste * -1,
                variations,

                //New properties
                enableGroup: book_product.enableGroup,
                groupName: book_product.groupName,
                groupConvertion: book_product.groupConvertion,
            });
        }
    }

    //Including operations remain in Movements not taking into account
    if (area_movements.length !== 0 || area_online_sales.length !== 0) {
        //Obtaining products
        let productIds: Array<number> = [];
        area_movements.forEach(item => {
            if (!productIds.includes(item.productId)) {
                productIds.push(item.productId);
            }
        });

        area_online_sales.forEach(item => {
            if (!productIds.includes(item.productId)) {
                productIds.push(item.productId);
            }
        });

        const products_found = await Product.findAll({
            where: {
                id: productIds,
            },
            include: [
                ProductCategory,
                {
                    model: StockAreaProduct,
                    where: {
                        areaId: initialData.areaId,
                    },
                    required: false,
                },
            ],
        });

        const otherStockProducts = await StockAreaProduct.findAll({
            where: {
                productId: productIds,
            },
            include: [
                {
                    model: StockAreaVariation,
                    include: [
                        {
                            model: Variation,
                            attributes: ["name"],
                            paranoid: false,
                        },
                    ],
                },
            ],
        });

        for (const product of products_found) {
            let variations: Array<IPVStateVariation> = [];

            const movements_data = updateMovements(product.id);
            if (
                movements_data.variations &&
                movements_data.variations.length !== 0
            ) {
                variations = contactArrayVariations(
                    variations,
                    movements_data.variations
                );
            }

            const sales_data = updateSales(product.id);
            if (sales_data.variations.length !== 0) {
                variations = contactArrayVariations(
                    variations,
                    sales_data.variations
                );
            }

            if (variations.length !== 0) {
                const stock_product = otherStockProducts.find(
                    item => item.productId === product.id
                );
                variations = processArrayVariations(stock_product, variations);
            }

            const entry = movements_data.entry;
            const movements = movements_data.movements;
            const processed = movements_data.processed;
            const outs = movements_data.outs;
            const waste = movements_data.waste;
            const online_sales = mathOperation(
                sales_data.online_sales,
                movements_data.registered_online_sales,
                "addition",
                precission_after_coma
            );
            const direct_sales = mathOperation(
                sales_data.sales,
                movements_data.registered_sales,
                "addition",
                precission_after_coma
            );

            //Processing indirect sales
            let indirect_sales = mathOperation(
                entry,
                outs,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                direct_sales,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                processed,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                movements,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                waste,
                "subtraction",
                precission_after_coma
            );
            indirect_sales = mathOperation(
                indirect_sales,
                online_sales,
                "subtraction",
                precission_after_coma
            );

            //Analyzing disregard values
            const disregardValue = mathOperation(
                Math.abs(indirect_sales),
                0,
                "addition",
                precission_after_coma
                    ? Number(precission_after_coma) - 1
                    : precission_after_coma
            );

            if (!(disregardValue > 0)) {
                indirect_sales = 0;
            }

            const sales = mathOperation(
                direct_sales,
                Math.abs(indirect_sales),
                "addition",
                precission_after_coma
            );

            processed_data.push({
                stockProductId: product.stockAreaProducts?.[0]?.id,
                productId: product.id,
                name: product.name,
                image: product.images?.[0]?.thumbnail,
                measure: product.measure,
                productCategory:
                    product.productCategory?.name ?? "Sin categoría",
                productCategoryId: product.productCategoryId,
                inStock: 0,
                initial: 0,
                entry,
                movements: movements * -1,
                outs: outs * -1,
                sales: sales * -1,
                onlineSales: online_sales * -1,
                processed: processed * -1,
                waste: waste * -1,
                variations,

                //New properties
                enableGroup: product.enableGroup,
                groupName: product.groupName,
                groupConvertion: product.groupConvertion,
            });
        }
    }

    return {
        processed_data,
        stock_movement_to_build,
    };
};

export const areaSalesIncomeProcessator = async (initialData: {
    economicCycleId: number;
    area: Area;
    mainCurrency: AvailableCurrency;
    availableCurrencies: AvailableCurrency[];
    extractSalary: boolean;
    salaryFromRevenue: boolean;
    costCodeCurrency: string;
}): Promise<InternalHelperResponse> => {
    //Normalizing external data
    const main_currency = initialData.mainCurrency;
    const availableCurrencies = initialData.availableCurrencies;
    const extract_salary_from_cash = initialData.extractSalary;
    const calculate_salary_from_revenue = initialData.salaryFromRevenue;
    const area = initialData.area;

    //Found if data exist in the store
    const foundStore = await Store.findOne({
        where: {
            type: "EC_INCOME_AREA",
            areaId: area.id,
            economicCycleId: initialData.economicCycleId,
        },
    });

    if (foundStore) {
        const data_to_return = JSON.parse(foundStore.data);
        return {
            status: 200,
            data: data_to_return,
        };
    }

    //Variables to return
    let totalCommissions: Array<{ amount: number; codeCurrency: string }> = [];
    let totalDiscounts: Array<{ amount: number; codeCurrency: string }> = [];

    let totalSalary = {
        amount: 0,
        codeCurrency: main_currency.currency.code,
    };

    let totalCashOperations: Array<{
        amount: number;
        codeCurrency: string;
        type: accountOperationType;
        operation: cash_registers_operations;
    }> = [];
    let totalInCash: Array<{
        amount: number;
        codeCurrency: string;
    }> = [];
    let totalInCashAfterOperations: Array<{
        amount: number;
        codeCurrency: string;
    }> = [];

    //Transfering order to next economic cycle
    const configurations = await getBusinessConfigCache(
        initialData.area.businessId
    );

    const transfer_orders_to_next_economic_cycle =
        configurations.find(
            item => item.key === "transfer_orders_to_next_economic_cycle"
        )?.value === "true";

    const cash_operations_include_tips =
        configurations.find(item => item.key === "cash_operations_include_tips")
            ?.value === "true";

    const cash_operations_include_deliveries =
        configurations.find(
            item => item.key === "cash_operations_include_deliveries"
        )?.value === "true";

    let statusOrders = ["BILLED"];
    if (!transfer_orders_to_next_economic_cycle) {
        statusOrders.push("PAYMENT_PENDING");
    }

    //All requested
    const [operations, orders, selledProductsWithChangePrices] =
        await Promise.all([
            CashRegisterOperation.findAll({
                where: {
                    economicCycleId: initialData.economicCycleId,
                    areaId: initialData.area.id,
                },
            }),
            OrderReceipt.findAll({
                where: {
                    economicCycleId: initialData.economicCycleId,
                    status: statusOrders,
                    areaSalesId: initialData.area.id,
                },
                include: [
                    OrderReceiptPrice,
                    OrderReceiptTotal,
                    CurrencyPayment,
                    { model: Price, as: "shippingPrice" },
                    { model: Price, as: "tipPrice" },
                    { model: Price, as: "amountReturned" },
                    OrderReceiptModifier,
                    { model: Price, as: "couponDiscountPrice" },
                ],
            }),
            SelledProduct.findAll({
                include: [
                    {
                        model: Product,
                        include: [ProductPrice, Price],
                        paranoid: false,
                    },
                    { model: Price, as: "priceUnitary" },
                    {
                        model: OrderReceipt,
                        where: {
                            economicCycleId: initialData.economicCycleId,
                            status: statusOrders,
                            areaSalesId: initialData.area.id,
                            houseCosted: false,
                        },
                    },
                ],
                where: {
                    modifiedPrice: true,
                },
            }),
        ]);

    //Analyzing prices changes
    for (const selledProduct of selledProductsWithChangePrices) {
        if (!selledProduct.product) {
            continue;
        }

        let originalPrice:
            | {
                  price: number;
                  codeCurrency: string;
              }
            | undefined;
        let receivedPrice: {
            amount: number;
            codeCurrency: string;
        } = selledProduct.priceUnitary;

        //1. Filtering all the prices in the same currency. If there are many prices with the same currency select main
        const currencyPrices = selledProduct.product.prices.filter(
            item => item.codeCurrency === receivedPrice.codeCurrency
        );

        if (currencyPrices.length === 1) {
            originalPrice = currencyPrices[0];
        } else if (currencyPrices.length > 1) {
            originalPrice = currencyPrices.find(item => item.isMain);
        }

        //4. If none of the above, converting everying to the main currency
        if (!originalPrice) {
            const mainPrice = selledProduct.product.prices.find(
                item => item.isMain
            )!;

            //Converting price to main currency if necessary
            let amount = 0;
            if (mainPrice.codeCurrency !== main_currency.currency.code) {
                const found = availableCurrencies.find(
                    item => item.currency.code === mainPrice.codeCurrency
                );

                if (!found) {
                    return {
                        status: 400,
                        message: `La moneda ${mainPrice.codeCurrency} no está disponible en el negocio`,
                    };
                }

                amount += mathOperation(
                    mainPrice.price,
                    found.exchangeRate,
                    "multiplication",
                    2
                );
            }

            originalPrice = {
                price: amount,
                codeCurrency: main_currency.currency.code,
            };

            //Converting received price to main currency if necessary
            let amountReceived = 0;
            const foundReceived = availableCurrencies.find(
                item => item.currency.code === receivedPrice.codeCurrency
            );

            if (!foundReceived) {
                return {
                    status: 404,
                    message: `La moneda ${receivedPrice.codeCurrency} no está disponible en el negocio`,
                };
            }

            amount += mathOperation(
                receivedPrice.amount,
                foundReceived.exchangeRate,
                "multiplication",
                2
            );

            receivedPrice = {
                amount: amountReceived,
                codeCurrency: main_currency.currency.code,
            };
        }

        const difference = mathOperation(
            receivedPrice.amount - originalPrice.price,
            selledProduct.quantity,
            "multiplication",
            2
        );

        if (difference > 0) {
            const found_commission = totalCommissions.find(
                commission =>
                    commission.codeCurrency === receivedPrice.codeCurrency
            );

            if (found_commission) {
                totalCommissions = totalCommissions.map(commission => {
                    if (
                        commission.codeCurrency === receivedPrice.codeCurrency
                    ) {
                        return {
                            ...commission,
                            amount: commission.amount + difference,
                        };
                    }
                    return commission;
                });
            } else {
                totalCommissions.push({
                    amount: difference,
                    codeCurrency: receivedPrice.codeCurrency,
                });
            }
        } else {
            const found_discount = totalDiscounts.find(
                discount => discount.codeCurrency === receivedPrice.codeCurrency
            );

            if (found_discount) {
                totalDiscounts = totalDiscounts.map(discount => {
                    if (discount.codeCurrency === receivedPrice.codeCurrency) {
                        return {
                            ...discount,
                            amount: discount.amount + Math.abs(difference),
                        };
                    }
                    return discount;
                });
            } else {
                totalDiscounts.push({
                    amount: Math.abs(difference),
                    codeCurrency: receivedPrice.codeCurrency,
                });
            }
        }
    }

    //Cash operations
    const filteredOperations = [
        "MANUAL_DEPOSIT",
        "MANUAL_WITHDRAW",
        "MANUAL_FUND",
    ];

    for (const operation of operations) {
        //Total in Cash
        const found_total = totalInCash.find(
            item => item.codeCurrency === operation.codeCurrency
        );
        if (found_total) {
            totalInCash = totalInCash.map(item => {
                if (item.codeCurrency === found_total.codeCurrency) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            operation.amount,
                            "addition",
                            2
                        ),
                    };
                }
                return item;
            });
        } else {
            totalInCash = [
                ...totalInCash,
                {
                    amount: operation.amount,
                    codeCurrency: operation.codeCurrency,
                },
            ];
        }

        if (filteredOperations.includes(operation.operation)) {
            const found_operation = totalCashOperations.find(
                item =>
                    item.codeCurrency === operation.codeCurrency &&
                    item.operation === operation.operation
            );
            if (found_operation) {
                totalCashOperations = totalCashOperations.map(op => {
                    if (
                        op.codeCurrency === operation.codeCurrency &&
                        op.operation === operation.operation
                    ) {
                        return {
                            ...op,
                            amount: mathOperation(
                                op.amount,
                                operation.amount,
                                "addition",
                                2
                            ),
                        };
                    }
                    return op;
                });
            } else {
                totalCashOperations.push({
                    amount: operation.amount,
                    codeCurrency: operation.codeCurrency,
                    type: operation.type,
                    operation: operation.operation,
                });
            }
        }
    }

    const result = ordersSummaryProcessator({
        orders,
        mainCurrency: main_currency,
        availableCurrencies,
        costCodeCurrency: initialData.costCodeCurrency,
        includeShippingAsIncome: cash_operations_include_deliveries,
        includeTipsAsIncome: cash_operations_include_tips,
    });

    //Calculating salary
    totalInCashAfterOperations = [...totalInCash];
    if (extract_salary_from_cash) {
        let base = result.totalSalesInMainCurrency.amount;
        if (calculate_salary_from_revenue) {
            base = mathOperation(
                result.totalSalesInMainCurrency.amount,
                result.totalCost.amount,
                "subtraction",
                2
            );
        }

        //Analyzing area sale configuration
        if (
            area.enableSalaryByPercent &&
            base >= Number(area.enablePercentAfter)
        ) {
            const salary = mathOperation(
                base,
                Number(area.salaryPercent) / 100,
                "multiplication",
                0
            );
            totalSalary = {
                amount: salary * -1,
                codeCurrency: main_currency.currency.code,
            };
        } else {
            totalSalary = {
                amount: area.salaryFixed * -1,
                codeCurrency: main_currency.currency.code,
            };
        }

        //Substracting operation from totalInCash
        const found = totalInCashAfterOperations.find(
            item => item.codeCurrency === totalSalary.codeCurrency
        );
        if (found) {
            totalInCashAfterOperations = totalInCashAfterOperations.map(
                item => {
                    if (item.codeCurrency === totalSalary.codeCurrency) {
                        return {
                            ...item,
                            amount: mathOperation(
                                item.amount,
                                totalSalary.amount,
                                "addition",
                                2
                            ),
                        };
                    }
                    return item;
                }
            );
        } else {
            totalInCashAfterOperations.push({
                amount: totalSalary.amount,
                codeCurrency: totalSalary.codeCurrency,
            });
        }
    }

    //Mixing total Discount
    let newTotalDiscount = [...totalDiscounts];
    for (const discount of result.totalDiscounts) {
        const foundIndex = newTotalDiscount.findIndex(
            item => item.codeCurrency === discount.codeCurrency
        );

        if (foundIndex !== -1) {
            newTotalDiscount[foundIndex].amount = mathOperation(
                newTotalDiscount[foundIndex].amount,
                discount.amount,
                "addition",
                2
            );
        } else {
            newTotalDiscount.push(discount);
        }
    }

    //Mixing total Commissions
    let newTotalCommission = [...totalCommissions];
    for (const commission of result.totalCommissions) {
        const foundIndex = newTotalCommission.findIndex(
            item => item.codeCurrency === commission.codeCurrency
        );

        if (foundIndex !== -1) {
            newTotalCommission[foundIndex].amount = mathOperation(
                newTotalCommission[foundIndex].amount,
                commission.amount,
                "addition",
                2
            );
        } else {
            newTotalCommission.push(commission);
        }
    }

    return {
        status: 200,
        data: {
            ...result,

            totalCashOperations,
            totalDiscounts: newTotalDiscount,
            totalCommissions: newTotalCommission,

            totalSalary,
            totalInCash,
            totalInCashAfterOperations,
            amountOfOrders: orders.length,
        },
    };
};

//Obatin relevant data from orders
export const ordersSummaryProcessator = (initialData: {
    orders: Array<OrderReceipt>;
    mainCurrency: AvailableCurrency;
    availableCurrencies: AvailableCurrency[];
    costCodeCurrency: string;
    includeShippingAsIncome: boolean;
    includeTipsAsIncome: boolean;
}) => {
    //Variables to return
    let totalSales: Array<{ amount: number; codeCurrency: string }> = [];
    let totalSalesInMainCurrency = {
        amount: 0,
        codeCurrency: initialData.mainCurrency.currency.code,
    };

    //Sales product cost
    let totalCost = {
        amount: 0,
        codeCurrency: initialData.costCodeCurrency,
    };

    let totalAsumedCost = {
        amount: 0,
        codeCurrency: initialData.costCodeCurrency,
    };

    let totalIncomesInMainCurrency = {
        amount: 0,
        codeCurrency: initialData.mainCurrency.currency.code,
    };
    let totalIncomes: Array<{
        amount: number;
        codeCurrency: string;
    }> = [];
    let totalIncomesNotInCash: Array<{
        amount: number;
        codeCurrency: string;
        paymentWay: payments_ways;
    }> = [];
    let totalIncomesInCash: Array<{
        amount: number;
        codeCurrency: string;
    }> = [];

    let totalTips: Array<{
        amount: number;
        codeCurrency: string;
        paymentWay: payments_ways;
    }> = [];
    let totalTipsMainCurrency = {
        amount: 0,
        codeCurrency: initialData.mainCurrency.currency.code,
    };

    let totalDiscounts: Array<{ amount: number; codeCurrency: string }> = [];
    let totalCommissions: Array<{ amount: number; codeCurrency: string }> = [];
    let totalCouponsDiscounts: Array<{ amount: number; codeCurrency: string }> =
        [];
    let totalShipping: Array<{
        amount: number;
        codeCurrency: string;
        paymentWay: payments_ways;
    }> = [];
    let totalHouseCosted: Array<{ amount: number; codeCurrency: string }> = [];

    let totalOrderModifiers: Array<{
        modifierId: number;
        modifierName: string;
        prices: Array<SimplePrice>;
    }> = [];

    //Deprecated TODO: Remove
    let taxes: Array<{ amount: number; codeCurrency: string }> = [];

    //Iterating all orders
    for (const order of initialData.orders) {
        //Analyzing payments in order
        for (const payment of order.currenciesPayment) {
            //TotalIncomes not in Cash
            if (payment.paymentWay !== "CASH") {
                const found_total_not_cash = totalIncomesNotInCash.find(
                    item =>
                        item.codeCurrency === payment.codeCurrency &&
                        item.paymentWay === payment.paymentWay
                );

                if (found_total_not_cash) {
                    totalIncomesNotInCash = totalIncomesNotInCash.map(item => {
                        if (
                            item.codeCurrency === payment.codeCurrency &&
                            item.paymentWay === payment.paymentWay
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    payment.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    totalIncomesNotInCash = [
                        ...totalIncomesNotInCash,
                        {
                            amount: payment.amount,
                            codeCurrency: payment.codeCurrency,
                            paymentWay: payment.paymentWay,
                        },
                    ];
                }
            } else {
                //Total incomes in Cash
                const found_total_cash = totalIncomesInCash.find(
                    item => item.codeCurrency === payment.codeCurrency
                );

                if (found_total_cash) {
                    totalIncomesInCash = totalIncomesInCash.map(item => {
                        if (item.codeCurrency === payment.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    payment.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    totalIncomesInCash = [
                        ...totalIncomesInCash,
                        {
                            amount: payment.amount,
                            codeCurrency: payment.codeCurrency,
                        },
                    ];
                }
            }
        }

        //Substracting amount returning from total incomes in cash
        if (order.amountReturned) {
            const found_total_cash = totalIncomesInCash.find(
                item => item.codeCurrency === order.amountReturned?.codeCurrency
            );

            if (found_total_cash) {
                totalIncomesInCash = totalIncomesInCash.map(item => {
                    if (
                        item.codeCurrency === order.amountReturned?.codeCurrency
                    ) {
                        return {
                            ...item,
                            amount: mathOperation(
                                item.amount,
                                order.amountReturned?.amount,
                                "subtraction",
                                2
                            ),
                        };
                    }
                    return item;
                });
            } else {
                totalIncomesInCash = [
                    ...totalIncomesInCash,
                    {
                        amount: order.amountReturned.amount * -1,
                        codeCurrency: order.amountReturned.codeCurrency,
                    },
                ];
            }
        }

        //Obtaining incomes
        if (!order.houseCosted) {
            //Cost of order from sales prices
            totalCost.amount += order.totalCost;

            for (const total of order.totalToPay) {
                const foundIndex = totalIncomes.findIndex(
                    item => item.codeCurrency === total.codeCurrency
                );

                if (foundIndex !== -1) {
                    totalIncomes[foundIndex].amount = mathOperation(
                        totalIncomes[foundIndex].amount,
                        total.amount,
                        "addition",
                        2
                    );
                } else {
                    totalIncomes.push({
                        amount: total.amount,
                        codeCurrency: total.codeCurrency,
                    });
                }
            }
        }

        //Order modifiers +Taxes - Discounts
        for (const modifier of order.orderModifiers || []) {
            const found_modifier = totalOrderModifiers.find(
                item => item.modifierId === modifier.modifierId
            );

            if (found_modifier) {
                totalOrderModifiers = totalOrderModifiers.map(item => {
                    if (item.modifierId === modifier.modifierId) {
                        //Analizing prices
                        const foundPrice = item.prices.find(
                            price =>
                                price.codeCurrency === modifier.codeCurrency
                        );
                        if (foundPrice) {
                            foundPrice.amount = mathOperation(
                                foundPrice.amount,
                                modifier.amount,
                                "addition",
                                2
                            );
                        } else {
                            found_modifier.prices.push({
                                amount: modifier.amount,
                                codeCurrency: modifier.codeCurrency,
                            });
                        }
                    }

                    return item;
                });
            } else {
                totalOrderModifiers.push({
                    modifierId: modifier.modifierId,
                    modifierName: modifier.showName,
                    prices: [
                        {
                            amount: modifier.amount,
                            codeCurrency: modifier.codeCurrency,
                        },
                    ],
                });
            }
        }

        //Analyzing prices
        for (const price of order.prices) {
            //Total Sales
            if (!order.houseCosted) {
                const found_price = totalSales.find(
                    sale => sale.codeCurrency === price.codeCurrency
                );

                if (found_price) {
                    totalSales = totalSales.map(sale => {
                        if (sale.codeCurrency === price.codeCurrency) {
                            return {
                                ...sale,
                                amount: mathOperation(
                                    sale.amount,
                                    price.price,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return sale;
                    });
                } else {
                    totalSales.push({
                        amount: price.price,
                        codeCurrency: price.codeCurrency,
                    });
                }
            }

            //Total discounts
            if (order.discount !== 0 && order.discount) {
                const amountDiscounted = mathOperation(
                    price.price,
                    order.discount / 100,
                    "multiplication",
                    2
                );

                const found_discount = totalDiscounts.find(
                    discount => discount.codeCurrency === price.codeCurrency
                );

                if (found_discount) {
                    totalDiscounts = totalDiscounts.map(discount => {
                        if (discount.codeCurrency === price.codeCurrency) {
                            return {
                                ...discount,
                                amount: discount.amount + amountDiscounted,
                            };
                        }
                        return discount;
                    });
                } else {
                    totalDiscounts.push({
                        amount: amountDiscounted,
                        codeCurrency: price.codeCurrency,
                    });
                }
            }

            //Total commissions
            if (order.commission !== 0 && order.commission) {
                const amountAdded = mathOperation(
                    price.price,
                    order.commission / 100,
                    "multiplication",
                    2
                );

                const found_commission = totalCommissions.find(
                    commission => commission.codeCurrency === price.codeCurrency
                );

                if (found_commission) {
                    totalCommissions = totalCommissions.map(commission => {
                        if (commission.codeCurrency === price.codeCurrency) {
                            return {
                                ...commission,
                                amount: commission.amount + amountAdded,
                            };
                        }
                        return commission;
                    });
                } else {
                    totalCommissions.push({
                        amount: amountAdded,
                        codeCurrency: price.codeCurrency,
                    });
                }
            }
        }

        //Total house costed
        if (order.houseCosted) {
            //Cost asumed
            totalAsumedCost.amount += order.totalCost;

            const found_house_costed = totalHouseCosted.find(
                item => item.codeCurrency === initialData.costCodeCurrency
            );

            if (found_house_costed) {
                totalHouseCosted = totalHouseCosted.map(item => {
                    if (item.codeCurrency === initialData.costCodeCurrency) {
                        return {
                            ...item,
                            amount: item.amount + order.totalCost,
                        };
                    }
                    return item;
                });
            } else {
                totalHouseCosted.push({
                    amount: order.totalCost,
                    codeCurrency: initialData.costCodeCurrency,
                });
            }
        }

        //If tips
        if (order.tipPrice) {
            const found_tip = totalTips.find(
                tip =>
                    tip.codeCurrency === order.tipPrice?.codeCurrency &&
                    tip.paymentWay === order.tipPrice.paymentWay
            );
            if (found_tip) {
                totalTips = totalTips.map(tip => {
                    if (
                        tip.codeCurrency === order.tipPrice?.codeCurrency &&
                        tip.paymentWay === order.tipPrice.paymentWay
                    ) {
                        return {
                            ...tip,
                            amount: tip.amount + order.tipPrice.amount,
                        };
                    }
                    return tip;
                });
            } else {
                totalTips.push({
                    amount: order.tipPrice.amount,
                    codeCurrency: order.tipPrice.codeCurrency,
                    paymentWay: order.tipPrice.paymentWay,
                });
            }

            //Analyzing if must be include in incomes
            if (initialData.includeTipsAsIncome) {
                //Analyzing cash
                if (order.tipPrice.paymentWay !== "CASH") {
                    //Analyzing not cash
                    const found_total_not_cash = totalIncomesNotInCash.find(
                        item =>
                            item.codeCurrency ===
                                order.tipPrice?.codeCurrency &&
                            item.paymentWay === order.tipPrice.paymentWay
                    );

                    if (found_total_not_cash) {
                        totalIncomesNotInCash = totalIncomesNotInCash.map(
                            item => {
                                if (
                                    item.codeCurrency ===
                                        order.tipPrice?.codeCurrency &&
                                    item.paymentWay ===
                                        order.tipPrice.paymentWay
                                ) {
                                    return {
                                        ...item,
                                        amount: mathOperation(
                                            item.amount,
                                            order.tipPrice.amount,
                                            "addition",
                                            2
                                        ),
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        totalIncomesNotInCash = [
                            ...totalIncomesNotInCash,
                            {
                                amount: order.tipPrice.amount,
                                codeCurrency: order.tipPrice.codeCurrency,
                                paymentWay: order.tipPrice.paymentWay,
                            },
                        ];
                    }
                } else {
                    const found_total_cash = totalIncomesInCash.find(
                        item =>
                            item.codeCurrency ===
                                order.tipPrice?.codeCurrency &&
                            order.tipPrice.paymentWay === "CASH"
                    );

                    if (found_total_cash) {
                        totalIncomesInCash = totalIncomesInCash.map(item => {
                            if (
                                item.codeCurrency ===
                                    order.tipPrice?.codeCurrency &&
                                order.tipPrice.paymentWay === "CASH"
                            ) {
                                return {
                                    ...item,
                                    amount: mathOperation(
                                        item.amount,
                                        order.tipPrice?.amount,
                                        "addition",
                                        2
                                    ),
                                };
                            }
                            return item;
                        });
                    } else {
                        totalIncomesInCash = [
                            ...totalIncomesInCash,
                            {
                                amount: order.tipPrice.amount,
                                codeCurrency: order.tipPrice.codeCurrency,
                            },
                        ];
                    }
                }
            }
        }

        //Shipping prices
        if (order.shippingPrice) {
            const found_shipping = totalShipping.find(
                shipping =>
                    shipping.codeCurrency ===
                        order.shippingPrice?.codeCurrency &&
                    shipping.paymentWay === order.shippingPrice.paymentWay
            );

            if (found_shipping) {
                totalShipping = totalShipping.map(shipping => {
                    if (
                        shipping.codeCurrency ===
                            order.shippingPrice?.codeCurrency &&
                        shipping.paymentWay === order.shippingPrice.paymentWay
                    ) {
                        return {
                            ...shipping,
                            amount:
                                shipping.amount + order.shippingPrice?.amount,
                        };
                    }

                    return shipping;
                });
            } else {
                totalShipping.push({
                    amount: order.shippingPrice.amount,
                    codeCurrency: order.shippingPrice.codeCurrency,
                    paymentWay: order.shippingPrice.paymentWay,
                });
            }

            //Analyzing if must be include in incomes
            if (!initialData.includeShippingAsIncome) {
                if (order.shippingPrice.paymentWay !== "CASH") {
                    //Analyzing not cash
                    const found_total_not_cash = totalIncomesNotInCash.find(
                        item =>
                            item.codeCurrency ===
                                order.shippingPrice?.codeCurrency &&
                            item.paymentWay === order.shippingPrice.paymentWay
                    );

                    if (found_total_not_cash) {
                        totalIncomesNotInCash = totalIncomesNotInCash.map(
                            item => {
                                if (
                                    item.codeCurrency ===
                                        order.shippingPrice?.codeCurrency &&
                                    item.paymentWay ===
                                        order.shippingPrice.paymentWay
                                ) {
                                    return {
                                        ...item,
                                        amount: mathOperation(
                                            item.amount,
                                            order.shippingPrice.amount,
                                            "subtraction",
                                            2
                                        ),
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        totalIncomesNotInCash = [
                            ...totalIncomesNotInCash,
                            {
                                amount: order.shippingPrice.amount * -1,
                                codeCurrency: order.shippingPrice.codeCurrency,
                                paymentWay: order.shippingPrice.paymentWay,
                            },
                        ];
                    }
                } else {
                    const found_total_cash = totalIncomesInCash.find(
                        item =>
                            item.codeCurrency ===
                                order.shippingPrice?.codeCurrency &&
                            order.shippingPrice.paymentWay === "CASH"
                    );

                    if (found_total_cash) {
                        totalIncomesInCash = totalIncomesInCash.map(item => {
                            if (
                                item.codeCurrency ===
                                    order.shippingPrice?.codeCurrency &&
                                order.shippingPrice.paymentWay === "CASH"
                            ) {
                                return {
                                    ...item,
                                    amount: mathOperation(
                                        item.amount,
                                        order.shippingPrice?.amount,
                                        "subtraction",
                                        2
                                    ),
                                };
                            }
                            return item;
                        });
                    } else {
                        totalIncomesInCash = [
                            ...totalIncomesInCash,
                            {
                                amount: order.shippingPrice.amount * -1,
                                codeCurrency: order.shippingPrice.codeCurrency,
                            },
                        ];
                    }
                }
            }
        }

        //Coupon discount
        if (order.couponDiscountPrice) {
            const found = totalCouponsDiscounts.find(
                discount =>
                    discount.codeCurrency ===
                    order.couponDiscountPrice?.codeCurrency
            );

            if (found) {
                totalCouponsDiscounts = totalCouponsDiscounts.map(discount => {
                    if (
                        discount.codeCurrency ===
                        order.couponDiscountPrice?.codeCurrency
                    ) {
                        return {
                            ...discount,
                            amount: mathOperation(
                                discount.amount,
                                order.couponDiscountPrice.amount,
                                "addition",
                                2
                            ),
                        };
                    }

                    return discount;
                });
            } else {
                totalCouponsDiscounts.push({
                    amount: order.couponDiscountPrice.amount,
                    codeCurrency: order.couponDiscountPrice.codeCurrency,
                });
            }

            //Adding to discount as general
            const found2 = totalDiscounts.find(
                discount =>
                    discount.codeCurrency ===
                    order.couponDiscountPrice?.codeCurrency
            );

            if (found2) {
                totalDiscounts = totalDiscounts.map(discount => {
                    if (
                        discount.codeCurrency ===
                        order.couponDiscountPrice?.codeCurrency
                    ) {
                        return {
                            ...discount,
                            amount: mathOperation(
                                discount.amount,
                                order.couponDiscountPrice.amount,
                                "addition",
                                2
                            ),
                        };
                    }

                    return discount;
                });
            } else {
                totalDiscounts.push({
                    amount: order.couponDiscountPrice.amount,
                    codeCurrency: order.couponDiscountPrice.codeCurrency,
                });
            }
        }
    }

    //TotalSales in Main currency
    totalSales.forEach(sales => {
        const found = initialData.availableCurrencies.find(
            item => item.currency.code === sales.codeCurrency
        );

        if (!found) {
            return {
                status: 404,
                message: `La moneda ${sales.codeCurrency} no está disponible en el negocio`,
            };
        }

        totalSalesInMainCurrency.amount += mathOperation(
            sales.amount,
            found.exchangeRate,
            "multiplication"
        );
    });

    //Total tips in Main Currency
    totalTips.forEach(tip => {
        const found = initialData.availableCurrencies.find(
            item => item.currency.code === tip.codeCurrency
        );

        if (!found) {
            return {
                status: 404,
                message: `La moneda ${tip.codeCurrency} no está disponible en el negocio`,
            };
        }

        totalTipsMainCurrency.amount += mathOperation(
            tip.amount,
            found.exchangeRate,
            "multiplication"
        );
    });

    //TotalIncomes in Main currency
    totalIncomes.forEach(income => {
        const found = initialData.availableCurrencies.find(
            item => item.currency.code === income.codeCurrency
        );

        if (!found) {
            return {
                status: 404,
                message: `La moneda ${income.codeCurrency} no está disponible en el negocio`,
            };
        }

        totalIncomesInMainCurrency.amount += mathOperation(
            income.amount,
            found.exchangeRate,
            "multiplication"
        );
    });

    // Gross revenue in sales
    //Transform sales in currency of cost
    const incomesInCostCurrency = exchangeCurrency(
        {
            amount: totalSalesInMainCurrency.amount,
            codeCurrency: initialData.mainCurrency.currency.code,
        },
        initialData.costCodeCurrency,
        initialData.availableCurrencies
    );

    //Including in assumed cost discounts
    const allDiscounts = [...totalDiscounts, ...totalCouponsDiscounts];
    for (const discount of allDiscounts) {
        if (discount.codeCurrency === initialData.costCodeCurrency) {
            totalAsumedCost.amount = mathOperation(
                totalAsumedCost.amount,
                discount.amount,
                "addition",
                2
            );
        } else {
            const exchanged =
                exchangeCurrency(
                    discount,
                    initialData.costCodeCurrency,
                    initialData.availableCurrencies
                )?.amount || 0;
            totalAsumedCost.amount = mathOperation(
                totalAsumedCost.amount,
                exchanged,
                "addition",
                2
            );
        }
    }

    const totalGrossRevenue = {
        amount: mathOperation(
            incomesInCostCurrency?.amount || 0,
            totalCost.amount + totalAsumedCost.amount,
            "subtraction",
            2
        ),
        codeCurrency: initialData.costCodeCurrency,
    };

    return {
        totalSales,
        totalSalesInMainCurrency: {
            ...totalSalesInMainCurrency,
            amount: truncateValue(totalSalesInMainCurrency.amount, 2),
        },
        totalOrderModifiers,

        totalTips,
        totalTipsMainCurrency,

        //Deprecated
        taxes,

        totalDiscounts,
        totalCommissions,
        totalCouponsDiscounts,
        totalShipping,
        totalHouseCosted,

        totalIncomes,
        totalIncomesInMainCurrency: {
            ...totalIncomesInMainCurrency,
            amount: truncateValue(totalIncomesInMainCurrency.amount, 2),
        },
        totalIncomesNotInCash: totalIncomesNotInCash.map(item => {
            return {
                ...item,
                amount: truncateValue(item.amount, 2),
            };
        }),
        totalIncomesInCash,

        totalCost,
        totalAsumedCost,
        totalGrossRevenue,
    };
};

//@Deprecated used instead obtainIncomesByBusinessV2
export const obtainIncomesByBusiness = async (initialData: {
    listBussiness: Array<number>;
    startAt: string;
    endsAt: string;
    availableCurrencies: AvailableCurrency[];
}): Promise<InternalHelperResponse> => {
    const main_currency = initialData.availableCurrencies.find(
        item => item.isMain
    );

    if (!main_currency) {
        return {
            status: 404,
            message: `There is no main currency defined.`,
        };
    }

    //Find all economic Cycles that start in the current_day
    const economicCycles = await EconomicCycle.findAll({
        where: {
            businessId: initialData.listBussiness,
            createdAt: {
                [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
            },
        },
    });

    let totalSales = 0;
    let totalIncomes = 0;
    let total_cost_selled_products = 0;
    let ids: Array<number> = [];

    //Analyzing orders from economicCycles
    if (economicCycles.length !== 0) {
        ids = economicCycles.map(item => item.id);

        const orders_found = await OrderReceipt.findAll({
            where: {
                economicCycleId: ids,
                status: "BILLED",
            },
            include: [
                { model: OrderReceiptPrice, separate: true },
                { model: OrderReceiptTotal, separate: true },
            ],
        });

        total_cost_selled_products = await OrderReceipt.sum("totalCost", {
            where: {
                economicCycleId: ids,
                status: "BILLED",
            },
        });

        for (const order of orders_found) {
            let localTotalOrder = 0;
            let localTotalOrderIncome = 0;

            //Iterating prices in order to obtain sales
            for (const price of order.prices) {
                if (!order.houseCosted) {
                    if (price.codeCurrency === main_currency.currency.code) {
                        localTotalOrder += price.price;
                    } else {
                        const availableCurrency =
                            initialData.availableCurrencies.find(
                                item =>
                                    item.currency.code === price.codeCurrency
                            );

                        if (!availableCurrency) {
                            return {
                                status: 404,
                                message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                            };
                        }

                        localTotalOrder += mathOperation(
                            price.price,
                            availableCurrency.exchangeRate,
                            "multiplication"
                        );
                    }
                }
            }

            //Iterating prices in order to obtain incomes
            for (const price of order.totalToPay) {
                if (price.codeCurrency === main_currency.currency.code) {
                    localTotalOrderIncome += price.amount;
                } else {
                    const availableCurrency =
                        initialData.availableCurrencies.find(
                            item => item.currency.code === price.codeCurrency
                        );

                    if (!availableCurrency) {
                        return {
                            status: 404,
                            message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                        };
                    }

                    localTotalOrderIncome += mathOperation(
                        price.amount,
                        availableCurrency.exchangeRate,
                        "multiplication"
                    );
                }
            }

            totalSales += localTotalOrder;
            totalIncomes += localTotalOrderIncome;
        }
    }

    //Analyzing orders via woo and online
    const ordersBilledOnline = [
        "BILLED",
        "IN_PROCESS",
        "COMPLETED",
        "IN_TRANSIT",
        "DELIVERED",
    ];
    const orders_found = await OrderReceipt.findAll({
        where: {
            status: ordersBilledOnline,
            businessId: initialData.listBussiness,
            origin: ["woo", "online", "shop", "shopapk", "marketplace", "apk"],
            economicCycleId: null,
            paidAt: {
                [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
            },
        },
        include: [
            { model: OrderReceiptPrice, separate: true },
            { model: OrderReceiptTotal, separate: true },
        ],
    });

    if (orders_found.length !== 0) {
        const cost_onlines = await OrderReceipt.sum("totalCost", {
            where: {
                businessId: initialData.listBussiness,
                status: ordersBilledOnline,
                origin: [
                    "woo",
                    "online",
                    "shop",
                    "shopapk",
                    "marketplace",
                    "apk",
                ],
                economicCycleId: null,
                paidAt: {
                    [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                    [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
                },
            },
        });
        total_cost_selled_products += cost_onlines || 0;

        for (const order of orders_found) {
            let localTotalOrder = 0;
            let localTotalOrderIncome = 0;

            //Iterating prices in order to obtain sales
            for (const price of order.prices) {
                if (!order.houseCosted) {
                    if (price.codeCurrency === main_currency.currency.code) {
                        localTotalOrder += price.price;
                    } else {
                        const availableCurrency =
                            initialData.availableCurrencies.find(
                                item =>
                                    item.currency.code === price.codeCurrency
                            );

                        if (!availableCurrency) {
                            return {
                                status: 404,
                                message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                            };
                        }

                        localTotalOrder += mathOperation(
                            price.price,
                            availableCurrency.exchangeRate,
                            "multiplication"
                        );
                    }
                }
            }

            //Iterating prices in order to obtain incomes
            for (const price of order.totalToPay) {
                if (price.codeCurrency === main_currency.currency.code) {
                    localTotalOrderIncome += price.amount;
                } else {
                    const availableCurrency =
                        initialData.availableCurrencies.find(
                            item => item.currency.code === price.codeCurrency
                        );

                    if (!availableCurrency) {
                        return {
                            status: 404,
                            message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                        };
                    }

                    localTotalOrderIncome += mathOperation(
                        price.amount,
                        availableCurrency.exchangeRate,
                        "multiplication"
                    );
                }
            }

            totalIncomes += localTotalOrderIncome;
            totalSales += localTotalOrder;
        }
    }

    return {
        status: 200,
        data: {
            totalIncomes,
            totalSales,
            totalCost: truncateValue(total_cost_selled_products, 2),
            economicCyclesIds: ids,
        },
    };
};

export const obtainIncomesByBusinessV2 = async (initialData: {
    listBussiness: Array<number>;
    startAt: string;
    endsAt: string;
    availableCurrencies: AvailableCurrency[];
}): Promise<InternalHelperResponse> => {
    const main_currency = initialData.availableCurrencies.find(
        item => item.isMain
    );

    if (!main_currency) {
        return {
            status: 404,
            message: `There is no main currency defined.`,
        };
    }

    //Find all economic Cycles that start in the current_day
    const economicCycles = await EconomicCycle.findAll({
        where: {
            businessId: initialData.listBussiness,
            createdAt: {
                [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
            },
        },
    });

    let totalSalesMainCurerncy = 0;
    let totalSales: Array<SimplePrice> = [];
    let totalIncomesMainCurrency = 0;
    let totalIncomes: Array<ExtendedPrice> = [];

    let total_cost_selled_products = 0;
    let ids: Array<number> = [];

    //Analyzing orders from economicCycles
    if (economicCycles.length !== 0) {
        ids = economicCycles.map(item => item.id);

        const orders_found = await OrderReceipt.findAll({
            where: {
                economicCycleId: ids,
                status: "BILLED",
            },
            include: [
                { model: OrderReceiptPrice, separate: true },
                { model: OrderReceiptTotal, separate: true },
                { model: CurrencyPayment, separate: true },
                {
                    model: Price,
                    as: "amountReturned",
                },
            ],
        });

        total_cost_selled_products = await OrderReceipt.sum("totalCost", {
            where: {
                economicCycleId: ids,
                status: "BILLED",
            },
        });

        for (const order of orders_found) {
            let localTotalOrder = 0;
            let localTotalOrderIncome = 0;

            //Iterating prices in order to obtain sales
            for (const price of order.prices) {
                if (!order.houseCosted) {
                    if (price.codeCurrency === main_currency.currency.code) {
                        localTotalOrder += price.price;
                    } else {
                        const availableCurrency =
                            initialData.availableCurrencies.find(
                                item =>
                                    item.currency.code === price.codeCurrency
                            );

                        if (!availableCurrency) {
                            return {
                                status: 404,
                                message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                            };
                        }

                        localTotalOrder += mathOperation(
                            price.price,
                            availableCurrency.exchangeRate,
                            "multiplication"
                        );

                        const found = totalSales.find(
                            item => item.codeCurrency === price.codeCurrency
                        );
                        if (found) {
                            totalSales = totalSales.map(item => {
                                if (item.codeCurrency === price.codeCurrency) {
                                    return {
                                        ...item,
                                        amount: mathOperation(
                                            item.amount,
                                            price.price,
                                            "addition",
                                            2
                                        ),
                                    };
                                }

                                return item;
                            });
                        } else {
                            totalSales.push({
                                amount: price.price,
                                codeCurrency: price.codeCurrency,
                            });
                        }
                    }
                }
            }

            //Iterating prices in order to obtain incomes
            for (const price of order.totalToPay) {
                if (price.codeCurrency === main_currency.currency.code) {
                    localTotalOrderIncome += price.amount;
                } else {
                    const availableCurrency =
                        initialData.availableCurrencies.find(
                            item => item.currency.code === price.codeCurrency
                        );

                    if (!availableCurrency) {
                        return {
                            status: 404,
                            message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                        };
                    }

                    localTotalOrderIncome += mathOperation(
                        price.amount,
                        availableCurrency.exchangeRate,
                        "multiplication"
                    );
                }
            }

            totalSalesMainCurerncy += localTotalOrder;
            totalIncomesMainCurrency += localTotalOrderIncome;

            for (const price of order.currenciesPayment) {
                const found = totalIncomes.find(
                    item =>
                        item.codeCurrency === price.codeCurrency &&
                        item.paymentWay === price.paymentWay
                );
                if (found) {
                    totalIncomes = totalIncomes.map(item => {
                        if (
                            item.codeCurrency === price.codeCurrency &&
                            item.paymentWay === price.paymentWay
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    price.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                } else {
                    totalIncomes.push({
                        amount: price.amount,
                        codeCurrency: price.codeCurrency,
                        paymentWay: price.paymentWay,
                    });
                }
            }

            if (order.amountReturned) {
                const found = totalIncomes.find(
                    item =>
                        item.codeCurrency ===
                            order.amountReturned?.codeCurrency &&
                        item.paymentWay === "CASH"
                );
                if (found) {
                    totalIncomes = totalIncomes.map(item => {
                        if (
                            item.codeCurrency ===
                                order.amountReturned?.codeCurrency &&
                            item.paymentWay === "CASH"
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    order.amountReturned?.amount,
                                    "subtraction",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                } else {
                    totalIncomes.push({
                        amount: order.amountReturned?.amount * -1,
                        codeCurrency: order.amountReturned.codeCurrency,
                        paymentWay: "CASH",
                    });
                }
            }
        }
    }

    //Analyzing orders via woo and online
    //TODO: Make a checkout of this procedure
    const ordersBilledOnline = [
        "BILLED",
        "IN_PROCESS",
        "COMPLETED",
        "IN_TRANSIT",
        "DELIVERED",
    ];
    const orders_found = await OrderReceipt.findAll({
        where: {
            status: ordersBilledOnline,
            businessId: initialData.listBussiness,
            origin: ["woo", "online", "shop", "shopapk", "marketplace", "apk"],
            economicCycleId: null,
            paidAt: {
                [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
            },
        },
        include: [
            { model: OrderReceiptPrice, separate: true },
            { model: OrderReceiptTotal, separate: true },
        ],
    });

    if (orders_found.length !== 0) {
        const cost_onlines = await OrderReceipt.sum("totalCost", {
            where: {
                businessId: initialData.listBussiness,
                status: ordersBilledOnline,
                origin: [
                    "woo",
                    "online",
                    "shop",
                    "shopapk",
                    "marketplace",
                    "apk",
                ],
                economicCycleId: null,
                paidAt: {
                    [Op.gte]: moment(initialData.startAt, "YYYY-MM-DD HH:mm"),
                    [Op.lte]: moment(initialData.endsAt, "YYYY-MM-DD HH:mm"),
                },
            },
        });
        total_cost_selled_products += cost_onlines || 0;

        for (const order of orders_found) {
            let localTotalOrder = 0;
            let localTotalOrderIncome = 0;

            //Iterating prices in order to obtain sales
            for (const price of order.prices) {
                if (!order.houseCosted) {
                    if (price.codeCurrency === main_currency.currency.code) {
                        localTotalOrder += price.price;
                    } else {
                        const availableCurrency =
                            initialData.availableCurrencies.find(
                                item =>
                                    item.currency.code === price.codeCurrency
                            );

                        if (!availableCurrency) {
                            return {
                                status: 404,
                                message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                            };
                        }

                        localTotalOrder += mathOperation(
                            price.price,
                            availableCurrency.exchangeRate,
                            "multiplication"
                        );
                    }
                }
            }

            //Iterating prices in order to obtain incomes
            for (const price of order.totalToPay) {
                if (price.codeCurrency === main_currency.currency.code) {
                    localTotalOrderIncome += price.amount;
                } else {
                    const availableCurrency =
                        initialData.availableCurrencies.find(
                            item => item.currency.code === price.codeCurrency
                        );

                    if (!availableCurrency) {
                        return {
                            status: 404,
                            message: `La moneda ${price.codeCurrency} ya no se encuentra disponible.`,
                        };
                    }

                    localTotalOrderIncome += mathOperation(
                        price.amount,
                        availableCurrency.exchangeRate,
                        "multiplication"
                    );
                }
            }

            totalIncomesMainCurrency += localTotalOrderIncome;
            totalSalesMainCurerncy += localTotalOrder;
        }
    }

    return {
        status: 200,
        data: {
            totalIncomes,
            totalSales,
            totalSalesMainCurerncy,
            totalIncomesMainCurrency,
            totalCost: truncateValue(total_cost_selled_products, 2),
            economicCyclesIds: ids,
        },
    };
};

export const closeEconomicCycle = async (
    initialData: {
        businessId: number;
        userId?: number;
        isManualAction?: boolean;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //Finding all stock areas associated to bussines
    const stock_areas_found = await Area.findAll({
        where: {
            businessId: initialData.businessId,
            type: "STOCK",
            isActive: true,
        },
        transaction: childt,
    });

    //Precission
    const configurations = await getBusinessConfigCache(initialData.businessId);

    const precission_after_coma = configurations.find(
        item => item.key === "precission_after_coma"
    )?.value;

    const pos_allow_pending_payment =
        configurations.find(item => item.key === "pos_allow_pending_payment")
            ?.value === "true";

    //Obtaining the open Economic Cycle
    const activeEconomicCycle = await EconomicCycle.findOne({
        where: {
            businessId: initialData.businessId,
            isActive: true,
        },
        transaction: childt,
    });

    if (!activeEconomicCycle) {
        return {
            status: 400,
            message: `No hay ningún ciclo económico activo.`,
        };
    }

    //2. Closing EC
    const hour = moment(new Date()).hour();
    let closedAt = moment().toDate();
    if (hour === 0 && !initialData.isManualAction) {
        closedAt = moment(activeEconomicCycle.openDate).endOf("day").toDate();
    }

    //Analyzing if there is active orders
    const found_open_orders = await OrderReceipt.findAll({
        where: {
            economicCycleId: activeEconomicCycle.id,
            status: {
                [Op.not]: ["BILLED", "CANCELLED", "REFUNDED"],
            },
        },
        transaction: childt,
    });

    if (!pos_allow_pending_payment && found_open_orders.length !== 0) {
        return {
            status: 400,
            message: `Existen cuentas abiertas que deben ser cerradas.`,
        };
    }

    //Updating orders flag from created in same economiccycle
    await OrderReceipt.update(
        { createdInActualCycle: false },
        {
            where: {
                createdInActualCycle: true,
                businessId: initialData.businessId,
            },
            transaction: childt,
        }
    );

    if (found_open_orders.length !== 0) {
        let bulkOrdersToPassPending = [];
        let listBulkToRecord = [];
        for (const order of found_open_orders) {
            if (order.status === "PAYMENT_PENDING") {
                continue;
            }

            bulkOrdersToPassPending.push({
                id: order.id,
                status: "PAYMENT_PENDING",
            });

            listBulkToRecord.push({
                action: "ORDER_EDITED",
                title: getTitleOrderRecord("ORDER_EDITED"),
                details: `Cambio de estado de ${getOrderStatus(
                    order.status
                )} a Pendiente de pago por cierre de Ciclo económico.`,
                orderReceiptId: order.id,
                madeById: 1,
            });
        }

        await OrderReceipt.bulkCreate(bulkOrdersToPassPending, {
            updateOnDuplicate: ["status"],
            transaction: childt,
        });

        await OrderReceiptRecord.bulkCreate(listBulkToRecord, {
            transaction: childt,
        });
    }

    //Finding all StockAreaBooks
    const stock_area_books_found = await StockAreaBook.findAll({
        where: {
            economicCycleId: activeEconomicCycle.id,
        },
        include: [
            {
                model: User,
                as: "madeBy",
                paranoid: false,
            },
        ],
        transaction: childt,
    });

    //Processing Inventory
    for (const area of stock_areas_found) {
        const found = stock_area_books_found.find(
            item => item.areaId === area.id
        );

        if (found) {
            // Close action
            const stock_area_book = StockAreaBook.build({
                operation: "CLOSED",
                madeById: initialData.userId ?? 1,
                areaId: area.id,
                economicCycleId: activeEconomicCycle.id,
            });

            const result = await obtainAreaProcessedMovements({
                businessId: initialData.businessId,
                areaId: area.id,
                userId: initialData.userId,
                precission: precission_after_coma,
                initialState: JSON.parse(found.state),
                initAt: found.createdAt,
                economicCyle: activeEconomicCycle,
            });

            stock_area_book.state = JSON.stringify(result.processed_data);

            //Creating movements
            await StockMovement.bulkCreate(result.stock_movement_to_build, {
                transaction: childt,
            });

            await stock_area_book.save({
                transaction: childt,
            });
        }
    }

    const availableCurrencies = await getCurrenciesCache(
        initialData.businessId
    );

    //Saving historical exchangeRate
    const bussiness = await Business.findByPk(initialData.businessId);
    const exchangeRateCost = availableCurrencies.find(
        item => item.currency.code === bussiness?.costCodeCurrency
    );

    if (exchangeRateCost) {
        activeEconomicCycle.exchangeRateCostToMain =
            exchangeRateCost.exchangeRate;
    }

    activeEconomicCycle.closedById = initialData.userId ?? 1;
    activeEconomicCycle.closedDate = closedAt;
    activeEconomicCycle.isActive = false;

    //Preparing meta
    const toSaveMeta = {
        exchange_rates: normalizingCurrenciesToMeta(availableCurrencies),
    };
    const meta = JSON.stringify(toSaveMeta);
    activeEconomicCycle.meta = meta;

    await activeEconomicCycle.save({ transaction: childt });

    //Emit via Scokets - Closing all sessions
    (global as any).socket
        ?.to(`business:${initialData.businessId}`)
        .emit("economicCycle/close", { from: 1 });

    return {
        status: 200,
        data: {
            economiccycle: activeEconomicCycle,
        },
    };
};

export const obtainGeneralAreaSalesIncomes = (
    data: Array<any>,
    main_currency: AvailableCurrency,
    costCurrency: string
): GeneralAreaIncome => {
    //Variables to return
    const generalResult: any = {
        totalSales: [],
        totalSalesInMainCurrency: {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        },

        totalCost: {
            amount: 0,
            codeCurrency: costCurrency,
        },

        totalIncomesInMainCurrency: {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        },
        totalIncomes: [],
        totalIncomesNotInCash: [],
        totalIncomesInCash: [],

        totalInCash: [],
        totalInCashAfterOperations: [],

        totalOrderModifiers: [],

        totalTips: [],
        totalTipsMainCurrency: {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        },

        totalCommissions: [],
        totalDiscounts: [],
        totalCouponsDiscounts: [],
        totalShipping: [],
        totalHouseCosted: [],

        totalCashOperations: [],

        totalSalary: {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        },
    };

    for (const areaIncome of data) {
        if (areaIncome) {
            //Array object
            [
                "totalSales",
                "totalIncomesNotInCash",
                "totalTips",
                "totalCommissions",
                "totalDiscounts",
                "totalShipping",
                "totalHouseCosted",
                "totalCashOperations",
                "totalInCash",
                "totalInCashAfterOperations",
                "totalCouponsDiscounts",
                "totalIncomes",
                "totalIncomesInCash",
            ].forEach(element => {
                if (areaIncome[element]) {
                    areaIncome[element].forEach((item: SimplePrice) => {
                        const foundIndex = (
                            generalResult[element] as Array<SimplePrice>
                        ).findIndex(
                            general =>
                                general.codeCurrency === item.codeCurrency
                        );

                        if (foundIndex !== -1) {
                            generalResult[element][foundIndex].amount =
                                mathOperation(
                                    generalResult[element][foundIndex].amount,
                                    item.amount,
                                    "addition",
                                    2
                                );
                        } else {
                            generalResult[element].push(item);
                        }
                    });
                }
            });

            //Object
            [
                "totalCost",
                "totalSalary",
                "totalSalesInMainCurrency",
                "totalTipsMainCurrency",
                "totalIncomesInMainCurrency",
            ].forEach(element => {
                if (generalResult[element] && areaIncome[element]) {
                    generalResult[element] = {
                        amount: mathOperation(
                            areaIncome[element].amount,
                            generalResult[element].amount,
                            "addition",
                            2
                        ),
                        codeCurrency: areaIncome[element].codeCurrency,
                    };
                }
            });

            //Processing modifiers
            for (const modifier of areaIncome.orderModifiers || []) {
                const found_modifier = generalResult.totalOrderModifiers.find(
                    (item: any) => item.modifierId === modifier.modifierId
                );

                if (found_modifier) {
                    generalResult.totalOrderModifiers =
                        generalResult.totalOrderModifiers.map((item: any) => {
                            if (item.modifierId === modifier.modifierId) {
                                //Analizing prices
                                const foundPrice = item.prices.find(
                                    (price: SimplePrice) =>
                                        price.codeCurrency ===
                                        modifier.codeCurrency
                                );
                                if (foundPrice) {
                                    foundPrice.amount = mathOperation(
                                        foundPrice.amount,
                                        modifier.amount,
                                        "addition",
                                        2
                                    );
                                } else {
                                    found_modifier.prices.push({
                                        amount: modifier.amount,
                                        codeCurrency: modifier.codeCurrency,
                                    });
                                }
                            }

                            return item;
                        });
                } else {
                    generalResult.totalOrderModifiers.push({
                        modifierId: modifier.modifierId,
                        modifierName: modifier.showName,
                        prices: [
                            {
                                amount: modifier.amount,
                                codeCurrency: modifier.codeCurrency,
                            },
                        ],
                    });
                }
            }
        }
    }

    return generalResult;
};

export const getSummaryAccounts = async (
    listAccountsIds: Array<number>,
    dateFrom: string,
    dateTo: string
) => {
    const listAllOperations = await AccountOperation.findAll({
        where: {
            createdAt: {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            },
            accountId: listAccountsIds,
            operation: ["credit", "debit"],
        },
        include: [
            { model: AccountTag, required: false },
            Price,
            { model: Account, required: false },
        ],
    });

    let dataToReturn: Array<{
        tag: string;
        tagId: number;
        debit: Array<SimplePrice>;
        credit: Array<SimplePrice>;
        total: Array<SimplePrice>;
    }> = [];

    for (const operation of listAllOperations) {
        const accountCode = operation.account?.code
            ? `(${operation.account?.code})`
            : ``;
        const tagName = operation.accountTag?.name
            ? `${operation.accountTag?.name} ${accountCode}`
            : `Sin concepto ${accountCode}`;
        const tagId = operation.accountTagId || -1;
        const mode = operation.operation;

        const foundTagIndex = dataToReturn.findIndex(
            item => item.tagId === tagId
        );

        if (foundTagIndex !== -1) {
            //Individual
            const foundCurrencyIndex = dataToReturn[foundTagIndex][
                mode
            ].findIndex(
                item => item.codeCurrency === operation.amount!.codeCurrency
            );

            if (foundCurrencyIndex !== -1) {
                dataToReturn[foundTagIndex][mode][foundCurrencyIndex].amount =
                    mathOperation(
                        dataToReturn[foundTagIndex][mode][foundCurrencyIndex]
                            .amount,
                        operation.amount!.amount,
                        "addition",
                        2
                    );
            } else {
                dataToReturn[foundTagIndex][mode].push({
                    amount: operation.amount!.amount,
                    codeCurrency: operation.amount!.codeCurrency,
                });
            }
        } else {
            let temporal: any = {
                tag: tagName,
                tagId,
                debit: [],
                credit: [],
                total: [],
            };

            const toInclude = {
                amount: operation.amount!.amount,
                codeCurrency: operation.amount!.codeCurrency,
            };
            temporal[mode].push(toInclude);
            dataToReturn.push(temporal);
        }
    }

    for (const dataItem of dataToReturn) {
        let total: Array<SimplePrice> = [];

        ["credit", "debit"].forEach(mode => {
            //@ts-ignore
            for (const element of dataItem[mode]) {
                const found = total.find(
                    item => item.codeCurrency === element.codeCurrency
                );

                if (found) {
                    total = total.map(item => {
                        if (item.codeCurrency === element.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    element.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    total.push(element);
                }
            }
        });

        dataItem.total = total;
    }

    return dataToReturn;
};

export const contactArrayIPVStateProduct = (
    init: Array<IPVStateProduct>,
    append: Array<IPVStateProduct>,
    precission_after_coma?: string
) => {
    let mixedArray = init;

    for (const stateVar of append) {
        const foundIndex = mixedArray.findIndex(
            item => item.productId === stateVar.productId
        );

        if (foundIndex !== -1) {
            mixedArray[foundIndex].entry = mathOperation(
                mixedArray[foundIndex].entry,
                stateVar.entry,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].movements = mathOperation(
                mixedArray[foundIndex].movements,
                stateVar.movements,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].processed = mathOperation(
                mixedArray[foundIndex].processed,
                stateVar.processed,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].outs = mathOperation(
                mixedArray[foundIndex].outs,
                stateVar.outs,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].waste = mathOperation(
                mixedArray[foundIndex].waste,
                stateVar.waste,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].onlineSales = mathOperation(
                mixedArray[foundIndex].onlineSales,
                stateVar.onlineSales,
                "addition",
                precission_after_coma
            );
            mixedArray[foundIndex].sales = mathOperation(
                mixedArray[foundIndex].sales,
                stateVar.sales,
                "addition",
                precission_after_coma
            );

            //Analyzing variations
            if (
                mixedArray[foundIndex].variations.length !== 0 ||
                stateVar.variations.length !== 0
            ) {
                mixedArray[foundIndex].variations = contactArrayVariation(
                    mixedArray[foundIndex].variations,
                    stateVar.variations,
                    precission_after_coma
                );
            }
        } else {
            mixedArray.push(stateVar);
        }
    }

    return mixedArray;
};

export const contactArrayVariation = (
    init: Array<IPVStateVariation>,
    append: Array<IPVStateVariation>,
    precission_after_coma?: string
) => {
    let mixedArray = init;

    for (const stateVar of append) {
        const foundVariationIndex = mixedArray.findIndex(
            item => item.variationId === stateVar.variationId
        );
        if (foundVariationIndex !== -1) {
            mixedArray[foundVariationIndex].initial = mathOperation(
                mixedArray[foundVariationIndex].initial,
                stateVar.initial,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].inStock = mathOperation(
                mixedArray[foundVariationIndex].inStock,
                stateVar.inStock,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].entry = mathOperation(
                mixedArray[foundVariationIndex].entry,
                stateVar.entry,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].movements = mathOperation(
                mixedArray[foundVariationIndex].movements,
                stateVar.movements,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].processed = mathOperation(
                mixedArray[foundVariationIndex].processed,
                stateVar.processed,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].outs = mathOperation(
                mixedArray[foundVariationIndex].outs,
                stateVar.outs,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].waste = mathOperation(
                mixedArray[foundVariationIndex].waste,
                stateVar.waste,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].onlineSales = mathOperation(
                mixedArray[foundVariationIndex].onlineSales,
                stateVar.onlineSales,
                "addition",
                precission_after_coma
            );
            mixedArray[foundVariationIndex].sales = mathOperation(
                mixedArray[foundVariationIndex].sales,
                stateVar.sales,
                "addition",
                precission_after_coma
            );
        } else {
            mixedArray.push(stateVar);
        }
    }

    return mixedArray;
};
