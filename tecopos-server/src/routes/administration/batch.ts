import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    editBatch,
    findAllBatches,
} from "../../controllers/administration/batch";
import Batch from "../../database/models/batch";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";

const routerAdministrationBatch = Router();

routerAdministrationBatch.get(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_AREA"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllBatches
);

routerAdministrationBatch.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Batch, ["registeredPrice"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_CONTABILITY"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editBatch
);

export default routerAdministrationBatch;
