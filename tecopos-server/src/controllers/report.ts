import { Request, Response, raw } from "express";
import moment, { Moment } from "moment";
import { Op, where, fn, col, literal, json } from "sequelize";

import Area from "../database/models/area";
import EconomicCycle from "../database/models/economicCycle";
import OrderReceipt from "../database/models/orderReceipt";
import Product from "../database/models/product";
import ProductCategory from "../database/models/productCategory";
import SalesCategory from "../database/models/salesCategory";
import SelledProduct from "../database/models/selledProduct";
import SelledProductAddon from "../database/models/selledProductAddon";
import User from "../database/models/user";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import CurrencyPayment from "../database/models/currencyPayment";
import AvailableCurrency from "../database/models/availableCurrency";
import Currency from "../database/models/currency";
import {
    exchangeCurrency,
    getPriceExchanged,
    internalCheckerResponse,
    mathOperation,
    mixPricesArrays,
    mixSimplePricesArrays,
} from "../helpers/utils";
import ProductPrice from "../database/models/productPrice";
import Price from "../database/models/price";
import { pag_params } from "../database/pag_params";
import StockMovement from "../database/models/stockMovement";
import StockAreaBook from "../database/models/stockAreaBook";
import StockAreaProduct from "../database/models/stockAreaProduct";
import Image from "../database/models/image";
import { payments_ways } from "../interfaces/nomenclators";
import ConfigurationKey from "../database/models/configurationKey";
import Business from "../database/models/business";
import Logger from "../lib/logger";
import {
    areaSalesIncomeProcessator,
    contactArrayIPVStateProduct,
    getSummaryAccounts,
    obtainGeneralAreaSalesIncomes,
    obtainIncomesByBusiness,
    obtainIncomesByBusinessV2,
    ordersSummaryProcessator,
} from "./helpers/reports";
import Store from "../database/models/store";
import {
    IPVStateProduct,
    OrderProductPrice,
    SimplePrice,
} from "../interfaces/commons";
import OrderReceiptTotal from "../database/models/OrderReceiptTotal";
import Coupon from "../database/models/coupon";
import Variation from "../database/models/variation";
import Client from "../database/models/client";
import {
    getActiveEconomicCycleCache,
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../helpers/redisStructure";
import Modifier from "../database/models/modifier";
import OrderReceiptModifier from "../database/models/orderReceiptModifier";

interface SelledItems {
    productId: number;
    name: string;
    quantitySales: number;
    salesCategoryId: number;
    salesCategory: string;
    productCategoryId: number;
    productCategory: string;
    areaSalesId: number;
    areaSales: string | undefined;
    totalSales: Array<{ amount: number; codeCurrency: string }>;
    totalSalesMainCurrency: { amount: number; codeCurrency: string };
    totalCost: { amount: number; codeCurrency: string };
    groupName: string;
    groupConvertion: number;
    enableGroup: boolean;
    totalQuantity: number;
}

export const findAllSelledProducts = async (req: any, res: Response) => {
    try {
        const {
            areaSalesId,
            economicCycleId,
            dateFrom,
            origin,
            supplierId,
            clientId,
            coupons,
            includeHouseCostedOrder,
            dateTo,
            status,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let product_where_clause: any = {};
        const product_searchable_fields = [
            "type",
            "productCategoryId",
            "salesCategoryId",
            "id",
        ];

        const keys = Object.keys(params);
        keys.forEach(att => {
            if (product_searchable_fields.includes(att)) {
                product_where_clause[att] = params[att];
            }
        });

        let economic_cycle_data;
        let order_where_clause: any = {};
        let where_clause: any = {};

        if (economicCycleId) {
            const economicCycle = await EconomicCycle.findByPk(economicCycleId);

            if (!economicCycle) {
                return res.status(404).json({
                    message: `EconomicCycle provided not found`,
                });
            }

            order_where_clause.economicCycleId = economicCycleId;
            economic_cycle_data = economicCycle;
        }

        if (!includeHouseCostedOrder) {
            order_where_clause.houseCosted = false;
        }

        if (status) {
            const statusTypes = status.split(",");

            order_where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            order_where_clause["paidAt"] = {
                [Op.gte]: moment(dateFrom).format("YYYY-MM-DD HH:mm"),
                [Op.lte]: moment(dateTo).format("YYYY-MM-DD HH:mm"),
            };
        }

        if (origin) {
            const originTypes = origin.split(",");

            const allTypes = [
                "online",
                "woo",
                "pos",
                "admin",
                "shop",
                "shopapk",
                "marketplace",
                "apk",
            ];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
                    });
                }
            }

            order_where_clause.origin = originTypes;
        }

        if (clientId) {
            order_where_clause.clientId = clientId;
        }

        let clauseCoupons: any = {
            model: Coupon,
            attributes: ["code", "amount", "discountType"],
            through: {
                attributes: [],
            },
            required: false,
        };

        if (coupons) {
            const allCoupos = coupons.split(",");
            clauseCoupons = {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            };
        }

        if (areaSalesId) {
            const area = await getAreaCache(areaSalesId);

            if (!area) {
                return res.status(404).json({
                    message: `Area provided not found`,
                });
            }

            if (area.type !== "SALE") {
                return res.status(400).json({
                    message: `Area provided is not a SALE type`,
                });
            }

            //Checking if action belongs to user Business
            if (area.businessId !== user.businessId) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            order_where_clause.areaSalesId = areaSalesId;
        }

        if (supplierId) {
            where_clause.supplierId = supplierId;
        }

        const found_selled_products = await SelledProduct.findAll({
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: Product,
                    as: "product",
                    where: product_where_clause,
                    include: [
                        {
                            model: ProductCategory,
                            attributes: ["id", "name", "description"],
                        },
                        {
                            model: SalesCategory,
                            attributes: ["id", "name", "description", "color"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: OrderReceipt,
                    where: {
                        businessId: user.businessId,
                        status: {
                            [Op.not]: ["CANCELLED", "REFUNDED", "WITH_ERRORS"]
                        },
                        ...order_where_clause,
                    },
                    attributes: ["name", "id", "areaSalesId"],
                    include: [
                        {
                            model: Area,
                            paranoid: false,
                        },
                        clauseCoupons,
                    ],
                },
                {
                    model: SelledProductAddon,
                    include: [{ model: Product, paranoid: false }],
                },
                {
                    model: Price,
                    as: "priceTotal",
                    attributes: ["amount", "codeCurrency"],
                },
                { model: Price, as: "priceUnitary" },
            ],
        });

        //Obaining neccesaries values
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);
        if (!main_currency) {
            return res.status(404).json({
                message: `No existe ninguna moneda configurada como principal. Por favor, consulte al dueño del negocio.`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        //Processing data found
        let data_to_send: SelledItems[] = [];

        found_selled_products.forEach(selled_product => {
            const added = data_to_send.find(
                item => item.productId === selled_product.productId
            );

            const totalItemCost = selled_product.totalCost;
            const totalInMainCurrency =
                getPriceExchanged(
                    selled_product.priceTotal,
                    availableCurrencies
                )?.amount || 0;

            if (added) {
                data_to_send = data_to_send.map(item => {
                    if (item.productId === selled_product.productId) {
                        let nextPrices: Array<{
                            amount: number;
                            codeCurrency: string;
                        }> = item.totalSales;

                        const found_price = nextPrices.find(
                            price =>
                                price.codeCurrency ===
                                selled_product.priceTotal.codeCurrency
                        );

                        if (found_price) {
                            nextPrices = nextPrices.map(price => {
                                if (
                                    price.codeCurrency ===
                                    found_price.codeCurrency
                                ) {
                                    return {
                                        ...price,
                                        amount:
                                            price.amount +
                                            selled_product.priceTotal.amount,
                                    };
                                }

                                return price;
                            });
                        } else {
                            nextPrices.push({
                                amount: selled_product.priceTotal.amount,
                                codeCurrency:
                                    selled_product.priceTotal.codeCurrency,
                            });
                        }

                        return {
                            ...item,
                            totalSales: nextPrices,
                            quantitySales:
                                item.quantitySales + selled_product.quantity,
                            totalSalesMainCurrency: {
                                ...item.totalSalesMainCurrency,
                                amount: mathOperation(
                                    item.totalSalesMainCurrency.amount,
                                    totalInMainCurrency,
                                    "addition",
                                    2
                                ),
                            },
                            totalCost: {
                                ...item.totalCost,
                                amount: mathOperation(
                                    item.totalCost.amount,
                                    totalItemCost,
                                    "addition",
                                    2
                                ),
                            },
                        };
                    }

                    return item;
                });
            } else {
                data_to_send.push({
                    totalSales: [
                        {
                            amount: selled_product.priceTotal.amount,
                            codeCurrency:
                                selled_product.priceTotal.codeCurrency,
                        },
                    ],
                    quantitySales: selled_product.quantity,
                    productId: selled_product.productId,
                    name: selled_product?.name,
                    salesCategoryId: selled_product.product.salesCategoryId,
                    salesCategory:
                        selled_product.product.salesCategory?.name ??
                        "Sin categorizar",
                    productCategoryId: selled_product.product.productCategoryId,
                    productCategory:
                        selled_product.product.productCategory?.name ??
                        "Sin categorizar",
                    areaSalesId: selled_product.orderReceipt.areaSalesId,
                    areaSales: selled_product.orderReceipt.areaSales?.name,
                    totalCost: {
                        amount: totalItemCost,
                        codeCurrency: costCurrency,
                    },
                    totalSalesMainCurrency: {
                        amount: totalInMainCurrency,
                        codeCurrency: main_currency.currency.code,
                    },
                    groupName: selled_product.product.groupName,
                    groupConvertion: selled_product.product.groupConvertion,
                    enableGroup: selled_product.product.enableGroup,
                    totalQuantity: selled_product.product.totalQuantity,
                });
            }
        });

        res.status(200).json({
            products: data_to_send,
            economicCycle: economic_cycle_data,
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

export const getGraphSales = async (req: any, res: Response) => {
    try {
        const { mode }: { mode: "week" | "month" | "year" | "custom" } =
            req.params;
        const user: User = req.user;
        const business: Business = req.business;

        const availableCurrencies = await getCurrenciesCache(user.businessId);
        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        let data_to_send: any = [];

        switch (mode) {
            case "month":
                const numberOfDays = moment().daysInMonth();
                for (let index = 0; index < numberOfDays; index++) {
                    data_to_send.push({
                        number: index + 1,
                        date: undefined,
                        listEconomicCyclesId: [],
                        totalSales: 0,
                        totalIncomes: 0,
                        mainCodeCurrency: main_currency.currency.code,
                        totalCost: 0,
                        grossProfit: 0,
                        costCurrency,
                    });
                }
                break;
            case "year":
                data_to_send = moment.months().map((item, index) => {
                    return {
                        month: item,
                        number: index,
                        date: undefined,
                        listEconomicCyclesId: [],
                        totalSales: 0,
                        totalIncomes: 0,
                        mainCodeCurrency: main_currency.currency.code,
                        totalCost: 0,
                        grossProfit: 0,
                        costCurrency,
                    };
                });
                break;
            default: //Week
                data_to_send = moment.weekdays().map((item, index) => {
                    return {
                        day: item,
                        number: index,
                        date: undefined,
                        listEconomicCyclesId: [],
                        totalSales: 0,
                        totalIncomes: 0,
                        mainCodeCurrency: main_currency.currency.code,
                        totalCost: 0,
                        grossProfit: 0,
                        costCurrency,
                    };
                });
                break;
        }

        //Analyzing if is a GROUP
        //Obtaining the associated business
        let idsAllMyBusiness: Array<number> = [user.businessId];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER") &&
            //@ts-ignore
            Number(user.businessId) === Number(user.originalBusinessId)
        ) {
            //Finding bussiness
            const business = await Business.findByPk(user.businessId, {
                include: [
                    {
                        model: Business,
                        as: "branches",
                        through: {
                            attributes: [],
                        },
                    },
                ],
            });

            const branchesIds: Array<number> =
                business?.branches?.map(item => item.id) || [];
            idsAllMyBusiness = [business?.id, ...branchesIds];
        }

        for (let index = 0; index < data_to_send.length; index++) {
            let rowStartAt: Moment;
            let startAt;
            let endsAt;

            switch (mode) {
                case "month":
                    rowStartAt = moment().startOf("month").add(index, "days");

                    startAt = moment()
                        .startOf("month")
                        .startOf("day")
                        .add(index, "days")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss");

                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("DD")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                            };
                        }

                        return item;
                    });
                    break;
                case "year":
                    rowStartAt = moment().startOf("year").add(index, "month");
                    startAt = moment()
                        .startOf("year")
                        .add(index, "month")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("month")
                        .format("YYYY-MM-DD HH:mm:ss");

                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("MM")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM"),
                            };
                        }

                        return item;
                    });
                    break;
                default: //Week
                    rowStartAt = moment().startOf("week").add(index, "days");
                    startAt = moment()
                        .startOf("week")
                        .startOf("day")
                        .add(index, "days")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss");
                    data_to_send = data_to_send.map((item: any) => {
                        if (item.number === rowStartAt.day()) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                            };
                        }

                        return item;
                    });
                    break;
            }

            const result = await obtainIncomesByBusiness({
                listBussiness: idsAllMyBusiness,
                startAt,
                endsAt,
                availableCurrencies,
            });

            if (!internalCheckerResponse(result)) {
                Logger.error(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "getGraphSales/obtainIncomesByBusiness",
                        "X-App-Origin": req.header("X-App-Origin"),
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }

            //1. Transform incomes in currency of cost
            const costInMainCurrency = exchangeCurrency(
                {
                    amount: result.data.totalCost,
                    codeCurrency: costCurrency,
                },
                main_currency.currency.code,
                availableCurrencies
            );

            switch (mode) {
                case "month":
                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("DD")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                                listEconomicCyclesId:
                                    result.data.economicCyclesIds,
                                totalSales: result.data.totalSales,
                                totalIncomes: result.data.totalIncomes,
                                totalCost: result.data.totalCost || 0,
                                grossProfit: mathOperation(
                                    result.data.totalIncomes || 0,
                                    costInMainCurrency?.amount || 0,
                                    "subtraction",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                    break;
                case "year":
                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("MM")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM"),
                                listEconomicCyclesId:
                                    result.data.economicCyclesIds,
                                totalSales: result.data.totalSales,
                                totalIncomes: result.data.totalIncomes,
                                totalCost: result.data.totalCost ?? 0,
                                grossProfit: mathOperation(
                                    result.data.totalIncomes || 0,
                                    costInMainCurrency?.amount || 0,
                                    "subtraction",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                    break;

                default: //Week
                    data_to_send = data_to_send.map((item: any) => {
                        if (item.number === rowStartAt.day()) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                                listEconomicCyclesId:
                                    result.data.economicCyclesIds,
                                totalSales: result.data.totalSales,
                                totalIncomes: result.data.totalIncomes,
                                totalCost: result.data.totalCost ?? 0,
                                grossProfit: mathOperation(
                                    result.data.totalIncomes || 0,
                                    costInMainCurrency?.amount || 0,
                                    "subtraction",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                    break;
            }
        }

        res.status(200).json(data_to_send);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//From Control
interface StadisticDay {
    day: string;
    number: number;
    date: undefined;
    listEconomicCyclesId: Array<number>;
    totalIncome: number;
}

export const getLast7DaysSalesBusiness = async (req: any, res: Response) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            return res.status(406).json({
                message: `El parámetro businessId no fue introducido`,
            });
        }

        let data_to_send: Array<StadisticDay> = [
            {
                day: "sunday",
                number: 0,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "monday",
                number: 1,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "tuesday",
                number: 2,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "wednesday",
                number: 3,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "thursday",
                number: 4,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "friday",
                number: 5,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
            {
                day: "saturday",
                number: 6,
                date: undefined,
                listEconomicCyclesId: [],
                totalIncome: 0,
            },
        ];

        const availableCurrencies = await getCurrenciesCache(businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        for (let index = 0; index < 7; index++) {
            const current_day = moment().startOf("day").subtract(index, "days");
            const end_current_day = moment(current_day).endOf("day");

            const number_day = current_day.day();

            //Find all economic Cycles that start in the current_day
            const economicCycles = await EconomicCycle.findAll({
                where: {
                    businessId,
                    createdAt: {
                        [Op.gte]: moment(current_day, "YYYY-MM-DD HH:mm")
                            .startOf("day")
                            .format("YYYY-MM-DD HH:mm:ss"),
                        [Op.lte]: moment(end_current_day, "YYYY-MM-DD HH:mm")
                            .endOf("day")
                            .format("YYYY-MM-DD HH:mm:ss"),
                    },
                },
            });

            if (economicCycles.length !== 0) {
                const ids = economicCycles.map(item => item.id);

                const orders_found = await OrderReceipt.findAll({
                    where: {
                        economicCycleId: ids,
                        status: "BILLED",
                        paidAt: {
                            [Op.not]: null,
                        },
                    },
                    include: [OrderReceiptPrice, { model: Price, as: "taxes" }],
                });

                let totalIncome = 0;

                for (const order of orders_found) {
                    let localTotalOrder = 0;
                    //Iterating prices in order
                    for (const price of order.prices) {
                        if (
                            price.codeCurrency === main_currency.currency.code
                        ) {
                            localTotalOrder += price.price;
                        } else {
                            const availableCurrency = availableCurrencies.find(
                                item =>
                                    item.currency.code === price.codeCurrency
                            );

                            if (!availableCurrency) {
                                return res.status(404).json({
                                    message: `Una de las monedas seleccionadas ya no se encuentra disponible.`,
                                });
                            }

                            localTotalOrder += mathOperation(
                                price.price,
                                availableCurrency.exchangeRate,
                                "multiplication",
                                2
                            );
                        }
                    }

                    localTotalOrder += order.taxes?.amount ?? 0;
                    totalIncome += localTotalOrder;
                }

                data_to_send = data_to_send.map((item: any) => {
                    if (item.number === number_day) {
                        return {
                            ...item,
                            date: current_day.format("YYYY-MM-DD"),
                            listEconomicCyclesId: ids,
                            totalIncome,
                        };
                    }

                    return item;
                });
            } else {
                data_to_send = data_to_send.map((item: any) => {
                    if (item.number === number_day) {
                        return {
                            ...item,
                            date: current_day.format("YYYY-MM-DD"),
                        };
                    }

                    return item;
                });
            }
        }

        res.status(200).json(
            //@ts-ignore
            data_to_send.sort((a, b) => moment(a.date) - moment(b.date))
        );
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Deprecated used instead V2
export const getGroupTotalSales = async (req: any, res: Response) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const user: User = req.user;

        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                message: `No se recibieron fechas de inicio o fin.`,
            });
        }

        const extend_business = await Business.findByPk(user.businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!extend_business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado`,
            });
        }

        let dataToReturn = [];
        const listAllBusiness = [
            extend_business,
            ...(extend_business?.branches || []),
        ];

        //Obtaining main currency
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `No hay una moneda principal definida`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const startAt = moment(dateFrom, "YYYY-MM-DD")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss");
        const endsAt = moment(dateTo, "YYYY-MM-DD")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss");

        for (const business of listAllBusiness) {
            //Find all economic Cycles that start in the current_day
            const economicCycles = await EconomicCycle.findAll({
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: startAt,
                        [Op.lte]: endsAt,
                    },
                },
            });

            if (economicCycles.length !== 0) {
                const result = await obtainIncomesByBusiness({
                    listBussiness: [business.id],
                    startAt,
                    endsAt,
                    availableCurrencies,
                });

                if (!internalCheckerResponse(result)) {
                    Logger.error(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "getGroupTotalSales/obtainIncomesByBusiness",
                            "X-App-Origin": req.header("X-App-Origin"),
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }

                //1. Transform incomes in currency of cost
                const costInMainCurrency = exchangeCurrency(
                    {
                        amount: result.data.totalCost,
                        codeCurrency: costCurrency,
                    },
                    main_currency.currency.code,
                    availableCurrencies
                );

                dataToReturn.push({
                    id: business.id,
                    name: business.name,
                    totalSales: result.data.totalSales,
                    codeCurrency: main_currency.currency.code,
                    totalIncomes: result.data.totalIncomes,
                    totalCost: result.data.totalCost || 0,
                    grossProfit: mathOperation(
                        result.data.totalIncomes || 0,
                        costInMainCurrency?.amount || 0,
                        "subtraction",
                        2
                    ),
                    costCurrency,
                });
            }
        }

        res.status(200).json(dataToReturn);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getGroupTotalSalesV2 = async (req: any, res: Response) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const user: User = req.user;

        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                message: `No se recibieron fechas de inicio o fin.`,
            });
        }

        const extend_business = await Business.findByPk(user.businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!extend_business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado`,
            });
        }

        let dataToReturn = [];
        const listAllBusiness = [
            extend_business,
            ...(extend_business?.branches || []),
        ];

        //Obtaining main currency
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `No hay una moneda principal definida`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const startAt = moment(dateFrom, "YYYY-MM-DD")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss");
        const endsAt = moment(dateTo, "YYYY-MM-DD")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss");

        for (const business of listAllBusiness) {
            //Find all economic Cycles that start in the current_day
            const economicCycles = await EconomicCycle.findAll({
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: startAt,
                        [Op.lte]: endsAt,
                    },
                },
            });

            if (economicCycles.length !== 0) {
                const result = await obtainIncomesByBusinessV2({
                    listBussiness: [business.id],
                    startAt,
                    endsAt,
                    availableCurrencies,
                });

                if (!internalCheckerResponse(result)) {
                    Logger.error(
                        result.message || "Ha ocurrido un error inesperado.",
                        {
                            origin: "getGroupTotalSales/obtainIncomesByBusiness",
                            "X-App-Origin": req.header("X-App-Origin"),
                        }
                    );
                    return res.status(result.status).json({
                        message: result.message,
                    });
                }

                //1. Transform incomes in currency of cost
                const costInMainCurrency = exchangeCurrency(
                    {
                        amount: result.data.totalCost,
                        codeCurrency: costCurrency,
                    },
                    main_currency.currency.code,
                    availableCurrencies
                );

                dataToReturn.push({
                    id: business.id,
                    name: business.name,
                    ...result.data,
                    grossProfit: mathOperation(
                        result.data.totalIncomesMainCurrency || 0,
                        costInMainCurrency?.amount || 0,
                        "subtraction",
                        2
                    ),
                    costCurrency,
                });
            }
        }

        res.status(200).json(dataToReturn);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMostSelledCategories = async (req: any, res: Response) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const user: User = req.user;

        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                message: `No se recibieron fechas de inicio o fin.`,
            });
        }

        const extend_business = await Business.findByPk(user.businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!extend_business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado`,
            });
        }

        const listAllBusiness = [
            extend_business,
            ...(extend_business?.branches || []),
        ];

        const selled_products = await SelledProduct.findAll({
            include: [
                {
                    model: Product,
                    as: "product",
                    include: [
                        {
                            model: SalesCategory,
                            attributes: ["id", "name", "description"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: OrderReceipt,
                    where: {
                        status: "BILLED",
                        paidAt: {
                            [Op.not]: null,
                        },
                    },
                    include: [
                        {
                            model: EconomicCycle,
                            where: {
                                businessId: listAllBusiness.map(
                                    item => item.id
                                ),
                                createdAt: {
                                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD")
                                        .startOf("day")
                                        .format("YYYY-MM-DD HH:mm:ss"),
                                    [Op.lte]: moment(dateTo, "YYYY-MM-DD")
                                        .endOf("day")
                                        .format("YYYY-MM-DD HH:mm:ss"),
                                },
                            },
                        },
                    ],
                },
            ],
        });

        let listCategories: Array<{
            name: string;
            productsSelled: number;
        }> = [];

        for (const productSelled of selled_products) {
            if (productSelled.product?.salesCategory) {
                const found = listCategories.find(
                    item =>
                        item.name === productSelled.product.salesCategory.name
                );

                if (found) {
                    listCategories = listCategories.map(item => {
                        if (
                            item.name ===
                            productSelled.product.salesCategory.name
                        ) {
                            return {
                                ...item,
                                productsSelled:
                                    item.productsSelled +
                                    productSelled.quantity,
                            };
                        }

                        return item;
                    });
                } else {
                    listCategories.push({
                        name: productSelled.product.salesCategory.name,
                        productsSelled: productSelled.quantity,
                    });
                }
            }
        }

        //Sorting array
        listCategories = listCategories
            .sort((a, b) => b.productsSelled - a.productsSelled)
            .slice(0, 9);

        let dataToReturn: Array<{
            name: string;
            total: number;
            byBusiness: Array<{
                id: number;
                name: string;
                quantity: number;
            }>;
        }> = [];

        for (const category of listCategories) {
            const selled_products = await SelledProduct.findAll({
                include: [
                    {
                        model: Product,
                        as: "product",
                        include: [
                            {
                                model: SalesCategory,
                                where: {
                                    name: {
                                        [Op.iLike]: `${category.name}`,
                                    },
                                },
                            },
                        ],
                        paranoid: false,
                    },
                    {
                        model: OrderReceipt,
                        where: {
                            status: "BILLED",
                            paidAt: {
                                [Op.not]: null,
                            },
                        },
                        include: [
                            {
                                model: EconomicCycle,
                                where: {
                                    businessId: listAllBusiness.map(
                                        item => item.id
                                    ),
                                    createdAt: {
                                        [Op.gte]: moment(dateFrom, "YYYY-MM-DD")
                                            .startOf("day")
                                            .format("YYYY-MM-DD HH:mm:ss"),
                                        [Op.lte]: moment(dateTo, "YYYY-MM-DD")
                                            .endOf("day")
                                            .format("YYYY-MM-DD HH:mm:ss"),
                                    },
                                },
                            },
                        ],
                    },
                ],
            });

            let byBusiness: Array<{
                id: number;
                name: string;
                quantity: number;
            }> = [];

            for (const productSelled of selled_products) {
                if (productSelled.product) {
                    const found = byBusiness.find(
                        item => item.id === productSelled.product.businessId
                    );

                    if (found) {
                        byBusiness = byBusiness.map(item => {
                            if (item.id === productSelled.product.businessId) {
                                return {
                                    ...item,
                                    quantity:
                                        item.quantity + productSelled.quantity,
                                };
                            }

                            return item;
                        });
                    } else {
                        const businessName = listAllBusiness.find(
                            item => item.id === productSelled.product.businessId
                        )?.name;

                        byBusiness.push({
                            id: productSelled.product.businessId,
                            name: businessName || "",
                            quantity: productSelled.quantity,
                        });
                    }
                }
            }

            dataToReturn.push({
                name: category.name,
                total: category.productsSelled,
                byBusiness,
            });
        }

        res.status(200).json(dataToReturn);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getAreaSalesIncomes = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { id, areaId } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area provided not found`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(400).json({
                message: `Area provided is not SALE type.`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let economicCycle;
        //Taking in consideration origin
        const from = req.header("X-App-Origin");
        if (from === "Tecopos") {
            economicCycle = await getActiveEconomicCycleCache(user.businessId);
        } else {
            economicCycle = await EconomicCycle.findByPk(id);
        }

        if (!economicCycle) {
            return res.status(404).json({
                message: `Economic cycle not found`,
            });
        }

        //Checking access
        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allowed to access this request.`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        //Obtaning configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const extract_salary_from_cash =
            business_configs.find(
                item => item.key === "extract_salary_from_cash"
            )?.value === "true";

        const calculate_salary_from_revenue =
            business_configs.find(item => item.key === "calculate_salary_from")
                ?.value === "GROSS_REVENUE";

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const result = await areaSalesIncomeProcessator({
            economicCycleId: economicCycle.id,
            area,
            mainCurrency: main_currency,
            availableCurrencies,
            extractSalary: extract_salary_from_cash,
            salaryFromRevenue: calculate_salary_from_revenue,
            costCodeCurrency: costCurrency,
        });

        if (!internalCheckerResponse(result)) {
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "getAreaSalesIncomes",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        return res.status(200).json(result.data);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getGeneralFinancialReport = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { dateFrom, dateTo, origin, accountIds } = req.body;

        //Configurations
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        //Configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const cash_operations_include_deliveries =
            business_configs.find(
                item => item.key === "cash_operations_include_deliveries"
            )?.value === "true";

        const cash_operations_include_tips =
            business_configs.find(
                item => item.key === "cash_operations_include_tips"
            )?.value === "true";

        //Normalizing
        const startAt = moment(dateFrom, "YYYY-MM-DD HH:mm:ss").startOf("day");
        const endsAt = moment(dateTo, "YYYY-MM-DD HH:mm:ss").endOf("day");

        //Variables to control
        let resultPOS;
        let resultOnline;

        if (origin.split(",").includes("pos")) {
            const economicCycles = await EconomicCycle.findAll({
                where: {
                    businessId: user.businessId,
                    createdAt: {
                        [Op.gte]: startAt,
                        [Op.lte]: endsAt,
                    },
                },
            });

            const dataInStore = await Store.findAll({
                where: {
                    type: "EC_INCOME_GENERAL",
                    economicCycleId: economicCycles.map(item => item.id),
                },
            });

            resultPOS = obtainGeneralAreaSalesIncomes(
                dataInStore.map(item => JSON.parse(item.data)),
                main_currency,
                costCurrency
            );
        }

        if (
            origin.split(",").includes("online") ||
            origin.split(",").includes("woo")
        ) {
            const ordersBilledOnline = [
                "BILLED",
                "IN_PROCESS",
                "COMPLETED",
                "IN_TRANSIT",
                "DELIVERED",
            ];

            const orders = await OrderReceipt.findAll({
                where: {
                    origin: ["online", "woo"],
                    status: ordersBilledOnline,
                    paidAt: {
                        [Op.gte]: startAt,
                        [Op.lte]: endsAt,
                    },
                },
                include: [
                    OrderReceiptPrice,
                    OrderReceiptTotal,
                    CurrencyPayment,
                    { model: Price, as: "shippingPrice" },
                    { model: Price, as: "tipPrice" },
                    { model: Price, as: "taxes" },
                    { model: Price, as: "couponDiscountPrice" },
                ],
            });

            resultOnline = ordersSummaryProcessator({
                orders,
                mainCurrency: main_currency,
                availableCurrencies,
                costCodeCurrency: costCurrency,
                includeShippingAsIncome: cash_operations_include_deliveries,
                includeTipsAsIncome: cash_operations_include_tips,
            });
        }

        let to_return: any = {};
        let totalSalesData = obtainGeneralAreaSalesIncomes(
            [resultPOS, resultOnline],
            main_currency,
            costCurrency
        );

        if (accountIds && accountIds.length !== 0) {
            const bankAccounts = await getSummaryAccounts(
                accountIds,
                dateFrom,
                dateTo
            );
            to_return.bankAccounts = bankAccounts;
        }

        //Analyzing all numbers
        let generalIncomesCurrencies: Array<SimplePrice> = [];
        let generalCostCurrencies: Array<SimplePrice> = [];
        let generalIncomesMainCurrency = {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        };
        let generalCostMainCurrency = {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        };
        let generalRevenue = {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        };
        let totalHouseCostedMainCurrency = {
            amount: 0,
            codeCurrency: main_currency.currency.code,
        };

        //Total incomes in Main Currency
        totalSalesData.totalIncomes.forEach(item => {
            //Populating generalIncomes
            const foundIndex = generalIncomesCurrencies.findIndex(
                item => item.codeCurrency === item.codeCurrency
            );

            if (foundIndex !== -1) {
                generalIncomesCurrencies[foundIndex].amount = mathOperation(
                    generalIncomesCurrencies[foundIndex].amount,
                    item.amount,
                    "addition",
                    2
                );
            } else {
                generalIncomesCurrencies.push(item);
            }

            if (item.codeCurrency === main_currency.currency.code) {
                generalIncomesMainCurrency.amount = mathOperation(
                    generalIncomesMainCurrency.amount,
                    item.amount,
                    "addition",
                    2
                );
            } else {
                const found = availableCurrencies.find(
                    element => element.currency.code === item.codeCurrency
                );

                if (!found) {
                    return res.status(400).json({
                        message: `There is no main currency defined.`,
                    });
                }

                generalIncomesMainCurrency.amount += mathOperation(
                    item.amount,
                    found.exchangeRate,
                    "multiplication"
                );
            }
        });

        //Cash operations only if accounts is not active due to duplications
        if (!to_return.bankAccounts) {
            totalSalesData.totalCashOperations.forEach(item => {
                if (item.operation === "MANUAL_WITHDRAW") {
                    //Cost
                    const foundIndex = generalCostCurrencies.findIndex(
                        element => element.codeCurrency === item.codeCurrency
                    );

                    if (foundIndex !== -1) {
                        generalCostCurrencies[foundIndex].amount += item.amount;
                    } else {
                        generalCostCurrencies.push(item);
                    }

                    const found = availableCurrencies.find(
                        element => element.currency.code === item.codeCurrency
                    );

                    if (!found) {
                        return res.status(400).json({
                            message: `There is no main currency defined.`,
                        });
                    }

                    generalCostMainCurrency.amount += mathOperation(
                        item.amount,
                        found.exchangeRate,
                        "multiplication",
                        2
                    );
                } else if (item.operation === "MANUAL_DEPOSIT") {
                    //Income
                    const foundIndex = generalIncomesCurrencies.findIndex(
                        element => element.codeCurrency === item.codeCurrency
                    );

                    if (foundIndex !== -1) {
                        generalIncomesCurrencies[foundIndex].amount +=
                            item.amount;
                    } else {
                        generalIncomesCurrencies.push(item);
                    }

                    const found = availableCurrencies.find(
                        element => element.currency.code === item.codeCurrency
                    );

                    if (!found) {
                        return res.status(400).json({
                            message: `There is no main currency defined.`,
                        });
                    }

                    generalIncomesMainCurrency.amount += mathOperation(
                        item.amount,
                        found.exchangeRate,
                        "multiplication",
                        2
                    );
                }
            });

            //Salary
            const foundSalaryIndex = generalCostCurrencies.findIndex(
                element =>
                    element.codeCurrency ===
                    totalSalesData.totalSalary.codeCurrency
            );

            if (foundSalaryIndex !== -1) {
                generalCostCurrencies[foundSalaryIndex].amount +=
                    totalSalesData.totalSalary.amount;
            } else {
                generalCostCurrencies.push(totalSalesData.totalSalary);
            }

            const foundCurrencySalary = availableCurrencies.find(
                element =>
                    element.currency.code ===
                    totalSalesData.totalSalary.codeCurrency
            );

            if (!foundCurrencySalary) {
                return res.status(400).json({
                    message: `There is no main currency defined.`,
                });
            }

            generalCostMainCurrency.amount += mathOperation(
                totalSalesData.totalSalary.amount,
                foundCurrencySalary.exchangeRate,
                "multiplication",
                2
            );
        }

        //House costed
        totalSalesData.totalHouseCosted.forEach(item => {
            const foundIndex = generalCostCurrencies.findIndex(
                element => element.codeCurrency === item.codeCurrency
            );

            if (foundIndex !== -1) {
                generalCostCurrencies[foundIndex].amount += item.amount;
            } else {
                generalCostCurrencies.push(item);
            }

            const found = availableCurrencies.find(
                element => element.currency.code === item.codeCurrency
            );

            if (!found) {
                return res.status(400).json({
                    message: `There is no main currency defined.`,
                });
            }

            generalCostMainCurrency.amount += mathOperation(
                item.amount,
                found.exchangeRate,
                "multiplication",
                2
            );

            totalHouseCostedMainCurrency.amount += mathOperation(
                item.amount,
                found.exchangeRate,
                "multiplication",
                2
            );
        });

        if (to_return.bankAccounts) {
            const bankAccounts = to_return.bankAccounts as Array<{
                tag: string;
                tagId: number;
                debit: Array<SimplePrice>;
                credit: Array<SimplePrice>;
                total: Array<SimplePrice>;
            }>;

            for (const account of bankAccounts) {
                for (const itemCredit of account.credit) {
                    const foundCredit = generalCostCurrencies.find(
                        item => item.codeCurrency === itemCredit.codeCurrency
                    );

                    if (foundCredit) {
                        generalCostCurrencies = generalCostCurrencies.map(
                            item => {
                                if (
                                    item.codeCurrency ===
                                    itemCredit.codeCurrency
                                ) {
                                    return {
                                        ...item,
                                        amount: item.amount + itemCredit.amount,
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        generalCostCurrencies.push(itemCredit);
                    }

                    const found = availableCurrencies.find(
                        element =>
                            element.currency.code === itemCredit.codeCurrency
                    );

                    if (!found) {
                        return res.status(400).json({
                            message: `There is no main currency defined.`,
                        });
                    }

                    generalCostMainCurrency.amount += mathOperation(
                        itemCredit.amount,
                        found.exchangeRate,
                        "multiplication",
                        2
                    );
                }

                for (const itemDebit of account.debit) {
                    const foundDebit = generalIncomesCurrencies.find(
                        item => item.codeCurrency === itemDebit.codeCurrency
                    );

                    if (foundDebit) {
                        generalIncomesCurrencies = generalIncomesCurrencies.map(
                            item => {
                                if (
                                    item.codeCurrency === itemDebit.codeCurrency
                                ) {
                                    return {
                                        ...item,
                                        amount: item.amount + itemDebit.amount,
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        generalIncomesCurrencies.push(itemDebit);
                    }

                    const found = availableCurrencies.find(
                        element =>
                            element.currency.code === itemDebit.codeCurrency
                    );

                    if (!found) {
                        return res.status(400).json({
                            message: `There is no main currency defined.`,
                        });
                    }

                    generalIncomesMainCurrency.amount += mathOperation(
                        itemDebit.amount,
                        found.exchangeRate,
                        "multiplication",
                        2
                    );
                }
            }
        }

        //Renevue
        generalRevenue.amount = mathOperation(
            generalIncomesMainCurrency.amount,
            generalCostMainCurrency.amount,
            "addition",
            2
        );

        return res.status(200).json({
            ...totalSalesData,
            generalIncomesCurrencies,
            generalCostCurrencies,
            generalIncomesMainCurrency,
            generalCostMainCurrency,
            generalRevenue,
            totalHouseCostedMainCurrency,
            ...to_return,
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

export const getGeneralStockReport = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        //Finding bussiness
        const business = await Business.findByPk(user.businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!business) {
            return res.status(404).json({
                message: `User has not a business associated`,
            });
        }

        //Obtaining the associated business
        let idsAllMyBusiness: Array<number> = [business.id];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER")
        ) {
            const branchesIds: Array<number> =
                business?.branches?.map(item => item.id) || [];
            idsAllMyBusiness = [business.id, ...branchesIds];
        }

        const myStockAreas = await Area.findAll({
            where: {
                businessId: idsAllMyBusiness,
                type: "STOCK",
            },
            include: [
                {
                    model: Business,
                    attributes: ["name"],
                },
            ],
        });

        //Defining mainCurrency
        const available_currencies = await getCurrenciesCache(user.businessId);
        const mainCurrency =
            available_currencies?.find(item => item.isMain)?.currency.code ||
            "CUP";

        interface DataReturn {
            areaId: number;
            areaName: string;
            total_cost: number;
            total_estimated_sales: number;
            total_estimated_profits: number;
        }

        let dataToReturn: Array<DataReturn> = [];

        for (const area of myStockAreas) {
            const stock_products = await StockAreaProduct.findAll({
                where: {
                    areaId: area.id,
                },
                include: [
                    {
                        model: Product,
                        include: [ProductPrice],
                        paranoid: false,
                    },
                ],
            });

            let total_cost = 0;
            let total_estimated_sales = 0;
            for (const stockProduct of stock_products) {
                const unitaryCost = stockProduct.product.averageCost || 0;
                total_cost += unitaryCost * stockProduct.quantity;

                const found_price = stockProduct.product.prices.find(
                    item => item.isMain
                );

                if (found_price) {
                    let totalPrice = 0;
                    if (found_price.codeCurrency !== mainCurrency) {
                        const found = available_currencies.find(
                            item =>
                                item.currency.code === found_price.codeCurrency
                        );

                        if (found) {
                            totalPrice += mathOperation(
                                found_price.price,
                                found.exchangeRate,
                                "multiplication",
                                2
                            );
                            total_estimated_sales +=
                                totalPrice * stockProduct.quantity;
                        }
                    } else {
                        total_estimated_sales +=
                            found_price.price * stockProduct.quantity;
                    }
                }
            }

            dataToReturn.push({
                areaId: area.id,
                areaName:
                    business.mode === "GROUP"
                        ? `${area.name} (${area.business.name})`
                        : area.name,
                total_cost: mathOperation(total_cost, 0, "addition", 2),
                total_estimated_sales: mathOperation(
                    total_estimated_sales,
                    0,
                    "addition",
                    2
                ),
                total_estimated_profits: mathOperation(
                    total_estimated_sales,
                    total_cost,
                    "subtraction",
                    2
                ),
            });
        }

        res.status(200).json({
            mainCurrency,
            result: dataToReturn,
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

export const getReportStockDisponibility = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        //Finding bussiness
        const business = await Business.findByPk(user.businessId, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!business) {
            return res.status(404).json({
                message: `User has not a business associated`,
            });
        }

        //Obtaining the associated business
        let idsAllMyBusiness: Array<number> = [business.id];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER")
        ) {
            const branchesIds: Array<number> =
                business?.branches?.map(item => item.id) || [];
            idsAllMyBusiness = [business.id, ...branchesIds];
        }

        const myStockAreas = await Area.findAll({
            where: {
                businessId: idsAllMyBusiness,
                type: "STOCK",
            },
        });

        //Defining mainCurrency
        const available_currencies = await getCurrenciesCache(user.businessId);
        const mainCurrency =
            available_currencies?.find(item => item.isMain)?.currency.code ||
            "CUP";

        interface DataReturn {
            productId: number;
            measure: string;
            stocks: [
                {
                    stockId: number;
                    quantity: number;
                    stockName: string;
                    stockCode: string;
                }
            ];
            productName: string;
            salesCategoryName: string;
            universalCode: number;
            disponibility: number;
            total_cost: number;
            total_estimated_sales: number;
            total_estimated_profits: number;
        }

        let dataToReturn: Array<DataReturn> = [];

        const stock_products = await StockAreaProduct.findAll({
            where: {
                areaId: myStockAreas.map(item => item.id),
            },
            include: [
                {
                    model: Product,
                    include: [ProductPrice, SalesCategory],
                    paranoid: false,
                },
                Area,
            ],
        });

        for (const stockProduct of stock_products) {
            let total_cost = 0;
            let total_estimated_sales = 0;

            const unitaryCost = stockProduct.product?.averageCost || 0;
            total_cost += unitaryCost * stockProduct.quantity;

            const found_price = stockProduct.product.prices.find(
                item => item.isMain
            );

            if (found_price) {
                let totalPrice = 0;
                if (found_price.codeCurrency !== mainCurrency) {
                    const found = available_currencies.find(
                        item => item.currency.code === found_price.codeCurrency
                    );

                    if (found) {
                        totalPrice += mathOperation(
                            found_price.price,
                            found.exchangeRate,
                            "multiplication",
                            2
                        );
                        total_estimated_sales +=
                            totalPrice * stockProduct.quantity;
                    }
                } else {
                    total_estimated_sales +=
                        found_price.price * stockProduct.quantity;
                }
            }

            const foundProductIndex = dataToReturn.findIndex(
                item =>
                    item.universalCode === stockProduct.product.universalCode
            );

            if (foundProductIndex !== -1) {
                dataToReturn[foundProductIndex].disponibility = mathOperation(
                    dataToReturn[foundProductIndex].disponibility,
                    stockProduct.quantity,
                    "addition",
                    2
                );

                //ByQuantity
                const foundStock = dataToReturn[foundProductIndex].stocks.find(
                    item => item.stockId === stockProduct.areaId
                );

                if (foundStock) {
                    foundStock.quantity = mathOperation(
                        foundStock.quantity,
                        stockProduct.quantity,
                        "addition",
                        2
                    );
                } else {
                    dataToReturn[foundProductIndex].stocks.push({
                        stockId: stockProduct.areaId,
                        stockName: stockProduct.area.name,
                        quantity: stockProduct.quantity,
                        stockCode: stockProduct.area.code,
                    });
                }
            } else {
                dataToReturn.push({
                    productId: stockProduct.productId,
                    universalCode: stockProduct.product.universalCode,
                    productName: stockProduct.product.name,
                    measure: stockProduct.product.measure,
                    salesCategoryName:
                        stockProduct.product.salesCategory?.name ||
                        "Sin categoría",
                    disponibility: stockProduct.quantity,
                    total_cost: mathOperation(total_cost, 0, "addition", 2),
                    total_estimated_sales: mathOperation(
                        total_estimated_sales,
                        0,
                        "addition",
                        2
                    ),
                    total_estimated_profits: mathOperation(
                        total_estimated_sales,
                        total_cost,
                        "subtraction",
                        2
                    ),
                    stocks: [
                        {
                            stockId: stockProduct.areaId,
                            stockName: stockProduct.area.name,
                            quantity: stockProduct.quantity,
                            stockCode: stockProduct.area.code,
                        },
                    ],
                });
            }
        }

        //Normalizing dataToReturn
        dataToReturn = dataToReturn.map(item => {
            myStockAreas.forEach(area => {
                const found = item.stocks?.find(
                    element => element.stockId === area.id
                );

                if (!found) {
                    item.stocks?.push({
                        stockId: area.id,
                        stockName: area.name,
                        quantity: 0,
                        stockCode: area.code,
                    });
                }
            });

            return item;
        });

        res.status(200).json({
            mainCurrency,
            result: dataToReturn,
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

//Report only for tablet comsumption
export const getLastAreaSalesIncomes = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { areaId } = req.params;

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area provided not found`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(400).json({
                message: `Area provided is not SALE type.`,
            });
        }

        //Checking if action belongs to user Business
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const economicCycle = await EconomicCycle.findOne({
            where: {
                isActive: true,
                businessId: user.businessId,
            },
        });

        if (!economicCycle) {
            return res.status(404).json({
                message: `No se encontró ningún ciclo económico activo.`,
            });
        }

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        //Obtaning configurations
        const business_configs = await getBusinessConfigCache(user.businessId);

        const extract_salary_from_cash =
            business_configs.find(
                item => item.key === "extract_salary_from_cash"
            )?.value === "true";

        const calculate_salary_from_revenue =
            business_configs.find(item => item.key === "calculate_salary_from")
                ?.value === "GROSS_REVENUE";

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const result = await areaSalesIncomeProcessator({
            economicCycleId: economicCycle.id,
            area,
            mainCurrency: main_currency,
            availableCurrencies,
            extractSalary: extract_salary_from_cash,
            salaryFromRevenue: calculate_salary_from_revenue,
            costCodeCurrency: costCurrency,
        });

        if (!internalCheckerResponse(result)) {
            Logger.warn(result.message || "Ha ocurrido un error inesperado.", {
                origin: "getLastAreaSalesIncomes",
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        return res.status(200).json(result.data);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMostSelledProducts = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { mode }: { mode: "week" | "month" | "year" | "custom" } =
            req.params;
        const { lastDays, amount, economicCycleId, dateFrom, dateTo } =
            req.query;

        let days_quantity = 7;

        switch (mode) {
            case "month":
                days_quantity = 30;
                break;
            case "year":
                days_quantity = 365;
                break;
            default: //default week
                days_quantity = 7;
                break;
        }

        let amount_limit = 30;
        if (lastDays) {
            days_quantity = lastDays;
        }
        if (amount) {
            amount_limit = amount;
        }

        //Find all economic Cycles that start in the current_day
        const current_day = moment().endOf("day");
        const from = moment(current_day)
            .subtract(days_quantity, "days")
            .startOf("day");

        const economicCycles = await EconomicCycle.findAll({
            where: {
                businessId: user.businessId,
                createdAt: {
                    [Op.gte]: moment(from).format("YYYY-MM-DD HH:mm:ss"),
                    [Op.lte]: moment(current_day).format("YYYY-MM-DD HH:mm:ss"),
                },
            },
        });

        let where_clause: any = {};
        if (economicCycleId) {
            const economicCycle = await EconomicCycle.findByPk(economicCycleId);

            if (!economicCycle) {
                return res.status(404).json({
                    message: `Economic cycle not found`,
                });
            }

            //Checking if action belongs to user Business
            if (economicCycle.businessId !== user.businessId) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            where_clause.id = economicCycleId;
        } else {
            where_clause[Op.or] = [
                {
                    economicCycleId: economicCycles.map(item => item.id),
                    origin: "pos",
                },
                {
                    origin: [
                        "woo",
                        "online",
                        "shop",
                        "shopapk",
                        "marketplace",
                        "apk",
                    ],
                    businessId: user.businessId,
                    paidAt: {
                        [Op.gte]: moment(from, "YYYY-MM-DD HH:mm").format(
                            "YYYY-MM-DD HH:mm:ss"
                        ),
                        [Op.lte]: moment(
                            current_day,
                            "YYYY-MM-DD HH:mm"
                        ).format("YYYY-MM-DD HH:mm:ss"),
                    },
                },
            ];
        }

        const most_selled = await SelledProduct.findAll({
            attributes: [
                "productId",
                [fn("sum", col("quantity")), "totalSale"],
            ],
            include: [
                {
                    model: OrderReceipt,
                    as: "orderReceipt",
                    where: {
                        ...where_clause,
                        status: {
                            [Op.not]: ["CANCELLED", "REFUNDED"],
                        },
                    },
                    attributes: [],
                },
            ],
            group: ["productId"],
            limit: amount_limit,
            order: [[col("totalSale"), "DESC"]],
        });

        const product_found = await Product.findAll({
            where: {
                id: most_selled.map(item => item.productId),
                businessId: user.businessId,
            },
            paranoid: false,
            include: [
                { model: ProductPrice, attributes: ["codeCurrency", "price"] },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        let data_to_emit = [];
        const selleds = most_selled
            //@ts-ignore
            .filter(item => item.dataValues.totalSale !== 0);

        for (const selled of selleds) {
            const found = product_found.find(
                product => product.id === selled.productId
            );

            if (found) {
                data_to_emit.push({
                    //@ts-ignore
                    totalSale: selled.dataValues.totalSale,
                    name: found.name,
                    prices: found.prices,
                    type: found.type,
                    amountRemain: found.totalQuantity,
                    averageCost: found.averageCost,
                    images: found.images,
                    stockLimit: found.stockLimit,
                });
            }
        }

        res.status(200).json(data_to_emit);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getProductSales = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const { id } = req.params;
        const { per_page, page, areaId } = req.query;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        let where_query = {};

        if (areaId) {
            const area = await getAreaCache(areaId);

            if (!area) {
                return res.status(401).json({
                    message: `El área introducida no fue encontrada.`,
                });
            }

            if (area.type !== "STOCK") {
                return res.status(401).json({
                    message: `El área no es de tipo Almacén.`,
                });
            }

            //Checking if action belongs to user Business
            if (area.businessId !== user.businessId) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            where_query = {
                areaId,
            };
        }
        let data_to_return: any = [];

        if (product.type === "MENU") {
            const product_sales = await SelledProduct.findAndCountAll({
                distinct: true,
                attributes: [
                    "productId",
                    "economicCycle.id",
                    "SelledProduct.economicCycleId",
                    [fn("sum", col("quantity")), "totalQuantity"],
                ],
                where: {
                    productId: id,
                    status: "COMPLETED",
                    ...where_query,
                },
                include: [
                    {
                        model: EconomicCycle,
                        attributes: ["id", "openDate"],
                    },
                ],
                group: [
                    "productId",
                    "SelledProduct.economicCycleId",
                    "economicCycle.id",
                ],
                limit,
                offset,
                order: [["economicCycleId", "DESC"]],
            });

            let totalPages = Math.ceil(product_sales.count.length / limit);
            if (product_sales.count.length === 0) {
                totalPages = 0;
            } else if (totalPages === 0) {
                totalPages = 1;
            }

            product_sales.rows.forEach(item => {
                if (item.economicCycle) {
                    data_to_return.push({
                        productId: item.productId,
                        //@ts-ignore
                        quantity: Math.abs(item.dataValues.totalQuantity),
                        area: {
                            id: null,
                            name: "Todas",
                        },
                        economicCycle: {
                            id: item.economicCycle.id,
                            openDate: item.economicCycle.openDate,
                        },
                    });
                }
            });

            return res.status(200).json({
                totalItems: product_sales.count.length,
                currentPage: page ? parseInt(page) : 1,
                totalPages,
                items: data_to_return,
            });
        } else {
            const movements_operations = await StockMovement.findAndCountAll({
                attributes: ["productId", "quantity", "createdAt"],
                where: {
                    productId: id,
                    operation: "SALE",
                    ...where_query,
                },
                include: [
                    { model: EconomicCycle, attributes: ["id", "openDate"] },
                    {
                        model: Area,
                        as: "area",
                        attributes: ["id", "name"],
                        paranoid: false,
                    },
                ],
                limit,
                offset,
                order: [
                    ["economicCycleId", "DESC"],
                    ["createdAt", "DESC"],
                ],
            });

            //Analyzing if there is any economicCycle active
            const activeEconomicCycle = await EconomicCycle.findOne({
                where: {
                    isActive: true,
                    businessId: user.businessId,
                },
            });

            if (activeEconomicCycle && (page === 1 || !page)) {
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
                });

                //Finding all stock areas associated to bussines
                const stock_areas_found = await Area.findAll({
                    where: {
                        businessId: user.businessId,
                        type: ["STOCK", "VARIATION"],
                        isActive: true,
                    },
                });

                //Generals
                let sales = 0;

                //Processing Inventory
                for (const area of stock_areas_found) {
                    const found = stock_area_books_found.find(
                        item => item.areaId === area.id
                    );

                    if (found) {
                        let book_initial_state: Array<IPVStateProduct> =
                            JSON.parse(found.state);

                        let indirect_sales = 0;
                        let direct_sales = 0;
                        let initial = 0;
                        let entry = 0;
                        let movements = 0;
                        let outs = 0;
                        let processed = 0;
                        let waste = 0;

                        let [
                            area_movements,
                            sales_products,
                            stock_area_product,
                        ] = await Promise.all([
                            StockMovement.findAll({
                                where: {
                                    businessId: user.businessId,
                                    areaId: area.id,
                                    productId: product.id,
                                    accountable: true,
                                    operation: {
                                        [Op.or]: [
                                            "MOVEMENT",
                                            "ENTRY",
                                            "OUT",
                                            "PROCESSED",
                                            "WASTE",
                                        ],
                                    },
                                    createdAt: {
                                        [Op.gte]: found.createdAt,
                                    },
                                },
                            }),
                            SelledProduct.findAll({
                                where: {
                                    areaId: area.id,
                                    productId: product.id,
                                    type: ["STOCK", "VARIATION"],
                                    economicCycleId: activeEconomicCycle.id,
                                    status: "COMPLETED",
                                    createdAt: {
                                        [Op.gte]: found.createdAt,
                                    },
                                },
                            }),
                            StockAreaProduct.findOne({
                                where: {
                                    areaId: area.id,
                                    productId: product.id,
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
                                        paranoid: false,
                                    },
                                ],
                            }),
                        ]);

                        //Initital
                        const initial_book_found = book_initial_state.find(
                            item => item.productId === product.id
                        );
                        if (initial_book_found) {
                            initial = initial_book_found.initial;
                        }

                        //Movements
                        area_movements.forEach(item => {
                            if (item.operation === "ENTRY") {
                                entry = mathOperation(
                                    entry,
                                    item.quantity,
                                    "addition",
                                    precission_after_coma
                                );
                            } else if (item.operation === "MOVEMENT") {
                                movements = mathOperation(
                                    movements,
                                    Math.abs(item.quantity),
                                    "addition",
                                    precission_after_coma
                                );
                            } else if (item.operation === "OUT") {
                                outs = mathOperation(
                                    outs,
                                    Math.abs(item.quantity),
                                    "addition",
                                    precission_after_coma
                                );
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
                            } else if (item.operation === "WASTE") {
                                waste = mathOperation(
                                    waste,
                                    Math.abs(item.quantity),
                                    "addition",
                                    precission_after_coma
                                );
                            }
                        });

                        //Sales
                        sales_products.forEach(item => {
                            direct_sales += item.quantity;
                        });

                        //Processing indirect sales
                        const stock_quantity =
                            stock_area_product?.quantity ?? 0;

                        indirect_sales = mathOperation(
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
                            stock_quantity,
                            indirect_sales,
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
                        if (!(disregardValue > 0)) {
                            indirect_sales = 0;
                        }

                        //To total
                        sales = mathOperation(
                            direct_sales,
                            indirect_sales,
                            "addition",
                            precission_after_coma
                        );
                    }
                }

                data_to_return.push({
                    productId: product.id,
                    quantity: sales,
                    economicCycle: {
                        id: activeEconomicCycle.id,
                        openDate: activeEconomicCycle.openDate,
                    },
                    area: {
                        id: null,
                        name: "Venta total del ciclo económico activo",
                    },
                    isActive: true,
                });
            }

            movements_operations.rows.forEach(item => {
                data_to_return.push({
                    productId: item.productId,
                    quantity: Math.abs(item.quantity),
                    area: item.area,
                    economicCycle: {
                        id: null,
                        openDate: item.economicCycle
                            ? item.economicCycle.openDate
                            : item.createdAt,
                    },
                });
            });

            let totalPages = Math.ceil(movements_operations.count / limit);
            if (movements_operations.count === 0) {
                totalPages = 0;
            } else if (totalPages === 0) {
                totalPages = 1;
            }

            return res.status(200).json({
                totalItems: movements_operations.count,
                currentPage: page ? parseInt(page) : 1,
                totalPages,
                items: data_to_return,
            });
        }
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getTipsByPerson = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(400).json({
                message: `El campo id no fue encontrado`,
            });
        }

        const economicCycle = await EconomicCycle.findByPk(id);

        if (!economicCycle) {
            return res.status(404).json({
                message: `El ciclo económico proporcionado no fue encontrado.`,
            });
        }

        if (economicCycle.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este recurso.`,
            });
        }

        const found_order_tips = await OrderReceipt.findAll({
            attributes: ["id", "managedById"],
            where: {
                economicCycleId: economicCycle.id,
            },
            include: [
                {
                    model: Price,
                    as: "tipPrice",
                    attributes: ["amount", "codeCurrency"],
                    where: {
                        amount: {
                            [Op.not]: 0,
                        },
                    },
                },
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["id", "displayName", "username"],
                    paranoid: false,
                },
            ],
        });

        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        let to_return: Array<{
            id: number;
            displayName: string | undefined;
            username: string | undefined;
            totalTips: Array<{ amount: number; codeCurrency: string }>;
            totalTipMainCurrency: { amount: number; codeCurrency: string };
        }> = [];

        //Processing data
        for (const order_tip of found_order_tips) {
            const found_user = to_return.find(
                item => item.id === order_tip.managedById
            );

            //TotalIncome in Main currency
            const price = order_tip.tipPrice;
            if (price) {
                let totalLocal = 0;
                const found = availableCurrencies.find(
                    item => item.currency.code === price?.codeCurrency
                );

                if (!found) {
                    return res.status(404).json({
                        message: `La moneda ${price?.codeCurrency} no está disponible en el negocio`,
                    });
                }

                totalLocal += mathOperation(
                    price.amount,
                    found.exchangeRate,
                    "multiplication",
                    2
                );

                if (found_user) {
                    let nextTotalTips: Array<{
                        amount: number;
                        codeCurrency: string;
                    }> = found_user.totalTips;

                    const found_tip_codeCurrency = nextTotalTips.find(
                        item => item.codeCurrency === price.codeCurrency
                    );

                    if (found_tip_codeCurrency) {
                        nextTotalTips = found_user.totalTips.map(item => {
                            if (item.codeCurrency === price.codeCurrency) {
                                return {
                                    ...item,
                                    amount: item.amount + price.amount,
                                };
                            }

                            return item;
                        });
                    } else {
                        nextTotalTips.push({
                            amount: price.amount,
                            codeCurrency: price.codeCurrency,
                        });
                    }

                    to_return = to_return.map(item => {
                        if (item.id === found_user.id) {
                            return {
                                ...item,
                                totalTips: nextTotalTips,
                                totalTipMainCurrency: {
                                    ...item.totalTipMainCurrency,
                                    amount:
                                        item.totalTipMainCurrency.amount +
                                        totalLocal,
                                },
                            };
                        }
                        return item;
                    });
                } else {
                    to_return.push({
                        id: order_tip.managedById,
                        displayName: order_tip.managedBy?.displayName,
                        username: order_tip.managedBy?.username,
                        totalTips: [
                            {
                                amount: price.amount,
                                codeCurrency: price.codeCurrency,
                            },
                        ],
                        totalTipMainCurrency: {
                            amount: totalLocal,
                            codeCurrency: main_currency.currency.code,
                        },
                    });
                }
            }
        }

        res.status(200).json(to_return);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getStateInvetoryPeriod = async (req: any, res: Response) => {
    try {
        const { areaId, dateFrom, dateTo } = req.query;
        const user: User = req.user;

        const area = await Area.findOne({
            where: {
                id: areaId,
                businessId: user.businessId,
            },
        });

        if (!area) {
            return res.status(404).json({
                message: `El área definida no fue encontrada.`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(406).json({
                message: `El área introducida no es de tipo Almacén.`,
            });
        }

        //Find all the stock founds
        const stockStates = await Store.findAll({
            where: {
                businessId: user.businessId,
                type: "STOCK_DAILY_STATE",
                areaId,
                madeAt: {
                    [Op.gte]: moment(dateFrom).format("YYYY-MM-DD"),
                    [Op.lte]: moment(dateTo).format("YYYY-MM-DD"),
                },
            },
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        let unifiedArray: Array<IPVStateProduct> = [];
        for (const stock of stockStates) {
            unifiedArray = contactArrayIPVStateProduct(
                unifiedArray,
                JSON.parse(stock.data),
                precission_after_coma
            );
        }

        //Analyzing initials
        const initialIPVState = stockStates.find(
            item =>
                moment(item.madeAt).format("YYYY-MM-DD") ===
                moment(dateFrom).format("YYYY-MM-DD")
        )?.data;
        if (initialIPVState) {
            let initialArray: Array<IPVStateProduct> =
                JSON.parse(initialIPVState);
            for (const stateVar of unifiedArray) {
                const foundIndex = initialArray.findIndex(
                    item => item.productId === stateVar.productId
                );
                const foundUnifiedIndex = unifiedArray.findIndex(
                    item => item.productId === stateVar.productId
                );

                if (foundIndex !== -1) {
                    unifiedArray[foundUnifiedIndex].initial =
                        initialArray[foundIndex].initial;
                } else {
                    unifiedArray[foundUnifiedIndex].initial = 0;
                }
            }
        } else {
            for (const stateVar of unifiedArray) {
                stateVar.initial = 0;
            }
        }

        //Analyzing ends
        const endsAt = stockStates.reduce(
            (acc: Moment | Date, item) =>
                moment(acc).isAfter(moment(item.madeAt)) ? acc : item.madeAt,
            moment(dateFrom)
        );
        const endsIPVState = stockStates.find(
            item =>
                moment(item.madeAt).format("YYYY-MM-DD") ===
                moment(endsAt).format("YYYY-MM-DD")
        )?.data;

        if (endsIPVState) {
            let endsArray: Array<IPVStateProduct> = JSON.parse(endsIPVState);
            for (const stateVar of unifiedArray) {
                const foundIndex = endsArray.findIndex(
                    item => item.productId === stateVar.productId
                );
                const foundUnifiedIndex = unifiedArray.findIndex(
                    item => item.productId === stateVar.productId
                );

                if (foundIndex !== -1) {
                    unifiedArray[foundUnifiedIndex].inStock =
                        endsArray[foundIndex].inStock;
                } else {
                    unifiedArray[foundUnifiedIndex].inStock = 0;
                }
            }
        } else {
            for (const stateVar of unifiedArray) {
                stateVar.inStock = 0;
            }
        }

        return res.status(200).json(unifiedArray);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getUsedCouponsByClient = async (req: any, res: Response) => {
    try {
        const { couponCode } = req.params;
        const {
            status,
            order,
            orderBy,
            dateFrom,
            dateTo,
            billFrom,
            billTo,
            origin,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "shippingById",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (origin) {
            const originTypes = origin.split(",");

            const allTypes = [
                "online",
                "woo",
                "pos",
                "admin",
                "shop",
                "shopapk",
                "marketplace",
                "apk",
            ];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        //Paid Date filtering
        if (billFrom && billTo) {
            //Special case between dates
            where_clause["paidAt"] = {
                [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (billFrom) {
                where_clause["paidAt"] = {
                    [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (billTo) {
                where_clause["paidAt"] = {
                    [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //Created date filtering
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

        const found_orders = await OrderReceipt.findAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: OrderReceiptTotal,
                    attributes: ["id", "amount", "codeCurrency"],
                },
                {
                    model: OrderReceiptPrice,
                    attributes: ["id", "price", "codeCurrency"],
                },
                { model: Area, paranoid: false },
                {
                    model: Price,
                    as: "shippingPrice",
                },
                OrderReceiptTotal,
                {
                    model: Coupon,
                    attributes: ["code", "amount", "discountType"],
                    through: {
                        attributes: [],
                    },
                    where: {
                        code: couponCode,
                    },
                },
                {
                    model: Client,
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                },
            ],
        });

        //Process information
        let to_return: Array<{
            clientId: number;
            clientName: string;
            prices: Array<SimplePrice>;
            shippingPrice: Array<SimplePrice>;
            discounts: Array<SimplePrice>;
            total: Array<SimplePrice>;
        }> = [];

        //Iterating all orders
        for (const order of found_orders) {
            let totalSales: Array<{ amount: number; codeCurrency: string }> =
                [];
            let totalIncomes: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalDiscounts: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalCouponsDiscounts: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalShipping: Array<{ amount: number; codeCurrency: string }> =
                [];
            let taxes: Array<{ amount: number; codeCurrency: string }> = [];

            //Obtaining incomes
            for (const total of order.totalToPay) {
                const found = totalIncomes.find(
                    item => item.codeCurrency === total.codeCurrency
                );

                if (found) {
                    totalIncomes = totalIncomes.map(item => {
                        if (item.codeCurrency === total.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    total.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    totalIncomes.push({
                        amount: total.amount,
                        codeCurrency: total.codeCurrency,
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
                                    amount: sale.amount + price.price,
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
            }

            //Including taxes to TotalSales
            if (taxes.length !== 0) {
                for (const tax of taxes) {
                    const found_price = totalSales.find(
                        sale => sale.codeCurrency === tax.codeCurrency
                    );

                    if (found_price) {
                        totalSales = totalSales.map(sale => {
                            if (sale.codeCurrency === tax.codeCurrency) {
                                return {
                                    ...sale,
                                    amount: sale.amount + tax.amount,
                                };
                            }
                            return sale;
                        });
                    } else {
                        totalSales.push({
                            amount: tax.amount,
                            codeCurrency: tax.codeCurrency,
                        });
                    }
                }
            }

            //Shipping prices
            if (order.shippingPrice) {
                const found_shipping = totalShipping.find(
                    shipping =>
                        shipping.codeCurrency ===
                        order.shippingPrice?.codeCurrency
                );

                if (found_shipping) {
                    totalShipping = totalShipping.map(shipping => {
                        if (
                            shipping.codeCurrency ===
                            order.shippingPrice?.codeCurrency
                        ) {
                            return {
                                ...shipping,
                                amount:
                                    shipping.amount +
                                    order.shippingPrice?.amount,
                            };
                        }
                        return shipping;
                    });
                } else {
                    totalShipping.push({
                        amount: order.shippingPrice.amount,
                        codeCurrency: order.shippingPrice.codeCurrency,
                    });
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
                    totalCouponsDiscounts = totalCouponsDiscounts.map(
                        discount => {
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
                        }
                    );
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

            const finderClient = order.clientId || 0;
            const foundCustomer = to_return.find(
                item => item.clientId === finderClient
            );

            //Mixing content if customer client is found
            if (foundCustomer) {
                to_return = to_return.map(customer => {
                    if (customer.clientId === finderClient) {
                        //Sales
                        let nextTotalSales = [...customer.prices];
                        for (const total of totalSales) {
                            const found = nextTotalSales.find(
                                sale => sale.codeCurrency === total.codeCurrency
                            );

                            if (found) {
                                nextTotalSales = nextTotalSales.map(sale => {
                                    if (
                                        sale.codeCurrency === total.codeCurrency
                                    ) {
                                        return {
                                            ...sale,
                                            amount: mathOperation(
                                                sale.amount,
                                                total.amount,
                                                "addition",
                                                2
                                            ),
                                        };
                                    }
                                    return sale;
                                });
                            } else {
                                nextTotalSales.push(total);
                            }
                        }

                        //Shipping Price
                        let nextShippingPrice = [...customer.shippingPrice];
                        for (const shipping of totalShipping) {
                            const found = nextShippingPrice.find(
                                item =>
                                    item.codeCurrency === shipping.codeCurrency
                            );

                            if (found) {
                                nextShippingPrice = nextShippingPrice.map(
                                    item => {
                                        if (
                                            item.codeCurrency ===
                                            shipping.codeCurrency
                                        ) {
                                            return {
                                                ...item,
                                                amount: mathOperation(
                                                    item.amount,
                                                    shipping.amount,
                                                    "addition",
                                                    2
                                                ),
                                            };
                                        }
                                        return item;
                                    }
                                );
                            } else {
                                nextShippingPrice.push(shipping);
                            }
                        }

                        //Discounts
                        let nextDiscounts = [...customer.discounts];
                        for (const discount of totalDiscounts) {
                            const found = nextDiscounts.find(
                                item =>
                                    item.codeCurrency === discount.codeCurrency
                            );

                            if (found) {
                                nextDiscounts = nextDiscounts.map(item => {
                                    if (
                                        item.codeCurrency ===
                                        discount.codeCurrency
                                    ) {
                                        return {
                                            ...item,
                                            amount: mathOperation(
                                                item.amount,
                                                discount.amount,
                                                "addition",
                                                2
                                            ),
                                        };
                                    }
                                    return item;
                                });
                            } else {
                                nextDiscounts.push(discount);
                            }
                        }

                        //Total incomes
                        let nextTotalIncomes = [...customer.total];
                        for (const income of totalIncomes) {
                            const found = nextTotalIncomes.find(
                                item =>
                                    item.codeCurrency === income.codeCurrency
                            );

                            if (found) {
                                nextTotalIncomes = nextTotalIncomes.map(
                                    item => {
                                        if (
                                            item.codeCurrency ===
                                            income.codeCurrency
                                        ) {
                                            return {
                                                ...item,
                                                amount: mathOperation(
                                                    item.amount,
                                                    income.amount,
                                                    "addition",
                                                    2
                                                ),
                                            };
                                        }
                                        return item;
                                    }
                                );
                            } else {
                                nextTotalIncomes.push(income);
                            }
                        }

                        return {
                            ...customer,
                            prices: nextTotalSales,
                            shippingPrice: nextShippingPrice,
                            discounts: nextDiscounts,
                            total: nextTotalIncomes,
                        };
                    }

                    return customer;
                });
            } else {
                let name: string | undefined = `${
                    order.client?.firstName ?? ""
                } (${order.client?.email})`;

                if (!order.clientId) {
                    name = "No definido";
                }

                to_return.push({
                    clientId: order.clientId || 0,
                    clientName: name,
                    prices: totalSales,
                    shippingPrice: totalShipping,
                    discounts: totalDiscounts,
                    total: totalIncomes,
                });
            }
        }

        res.status(200).json(
            to_return.sort((a, b) => (a.clientName < b.clientName ? -1 : 1))
        );
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Deprecated
export const getSummarizeCustomerOrders = async (req: any, res: Response) => {
    try {
        const {
            status,
            order,
            orderBy,
            actives,
            paymentCurrencyCode,
            dateFrom,
            dateTo,
            billFrom,
            billTo,
            origin,
            activeEconomicCycle,
            hasDiscount,
            paymentWay,
            deliveryAt,
            coupons,
            isPayed,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        let where_product_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "clientId",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "shippingById",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (activeEconomicCycle) {
            const economicCycle = await EconomicCycle.findOne({
                where: {
                    businessId: user.businessId,
                    isActive: true,
                },
            });

            if (!economicCycle) {
                return res.status(404).json({
                    message: `There is no an economic cycle active.`,
                });
            }

            where_clause.economicCycleId = economicCycle.id;
        }

        if (origin) {
            const originTypes = origin.split(",");

            const allTypes = ["online", "woo", "pos"];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        let clauseCoupons: any = {
            model: Coupon,
            attributes: ["code", "amount", "discountType"],
            through: {
                attributes: [],
            },
        };
        if (coupons) {
            const allCoupos = coupons.split(",");
            clauseCoupons = {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            };
        }

        //Paid Date filtering
        if (billFrom && billTo) {
            //Special case between dates
            where_clause["paidAt"] = {
                [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (billFrom) {
                where_clause["paidAt"] = {
                    [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (billTo) {
                where_clause["paidAt"] = {
                    [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //Created date filtering
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

        if (deliveryAt) {
            //Special case between dates
            where_clause["deliveryAt"] = {
                [Op.gte]: moment(deliveryAt, "YYYY-MM-DD")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(deliveryAt, "YYYY-MM-DD")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        }

        //Bill from and to
        const clauseTotalPay: any = {
            model: OrderReceiptPrice,
            attributes: ["id", "price", "codeCurrency"],
        };

        if (hasDiscount === "true") {
            where_clause[Op.and] = {
                discount: {
                    [Op.gt]: 0,
                },
            };
        }

        if (isPayed === "true") {
            where_clause.paidAt = {
                [Op.not]: null,
            };
        } else if (isPayed === "false") {
            where_clause.paidAt = null;
        }

        //Payment way
        const clausePaymentWay: any = {
            model: CurrencyPayment,
            attributes: ["id", "amount", "codeCurrency", "paymentWay"],
        };

        if (paymentWay && paymentCurrencyCode) {
            const paymentTypes = paymentWay.split(",");

            const allTypes = ["CASH", "TRANSFER"];

            for (const item of paymentTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }
            clausePaymentWay.where = {
                paymentWay: paymentTypes,
                codeCurrency: paymentCurrencyCode,
            };
        } else {
            if (paymentWay) {
                const paymentTypes = paymentWay.split(",");

                const allTypes = ["CASH", "TRANSFER"];

                for (const item of paymentTypes) {
                    if (!allTypes.includes(item)) {
                        return res.status(400).json({
                            message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                        });
                    }
                }
                clausePaymentWay.where = {
                    paymentWay: paymentTypes,
                };
            }

            if (paymentCurrencyCode) {
                clausePaymentWay.where = {
                    codeCurrency: paymentCurrencyCode,
                };
            }
        }

        const found_orders = await OrderReceipt.findAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: SelledProduct,
                    where: where_product_clause,
                    include: [
                        {
                            model: Variation,
                            attributes: ["name"],
                        },
                    ],
                },
                clauseTotalPay,
                clausePaymentWay,
                { model: Area, paranoid: false },
                {
                    model: Price,
                    as: "shippingPrice",
                },
                {
                    model: Price,
                    as: "taxes",
                },
                OrderReceiptTotal,
                clauseCoupons,
                {
                    model: Client,
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                },
            ],
        });

        //Process information
        let to_return: Array<{
            clientId: number;
            clientName: string;
            prices: Array<SimplePrice>;
            shippingPrice: Array<SimplePrice>;
            discounts: Array<SimplePrice>;
            total: Array<SimplePrice>;
        }> = [];

        //Iterating all orders
        for (const order of found_orders) {
            let totalSales: Array<{ amount: number; codeCurrency: string }> =
                [];
            let totalIncomes: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalDiscounts: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalCouponsDiscounts: Array<{
                amount: number;
                codeCurrency: string;
            }> = [];
            let totalShipping: Array<{ amount: number; codeCurrency: string }> =
                [];
            let taxes: Array<{ amount: number; codeCurrency: string }> = [];

            //Obtaining incomes
            for (const total of order.totalToPay) {
                const found = totalIncomes.find(
                    item => item.codeCurrency === total.codeCurrency
                );

                if (found) {
                    totalIncomes = totalIncomes.map(item => {
                        if (item.codeCurrency === total.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    total.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    totalIncomes.push({
                        amount: total.amount,
                        codeCurrency: total.codeCurrency,
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
                                    amount: sale.amount + price.price,
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
            }

            //Including taxes to TotalSales
            if (taxes.length !== 0) {
                for (const tax of taxes) {
                    const found_price = totalSales.find(
                        sale => sale.codeCurrency === tax.codeCurrency
                    );

                    if (found_price) {
                        totalSales = totalSales.map(sale => {
                            if (sale.codeCurrency === tax.codeCurrency) {
                                return {
                                    ...sale,
                                    amount: sale.amount + tax.amount,
                                };
                            }
                            return sale;
                        });
                    } else {
                        totalSales.push({
                            amount: tax.amount,
                            codeCurrency: tax.codeCurrency,
                        });
                    }
                }
            }

            //Shipping prices
            if (order.shippingPrice) {
                const found_shipping = totalShipping.find(
                    shipping =>
                        shipping.codeCurrency ===
                        order.shippingPrice?.codeCurrency
                );

                if (found_shipping) {
                    totalShipping = totalShipping.map(shipping => {
                        if (
                            shipping.codeCurrency ===
                            order.shippingPrice?.codeCurrency
                        ) {
                            return {
                                ...shipping,
                                amount:
                                    shipping.amount +
                                    order.shippingPrice?.amount,
                            };
                        }
                        return shipping;
                    });
                } else {
                    totalShipping.push({
                        amount: order.shippingPrice.amount,
                        codeCurrency: order.shippingPrice.codeCurrency,
                    });
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
                    totalCouponsDiscounts = totalCouponsDiscounts.map(
                        discount => {
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
                        }
                    );
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

            const finderClient = order.clientId || 0;
            const foundCustomer = to_return.find(
                item => item.clientId === finderClient
            );

            //Mixing content if customer client is found
            if (foundCustomer) {
                to_return = to_return.map(customer => {
                    if (customer.clientId === finderClient) {
                        //Sales
                        let nextTotalSales = [...customer.prices];
                        for (const total of totalSales) {
                            const found = nextTotalSales.find(
                                sale => sale.codeCurrency === total.codeCurrency
                            );

                            if (found) {
                                nextTotalSales = nextTotalSales.map(sale => {
                                    if (
                                        sale.codeCurrency === total.codeCurrency
                                    ) {
                                        return {
                                            ...sale,
                                            amount: mathOperation(
                                                sale.amount,
                                                total.amount,
                                                "addition",
                                                2
                                            ),
                                        };
                                    }
                                    return sale;
                                });
                            } else {
                                nextTotalSales.push(total);
                            }
                        }

                        //Shipping Price
                        let nextShippingPrice = [...customer.shippingPrice];
                        for (const shipping of totalShipping) {
                            const found = nextShippingPrice.find(
                                item =>
                                    item.codeCurrency === shipping.codeCurrency
                            );

                            if (found) {
                                nextShippingPrice = nextShippingPrice.map(
                                    item => {
                                        if (
                                            item.codeCurrency ===
                                            shipping.codeCurrency
                                        ) {
                                            return {
                                                ...item,
                                                amount: mathOperation(
                                                    item.amount,
                                                    shipping.amount,
                                                    "addition",
                                                    2
                                                ),
                                            };
                                        }
                                        return item;
                                    }
                                );
                            } else {
                                nextShippingPrice.push(shipping);
                            }
                        }

                        //Discounts
                        let nextDiscounts = [...customer.discounts];
                        for (const discount of totalDiscounts) {
                            const found = nextDiscounts.find(
                                item =>
                                    item.codeCurrency === discount.codeCurrency
                            );

                            if (found) {
                                nextDiscounts = nextDiscounts.map(item => {
                                    if (
                                        item.codeCurrency ===
                                        discount.codeCurrency
                                    ) {
                                        return {
                                            ...item,
                                            amount: mathOperation(
                                                item.amount,
                                                discount.amount,
                                                "addition",
                                                2
                                            ),
                                        };
                                    }
                                    return item;
                                });
                            } else {
                                nextDiscounts.push(discount);
                            }
                        }

                        //Total incomes
                        let nextTotalIncomes = [...customer.total];
                        for (const income of totalIncomes) {
                            const found = nextTotalIncomes.find(
                                item =>
                                    item.codeCurrency === income.codeCurrency
                            );

                            if (found) {
                                nextTotalIncomes = nextTotalIncomes.map(
                                    item => {
                                        if (
                                            item.codeCurrency ===
                                            income.codeCurrency
                                        ) {
                                            return {
                                                ...item,
                                                amount: mathOperation(
                                                    item.amount,
                                                    income.amount,
                                                    "addition",
                                                    2
                                                ),
                                            };
                                        }
                                        return item;
                                    }
                                );
                            } else {
                                nextTotalIncomes.push(income);
                            }
                        }

                        return {
                            ...customer,
                            prices: nextTotalSales,
                            shippingPrice: nextShippingPrice,
                            discounts: nextDiscounts,
                            total: nextTotalIncomes,
                        };
                    }

                    return customer;
                });
            } else {
                let name: string | undefined = `${
                    order.client?.firstName ?? ""
                } (${order.client?.email})`;

                if (!order.clientId) {
                    name = "No definido";
                }

                to_return.push({
                    clientId: order.clientId || 0,
                    clientName: name,
                    prices: totalSales,
                    shippingPrice: totalShipping,
                    discounts: totalDiscounts,
                    total: totalIncomes,
                });
            }
        }

        res.status(200).json(
            to_return.sort((a, b) => (a.clientName < b.clientName ? -1 : 1))
        );
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getAllOrders = async (req: any, res: Response) => {
    try {
        //Enought time to process this request
        req.setTimeout(180000); //3 minutes = 60*3*1000

        const {
            dateFrom,
            dateTo,

            //Special fields
            hasCommission,
            hasDiscount,
            hasTips,
            coupons,
            isPayed,
            paymentWay,
            status,

            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "clientId",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "operationNumber",
            "shippingById",
            "salesById",
            "discount",
            "commission",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (params.origin) {
            const originTypes = params.origin.split(",");

            const allTypes = ["online", "woo", "pos"];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        let clauseCoupons: any = {
            model: Coupon,
            attributes: ["code", "amount", "discountType"],
            through: {
                attributes: [],
            },
            paranoid: false,
        };

        if (coupons) {
            const allCoupos = coupons.split(",");
            clauseCoupons = {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            };
        }

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }
        }

        if (params.deliveryAt) {
            //Special case between dates
            where_clause["deliveryAt"] = {
                [Op.gte]: moment(params.deliveryAt, "YYYY-MM-DD")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(params.deliveryAt, "YYYY-MM-DD")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        }

        //Bill from and to
        const clauseTotalPay: any = {
            model: OrderReceiptPrice,
            attributes: ["price", "codeCurrency"],
        };

        if (hasDiscount && hasDiscount === "true") {
            where_clause[Op.and] = {
                discount: {
                    [Op.gt]: 0,
                },
            };
        }

        if (hasTips && hasTips === "true") {
            where_clause[Op.and] = {
                tipPriceId: {
                    [Op.not]: null,
                },
            };
        }

        if (hasCommission && hasCommission === "true") {
            where_clause[Op.and] = {
                commission: {
                    [Op.gt]: 0,
                },
            };
        }

        if (isPayed && isPayed === "true") {
            where_clause.paidAt = {
                [Op.not]: null,
            };
        } else if (isPayed === "false") {
            where_clause.paidAt = null;
        }

        //Payment way
        const clausePaymentWay: any = {
            model: CurrencyPayment,
            attributes: ["amount", "codeCurrency", "paymentWay"],
        };

        if (paymentWay) {
            const paymentTypes = paymentWay.split(",");

            const allTypes = ["CASH", "TRANSFER"];

            for (const item of paymentTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }
            clausePaymentWay.where = {
                paymentWay: paymentTypes,
            };
        }

        const found_orders = await OrderReceipt.findAll({
            attributes: [
                "id",
                "name",
                "status",
                "discount",
                "closedDate",
                "isForTakeAway",
                "createdAt",
                "businessId",
                "operationNumber",
                "houseCosted",
                "totalCost",
                "modifiedPrice",
                "origin",
                "paidAt",
                "pickUpInStore",
                "shippingById",
                "deliveryAt",
                "commission",
                "observations",
                "clientId",
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                clauseTotalPay,
                clausePaymentWay,
                {
                    model: User,
                    as: "shippingBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "salesBy",
                    attributes: ["username", "displayName"],
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "shippingPrice",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "taxes",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "tipPrice",
                    attributes: ["amount", "codeCurrency", "paymentWay"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                clauseCoupons,
                {
                    model: Client,
                    attributes: ["firstName", "lastName", "email"],
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "amountReturned",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                    ],
                },
            ],
        });

        //Summarize
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const cash_operations_include_tips =
            business_configs.find(
                item => item.key === "cash_operations_include_tips"
            )?.value === "true";

        const cash_operations_include_deliveries =
            business_configs.find(
                item => item.key === "cash_operations_include_deliveries"
            )?.value === "true";

        const summarize = ordersSummaryProcessator({
            orders: found_orders,
            mainCurrency: main_currency,
            availableCurrencies,
            costCodeCurrency: costCurrency,
            includeShippingAsIncome: cash_operations_include_deliveries,
            includeTipsAsIncome: cash_operations_include_tips,
        });

        res.status(200).json({ summarize, orders: found_orders });
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

export const summarizeAllOrders = async (req: any, res: Response) => {
    try {
        //Enought time to process this request
        req.setTimeout(180000); //3 minutes = 60*3*1000

        const {
            dateFrom,
            dateTo,

            //Special fields
            hasCommission,
            hasDiscount,
            hasTips,
            coupons,
            isPayed,
            paymentWay,
            status,

            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isForTakeAway",
            "managedById",
            "createdAt",
            "areaSalesId",
            "economicCycleId",
            "houseCosted",
            "discount",
            "clientId",
            "origin",
            "modifiedPrice",
            "pickUpInStore",
            "operationNumber",
            "shippingById",
            "salesById",
            "discount",
            "commission",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (params.origin) {
            const originTypes = params.origin.split(",");

            const allTypes = ["online", "woo", "pos"];

            for (const item of originTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
                    });
                }
            }

            where_clause.origin = {
                [Op.or]: originTypes,
            };
        }

        if (status) {
            const statusTypes = status.split(",");

            where_clause.status = {
                [Op.or]: statusTypes,
            };
        }

        let clauseCoupons: any = {
            model: Coupon,
            attributes: ["code", "amount", "discountType"],
            through: {
                attributes: [],
            },
            paranoid: false,
        };

        if (coupons) {
            const allCoupos = coupons.split(",");
            clauseCoupons = {
                model: Coupon,
                attributes: ["code", "amount", "discountType"],
                through: {
                    attributes: [],
                },
                where: {
                    code: {
                        [Op.or]: allCoupos,
                    },
                },
            };
        }

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                    "YYYY-MM-DD HH:mm:ss"
                ),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                };
            }
        }

        if (params.deliveryAt) {
            //Special case between dates
            where_clause["deliveryAt"] = {
                [Op.gte]: moment(params.deliveryAt, "YYYY-MM-DD")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(params.deliveryAt, "YYYY-MM-DD")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        }

        //Bill from and to
        const clauseTotalPay: any = {
            model: OrderReceiptPrice,
            attributes: ["price", "codeCurrency"],
        };

        if (hasDiscount && hasDiscount === "true") {
            where_clause[Op.and] = {
                discount: {
                    [Op.gt]: 0,
                },
            };
        }

        if (hasTips && hasTips === "true") {
            where_clause[Op.and] = {
                tipPriceId: {
                    [Op.not]: null,
                },
            };
        }

        if (hasCommission && hasCommission === "true") {
            where_clause[Op.and] = {
                commission: {
                    [Op.gt]: 0,
                },
            };
        }

        if (isPayed && isPayed === "true") {
            where_clause.paidAt = {
                [Op.not]: null,
            };
        } else if (isPayed === "false") {
            where_clause.paidAt = null;
        }

        //Payment way
        const clausePaymentWay: any = {
            model: CurrencyPayment,
            attributes: ["amount", "codeCurrency", "paymentWay"],
        };

        if (paymentWay) {
            const paymentTypes = paymentWay.split(",");

            const allTypes = ["CASH", "TRANSFER"];

            for (const item of paymentTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }
            clausePaymentWay.where = {
                paymentWay: paymentTypes,
            };
        }

        const found_orders = await OrderReceipt.findAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                clauseTotalPay,
                clausePaymentWay,
                OrderReceiptModifier,
                {
                    model: Price,
                    as: "shippingPrice",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "tipPrice",
                    attributes: ["amount", "codeCurrency", "paymentWay"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                clauseCoupons,
                {
                    model: Price,
                    as: "amountReturned",
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                    attributes: ["amount", "codeCurrency"],
                },
            ],
        });

        //Summarize
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const cash_operations_include_tips =
            business_configs.find(
                item => item.key === "cash_operations_include_tips"
            )?.value === "true";

        const cash_operations_include_deliveries =
            business_configs.find(
                item => item.key === "cash_operations_include_deliveries"
            )?.value === "true";

        const summarize = ordersSummaryProcessator({
            orders: found_orders,
            mainCurrency: main_currency,
            availableCurrencies,
            costCodeCurrency: costCurrency,
            includeShippingAsIncome: cash_operations_include_deliveries,
            includeTipsAsIncome: cash_operations_include_tips,
        });

        res.status(200).json(summarize);
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

export const getAllOrdersManagedBy = async (req: any, res: Response) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        if (!dateFrom || !dateTo) {
            return res.status(400).json({
                message: `Los parámetros fechas inicio y fin no fueron correctamente proporcionados`,
            });
        }

        //Date filtering
        //Special case between dates
        where_clause["createdAt"] = {
            [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm").format(
                "YYYY-MM-DD HH:mm:ss"
            ),
            [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm").format(
                "YYYY-MM-DD HH:mm:ss"
            ),
        };

        const found_orders = await OrderReceipt.findAll({
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["id", "username", "displayName"],
                    paranoid: false,
                },
                {
                    model: Price,
                    as: "tipPrice",
                    attributes: ["amount", "codeCurrency", "paymentWay"],
                },
                {
                    model: OrderReceiptPrice,
                    attributes: ["price", "codeCurrency"],
                },
                {
                    model: OrderReceiptTotal,
                    attributes: ["amount", "codeCurrency"],
                },
                SelledProduct,
            ],
        });

        let dataToReturn: Array<{
            managedBy: Partial<User>;
            prices: Array<OrderProductPrice>;
            totalToPay: Array<SimplePrice>;
            tipPrices: Array<SimplePrice>;
            amountOfProducts: number;
        }> = [];

        //Summarize
        for (const order of found_orders) {
            if (!order.managedBy) {
                continue;
            }

            const foundManagedIndex = dataToReturn.findIndex(
                item => item.managedBy.id === order.managedBy?.id
            );

            if (foundManagedIndex !== -1) {
                const totalOfProducts =
                    order.selledProducts?.reduce(
                        (acc, item) => acc + item.quantity,
                        0
                    ) || 0;
                dataToReturn[foundManagedIndex].amountOfProducts +=
                    totalOfProducts;

                dataToReturn[foundManagedIndex].prices = mixPricesArrays(
                    dataToReturn[foundManagedIndex].prices,
                    order.prices
                );
                dataToReturn[foundManagedIndex].totalToPay =
                    mixSimplePricesArrays(
                        dataToReturn[foundManagedIndex].totalToPay,
                        order.totalToPay
                    );

                if (order.tipPrice) {
                    dataToReturn[foundManagedIndex].tipPrices =
                        mixSimplePricesArrays(
                            dataToReturn[foundManagedIndex].tipPrices,
                            [order.tipPrice]
                        );
                }
            } else {
                const totalOfProducts =
                    order.selledProducts?.reduce(
                        (acc, item) => acc + item.quantity,
                        0
                    ) || 0;

                dataToReturn.push({
                    managedBy: order.managedBy,
                    prices: order.prices,
                    totalToPay: order.totalToPay,
                    tipPrices: order.tipPrice ? [order.tipPrice] : [],
                    amountOfProducts: totalOfProducts,
                });
            }
        }

        res.status(200).json(dataToReturn);
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
