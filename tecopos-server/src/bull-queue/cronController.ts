import moment from "moment";
import { Op } from "sequelize";

import Business from "../database/models/business";
import ConfigurationKey from "../database/models/configurationKey";
import { economicCycleQueue } from "./economicCycle";
import { systemQueue } from "./system";
import Product from "../database/models/product";
import Logger from "../lib/logger";
import { productQueue } from "./product";
import { personQueue } from "./person";
import OrderReceipt from "../database/models/orderReceipt";
import { emailQueue } from "./email";
import Account from "../database/models/account";
import { accountQueue } from "./account";
import SelledProduct from "../database/models/selledProduct";
import Price from "../database/models/price";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import OrderReceiptTotal from "../database/models/OrderReceiptTotal";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Country from "../database/models/country";
import ShippingAddress from "../database/models/shippingAddress";
import SelledProductAddon from "../database/models/selledProductAddon";
import Client from "../database/models/client";
import OrderReceiptRecord from "../database/models/orderReceiptRecord";
import { getOrderStatus, getTitleOrderRecord } from "../helpers/translator";
import EconomicCycle from "../database/models/economicCycle";

export const systemChecker = async () => {
    try {
        //Obtaining all the business and analyzing them
        const businesses = await Business.findAll();
        for (const business of businesses) {
            //Analyzing licence
            const limitLicence = moment(business.licenceUntil).add(7, "days");
            if (moment(new Date()).isAfter(limitLicence, "days")) {
                systemQueue.add(
                    {
                        code: "INACTIVE_BUSINESS",
                        params: {
                            businessId: business.id,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
            //Stocks
            systemQueue.add(
                {
                    code: "SAVE_STOCK_STATE",
                    params: {
                        businessId: business.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Updating new Arrivals
        const limitNewArrivals = moment(new Date()).subtract(7, "days");
        await Product.update(
            {
                newArrival: false,
                newArrivalAt: null,
            },
            {
                where: {
                    newArrival: true,
                    newArrivalAt: {
                        [Op.lte]: limitNewArrivals
                            .endOf("day")
                            .format("YYYY-MM-DD HH:mm:ss"),
                    },
                },
            }
        );
        //Analyzing for depreciation products
        const foundProductToDepreciate = await Product.findAll({
            where: {
                enableDepreciation: true,
            },
        });
        for (const product of foundProductToDepreciate) {
            productQueue.add(
                {
                    code: "DEPRECIATE_PRODUCT",
                    params: {
                        product,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Deprecated TODO: Removed
        //Sending to analyze all business with WooCommerce
        // const woo_businesses = await Business.findAll({
        //     where: {
        //         status: "ACTIVE",
        //     },
        //     include: [
        //         {
        //             model: ConfigurationKey,
        //             where: {
        //                 key: "module_woocommerce",
        //                 value: "true",
        //             },
        //         },
        //     ],
        // });
        // if (woo_businesses.length !== 0) {
        //     for (const business of woo_businesses) {
        //         wooQueue.add(
        //             {
        //                 code: "WOO_BUSINESS_CHECKER",
        //                 params: {
        //                     businessId: business.id,
        //                 },
        //             },
        //             { attempts: 2, removeOnComplete: true, removeOnFail: true }
        //         );
        //     }
        // }
    } catch (error: any) {
        Logger.error(error, { origin: "systemChecker" });
    }
};

export const hourlyChecker = async () => {
    try {
        const hour = moment(new Date()).hour();
        //Analyzing if economicCycle is automated
        const businesses = await Business.findAll({
            where: {
                status: "ACTIVE",
            },
            include: [ConfigurationKey],
        });
        let businessWithStarts: Array<Business> = [];
        let businessWithAutomaticCancellation: Array<Business> = [];
        let businessWithEnforcedAccess: Array<Business> = [];
        for (const business of businesses) {
            //Open-close economic cycle
            const foundIsStartsAt =
                business.configurationsKey.find(
                    item => item.key === "economiccycle-startAt"
                )?.value === hour.toString();

            const foundIsAutomated =
                business.configurationsKey.find(
                    item => item.key === "is-economiccycle-automated"
                )?.value === "true";

            if (foundIsAutomated && foundIsStartsAt) {
                businessWithStarts.push(business);
            }

            //Finding all business with automatic cancellation
            const foundAutomaticCancellation =
                business.configurationsKey.find(
                    item =>
                        item.key ===
                        "online_shop_enable_cancel_orders_automatically"
                )?.value === "true";
            if (foundAutomaticCancellation) {
                businessWithAutomaticCancellation.push(business);
            }
            //Finding all business with access enforce
            const foundEnforcedAccess =
                business.configurationsKey.find(
                    item => item.key === "force_access_system"
                )?.value === "true";
            if (foundEnforcedAccess) {
                businessWithEnforcedAccess.push(business);
            }
        }
        if (businessWithStarts.length !== 0) {
            for (const business of businessWithStarts) {
                economicCycleQueue.add(
                    {
                        code: "OPEN_CLOSE_EC",
                        params: {
                            businessId: business.id,
                            actionHour: hour,
                            isAnAutomatedAction: true,
                        },
                    },
                    {
                        attempts: 30,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );
            }
        }
        if (businessWithAutomaticCancellation.length !== 0) {
            for (const business of businessWithAutomaticCancellation) {
                systemQueue.add(
                    {
                        code: "CANCEL_ORDERS_NOT_PAYED",
                        params: {
                            businessId: business.id,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }

        if (businessWithEnforcedAccess.length !== 0) {
            for (const business of businessWithEnforcedAccess) {
                personQueue.add(
                    {
                        code: "CHECK_PEOPLE_IN_BUSINESS",
                        params: {
                            businessId: business.id,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }
        //Running balance accounts at 12AM
        if (hour === 0) {
            const day = moment(new Date()).subtract(1, "day");
            const init = day.startOf("day").format("YYYY-MM-DD HH:mm:ss");
            const ends = day.endOf("day").format("YYYY-MM-DD HH:mm:ss");
            const allAccounts = await Account.findAll({
                include: [
                    {
                        model: Business,
                        where: {
                            status: "ACTIVE",
                        },
                    },
                ],
            });

            for (const account of allAccounts) {
                //Discriminating business where economic cycle is automatic and closed at 12 M
                if (
                    !businessWithStarts.find(
                        item => item.id === account.businessId
                    )
                ) {
                    accountQueue.add(
                        {
                            code: "DAILY_BALANCE",
                            params: {
                                accountId: account.id,
                                init,
                                end: ends,
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
        }

        //At 2AM every day
        if (hour === 2) {
            notificationPaymentDeadline();

            //Personalization for customer Gelato. Every day at 2.00AM close economic cycle if is open
            const BUSINESS_ID = 49;
            const openEconomicCycle = await EconomicCycle.findOne({
                where: {
                    businessId: BUSINESS_ID,
                    isActive: true,
                },
            });

            if (openEconomicCycle) {
                economicCycleQueue.add(
                    {
                        code: "CLOSE_EC",
                        params: {
                            businessId: BUSINESS_ID,
                            actionHour: hour,
                            isAnAutomatedAction: true,
                        },
                    },
                    {
                        attempts: 30,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );
            }
        }

        Logger.info("Hourly checker executed", {
            origin: "hourlyChecker",
            businessWithEnforcedAccess: businessWithEnforcedAccess.length,
            businessWithAutomaticCancellation:
                businessWithAutomaticCancellation.length,
            businessWithStarts: businessWithStarts.length,
        });
    } catch (error: any) {
        Logger.error(error.toString(), { origin: "hourlyChecker" });
    }
};

export const halfHourlyChecker = async () => {
    try {
        const hour = moment(new Date()).hour();

        //Personalization for customer Gelato. Every day at 4.30PM change economic cycle
        const BUSINESS_ID = 49;
        if (hour === 16) {
            const openEconomicCycle = await EconomicCycle.findOne({
                where: {
                    businessId: BUSINESS_ID,
                    isActive: true,
                },
            });

            if (openEconomicCycle) {
                const at4pm = moment("16:00", "HH:mm");
                const openAt = moment(openEconomicCycle.openDate, "HH:mm");

                if (openAt.isBefore(at4pm)) {
                    economicCycleQueue.add(
                        {
                            code: "OPEN_CLOSE_EC",
                            params: {
                                businessId: BUSINESS_ID,
                                actionHour: hour,
                                isAnAutomatedAction: true,
                            },
                        },
                        {
                            attempts: 30,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }
            }
        }
    } catch (error: any) {
        Logger.error(error.toString(), { origin: "halfHourlyChecker" });
    }
};

export const notificationPaymentDeadline = async () => {
    try {
        const today = moment(new Date());

        const ordersDeadline = await OrderReceipt.findAll({
            where: {
                paymentDeadlineAt: {
                    [Op.lt]: today,
                },
                status: "PAYMENT_PENDING",
            },

            include: [
                Business,
                Client,
                {
                    model: SelledProduct,
                    attributes: [
                        "id",
                        "name",
                        "quantity",
                        "status",
                        "observations",
                        "type",
                        "productId",
                        "variationId",
                        "createdAt",
                        "measure",
                    ],
                    required: false,
                    separate: true,
                    include: [
                        {
                            model: SelledProductAddon,
                            attributes: ["id", "quantity", "name", "productId"],
                            include: [
                                {
                                    model: Price,
                                    attributes: ["amount", "codeCurrency"],
                                },
                            ],
                        },
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

                {
                    model: OrderReceiptPrice,
                    attributes: ["price", "codeCurrency"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: ShippingAddress,
                    attributes: [
                        "street_1",
                        "street_2",
                        "firstName",
                        "lastName",
                        "company",
                        "city",
                        "postalCode",
                        "phone",
                        "email",
                        "description",
                    ],
                    include: [
                        {
                            model: Municipality,
                            attributes: ["name", "code"],
                        },
                        {
                            model: Province,
                            attributes: ["name", "code"],
                        },
                        {
                            model: Country,
                            attributes: ["name", "code"],
                        },
                    ],
                },
            ],
        });

        const orderIdsToUpdate = ordersDeadline.map(order => order.id);

        //Update the status of expired orders
        await OrderReceipt.update(
            { status: "OVERDUE" },
            {
                where: {
                    id: orderIdsToUpdate,
                },
            }
        );

        for (const order of ordersDeadline) {
            //Registering state changed in records
            const record = OrderReceiptRecord.build({
                action: "ORDER_EDITED",
                title: getTitleOrderRecord("ORDER_EDITED"),
                details: `Cambiado de estado de ${getOrderStatus(
                    order.status
                )} a Pago vencido`,
                orderReceiptId: order.id,
                madeById: 1,
            });
            await record.save();

            if (order.client?.email) {
                emailQueue.add(
                    {
                        code: "NEW_ORDER_NOTIFICATION_ADMIN",
                        params: {
                            email: order.client.email,
                            order,
                            business: order.business,
                            type: "OVERDUE_PAYMENT",
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );
            }
        }
    } catch (error: any) {
        Logger.error(error.toString(), {
            origin: "notificationPaymentDeadline",
        });
    }
};
