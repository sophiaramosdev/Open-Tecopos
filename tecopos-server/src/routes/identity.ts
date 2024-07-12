import { Router } from "express";
import { check } from "express-validator";

import { fieldValidator } from "../middlewares/fieldValidator";
import { jwtValidator } from "../middlewares/jwtValidator";
import { originValidator } from "../middlewares/originValidator";
import {
    deleteMyUser,
    editMyUser,
    getMyUser,
    isEmailAvailable,
    isTokenValid,
    isUsernameAvailable,
    logIn,
    logOut,
    refreshToken,
    registerUser,
} from "../controllers/identity";

const routerIdentity = Router();

//Authentication
routerIdentity.post(
    "/login",
    [
        originValidator([
            "Tecopos-Marketplace",
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
    ],
    logIn
);

routerIdentity.post(
    "/check/email",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        check("email", "email field is missing").not().isEmpty(),
        fieldValidator,
    ],
    isEmailAvailable
);

routerIdentity.post(
    "/check/username",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        check("username", "username field is missing").not().isEmpty(),
        fieldValidator,
    ],
    isUsernameAvailable
);

routerIdentity.post(
    "/logout",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        jwtValidator,
    ],
    logOut
);

routerIdentity.post(
    "/refresh-token",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        check("refresh_token", "refresh_token field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
    ],
    refreshToken
);

//User
routerIdentity.post(
    "/user/register",
    [
        originValidator(["Tecopos-Tecopay", "Tecopos-Ticket"]),
        check("email", "El campo username es obligatorio proporcionarlo.")
            .not()
            .isEmpty(),
        check("password", "El campo password es obligatorio proporcionarlo.")
            .not()
            .isEmpty(),
        fieldValidator,
    ],
    registerUser
);

routerIdentity.patch(
    "/user",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        jwtValidator,
    ],
    editMyUser
);

routerIdentity.post(
    "/token/check",
    [originValidator(["Tecopos-Tecopay", "Tecopos-Ticket"])],
    isTokenValid
);

routerIdentity.delete(
    "/user",
    [
        originValidator([
            "Tecopos-Marketplace",
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        jwtValidator,
    ],
    deleteMyUser
);

routerIdentity.get(
    "/user",
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
            "Tecopos-Tecopay",
            "Tecopos-Ticket",
        ]),
        jwtValidator,
    ],
    getMyUser
);

export default routerIdentity;
