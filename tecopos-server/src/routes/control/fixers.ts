import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    populatePaymentGateways,
    populatingTotalToPay,
    recalculateOrdersCost,
    recalculateStockDisponibility,
    testerEndpoint,
} from "../../controllers/control/fixers";

const routerControlFixers = Router();

routerControlFixers.post(
    "/recalculate-cost",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    recalculateOrdersCost
);

routerControlFixers.post(
    "/recalculate-stock-disponibility",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    recalculateStockDisponibility
);

routerControlFixers.post(
    "/populating-to-pay",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    populatingTotalToPay
);

routerControlFixers.post(
    "/populating-gateways",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    populatePaymentGateways
);

//Testers
routerControlFixers.post(
    "/test",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    testerEndpoint
);

export default routerControlFixers;
