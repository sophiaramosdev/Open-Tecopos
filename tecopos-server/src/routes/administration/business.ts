import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import Business from "../../database/models/business";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import {
    editMyBusiness,
    getMyBranches,
    getMyBusiness,
} from "../../controllers/administration/business";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerBusinessAdmin = Router();

routerBusinessAdmin.patch(
    "/business",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(Business, [
            "images",
            "address",
            "phones",
            "socialNetworks",
        ]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN"]),
        businessValidator(),
    ],
    editMyBusiness
);

routerBusinessAdmin.get(
    "/my-business/",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        businessValidator(),
    ],
    getMyBusiness
);

routerBusinessAdmin.get(
    "/my-branches",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(true),
    ],
    getMyBranches
);

export default routerBusinessAdmin;
