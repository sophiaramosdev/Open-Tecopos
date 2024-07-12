import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";

import db from "../../database/connection";
import User from "../../database/models/user";
import { pag_params } from "../../database/pag_params";
import PaymentGateway from "../../database/models/paymentGateway";
import Logger from "../../lib/logger";

export const getPaymentGateway = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const paymentGateway = await PaymentGateway.findByPk(id);

        if (!paymentGateway) {
            return res.status(404).json({
                message: `El objeto paymentGateway no fue encontrado.`,
            });
        }

        //Checking permissions
        if (paymentGateway.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await PaymentGateway.scope("to_return").findByPk(id);

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

export const editPaymentGateway = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(PaymentGateway.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "businessId",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "externalId",
            "name",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `No tiene acceso a modificar el atributo ${att}.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const paymentGateway = await PaymentGateway.findByPk(id);

        if (!paymentGateway) {
            t.rollback();
            return res.status(404).json({
                message: `El objeto Payment Gateway no fue encontrado`,
            });
        }

        //Checking if action belongs to user Business
        if (paymentGateway.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                paymentGateway[att] = params[att];
            }
        });

        await paymentGateway.save({ transaction: t });

        const client_to_emit = await PaymentGateway.scope("to_return").findByPk(
            id,
            {
                transaction: t,
            }
        );

        await t.commit();

        res.status(200).json(client_to_emit);
    } catch (error: any) {
        t.rollback();
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

export const findAllPaymentGateway = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, ...params } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search && isNaN(search)) {
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

        const found_payment_gateways = await PaymentGateway.scope(
            "to_return"
        ).findAndCountAll({
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_payment_gateways.count / limit);
        if (found_payment_gateways.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_payment_gateways.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_payment_gateways.rows,
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
