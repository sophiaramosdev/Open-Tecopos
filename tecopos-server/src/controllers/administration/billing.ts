import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";
import db from "../../database/connection";

import Billing from "../../database/models/billing";
import Price from "../../database/models/price";
import SubscriptionPlan from "../../database/models/subscriptionPlan";
import User from "../../database/models/user";
import Image from "../../database/models/image";
import Business from "../../database/models/business";
import { pag_params } from "../../database/pag_params";
import Logger from "../../lib/logger";

export const getInvoice = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const bill = await Billing.findByPk(id, {
            attributes: [
                "id",
                "invoiceNumber",
                "status",
                "observations",
                "nextPayment",
                "createdAt",
                "discount",
                "businessId",
            ],
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                    include: [
                        {
                            model: Price,
                            attributes: ["amount", "codeCurrency"],
                        },
                    ],
                },
                {
                    model: User,
                    as: "registeredBy",
                    attributes: ["displayName", "username", "email"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
        });

        if (!bill) {
            return res.status(404).json({
                message: `La factura no fue encontrada`,
            });
        }

        //Permission Check
        if (bill?.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a acceder a este recurso. Acceso denegado.`,
            });
        }

        res.status(200).json(bill);
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

export const findAllMyBilling = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search } = req.query;
        const user: User = req.user;

        const business = await Business.findByPk(user.businessId, {
            include: [SubscriptionPlan],
        });

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado id no fue encontrado.`,
            });
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //Searchable
        let where_clause: any = {};
        if (search) {
            where_clause.invoiceNumber = { [Op.iLike]: `%${search}%` };
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const billing_found = await Billing.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "invoiceNumber",
                "status",
                "observations",
                "nextPayment",
                "createdAt",
            ],
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code"],
                },
            ],
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(billing_found.count / limit);
        if (billing_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: billing_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: billing_found.rows,
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
