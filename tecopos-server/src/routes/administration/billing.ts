import { Router } from "express";
import {
    findAllMyBilling,
    getInvoice,
} from "../../controllers/administration/billing";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { originValidator } from "../../middlewares/originValidator";
import { businessValidator } from "../../middlewares/businessValidator";

const routerBilling = Router();

routerBilling.get(
    "/billing/invoice",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "GROUP_OWNER"]),
        businessValidator(),
    ],
    findAllMyBilling
);
routerBilling.get(
    "/billing/invoice/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "GROUP_OWNER"]),
        businessValidator(),
    ],
    getInvoice
);

export default routerBilling;
