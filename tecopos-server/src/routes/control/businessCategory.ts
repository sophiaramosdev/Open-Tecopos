import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    deleteBusinessCategory,
    editBusinessCategory,
    newBusinessCategory,
} from "../../controllers/control/businessCategory";
import BusinessCategory from "../../database/models/businessCategory";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { findAllBusinessCategories } from "../../controllers/public";

const routerBusinessCategory = Router();

//Business category
routerBusinessCategory.post(
    "/businesscategory",
    [
        originValidator(["Tecopos-Alma"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([]),
    ],
    newBusinessCategory
);
routerBusinessCategory.patch(
    "/businesscategory/:id",
    [
        originValidator(["Tecopos-Alma"]),
        attReceivedValidator(BusinessCategory),
        jwtValidator,
        allowedRoles([]),
    ],
    editBusinessCategory
);
routerBusinessCategory.delete(
    "/businesscategory/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteBusinessCategory
);
routerBusinessCategory.get(
    "/businesscategory",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    findAllBusinessCategories
);

export default routerBusinessCategory;
