import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";
import FixedCostCategory from "../../database/models/fixedCostCategory";
import {
    addaBatchToBuyedReceipt,
    deleteBatchFromBuyed,
    cancelBuyedReceipt,
    deleteFixedCost,
    editBatchFromBuyed,
    editBuyedReceipt,
    editFixedCost,
    extractCostsFromBankAccount,
    findAllBuyedReceipt,
    findAllBuyedReceiptFixedCost,
    generateADispatch,
    getBuyedReceipt,
    newBuyedReceipt,
    newFixedCost,
} from "../../controllers/administration/buyedReceipt";
import BuyedReceiptFixedCost from "../../database/models/buyedReceiptFixedCost";
import BuyedReceipt from "../../database/models/buyedReceipt";

const routerBuyedReceipt = Router();

//Buyed Receipt
routerBuyedReceipt.post(
    "/",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("batches", "products field is missing").not().isEmpty(),
        check("batches", "products field is missing").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newBuyedReceipt
);

routerBuyedReceipt.post(
    "/movetoaccount/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    extractCostsFromBankAccount
);

routerBuyedReceipt.post(
    "/newdispatch/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    generateADispatch
);

routerBuyedReceipt.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(BuyedReceipt),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editBuyedReceipt
);
routerBuyedReceipt.get(
    "/",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllBuyedReceipt
);

routerBuyedReceipt.get(
    "/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getBuyedReceipt
);

routerBuyedReceipt.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    cancelBuyedReceipt
);

//Fixed Costs
routerBuyedReceipt.post(
    "/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        check("registeredPrice", "registeredPrice field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(BuyedReceiptFixedCost),
        jwtValidator,
        allowedRoles(["OWNER", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newFixedCost
);

routerBuyedReceipt.patch(
    "/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(BuyedReceiptFixedCost),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editFixedCost
);

routerBuyedReceipt.get(
    "/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllBuyedReceiptFixedCost
);

routerBuyedReceipt.delete(
    "/fixedcost/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteFixedCost
);

routerBuyedReceipt.post(
    "/batch/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addaBatchToBuyedReceipt
);

routerBuyedReceipt.patch(
    "/batch/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editBatchFromBuyed
);
routerBuyedReceipt.delete(
    "/batch/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN", "BUYER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteBatchFromBuyed
);

export default routerBuyedReceipt;
