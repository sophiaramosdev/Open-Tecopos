import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { check } from "express-validator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import {
    changePassword,
    deleteMyProfile,
    editMyUser,
    getMyUser,
    newUser,
    sendRecoveryCodePassword,
} from "../../controllers/marketplace/user";
import { marketPlaceAccessValidator } from "../../middlewares/marketPlaceAccessValidator";
import { marketPlaceBusinessValidator } from "../../middlewares/marketPlaceBusinessValidator";

const routerMarketPlaceUser = Router();

routerMarketPlaceUser.post(
    "/register",
    [
        originValidator(["Tecopos-Marketplace"]),
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    newUser
);

routerMarketPlaceUser.get(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    getMyUser
);

routerMarketPlaceUser.delete(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    deleteMyProfile
);

routerMarketPlaceUser.patch(
    "/",
    [
        originValidator(["Tecopos-Marketplace"]),
        jwtValidator,
        marketPlaceAccessValidator(),
        marketPlaceBusinessValidator(),
    ],
    editMyUser
);

routerMarketPlaceUser.post(
    "/requestCodePassword",
    [
        originValidator(["Tecopos-Marketplace"]),
        check("email", "El campo email no fue proporcionado").not().isEmpty(),
        fieldValidator,
        marketPlaceAccessValidator(),
    ],
    sendRecoveryCodePassword
);

routerMarketPlaceUser.post(
    "/changepassword",
    [
        originValidator(["Tecopos-Marketplace"]),
        check("email", "El campo email no fue proporcionado").not().isEmpty(),
        check("recoveryCode", "El campo recoveryCode no fue proporcionado")
            .not()
            .isEmpty(),
        check("password", "El campo password no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        marketPlaceAccessValidator(),
    ],
    changePassword
);

export default routerMarketPlaceUser;
