import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";

import {
    deleteEconomicCycle,
    duplicatorEconomicCycle,
    editEconomicCycle,
    findAllEconomicCycles,
    getActiveEconomicCycle,
    getAllAreaSalesDuplicator,
    getEconomicCycle,
    manageEconomicCycle,
} from "../../controllers/administration/economicCycle";
import EconomicCycle from "../../database/models/economicCycle";
import { moduleValidator } from "../../middlewares/moduleValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { check } from "express-validator";

const routerEconomicCycle = Router();

//Economic Cycle
routerEconomicCycle.post(
    "/economiccycle/:operation",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_ECONOMIC_CYCLE"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageEconomicCycle
);

routerEconomicCycle.post(
    "/duplicator/economiccycle",
    [
        originValidator(["Tecopos-Admin"]),
        check("economicCycleId", "economicCycleId field is missing")
            .not()
            .isEmpty(),
        check("registerAt", "registerAt field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["DUPLICATOR"]),
    ],
    duplicatorEconomicCycle
);

routerEconomicCycle.patch(
    "/economiccycle/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(EconomicCycle),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_ECONOMIC_CYCLE"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editEconomicCycle
);
routerEconomicCycle.get(
    "/economiccycle",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles([
            "OWNER",
            "ADMIN",
            "MANAGER_ECONOMIC_CYCLE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
            "ANALYSIS_REPORT",
            "MANAGER_AREA"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllEconomicCycles
);

routerEconomicCycle.get(
    "/economiccycle/duplicator/areas",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllAreaSalesDuplicator
);

routerEconomicCycle.get(
    "/economiccycle/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "OWNER",
            "ADMIN",
            "MANAGER_ECONOMIC_CYCLE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
            "ANALYSIS_REPORT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getEconomicCycle
);

routerEconomicCycle.get(
    "/active-economiccycle",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "MANAGER_AREA",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_CONTABILITY",
            "PRODUCT_PROCESATOR",
            "MANAGER_PRODUCTION",
            "MANAGER_SHIFT",
            "WEITRESS",
            "MARKETING_SALES"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getActiveEconomicCycle
);

routerEconomicCycle.delete(
    "/economiccycle/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteEconomicCycle
);

export default routerEconomicCycle;
