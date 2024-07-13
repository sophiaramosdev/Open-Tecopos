import { Request, Response } from "express";
import IssueEntity from "../database/models/issueEntity";
import { pag_params } from "../database/pag_params";
import db from "../database/conecction";
import Business from "../database/models/business";
import axios from "axios";
import Logger from "../utils/logger";
import Image from "../database/models/image";
import Category from "../database/models/category";
import { remoteHeader as headers } from "../utils/fixedData";
import { numbersQueue } from "../bull-queue/numbers";
import User from "../database/models/user";
import Account from "../database/models/account";
import { Op } from "sequelize";
import EntityRecord from "../database/models/EntityRecords";
import EntityType from "../database/models/entityType";
import EntitiesRecord from "../database/models/EntityRecords";
import UserRole from "../database/models/userRole";

//Get all for admin
export const all = async (req: any, res: Response) => {
  try {
    const { per_page, page, all_data, ownerId, categoryId, search, typeId, allowPromotion } =
      req.query;

    const where: any = {};
    if (!!req.issueEntities) where.id = { [Op.or]: req.issueEntities };

      // Search by owner
    if (ownerId) {
      where["$owner.id$"] = ownerId;
    }

    // Find by type
    if (typeId) {
      where["entityTypeId"] = typeId;
    }

    //search
    if (search) {
      where.name = {
        [Op.iLike]: `%${search}%`,
      };
    }

    //filter by allowPromotions
    if(allowPromotion){
      where['allowPromotion'] = true
    }

    // With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const { count, rows } = await IssueEntity.findAndCountAll({
      attributes: ["id", "name", "status", "address", "phone", "allowPromotion"],
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "fullName"],
        },
        { model: Business, as: "business", attributes: ["id", "name"] },
        { model: EntityType, attributes: ["id", "name"] },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name"],
          where: !!categoryId ? { id: categoryId } : undefined,
        },
      ],
      where,
      distinct: true,
      offset,
      limit,
    });

    let totalPages;
    if (count === 0) {
      totalPages = 0;
    } else {
      totalPages = Math.ceil(count / limit);
    }

    return res.status(200).json({
      totalItems: count,
      currentPage: page ? parseInt(page) : count === 0 ? 0 : 1,
      totalPages: all_data ? 1 : totalPages,
      items: rows,
    });
  } catch (e) {
    console.log(e);
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Get all for clients
export const allAvailables = async (req: any, res: Response) => {
  try {
    const { page, all_data, search, entityTypeId, allowPromotion } = req.query;

    // With pagination
    const offset = all_data ? undefined : ((page ?? 1) - 1) * 35;

    let where_clause: any = {};
    if (search) where_clause.name = { [Op.iLike]: `%${search}%` };
    if (entityTypeId) where_clause.entityTypeId = entityTypeId;
    if (allowPromotion) where_clause.allowPromotion = true;

    const { count: totalItems, rows } = await IssueEntity.findAndCountAll({
      where: { allowCreateAccount: true, ...where_clause },
      distinct: true,
      attributes: ["id", "name", "description"],
      include: [
        { model: Account, attributes: ["id", "ownerId"] },
        { model: EntityType, attributes: ["id", "name"] },
        { model: Image, as: "avatar", attributes: ["id", "url", "hash"] },
        { model: Image, as: "banner", attributes: ["id", "url", "hash"] },
        { model: Image, as: "promotionalImage", attributes: ["id", "url", "hash"] },
      ],
      limit: 35,
      offset,
    });

    const items = rows.map((elem) => ({
      id: elem.id,
      name: elem.name,
      description: elem.description,
      members: elem.accounts.length,
      type: elem.entityType,
      avatar:elem.avatar,
      banner: elem.banner,
      promotionalImage:elem.promotionalImage
    }));

    return res.status(200).json({
      totalItems,
      totalPages: Math.ceil(totalItems / 35),
      page: page ?? 1,
      items,
    });
  } catch (e) {
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Available by Id
export const availableById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const entity = await IssueEntity.findByPk(parseInt(id), {
      attributes: ["name", "description", "allowPromotion"],
      include: [
        { model: Account, attributes: ["id", "ownerId"] },
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "discount"],
          include: [
            {
              model: Image,
              as: "cardImage",
              attributes: ["id", "url", "hash"],
            },
          ],
        },
        { model: Image, as: "avatar", attributes: ["id", "url", "hash"] },
        { model: Image, as: "banner", attributes: ["id", "url", "hash"] },
        { model: Image, as: "promotionalImage", attributes: ["id", "url", "hash"] },
      ],
    });

    if (!entity)
      return res
        .status(404)
        .json({ message: "La entidad solicitada no existe." });

    const toReturn = {
      name: entity.name,
      allowPromotion:entity.allowPromotion,
      description: entity.description,
      members: entity.accounts.length,
      isMember: entity.accounts.some(
        (account) => account.ownerId === req?.user.id
      ),
      categories: entity.categories,
      banner: entity.banner,
      avatar: entity.avatar,
      promotionalImage:entity.promotionalImage
    };

    return res.status(200).json(toReturn);
  } catch (e) {
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

// Create
export const register = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const {
      name,
      businessId,
      address,
      ownerId,
      entityTypeId,
      categories,
      ...params
    } = req.body;

    //Validate fields
    if (!name) {
      t.rollback();
      return res.status(404).json({
        message: "Debe indicar un nombre para la entidad",
      });
    }

    if (!entityTypeId) {
      t.rollback();
      return res.status(404).json({
        message: "Debe indicar el tipo de entidad",
      });
    }

    if (!ownerId) {
      t.rollback();
      return res.status(404).json({
        message: "Debe definir una propietario para la entidad",
      });
    }

    if (!businessId) {
      t.rollback();
      return res.status(404).json({
        message: "Debe asociar la entidad a un negocio",
      });
    }

    if (!categories || (categories && categories.length === 0)) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "Debe definir al menos una categoría" });
    }

    //Comprobe if exist one category as basic
    const someBasic = (categories as Array<Category>).some(
      (cat) => !!cat.isBasic
    );

    if (!someBasic) {
      t.rollback();
      return res.status(400).json({
        message: "Debe existir una categoria definida como básica",
      });
    }

    const business = await Business.findOne({
      where: { externalId: businessId },
    });

    if (!!business) {
      t.rollback();
      return res.status(400).json({
        message: "Ya existe una entidad asociada al negocio indicado",
      });
    }

    const remoteBusiness = await axios
      .get(
        `${process.env.TECOPOS_API_HOST}/servertoserver/business/${businessId}`,
        { headers }
      )
      .catch((error) => {
        throw new Error(
          error?.response?.data?.message ?? "Problema al cargar los negocios"
        );
      });

    const {
      id,
      name: businessName,
      address: businessAddress,
    } = remoteBusiness.data;

    const newBusiness = await Business.create(
      {
        name: businessName,
        address: businessAddress
          ? Object.values(businessAddress)
              .filter((value) => !!value)
              .map((elem: any) => (typeof elem === "string" ? elem : elem.name))
              .join(" ")
          : businessAddress,
        externalId: id,
      },
      { transaction: t }
    );

    const existingUser = await User.findOne({ where: { externalId: ownerId } });

    let user: User | undefined;

    if (existingUser) {
      user = existingUser;
    } else {
      const remoteUrl = `${process.env.AUTH_API_HOST}`;
      const checkUser = await axios
        .get(`${remoteUrl}/servertoserver/user/${ownerId}`, {
          headers,
        })
        .catch((error) => {
          throw new Error(
            error?.response?.data?.message ?? "Problema al cargar los usuarios"
          );
        });
      if (checkUser.status === 200) {
        // User exists on the external server, create locally
        const userData = checkUser.data;
        user = await User.create(
          {
            externalId: userData.id,
            username: userData.username,
            fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`,
            email: userData.email,
            phone: userData.phone ?? undefined,
          },
          { transaction: t }
        );
      } else if (checkUser.status === 404) {
        // User not found on the external server
        t.rollback();
        return res.status(404).json({
          message: "Usuario no encontrado en el ecosistema Tecopos",
        });
      } else {
        // Error occurred while checking user on the external server
        t.rollback();
        return res.status(500).json({
          message: "Error al sincronizar usuario en el servidor Tecopos",
        });
      }
    }

    const entityRecords = [
      {
        description: "Entidad registrada",
        madeById: req.user.id,
      },
    ];

    const newEntity = await IssueEntity.create(
      {
        name,
        ownerId: user.id,
        address: address ? address : newBusiness.address,
        categories,
        entityRecords,
        entityTypeId,
        businessId: newBusiness.id,
        ...params,
      },
      { transaction: t, include: [Category, EntitiesRecord] }
    );

    await UserRole.create(
      {
        userId: user.id,
        roleId: 1,
        issueEntityId: newEntity.id,
      },
      { transaction: t }
    );

    numbersQueue.add(
      { businessId: newBusiness.id, entityId: newEntity.id },
      { attempts: 2, removeOnComplete: true, removeOnFail: true }
    );

    const toReturn = await IssueEntity.scope("default").findByPk(
      newEntity!.id,
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json(toReturn);
  } catch (e: any) {
    Logger.error(e);
    t.rollback();
    return res.status(500).json({
      message: e.toString() ?? "Internal Server error",
    });
  }
};

//Edit
export const update = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { ownerId } = req.body;

    const entity = await IssueEntity.findByPk(id, {
      attributes: ["id", "ownerId"],
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["externalId"],
        },
      ],
    });

    if (!entity)
      return res
        .status(404)
        .json({ message: `La entidad con id ${id} no existe` });

    let body: any = {};

    Object.entries(req.body).forEach((elem) => {
      const [key, value] = elem;
      body[key] = value;
    });

    if (!!ownerId && ownerId !== entity.ownerId) {
      const owner = await User.findOne({
        where: { externalId: ownerId },
        transaction: t,
      });
      if (!owner) {
        const remoteUrl = `${process.env.AUTH_API_HOST}`;
        const remoteUser = await axios
          .get(`${remoteUrl}/servertoserver/user/${ownerId}`, {
            headers,
          })
          .catch((error) => {
            throw new Error(
              error?.response?.data?.message ??
                "Problema al cargar los usuarios"
            );
          });
        const userData = remoteUser.data;
        const newUser = await User.create(
          {
            externalId: userData.id,
            username: userData.username,
            fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`,
            email: userData.email,
            phone: userData.phone ?? undefined,
          },
          { transaction: t }
        );
        body.ownerId = newUser.id;
      } else {
        body.ownerId = owner.id;
      }

      await UserRole.destroy({
        where: { userId: entity.ownerId, issueEntityId: id },
        transaction: t,
      });
      const userHasRole = await UserRole.findOne({
        where: { userId: body.ownerId, issueEntityId: id },
        transaction: t,
      });

      if (!!userHasRole) {
        await UserRole.update({ roleId: 1 }, { where: { id: userHasRole.id } });
      } else {
        await UserRole.create(
          {
            userId: body.ownerId,
            issueEntityId: id,
            roleId: 1,
          },
          { transaction: t }
        );
      }
    }

    const fieldsToChange = req.user.isSuperAdmin
      ? [
          "name",
          "address",
          "phone",
          "color",
          "status",
          "allowCreateAccount",
          "profileImageId",
          "bannerId",
          "avatarId",
          "promotionalImageId",
          "observations",
          "allowPromotion",
          "price",
          "discount",
          "ownerId",
        ]
      : [
          "name",
          "address",
          "phone",
          "color",
          "allowCreateAccount",
          "avatarId",
          "bannerId",
          "promotionalImageId",
          "description",
          "price",
          "discount",
        ];

    await IssueEntity.update(body, {
      where: { id: entity.id },
      fields: fieldsToChange,
      transaction: t,
    });

    await EntityRecord.create(
      {
        code: "UPDATED",
        description: "Entidad actualizada",
        madeById: req.user.id,
        entityId: entity.id,
      },
      { transaction: t }
    );

    const toReturn = await IssueEntity.scope("default").findByPk(id, {
      transaction: t,
    });

    await t.commit();

    return res.status(200).json(toReturn);
  } catch (e) {
    await t.rollback();
    Logger.error(e);
    console.log(e);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

export const remove = async (req: any, res: Response) => {
  const { id } = req.params;
  const t = await db.transaction();

  try {
    const entity = await IssueEntity.findByPk(id, { transaction: t });
    if (!entity) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: `No existe la entidad con id ${id}` });
    }

    const nonZeroAccounts = await Account.findOne({
      where: {
        issueEntityId: id,
        amount: { [Op.ne]: 0 },
      },
      transaction: t,
    });

    if (nonZeroAccounts) {
      await t.rollback();
      return res.status(400).json({
        message:
          "No se puede eliminar una entidad cuando hay cuentas con fondos disponibles",
      });
    }

    await EntityRecord.create(
      {
        action: "DELETED",
        description: `Issue entity ${entity.name} deleted.`,
        madeById: req.user.id,
        entityId: entity.id,
      },
      { transaction: t }
    );

    await IssueEntity.destroy({ where: { id }, transaction: t });
    await Business.destroy({
      where: { id: entity.businessId },
      transaction: t,
    });

    await t.commit();

    return res.status(200).json({ message: "Entity deleted successfully" });
  } catch (error) {
    Logger.error(error);
    await t.rollback();
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//-GET-BY-ID
export const findById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entity = await IssueEntity.scope("default").findByPk(parseInt(id));

    if (!entity)
      return res
        .status(404)
        .json({ message: "La entidad solicitada no existe." });

    return res.status(200).json(entity);
  } catch (e) {
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

/**************/
/*Entity types*/
/**************/

export const createEntityType = async (req: Request, res: Response) => {
  try {
    const { name, color, iconId } = req.body;

    // Create the entity type
    const entityType = await EntityType.create({ name, color, iconId });

    return res.status(201).json(entityType);
  } catch (error) {
    console.error("Error creating entity type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEntityTypes = async (req: any, res: Response) => {
  try {
    const entityTypes = await EntityType.scope("default").findAll();

    return res.json(entityTypes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEntityType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, iconId } = req.body;

    const entityType = await EntityType.findByPk(id);

    if (!entityType) {
      return res.status(404).json({ message: "Entity type not found" });
    }

    entityType.name = name;
    entityType.color = color;
    entityType.iconId = iconId;
    await entityType.save();

    return res.status(200).json(entityType);
  } catch (error) {
    console.error("Error updating entity type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteEntityType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entityType = await EntityType.findByPk(id);

    if (!entityType) {
      return res.status(404).json({ message: "Entity type not found" });
    }

    await entityType.destroy();

    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting entity type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
