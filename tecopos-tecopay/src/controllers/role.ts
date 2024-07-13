import { Request, Response } from "express";
import Role from "../database/models/roles";
import { pag_params } from "../database/pag_params";
import Permission from "../database/models/permissions";
import RolePermission from "../database/models/rolePermission";
import Logger from "../utils/logger";
import { Op } from "sequelize";
import IssueEntity from "../database/models/issueEntity";
import UserRole from "../database/models/userRole";

export const all = async (req: any, res: Response) => {
  try {
    const { per_page, page, order, orderBy, all_data } = req.query;

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const roles = await Role.findAndCountAll({
      attributes: ["id", "name", "code", "description"],
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
      distinct: true,
      limit: all_data ? undefined : limit,
      offset,
    });

    let totalPages = Math.ceil(roles.count / limit);
    if (roles.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    return res.status(200).json({
      totalItems: roles.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: roles.rows,
    });
  } catch (error) {
    Logger.error(error);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, code, description, permissions, ...params } = req.body;

    if (!name) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    if (!code) {
      return res.status(400).json({ message: "El código es requerido" });
    }

    if (!description) {
      return res.status(400).json({ message: "La descripcion es requerida" });
    }

    if (
      !permissions ||
      !Array.isArray(permissions) ||
      permissions.length === 0
    ) {
      return res.status(400).json({
        message: "Debe elegir al menos un permiso",
      });
    }

    // Create the role
    const role = await Role.create({
      name: name,
      code: code,
      description: description,
    });

    const permissionsFound = await Permission.findAll({
      where: { id: permissions },
    });
    if (!permissionsFound || permissionsFound.length === 0) {
      return res.status(404).json({ message: "Permissions not found" });
    }

    // Delete existing permissions associated with the role
    await RolePermission.destroy({ where: { roleId: role.id } });

    // Create entries in the junction table RolePermission
    const rolePermissionEntries = permissionsFound.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    }));

    await RolePermission.bulkCreate(rolePermissionEntries);

    // Fetch the role with its associated permissions
    const roleWithPermissions = await Role.findByPk(role.id, {
      include: Permission,
    });

    if (!roleWithPermissions) {
      return res.status(404).json({ message: "Role not found" });
    }

    const simplifiedResponse = {
      id: roleWithPermissions.id,
      name: roleWithPermissions.name,
      code: roleWithPermissions.code,
      description: roleWithPermissions.description,
      permissions: roleWithPermissions.permissions.map((permission) => ({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      })),
    };

    return res.status(201).json(simplifiedResponse);
  } catch (error) {
    console.error("Error registering role:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export const findById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(parseInt(id));

    if (!role?.dataValues)
      return res.status(404).json({ message: "EL rol solicitado no existe." });

    return res.status(200).json(role.dataValues);
  } catch (error) {
    Logger.error(error);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error interno en el servidor." });
  }
};

//UPDATE
export const update = async (req: any, res: Response) => {
  try {
    const { roleId } = req.params;
    const { name, code, description, permissions, ...params } = req.body;

    const userRole = await UserRole.findOne({ where: { userId: req.user.id } });

    if (userRole) {
      const entityRole = await IssueEntity.findOne({
        where: { id: userRole.issueEntityId },
      });
      if (!entityRole) {
        return res
          .status(403)
          .send("Usted no tiene permiso para editar este Rol");
      }
    }

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required." });
    }

    const role = await Role.findOne({ where: { id: roleId } });

    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    if (name) role.name = name;
    if (code) role.code = code;
    if (description) role.description = description;

    await role.save();

    if (permissions) {
      await RolePermission.destroy({ where: { roleId } });

      const permissionsFound = await Permission.findAll({
        where: { id: permissions },
      });

      if (!permissionsFound || permissionsFound.length === 0) {
        return res.status(404).json({ message: "Permissions not found." });
      }

      const rolePermissionEntries = permissionsFound.map((permission) => ({
        roleId,
        permissionId: permission.id,
      }));

      await RolePermission.bulkCreate(rolePermissionEntries);
    }

    const updatedRole = await Role.findByPk(roleId, { include: Permission });

    if (!updatedRole) {
      return res.status(404).json({ message: "Updated role not found." });
    }

    const simplifiedResponse = {
      id: updatedRole.id,
      name: updatedRole.name,
      code: updatedRole.code,
      description: updatedRole.description,
      permissions: updatedRole.permissions.map((permission) => ({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      })),
    };

    return res.status(200).json(simplifiedResponse);
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

//REMOVE
export const remove = async (req: any, res: Response) => {
  try {
    const { roleId } = req.params;

    const userRole = await UserRole.findOne({ where: { userId: req.user.id } });

    if (userRole) {
      const entityRole = await IssueEntity.findOne({
        where: { id: userRole.issueEntityId },
      });
      if (!entityRole) {
        return res
          .status(403)
          .send("Usted no tiene permiso para eliminar este Rol");
      }
    }

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required." });
    }

    const role = await Role.findOne({ where: { id: roleId } });

    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    await RolePermission.destroy({ where: { roleId } });

    await UserRole.destroy({ where: { roleId } });

    await role.destroy();

    return res.status(200).json({
      message: "Role deleted successfully.",
      roleId: role.id,
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

///PERMISSIONS
//Assign permissions
export const assignPermissionsToRole = async (req: any, res: Response) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!roleId || !permissionIds) {
      return res.status(400).json({
        message: "Role ID and permission IDs are required in the query",
      });
    }

    // Find the role
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Find the permissions
    const permissions = await Permission.findAll({
      where: { id: permissionIds },
    });
    if (!permissions || permissions.length === 0) {
      return res.status(404).json({ message: "Permissions not found" });
    }

    // Delete existing permissions associated with the role
    await RolePermission.destroy({ where: { roleId: role.id } });

    // Create entries in the junction table RolePermission
    const rolePermissionEntries = permissions.map((permission: any) => ({
      roleId: role.id,
      permissionId: permission.id,
    }));

    await RolePermission.bulkCreate(rolePermissionEntries);

    console.log("Permissions assigned successfully");
    return res
      .status(200)
      .json({ message: "Permissions assigned successfully" });
  } catch (error) {
    Logger.error(error);
    console.error("Error assigning permissions to role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Permissions with Pagination
export const getAllPermissions = async (req: any, res: Response) => {
  try {
    const { code } = req.query;

    const where: any = {};
    if (!!code) {
      where.code = { [Op.iLike]: `%${code}%` };
    }

    // Find permissions with pagination and optional ordering
    const permissions = await Permission.findAll({
      attributes: ["id", "name", "code", "description"],
      where,
    });

    return res.status(200).json(permissions);
  } catch (error) {
    Logger.error(error);
    console.error("Error fetching permissions:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Get Permissions by role
export const getUserPermissionsByRole = async (req: any, res: Response) => {
  try {
    const { roleId } = req.params;

    // Find the role by ID
    const role = await Role.findByPk(roleId, { include: Permission });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Extract permissions from the role
    const permissions = role.permissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
    }));

    return res.status(200).json({ permissions });
  } catch (error) {
    Logger.error(error);
    console.error("Error fetching user permissions by role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
