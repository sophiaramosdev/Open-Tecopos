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
    deleteSalaryRule,
    editSalaryRule,
    findAllSalaryRules,
    processSalaryReport,
    newSalaryRule,
    findAllSalaryReports,
    deleteSalaryReport,
    getSalaryReport,
    editSalaryReportPerson,
    editSalaryReport,
    findAllSalary,
} from "../../controllers/administration/salary";
import SalaryRule from "../../database/models/salaryRule";

const routerSalary = Router();

routerSalary.post(
    "/rules",
    [
        originValidator(["Tecopos-Admin"]),
        check("name", "name field is missing").not().isEmpty(),
        check("postId", "postId field is missing").not().isEmpty(),
        check("personCategoryId", "personCategoryId field is missing")
            .not()
            .isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    newSalaryRule
);

routerSalary.patch(
    "/rules/:id",
    [
        originValidator(["Tecopos-Admin"]),
        attReceivedValidator(SalaryRule),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editSalaryRule
);
routerSalary.get(
    "/rules",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllSalaryRules
);

routerSalary.post(
    "/report/general",
    [
        originValidator(["Tecopos-Admin"]),
        check("startsAt", "startsAt field is missing").not().isEmpty(),
        check("endsAt", "endsAt field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    processSalaryReport
);

routerSalary.delete(
    "/rules/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deleteSalaryRule
);

routerSalary.get(
    "/historical",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllSalaryReports
);

routerSalary.delete(
    "/historical/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    deleteSalaryReport
);

routerSalary.get(
    "/historical/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    getSalaryReport
);

routerSalary.patch(
    "/historical/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editSalaryReport
);

routerSalary.patch(
    "/historical/salaryitem/:id",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    editSalaryReportPerson
);

routerSalary.get(
    "/:personId",
    [
        originValidator(["Tecopos-Admin"]),
        jwtValidator,
        allowedRoles(["ADMIN", "OWNER", "GROUP_OWNER", "MANAGER_SALARY_RULES"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
        // moduleValidator(["HUMAN_RESOURCE"]),
    ],
    findAllSalary
);

export default routerSalary;
