import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    editPaymentGateway,
    findAllPaymentGateway,
    getPaymentGateway,
} from "../../controllers/administration/paymentGateways";
import PaymentGateway from "../../database/models/paymentGateway";

const routerAdminPaymentgateway = Router();

routerAdminPaymentgateway.get(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getPaymentGateway
);

routerAdminPaymentgateway.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(PaymentGateway),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editPaymentGateway
);
routerAdminPaymentgateway.get(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Terminal"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllPaymentGateway
);

export default routerAdminPaymentgateway;
