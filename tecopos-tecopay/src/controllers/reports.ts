import { Response } from "express";
import Logger from "../utils/logger";
import IssueEntity from "../database/models/issueEntity";
import User from "../database/models/user";
import Account from "../database/models/account";
import Card from "../database/models/card";
import CardRequest from "../database/models/cardRequest";
import { fn, col, Sequelize } from "sequelize";
import db from "../database/conecction";

export const getTotals = async (req: any, res: Response) => {
  try {
    const totals = await Promise.all([
      await IssueEntity.count(),
      await User.count({
        include: [{ model: Account, as: "ownAccounts", required: true }],
      }),
      await Account.count({ where: { isActive: true } }),
      await Card.count({ where: { isDelivered: true } }),
      await Account.sum("amount"),
      await CardRequest.count({ attributes: ["status"], group: "status" }),
      await db.query(
        `SELECT "IssueEntities"."name" as "entity", COUNT("Accounts".*) as "quantity" 
        FROM "Accounts", "IssueEntities" 
        WHERE "Accounts"."issueEntityId"="IssueEntities"."id"         
        GROUP BY "IssueEntities"."name"
        ORDER BY "quantity" DESC
        LIMIT 5`
      ),
      await db.query(
        `SELECT "IssueEntities"."name" as "entity", SUM("Accounts".amount) as "totalPoints" 
        FROM "Accounts", "IssueEntities" 
        WHERE "Accounts"."issueEntityId"="IssueEntities"."id"         
        GROUP BY "IssueEntities"."name"
        ORDER BY "totalPoints" DESC
        LIMIT 5`
      ),
      await db.query(
        `SELECT "IssueEntities"."name" as "entity", COUNT("Cards".*) as "totalCards" 
        FROM "Accounts", "IssueEntities", "Cards" 
        WHERE "Accounts"."issueEntityId"="IssueEntities"."id" 
                AND "Cards"."accountId" = "Accounts"."id" 
                AND "Cards"."isDelivered" = true        
        GROUP BY "IssueEntities"."name"
        ORDER BY "totalCards" DESC
        LIMIT 5`
      ),
    ]).then((resp) => ({
      issueEntities: resp[0],
      activeUsers: resp[1],
      activeAccounts: resp[2],
      deliveredCards: resp[3],
      circulatingPoints: resp[4],
      requestByStatus: resp[5],
      fiveWithMostMembers: resp[6][0].map((res: any) => ({
        ...res,
        quantity: Number(res.quantity),
      })),
      fiveWithMostPointsCirculating: resp[7][0],
      fiveWithMostCardPrinted: resp[8][0].map((res: any) => ({
        ...res,
        totalCards: Number(res.totalCards),
      })),
    }));

    return res.json(totals);
  } catch (error) {
    console.log(error);
    Logger.error(error);
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};
