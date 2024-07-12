import { Response } from "express";
import db from "../../database/connection";
import User from "../../database/models/user";
import ConfigurationKey from "../../database/models/configurationKey";
import Logger from "../../lib/logger";
import Product from "../../database/models/product";
import { productQueue } from "../../bull-queue/product";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import { exchangeCurrency } from "../../helpers/utils";
import SelledProduct from "../../database/models/selledProduct";
import OrderReceipt from "../../database/models/orderReceipt";
import Recipe from "../../database/models/recipe";
import ProductFixedCost from "../../database/models/productFixedCost";
import ProductionOrder from "../../database/models/productionOrder";
import OrderProductionFixedCost from "../../database/models/orderProductionFixedCost";
import PaymentGateway from "../../database/models/paymentGateway";
import moment from "moment";
import { redisClient } from "../../../app";
import {
    getCurrenciesCache,
    getLongTermKey,
} from "../../helpers/redisStructure";
import { myBusinessToReturn } from "../helpers/business";

//Configurations
export const editMyConfigurations = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { configs } = req.body;
        const user: User = req.user;

        const businessConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId: user.businessId,
                isSensitive: false,
            },
        });

        let updateBulk: Array<{ id: number; key: string; value: string }> = [];
        let runCheckAllProducts = false;
        let runChangeCostCurrency = false;
        let previousCostCurrency = undefined;
        for (const element of configs) {
            const found = businessConfigurations.find(
                item => item.key === element.key
            );

            if (found) {
                if (element.key === "online_shop_area_stock") {
                    runCheckAllProducts = true;
                }

                if (
                    element.key === "general_cost_currency" &&
                    element.value !== found.value
                ) {
                    runChangeCostCurrency = true;
                    previousCostCurrency = found.value;
                }

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

        const updatedConfigs = await ConfigurationKey.findAll({
            where: {
                businessId: user.businessId,
                isSensitive: false,
            },
            transaction: t,
        });

        //Validating working with official exchange rate
        const found = updatedConfigs.find(
            item =>
                item.key === "enable_oficial_exchange_rate" &&
                item.value === "false"
        );
        if (found) {
            await ConfigurationKey.update(
                {
                    value: "false",
                },
                {
                    where: {
                        businessId: user.businessId,
                        key: [
                            "return_order_change_according_oficial_exchange",
                            "print_order_with_prices_adjust_to_oficial_exchange",
                        ],
                    },
                }
            );
        }

        //Checking special cases
        //1. If automated economic is enabled then ongoing order must be in false
        const enable_ongoing_orders =
            updatedConfigs.find(item => item.key === "enable_ongoing_orders")
                ?.value === "true";
        const is_economiccycle_automated =
            updatedConfigs.find(
                item => item.key === "is-economiccycle-automated"
            )?.value === "true";
        const pos_allow_pending_payment =
            updatedConfigs.find(
                item => item.key === "pos_allow_pending_payment"
            )?.value === "true";

        if (
            enable_ongoing_orders &&
            is_economiccycle_automated &&
            !pos_allow_pending_payment
        ) {
            t.rollback();
            return res.status(400).json({
                message: `No puede establecerse ciclos económicos automáticos mientras estén habilitadas las órdenes en marcha y no permitidas las cuentas por cobrar.`,
            });
        }

        if (runChangeCostCurrency) {
            //1. Finding currencies to work
            const availableCurrencies = await AvailableCurrency.findAll({
                where: {
                    businessId: user.businessId,
                },
                include: [Currency],
                paranoid: false,
                transaction: t,
            });

            const main_currency = availableCurrencies.find(item => item.isMain);

            if (!main_currency) {
                return {
                    status: 400,
                    message: `There is no main currency defined.`,
                };
            }

            const actualCostCurrency = updatedConfigs.find(
                item => item.key === "general_cost_currency"
            )?.value;

            //1. Products
            let listProductsToUpdate = [];
            const allProducts = await Product.findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            for (const product of allProducts) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: product.averageCost,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listProductsToUpdate.push({
                    id: product.id,
                    averageCost: updatedCost?.amount || 0,
                });
            }

            //2. List Selled Products
            let listSelledProductsToUpdate = [];
            const allSelledProducts = await SelledProduct.findAll({
                include: [
                    {
                        model: OrderReceipt,
                        where: {
                            businessId: user.businessId,
                        },
                    },
                ],
            });

            for (const selledProduct of allSelledProducts) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: selledProduct.totalCost,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listSelledProductsToUpdate.push({
                    id: selledProduct.id,
                    averageCost: updatedCost?.amount || 0,
                });
            }

            //3. List orders
            let listOrdersToUpdate = [];
            const allOrderReceipts = await OrderReceipt.findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            for (const order of allOrderReceipts) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: order.totalCost,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listOrdersToUpdate.push({
                    id: order.id,
                    averageCost: updatedCost?.amount || 0,
                });
            }

            //4. Recipe costs
            let listReceipeToUpdate = [];
            const allRecipes = await Recipe.findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            for (const recipe of allRecipes) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: recipe.totalCost,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listReceipeToUpdate.push({
                    id: recipe.id,
                    totalCost: updatedCost?.amount || 0,
                });
            }

            //5. Fixed costs
            let listFixedCostToUpdate = [];
            const allFixedCosts = await ProductFixedCost.findAll({
                include: [
                    {
                        model: Product,
                        where: {
                            businessId: user.businessId,
                        },
                    },
                ],
            });

            for (const fixedCost of allFixedCosts) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: fixedCost.costAmount,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listFixedCostToUpdate.push({
                    id: fixedCost.id,
                    costAmount: updatedCost?.amount || 0,
                });
            }

            //5. Order production costs
            let listOrderProductionToUpdate = [];
            const allProductionOrders = await ProductionOrder.findAll({
                where: {
                    businessId: user.businessId,
                },
            });

            for (const productionOrder of allProductionOrders) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: productionOrder.totalCost,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listOrderProductionToUpdate.push({
                    id: productionOrder.id,
                    totalCost: updatedCost?.amount || 0,
                });
            }

            //5. Order production fixed costs
            let listOPFixedCostToUpdate = [];
            const allOPFixedCosts = await OrderProductionFixedCost.findAll({
                include: [
                    {
                        model: ProductionOrder,
                        where: {
                            businessId: user.businessId,
                        },
                    },
                ],
            });

            for (const fixedCost of allOPFixedCosts) {
                const updatedCost = exchangeCurrency(
                    {
                        amount: fixedCost.costAmount,
                        codeCurrency:
                            previousCostCurrency || main_currency.currency.code,
                    },
                    actualCostCurrency!,
                    availableCurrencies
                );

                listOPFixedCostToUpdate.push({
                    id: fixedCost.id,
                    costAmount: updatedCost?.amount || 0,
                });
            }

            const batchSize = 2000;
            if (listProductsToUpdate.length > 0) {
                const totalObjects = listProductsToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listProductsToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await Product.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["averageCost"],
                        transaction: t,
                    });
                }
            }

            if (listSelledProductsToUpdate.length > 0) {
                const totalObjects = listSelledProductsToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listSelledProductsToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await SelledProduct.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["totalCost"],
                        transaction: t,
                    });
                }
            }

            if (listOrdersToUpdate.length > 0) {
                const totalObjects = listOrdersToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listOrdersToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await OrderReceipt.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["totalCost"],
                        transaction: t,
                    });
                }
            }

            if (listReceipeToUpdate.length > 0) {
                const totalObjects = listReceipeToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listReceipeToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await Recipe.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["totalCost"],
                        transaction: t,
                    });
                }
            }

            if (listFixedCostToUpdate.length > 0) {
                const totalObjects = listFixedCostToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listFixedCostToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await ProductFixedCost.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["costAmount"],
                        transaction: t,
                    });
                }
            }

            if (listOrderProductionToUpdate.length > 0) {
                const totalObjects = listOrderProductionToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listOrderProductionToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await ProductionOrder.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["totalCost"],
                        transaction: t,
                    });
                }
            }

            if (listOPFixedCostToUpdate.length > 0) {
                const totalObjects = listOPFixedCostToUpdate.length;
                for (
                    let startIdx = 0;
                    startIdx < totalObjects;
                    startIdx += batchSize
                ) {
                    const endIdx = Math.min(startIdx + batchSize, totalObjects);
                    const batchToUpdate = listOPFixedCostToUpdate.slice(
                        startIdx,
                        endIdx
                    );
                    await OrderProductionFixedCost.bulkCreate(batchToUpdate, {
                        updateOnDuplicate: ["costAmount"],
                        transaction: t,
                    });
                }
            }
        }

        await t.commit();

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "configurations", "get")
        );

        res.status(200).json(
            afectedRows.map(item => {
                return {
                    key: item.key,
                    value: item.value,
                };
            })
        );

        const business_to_emit = await myBusinessToReturn(user);

        if (business_to_emit) {
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

        if (runCheckAllProducts) {
            const allBusinessProducts = await Product.findAll({
                where: {
                    businessId: user.businessId,
                    type: ["STOCK", "VARIATION"],
                },
            });

            //Checking products
            productQueue.add(
                {
                    code: "CHECKING_PRODUCT",
                    params: {
                        productsIds: allBusinessProducts.map(item => item.id),
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }
    } catch (error: any) {
        Logger.error(error);
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

const allowedReturned = ["tropipay_client_id", "tropipay_client_secret"];

export const editMySensibleConfigurations = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { configs } = req.body;
        const user: User = req.user;

        const businessConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId: user.businessId,
                key: allowedReturned,
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

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "configurations", "get")
        );

        res.status(200).json(
            afectedRows.map(item => {
                return {
                    key: item.key,
                    value: item.value,
                };
            })
        );
    } catch (error: any) {
        Logger.error(error);
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMySensibleConfigurations = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const businessConfigurations = await ConfigurationKey.findAll({
            attributes: ["key", "value"],
            where: {
                businessId: user.businessId,
                key: allowedReturned,
            },
        });

        res.status(200).json(businessConfigurations);
    } catch (error: any) {
        Logger.error(error);
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const registerTecopayAccount = async (req: any, res: Response) => {
    try {
        const { account, accountHolder } = req.body;
        const user: User = req.user;

        const businessConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId: user.businessId,
                isSensitive: false,
            },
        });

        let updateBulk: Array<{ id: number; key: string; value: string }> = [];

        //Account target
        const foundTarget = businessConfigurations.find(
            item => item.key === "tecopay_target_account"
        );

        if (!foundTarget) {
            return res.status(404).json({
                message: `La propiedad tecopay_target_account no fue encontrada.`,
            });
        }

        updateBulk.push({
            id: foundTarget.id,
            key: foundTarget.key,
            value: account,
        });

        //Account data
        const foundData = businessConfigurations.find(
            item => item.key === "tecopay_registered_data"
        );

        if (!foundData) {
            return res.status(404).json({
                message: `La propiedad tecopay_registered_data no fue encontrada.`,
            });
        }

        updateBulk.push({
            id: foundData.id,
            key: foundData.key,
            value: JSON.stringify({
                account,
                accountHolder,
                registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
                registeredBy: user.displayName || user.email,
            }),
        });

        await ConfigurationKey.bulkCreate(updateBulk, {
            updateOnDuplicate: ["value"],
        });

        //Checking if currency is registered in the business
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const foundCurrency = availableCurrencies.find(
            item => item.currency.code === "PTP"
        );

        const PTPCurrency = await Currency.findOne({
            where: {
                code: "PTP",
            },
        });

        if (!PTPCurrency) {
            return res.status(404).json({
                message: `La moneda PTP no fue encontrada.`,
            });
        }

        if (!foundCurrency) {
            await AvailableCurrency.bulkCreate([
                {
                    exchangeRate: 1,
                    isActive: true,
                    businessId: user.businessId,
                    currencyId: PTPCurrency.id,
                },
            ]);
        }

        //Activating payment gateway
        const foundPaymentGateway = await PaymentGateway.findOne({
            where: {
                businessId: user.businessId,
                code: "G_TECOPAY",
            },
        });

        if (foundPaymentGateway) {
            foundPaymentGateway.isActive = true;
            await foundPaymentGateway.save();
        }

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "configurations", "get")
        );

        res.status(200).json({
            message: `Action completed`,
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

export const deleteTecopayAccount = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const businessConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId: user.businessId,
                isSensitive: false,
            },
        });

        let updateBulk: Array<{ id: number; key: string; value: string }> = [];

        //Account target
        const foundTarget = businessConfigurations.find(
            item => item.key === "tecopay_target_account"
        );

        if (!foundTarget) {
            return res.status(404).json({
                message: `La propiedad tecopay_target_account no fue encontrada.`,
            });
        }

        updateBulk.push({
            id: foundTarget.id,
            key: foundTarget.key,
            value: "",
        });

        //Account data
        const foundData = businessConfigurations.find(
            item => item.key === "tecopay_registered_data"
        );

        if (!foundData) {
            return res.status(404).json({
                message: `La propiedad tecopay_registered_data no fue encontrada.`,
            });
        }

        updateBulk.push({
            id: foundData.id,
            key: foundData.key,
            value: "",
        });

        await ConfigurationKey.bulkCreate(updateBulk, {
            updateOnDuplicate: ["value"],
        });

        //Desactivating payment gateway
        const foundPaymentGateway = await PaymentGateway.findOne({
            where: {
                businessId: user.businessId,
                code: "G_TECOPAY",
            },
        });

        if (foundPaymentGateway) {
            foundPaymentGateway.isActive = false;
            await foundPaymentGateway.save();
        }

        //Analyzing cache and remove key in case exist
        await redisClient.del(
            getLongTermKey(user.businessId, "configurations", "get")
        );

        res.status(200).json({
            message: `Action completed`,
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
