import { Response } from "express";
import jwt from "jsonwebtoken";

import Business from "../database/models/business";
import Role from "../database/models/role";
import SubscriptionPlan from "../database/models/subscriptionPlan";
import User from "../database/models/user";
import Logger from "../lib/logger";
import {
    getExpirationTime,
    getUserLoginFromCache,
    getUserTermKey,
} from "../helpers/redisStructure";
import { redisClient } from "../../app";

export const jwtValidator = async (req: any, res: Response, next: any) => {
    
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(403).json({
            message:
                "No hemos recibido sus credenciales de acceso. Por favor, autentíquese nuevamente y vuelva a intentarlo.",
        });
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_TOKEN_PK!);

        // Finding user
        let user = await getUserLoginFromCache(decoded.id);

        if (!user) {
            user = await User.findByPk(decoded.id, {
                include: [
                    {
                        model: Role,
                        as: "roles",
                        attributes: ["code"],
                        through: {
                            attributes: [],
                        },
                    },
                    {
                        model: Business,
                        as: "business",
                        include: [
                            {
                                model: SubscriptionPlan,
                                attributes: ["name", "code", "description"],
                            },
                            {
                                model: Business,
                                as: "branches",
                                attributes: ["id"],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                    },
                ],
            });

            if (user) {
                await redisClient.set(
                    getUserTermKey(user.id, "loginData"),
                    JSON.stringify(user),
                    {
                        EX: getExpirationTime("loginData"),
                    }
                );
            }
        }

        if (!user) {
            return res.status(403).json({
                message:
                    "No está autorizado a acceder a este recurso. Credenciales de acceso no válidas.",
            });
        }

        // Verify if user is Active
        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "No está autorizado a acceder a este recurso. Credenciales de acceso no válidas.",
            });
        }

        if (user.roles?.length === 0 && !user.isSuperAdmin) {
            return res.status(403).json({
                message:
                    "No tiene permisos para acceder a este recurso. Permiso denegado.",
            });
        }

        req.user = user;
        req.business = user.business;
        next();
    } catch (error) {
        Logger.warn(error);
        res.status(401).json({
            message:
                "Las credenciales de acceso recibidas no pudieron verificarse. Por favor, vuelva a iniciar sesión e intente de nuevo.",
        });
    }
};
