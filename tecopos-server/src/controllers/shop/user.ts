import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import bcrypt from "bcryptjs";
import moment from "moment";

import db from "../../database/connection";
import User from "../../database/models/user";
import { pag_params } from "../../database/pag_params";
import Logger from "../../lib/logger";
import { isUserNameValid } from "../../helpers/utils";
import Business from "../../database/models/business";
import Role from "../../database/models/role";
import UserRole from "../../database/models/userRole";
import Client from "../../database/models/client";
import TemporalToken from "../../database/models/temporalToken";
import { emailQueue } from "../../bull-queue/email";
import Address from "../../database/models/address";
import Phone from "../../database/models/phone";
import PhoneClient from "../../database/models/phoneClient";
import Image from "../../database/models/image";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import Country from "../../database/models/country";

export const newUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { password, username, email } = req.body;
        const business: Business = req.business;

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

        const new_user: User = User.build(
            {
                email: email.trim().toLowerCase(),
                password: bcrypt.hashSync(password, salt),
                clients: [
                    {
                        email: email.trim().toLowerCase(),
                        registrationWay: "online",
                        businessId: business.id,
                    },
                ],
            },
            {
                include: [Client],
            }
        );

        if (username) {
            //Checking username
            const existUsername = await User.findOne({
                where: { username: username.trim().toLowerCase() },
            });

            if (existUsername) {
                t.rollback();
                return res.status(409).json({
                    message: `El usuario: ${username} ya existe en el sistema. Seleccione otro.`,
                });
            }

            const processedUsername = username.trim().toLowerCase();

            const isValidUsername = isUserNameValid(processedUsername);

            if (!isValidUsername) {
                t.rollback();
                return res.status(400).json({
                    message: `El nombre de usuario solo puede contener letras, números.`,
                });
            }

            new_user.username = processedUsername;
        } else {
            new_user.username =
                email.trim().toLowerCase().split("@")[0] +
                `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;
        }

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

        const foundClient = new_user.clients.find(
            item => item.businessId === business.id
        );

        const to_return = await Client.scope("to_return").findByPk(
            foundClient?.id,
            {
                transaction: t,
            }
        );

        await t.commit();
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
        const { address, phones, birthAt, ...params } = req.body;

        const user: User = req.user;
        const business: Business = req.business;

        const user_found = await User.findByPk(user.id);

        if (!user_found) {
            t.rollback();
            return res.status(404).json({
                message: `El usuario proporcionado no fue encontrado.`,
            });
        }

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
            include: [
                Address,
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!client) {
            return res.status(404).json({
                message: `Los datos del cliente no fueron encontrados.`,
            });
        }

        //Client
        const modelKeys = Object.keys(Client.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "userId"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        if (address) {
            if (client.address) {
                await Address.update(address, {
                    where: {
                        id: client.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                client.addressId = new_address.id;
                await client.save({ transaction: t });
            }
        }

        if (phones) {
            //Removing other phones
            const phone_client = await PhoneClient.findAll({
                where: {
                    clientId: client.id,
                },
            });

            if (phone_client.length !== 0) {
                await PhoneClient.destroy({
                    where: {
                        clientId: client.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_client.map(item => item.phoneId),
                    },
                    transaction: t,
                });
            }

            //Creting new phones
            const phones_created = await Phone.bulkCreate(phones, {
                transaction: t,
                returning: true,
            });

            let addBulk = [];
            for (let phone of phones_created) {
                addBulk.push({
                    clientId: client.id,
                    phoneId: phone.id,
                });
            }

            await PhoneClient.bulkCreate(addBulk, { transaction: t });
        }

        if (birthAt) {
            client.birthAt = birthAt;
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                client[att] = params[att];
            }
        });

        await client.save({ transaction: t });

        const to_return = await Client.scope("to_return").findByPk(client.id, {
            transaction: t,
        });

        await t.commit();

        res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            businessId: req.business.id,
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

        const to_return = await User.scope("simple_user").findByPk(
            user_found.id,
            {
                transaction: t,
            }
        );

        await t.commit();

        res.status(200).json(to_return);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            businessId: req.business.id,
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
        const business: Business = req.business;

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
                code: "CODE_TO_RECOVER_PASS",
                params: {
                    user,
                    businessId: business.id,
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

//Deprecated 14-05-2024
//Use insted getMyUserV2
export const getMyUser = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const business: Business = req.business;

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        if (!client) {
            return res.status(404).json({
                message: `Los datos del cliente no fueron encontrados.`,
            });
        }

        const to_return = await Client.scope("to_return").findByPk(client.id);

        //@ts-ignore
        res.status(200).json({ ...to_return.dataValues, roles: user.roles });
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.business.id,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMyUserV2 = async (req: any, res: Response) => {
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
        const business: Business = req.business;

        //Finding associated customer
        const client = await Client.findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        if (!client) {
            return res.status(404).json({
                message: `Los datos del cliente no fueron encontrados.`,
            });
        }

        if (client.userId !== user.id) {
            return res.status(403).json({
                message: `No tiene permisos para realizar esta acción.`,
            });
        }

        await client.destroy();

        res.status(204).json("completed");
    } catch (error: any) {
        Logger.error(error, {
            businessId: req.business.id,
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
