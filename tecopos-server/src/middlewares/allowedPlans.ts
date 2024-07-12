import { Response } from "express";
import Business from "../database/models/business";
import { subscriptions_plans } from "../interfaces/nomenclators";

export const allowedPlans = (plans: Array<subscriptions_plans>) => {
    return (req: any, res: Response, next: any) => {
        if (!req.business) {
            return res.status(500).json({
                message: `You must verify business first.`,
            });
        }

        const business: Business = req.business;

        if (!business.subscriptionPlan) {
            return res.status(403).json({
                message: `Su negocio no tiene un plan válido activo. Consulte al soporte técnico.`,
            });
        }

        const activeBusinessPlan = business.subscriptionPlan.code;

        let allowed = false;
        plans.forEach((plan: any) => {
            if (plan.includes(activeBusinessPlan)) {
                allowed = true;
            }
        });

        if (!allowed) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        next();
    };
};
