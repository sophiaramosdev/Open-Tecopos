import { Request as ReqExpress, Response } from "express";
import Card from "../database/models/card";
import Account from "../database/models/account";
import { pag_params } from "../database/pag_params";
import CardRequest from "../database/models/cardRequest";
import { Op, Order, Transaction } from "sequelize";
import User from "../database/models/user";
import db from "../database/conecction";
import axios from "axios";
import IssueEntity from "../database/models/issueEntity";
import Logger from "../utils/logger";
import Category from "../database/models/category";
import Image from "../database/models/image";
import Transactions from "../database/models/transactions";
import { bigNumberOp, generateNoRepeatNumber } from "../utils/helpers";
import AccountOperation from "../database/models/accountOperation";
import AccountNumber from "../database/models/accountNumber";
import AccountRecord from "../database/models/accountRecord";

export const all = async (req: any, res: Response) => {
  try {
    const {
      per_page,
      page,
      order,
      orderBy,
      all_data,
      accountId,
      isAssigned,
      isDelivered,
      issueEntityId,
      categoryId,
    } = req.query;

    let where: any = {};

    if (!!accountId) where.accountId = accountId;
    if (!!isDelivered) where.isDelivered = isDelivered;
    if (!!issueEntityId) where["$account.issueEntity.id$"] = issueEntityId;
    if (!!categoryId) where["$category.id$"] = categoryId;

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const cards = await Card.findAndCountAll({
      attributes: [
        "id",
        "address",
        "barCode",
        "holderName",
        "description",
        "expiratedAt",
        "emitedAt",
        "minAmountWithoutConfirmation",
        "isBlocked",
        "isActive",
        "isDelivered",
      ],
      include: [
        {
          model: Account,
          attributes: ["address", "amount", "isActive"],
          include: [
            {
              model: User,
              as: "owner",
              attributes: ["fullName"],
            },
          ],
        },
        {
          model: CardRequest,
          attributes: ["id", "queryNumber", "status"],
          where: { status: "PRINTED" },
        },
        {
          model: Category,
          as: "category",
          attributes: ["name", "cardImageId"],
          include: [
            {
              model: Image,
              attributes: ["id", "url", "hash"],
              as: "cardImage",
            },
          ],
        },
      ],
      distinct: true,
      offset,
      where,
    });

    let totalPages = Math.floor(cards.count / limit) || 1;
    if (cards.count === 0) {
      totalPages = 0;
    }

    return res.status(200).json({
      totalItems: cards.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: cards.rows,
    });
  } catch (e) {
    Logger.error(e);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error en el servidor" });
  }
};

// Edit Card Status
export const editCardStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    // Find the card by ID
    const card = await Card.findByPk(parseInt(id));

    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }

    // Update the card status
    await card.update({
      isBlocked,
      isActive: isBlocked ? false : card.isActive,
    });

    return res
      .status(200)
      .json({ message: "Card status updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//Deliver Card
export const deliverCard = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { ownerId } = req.body;

    if (!id) {
      t.rollback();
      return res.status(400).json({ message: `Param id is missing` });
    }

    const card = await Card.findByPk(id, {
      include: [
        {
          model: CardRequest,
          where: { status: "PRINTED" },
        },
        {
          model: Category,
          include: [{ model: IssueEntity, attributes: ["name"] }],
        },
      ],
      transaction: t,
    });
    if (!card) {
      t.rollback();
      return res
        .status(400)
        .json({ message: `La tarjeta que intenta entregar no está lista` });
    }

    if (card.isDelivered) {
      t.rollback();
      return res.status(400).json({
        message: "Esta tarjeta ya fue entregada",
      });
    }

    if (!card.accountId) {
      if (!ownerId) {
        t.rollback();
        return res.status(400).json({
          message: "Debe asignar la tarjeta a un usuario antes de entregarla",
        });
      }

      const account = await Account.findOne({
        where: { ownerId, issueEntityId: card.category.issueEntityId },
        transaction: t,
      });

      if (account) {
        card.accountId = account.id;
      } else {
        const accountNumber = await AccountNumber.findOne({
          where: { isUsed: false },
          transaction: t,
        });

        if (!accountNumber) {
          t.rollback();
          return res.status(400).json({
            message: "No hay disponibilidad de membresía",
          });
        }

        const newAccount = await Account.create(
          {
            address: accountNumber!.code,
            name: card.category.issueEntity.name,
            ownerId,
            issueEntityId: card.category.issueEntityId,
            createdById: req.user.id,
            records: [
              {
                madeById: req.user.id,
                details: "Cuenta creada desde la entidad",
              },
            ],
          },
          {
            transaction: t,
            include: [AccountRecord],
          }
        );

        card.accountId = newAccount.id;
      }
    }

    card.isDelivered = true;
    card.isActive = true;
    card.deliveredAt = new Date();

    await card.save({ transaction: t });

    const deliveredCard = await Card.scope("default").findByPk(card.id, {
      transaction: t,
    });

    await t.commit();

    res.json(deliveredCard);
  } catch (e) {
    t.rollback();
    Logger.error(e);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error en el servidor" });
  }
};

//-Get-card-from-barCode-//
export const getCardFromBarCode = async (req: any, res: Response) => {
  const t = await db.transaction();
  try {
    const { cardBarCode } = req.params;

    if (!cardBarCode) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "El código de barras es un campo necesario" });
    }

    const card = await Card.findOne({
      where: { barCode: cardBarCode },
      transaction: t,
    });

    if (!card) {
      t.rollback();
      return res.status(404).json({
        message: `Tarjeta con codigo de barras ${cardBarCode} no encontrada`,
      });
    } else {
      return res.json(card);
    }
  } catch (e) {
    t.rollback();
    console.error(e);
    return res.status(500).json({ message: "An error occurred on the server" });
  }
};

//GET MY CARD
export const getMyCards = async (req: any, res: Response) => {
  try {
    const { page, all_data, accountId } = req.query;
    const user = req.user;

    //With pagination
    const limit = 35;
    const offset = (parseInt(page ?? 1) - 1) * limit;

    let where: any = { isDelivered: true };
    if (!!accountId) where.accountId = accountId;

    const cards = await Card.findAndCountAll({
      where,
      attributes: [
        "id",
        "address",
        "barCode",
        "holderName",
        "description",
        "expiratedAt",
        "minAmountWithoutConfirmation",
        "isBlocked",
        "isDelivered",
        "createdAt",
      ],
      include: [
        {
          model: Account,
          where: { ownerId: user.id },
          attributes: ["id","address", "amount"],
        },
        { model: CardRequest, attributes: ["queryNumber", "status"] },
        {
          model: Category,
          attributes: ["id", "name", "cardImageId"],
          include: [
            {
              model: Image,
              as: "cardImage",
              attributes: ["id", "url", "hash"],
            },
          ],
        },
      ],
      offset,
      order: [["createdAt", "DESC"]],
    });

    let totalPages = Math.ceil(cards.count / limit) || 1;
    if (cards.count === 0) {
      totalPages = 0;
    }

    return res.status(200).json({
      totalItems: cards.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: cards.rows,
    });
  } catch (e) {
    Logger.error(e);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error en el servidor" });
  }
};

export const getCardOperations = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ message: "ID de tarjeta no proporcionado" });

    const { page, transactionType, operationType } = req.query;

    const limit = 10;
    const offset = ((page ?? 1) - 1) * limit;

    let where_transaction: any = {};
    let where_operation: any = {};
    if (!!transactionType) where_transaction.type = transactionType;
    if (operationType === "BILLS") where_operation.amount = { [Op.lt]: 0 };
    if (operationType === "INCOMES") where_operation.amount = { [Op.gt]: 0 };

    const { count: totalItems, rows: items } =
      await AccountOperation.findAndCountAll({
        where: { cardId: id, ...where_operation },
        attributes: ["amount"],
        include: [
          { model: Account, as: "account", attributes: ["id", "address"] },
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
        offset,
        order: [["createdAt", "DESC"]],
      });

    return res.json({
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page: parseInt(page ?? 1),
      items,
    });
  } catch (e) {
    Logger.error(e);
    return res
      .status(500)
      .json({ message: "Ha ocurrido un error en el servidor" });
  }
};

//PAYMENT
export const payment = async (req: any, res: Response) => {
  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  });
  try {
    const { target, amount, orderReference, pinPassword, cardAddress } =
      req.body;

    const origin = req.header("X-App-Origin");
    if (origin !== "Tecopos-Terminal") {
      await t.rollback();
      return res.status(400).json({
        message: "Operación no permitida desde el origen actual",
      });
    }

    //Validando que todos los campos se envien --------------------------
    if (!pinPassword || !target || !orderReference || !cardAddress) {
      await t.rollback();
      return res.status(400).json({
        message: "Asegúrese de llenar todos los campos necesarios",
      });
    }

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
        console.log(e);
        res.status(e.response?.status ?? 500);
        throw new Error(
          e?.response?.data?.message ??
            "Error al notificar al servidor remoto (TECOPOS)"
        );
      });
    };

    const card = await Card.findOne({
      where: { address: cardAddress },
      include: [
        {
          model: Account,
          attributes: ["id", "amount", "isActive"],
          include: [{ model: User, as: "owner", attributes: ["pinPassword"] }],
        },
        { model: Category, attributes: ["issueEntityId"] },
      ],
    });

    if (!card) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Tarjeta no válida",
      });
    }

    //Validando PIN y disponibilidad -----------------------------------------------------

    if (pinPassword !== card.account.owner.pinPassword) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "PIN incorrecto",
      });
    }

    if (!card.isActive || card.isBlocked) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "No es posible realizar operaciones con la tarjeta. Por favor, verifique que está activa y que no está bloqueada",
      });
    }

    if (!card.account.isActive) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "No es posible realizar operaciones con la cuenta asociada a su tarjeta. Por favor, verifique que está activa y que no está bloqueada",
      });
    }
    //-------------------------------------------------------------------

    //Validando saldo ---------------------------------------------------

    if (!amount || !(amount > 0)) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "El monto de la operación debe ser mayor que cero ",
      });
    }

    if (card.account.amount < amount) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Su saldo no es suficiente para realizar la operación",
      });
    }

    //-------------------------------------------------------------------------

    //Validando destino -------------------------------------------------------
    if (!target) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "Debe indicar un destino para la operación",
      });
    }

    const targetAccount = await Account.findOne({
      where: { address: target },
      include: [{ model: IssueEntity, attributes: ["id", "name"] }],
    });
    if (!targetAccount) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message: "La cuenta destino proporcionada no existe",
      });
    }

    if (targetAccount.issueEntityId !== card?.category.issueEntityId) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "Su cuenta y el destino proporcionado no pertenecen a la misma entidad",
      });
    }

    if (!targetAccount?.isActive) {
      //await notifyTecopos("fail");
      await t.rollback();
      return res.status(400).json({
        message:
          "No es posible realizar operaciones en la cuenta destino. Por favor, verifique que está activa",
      });
    }

    //---------------------------------------------------------------------------

    //Hacer la transferencia------------------------------------------------

    await Account.update(
      { amount: bigNumberOp("minus", [card.account.amount, amount]) },
      { where: { id: card.account.id }, transaction: t }
    );
    await Account.update(
      { amount: bigNumberOp("plus", [card.account.amount, amount]) },
      { where: { id: targetAccount.id }, transaction: t }
    );

    const transactionNumber = generateNoRepeatNumber();

    const operations = [
      {
        amount: -amount,
        accountId: card.account.id,
        cardId: card.id,
      },
      {
        amount,
        accountId: targetAccount.id,
      },
    ];

    await Transactions.create(
      {
        transactionNumber,
        madeById: req.user.id,
        type: "PAYMENT",
        description: `Operación de PAGO desde tarjeta a la entidad ${targetAccount.issueEntity.name}`,
        operations,
      },
      { include: [AccountOperation], transaction: t }
    );

    await notifyTecopos("success", {
      status: 200,
      reference: orderReference,
      amount,
      message: `Cuenta ${targetAccount.address}`,
      transactionNumber: transactionNumber,
    });

    //------------------------------------------------------------------

    await card.reload({ transaction: t });

    await t.commit();
    return res.json({ remainAmount: card.account.amount });
  } catch (error: any) {
    console.log(error);
    Logger.error(error);
    await t.rollback();
    return res.json({ message: error.message ?? "Internal server error" });
  }
};

///SET MIN AMOUNT
export const setMinAmountWithoutConfirmation = async (
  req: any,
  res: Response
) => {
  const t = await db.transaction();
  try {
    const { address, newMinAmount, securityPin } = req.body;

    if (!address || !newMinAmount || isNaN(newMinAmount) || !securityPin) {
      t.rollback();
      return res.status(400).json({
        message: "Address, newMinAmount, and securityPin are required",
      });
    }

    const card = await Card.findOne({ where: { address }, transaction: t });

    if (!card) {
      t.rollback();
      return res
        .status(404)
        .json({ message: `Card with address ${address} not found` });
    }

    // Perform any additional verifications as needed
    if (newMinAmount < 0) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "newMinAmount must be greater than or equal to 0" });
    }

    // Verify if newMinAmount is greater than the current amount in the card's associated account
    const associatedAccount = await Account.findByPk(card.accountId, {
      transaction: t,
    });

    if (!associatedAccount) {
      t.rollback();
      return res.status(400).json({ message: "Associated account not found" });
    }

    if (newMinAmount > associatedAccount.amount) {
      t.rollback();
      return res.status(400).json({
        message:
          "newMinAmount must be less than or equal to the current amount in the associated account",
      });
    }

    // Update the minAmountWithoutConfirmation
    card.minAmountWithoutConfirmation = newMinAmount;

    await card.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      message: "minAmountWithoutConfirmation updated successfully",
      updatedCard: card,
    });
  } catch (e) {
    t.rollback();
    console.error(e);
    return res.status(500).json({ message: "An error occurred on the server" });
  }
};

//ASSIGN CATEGORY TO CARD
export const assignCategoryToCard = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const { cardAddress, categoryName } = req.body;

    // Check if cardAddress and categoryName are provided
    if (!cardAddress || !categoryName) {
      t.rollback();
      return res
        .status(400)
        .json({ message: "cardAddress and categoryName are required" });
    }

    // Find the card by address
    const card = await Card.findOne({
      where: { address: cardAddress },
      transaction: t,
    });

    if (!card) {
      t.rollback();
      return res.status(404).json({ message: "Card not found" });
    }

    // Find the category by name
    const category = await Category.findOne({
      where: { name: categoryName },
      transaction: t,
    });

    if (!category) {
      t.rollback();
      return res.status(404).json({ message: "Category not found" });
    }

    // Find the account associated with the card
    const account = await Account.findByPk(card.accountId, { transaction: t });

    if (!account) {
      t.rollback();
      return res.status(404).json({ message: "Account not found" });
    }

    // Check if the category belongs to the same entity as the account
    if (category.issueEntityId !== account.issueEntityId) {
      t.rollback();
      return res.status(403).json({
        message: "Category does not belong to the same entity as the account",
      });
    }

    // Update the card's category
    await card.update({ categoryId: category.id }, { transaction: t });

    await t.commit();

    return res
      .status(200)
      .json({ message: "Category assigned to card successfully" });
  } catch (error) {
    console.error(error);
    t.rollback();
    Logger.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Edit my card
export const editMyCard = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      pinPassword,
      newSecurityPin,
      minAmountWithoutConfirmation,
      isBlocked,
    } = req.body;

    if (!!newSecurityPin && newSecurityPin.length !== 4)
      return res.status(400).json({ message: "El PIN debe tener 4 dígitos" });

    const card = await Card.scope("default").findByPk(id);

    // Check if cardAddress and categoryName are provided
    if (!card) {
      return res
        .status(400)
        .json({ message: `La tarjeta con id ${id} no existe` });
    }

    const user = await User.findByPk(req.user.id);

    if (
      (!!minAmountWithoutConfirmation || !!newSecurityPin) &&
      pinPassword !== user?.pinPassword
    ) {
      return res.status(400).json({ message: "PIN incorrecto" });
    }

    if (!!minAmountWithoutConfirmation)
      card.minAmountWithoutConfirmation = minAmountWithoutConfirmation;

    if (!!newSecurityPin) card.securityPin = newSecurityPin;
    if (isBlocked !== undefined) card.isBlocked = !!isBlocked;

    await card.save();
    await card.reload();
    console.log();

    return res.status(200).json(card);
  } catch (error) {
    console.error(error);
    Logger.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
