import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    deleteTecopayAccount,
    editMyConfigurations,
    editMySensibleConfigurations,
    getMySensibleConfigurations,
    registerTecopayAccount,
} from "../../controllers/administration/configurations";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerConfigAdmin = Router();

routerConfigAdmin.patch(
    "/configurations",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("configs", "configs field is missing").not().isEmpty(),
        check("configs", "configs field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "GROUP_OWNER",
            "OWNER",
            "ADMIN",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_SHIFT",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editMyConfigurations
);

routerConfigAdmin.post(
    "/configurations/tecopay",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("account", "account field is missing").not().isEmpty(),
        check("accountHolder", "accountHolder field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    registerTecopayAccount
);

routerConfigAdmin.delete(
    "/configurations/tecopay",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteTecopayAccount
);

routerConfigAdmin.patch(
    "/configurations/sensible",
    [
        originValidator(["Tecopos-Admin"]),
        check("configs", "configs field is missing").not().isEmpty(),
        check("configs", "configs field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editMySensibleConfigurations
);

routerConfigAdmin.get(
    "/configurations",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getMySensibleConfigurations
);

export default routerConfigAdmin;
