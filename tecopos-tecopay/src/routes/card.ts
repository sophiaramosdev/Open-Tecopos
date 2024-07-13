import { Router } from "express";
import {
  all,
  assignCategoryToCard,
  deliverCard,
  editCardStatus,
  editMyCard,
  getCardFromBarCode,
  getCardOperations,
  getMyCards,
  payment,
  setMinAmountWithoutConfirmation,
} from "../controllers/card";
import { verifyPermissions } from "../middlewares/security";

const cardRouter = Router();

cardRouter.get("/", verifyPermissions(["CARDS_FULL", "CARDS_VIEW"]), all);

cardRouter.get("/mycards", getMyCards);
cardRouter.get("/mycards/:id/operations", getCardOperations);
cardRouter.patch("/mycards/:id/configurations", editMyCard);

cardRouter.post(
  "/payment",
  verifyPermissions([
    "ACCOUNTS_FULL",
    "ACCOUNTS_EDIT",
    "CARDS_FULL",
    "CARDS_UPDATE",
  ]),
  payment
);

cardRouter.post(
  "/:id/deliver",
  verifyPermissions(["CARDS_FULL", "CARDS_UPDATE"]),
  deliverCard
);

cardRouter.patch("/minAmount", setMinAmountWithoutConfirmation);

cardRouter.get("/cardfrombarcode/:cardBarCode", getCardFromBarCode);

cardRouter.patch(
  "/editCardStatus/:id",
  verifyPermissions(["CARDS_FULL", "CARDS_UPDATE"]),
  editCardStatus
);

cardRouter.patch(
  "/assignCategory",
  verifyPermissions(["CARDS_FULL", "CARDS_UPDATE"]),
  assignCategoryToCard
);

export default cardRouter;
