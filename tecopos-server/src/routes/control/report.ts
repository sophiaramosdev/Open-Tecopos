import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
    getGeneralBussinessReport,
    getReportBusinessRegistered,
    getSummaryReport,
} from "../../controllers/control/report";

const routerReportControl = Router();

//Business
routerReportControl.get(
    "/business-registration/:mode",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getReportBusinessRegistered
);

routerReportControl.get(
    "/general/:id",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getGeneralBussinessReport
);

routerReportControl.get(
    "/summary",
    [originValidator(["Tecopos-Alma"]), jwtValidator, allowedRoles([])],
    getSummaryReport
);

export default routerReportControl;
