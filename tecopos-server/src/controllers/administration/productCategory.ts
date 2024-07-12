import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import ProductCategory from "../../database/models/productCategory";
import Image from "../../database/models/image";
import Product from "../../database/models/product";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Business from "../../database/models/business";
import Logger from "../../lib/logger";

//Product Category
export const newProductCategory = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const productCategory: ProductCategory = ProductCategory.build({
            businessId: user.businessId,
            ...params,
        });

        await productCategory.save();

        productCategory.universalCode = productCategory.id;
        await productCategory.save();

        const to_return = await ProductCategory.scope("to_return").findByPk(
            productCategory.id
        );

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

export const editProductCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(ProductCategory.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const productCategory = await ProductCategory.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!productCategory) {
            return res.status(404).json({
                message: `ProductCategory not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                productCategory[att] = params[att];
            }
        });

        await productCategory.save();

        const to_return = await ProductCategory.scope("to_return").findByPk(
            productCategory.id
        );

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

export const findAllProductCategory = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, areaId, all_data } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

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
                where(fn("unaccent", col("ProductCategory.name")), {
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

        let found_pcategories;
        if (areaId) {
            found_pcategories = await ProductCategory.findAndCountAll({
                distinct: true,
                attributes: ["id", "name", "description"],
                where: { businessId: user.businessId, ...where_clause },
                limit: Number.MAX_SAFE_INTEGER,
                offset,
                //@ts-ignore
                order: ordenation,
                include: [
                    {
                        model: Product,
                        attributes: ["id"],
                        include: [
                            {
                                model: StockAreaProduct,
                                attributes: ["id"],
                                where: {
                                    areaId,
                                },
                                required: true,
                            },
                        ],
                    },
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
            });

            //Normalizing data
            found_pcategories = {
                count: found_pcategories.rows.length,
                rows: found_pcategories.rows.map(item => {
                    return {
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        image: item.image,
                        products: item.products.length,
                    };
                }),
            };

            let totalPages = Math.ceil(found_pcategories.rows.length / limit);
            if (found_pcategories.count === 0) {
                totalPages = 0;
            } else if (totalPages === 0) {
                totalPages = 1;
            }

            return res.status(200).json({
                totalItems: found_pcategories.rows.length,
                currentPage: page ? parseInt(page) : 1,
                totalPages: 1,
                items: found_pcategories.rows,
            });
        } else {
            found_pcategories = await ProductCategory.findAndCountAll({
                attributes: ["id", "name", "description"],
                distinct: true,
                where: { businessId: user.businessId, ...where_clause },
                include: [
                    {
                        model: Image,
                        attributes: ["id", "src", "thumbnail", "blurHash"],
                    },
                ],
                limit: all_data ? undefined : limit,
                offset,
                //@ts-ignore
                order: ordenation,
            });

            let totalPages = Math.ceil(found_pcategories.count / limit);
            if (found_pcategories.count === 0) {
                totalPages = 0;
            } else if (totalPages === 0) {
                totalPages = 1;
            }

            res.status(200).json({
                totalItems: found_pcategories.count,
                currentPage: page ? parseInt(page) : 1,
                totalPages: all_data ? 1 : totalPages,
                items: found_pcategories.rows,
            });
        }
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

export const deleteProductCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const productCategory = await ProductCategory.findByPk(id);

        if (!productCategory) {
            return res.status(404).json({
                message: `ProductCategory not found`,
            });
        }

        //Checking if action belongs to user Business
        if (productCategory.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await productCategory.destroy();

        res.status(200).json({
            message: `Category deleted successfully`,
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
