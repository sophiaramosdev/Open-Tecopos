import { Response } from "express";
import moment, { Moment } from "moment";
import { Op, fn, col } from "sequelize";

import Business from "../../database/models/business";
import Logger from "../../lib/logger";
import Area from "../../database/models/area";
import User from "../../database/models/user";
import Product from "../../database/models/product";
import SubscriptionPlan from "../../database/models/subscriptionPlan";

//Business
export const getReportBusinessRegistered = async (req: any, res: Response) => {
    try {
        const { mode }: { mode: "week" | "month" | "year" | "custom" } =
            req.params;

        let data_to_send: any = [];

        switch (mode) {
            case "month":
                const numberOfDays = moment().daysInMonth();
                for (let index = 0; index < numberOfDays; index++) {
                    data_to_send.push({
                        number: index + 1,
                        date: undefined,
                        quantity: 0,
                    });
                }
                break;
            case "year":
                data_to_send = moment.months().map((item, index) => {
                    return {
                        month: item,
                        number: index,
                        date: undefined,
                        quantity: 0,
                    };
                });
                break;
            default: //Week
                data_to_send = moment.weekdays().map((item, index) => {
                    return {
                        day: item,
                        number: index,
                        date: undefined,
                        quantity: 0,
                    };
                });
                break;
        }

        for (let index = 0; index < data_to_send.length; index++) {
            let rowStartAt: Moment;
            let startAt;
            let endsAt;

            switch (mode) {
                case "month":
                    rowStartAt = moment()
                        .startOf("day")
                        .subtract(index, "days");
                    startAt = moment()
                        .startOf("day")
                        .subtract(index, "days")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss");

                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("DD")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                            };
                        }

                        return item;
                    });
                    break;
                case "year":
                    rowStartAt = moment()
                        .startOf("month")
                        .subtract(index, "month");
                    startAt = moment()
                        .startOf("month")
                        .subtract(index, "month")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("month")
                        .format("YYYY-MM-DD HH:mm:ss");

                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("MM")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM"),
                            };
                        }

                        return item;
                    });
                    break;
                default: //Week
                    rowStartAt = moment()
                        .startOf("day")
                        .subtract(index, "days");
                    startAt = moment()
                        .startOf("day")
                        .subtract(index, "days")
                        .format("YYYY-MM-DD HH:mm:ss");
                    endsAt = moment(startAt)
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss");
                    data_to_send = data_to_send.map((item: any) => {
                        if (item.number === rowStartAt.day()) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                            };
                        }

                        return item;
                    });
                    break;
            }

            //Find all business that start in the current_day
            const businesses = await Business.count({
                where: {
                    createdAt: {
                        [Op.gte]: moment(startAt, "YYYY-MM-DD HH:mm"),
                        [Op.lte]: moment(endsAt, "YYYY-MM-DD HH:mm"),
                    },
                },
            });

            switch (mode) {
                case "month":
                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("DD")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                                quantity: businesses,
                            };
                        }

                        return item;
                    });
                    break;
                case "year":
                    data_to_send = data_to_send.map((item: any) => {
                        if (
                            item.number ===
                            Number(rowStartAt.format("MM")) - 1
                        ) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM"),
                                quantity: businesses,
                            };
                        }

                        return item;
                    });
                    break;

                default: //Week
                    data_to_send = data_to_send.map((item: any) => {
                        if (item.number === rowStartAt.day()) {
                            return {
                                ...item,
                                date: rowStartAt.format("YYYY-MM-DD"),
                                quantity: businesses,
                            };
                        }

                        return item;
                    });
                    break;
            }
        }

        res.status(200).json(data_to_send);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getGeneralBussinessReport = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const business = await Business.findByPk(id);

        if (!business) {
            return res.status(404).json({
                message: `El negocio proporcionado no fue encontrado`,
            });
        }

        const [areas, users, total_products, total_product_in_sale] =
            await Promise.all([
                Area.findAll({
                    where: {
                        businessId: id,
                    },
                }),
                User.findAll({
                    where: {
                        businessId: id,
                    },
                }),
                Product.count({
                    where: {
                        businessId: id,
                    },
                }),
                Product.count({
                    where: {
                        businessId: id,
                        type: {
                            [Op.or]: [
                                "MENU",
                                "STOCK",
                                "COMBO",
                                "VARIATION",
                                "SERVICE",
                                "ADDON",
                            ],
                        },
                    },
                }),
            ]);

        const data_to_emit = {
            areas: {
                STOCK: areas.filter(item => item.type === "STOCK").length,
                MANUFACTURER: areas.filter(item => item.type === "MANUFACTURER")
                    .length,
                SALE: areas.filter(item => item.type === "SALE").length,
            },
            users: {
                total: users.length,
                actives: users.filter(item => item.isActive).length,
            },
            products: {
                total: total_products,
                totalInSale: total_product_in_sale,
            },
        };

        res.status(200).json(data_to_emit);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getSummaryReport = async (req: any, res: Response) => {
    try {
        const [
            total_business,
            total_bussiness_by_plan,
            total_bussiness_by_type,
            plans,
        ] = await Promise.all([
            Business.count(),
            Business.findAll({
                attributes: [
                    "subscriptionPlanId",
                    [fn("COUNT", "subscriptionPlanId"), "amount"],
                ],
                group: ["subscriptionPlanId"],
            }),
            Business.findAll({
                attributes: ["type", [fn("COUNT", "type"), "amount"]],
                group: ["type"],
            }),
            SubscriptionPlan.findAll({
                order: [["id", "ASC"]],
            }),
        ]);

        let totalBySubscriptionPlan = plans.map(item => {
            const found = total_bussiness_by_plan.find(
                bplan => bplan.subscriptionPlanId === item.id
            );

            let amount = 0;
            if (found) {
                //@ts-ignore
                amount = found.dataValues.amount;
            }

            return {
                id: item.id,
                code: item.code,
                amount,
            };
        });

        res.status(200).json({
            totalRegisteredBusiness: total_business,
            totalBySubscriptionPlan,
            totalByType: total_bussiness_by_type,
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
