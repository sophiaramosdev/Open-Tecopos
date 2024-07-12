import { Request, response, Response } from "express";
import { Op } from "sequelize";

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
import Logger from "../lib/logger";
import { isUserNameValid } from "../helpers/utils";
import { app_origin } from "../interfaces/nomenclators";

export const registerUser = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const source = req.header("X-App-Origin");
    let { username, displayName, password, email } = req.body;

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

    if (!username) {
      username = email.trim().toLowerCase().split("@")[0];
    }

    //Checking username
    const existUsername = await User.findOne({
      where: { username },
    });

    if (existUsername) {
      username =
        username + `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;
    }

    //Creating password
    const salt = bcrypt.genSaltSync();
    const criptedPassword = bcrypt.hashSync(password, salt);

    let body = {
      username,
      displayName,
      password: criptedPassword,
      email: email.trim().toLowerCase(),
      lastLogin: new Date(),
    };

    const new_user: User = User.build(body);

    await new_user.save({ transaction: t });

    const role_user = await Role.findOne({
      where: {
        code: "CUSTOMER",
      },
    });

    if (!role_user) {
      t.rollback();
      return res.status(409).json({
        message: `El rol Usuario del sistema no fue encontrado.`,
      });
    }

    await UserRole.bulkCreate(
      [
        {
          userId: new_user.id,
          roleId: role_user.id,
        },
      ],
      { transaction: t }
    );

    const user_to_emit = await User.scope("simple_user").findByPk(new_user.id, {
      transaction: t,
    });

    // Generating JWT
    const token = await jwtGenerator(new_user.id);
    const refresh_token = await jwtRefreshTokenGenerator(new_user.id);

    await Token.create(
      {
        userId: new_user.id,
        token: refresh_token,
        origin: source,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ user: user_to_emit, jwt: { token, refresh_token } });
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
    const { password, username, displayName } = req.body;
    const user: User = req.user;

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

    if (username) user.username = username;
    if (displayName) user.displayName = displayName;

    await user.save({ transaction: t });

    const user_to_emit = await User.scope("simple_user").findByPk(user.id, {
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

export const deleteMyUser = async (req: any, res: Response) => {
  try {
    const user: User = req.user;

    if (user.id !== user.id) {
      return res.status(401).json({
        message: `Solo el propio usuario puede requerir la eliminación de su usuario.`,
      });
    }

    await user.destroy();

    res.status(200).json({
      message: `User deleted successfully`,
    });
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
    const user = await User.scope("simple_user").findByPk(req.user.id);

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

export const isTokenValid = async (req: any, res: Response) => {
  try {
    const { token } = req.body;

    const decoded: any = jwt.verify(token, process.env.JWT_TOKEN_PK!);

    // Finding user
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(403).json({
        message: "Credenciales de acceso no válidas.",
      });
    }

    // Verify if user is Active
    if (!user.isActive) {
      return res.status(403).json({
        message: "Usuario no válido. Credenciales de acceso no válidas.",
      });
    }

    res.status(200).json({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
    });
  } catch (error: any) {
    Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
    res.status(401).json({
      message: "Credenciales de acceso no válidas.",
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

export const logIn = async (req: Request, res: Response) => {
  const t = await db.transaction();

  try {
    const { email, password } = req.body;
    const source = req.header("X-App-Origin")! as app_origin;

    // If user exist
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      t.rollback();
      return res.status(400).json({
        message: "El usuario o la contraseña proporcionada no son correctas.",
      });
    }

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

    await t.commit();

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
