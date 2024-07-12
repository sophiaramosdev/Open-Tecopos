import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import axios, { AxiosResponse } from "axios";

import { Op } from "sequelize";
import db from "../database/connection";
import User from "../database/models/user";
import Business from "../database/models/business";
import { createSlug } from "../helpers/utils";
import SubscriptionPlan from "../database/models/subscriptionPlan";
import PriceSystem from "../database/models/priceSystem";
import Currency from "../database/models/currency";
import AvailableCurrency from "../database/models/availableCurrency";
import ConfigurationKey from "../database/models/configurationKey";
import { businessDefaultConfig } from "../helpers/businessDefaultConfig";
import Area from "../database/models/area";
import Role from "../database/models/role";
import UserRole from "../database/models/userRole";
import { newBusinessCreated } from "../helpers/emailComposer";
import Address from "../database/models/address";
import Person from "../database/models/person";
import Phone from "../database/models/phone";
import Province from "../database/models/province";
import Municipality from "../database/models/municipality";
import moment from "moment";
import Logger from "../lib/logger";

export const newBusiness = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const {
            email,
            displayName,
            businessCategoryId,
            name,
            street,
            locality,
            municipalityId,
            provinceId,
            telephone,
            token,
        } = req.body;

        //Validating

        //Checking reCaptcha
        let continues = true;
        await axios
            .post(
                `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.SECRET_KEY}&response=${token}`
            )
            .then((resp: AxiosResponse) => {
                continues = resp.data.success;
            })
            .catch(() => {
                continues = false;
            });

        if (!continues) {
            t.rollback();
            return res.status(401).json({
                message: `¡Upps, parece que no eres un humano! La operación no pudo ser completada.`,
            });
        }

        //Checking if email exist
        const existEmail = await User.findOne({
            where: { email },
            paranoid: false,
        });

        if (existEmail) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} ya existe en el sistema.`,
            });
        }

        //Creating DNI
        const lastBusiness = await Business.findAll({
            limit: 1,
            order: [["createdAt", "DESC"]],
        });

        const dni = `C${lastBusiness[0].id.toString().padStart(4, "0")}`;

        //Creating slug
        let provisionalSlug = createSlug(name);
        let isValid = false;

        while (!isValid) {
            const slug_duplicate_found = await Business.findOne({
                where: {
                    slug: provisionalSlug,
                },
            });

            if (slug_duplicate_found) {
                const count = await Business.count({
                    where: {
                        slug: {
                            [Op.iLike]: `%${provisionalSlug}%`,
                        },
                    },
                });
                provisionalSlug += `-${count}`;
            } else {
                isValid = true;
            }
        }

        //Creating slug
        let provisionalUserName = email.split("@")[0];
        let isValidUsername = false;

        while (!isValidUsername) {
            const username_duplicate_found = await User.findOne({
                where: {
                    username: provisionalUserName,
                },
            });

            if (username_duplicate_found) {
                const count = await User.count({
                    where: {
                        username: {
                            [Op.iLike]: provisionalUserName,
                        },
                    },
                });
                provisionalUserName += `_${count}`;
            } else {
                isValidUsername = true;
            }
        }

        const free_plan = await SubscriptionPlan.findOne({
            where: {
                code: "FREE",
            },
        });

        if (!free_plan) {
            t.rollback();
            return res.status(404).json({
                message: `FREE plan not found`,
            });
        }

        //Checking municipalityId and provinceId
        const province = await Province.findByPk(provinceId);

        if (!province) {
            t.rollback();
            return res.status(404).json({
                message: `El id de provincia ${provinceId} proporcionado no fue encontrado.`,
            });
        }

        const municipality = await Municipality.findByPk(municipalityId);

        if (!municipality) {
            t.rollback();
            return res.status(404).json({
                message: `El id de municipio ${municipalityId} proporcionado no fue encontrado.`,
            });
        }

        const business: Business = Business.build(
            {
                status: "CREATED",
                name,
                dni,
                mode: "SIMPLE",
                slug: provisionalSlug,
                businessCategoryId,
                subscriptionPlanId: free_plan.id,
                licenceUntil: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
                address: {
                    street,
                    locality,
                    municipalityId,
                    provinceId,
                },
            },
            {
                include: [Address],
            }
        );

        await business.save({ transaction: t });

        const new_user: User = User.build({
            email,
            businessId: business.id,
            displayName,
            username: provisionalUserName,
        });

        //Crypt the password
        const salt = bcrypt.genSaltSync();
        const generatedPassword = Math.random().toString(36).slice(-8);
        new_user.password = bcrypt.hashSync(generatedPassword, salt);

        await new_user.save({ transaction: t });

        //Creating person associated
        const new_person: Person = Person.build(
            {
                email,
                name: displayName,
                businessId: business.id,
                userId: new_user.id,
                phones: [
                    {
                        number: telephone,
                        isMain: true,
                    },
                ],
            },
            { include: [Phone] }
        );

        await new_person.save({ transaction: t });

        //Adding role
        const owner = await Role.findOne({
            where: {
                code: "OWNER",
            },
        });

        if (!owner) {
            t.rollback();
            return res.status(404).json({
                message: `OWNER role not found`,
            });
        }
        const user_role = UserRole.build({
            userId: new_user.id,
            roleId: owner.id,
        });
        await user_role.save({ transaction: t });

        business.masterOwnerId = new_user.id;
        await business.save({ transaction: t });

        //Creating main stock
        const area = Area.build({
            name: "Almacén principal",
            code: "AP",
            type: "STOCK",
            isMainStock: true,
            businessId: business.id,
        });

        await area.save({ transaction: t });

        //Creating main priceSystem
        const priceSystem = PriceSystem.build({
            name: "Principal",
            isMain: true,
            businessId: business.id,
        });

        await priceSystem.save({ transaction: t });

        //Creating currencies associated
        const currencies_availables = await Currency.findAll();
        let business_currencies = [];
        for (const currency of currencies_availables) {
            const isMain = currency.code === "CUP";

            business_currencies.push({
                businessId: business.id,
                isActive: true,
                exchangeRate: 1,
                currencyId: currency.id,
                isMain,
            });
        }

        await AvailableCurrency.bulkCreate(business_currencies, {
            transaction: t,
        });

        //Definig defaults configurations
        await ConfigurationKey.bulkCreate(businessDefaultConfig(business.id), {
            transaction: t,
        });

        await t.commit();

        //Send email
        newBusinessCreated(
            new_user!.email,
            new_user?.displayName ?? "",
            generatedPassword,
            business
        );

        res.status(201).json({
            message: "El negocio ha sido creado satisfactoriamente",
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
