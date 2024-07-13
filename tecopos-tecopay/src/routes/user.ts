import { Router } from "express";
import {
  allUsers,
  editUser,
  getExternalUsers,
  removeUser,
  userById,
  getMyUser,
  putFCMToken,
  getExternalUserById,
  assignRolesToUser,
  registerUserExisting,
  registerNewUser,
  editMyUser,
} from "../controllers/user";
import { verifyPermissions } from "../middlewares/security";

const userRouter = Router();

userRouter.get("/", verifyPermissions(["USERS_FULL", "USERS_VIEW"]), allUsers);

userRouter.get("/myuser", getMyUser);
userRouter.patch("/myuser", editMyUser);

userRouter.post(
  "/register",
  verifyPermissions(["USERS_CREATE"]),
  registerUserExisting
);

userRouter.post(
  "/register/new",
  verifyPermissions(["USERS_CREATE"]),
  registerNewUser
);

userRouter.get(
  "/external",
  verifyPermissions(["USERS_VIEW"]),
  getExternalUsers
);

userRouter.get(
  "/external/:userId",
  verifyPermissions(["USERS_VIEW"]),
  getExternalUserById
);

userRouter.patch("/token/:userId", putFCMToken);

userRouter.get("/:id", verifyPermissions(["USERS_VIEW"]), userById);

// userRouter.patch(
//   "/:id",
//   verifyPermissions(["ACCESS_ALL_SYSTEM_USERS"]),
//   editUser
// );

userRouter.patch(
  "/:userId",
  verifyPermissions(["USERS_FULL", "USERS_EDIT"]),
  assignRolesToUser
);

userRouter.delete("/:id", verifyPermissions(["USERS_DELETE"]), removeUser);

export default userRouter;
