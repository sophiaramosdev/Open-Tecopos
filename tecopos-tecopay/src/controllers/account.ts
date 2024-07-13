import { Request, Response } from "express";
import Account from "../database/models/account";
import User from "../database/models/user";
import IssueEntity from "../database/models/issueEntity";
import { pag_params } from "../database/pag_params";
import db from "../database/conecction";
import AccountNumber from "../database/models/accountNumber";
import AccountRecord from "../database/models/accountRecord";
import Card from "../database/models/card";
import { Op, Order, Transaction } from "sequelize";
import Logger from "../utils/logger";
import moment from "moment";
import CardRequest from "../database/models/cardRequest";
import Image from "../database/models/image";
import { accountRegisterNotification } from "../utils/mailSender";
import Business from "../database/models/business";
import Category from "../database/models/category";
import { bigNumberOp, generateNoRepeatNumber } from "../utils/helpers";
import Transactions from "../database/models/transactions";
import axios from "axios";
import RequestRecord from "../database/models/RequestRecords";
import AccountOperation from "../database/models/accountOperation";

//CUSTOMER CONTROLLERS--------------------------------------------
//GET-MY-ACCOUNTS
export const getMyAccounts = async (req: any, res: Response) => {
  try {
    const { per_page, page, all_data, search } = req.query;

    // With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const { count, rows } = await Account.findAndCountAll({
      attributes: ["id", "address", "isActive", "amount"],
      where: { ownerId: req.user.id },
      limit: all_data ? undefined : limit,
      include: [
        {
          model: IssueEntity,
          attributes: ["id", "name", "color"],
          include: [
            {
              model: Image,
              attributes: ["id", "url", "hash"],
              as: "avatar",
            },
          ],
        },
      ],
      offset,
      order: [["createdAt", "DESC"]],
    });

    let totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      totalItems: count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: rows,
    });
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

export const requestMembership = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const {
      user,
      body: { issueEntityId },
    } = req;

    const entity = await IssueEntity.findByPk(issueEntityId, {
      attributes: ["id", "name", "status", "allowCreateAccount"],
      transaction: t,
    });

    if (!entity) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "La entidad proporcionada no existe" });
    }

    if (entity.status !== "ACTIVE") {
      await t.rollback();
      return res.status(400).json({ message: "La entidad no está activa" });
    }

    if (!entity.allowCreateAccount) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Esta entidad no permite membresía" });
    }

    const hasAccount = await Account.findOne({
      where: { ownerId: user.id, issueEntityId },
      transaction: t,
    });
    if (hasAccount) {
      await t.rollback();
      return res.status(400).json({ message: "Ud ya es miembro" });
    }

    const accountAddress = await AccountNumber.findOne({
      where: { issueEntityId, isUsed: false },
      transaction: t,
    });

    if (!accountAddress) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "No hay número de cuenta disponible" });
    }

    const newAccount = await Account.create(
      {
        address: accountAddress!.code,
        ownerId: user.id,
        issueEntityId,
        observations: "Solicitud de membresía",
        records: [
          {
            madeById: user.id,
            title: "Cuenta creada",
            details:
              "Cuenta creada desde la aplicación por solicitud de membresía",
          },
        ],
      },
      {
        include: [AccountRecord],
        transaction: t,
      }
    );

    await AccountNumber.update(
      { isUsed: true },
      { where: { id: accountAddress.id }, transaction: t }
    );

    const toReturn = await Account.findByPk(newAccount.id, {
      attributes: ["id", "address", "isActive", "amount"],
      include: [
        {
          model: IssueEntity,
          attributes: ["id", "name", "color"],
          include: [
            {
              model: Image,
              attributes: ["id", "url", "hash"],
              as: "avatar",
            },
          ],
        },
      ],
      transaction: t,
    });

    await t.commit();

    return res.json(toReturn);
  } catch (error) {
    await t.rollback();
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//ADMIN CONTROLLERS-----------------------------------------------------

//Get all accounts
export const all = async (req: any, res: Response) => {
  try {
    let {
      per_page,
      page,
      orderBy,
      order,
      all_data,
      ownerId,
      createdFrom,
      createdTo,
      issueEntityId,
      businessId,
      accountAddress,
    } = req.query;

    let ordenation: Order;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    let where: any = {};

    if (!!req.issueEntities)
      where.issueEntityId = { [Op.or]: req.issueEntities };

    if (createdFrom && createdTo) {
      where["createdAt"] = {
        [Op.gte]: moment(createdFrom, "YYYY-MM-DD HH:mm")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(createdTo, "YYYY-MM-DD HH:mm")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };
    } else {
      if (createdFrom) {
        where["createdAt"] = {
          [Op.gte]: moment(createdFrom, "YYYY-MM-DD HH:mm")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };
      }

      if (createdTo) {
        where["createdTo"] = {
          [Op.lte]: moment(createdTo, "YYYY-MM-DD HH:mm")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };
      }
    }

    if (accountAddress) {
      where.address = { [Op.iLike]: `${accountAddress}%` };
    }

    if (issueEntityId) {
      where.issueEntityId = issueEntityId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    let business_where: any = {};
    if (businessId) {
      business_where.id = businessId;
    }

    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const { count, rows: accounts } = await Account.findAndCountAll({
      attributes: [
        "id",
        "address",
        "code",
        "observations",
        "isActive",
        "amount",
        "createdAt",
      ],
      limit: all_data ? undefined : limit,
      include: [
        {
          model: IssueEntity,
          attributes: ["id", "name"],
          include: [
            {
              model: Business,
              attributes: ["id", "name"],
              as: "business",
              where:
                Object.values(business_where).length !== 0
                  ? business_where
                  : undefined,
            },
          ],
        },
        { model: User, as: "owner", attributes: ["fullName"] },
      ],
      distinct: true,
      offset,
      where: Object.values(where).length !== 0 ? where : undefined,
      order: ordenation,
    });

    let totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      totalItems: count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: accounts,
    });
  } catch (error) {
    console.log(error);
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

export const getAccountsfromTECOPOS = async (req: any, res: Response) => {
  try {
    const { per_page, page, orderBy, order, all_data } = req.query;
    const { externalId } = req.params;
    // Check if externalId is provided
    if (!externalId) {
      return res.status(400).json({ message: "External ID is required." });
    }

    // Find the internal user ID based on the external ID
    const user = await User.findOne({ where: { externalId } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with the provided external ID not found." });
    }

    const userId = user.id; // Get the internal user ID

    let ordenation: Order;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    // Initialize the where object with common conditions
    let where: any = {};
    where.ownerId = userId;

    // With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const accounts = await Account.findAndCountAll({
      attributes: [
        "id",
        "address",
        "name",
        "code",
        "description",
        "isActive",
        "amount",
        "createdAt",
      ],
      limit: all_data ? undefined : limit,
      include: [
        {
          model: IssueEntity,
          attributes: ["id", "name"],
          include: [
            {
              model: Image,
              attributes: ["id", "url", "hash"],
              as: "profileImage",
            },
            {
              model: Business,
              attributes: ["name"],
              as: "business",
            },
          ],
        },
        { model: User, as: "owner", attributes: ["fullName"] },
        { model: User, as: "createdBy", attributes: ["fullName"] },
      ],
      distinct: true,
      offset,
      where,
      order: ordenation,
    });

    let totalPages = Math.ceil(accounts.count / limit);

    return res.status(200).json({
      totalItems: accounts.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: accounts.rows,
    });
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Find by Id
export const findById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await Account.findByPk(parseInt(id), {
      attributes: [
        "id",
        "address",
        "code",
        "observations",
        "isActive",
        "amount",
      ],
      include: [
        {
          model: IssueEntity,
          as: "issueEntity",
          attributes: ["id", "name"],
          include: [
            {
              model: Business,
              as: "business",
              attributes: ["id", "name"],
            },
          ],
        },
        { model: User, as: "owner", attributes: ["id", "fullName"] },
        {
          model: Card,
          as: "cards",
          attributes: ["id", "address", "holderName", "expiratedAt"],
          include: [
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!account)
      return res
        .status(404)
        .json({ message: "La cuenta solicitada no existe." });

    return res.status(200).json(account);
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

// Create/Register account
export const register = async (req: any, res: Response) => {
  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  });
  try {
    const { ownerId, issueEntityId, observations, printCard, categoryId } =
      req.body;
    const user = req.user;
    const source = req.header("X-App-Origin");

    if (!issueEntityId) {
      t.rollback();
      return res.status(404).json({
        message: "Debe asociar la cuenta a una entidad",
      });
    }

    const issueEntity = await IssueEntity.scope("default").findByPk(
      issueEntityId
    );

    if (!issueEntity) {
      t.rollback();
      return res
        .status(404)
        .json({ message: "La entidad proporcionada no existe" });
    }

    // Check if the user already has an account for the specified issueEntity
    const existingAccount = await Account.findOne({
      where: {
        ownerId,
        issueEntityId,
      },
    });

    if (existingAccount) {
      t.rollback();
      return res.status(400).json({
        message: "El usuario ya es miembro de la entidad",
      });
    }

    const accountAddress = await AccountNumber.findOne({
      where: { issueEntityId: issueEntityId, isUsed: false },
      transaction: t,
    });

    if (!accountAddress) {
      t.rollback();
      return res
        .status(404)
        .json({ message: "No hay número de cuenta disponible" });
    }

    const account = await Account.create(
      {
        address: accountAddress!.code,
        ownerId,
        issueEntityId: issueEntityId,
        observations,
        records: [
          {
            madeById: user.id,
            title: "Cuenta creada",
            details: "Cuenta creada desde la entidad",
          },
        ],
      },
      {
        transaction: t,
        include: [AccountRecord],
      }
    );

    if (printCard) {
      let category: number;
      if (categoryId) {
        const exist = issueEntity.categories.find(
          (category) => category.id === categoryId
        );
        if (!exist) {
          await t.rollback();
          return res.status(400).json({
            message:
              "La categoría de tarjeta no existe en la entidad seleccionada",
          });
        }
        category = exist.id;
      } else {
        category = issueEntity.categories.find(
          (category) => category.isBasic
        )!.id;
      }

      await CardRequest.create(
        {
          holderName: req.user.fullName,
          requestedToId: ownerId,
          categoryId: category,
          status: source === "Tecopay-Admin" ? "ACCEPTED" : "REQUESTED",
          records: [
            {
              status: "REGISTERED",
              description: `Solicitud simple registrada ${
                source === "Tecopay-Admin"
                  ? "desde la entidad emisora"
                  : "por solicitud de membresía"
              }`,
              madeById: req.user.id,
            },
          ],
        },
        { include: [RequestRecord], transaction: t }
      );
    }

    accountAddress!.isUsed = true;
    await accountAddress!.save({ transaction: t });

    // Check if newAccount is not null before accessing its properties
    const newAccount = await Account.findByPk(account.id, {
      attributes: ["id", "address", "observations", "isActive"],
      include: [
        { model: IssueEntity, as: "issueEntity", attributes: ["id", "name"] },
        { model: User, as: "owner", attributes: ["id", "fullName"] },
      ],
      transaction: t,
    });

    await AccountRecord.create(
      {
        title: "Cuenta creada",
        action: "ACCOUNT_CREATED",
        madeById: req.user.id,
        details: "Cuenta creada desde la aplicación",
        accountId: account.id,
      },
      { transaction: t }
    );

    let accountData: any;

    if (newAccount) {
      accountData = {
        accountNumber: newAccount?.address || "",
        entity: newAccount?.issueEntity.name || null,
      };

      // Send transaction notification email
      await accountRegisterNotification({
        to: req.user.email,
        name_to: req.user.name,
        accountData,
      });
    }

    const userFcmToken = req.user.fcmtoken;

    // Prepare notification data
    /* const notificationData = {
      accountNumber: newAccount?.address || "",
      userFcmToken,
    };
    */

    await t.commit();

    return res.status(201).json(newAccount);
  } catch (error) {
    await t.rollback();
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Edit/Update
export const update = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { isMain, isActive, description } = req.body;

    if (!id) {
      t.rollback();
      return res.status(400).json({ message: "Field id is missing" });
    }

    const account = await Account.scope("default").findByPk(parseInt(id), {
      transaction: t,
    });

    if (!account) {
      t.rollback();
      return res
        .status(404)
        .json({ message: `La cuenta con id ${id} no existe` });
    }

    const body: any = {};
    Object.entries(req.body).forEach((elem) => {
      const [key, value] = elem;
      body[key] = value;
    });

    await Account.update(body, {
      where: { id: account.id },
      fields: ["name", "isActive", "isMain", "description"],
      transaction: t,
    });

    await AccountRecord.create(
      {
        title: "Cuenta editada",
        action: "ACCOUNT_EDITED",
        madeById: req.user.id,
        details: "Cuenta editada",
        accountId: account.id,
      },
      { transaction: t }
    );

    await account.reload({ transaction: t });

    await t.commit();

    return res.json(account);
  } catch (error) {
    Logger.error(error);
    t.rollback();
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Delete/Remove
export const remove = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;

    // Find the account by id along with its associated cards
    const account = await Account.findByPk(parseInt(id), {
      include: [Card],
      transaction: t,
    });

    if (!account?.dataValues) {
      t.rollback();
      return res
        .status(404)
        .json({ message: "La cuenta solicitada no existe." });
    }
    // Check if the account has associated cards
    if (account.cards && account.cards.length > 0) {
      await Card.update(
        { isActive: false },
        { where: { accountId: id }, transaction: t }
      );
    }

    await AccountOperation.destroy({
      where: { accountId: id },
      transaction: t,
    });

    await Account.destroy({ where: { id: id }, transaction: t });

    // Create a record of the account deletion
    await AccountRecord.create(
      {
        title: "Cuenta eliminada",
        action: "ACCOUNT_DELETED",
        madeById: req.user.id,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({});
  } catch (error) {
    t.rollback();
    console.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Get all records
export const findAllRecords = async (req: any, res: Response) => {
  try {
    const { id: accountId } = req.params;

    const account = await Account.findByPk(accountId);

    if (!account)
      return res
        .status(404)
        .json({ message: `La cuenta con id ${accountId} no existe` });

    const records = await AccountRecord.findAll({
      attributes: ["title", "action", "details", "observations", "createdAt"],
      include: [{ model: User, as: "madeBy", attributes: ["id", "username"] }],
      order: [["createdAt", "DESC"]],
      where: { accountId },
    });

    return res.status(200).json(records);
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//getAllOperations
export const findAllOperations = async (req: any, res: Response) => {
  try {
    const { id: accountId } = req.params;
    const { transactionType, operationType } = req.query;

    const account = await Account.findByPk(accountId, {
      attributes: ["amount"],
    });

    if (!account) {
      return res.status(404).json({ message: "Membresia no encontrada" });
    }

    const limit = 10;

    let where_transaction: any = {};
    let where_operation: any = {};
    if (!!transactionType) where_transaction.type = transactionType;
    if (operationType === "BILLS") where_operation.amount = { [Op.lt]: 0 };
    if (operationType === "INCOMES") where_operation.amount = { [Op.gt]: 0 };

    const operations = await AccountOperation.findAll({
      where: { accountId, ...where_operation },
      attributes: ["amount"],
      include: [
        { model: Account, where: { id: accountId }, attributes: [] },
        { model: Card, as: "card", attributes: ["id", "address"] },
        {
          model: Transactions,
          attributes: [
            "transactionNumber",
            "type",
            "description",
            ["createdAt", "madeAt"],
          ],
          include: [
            { model: User, as: "madeBy", attributes: ["id", "fullName"] },
          ],
          where:
            Object.keys(where_transaction).length !== 0
              ? where_transaction
              : undefined,
        },
      ],
      limit,
      order: [["createdAt", "DESC"]],
    });

    return res.json({ balance: account.amount, operations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

//Assign an Account to a Card
export const changeCardAccount = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { cardAddress, newAccountAddress } = req.body;

    if (!cardAddress || !newAccountAddress) {
      t.rollback();
      return res.status(400).json({
        message:
          "Both cardAddress and newAccountAddress are required in the request body",
      });
    }

    const card = await Card.findOne({
      where: { address: cardAddress },
      transaction: t,
    });

    if (!card) {
      t.rollback();
      return res
        .status(404)
        .json({ message: `Card with address ${cardAddress} not found` });
    }

    const newAccount = await Account.findOne({
      where: { address: newAccountAddress },
      transaction: t,
    });

    if (!newAccount) {
      t.rollback();
      return res.status(404).json({
        message: `Account with address ${newAccountAddress} not found`,
      });
    }

    card.accountId = newAccount.id;

    await card.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      message: "Card account updated successfully",
      updatedCard: card,
    });
  } catch (e) {
    t.rollback();
    console.error(e);
    return res.status(500).json({ message: "An error occurred on the server" });
  }
};

export const executeOperation = async (req: any, res: Response) => {
  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  });
  try {
    const { id } = req.params;
    const { operationType, target, amount, orderReference, pinPassword } =
      req.body;

    const isPayment = operationType === "PAYMENT";

    const notifyTecopos = async (
      status: "fail" | "success",
      data: Record<string, any> = { reference: orderReference }
    ) => {
      const paymentUrl = `https://apidev.tecopos.com/api/v1/sales/tecopay/${status}`;
      const headers = {
        "X-App-Origin": "Tecopay-Server",
        Authorization: process.env.TECOPOS_API_KEY,
      };
      await axios.post(paymentUrl, data, { headers }).catch((e) => {
        res.status(e.response?.status ?? 500);
        throw new Error(
          e?.response?.data?.message ??
            "Error al notificar al servidor remoto (TECOPOS)"
        );
      });
    };

    const myAccount = await Account.findByPk(id, {
      attributes: ["id", "isActive", "amount", "issueEntityId"],
      include: {
        model: User,
        as: "owner",
        attributes: ["pinPassword", "fullName"],
      },
    });

    //Validando PIN y disponibilidad -----------------------------------------------------

    if (!pinPassword) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Debe introducir el PIN de pago",
      });
    }

    if (pinPassword !== myAccount?.owner.pinPassword) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "PIN incorrecto",
      });
    }

    if (!myAccount?.isActive) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "No es posible realizar operaciones con su cuenta. Por favor, verifique que está activa y que no está bloqueada",
      });
    }

    //----------------------------------------------------------------

    //Validando saldo ------------------------------------------------

    if (!amount || !(amount > 0)) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "El monto de la operación debe ser mayor que cero ",
      });
    }

    if (myAccount!.amount < amount) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Su saldo no es suficiente para realizar la operación",
      });
    }
    //-------------------------------------------------------------------------

    //Validando el tipo de operación ------------------------------------------

    if (!["PAYMENT", "TRANSFER"].includes(operationType)) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Sólo están permitidas las operaciones PAYMENT y TRANSFER",
      });
    }

    if (isPayment && !orderReference) {
      await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Debe indicar la referencia de la orden a pagar",
      });
    }

    //-------------------------------------------------------------------------

    //Validando destino -------------------------------------------------------
    if (!target) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Debe indicar un destino para la operación",
      });
    }

    const isAccount = parseInt(target.split("")[0]) < 5;

    let targetAccount: Account | undefined;
    let targetCard: Card | undefined;
    if (!isAccount) {
      const card = await Card.findOne({
        where: { address: target },
        include: [
          {
            model: Account,
            as: "account",
            include: [{ model: IssueEntity, attributes: ["id", "name"] }],
          },
        ],
      });

      if (!card) {
        if (isPayment) await notifyTecopos("fail");
        await t.rollback();
        return res.status(400).json({
          message: "La tarjeta destino proporcionada no existe",
        });
      }
      targetCard = card;
      targetAccount = card.account;
    } else {
      const account = await Account.findOne({
        where: { address: target },
        include: [{ model: IssueEntity, attributes: ["id", "name"] }],
      });
      if (!account) {
        if (isPayment) await notifyTecopos("fail");
        await t.rollback();
        return res.status(400).json({
          message: "La cuenta destino proporcionada no existe",
        });
      }

      targetAccount = account;
    }

    if (targetAccount.issueEntityId !== myAccount?.issueEntityId) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "Su cuenta y el destino proporcionado no pertenecen a la misma entidad",
      });
    }

    if (!targetAccount?.isActive) {
      if (isPayment) await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "No es posible realizar operaciones en la cuenta destino. Por favor, verifique que está activa y que no está bloqueada",
      });
    }

    //---------------------------------------------------------------------------

    //Hacer la transferencia---------------------------------------------------

    await Account.update(
      { amount: bigNumberOp("minus", [myAccount.amount, amount]) },
      { where: { id: myAccount.id }, transaction: t }
    );
    await Account.update(
      { amount: bigNumberOp("plus", [targetAccount.amount, amount]) },
      { where: { id: targetAccount.id }, transaction: t }
    );

    const transactionNumber = generateNoRepeatNumber();

    const operations = [
      {
        amount: -amount,
        accountId: myAccount.id,
      },
      {
        amount,
        accountId: isAccount ? targetAccount.id : null,
        cardId: targetCard?.id,
      },
    ];

    const newTrans = await Transactions.create(
      {
        transactionNumber,
        madeById: req.user.id,
        type: operationType,
        description: `Operación de ${
          operationType === "PAYMENT"
            ? `PAGO a la entidad ${targetAccount.issueEntity.name}`
            : `TRANSFERENCIA de Cuenta a ${!!targetCard ? "Tarjeta" : "Cuenta"}`
        }`,
        operations,
      },
      { include: [AccountOperation], transaction: t }
    );

    if (isPayment)
      await notifyTecopos("success", {
        status: 200,
        reference: orderReference,
        amount,
        message: `Cuenta ${targetAccount.address}`,
        transactionNumber: transactionNumber,
      });

    const operation = await AccountOperation.findOne({
      attributes: ["amount"],
      include: [
        { model: Account, where: { id }, attributes: [] },
        { model: Card, as: "card", attributes: ["id", "address"] },
        {
          model: Transactions,
          attributes: [
            "transactionNumber",
            "type",
            "description",
            ["createdAt", "madeAt"],
          ],
          where: { id: newTrans.id },
          include: [
            { model: User, as: "madeBy", attributes: ["id", "fullName"] },
          ],
        },
      ],
      transaction: t,
    });

    //------------------------------------------------------------------

    await myAccount.reload({ transaction: t });

    await t.commit();
    return res.json({ balance: myAccount.amount, operation });
  } catch (error: any) {
    console.log(error);
    Logger.error(error);
    await t.rollback();
    return res.json({ message: error.message ?? "Internal server error" });
  }
};

export const chargeAccount = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const account = await Account.findByPk(id);
    if (!account)
      return res.status(400).json({ message: "La cuenta indicada no existe" });

    if (!account.isActive) {
      return res.status(400).json({ message: "La cuenta no está activa" });
    }

    const newAmount = bigNumberOp("plus", [account.amount, amount]);

    account.amount = Number(newAmount);

    await account.save();

    const transactionNumber = generateNoRepeatNumber();

    const operations = [
      {
        amount,
        accountId: account.id,
      },
    ];

    await Transactions.create(
      {
        transactionNumber,
        madeById: req.user.id,
        type: "DEPOSIT",
        description: "Recarga de saldo",
        operations,
      },
      { include: [AccountOperation] }
    );

    return res.json({
      message: "Cuenta recargada con éxito",
      currentAmount: account.amount,
    });
  } catch (error: any) {
    Logger.error(error);
    return res.json({ message: error.message ?? "Internal server error" });
  }
};
