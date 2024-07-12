import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";
import moment from "moment";

import AccessPointTicket from "../../database/models/accessPointTicket";
import Image from "../../database/models/image";
import User from "../../database/models/user";
import AccessPointProduct from "../../database/models/accessPointProduct";
import Area from "../../database/models/area";
import Logger from "../../lib/logger";
import { getAreaCache } from "../../helpers/redisStructure";

export const findAllAccessPointTickets = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, all_data, ...params } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["status"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("SalesCategory.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_tickets = await AccessPointTicket.findAndCountAll({
            attributes: [
                "id",
                "name",
                "observations",
                "status",
                "createdAt",
                "referenceNumber",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    as: "madeBy",
                    attributes: ["id", "email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: User,
                    as: "managedBy",
                    attributes: ["id", "email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
                {
                    model: AccessPointProduct,
                    attributes: ["id", "name", "quantity", "measure"],
                    include: [
                        {
                            model: Image,
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                },
                {
                    model: Area,
                    attributes: ["id", "name"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            order: [["createdAt", "ASC"]],
        });

        let totalPages = Math.ceil(found_tickets.count / limit);
        if (found_tickets.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_tickets.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_tickets.rows,
        });
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

export const getAllPendingTickets = async (req: any, res: Response) => {
    try {
        const user = req.user;

        const found_tickets = await AccessPointTicket.scope(
            "to_return"
        ).findAll({
            where: {
                businessId: user.businessId,
                status: "CREATED",
            },
            order: [["createdAt", "ASC"]],
        });

        res.status(200).json(found_tickets);
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

export const getHistorialTicketsProcessed = async (req: any, res: Response) => {
    try {
        const user = req.user;
        const { areaId } = req.params;

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área proporcionada no fue encontrada.`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (area.type !== "ACCESSPOINT") {
            return res.status(404).json({
                message: `El área proporcionada no es un Punto de Acceso.`,
            });
        }

        const fromDate = moment().subtract(8, "hours");

        const found_tickets = await AccessPointTicket.scope(
            "to_return"
        ).findAll({
            where: {
                businessId: user.businessId,
                status: ["ACCEPTED", "REJECTED"],
                managedAt: {
                    [Op.gte]: moment(fromDate, "YYYY-MM-DD HH:mm").format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                },
            },
            order: [["createdAt", "ASC"]],
        });

        res.status(200).json(found_tickets);
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

export const manageAccessPointTicket = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const { ticketId, action, areaId } = req.body;

        const accessPointTicket = await AccessPointTicket.findByPk(ticketId);

        if (!accessPointTicket) {
            return res.status(404).json({
                message: `El ticket proporcionado no fue encontrado.`,
            });
        }

        if (accessPointTicket.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (accessPointTicket.status !== "CREATED") {
            return res.status(400).json({
                message: `El ticket ya fue gestionado`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área proporcionada no fue encontrada.`,
            });
        }

        if (area.type !== "ACCESSPOINT") {
            return res.status(404).json({
                message: `El área proporcionada no es de tipo punto de acceso.`,
            });
        }

        //Validations
        const allowedTypes = ["ACCEPTED", "REJECTED"];
        if (!allowedTypes.includes(action)) {
            return res.status(400).json({
                message: `${action} no es un valor permitido. Valores permitidos: ${allowedTypes}`,
            });
        }

        await accessPointTicket.update(
            {
                status: action,
                managedById: user.id,
                managedAt: moment().toDate(),
                areaId,
            },
            {
                where: {
                    id: ticketId,
                },
            }
        );

        const to_return = await AccessPointTicket.scope("to_return").findByPk(
            ticketId
        );

        //Scokets
        //Obtaining all accessPointAreas from business
        const accessPointAreas = await Area.findAll({
            where: {
                businessId: user.businessId,
                type: "ACCESSPOINT",
            },
        });

        for (const point of accessPointAreas) {
            req.io.to(`area:${point.id}`).emit("access-point-ticket", {
                action: "remove",
                data: to_return,
                from: user.id,
            });
        }

        res.status(200).json(to_return);
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

export const revokeAccessPointTicket = async (req: any, res: Response) => {
    try {
        const user = req.user;
        const { ticketId } = req.params;

        const accessPointTicket = await AccessPointTicket.findByPk(ticketId);

        if (!accessPointTicket) {
            return res.status(404).json({
                message: `El ticket proporcionado no fue encontrado.`,
            });
        }

        if (accessPointTicket.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (accessPointTicket.madeById !== user.id) {
            return res.status(400).json({
                message: `No puede revocar ticket de acceso que no fueron manejados por usted.`,
            });
        }

        await accessPointTicket.update(
            {
                status: "CREATED",
                managedById: null,
                managedAt: null,
                areaId: null,
            },
            {
                where: {
                    id: ticketId,
                },
            }
        );

        const to_return = await AccessPointTicket.scope("to_return").findByPk(
            ticketId
        );

        res.status(200).json(to_return);
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
