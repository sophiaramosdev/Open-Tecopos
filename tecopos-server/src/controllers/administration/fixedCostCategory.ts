import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import { getAllBranchBusiness } from "../helpers/utils";
import FixedCostCategory from "../../database/models/fixedCostCategory";

export const newFixedCostCategory = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const fixedCostCategory: FixedCostCategory = FixedCostCategory.build({
            businessId: user.businessId,
            ...params,
        });

        await fixedCostCategory.save();

        const to_return = await FixedCostCategory.scope("to_return").findByPk(
            fixedCostCategory.id
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

export const editFixedCostCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(FixedCostCategory.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "businessId"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const fixedCostCategory = await FixedCostCategory.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
        });

        if (!fixedCostCategory) {
            return res.status(404).json({
                message: `FixedCostCategory not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                fixedCostCategory[att] = params[att];
            }
        });

        await fixedCostCategory.save();

        const to_return = await FixedCostCategory.scope("to_return").findByPk(
            fixedCostCategory.id
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

export const findAllFixedCostCategories = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data } = req.query;
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
                where(fn("unaccent", col("FixedCostCategory.name")), {
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

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_person_categories = await FixedCostCategory.findAndCountAll(
            {
                attributes: ["id", "name", "description"],
                distinct: true,
                where: { businessId: moreBusiness, ...where_clause },
                limit: all_data ? undefined : limit,
                offset,
                //@ts-ignore
                order: ordenation,
            }
        );

        let totalPages = Math.ceil(found_person_categories.count / limit);
        if (found_person_categories.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_person_categories.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_person_categories.rows,
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

export const deleteFixedCostCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const fixedCostCategory = await FixedCostCategory.findByPk(id);

        if (!fixedCostCategory) {
            return res.status(404).json({
                message: `FixedCostCategory not found`,
            });
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(fixedCostCategory.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await fixedCostCategory.destroy();

        res.status(200).json({
            message: `FixedCostCategory deleted successfully`,
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
