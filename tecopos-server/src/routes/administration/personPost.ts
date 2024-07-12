import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../../middlewares/originValidator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";

import { allowedRoles } from "../../middlewares/allowedRoles";
import PersonPost from "../../database/models/personPost";
import {
    deletePersonPost,
    editPersonPost,
    findAllPersonPosts,
    newPersonPost,
} from "../../controllers/administration/personPost";

const routerPersonPost = Router();

routerPersonPost.post(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        check("name", "name field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newPersonPost
);
routerPersonPost.patch(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(PersonPost),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editPersonPost
);
routerPersonPost.get(
    "/",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllPersonPosts
);

routerPersonPost.delete(
    "/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_HUMAN_RESOURCES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deletePersonPost
);

export default routerPersonPost;
