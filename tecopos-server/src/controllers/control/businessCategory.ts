import { Response } from "express";
import { Op } from "sequelize";

import BusinessCategory from "../../database/models/businessCategory";
import { pag_params } from "../../database/pag_params";
import Logger from "../../lib/logger";

//BusinessCategory
export const newBusinessCategory = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;

        const businessCategory: BusinessCategory = BusinessCategory.build({
            ...params,
        });

        await businessCategory.save();

        res.status(201).json(businessCategory);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editBusinessCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(BusinessCategory.getAttributes());
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

        const businessCategory = await BusinessCategory.findByPk(id);

        if (!businessCategory) {
            return res.status(404).json({
                message: `BusinessCategory not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                businessCategory[att] = params[att];
            }
        });

        await businessCategory.save();
        res.status(200).json(businessCategory);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteBusinessCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const businessCategory = await BusinessCategory.findByPk(id);

        if (!businessCategory) {
            return res.status(404).json({
                message: `BusinessCategory not found`,
            });
        }

        await businessCategory.destroy();

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

export const findAllBusinessCategories = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search } = req.query;

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
                attributes: ["id", "name", "description", "isActive"],
                distinct: true,
                where: { ...where_clause },
                limit,
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
            totalPages,
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
