import Queue from "bull";
import db from "../database/connection";

import { JobOrderData } from "./interfaces";
import Logger from "../lib/logger";
import OrderReceipt from "../database/models/orderReceipt";
import { config_transactions } from "../database/seq-transactions";
import { ItemProductSelled } from "../interfaces/models";
import { restoreProductStockDisponibility } from "../controllers/helpers/products";
import { internalCheckerResponse } from "../helpers/utils";
import { getTitleOrderRecord } from "../helpers/translator";
import OrderReceiptRecord from "../database/models/orderReceiptRecord";
import SelledProduct from "../database/models/selledProduct";

export const orderQueue = new Queue(
    `order-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
orderQueue.process(async (job: Queue.Job<JobOrderData>, done) => {
    try {
        switch (job.data.code) {
            case "CANCEL_ORDER":
                {
                    const t = await db.transaction(config_transactions);
                    try {
                        const { orderId, fullOrder, userId } = job.data.params;

                        const order = await OrderReceipt.findByPk(orderId, {
                            include: [SelledProduct],
                        });

                        if (!order) {
                            t.rollback();
                            Logger.error(`Order not found`, {
                                orderId,
                                origin: "bull-queue/orderQueue/CANCEL_ORDER",
                            });
                            done();
                            return;
                        }

                        //General variables
                        order.status = "CANCELLED";
                        await order.save({ transaction: t });

                        let normalizeProducts: Array<ItemProductSelled> = [];
                        for (const element of order.selledProducts) {
                            const foundSelled: SelledProduct | undefined =
                                order.selledProducts?.find(
                                    (item: SelledProduct) =>
                                        item.id === element.id
                                );

                            if (!foundSelled) {
                                t.rollback();
                                done();
                                return;
                            }

                            let bulkAddon = [];
                            for (const addon of element.addons || []) {
                                const found = foundSelled.addons?.find(
                                    item => item.id === addon.id
                                );

                                if (found) {
                                    bulkAddon.push({
                                        id: found.id,
                                        quantity: addon.quantity,
                                    });
                                }
                            }

                            //If was deleted selledProduct completly, remove all its addons
                            if (foundSelled.quantity === element.quantity) {
                                bulkAddon = [];
                                for (const addon of foundSelled.addons || []) {
                                    bulkAddon.push({
                                        id: addon.id,
                                        quantity: addon.quantity,
                                    });
                                }
                            }

                            normalizeProducts.push({
                                productId: foundSelled.productId,
                                quantity: element.quantity,
                                productionAreaId: foundSelled.productionAreaId,
                                variationId: foundSelled.variationId,
                                addons: bulkAddon,
                            });
                        }

                        let stockAreaId = order.areaSales?.stockAreaId;

                        if (stockAreaId) {
                            const result =
                                await restoreProductStockDisponibility(
                                    {
                                        products: normalizeProducts,
                                        stockAreaId:
                                            order.areaSales!.stockAreaId,
                                        businessId: order.businessId,
                                        userId,
                                        isAtSameEconomicCycle:
                                            order.createdInActualCycle ===
                                                undefined ||
                                            order.createdInActualCycle,
                                    },
                                    t
                                );

                            if (!internalCheckerResponse(result)) {
                                t.rollback();
                                Logger.error(
                                    result.message ||
                                        "Ha ocurrido un error inesperado.",
                                    {
                                        origin: "bull-queue/orderQueue/CANCEL_ORDER/manageProductsInOrder",
                                        businessId: order.businessId,
                                    }
                                );
                                done();
                                return;
                            }
                        }

                        let listRecords: any = [];

                        //Registering actions
                        listRecords.push({
                            action: "ORDER_CANCELLED",
                            title: getTitleOrderRecord("ORDER_CANCELLED"),
                            details: `Orden cancelada automáticamente por vencimiento`,
                            orderReceiptId: order.id,
                            madeById: 1,
                        });

                        await OrderReceiptRecord.bulkCreate(listRecords, {
                            transaction: t,
                        });

                        await t.commit();
                        done();
                    } catch (error: any) {
                        t.rollback();
                        Logger.error(
                            error.toString() ||
                                "Ha ocurrido un error inesperado.",
                            {
                                origin: "orderQueue/CANCEL_ORDER",
                            }
                        );
                        done();
                    }
                }

                break;

            case "REGISTER_RECORDS":
                {
                    const { records, orderId } = job.data.params;

                    const bulkRecords = records.map(
                        (item: OrderReceiptRecord) => {
                            return {
                                ...item,
                                orderReceiptId: orderId,
                            };
                        }
                    );

                    await OrderReceiptRecord.bulkCreate(bulkRecords);
                    done();
                }

                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
