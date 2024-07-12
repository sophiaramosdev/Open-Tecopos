import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import Area from "../../database/models/area";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    deleteFundDestination,
    deleteShareArea,
    editFundDestination,
    findAllFundDestinations,
    findAllSharedAreas,
    getMySharedAreas,
    manageManufacturerInAreaProduction,
    manageProductsInAreaSale,
    newFundDestination,
    shareArea,
} from "../../controllers/administration/area";

import {
    deleteArea,
    editArea,
    findAllAreas,
    getArea,
    newArea,
} from "../../controllers/administration/area";
import FundDestination from "../../database/models/fundDestination";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerArea = Router();

//Area
routerArea.post(
    "/area",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("name", "name field is missing").not().isEmpty(),
        check("type", "type field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Area, ["categories", "images", "stockAreaId"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newArea
);
routerArea.patch(
    "/area/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(Area, ["categories", "images"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editArea
);

routerArea.patch(
    "/area-sale/products/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        attReceivedValidator(Area, ["categories"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageProductsInAreaSale
);

routerArea.patch(
    "/area-manufacturer/products/:id",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        check("products", "products field is missing").not().isEmpty(),
        check("products", "products is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageManufacturerInAreaProduction
);

routerArea.delete(
    "/area/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteArea
);
routerArea.get(
    "/area/:id",
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
    getArea
);
routerArea.get(
    "/area",
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
    findAllAreas
);

routerArea.get(
    "/sharedarea",
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
    findAllSharedAreas
);

routerArea.post(
    "/sharedarea",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("businessDNI", "businessDNI field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    shareArea
);

routerArea.delete(
    "/sharedarea/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteShareArea
);

routerArea.get(
    "/my-shared-area",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getMySharedAreas
);

//Fund destination
routerArea.post(
    "/funddestination",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        check("accountId", "accountId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(FundDestination, ["accountAddress"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newFundDestination
);
routerArea.patch(
    "/funddestination/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        attReceivedValidator(FundDestination),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editFundDestination
);
routerArea.get(
    "/funddestination/:areaId",
    [
        originValidator([
            "Tecopos-Admin",
            "Tecopos",
            "Tecopos-Management",
            "Tecopos-Terminal",
        ]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllFundDestinations
);
routerArea.delete(
    "/funddestination/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["OWNER", "ADMIN"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteFundDestination
);

export default routerArea;
