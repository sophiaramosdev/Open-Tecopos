import { Response } from "express";

import Business from "../database/models/business";
import User from "../database/models/user";
import Logger from "../lib/logger";

export const businessValidator = (excludeRute?: boolean) => {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(500).json({
        message: `You must verify user first.`,
      });
    }

    const business: Business = req.business;
    const user: User = req.user;

    //Including original businessId
    req.user.originalBusinessId = Number(user.businessId);

    try {
      if (!business) {
        return res.status(403).json({
          message: `Su usuario no tiene ningún negocio asociado. Acceso denegado.`,
        });
      }

      //Validating business
      if (business.status !== "ACTIVE") {
        return res.status(403).json({
          message: `Su negocio no está disponible. Consulte a soporte técnico para más información.`,
        });
      }

      const businessId = req.header("X-App-BusinessId");

      if (
        businessId &&
          ((!excludeRute &&
          business.mode === "GROUP" &&
          user.roles?.map((item) => item.code).includes("GROUP_OWNER") &&
          business.branches
            ?.map((item) => item.id)
            .includes(Number(businessId))) ||
        user.isSuperAdmin)
      ) {
        req.user.businessId = Number(businessId);
      }

      next();
    } catch (error) {
      Logger.error(error);
      res.status(403).json({
        message: "No está autorizado a acceder a este recurso.",
      });
    }
  };
};
