import { Response } from "express";

import Business from "../database/models/business";
import Logger from "../lib/logger";
import SubscriptionPlan from "../database/models/subscriptionPlan";

export const marketPlaceBusinessValidator = () => {
    return async (req: any, res: Response, next: any) => {
        const businessId = req.header("X-App-BusinessId");

        if (!businessId) {
            return res.status(400).json({
                message: "No se recibió ningún origen de negocio.",
            });
        }

        try {
            // Finding business
            const business = await Business.findOne({
                where: {
                    id: businessId,
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

            if (!business.enableManagementOrders) {
                return res.status(400).json({
                    message:
                        "El negocio no tiene habilitado la gestión de órdenes en la tienda, consulte a un administrador. Permiso denegado.",
                });
            }

            req.business = business;

            next();
        } catch (error) {
            Logger.error(error);
            res.status(403).json({
                message: "No está autorizado a acceder a este recurso.",
            });
        }
    };
};
