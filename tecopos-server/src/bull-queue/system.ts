import Queue from "bull";
import moment from "moment";
import { Op, where, fn, col } from "sequelize";
import db from "../database/connection";

import { JobSystemData } from "./interfaces";
import Business from "../database/models/business";
import Logger from "../lib/logger";
import Area from "../database/models/area";
import ConfigurationKey from "../database/models/configurationKey";
import { obtainAreaProcessedMovements } from "../controllers/helpers/reports";
import Store from "../database/models/store";
import OrderReceipt from "../database/models/orderReceipt";
import { orderQueue } from "./order";
import StockMovement from "../database/models/stockMovement";
import { getBusinessConfigCache } from "../helpers/redisStructure";
import SelledProduct from "../database/models/selledProduct";

export const systemQueue = new Queue(
    `system-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
systemQueue.process(async (job: Queue.Job<JobSystemData>, done) => {
    try {
        switch (job.data.code) {
            case "INACTIVE_BUSINESS":
                {
                    const business = await Business.findByPk(
                        job.data.params.businessId
                    );

                    if (business) {
                        business.status = "INACTIVE";
                        await business.save();
                    }
                    done();
                }
                break;
            case "CANCEL_ORDERS_NOT_PAYED":
                {
                    const { businessId } = job.data.params;

                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    const online_shop_cancel_order_after_X_hours =
                        configurations.find(
                            item =>
                                item.key ===
                                "online_shop_cancel_order_after_X_hours"
                        )?.value;

                    const allowedHours = Number(
                        online_shop_cancel_order_after_X_hours
                    );

                    if (!isNaN(allowedHours)) {
                        const allowedDate = moment()
                            .subtract(allowedHours, "hour")
                            .format("YYYY-MM-DD HH:mm:ss");

                        const orders = await OrderReceipt.findAll({
                            where: {
                                businessId,
                                paidAt: {
                                    [Op.eq]: null,
                                },
                                createdAt: {
                                    [Op.lte]: allowedDate,
                                },
                                status: {
                                    [Op.or]: ["CREATED", "PAYMENT_PENDING"],
                                },
                                origin: [
                                    "woo",
                                    "online",
                                    "shop",
                                    "shopapk",
                                    "marketplace",
                                    "apk",
                                ],
                            },
                            include: [SelledProduct],
                            limit: 500,
                        });

                        for (const order of orders) {
                            orderQueue.add(
                                {
                                    code: "CANCEL_ORDER",
                                    params: {
                                        orderId: order.id,
                                        fullOrder: order,
                                    },
                                },
                                {
                                    attempts: 2,
                                    removeOnComplete: true,
                                    removeOnFail: true,
                                }
                            );
                        }
                    }
                    done();
                }
                break;
            case "SAVE_STOCK_STATE":
                {
                    const t = await db.transaction();

                    try {
                        const { businessId } = job.data.params;
                        const today = moment(new Date()).startOf("day");
                        const yesterday = moment(today).subtract(1, "day");

                        const stockAreas = await Area.findAll({
                            where: {
                                businessId,
                            },
                        });

                        //Precission
                        const configurations = await getBusinessConfigCache(
                            businessId
                        );

                        const precission_after_coma = configurations.find(
                            item => item.key === "precission_after_coma"
                        )?.value;

                        let bulkStore = [];
                        let bulkStockMovements: Partial<StockMovement>[] = [];
                        for (const area of stockAreas) {
                            //Found if data exist in the store
                            const foundStore = await Store.findOne({
                                where: {
                                    type: "STOCK_DAILY_STATE",
                                    areaId: area.id,
                                    madeAt: yesterday.format("YYYY-MM-DD"),
                                },
                            });

                            const result = await obtainAreaProcessedMovements({
                                businessId,
                                areaId: area.id,
                                precission: precission_after_coma,
                                initialState: foundStore
                                    ? JSON.parse(foundStore.data)
                                    : [],
                                initAt: yesterday.format("YYYY-MM-DD HH:mm:ss"),
                                from: "store",
                            });

                            if (result.processed_data.length !== 0) {
                                bulkStore.push({
                                    data: JSON.stringify(result.processed_data),
                                    type: "STOCK_DAILY_STATE",
                                    madeById: 1,
                                    areaId: area.id,
                                    businessId: businessId,
                                    madeAt: today.format("YYYY-MM-DD"),
                                });
                            }

                            //Adding movements to save
                            const movements =
                                result.stock_movement_to_build.filter(
                                    item => !!item.economicCycleId
                                );
                            bulkStockMovements =
                                bulkStockMovements.concat(movements);
                        }

                        //Registering historical
                        if (bulkStore.length !== 0) {
                            await Store.bulkCreate(bulkStore, {
                                transaction: t,
                            });
                        }

                        if (bulkStockMovements.length !== 0) {
                            const yesterday = moment()
                                .subtract(1, "day")
                                .endOf("day");
                            const bulkStockUpdated = bulkStockMovements.map(
                                item => {
                                    return {
                                        ...item,
                                        createdAt:
                                            yesterday.format(
                                                "YYYY-MM-DD HH:mm"
                                            ),
                                    };
                                }
                            );

                            await StockMovement.bulkCreate(bulkStockUpdated, {
                                transaction: t,
                            });
                        }

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
});
