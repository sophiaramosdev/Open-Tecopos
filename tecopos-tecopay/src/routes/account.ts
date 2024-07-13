import { Router } from "express";
import {
  all,
  chargeAccount,
  findAllOperations,
  findAllRecords,
  findById,
  getAccountsfromTECOPOS,
  register,
  remove,
  update,
} from "../controllers/account";
import { verifyPermissions } from "../middlewares/security";

const accountRouter = Router();

// Routes
accountRouter.get("/", verifyPermissions(["ACCOUNTS_FULL", "ACCOUNTS_VIEW", "ALL"]), all);
accountRouter.get("/:externalId/servertoserver", getAccountsfromTECOPOS);
accountRouter.post("/", verifyPermissions(["ACCOUNTS_FULL", "ACCOUNTS_CREATE", "ALL"]), register);
accountRouter.get("/:id", verifyPermissions(["ACCOUNTS_FULL", "ACCOUNTS_VIEW", "ALL"]), findById);
accountRouter.patch("/:id", verifyPermissions(["ACCOUNTS_FULL", "ACCOUNTS_EDIT", "ALL"]), update);
accountRouter.delete("/:id", verifyPermissions(["ACCOUNTS_FULL", "ACCOUNTS_DELETE", "ALL"]), remove);
accountRouter.get(
  "/:id/records",
  findAllRecords
);
accountRouter.get(
  "/:id/operations",
  findAllOperations
);
accountRouter.post("/:id/charge", chargeAccount)

export default accountRouter;
