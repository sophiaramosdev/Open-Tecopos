import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import { getAllBranchBusiness } from "../helpers/utils";
import Modifier from "../../database/models/modifier";
import Area from "../../database/models/area";
import Price from "../../database/models/price";
import { redisClient } from "../../../app";
import { getLongTermKey } from "../../helpers/redisStructure";

export const newModifier = async (req: any, res: Response) => {
    try {
        const { areaId, ...params } = req.body;
        const user: User = req.user;

        const area = await Area.findByPk(areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área proporcionada no fue encontrada.`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(400).json({
                message: `Solo puede establecer modificadores a las áreas de tipo Venta.`,
            });
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(area.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const modifier = Modifier.build(
            {
                ...params,
                areaId,
            },
            { include: [Price] }
        );

        await modifier.save();

        const to_return = await Modifier.scope("to_return").findByPk(
            modifier.id
        );

        res.status(201).json(to_return);

        //Analyzing cache and remove key in case exist
        await redisClient.del(getLongTermKey(areaId, "area", "get"));
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

export const editModifier = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { fixedPrice, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Modifier.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "areaId"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const modifier = await Modifier.findOne({
            where: {
                id,
            },
            include: [
                Price,
                {
                    model: Area,
                    where: {
                        businessId: moreBusiness,
                    },
                },
            ],
        });

        if (!modifier) {
            return res.status(404).json({
                message: `Modifier not found`,
            });
        }

        if (fixedPrice && params.applyFixedAmount) {
            if (modifier.fixedPrice) {
                modifier.fixedPrice.amount = fixedPrice.amount;
                modifier.fixedPrice.codeCurrency = fixedPrice.codeCurrency;
                await modifier.fixedPrice.save();
            } else {
                const new_price = Price.build({
                    amount: fixedPrice.amount,
                    codeCurrency: fixedPrice.codeCurrency,
                });
                await new_price.save();
                modifier.fixedPriceId = new_price.id;
            }
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                modifier[att] = params[att];
            }
        });

        await modifier.save();

        const to_return = await Modifier.scope("to_return").findByPk(
            modifier.id
        );
        res.status(200).json(to_return);

        //Analyzing cache and remove key in case exist
        await redisClient.del(getLongTermKey(modifier.areaId, "area", "get"));
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

export const findAllModifiers = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        //Preparing search
        const searchable_fields = ["areaId", "type"];
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
                where(fn("unaccent", col("Modifier.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["index", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_records = await Modifier.findAndCountAll({
            attributes: [
                "id",
                "name",
                "type",
                "amount",
                "index",
                "active",
                "applyToGrossSales",
                "applyAcumulative",
                "applyFixedAmount",
                "showName",
                "observations",
                "areaId",
            ],
            include: [
                {
                    model: Area,
                    attributes: ["id", "name"],
                    paranoid: false,
                    where: {
                        businessId: user.businessId,
                    },
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
            ],
            distinct: true,
            where: { ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_records.count / limit);
        if (found_records.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_records.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_records.rows,
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

export const deleteModifier = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modifier = await Modifier.findByPk(id, {
            include: [Area],
        });

        if (!modifier) {
            return res.status(404).json({
                message: `Modifier not found`,
            });
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (
            !moreBusiness.includes(modifier.area.businessId) &&
            !user.isSuperAdmin
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await modifier.destroy();

        res.status(200).json({
            message: `Modifier deleted successfully`,
        });

        //Analyzing cache and remove key in case exist
        await redisClient.del(getLongTermKey(modifier.areaId, "area", "get"));
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
