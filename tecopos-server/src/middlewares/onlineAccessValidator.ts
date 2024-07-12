import { Response } from "express";

import Business from "../database/models/business";
import SubscriptionPlan from "../database/models/subscriptionPlan";
import Logger from "../lib/logger";

export const onlineAccessValidator = async (
    req: any,
    res: Response,
    next: any
) => {
    const token = req.header("X-App-Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(403).json({
            message:
                "No hemos recibido sus credenciales de acceso. Por favor, autentíquese nuevamente y vuelva a intentarlo.",
        });
    }

    try {
        // Finding business
        const business = await Business.findOne({
            where: {
                accessKey: token,
                status: "ACTIVE",
            },
            include: [
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code", "description"],
                },
            ],
        });

        if (!business) {
            return res.status(403).json({
                message: "Credenciales de acceso no válidas.",
            });
        }

        // Verify if user is Active
        if (business.status === "INACTIVE") {
            return res.status(403).json({
                message:
                    "El negocio no se encuentra habilitado, consulte a un miembro del equipo técnico. Permiso denegado.",
            });
        }

        req.business = business;
        next();
    } catch (error) {
        Logger.error(error);
        res.status(401).json({
            message:
                "Las credenciales de acceso recibidas no pudieron verificarse. Por favor, vuelva a iniciar sesión e intente de nuevo.",
        });
    }
};
