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
    deletePage,
    deleteTv,
    editPage,
    editTv,
    findAllPagesInTv,
    findAllSequences,
    findAllTemplates,
    findAllTvs,
    getPage,
    getTv,
    newPage,
    newTv,
} from "../../controllers/tv/admin";
import Tv from "../../database/models/tv";
import Page from "../../database/models/page";

const routerTvAdmin = Router();

routerTvAdmin.post(
    "/admin",
    [
        originValidator(["Tecopos-Admin"]),
        check("name", "name field is missing").not().isEmpty(),
        check("sequenceId", "sequenceId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newTv
);
routerTvAdmin.patch(
    "/admin/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(Tv),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editTv
);
routerTvAdmin.get(
    "/admin",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllTvs
);
routerTvAdmin.delete(
    "/admin/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deleteTv
);

routerTvAdmin.get(
    "/admin/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getTv
);

routerTvAdmin.get(
    "/admin/templates",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllTemplates
);

routerTvAdmin.get(
    "/admin/sequences",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllSequences
);

//Pages
routerTvAdmin.post(
    "/admin/:id/pages",
    [
        originValidator(["Tecopos-Admin"]),
        check("templateId", "templateId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    newPage
);
routerTvAdmin.patch(
    "/admin/pages/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(Page),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    editPage
);
routerTvAdmin.get(
    "/admin/:id/pages",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllPagesInTv
);
routerTvAdmin.delete(
    "/admin/pages/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    deletePage
);

routerTvAdmin.get(
    "/admin/pages/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "MANAGER_TV"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getPage
);

export default routerTvAdmin;
