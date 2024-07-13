import { Router } from "express";
import {
  executeOperation,
  findAllOperations,
  findAllRecords,
  getMyAccounts,
  remove,
  requestMembership,
  update,
} from "../controllers/account";


const myAccountRouter = Router();

// Routes
myAccountRouter.get("/", getMyAccounts);
myAccountRouter.post("/", requestMembership);
myAccountRouter.get("/:id/records", findAllRecords);
myAccountRouter.get("/:id/operations", findAllOperations);
myAccountRouter.post("/:id/operations", executeOperation);
myAccountRouter.patch("/:id", update);
myAccountRouter.delete("/:id", remove);

export default myAccountRouter;
