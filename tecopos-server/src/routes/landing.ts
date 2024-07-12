import { Router } from "express";
import { check } from "express-validator";

import { originValidator } from "../middlewares/originValidator";
import { newBusiness } from "../controllers/landing";
import { fieldValidator } from "../middlewares/fieldValidator";

const routerLanding = Router();

//Business
routerLanding.post(
    "/business",
    [
        originValidator(["Tecopos-Landing"]),
        check("email", "El email proporcionado no es válido").isEmail(),
        check(
            "displayName",
            "El campo displayName es obligatorio proporcionarlo."
        )
            .not()
            .isEmpty(),
        check("name", "El campo name no fue proporcionado").not().isEmpty(),
        check("token", "El token de reCaptcha no fue proporcionado").not().isEmpty(),
        check("street", "El campo street no fue proporcionado").not().isEmpty(),
        check("locality", "El campo locality no fue proporcionado")
            .not()
            .isEmpty(),
        check("municipalityId", "El campo municipalityId no fue proporcionado")
            .not()
            .isEmpty(),
        check("provinceId", "El campo provinceId no fue proporcionado")
            .not()
            .isEmpty(),
        check("telephone", "El campo telephone no fue proporcionado")
            .not()
            .isEmpty(),
        check(
            "businessCategoryId",
            "El campo businessCategoryId no fue proporcionado"
        )
            .not()
            .isEmpty(),
        fieldValidator,
    ],
    newBusiness
);

export default routerLanding;
