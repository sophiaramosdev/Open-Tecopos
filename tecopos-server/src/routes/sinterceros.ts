import { Router } from "express";
import { originValidator } from "../middlewares/originValidator";
import { findAllBusinesses, findAllProducts } from "../controllers/sinterceros";

const routerSinTerceros = Router();

routerSinTerceros.get(
    "/products",
    [originValidator(["Tecopos-SinTerceros"])],
    findAllProducts
);

routerSinTerceros.get(
    "/business",
    [originValidator(["Tecopos-SinTerceros"])],
    findAllBusinesses
);

export default routerSinTerceros;
