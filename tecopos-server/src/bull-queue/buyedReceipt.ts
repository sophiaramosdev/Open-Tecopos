import Queue from "bull";
import db from "../database/connection";

import { JobPBuyedReceiptData } from "./interfaces";
import Logger from "../lib/logger";
import { exchangeCurrency, mathOperation } from "../helpers/utils";
import BuyedReceipt from "../database/models/buyedReceipt";
import Batch from "../database/models/batch";
import Price from "../database/models/price";
import BuyedReceiptFixedCost from "../database/models/buyedReceiptFixedCost";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../helpers/redisStructure";
import { config_transactions } from "../database/seq-transactions";

export const buyedReceiptQueue = new Queue(
    `buyedReceipt-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
buyedReceiptQueue.process(
    async (job: Queue.Job<JobPBuyedReceiptData>, done) => {
        try {
            switch (job.data.code) {
                case "UPDATE_COST":
                    {
                        const t = await db.transaction(config_transactions);

                        try {
                            const { buyedReceiptId, businessId } =
                                job.data.params;

                            const buyedReceipt = await BuyedReceipt.findByPk(
                                buyedReceiptId,
                                {
                                    include: [
                                        {
                                            model: Batch,
                                            include: [
                                                {
                                                    model: Price,
                                                    as: "registeredPrice",
                                                },
                                                {
                                                    model: Price,
                                                    as: "netCost",
                                                },
                                                {
                                                    model: Price,
                                                    as: "grossCost",
                                                },
                                            ],
                                        },
                                        {
                                            model: BuyedReceiptFixedCost,
                                            include: [
                                                {
                                                    model: Price,
                                                    as: "registeredPrice",
                                                },
                                            ],
                                        },
                                    ],
                                }
                            );

                            if (!buyedReceipt) {
                                t.rollback();
                                done();
                                Logger.warn(
                                    `El informe de recepción con id ${buyedReceiptId} no fue encontrado.`,
                                    {
                                        businessId,
                                        origin: "buyedReceiptQueue/UPDATE_COST",
                                    }
                                );
                                return;
                            }

                            //Precission
                            const configurations = await getBusinessConfigCache(
                                businessId
                            );
                            const available_currencies =
                                await getCurrenciesCache(businessId);
                            const main_currency = available_currencies.find(
                                item => item.isMain
                            )!.currency.code;

                            const costCurrency =
                                configurations.find(
                                    item => item.key === "general_cost_currency"
                                )?.value || main_currency;

                            let totalOperationCosts = 0;

                            for (const operationCost of buyedReceipt.costs) {
                                let newPrice = operationCost.registeredPrice;
                                if (
                                    operationCost.registeredPrice
                                        .codeCurrency !== costCurrency
                                ) {
                                    newPrice.amount =
                                        exchangeCurrency(
                                            {
                                                amount: operationCost
                                                    .registeredPrice.amount,
                                                codeCurrency:
                                                    operationCost
                                                        .registeredPrice
                                                        .codeCurrency,
                                            },
                                            costCurrency,
                                            available_currencies
                                        )?.amount || 0;
                                }

                                totalOperationCosts = mathOperation(
                                    newPrice.amount,
                                    totalOperationCosts,
                                    "addition",
                                    2
                                );
                            }

                            //Calculating netCost in each batches
                            let totalCost = 0;
                            let totalUnits = 0;
                            for (const batch of buyedReceipt.batches) {
                                totalUnits = mathOperation(
                                    totalUnits,
                                    batch.entryQuantity,
                                    "addition",
                                    2
                                );
                            }

                            const perUnity = mathOperation(
                                totalOperationCosts,
                                totalUnits,
                                "division",
                                2
                            );

                            let bulkUpdatePrice = [];
                            for (const batch of buyedReceipt.batches) {
                                let newAmount = perUnity;

                                if (!batch.grossCost) {
                                    const newPrice = Price.build({
                                        amount: perUnity,
                                        codeCurrency: costCurrency,
                                    });

                                    await newPrice.save({ transaction: t });
                                    batch.grossCostId = newPrice.id;
                                } else {
                                    newAmount = mathOperation(
                                        batch.grossCost.amount || 0,
                                        perUnity,
                                        "addition",
                                        2
                                    );
                                }

                                const generalTotal = mathOperation(
                                    batch.entryQuantity || 0,
                                    newAmount,
                                    "multiplication",
                                    2
                                );

                                totalCost = mathOperation(
                                    totalCost,
                                    generalTotal,
                                    "addition",
                                    2
                                );

                                if (!batch.netCost) {
                                    const newPrice = Price.build({
                                        amount: perUnity,
                                        codeCurrency: costCurrency,
                                    });

                                    await newPrice.save({ transaction: t });
                                    batch.netCostId = newPrice.id;
                                } else {
                                    if (newAmount !== batch.netCost.amount) {
                                        bulkUpdatePrice.push({
                                            priceId: batch.netCost.id,
                                            amount: newAmount,
                                        });
                                    }
                                }

                                await batch.save({ transaction: t });
                            }

                            if (bulkUpdatePrice.length !== 0) {
                                await Price.bulkCreate(bulkUpdatePrice, {
                                    updateOnDuplicate: ["amount"],
                                    transaction: t,
                                });
                            }

                            buyedReceipt.totalCost = totalCost;

                            await buyedReceipt.save({ transaction: t });

                            await t.commit();

                            done();
                        } catch (error: any) {
                            t.rollback();
                            Logger.error(error);
                            done(new Error(error.toString()));
                        }
                    }
                    break;
            }
        } catch (error: any) {
            Logger.error(error);
            done(new Error(error.toString()));
        }
    }
);
