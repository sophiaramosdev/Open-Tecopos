import { Request, Response } from "express";
import moment from "moment";
import { Op } from "sequelize";
import AvailableCurrency from "../database/models/availableCurrency";
import Business from "../database/models/business";
import BusinessCategory from "../database/models/businessCategory";
import Currency from "../database/models/currency";
import EconomicCycle from "../database/models/economicCycle";
import Image from "../database/models/image";
import Price from "../database/models/price";
import PriceSystem from "../database/models/priceSystem";
import Product from "../database/models/product";
import ProductCategory from "../database/models/productCategory";
import ProductPrice from "../database/models/productPrice";
import SalesCategory from "../database/models/salesCategory";
import { pag_params } from "../database/pag_params";
import SocialNetwork from "../database/models/socialNetwork";
import Address from "../database/models/address";
import Phone from "../database/models/phone";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Variation from "../database/models/variation";
import ProductAttribute from "../database/models/productAttribute";
import StockAreaVariation from "../database/models/stockAreaVariation";
import GeneralConfigs from "../database/models/generalConfigs";
import Country from "../database/models/country";
import Logger from "../lib/logger";
import ConfigurationKey from "../database/models/configurationKey";
import StockAreaProduct from "../database/models/stockAreaProduct";
import Area from "../database/models/area";
import { SimplePrice } from "../interfaces/commons";
import { exchangeCurrency, internalCheckerResponse, mathOperation, truncateValue } from "../helpers/utils";
import {
    getActiveEconomicCycleCache,
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
    getEphimeralTermKey,
    getExpirationTime,
    getOrderFromCacheTransaction,
    getStoreProductsCache,
} from "../helpers/redisStructure";
import ReservationPolicy from "../database/models/reservationPolicy";
import Resource from "../database/models/resource";
import db from "../database/connection";
import { config_transactions } from "../database/seq-transactions";
import Client from "../database/models/client";
import ReservationRecord from "../database/models/reservationRecord";
import { ItemProductReservation } from "./administration/reservations";
import {
    checkEventAvailability,
    checkReservationAvailability,
} from "./helpers/utils";
import {
    calculateOrderTotal,
    registerSelledProductInOrder,
} from "./helpers/products";
import {
    getTitleOrderRecord,
    getTitleReservationRecord,
} from "../helpers/translator";
import OrderReceipt from "../database/models/orderReceipt";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import OrderReceiptTotal from "../database/models/OrderReceiptTotal";
import SelledProduct from "../database/models/selledProduct";
import SelledProductAddon from "../database/models/selledProductAddon";
import { orderQueue } from "../bull-queue/order";
import { redisClient } from "../../app";
import { emailQueue } from "../bull-queue/email";

export const getPublicGeneralConfigs = async (req: any, res: Response) => {
    try {
        const from = req.header("X-App-Origin");

        const generalConfigs = await GeneralConfigs.findAll({
            attributes: ["key", "value"],
            where: {
                isPublic: true,
                origin: {
                    [Op.or]: [from, "General"],
                },
            },
        });
        res.status(200).json(generalConfigs);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getBusiness = async (req: any, res: Response) => {
    try {
        const { slug } = req.params;

        let where: any = {};
        if (isNaN(slug)) {
            where.slug = slug;
        } else {
            where.id = slug;
        }

        const business = await Business.findOne({
            attributes: [
                "id",
                "slug",
                "name",
                "promotionalText",
                "description",
                "email",
                "color",
                "openHours",
                "includeShop",
                "enableManagementOrders",
                "homeUrl",
            ],
            where,
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["name", "description"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["src", "thumbnail", "blurHash"],
                },
                {
                    model: Image,
                    as: "banner",
                    attributes: ["src", "thumbnail", "blurHash"],
                },
                {
                    model: SocialNetwork,
                    attributes: ["user", "url", "type"],
                },
                {
                    model: Address,
                    attributes: [
                        "street_1",
                        "street_2",
                        "description",
                        "city",
                        "postalCode",
                    ],
                    include: [
                        {
                            model: Municipality,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Province,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Country,
                            attributes: ["id", "name", "code"],
                        },
                    ],
                },
                {
                    model: Phone,
                    attributes: ["number", "description"],
                    through: {
                        attributes: [],
                    },
                },
                ConfigurationKey,
            ],
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio no fue encontrado`,
            });
        }

        //Obtaining currencies
        const availableCurrencies = await AvailableCurrency.findAll({
            where: {
                businessId: business.id,
                isActive: true,
            },
            include: [Currency],
            paranoid: false,
        });

        const exposed_data = availableCurrencies.map(item => {
            return {
                id: item.id,
                exchangeRate: item.exchangeRate,
                isMain: item.isMain,
                name: item.currency.name,
                code: item.currency.code,
                symbol: item.currency.symbol,
            };
        });

        const allowedConfigurations = [
            "online_shop_main_currency",
            "online_shop_price_system",
            "enable_pick_up_in_store",
            "minimun_amount_to_buy_with_delivery",
            "when_shop_create_preorder",
            "enable_to_sale_in_negative",
            "online_shop_show_current_currency_modal",
        ];

        let to_return = [];
        for (const configuration of business.configurationsKey) {
            if (allowedConfigurations.includes(configuration.key)) {
                to_return.push({
                    key: configuration.key,
                    value: configuration.value,
                });
            }
        }

        res.status(200).json({
            //@ts-ignore
            ...business.dataValues,
            availableCurrencies: exposed_data,
            configurationsKey: to_return,
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

export const findAllBusinesses = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, dateFrom, dateTo, ...params } =
            req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["status", "isActive", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
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

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_businesses = await Business.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "slug",
                "name",
                "promotionalText",
                "description",
                "email",
                "color",
                "openHours",
            ],
            where: {
                ...where_clause,
                status: "ACTIVE",
                featured: true,
            },
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["name", "description"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["src", "thumbnail", "blurHash"],
                },
                {
                    model: Image,
                    as: "banner",
                    attributes: ["src", "thumbnail", "blurHash"],
                },
                {
                    model: SocialNetwork,
                    attributes: ["user", "url", "type"],
                },
            ],
            //@ts-ignore
            order: ordenation,
            limit,
            offset,
        });

        let totalPages = Math.ceil(found_businesses.count / limit);
        if (found_businesses.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_businesses.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_businesses.rows,
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

export const myProductsForSale = async (req: any, res: Response) => {
    try {
        const { slug } = req.params;
        const { per_page, page, type, notStrickStock, all_data, ...params } =
            req.query;

        let where: any = {};
        if (isNaN(slug)) {
            where.slug = slug;
        } else {
            where.id = slug;
        }

        // Obtaining Business
        const business = await Business.findOne({
            attributes: [
                "id",
                "slug",
                "name",
                "status",
                "promotionalText",
                "description",
                "color",
                "includeShop",
                "homeUrl",
            ],
            where: {
                ...where,
                status: "ACTIVE",
            },
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado.`,
            });
        }

        let where_clause: any = {};
        const searchable_fields = ["salesCategoryId", "suggested", "onSale"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        const forSaleType = [
            "MENU",
            "STOCK",
            "COMBO",
            "VARIATION",
            "SERVICE",
            "ADDON",
        ];

        if (type) {
            const productTypes = type.split(",");

            for (const item of productTypes) {
                if (!forSaleType.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${forSaleType}`,
                    });
                }
            }

            where_clause.type = {
                [Op.or]: productTypes,
            };
        } else {
            where_clause.type = {
                [Op.or]: forSaleType,
            };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;
        const numberPage = page ? parseInt(page) : 1;

        //System price via EconomicCycle
        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        let priceSystems =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        let onlineStockId = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        if (!onlineStockId) {
            const mainStockArea = await Area.findOne({
                where: {
                    isMainStock: true,
                    businessId: business.id,
                },
            });

            if (mainStockArea) {
                onlineStockId = mainStockArea.id;
            }
        }

        if (
            priceSystems?.length === 0 ||
            priceSystems?.some(item => !item || item === "")
        ) {
            priceSystems = [];
            const foundMainSystemPrice = await PriceSystem.findOne({
                where: {
                    isMain: true,
                    businessId: business.id,
                },
            });

            if (foundMainSystemPrice) {
                priceSystems.push(foundMainSystemPrice.id);
            }
        }

        const enable_sale_shop_multiple_currencies = configurations.find(
            item =>
                item.key ===
                "enable_sale_shop_multiple_currencies_from_exchange_rate"
        )?.value;

        const enable_to_sale_in_negative =
            configurations.find(
                item => item.key === "enable_to_sale_in_negative"
            )?.value === "true";

        const when_shop_create_preorder =
            configurations.find(
                item => item.key === "when_shop_create_preorder"
            )?.value === "true";

        const currencies_for_sale_exchange_rate =
            configurations.find(
                item => item.key === "currencies_for_sale_exchange_rate"
            )?.value || "";

        let conditionalsOnWhere: any = [
            {
                stockLimit: false,
            },
            {
                stockLimit: true,
                totalQuantity: {
                    [Op.gt]: 0,
                },
            },
            {
                showWhenOutStock: true,
            },
        ];

        let conditionalOnArea: any = {};
        if (
            !enable_to_sale_in_negative &&
            !notStrickStock &&
            !when_shop_create_preorder
        ) {
            conditionalOnArea.quantity = {
                [Op.gt]: 0,
            };
        }

        const products_for_sale = await Product.findAndCountAll({
            attributes: [
                "id",
                "name",
                "description",
                "promotionalText",
                "suggested",
                "onSale",
                "showWhenOutStock",
                "showRemainQuantities",
                "totalQuantity",
                "stockLimit",
                "type",
                "isWholesale",
                "minimunWholesaleAmount",
                "availableForReservation",
                "alwaysAvailableForReservation",
                "reservationAvailableFrom",
                "reservationAvailableTo",
                "hasDuration",
                "duration",
            ],
            distinct: true,
            where: {
                type: {
                    [Op.or]: forSaleType,
                },
                ...where_clause,
                visibleOnline: true,
                indexableToSaleOnline: true,
                businessId: business.id,
                [Op.or]: conditionalsOnWhere,
            },
            limit: all_data ? undefined : limit,
            offset,
            order: [["name", "DESC"]],
            include: [
                {
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: SalesCategory,
                    attributes: ["id", "name", "description", "color"],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Product,
                    as: "availableAddons",
                    attributes: [
                        "id",
                        "name",
                        "salesCode",
                        "description",
                        "stockLimit",
                        "totalQuantity",
                    ],
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: [
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                            separate: true,
                        },
                    ],
                    required: false,
                    where: {
                        [Op.or]: [
                            {
                                stockLimit: false,
                            },
                            {
                                stockLimit: true,
                                totalQuantity: {
                                    [Op.gt]: 0,
                                },
                            },
                        ],
                    },
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                    where: {
                        priceSystemId: priceSystems,
                    },
                    required: false,
                    separate: true,
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: StockAreaProduct,
                    attributes: [
                        "id",
                        "quantity",
                        "type",
                        "productId",
                        "areaId",
                    ],
                    where: {
                        areaId: onlineStockId,
                        ...conditionalOnArea,
                    },
                    include: [StockAreaVariation],
                    required: false,
                },
                {
                    model: Variation,
                    attributes: ["id", "name", "description", "onSale"],
                    as: "variations",
                    separate: true,
                    include: [
                        {
                            model: Price,
                            as: "price",
                            attributes: ["codeCurrency", "amount"],
                        },
                        {
                            model: Price,
                            as: "onSalePrice",
                            attributes: ["codeCurrency", "amount"],
                        },
                        {
                            model: Image,
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                        {
                            model: ProductAttribute,
                            attributes: ["name", "code", "value"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    required: false,
                },
                {
                    model: ProductAttribute,
                    attributes: ["id", "name", "code", "value"],
                    separate: true,
                },
                {
                    model: ReservationPolicy,
                    through: {
                        attributes: [],
                    },
                },
                { model: Resource },
            ],
        });

        if (enable_sale_shop_multiple_currencies) {
            const currency = currencies_for_sale_exchange_rate.split(",");

            const otherCurrencies = await AvailableCurrency.findAll({
                where: {
                    businessId: business.id,
                },
                include: [
                    {
                        model: Currency,
                        where: {
                            code: currency,
                        },
                    },
                ],
            });

            for (const product of products_for_sale.rows) {
                const currencyMain = product.prices.find(item => item.isMain);

                if (!currencyMain) {
                    continue;
                }

                const priceInfo: SimplePrice = {
                    amount: currencyMain.price,
                    codeCurrency: currencyMain.codeCurrency,
                };

                for (const item of otherCurrencies) {
                    const newPriceAmount = exchangeCurrency(
                        priceInfo,
                        item.currency.code,
                        otherCurrencies
                    );

                    const existingPrice = product.prices.find(
                        price =>
                            price.codeCurrency === newPriceAmount?.codeCurrency
                    );

                    if (!existingPrice) {
                        const newPrice = ProductPrice.build({
                            price: newPriceAmount?.amount,
                            codeCurrency: newPriceAmount?.codeCurrency,
                            productId: product.id,
                        });

                        product.prices.push(newPrice);
                    }
                }
            }
        }

        let totalPages = Math.ceil(products_for_sale.count / limit);
        if (products_for_sale.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: products_for_sale.count,
            currentPage: numberPage,
            totalPages: all_data ? 1 : totalPages,
            products: products_for_sale.rows,
            business,
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

export const myActivesCategories = async (req: any, res: Response) => {
    try {
        const { slug } = req.params;

        let where: any = {};
        if (isNaN(slug)) {
            where.slug = slug;
        } else {
            where.id = slug;
        }

        // Obtaining Business
        const business = await Business.findOne({
            attributes: [
                "id",
                "name",
                "status",
                "promotionalText",
                "description",
                "color",
            ],
            where: {
                ...where,
                status: "ACTIVE",
            },
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado.`,
            });
        }

        const [with_product_categories, all_categories] = await Promise.all([
            Product.findAll({
                attributes: ["salesCategoryId", "count"],
                where: {
                    businessId: business.id,
                    isPublicVisible: true,
                },
                include: [
                    {
                        model: SalesCategory,
                        attributes: ["id", "name", "description", "index"],
                    },
                ],
                group: ["salesCategoryId", "salesCategory.id"],
            }),
            SalesCategory.findAll({
                include: [
                    {
                        model: Image,
                        attributes: ["src", "thumbnail", "blurHash"],
                    },
                ],
            }),
        ]);

        let data_to_return = with_product_categories
            .filter(
                (item: any) =>
                    item.salesCategory !== null && item.dataValues.count !== 0
            )
            .map((activeCategory: any) => {
                const found = all_categories.find(
                    item => item.id === activeCategory.salesCategoryId
                )!;

                return {
                    id: found.id,
                    name: found.name,
                    description: found.description,
                    index: found.index,
                    products: Number(activeCategory.dataValues.count),
                    image: found.image,
                };
            })
            .sort((a, b) => a.index - b.index);

        return res.status(200).json(data_to_return);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

//Data
export const findAllCountries = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, all_data } = req.query;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_countries = await Country.findAndCountAll({
            distinct: true,
            where: where_clause,
            attributes: ["id", "name", "code"],
            limit: all_data ? undefined : limit,
            offset,
            order: [["name", "ASC"]],
        });

        let totalPages = Math.ceil(found_countries.count / limit);
        if (found_countries.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_countries.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_countries.rows,
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

export const findAllProvinces = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, all_data, ...params } = req.query;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        const searchable_fields = ["countryId", "code"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_provinces = await Province.findAndCountAll({
            distinct: true,
            attributes: ["id", "name", "code"],
            where: where_clause,
            limit: all_data ? undefined : limit,
            offset,
            order: [["name", "ASC"]],
        });

        let totalPages = Math.ceil(found_provinces.count / limit);
        if (found_provinces.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_provinces.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_provinces.rows,
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

export const findAllMunicipalities = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, all_data, ...params } =
            req.query;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        const searchable_fields = ["provinceId", "code"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_municipalities = await Municipality.findAndCountAll({
            distinct: true,
            attributes: ["id", "name", "code"],
            where: where_clause,
            include: [
                {
                    model: Province,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["name", "ASC"]],
        });

        let totalPages = Math.ceil(found_municipalities.count / limit);
        if (found_municipalities.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_municipalities.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_municipalities.rows,
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

export const findAllBusinessCategories = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, all_data } = req.query;

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_business_categories =
            await BusinessCategory.findAndCountAll({
                attributes: ["id", "name", "description"],
                distinct: true,
                where: {
                    isActive: true,
                    ...where_clause,
                },
                limit: all_data ? undefined : limit,
                offset,
                //@ts-ignore
                order: ordenation,
            });

        let totalPages = Math.ceil(found_business_categories.count / limit);
        if (found_business_categories.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_business_categories.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_business_categories.rows,
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

export const getProductVariations = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: `El producto con id ${id} no fue encontrado.`,
            });
        }

        if (product.type !== "VARIATION") {
            return res.status(400).json({
                message: `El producto proporcionado no es de tipo Variable.`,
            });
        }

        const variations = await Variation.findAll({
            attributes: ["description", "onSale"],
            where: {
                productId: id,
            },
            include: [
                {
                    model: Price,
                    as: "price",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: StockAreaVariation,
                    attributes: ["quantity", "variationId"],
                    where: {
                        quantity: {
                            [Op.gt]: 0,
                        },
                    },
                },
                {
                    model: Image,
                    attributes: ["src", "thumbnail", "blurHash"],
                },
                {
                    model: ProductAttribute,
                    attributes: ["name", "code", "value"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        let attributes: Array<{ code: string; value: string }> = [];
        variations.forEach(item => {
            item.attributes?.forEach(at => {
                attributes.push(at);
            });
        });

        let data_to_return: any = {};
        let uniqueAtt: Array<string> = [];
        for (const att of attributes) {
            if (!uniqueAtt.includes(att.code)) {
                uniqueAtt.push(att.code);
                data_to_return[att.code] = [att.value];
            } else {
                const found_value = data_to_return[att.code].find(
                    (item: string) => item === att.value
                );

                if (!found_value) {
                    data_to_return[att.code].push(att.value);
                }
            }
        }

        res.status(200).json({
            attributes: data_to_return,
            variations,
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

export const newExternalReservation2 = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);
    //@ts-ignore
    const tId = t.id;
    try {
        const { slug } = req.params;
        const { per_page, page, type, all_data, ...params } = req.query;
        const { reservationProducts, clientId, houseCosted } =
            req.body;

        let where: any = {};
        if (isNaN(slug)) {
            where.slug = slug;
        } else {
            where.id = slug;
        }

        // Obtaining Business
        const business = await Business.findOne({
            attributes: [
                "id",
                "slug",
                "name",
                "status",
                "promotionalText",
                "description",
                "color",
                "includeShop",
                "homeUrl",
            ],
            where: {
                ...where,
                status: "ACTIVE",
            },
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado.`,
            });
        }

        if (!clientId) {
            t.rollback();
            return res.status(400).json({
                message: `Debe proporcionar al cliente al que se va a asociar la factura .`,
            });
        }

        const client = await Client.findOne({
            where: {
                businessId: business.id,
                id: clientId,
            },
        });

        if (!client) {
            t.rollback();
            return res.status(400).json({
                message: `El cliente seleccionado no existe en su negocio.`,
            });
        }


        const economicCycle = await getActiveEconomicCycleCache(business.id);

        if (!economicCycle) {
            t.rollback();
            return res.status(400).json({
                message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
            });
        }

        let listRecords: any = [];
        let listRecordsReservation: Partial<ReservationRecord>[] = [];
        let orderTemplate: any = {
            status: "PAYMENT_PENDING",
            businessId: business.id,
            economicCycleId: economicCycle.id,
            name: params.name || ``,
            discount: Number(params.discount) || 0,
            commission: Number(params.commission) || 0,
            observations: params.observations || null,
            houseCosted: houseCosted ?? false,
            clientId: clientId,
            origin: "online",
            isReservation: true,
            isPreReceipt: true,
            currenciesPayment: [],
            cashRegisterOperations: [],
        };

        //Analyzing cache for configurations
        const configurations = await getBusinessConfigCache(business.id);

        const force_consecutive_invoice_numbers =
            configurations.find(
                item => item.key === "force_consecutive_invoice_numbers"
            )?.value === "true";

        const productsToSell: Array<ItemProductReservation | any> = [];
        for (let element of reservationProducts) {
            productsToSell.push({
                productId: element.productId,
                quantity: element.quantity ?? 1,
                variationId: element.variationId,
                addons: element.addons,
                startDateAt: element.startDateAt,
                endDateAt: element.endDateAt,
                resourceId: element.resourceId,
                numberAdults: element.numberAdults,
                numberKids: element.numberKids,
                priceUnitary: element.priceUnitary,
                isReservation: true,
            });
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //For updating quantities
        let productUpdates: Array<{
            id: number;
            totalQuantity: number;
        }> = [];
        let listProductsToRecord = [];
        let addBulkSelledProduct: Array<any> = [];
        let generalTotalCost = 0;


        const ids = productsToSell.map(item => item.productId);

        const productsFound = await Product.findAll({
            where: { id: ids, businessId: business.id },
            include: [
                {
                    model: Product,
                    as: "availableAddons",
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: [
                                "id",
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                        {
                            model: Price,
                            as: "onSalePrice",
                            attributes: ["codeCurrency", "amount"],
                        },
                    ],
                },
                SalesCategory,
                {
                    model: ProductPrice,
                    attributes: [
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                },
                {
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Resource,
                    through: {
                        attributes: []
                    }
                },
            ],
            transaction: t,
        });


        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;
        const customer_reservations =
            configurations.find(item => item.key === "customer_reservations")
                ?.value ?? 0;

        const today = moment();


        for (const product of productsToSell) {
            //Analyzing if where found
            const productDetails = productsFound.find(
                item => item.id === product.productId
            );

            if (!productDetails) {
                t.rollback();
                return res.status(404).json({
                    message: `El producto con id ${product.productId} no fue encontrado.`,
                });
            }

            if (productDetails.type !== "SERVICE") {
                t.rollback()
                return res.status(404).json({
                    message: `El producto ${productDetails.name} no es un servicio.`,
                })
            }

            if (!productDetails.availableForReservation) {
                t.rollback();
                return res.status(406).json({
                    message: `El producto : ${productDetails.name} no es reservable`,
                });
            }

            //Updating quantities in Central STOCK is stock Limit is defined
            if (productDetails.stockLimit) {
                const found_quantity = productUpdates.find(
                    item => item.id === productDetails.id
                );

                if (found_quantity) {

                    productUpdates = productUpdates.map(item => {
                        if (item.id === productDetails.id) {
                            return {
                                ...item,
                                totalQuantity: mathOperation(
                                    item.totalQuantity,
                                    product.quantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    productUpdates.push({
                        id: productDetails.id,
                        totalQuantity: mathOperation(
                            productDetails.totalQuantity,
                            product.quantity,
                            "subtraction",
                            precission_after_coma
                        ),
                    });
                }
            }

            //Analyzing if primary quantities are enough
            if (
                productDetails.totalQuantity <= 0 &&
                productDetails.stockLimit
            ) {
                t.rollback()
                return res.status(404).json({
                    message: `El producto con id ${productDetails.name} no esta disponible para la venta.`,
                })
            }

            if (
                product.quantity > productDetails.totalQuantity &&
                productDetails.stockLimit
            ) {
                t.rollback()
                return res.status(404).json({
                    message: `La cantidad seleccionada de ${productDetails.name} no está disponible para la venta. Cantidad disponible: ${productDetails.totalQuantity}`,
                })
            }

            //Analyzing if addons are present
            if (product.addons && product.addons?.length !== 0) {
                for (const addon of product.addons) {
                    const addonFoundDetails =
                        productDetails.availableAddons?.find(
                            item => item.id === addon.id
                        );

                    if (!addonFoundDetails) {
                        t.rollback()
                        return res.status(404).json({
                            message: `El agrego con id ${addon.id} no está disponible para el producto ${productDetails.name}.`,
                        })
                    }

                    //Cheking disponibility
                    if (
                        addonFoundDetails.totalQuantity <= 0 &&
                        addonFoundDetails.stockLimit
                    ) {
                        t.rollback()
                        return res.status(406).json({
                            message: `La cantidad seleccionada del agrego ${addonFoundDetails.name} no está disponible para la venta. Cantidad disponible: ${addonFoundDetails.totalQuantity}`,
                        })
                    }

                    //Updating quantities in Central STOCK if stock limit is defined
                    if (addonFoundDetails.stockLimit) {
                        const found_quantity = productUpdates.find(
                            item => item.id === addonFoundDetails.id
                        );

                        if (found_quantity) {
                            productUpdates = productUpdates.map(item => {
                                if (item.id === addonFoundDetails.id) {
                                    return {
                                        ...item,
                                        totalQuantity: mathOperation(
                                            item.totalQuantity,
                                            addon.quantity,
                                            "subtraction",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            });
                        } else {
                            productUpdates.push({
                                id: addonFoundDetails.id,
                                totalQuantity: mathOperation(
                                    addonFoundDetails.totalQuantity,
                                    addon.quantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            });
                        }
                    }

                }
            }


            // ----------  --Check reservations-- ---->
            //1# validate what product is reservable
            if (!product.alwaysAvailableForReservation) {
                const reservationAvailableFrom =
                    product.reservationAvailableFrom;
                const reservationAvailableTo = product.reservationAvailableTo;

                if (
                    moment(reservationAvailableFrom).isBefore(
                        product?.startDateAt
                    ) &&
                    moment(reservationAvailableTo).isAfter(
                        product?.endDateAt
                    )
                ) {
                    const formatFrom = moment(reservationAvailableFrom).format(
                        "DD/MM/YY"
                    );
                    const formatTo = moment(reservationAvailableTo).format(
                        "DD/MM/YY"
                    );

                    t.rollback();
                    return res.status(406).json({
                        message: `El producto : ${product.name} solo tiene permitido reservar ente el ${formatFrom} y ${formatTo}`,
                    });
                }
            }

            //2# Validate resources
            if (product?.resourceId && productDetails?.resources) {
                if (product.resources?.length === 0 || !product.resources) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El producto : ${product.name} no tiene ese recursos asociados`,
                    });
                }
                const resource = productDetails?.resources.find(
                    item => item.id === product.resourceId
                );
                if (!resource) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El producto : ${product.name} no tiene ese recurso asignado`,
                    });
                }

                if (resource.numberAdults > product.numberAdults) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El recurso : ${resource.code} tiene un limite para ${resource.numberAdults} de adultos`,
                    });
                }

                if (resource.numberKids > product.numberKids) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El recurso : ${resource.code} tiene un limite para ${resource.numberKids} de adultos`,
                    });
                }
            }

            if (
                !product?.startDateAt ||
                !product?.endDateAt
            ) {
                t.rollback();
                return res.status(406).json({
                    message: `El producto : ${product.name} debe proporcionar fecha de inicio y fin`,
                });
            }

            if (Number(customer_reservations || 0) > 0) {
                const reservationDate = moment(product.startDateAt);
                const differenceInDays = reservationDate.diff(today, "days");
                if (differenceInDays < 0) {
                    t.rollback();
                    return res.status(406).json({
                        message: `Lo sentimo solo es posible reservar con ${customer_reservations} días de antelación.`,
                    });
                }
            }
            // ----------  --Check reservations-- ----> 


            //---------------------- Register sell ---------- --- > 

            //Calculate itemCost
            let totalSelledCost = mathOperation(
                productDetails.averageCost,
                product.quantity,
                "multiplication",
                2
            );

            let selled_product: any = {
                name: productDetails.name,
                measure: productDetails.measure,
                colorCategory: productDetails.salesCategory?.color,
                quantity: product.quantity,
                productId: productDetails.id,
                type: productDetails.type,
                addons: [],
                variationId: product.variationId,
                supplierId: productDetails.supplierId,
                isReservation: true,
                startDateAt: product.startDateAt,
                endDateAt: product.endDateAt,
                resourceId: product.resourceId,
                numberAdults: product.numberAdults,
                numberKids: product.numberKids,
            };

            //----> Check price is modifire 
            //Searching price
            let found = false;
            let basePrice = {
                amount: 0,
                codeCurrency: "",
            };
            let priceDefault = {
                amount: product.priceUnitary?.amount,
                codeCurrency: product.priceUnitary?.codeCurrency,
            };


            const mainPrice = productDetails.prices.find(item => item.isMain);

            if (!product.priceUnitary) {
                priceDefault = {
                    amount: mainPrice?.price,
                    codeCurrency: mainPrice?.codeCurrency
                }
            }

            const priceSelect = productDetails.prices.find(
                item =>
                    item.codeCurrency ===
                    priceDefault?.codeCurrency && priceDefault.amount === item.price
            );

            if (!priceSelect) {
                t.rollback()
                return res.status(406).json({
                    message: `El precio recibido del servicio ${productDetails.name} no esta disponible.`,
                })
            }


            basePrice.amount = priceSelect.price;
            basePrice.codeCurrency = priceSelect.codeCurrency;

            //--------------------- --->
            let totalAmountPrice = mathOperation(
                basePrice.amount,
                product.quantity,
                "multiplication",
                3
            );
            totalAmountPrice = truncateValue(totalAmountPrice, 2);

            selled_product = {
                ...selled_product,
                economicCycleId: economicCycle?.id,
                priceUnitary: {
                    amount: priceDefault.amount,
                    codeCurrency: priceDefault.codeCurrency,
                },
                priceTotal: {
                    amount: totalAmountPrice,
                    codeCurrency: priceDefault.codeCurrency,
                },
                baseUnitaryPrice: {
                    amount: basePrice.amount,
                    codeCurrency: basePrice.codeCurrency,
                },
                observations: product.observations,
                modifiedPrice: found,
                status: "RECEIVED"
            };

            listProductsToRecord.push(
                `(x${product.quantity}) ${productDetails.name}`
            );

            addBulkSelledProduct.push({
                ...selled_product,
                totalCost: totalSelledCost,
            });

            generalTotalCost += totalSelledCost;

        }

        orderTemplate.selledProducts = addBulkSelledProduct;
        orderTemplate.totalCost = generalTotalCost;

     
        //Updating quantities in Central Stock
        if (productUpdates.length !== 0) {
            await Product.bulkCreate(productUpdates, {
                updateOnDuplicate: ["totalQuantity"],
                transaction: t,
            });
        }

        await redisClient.set(
            getEphimeralTermKey(business.id, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        
        const result_totals = await calculateOrderTotal(
            orderTemplate.businessId,
            t
        );

        if (!internalCheckerResponse(result_totals)) {
            t.rollback();
            Logger.error(
                result_totals.message || "Ha ocurrido un error inesperado.",
                {
                    origin: "newExternalReservations2/calculateOrderTotal",
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: business.id,
                    // userId: user.id,
                }
            );
            return res.status(result_totals.status).json({
                message: result_totals.message,
            });
        }

        listRecords.push({
            action: "ORDER_CREATED",
            title: getTitleOrderRecord("ORDER_CREATED"),
            details: `Orden creada de maneara externa.`,
            madeById: params.salesById,
            createdAt: params.createdAt,
            isPublic: true,
        });

        //

        let lastOperationNumber: number = 1;
        if (force_consecutive_invoice_numbers) {
            lastOperationNumber = await OrderReceipt.max("preOperationNumber", {
                where: {
                    businessId: business.id,
                    createdAt: {
                        [Op.gte]: moment(new Date())
                            .startOf("year")
                            .format("YYYY-MM-DD HH:mm"),
                    },
                },
            });
        } else {
            lastOperationNumber = await OrderReceipt.max("preOperationNumber", {
                where: {
                    businessId: business.id,
                    //economicCycleId: economicCycle.id,
                },
            });
        }

        if (!lastOperationNumber) {
            lastOperationNumber = 1;
        } else {
            //@ts-ignore
            lastOperationNumber += 1;
        }

        let lastReservationNumber;
        lastReservationNumber = await OrderReceipt.max("reservationNumber", {
            where: {
                businessId: business.id,
                createdAt: {
                    [Op.gte]: moment(new Date())
                        .startOf("year")
                        .format("YYYY-MM-DD HH:mm"),
                },
            },
        });

        if (!lastReservationNumber) {
            lastReservationNumber = 1;
        } else {
            //@ts-ignore
            lastReservationNumber += 1;
        }

        orderTemplate = await getOrderFromCacheTransaction(business.id, tId);
        orderTemplate.operationNumber = lastOperationNumber;
        orderTemplate.reservationNumber = lastReservationNumber;

        const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
            include: [
                OrderReceiptPrice,
                OrderReceiptTotal,
                {
                    model: SelledProduct,
                    include: [
                        {
                            model: SelledProductAddon,
                            as: "addons",
                            include: [{ model: Price, as: "priceUnitary" }],
                        },
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                    ],
                },
            ],
        });

        await order.save({ transaction: t });

        const config_message_pre_booking =
            configurations.find(
                item => item.key === "config_message_pre_booking"
            )?.value === "true";

        if (config_message_pre_booking && order?.client?.email) {
            emailQueue.add(
                {
                    code: "NOTIFICATION_RESERVATIONS",
                    params: {
                        email: order?.client?.email,
                        business,
                        order_to_emit: order,
                        type: "RESERVATION_PRE",
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        // Obtaining order
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
            order.id,
            { transaction: t }
        );

        //Register record for reservations
        order_to_emit?.selledProducts.forEach(item => {
            listRecordsReservation.push({
                action: "RESERVATION_CREATED",
                title: getTitleReservationRecord("RESERVATION_CREATED"),
                details: `Reserva creada de manera externa.`,
                // madeById: user.id,
                selledProductId: item.id,
            });
        });

        await t.commit();

        if (listRecords.length !== 0) {
            orderQueue.add(
                {
                    code: "REGISTER_RECORDS",
                    params: {
                        records: listRecords,
                        orderId: order.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(200).json(order_to_emit);

        if (listRecordsReservation.length > 0) {
            await ReservationRecord.bulkCreate(listRecordsReservation);
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

export const checkDisposability = async (req: any, res: Response) => {
    try {
        const { startAt, endAt, productId, resourceId, slug } = req.params;

        let where: any = {};
        if (isNaN(slug)) {
            where.slug = slug;
        } else {
            where.id = slug;
        }

        // Obtaining Business
        const business = await Business.findOne({
            attributes: [
                "id",
                "slug",
                "name",
                "status",
                "promotionalText",
                "description",
                "color",
                "includeShop",
                "homeUrl",
            ],
            where: {
                ...where,
                status: "ACTIVE",
            },
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado.`,
            });
        }

        const whereReservation: any = {};

        if (resourceId) {
            whereReservation.resourceId = resourceId;
        }

        const freeTheEvents = await checkEventAvailability({
            startAt,
            endAt,
            businessId: business.id,
        });

        if (freeTheEvents) {
            return res.status(400).json({
                message: "Ya existe un tiempo de bloqueo en ese horario",
            });
        }
        const freeTheReservations = await checkReservationAvailability({
            startAt,
            endAt,
            businessId: business.id,
            focusId: productId,
            ...whereReservation,
        });

        if (freeTheReservations) {
            return res
                .status(400)
                .json({ message: "Ya existe una reserva en este rango" });
        }

        return res.status(200).json({});
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
