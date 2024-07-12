import { Router } from "express";
import { check } from "express-validator";
import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";
import { jwtValidator } from "../middlewares/jwtValidator";

import {
    newCurrency,
    editCurrency,
    deleteCurrency,
    findAllCurrencies,
    editConfigurationKey,
    newUser,
    editUser,
    deleteUser,
    getUserById,
    findAllUser,
    getMyUser,
    findAllBillingBusiness,
    newBusinessInvoice,
    getInvoice,
    requestChangePassword,
    getAllGeneralConfigs,
    checkConfigurationKeyInAllBusiness,
    findAllNextBusinessBilling,
    transformAllUsernames,
} from "../controllers/control";
import Currency from "../database/models/currency";
import { allowedRoles } from "../middlewares/allowedRoles";
import ConfigurationKey from "../database/models/configurationKey";
import { newConfigurationKey } from "../controllers/control";
import { originValidator } from "../middlewares/originValidator";
import User from "../database/models/user";
import { deleteInvoiceBussiness } from "../controllers/control";
import { getAllSubscriptionsPlan } from "../controllers/control";
import Billing from "../database/models/billing";

const routerControl = Router();

//Business
routerControl.get(
    "/configs",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getAllGeneralConfigs
);

//Billing
routerControl.get(
    "/billing/business/:businessId",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    findAllBillingBusiness
);

routerControl.get(
    "/billing/next-billing",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    findAllNextBusinessBilling
);

routerControl.post(
    "/billing/business/:businessId",
    [
        originValidator(["Tecopos-Alma"]),
        attReceivedValidator(Billing, ["price", "dateUntil", "promotion"]),
        jwtValidator,
        allowedRoles([]),
    ],
    newBusinessInvoice
);

routerControl.delete(
    "/billing/invoice/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteInvoiceBussiness
);

routerControl.get(
    "/billing/invoice/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getInvoice
);

//Currency
routerControl.post(
    "/currency/",
    [
        originValidator(["Tecopos-Alma"]),
        check("name", "name field is missing").not().isEmpty(),
        check("code", "code field is missing").not().isEmpty(),
        check("symbol", "symbol field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Currency),
        jwtValidator,
        allowedRoles([]),
    ],
    newCurrency
);
routerControl.patch(
    "/currency/:id",
    [
        originValidator(["Tecopos-Alma"]),
        attReceivedValidator(Currency),
        jwtValidator,
        allowedRoles([]),
    ],
    editCurrency
);
routerControl.delete(
    "/currency/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteCurrency
);
routerControl.get(
    "/currency/",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    findAllCurrencies
);

//Configurations
routerControl.post(
    "/config/business/",
    [
        check("key", "name field is missing").not().isEmpty(),
        check("value", "type field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(ConfigurationKey),
        jwtValidator,
    ],
    newConfigurationKey
);

routerControl.post(
    "/config/business/search-create",
    [
        check("key", "name field is missing").not().isEmpty(),
        check("isSensitive", "isSensitive field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(ConfigurationKey),
        jwtValidator,
    ],
    checkConfigurationKeyInAllBusiness
);

routerControl.patch(
    "/config/business/:id",
    [
        check("value", "type field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER"]),
    ],
    editConfigurationKey
);

//Users
routerControl.post(
    "/user",
    [
        originValidator(["Tecopos-Alma"]),
        check("email", "El email proporcionado no es válido").isEmail(),
        check("username", "El campo username es obligatorio proporcionarlo")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(User, ["roles"]),
        jwtValidator,
        allowedRoles([]),
    ],
    newUser
);
routerControl.patch(
    "/user/:id",
    [
        originValidator(["Tecopos-Alma"]),
        attReceivedValidator(User, ["roles"]),
        jwtValidator,
        allowedRoles([]),
    ],
    editUser
);
routerControl.delete(
    "/user/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteUser
);

routerControl.post(
    "/user/request-password",
    [
        originValidator(["Tecopos-Alma"]),
        check("email", "El email proporcionado no es válido").isEmail(),
        fieldValidator,
        jwtValidator,
        allowedRoles([]),
    ],
    requestChangePassword
);

routerControl.get(
    "/user/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getUserById
);

routerControl.get(
    "/user",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getMyUser
);

routerControl.get(
    "/users",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    findAllUser
);

routerControl.post(
    "/transform-users",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    transformAllUsernames
);

//SubscriptionPlans
routerControl.get(
    "/billing/subscriptions",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getAllSubscriptionsPlan
);

export default routerControl;
