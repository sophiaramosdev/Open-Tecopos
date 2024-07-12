import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    deletePersonAccess,
    findAllAccessRecord,
    getAllUserPersonInBusiness,
    getDayAsistance,
    getLastMonthUserAccessRecords,
    getSummarizeHumanResources,
    newPersonAccess,
    registerAccess,
} from "../../controllers/administration/humanresource";

const routerHumanResource = Router();

routerHumanResource.post(
    "/access/person",
    [
        originValidator(["Tecopos"]),
        check("barCode", "barCode field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        // allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_ACCESS_POINT"]),
        // businessValidator(),
        // allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    getLastMonthUserAccessRecords
);

routerHumanResource.post(
    "/access",
    [
        originValidator(["Tecopos"]),
        check("barCode", "barCode field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        // allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_ACCESS_POINT"]),
        // businessValidator(),
        // allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    registerAccess
);

routerHumanResource.post(
    "/access/manual",
    [
        originValidator(["Tecopos-Admin"]),
        check("personId", "personId field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        check("registeredAt", "registeredAt field is missing").not().isEmpty(),
        check("recordType", "recordType field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newPersonAccess
);

routerHumanResource.delete(
    "/access/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deletePersonAccess
);

routerHumanResource.get(
    "/access",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllAccessRecord
);

routerHumanResource.post(
    "/access/report/assistance",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    getDayAsistance
);

routerHumanResource.get(
    "/access/inbusiness/:id",
    [
        originValidator(["Tecopos-Admin", "Tecopos"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_PRODUCTION",
            "CHIEF_PRODUCTION",
            "MANAGER_HUMAN_RESOURCES"
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    getAllUserPersonInBusiness
);

routerHumanResource.get(
    "/report/summarize",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getSummarizeHumanResources
);

export default routerHumanResource;
