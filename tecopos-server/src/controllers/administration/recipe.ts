import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";

import User from "../../database/models/user";
import Logger from "../../lib/logger";
import Recipe from "../../database/models/recipe";
import Product from "../../database/models/product";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import { mathOperation } from "../../helpers/utils";
import ConfigurationKey from "../../database/models/configurationKey";
import { productQueue } from "../../bull-queue/product";
import { hasRecipeCircularDependency } from "../helpers/utils";
import Supply from "../../database/models/supply";
import { getBusinessConfigCache } from "../../helpers/redisStructure";

export const getRecipe = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const recipe = await Recipe.findByPk(id);

        if (!recipe) {
            return res.status(404).json({
                message: `Recipe not found`,
            });
        }

        //Checking if action belongs to user Business
        if (recipe.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const to_return = await Recipe.scope("to_return").findByPk(recipe.id);

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

export const newRecipe = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        const recipe: Recipe = Recipe.build({
            businessId: user.businessId,
            ...params,
        });

        await recipe.save();

        const to_return = await Recipe.scope("to_return").findByPk(recipe.id);

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

export const editRecipe = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(Recipe.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        [
            "id",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "businessId",
            "totalCost",
        ].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        const recipe = await Recipe.findOne({
            where: {
                id,
                businessId: user.businessId,
            },
        });

        if (!recipe) {
            return res.status(404).json({
                message: `Recipe not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                recipe[att] = params[att];
            }
        });

        await recipe.save();

        const to_return = await Recipe.scope("to_return").findByPk(recipe.id);

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

export const findAllRecipe = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, areaId, all_data } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

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
                where(fn("unaccent", col("Recipe.name")), {
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

        const found_recipes = await Recipe.findAndCountAll({
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            attributes: [
                "id",
                "name",
                "measure",
                "unityToBeProduced",
                "totalCost",
                "unityToBeProducedCost",
            ],
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_recipes.count / limit);
        if (found_recipes.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_recipes.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_recipes.rows,
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

export const deleteRecipe = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const recipe = await Recipe.findByPk(id);

        if (!recipe) {
            return res.status(404).json({
                message: `Recipe not found`,
            });
        }

        //Checking if action belongs to user Business
        if (recipe.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await recipe.destroy();

        res.status(200).json({
            message: `Recipe deleted successfully`,
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

interface RecipeRawItem {
    quantity: number;
    productId: number;
}

export const manageRawProductsRecipe = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { products, measure, unityToBeProduced, realPerformance } =
            req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Recipe
        const recipe = await Recipe.findByPk(id);

        if (!recipe) {
            t.rollback();
            return res.status(404).json({
                message: `La receta no fue encontrada.`,
            });
        }

        //Checking if action belongs to user Business
        if (recipe.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Updating recipe data
        recipe.measure = measure;
        recipe.unityToBeProduced = unityToBeProduced;
        recipe.realPerformance = realPerformance;

        //Check if product exist
        const ids: Array<number> = products.map(
            (item: RecipeRawItem) => item.productId
        );

        const products_found = await Product.findAll({
            where: {
                id: ids,
                businessId: user.businessId,
            },
        });

        if (products.length === 0) {
            //Special case means delete all products in Recipe
            await ProductRawRecipe.destroy({
                where: {
                    recipeId: id,
                },
                transaction: t,
            });
        } else {
            //Obtaining all Product to compare
            const current_raw_products = await ProductRawRecipe.findAll({
                where: {
                    recipeId: id,
                },
            });

            let addBulk = [];
            for (const product_received of products as RecipeRawItem[]) {
                const found_check = products_found.find(
                    item => item.id === product_received.productId
                );

                if (found_check) {
                    //Checking product type
                    if (
                        !["STOCK", "WASTE", "MANUFACTURED", "RAW"].includes(
                            found_check.type
                        )
                    ) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Los componentes de una receta solo pueden ser productos de tipo Almacén, Materia prima, Procesado o Desperdicio.`,
                        });
                    }

                    if (found_check.recipeId === id) {
                        t.rollback();
                        return res.status(400).json({
                            message: `El producto ${found_check.name} tiene asignado la receta actual. Dependencia circular. Operación no permitida.`,
                        });
                    }

                    //Analyzing if no cycle dependencie
                    const hasCircularDep = await hasRecipeCircularDependency(
                        found_check.id,
                        id
                    );

                    if (hasCircularDep) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Se detectó una dependencia circular con el producto ${found_check.name}. Por favor elimínelo para continuar.`,
                        });
                    }

                    //Search in current_supplies;
                    const already_exist = current_raw_products.find(
                        item => item.productId === product_received.productId
                    );

                    if (!already_exist) {
                        //It is new
                        addBulk.push({
                            quantity: product_received.quantity,
                            productId: product_received.productId,
                            recipeId: id,
                        });
                    } else {
                        already_exist.quantity = product_received.quantity;
                        await already_exist.save({ transaction: t });
                    }
                }
            }

            await ProductRawRecipe.bulkCreate(addBulk, { transaction: t });

            //Checking removed
            let idsToRemove = [];
            for (const productRecipe of current_raw_products) {
                const exist = products_found.find(
                    item => item.id === productRecipe.productId
                );

                if (!exist) {
                    idsToRemove.push(productRecipe.id);
                }
            }

            await ProductRawRecipe.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: t,
            });
        }

        //Calculating recipe data
        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const allRawProducts = await ProductRawRecipe.findAll({
            where: {
                recipeId: id,
            },
            include: [Product],
            transaction: t,
        });

        //Consumption Index
        let bulkUpdate = [];
        for (const rawProduct of allRawProducts) {
            const index = mathOperation(
                rawProduct.quantity,
                realPerformance,
                "division",
                precission_after_coma
            );
            bulkUpdate.push({
                id: rawProduct.id,
                consumptionIndex: index,
            });
        }

        await ProductRawRecipe.bulkCreate(bulkUpdate, {
            transaction: t,
            updateOnDuplicate: ["consumptionIndex"],
        });

        //Total Cost
        //Raw materials
        const totalCost = allRawProducts.reduce(
            (acc, item) =>
                (acc += mathOperation(
                    item.product.averageCost,
                    item.quantity,
                    "multiplication",
                    precission_after_coma
                )),
            0
        );

        const unityToBeProducedCost = mathOperation(
            totalCost,
            realPerformance,
            "division",
            precission_after_coma
        );

        recipe.totalCost = totalCost;
        recipe.unityToBeProducedCost = unityToBeProducedCost;

        await recipe.save({ transaction: t });
        await t.commit();

        const recipe_to_emit = await Recipe.scope("to_return").findByPk(id);

        productQueue.add(
            {
                code: "PROPAGATE_RECIPE_COST",
                params: {
                    recipeId: id,
                    businessId: recipe.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json(recipe_to_emit);
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

export const associateProductToRecipe = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { products } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const recipe = await Recipe.findByPk(id);

        if (!recipe) {
            t.rollback();
            return res.status(404).json({
                message: `La receta no fue encontrada.`,
            });
        }

        //Checking if action belongs to user Business
        if (recipe.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let products_found: Array<Product> = [];
        let bulkUpdate = [];
        if (products.length !== 0) {
            //Check if products exists
            products_found = await Product.findAll({
                where: {
                    id: products,
                    businessId: user.businessId,
                },
                include: [
                    {
                        model: Supply,
                        as: "supplies",
                    },
                ],
            });

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
                    ["COMBO", "VARIATION", "WASTE", "ASSET"].includes(
                        found.type
                    )
                ) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${found.name} no puede tener asociado recetas ni ficha técnica.`,
                    });
                }

                if (!!found.recipeId && found.recipeId !== recipe.id) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${found.name} ya tiene una receta asociada.`,
                    });
                }

                if (found.supplies.length > 0) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El producto ${found.name} tiene productos asociados en su ficha técnica. Elimínelos para continuar.`,
                    });
                }

                bulkUpdate.push({
                    id: productId,
                    recipeId: id,
                });
            }
        }

        //Removing product not include
        const originalProductsRecipe = await Product.findAll({
            where: {
                recipeId: id,
            },
        });
        for (const product of originalProductsRecipe) {
            const exist = products_found.find(item => item.id === product.id);

            if (!exist) {
                bulkUpdate.push({
                    id: product.id,
                    recipeId: null,
                });
            }
        }

        await Product.bulkCreate(bulkUpdate, {
            transaction: t,
            updateOnDuplicate: ["recipeId"],
        });

        await t.commit();

        const recipe_to_emit = await Recipe.scope("to_return").findByPk(id);

        res.status(200).json(recipe_to_emit);

        //Propagating cost from recipe
        const productToUpdate = bulkUpdate.filter(item => !!item.recipeId);
        for (const product of productToUpdate) {
            productQueue.add(
                {
                    code: "UPDATE_COST",
                    params: {
                        productId: product.id,
                        businessId: recipe.businessId,
                    },
                },
                {
                    attempts: 2,
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );
        }

        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: products,
                    businessId: user.businessId,
                },
            },
            {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: true,
            }
        );
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
