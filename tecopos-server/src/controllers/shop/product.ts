import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import Logger from "../../lib/logger";
import Product from "../../database/models/product";
import ProductCategory from "../../database/models/productCategory";
import SalesCategory from "../../database/models/salesCategory";
import Price from "../../database/models/price";
import ProductPrice from "../../database/models/productPrice";
import Image from "../../database/models/image";
import Combo from "../../database/models/Combo";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Business from "../../database/models/business";
import Variation from "../../database/models/variation";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import ProductAttribute from "../../database/models/productAttribute";
import moment from "moment";
import SelledProduct from "../../database/models/selledProduct";
import OrderReceipt from "../../database/models/orderReceipt";
import PriceSystem from "../../database/models/priceSystem";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import { exchangeCurrency } from "../../helpers/utils";
import { SimplePrice } from "../../interfaces/commons";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import Area from "../../database/models/area";

export const findAllSalesProducts = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, all_data, orderBy, ...params } =
            req.query;
        const business: Business = req.business;

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        let onlineShopPriceSystem =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        if (
            onlineShopPriceSystem?.length === 0 ||
            onlineShopPriceSystem?.some(item => !!item || item === "")
        ) {
            onlineShopPriceSystem = [];
            const foundMainSystemPrice = await PriceSystem.findOne({
                where: {
                    isMain: true,
                    businessId: business.id,
                },
            });

            if (foundMainSystemPrice) {
                onlineShopPriceSystem.push(foundMainSystemPrice.id);
            }
        }

        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        const enable_sale_shop_multiple_currencies = configurations.find(
            item =>
                item.key ===
                "enable_sale_shop_multiple_currencies_from_exchange_rate"
        )?.value;

        const currencies_for_sale_exchange_rate =
            configurations.find(
                item => item.key === "currencies_for_sale_exchange_rate"
            )?.value || "";

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "salesCategoryId",
            "suggested",
            "onSale",
            "newArrival",
            "isPublicVisible",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("Product.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_products = await Product.findAndCountAll({
            attributes: [
                "id",
                "name",
                "salesCode",
                "description",
                "promotionalText",
                "type",
                "stockLimit",
                "totalQuantity",
                "measure",
                "suggested",
                "showForSale",
                "onSale",
                "isPublicVisible",
                "salesCategoryId",
                "createdAt",
                "updatedAt",
                "universalCode",
                "visibleOnline",
                "newArrival",
                "showWhenOutStock",
                "showRemainQuantities",
                "isWholesale",
                "minimunWholesaleAmount",
                "indexableToSaleOnline",
                "onSaleType",
                "onSaleDiscountAmount",
            ],
            distinct: true,
            where: {
                businessId: business.id,
                visibleOnline: true,
                indexableToSaleOnline: true,
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
                    {
                        showWhenOutStock: true,
                    },
                ],
                ...where_clause,
            },
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
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                    where: {
                        priceSystemId: onlineShopPriceSystem,
                    },
                    required: false,
                    separate: true,
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
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Combo,
                    attributes: ["id", "quantity", "variationId"],
                    as: "compositions",
                    include: [
                        {
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                            model: Product,
                            as: "composed",
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
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
                            model: StockAreaVariation,
                            attributes: ["quantity", "variationId"],
                            where: {
                                quantity: {
                                    [Op.gt]: 0,
                                },
                            },
                            separate: true,
                            required: false,
                            include: [
                                {
                                    model: StockAreaProduct,
                                    attributes: [],
                                    where: {
                                        areaId: online_shop_area_stock,
                                    },
                                },
                            ],
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
            ],
            //@ts-ignore
            order: ordenation,
            limit: all_data ? undefined : limit,
            offset,
        });

        let updatedProduct = found_products.rows;
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

            const allCurrencies = await getCurrenciesCache(business.id);

            updatedProduct = [];
            for (const product of found_products.rows) {
                const currencyMain = product.prices.find(item => item.isMain);

                if (!currencyMain) {
                    updatedProduct.push({
                        ...product.dataValues,
                    });
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
                        allCurrencies
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

                //Analyzing variations
                let updateVariations = [];
                for (const variation of product.variations) {
                    let prices = [];

                    if (!variation.price) {
                        updateVariations.push({
                            ...variation.dataValues,
                            listPrices: [],
                        });
                        continue;
                    }

                    const priceInfo: SimplePrice = {
                        amount: variation.price.amount,
                        codeCurrency: variation.price.codeCurrency,
                    };

                    for (const item of otherCurrencies) {
                        const newPriceAmount = exchangeCurrency(
                            priceInfo,
                            item.currency.code,
                            allCurrencies
                        );

                        const newPrice = {
                            amount: newPriceAmount?.amount,
                            codeCurrency: newPriceAmount?.codeCurrency,
                        };

                        prices.push(newPrice);
                    }

                    updateVariations.push({
                        ...variation.dataValues,
                        listPrices: prices,
                    });
                }

                updatedProduct.push({
                    ...product.dataValues,
                    variations: updateVariations,
                });
            }
        }

        let totalPages = Math.ceil(found_products.count / limit);
        if (found_products.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        return res.status(200).json({
            totalItems: updatedProduct,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_products.rows,
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

export const findAllMostSelledProducts = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy } = req.query;
        const business: Business = req.business;
        const { mode }: { mode: "week" | "month" | "year" | "custom" } =
            req.params;
        const { lastDays, amount } = req.query;

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

        let amount_limit = 50;
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

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const onlineShopPriceSystem = configurations
            .find(item => item.key === "online_shop_price_system")
            ?.value.split(",");
        const online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

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
                        status: {
                            [Op.not]: ["CANCELLED", "REFUNDED"],
                        },
                        origin: [
                            "woo",
                            "online",
                            "shop",
                            "shopapk",
                            "marketplace",
                            "apk",
                        ],
                        businessId: business.id,
                        createdAt: {
                            [Op.gte]: moment(from, "YYYY-MM-DD HH:mm").format(
                                "YYYY-MM-DD HH:mm:ss"
                            ),
                            [Op.lte]: moment(
                                current_day,
                                "YYYY-MM-DD HH:mm"
                            ).format("YYYY-MM-DD HH:mm:ss"),
                        },
                    },
                    attributes: [],
                },
            ],
            group: ["productId"],
            limit: amount_limit,
            order: [[col("totalSale"), "DESC"]],
        });

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_products = await Product.findAndCountAll({
            attributes: [
                "id",
                "name",
                "salesCode",
                "description",
                "promotionalText",
                "type",
                "stockLimit",
                "totalQuantity",
                "measure",
                "suggested",
                "showForSale",
                "onSale",
                "isPublicVisible",
                "salesCategoryId",
                "createdAt",
                "updatedAt",
                "universalCode",
                "visibleOnline",
                "newArrival",
                "showWhenOutStock",
                "showRemainQuantities",
            ],
            distinct: true,
            where: {
                id: most_selled.map(item => item.productId),
            },
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
                    model: ProductPrice,
                    attributes: [
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                    where: {
                        priceSystemId: onlineShopPriceSystem,
                    },
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
                    model: Combo,
                    attributes: ["id", "quantity", "variationId"],
                    as: "compositions",
                    include: [
                        {
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                            model: Product,
                            as: "composed",
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
                },
                {
                    model: StockAreaProduct,
                    attributes: ["quantity", "areaId"],
                    where: {
                        areaId: online_shop_area_stock,
                    },
                },
                {
                    model: Variation,
                    attributes: ["id", "name", "description", "onSale"],
                    as: "variations",
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
                            include: [
                                {
                                    model: StockAreaProduct,
                                    attributes: [],
                                    where: {
                                        areaId: online_shop_area_stock,
                                    },
                                },
                            ],
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
                },
            ],
            //@ts-ignore
            order: ordenation,
            limit,
            offset,
        });

        let totalPages = Math.ceil(found_products.count / limit);
        if (found_products.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_products.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: totalPages,
            items: found_products.rows,
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

export const findAllShopCategories = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, all_data, with_products } =
            req.query;
        const business: Business = req.business;

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        let dinamicIncludes: any = [
            {
                model: Image,
                attributes: ["src", "thumbnail", "blurHash"],
            },
        ];

        if (with_products) {
            //Configurations
            const configurations = await getBusinessConfigCache(business.id);

            const online_shop_area_stock = configurations.find(
                item => item.key === "online_shop_area_stock"
            )?.value;

            dinamicIncludes.push({
                model: Product,
                attributes: [],
                where: {
                    showForSale: true,
                },
                include: [
                    {
                        model: StockAreaProduct,
                        attributes: [],
                        where: {
                            areaId: online_shop_area_stock,
                        },
                        required: true,
                    },
                ],
            });
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_sales_categories = await SalesCategory.findAndCountAll({
            attributes: ["id", "name", "description", "index"],
            distinct: true,
            where: {
                isActive: true,
                businessId: business.id,
            },
            include: dinamicIncludes,
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            ordenation,
        });

        let totalPages = Math.ceil(found_sales_categories.count / limit);
        if (found_sales_categories.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_sales_categories.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_sales_categories.rows,
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

export const getProduct = async (req: any, res: Response) => {
    const definedCodeCurrency = req.header("X-Shop-CodeCurrency");

    try {
        const { id } = req.params;
        const business: Business = req.business;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Configurations
        const configurations = await getBusinessConfigCache(business.id);

        const onlineShopPriceSystem =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        let online_shop_area_stock = configurations.find(
            item => item.key === "online_shop_area_stock"
        )?.value;

        if (!online_shop_area_stock) {
            const mainArea = await Area.findOne({
                where: {
                    businessId: business.id,
                    isMain: true,
                },
            });

            if (!mainArea) {
                return res.status(406).json({
                    message: `El parámetro id no fue introducido`,
                });
            }

            online_shop_area_stock = mainArea.id;
        }

        const product = await Product.findOne({
            attributes: [
                "id",
                "name",
                "description",
                "promotionalText",
                "type",
                "showForSale",
                "stockLimit",
                "totalQuantity",
                "measure",
                "suggested",
                "onSale",
                "isPublicVisible",
                "newArrival",
            ],
            where: {
                id,
                businessId: business.id,
            },
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
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                    where: {
                        priceSystemId: onlineShopPriceSystem,
                    },
                },
                {
                    model: StockAreaProduct,
                    attributes: ["quantity"],
                    where: {
                        areaId: online_shop_area_stock,
                    },
                },
                {
                    model: Combo,
                    attributes: ["id", "quantity", "variationId"],
                    as: "compositions",
                    include: [
                        {
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                            model: Product,
                            as: "composed",
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
                },
                {
                    model: Variation,
                    attributes: ["id", "name", "description", "onSale"],
                    as: "variations",
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
            ],
        });

        if (!product) {
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        const attributes = await ProductAttribute.findAll({
            where: {
                productId: id,
            },
            include: [
                {
                    model: Variation,
                    through: {
                        attributes: [],
                    },
                    where: {
                        id: product.variations.map(item => item.id),
                    },
                },
            ],
        });

        let data_to_return: any = {};
        let uniqueAtt: Array<string> = [];
        for (const att of attributes) {
            if (!uniqueAtt.includes(att.code)) {
                uniqueAtt.push(att.code);
                data_to_return[att.code] = [att.value];
            } else {
                data_to_return[att.code].push(att.value);
            }
        }

        res.status(200).json({
            ...product.dataValues,
            attributes: data_to_return,
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
