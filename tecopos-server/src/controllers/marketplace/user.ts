import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import bcrypt from "bcryptjs";
import moment from "moment";
import db from "../../database/connection";

import { emailQueue } from "../../bull-queue/email";
import Logger from "../../lib/logger";

import User from "../../database/models/user";
import { pag_params } from "../../database/pag_params";
import { isUserNameValid } from "../../helpers/utils";
import Role from "../../database/models/role";
import UserRole from "../../database/models/userRole";
import TemporalToken from "../../database/models/temporalToken";
import Client from "../../database/models/client";
import Image from "../../database/models/image";
import Address from "../../database/models/address";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import Country from "../../database/models/country";
import Phone from "../../database/models/phone";
import Business from "../../database/models/business";

export const newUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { password, email } = req.body;

        //Checking if email exist
        const existEmail = await User.findOne({
            where: { email: email.trim().toLowerCase() },
        });

        if (existEmail) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} ya existe en el sistema.`,
            });
        }

        const salt = bcrypt.genSaltSync();

        const new_user: User = User.build({
            email: email.trim().toLowerCase(),
            password: bcrypt.hashSync(password, salt),
        });

        new_user.username =
            email.trim().toLowerCase().split("@")[0] +
            `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;

        await new_user.save({ transaction: t });

        const role_user = await Role.findOne({
            where: {
                code: "CUSTOMER",
            },
        });

        if (!role_user) {
            t.rollback();
            return res.status(409).json({
                message: `El rol Usuario del sistema no fue encontrado.`,
            });
        }

        await UserRole.bulkCreate(
            [
                {
                    userId: new_user.id,
                    roleId: role_user.id,
                },
            ],
            { transaction: t }
        );

        await t.commit();

        const to_return = await User.scope("simple_user").findByPk(new_user.id);

        res.status(201).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editMyUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const user_found = await User.findByPk(user.id);

        if (!user_found) {
            t.rollback();
            return res.status(404).json({
                message: `El usuario proporcionado no fue encontrado.`,
            });
        }

        const modelKeys = Object.keys(User.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "isSuperAdmin",
            "lastLogin",
            "isActive",
            "isLogued",
            "businessId",
        ].forEach(att => {
            if (paramsKey.includes(att) && !user.isSuperAdmin) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                user_found[att] = params[att];
            }
        });

        await user_found.save({ transaction: t });
        await t.commit();

        const to_return = await User.scope("simple_user").findByPk(user.id);

        res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editMyAccessData = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { password, email, username } = req.body;

        const user: User = req.user;

        const user_found = await User.findByPk(user.id);

        if (!user_found) {
            t.rollback();
            return res.status(404).json({
                message: `El usuario proporcionado no fue encontrado.`,
            });
        }

        //Checking if email exist
        if (email) {
            const existEmail = await User.findOne({
                where: {
                    email: email.trim().toLowerCase(),
                    id: { [Op.not]: user_found.id },
                },
            });

            if (existEmail) {
                t.rollback();
                return res.status(409).json({
                    message: `${email} already exist.`,
                });
            }

            user_found.email = email;
        }

        //Checking username
        if (username) {
            const existUsername = await User.findOne({
                where: {
                    username: username.trim().toLowerCase(),
                    id: { [Op.not]: user_found.id },
                },
            });

            if (existUsername) {
                t.rollback();
                return res.status(409).json({
                    message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
                });
            }

            user_found.username = username.trim().toLowerCase();

            const isValidUsername = isUserNameValid(user_found.username);

            if (!isValidUsername) {
                t.rollback();
                return res.status(400).json({
                    message: `El nombre de usuario solo puede contener letras, números.`,
                });
            }
        }

        //Crypt the password
        const salt = bcrypt.genSaltSync();
        if (password) {
            user_found.password = bcrypt.hashSync(password, salt);
        }

        await user_found.save({ transaction: t });

        await t.commit();

        const to_return = await User.scope("simple_user").findByPk(
            user_found.id
        );

        res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const sendRecoveryCodePassword = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { email } = req.body;

        //Checking if email exist
        const user = await User.findOne({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} no fue encontrado.`,
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000);

        const temporalToken = TemporalToken.build({
            userId: user.id,
            token: code,
            type: "RECOVER_PASS",
            expiredAt: moment(new Date())
                .add(2, "hours")
                .format("YYYY-MM-DD HH:mm"),
        });

        await temporalToken.save({ transaction: t });

        await t.commit();
        res.status(200).json({
            message: "Temporal token created",
        });

        //Send an email
        emailQueue.add(
            {
                code: "CODE_TO_RECOVER_PASS_FROM_MARKETPLACE",
                params: {
                    user,
                    code,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const changePassword = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { email, recoveryCode, password } = req.body;

        //Checking if email exist
        const user = await User.findOne({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} no fue encontrado.`,
            });
        }

        const foundTemporalToken = await TemporalToken.findOne({
            where: {
                token: recoveryCode,
                userId: user.id,
            },
            order: [["expiredAt", "DESC"]],
            limit: 1,
        });

        if (!foundTemporalToken) {
            t.rollback();
            return res.status(404).json({
                message: `El código proporcionado no es correcto.`,
            });
        }

        if (moment().diff(foundTemporalToken.expiredAt, "hour") > 2) {
            t.rollback();
            return res.status(400).json({
                message: `El código proporcionado ha expirado, por favor, solicite uno nuevo.`,
            });
        }

        //Crypt the password
        const salt = bcrypt.genSaltSync();
        if (password) {
            user.password = bcrypt.hashSync(password, salt);
        }

        //Destroying temporal token
        foundTemporalToken.destroy({ transaction: t });

        await user.save({ transaction: t });

        await t.commit();
        res.status(200).json({ message: "Password changed" });
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMyUser = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const business: Business = req.business;

        const to_return = await User.findByPk(user.id, {
            attributes: ["id", "username", "email", "displayName"],
            include: [
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Client,
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "sex",
                        "birthAt",
                        "email",
                    ],
                    where: {
                        businessId: business.id,
                    },
                    required: false,
                    include: [
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
                },
            ],
        });

        res.status(200).json(to_return);
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteMyProfile = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        await user.destroy();

        res.status(204).json("completed");
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.user.businessId,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
