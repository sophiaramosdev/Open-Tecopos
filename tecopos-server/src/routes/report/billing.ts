import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";
import { listFinancialReportInEconomicCycle } from "../../controllers/report/billing";

const routerReportBilling = Router();

routerReportBilling.post(
    "/list/financial",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("economicCycleId", "economicCycleId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "ANALYSIS_REPORT", "MANAGER_BILLING"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    listFinancialReportInEconomicCycle
);

export default routerReportBilling;
