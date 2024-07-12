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
