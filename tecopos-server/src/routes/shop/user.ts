import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { onlineAccessValidator } from "../../middlewares/onlineAccessValidator";
import {
    changePassword,
    deleteMyProfile,
    editMyAccessData,
    editMyUser,
    getMyUser,
    getMyUserV2,
    newUser,
    sendRecoveryCodePassword,
} from "../../controllers/shop/user";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { check } from "express-validator";
import { jwtValidator } from "../../middlewares/jwtValidator";

const routerShopUser = Router();

routerShopUser.post(
    "/register",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        onlineAccessValidator,
    ],
    newUser
);

routerShopUser.get(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    getMyUser
);

routerShopUser.get(
    "/v2",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    getMyUserV2
);

routerShopUser.delete(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    deleteMyProfile
);

routerShopUser.patch(
    "/client",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    editMyUser
);

routerShopUser.patch(
    "/",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        jwtValidator,
        onlineAccessValidator,
    ],
    editMyAccessData
);

routerShopUser.post(
    "/requestCodePassword",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        check("email", "El campo email no fue proporcionado").not().isEmpty(),
        fieldValidator,
        onlineAccessValidator,
    ],
    sendRecoveryCodePassword
);

routerShopUser.post(
    "/changepassword",
    [
        originValidator(["Tecopos-Shop", "Tecopos-ShopApk"]),
        check("email", "El campo email no fue proporcionado").not().isEmpty(),
        check("recoveryCode", "El campo recoveryCode no fue proporcionado")
            .not()
            .isEmpty(),
        check("password", "El campo password no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        onlineAccessValidator,
    ],
    changePassword
);

export default routerShopUser;
