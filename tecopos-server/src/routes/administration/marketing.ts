import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    deleteCoupon,
    editCoupon,
    findAllCoupons,
    getCoupon,
    newCoupon,
} from "../../controllers/administration/marketing";
import Coupon from "../../database/models/coupon";

const routerMarketing = Router();

routerMarketing.post(
    "/coupon",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("code", "code field is missing").not().isEmpty(),
        check("discountType", "type field is missing").not().isEmpty(),
        check("amount", "amount field is missing").not().isEmpty(),
        check("codeCurrency", "code field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newCoupon
);
routerMarketing.patch(
    "/coupon/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Coupon, [
            "allowedProducts",
            "excludedProducts",
            "allowedSalesCategories",
            "excludedSalesCategories",
        ]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editCoupon
);

routerMarketing.get(
    "/coupon/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getCoupon
);

routerMarketing.get(
    "/coupon",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllCoupons
);
routerMarketing.delete(
    "/coupon/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteCoupon
);

export default routerMarketing;
