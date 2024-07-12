import { Router } from "express";
import { check } from "express-validator";

import {
    editMyUser,
    editUser,
    findAllManagedByUsers,
    findAllUser,
    findGlobalUsers,
    getAdministrationRoles,
    getAllRoles,
    getMyUser,
    getUserById,
    isEmailAvailable,
    isUsernameAvailable,
    logIn,
    logOut,
    newUser,
    refreshToken,
    registerBusinessInDevice,
} from "../controllers/security";
import User from "../database/models/user";
import { attReceivedValidator } from "../middlewares/attReceivedValidator";
import { fieldValidator } from "../middlewares/fieldValidator";
import { jwtValidator } from "../middlewares/jwtValidator";
import { allowedRoles } from "../middlewares/allowedRoles";
import { deleteUser, findAllUserToLogin } from "../controllers/security";
import { originValidator } from "../middlewares/originValidator";
import { businessValidator } from "../middlewares/businessValidator";
import { allowedPlans } from "../middlewares/allowedPlans";

const routerSecurity = Router();

//Authentication
routerSecurity.post(
    "/login",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Alma",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
            "Tecopos-Terminal",
            "Tecopos-Marketplace",
        ]),
    ],
    logIn
);
routerSecurity.post(
    "/registerBusinessInDevice",
    [originValidator(["Tecopos", "Tecopos-Terminal"])],
    registerBusinessInDevice
);

routerSecurity.post(
    "/check/email",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos-Management",
            "Tecopos",
            "Tecopos-Alma",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
        ]),
        check("email", "email field is missing").not().isEmpty(),
        fieldValidator,
    ],
    isEmailAvailable
); //Public route

routerSecurity.post(
    "/check/username",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos-Management",
            "Tecopos",
            "Tecopos-Alma",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
        ]),
        check("username", "username field is missing").not().isEmpty(),
        fieldValidator,
    ],
    isUsernameAvailable
); //Public route

routerSecurity.post("/logout", [jwtValidator], logOut);
routerSecurity.post(
    "/refresh-token",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos-Management",
            "Tecopos",
            "Tecopos-Alma",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
            "Tecopos-Terminal",
            "Tecopos-Marketplace",
        ]),
        check("refresh_token", "refresh_token field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
    ],
    refreshToken
);

//User
routerSecurity.post(
    "/user",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("username", "El campo username es obligatorio proporcionarlo.")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(User, [
            "roles",
            "allowedStockAreas",
            "allowedSalesAreas",
            "allowedManufacturerAreas",
            "allowedAccessPointAreas",
            "sendMail",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
    ],
    newUser
);

routerSecurity.patch(
    "/user/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(User, [
            "roles",
            "allowedStockAreas",
            "allowedSalesAreas",
            "allowedManufacturerAreas",
            "allowedAccessPointAreas",
        ]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
    ],
    editUser
);

routerSecurity.patch(
    "/user",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(true),
    ],
    editMyUser
);

routerSecurity.delete(
    "/user/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles(["ADMIN", "OWNER"]),
    ],
    deleteUser
);
routerSecurity.get(
    "/user",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Alma",
            "Tecopos-Management",
            "Tecopos-Shop",
            "Tecopos-ShopApk",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(true),
    ],
    getMyUser
);

routerSecurity.get(
    "/user/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles(["ADMIN", "OWNER"]),
    ],
    getUserById
);

routerSecurity.get(
    "/users/:businessId",
    [originValidator(["Tecopos", "Tecopos-Terminal"])],
    findAllUserToLogin
);

routerSecurity.get(
    "/users",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "GROUP_OWNER",
            "ADMIN",
            "OWNER",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_HUMAN_RESOURCES",
            "MARKETING_SALES",
            "ANALYSIS_REPORT",
        ]),
    ],
    findAllUser
);

//Created for obtaingn all users allowed to managedbyandorder
routerSecurity.get(
    "/finder/users/managedby",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        allowedRoles([
            "GROUP_OWNER",
            "ADMIN",
            "OWNER",
            "MANAGER_SHOP_ONLINE",
            "MANAGER_SALES",
            "MANAGER_BILLING",
            "MANAGER_HUMAN_RESOURCES",
            "MARKETING_SALES",
            "ANALYSIS_REPORT",
        ]),
    ],
    findAllManagedByUsers
);

routerSecurity.get(
    "/global/users",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findGlobalUsers
);

routerSecurity.get(
    "/roles",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getAllRoles
);

routerSecurity.get(
    "/roles/admin",
    [originValidator(["Tecopos-Admin"]), jwtValidator],
    getAdministrationRoles
);

export default routerSecurity;
