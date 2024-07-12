import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import Coupon from "../../database/models/coupon";
import AllowedProductsCoupon from "../../database/models/allowedProductsCoupon";
import Product from "../../database/models/product";
import ExcludedProductsCoupon from "../../database/models/excludedProductsCoupon";
import AllowedCategoriesCoupon from "../../database/models/allowedCategoriesCoupon";
import SalesCategory from "../../database/models/salesCategory";
import ExcludedCategoriesCoupon from "../../database/models/excludedCategoriesCoupon ";
import moment from "moment";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";

export const newCoupon = async (req: any, res: Response) => {
    try {
        const {
            code,
            codeCurrency,
            description,
            discountType,
            amount,
            expirationAt,
        } = req.body;
        const user: User = req.user;

        //Checking types
        const allowedTypes = ["PERCENT", "FIXED_CART", "FIXED_PRODUCT"];
        if (!allowedTypes.includes(discountType)) {
            return res.status(400).json({
                message: `${discountType} is not an allowed type. Fields allowed: ${allowedTypes}`,
            });
        }

        //Analyzing if code is in use
        const existCoupon = await Coupon.findOne({
            where: {
                code: code.trim().toUpperCase(),
                businessId: user.businessId,
            },
        });

        if (existCoupon) {
            return res.status(400).json({
                message: `El cupón con código ${code} ya existe en el sistema.`,
            });
        }

        const availableCurrency = await AvailableCurrency.findOne({
            where: {
                businessId: user.businessId,
            },
            include: [
                {
                    model: Currency,
                    where: {
                        code: codeCurrency,
                    },
                },
            ],
        });

        if (!availableCurrency) {
            return res.status(400).json({
                message: `El tipo de moneda ${codeCurrency} proporcionada no fue encontrada en el negocio.`,
            });
        }

        const coupon: Coupon = Coupon.build({
            businessId: user.businessId,
            code: code.trim().toUpperCase(),
            codeCurrency,
            description,
            discountType,
            amount,
            expirationAt,
        });

        await coupon.save();

        const to_return = await Coupon.scope("to_return").findByPk(coupon.id);

        res.status(201).json(to_return);
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

export const getCoupon = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const coupon = await Coupon.findByPk(id);

        if (!coupon) {
            return res.status(404).json({
                message: `El cupón no fue encontrado`,
            });
        }

        if (coupon.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Coupon.scope("to_return").findByPk(coupon.id);
        res.status(200).json(to_return);
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

export const editCoupon = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const {
            allowedProducts,
            excludedProducts,
            allowedSalesCategories,
            excludedSalesCategories,
            ...params
        } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Coupon.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const coupon = await Coupon.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!coupon) {
            t.rollback();
            return res.status(404).json({
                message: `Coupon not found`,
            });
        }

        if (allowedProducts) {
            //Deleting existing products
            await AllowedProductsCoupon.destroy({
                where: {
                    couponId: coupon.id,
                },
                transaction: t,
            });

            const foundAllProducts = await Product.findAll({
                where: {
                    businessId: user.businessId,
                    id: allowedProducts,
                },
            });

            for (const receivedProductId of allowedProducts) {
                const found = foundAllProducts.find(
                    item => item.id === receivedProductId
                );

                if (!found) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con id ${receivedProductId} no fue encontrado.`,
                    });
                }
            }

            //Asigning new products
            let products_object: any = [];
            for (const product of foundAllProducts) {
                products_object.push({
                    couponId: coupon.id,
                    productId: product.id,
                });
            }
            await AllowedProductsCoupon.bulkCreate(products_object, {
                transaction: t,
            });
        }

        if (excludedProducts) {
            //Deleting existing products
            await ExcludedProductsCoupon.destroy({
                where: {
                    couponId: coupon.id,
                },
                transaction: t,
            });

            const foundAllProducts = await Product.findAll({
                where: {
                    businessId: user.businessId,
                    id: excludedProducts,
                },
            });

            for (const receivedProductId of excludedProducts) {
                const found = foundAllProducts.find(
                    item => item.id === receivedProductId
                );

                if (!found) {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con id ${receivedProductId} no fue encontrado.`,
                    });
                }
            }

            //Asigning new products
            let products_object: any = [];
            for (const product of foundAllProducts) {
                products_object.push({
                    couponId: coupon.id,
                    productId: product.id,
                });
            }
            await ExcludedProductsCoupon.bulkCreate(products_object, {
                transaction: t,
            });
        }

        if (allowedSalesCategories) {
            //Deleting existing products
            await AllowedCategoriesCoupon.destroy({
                where: {
                    couponId: coupon.id,
                },
                transaction: t,
            });

            const foundAllSalesCategories = await SalesCategory.findAll({
                where: {
                    businessId: user.businessId,
                    id: allowedSalesCategories,
                },
            });

            for (const receivedSalesCategoryId of allowedSalesCategories) {
                const found = foundAllSalesCategories.find(
                    item => item.id === receivedSalesCategoryId
                );

                if (!found) {
                    t.rollback();
                    return res.status(404).json({
                        message: `La categoría con id ${receivedSalesCategoryId} no fue encontrado.`,
                    });
                }
            }

            //Asigning new products
            let sales_categories: any = [];
            for (const salesCategory of foundAllSalesCategories) {
                sales_categories.push({
                    couponId: coupon.id,
                    salesCategoryId: salesCategory.id,
                });
            }
            await AllowedCategoriesCoupon.bulkCreate(sales_categories, {
                transaction: t,
            });
        }

        if (excludedSalesCategories) {
            //Deleting existing products
            await ExcludedCategoriesCoupon.destroy({
                where: {
                    couponId: coupon.id,
                },
                transaction: t,
            });

            const foundAllSalesCategories = await SalesCategory.findAll({
                where: {
                    businessId: user.businessId,
                    id: excludedSalesCategories,
                },
            });

            for (const receivedSalesCategoryId of excludedSalesCategories) {
                const found = foundAllSalesCategories.find(
                    item => item.id === receivedSalesCategoryId
                );

                if (!found) {
                    t.rollback();
                    return res.status(404).json({
                        message: `La categoría con id ${receivedSalesCategoryId} no fue encontrado.`,
                    });
                }
            }

            //Asigning new products
            let sales_categories: any = [];
            for (const salesCategory of foundAllSalesCategories) {
                sales_categories.push({
                    couponId: coupon.id,
                    salesCategoryId: salesCategory.id,
                });
            }
            await ExcludedCategoriesCoupon.bulkCreate(sales_categories, {
                transaction: t,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                coupon[att] = params[att];
            }
        });

        await coupon.save({ transaction: t });

        await t.commit();

        const to_return = await Coupon.scope("to_return").findByPk(coupon.id);
        res.status(200).json(to_return);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllCoupons = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            search,
            order,
            amountFrom,
            amountTo,
            orderBy,
            ...params
        } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        const searchable_fields = [
            "discountType",
            "expirationAt",
            "freeShipping",
            "individualUse",
        ];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

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
                where(fn("unaccent", col("code")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt", "expirationAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["expirationAt", "DESC"]];
        }

        if (amountTo && amountFrom) {
            //Special case between amounts
            where_clause.amount = {
                [Op.gte]: amountFrom,
                [Op.lte]: amountTo,
            };
        } else {
            if (amountFrom) {
                where_clause.amount = {
                    [Op.gte]: amountFrom,
                };
            }

            if (amountTo) {
                where_clause.amount = {
                    [Op.lte]: amountTo,
                };
            }
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_coupons = await Coupon.findAndCountAll({
            attributes: [
                "id",
                "code",
                "amount",
                "discountType",
                "description",
                "expirationAt",
                "createdAt",
            ],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_coupons.count / limit);
        if (found_coupons.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_coupons.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: totalPages,
            items: found_coupons.rows,
        });
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

export const getActiveCuopons = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const found_coupons = await Coupon.scope("to_return").findAll({
            where: {
                businessId: user.businessId,
                expirationAt: {
                    [Op.gte]: new Date(),
                },
            },
            order: ["expirationAt", "DESC"],
        });

        res.status(200).json(found_coupons);
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

export const deleteCoupon = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const coupon = await Coupon.findByPk(id);

        if (!coupon) {
            return res.status(404).json({
                message: `Coupon not found`,
            });
        }

        //Checking if action belongs to user Business
        if (coupon.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await coupon.destroy();

        res.status(200).json({
            message: `Coupon deleted successfully`,
        });
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
