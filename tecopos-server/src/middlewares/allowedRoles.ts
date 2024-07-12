import { Response } from "express";
import { roles } from "../interfaces/nomenclators";

//if roles is empty then only for SuperAdmin
export const allowedRoles = (roles: Array<roles>) => {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(500).json({
        message: `You must verify first token received.`,
      });
    }

    const user_roles = req.user.roles;

    let allowed = false;
    user_roles.forEach((role: any) => {
      if (roles.includes(role.code)) {
        allowed = true;
      }
    });

    if (req.user.isSuperAdmin) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    next();
  };
};
