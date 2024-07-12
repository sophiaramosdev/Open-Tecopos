import { Router } from "express";
import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";

import { jwtValidator } from "../middlewares/jwtValidator";
import { check } from "express-validator";
import Client from "../database/models/client";
import { originValidator } from "../middlewares/originValidator";
import { businessValidator } from "../middlewares/businessValidator";
import { allowedPlans } from "../middlewares/allowedPlans";
import {
    addClient,
    addClientAndAssignToOrder,
    createCustomerCategory,
    deleteCustomerCategory,
    editClient,
    editClientAndAssignToOrder,
    findAllClients,
    getAllCustomerCategories,
    getClient,
    removeClient,
    updateCustomerCategory,
} from "../controllers/customer";
import { allowedRoles } from "../middlewares/allowedRoles";

const routerCustomer = Router();

//Clients
routerCustomer.post(
    "/",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("firstName", "firstName field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Client, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addClient
);
routerCustomer.post(
    "/order/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("firstName", "firstName field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Client, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    addClientAndAssignToOrder
);
routerCustomer.patch(
    "/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(Client, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editClient
);

routerCustomer.get(
    "/:id",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getClient
);

routerCustomer.patch(
    "/:id/order/:orderId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(Client, ["address", "phones"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editClientAndAssignToOrder
);
routerCustomer.delete(
    "/:id",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    removeClient
);
routerCustomer.get(
    "/",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SHIFT",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllClients
);
routerCustomer.post(
    "/categories/customer",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    createCustomerCategory
);
routerCustomer.get(
    "/categories/customer",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllCustomerCategories
);
routerCustomer.patch(
    "/categories/customer/:id",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
            "MARKETING_SALES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    updateCustomerCategory
);
routerCustomer.delete(
    "/categories/customer/:id",
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
            "GROUP_OWNER",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "WEITRESS",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_CUSTOMERS",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteCustomerCategory
);

export default routerCustomer;
