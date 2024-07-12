import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";

import User from "../../database/models/user";
import Area from "../../database/models/area";
import SalesCategory from "../../database/models/salesCategory";
import CategorySalesPoint from "../../database/models/categorySalesPoint";
import Image from "../../database/models/image";
import ImageArea from "../../database/models/imageArea";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Product from "../../database/models/product";
import AreaProductManufacturation from "../../database/models/areaProductManufacturation";
import SharedArea from "../../database/models/sharedArea";
import Business from "../../database/models/business";
import FundDestination from "../../database/models/fundDestination";
import Account from "../../database/models/account";
import AccountTag from "../../database/models/accountTag";
import Logger from "../../lib/logger";
import BusinessBranch from "../../database/models/businessBranch";
import ProductionArea from "../../database/models/productionArea";
import { getAllBranchBusiness } from "../helpers/utils";
import { getAreaCache, getLongTermKey } from "../../helpers/redisStructure";
import { redisClient } from "../../../app";

//Areas
export const newArea = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const {
            type,
            salesMode,
            isMainStock,
            stockAreaId,
            categories,
            images,
            ...params
        } = req.body;
        const user: User = req.user;

        //Validations
        const allowedTypes = ["MANUFACTURER", "STOCK", "SALE", "ACCESSPOINT"];
        if (type && !allowedTypes.includes(type)) {
            t.rollback();
            return res.status(400).json({
                message: `${type} no es un valor permitido. Valores permitidos: ${allowedTypes}`,
            });
        }

        const modelKeys = Object.keys(Area.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const area: Area = Area.build(
            {
                type,
                isMainStock,
                businessId: user.businessId,
                ...params,
            },
            {
                include: [SalesCategory],
            }
        );

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                area[att] = params[att];
            }
        });

        await area.save({ transaction: t });

        if (type === "SALE") {
            if (stockAreaId) {
                //Checking if area is STOCK Type
                const areaStock = await getAreaCache(stockAreaId);

                if (!areaStock) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El área proporcionada no fue encontrada.`,
                    });
                }

                if (areaStock.type !== "STOCK") {
                    t.rollback();
                    return res.status(406).json({
                        message: `El área proporcionada no es tipo almacén.`,
                    });
                }

                area.stockAreaId = stockAreaId;
            } else {
                //Creating the Associated Stock
                const stockArea = Area.build({
                    name: area.name + " - Almacén",
                    description: "Área de almacén asociada a " + area.name,
                    type: "STOCK",
                    businessId: user.businessId,
                });

                await stockArea.save({ transaction: t });
                area.stockAreaId = stockArea.id;
            }

            if (categories as Array<number>) {
                const categories_found = await SalesCategory.findAll({
                    where: {
                        id: categories,
                        businessId: user.businessId,
                    },
                });

                let addCategoryBulk: any = [];
                for (const category of categories) {
                    const found = categories_found.find(
                        item => item.id === category
                    );

                    if (!found) {
                        t.rollback();
                        return res.status(404).json({
                            message: `Category id ${category} not found.`,
                        });
                    }

                    addCategoryBulk.push({
                        salesCategoryId: category,
                        areaId: area.id,
                    });
                }

                await CategorySalesPoint.bulkCreate(addCategoryBulk, {
                    transaction: t,
                });
            }

            await area.save({ transaction: t });
        } else if (type === "MANUFACTURER") {
            if (stockAreaId) {
                //Checking if area is STOCK Type
                const areaStock = await getAreaCache(stockAreaId);

                if (!areaStock) {
                    t.rollback();
                    return res.status(406).json({
                        message: `El área de tipo almacén provisto no fue encontrada.`,
                    });
                }

                if (areaStock.type !== "STOCK") {
                    t.rollback();
                    return res.status(406).json({
                        message: `El área de tipo almacén provista no es realmente de tipo almacén.`,
                    });
                }

                area.stockAreaId = stockAreaId;
            } else {
                //Creating the Associated Stock
                const stockArea = Area.build({
                    name: area.name + " - Almacén",
                    description: "Área de almacén asociada a " + area.name,
                    type: "STOCK",
                    businessId: user.businessId,
                });

                await stockArea.save({ transaction: t });
                area.stockAreaId = stockArea.id;
            }
            await area.save({ transaction: t });
        }

        //Images
        if (images) {
            const images_found = await Image.findAll({
                where: {
                    id: images,
                },
            });

            let bulkImages = [];
            for (const imageId of images) {
                const exist = images_found.find(item => item.id == imageId);

                if (!exist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La imagen con id ${imageId} no fue encontrada.`,
                    });
                }

                bulkImages.push({
                    imageId,
                    areaId: area.id,
                });
            }

            await ImageArea.bulkCreate(bulkImages, { transaction: t });
        }

        const area_to_emit = await Area.scope(area.type).findByPk(area.id, {
            transaction: t,
        });

        await t.commit();
        res.status(201).json(area_to_emit);
    } catch (error: any) {
        t.rollback();
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

export const editArea = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { images, ...params } = req.body;
        const user: User = req.user;

        //Validations
        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const allowedTypes = ["MANUFACTURER", "STOCK", "SALE", "ACCESSPOINT"];
        if (params.type && !allowedTypes.includes(params.type)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.type} is not an allowed type. Fields allowed: ${allowedTypes}`,
            });
        }

        const modelKeys = Object.keys(Area.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const area = await Area.findByPk(id, {
            include: [
                { model: SalesCategory, as: "salesCategories" },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        //Permission Check
        if (area?.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                area[att] = params[att];
            }
        });

        //Images
        if (images) {
            const images_found = await Image.findAll({
                where: {
                    id: images,
                },
            });

            let bulkImagesCreate = [];
            let bulkToDelete = area.images?.map(item => item.id);

            for (const imageId of images) {
                const exist = images_found.find(item => item.id == imageId);

                if (!exist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La imagen con id ${imageId} no fue encontrada.`,
                    });
                }

                //Checking if is already in product
                const isInArea = area.images?.find(item => item.id === imageId);

                if (isInArea) {
                    bulkToDelete = bulkToDelete?.filter(
                        item => item !== imageId
                    );
                } else {
                    bulkImagesCreate.push({
                        imageId,
                        areaId: area.id,
                    });
                }
            }

            await ImageArea.bulkCreate(bulkImagesCreate, { transaction: t });
            await Image.destroy({
                where: {
                    id: bulkToDelete,
                },
            });
        }

        if (params.categories) {
            let listBulkCategories = [];

            const allCategories = await SalesCategory.findAll({
                where: {
                    id: params.categories,
                    businessId: user.businessId,
                },
            });

            for (const category of params.categories) {
                const found = allCategories.find(item => item.id === category);

                if (!found) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La categoría con id ${category} no fue encontrada.`,
                    });
                }

                const alreadyExist = area.salesCategories?.find(
                    item => item.id === category
                );

                if (!alreadyExist) {
                    listBulkCategories.push({
                        areaId: area.id,
                        salesCategoryId: category,
                    });
                }
            }

            let listToDeleted = [];
            for (const category of area.salesCategories || []) {
                const found = params.categories.find(
                    (item: number) => item === category.id
                );

                if (!found) {
                    listToDeleted.push(category.id);
                }
            }

            if (listToDeleted.length !== 0) {
                await CategorySalesPoint.destroy({
                    where: {
                        areaId: area.id,
                        salesCategoryId: listToDeleted,
                    },
                    transaction: t,
                });
            }

            if (listBulkCategories.length !== 0) {
                await CategorySalesPoint.bulkCreate(listBulkCategories, {
                    transaction: t,
                });
            }
        }

        await area.save({ transaction: t });

        const area_to_emit = await Area.scope(area.type).findByPk(area.id, {
            transaction: t,
        });

        await t.commit();

        res.status(201).json(area_to_emit);

        //Analyzing cache and remove key in case exist
        await redisClient.del(getLongTermKey(area.id, "area", "get"));
    } catch (error: any) {
        t.rollback();
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

export const manageProductsInAreaSale = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { categories, ...params } = req.body;
        const user: User = req.user;

        //Validations
        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await Area.findByPk(id, {
            include: [{ model: SalesCategory, as: "salesCategories" }],
        });

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        if (area.type !== "SALE") {
            t.rollback();
            return res.status(404).json({
                message: `El área proporcionada no es un Punto de Venta.`,
            });
        }

        //Permission Check
        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (params.saleOnlyMyStock) {
            area.saleOnlyMyStock = true;
            area.saleByCategory = false;
        }

        if (categories) {
            area.saleByCategory = true;
            area.saleOnlyMyStock = false;

            //Removing all categories assigned
            await CategorySalesPoint.destroy({
                where: {
                    areaId: id,
                },
                transaction: t,
            });

            if (categories.length !== 0) {
                const categories_found = await SalesCategory.findAll({
                    where: {
                        id: categories,
                        businessId: user.businessId,
                    },
                });

                let addCategoryBulk: any = [];
                for (const category of categories) {
                    const found = categories_found.find(
                        item => item.id === category
                    );

                    if (!found) {
                        t.rollback();
                        return res.status(404).json({
                            message: `Category id ${category} not found.`,
                        });
                    }

                    addCategoryBulk.push({
                        salesCategoryId: category,
                        areaId: area.id,
                    });
                }

                await CategorySalesPoint.bulkCreate(addCategoryBulk, {
                    transaction: t,
                });
            }
        }

        if (!params.saleOnlyMyStock && !categories) {
            area.saleOnlyMyStock = false;
            area.saleByCategory = false;
        }
        await area.save({ transaction: t });

        const area_to_emit = await Area.scope(area.type).findByPk(area.id, {
            transaction: t,
        });

        await t.commit();

        res.status(201).json(area_to_emit);
    } catch (error: any) {
        t.rollback();
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

export const manageManufacturerInAreaProduction = async (
    req: any,
    res: Response
) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { products } = req.body;
        const user: User = req.user;

        //Validations
        if (isNaN(id)) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await Area.findByPk(id, {
            include: [{ model: Product, as: "listManufacturations" }],
        });

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Área no encontrada`,
            });
        }

        if (area.type !== "MANUFACTURER") {
            t.rollback();
            return res.status(404).json({
                message: `El área proporcionada no es un área de Procesado.`,
            });
        }

        //Permission Check
        if (area.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (!products) {
            area.limitProductProduction = false;
        } else {
            area.limitProductProduction = true;

            //Removing all Manufacturations assigned
            await AreaProductManufacturation.destroy({
                where: {
                    manufacturerAreaId: id,
                },
                transaction: t,
            });

            if (products.length !== 0) {
                const products_found = await Product.findAll({
                    where: {
                        id: products,
                        businessId: user.businessId,
                    },
                });

                let addBulkProduct: any = [];
                for (const productId of products) {
                    const found = products_found.find(
                        item => item.id === productId
                    );

                    if (!found) {
                        t.rollback();
                        return res.status(404).json({
                            message: `El producto con id ${productId} no fue encontrado.`,
                        });
                    }

                    if (
                        ![
                            "STOCK",
                            "MANUFACTURED",
                            "VARIATION",
                            "WASTE",
                        ].includes(found.type)
                    ) {
                        t.rollback();
                        return res.status(404).json({
                            message: `El producto con id ${found.name} no es de un tipo válido. Tipos de productos permitidos: Almacén/Procesado/Variables/Desecho.`,
                        });
                    }

                    addBulkProduct.push({
                        productId,
                        manufacturerAreaId: area.id,
                    });
                }

                await AreaProductManufacturation.bulkCreate(addBulkProduct, {
                    transaction: t,
                });
            }
        }

        await area.save({ transaction: t });

        const area_to_emit = await Area.scope(area.type).findByPk(area.id, {
            transaction: t,
        });

        await t.commit();

        res.status(201).json(area_to_emit);
    } catch (error: any) {
        t.rollback();
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

export const getArea = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await getAreaCache(id);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        //Permission Check
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        const area_to_return = await Area.scope(area.type).findByPk(id);

        res.status(200).json(area_to_return);
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

export const deleteArea = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await Area.findByPk(id);

        if (!area) {
            t.rollback();
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        //Permission Check
        if (area?.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a acceder a este recurso. Acceso denegado.`,
            });
        }

        //Validations
        if (area.isMainStock) {
            t.rollback();
            return res.status(401).json({
                message: `No puede eliminar el área establecida como Almacén principal.`,
            });
        }

        if (area.type === "STOCK") {
            //Analyzing if products in this area
            const products_found = await StockAreaProduct.count({
                where: {
                    areaId: area.id,
                },
            });

            if (products_found !== 0) {
                t.rollback();
                return res.status(400).json({
                    message: `Existen productos en el área seleccionadas. Vacíe el área antes de eliminarla.`,
                });
            }

            //Moving area associations if exist to Main Stock
            const find_main_stock = await Area.findOne({
                where: {
                    isMainStock: true,
                    businessId: user.businessId,
                },
            });

            if (find_main_stock) {
                await Area.update(
                    {
                        stockAreaId: find_main_stock.id,
                    },
                    {
                        where: {
                            stockAreaId: area.id,
                        },
                        transaction: t,
                    }
                );
            }
        } else if (area.type === "MANUFACTURER") {
            //Deleting all dependencies
            await ProductionArea.destroy({
                where: { areaId: area.id },
                transaction: t,
            });
        }

        await area.destroy({ transaction: t });

        await t.commit();
        res.status(204).json({});
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const findAllAreas = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            order,
            orderBy,
            search,
            all_data,
            inAllMyBusiness,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "isActive",
            "type",
            "isMainStock",
            "salesMode",
        ];
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
                where(fn("unaccent", col("Area.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        let moreBusiness = [user.businessId];
        if (inAllMyBusiness && inAllMyBusiness === "true") {
            moreBusiness = await getAllBranchBusiness(user);
        }

        const found_areas = await Area.findAndCountAll({
            distinct: true,
            where: { businessId: moreBusiness, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_areas.count / limit);
        if (found_areas.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        //Preparing data to send
        let areasIds: any = {
            SALE: [],
            STOCK: [],
            MANUFACTURER: [],
            ACCESSPOINT: [],
        };
        found_areas.rows.forEach(item => {
            areasIds[item.type].push(item.id);
        });

        let query: any = [];
        Object.keys(areasIds).forEach(key => {
            if (areasIds[key].length !== 0) {
                query.push(
                    Area.scope(key).findAll({ where: { id: areasIds[key] } })
                );
            }
        });

        const areas = await Promise.all(query);
        let areas_to_return: any = [];
        areas.forEach(item => {
            areas_to_return = areas_to_return.concat(item);
        });

        res.status(200).json({
            totalItems: found_areas.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: areas_to_return,
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

export const shareArea = async (req: any, res: Response) => {
    try {
        const { areaId, businessDNI } = req.body;
        const user: User = req.user;

        if (!areaId) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `Area not found`,
            });
        }

        if (area.type !== "STOCK") {
            return res.status(404).json({
                message: `Solo es posible compartir áreas de tipo Almacén`,
            });
        }

        //Permission Check
        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        const business = await Business.findOne({
            where: {
                dni: businessDNI,
            },
        });

        if (!business) {
            return res.status(404).json({
                message: `El DNI del negocio seleccionado no fue encontrado.`,
            });
        }

        const areaShared = await SharedArea.findOne({
            where: {
                sharedBusinessId: business.id,
                areaId,
            },
        });

        if (areaShared) {
            return res.status(400).json({
                message: `El área actual ya fue compartida con el negocio proporcionado.`,
            });
        }

        const areaToShare: SharedArea = SharedArea.build({
            sharedBusinessId: business.id,
            areaId,
            sharedById: user.id,
        });

        await areaToShare.save();

        const areaDetails = await SharedArea.scope("to_return").findByPk(
            areaToShare.id
        );

        res.status(200).json(areaDetails);
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

export const deleteShareArea = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const sharedArea = await SharedArea.findByPk(id, {
            include: [Area],
        });

        if (!sharedArea) {
            return res.status(404).json({
                message: `El área compartida introducida no fue encontrada.`,
            });
        }

        //Permission Check
        if (sharedArea.area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `You are not allow to access this request`,
            });
        }

        await sharedArea.destroy();

        res.status(204).json({ message: "Operation completed" });
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

export const getMySharedAreas = async (req: any, res: Response) => {
    try {
        const user = req.user;

        const found_areas = await SharedArea.findAndCountAll({
            attributes: ["id", "createdAt"],
            include: [
                {
                    model: Area,
                    attributes: ["id", "name"],
                    where: {
                        businessId: user.businessId,
                    },
                },
                {
                    model: Business,
                    attributes: ["id", "name"],
                },
                {
                    model: User,
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
            ],
        });

        res.status(200).json(found_areas);
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

export const findAllSharedAreas = async (req: any, res: Response) => {
    try {
        const { per_page, page, order, orderBy, search, all_data, ...params } =
            req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["isActive", "isMainStock"];
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
                where(fn("unaccent", col("Area.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        const sharedAreas = await SharedArea.findAll({
            where: {
                sharedBusinessId: user.businessId,
            },
        });

        const sharedIds = sharedAreas.map(item => item.areaId);

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_areas = await Area.findAndCountAll({
            distinct: true,
            attributes: [
                "id",
                "name",
                "code",
                "description",
                "type",
                "isActive",
                "isPublicVisible",
                "isMainStock",
                "allowDirectlyMovements",
                "productionOrderController",
            ],
            include: [
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Business,
                    attributes: ["id", "name"],
                },
            ],
            where: { id: sharedIds, type: "STOCK", ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        //Normalizing areas names
        const to_return = found_areas.rows.map(item => {
            return {
                //@ts-ignore
                ...item.dataValues,
                name: `(${item.business?.name}) - ${item?.name}`,
            };
        });

        let totalPages = Math.ceil(found_areas.count / limit);
        if (found_areas.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_areas.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: to_return,
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

//Fund transfers
export const newFundDestination = async (req: any, res: Response) => {
    try {
        const { accountId, accountAddress, ...params } = req.body;
        const user: User = req.user;

        //Checking area sent
        const area = await getAreaCache(params.areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área introducida no fue encontrada.`,
            });
        }

        if (area.type !== "SALE") {
            return res.status(404).json({
                message: `El área introducida no es de tipo Punto de Venta.`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        if (!moreBusiness.includes(area.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const account = await Account.findByPk(accountId, {
            include: [
                {
                    model: User,
                    as: "allowedUsers",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!account) {
            return res.status(404).json({
                message: `Account not found`,
            });
        }

        //Checking if action belongs to user Business
        if (account.isPrivate) {
            if (
                account.ownerId !== user.id &&
                !account.allowedUsers?.find(item => item.id === user.id) &&
                !user.isSuperAdmin
            ) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }
        } else {
            if (
                !moreBusiness.includes(account.businessId) &&
                !user.isSuperAdmin
            ) {
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }
        }

        let body: any = {
            accountId,
        };

        const fundDestionation: FundDestination = FundDestination.build({
            ...params,
            ...body,
        });

        await fundDestionation.save();

        const to_return = await FundDestination.scope("to_return").findByPk(
            fundDestionation.id
        );

        res.status(201).json(to_return);
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

export const editFundDestination = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(FundDestination.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "areaId", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const fundDestination = await FundDestination.findByPk(id);

        if (!fundDestination) {
            return res.status(404).json({
                message: `El objeto no fue encontrado`,
            });
        }

        const area = await Area.findByPk(fundDestination.areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área introducida no fue encontrada.`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        if (!moreBusiness.includes(area.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (params.accountId) {
            const account = await Account.findByPk(params.accountId, {
                include: [
                    {
                        model: User,
                        as: "allowedUsers",
                        through: {
                            attributes: [],
                        },
                    },
                ],
            });

            if (!account) {
                return res.status(404).json({
                    message: `Account not found`,
                });
            }

            //TODO: Change after Patricia annoying
            //Checking if action belongs to user Business
            if (account.isPrivate) {
                if (
                    account.ownerId !== user.id &&
                    !account.allowedUsers?.find(item => item.id === user.id) &&
                    !user.isSuperAdmin
                ) {
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            } else {
                if (
                    !moreBusiness.includes(account.businessId) &&
                    !user.isSuperAdmin
                ) {
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            }
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                fundDestination[att] = params[att];
            }
        });

        await fundDestination.save();

        const to_return = await FundDestination.scope("to_return").findByPk(
            fundDestination.id
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

export const findAllFundDestinations = async (req: any, res: Response) => {
    try {
        const { areaId } = req.params;
        const { per_page, page, order, orderBy, all_data } = req.query;
        const user: User = req.user;

        //Validations
        const area = await getAreaCache(areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área introducida no fue encontrada.`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //Order
        let ordenation;
        if (
            orderBy &&
            ["createdAt", "paymentWay", "codeCurrency"].includes(orderBy)
        ) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "ASC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_fund_destinations = await FundDestination.findAndCountAll({
            distinct: true,
            where: { areaId, ...where_clause },
            attributes: ["id", "codeCurrency", "paymentWay", "default"],
            include: [
                {
                    model: Area,
                    attributes: ["id", "name", "code"],
                },
                {
                    model: Account,
                    attributes: ["id", "name", "code"],
                },
                {
                    model: AccountTag,
                    attributes: ["id", "name", "code"],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_fund_destinations.count / limit);
        if (found_fund_destinations.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_fund_destinations.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_fund_destinations.rows,
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

export const deleteFundDestination = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const fundDestination = await FundDestination.findByPk(id);

        if (!fundDestination) {
            return res.status(404).json({
                message: `FundDestination not found`,
            });
        }

        const area = await getAreaCache(fundDestination.areaId);

        if (!area) {
            return res.status(404).json({
                message: `El área introducida no fue encontrada.`,
            });
        }

        if (area.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await fundDestination.destroy();

        res.status(200).json({
            message: `FundDestination deleted successfully`,
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
