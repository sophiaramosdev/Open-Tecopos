import dotenv from "dotenv";
import cron from "node-cron";
import { createClient } from "redis";

import Server from "./server";

import {
    halfHourlyChecker,
    hourlyChecker,
    systemChecker,
} from "./src/bull-queue/cronController";
import Logger from "./src/lib/logger";
import moment from "moment";

//DOTENV configuration
dotenv.config();

const server = new Server();

//Defining cron tasks
//At beging of day 00:00
cron.schedule("0 0 0 * * *", function () {
    systemChecker();
});

//Every one hour
cron.schedule("0 * * * *", function () {
    hourlyChecker();
});

//Every 30 minutes
cron.schedule("30 * * * *", function () {
    halfHourlyChecker();
});

//Initalizating redis server
export const redisClient = createClient();

(async () => {
    redisClient.on("error", err => {
        Logger.error("Redis Client Error", err);
    });
    redisClient.on("ready", () => Logger.info("Redis is ready"));
    await redisClient.connect();
    await redisClient.ping();
})();

moment.updateLocale("es", {
    week: {
        dow: 0,
        doy: 6,
    },
});

server.listen();
