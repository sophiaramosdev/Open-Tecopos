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
    deletePerson,
    deletePersonRecord,
    editPerson,
    findAllPeople,
    findAllPersonRecord,
    getPerson,
    newPerson,
    newPersonRecord,
    reducePerson,
} from "../../controllers/administration/person";
import { moduleValidator } from "../../middlewares/moduleValidator";

const routerPerson = Router();

routerPerson.post(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        check("firstName", "firstName field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newPerson
);
routerPerson.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editPerson
);

routerPerson.patch(
    "/low/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    reducePerson
);

routerPerson.get(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllPeople
);

routerPerson.get(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    getPerson
);

routerPerson.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deletePerson
);

routerPerson.post(
    "/record/:id",
    [
        originValidator(["Tecopos-Admin"]),
        check("observations", "observations field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newPersonRecord
);

routerPerson.get(
    "/record/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllPersonRecord
);

routerPerson.delete(
    "/record/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles([
            "ADMIN",
            "OWNER",
            "GROUP_OWNER",
            "MANAGER_HUMAN_RESOURCES",
        ]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deletePersonRecord
);

export default routerPerson;
