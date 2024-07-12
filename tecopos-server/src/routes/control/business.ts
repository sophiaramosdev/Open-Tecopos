import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { attReceivedValidator } from "../../middlewares/attReceivedValidator";
import Business from "../../database/models/business";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    checkBusinessDNI,
    checkBusinessSlug,
    checkQuantityProductConsistency,
    deleteBusinessBranch,
    editBusiness,
    getAllBusinessBranches,
    newBusiness,
    newBusinessBranch,
} from "../../controllers/control/business";
import {
    deleteBusiness,
    editBusinessConfigurations,
    findAllBusinesses,
    getBusiness,
} from "../../controllers/control";
import BusinessBranch from "../../database/models/businessBranch";

const routerBusinessControl = Router();

//Business
routerBusinessControl.post(
    "/business/",
    [
        originValidator(["Tecopos-Alma"]),
        check("name", "El campo name no fue proporcionado").not().isEmpty(),
        check("type", "El campo type no fue proporcionado").not().isEmpty(),
        check("dni", "El campo dni no fue proporcionado").not().isEmpty(),
        check("slug", "El campo slug no fue proporcionado").not().isEmpty(),
        fieldValidator,
        attReceivedValidator(Business, ["images", "subscriptionPlanPrice"]),
        jwtValidator,
        allowedRoles([]),
    ],
    newBusiness
);
routerBusinessControl.patch(
    "/business/:id",
    [
        originValidator(["Tecopos-Alma"]),
        attReceivedValidator(Business, ["images", "subscriptionPlanPrice"]),
        jwtValidator,
        allowedRoles([]),
    ],
    editBusiness
);
routerBusinessControl.delete(
    "/business/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteBusiness
);
routerBusinessControl.get(
    "/business/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getBusiness
);

routerBusinessControl.get(
    "/business/",
    [
        originValidator(["Tecopos-Alma", "Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["OWNER", "GROUP_OWNER", "ADMIN"]),
    ],
    findAllBusinesses
);

routerBusinessControl.get(
    "/business/:id/branches",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getAllBusinessBranches
);

routerBusinessControl.post(
    "/business/:id/branches",
    [
        originValidator(["Tecopos-Alma"]),
        check("branchId", "El campo branchId no fue proporcionado")
            .not()
            .isEmpty(),
        fieldValidator,
        attReceivedValidator(BusinessBranch, ["businessId"]),
        jwtValidator,
        allowedRoles([]),
    ],
    newBusinessBranch
);

routerBusinessControl.delete(
    "/business/:businessId/branches/:branchId",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    deleteBusinessBranch
);

routerBusinessControl.post(
    "/check/slug",
    [
        originValidator(["Tecopos-Alma"]),
        check("slug", "slug field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([]),
    ],
    checkBusinessSlug
);

routerBusinessControl.post(
    "/check/dni",
    [
        originValidator(["Tecopos-Alma"]),
        check("dni", "dni field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles([]),
    ],
    checkBusinessDNI
);

routerBusinessControl.get(
    "/checker/product",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    checkQuantityProductConsistency
);

routerBusinessControl.patch(
    "/configurations/:businessId",
    [
        originValidator(["Tecopos-Alma"]),
        check("configs", "configs field is missing").not().isEmpty(),
        check("configs", "configs field is not an array").isArray(),
        fieldValidator,
        jwtValidator,
        allowedRoles([]),
    ],
    editBusinessConfigurations
);

export default routerBusinessControl;
