import { Router } from "express";

import { originValidator } from "../../middlewares/originValidator";
import { findAllRegions } from "../../controllers/shop/shipping";
import { marketPlaceBusinessValidator } from "../../middlewares/marketPlaceBusinessValidator";
import { marketPlaceAccessValidator } from "../../middlewares/marketPlaceAccessValidator";

const routerMarketplaceShipping = Router();

routerMarketplaceShipping.get(
    "/region",
    [
        originValidator(["Tecopos-Marketplace"]),
        marketPlaceBusinessValidator(),
        marketPlaceAccessValidator(),
    ],
    findAllRegions
);

export default routerMarketplaceShipping;
