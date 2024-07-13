import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import db from "./database/conecction";
import { routes } from "./routes";
import Logger from "./utils/logger";
import multer from "multer";
import path from "path";
import { createServer } from "http";
import { Server as socketIO } from "socket.io";

class Server {
  private app: Application;
  private port: string;
  private server: any;
  public io: InstanceType<typeof socketIO>;

  constructor() {
    this.app = express();

    this.port = process.env.PORT || "5002";

    this.server = createServer(this.app);

    this.io = new socketIO(this.server, {
      cors: { origin: "http://localhost:3000" },
    });

    this.dbConnection();

    this.middlewares();

    routes(this.app);
  }

  async dbConnection() {
    try {
      if (process.env.DB_FORCE_UPDATE === "true") {
        await db.sync({ alter: true });
        console.log("DB forced successfully");
      } else {
        await db.authenticate();
        console.log("Database Sync sucessfully");
      }
      Logger.info("Database Sync sucessfully");
    } catch (error: any) {
      Logger.error(error);
    }
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../public")));
    // MULTER STORAGE
    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    this.app.use(upload.single("file"));
    this.app.use((req: any, _, next: NextFunction) => {
      req.socket = this.io;
      next();
    });
  }

  listen() {
    this.server.listen(this.port, () => {
      console.log(`Server running on port: ${this.port}`);
    });
  }
}



export default Server;
