import { Response } from "express";
import { Op, where, fn, col, QueryInterface } from "sequelize";

import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import xlsx from "node-xlsx";

import User from "../../database/models/user";
import Business from "../../database/models/business";
import SubscriptionPlan from "../../database/models/subscriptionPlan";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import PriceSystem from "../../database/models/priceSystem";
import Product from "../../database/models/product";
import Image from "../../database/models/image";
import ImageProduct from "../../database/models/imageProduct";
import ProductPrice from "../../database/models/productPrice";
import Area from "../../database/models/area";
import ProductionArea from "../../database/models/productionArea";
import ProductCategory from "../../database/models/productCategory";
import SalesCategory from "../../database/models/salesCategory";
import Price from "../../database/models/price";
import ProductAddon from "../../database/models/productAddon";
import ProductAttribute from "../../database/models/productAttribute";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Variation from "../../database/models/variation";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Supply from "../../database/models/supply";
import Combo from "../../database/models/Combo";
import ProductManufacturation from "../../database/models/productManufacturation";
import ProductionOrder from "../../database/models/productionOrder";
import ProductProductionOrder from "../../database/models/productProductionOrder";
import ConfigurationKey from "../../database/models/configurationKey";
import { productQueue } from "../../bull-queue/product";
import ProductFixedCost from "../../database/models/productFixedCost";
import { wooQueue } from "../../bull-queue/wocommerce";
import BusinessBranch from "../../database/models/businessBranch";
import {
    exchangeCurrency,
    internalCheckerResponse,
    mathOperation,
    truncateValue,
} from "../../helpers/utils";
import Logger from "../../lib/logger";
import moment from "moment";
import {
    checkReservationAvailability,
    hasCircularDependency,
} from "../helpers/utils";
import Supplier from "../../database/models/supplier";
import Recipe from "../../database/models/recipe";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import {
    addProductsToStockArea,
    getSuppliesDependencies,
    productDuplicator,
} from "../helpers/products";
import ProductRecords from "../../database/models/productRecord";
import ProductRecord from "../../database/models/productRecord";
import {
    getActiveEconomicCycleCache,
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";
import ResourceProduct from "../../database/models/productResource";
import Resource from "../../database/models/resource";
import ReservationPolicy from "../../database/models/reservationPolicy";
import ProductReservationPolicy from "../../database/models/productReservationPolicy ";
import { translateFieldProduct } from "../../helpers/translator";
import { SimplePrice } from "../../interfaces/commons";
import { measureType, productType } from "../../interfaces/nomenclators";
import StockMovement from "../../database/models/stockMovement";

//Product
export const importAndCreateProduct = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { areaStockId } = req.body;
        const user: User = req.user;

        if (
            !req.files ||
            Object.keys(req.files).length === 0 ||
            !req.files.file
        ) {
            t.rollback();
            return res.status(400).json({
                message: "No files were uploaded.",
            });
        }

        const { file } = req.files;

        if (file.length > 1) {
            t.rollback();
            return res.status(400).json({
                message: "Only one file is allowed",
            });
        }

        const splittedName = file.name.split(".");
        const ext = splittedName[splittedName.length - 1];

        if (!["xlsx"].includes(ext)) {
            return res.status(500).json({
                message: `La extensión ${ext} del archivo no está permitida - ${[
                    ".xlsx",
                ]}`,
            });
        }

        const name = uuidv4() + "." + ext;
        const uploadPath = path.join(__dirname, "../../public/temp", name);

        let promises = [];
        promises.push(
            file.mv(uploadPath, async (error: any) => {
                if (error) {
                    t.rollback();
                    Logger.error(error, {
                        "X-App-Origin": req.header("X-App-Origin"),
                    });
                    return res.status(500).json({
                        message:
                            "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
                    });
                }
            })
        );

        await Promise.all(promises).catch(error => {
            t.rollback();
            Logger.error(error, {
                "X-App-Origin": req.header("X-App-Origin"),
            });
            return res.status(500).json({
                message:
                    "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
            });
        });

        const sheetData = xlsx.parse(uploadPath)[0].data;

        console.log("=====");
        console.log(xlsx.parse(uploadPath)[0]);
        console.log("=====");

        if (!sheetData) {
            t.rollback();
            return res.status(400).json({
                message:
                    "No pudimos extraer la información del fichero proporcionado, por favor pruebe con otro.",
            });
        }

        //Analyzing all data
        //1. Finding all categories
        let [allSalesCategories, allProductCategories] = await Promise.all([
            SalesCategory.findAll({
                where: {
                    businessId: user.businessId,
                },
            }),
            ProductCategory.findAll({
                where: {
                    businessId: user.businessId,
                },
            }),
        ]);

        let newSalesCategoriesNames: Array<string> = [];
        let newProductCategoriesNames: Array<string> = [];

        // [
        // 0   'Nombre',
        // 1    'Tipo',
        // 2    'Categoría de venta',
        // 3    'Categoría de almacén',
        // 4    'Costo Unitario',
        // 5    'Cantidad',
        // 6    'U/Medida',
        // 7    'Precio de venta',
        // 8    'Moneda'
        // 9    'Código de barras'
        // 10    'Descripción'
        // ]

        for (const [index, row] of sheetData) {
            if (index === 0) continue;

            if (!row[2]) {
                const found = allSalesCategories.find(
                    item => item.name === row[2]
                );
                if (!found) {
                    newSalesCategoriesNames.push(row[2]);
                }
            }
            if (!row[3]) {
                const found = allProductCategories.find(
                    item => item.name === row[3]
                );
                if (!found) {
                    newProductCategoriesNames.push(row[2]);
                }
            }
        }

        if (newSalesCategoriesNames) {
            await SalesCategory.bulkCreate(
                newSalesCategoriesNames.map(name => ({
                    businessId: user.businessId,
                    name,
                })),
                { transaction: t }
            );
        }

        if (newProductCategoriesNames) {
            await ProductCategory.bulkCreate(
                newProductCategoriesNames.map(name => ({
                    businessId: user.businessId,
                    name,
                })),
                { transaction: t }
            );
        }

        //Reloading
        [allSalesCategories, allProductCategories] = await Promise.all([
            SalesCategory.findAll({
                where: {
                    businessId: user.businessId,
                },
                transaction: t,
            }),
            ProductCategory.findAll({
                where: {
                    businessId: user.businessId,
                },
                transaction: t,
            }),
        ]);

        const allProducts = await Product.findAll({
            where: {
                businessId: user.businessId,
            },
            transaction: t,
        });

        //Obtaining relevant data
        const availableCurrencies = await getCurrenciesCache(user.businessId);

        const main_currency = availableCurrencies.find(item => item.isMain);

        if (!main_currency) {
            t.rollback();
            return res.status(400).json({
                message: `There is no main currency defined.`,
            });
        }

        const business_configs = await getBusinessConfigCache(user.businessId);

        const costCurrency =
            business_configs.find(item => item.key === "general_cost_currency")
                ?.value || main_currency.currency.code;

        const precission_after_coma = business_configs.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const mainPriceSystem = await PriceSystem.findOne({
            where: {
                businessId: user.businessId,
                isMain: true,
            },
        });

        let bulkProducts = [];
        let stockQuantity: Array<{
            productId: number;
            quantity: number;
            costPrice: SimplePrice;
            type: productType;
        }> = [];

        const forSaleType = [
            "STOCK",
            "MENU",
            "COMBO",
            "SERVICE",
            "VARIATION",
            "ADDON",
        ];

        for (const [index, row] of sheetData) {
            if (index === 0) continue;

            let type: productType = "STOCK";
            let measure: measureType = "UNIT";

            if (!row[0]) {
                continue;
            }

            if (row[1]) {
                switch (row[1].toLowerCase()) {
                    case "agrego":
                    case "agregos":
                    case "addon":
                        type = "ADDON";
                        break;
                    case "elaborado":
                    case "elaborados":
                    case "menu":
                        type = "MENU";
                        break;
                    case "servicio":
                    case "servicios":
                    case "service":
                        type = "SERVICE";
                        break;
                    case "combo":
                    case "combos":
                        type = "COMBO";
                        break;
                    case "materia prima":
                    case "materias prima":
                    case "raw":
                        type = "RAW";
                        break;
                    case "procesado":
                    case "manufactured":
                        type = "MANUFACTURED";
                        break;
                    case "activo":
                    case "asset":
                        type = "ASSET";
                        break;
                    case "desperdicio":
                    case "merma":
                    case "waste":
                        type = "WASTE";
                        break;
                    default:
                        type = "STOCK";
                        break;
                }
            }

            if (row[6]) {
                switch (row[6].toLowerCase()) {
                    case "g":
                    case "gramo":
                        measure = "G";
                        break;
                    case "kilo":
                    case "kg":
                    case "kilogramo":
                        measure = "KG";
                        break;
                    case "libra":
                    case "pound":
                        measure = "POUND";
                        break;
                    case "litro":
                    case "litre":
                        measure = "LITRE";
                        break;
                    default:
                        measure = "UNIT";
                        break;
                }
            }

            const found = allProducts.find(item => item.name === row[0]);

            if (found) {
                if (["STOCK", "RAW", "MANUFACTURED", "ASSET"].includes(type)) {
                    if (row[5] && isNaN(Number(row[5]))) {
                        t.rollback();
                        return res.status(400).json({
                            message: `La cantidad introducida del producto ${row[0]} no es válida.`,
                        });
                    }

                    if (row[4] && isNaN(Number(row[4]))) {
                        t.rollback();
                        return res.status(400).json({
                            message: `El costo definido del producto ${row[0]} no es válido.`,
                        });
                    }

                    stockQuantity.push({
                        productId: found.id,
                        quantity: Number(row[5]) || 0,
                        costPrice: {
                            amount: Number(row[4]) || 0,
                            codeCurrency: costCurrency,
                        },
                        type,
                    });
                }
                continue;
            }

            let product: any = {
                name: row[0],
                type,
                businessId: user.businessId,
                salesCategoryId: allSalesCategories.find(
                    item => item.name === row[2]
                )?.id,
                productCategoryId: allProductCategories.find(
                    item => item.name === row[3]
                )?.id,
                showForSale: forSaleType.includes(type),
                isPublicVisible: forSaleType.includes(type),
                averageCost: row[4] || 0,
                measure,
                barCode: row[9] || "",
                description: row[10] || "",
                newArrival: true,
                newArrivalAt: moment().add(7, "day").toDate(),
            };

            if (["STOCK", "MENU", "ADDON", "SERVICE", "COMBO"].includes(type)) {
                if (row[7] && isNaN(Number(row[7]))) {
                    t.rollback();
                    return res.status(400).json({
                        message: `El precio definido del producto ${row[0]} no es válido.`,
                    });
                }

                const foundCurrency = availableCurrencies.find(
                    item => item.currency.code === row[8]
                );

                if (!foundCurrency) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La moneda del producto ${row[0]} no es una moneda válida.`,
                    });
                }

                product = {
                    ...product,
                    prices: [
                        {
                            price: row[7] || 0,
                            codeCurrency: row[8] || "CUP",
                            isMain: true,
                            priceSystemId: mainPriceSystem?.id,
                        },
                    ],
                };
            }

            bulkProducts.push(product);
        }

        const rowAffected = await Product.bulkCreate(bulkProducts, {
            include: [{ model: ProductPrice, as: "prices" }],
            transaction: t,
        });

        //After product creation
        //Update salesCode, universalCode
        let updatedProducts: Array<{
            id: number;
            salesCode: string;
            universalCode: number;
        }> = rowAffected.map(item => {
            return {
                id: item.id,
                salesCode: String(item.id).padStart(5, "0"),
                universalCode: item.id,
            };
        });

        await Product.bulkCreate(updatedProducts, {
            updateOnDuplicate: ["salesCode", "universalCode"],
            transaction: t,
        });

        //Adding to stock new products
        for (const product of rowAffected) {
            const row = sheetData.find(item => item[0] === product.name);
            if (row) {
                if (
                    row[5] &&
                    ["STOCK", "RAW", "MANUFACTURED", "ASSET"].includes(
                        product.type
                    )
                ) {
                    stockQuantity.push({
                        productId: product.id,
                        quantity: Number(row[5]) || 0,
                        costPrice: {
                            amount: Number(row[4]) || 0,
                            codeCurrency: costCurrency,
                        },
                        type: product.type,
                    });
                }
            }
        }

        //Preparing to process the entry in the stock
        if (areaStockId && stockQuantity.length !== 0) {
            //Generals
            const activeEconomicCycle = await getActiveEconomicCycleCache(
                user.businessId
            );

            //Block products
            await StockAreaProduct.findAll({
                where: {
                    productId: stockQuantity.map(item => item.productId),
                    areaId: areaStockId,
                },
                lock: true,
                transaction: t,
            });

            await Product.findAll({
                where: {
                    id: stockQuantity.map(item => item.productId),
                    businessId: user.businessId,
                },
                lock: true,
                transaction: t,
            });
            //-> END

            const retrieve_products = await Product.findAll({
                where: {
                    id: stockQuantity.map(item => item.productId),
                    businessId: user.businessId,
                },
                include: [{ model: Supply, as: "supplies" }, ProductFixedCost],
                transaction: t,
            });

            let bulkMovements = [];
            let bulkUpdateProducts: Array<{ id: number; averageCost: number }> =
                [];

            for (const product of stockQuantity) {
                const found = retrieve_products.find(
                    item => item.id === product.productId
                );

                if (!found) {
                    continue;
                }

                if (found.type === "WASTE") {
                    continue;
                }

                if (found.recipeId) {
                    continue;
                }

                let mov: any = {
                    quantity: product.quantity,
                    productId: product.productId,
                    description: `Entrada a partir de importación de producto desde una hoja de cálculo (Excel)`,

                    //Managed values
                    businessId: user.businessId,
                    movedById: user.id,
                    areaId: areaStockId,
                    operation: "ENTRY",
                    costBeforeOperation: found.averageCost,
                    economicCycleId: activeEconomicCycle?.id,
                };

                //Acting depending the price received
                let unitaryCost = found.averageCost || 0;

                if (product.costPrice.amount) {
                    unitaryCost = product.costPrice.amount;
                    mov.price = {
                        amount: mathOperation(
                            product.costPrice.amount,
                            product.quantity,
                            "multiplication",
                            2
                        ),
                        codeCurrency: product.costPrice.codeCurrency,
                    };

                    const found_currency = availableCurrencies.find(
                        item =>
                            item.currency.code ===
                            product.costPrice.codeCurrency
                    );

                    if (!found_currency) {
                        continue;
                    }

                    if (costCurrency !== product.costPrice.codeCurrency) {
                        const found_currency = availableCurrencies.find(
                            item =>
                                item.currency.code ===
                                product.costPrice.codeCurrency
                        );

                        if (!found_currency) {
                            continue;
                        }

                        unitaryCost =
                            exchangeCurrency(
                                product.costPrice,
                                costCurrency,
                                availableCurrencies
                            )?.amount || 0;
                    }
                } else {
                    mov.price = {
                        amount: mathOperation(
                            found.averageCost,
                            product.quantity,
                            "multiplication",
                            2
                        ),
                        codeCurrency: main_currency,
                    };
                }

                bulkMovements.push(mov);

                //Cost
                if (!found.isCostDefined) {
                    if (found.totalQuantity !== 0) {
                        unitaryCost =
                            (found.averageCost * found.totalQuantity +
                                unitaryCost * product.quantity) /
                            (found.totalQuantity + product.quantity);
                        unitaryCost = mathOperation(
                            unitaryCost,
                            0,
                            "addition",
                            precission_after_coma
                        );
                    }
                } else {
                    unitaryCost = found.averageCost;
                }

                if (found.averageCost !== unitaryCost) {
                    bulkUpdateProducts.push({
                        id: found.id,
                        averageCost: unitaryCost,
                    });
                }
            }

            //Add products to Stock
            //Normalyzing data
            const productToAdd = stockQuantity.map(item => {
                return {
                    productId: item.productId,
                    variationId: undefined,
                    quantity: item.quantity,
                };
            });

            const result = await addProductsToStockArea(
                {
                    products: productToAdd,
                    precission_after_coma,
                    areaId: areaStockId,
                    businessId: user.businessId,
                },
                t
            );

            if (!internalCheckerResponse(result)) {
                t.rollback();
                Logger.warn(
                    result.message || "Ha ocurrido un error inesperado.",
                    {
                        origin: "bulkEntryStockProduct/addProductsToStockArea",
                    }
                );
                return res.status(result.status).json({
                    message: result.message,
                });
            }

            await StockMovement.bulkCreate(bulkMovements, {
                include: [{ model: Price, as: "price" }],
                transaction: t,
                returning: true,
            });

            if (bulkUpdateProducts.length !== 0) {
                await Product.bulkCreate(bulkUpdateProducts, {
                    updateOnDuplicate: ["averageCost"],
                    transaction: t,
                });
            }
        }

        await t.commit();

        //Cleaning all the files
        fs.unlink(uploadPath, async (error: any) => {
            if (error) {
                Logger.error(error, {
                    "X-App-Origin": req.header("X-App-Origin"),
                });
            }
        });

        return res.status(201).json(`done`);
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

interface PriceItem {
    systemPriceId: number;
    price: number;
    availableCurrencyId: number;
    codeCurrency: string;
}

export const newProduct = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const {
            salesCategoryId,
            measure,
            listProductionAreas,
            universalCode,
            images,
            ...params
        } = req.body;
        const user: User = req.user;

        //General validations
        //Checking types
        if (params.type) {
            const allowedType = [
                "STOCK",
                "MENU",
                "COMBO",
                "SERVICE",
                "VARIATION",
                "RAW",
                "MANUFACTURED",
                "WASTE",
                "ASSET",
                "ADDON",
            ];
            if (!allowedType.includes(params.type)) {
                t.rollback();
                return res.status(400).json({
                    message: `${params.type} is not an allowed type. Fields allowed: ${allowedType}`,
                });
            }
        }

        const forSaleType = [
            "STOCK",
            "MENU",
            "COMBO",
            "SERVICE",
            "VARIATION",
            "ADDON",
        ];

        //Name
        const nameProduct = await Product.findOne({
            where: {
                businessId: user.businessId,
                name: params.name,
            },
        });

        if (nameProduct) {
            t.rollback();
            return res.status(400).json({
                message: `El nombre introducido ya existe en otro Producto.`,
            });
        }

        //Obtaining a fullBusiness
        const business = await Business.findOne({
            where: {
                id: user.businessId,
            },
            include: [
                ConfigurationKey,
                {
                    model: SubscriptionPlan,
                    attributes: ["name", "code", "description"],
                },
                {
                    model: AvailableCurrency,
                    include: [Currency],
                },
                PriceSystem,
            ],
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio asociado a su usuario no fue encontrado.`,
            });
        }

        //Checking plan with number of products
        if (business.subscriptionPlan.code === "FREE") {
            const total_products = await Product.count({
                where: {
                    businessId: user.businessId,
                },
            });

            if (total_products > 50) {
                t.rollback();
                return res.status(400).json({
                    message: `Ha alcanzado el número máximo de productos a insertar en el plan contratado.`,
                });
            }
        }

        const currency_in_online_shop = business.configurationsKey.find(
            item => item.key === "currency_in_online_shop"
        )?.value;
        const isWooActive =
            business.configurationsKey.find(
                item => item.key === "module_woocommerce"
            )?.value === "true";

        //Bulding the product with general data
        const product = Product.build({
            businessId: user.businessId,
            showForSale: forSaleType.includes(params.type),
            isPublicVisible: forSaleType.includes(params.type),
            name: params.name,
            type: params.type ?? null,
            color: params.color,
        });

        await product.save({ transaction: t });

        //Generals properties
        product.salesCode = String(product.id).padStart(5, "0");
        product.description = params.description;
        product.promotionalText = params.promotionalText;
        product.universalCode = product.id;
        product.newArrivalAt = moment().add(7, "day").toDate();
        product.supplierId = params.supplierId;

        //QR Code
        if (params.qrCode && isNaN(params.qrCode)) {
            t.rollback();
            return res.status(400).json({
                message: `El QR ${params.qrCode} no es un número válido`,
            });
        }
        product.qrCode = params.qrCode;

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
                    productId: product.id,
                });
            }

            await ImageProduct.bulkCreate(bulkImages, { transaction: t });
        }

        //Validations depending product type
        //General STOCK type
        if (["RAW", "MANUFACTURED", "WASTE", "ASSET"].includes(params.type)) {
            //Checking plan
            if (business.subscriptionPlan.code === "FREE") {
                t.rollback();
                return res.status(401).json({
                    message: `No tiene acceso al recurso solicitado.`,
                });
            }

            //Measure
            const allowedMeasureType = [
                "KG",
                "UNIT",
                "LITRE",
                "PORTION",
                "DRINK",
                "COUP",
                "POUND",
                "BOTTLE",
            ];

            if (measure && !allowedMeasureType.includes(measure)) {
                t.rollback();
                return res.status(400).json({
                    message: `${measure} is not an allowed type. Fields allowed: ${allowedMeasureType}`,
                });
            }

            product.measure = measure ? measure : "UNIT";
            product.stockLimit = true;

            //Product Category
            if (params.productCategoryId) {
                product.productCategoryId = params.productCategoryId;
            }
        } else {
            //General READYFORSALE
            //Measure
            product.measure = "UNIT";

            //Product Category
            if (params.productCategoryId) {
                product.productCategoryId = params.productCategoryId;
            }

            if (salesCategoryId) {
                product.salesCategoryId = salesCategoryId;
            }

            //Creating price
            if (params.price && params.prices) {
                t.rollback();
                return res.status(400).json({
                    message: `Price and prices field can't be sent in the same request`,
                });
            }

            if (!params.price && !params.prices) {
                t.rollback();
                return res.status(406).json({
                    message: `El campo price no fue proporcionado.`,
                });
            }

            //Creating price
            let includeOnlineCurrency = false;
            if (params.prices) {
                let bulk = [];

                //Checking prices to Woo
                for (const item of params.prices as PriceItem[]) {
                    //Checking values
                    const priceSystem = business.priceSystems.find(
                        ps => ps.isMain
                    );
                    const availableCurrency = business.availableCurrencies.find(
                        ac => ac.currency.code === item.codeCurrency
                    );

                    if (!priceSystem) {
                        t.rollback();
                        return res.status(400).json({
                            message: `No hay un sistema de precio principal definido en el sistema.`,
                        });
                    }

                    if (!availableCurrency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Available currency provided not found.`,
                        });
                    }

                    bulk.push({
                        productId: product.id,
                        priceSystemId: priceSystem.id,
                        codeCurrency: item.codeCurrency,
                        price: item.price,
                        isMain: priceSystem.isMain,
                    });

                    if (item.codeCurrency === currency_in_online_shop) {
                        includeOnlineCurrency = true;
                    }
                }

                //Checking a Main price is defined
                let isMainDefined = false;
                bulk.forEach(item => {
                    if (item.isMain) {
                        isMainDefined = true;
                    }
                });

                if (!isMainDefined) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Debe definir un precio como principal.`,
                    });
                }

                await ProductPrice.bulkCreate(bulk, {
                    transaction: t,
                });
            } else if (params.price) {
                const priceSystem = business.priceSystems.find(ps => ps.isMain);
                const availableCurrency = business.availableCurrencies.find(
                    ac => ac.isMain
                );

                if (availableCurrency && priceSystem) {
                    const productPrice = ProductPrice.build({
                        productId: product.id,
                        priceSystemId: priceSystem.id,
                        price: params.price,
                        isMain: true,
                        codeCurrency: availableCurrency.currency.code,
                    });

                    await productPrice.save({ transaction: t });

                    if (
                        availableCurrency?.currency.code ===
                        currency_in_online_shop
                    ) {
                        includeOnlineCurrency = true;
                    }
                } else {
                    t.rollback();
                    return res.status(400).json({
                        message: `Main available currency or main price system not found.`,
                    });
                }
            }

            //Checking price
            if (params.visibleOnline && !includeOnlineCurrency) {
                t.rollback();
                return res.status(401).json({
                    message: `El precio de este producto es incompatible con el sistema de precios de la Tienda online.`,
                });
            }

            //MENU & ADDON
            if (["MENU", "ADDON", "SERVICE"].includes(params.type)) {
                if (listProductionAreas) {
                    const areas = await Area.findAll({
                        where: {
                            businessId: user.businessId,
                            type: "MANUFACTURER",
                        },
                    });
                    let production_areas: any = [];

                    for (const id of listProductionAreas) {
                        const found_area = areas.find(item => item.id === id);

                        if (!found_area) {
                            t.rollback();
                            return res.status(404).json({
                                message: `El área de tipo MANUFACTURER con id ${found_area} no fue encontrada`,
                            });
                        }

                        production_areas.push({
                            productId: product.id,
                            areaId: id,
                        });
                    }
                    await ProductionArea.bulkCreate(production_areas, {
                        transaction: t,
                    });
                }
            } else if (params.type === "STOCK" || params.type === "VARIATION") {
                product.stockLimit = true;

                //Checking plan
                if (business.subscriptionPlan.code === "FREE") {
                    t.rollback();
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            } else if (params.type === "COMBO") {
                //Checking plan
                if (business.subscriptionPlan.code === "FREE") {
                    t.rollback();
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            }
        }

        //check duration
        if (params.duration) {
            product.duration = params.duration;
        }
        if (params.hasDuration) {
            product.hasDuration = params.hasDuration;
        }

        await product.save({ transaction: t });

        const product_to_emit = await Product.scope("to_return").findByPk(
            product.id,
            { transaction: t }
        );

        //Records
        await ProductRecords.create(
            {
                action: "CREATED_PRODUCT",
                newValue: JSON.stringify(product_to_emit),
                productId: product_to_emit?.id,
                madeById: user.id,
                details: `Se creó el producto `,
            },
            { transaction: t }
        );

        await t.commit();

        //Woocommerce
        if (isWooActive && product_to_emit?.visibleOnline) {
            wooQueue.add(
                {
                    code: "CREATE_PRODUCT",
                    params: {
                        product: product_to_emit,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(201).json(product_to_emit);

        //Socket
        // if (
        //     product.type === "MENU" ||
        //     product.type === "SERVICE" ||
        //     product.type === "COMBO"
        // ) {
        //     req.io.to(`business:${user.businessId}`).emit("products", {
        //         action: "add_menu",
        //         data: product_to_emit,
        //         from: user.id,
        //     });
        // }
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

export const editProduct = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const {
            availableAddons,
            listProductionAreas,
            images,
            onSalePrice,
            combo,
            resourceIds,
            hasDuration,
            hasDurationEdit,
            ...params
        } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //General validations
        //Checking types
        const allowedType = [
            "STOCK",
            "MENU",
            "COMBO",
            "SERVICE",
            "VARIATION",
            "RAW",
            "MANUFACTURED",
            "ADDON",
            "WASTE",
            "ASSET",
        ];
        if (params.type && !allowedType.includes(params.type)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.type} is not an allowed type. Fields allowed: ${allowedType}`,
            });
        }

        const allowedMeasureType = [
            "KG",
            "UNIT",
            "LITRE",
            "PORTION",
            "DRINK",
            "POUND",
        ];
        if (params.measure && !allowedMeasureType.includes(params.measure)) {
            t.rollback();
            return res.status(400).json({
                message: `${params.measure} is not an allowed type. Fields allowed: ${allowedMeasureType}`,
            });
        }

        if (params.price && params.prices) {
            t.rollback();
            return res.status(400).json({
                message: `Price and prices field can't be sent in the same request`,
            });
        }

        //Name
        if (params.name) {
            const nameProduct = await Product.findOne({
                where: {
                    businessId: user.businessId,
                    name: params.name,
                    [Op.not]: {
                        id,
                    },
                },
            });

            if (nameProduct) {
                t.rollback();
                return res.status(400).json({
                    message: `El nombre introducido ya existe. Por favor, elija otro.`,
                });
            }
        }

        const product = await Product.findByPk(id, {
            include: [
                ProductPrice,
                {
                    model: Product,
                    as: "availableAddons",
                    attributes: ["id", "name", "salesCode", "description"],
                    through: {
                        attributes: [],
                    },
                    include: [ProductPrice],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                Price,
            ],
        });

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Obtaining a fullBusiness
        const business = await Business.findOne({
            where: {
                id: user.businessId,
            },
            include: [
                ConfigurationKey,
                SubscriptionPlan,
                {
                    model: AvailableCurrency,
                    include: [Currency],
                },
                PriceSystem,
            ],
        });

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio asociado a su usuario no fue encontrado.`,
            });
        }

        //Checking plan with number of products
        if (business.subscriptionPlan.code === "FREE") {
            const total_products = await Product.count({
                where: {
                    businessId: user.businessId,
                },
            });

            if (total_products > 50) {
                t.rollback();
                return res.status(400).json({
                    message: `Ha alcanzado el número máximo de productos a gestionar en el plan contratado.`,
                });
            }
        }

        //Taking first position by default Woo
        const currenciesInOnlineShop =
            business.configurationsKey
                .find(item => item.key === "online_shop_main_currency")
                ?.value.split(",") || [];
        const priceSystemsInOnlineShop =
            business.configurationsKey
                .find(item => item.key === "online_shop_price_system")
                ?.value.split(",") || [];

        const isWooActive =
            business.configurationsKey.find(
                item => item.key === "module_woocommerce"
            )?.value === "true";

        //control variable
        let prevValue: any = {};
        let newValue: any = {};
        let changedProperties: any = [];

        const modelKeys = Object.keys(Product.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `No puede modificar el atributo ${att}.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(400).json({ message });
        }

        //Generals properties
        //For Woo
        let imagesToUpdate: Array<number> = [];

        //Images
        if (images) {
            const images_found = await Image.findAll({
                where: {
                    id: images,
                },
            });

            let bulkImagesCreate = [];
            let bulkToDelete = product.images?.map(item => item.id);

            for (const imageId of images) {
                const exist = images_found.find(item => item.id == imageId);

                if (!exist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La imagen con id ${imageId} no fue encontrada.`,
                    });
                }

                //Checking if is already in product
                const isInProduct = product.images?.find(
                    item => item.id === imageId
                );

                if (isInProduct) {
                    bulkToDelete = bulkToDelete?.filter(
                        item => item !== imageId
                    );
                } else {
                    bulkImagesCreate.push({
                        imageId,
                        productId: product.id,
                    });
                }
            }

            await ImageProduct.bulkCreate(bulkImagesCreate, { transaction: t });
            await Image.destroy({
                where: {
                    id: bulkToDelete,
                },
            });

            imagesToUpdate = bulkImagesCreate.map(item => item.imageId);
        }

        //Validations depending product type
        if (["RAW", "MANUFACTURED", "WASTE", "ASSET"].includes(params.type)) {
            [
                "totalQuantity",
                "salesCategoryId",
                "onSalePriceId",
                "type",
                "suggested",
                "onSale",
                "averagePreparationTime",
                "elaborationSteps",
                "stockLimit",
            ].forEach(att => {
                if (paramsKey.includes(att)) {
                    message = `No puede modificar el atributo ${att} del producto seleccionado.`;
                }
            });

            if (message) {
                t.rollback();
                return res.status(406).json({ message });
            }
        } else {
            //Generals
            if (params.type && product.type !== params.type) {
                t.rollback();
                return res.status(400).json({
                    message: `No puede cambiarse el tipo de producto.`,
                });
            }

            //Prices
            if (params.price || params.prices) {
                //Removing all prices
                await ProductPrice.destroy({
                    where: {
                        productId: id,
                    },
                    transaction: t,
                });
            }

            //Updating price
            if (params.prices) {
                let bulk = [];

                for (const item of params.prices as PriceItem[]) {
                    //Checking values
                    const priceSystem = business.priceSystems.find(
                        ps => ps.id === item.systemPriceId
                    );
                    const availableCurrency = business.availableCurrencies.find(
                        ac => ac.currency.code === item.codeCurrency
                    );

                    if (!priceSystem) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Price system provided not found.`,
                        });
                    }

                    if (!availableCurrency) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Available currency provided not found.`,
                        });
                    }

                    const newPrice = {
                        productId: product.id,
                        priceSystemId: priceSystem.id,
                        codeCurrency: item.codeCurrency,
                        price: item.price,
                        isMain: priceSystem.isMain,
                    };

                    bulk.push(newPrice);

                    await ProductRecords.create(
                        {
                            action: "ADD_NEW_PRICE",
                            newValue: JSON.stringify(newPrice),
                            oldValue: "",
                            productId: product.id,
                            madeById: user.id,
                            details: `Se agrego un nuevo precio ${newPrice.price}/${newPrice.codeCurrency}`,
                        },
                        { transaction: t }
                    );
                }

                await ProductPrice.bulkCreate(bulk, {
                    transaction: t,
                });
            } else if (params.price) {
                const priceSystem: PriceSystem | undefined =
                    business.priceSystems.find(ps => ps.isMain);
                const availableCurrency = business.availableCurrencies.find(
                    ac => ac.isMain
                );

                if (availableCurrency && priceSystem) {
                    const productPrice: ProductPrice = ProductPrice.build({
                        productId: product.id,
                        priceSystemId: priceSystem.id,
                        price: params.price.price,
                        isMain: true,
                        codeCurrency:
                            params.price.codeCurrency ||
                            availableCurrency.currency.code,
                    });

                    await productPrice.save({ transaction: t });

                    await ProductRecords.create(
                        {
                            action: "ADD_NEW_PRICE",
                            newValue: JSON.stringify(productPrice),
                            oldValue: "",
                            productId: product.id,
                            madeById: user.id,
                            details: `Se agrego un nuevo precio ${productPrice.price}/${productPrice.codeCurrency}`,
                        },
                        { transaction: t }
                    );
                } else {
                    t.rollback();
                    return res.status(400).json({
                        message: `Main available currency or main price system not found.`,
                    });
                }
            }

            //Checking price according to internet
            if (params.visibleOnline) {
                //Checking prices
                const prices = await ProductPrice.findAll({
                    where: {
                        productId: product.id,
                    },
                });

                let foundPrice;
                //1.Find in the pricessytemDefined
                foundPrice = prices.find(item =>
                    priceSystemsInOnlineShop?.includes(
                        item.priceSystemId.toString()
                    )
                );

                //2. If no found, search a similar in the currency
                if (!foundPrice) {
                    foundPrice = prices.find(item =>
                        currenciesInOnlineShop.includes(item.codeCurrency)
                    );
                }

                if (
                    !foundPrice ||
                    !currenciesInOnlineShop.includes(foundPrice.codeCurrency)
                ) {
                    params.visibleOnline = false;
                }
            }

            //Analyzing barCode
            if (params.barCode) {
                const alreadyExist = await Product.findOne({
                    where: {
                        barCode: params.barCode,
                        businessId: user.businessId,
                    },
                });

                if (alreadyExist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Ya existe un producto con el código de barras introducido. Introduzca uno nuevo para continuar.`,
                    });
                }
            }

            if (onSalePrice) {
                if (product.onSalePrice) {
                    //Records info
                    const prevPrice = `${product.onSalePrice.amount}/${product.onSalePrice.codeCurrency}`;
                    const newPrice = `${onSalePrice.amount}/${onSalePrice.codeCurrency}`;
                    if (newPrice !== prevPrice) {
                        changedProperties.push(
                            `precio de venta: ${prevPrice} por ${newPrice}`
                        );
                    }
                    newValue["onSalePrice"] = {
                        amount: onSalePrice.amount,
                        codeCurrency: onSalePrice.codeCurrency,
                    };
                    prevValue["onSalePrice"] = {
                        amount: product.onSalePrice.amount,
                        codeCurrency: product.onSalePrice.codeCurrency,
                    };

                    product.onSalePrice.amount = onSalePrice.amount;
                    product.onSalePrice.codeCurrency = onSalePrice.codeCurrency;
                    await product.onSalePrice.save({ transaction: t });
                } else {
                    const new_price = Price.build({
                        amount: onSalePrice.amount,
                        codeCurrency: onSalePrice.codeCurrency,
                    });

                    await new_price.save({ transaction: t });
                    product.onSalePriceId = new_price.id;
                }
            }

            //Analyzing if newArrival
            if (params.newArrival) {
                if (
                    params.newArrival !== product.newArrival &&
                    params.newArrival
                ) {
                    product.newArrivalAt = moment().add(7, "day").toDate();
                }
            } else {
                //@ts-ignore
                product.newArrivalAt = null;
                product.newArrival = false;
            }

            //Preparation areas
            if (
                ["MENU", "ADDON", "SERVICE", "STOCK", "COMBO"].includes(
                    product.type
                )
            ) {
                if (listProductionAreas) {
                    //Deleting existing areas
                    await ProductionArea.destroy({
                        where: {
                            productId: product.id,
                        },
                        transaction: t,
                    });

                    const areas = await Area.findAll({
                        where: {
                            businessId: user.businessId,
                            type: "MANUFACTURER",
                        },
                    });

                    let production_areas: any = [];
                    for (const id of listProductionAreas) {
                        const found_area = areas.find(item => item.id === id);
                        if (!found_area) {
                            t.rollback();
                            return res.status(404).json({
                                message: `El área de tipo MANUFACTURER con id ${id} no fue encontrada`,
                            });
                        }

                        production_areas.push({
                            productId: product.id,
                            areaId: id,
                        });
                    }
                    await ProductionArea.bulkCreate(production_areas, {
                        transaction: t,
                    });
                }
            }

            if (["MENU", "ADDON"].includes(product.type)) {
                if (product.type === "ADDON" && availableAddons) {
                    t.rollback();
                    return res.status(404).json({
                        message: `No puede agregarle un agrego a un producto definido como agrego.`,
                    });
                }

                //Updating addons
                if (availableAddons) {
                    let addBulk: any = [];
                    if (product.availableAddons?.length === 0) {
                        availableAddons.forEach(async (addonId: number) => {
                            addBulk.push({
                                baseProductId: product.id,
                                addonId,
                            });
                        });
                        await ProductAddon.bulkCreate(addBulk, {
                            transaction: t,
                        });
                    } else {
                        for (const addonId of availableAddons) {
                            const found_check = product.availableAddons?.find(
                                item => item.id === addonId
                            );

                            if (!found_check) {
                                addBulk.push({
                                    baseProductId: product.id,
                                    addonId,
                                });
                            }
                        }

                        await ProductAddon.bulkCreate(addBulk, {
                            transaction: t,
                        });

                        let idsToRemove: Array<number> = [];

                        product.availableAddons?.forEach(item => {
                            const found = availableAddons.find(
                                (addonId: number) => addonId === item.id
                            );

                            if (!found) {
                                idsToRemove.push(item.id);
                            }
                        });

                        await ProductAddon.destroy({
                            where: {
                                baseProductId: product.id,
                                addonId: idsToRemove,
                            },
                            transaction: t,
                        });
                    }
                }
            } else if (
                product.type === "STOCK" ||
                product.type === "VARIATION"
            ) {
                [
                    "totalQuantity",
                    "type",
                    "averagePreparationTime",
                    "elaborationSteps",
                    "stockLimit",
                ].forEach(att => {
                    if (paramsKey.includes(att)) {
                        message = `No puede modificar el atributo ${att} del producto seleccionado.`;
                    }
                });

                if (message) {
                    t.rollback();
                    return res.status(406).json({ message });
                }

                //Checking plan
                if (business.subscriptionPlan.code === "FREE") {
                    t.rollback();
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }
            } else if (product.type === "SERVICE") {
                //Checking plan
                if (business.subscriptionPlan.code === "FREE") {
                    t.rollback();
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }

                if (listProductionAreas) {
                    //Deleting existing areas
                    await ProductionArea.destroy({
                        where: {
                            productId: product.id,
                        },
                        transaction: t,
                    });

                    if (listProductionAreas.length !== 0) {
                        const areas = await Area.findAll({
                            where: {
                                businessId: user.businessId,
                                type: "MANUFACTURER",
                            },
                        });

                        let production_areas: any = [];
                        for (const id of listProductionAreas) {
                            const found_area = areas.find(
                                item => item.id === id
                            );
                            if (!found_area) {
                                t.rollback();
                                return res.status(404).json({
                                    message: `El área de tipo MANUFACTURER con id ${found_area} no fue encontrada`,
                                });
                            }

                            production_areas.push({
                                productId: product.id,
                                areaId: id,
                            });
                        }
                        await ProductionArea.bulkCreate(production_areas, {
                            transaction: t,
                        });
                    }
                }

                //Updating addons
                if (availableAddons) {
                    let addBulk: any = [];
                    if (product.availableAddons?.length === 0) {
                        availableAddons.forEach(async (addonId: number) => {
                            addBulk.push({
                                baseProductId: product.id,
                                addonId,
                            });
                        });
                        await ProductAddon.bulkCreate(addBulk, {
                            transaction: t,
                        });
                    } else {
                        for (const addonId of availableAddons) {
                            const found_check = product.availableAddons?.find(
                                item => item.id === addonId
                            );

                            if (!found_check) {
                                addBulk.push({
                                    baseProductId: product.id,
                                    addonId,
                                });
                            }
                        }

                        await ProductAddon.bulkCreate(addBulk, {
                            transaction: t,
                        });

                        let idsToRemove: Array<number> = [];

                        product.availableAddons?.forEach(item => {
                            const found = availableAddons.find(
                                (addonId: number) => addonId === item.id
                            );

                            if (!found) {
                                idsToRemove.push(item.id);
                            }
                        });

                        await ProductAddon.destroy({
                            where: {
                                baseProductId: product.id,
                                addonId: idsToRemove,
                            },
                            transaction: t,
                        });
                    }
                }
            } else if (product.type === "COMBO") {
                //Checking plan
                if (business.subscriptionPlan.code === "FREE") {
                    t.rollback();
                    return res.status(401).json({
                        message: `No tiene acceso al recurso solicitado.`,
                    });
                }

                ["type"].forEach(att => {
                    if (paramsKey.includes(att)) {
                        message = `No puede modificar el atributo ${att} del producto seleccionado.`;
                    }
                });

                if (message) {
                    t.rollback();
                    return res.status(406).json({ message });
                }
            }
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                if (product[att as keyof Product] !== params[att]) {
                    prevValue[att] = product[att as keyof Product];
                    newValue[att] = params[att];
                    if (prevValue[att] !== newValue[att]) {
                        changedProperties.push(
                            `${translateFieldProduct(
                                att
                            )} : ${translateFieldProduct(
                                product[att as keyof Product]
                            )} por ${translateFieldProduct(params[att])}`
                        );
                    }
                }
                //@ts-ignore
                product[att] = params[att];
            }
        });

        if (product.type == "SERVICE") {
            if (params.availableForReservation) {
                product.availableForReservation =
                    params.availableForReservation;
                if (!params.availableForReservation) {
                    product.alwaysAvailableForReservation = false;
                    //@ts-ignore
                    product.reservationAvailableFrom = null;
                    //@ts-ignore
                    product.reservationAvailableTo = null;
                }
            }

            if (params.alwaysAvailableForReservation) {
                //@ts-ignore
                product.reservationAvailableFrom = null;
                //@ts-ignore
                product.reservationAvailableTo = null;

                product.alwaysAvailableForReservation =
                    params.alwaysAvailableForReservation;
            }

            if (resourceIds) {
                if (!Array.isArray(resourceIds)) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Los identificadores de recursos deben proporcionarse como una matriz.`,
                    });
                }

                if (product.type !== "SERVICE") {
                    t.rollback();
                    return res.status(400).json({
                        message: `Solo es posible asociar recurso al productos de tipo servicio SERVICIO.`,
                    });
                }

                // Remove existing associations for the productId
                await ResourceProduct.destroy({
                    where: { productId: product.id },
                    transaction: t,
                });

                // Create new associations
                const associations = resourceIds.map(resourceId => ({
                    productId: product.id,
                    resourceId,
                }));

                await ResourceProduct.bulkCreate(associations, {
                    transaction: t,
                });
            }

            if (params.policyIds) {
                const policies = await ReservationPolicy.findAll({
                    where: {
                        id: params.policyIds,
                    },
                });

                await ProductReservationPolicy.destroy({
                    where: {
                        productId: product.id,
                    },
                    transaction: t,
                });

                if (policies && policies.length > 0) {
                    for (const policy of policies) {
                        if (policy.businessId !== user.businessId) {
                            t.rollback();
                            return res.status(403).json({
                                message: `No tiene permisos para asociar políticas a este producto.`,
                            });
                        }
                    }

                    const productReservationData = params.policyIds.map(
                        (policyId: number) => ({
                            productId: product.id,
                            reservationPolicyId: policyId,
                        })
                    );

                    await ProductReservationPolicy.bulkCreate(
                        productReservationData,
                        { transaction: t }
                    );
                }
            }

            if (params.duration) {
                product.duration = params.duration;
            }

            if (hasDurationEdit) {
                product.hasDuration = hasDuration;

                if (!hasDuration) {
                    product.hasDuration = false;
                    //@ts-ignore
                    product.duration = null;
                }
            }

            if (params.color) {
                product.color = params.color;
            }
        }

        await product.save({ transaction: t });

        const product_to_emit = await Product.scope("to_return").findByPk(id, {
            transaction: t,
        });

        //Records
        if (changedProperties.length !== 0) {
            await ProductRecords.create(
                {
                    action: "EDIT_GENERAL_DATA_PRODUCT",
                    newValue: JSON.stringify(newValue),
                    oldValue: JSON.stringify(prevValue),
                    productId: product_to_emit?.id,
                    madeById: user.id,
                    details: `Se modificaron las propiedades del producto: ${changedProperties.join(
                        ", "
                    )}.`,
                },
                { transaction: t }
            );
        }

        await t.commit();
        res.status(201).json(product_to_emit);

        //Propagate the cost
        if (params.averageCost) {
            productQueue.add(
                {
                    code: "PROPAGATE_COST",
                    params: {
                        productId: id,
                        businessId: product.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [id],
                    businessId: user.businessId,
                },
            },
            {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: true,
            }
        );

        //Woocommerce
        if (isWooActive && product.visibleOnline) {
            if (!product.externalId) {
                wooQueue.add(
                    {
                        code: "CREATE_PRODUCT",
                        params: {
                            product: product_to_emit,
                            businessId: user.businessId,
                            imagesToUpdate,
                        },
                    },
                    {
                        attempts: 2,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );
            } else {
                wooQueue.add(
                    {
                        code: "UPDATE_PRODUCT",
                        params: {
                            product: product_to_emit,
                            businessId: user.businessId,
                            imagesToUpdate,
                        },
                    },
                    {
                        attempts: 2,
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );
            }
        }
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

export const getProduct = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { fullAddons } = req.query;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        let includeAddonsAtt = {};
        if (fullAddons === undefined || fullAddons === "false") {
            includeAddonsAtt = {
                [Op.or]: [
                    {
                        stockLimit: false,
                    },
                    {
                        stockLimit: true,
                        totalQuantity: {
                            [Op.gt]: 0,
                        },
                    },
                ],
            };
        }

        const product = await Product.findOne({
            where: {
                id,
            },
            attributes: [
                "id",
                "name",
                "salesCode",
                "description",
                "externalId",
                "visibleOnline",
                "promotionalText",
                "type",
                "showForSale",
                "stockLimit",
                "qrCode",
                "barCode",
                "totalQuantity",
                "measure",
                "suggested",
                "onSale",
                "alertLimit",
                "isAlertable",
                "isPublicVisible",
                "averagePreparationTime",
                "elaborationSteps",
                "averageCost",
                "businessId",
                "universalCode",
                "showWhenOutStock",
                "showRemainQuantities",
                "createdAt",
                "updatedAt",
                "newArrival",
                "newArrivalAt",
                "isUnderAlertLimit",
                "saleByWeight",
                "enableDepreciation",
                "monthlyDepreciationRate",
                "groupName",
                "groupConvertion",
                "isWholesale",
                "minimunWholesaleAmount",
                "enableGroup",
                "performance",
                "onSaleType",
                "onSaleDiscountAmount",
                "duration",
                "hasDuration",
                "availableForReservation",
                "alwaysAvailableForReservation",
                "reservationAvailableFrom",
                "reservationAvailableTo",
                "color",
            ],
            include: [
                {
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: SalesCategory,
                    attributes: ["id", "name", "description", "color"],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Recipe,
                    attributes: [
                        "id",
                        "name",
                        "measure",
                        "unityToBeProduced",
                        "realPerformance",
                        "totalCost",
                        "unityToBeProducedCost",
                    ],
                },
                {
                    model: ProductFixedCost,
                    attributes: ["id", "costAmount", "description"],
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                        "updatedAt",
                    ],
                },
                {
                    model: Product,
                    as: "availableAddons",
                    attributes: [
                        "id",
                        "name",
                        "salesCode",
                        "description",
                        "stockLimit",
                        "totalQuantity",
                    ],
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: [
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    ...includeAddonsAtt,
                },
                {
                    model: Supplier,
                    attributes: ["id", "name"],
                    paranoid: false,
                },
                {
                    model: Product,
                    as: "listManufacturations",
                    attributes: ["id", "name", "description", "measure"],
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                },
                {
                    model: Area,
                    as: "listProductionAreas",
                    attributes: ["id", "name"],
                    through: {
                        attributes: [],
                    },
                    paranoid: false,
                },
                {
                    model: StockAreaProduct,
                    attributes: ["id", "quantity"],
                    include: [
                        {
                            model: Area,
                            attributes: ["id", "name"],
                            paranoid: false,
                        },
                        {
                            model: StockAreaVariation,
                            attributes: ["quantity", "variationId"],
                            include: [
                                {
                                    model: Variation,
                                    attributes: ["name"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: Supply,
                    attributes: ["id", "quantity"],
                    as: "supplies",
                    include: [
                        {
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                            model: Product,
                            as: "supply",
                        },
                    ],
                },
                {
                    model: Combo,
                    attributes: ["id", "quantity", "variationId"],
                    as: "compositions",
                    include: [
                        {
                            model: Product,
                            as: "composed",
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
                },
                {
                    model: Variation,
                    attributes: ["id", "name", "description", "onSale"],
                    as: "variations",
                    include: [
                        {
                            model: Price,
                            as: "price",
                            attributes: ["codeCurrency", "amount"],
                        },
                        {
                            model: Price,
                            as: "onSalePrice",
                            attributes: ["codeCurrency", "amount"],
                        },
                        {
                            model: Image,
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                        {
                            model: ProductAttribute,
                            attributes: ["name", "code", "value"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    required: false,
                },
                {
                    model: Resource,
                    attributes: [
                        "id",
                        "code",
                        "name",
                        "description",
                        "numberAdults",
                        "numberClients",
                        "numberKids",
                        "isAvailable",
                        "isReservable",
                    ],
                    through: {
                        attributes: [],
                    },
                },
                // {
                //     model: ProductAttribute,
                //     attributes: ["id", "name", "code", "value"],
                // },
            ],
        });

        if (!product) {
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        //TODO: Temporal
        // if (product.businessId !== user.businessId) {
        //     return res.status(401).json({
        //         message: `No está autorizado a realizar operaciones sobre este producto.`,
        //     });
        // }

        let to_return = { ...product.dataValues };
        if (user.roles?.map(item => item.code).includes("GROUP_OWNER")) {
            const branches = await BusinessBranch.findAll({
                where: {
                    //@ts-ignore
                    businessBaseId: user.originalBusinessId,
                },
            });

            const extendedProduct = await Product.findAll({
                where: {
                    universalCode: product.universalCode,
                    businessId: branches
                        .map(item => item.branchId)
                        //@ts-ignore
                        .concat(user.originalBusinessId),
                },
                include: [
                    {
                        model: Business,
                        attributes: ["name"],
                    },
                    {
                        model: StockAreaProduct,
                        attributes: ["id", "quantity"],
                        include: [
                            {
                                model: Area,
                                attributes: ["id", "name"],
                                paranoid: false,
                            },
                            {
                                model: StockAreaVariation,
                                attributes: ["quantity", "variationId"],
                                include: [
                                    {
                                        model: Variation,
                                        attributes: ["name"],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            let totalQuantity = 0;
            let updatedStockAreaProducts: any = [];
            extendedProduct.forEach(element => {
                totalQuantity += element.totalQuantity;
                const newStocks = element.stockAreaProducts?.map(item => {
                    return {
                        id: item.id,
                        quantity: item.quantity,
                        area: {
                            id: item.area.id,
                            name: `${item.area.name} - ${element.business?.name}`,
                        },
                        variations: item.variations,
                    };
                });
                updatedStockAreaProducts =
                    updatedStockAreaProducts.concat(newStocks);
            });

            to_return = {
                ...product.dataValues,
                totalQuantity,
                stockAreaProducts: updatedStockAreaProducts,
                // attributes: [],
            };
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

export const findProductByBarcode = async (req: any, res: Response) => {
    try {
        const { search } = req.params;
        const user: User = req.user;

        if (!search) {
            return res.status(406).json({
                message: `El parámetro search no fue introducido`,
            });
        }

        const product = await Product.findOne({
            where: {
                barCode: search,
                businessId: user.businessId,
            },
            attributes: [
                "id",
                "name",
                "salesCode",
                "description",
                "type",
                "showForSale",
                "stockLimit",
                "qrCode",
                "barCode",
                "totalQuantity",
                "measure",
                "businessId",
                "universalCode",
                "createdAt",
                "updatedAt",
            ],
            include: [
                {
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: SalesCategory,
                    attributes: ["id", "name", "description", "color"],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                        "updatedAt",
                    ],
                },
            ],
        });

        if (!product) {
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        res.status(200).json(product);
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

export const deleteProduct = async (req: any, res: Response) => {
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

        const product = await Product.findByPk(id, {
            include: [
                {
                    model: SalesCategory,
                    attributes: ["id", "name", "description"],
                },
                StockAreaProduct,
            ],
        });

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado`,
            });
        }

        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //@ts-ignore
        if (product.stockAreaProducts?.length > 0) {
            t.rollback();
            return res.status(400).json({
                message: `Cantidades de este producto están todavía en algunas áreas de tipo Almacén. Debe vaciar sus almacenes de este producto antes de continuar.`,
            });
        }

        //Deleting dependencies
        await Supply.destroy({
            where: {
                [Op.or]: [
                    {
                        supplyId: product.id,
                    },
                    {
                        baseProductId: product.id,
                    },
                ],
            },
            transaction: t,
        });

        await ProductManufacturation.destroy({
            where: {
                [Op.or]: [
                    {
                        manufacturedProductId: product.id,
                    },
                    {
                        baseProductId: product.id,
                    },
                ],
            },
            transaction: t,
        });

        await ProductRawRecipe.destroy({
            where: {
                productId: product.id,
            },
            transaction: t,
        });

        await Combo.destroy({
            where: {
                [Op.or]: [
                    {
                        composedId: product.id,
                    },
                    {
                        comboBaseProductId: product.id,
                    },
                ],
            },
            transaction: t,
        });

        const externalId = product.externalId;

        await product.destroy({ transaction: t });

        //Records
        await ProductRecords.create(
            {
                action: "REMOVED_PRODUCT",
                newValue: "",
                oldValue: JSON.stringify(product),
                productId: product.id,
                madeById: user.id,
                details: `Se elimino del registro el producto `,
            },
            { transaction: t }
        );

        //Temp
        const today = moment().startOf("day").toISOString();
        const end = moment(today).add(1, "year").toISOString();
        const existReservation = await checkReservationAvailability({
            businessId: user.businessId,
            focusId: product.id,
            startAt: today,
            endAt: end,
        });

        console.log();

        if (existReservation) {
            t.rollback();
            return res.status(400).json({
                message:
                    "El producto que intenta eliminar esta asociado a una reserva activa",
            });
        }

        await t.commit();
        res.status(204).json({});

        //Obtatining configurations
        const configurations = await getBusinessConfigCache(user.businessId);

        const isWooActive =
            configurations.find(item => item.key === "module_woocommerce")
                ?.value === "true";

        if (externalId && isWooActive) {
            wooQueue.add(
                {
                    code: "DELETE_PRODUCT",
                    params: {
                        externalId,
                        businessId: user.businessId,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        //Socket
        req.io.to(`business:${user.businessId}`).emit("products", {
            action: "deleted",
            data: { id },
            from: user.id,
        });
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

export const findAllProducts = async (req: any, res: Response) => {
    try {
        const {
            per_page,
            page,
            search,
            order,
            orderBy,
            type,
            disponibilityFrom,
            disponibilityTo,
            all_data,
            ids,
              ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = [
            "showForSale",
            "measure",
            "isAlertable",
            "isAccountable",
            "productCategoryId",
            "salesCategoryId",
            "suggested",
            "onSale",
            "isPublicVisible",
            "showWhenOutStock",
            "showRemainQuantities",
            "newArrival",
            "isUnderAlertLimit",
            "supplierId",
            "isWholesale",
            "availableForReservation",
            "barCode"
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

            where_clause[Op.or] = [
                where(fn("unaccent", col("Product.name")), {
                    [Op.and]: includeToSearch,
                }),
                where(fn("unaccent", col("Product.barCode")), {
                    [Op.or]: includeToSearch,
                }),
            ];
        }

        if (type) {
            const productTypes = type.split(",");

            const allTypes = [
                "MENU",
                "STOCK",
                "COMBO",
                "VARIATION",
                "SERVICE",
                "ADDON",
                "RAW",
                "MANUFACTURED",
                "WASTE",
                "ASSET",
            ];

            for (const item of productTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }

            where_clause.type = {
                [Op.or]: productTypes,
            };
        }

        if (disponibilityFrom && disponibilityTo) {
            //Special case between amounts
            where_clause.totalQuantity = {
                [Op.gte]: disponibilityFrom,
                [Op.lte]: disponibilityTo,
            };
        } else {
            if (disponibilityFrom) {
                where_clause.totalQuantity = {
                    [Op.gte]: disponibilityFrom,
                };
            }

            if (disponibilityTo) {
                where_clause.totalQuantity = {
                    [Op.lte]: disponibilityTo,
                };
            }
        }

        if (ids) {
            const idArray = (ids as string)
                .split(",")
                .map(id => parseInt(id.trim()));
            where_clause.id = idArray;
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

        const found_products = await Product.findAndCountAll({
            attributes: [
                "id",
                "name",
                "type",
                "salesCode",
                "showForSale",
                "stockLimit",
                "totalQuantity",
                "barCode",
                "qrCode",
                "measure",
                "alertLimit",
                "isAlertable",
                "isUnderAlertLimit",
                "isPublicVisible",
                "averageCost",
                "productCategoryId",
                "salesCategoryId",
                "createdAt",
                "supplierId",
                "groupName",
                "groupConvertion",
                "isWholesale",
                "enableGroup",
                "visibleOnline",
                "availableForReservation",
                "alwaysAvailableForReservation",
                "reservationAvailableFrom",
                "reservationAvailableTo",
                "duration",
                "hasDuration",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                ...where_clause,
            },
            //@ts-ignore
            order: ordenation,
            include: [
                {
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: SalesCategory,
                    attributes: ["id", "name", "description", "color"],
                },
                {
                    model: ProductFixedCost,
                    attributes: ["id", "costAmount", "description"],
                },
                {
                    model: Price,
                    attributes: ["amount", "codeCurrency"],
                },
                {
                    model: Image,
                    as: "images",
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: ProductPrice,
                    attributes: [
                        "price",
                        "isMain",
                        "codeCurrency",
                        "priceSystemId",
                    ],
                    separate: true,
                },
                {
                    model: Supply,
                    as: "supplies",
                    attributes: ["id", "quantity"],
                    separate: true,
                    include: [
                        {
                            attributes: [
                                "id",
                                "name",
                                "averageCost",
                                "measure",
                                "type",
                            ],
                            model: Product,
                            as: "supply",
                        },
                    ],
                },
                {
                    model: ProductAttribute,
                    attributes: ["name", "code", "value"],
                    separate: true,
                },
                {
                    model: Resource,
                    through: {
                        attributes: [],
                    },
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
        });

        let totalPages = Math.ceil(found_products.count / limit);
        if (found_products.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_products.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_products.rows,
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

export const getAllComboCompositions = async (req: any, res: Response) => {
    try {
        const { ids } = req.query;
        const user = req.user;

        const found_products = await Product.findAll({
            attributes: ["id", "name"],
            where: {
                id: ids.split(","),
                businessId: user.businessId,
            },
            include: [
                {
                    model: Combo,
                    attributes: ["quantity"],
                    as: "compositions",
                    include: [
                        {
                            model: Product,
                            as: "composed",
                            attributes: ["id", "name", "measure"],
                        },
                        { model: Variation, attributes: ["id", "name"] },
                    ],
                },
            ],
        });

        const to_return = found_products.map(item => {
            return {
                id: item.id,
                name: item.name,
                compositions: item.compositions.map(combo => {
                    return {
                        name: combo.composed.name,
                        quantity: combo.quantity,
                    };
                }),
            };
        });

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

//Unit Measures
export const getAllMeasures = async (req: any, res: Response) => {
    try {
        const measures = [
            {
                code: "KG",
                value: "Kilogramo",
            },
            {
                code: "UNIT",
                value: "Unidad",
            },
            {
                code: "LITRE",
                value: "Litro",
            },
            {
                code: "PORTION",
                value: "Porción",
            },
            {
                code: "DRINK",
                value: "Trago",
            },
            {
                code: "POUND",
                value: "Libra",
            },
            {
                code: "CUP",
                value: "Copa",
            },
            {
                code: "BOTTLE",
                value: "Botella",
            },
        ];

        res.status(200).json(measures);
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

export const transformProductPrices = async (req: any, res: Response) => {
    try {
        const {
            mode,
            codeCurrency,
            percent,
            adjustType,
            adjustRound,
            priceSystemId,
        } = req.body;
        const user = req.user;

        const allProductsPrice = await ProductPrice.findAll({
            where: {
                codeCurrency,
                priceSystemId,
            },
            include: [
                {
                    model: Product,
                    where: {
                        businessId: user.businessId,
                    },
                },
            ],
        });

        let bulkPriceUpdate: Array<any> = [];
        let bulkPriceRecords: Array<any> = [];
        let endings: Array<number> = [];
        let firstLength = 0;

        if (adjustRound) {
            //Normalizing taking only same length
            let temporal: Array<string> = adjustRound
                .split(",")
                .sort((a: string, b: string) => {
                    if (a.length === b.length) {
                        return 0;
                    }
                    return a.length < b.length ? -1 : 1;
                });

            firstLength = temporal[0].length;

            endings = temporal
                .filter(item => {
                    return item.length === firstLength;
                })
                .map(item => Number(item));
        }

        for (const productPrice of allProductsPrice) {
            let newPrice = productPrice.price;

            if (mode === "increment") {
                const operationIncrement =
                    mathOperation(newPrice, percent, "multiplication") / 100;
                newPrice = mathOperation(
                    newPrice,
                    operationIncrement,
                    "addition",
                    2
                );
            } else {
                const operationSub =
                    mathOperation(newPrice, percent, "multiplication") / 100;
                newPrice = mathOperation(
                    newPrice,
                    operationSub,
                    "subtraction",
                    2
                );
            }

            if (adjustType === "decimal") {
                newPrice = truncateValue(newPrice, 2);
            } else {
                newPrice = Math.ceil(newPrice);
                if (endings.length !== 0) {
                    let differenceInCeil = newPrice;
                    let differenceInBottom = newPrice;

                    const divisor = Math.pow(10, firstLength);

                    while (!endings.includes(differenceInCeil % divisor)) {
                        differenceInCeil++;
                    }

                    while (!endings.includes(differenceInBottom % divisor)) {
                        differenceInBottom--;
                    }

                    if (
                        differenceInCeil - newPrice <=
                        newPrice - differenceInBottom
                    ) {
                        newPrice = differenceInCeil;
                    } else {
                        newPrice = differenceInBottom;
                    }
                }
            }

            if (productPrice.price !== newPrice) {
                bulkPriceUpdate.push({
                    id: productPrice.id,
                    price: newPrice,
                });

                bulkPriceRecords.push({
                    action: "CHANGE_PRICE",
                    newValue: "",
                    oldValue: "",
                    productId: productPrice.productId,
                    madeById: user.id,
                    details: `Se modificó el precio de ${productPrice.price}/${productPrice.codeCurrency} a ${newPrice}/${productPrice.codeCurrency} vía Configuraciones/Ajuste general de precios`,
                });
            }
        }

        if (bulkPriceUpdate.length !== 0) {
            await ProductPrice.bulkCreate(bulkPriceUpdate, {
                updateOnDuplicate: ["price"],
            });
        }

        res.status(200).json({ quantityModifies: bulkPriceUpdate.length });

        if (bulkPriceRecords.length !== 0) {
            await ProductRecords.bulkCreate(bulkPriceRecords);
        }
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

export const modifyPricesFromReference = async (req: any, res: Response) => {
    try {
        const {
            codeCurrency,
            basePriceSystemId,
            priceSystemId,
            baseCodeCurrency,
            adjustType,
            adjustRound,
            exchangeRate,
        } = req.body;
        const user = req.user;

        const allProducts = await Product.findAll({
            where: {
                businessId: user.businessId,
            },
            include: [ProductPrice],
        });

        let bulkPriceUpdate: Array<any> = [];
        let bulkAddProductPrice: Array<any> = [];
        let bulkPriceRecords: Array<any> = [];
        let endings: Array<number> = [];
        let firstLength = 0;

        if (adjustRound) {
            //Normalizing taking only same length
            let temporal: Array<string> = adjustRound
                .split(",")
                .sort((a: string, b: string) => {
                    if (a.length === b.length) {
                        return 0;
                    }
                    return a.length < b.length ? -1 : 1;
                });

            firstLength = temporal[0].length;

            endings = temporal
                .filter(item => {
                    return item.length === firstLength;
                })
                .map(item => Number(item));
        }

        for (const product of allProducts) {
            //Searching base price
            const foundBasePrice = product.prices.find(
                item =>
                    item.priceSystemId === basePriceSystemId &&
                    item.codeCurrency === baseCodeCurrency
            );

            if (!foundBasePrice) {
                continue;
            }

            //Searching price to update
            const priceToUpdate = product.prices.find(
                item =>
                    item.codeCurrency === codeCurrency &&
                    item.priceSystemId === priceSystemId
            );

            let newPrice = mathOperation(
                foundBasePrice.price,
                exchangeRate,
                "multiplication",
                2
            );

            if (adjustType !== "decimal") {
                newPrice = Math.ceil(newPrice);

                if (endings.length !== 0) {
                    let differenceInCeil = newPrice;
                    let differenceInBottom = newPrice;

                    const divisor = Math.pow(10, firstLength);

                    while (!endings.includes(differenceInCeil % divisor)) {
                        differenceInCeil++;
                    }

                    while (!endings.includes(differenceInBottom % divisor)) {
                        differenceInBottom--;
                    }

                    if (
                        differenceInCeil - newPrice <=
                        newPrice - differenceInBottom
                    ) {
                        newPrice = differenceInCeil;
                    } else {
                        newPrice = differenceInBottom;
                    }
                }
            }

            if (!priceToUpdate) {
                bulkAddProductPrice.push({
                    price: newPrice,
                    codeCurrency,
                    isMain: false,
                    productId: foundBasePrice.productId,
                    priceSystemId,
                });

                bulkPriceRecords.push({
                    action: "CHANGE_PRICE",
                    newValue: "",
                    oldValue: "",
                    productId: foundBasePrice.productId,
                    madeById: user.id,
                    details: `Se agregó un nuevo precio ${newPrice}/${codeCurrency} vía Configuraciones/Ajuste general de precios`,
                });
            } else {
                if (priceToUpdate.price !== newPrice) {
                    bulkPriceUpdate.push({
                        id: priceToUpdate.id,
                        price: newPrice,
                    });

                    bulkPriceRecords.push({
                        action: "CHANGE_PRICE",
                        newValue: "",
                        oldValue: "",
                        productId: priceToUpdate.productId,
                        madeById: user.id,
                        details: `Se modificó el precio de ${priceToUpdate.price}/${priceToUpdate.codeCurrency} a ${newPrice}/${priceToUpdate.codeCurrency} vía Configuraciones/Ajuste general de precios`,
                    });
                }
            }
        }

        if (bulkPriceUpdate.length !== 0) {
            await ProductPrice.bulkCreate(bulkPriceUpdate, {
                updateOnDuplicate: ["price"],
            });
        }

        if (bulkAddProductPrice.length !== 0) {
            await ProductPrice.bulkCreate(bulkAddProductPrice);
        }

        res.status(200).json({ quantityModifies: bulkPriceUpdate.length });

        if (bulkPriceRecords.length !== 0) {
            await ProductRecords.bulkCreate(bulkPriceRecords);
        }
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

export const findAllManufacturablesProducts = async (
    req: any,
    res: Response
) => {
    try {
        const {
            per_page,
            page,
            search,
            all_data,
            type,
            areaId,
            productionOrderId,
            ...params
        } = req.query;
        const user = req.user;

        //Preparing search
        let where_clause: any = {};
        const searchable_fields = ["measure"];
        const keys = Object.keys(params);
        keys.forEach(att => {
            if (searchable_fields.includes(att)) {
                where_clause[att] = params[att];
            }
        });

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

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
                where(fn("unaccent", col("Product.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        if (type) {
            const productTypes = type.split(",");

            const allTypes = ["STOCK", "MANUFACTURED"];

            for (const item of productTypes) {
                if (!allTypes.includes(item)) {
                    return res.status(400).json({
                        message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
                    });
                }
            }

            where_clause.type = {
                [Op.or]: productTypes,
            };
        }

        if (areaId) {
            const area = await Area.findByPk(areaId, {
                include: [
                    {
                        model: Product,
                        as: "listManufacturations",
                        attributes: ["id", "name", "type", "measure"],
                        through: {
                            attributes: [],
                        },
                    },
                ],
            });

            if (!area) {
                return res.status(404).json({
                    message: `El área proporcionada no fue encontrada.`,
                });
            }

            if (area.type !== "MANUFACTURER") {
                return res.status(404).json({
                    message: `El área proporcionada no es de tipo Procesado.`,
                });
            }

            if (area.limitProductionToOrderProduction) {
                const orderProduction = await ProductionOrder.findOne(
                    productionOrderId
                );

                if (orderProduction) {
                    const products = await ProductProductionOrder.findAll({
                        where: {
                            productionOrderId,
                            type: "END",
                        },
                    });

                    //Init procedure
                    const criteria = products.map(item => {
                        return {
                            id: item.productId,
                            quantity: item.quantity,
                        };
                    });

                    const result = await getSuppliesDependencies({
                        criteria,
                        precission_after_coma,
                    });

                    if (!internalCheckerResponse(result)) {
                        Logger.error(
                            result.message ||
                                "Ha ocurrido un error inesperado.",
                            {
                                origin: "findAllManufacturablesProducts/getSuppliesDependencies",
                                "X-App-Origin": req.header("X-App-Origin"),
                                businessId: user.businessId,
                                userId: user.id,
                            }
                        );
                        return res.status(result.status).json({
                            message: result.message,
                        });
                    }

                    where_clause.id =
                        result.data.listManufacturablesProducts?.map(
                            (item: any) => item.id
                        );
                } else if (area.limitProductProduction) {
                    where_clause.id = area?.listManufacturations?.map(
                        item => item.id
                    );
                }
            } else if (area.limitProductProduction) {
                where_clause.id = area?.listManufacturations?.map(
                    item => item.id
                );
            }
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_products = await Product.findAndCountAll({
            attributes: [
                "id",
                "name",
                "type",
                "totalQuantity",
                "measure",
                "isManufacturable",
                "performance",
            ],
            distinct: true,
            where: {
                businessId: user.businessId,
                isManufacturable: true,
                type: {
                    [Op.or]: ["STOCK", "MANUFACTURED", "VARIATION"],
                },
                ...where_clause,
            },
            order: [["name", "ASC"]],
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
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
                {
                    model: Recipe,
                    include: [
                        {
                            model: ProductRawRecipe,
                            include: [Product],
                        },
                    ],
                },
                {
                    model: Supply,
                    as: "supplies",
                    attributes: ["id", "quantity", "supplyId"],
                    include: [
                        {
                            model: Product,
                            attributes: [
                                "id",
                                "name",
                                "measure",
                                "averageCost",
                                "type",
                            ],
                            as: "supply",
                            include: [
                                {
                                    model: Image,
                                    as: "images",
                                    attributes: [
                                        "id",
                                        "src",
                                        "thumbnail",
                                        "blurHash",
                                    ],
                                    through: {
                                        attributes: [],
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
            limit: all_data ? undefined : limit,
            offset,
        });

        let totalPages = Math.ceil(found_products.count / limit);
        if (found_products.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        let data_to_send = [];

        for (const product of found_products.rows) {
            let supplies = [];

            if (product.recipe) {
                for (const item of product.recipe?.productsRawRecipe || []) {
                    const cost = mathOperation(
                        item.product.averageCost,
                        item.consumptionIndex,
                        "multiplication",
                        precission_after_coma
                    );

                    supplies.push({
                        id: item.id,
                        quantity: item.consumptionIndex,
                        supplyId: item.productId,
                        name: item.product.name,
                        measure: item.product.measure,
                        images: item.product.images,
                        type: item.product.type,
                        performance: product.performance,
                        cost,
                    });
                }
            } else {
                for (const item of product.supplies) {
                    const cost = mathOperation(
                        item.supply.averageCost,
                        item.quantity,
                        "multiplication",
                        precission_after_coma
                    );

                    supplies.push({
                        id: item.id,
                        quantity: item.quantity,
                        supplyId: item.supplyId,
                        name: item.supply.name,
                        measure: item.supply.measure,
                        images: item.supply.images,
                        type: item.supply.type,
                        performance: product.performance,
                        cost,
                    });
                }
            }

            data_to_send.push({
                //@ts-ignore
                ...product.dataValues,
                recipe: {
                    name: product.recipe?.name,
                },
                supplies,
            });
        }

        res.status(200).json({
            totalItems: found_products.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: data_to_send,
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

export const getProductSupplies = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Precission
        const configurations = await getBusinessConfigCache(user.businessId);

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        const product = await Product.findByPk(id, {
            include: [
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            attributes: [
                                "id",
                                "name",
                                "measure",
                                "averageCost",
                                "type",
                            ],
                            as: "supply",
                            include: [
                                {
                                    model: Image,
                                    as: "images",
                                    attributes: [
                                        "id",
                                        "src",
                                        "thumbnail",
                                        "blurHash",
                                    ],
                                    through: {
                                        attributes: [],
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!product) {
            return res.status(404).json({
                message: `El producto no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let data_to_send = [];

        for (const item of product.supplies) {
            const cost = mathOperation(
                item.supply.averageCost,
                item.quantity,
                "multiplication",
                precission_after_coma
            );

            data_to_send.push({
                id: item.id,
                quantity: item.quantity,
                baseProductId: item.baseProductId,
                supplyId: item.supplyId,
                name: item.supply.name,
                measure: item.supply.measure,
                images: item.supply.images,
                cost,
            });
        }

        res.status(200).json(data_to_send);
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

export const getProductDependencies = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: `El producto con id no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //1. Checking dependencies in Supplies
        const dependencies = await Supply.findAll({
            where: {
                supplyId: id,
            },
            include: [
                {
                    model: Product,
                    attributes: ["id", "name", "measure", "type"],
                    as: "baseProduct",
                    include: [
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    required: true,
                },
            ],
        });

        let data_to_send = [];
        for (const supply of dependencies) {
            data_to_send.push({
                id: supply.baseProduct.id,
                type: supply.baseProduct.type,
                name: supply.baseProduct.name,
                measure: supply.baseProduct.measure,
                images: supply.baseProduct.images,
                quantity: supply.quantity,
            });
        }

        //2. Checking dependencies in Combos
        const combos = await Combo.findAll({
            where: {
                composedId: id,
            },
            include: [
                {
                    attributes: [
                        "id",
                        "name",
                        "averageCost",
                        "measure",
                        "type",
                    ],
                    model: Product,
                    as: "comboBaseProduct",
                    include: [
                        {
                            model: Image,
                            as: "images",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                    required: true,
                },
            ],
        });

        for (const combo of combos) {
            data_to_send.push({
                id: combo.comboBaseProduct.id,
                type: combo.comboBaseProduct.type,
                name: combo.comboBaseProduct.name,
                measure: combo.comboBaseProduct.measure,
                images: combo.comboBaseProduct.images,
                quantity: combo.quantity,
            });
        }

        res.status(200).json(data_to_send);
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

//Supplies
interface SupplyProductItem {
    quantity: number;
    supplyProductId: number;
}

export const manageSupplies = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { products, performance } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //BaseProduct
        const baseProduct = await Product.findByPk(id, {
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
                },
            ],
        });

        if (!baseProduct) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (baseProduct.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (
            ["COMBO", "VARIATION", "WASTE", "ASSET"].includes(baseProduct.type)
        ) {
            t.rollback();
            return res.status(400).json({
                message: `El producto introducido no puede tener ficha técnica.`,
            });
        }

        baseProduct.performance = performance || 1;

        //Check if product exist
        const ids: Array<number> = products.map(
            (item: SupplyProductItem) => item.supplyProductId
        );

        //Avoiding same product as supply
        if (ids.find(item => item === baseProduct.id)) {
            t.rollback();
            return res.status(400).json({
                message: `No puede definir al mismo producto base como componente de su Ficha de costo.`,
            });
        }

        const products_found = await Product.findAll({
            where: {
                id: ids,
                businessId: user.businessId,
            },
        });

        let productRecords: Array<any> = [];

        if (products.length === 0) {
            //Special case means delete all Supplies of a Product
            const suppliesWithProduct = baseProduct.supplies.map(
                item =>
                    `${item.supply.name}(${item.quantity} ${item.supply.measure})`
            );

            if (suppliesWithProduct) {
                const productDeleteSupplies = suppliesWithProduct.map(
                    item => `${item}`
                );

                productRecords.push({
                    action: "EDIT_TECHNICAL_FILE",
                    newValue: "",
                    oldValue: "",
                    productId: baseProduct.id,
                    madeById: user.id,
                    details: `Se elimino de la ficha técnica ${productDeleteSupplies.join(
                        ", "
                    )} `,
                });
            }
            await Supply.destroy({
                where: {
                    baseProductId: id,
                },
                transaction: t,
            });
        } else {
            //Obtaining all Supplies to compare
            const current_supplies = await Supply.findAll({
                where: {
                    baseProductId: id,
                },
            });

            let addBulk = [];
            let alreadyProcessed: Array<number> = [];
            for (const product_received of products as SupplyProductItem[]) {
                const found_check = products_found.find(
                    item => item.id === product_received.supplyProductId
                );

                const foundLocal = alreadyProcessed.find(
                    item => item === product_received.supplyProductId
                );
                if (foundLocal) {
                    t.rollback();
                    return res.status(400).json({
                        message: `Se ha enviado dos veces el mismo producto ${found_check?.name} como componente de la Ficha. Elimine uno para continuar.`,
                    });
                } else {
                    alreadyProcessed.push(product_received.supplyProductId);
                }

                if (found_check) {
                    //Checking that product be a MENU type
                    if (
                        ![
                            "STOCK",
                            "WASTE",
                            "MANUFACTURED",
                            "VARIABLE",
                            "RAW",
                        ].includes(found_check.type)
                    ) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Los componentes de una ficha técnica solo pueden ser productos de tipo Almacén, Materia prima, Variable, Procesado o Desperdicio.`,
                        });
                    }

                    //Analyzing if no cycle dependencie
                    const hasCircularDep = await hasCircularDependency(
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
                    const already_exist = current_supplies.find(
                        item =>
                            item.supplyId === product_received.supplyProductId
                    );

                    if (!already_exist) {
                        //It is new
                        addBulk.push({
                            quantity: product_received.quantity,
                            baseProductId: id,
                            supplyId: product_received.supplyProductId,
                        });

                        productRecords.push({
                            action: "EDIT_TECHNICAL_FILE",
                            newValue: "",
                            oldValue: "",
                            productId: baseProduct.id,
                            madeById: user.id,
                            details: `Se agregó a la ficha técnica el productos ${found_check.name}(${product_received.quantity} ${found_check.measure}) `,
                        });
                    } else {
                        if (
                            already_exist.quantity !== product_received.quantity
                        ) {
                            productRecords.push({
                                action: "EDIT_TECHNICAL_FILE",
                                newValue: "",
                                oldValue: "",
                                productId: baseProduct.id,
                                madeById: user.id,
                                details: `Se modificó la cantidad del producto ${found_check.name}(${product_received.quantity} ${found_check.measure}) `,
                            });
                        }
                        already_exist.quantity = product_received.quantity;
                        await already_exist.save({ transaction: t });
                    }
                }
            }

            if (addBulk.length !== 0) {
                await Supply.bulkCreate(addBulk, { transaction: t });
            }

            if (productRecords.length !== 0) {
                await ProductRecords.bulkCreate(productRecords, {
                    transaction: t,
                });
            }

            //Checking removed
            let idsToRemove = [];
            for (const current_supply of current_supplies) {
                const exist = products_found.find(
                    item => item.id === current_supply.supplyId
                );

                if (!exist) {
                    idsToRemove.push(current_supply.id);
                }
            }

            await Supply.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: t,
            });
        }

        await baseProduct.save({ transaction: t });

        const product_to_emit = await Product.scope("to_return").findByPk(id, {
            transaction: t,
        });

        await t.commit();

        productQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    productId: id,
                    businessId: baseProduct.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [id],
                    businessId: user.businessId,
                },
            },
            {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: true,
            }
        );

        res.status(200).json(product_to_emit);
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

interface ComposedProductItem {
    quantity: number;
    composedId: number;
    variationId: number;
}

export const manageProductsInCombo = async (req: any, res: Response) => {
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

        //BaseProduct
        const baseProduct = await Product.findByPk(id);

        if (!baseProduct) {
            t.rollback();
            return res.status(404).json({
                message: `El producto no fue encontrado.`,
            });
        }

        //Checking if action belongs to user Business
        if (baseProduct.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        if (baseProduct.type !== "COMBO") {
            t.rollback();
            return res.status(400).json({
                message: `Solo los productos de tipo COMBO pueden contener otros productos.`,
            });
        }

        //Check if product exist
        const ids = products.map(
            (item: ComposedProductItem) => item.composedId
        );
        const products_found = await Product.findAll({
            where: {
                id: ids,
                businessId: user.businessId,
            },
        });

        //Delete all Combo-subproducts
        await Combo.destroy({
            where: {
                comboBaseProductId: id,
            },
            transaction: t,
        });

        //Precission
        const configurations = await getBusinessConfigCache(
            baseProduct.businessId
        );

        const precission_after_coma = configurations.find(
            item => item.key === "precission_after_coma"
        )?.value;

        let addBulk = [];
        let totalCost = 0;
        if (products.length !== 0) {
            for (const product_received of products as ComposedProductItem[]) {
                const found_check = products_found.find(
                    item => item.id === product_received.composedId
                );

                if (found_check) {
                    //Combo-Subproducts only can be READYFORSALE
                    if (
                        ![
                            "VARIATION",
                            "ADDON",
                            "SERVICE",
                            "MENU",
                            "STOCK",
                        ].includes(found_check.type)
                    ) {
                        t.rollback();
                        return res.status(400).json({
                            message: `Los componentes de una producto de tipo COMBO solo pueden ser productos de tipo Listos para vender.`,
                        });
                    }

                    if (found_check.id === id) {
                        t.rollback();
                        return res.status(400).json({
                            message: `El producto ${found_check.name} no puede agregarse como composición de si mismo.`,
                        });
                    }

                    totalCost = mathOperation(
                        totalCost,
                        product_received.quantity * found_check.averageCost,
                        "addition",
                        precission_after_coma
                    );

                    addBulk.push({
                        quantity: product_received.quantity,
                        comboBaseProductId: id,
                        composedId: product_received.composedId,
                        variationId: product_received.variationId,
                    });
                } else {
                    t.rollback();
                    return res.status(404).json({
                        message: `El producto con el id ${product_received.composedId} no fue encontrado en el negocio.`,
                    });
                }
            }
        }

        await Combo.bulkCreate(addBulk, { transaction: t });

        //Updating cost
        baseProduct.averageCost = totalCost;

        await baseProduct.save({ transaction: t });

        const product_to_emit = await Product.scope("to_return").findByPk(id, {
            transaction: t,
        });

        await t.commit();
        res.status(200).json(product_to_emit);

        productQueue.add(
            {
                code: "CHECKING_PRODUCT",
                params: {
                    productsIds: [id],
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

//Fixed cost
export const newProductFixedCost = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        //Checking product received
        const product = await Product.findByPk(params.productId, {
            include: [{ model: ProductFixedCost }],
        });

        if (!product) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrado.`,
            });
        }

        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let prevValue: any = {};
        let newValue: any = {};

        const productFixedCost: ProductFixedCost = ProductFixedCost.build({
            ...params,
        });

        await productFixedCost.save();

        const to_return = await ProductFixedCost.scope("to_return").findByPk(
            productFixedCost.id
        );

        productQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    productId: product.id,
                    businessId: product.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        //Records
        await ProductRecords.create({
            action: "CREATED_FIXED_COST",
            newValue: JSON.stringify(productFixedCost),
            oldValue: "",
            productId: product.id,
            madeById: user.id,
            details: `Se agrego un nuevo costo fijo para el producto por ${productFixedCost.costAmount}`,
        });

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

export const editProductFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(ProductFixedCost.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "productId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const productFixedCost = await ProductFixedCost.findByPk(id);
        let prevProductFixedCost = { ...productFixedCost };
        if (!productFixedCost) {
            return res.status(404).json({
                message: `El objeto no fue encontrado`,
            });
        }

        //Checking product received
        const product = await Product.findByPk(productFixedCost.productId);

        if (!product) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrado.`,
            });
        }

        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        let changedProperties: any = [];

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                changedProperties.push(
                    `${translateFieldProduct(att)}: ${
                        //@ts-ignore
                        productFixedCost[att]
                    } por ${params[att]}`
                );
                //@ts-ignore
                productFixedCost[att] = params[att];
            }
        });

        await productFixedCost.save();

        const to_return = await ProductFixedCost.scope("to_return").findByPk(
            productFixedCost.id
        );

        //Records
        await ProductRecords.create({
            action: "EDIT_FIXED_COST",
            newValue: JSON.stringify(productFixedCost),
            oldValue: JSON.stringify(prevProductFixedCost),
            productId: product.id,
            madeById: user.id,
            details: `Se edito el costo fijo para el producto. Propiedades modificadas: ${changedProperties.join(
                ", "
            )} `,
        });

        productQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    productId: product.id,
                    businessId: product.businessId,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

export const findAllProductFixedCost = async (req: any, res: Response) => {
    try {
        const { productId } = req.params;
        const { per_page, page, all_data } = req.query;
        const user: User = req.user;

        //Checking product received
        const product = await Product.findByPk(productId);

        if (!product) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrado.`,
            });
        }

        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Preparing search
        let where_clause: any = {};

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_product_fixed_cost = await ProductFixedCost.findAndCountAll(
            {
                distinct: true,
                where: { productId, ...where_clause },
                attributes: ["id", "costAmount", "description"],
                limit: all_data ? undefined : limit,
                offset,
            }
        );

        let totalPages = Math.ceil(found_product_fixed_cost.count / limit);
        if (found_product_fixed_cost.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_product_fixed_cost.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_product_fixed_cost.rows,
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

export const deleteProductFixedCost = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const productFixedCost = await ProductFixedCost.findByPk(id);

        if (!productFixedCost) {
            return res.status(404).json({
                message: `ProductFixedCost not found`,
            });
        }

        //Checking product received
        const product = await Product.findByPk(productFixedCost.productId);

        if (!product) {
            return res.status(404).json({
                message: `El producto introducido no fue encontrada.`,
            });
        }

        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Records
        await ProductRecords.create({
            action: "EDIT_FIXED_COST",
            newValue: "",
            oldValue: JSON.stringify(productFixedCost),
            productId: product.id,
            madeById: user.id,
            details: `Se elimino el costo fijo para el producto de ${productFixedCost.costAmount}`,
        });

        await productFixedCost.destroy();

        productQueue.add(
            {
                code: "UPDATE_COST",
                params: {
                    productId: product.id,
                },
            },
            { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );

        res.status(200).json({
            message: `ProductFixedCost deleted successfully`,
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

export const duplicateAProduct = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { ...params } = req.body;
        const user: User = req.user;

        if (user.businessId !== Number(params.toBusinessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await productDuplicator(
            {
                ...params,
            },
            t
        );

        await t.commit();

        res.status(200).json({
            message: `Sucess`,
        });
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

export const findAllProductsRecords = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { page, per_page, all_data, dateFrom, dateTo, action } =
            req.query;

        let where_clause: any = {};

        //filter for date
        if (dateFrom && dateTo) {
            //case  between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //filter for action
        if (action) {
            where_clause["action"] = {
                [Op.iLike]: action,
            };
        }

        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const { count, rows } = await ProductRecord.findAndCountAll({
            order: [["createdAt", "DESC"]],
            limit: all_data ? undefined : limit,
            offset,
            where: {
                productId: id,
                ...where_clause,
            },
            include: [
                {
                    model: User,
                    attributes: ["id", "username", "email", "displayName"],
                },
            ],
        });

        let totalPages = Math.ceil(count / limit);
        if (count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        return res.json({
            totalItems: count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: rows,
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
