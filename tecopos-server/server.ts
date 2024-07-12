import express, { Application } from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import morgan from "morgan";

import { routes } from "./src/routes";
import db from "./src/database/connection";
import { socketController } from "./src/sockets/controllers";
import Logger from "./src/lib/logger";

class Server {
    private app: Application;
    private port: string;
    private server: any;
    private io: any;

    constructor() {
        this.app = express();
        this.port = process.env.PORT || "8000";

        this.server = require("http").createServer(this.app);
        this.io = require("socket.io")(this.server);

        this.dbConnection();

        this.sockets();

        this.middlewares();
        routes(this.app);

        //Default path, move to folder structure
        this.app.get("/", function (req, res) {
            res.send(
                "Ummm... creo que estás tratando de entrar a un área no permitida."
            );
        });

        (global as any).socket = this.io;
    }

    async dbConnection() {
        try {
            if (process.env.DB_FORCE_UPDATE === "true") {
                await db.sync({ alter: true });
            } else {
                await db.authenticate();
            }
            Logger.info("Database Sync sucessfully");
        } catch (error: any) {
            Logger.error(error);
            throw new Error(error);
        }
    }

    middlewares() {
        // CORS
        this.app.use(cors());

        // Body parser
        this.app.use(express.json());

        if (process.env.MODE === "local") {
            // Public folder
            const dir = path.join(__dirname, "../dist/public");
            this.app.use(express.static(dir));
        }

        //File uploads
        this.app.use(
            fileUpload({
                useTempFiles: true,
                tempFileDir: "/tmp/",
                createParentPath: true,
            })
        );

        //Attaching io to req
        this.app.use((req: any, res, next) => {
            req.io = this.io;
            next();
        });

        //Configuring Morgan
        const morganMiddleware = morgan(
            ":method :url :status :res[content-length] - :response-time ms",
            {
                stream: {
                    write: message => Logger.http(message.trim()),
                },
            }
        );

        this.app.use(morganMiddleware);
    }

    sockets() {
        this.io.on("connection", socketController);
    }

    listen() {
        this.server.listen(this.port, () => {
            Logger.info("Server running on port: " + this.port);
        });
    }
}

export default Server;
