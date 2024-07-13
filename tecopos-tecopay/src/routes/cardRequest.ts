import { Router } from "express";
import {
  deleteRequest,
  getUserRequests,
  getAllRequest,
  //manageRequestStatus,
  ownRequest,
  //requestRecord,
  //newRequest,
  updateMyRequest,
  newRequest,
  manageRequestStatus,
  updateRequest,
} from "../controllers/cardRequest";
import { verifyPermissions } from "../middlewares/security";

const cardRequestRouter = Router();

//Customer Requests
cardRequestRouter.post("/newRequest", ownRequest);

cardRequestRouter.get("/myRequests", getUserRequests);

cardRequestRouter.patch("/myRequest/:id", updateMyRequest);

//Admin Requests
cardRequestRouter.get("/", verifyPermissions(["REQUESTS_FULL", "REQUESTS_VIEW"]), getAllRequest);

cardRequestRouter.post("/", verifyPermissions(["REQUESTS_FULL","REQUESTS_CREATE"]), newRequest);

cardRequestRouter.patch(
  "/:id",
  updateRequest
);
cardRequestRouter.delete(
  "/:id",
  verifyPermissions(["REQUESTS_FULL","REQUESTS_DELETE"]),
  deleteRequest
);

cardRequestRouter.post(
  "/:id/status",
  verifyPermissions(["ACCOUNTS_FULL","REQUESTS_UPDATE"]),
  manageRequestStatus
);

export default cardRequestRouter;
