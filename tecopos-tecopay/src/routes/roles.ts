import { Request, Response, Router } from "express";
import {
  all,
  assignPermissionsToRole,
  findById,
  getAllPermissions,
  getUserPermissionsByRole,
  register,
  remove,
  update,
} from "../controllers/role";
import { verifyPermissions } from "../middlewares/security";

const rolesRouter = Router();

rolesRouter.get("/permissions", verifyPermissions([]), getAllPermissions);

rolesRouter.get("/", verifyPermissions([]), (req: Request, res: Response) =>
  all(req, res)
);

rolesRouter.post("/", verifyPermissions([]), (req: Request, res: Response) =>
  register(req, res)
);

rolesRouter.get("/:id", verifyPermissions([]), (req: Request, res: Response) =>
  findById(req, res)
);

rolesRouter.patch(
  "/:roleId",
  verifyPermissions([]),
  (req: any, res: Response) => update(req, res)
);
rolesRouter.delete(
  "/:roleId",
  verifyPermissions([]),
  (req: Request, res: Response) => remove(req, res)
);

//Permissions
rolesRouter.patch(
  "/permissions/:roleId",
  verifyPermissions([]),
  assignPermissionsToRole
);
rolesRouter.get(
  "/permissions/:roleId",
  verifyPermissions([]),
  getUserPermissionsByRole
);

export default rolesRouter;
