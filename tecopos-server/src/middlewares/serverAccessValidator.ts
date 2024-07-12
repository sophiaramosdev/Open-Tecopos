import { Response } from "express";
import Logger from "../lib/logger";
import GeneralConfigs from "../database/models/generalConfigs";

export const serverAccessValidator = async (
    req: any,
    res: Response,
    next: any
) => {
    const from = req.header("X-App-Origin");
    const token = req.header("X-App-ServerAccessKey")?.split(" ")[1];

    if (!token) {
        return res.status(403).json({
            message:
                "No hemos recibido sus credenciales de acceso. Por favor, autentíquese nuevamente y vuelva a intentarlo.",
        });
    }

    try {
        const serverAccessKey = await GeneralConfigs.findOne({
            attributes: ["key", "value"],
            where: {
                isPublic: false,
                origin: from,
                key: "server_origin_key",
            },
        });

        if (!serverAccessKey) {
           return res.status(403).json({
                message:
                    "Las credenciales de acceso recibidas no pudieron verificarse. Por favor, vuelva a iniciar sesión e intente de nuevo.",
            });
        }

        if (serverAccessKey?.value !== token) {
            return res.status(403).json({
                message: "Credenciales de acceso no válidas.",
            });
        }

        next();
    } catch (error) {
        Logger.error(error);
        res.status(401).json({
            message:
                "Las credenciales de acceso recibidas no pudieron verificarse. Por favor, vuelva a iniciar sesión e intente de nuevo.",
        });
    }
};
