import { Response } from "express";
import GeneralConfigs from "../database/models/generalConfigs";

export const marketPlaceAccessValidator = () => {
    return async (req: any, res: Response, next: any) => {
        const token = req.header("X-App-Authorization")?.split(" ")[1];

        if (!token) {
            return res.status(403).json({
                message:
                    "No hemos recibido sus credenciales de acceso. Consulte a un administrador.",
            });
        }

        const accessKey = await GeneralConfigs.findOne({
            where: {
                key: "marketplace_origin_key",
            },
        });

        if (!accessKey) {
            return res.status(400).json({
                message: "Sistema marketplace inhabilitado. Permiso denegado.",
            });
        }

        if (accessKey.value !== token) {
            return res.status(401).json({
                message:
                    "No pudieron comprobarse las credenciales de acceso. Permiso denegado.",
            });
        }

        next();
    };
};
