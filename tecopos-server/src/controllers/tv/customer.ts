import { Response } from "express";
import Logger from "../../lib/logger";
import Tv from "../../database/models/tv";

export const getTv = async (req: any, res: Response) => {
    try {
        const { code } = req.params;

        const to_return = await Tv.scope("to_return").findOne({
            where: {
                uniqueCode: code,
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
