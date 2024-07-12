import { Router } from "express";
import { originValidator } from "../middlewares/originValidator";
import {
    checkEmailAvailabiliy,
    findAllBusinesses,
    findAllUser,
    getBusiness,
    getUserById,
    isTokenValid,
    registerUser,
    syncroCustomer,
} from "../controllers/server";
import { serverAccessValidator } from "../middlewares/serverAccessValidator";

const routerServerToServer = Router();

routerServerToServer.post(
    "/customer/syncronize",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    syncroCustomer
);

routerServerToServer.post(
    "/token/check",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    isTokenValid
);

routerServerToServer.post(
    "/checkemail",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    checkEmailAvailabiliy
);

routerServerToServer.post(
    "/user",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    registerUser
);

routerServerToServer.get(
    "/user",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    findAllUser
);

routerServerToServer.get(
    "/user/:id",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    getUserById
);

//Business
routerServerToServer.get(
    "/business/:id",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    getBusiness
);

routerServerToServer.get(
    "/business",
    [
        originValidator(["Ticket-Server", "Tecopay-Server"]),
        serverAccessValidator,
    ],
    findAllBusinesses
);

export default routerServerToServer;
