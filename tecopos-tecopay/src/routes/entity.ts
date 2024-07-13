import { Router } from "express";
import {
  all,
  findById,
  update,
  remove,
  register,
  allAvailables,
  createEntityType,
  getEntityTypes,
  updateEntityType,
  deleteEntityType,
  availableById,
} from "../controllers/entity";
import { verifyPermissions } from "../middlewares/security";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../controllers/categories";

const entityRouter = Router();


entityRouter.get("/", verifyPermissions(["ENTITIES_VIEW", "ALL"]), all);

entityRouter.post("/", verifyPermissions(["ENTITIES_EDIT"]), register);

entityRouter.patch(
  "/categories/:categoryId",
  verifyPermissions(["ENTITIES_EDIT"]),
  updateCategory
);

entityRouter.delete(
  "/categories/:categoryId",
  verifyPermissions([]),
  deleteCategory
);

entityRouter.get("/availables", allAvailables);

entityRouter.get("/availables/:id", availableById);

entityRouter.get("/types", getEntityTypes);

entityRouter.post(
  "/types",
   createEntityType
);

entityRouter.patch(
  "/types/:id",
  updateEntityType
);

entityRouter.delete(
  "/types/:id",
  deleteEntityType
);

entityRouter.get("/:id", verifyPermissions(["ENTITIES_VIEW"]), findById);

entityRouter.patch("/:id", verifyPermissions(["ENTITIES_EDIT"]), update);

entityRouter.delete("/:id", verifyPermissions(["ENTITIES_EDIT"]), remove);

//Categories By Entity
entityRouter.get(
  "/:id/categories",
  getAllCategories
);

entityRouter.post(
  "/:id/categories",
  verifyPermissions(["ENTITIES_EDIT"]),
  createCategory
);


export default entityRouter;
