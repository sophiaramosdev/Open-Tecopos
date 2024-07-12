import { Router } from "express";
import { originValidator } from "../../middlewares/originValidator";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedPlans } from "../../middlewares/allowedPlans";
import {
    findAllAccessPointTickets,
    getAllPendingTickets,
    getHistorialTicketsProcessed,
    manageAccessPointTicket,
    revokeAccessPointTicket,
} from "../../controllers/accesspoint/exit";
import { check } from "express-validator";
import { fieldValidator } from "../../middlewares/fieldValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";

const routerExit = Router();

routerExit.get(
    "/exit/ticket",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_ACCESS_POINT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    findAllAccessPointTickets
);

routerExit.patch(
    "/exit/ticket",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        check("ticketId", "ticketId field is missing").not().isEmpty(),
        check("action", "action field is missing").not().isEmpty(),
        check("areaId", "areaId field is missing").not().isEmpty(),
        fieldValidator,
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_ACCESS_POINT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    manageAccessPointTicket
);

routerExit.delete(
    "/exit/ticket/:ticketId",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_ACCESS_POINT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    revokeAccessPointTicket
);

routerExit.get(
    "/exit/tickets/pending",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_ACCESS_POINT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getAllPendingTickets
);

routerExit.get(
    "/exit/tickets/historial/:areaId",
    [
        originValidator(["Tecopos-Admin", "Tecopos", "Tecopos-Management"]),
        jwtValidator,
        allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "MANAGER_ACCESS_POINT"]),
        businessValidator(),
        allowedPlans(["CUSTOM", "STANDARD", "FULL", "POPULAR"]),
    ],
    getHistorialTicketsProcessed
);

export default routerExit;
