import Queue from "bull";
import { Op, where, fn, col } from "sequelize";
import moment from "moment";

import { JobProductData } from "./interfaces";
import Product from "../database/models/product";
import Supply from "../database/models/supply";
import ProductFixedCost from "../database/models/productFixedCost";
import { mathOperation } from "../helpers/utils";
import Logger from "../lib/logger";
import Combo from "../database/models/Combo";
import { wooQueue } from "./wocommerce";
import ProductRawRecipe from "../database/models/productRawRecipe";
import Recipe from "../database/models/recipe";
import Area from "../database/models/area";
import StockAreaProduct from "../database/models/stockAreaProduct";
import { getBusinessConfigCache } from "../helpers/redisStructure";

export const productQueue = new Queue(
    `product-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
productQueue.process(async (job: Queue.Job<JobProductData>, done) => {
    try {
        switch (job.data.code) {
            case "UPDATE_RECIPE_COST": {
                const { recipeId, businessId } = job.data.params;

                const recipe = await Recipe.findByPk(recipeId);

                if (!recipe) {
                    done();
                    Logger.warn(
                        `La receta con id ${recipeId} a propagar su costo no fue encontrado`,
                        {
                            businessId,
                            origin: "productQueue/UPDATE_RECIPE_COST",
                        }
                    );
                    return;
                }

                //Precission
                const configurations = await getBusinessConfigCache(businessId);

                const precission_after_coma = configurations.find(
                    item => item.key === "precission_after_coma"
                )?.value;

                const allRawProducts = await ProductRawRecipe.findAll({
                    where: {
                        recipeId,
                    },
                    include: [Product],
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
                    recipe.realPerformance,
                    "division",
                    precission_after_coma
                );

                recipe.unityToBeProducedCost = unityToBeProducedCost;
                recipe.totalCost = totalCost;
                await recipe.save();

                productQueue.add(
                    {
                        code: "PROPAGATE_RECIPE_COST",
                        params: {
                            recipeId: recipe.id,
                            businessId,
                        },
                    },
                    {
                        attempts: 2,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );

                done();
                break;
            }

            case "PROPAGATE_RECIPE_COST": {
                const { recipeId, businessId } = job.data.params;

                const recipe = await Recipe.findByPk(recipeId);

                if (!recipe) {
                    done();
                    Logger.warn(
                        `La receta con id ${recipeId} a propagar su costo no fue encontrado`,
                        {
                            businessId,
                            origin: "productQueue/PROPAGATE_RECIPE_COST",
                        }
                    );
                    return;
                }

                //Updating all products associated
                const products = await Product.findAll({
                    where: {
                        recipeId,
                    },
                });

                for (const product of products) {
                    productQueue.add(
                        {
                            code: "UPDATE_COST",
                            params: {
                                productId: product.id,
                                businessId,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                done();
                break;
            }

            case "PROPAGATE_COST": {
                const { productId, businessId, fullProduct } = job.data.params;

                let product;

                if (fullProduct) {
                    product = fullProduct;
                } else {
                    product = await Product.findByPk(productId);
                }

                if (!product) {
                    done();
                    Logger.warn(
                        `El producto ${productId} a propagar su costo no fue encontrado`,
                        { businessId, origin: "productQueue/PROPAGATE_COST" }
                    );
                    return;
                }

                //1. Checking if product is include as supplies
                const dependencies = await Supply.findAll({
                    where: {
                        supplyId: productId,
                    },
                    include: [{ model: Product, as: "baseProduct" }],
                });

                for (const dependant of dependencies) {
                    productQueue.add(
                        {
                            code: "UPDATE_COST",
                            params: {
                                productId: dependant.baseProductId,
                                businessId,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                //2. Checking if product is include as composed in any combo type
                const combos = await Combo.findAll({
                    where: {
                        composedId: productId,
                    },
                });

                for (const combo of combos) {
                    productQueue.add(
                        {
                            code: "UPDATE_COST",
                            params: {
                                productId: combo.comboBaseProductId,
                                businessId,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                //3. Checking if product belong to a recipe
                const allRecipes = await Recipe.findAll({
                    include: [
                        {
                            model: ProductRawRecipe,
                            where: {
                                productId,
                            },
                        },
                    ],
                });

                for (const recipe of allRecipes) {
                    productQueue.add(
                        {
                            code: "UPDATE_RECIPE_COST",
                            params: {
                                recipeId: recipe.id,
                                businessId,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                done();
                break;
            }

            case "UPDATE_COST": {
                const { productId, businessId, fullProduct } = job.data.params;

                let product: Product | null;

                if (fullProduct) {
                    product = fullProduct;
                } else {
                    product = await Product.findByPk(productId, {
                        include: [
                            {
                                model: Supply,
                                attributes: ["id", "quantity"],
                                as: "supplies",
                                include: [
                                    {
                                        model: Product,
                                        as: "supply",
                                    },
                                ],
                            },
                            ProductFixedCost,
                            Recipe,
                            {
                                model: Combo,
                                as: "compositions",
                                include: [
                                    {
                                        model: Product,
                                        as: "composed",
                                        paranoid: true,
                                    },
                                ],
                            },
                        ],
                    });
                }

                if (!product) {
                    done();
                    Logger.warn(
                        `El producto ${productId} al actualizar su costo no fue encontrado`,
                        { businessId, origin: "productQueue/UPDATE_COST" }
                    );
                    return;
                }

                //Precission
                const configurations = await getBusinessConfigCache(
                    product.businessId
                );

                const precission_after_coma = configurations.find(
                    item => item.key === "precission_after_coma"
                )?.value;

                let totalCost = 0;

                if (product.type === "COMBO") {
                    totalCost = product.compositions.reduce(
                        (total, item) =>
                            (total += mathOperation(
                                item.quantity,
                                item.composed.averageCost,
                                "multiplication",
                                precission_after_coma
                            )),
                        0
                    );
                } else {
                    if (product.recipe) {
                        totalCost += product.recipe.unityToBeProducedCost;
                    } else {
                        totalCost =
                            product.supplies.reduce(
                                (total, item) =>
                                    (total += mathOperation(
                                        item.quantity,
                                        item.supply.averageCost,
                                        "multiplication",
                                        precission_after_coma
                                    )),
                                0
                            ) || 0;
                    }

                    totalCost +=
                        product.fixedCosts.reduce(
                            (total, item) => (total += item.costAmount),
                            0
                        ) || 0;
                }

                //Setting product performance
                if (!product.performance) {
                    product.performance = 1;
                }

                product.averageCost = mathOperation(
                    totalCost,
                    product.performance || 1,
                    "division",
                    precission_after_coma
                );

                product.isCostDefined =
                    product.supplies.length !== 0 ||
                    product.fixedCosts.length !== 0 ||
                    product.compositions.length !== 0 ||
                    !!product.recipe;

                await product.save();

                productQueue.add(
                    {
                        code: "PROPAGATE_COST",
                        params: {
                            productId: product.id,
                            businessId: product.businessId,
                            fullProduct: product,
                        },
                    },
                    { attempts: 2, removeOnComplete: true, removeOnFail: true }
                );

                done();
                break;
            }
            case "ANALYZE_COMBO_DISPONIBILITY": {
                const { productsIds } = job.data.params;

                const listProducts = await Product.findAll({
                    where: {
                        id: productsIds,
                    },
                    include: [
                        {
                            model: Combo,
                            as: "compositions",
                            include: [
                                {
                                    model: Product,
                                    as: "composed",
                                    paranoid: true,
                                },
                            ],
                        },
                    ],
                });

                const comboProducts = listProducts.filter(
                    item => item.type === "COMBO"
                );

                if (comboProducts.length !== 0) {
                    let listBulkComboToDisable = [];
                    for (const combo of comboProducts) {
                        if (combo.compositions.length === 0) {
                            listBulkComboToDisable.push({
                                id: combo.id,
                                totalQuantity: 0,
                            });
                        } else {
                            const outStock = combo.compositions.some(
                                item =>
                                    item.composed?.stockLimit &&
                                    item.composed.totalQuantity < item.quantity
                            );

                            if (outStock) {
                                listBulkComboToDisable.push({
                                    id: combo.id,
                                    totalQuantity: 0,
                                });
                            } else {
                                //Calculating minimum disponibility
                                const totalQuantity = combo.compositions.reduce(
                                    (minimum, item) => {
                                        if (item.composed.stockLimit) {
                                            const disponibility = Math.floor(
                                                item.composed.totalQuantity /
                                                    item.quantity
                                            );
                                            if (disponibility < minimum) {
                                                return disponibility;
                                            }
                                        }

                                        return minimum;
                                    },
                                    Number.MAX_SAFE_INTEGER
                                );

                                if (combo.totalQuantity !== totalQuantity) {
                                    listBulkComboToDisable.push({
                                        id: combo.id,
                                        totalQuantity,
                                    });
                                }
                            }
                        }
                    }

                    if (listBulkComboToDisable.length !== 0) {
                        await Product.bulkCreate(listBulkComboToDisable, {
                            updateOnDuplicate: ["totalQuantity"],
                        });
                    }

                    //Requesting to check in case Woo is active
                    wooQueue.add(
                        {
                            code: "UPDATE_PRODUCT_STOCK_QUANTITIES",
                            params: {
                                productsIds: listBulkComboToDisable.map(
                                    item => item.id
                                ),
                                businessId: comboProducts[0].businessId,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                done();
                break;
            }
            case "CHECKING_PRODUCT": {
                const { productsIds, businessId } = job.data.params;

                const listProducts = await Product.findAll({
                    where: {
                        id: productsIds,
                    },
                    include: [
                        {
                            model: Supply,
                            as: "supplies",
                            include: [
                                {
                                    model: Product,
                                    as: "supply",
                                },
                            ],
                            required: false,
                        },
                        Recipe,
                    ],
                });

                //1. Analyzing if product are under limit/if are manufacturable
                let bulkProducts = [];
                for (const product of listProducts) {
                    const isUnder = !!(
                        product.totalQuantity < product.alertLimit
                    );
                    const isManufacturable =
                        product.supplies.length !== 0 || !!product.recipe;

                    if (
                        product.isUnderAlertLimit !== isUnder ||
                        product.isManufacturable !== isManufacturable
                    ) {
                        bulkProducts.push({
                            id: product.id,
                            isUnderAlertLimit: isUnder,
                            isManufacturable,
                        });
                    }
                }

                if (bulkProducts.length !== 0) {
                    await Product.bulkCreate(bulkProducts, {
                        updateOnDuplicate: [
                            "isUnderAlertLimit",
                            "isManufacturable",
                        ],
                    });
                }

                //2. Analyzing if product belong to any combo product, if so checking disponibility and stablishing totalQuantity
                let checkCombosIds = listProducts
                    .filter(item => item.type === "COMBO")
                    .map(item => item.id);

                const foundComboDependencies = await Combo.findAll({
                    where: {
                        composedId: productsIds,
                    },
                });

                for (const comboDependency of foundComboDependencies) {
                    const found = checkCombosIds.find(
                        item => item === comboDependency.comboBaseProductId
                    );
                    if (!found) {
                        checkCombosIds.push(comboDependency.comboBaseProductId);
                    }
                }

                if (checkCombosIds.length !== 0) {
                    productQueue.add(
                        {
                            code: "ANALYZE_COMBO_DISPONIBILITY",
                            params: {
                                productsIds: checkCombosIds,
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );
                }

                //3. Analyze if are indexable in online shop
                //Filtering STOCK and VARIATION products
                const filteredProducts = listProducts.filter(item =>
                    ["STOCK", "VARIATION"].includes(item.type)
                );

                if (filteredProducts.length !== 0) {
                    //Getting configuration data
                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    let onlineStockId = configurations.find(
                        item => item.key === "online_shop_area_stock"
                    )?.value;

                    if (!onlineStockId || isNaN(Number(onlineStockId))) {
                        const mainStockArea = await Area.findOne({
                            where: {
                                isMainStock: true,
                                businessId,
                            },
                        });

                        if (mainStockArea) {
                            onlineStockId = mainStockArea.id;
                        }
                    }

                    if (onlineStockId) {
                        const allStockAreaProducts =
                            await StockAreaProduct.findAll({
                                where: {
                                    areaId: onlineStockId,
                                    quantity: {
                                        [Op.gt]: 0,
                                    },
                                    productId: filteredProducts.map(
                                        item => item.id
                                    ),
                                },
                            });

                        let bulkIndexableSaleProducts = [];
                        for (const product of filteredProducts) {
                            const found = allStockAreaProducts.find(
                                item => item.productId === product.id
                            );

                            let includeForSaleOnline = !!found;

                            if (product.showWhenOutStock) {
                                includeForSaleOnline = true;
                            }

                            if (
                                product.indexableToSaleOnline !==
                                includeForSaleOnline
                            ) {
                                bulkIndexableSaleProducts.push({
                                    id: product.id,
                                    indexableToSaleOnline: includeForSaleOnline,
                                });
                            }
                        }

                        if (bulkIndexableSaleProducts.length !== 0) {
                            await Product.bulkCreate(
                                bulkIndexableSaleProducts,
                                {
                                    updateOnDuplicate: [
                                        "indexableToSaleOnline",
                                    ],
                                }
                            );
                        }
                    }
                }

                done();
                break;
            }
            case "DEPRECIATE_PRODUCT": {
                const { product }: { product: Product } = job.data.params;

                if (product.averageCost < 0) {
                    done();
                    break;
                }

                const today = moment().format("DD");
                const productCreationDay = moment(product.createdAt).format(
                    "DD"
                );

                if (today === productCreationDay) {
                    const newCost = mathOperation(
                        product.averageCost,
                        product.monthlyDepreciationRate,
                        "subtraction",
                        2
                    );

                    if (newCost > 0) {
                        product.averageCost = newCost;
                    } else {
                        product.averageCost = 0;
                        product.enableDepreciation = false;
                    }

                    await product.save();
                }

                done();
                break;
            }
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
