import { Response } from "express";
import Card from "../database/models/card";
import Account from "../database/models/account";
import { pag_params } from "../database/pag_params";
import db from "../database/conecction";
import CardNumber from "../database/models/cardNumber";
import AccountNumber from "../database/models/accountNumber";
import IssueEntity from "../database/models/issueEntity";
import User from "../database/models/user";
import moment from "moment";
import { Op } from "sequelize";
import Logger from "../utils/logger";
import CardRequest from "../database/models/cardRequest";
import Category from "../database/models/category";
import Image from "../database/models/image";
import RequestRecord from "../database/models/RequestRecords";
import Business from "../database/models/business";

///-CLIENT-SIDE REQUEST-///
export const ownRequest = async (req: any, res: Response) => {
  try {
    let { holderName, categoryId, observations } = req.body;
    const user = req.user;

    if (!categoryId) {
      return res
        .status(400)
        .json({ message: "Indique el tipo de tarjeta deseado" });
    }

    const category = await Category.findByPk(categoryId, {
      include: [
        {
          model: IssueEntity,
          include: [{ model: Account, where: { ownerId: user.id } }],
          required: true,
        },
      ],
    });

    if (!category) {
      return res.status(400).json({
        message:
          "Verifique que el tipo de tarjeta que solicita existe y que ud es miembro de la entidad asociada",
      });
    }

    if (!category.isActive || !category.isPublic) {
      return res.status(400).json({
        message: "La categoría seleccionada no se encuentra disponible",
      });
    }

    const newRequest = await CardRequest.create(
      {
        holderName,
        observations,
        requestedToId: req.user.id,
        categoryId: category.id,
        records: [
          {
            status: "REGISTERED",
            description: "Solicitud registrada desde la aplicación",
            madeById: req.user.id,
          },
        ],
      },
      { include: [RequestRecord] }
    );

    const toReturn = await CardRequest.findByPk(newRequest.id, {
      attributes: [
        "id",
        "queryNumber",
        "status",
        "holderName",
        "observations",
        "createdAt",
      ],
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
          include: [
            {
              model: IssueEntity,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    return res.json(toReturn);
  } catch (e) {
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error en el servidor",
    });
  }
};

///-GET-MY-REQUEST-///
export const getUserRequests = async (req: any, res: Response) => {
  try {
    let { page, status, all_data, issueEntityId } = req.query;
    if (page) page = parseInt(page);

    let where: any = { requestedToId: req.user.id };
    if (!!status) where.status = status;

    let where_entity: any = undefined;
    if (!!issueEntityId) where_entity = { id: issueEntityId };

    const { limit, offset } = pag_params;

    const { count: totalItems, rows: items } =
      await CardRequest.findAndCountAll({
        distinct: true,
        attributes: [
          "id",
          "holderName",
          "queryNumber",
          "status",
          "observations",
          "createdAt",
        ],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "isBasic"],
            include: [
              {
                model: IssueEntity,
                attributes: ["id", "name"],
                where: where_entity,
              },
            ],
            required: !!where_entity,
          },
          {
            model: RequestRecord,
            attributes: ["status", "description", "createdAt"],
            include: [
              {
                model: User,
                attributes: ["id", "fullName"],
              },
            ],
          },
          {
            model: Card,
            as: "cards",
            attributes: ["id", "address"],
          },
        ],
        where,
        limit: all_data ? undefined : limit,
        offset: page ? (page - 1) * limit : offset,
        order: [["createdAt", "DESC"]],
      });

    const paginate = {
      totalItems,
      totalPages: Math.floor(totalItems / limit) || 1,
      currentPage: page ? page : 1,
    };

    res.json({ ...paginate, items });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno en el servidor" });
  }
};

///-GET-ALL-REQUEST-///
export const getAllRequest = async (req: any, res: Response) => {
  try {
    let {
      status,
      issueEntityId,
      barCode,
      page,
      all_data,
      accountId,
      categoryId,
      fromDate,
      toDate,
      search,
      type,
    } = req.query;

    if (page) page = parseInt(page);

    let where: any = {};
    if (!!status && !search) where.status = status;
    if (!!type) where.quantity = type === "BULK" ? { [Op.ne]: 1 } : 1;
    if (!!issueEntityId) where.issueEntityId = issueEntityId;
    if (!!barCode) where.barCode = barCode;
    if (!!categoryId) where.categoryId = categoryId;
    if (!!search && !!status && !["PRINTED", "ACCEPTED"].includes(status)) {
      where.holderName = { [Op.iLike]: `%${search}%` };
      where.status = status;
    }

    if (req.issueEntities.length !== 0) {
      const categories = (
        await Category.findAll({
          attributes: ["id"],
          where: { issueEntityId: { [Op.or]: req.issueEntities } },
        })
      ).map((category) => category.id);

      where.categoryId = { [Op.or]: categories };
    }

    // Date filtering
    if (fromDate && toDate) {
      const startDate = moment(fromDate, "YYYY-MM-DD").startOf("day").toDate();
      const endDate = moment(toDate, "YYYY-MM-DD").endOf("day").toDate();
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    let whereAccount: any = {};
    if (!!accountId) whereAccount.id = accountId;

    let whereCards: any = {};
    if (!!search) {
      whereCards.address = { [Op.iLike]: `${search}%` };
    }
    if (!!status && ["PRINTED", "ACCEPTED"].includes(status)) {
      where.status = status;
    }

    const { limit, offset } = pag_params;

    const { count: totalItems, rows: items } =
      await CardRequest.findAndCountAll({
        attributes: [
          "id",
          "queryNumber",
          "holderName",
          "quantity",
          "priority",
          "status",
          "observations",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: Card,
            as: "cards",
            attributes: ["id", "address", "holderName"],
            where:
              Object.keys(whereCards).length !== 0 ? whereCards : undefined,
          },
          {
            model: User,
            as: "requestedTo",
            attributes: ["fullName"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "isBasic", "price", "discount"],
            include: [
              {
                model: IssueEntity,
                attributes: ["id", "name"],
                as: "issueEntity",
                include: [
                  {
                    model: Business,
                    as: "business",
                    attributes: ["id", "name"],
                  },
                ],
              },
            ],
          },
        ],
        distinct: true,
        where: Object.keys(where).length !== 0 ? where : undefined,
        limit: all_data ? undefined : limit,
        offset: page ? (page - 1) * limit : offset,
        order: [["createdAt", "DESC"]],
      });

    const paginate = {
      totalItems,
      totalPages: Math.floor(totalItems / limit) || 1,
      currentPage: page ? page : 1,
    };

    res.json({ ...paginate, items });
  } catch (error) {
    console.log(error);
    Logger.error(error);
    return res.status(500).json({ message: "Error interno en el servidor" });
  }
};

///-UPDATE MY REQUEST-///
export const updateMyRequest = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    let { holderName, observations, status } = req.body;

    const request = await CardRequest.findByPk(id, {
      attributes: [
        "id",
        "queryNumber",
        "holderName",
        "quantity",
        "priority",
        "status",
        "observations",
      ],
      include: [
        {
          model: Card,
          as: "cards",
          attributes: ["id", "address"],
        },
      ],
    });

    if (!request) {
      t.rollback();
      return res
        .status(400)
        .json({ message: `La solicitud con id ${id} no existe` });
    }

    if (
      !!status &&
      (status !== "CANCELLED" || request.status !== "REQUESTED")
    ) {
      await t.rollback();
      return res.status(400).json({
        message:
          "Solo tiene permisos para cancelar la solicitud en estado REQUESTED",
      });
    }

    if (request.requestedToId !== req.user.id) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "No tiene permisos para modificar esta solicitud" });
    }

    request.holderName = holderName;
    request.observations = observations;
    if (!!status) request.status = status;

    await RequestRecord.create(
      {
        requestId: request.id,
        status: status ? "CLOSED" : "MODIFIED",
        description: `Solicitud ${
          status ? "cancelada" : "modificada"
        } desde la aplicación`,
        madeById: req.user.id,
      },
      { transaction: t }
    );

    await request.save({ transaction: t });

    await t.commit();

    return res.status(200).json(request);
  } catch (e) {
    t.rollback();
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error en el servidor",
    });
  }
};

///-NEW REQUEST-///
export const newRequest = async (req: any, res: Response) => {
  try {
    let { holderName, observations, priority, ownerId, categoryId, quantity } =
      req.body;

    if (!categoryId) {
      return res.status(400).json({
        message: "Debe proporcionar una categoría para la solicitud.",
      });
    }

    const category = await Category.findByPk(categoryId, {
      include: [{ model: IssueEntity, attributes: ["name"] }],
    });

    if (!category || (category && !category.isActive)) {
      return res.status(400).json({
        message: "El tipo de tarjeta seleccionado no está disponible",
      });
    }

    let newRequest: CardRequest | undefined;
    if (quantity && quantity > 1) {
      newRequest = await CardRequest.create(
        {
          holderName: holderName ?? category.issueEntity.name,
          quantity,
          observations,
          priority,
          categoryId: category.id,
          records: [
            {
              status: "REGISTERED",
              description: `Solicitud por bulto registrada por la entidad`,
              madeById: req.user.id,
            },
          ],
        },
        { include: [RequestRecord] }
      );
    } else {
      if (!ownerId) {
        return res.status(400).json({
          message: "Debe indicar definir un propietario para la solicitud",
        });
      }

      const ownerAccount = await Account.findOne({
        where: { issueEntityId: category.issueEntityId, ownerId },
      });

      if (!ownerAccount) {
        return res.status(400).json({
          message:
            "El usuario indicado no es miembro de la entidad seleccionada",
        });
      }

      newRequest = await CardRequest.create(
        {
          holderName: holderName ?? category.issueEntity.name,
          observations,
          priority,
          requestedToId: ownerAccount.ownerId,
          categoryId: category.id,
          records: [
            {
              status: "REGISTERED",
              description: "Solicitud simple registrada por la entidad",
              madeById: req.user.id,
            },
          ],
        },
        { include: [RequestRecord] }
      );
    }

    const toReturn = await CardRequest.findByPk(newRequest!.id, {
      attributes: [
        "id",
        "queryNumber",
        "holderName",
        "quantity",
        "priority",
        "status",
        "observations",
      ],
      include: [
        {
          model: User,
          as: "requestedTo",
          attributes: ["id", "fullName"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    return res.status(201).json(toReturn);
  } catch (e) {
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error en el servidor",
    });
  }
};

///-UPDATE REQUEST-///
export const updateRequest = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    let { holderName, observations, priority } = req.body;

    const request = await CardRequest.findByPk(id, {
      attributes: [
        "id",
        "queryNumber",
        "holderName",
        "quantity",
        "priority",
        "status",
        "observations",
      ],
      include: [
        {
          model: Card,
          as: "cards",
          attributes: ["id", "address"],
        },
        { model: Category, attributes: ["id", "name"] },
      ],
    });

    if (!request) {
      t.rollback();
      return res
        .status(400)
        .json({ message: `La solicitud con id ${id} no existe` });
    }

    if (!!holderName) request.holderName = holderName;
    if (!!observations) request.observations = observations;
    if (!!priority) request.priority = priority;

    await RequestRecord.create(
      {
        requestId: request.id,
        status: "MODIFIED",
        description: `Solicitud modificada desde la entidad emisora`,
        madeById: req.user.id,
      },
      { transaction: t }
    );

    await request.save({ transaction: t });
    await request.reload({ transaction: t });

    await t.commit();

    return res.status(200).json(request);
  } catch (e) {
    t.rollback();
    console.log(e);
    Logger.error(e);
    return res.status(500).json({
      message: "Ha ocurrido un error en el servidor",
    });
  }
};

///-DELETE REQUEST-//
export const deleteRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const request = await CardRequest.findByPk(parseInt(id));

    if (!request)
      return res
        .status(400)
        .json({ message: `La solicitud con id ${id} no existe` });

    if (!["DENIED", "CANCELLED"].includes(request.status)) {
      return res.status(400).json({
        message:
          "Sólo se pueden eliminar solicitudes que han sido denegadas o canceladas",
      });
    }

    await request.destroy();

    return res.status(204).send();
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//--MANAGE-STATUS--//
export const manageRequestStatus = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { status, observations } = req.body;

    const request = await CardRequest.findByPk(parseInt(id), {
      attributes: ["id", "status", "holderName", "categoryId", "quantity"],
      include: [
        {
          model: Category,
          include: [
            {
              model: IssueEntity,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Card,
          as: "cards",
          attributes: ["id", "address"],
        },
      ],
      transaction: t,
    });

    if (!request) {
      t.rollback();
      return res
        .status(404)
        .json({ message: `La solicitud con id ${id} no existe` });
    }

    switch (status) {
      case "ACCEPTED":
        if (request.status !== "REQUESTED") {
          t.rollback();
          return res
            .status(400)
            .json({ message: "Esta solicitud ya fue procesada" });
        }

        let account: Account | null = null;
        if (!!request.requestedToId) {
          account = await Account.findOne({
            where: { ownerId: request.requestedToId },
          });
        }

        const cardNumbers = await CardNumber.findAll({
          where: {
            isUsed: false,
            issueEntityId: request.category.issueEntityId,
          },
          transaction: t,
          limit: request.quantity,
          order: [["id", "ASC"]],
        });

        if (cardNumbers.length === 0) {
          t.rollback();
          return res.status(404).json({
            message:
              "Sin disponibilidad de numeros de tarjeta, consulte al administrador",
          });
        }

        await CardNumber.update(
          { isUsed: true },
          {
            where: {
              id: { [Op.or]: cardNumbers.map((numbers) => numbers.id) },
            },
            transaction: t,
          }
        );

        const newCards = cardNumbers.map((cardNumber) => ({
          address: cardNumber.code,
          holderName: request.category.issueEntity.name,
          barCode: `TP_${cardNumber.code}`,
          accountId: account?.id,
          createdById: req.user.id,
          categoryId: request.categoryId,
          requestId: request.id,
        }));

        await Card.bulkCreate(newCards, { transaction: t });

        request.status = "ACCEPTED";

        await RequestRecord.create(
          {
            requestId: request.id,
            status: "MODIFIED",
            madeById: req.user.id,
            description: "Solicitud aceptada por la entidad emisora",
          },
          { transaction: t }
        );

        break;

      case "PRINTED":
        if (request.status !== "ACCEPTED") {
          t.rollback();
          return res.status(400).json({
            message: "Solo puede imprimir tarjetas de solicitudes ACEPTADAS",
          });
        }
        request.status = "PRINTED";
        const cardIds = request.cards.map((item) => item.id);
        await Card.update(
          { emitedAt: new Date() },
          { where: { id: { [Op.or]: cardIds } }, transaction: t }
        );

        await RequestRecord.create(
          {
            requestId: request.id,
            status: "CLOSED",
            madeById: req.user.id,
            description: "Solicitud completada por la entidad emisora",
          },
          { transaction: t }
        );

        break;

      case "DENIED":
        if (request.status !== "REQUESTED") {
          t.rollback();
          return res.status(400).json({
            message: "Esta solicitud ya fue aceptada",
          });
        }

        if (!observations) {
          t.rollback();
          return res.status(400).json({
            message: "Debe insertar el motivo de la denegación de la solicitud",
          });
        }

        request.status = "DENIED";

        request.observations = observations;

        await RequestRecord.create(
          {
            requestId: request.id,
            status: "CLOSED",
            madeById: req.user.id,
            description: "Solicitud denegada por la entidad emisora",
          },
          { transaction: t }
        );

        break;

      case "CANCELLED":
        if (!["ACCEPTED", "REQUESTED"].includes(request.status)) {
          t.rollback();
          return res.status(400).json({
            message:
              "Solo puede cancelar solicitudes en estado ACEPTADA o SOLICITADA",
          });
        }

        await RequestRecord.create(
          {
            requestId: request.id,
            status: "CLOSED",
            madeById: req.user.id,
            description: "Solicitud cancelada por la entidad",
          },
          { transaction: t }
        );

        if (request.status === "ACCEPTED") {
          const cardCodes = request.cards.map((card) => card.address);

          await Card.destroy({
            where: { requestId: request.id },
            transaction: t,
          });
          await CardNumber.update(
            { isUsed: false },
            { where: { code: { [Op.in]: cardCodes } }, transaction: t }
          );
        }

        request.status = "CANCELLED";

        break;

      default:
        t.rollback();
        return res.status(400).json({ message: "Estatus desconocido" });
    }

    await request.save({ transaction: t });

    const to_return = await CardRequest.scope("default").findByPk(request.id, {
      transaction: t,
    });

    t.commit();

    res.status(200).json(to_return);
  } catch (e: any) {
    t.rollback();
    console.log(e);
    Logger.error(e);
    return res.json({ message: "Error interno en el servidor" });
  }
};
