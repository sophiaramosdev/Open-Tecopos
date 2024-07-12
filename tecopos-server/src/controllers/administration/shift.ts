import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";

import { pag_params } from "../../database/pag_params";

import db from "../../database/connection";
import User from "../../database/models/user";
import Shift from "../../database/models/shift";
import StockMovement from "../../database/models/stockMovement";
import Image from "../../database/models/image";
import Logger from "../../lib/logger";

export const openShift = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { name, observations } = req.body;
        const user: User = req.user;

        //Checking if there is another shift open
        const openShift = await Shift.findOne({
            where: {
                businessId: user.businessId,
                isActive: true,
            },
        });

        if (openShift) {
            t.rollback();
            return res.status(400).json({
                message: `Ya existe un turno abierto.`,
            });
        }

        const shift: Shift = Shift.build({
            name,
            observations,
            businessId: user.businessId,
            openById: user.id,
            openDate: moment().toDate(),
            isActive: true,
        });

        await shift.save({ transaction: t });

        const to_return = await Shift.scope("to_return").findByPk(shift.id, {
            transaction: t,
        });

        await t.commit();

        req.io.to(`business:${user.businessId}`).emit("shift/open", {
            from: user.id,
        });

        return res.status(201).json(to_return);
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

export const closeShift = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const user: User = req.user;

        //Checking if there is another shift open
        const openShift = await Shift.findOne({
            where: {
                businessId: user.businessId,
                isActive: true,
            },
        });

        if (!openShift) {
            t.rollback();
            return res.status(400).json({
                message: `No existe ningún turno abierto.`,
            });
        }

        //Checking permissions
        if (openShift.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este turno.`,
            });
        }

        openShift.closedById = user.id;
        openShift.isActive = false;
        openShift.closedDate = moment().toDate();

        await openShift.save({ transaction: t });

        const to_return = await Shift.scope("to_return").findByPk(
            openShift.id,
            {
                transaction: t,
            }
        );

        await t.commit();

        req.io
            .to(`business:${user.businessId}`)
            .emit("shift/close", { from: user.id });

        return res.status(200).json(to_return);
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

export const editShift = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Shift.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "openById",
            "closedById",
            "openDate",
            "closedDate",
            "isActive",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const shift = await Shift.findByPk(id);

        if (!shift) {
            return res.status(404).json({
                message: `El turno no fue encontrado.`,
            });
        }

        if (!shift.isActive) {
            return res.status(404).json({
                message: `No puede editar turnos cerrados.`,
            });
        }

        if (shift.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene permitido realizar acciones sobre este turno.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                shift[att] = params[att];
            }
        });

        await shift.save();
        const to_return = await Shift.scope("to_return").findByPk(shift.id);

        return res.status(200).json(to_return);
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

export const findAllShifts = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            status,
            dateFrom,
            dateTo,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["isActive", "createdAt"];

        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_shifts = await Shift.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "name",
                "observations",
                "openDate",
                "closedDate",
                "isActive",
            ],
            include: [
                {
                    model: User,
                    as: "openBy",
                    attributes: ["email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "closedBy",
                    attributes: ["email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
            where: { businessId: user.businessId, ...where_clause },
            limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_shifts.count / limit);
        if (found_shifts.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_shifts.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_shifts.rows,
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

export const getActiveShift = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const openShift = await Shift.findOne({
            where: {
                businessId: user.businessId,
                isActive: true,
            },
        });

        if (!openShift) {
            return res.status(200).json(null);
        }

        if (openShift.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Shift.scope("to_return").findByPk(openShift.id);
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

export const deleteShift = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const shift = await Shift.findByPk(id);

        if (!shift) {
            t.rollback();
            return res.status(404).json({
                message: `El turno no fue encontrado`,
            });
        }

        if (shift.isActive) {
            t.rollback();
            return res.status(404).json({
                message: `Solo pueden eliminarse turnos cerrados.`,
            });
        }

        //Permission Check
        if (shift.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Removing all movements associated to the shift
        await StockMovement.destroy({
            where: {
                createdAt: {
                    [Op.gte]: moment(shift.openDate, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    [Op.lte]: moment(shift.closedDate, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                },
                shiftId: shift.id,
                businessId: user.businessId,
            },
            transaction: t,
        });

        await shift.destroy({ transaction: t });
        await t.commit();
        res.status(204).json({});
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
