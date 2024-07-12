import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { getTv } from "../../controllers/tv/customer";

const routerTvCustomer = Router();

routerTvCustomer.get(
    "/customer/:code",
    [originValidator(["Tecopos-Tv"])],
    getTv
);

export default routerTvCustomer;
