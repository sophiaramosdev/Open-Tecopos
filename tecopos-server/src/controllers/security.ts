import { Request, response, Response } from "express";
import { Op, where, fn, col } from "sequelize";

import bcrypt from "bcryptjs";

import db from "../database/connection";
import User from "../database/models/user";
import {
  jwtGenerator,
  jwtRefreshTokenGenerator,
} from "../helpers/jwtGenerator";
import jwt from "jsonwebtoken";
import Token from "../database/models/token";
import Role from "../database/models/role";
import UserRole from "../database/models/userRole";
import Business from "../database/models/business";
import { pag_params } from "../database/pag_params";
import moment from "moment";
import Area from "../database/models/area";
import AllowedStockUserArea from "../database/models/allowedStockUserArea";
import AllowedSaleUserArea from "../database/models/allowedSaleUserArea";
import AllowedManufacturerUserArea from "../database/models/allowedManufacturerUserArea";
import Image from "../database/models/image";
import SubscriptionPlan from "../database/models/subscriptionPlan";
import AllowedAccessPointUserArea from "../database/models/allowedAccessPointUserArea";
import Logger from "../lib/logger";
import { isUserNameValid } from "../helpers/utils";
import { app_origin } from "../interfaces/nomenclators";
import Client from "../database/models/client";
import ConfigurationKey from "../database/models/configurationKey";
import Person from "../database/models/person";
import { getAllBranchBusiness } from "./helpers/utils";
import { redisClient } from "../../app";
import { getExpirationTime, getUserTermKey } from "../helpers/redisStructure";

export const newUser = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const {
      password,
      username,
      email,
      roles,
      isSuperAdmin,
      pinPassword,
      allowedSalesAreas,
      allowedStockAreas,
      allowedManufacturerAreas,
      allowedAccessPointAreas,
      sendMail,
      ...params
    } = req.body;
    const user: User = req.user;

    //Checking username
    const existUsername = await User.findOne({
      where: { username: username.trim().toLowerCase() },
    });

    if (existUsername) {
      t.rollback();
      return res.status(409).json({
        message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
      });
    }

    const processedUsername = username.trim().toLowerCase();

    const isValidUsername = isUserNameValid(processedUsername);

    if (!isValidUsername) {
      t.rollback();
      return res.status(400).json({
        message: `El nombre de usuario solo puede contener letras, números.`,
      });
    }

    if (email) {
      //Checking if email exist
      const existEmail = await User.findOne({
        where: { email },
      });

      if (existEmail) {
        t.rollback();
        return res.status(409).json({
          message: `El correo electrónico: ${email} ya existe en el sistema.`,
        });
      }
    }

    if (!!sendMail && !email) {
      t.rollback();
      return res.status(400).json({
        message: `Para que el usuario sea notificado debe introducir un correo electrónico.`,
      });
    }

    let body = {
      username: processedUsername,
      businessId: user.businessId,
      ...params,
    };

    if (email) {
      body.email = email.trim().toLowerCase();
    }

    const new_user: User = User.build(body);

    await new_user.save({ transaction: t });

    const [all_roles, all_areas] = await Promise.all([
      Role.findAll({
        where: {
          type: "ADMINISTRATION",
        },
      }),
      Area.findAll({
        where: {
          businessId: user.businessId,
        },
      }),
    ]);

    let id_roles: Array<number> = [];
    if (roles) {
      const forbiddenRoles = ["OWNER", "GROUP_OWNER"];
      for (const role of roles) {
        const role_found = all_roles.find((item) => item.code === role);

        if (role_found) {
          id_roles.push(role_found.id);
        } else {
          t.rollback();
          return res.status(406).json({
            message: `${role} is not a valid role.`,
          });
        }

        if (
          !user.roles?.find((item) => item.code === "OWNER") &&
          forbiddenRoles.includes(role_found.code)
        ) {
          t.rollback();
          return res.status(401).json({
            message: `No está autorizado a crear usuarios con el rol ${role}.`,
          });
        }
      }

      //Creating roles
      let roles_object: any = [];
      id_roles.forEach((id: number) => {
        roles_object.push({
          userId: new_user.id,
          roleId: id,
        });
      });

      await UserRole.bulkCreate(roles_object, { transaction: t });
    }

    //Crypt the password
    const salt = bcrypt.genSaltSync();
    if (password) {
      new_user.password = bcrypt.hashSync(password, salt);
    }

    if (pinPassword) {
      if (!/^[0-9]+$/.test(pinPassword)) {
        t.rollback();
        return res.status(400).json({
          message: `pinPassword must only contain numbers`,
        });
      }

      if (pinPassword.length > 6) {
        t.rollback();
        return res.status(400).json({
          message: `El PIN solo puede contener hasta 6 dígitos`,
        });
      }

      new_user.pinPassword = bcrypt.hashSync(pinPassword, salt);
    }

    await new_user.save({ transaction: t });

    //Asigning areas by type
    if (allowedStockAreas) {
      let areas_object: any = [];
      for (const id of allowedStockAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "STOCK") {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} is not a STOCK type`,
          });
        }

        areas_object.push({
          userId: new_user.id,
          stockAreaId: id,
        });
      }
      await AllowedStockUserArea.bulkCreate(areas_object, {
        transaction: t,
      });
    }

    if (allowedManufacturerAreas) {
      let manufacturer_areas_object: any = [];
      for (const id of allowedManufacturerAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "MANUFACTURER") {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} is not a MANUFACTURER type`,
          });
        }

        manufacturer_areas_object.push({
          userId: new_user.id,
          manufacturerAreaId: id,
        });
      }
      await AllowedManufacturerUserArea.bulkCreate(manufacturer_areas_object, {
        transaction: t,
      });
    }

    if (allowedSalesAreas) {
      let sales_areas_object: any = [];
      for (const id of allowedSalesAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "SALE") {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} is not a SALE type`,
          });
        }

        sales_areas_object.push({
          userId: new_user.id,
          saleAreaId: id,
        });
      }
      await AllowedSaleUserArea.bulkCreate(sales_areas_object, {
        transaction: t,
      });
    }

    if (allowedAccessPointAreas) {
      let access_point_areas_object: any = [];
      for (const id of allowedAccessPointAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${id} not found`,
          });
        }

        if (area.type !== "ACCESSPOINT") {
          t.rollback();
          return res.status(404).json({
            message: `Area ${area.name} is not a ACCESSPOINT type`,
          });
        }

        access_point_areas_object.push({
          userId: new_user.id,
          accessPointAreaId: id,
        });
      }
      await AllowedAccessPointUserArea.bulkCreate(access_point_areas_object, {
        transaction: t,
      });
    }

    const user_to_emit = await User.scope("to_return").findByPk(new_user.id, {
      transaction: t,
    });

    await t.commit();
    res.status(201).json(user_to_emit);
  } catch (error: any) {
    t.rollback();
    Logger.error(error, {
      businessId: req.user.businessId,
      "X-App-Origin": req.header("X-App-Origin"),
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const editUser = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const {
      password,
      pinPassword,
      email,
      username,
      roles,
      businessId,
      allowedSalesAreas,
      allowedStockAreas,
      allowedManufacturerAreas,
      allowedAccessPointAreas,
      ...params
    } = req.body;
    const { id } = req.params;
    const user: User = req.user;

    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const user_found = await User.findByPk(id, {
      include: [Person],
    });

    if (!user_found) {
      t.rollback();
      return res.status(404).json({
        message: `El usuario proporcionado no fue encontrado.`,
      });
    }

    //Gell all business
    const moreBusiness = await getAllBranchBusiness(user);

    if (!moreBusiness.includes(user_found.businessId) && !user.isSuperAdmin) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const modelKeys = Object.keys(User.getAttributes());
    const paramsKey = Object.keys(params);
    let message;
    [
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "isSuperAdmin",
      "lastLogin",
      "isLogued",
      "businessId",
    ].forEach((att) => {
      if (paramsKey.includes(att) && !user.isSuperAdmin) {
        message = `You are not allowed to change ${att} attribute.`;
      }
    });

    if (message) {
      t.rollback();
      return res.status(406).json({ message });
    }

    const userRoles = user.roles?.map((item) => item.code) ?? [];

    //Checking if email exist
    if (email) {
      const existEmail = await User.findOne({
        where: {
          email,
          id: { [Op.not]: user_found.id },
        },
      });

      if (existEmail) {
        t.rollback();
        return res.status(409).json({
          message: `${email} already exist.`,
        });
      }

      user_found.email = email;
    }

    if (email === null) {
      //@ts-ignore
      user_found.email = null;
    }

    //Checking username
    if (username) {
      const existUsername = await User.findOne({
        where: {
          username: username.trim().toLowerCase(),
          id: { [Op.not]: user_found.id },
        },
      });

      if (existUsername) {
        t.rollback();
        return res.status(409).json({
          message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
        });
      }

      user_found.username = username.trim().toLowerCase();

      const isValidUsername = isUserNameValid(user_found.username);

      if (!isValidUsername) {
        t.rollback();
        return res.status(400).json({
          message: `El nombre de usuario solo puede contener letras, números.`,
        });
      }
    }

    const [all_roles, all_areas] = await Promise.all([
      Role.findAll({
        where: {
          type: "ADMINISTRATION",
        },
      }),
      Area.findAll({
        where: {
          businessId: moreBusiness,
        },
      }),
    ]);

    if (roles) {
      if (user.id === user_found.id) {
        t.rollback();
        return res.status(400).json({
          message: `No está autorizado a cambiar sus propias credenciales. Por favor consulte al administrador.`,
        });
      }

      let id_roles: Array<number> = [];
      const forbiddenRoles = ["OWNER", "GORUP_OWNER"];
      for (const role of roles) {
        const item = all_roles.find((item) => item.code === role);

        if (item) {
          id_roles.push(item.id);
        } else {
          t.rollback();
          return res.status(406).json({
            message: `${role} is not a valid role.`,
          });
        }

        //Internal validations
        //ADMIN can't promote user to OWNER
        if (userRoles.includes("ADMIN") && forbiddenRoles.includes(item.code)) {
          t.rollback();
          return res.status(401).json({
            message: `No está autorizado a promover a un usuario al Rol ${role}`,
          });
        }
      }

      //Deleting existing roles
      await UserRole.destroy({
        where: {
          userId: user_found.id,
        },
        transaction: t,
      });

      //Creating roles
      let roles_object: any = [];
      id_roles.forEach((id: number) => {
        roles_object.push({
          userId: user_found.id,
          roleId: id,
        });
      });

      await UserRole.bulkCreate(roles_object, { transaction: t });
    }

    if (allowedStockAreas) {
      //Deleting existing areas
      await AllowedStockUserArea.destroy({
        where: {
          userId: user_found.id,
        },
        transaction: t,
      });

      //Asigning areas
      let areas_object: any = [];
      for (const id of allowedStockAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "STOCK") {
          t.rollback();
          return res.status(400).json({
            message: `AreaId ${area} is not a STOCK type`,
          });
        }

        areas_object.push({
          userId: user_found.id,
          stockAreaId: id,
        });
      }
      await AllowedStockUserArea.bulkCreate(areas_object, {
        transaction: t,
      });
    }

    if (allowedManufacturerAreas) {
      //Deleting existing areas
      await AllowedManufacturerUserArea.destroy({
        where: {
          userId: user_found.id,
        },
        transaction: t,
      });

      //Asigning areas
      let areas_object: any = [];
      for (const id of allowedManufacturerAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "MANUFACTURER") {
          t.rollback();
          return res.status(400).json({
            message: `AreaId ${area} is not a MANUFACTURER type`,
          });
        }

        areas_object.push({
          userId: user_found.id,
          manufacturerAreaId: id,
        });
      }
      await AllowedManufacturerUserArea.bulkCreate(areas_object, {
        transaction: t,
      });
    }

    if (allowedSalesAreas) {
      //Deleting existing areas
      await AllowedSaleUserArea.destroy({
        where: {
          userId: user_found.id,
        },
        transaction: t,
      });

      //Asigning areas
      let areas_object: any = [];
      for (const id of allowedSalesAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "SALE") {
          t.rollback();
          return res.status(400).json({
            message: `AreaId ${area} is not a SALE type`,
          });
        }

        areas_object.push({
          userId: user_found.id,
          saleAreaId: id,
        });
      }
      await AllowedSaleUserArea.bulkCreate(areas_object, {
        transaction: t,
      });
    }

    if (allowedAccessPointAreas) {
      //Deleting existing areas
      await AllowedAccessPointUserArea.destroy({
        where: {
          userId: user_found.id,
        },
        transaction: t,
      });

      //Asigning areas
      let areas_object: any = [];
      for (const id of allowedAccessPointAreas) {
        const area = all_areas.find((item) => item.id === id);
        if (!area) {
          t.rollback();
          return res.status(404).json({
            message: `AreaId ${area} not found`,
          });
        }

        if (area.type !== "ACCESSPOINT") {
          t.rollback();
          return res.status(400).json({
            message: `AreaId ${area} is not a ACCESSPOINT type`,
          });
        }

        areas_object.push({
          userId: user_found.id,
          accessPointAreaId: id,
        });
      }
      await AllowedAccessPointUserArea.bulkCreate(areas_object, {
        transaction: t,
      });
    }

    //Crypt the password
    const salt = bcrypt.genSaltSync();
    if (password) {
      user_found.password = bcrypt.hashSync(password, salt);
    }

    if (pinPassword) {
      if (!/^[0-9]+$/.test(pinPassword)) {
        t.rollback();
        return res.status(400).json({
          message: `El PIN solo puede contener números`,
        });
      }

      if (pinPassword.length > 6) {
        t.rollback();
        return res.status(400).json({
          message: `El PIN solo puede contener hasta 6 dígitos`,
        });
      }

      user_found.pinPassword = bcrypt.hashSync(pinPassword, salt);
    }

    const allowedAttributes = [...modelKeys];
    paramsKey.forEach((att) => {
      if (allowedAttributes.includes(att)) {
        //@ts-ignore
        user_found[att] = params[att];
      }
    });

    //Analyzing if user is related with person, then update photo
    if (user_found.person && user_found.person.profilePhotoId) {
      user_found.avatarId = user_found.person.profilePhotoId;
    }

    await user_found.save({ transaction: t });

    const user_to_emit = await User.scope("to_return").findByPk(user_found.id, {
      transaction: t,
    });

    await t.commit();

    res.status(201).json(user_to_emit);

    //Analyzing cache and remove key in case exist
    await redisClient.del(getUserTermKey(user.id, "loginData"));
  } catch (error: any) {
    t.rollback();
    Logger.error(error, {
      businessId: req.user.businessId,
      "X-App-Origin": req.header("X-App-Origin"),
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const editMyUser = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const {
      password,
      pinPassword,
      email,
      username,
      roles,
      businessId,
      allowedSalesAreas,
      allowedStockAreas,
      allowedManufacturerAreas,
      ...params
    } = req.body;
    const userCache: User = req.user;

    const user = await User.findByPk(userCache.id);

    if (!user) {
      t.rollback();
      return res.status(404).json({
        message: `El usuario proporcionado no fue encontrado.`,
      });
    }

    const modelKeys = Object.keys(User.getAttributes());
    const paramsKey = Object.keys(params);
    let message;
    [
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "isSuperAdmin",
      "lastLogin",
      "isLogued",
      "businessId",
      "roles",
    ].forEach((att) => {
      if (paramsKey.includes(att)) {
        message = `You are not allowed to change ${att} attribute.`;
      }
    });

    if (message) {
      t.rollback();
      return res.status(406).json({ message });
    }

    //Checking if email exist
    if (email) {
      const existEmail = await User.findOne({
        where: { email, id: { [Op.not]: user.id } },
      });

      if (existEmail) {
        t.rollback();
        return res.status(409).json({
          message: `El email ${email} ya existe.`,
        });
      }

      user.email = email;
    }

    //Checking username
    if (username) {
      const existUsername = await User.findOne({
        where: {
          username: username.trim().toLowerCase(),
          id: { [Op.not]: user.id },
        },
      });

      if (existUsername) {
        t.rollback();
        return res.status(409).json({
          message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
        });
      }

      user.username = username.trim().toLowerCase();

      const isValidUsername = isUserNameValid(user.username);

      if (!isValidUsername) {
        t.rollback();
        return res.status(400).json({
          message: `El nombre de usuario solo puede contener letras, números.`,
        });
      }
    }

    //Crypt the password
    const salt = bcrypt.genSaltSync();

    if (password) {
      user.password = bcrypt.hashSync(password, salt);
    }

    if (pinPassword) {
      if (!/^[0-9]+$/.test(pinPassword)) {
        t.rollback();
        return res.status(400).json({
          message: `Su PIN solo puede contener números`,
        });
      }

      if (pinPassword.length > 6) {
        t.rollback();
        return res.status(400).json({
          message: `Su PIN solo puede contener hasta 6 dígitos`,
        });
      }

      user.pinPassword = bcrypt.hashSync(pinPassword, salt);
    }

    const allowedAttributes = [...modelKeys];
    paramsKey.forEach((att) => {
      if (allowedAttributes.includes(att)) {
        //@ts-ignore
        user[att] = params[att];
      }
    });

    await user.save({ transaction: t });

    const user_to_emit = await User.scope("to_return").findByPk(user.id, {
      transaction: t,
    });

    await t.commit();

    res.status(201).json(user_to_emit);
  } catch (error: any) {
    t.rollback();
    Logger.error(error, {
      businessId: req.user.businessId,
      "X-App-Origin": req.header("X-App-Origin"),
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const deleteUser = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const user_found = await User.findByPk(id);

    if (!user_found) {
      return res.status(404).json({
        message: `User not found`,
      });
    }

    //Gell all business
    const moreBusiness = await getAllBranchBusiness(user);

    if (!moreBusiness.includes(user_found.businessId) && !user.isSuperAdmin) {
      return res.status(401).json({
        message: `You are not allowed to delete this user.`,
      });
    }

    if (
      user_found.roles?.find(
        (item) => item.code === "OWNER" || item.code === "GROUP_OWNER"
      )
    ) {
      return res.status(401).json({
        message: `Solo los administradores del sistema pueden eliminar a los Propietarios de Negocio.`,
      });
    }

    if (user_found.id === user.id) {
      return res.status(401).json({
        message: `You can't remove your own user. Action forbidden.`,
      });
    }

    await user_found.destroy();

    res.status(200).json({
      message: `User deleted successfully`,
    });

    //Analyzing cache and remove key in case exist
    await redisClient.del(getUserTermKey(user.id, "loginData"));
  } catch (error: any) {
    Logger.error(error, {
      businessId: req.user.businessId,
      "X-App-Origin": req.header("X-App-Origin"),
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const getMyUser = async (req: any, res: Response) => {
  try {
    const user = await User.scope("to_return").findByPk(req.user.id);

    res.status(200).json(user);
  } catch (error: any) {
    Logger.error(error, {
      businessId: req.user.businessId,
      "X-App-Origin": req.header("X-App-Origin"),
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const isEmailAvailable = async (req: any, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      where: {
        email,
      },
    });

    if (user) {
      return res.status(406).json({
        message: `El email introducido no esta disponible. Por favor, seleccione otro.`,
      });
    }

    res.status(200).json({
      message: `Email available`,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const isUsernameAvailable = async (req: any, res: Response) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({
      where: {
        username,
      },
    });

    if (user) {
      return res.status(406).json({
        message: `El username introducido no esta disponible. Por favor, seleccione otro.`,
      });
    }

    res.status(200).json({
      message: `Username available`,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const getUserById = async (req: any, res: Response) => {
  try {
    const user: User = req.user;
    const { id } = req.params;

    const user_found = await User.scope("to_return").findByPk(id);

    if (!user_found) {
      return res.status(404).json({
        message: `User not found.`,
      });
    }

    //Gell all business
    const moreBusiness = await getAllBranchBusiness(user);

    //Checking if action belongs to user Business
    if (!moreBusiness.includes(user_found.businessId) && !user.isSuperAdmin) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    res.status(200).json(user_found);
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findAllUserToLogin = async (req: any, res: Response) => {
  try {
    const { per_page, page, extraBusinesses } = req.query;
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(406).json({
        message: `El parámetro businessId no fue introducido`,
      });
    }

    const business = await Business.findByPk(businessId, {
      include: [
        {
          model: ConfigurationKey,
          attributes: ["key", "value"],
        },
      ],
    });

    if (!business) {
      return res.status(404).json({
        message: `Business provided not found`,
      });
    }

    let allBusiness = [businessId];

    if (extraBusinesses) {
      const listBusinesess = await Business.findAll({
        where: {
          id: extraBusinesses.toString().split(","),
        },
      });

      allBusiness = allBusiness.concat(listBusinesess.map((item) => item.id));
    }

    //Analyzing if force access system must be applied
    const force_access_system =
      business.configurationsKey.find(
        (item) => item.key === "force_access_system"
      )?.value === "true";

    let dinamycIncluded: Array<any> = [
      {
        model: Image,
        as: "avatar",
        attributes: ["id", "src", "thumbnail", "blurHash"],
      },
      {
        model: Role,
        as: "roles",
        attributes: [],
        through: {
          attributes: [],
        },
        where: {
          code: [
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_PRODUCTION",
            "MANAGER_AREA",
            "WEITRESS",
            "MANAGER_ECONOMIC_CYCLE",
            "PRODUCT_PROCESATOR",
            "MANAGER_ACCESS_POINT",
            "MANAGER_SHIFT",
            "CHIEF_PRODUCTION",
            "MARKETING_SALES",
          ],
        },
      },
    ];
    if (force_access_system) {
      dinamycIncluded.push({
        model: Person,
        where: {
          isInBusiness: true,
        },
        required: true,
      });
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const users_found = await User.findAndCountAll({
      distinct: true,
      where: {
        businessId: allBusiness,
      },
      include: dinamycIncluded,
      order: [["lastLogin", "DESC"]],
      limit,
      offset,
    });

    //Preparing response
    let users_response: any = [];
    users_found.rows.forEach((user) => {
      users_response.push({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        displayName: user.displayName,
        lastLogin: user.lastLogin,
      });
    });

    let totalPages = Math.ceil(users_found.count / limit);
    if (users_found.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: users_found.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: users_response,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findAllManagedByUsers = async (req: any, res: Response) => {
  try {
    const { per_page, page, search, roles } = req.query;
    const user: User = req.user;

    //Searchable
    let where_clause: any = {};
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.or] = [
        where(fn("unaccent", col("User.username")), {
          [Op.and]: includeToSearch,
        }),
        where(fn("unaccent", col("User.email")), {
          [Op.and]: includeToSearch,
        }),
        where(fn("unaccent", col("User.displayName")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const users_found = await User.findAndCountAll({
      attributes: [
        "id",
        "username",
        "email",
        "displayName",
        "lastLogin",
        "isActive",
        "businessId",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        ...where_clause,
      },
      include: [
        {
          model: Image,
          as: "avatar",
          attributes: ["id", "src", "thumbnail", "blurHash"],
        },
        {
          model: Role,
          as: "roles",
          attributes: [],
          through: {
            attributes: [],
          },
          where: {
            code: ["MARKETING_SALES"],
          },
        },
      ],
      order: [["lastLogin", "DESC"]],
      limit,
      offset,
    });

    let totalPages = Math.ceil(users_found.count / limit);
    if (users_found.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: users_found.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: users_found.rows,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findAllUser = async (req: any, res: Response) => {
  try {
    const { per_page, page, search, roles, dateFrom, dateTo } = req.query;
    const user: User = req.user;

    //Searchable
    let where_clause: any = {};
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.or] = [
        where(fn("unaccent", col("User.username")), {
          [Op.and]: includeToSearch,
        }),
        where(fn("unaccent", col("User.email")), {
          [Op.and]: includeToSearch,
        }),
        where(fn("unaccent", col("User.displayName")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    //Date filtering
    if (dateFrom && dateTo) {
      //Special case between dates
      where_clause["createdAt"] = {
        [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };
    } else {
      if (dateFrom) {
        where_clause["createdAt"] = {
          [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };
      }

      if (dateTo) {
        where_clause["createdAt"] = {
          [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };
      }
    }

    let where_roles_clause: any = {};
    if (roles) {
      where_roles_clause.code = roles.split(",");
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const users_found = await User.findAndCountAll({
      attributes: [
        "id",
        "username",
        "email",
        "displayName",
        "lastLogin",
        "isActive",
        "businessId",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        id: {
          [Op.not]: user.id,
        },
        ...where_clause,
      },
      include: [
        {
          model: Image,
          as: "avatar",
          attributes: ["id", "src", "thumbnail", "blurHash"],
        },
        {
          model: Role,
          as: "roles",
          attributes: ["name", "code"],
          through: {
            attributes: [],
          },
          where: where_roles_clause,
        },
        {
          model: Area,
          as: "allowedStockAreas",
          attributes: ["id", "name"],
          through: {
            attributes: [],
          },
        },
        {
          model: Area,
          as: "allowedSalesAreas",
          attributes: ["id", "name"],
          through: {
            attributes: [],
          },
        },
        {
          model: Area,
          as: "allowedManufacturerAreas",
          attributes: ["id", "name"],
          through: {
            attributes: [],
          },
        },
      ],
      order: [["lastLogin", "DESC"]],
      limit,
      offset,
    });

    let totalPages = Math.ceil(users_found.count / limit);
    if (users_found.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: users_found.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: users_found.rows,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findGlobalUsers = async (req: any, res: Response) => {
  try {
    const { per_page, page, search } = req.query;

    if (!search) {
      return res.status(400).json({
        message: "De introducir un criterio de búsqueda",
      });
    }

    //Searchable
    let where_clause: any = {};
    const separatlyWords: Array<string> = search.split(" ");
    let includeToSearch: Array<{ [key: string]: string }> = [];
    separatlyWords.forEach((word) => {
      const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
    });

    where_clause[Op.or] = [
      where(fn("unaccent", col("User.username")), {
        [Op.and]: includeToSearch,
      }),
      where(fn("unaccent", col("User.email")), {
        [Op.and]: includeToSearch,
      }),
      where(fn("unaccent", col("User.displayName")), {
        [Op.and]: includeToSearch,
      }),
    ];

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const users_found = await User.findAndCountAll({
      attributes: ["id", "username", "email", "displayName", "isActive"],
      distinct: true,
      where: {
        isActive: true,
        ...where_clause,
      },
      include: [
        {
          model: Image,
          as: "avatar",
          attributes: ["src", "thumbnail", "blurHash"],
        },
      ],
      order: [["username", "DESC"]],
      limit,
      offset,
    });

    let totalPages = Math.ceil(users_found.count / limit);
    if (users_found.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: users_found.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: users_found.rows,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const logIn = async (req: Request, res: Response) => {
  const t = await db.transaction();

  try {
    const { username, password, pinPassword, forceViaEmail } = req.body;
    const source = req.header("X-App-Origin")! as app_origin;

    // If user exist
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username.trim().toLowerCase() },
          { email: username.trim().toLowerCase() },
        ],
      },
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["name", "code"],
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

    if (!user) {
      t.rollback();
      return res.status(400).json({
        message: "El usuario o la contraseña proporcionada no son correctas.",
      });
    }

    const roles = user.roles?.map((item) => item.code);

    //Analyzing if user has all requeriment from the income source
    if (
      !user.business &&
      (source === "Tecopos-Admin" || source === "Tecopos-Management")
    ) {
      t.rollback();
      return res.status(401).json({
        message:
          "El usuario no tiene negocios asociados, por favor consulte al administrador.",
      });
    }

    if (
      (source === "Tecopos" ||
        source === "Tecopos-Management" ||
        source === "Tecopos-Terminal") &&
      user.business?.subscriptionPlan.code === "FREE"
    ) {
      t.rollback();
      return res.status(401).json({
        message:
          "No tiene acceso al recurso solicitado. Contacte al equipo de ventas y adquiera un nuevo Plan.",
      });
    }

    //Analice password from income source
    if (
      [
        "Tecopos-Admin",
        "Tecopos-Alma",
        "Tecopos-Management",
        "Tecopos-Shop",
        "Tecopos-ShopApk",
        "Tecopos-Marketplace",
      ].includes(source) ||
      forceViaEmail
    ) {
      if (!user.password) {
        t.rollback();
        return res.status(400).json({
          message:
            "No tiene una contraseña definida. Por favor, contacte al dueño del negocio.",
        });
      }

      if (!password) {
        t.rollback();
        return res.status(400).json({
          message: "password field is missing.",
        });
      }

      // Verify password
      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        t.rollback();
        return res.status(400).json({
          message: "Nombre de usuario o contraseña incorrecto.",
        });
      }
    } else if (source === "Tecopos" || source === "Tecopos-Terminal") {
      if (!user.pinPassword) {
        t.rollback();
        return res.status(400).json({
          message:
            "No tiene un PIN definido. Por favor, contacte al dueño del negocio.",
        });
      }

      if (!pinPassword) {
        t.rollback();
        return res.status(400).json({
          message: "pinPassword field is missing.",
        });
      }

      // Verify pinpassword
      const validPinPassword = bcrypt.compareSync(
        pinPassword,
        user.pinPassword
      );
      if (!validPinPassword) {
        t.rollback();
        return res.status(400).json({
          message: "La contraseña es incorrecta. Vuelva a intentarlo.",
        });
      }
    } else {
      t.rollback();
      return res.status(401).json({
        message: "No tiene acceso al recurso solicitado.",
      });
    }

        //Analyzing access
        switch (source) {
            case "Tecopos-Admin": {
                const rolesWithNoAccess = [
                    "WEITRESS",
                    "MANAGER_PRODUCTION",
                    "CUSTOMER",
                ];
                const filterRoles = roles?.filter(
                    item => !rolesWithNoAccess.includes(item)
                );

        const hasAcess = filterRoles?.length !== 0;

        if (!hasAcess) {
          t.rollback();
          return res.status(401).json({
            message: "No tiene acceso al recurso solicitado.",
          });
        }

        break;
      }
      case "Tecopos-Alma": {
        const rolesWithAccess = ["CUSTOMER_OPERATOR"];
        const hasAcess = roles?.some((item) => rolesWithAccess.includes(item));

        if (user.isSuperAdmin) break;

        if (!hasAcess) {
          t.rollback();
          return res.status(403).json({
            message: "No tiene acceso al recurso solicitado.",
          });
        }
        break;
      }
      case "Tecopos-Management": {
        const rolesWithAccess = ["OWNER", "ADMIN", "GROUP_OWNER"];
        const hasAcess = roles?.some((item) => rolesWithAccess.includes(item));

        if (!user.isSuperAdmin && !hasAcess) {
          t.rollback();
          return res.status(401).json({
            message: "No tiene acceso al recurso solicitado.",
          });
        }
        break;
      }
      case "Tecopos-ShopApk":
      case "Tecopos-Shop": {
        const token = req.header("X-App-Authorization")?.split(" ")[1];

        if (!token) {
          return res.status(403).json({
            message:
              "No hemos recibido sus credenciales de acceso. Por favor, autentíquese nuevamente y vuelva a intentarlo.",
          });
        }

        // Finding user
        const business = await Business.findOne({
          where: {
            accessKey: token,
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

        //Finding if Client associated to bussiness exist
        const client = await Client.findOne({
          where: {
            businessId: business.id,
            userId: user.id,
          },
        });

        if (!client) {
          const new_client = Client.build({
            email: user.email.trim().toLowerCase(),
            registrationWay: "online",
            businessId: business.id,
            userId: user.id,
          });
          await new_client.save({ transaction: t });
        }
        break;
      }
    }

    //Checking and deleting if previous Token exist
    await Token.destroy({
      where: {
        userId: user.id,
        origin: source,
      },
      transaction: t,
    });

    //Updating lastLogin
    user.lastLogin = new Date();
    await user.save({ transaction: t });

    // Generating JWT
    const token = await jwtGenerator(user.id);
    const refresh_token = await jwtRefreshTokenGenerator(user.id);

    await Token.create(
      {
        userId: user.id,
        token: refresh_token,
        origin: source,
      },
      { transaction: t }
    );

    //Checking if Business is not ACTIVE
    if (!user.isSuperAdmin && user.business?.status === "CREATED") {
      user.business.status = "ACTIVE";
      await user.business.save({ transaction: t });
    }

    await t.commit();

    await redisClient.set(
      getUserTermKey(user.id, "loginData"),
      JSON.stringify(user),
      {
        EX: getExpirationTime("loginData"),
      }
    );

    res.json({
      token,
      refresh_token,
    });
  } catch (error: any) {
    t.rollback();
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const registerBusinessInDevice = async (req: Request, res: Response) => {
  const t = await db.transaction();

  try {
    const { username, password } = req.body;

    // If user exist
    const user = await User.findOne({
      where: { email: username },
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["name", "code"],
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
              model: Image,
              as: "logo",
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
          ],
        },
      ],
    });

    if (!user) {
      t.rollback();
      return res.status(401).json({
        message: "El usuario o la contraseña proporcionada no son correctas.",
      });
    }

    // If user is active
    if (!user.isActive) {
      t.rollback();
      return res.status(401).json({
        message: "Usuario no válido.",
      });
    }

    //Analyzing if user has all requeriment
    if (!user.business) {
      t.rollback();
      return res.status(401).json({
        message:
          "El usuario no tiene negocios asociados, por favor consulte al administrador.",
      });
    }

    //Analice password from income source
    if (!user.password) {
      t.rollback();
      return res.status(400).json({
        message:
          "No tiene una contraseña definida. Por favor, contacte al dueño del negocio.",
      });
    }

    if (!password) {
      t.rollback();
      return res.status(400).json({
        message: "password field is missing.",
      });
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      t.rollback();
      return res.status(401).json({
        message: "Nombre de usuario o contraseña incorrecto.",
      });
    }

    //Updating lastLogin
    user.lastLogin = new Date();
    await user.save({ transaction: t });

    await t.commit();

    res.json({
      businessId: user.business.id,
      registeredBy: user.displayName ?? user.username,
      businessName: user.business.name,
      businessImage: user.business.logo?.src ?? null,
      registeredAt: moment().format("DD/MM/YYYY hh:mm A"),
    });
  } catch (error: any) {
    t.rollback();
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const t = await db.transaction();

  try {
    const { refresh_token } = req.body;
    const source = req.header("X-App-Origin");

    // If refresh_token exist
    const objToken = await Token.findOne({
      where: {
        token: refresh_token,
        origin: source,
      },
    });

    if (!objToken) {
      t.rollback();
      return res.status(400).json({
        message: "Invalid token.",
      });
    }

    //Checking if valid
    const decoded: any = jwt.verify(
      objToken.token,
      process.env.JWT_REFRESH_TOKEN_PK!
    );

    await objToken.destroy({ transaction: t });

    // Generating JWT
    const token = await jwtGenerator(decoded.id);
    const created_refresh_token = await jwtRefreshTokenGenerator(decoded.id);

    await Token.create(
      {
        userId: decoded.id,
        token: created_refresh_token,
        origin: source,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      token,
      refresh_token: created_refresh_token,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    t.rollback();
    res.status(500).json({
      message: "Invalid token.",
    });
  }
};

export const logOut = async (req: any, res: Response) => {
  try {
    const source = req.header("X-App-Origin");

    // If refresh_token exist
    const refresh_token = await Token.findOne({
      where: {
        userId: req.user.id,
        origin: source,
      },
    });

    if (!refresh_token) {
      return res.status(204).json({});
    }

    await refresh_token.destroy();
    res.status(204).json({});
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const getAdministrationRoles = async (req: any, res: Response) => {
  try {
    const roles_found = await Role.findAll({
      attributes: ["code", "name", "description"],
      where: {
        type: "ADMINISTRATION",
        code: {
          [Op.not]: ["GROUP_OWNER"],
        },
      },
    });

    res.status(200).json(roles_found);
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

//For Control
export const getAllRoles = async (req: any, res: Response) => {
  try {
    const roles_found = await Role.findAll({
      attributes: ["code", "name", "description"],
    });

    res.status(200).json(roles_found);
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};
