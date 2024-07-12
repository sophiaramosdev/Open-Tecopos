import Queue from "bull";
import { blurhashFromURL } from "blurhash-from-url";

import { JobProductionOrderData } from "./interfaces";
import Logger from "../lib/logger";
import ProductProductionOrder from "../database/models/productProductionOrder";
import Product from "../database/models/product";
import OrderProductionFixedCost from "../database/models/orderProductionFixedCost";
import ProductionOrder from "../database/models/productionOrder";
import { mathOperation } from "../helpers/utils";

export const productionOrderQueue = new Queue(
    `productionOrder-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
productionOrderQueue.process(
    async (job: Queue.Job<JobProductionOrderData>, done) => {
        try {
            switch (job.data.code) {
                case "UPDATE_PRODUCTION_ORDER_COST":
                    {
                        const { productionOrderId, businessId } =
                            job.data.params;

                        const productionOrder = await ProductionOrder.findByPk(
                            productionOrderId
                        );

                        if (!productionOrder) {
                            done();
                            Logger.warn(
                                `La orden de produccion con id ${productionOrderId} no fue encontrada.`,
                                {
                                    businessId,
                                    origin: "productionOrderQueue/UPDATE_PRODUCTION_ORDER_COST",
                                }
                            );
                            return;
                        }

                        const rawProducts =
                            await ProductProductionOrder.findAll({
                                where: {
                                    productionOrderId,
                                    type: "RAW",
                                },
                                include: [Product],
                            });

                        let plannedCost = 0;
                        rawProducts.forEach(rawProduct => {
                            plannedCost +=
                                rawProduct.product.averageCost *
                                rawProduct.quantity;
                        });

                        //Finding all fixed costs
                        const fixedCosts =
                            await OrderProductionFixedCost.findAll({
                                where: {
                                    productionOrderId,
                                },
                            });

                        fixedCosts.forEach(fixedCost => {
                            plannedCost += fixedCost.costAmount;
                        });

                        productionOrder.plannedCost = mathOperation(
                            plannedCost,
                            0,
                            "addition",
                            2
                        );
                        await productionOrder.save();

                        done();
                    }
                    break;
            }
        } catch (error: any) {
            Logger.error(error);
            done(new Error(error.toString()));
        }
    }
);
