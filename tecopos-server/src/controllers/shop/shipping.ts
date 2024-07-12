import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";

import ShippingRegion from "../../database/models/shippingRegion";
import Price from "../../database/models/price";
import Municipality from "../../database/models/municipality";
import Province from "../../database/models/province";
import { pag_params } from "../../database/pag_params";
import Logger from "../../lib/logger";
import Business from "../../database/models/business";

export const findAllRegions = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, all_data, ...params } =
            req.query;
        const business: Business = req.business;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["provinceId", "municipalityId"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Searchable
        if (search) {
            where_clause.name = { [Op.iLike]: `%${search}%` };
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_regions = await ShippingRegion.findAndCountAll({
            distinct: true,
            attributes: ["id", "name", "description"],
            where: { businessId: business.id, ...where_clause },
            include: [
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Municipality,
                    attributes: ["id", "name", "code"],
                },
                {
                    model: Province,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_regions.count / limit);
        if (found_regions.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_regions.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_regions.rows,
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
