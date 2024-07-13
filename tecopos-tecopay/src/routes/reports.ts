import { Router } from "express";
import { getTotals } from "../controllers/reports";

const reportsRouter = Router();

reportsRouter.get("/totals", getTotals);




export default reportsRouter;