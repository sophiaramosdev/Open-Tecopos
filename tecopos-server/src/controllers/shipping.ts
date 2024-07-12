import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";

import db from "../database/connection";
import User from "../database/models/user";
import ShippingRegion from "../database/models/shippingRegion";
import { pag_params } from "../database/pag_params";
import Price from "../database/models/price";
import Logger from "../lib/logger";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Role from "../database/models/role";
import Image from "../database/models/image";

//Regions
export const addRegion = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const region: ShippingRegion = ShippingRegion.build(
            {
                ...params,
                businessId: user.businessId,
                price: {
                    codeCurrency: params.price.codeCurrency,
                    amount: params.price.amount,
                },
            },
            { include: [Price] }
        );

        await region.save();

        const to_return = await ShippingRegion.scope("to_return").findByPk(
            region.id
        );

        res.status(201).json(to_return);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const removeRegion = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const region = await ShippingRegion.findByPk(id);

        if (!region) {
            return res.status(404).json({
                message: `El objeto region no fue encontrado.`,
            });
        }

        //Checking permissions
        if (region.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await region.destroy();
        res.status(204).json({});
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editRegion = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { price, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(ShippingRegion.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `No tiene acceso a modificar el atributo ${att}.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const region = await ShippingRegion.findByPk(id, {
            include: [Price],
        });

        if (!region) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto region no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (region.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                region[att] = params[att];
            }
        });

        if (price) {
            if (!region.price) {
                const my_price = Price.build(price);
                await my_price.save({ transaction: t });

                region.priceId = my_price.id;
            } else {
                region.price.codeCurrency = price.codeCurrency;
                region.price.amount = price.amount;

                await region.price.save({ transaction: t });
            }
        }

        await region.save({ transaction: t });

        await t.commit();

        const to_return = await ShippingRegion.scope("to_return").findByPk(id);

        res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllDeliverers = async (req: any, res: Response) => {
    try {
        const { per_page, page, search } = req.query;
        const user: User = req.user;

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { displayName: { [Op.iLike]: `%${search}%` } },
            ];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const users_found = await User.findAndCountAll({
            attributes: [
                "id",
                "username",
                "email",
                "displayName",
                "lastLogin",
                "isActive",
                "businessId",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Role,
                    as: "roles",
                    attributes: ["name", "code"],
                    through: {
                        attributes: [],
                    },
                    where: {
                        code: ["MANAGER_SHIPPING"],
                    },
                },
            ],
            order: [["lastLogin", "DESC"]],
            limit,
            offset,
        });

        let totalPages = Math.ceil(users_found.count / limit);
        if (users_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: users_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: users_found.rows,
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

export const findAllRegions = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            search,
            all_data,
            codeCurrency,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["provinceId", "municipalityId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Searchable
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        }

        let where_price: any = {};
        if (codeCurrency) {
            where_price.codeCurrency = codeCurrency;
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_regions = await ShippingRegion.findAndCountAll({
            distinct: true,
            attributes: ["id", "name", "description"],
            where: { businessId: user.businessId, ...where_clause },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                    where: where_price,
                },
                {
                    model: Municipality,
                    attributes: ["id", "name", "code"],
                },
                {
                    model: Province,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_regions.count / limit);
        if (found_regions.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_regions.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_regions.rows,
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
