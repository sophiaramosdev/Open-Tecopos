import { Request, Response } from "express";
import { Op, where, fn, col, literal } from "sequelize";

import { pag_params } from "../database/pag_params";
import Product from "../database/models/product";
import Image from "../database/models/image";
import SalesCategory from "../database/models/salesCategory";
import ProductPrice from "../database/models/productPrice";
import ProductAttribute from "../database/models/productAttribute";
import Logger from "../lib/logger";
import Combo from "../database/models/Combo";
import StockAreaVariation from "../database/models/stockAreaVariation";
import Price from "../database/models/price";
import Variation from "../database/models/variation";
import Business from "../database/models/business";
import Address from "../database/models/address";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Country from "../database/models/country";
import BusinessCategory from "../database/models/businessCategory";

export const findAllProducts = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            search,
            type,
            disponibilityFrom,
            disponibilityTo,
            all_data,
            municipalityId,
            provinceId,
            ...params
        } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "measure",
            "salesCategoryId",
            "suggested",
            "onSale",
            "showWhenOutStock",
            "showRemainQuantities",
            "newArrival",
            "isWholesale",
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

        if (disponibilityFrom && disponibilityTo) {
            //Special case between amounts
            where_clause.totalQuantity = {
                [Op.gte]: disponibilityFrom,
                [Op.lte]: disponibilityTo,
            };
        } else {
            if (disponibilityFrom) {
                where_clause.totalQuantity = {
                    [Op.gte]: disponibilityFrom,
                };
            }

            if (disponibilityTo) {
                where_clause.totalQuantity = {
                    [Op.lte]: disponibilityTo,
                };
            }
        }

        let where_address_business: any = {};
        if (municipalityId) {
            where_address_business.municipalityId = municipalityId;
        } else if (provinceId) {
            where_address_business.provinceId = provinceId;
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_products = await Product.findAndCountAll({
            attributes: [
                "name",
                "type",
                "showForSale",
                "stockLimit",
                "totalQuantity",
                "measure",
                "isPublicVisible",
                "totalQuantity",
                "createdAt",
                "showRemainQuantities",
                "showWhenOutStock",
                "newArrival",
                "onSale",
                "isWholesale",
                "minimunWholesaleAmount",
            ],
            distinct: true,
            where: {
                type: {
                    [Op.or]: ["MENU", "SERVICE", "COMBO", "STOCK", "VARIATION"],
                },
                showForSale: true,
                [Op.or]: [
                    {
                        stockLimit: false,
                    },
                    {
                        [Op.and]: [
                            { stockLimit: true },
                            {
                                totalQuantity: {
                                    [Op.gt]: 0,
                                },
                            },
                        ],
                    },
                    {
                        showWhenOutStock: true,
                    },
                ],
                ...where_clause,
            },
            order: [["name", "ASC"]],
            include: [
                {
                    model: SalesCategory,
                    attributes: ["name", "description"],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Business,
                    attributes: ["name", "slug", "logoId", "addressId"],
                    include: [
                        {
                            model: Image,
                            as: "logo",
                            attributes: ["src", "thumbnail", "blurHash"],
                        },
                        {
                            model: Address,
                            attributes: [
                                "street_1",
                                "street_2",
                                "description",
                                "city",
                                "postalCode",
                                "provinceId",
                                "municipalityId",
                            ],
                            where: where_address_business,
                            include: [
                                {
                                    model: Municipality,
                                    attributes: ["id", "name", "code"],
                                },
                                {
                                    model: Province,
                                    attributes: ["id", "name", "code"],
                                },
                            ],
                        },
                    ],
                    where: {
                        status: "ACTIVE",
                        indexSinTerceros: true,
                    },
                    required: true,
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
                    model: Product,
                    as: "availableAddons",
                    attributes: ["name", "salesCode", "description"],
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: ["price", "codeCurrency", "isMain"],
                        },
                    ],
                    required: false,
                    where: {
                        totalQuantity: {
                            [Op.gt]: 0,
                        },
                    },
                },
                {
                    model: ProductPrice,
                    attributes: ["price", "isMain", "codeCurrency"],
                },
                {
                    model: ProductAttribute,
                    attributes: ["name", "code", "value"],
                },
                {
                    model: Combo,
                    attributes: ["quantity", "variationId"],
                    as: "compositions",
                    include: [
                        {
                            attributes: ["name", "measure", "type"],
                            model: Product,
                            as: "composed",
                        },
                    ],
                },
                {
                    model: Variation,
                    attributes: ["name", "description", "onSale"],
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
                            required: false,
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
                    required: false,
                },
            ],
            limit: all_data ? undefined : limit,
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

export const findAllBusinesses = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, ...params } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_businesses = await Business.findAndCountAll({
            attributes: ["name", "status", "slug", "type"],
            distinct: true,
            where: {
                status: "ACTIVE",
                indexSinTerceros: true,
                ...where_clause,
            },
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["name", "description"],
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["src", "thumbnail", "blurHash"],
                },
            ],
            order: [["createdAt", "DESC"]],
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
