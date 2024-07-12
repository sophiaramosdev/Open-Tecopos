import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import Batch from "../../database/models/batch";
import { getAllBranchBusiness } from "../helpers/utils";
import Price from "../../database/models/price";
import { buyedReceiptQueue } from "../../bull-queue/buyedReceipt";
import BuyedReceipt from "../../database/models/buyedReceipt";

export const findAllBatches = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["areaId", "productId"];
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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Batch.uniqueCode")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_batches = await Batch.findAndCountAll({
            attributes: [
                "id",
                "uniqueCode",
                "entryAt",
                "expirationAt",
                "entryQuantity",
                "availableQuantity",
            ],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            include: [
                {
                    model: Price,
                    as: "netCost",
                    attributes: ["amount", "codeCurrency"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_batches.count / limit);
        if (found_batches.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_batches.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_batches.rows,
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

export const editBatch = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { registeredPrice, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Batch.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "businessId",
            "totalCost",
            "availableQuantity",
            "universalCode",
            "measure",
            "entryAt",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const batch = await Batch.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
            include: [
                {
                    model: Price,
                    as: "registeredPrice",
                },
            ],
        });

        if (!batch) {
            return res.status(404).json({
                message: `Batch not found`,
            });
        }

        if (batch.buyedReceiptId) {
            const buyedReceipt = await BuyedReceipt.findByPk(
                batch.buyedReceiptId
            );

            if (!buyedReceipt) {
                return res.status(404).json({
                    message: `El informe de recepción asociado a este lote no fue encontrado.`,
                });
            }

            if (["CANCELLED", "DISPATCHED"].includes(buyedReceipt.status)) {
                return res.status(400).json({
                    message: `El informe de recepción asociado a este lote ha sido cerrado y no puede modificarse.`,
                });
            }
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                batch[att] = params[att];
            }
        });

        //In case registered Price change
        if (registeredPrice) {
            batch.registeredPrice.amount = registeredPrice.amount;
            batch.registeredPrice.codeCurrency = registeredPrice.codeCurrency;
            await batch.registeredPrice.save();
        }

        await batch.save();

        const to_return = await Batch.scope("to_return").findByPk(batch.id);
        res.status(200).json(to_return);

        if (batch.buyedReceiptId) {
            buyedReceiptQueue.add(
                {
                    code: "UPDATE_COST",
                    params: {
                        buyedReceiptId: batch.buyedReceiptId,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
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
