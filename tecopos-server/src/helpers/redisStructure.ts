//Structure redis
//businessId:<object_type>:<action>

import { redisClient } from "../../app";
import AvailableCurrency from "../database/models/availableCurrency";
import ConfigurationKey from "../database/models/configurationKey";
import Currency from "../database/models/currency";
import EconomicCycle from "../database/models/economicCycle";
import OrderReceipt from "../database/models/orderReceipt";
import OrderReceiptRecord from "../database/models/orderReceiptRecord";
import PriceSystem from "../database/models/priceSystem";
import { ProcessCouponInterface } from "../controllers/helpers/coupons";
import User from "../database/models/user";
import Area from "../database/models/area";
import Product from "../database/models/product";
import Modifier from "../database/models/modifier";
import Price from "../database/models/price";

export type keysType =
    | "configurations"
    | "econocycle"
    | "currencies"
    | "order"
    | "records"
    | "orderCoupon"
    | "area"
    | "loginData"
    | "storeProducts";

export type actionType = "get" | "transaction";

export const getLongTermKey = (
    businessId: number,
    key: keysType,
    action: actionType
) => {
    return `businessId${businessId}:key${key}:action${action}`;
};

export const getEphimeralTermKey = (
    businessId: number,
    key: keysType,
    transaction: string
) => {
    return `businessId${businessId}:key${key}:transaction${transaction}`;
};

export const getUserTermKey = (userId: number, key: keysType) => {
    return `userId${userId}:key${key}`;
};

export const getExpirationTime = (key: keysType) => {
    switch (key) {
        case "configurations":
        case "econocycle":
        case "currencies":
        case "area":
            return 10 * 24 * 60; // 10 hours
        case "loginData":
            return 30 * 60; // 30 minutes
        default:
            return 2 * 60; // 3 minutes
    }
};

export const getOrderFromCacheTransaction = async (
    businessId: number,
    transaction: string
): Promise<OrderReceipt | undefined> => {
    let order: OrderReceipt | undefined = undefined;
    const orderCache = await redisClient.get(
        getEphimeralTermKey(businessId, "order", transaction)
    );
    if (orderCache) {
        order = JSON.parse(orderCache);
    }

    return order;
};

export const getUserLoginFromCache = async (
    userId: number
): Promise<User | null> => {
    let user: User | null = null;
    const userCache = await redisClient.get(
        getUserTermKey(userId, "loginData")
    );
    if (userCache) {
        user = JSON.parse(userCache);
    }

    return user;
};

export const getCouponsDataFromCacheTransaction = async (
    businessId: number,
    transaction: string
): Promise<ProcessCouponInterface | undefined> => {
    let couponData: ProcessCouponInterface | undefined = undefined;
    const couponCache = await redisClient.get(
        getEphimeralTermKey(businessId, "orderCoupon", transaction)
    );
    if (couponCache) {
        couponData = JSON.parse(couponCache);
    }

    return couponData;
};

export const getStoreProductsCache = async (
    businessId: number,
    transaction: string
): Promise<Array<Product>> => {
    let products: Array<Product>;
    const recordProducts = await redisClient.get(
        getEphimeralTermKey(businessId, "storeProducts", transaction)
    );
    if (recordProducts) {
        products = JSON.parse(recordProducts);
    } else {
        products = [];
    }
    return products;
};

export const getOrderRecordsCache = async (
    businessId: number,
    transaction: string
): Promise<Array<OrderReceiptRecord>> => {
    let records: Array<OrderReceiptRecord>;
    const recordCache = await redisClient.get(
        getEphimeralTermKey(businessId, "records", transaction)
    );
    if (recordCache) {
        records = JSON.parse(recordCache);
    } else {
        records = [];
    }
    return records;
};

export const getBusinessConfigCache = async (
    businessId: number
): Promise<Array<ConfigurationKey>> => {
    let configurations: Array<ConfigurationKey>;
    const configurationCache = await redisClient.get(
        getLongTermKey(businessId, "configurations", "get")
    );
    if (configurationCache) {
        configurations = JSON.parse(configurationCache);
    } else {
        configurations = await ConfigurationKey.findAll({
            where: {
                businessId: businessId,
            },
        });

        await redisClient.set(
            getLongTermKey(businessId, "configurations", "get"),
            JSON.stringify(configurations),
            {
                EX: getExpirationTime("configurations"),
            }
        );
    }

    return configurations;
};

export const getActiveEconomicCycleCache = async (
    businessId: number
): Promise<EconomicCycle> => {
    let economicCycle;
    //Analyzing cache
    const economicCycleCache = await redisClient.get(
        getLongTermKey(businessId, "econocycle", "get")
    );

    if (economicCycleCache) {
        economicCycle = JSON.parse(economicCycleCache);
    } else {
        economicCycle = await EconomicCycle.findOne({
            where: { businessId: businessId, isActive: true },
            include: [PriceSystem],
        });

        await redisClient.set(
            getLongTermKey(businessId, "econocycle", "get"),
            JSON.stringify(economicCycle),
            {
                EX: getExpirationTime("econocycle"),
            }
        );
    }

    return economicCycle;
};

export const getCurrenciesCache = async (
    businessId: number
): Promise<Array<AvailableCurrency>> => {
    let availableCurrencies: Array<AvailableCurrency>;
    const currenciesCache = await redisClient.get(
        getLongTermKey(businessId, "currencies", "get")
    );
    if (currenciesCache) {
        availableCurrencies = JSON.parse(currenciesCache);
    } else {
        availableCurrencies = await AvailableCurrency.findAll({
            where: {
                businessId: businessId,
            },
            paranoid: false,
            include: [Currency],
        });

        await redisClient.set(
            getLongTermKey(businessId, "currencies", "get"),
            JSON.stringify(availableCurrencies),
            {
                EX: getExpirationTime("currencies"),
            }
        );
    }

    return availableCurrencies;
};

export const getAreaCache = async (areaId: number): Promise<Area | null> => {
    let area: Area | null;

    const areaCache = await redisClient.get(
        getLongTermKey(areaId, "area", "get")
    );

    if (areaCache) {
        area = JSON.parse(areaCache);
    } else {
        area = await Area.findByPk(areaId, {
            include: [
                {
                    model: Modifier,
                    where: {
                        active: true,
                    },
                    include: [Price],
                    required: false,
                },
            ],
        });

        await redisClient.set(
            getLongTermKey(areaId, "area", "get"),
            JSON.stringify(area),
            {
                EX: getExpirationTime("area"),
            }
        );
    }

    return area;
};
