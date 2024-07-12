import Business from "../../database/models/business";
import Image from "../../database/models/image";
import User from "../../database/models/user";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";

export const myBusinessToReturn = async (user: User, businessId?: number) => {
    const business = await Business.scope("admin_details").findOne({
        where: {
            id: businessId || user.businessId,
        },
    });

    if (!business) {
        return null;
    }

    //Obtaining currencies
    const availableCurrencies = await getCurrenciesCache(
        businessId || user.businessId
    );

    let mainCurrency = "";

    const exposed_data = availableCurrencies
        .filter(item => item.isActive)
        .map(item => {
            if (item.isMain) {
                mainCurrency = item.currency.code;
            }

            return {
                id: item.id,
                exchangeRate: item.exchangeRate,
                oficialExchangeRate: item.oficialExchangeRate,
                isActive: item.isActive,
                isMain: item.isMain,
                name: item.currency.name,
                code: item.currency.code,
                symbol: item.currency.symbol,
            };
        });

    const configurations = await getBusinessConfigCache(
        businessId || user.businessId
    );

    const costCurrency =
        configurations.find(item => item.key === "general_cost_currency")
            ?.value || mainCurrency;

    //Obtaining the associated business
    let branches: any = [];
    if (
        business.mode === "GROUP" &&
        user.roles?.map(item => item.code).includes("GROUP_OWNER")
    ) {
        const extend_business = await Business.findByPk(business.id, {
            include: [
                {
                    model: Business,
                    as: "branches",
                    through: {
                        attributes: [],
                    },
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: Image,
                            as: "logo",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                },
            ],
        });

        branches = extend_business?.branches ?? [];
    }

    return {
        //@ts-ignore
        ...business.dataValues,
        availableCurrencies: exposed_data,
        mainCurrency,
        costCurrency,
    };
};
