import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import Logger from "../../lib/logger";
import User from "../../database/models/user";
import Tv from "../../database/models/tv";
import { pag_params } from "../../database/pag_params";
import { v4 as uuidv4 } from "uuid";
import Template from "../../database/models/template";
import Image from "../../database/models/image";
import Sequence from "../../database/models/sequence";
import Page from "../../database/models/page";

export const newTv = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        //Generating uniqueCode
        const randomCode = uuidv4().split("-")[1];

        const tv: Tv = Tv.build({
            businessId: user.businessId,
            madeById: user.id,
            uniqueCode: randomCode,
            ...params,
        });

        await tv.save();

        const to_return = await Tv.scope("simple_return").findByPk(tv.id);

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

export const getTv = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const to_return = await Tv.scope("to_return").findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!to_return) {
            return res.status(404).json({
                message: `Tv not found`,
            });
        }

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

export const editTv = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Tv.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "uniqueCode"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const tv = await Tv.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!tv) {
            return res.status(404).json({
                message: `Tv not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                tv[att] = params[att];
            }
        });

        await tv.save();

        const to_return = await Tv.scope("simple_return").findByPk(tv.id);
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

export const findAllTvs = async (req: any, res: Response) => {
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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Tv.name")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Tv.uniqueCode")), {
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

        const found_items = await Tv.findAndCountAll({
            attributes: [
                "id",
                "name",
                "description",
                "createdAt",
                "isActive",
                "orientation",
                "businessId",
                "uniqueCode",
            ],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_items.count / limit);
        if (found_items.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_items.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_items.rows,
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

export const deleteTv = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const tv = await Tv.findByPk(id);

        if (!tv) {
            return res.status(404).json({
                message: `Tv not found`,
            });
        }

        //Checking if action belongs to user Business
        if (tv.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await tv.destroy();

        res.status(200).json({
            message: `Tv deleted successfully`,
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

//Templates
export const findAllTemplates = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data, ...params } =
            req.query;

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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Template.name")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Template.code")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Preparing search
        const searchable_fields = ["orientation", "isActive"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
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

        const found_items = await Template.findAndCountAll({
            attributes: [
                "id",
                "name",
                "description",
                "createdAt",
                "isActive",
                "orientation",
                "businessId",
                "structure",
                "code",
            ],
            distinct: true,
            where: { ...where_clause },
            include: [
                {
                    model: Image,
                    as: "cover",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_items.count / limit);
        if (found_items.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_items.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_items.rows,
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

export const findAllSequences = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data, ...params } =
            req.query;

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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Sequence.name")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Sequence.code")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Preparing search
        const searchable_fields = ["isActive"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
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

        const found_items = await Sequence.findAndCountAll({
            attributes: [
                "id",
                "name",
                "description",
                "createdAt",
                "isActive",
                "code",
                "meta",
            ],
            distinct: true,
            where: { ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_items.count / limit);
        if (found_items.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_items.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_items.rows,
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

//Pages
export const newPage = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const tv = await Tv.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!tv) {
            return res.status(404).json({
                message: `Tv not found`,
            });
        }

        const page: Page = Page.build({
            ...params,
            tvId: id,
        });

        await page.save();

        const to_return = await Page.scope("to_return").findByPk(page.id);

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

export const getPage = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const to_return = await Page.scope("to_return").findOne({
            where: {
                id,
            },
        });

        if (!to_return) {
            return res.status(404).json({
                message: `Page not found`,
            });
        }

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

export const editPage = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Page.getAttributes());
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

        const page = await Page.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: Tv,
                    where: {
                        businessId: user.businessId,
                    },
                },
            ],
        });

        if (!page) {
            return res.status(404).json({
                message: `Page not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                page[att] = params[att];
            }
        });

        await page.save();

        const to_return = await Page.scope("to_return").findByPk(page.id);
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

export const findAllPagesInTv = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Page.name")), {
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

        const found_items = await Page.findAndCountAll({
            attributes: ["id", "name", "order", "isActive"],
            distinct: true,
            where: { tvId: id, ...where_clause },
            include: [
                {
                    model: Tv,
                    where: {
                        businessId: user.businessId,
                    },
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_items.count / limit);
        if (found_items.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_items.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_items.rows,
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

export const deletePage = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const page = await Page.findByPk(id, {
            include: [Tv],
        });

        if (!page) {
            return res.status(404).json({
                message: `Page not found`,
            });
        }

        //Checking if action belongs to user Business
        if (page.tv.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await page.destroy();

        res.status(200).json({
            message: `Page deleted successfully`,
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
