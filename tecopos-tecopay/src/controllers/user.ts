import { Request, Response } from "express";
import User from "../database/models/user";
import { pag_params } from "../database/pag_params";
import axios from "axios";
import db from "../database/conecction";
import { Op, Order } from "sequelize";
import { remoteHeader as headers } from "../utils/fixedData";
import Role from "../database/models/roles";
import Logger from "../utils/logger";
import IssueEntity from "../database/models/issueEntity";
import UserRole from "../database/models/userRole";
import Card from "../database/models/card";
import Account from "../database/models/account";

export const registerUserExisting = async (req: any, res: Response) => {
  const { externalId, roles } = req.body;

  try {
    const existingUser = await User.findOne({ where: { externalId } });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const remoteUrl = `${process.env.AUTH_API_HOST}/servertoserver/user/${externalId}`;
    const response = await axios.get(remoteUrl, { headers });

    if (response.status !== 200) {
      return res
        .status(404)
        .json({ message: "El usuario no existe en Identidad" });
    }

    const userData = response.data;

    const user = await User.create({
      externalId: userData.id,
      username: userData.username,
      fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`,
      email: userData.email,
      phone: userData.phone ?? undefined,
    });

    for (const role of roles) {
      const { roleId, issueEntityId } = role;

      const issueEntity = await IssueEntity.findByPk(issueEntityId);
      if (!issueEntity) {
        await user.destroy();
        return res.status(404).json({ message: `Entidad no encontrada` });
      }

      const roleExists = await Role.findOne({
        where: { id: roleId },
      });
      if (!roleExists) {
        await user.destroy();
        return res.status(404).json({
          message: `Role no encontrado `,
        });
      }

      await UserRole.create({
        userId: user.id,
        roleId,
        issueEntityId,
      });
    }

    const createdUser = await User.findByPk(user.id, { include: [UserRole] });

    if (!createdUser) {
      return res.status(404).json({ message: "Registered user not found." });
    }

    // Simplified response
    const simplifiedResponse = {
      id: createdUser.id,
      username: createdUser.username,
      fullName: createdUser.fullName,
      email: createdUser.email,
      phone: createdUser.phone,
      roles: createdUser.roles.map((userRole) => ({
        roleId: userRole.roleId,
        issueEntityId: userRole.issueEntityId,
      })),
    };

    return res.status(201).json(simplifiedResponse);
  } catch (error) {
    Logger.error(error);
    console.error("Error en el registro de usuario:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const registerNewUser = async (req: any, res: Response) => {
  const { email, firstName, lastName, phone, sex, roles } = req.body;

  try {
    const requestBody = {
      email,
      firstName,
      lastName,
      phone,
      sex,
    };

    const externalUserResponse = await axios
      .post(
        `${process.env.AUTH_API_HOST}/servertoserver/register-user`,
        requestBody,
        { headers }
      )
      .catch((error) => {
        res.status(error.response.status);
        throw new Error(
          error?.response?.data?.message ??
            "Problema al crear usuario en Identidad"
        );
      });

    const externalUserId = externalUserResponse.data.id;

    const user = await User.create({
      externalId: externalUserId,
      username: email,
      fullName: `${firstName??""} ${lastName??""}`,
      email,
      phone,
    });

    for (const role of roles) {
      const { roleId, issueEntityId } = role;

      const issueEntity = await IssueEntity.findByPk(issueEntityId);
      if (!issueEntity) {
        return res
          .status(404)
          .json({ message: `Entity not found for ID: ${issueEntityId}` });
      }

      const roleExists = await Role.findOne({
        where: { id: roleId },
      });
      if (!roleExists) {
        return res
          .status(404)
          .json({ message: `Role not found for ID: ${roleId}` });
      }

      await UserRole.create({
        userId: user.id,
        roleId,
        issueEntityId,
      });
    }

    const createdUser = await User.findByPk(user.id, { include: [UserRole] });

    if (!createdUser) {
      return res.status(404).json({ message: "Registered user not found." });
    }

    // Simplified response
    const simplifiedResponse = {
      id: createdUser.id,
      username: createdUser.username,
      fullName: createdUser.fullName,
      email: createdUser.email,
      phone: createdUser.phone,
      roles: createdUser.roles.map((userRole) => ({
        roleId: userRole.roleId,
        issueEntityId: userRole.issueEntityId,
      })),
    };

    return res.status(201).json(simplifiedResponse);
  } catch (error: any) {
    Logger.error(error);
    console.error("Error en el registro del usuario:", error);
    return res
      .status(500)
      .json({ message: error.message ?? "Internal server error" });
  }
};

export const assignRolesToUser = async (req: any, res: Response) => {
  const { roles } = req.body;
  const { userId } = req.params;

  try {
    const existingUser = await User.findByPk(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "El usuario no existe" });
    }

    await UserRole.destroy({ where: { userId } });

    const issueEntitySet = new Set();

    for (const role of roles) {
      const { roleId, issueEntityId } = role;

      if (issueEntitySet.has(issueEntityId)) {
        return res.status(400).json({
          message: "Un usuario solo puede tener un rol por entidad.",
        });
      }

      issueEntitySet.add(issueEntityId);

      const issueEntity = await IssueEntity.findByPk(issueEntityId);
      if (!issueEntity) {
        return res.status(404).json({ message: `Entidad no encontrada` });
      }

      const roleExists = await Role.findOne({
        where: { id: roleId },
      });
      if (!roleExists) {
        return res.status(404).json({ message: `Role no encontrado` });
      }

      await UserRole.create({
        userId,
        roleId,
        issueEntityId,
      });
    }

    const updatedUser = await User.findByPk(userId, {
      include: [
        {
          model: UserRole,
          include: [Role, IssueEntity],
        },
      ],
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "Usuario actualizado no encontrado." });
    }

    const formattedRoles = updatedUser.roles.map((userRole: UserRole) => ({
      role: {
        id: userRole.role.id,
        name: userRole.role.name,
      },
      issueEntity: {
        id: userRole.issueEntity.id,
        name: userRole.issueEntity.name,
      },
    }));

    const simplifiedResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      roles: formattedRoles,
    };

    return res.status(200).json(simplifiedResponse);
  } catch (error) {
    console.error("Error asignando roles al usuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const allUsers = async (req: any, res: Response) => {
  try {
    const { page, order, orderBy, all_data, search } = req.query;

    // Order
    let ordenation: Order | undefined;
    if (orderBy) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = undefined;
    }

    const { limit, offset } = pag_params;

    let where: any = { id: { [Op.ne]: req.user.id } };
    if (search) {
      where[Op.or] = [
        { email: { [Op.substring]: search } },
        { username: { [Op.substring]: search } },
        { fullName: { [Op.substring]: search } },
      ];
    }

    const items = await User.scope("default").findAll({
      limit: all_data ? undefined : limit,
      offset: page ? page - 1 : offset,
      where,
      order: ordenation,
      include: [
        {
          model: UserRole,
          include: [
            {
              model: Role,
              attributes: ["id", "name"],
            },
            {
              model: IssueEntity,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    const totalItems = items.length;

    const formattedItems = items.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((userRole) => ({
        role: {
          id: userRole.role.id,
          name: userRole.role.name,
        },
        issueEntity: {
          id: userRole.issueEntity.id,
          name: userRole.issueEntity.name,
        },
      })),
    }));

    return res.status(200).json({
      totalItems,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : Math.floor(totalItems / limit) || 1,
      items: formattedItems,
    });
  } catch (error) {
    Logger.error(error);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

export const editUser = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    let { rolesId, issueEntityId } = req.body;

    const user = await User.scope("default").findByPk(parseInt(id));
    if (!user) {
      t.rollback();
      return res
        .status(404)
        .json({ message: "El usuario solicitado no existe." });
    }

    if (!rolesId || rolesId.length === 0) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "Debe definir al menos un role para el usuario" });
    }

    const entityHolderRole = await Role.findOne({
      where: { code: "ENTITY_HOLDER" },
    });
    if (!entityHolderRole) {
      t.rollback();
      return res.status(404).json({ message: "Role ENTITY_HOLDER missing" });
    }

    if (
      rolesId.some((role: any) => role === entityHolderRole.id) &&
      !issueEntityId
    ) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "Field issueEntityId is missing" });
    }

    await user.save({ transaction: t });
    await user.reload({ transaction: t });
    await t.commit();

    return res.status(200).json(user);
  } catch (error) {
    Logger.error(error);
    t.rollback();
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

export const userById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.scope("default").findByPk(parseInt(id));

    if (!user?.dataValues) {
      return res
        .status(404)
        .json({ message: "El usuario solicitado no existe." });
    }

    // Simplify the user response
    const simplifiedResponse = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles:
        user.roles?.map((userRole: any) => ({
          roleId: userRole.roleId,
          issueEntityId: userRole.issueEntityId,
        })) || [],
    };

    return res.status(200).json(simplifiedResponse);
  } catch (error) {
    console.error("Error retrieving user by ID:", error);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

export const removeUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(404)
        .json({ message: "El usuario solicitado no existe." });

    // Check if the user has active cards
    const activeCards = await Card.count({
      where: {
        isActive: true,
      },
      include: [
        {
          model: Account,
          where: { ownerId: userId },
        },
      ],
    });

    if (activeCards > 0)
      return res.status(400).json({
        message:
          "El usuario tiene tarjetas activas. Por favor, desactive las tarjetas antes de eliminar el usuario.",
      });

    // Check if the user has balance in the account
    const accountBalance = await Account.sum("amount", {
      where: { ownerId: userId },
    });
    if (accountBalance && accountBalance > 0)
      return res.status(400).json({
        message:
          "El usuario tiene saldo en la cuenta. Por favor, retire el saldo antes de eliminar el usuario.",
      });

    // Delete the user
    await User.destroy({ where: { id: userId } });

    return res
      .status(200)
      .json({ message: "El usuario ha sido eliminado satisfactoriamente." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

export const getExternalUsers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const user = await axios.get(
      `${process.env.AUTH_API_HOST}/servertoserver/users?search=${search}`,
      { headers }
    );

    const toReturn = {
      ...user.data,
      items: user.data.items.map((elem: any) => ({
        id: elem.id,
        username: elem?.username,
        fullName: `${elem?.firstName ?? ""} ${elem?.lastName ?? ""}`,
        email: elem.email,
      })),
    };

    return res.json(toReturn);
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({ message: "No se pudo cargar los usuarios" });
  }
};

export const getExternalUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Make a request to the external server to fetch the user by ID
    const response = await axios.get(
      `${process.env.AUTH_API_HOST}/servertoserver/user/${userId}`,
      { headers }
    );

    // Extract relevant user data from the response
    const userData = response.data;

    // Prepare the response with required user information
    const toReturn = {
      id: userData.id,
      username: userData.username,
      fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`,
      email: userData.email,
    };

    // Send the response back to the client
    return res.json(toReturn);
  } catch (error) {
    Logger.error(error);
    return res.status(400).json({ message: "No se pudo cargar el usuario" });
  }
};

export const getMyUser = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const roles = await UserRole.findAll({
      where: { userId: req.user.id },
      attributes: [],
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          as: "role",
        },
        {
          model: IssueEntity,
          attributes: ["id", "name"],
          as: "issueEntity",
        },
      ],
    });

    const toReturn = { ...user.dataValues, roles };

    return res.json(toReturn);
  } catch (error) {
    Logger.error(error);
    console.error("Error al encontrar el usuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const putFCMToken = async (req: any, res: Response) => {
  const { userId } = req.params;
  const { token } = req.body;

  try {
    // Update the user record with the new token
    const updatedUser = await User.update(
      { fcmtoken: token },
      {
        where: { id: userId },
      }
    );

    if (updatedUser[0] === 1) {
      res.status(200).json("FCM token stored successfully");
    } else {
      res.status(404).json("User not found");
    }
  } catch (error) {
    console.error("Error storing FCM token:", error);
    res.status(500).send("Internal server error");
  }
};

export const editMyUser = async (req: any, res: Response) => {
  try {
    const {pinPassword, newPinPassword} = req.body
    const user = await User.findByPk(req.user.id);

    if(!user || user.pinPassword !== pinPassword){
      return res.status(404).json({message:"PIN incorrecto"})
    }

    user.pinPassword = newPinPassword;

    await user.save();
    const toReturn = await User.scope('default').findByPk(user.id);
    
    return res.json(toReturn)

    
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }

}
