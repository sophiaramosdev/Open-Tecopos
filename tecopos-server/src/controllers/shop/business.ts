import { Request, Response } from "express";

import Address from "../../database/models/address";
import Business from "../../database/models/business";
import BusinessCategory from "../../database/models/businessCategory";
import Country from "../../database/models/country";
import Image from "../../database/models/image";
import Municipality from "../../database/models/municipality";
import Phone from "../../database/models/phone";
import Province from "../../database/models/province";
import SocialNetwork from "../../database/models/socialNetwork";
import Logger from "../../lib/logger";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import ConfigurationKey from "../../database/models/configurationKey";

export const getMyBusiness = async (req: any, res: Response) => {
    try {
        const business: Business = req.business;

        const result_business = await Business.findOne({
            attributes: [
                "id",
                "name",
                "status",
                "promotionalText",
                "color",
                "description",
                "dni",
                "type",
                "email",
                "footerTicket",
                "openHours",
                "licenceUntil",
                "mode",
                "includeShop",
                "homeUrl",
                "slug",
                "enableManagementOrders",
            ],
            where: {
                id: business.id,
            },
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Image,
                    as: "banner",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: SocialNetwork,
                    attributes: ["user", "url", "type"],
                },
                {
                    model: Address,
                    attributes: [
                        "street_1",
                        "street_2",
                        "description",
                        "city",
                        "postalCode",
                    ],
                    include: [
                        {
                            model: Municipality,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Province,
                            attributes: ["id", "name", "code"],
                        },
                        {
                            model: Country,
                            attributes: ["id", "name", "code"],
                        },
                    ],
                },
                {
                    model: Phone,
                    attributes: ["number", "description"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!result_business) {
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        //Obtaining currencies
        const availableCurrencies = await AvailableCurrency.findAll({
            where: {
                businessId: business.id,
                isActive: true,
            },
            include: [Currency],
        });

        const exposed_data = availableCurrencies
            .filter(item => item.isActive)
            .map(item => {
                return {
                    id: item.id,
                    exchangeRate: item.exchangeRate,
                    isActive: item.isActive,
                    isMain: item.isMain,
                    name: item.currency.name,
                    code: item.currency.code,
                    symbol: item.currency.symbol,
                };
            });

        res.status(200).json({
            ...result_business.dataValues,
            availableCurrencies: exposed_data,
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

export const getMyConfigurations = async (req: any, res: Response) => {
    try {
        const business: Business = req.business;

        const result_business = await Business.findOne({
            where: {
                id: business.id,
            },
            include: [ConfigurationKey],
        });

        if (!result_business) {
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        const allowedConfigurations = [
            "android_min_version",
            "android_url_store",
            "ios_min_version",
            "ios_url_store",
            "is_app_in_manteinance",
            "invoice_business_name",
            "invoice_observations",
            "when_shop_create_preorder",
        ];

        let to_return = [];
        for (const configuration of result_business.configurationsKey) {
            if (allowedConfigurations.includes(configuration.key)) {
                to_return.push({
                    key: configuration.key,
                    value: configuration.value,
                });
            }
        }

        res.status(200).json(to_return);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
