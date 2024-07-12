import { Request, Response } from "express";
import Logger from "../lib/logger";
import { getBusinessConfigCache } from "../helpers/redisStructure";

export const moduleValidator = (
    moduleChecker: Array<
        | "ACCOUNTS"
        | "WOOCOMMERCE"
        | "HUMAN_RESOURCE"
        | "DUPLICATOR"
        | "BILLING"
        | "PRODUCTION"
        | "RESERVATION"
    >
) => {
    return async (req: any, res: Response, next: any) => {
        if (!req.business) {
            return res.status(500).json({
                message: `You must verify first business.`,
            });
        }

        try {
            //Business Configurations
            const configurations = await getBusinessConfigCache(
                req.user.businessId
            );

            let allowed = true;
            for (const module of moduleChecker) {
                switch (module) {
                    case "ACCOUNTS":
                        allowed =
                            configurations.find(
                                item => item.key === "module_accounts"
                            )?.value === "true";
                        break;
                    case "WOOCOMMERCE":
                        allowed =
                            configurations.find(
                                item => item.key === "module_woocommerce"
                            )?.value === "true";

                        break;
                    case "PRODUCTION":
                        allowed =
                            configurations.find(
                                item => item.key === "module_production"
                            )?.value === "true";

                        break;
                    case "HUMAN_RESOURCE":
                        allowed =
                            configurations.find(
                                item => item.key === "module_human_resources"
                            )?.value === "true";

                        break;
                    case "DUPLICATOR":
                        allowed =
                            configurations.find(
                                item => item.key === "module_duplicator"
                            )?.value === "true";
                    case "BILLING":
                        allowed =
                            configurations.find(
                                item => item.key === "module_billing"
                            )?.value === "true";

                        break;

                    case "RESERVATION":
                        allowed =
                            configurations.find(
                                item => item.key === "module_booking"
                            )?.value === "true";

                        break;
                }

                if (!allowed) {
                    return res.status(403).json({
                        message: `Su negocio no tiene acceso al módulo seleccionado. Por favor, consulte al administrador.`,
                    });
                }
            }

            next();
        } catch (error) {
            Logger.warn(error);
            res.status(403).json({
                message: "No está autorizado a acceder a este recurso.",
            });
        }
    };
};
