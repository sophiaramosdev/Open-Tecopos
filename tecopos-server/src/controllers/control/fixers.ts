import { Request, Response } from "express";
import { Op, fn, col } from "sequelize";
import moment from "moment";

import OrderReceipt from "../../database/models/orderReceipt";
import SelledProduct from "../../database/models/selledProduct";
import Product from "../../database/models/product";
import { internalCheckerResponse, mathOperation } from "../../helpers/utils";
import Logger from "../../lib/logger";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import Price from "../../database/models/price";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import { SimplePrice } from "../../interfaces/commons";
import { systemQueue } from "../../bull-queue/system";
import Business from "../../database/models/business";
import PaymentGateway from "../../database/models/paymentGateway";
import ProductionTicket from "../../database/models/productionTicket";
import Person from "../../database/models/person";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Area from "../../database/models/area";
import {
    getCurrenciesCache,
    getEphimeralTermKey,
    getExpirationTime,
} from "../../helpers/redisStructure";
import SelledProductAddon from "../../database/models/selledProductAddon";
import CurrencyPayment from "../../database/models/currencyPayment";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import EconomicCycle from "../../database/models/economicCycle";
import { redisClient } from "../../../app";
import db from "../../database/connection";
import { calculateOrderTotal } from "../helpers/products";
import { accountQueue } from "../../bull-queue/account";
import ProductPrice from "../../database/models/productPrice";
import { economicCycleQueue } from "../../bull-queue/economicCycle";
import Account from "../../database/models/account";
import { productQueue } from "../../bull-queue/product";

export const recalculateOrdersCost = async (req: any, res: Response) => {
    try {
        const { dateFrom, businessId } = req.body;

        const orders = await OrderReceipt.findAll({
            include: [SelledProduct],
            where: {
                businessId,
                createdAt: {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                },
            },
        });

        let bulkUpdateOrder = [];
        let bulkUpdateSelledProduct = [];
        for (const order of orders) {
            let totalCost = 0;

            for (const selled of order.selledProducts) {
                const product = await Product.findByPk(selled.productId);

                const cost = mathOperation(
                    selled.quantity,
                    product?.averageCost || 0,
                    "multiplication",
                    2
                );

                bulkUpdateSelledProduct.push({
                    id: selled.id,
                    totalCost: cost,
                });

                totalCost += cost;
            }

            bulkUpdateOrder.push({
                id: order.id,
                totalCost,
            });
        }

        const afectedRowsOrdes = await OrderReceipt.bulkCreate(
            bulkUpdateOrder,
            {
                updateOnDuplicate: ["totalCost"],
                returning: true,
            }
        );

        const afectedRowsSelled = await SelledProduct.bulkCreate(
            bulkUpdateSelledProduct,
            {
                updateOnDuplicate: ["totalCost"],
                returning: true,
            }
        );

        res.status(200).json({
            afectedRowsOrdes: afectedRowsOrdes.length,
            afectedRowsSelled: afectedRowsSelled.length,
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

export const populatePaymentGateways = async (req: any, res: Response) => {
    try {
        const allBusiness = await Business.findAll({
            where: {
                status: "ACTIVE",
            },
            include: [PaymentGateway],
        });

        let bulkCreated: any = [];
        for (const business of allBusiness) {
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

            defaultPaymentGateways.forEach(item => {
                if (
                    !business.paymentsGateways.find(
                        payment => payment.code === item.code
                    )
                ) {
                    bulkCreated.push(item);
                }
            });
        }

        if (bulkCreated.length !== 0) {
            await PaymentGateway.bulkCreate(bulkCreated);
        }

        res.status(200).json(`done`);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const recalculateStockDisponibility = async (
    req: any,
    res: Response
) => {
    try {
        const { businessId } = req.body;

        let productUpdates: Array<{
            id: number;
            totalQuantity: number;
        }> = [];
        let productStockUpdate: Array<{
            id: number;
            quantity: number;
        }> = [];

        const products = await Product.findAll({
            where: {
                businessId,
                type: [
                    "STOCK",
                    "RAW",
                    "WASTE",
                    "MANUFACTURED",
                    "ASSET",
                    "VARIATION",
                ],
            },
            include: [
                { model: StockAreaProduct, include: [StockAreaVariation] },
            ],
        });

        for (const product of products) {
            if (product.type === "VARIATION") {
                let totalProduct = 0;

                product.stockAreaProducts?.forEach(item => {
                    const totalAmount =
                        item.variations?.reduce(
                            (total, variation) => (total += variation.quantity),
                            0
                        ) || 0;

                    totalProduct += totalAmount;

                    if (item.quantity !== totalAmount) {
                        productStockUpdate.push({
                            id: item.id,
                            quantity: totalAmount,
                        });
                    }
                });

                if (product.totalQuantity !== totalProduct) {
                    productUpdates.push({
                        id: product.id,
                        totalQuantity: totalProduct,
                    });
                }
            } else {
                const totalAmount =
                    product.stockAreaProducts?.reduce(
                        (total, item) => (total += item.quantity),
                        0
                    ) || 0;

                if (product.totalQuantity !== totalAmount) {
                    productUpdates.push({
                        id: product.id,
                        totalQuantity: totalAmount,
                    });
                }
            }
        }

        //Updating quantities in Central Stock
        const afectedRows = await Product.bulkCreate(productUpdates, {
            updateOnDuplicate: ["totalQuantity"],
            returning: true,
        });

        if (productStockUpdate.length > 0) {
            await StockAreaProduct.bulkCreate(productStockUpdate, {
                updateOnDuplicate: ["quantity"],
                returning: true,
            });
        }

        //Removing all stockAreaProducts remained in zero
        const stockAreas = await Area.findAll({
            where: {
                businessId,
                type: "STOCK",
            },
        });
        await StockAreaProduct.destroy({
            where: {
                areaId: stockAreas.map(item => item.id),
                quantity: 0,
            },
        });

        res.status(200).json({
            afectedRows: afectedRows.length,
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

export const populatingTotalToPay = async (req: any, res: Response) => {
    try {
        const { businessId } = req.body;

        const orders = await OrderReceipt.findAll({
            where: {
                businessId,
            },
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                {
                    model: SelledProduct,
                    include: [
                        {
                            model: Price,
                            as: "priceTotal",
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                    required: false,
                },
                {
                    model: Price,
                    as: "shippingPrice",
                },
                {
                    model: Price,
                    as: "taxes",
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                },
            ],
        });

        const availableCurrencies = await getCurrenciesCache(businessId);
        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        let bulkTotal = [];
        for (const order of orders) {
            if (order.houseCosted) {
                continue;
            }

            let totalPrices: Array<SimplePrice> = [];
            let totalPriceInMainCurrency = {
                amount: 0,
                codeCurrency: main_currency.currency.code,
            };

            //1. Calculating totalPrice
            for (const selledProduct of order.selledProducts) {
                const foundIndex = totalPrices.findIndex(
                    item =>
                        item.codeCurrency ===
                        selledProduct.priceTotal.codeCurrency
                );

                if (foundIndex !== -1) {
                    totalPrices[foundIndex].amount = mathOperation(
                        totalPrices[foundIndex].amount,
                        selledProduct.priceTotal.amount,
                        "addition",
                        2
                    );
                } else {
                    totalPrices.push({
                        amount: selledProduct.priceTotal.amount,
                        codeCurrency: selledProduct.priceTotal.codeCurrency,
                    });
                }

                //In main currency
                const foundCurrency = availableCurrencies.find(
                    item =>
                        item.currency.code ===
                        selledProduct.priceTotal.codeCurrency
                );

                if (!foundCurrency) {
                    return {
                        status: 404,
                        message: `Currency ${selledProduct.priceTotal.codeCurrency} is not available in the business`,
                    };
                }

                totalPriceInMainCurrency.amount += mathOperation(
                    selledProduct.priceTotal.amount,
                    foundCurrency.exchangeRate,
                    "multiplication",
                    2
                );
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

                //In main currency
                totalPriceInMainCurrency.amount = mathOperation(
                    totalPriceInMainCurrency.amount,
                    (totalPriceInMainCurrency.amount * order.discount) / 100,
                    "subtraction",
                    2
                );
            }

            //3. Analyzing if has discount Coupons
            if (order.couponDiscountPrice) {
                const foundIndex = totalPrices.findIndex(
                    item =>
                        item.codeCurrency ===
                        order.couponDiscountPrice?.codeCurrency
                );

                if (foundIndex !== -1) {
                    totalPrices[foundIndex].amount = mathOperation(
                        totalPrices[foundIndex].amount,
                        order.couponDiscountPrice.amount,
                        "subtraction",
                        2
                    );

                    //In main currency
                    const foundCurrency = availableCurrencies.find(
                        item =>
                            item.currency.code ===
                            order.couponDiscountPrice?.codeCurrency
                    );

                    if (!foundCurrency) {
                        return {
                            status: 404,
                            message: `Currency ${order.couponDiscountPrice?.codeCurrency} is not available in the business`,
                        };
                    }

                    totalPriceInMainCurrency.amount = mathOperation(
                        totalPriceInMainCurrency.amount,
                        order.couponDiscountPrice.amount *
                            foundCurrency.exchangeRate,
                        "subtraction",
                        2
                    );
                }
            }

            //4. Adding shipping
            if (order.shippingPrice) {
                const foundIndex = totalPrices.findIndex(
                    item =>
                        item.codeCurrency === order.shippingPrice?.codeCurrency
                );

                if (foundIndex !== -1) {
                    totalPrices[foundIndex].amount = mathOperation(
                        totalPrices[foundIndex].amount,
                        order.shippingPrice.amount,
                        "addition",
                        2
                    );

                    //In main currency
                    const foundCurrency = availableCurrencies.find(
                        item =>
                            item.currency.code ===
                            order.shippingPrice?.codeCurrency
                    );

                    if (!foundCurrency) {
                        return {
                            status: 404,
                            message: `Currency ${order.shippingPrice.codeCurrency} is not available in the business`,
                        };
                    }

                    totalPriceInMainCurrency.amount = mathOperation(
                        totalPriceInMainCurrency.amount,
                        order.shippingPrice.amount * foundCurrency.exchangeRate,
                        "subtraction",
                        2
                    );
                }
            }

            //Registering totals
            for (const price of totalPrices) {
                bulkTotal.push({
                    amount: price.amount,
                    codeCurrency: price.codeCurrency,
                    orderReceiptId: order.id,
                });
            }
        }

        //Saving in dataBase
        let middleBulk = [];
        for await (const total of bulkTotal) {
            middleBulk.push(total);
            if (middleBulk.length === 500) {
                await OrderReceiptTotal.bulkCreate(middleBulk);
                middleBulk = [];
            }
        }

        if (middleBulk.length !== 0) {
            await OrderReceiptTotal.bulkCreate(middleBulk);
        }

        res.status(200).json({
            afectedOrders: bulkTotal.length,
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

//Tester
export const testerEndpoint = async (req: any, res: Response) => {
    const structure = {
        configs: {
            required_product_id: true,
        },
        fields: {
            image_1: {
                required: false,
                value: "",
            },
            text_1: {
                required: false,
                value: "",
            },
            text_2: {
                required: false,
                value: "",
            },
            text_3: {
                required: false,
                value: "",
            },
            text_4: {
                required: false,
                value: "",
            },
            image_3: {
                required: false,
                value: "",
            },
            text_7: {
                required: false,
                value: "",
            },
            image_4: {
                required: false,
                value: "",
            },
            text_8: {
                required: false,
                value: "",
            },
        },
    };

    console.log("=====");
    console.log(JSON.stringify(structure));
    console.log("=====");

    res.status(200);

    // const { businessId } = req.body;

    // const allProducts = await Product.findAll({
    //     where: {
    //         businessId,
    //         type: ["STOCK", "MENU"],
    //     },
    // });

    // productQueue.add(
    //     {
    //         code: "CHECKING_PRODUCT",
    //         params: {
    //             productsIds: allProducts.map(item => item.id),
    //             businessId: businessId,
    //         },
    //     },
    //     { attempts: 2, removeOnComplete: true, removeOnFail: true }
    // );

    // const day = moment(new Date()).subtract(1, "day");
    // const init = day.startOf("day").format("YYYY-MM-DD HH:mm:ss.SSS");
    // const ends = day.endOf("day").format("YYYY-MM-DD HH:mm:ss.SSS");

    // const allAccountsWithAutomatedCycleAt12M = await Account.findAll({
    //     where: {
    //         businessId: 85,
    //     },
    // });

    // for (const account of allAccountsWithAutomatedCycleAt12M) {
    //     accountQueue.add(
    //         {
    //             code: "DAILY_BALANCE",
    //             params: {
    //                 accountId: account.id,
    //                 init,
    //                 end: ends,
    //             },
    //         },
    //         {
    //             attempts: 2,
    //             removeOnComplete: true,
    //             removeOnFail: true,
    //         }
    //     );
    // }

    res.status(200).json(`finito`);

    // let counter = 0;
    // const allPrices = await ProductPrice.findAll({
    //     where: {
    //         codeCurrency: "CUP",
    //     },
    //     include: [
    //         {
    //             model: Product,
    //             where: {
    //                 businessId: 49,
    //             },
    //         },
    //     ],
    // });

    // let bulkPriceUpdate: Array<any> = [];

    // //Make a function that update integer to next 50 value ending
    // for (const price of allPrices) {
    //     if (price.price % 100 !== 0 && price.price % 100 !== 50) {
    //         counter++;
    //         const newPrice = Math.ceil(price.price / 50) * 50;
    //         bulkPriceUpdate.push({
    //             id: price.id,
    //             price: newPrice,
    //         });
    //     }
    // }

    // if (bulkPriceUpdate.length !== 0) {
    //     await ProductPrice.bulkCreate(bulkPriceUpdate, {
    //         updateOnDuplicate: ["price"],
    //     });
    // }

    // const economicCycles = await EconomicCycle.findAll({
    //     where: {
    //         businessId: 109,
    //         openDate: {
    //             [Op.gte]: "2024-01-01",
    //         },
    //     },
    // });

    // for (const economicCycle of economicCycles) {
    //     counter++;
    //     await CashRegisterOperation.destroy({
    //         where: {
    //             economicCycleId: economicCycle.id,
    //             operation: ["MANUAL_DEPOSIT", "MANUAL_WITHDRAW"],
    //         },
    //     });
    // }

    // const orders = await OrderReceipt.findAll({
    //     where: {
    //         businessId: 109,
    //         status: ["BILLED"],
    //         createdAt: {
    //             [Op.gte]: "2024-01-01",
    //         },
    //     },
    //     include: [
    //         OrderReceiptTotal,
    //         {
    //             model: SelledProduct,
    //             include: [
    //                 { model: Price, as: "priceTotal" },
    //                 { model: Price, as: "priceUnitary" },
    //             ],
    //         },
    //         {
    //             model: Price,
    //             as: "couponDiscountPrice",
    //         },
    //         {
    //             model: Price,
    //             as: "shippingPrice",
    //         },
    //     ],
    // });

    // let bulkTotal = [];
    // let bulkPrices = [];

    // for (const order of orders) {
    //     let totalPrices: Array<SimplePrice> = [];
    //     //1. Calculating totalPrice
    //     for (const selledProduct of order.selledProducts) {
    //         const found = totalPrices.find(
    //             item =>
    //                 item.codeCurrency ===
    //                 selledProduct.priceUnitary.codeCurrency
    //         );

    //         const priceTotal = mathOperation(
    //             selledProduct.priceUnitary.amount,
    //             selledProduct.quantity,
    //             "multiplication",
    //             2
    //         );

    //         if (found) {
    //             totalPrices = totalPrices.map(item => {
    //                 if (
    //                     item.codeCurrency ===
    //                     selledProduct.priceUnitary.codeCurrency
    //                 ) {
    //                     return {
    //                         ...item,
    //                         amount: mathOperation(
    //                             item.amount,
    //                             priceTotal,
    //                             "addition",
    //                             2
    //                         ),
    //                     };
    //                 }

    //                 return item;
    //             });
    //         } else {
    //             totalPrices.push({
    //                 amount: priceTotal,
    //                 codeCurrency: selledProduct.priceUnitary.codeCurrency,
    //             });
    //         }
    //     }

    //     for (const price of totalPrices) {
    //         bulkPrices.push({
    //             price: price.amount,
    //             codeCurrency: price.codeCurrency,
    //             orderReceiptId: order.id,
    //         });
    //     }

    //     //2. Analyzing discount
    //     if (order.discount) {
    //         for (const price of totalPrices) {
    //             price.amount = mathOperation(
    //                 price.amount,
    //                 (price.amount * order.discount) / 100,
    //                 "subtraction",
    //                 2
    //             );
    //         }
    //     }

    //     //3. Analyzing commission
    //     if (order.commission) {
    //         for (const price of totalPrices) {
    //             price.amount = mathOperation(
    //                 price.amount,
    //                 (price.amount * order.commission) / 100,
    //                 "addition",
    //                 2
    //             );
    //         }
    //     }

    //     //4. Analyzing if has discount Coupons
    //     if (order.couponDiscountPrice) {
    //         const found = totalPrices.find(
    //             item =>
    //                 item.codeCurrency ===
    //                 order.couponDiscountPrice?.codeCurrency
    //         );

    //         if (found) {
    //             totalPrices = totalPrices.map(item => {
    //                 if (
    //                     item.codeCurrency ===
    //                     order.couponDiscountPrice?.codeCurrency
    //                 ) {
    //                     return {
    //                         ...item,
    //                         amount: mathOperation(
    //                             item.amount,
    //                             order.couponDiscountPrice.amount,
    //                             "subtraction",
    //                             2
    //                         ),
    //                     };
    //                 }

    //                 return item;
    //             });
    //         }
    //     }

    //     //5. Adding shipping
    //     if (order.shippingPrice) {
    //         const found = totalPrices.find(
    //             item => item.codeCurrency === order.shippingPrice?.codeCurrency
    //         );

    //         if (found) {
    //             totalPrices = totalPrices.map(item => {
    //                 if (
    //                     item.codeCurrency === order.shippingPrice?.codeCurrency
    //                 ) {
    //                     return {
    //                         ...item,
    //                         amount: mathOperation(
    //                             item.amount,
    //                             order.shippingPrice.amount,
    //                             "addition",
    //                             2
    //                         ),
    //                     };
    //                 }

    //                 return item;
    //             });
    //         }
    //     }

    //     counter++;

    //     if (order.houseCosted) {
    //         continue;
    //     }

    //     //Registering totals to pay
    //     for (const price of totalPrices) {
    //         bulkTotal.push({
    //             amount: price.amount,
    //             codeCurrency: price.codeCurrency,
    //             orderReceiptId: order.id,
    //         });
    //     }
    // }

    // if (bulkTotal.length !== 0) {
    //     await OrderReceiptTotal.destroy({
    //         where: {
    //             orderReceiptId: bulkTotal.map(item => item.orderReceiptId),
    //         },
    //     });

    //     await OrderReceiptTotal.bulkCreate(bulkTotal);
    // }

    // if (bulkPrices.length !== 0) {
    //     await OrderReceiptPrice.destroy({
    //         where: {
    //             orderReceiptId: bulkPrices.map(item => item.orderReceiptId),
    //         },
    //     });

    //     await OrderReceiptPrice.bulkCreate(bulkPrices);
    // }

    // return res.status(200).json(counter);
};
