import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import Logger from "../../lib/logger";
import User from "../../database/models/user";
import Business from "../../database/models/business";
import ConfigurationKey from "../../database/models/configurationKey";
import { processCoupons } from "../helpers/coupons";
import { internalCheckerResponse } from "../../helpers/utils";
import { getBusinessConfigCache } from "../../helpers/redisStructure";

export const applyCouponToOrder = async (req: any, res: Response) => {
    const definedCodeCurrency = req.header("X-Shop-CodeCurrency");

    try {
        const { listProducts, coupons } = req.body;

        const business: Business = req.business;

        let user: User | null = null;
        const token = req.header("Authorization")?.split(" ")[1];

        if (token) {
            try {
                const decoded: any = jwt.verify(
                    token,
                    process.env.JWT_TOKEN_PK!
                );
                user = await User.findByPk(decoded.id);
            } catch (error: any) {
                Logger.warn(error, {
                    "X-App-Origin": req.header("X-App-Origin"),
                });
            }
        }

        const configurations = await getBusinessConfigCache(business.id);

        const onlineShopPriceSystems =
            configurations
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        const result = await processCoupons({
            coupons,
            listProducts,
            priceSystem: onlineShopPriceSystems,
            businessId: business.id,
            userId: user?.id,
            codeCurrencyDefined: definedCodeCurrency,
        });

        if (!internalCheckerResponse(result)) {
            Logger.error(result.message || "Ha ocurrido un error inesperado.", {
                origin: "shop/applyCouponToOrder",
                "X-App-Origin": req.header("X-App-Origin"),
            });
            return res.status(result.status).json({
                message: result.message,
            });
        }

        res.status(200).json({
            couponDiscount: result.data.couponDiscount,
            freeShipping: result.data.freeShipping,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
