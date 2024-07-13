import { Response, NextFunction } from "express";
import User from "../database/models/user";
import axios from "axios";
import db from "../database/conecction";
import { PermissionCodes } from "../interfaces/serverInterfaces";
import { remoteHeader as headers } from "../utils/fixedData";
import Logger from "../utils/logger";
import UserRole from "../database/models/userRole";
import Role from "../database/models/roles";
import Permission from "../database/models/permissions";
import { Op } from "sequelize";

export const verifyAccess = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const t = await db.transaction();
  try {
    const source = req.header("X-App-Origin");

    if (source === "Tecopos-Server") {
      // Use API key verification for Tecopos-Server
      const apiKey = req.header("X-App-ServerAccessKey");

      if (!apiKey && apiKey !== `${process.env.SERVER_API_KEY}`) {
        t.rollback();
        return res.status(401).json({
          message: "Llave no válida",
        });
      }

      return next();
    }

    if (
      !source ||
      ![
        "Tecopay-App",
        "Tecopay-Admin",
        "Tecopos-Server",
        "Tecopay-Web",
        "Tecopos-Terminal",
      ].includes(source)
    ) {
      t.rollback();
      return res.status(401).json({
        message: "Origen no válido",
      });
    }

    const token = req.header("Authorization")?.split(" ")[1];
    const data = { token };
    const url = `${process.env.AUTH_API_HOST}/servertoserver/check/token`;

    const externalUser = await axios
      .post(url, data, { headers })
      .catch((error) => {
        res.status(error.response?.status ?? 500);
        throw new Error(
          error?.response?.data?.message ??
            "Problema al sincronizar usuario en Identidad"
        );
      });

    const { id, firstName, lastName, username, email } = externalUser.data;

    let user = await User.findOne({
      attributes: [
        "id",
        "fullName",
        "username",
        "email",
        "fcmtoken",
        "isSuperAdmin",
      ],
      where: { externalId: id },
      transaction: t,
    });

    //Creating user in case not found
    if (!user) {
      const newUser = await User.create(
        {
          email,
          username,
          fullName: `${firstName ?? ""} ${lastName ?? ""}`,
          externalId: id,
        },
        { transaction: t }
      );

      user = await User.scope("default").findByPk(newUser.id, {
        transaction: t,
      });
    }

    req.user = user;

    await t.commit();

    next();
  } catch (error: any) {
    console.log(error);
    Logger.error(error);
    t.rollback();
    return res.json({ message: error.message ?? "Internal server error" });
  }
};

///VERIFY PERMISSIONS
export const verifyPermissions = (requiredPermissions: PermissionCodes[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      let user = req.user;
      // Check if the user is a superAdmin
      if (!!user.isSuperAdmin) {
        req.issueEntities = [];
        return next();
      }

      const isAllowed = await UserRole.findAll({
        attributes: ["issueEntityId"],
        where: { userId: req.user.id },
        include: [
          {
            model: Role,
            attributes: ["name"],
            include: [
              {
                model: Permission,
                attributes: ["code"],
                where: { code: { [Op.or]: requiredPermissions } },
                required: false,
                right: true,
              },
            ],
          },
        ],
      });

      if (isAllowed.length === 0) {
        return res.status(401).json({
          message: "No tiene permisos para realizar esta accion",
        });
      }

      const issueEntities = isAllowed.map((item) => item.issueEntityId);

      req.issueEntities = issueEntities;

      next();
    } catch (error) {
      Logger.error(error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
};
