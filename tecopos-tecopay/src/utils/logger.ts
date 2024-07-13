import winston from "winston";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

const { combine, timestamp, json, errors } = winston.format;

const logtail = new Logtail(process.env.LOG_TAIL || "");

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.APP_ENV || "development";
    const isDevelopment = env === "development";
    return isDevelopment ? "debug" : "info";
};

const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

const Logger = winston.createLogger({
    level: level(),
    levels,
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [
        new winston.transports.Console(),
        new LogtailTransport(logtail),
    ],
});

export default Logger;