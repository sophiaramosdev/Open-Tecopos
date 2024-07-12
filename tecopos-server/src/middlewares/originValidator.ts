import { Response } from "express";
import { app_origin } from "../interfaces/nomenclators";

export const originValidator = (originAllowed: Array<app_origin>) => {
    return (req: any, res: Response, next: any) => {
        const from = req.header("X-App-Origin");

        let allowed = false;
        originAllowed.forEach((origin: string) => {
            if (origin.includes(from)) {
                allowed = true;
            }
        });

        if (!allowed) {
            return res.status(403).json({
                message: `El origen de la solicitud no pudo ser validado. Acceso denegado.`,
            });
        }

        next();
    };
};
