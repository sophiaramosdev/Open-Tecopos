import { Application, Router } from "express";
import cardRouter from "./card";
import entityRouter from "./entity";
import accountRouter from "./account";
import myAccountsRouter from "./myAccount";
import userRouter from "./user";
import rolesRouter from "./roles";
import businessRouter from "./business";
import cardRequestRouter from "./cardRequest";
import imageRouter from "./image";
import { verifyAccess } from "../middlewares/security";
import firebaseRouter from "./firebase";
import reportsRouter from "./reports";

const routers: Record<string, Router> = {
  card: cardRouter,
  cardRequest: cardRequestRouter,
  entity: entityRouter,
  account: accountRouter,
  myAccounts: myAccountsRouter,
  user: userRouter,
  roles: rolesRouter,
  business: businessRouter,
  image: imageRouter,
  firebase: firebaseRouter,
  reports:reportsRouter
};

export const routes = (app: Application) => {
  for (const [route, controller] of Object.entries(routers)) {
    app.use(`/${route}`, verifyAccess, controller);
  }
};
