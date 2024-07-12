import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import jwt from "jsonwebtoken";
import db from "../database/connection";
import Business from "../database/models/business";
import BusinessCategory from "../database/models/businessCategory";
import Image from "../database/models/image";
import { pag_params } from "../database/pag_params";
import Logger from "../lib/logger";
import User from "../database/models/user";
import Role from "../database/models/role";
import UserRole from "../database/models/userRole";
import Client from "../database/models/client";

export const syncroCustomer = async (req: any, res: Response) => {
    try {
        const { userId, businessId, barCode } = req.body;

        //Finding if Client associated to bussiness exist
        const client = await Client.findOne({
            where: {
                businessId,
                userId,
            },
        });

        const user = await User.findByPk(userId);

        if (!user) {
            Logger.error(`Unable to syncronize user`, {
                "X-App-Origin": req.header("X-App-Origin"),
                businessId,
                userId,
            });
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!client) {
            const new_client = Client.build({
                email: user.email.trim().toLowerCase(),
                registrationWay: "tecopay",
                barCode,
                businessId,
                userId,
            });
            await new_client.save();
        } else {
            if (barCode) {
                if (client.barCode) {
                    if (!client.barCode.includes(barCode)) {
                        client.barCode += `,${barCode}`;
                    }
                } else {
                    client.barCode = barCode;
                }
                await client.save();
            }
        }

        res.status(200).json({ message: `Client syncronized` });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const isTokenValid = async (req: any, res: Response) => {
    try {
        const { token } = req.body;

        const decoded: any = jwt.verify(token, process.env.JWT_TOKEN_PK!);

        // Finding user
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(403).json({
                message: "Credenciales de acceso no válidas.",
            });
        }

        // Verify if user is Active
        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Usuario no válido. Credenciales de acceso no válidas.",
            });
        }

        res.status(200).json({
            id: user.id,
            displayName: user.displayName,
            email: user.email,
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(401).json({
            message: "Credenciales de acceso no válidas.",
        });
    }
};

export const checkEmailAvailabiliy = async (req: any, res: Response) => {
    try {
        const { email } = req.body;

        const user = await User.scope("simple_user").findOne({
            where: {
                email,
            },
        });

        if (user) {
            return res.status(200).json(user);
        }

        res.status(404).json({
            message: `Email available`,
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

export const findAllUser = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, ...params } = req.query;

        //Searchable
        let where_clause: any = {};
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.or] = [
                where(fn("unaccent", col("username")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("displayName")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        const searchable_fields = ["email"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const users_found = await User.findAndCountAll({
            attributes: ["id", "username", "email", "displayName"],
            distinct: true,
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: Image,
                    as: "avatar",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: Business,
                    as: "business",
                    attributes: ["id", "name"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        let totalPages = Math.ceil(users_found.count / limit);
        if (users_found.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: users_found.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: users_found.rows,
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

export const getUserById = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const user_found = await User.scope("simple_user").findByPk(id);

        res.status(200).json(user_found);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getBusiness = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const business = await Business.scope("simple").findOne({
            where: { id },
        });

        if (!business) {
            return res.status(404).json({
                message: `Business not found`,
            });
        }

        res.status(200).json(business);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllBusinesses = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, ...params } = req.query;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["status", "type"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.or] = [
                where(fn("unaccent", col("Business.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_businesses = await Business.findAndCountAll({
            attributes: ["id", "name", "status", "slug", "dni"],
            distinct: true,
            where: {
                ...where_clause,
            },
            include: [
                {
                    model: BusinessCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: Image,
                    as: "logo",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
            ],
            //@ts-ignore
            order: ordenation,
            limit,
            offset,
        });

        let totalPages = Math.ceil(found_businesses.count / limit);
        if (found_businesses.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_businesses.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: found_businesses.rows,
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

export const registerUser = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        let { displayName, email } = req.body;

        //Checking if email exist
        const existEmail = await User.findOne({
            where: { email },
        });

        if (existEmail) {
            t.rollback();
            return res.status(409).json({
                message: `El correo electrónico: ${email} ya existe en el sistema.`,
            });
        }

        let username = email.trim().toLowerCase().split("@")[0];

        //Checking username
        const existUsername = await User.findOne({
            where: { username },
        });

        if (existUsername) {
            username =
                username +
                `_${Math.floor(Math.random() * (999 - 100 + 1) + 100)}`;
        }

        let body = {
            username,
            displayName,
            email: email.trim().toLowerCase(),
            lastLogin: new Date(),
        };

        const new_user: User = User.build(body);

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

        const user_to_emit = await User.scope("simple_user").findByPk(
            new_user.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(201).json({ user: user_to_emit });
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
