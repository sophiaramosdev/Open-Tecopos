import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    openShift,
    closeShift,
    editShift,
    findAllShifts,
    getActiveShift,
    deleteShift,
} from "../../controllers/administration/shift";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import Shift from "../../database/models/shift";

const routerShift = Router();

//Economic Cycle
routerShift.post(
    "/shift/open",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIFT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    openShift
);

routerShift.post(
    "/shift/close",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIFT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    closeShift
);

routerShift.patch(
    "/shift/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        attReceivedValidator(Shift),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIFT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editShift
);

routerShift.get(
    "/shift",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllShifts
);

routerShift.get(
    "/active-shift",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getActiveShift
);

routerShift.delete(
    "/shift/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_SHIFT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteShift
);

export default routerShift;
