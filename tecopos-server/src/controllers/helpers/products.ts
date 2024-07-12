import { Transaction } from "sequelize";
import moment from "moment";

import { ItemProductSelled } from "../../interfaces/models";
import Product from "../../database/models/product";
import Supply from "../../database/models/supply";
import StockAreaProduct from "../../database/models/stockAreaProduct";
import Area from "../../database/models/area";
import Variation from "../../database/models/variation";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Combo from "../../database/models/Combo";
import { InternalHelperResponse, ProductItemMove } from "./interfaces";
import {
    exchangeCurrency,
    internalCheckerResponse,
    mathOperation,
    obtainingProductPriceSystemPriceDefined,
    truncateValue,
} from "../../helpers/utils";
import OrderReceipt from "../../database/models/orderReceipt";
import Coupon from "../../database/models/coupon";
import { getTitleOrderRecord } from "../../helpers/translator";
import EconomicCycle from "../../database/models/economicCycle";
import SelledProduct from "../../database/models/selledProduct";
import Price from "../../database/models/price";
import { CurrencyPaymentReduced } from "../sales";
import CurrencyPayment from "../../database/models/currencyPayment";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import {
    ExtendedPrice,
    OrderProductPrice,
    SimplePrice,
} from "../../interfaces/commons";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";
import ProductPrice from "../../database/models/productPrice";
import Image from "../../database/models/image";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import Resource from "../../database/models/resource";
import { order_origin, productType } from "../../interfaces/nomenclators";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import ProductionTicket from "../../database/models/productionTicket";
import ListUsedClientsCoupon from "../../database/models/listUsedClientsCoupon";
import Business from "../../database/models/business";
import PaymentGateway from "../../database/models/paymentGateway";
import Recipe from "../../database/models/recipe";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import StockMovement from "../../database/models/stockMovement";
import MovementStateRecord from "../../database/models/movementStateRecord";
import SalesCategory from "../../database/models/salesCategory";
import ProductCategory from "../../database/models/productCategory";
import Logger from "../../lib/logger";
import { redisClient } from "../../../app";
import {
    getAreaCache,
    getBusinessConfigCache,
    getCurrenciesCache,
    getEphimeralTermKey,
    getExpirationTime,
    getOrderFromCacheTransaction,
    getOrderRecordsCache,
    getStoreProductsCache,
} from "../../helpers/redisStructure";
import SelledProductAddon from "../../database/models/selledProductAddon";
import OrderReceiptModifier from "../../database/models/orderReceiptModifier";
import BatchProductStockArea from "../../database/models/batchProductStockArea";
import Batch from "../../database/models/batch";
import BatchBuyedProduct from "../../database/models/batchBuyedProduct";

//Rules
//MENU, SERVICE and ADDON no cover VARIATION in supplies
export const substractProductStockDisponibility = async (
    initialData: {
        products: Array<ItemProductSelled>;
        stockAreaId: number;
        businessId: number;
        strict: boolean;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    let productsReceived = [...initialData.products];
    let strictMode = initialData.strict;

    //@ts-ignore
    const tId = childt.id;

    //Analyzing if COMBO products are found
    const productCombos = await Product.findAll({
        where: {
            type: "COMBO",
            id: initialData.products.map(item => item.productId),
            businessId: initialData.businessId,
        },
        include: [
            {
                model: Combo,
                as: "compositions",
                include: [
                    {
                        model: Product,
                        as: "composed",
                        include: [
                            {
                                model: Area,
                                as: "listProductionAreas",
                                attributes: ["id", "name"],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                    },
                    { model: Variation },
                ],
            },
        ],
    });

    if (productCombos.length !== 0) {
        productCombos.forEach(combo => {
            const comboQuantity =
                productsReceived.find(item => item.productId === combo.id)
                    ?.quantity || 1;
            combo.compositions.forEach(item => {
                const foundProductionArea =
                    item.composed?.listProductionAreas?.[0];

                productsReceived.push({
                    productId: item.composedId,
                    quantity: item.quantity * comboQuantity,
                    productionAreaId: foundProductionArea?.id,
                    variationId: item.variationId,
                    addons: [],
                });
            });
        });
    }

    //For updating quantities
    let productUpdates: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    let productStockAreaUpdates: Array<{
        id: number;
        quantity: number;
    }> = [];

    let productVariationStockAreaUpdates: Array<{
        id: number;
        quantity: number;
    }> = [];

    let addNegativeStockAreaProducts: Array<{
        productId: number;
        areaId: number;
        quantity: number;
        type: string;
    }> = [];

    //Entra data
    let productsAdded: Array<{
        productId: number;
        quantity: number;
    }> = [];

    //Finding and dividing products according type
    const ids = productsReceived.map(item => item.productId);

    const productsFound = await Product.findAll({
        where: { id: ids, businessId: initialData.businessId },
        include: [
            {
                model: Product,
                as: "availableAddons",
                through: {
                    attributes: [],
                },
                include: [
                    {
                        model: ProductPrice,
                        attributes: [
                            "id",
                            "price",
                            "codeCurrency",
                            "isMain",
                            "priceSystemId",
                        ],
                    },
                    {
                        model: Supply,
                        as: "supplies",
                        include: [
                            {
                                model: Product,
                                as: "supply",
                                include: [StockAreaProduct],
                            },
                        ],
                        required: false,
                    },
                    {
                        model: Price,
                        as: "onSalePrice",
                        attributes: ["codeCurrency", "amount"],
                    },
                ],
            },
            SalesCategory,
            {
                model: ProductPrice,
                attributes: [
                    "id",
                    "price",
                    "codeCurrency",
                    "isMain",
                    "priceSystemId",
                ],
            },
            {
                model: Supply,
                as: "supplies",
                include: [
                    {
                        model: Product,
                        as: "supply",
                        include: [StockAreaProduct],
                    },
                ],
                required: false,
            },
            {
                model: StockAreaProduct,
                include: [StockAreaVariation],
            },
            {
                model: Area,
                as: "listProductionAreas",
                attributes: ["id", "name", "stockAreaId"],
                through: {
                    attributes: [],
                },
                paranoid: false,
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
                model: Price,
                as: "onSalePrice",
                attributes: ["codeCurrency", "amount"],
            },
            {
                model: Variation,
                as: "variations",
                separate: true,
                include: [
                    {
                        model: Price,
                        as: "price",
                    },
                ],
            },
            {
                model: Resource,
            },
        ],
        transaction: childt,
    });

    //Saving result in cache
    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "storeProducts", tId),
        JSON.stringify(productsFound),
        {
            EX: getExpirationTime("storeProducts"),
        }
    );

    const productsStockFound = await StockAreaProduct.findAll({
        where: {
            productId: productsFound
                .filter(item => ["STOCK", "VARIATION"].includes(item.type))
                .map(item => item.id),
        },
        include: [
            {
                model: StockAreaVariation,
                include: [Variation],
            },
        ],
        transaction: childt,
    });

    //--> INIT BLOCK Resources
    const supplies = await Supply.findAll({
        where: {
            baseProductId: ids,
        },
    });
    const blockedProducts = Array.from(
        new Set([...ids, ...supplies.map(item => item.supplyId)])
    );

    await Product.findAll({
        where: {
            id: blockedProducts,
        },
        lock: true,
        transaction: childt,
    });
    await StockAreaProduct.findAll({
        where: {
            productId: blockedProducts,
        },
        lock: true,
        transaction: childt,
    });
    //--> END BLOCK Resources

    const configurations = await getBusinessConfigCache(initialData.businessId);

    const precission_after_coma = configurations.find(
        item => item.key === "precission_after_coma"
    )?.value;

    for (const product of productsReceived) {
        //Analyzing if where found
        const productDetails = productsFound.find(
            item => item.id === product.productId
        );

        if (!productDetails) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado.`,
            };
        }

        //Filling extra data
        const foundAddedIndex = productsAdded.findIndex(
            item => item.productId === product.productId
        );
        if (foundAddedIndex !== -1) {
            productsAdded[foundAddedIndex].quantity = mathOperation(
                productsAdded[foundAddedIndex].quantity,
                product.quantity,
                "addition",
                precission_after_coma
            );
        } else {
            productsAdded.push({
                productId: product.productId,
                quantity: product.quantity,
            });
        }

        //General validations
        //Defining stockProductionAreaId
        let stockProductionAreaId: number = initialData.stockAreaId;
        if (["MENU", "ADDON", "SERVICE"].includes(productDetails.type)) {
            if (
                productDetails.listProductionAreas &&
                productDetails.listProductionAreas.length !== 0
            ) {
                if (productDetails.listProductionAreas.length === 1) {
                    stockProductionAreaId =
                        productDetails.listProductionAreas[0].stockAreaId;
                } else {
                    const found = productDetails.listProductionAreas.find(
                        element => element.id === product.productionAreaId
                    );

                    if (found) {
                        stockProductionAreaId = found.stockAreaId;
                    }
                }
            }
        }

        //Updating quantities in Central STOCK is stock Limit is defined
        if (productDetails.stockLimit) {
            const found_quantity = productUpdates.find(
                item => item.id === productDetails.id
            );

            if (found_quantity) {
                productUpdates = productUpdates.map(item => {
                    if (item.id === productDetails.id) {
                        return {
                            ...item,
                            totalQuantity: mathOperation(
                                item.totalQuantity,
                                product.quantity,
                                "subtraction",
                                precission_after_coma
                            ),
                        };
                    }
                    return item;
                });
            } else {
                productUpdates.push({
                    id: productDetails.id,
                    totalQuantity: mathOperation(
                        productDetails.totalQuantity,
                        product.quantity,
                        "subtraction",
                        precission_after_coma
                    ),
                });
            }
        }

        switch (productDetails.type) {
            case "MENU":
            case "ADDON":
            case "SERVICE": {
                //Analyzing if primary quantities are enough
                if (
                    productDetails.totalQuantity <= 0 &&
                    productDetails.stockLimit &&
                    strictMode
                ) {
                    return {
                        status: 404,
                        message: `El producto con id ${productDetails.name} no esta disponible para la venta.`,
                    };
                }

                if (
                    product.quantity > productDetails.totalQuantity &&
                    productDetails.stockLimit &&
                    strictMode
                ) {
                    return {
                        status: 404,
                        message: `La cantidad seleccionada de ${productDetails.name} no está disponible para la venta. Cantidad disponible: ${productDetails.totalQuantity}`,
                    };
                }

                //Analyzing if addons are present
                if (product.addons && product.addons?.length !== 0) {
                    for (const addon of product.addons) {
                        const addonFoundDetails =
                            productDetails.availableAddons?.find(
                                item => item.id === addon.id
                            );

                        if (!addonFoundDetails) {
                            return {
                                status: 404,
                                message: `El agrego con id ${addon.id} no está disponible para el producto ${productDetails.name}.`,
                            };
                        }

                        //Cheking disponibility
                        if (
                            addonFoundDetails.totalQuantity <= 0 &&
                            addonFoundDetails.stockLimit &&
                            strictMode
                        ) {
                            return {
                                status: 406,
                                message: `La cantidad seleccionada del agrego ${addonFoundDetails.name} no está disponible para la venta. Cantidad disponible: ${addonFoundDetails.totalQuantity}`,
                            };
                        }

                        //Updating quantities in Central STOCK if stock limit is defined
                        if (addonFoundDetails.stockLimit) {
                            const found_quantity = productUpdates.find(
                                item => item.id === addonFoundDetails.id
                            );

                            if (found_quantity) {
                                productUpdates = productUpdates.map(item => {
                                    if (item.id === addonFoundDetails.id) {
                                        return {
                                            ...item,
                                            totalQuantity: mathOperation(
                                                item.totalQuantity,
                                                addon.quantity,
                                                "subtraction",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                            } else {
                                productUpdates.push({
                                    id: addonFoundDetails.id,
                                    totalQuantity: mathOperation(
                                        addonFoundDetails.totalQuantity,
                                        addon.quantity,
                                        "subtraction",
                                        precission_after_coma
                                    ),
                                });
                            }
                        }

                        //Analyzing if addons has supplies and processing quantities - (Preparation Area)
                        if (addonFoundDetails.supplies.length !== 0) {
                            for (const supply of addonFoundDetails.supplies) {
                                //Updating quantities in Central STOCK
                                const found_quantity = productUpdates.find(
                                    item => item.id === supply.supplyId
                                );

                                if (found_quantity) {
                                    productUpdates = productUpdates.map(
                                        item => {
                                            if (item.id === supply.supplyId) {
                                                return {
                                                    ...item,
                                                    totalQuantity:
                                                        mathOperation(
                                                            item.totalQuantity,
                                                            supply.quantity *
                                                                addon.quantity,
                                                            "subtraction",
                                                            precission_after_coma
                                                        ),
                                                };
                                            }
                                            return item;
                                        }
                                    );
                                } else {
                                    productUpdates.push({
                                        id: supply.supplyId,
                                        totalQuantity: mathOperation(
                                            supply.supply.totalQuantity,
                                            supply.quantity * addon.quantity,
                                            "subtraction",
                                            precission_after_coma
                                        ),
                                    });
                                }

                                //Updating quantities in Central STOCK (StockAreaProduct Table)
                                const found =
                                    supply.supply.stockAreaProducts?.find(
                                        item =>
                                            item.areaId ===
                                                stockProductionAreaId &&
                                            item.productId === supply.supplyId
                                    );

                                if (found) {
                                    //There is disponibility
                                    const found_quantity =
                                        productStockAreaUpdates.find(
                                            item => item.id === found.id
                                        );

                                    if (found_quantity) {
                                        productStockAreaUpdates =
                                            productStockAreaUpdates.map(
                                                item => {
                                                    if (item.id === found.id) {
                                                        return {
                                                            ...item,
                                                            quantity:
                                                                mathOperation(
                                                                    item.quantity,
                                                                    supply.quantity *
                                                                        addon.quantity,
                                                                    "subtraction",
                                                                    precission_after_coma
                                                                ),
                                                        };
                                                    }
                                                    return item;
                                                }
                                            );
                                    } else {
                                        productStockAreaUpdates.push({
                                            id: found.id,
                                            quantity: mathOperation(
                                                found.quantity,
                                                supply.quantity *
                                                    addon.quantity,
                                                "subtraction",
                                                precission_after_coma
                                            ),
                                        });
                                    }
                                } else {
                                    // No disponibility (creating negative StockAreaProducts)
                                    const found_in_negative =
                                        addNegativeStockAreaProducts.find(
                                            item =>
                                                item.productId ===
                                                supply.supplyId
                                        );

                                    if (found_in_negative) {
                                        addNegativeStockAreaProducts =
                                            addNegativeStockAreaProducts.map(
                                                item => {
                                                    if (
                                                        item.productId ===
                                                        supply.supplyId
                                                    ) {
                                                        return {
                                                            ...item,
                                                            quantity:
                                                                mathOperation(
                                                                    item.quantity,
                                                                    supply.quantity *
                                                                        addon.quantity,
                                                                    "subtraction",
                                                                    precission_after_coma
                                                                ),
                                                        };
                                                    }
                                                    return item;
                                                }
                                            );
                                    } else {
                                        addNegativeStockAreaProducts.push({
                                            productId: supply.supplyId,
                                            areaId: stockProductionAreaId,
                                            type: supply.supply.type,
                                            quantity:
                                                mathOperation(
                                                    supply.quantity,
                                                    addon.quantity,
                                                    "multiplication",
                                                    precission_after_coma
                                                ) * -1,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                //Analyzing Supplies Products and updating quantities (Preparation Area)
                if (productDetails.supplies.length !== 0) {
                    for (const supply of productDetails.supplies) {
                        //Updating quantities in Central STOCK
                        const found_quantity = productUpdates.find(
                            item => item.id === supply.supplyId
                        );

                        if (found_quantity) {
                            productUpdates = productUpdates.map(item => {
                                if (item.id === supply.supplyId) {
                                    return {
                                        ...item,
                                        totalQuantity: mathOperation(
                                            item.totalQuantity,
                                            supply.quantity * product.quantity,
                                            "subtraction",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            });
                        } else {
                            productUpdates.push({
                                id: supply.supplyId,
                                totalQuantity: mathOperation(
                                    supply.supply.totalQuantity,
                                    supply.quantity * product.quantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            });
                        }

                        //Updating quantities in Central STOCK (StockAreaProduct Table)
                        const found = supply.supply.stockAreaProducts?.find(
                            item =>
                                item.areaId === stockProductionAreaId &&
                                item.productId === supply.supplyId
                        );

                        if (found) {
                            //There is disponibility
                            const found_quantity = productStockAreaUpdates.find(
                                item => item.id === found.id
                            );
                            if (found_quantity) {
                                productStockAreaUpdates =
                                    productStockAreaUpdates.map(item => {
                                        if (item.id === found.id) {
                                            return {
                                                ...item,
                                                quantity: mathOperation(
                                                    item.quantity,
                                                    supply.quantity *
                                                        product.quantity,
                                                    "subtraction",
                                                    precission_after_coma
                                                ),
                                            };
                                        }
                                        return item;
                                    });
                            } else {
                                productStockAreaUpdates.push({
                                    id: found.id,
                                    quantity: mathOperation(
                                        found.quantity,
                                        supply.quantity * product.quantity,
                                        "subtraction",
                                        precission_after_coma
                                    ),
                                });
                            }
                        } else {
                            // No disponibility (creating negative StockAreaProducts)
                            const found_in_negative =
                                addNegativeStockAreaProducts.find(
                                    item => item.productId === supply.supplyId
                                );

                            if (found_in_negative) {
                                addNegativeStockAreaProducts =
                                    addNegativeStockAreaProducts.map(item => {
                                        if (
                                            item.productId === supply.supplyId
                                        ) {
                                            return {
                                                ...item,
                                                quantity: mathOperation(
                                                    item.quantity,
                                                    supply.quantity *
                                                        product.quantity,
                                                    "subtraction",
                                                    precission_after_coma
                                                ),
                                            };
                                        }
                                        return item;
                                    });
                            } else {
                                addNegativeStockAreaProducts.push({
                                    productId: supply.supplyId,
                                    areaId: stockProductionAreaId,
                                    type: supply.supply.type,
                                    quantity:
                                        mathOperation(
                                            supply.quantity,
                                            product.quantity,
                                            "multiplication",
                                            precission_after_coma
                                        ) * -1,
                                });
                            }
                        }
                    }
                }
                break;
            }

            case "STOCK":
            case "VARIATION": {
                const stockProductDetails = productsStockFound.find(
                    item =>
                        item.productId === product.productId &&
                        item.areaId === initialData.stockAreaId
                );

                if (strictMode) {
                    if (!stockProductDetails) {
                        return {
                            status: 404,
                            message: `El producto ${productDetails.name} no está disponible para la venta.`,
                        };
                    }

                    if (stockProductDetails.quantity < product.quantity) {
                        return {
                            status: 404,
                            message: `La cantidad seleccionada de ${productDetails.name} no está disponible para la venta. Cantidad disponible: ${stockProductDetails.quantity}`,
                        };
                    }

                    //Updating quantities in Central STOCK (StockAreaProduct Table)
                    const found_quantity_area = productStockAreaUpdates.find(
                        item => item.id === stockProductDetails.id
                    );

                    if (found_quantity_area) {
                        productStockAreaUpdates = productStockAreaUpdates.map(
                            item => {
                                if (item.id === stockProductDetails.id) {
                                    return {
                                        ...item,
                                        quantity: mathOperation(
                                            item.quantity,
                                            product.quantity,
                                            "subtraction",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        productStockAreaUpdates.push({
                            id: stockProductDetails.id,
                            quantity: mathOperation(
                                stockProductDetails.quantity,
                                product.quantity,
                                "subtraction",
                                precission_after_coma
                            ),
                        });
                    }

                    //Analyzing Variation
                    if (productDetails.type === "VARIATION") {
                        if (!product.variationId) {
                            return {
                                status: 404,
                                message: `No se recibió la variación del producto ${productDetails.name}.`,
                            };
                        }

                        const foundVariation =
                            stockProductDetails.variations.find(
                                item => item.variationId === product.variationId
                            );

                        if (!foundVariation) {
                            return {
                                status: 404,
                                message: `El producto ${productDetails.name} con id de variación ${product.variationId} no fue encontrado.`,
                            };
                        }

                        if (foundVariation.quantity < product.quantity) {
                            return {
                                status: 404,
                                message: `La cantidad seleccionada de ${productDetails.name} - ${foundVariation.variation?.name} no está disponible para la venta. Cantidad disponible: ${foundVariation.quantity}`,
                            };
                        }

                        //Updating quantity in variations
                        const found_variation_quantity =
                            productVariationStockAreaUpdates.find(
                                item => item.id === foundVariation.id
                            );

                        if (found_variation_quantity) {
                            productVariationStockAreaUpdates =
                                productVariationStockAreaUpdates.map(item => {
                                    if (item.id === foundVariation.id) {
                                        return {
                                            ...item,
                                            quantity: mathOperation(
                                                item.quantity,
                                                product.quantity,
                                                "subtraction",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                        } else {
                            productVariationStockAreaUpdates.push({
                                id: foundVariation.id,
                                quantity: mathOperation(
                                    foundVariation.quantity,
                                    product.quantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            });
                        }
                    }
                } else {
                    if (stockProductDetails) {
                        //There is disponibility
                        const found_quantity = productStockAreaUpdates.find(
                            item => item.id === stockProductDetails.id
                        );
                        if (found_quantity) {
                            productStockAreaUpdates =
                                productStockAreaUpdates.map(item => {
                                    if (item.id === stockProductDetails.id) {
                                        return {
                                            ...item,
                                            quantity: mathOperation(
                                                item.quantity,
                                                product.quantity,
                                                "subtraction",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                        } else {
                            productStockAreaUpdates.push({
                                id: stockProductDetails.id,
                                quantity: mathOperation(
                                    stockProductDetails.quantity,
                                    product.quantity,
                                    "subtraction",
                                    precission_after_coma
                                ),
                            });
                        }
                    } else {
                        // No disponibility (creating negative StockAreaProducts)
                        const found_in_negative =
                            addNegativeStockAreaProducts.find(
                                item => item.productId === product.productId
                            );

                        if (found_in_negative) {
                            addNegativeStockAreaProducts =
                                addNegativeStockAreaProducts.map(item => {
                                    if (item.productId === product.productId) {
                                        return {
                                            ...item,
                                            quantity: mathOperation(
                                                item.quantity,
                                                product.quantity,
                                                "subtraction",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                        } else {
                            addNegativeStockAreaProducts.push({
                                productId: product.productId,
                                areaId: stockProductionAreaId,
                                type: productDetails.type,
                                quantity:
                                    truncateValue(
                                        product.quantity,
                                        precission_after_coma
                                    ) * -1,
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    //Updating quantities in Central Stock
    if (productUpdates.length !== 0) {
        await Product.bulkCreate(productUpdates, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Updating quantities in Central Stock (StockAreaProduct Table)
    if (productStockAreaUpdates.length !== 0) {
        const to_delete = productStockAreaUpdates.filter(
            item => item.quantity === 0
        );

        const update = productStockAreaUpdates.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(update, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        //Deleting out StockAreaProducts
        if (to_delete.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: to_delete.map(item => item.id),
                },
                transaction: childt,
            });
        }
    }

    //Updating quantities in StockAreaVariations
    if (productVariationStockAreaUpdates.length !== 0) {
        const to_delete = productVariationStockAreaUpdates.filter(
            item => item.quantity === 0
        );

        const update = productVariationStockAreaUpdates.filter(
            item => item.quantity !== 0
        );

        await StockAreaVariation.bulkCreate(update, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (to_delete.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: to_delete.map(item => item.id),
                },
                transaction: childt,
            });
        }
    }

    //Creating StockAreaProducts negative if exist
    if (addNegativeStockAreaProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(addNegativeStockAreaProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
        data: {
            affectedProducts: blockedProducts,
            productsAdded,
        },
    };
};

export const restoreProductStockDisponibility = async (
    initialData: {
        products: Array<ItemProductSelled>;
        stockAreaId: number;
        businessId: number;
        isAtSameEconomicCycle: boolean;
        userId: number;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    let productsReceived = [...initialData.products];

    //Analyzing if COMBO products are found
    const productCombos = await Product.findAll({
        where: {
            type: "COMBO",
            id: initialData.products.map(item => item.productId),
        },
        include: [
            {
                model: Combo,
                as: "compositions",
                include: [
                    {
                        model: Product,
                        as: "composed",
                        include: [
                            {
                                model: Area,
                                as: "listProductionAreas",
                                attributes: ["id", "name"],
                                through: {
                                    attributes: [],
                                },
                            },
                        ],
                    },
                    { model: Variation },
                ],
            },
        ],
    });

    if (productCombos.length !== 0) {
        productCombos.forEach(combo => {
            const comboQuantity =
                productsReceived.find(item => item.productId === combo.id)
                    ?.quantity || 1;

            combo.compositions.forEach(item => {
                const foundProductionArea =
                    item.composed?.listProductionAreas?.[0];

                productsReceived.push({
                    productId: item.composedId,
                    quantity: item.quantity * comboQuantity,
                    productionAreaId: foundProductionArea?.id,
                    variationId: item.variationId,
                    addons: [],
                });
            });
        });
    }

    //For updating quantities
    let productUpdates: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    let productStockAreaUpdates: Array<{
        id: number;
        quantity: number;
    }> = [];

    let productVariationStockAreaUpdates: Array<{
        id: number;
        quantity: number;
    }> = [];

    let newStockAreaProducts: Array<{
        productId: number;
        areaId: number;
        quantity: number;
        type: string;
        variations: Array<{
            variationId: number;
            quantity: number;
        }>;
    }> = [];

    let newStockVariationAreaProducts: Array<{
        stockAreaProductId: number;
        quantity: number;
        variationId: number;
    }> = [];

    let bulkStockMovements = [];

    //Entra data
    let productsRemoved: Array<{
        productId: number;
        quantity: number;
    }> = [];

    //Finding and dividing products according type
    const ids = productsReceived.map(item => item.productId);

    const productsFound = await Product.findAll({
        where: { id: ids },
        include: [
            {
                model: Product,
                as: "availableAddons",
                through: {
                    attributes: [],
                },
                include: [
                    {
                        model: ProductPrice,
                        attributes: [
                            "id",
                            "price",
                            "codeCurrency",
                            "isMain",
                            "priceSystemId",
                        ],
                    },
                    {
                        model: Supply,
                        as: "supplies",
                        include: [
                            {
                                model: Product,
                                as: "supply",
                                include: [StockAreaProduct],
                            },
                        ],
                    },
                    {
                        model: Price,
                        as: "onSalePrice",
                        attributes: ["codeCurrency", "amount"],
                    },
                ],
            },
            SalesCategory,
            {
                model: ProductPrice,
                attributes: [
                    "id",
                    "price",
                    "codeCurrency",
                    "isMain",
                    "priceSystemId",
                ],
            },
            {
                model: Supply,
                as: "supplies",
                include: [
                    {
                        model: Product,
                        as: "supply",
                        include: [StockAreaProduct],
                    },
                ],
            },
            {
                model: Area,
                as: "listProductionAreas",
                attributes: ["id", "name", "stockAreaId"],
                through: {
                    attributes: [],
                },
                paranoid: false,
            },
            {
                model: Price,
                as: "onSalePrice",
                attributes: ["codeCurrency", "amount"],
            },
            {
                model: Variation,
                as: "variations",
                separate: true,
                include: [
                    {
                        model: Price,
                        as: "price",
                    },
                ],
            },
        ],
        transaction: childt,
    });

    //Saving result in cache
    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "storeProducts", tId),
        JSON.stringify(productsFound),
        {
            EX: getExpirationTime("storeProducts"),
        }
    );

    const productsStockFound = await StockAreaProduct.findAll({
        where: {
            productId: productsFound
                .filter(item => ["STOCK", "VARIATION"].includes(item.type))
                .map(item => item.id),
        },
        include: [
            {
                model: StockAreaVariation,
                include: [Variation],
            },
        ],
        transaction: childt,
    });

    //--> INIT BLOCK Resources
    const supplies = await Supply.findAll({
        where: {
            baseProductId: ids,
        },
    });
    const blockedProducts = Array.from(
        new Set([...ids, ...supplies.map(item => item.supplyId)])
    );

    await Product.findAll({
        where: {
            id: blockedProducts,
        },
        lock: true,
        transaction: childt,
    });
    await StockAreaProduct.findAll({
        where: {
            productId: blockedProducts,
        },
        lock: true,
        transaction: childt,
    });
    //--> END BLOCK Resources

    const configurations = await getBusinessConfigCache(initialData.businessId);

    const precission_after_coma = configurations.find(
        item => item.key === "precission_after_coma"
    )?.value;

    for (const product of productsReceived) {
        //Analyzing if where found
        const productDetails = productsFound.find(
            item => item.id === product.productId
        );

        if (!productDetails) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado.`,
            };
        }

        //Filling extra data
        const foundRemovedIndex = productsRemoved.findIndex(
            item => item.productId === product.productId
        );
        if (foundRemovedIndex !== -1) {
            productsRemoved[foundRemovedIndex].quantity += product.quantity;
        } else {
            productsRemoved.push({
                productId: product.productId,
                quantity: product.quantity,
            });
        }

        //General validations
        //Defining stockProductionAreaId
        let stockProductionAreaId: number = initialData.stockAreaId;
        if (["MENU", "ADDON", "SERVICE"].includes(productDetails.type)) {
            if (
                productDetails.listProductionAreas &&
                productDetails.listProductionAreas.length !== 0
            ) {
                if (productDetails.listProductionAreas.length === 1) {
                    stockProductionAreaId =
                        productDetails.listProductionAreas[0].stockAreaId;
                } else {
                    const found = productDetails.listProductionAreas.find(
                        element => element.id === product.productionAreaId
                    );

                    if (found) {
                        stockProductionAreaId = found.stockAreaId;
                    }
                }
            }
        }

        //Updating quantities in Central STOCK is stock Limit is defined
        if (productDetails.stockLimit) {
            const found_quantity = productUpdates.find(
                item => item.id === productDetails.id
            );

            if (found_quantity) {
                productUpdates = productUpdates.map(item => {
                    if (item.id === productDetails.id) {
                        return {
                            ...item,
                            totalQuantity: mathOperation(
                                item.totalQuantity,
                                product.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        };
                    }
                    return item;
                });
            } else {
                productUpdates.push({
                    id: productDetails.id,
                    totalQuantity: mathOperation(
                        productDetails.totalQuantity,
                        product.quantity,
                        "addition",
                        precission_after_coma
                    ),
                });
            }
        }

        switch (productDetails.type) {
            case "MENU":
            case "ADDON":
            case "SERVICE": {
                //Analyzing if addons are present
                if (product.addons && product.addons?.length !== 0) {
                    for (const addon of product.addons) {
                        const addonFoundDetails =
                            productDetails.availableAddons?.find(
                                item => item.id === addon.id
                            );

                        if (!addonFoundDetails) {
                            return {
                                status: 404,
                                message: `El agrego con id ${addon.id} no está disponible para el producto ${productDetails.name}.`,
                            };
                        }

                        //Updating quantities in Central STOCK if stock limit is defined
                        if (addonFoundDetails.stockLimit) {
                            const found_quantity = productUpdates.find(
                                item => item.id === addonFoundDetails.id
                            );

                            if (found_quantity) {
                                productUpdates = productUpdates.map(item => {
                                    if (item.id === addonFoundDetails.id) {
                                        return {
                                            ...item,
                                            totalQuantity: mathOperation(
                                                item.totalQuantity,
                                                addon.quantity,
                                                "addition",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                            } else {
                                productUpdates.push({
                                    id: addonFoundDetails.id,
                                    totalQuantity: mathOperation(
                                        addonFoundDetails.totalQuantity,
                                        addon.quantity,
                                        "addition",
                                        precission_after_coma
                                    ),
                                });
                            }
                        }

                        //Analyzing if addons has supplies and processing quantities - (Preparation Area)
                        if (addonFoundDetails.supplies.length !== 0) {
                            for (const supply of addonFoundDetails.supplies) {
                                //Updating quantities in Central STOCK
                                const found_quantity = productUpdates.find(
                                    item => item.id === supply.supplyId
                                );

                                if (found_quantity) {
                                    productUpdates = productUpdates.map(
                                        item => {
                                            if (item.id === supply.supplyId) {
                                                return {
                                                    ...item,
                                                    totalQuantity:
                                                        mathOperation(
                                                            item.totalQuantity,
                                                            supply.quantity *
                                                                addon.quantity,
                                                            "addition",
                                                            precission_after_coma
                                                        ),
                                                };
                                            }
                                            return item;
                                        }
                                    );
                                } else {
                                    productUpdates.push({
                                        id: supply.supplyId,
                                        totalQuantity: mathOperation(
                                            supply.supply.totalQuantity,
                                            supply.quantity * addon.quantity,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    });
                                }

                                if (!initialData.isAtSameEconomicCycle) {
                                    bulkStockMovements.push({
                                        quantity:
                                            supply.quantity * addon.quantity,
                                        productId: supply.supplyId,

                                        //Managed values
                                        businessId: initialData.businessId,
                                        movedById: initialData.userId,
                                        areaId: stockProductionAreaId,
                                        operation: "ENTRY",
                                        costBeforeOperation:
                                            supply.supply.averageCost,
                                        description: `Entrada a partir de modificación de orden generada en ciclos económicos ya cerrados.`,
                                    });
                                }

                                //Updating quantities in Central STOCK (StockAreaProduct Table)
                                const found =
                                    supply.supply.stockAreaProducts?.find(
                                        item =>
                                            item.areaId ===
                                                stockProductionAreaId &&
                                            item.productId === supply.supplyId
                                    );

                                if (found) {
                                    //There is disponibility
                                    const found_quantity =
                                        productStockAreaUpdates.find(
                                            item => item.id === found.id
                                        );

                                    if (found_quantity) {
                                        productStockAreaUpdates =
                                            productStockAreaUpdates.map(
                                                item => {
                                                    if (item.id === found.id) {
                                                        return {
                                                            ...item,
                                                            quantity:
                                                                mathOperation(
                                                                    item.quantity,
                                                                    supply.quantity *
                                                                        addon.quantity,
                                                                    "addition",
                                                                    precission_after_coma
                                                                ),
                                                        };
                                                    }
                                                    return item;
                                                }
                                            );
                                    } else {
                                        productStockAreaUpdates.push({
                                            id: found.id,
                                            quantity: mathOperation(
                                                found.quantity,
                                                supply.quantity *
                                                    addon.quantity,
                                                "addition",
                                                precission_after_coma
                                            ),
                                        });
                                    }
                                } else {
                                    // No disponibility (creating StockAreaProducts)
                                    const new_found_stock =
                                        newStockAreaProducts.find(
                                            item =>
                                                item.productId ===
                                                supply.supplyId
                                        );

                                    if (new_found_stock) {
                                        newStockAreaProducts =
                                            newStockAreaProducts.map(item => {
                                                if (
                                                    item.productId ===
                                                    supply.supplyId
                                                ) {
                                                    return {
                                                        ...item,
                                                        quantity: mathOperation(
                                                            item.quantity,
                                                            supply.quantity *
                                                                addon.quantity,
                                                            "addition",
                                                            precission_after_coma
                                                        ),
                                                    };
                                                }
                                                return item;
                                            });
                                    } else {
                                        newStockAreaProducts.push({
                                            productId: supply.supplyId,
                                            areaId: stockProductionAreaId,
                                            type: supply.supply.type,
                                            quantity: mathOperation(
                                                supply.quantity,
                                                addon.quantity,
                                                "multiplication",
                                                precission_after_coma
                                            ),
                                            variations: [],
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                //Analyzing Supplies Products and updating quantities (Preparation Area)
                if (productDetails.supplies.length !== 0) {
                    for (const supply of productDetails.supplies) {
                        //Updating quantities in Central STOCK
                        const found_quantity = productUpdates.find(
                            item => item.id === supply.supplyId
                        );

                        if (found_quantity) {
                            productUpdates = productUpdates.map(item => {
                                if (item.id === supply.supplyId) {
                                    return {
                                        ...item,
                                        totalQuantity: mathOperation(
                                            item.totalQuantity,
                                            supply.quantity * product.quantity,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            });
                        } else {
                            productUpdates.push({
                                id: supply.supplyId,
                                totalQuantity: mathOperation(
                                    supply.supply.totalQuantity,
                                    supply.quantity * product.quantity,
                                    "addition",
                                    precission_after_coma
                                ),
                            });
                        }

                        if (!initialData.isAtSameEconomicCycle) {
                            bulkStockMovements.push({
                                quantity: supply.quantity * product.quantity,
                                productId: supply.supplyId,

                                //Managed values
                                businessId: initialData.businessId,
                                movedById: initialData.userId,
                                areaId: stockProductionAreaId,
                                operation: "ENTRY",
                                costBeforeOperation: supply.supply.averageCost,
                                description: `Entrada a partir de modificación de orden generada en ciclos económicos ya cerrados.`,
                            });
                        }

                        //Updating quantities in Central STOCK (StockAreaProduct Table)
                        const found = supply.supply.stockAreaProducts?.find(
                            item =>
                                item.areaId === stockProductionAreaId &&
                                item.productId === supply.supplyId
                        );

                        if (found) {
                            //There is disponibility
                            const found_quantity = productStockAreaUpdates.find(
                                item => item.id === found.id
                            );
                            if (found_quantity) {
                                productStockAreaUpdates =
                                    productStockAreaUpdates.map(item => {
                                        if (item.id === found.id) {
                                            return {
                                                ...item,
                                                quantity: mathOperation(
                                                    item.quantity,
                                                    supply.quantity *
                                                        product.quantity,
                                                    "addition",
                                                    precission_after_coma
                                                ),
                                            };
                                        }
                                        return item;
                                    });
                            } else {
                                productStockAreaUpdates.push({
                                    id: found.id,
                                    quantity: mathOperation(
                                        found.quantity,
                                        supply.quantity * product.quantity,
                                        "addition",
                                        precission_after_coma
                                    ),
                                });
                            }
                        } else {
                            // No disponibility (creating StockAreaProducts)
                            const new_found_stock = newStockAreaProducts.find(
                                item => item.productId === supply.supplyId
                            );

                            if (new_found_stock) {
                                newStockAreaProducts = newStockAreaProducts.map(
                                    item => {
                                        if (
                                            item.productId === supply.supplyId
                                        ) {
                                            return {
                                                ...item,
                                                quantity: mathOperation(
                                                    item.quantity,
                                                    supply.quantity *
                                                        product.quantity,
                                                    "addition",
                                                    precission_after_coma
                                                ),
                                            };
                                        }
                                        return item;
                                    }
                                );
                            } else {
                                newStockAreaProducts.push({
                                    productId: supply.supplyId,
                                    areaId: stockProductionAreaId,
                                    type: supply.supply.type,
                                    quantity: mathOperation(
                                        supply.quantity,
                                        product.quantity,
                                        "multiplication",
                                        precission_after_coma
                                    ),
                                    variations: [],
                                });
                            }
                        }
                    }
                }
                break;
            }

            case "STOCK":
            case "VARIATION": {
                const stockProductDetails = productsStockFound.find(
                    item =>
                        item.productId === product.productId &&
                        item.areaId === initialData.stockAreaId
                );

                if (!initialData.isAtSameEconomicCycle) {
                    bulkStockMovements.push({
                        quantity: product.quantity,
                        productId: product.productId,
                        variationId: product.variationId,

                        //Managed values
                        businessId: initialData.businessId,
                        movedById: initialData.userId,
                        areaId: initialData.stockAreaId,
                        operation: "ENTRY",
                        costBeforeOperation: productDetails.averageCost,
                        description: `Entrada a partir de modificación de orden generada en ciclos económicos ya cerrados.`,
                    });
                }

                if (stockProductDetails) {
                    //Exist product
                    //Updating quantities in StockAreaProduct Table
                    const found_quantity_area = productStockAreaUpdates.find(
                        item => item.id === stockProductDetails.id
                    );
                    if (found_quantity_area) {
                        productStockAreaUpdates = productStockAreaUpdates.map(
                            item => {
                                if (item.id === stockProductDetails.id) {
                                    return {
                                        ...item,
                                        quantity: mathOperation(
                                            item.quantity,
                                            product.quantity,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        productStockAreaUpdates.push({
                            id: stockProductDetails.id,
                            quantity: mathOperation(
                                stockProductDetails.quantity,
                                product.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    }

                    //Analyzing Variation
                    if (productDetails.type === "VARIATION") {
                        if (!product.variationId) {
                            return {
                                status: 404,
                                message: `No se recibió la variación del producto ${productDetails.name}.`,
                            };
                        }

                        const foundVariation =
                            stockProductDetails.variations.find(
                                item => item.variationId === product.variationId
                            );

                        if (foundVariation) {
                            //Updating quantity in variations
                            const found_variation_quantity =
                                productVariationStockAreaUpdates.find(
                                    item => item.id === foundVariation.id
                                );

                            if (found_variation_quantity) {
                                productVariationStockAreaUpdates =
                                    productVariationStockAreaUpdates.map(
                                        item => {
                                            if (item.id === foundVariation.id) {
                                                return {
                                                    ...item,
                                                    quantity: mathOperation(
                                                        item.quantity,
                                                        product.quantity,
                                                        "addition",
                                                        precission_after_coma
                                                    ),
                                                };
                                            }
                                            return item;
                                        }
                                    );
                            } else {
                                productVariationStockAreaUpdates.push({
                                    id: foundVariation.id,
                                    quantity: mathOperation(
                                        foundVariation.quantity,
                                        product.quantity,
                                        "addition",
                                        precission_after_coma
                                    ),
                                });
                            }
                        } else {
                            //No exist variation, creating StockAreaVariation

                            const new_found_variation_stock =
                                newStockVariationAreaProducts.find(
                                    item =>
                                        item.stockAreaProductId ===
                                        stockProductDetails.id
                                );

                            if (new_found_variation_stock) {
                                newStockVariationAreaProducts =
                                    newStockVariationAreaProducts.map(item => {
                                        if (
                                            item.stockAreaProductId ===
                                            stockProductDetails.id
                                        ) {
                                            return {
                                                ...item,
                                                quantity: mathOperation(
                                                    item.quantity,
                                                    product.quantity,
                                                    "addition",
                                                    precission_after_coma
                                                ),
                                            };
                                        }
                                        return item;
                                    });
                            } else {
                                newStockVariationAreaProducts.push({
                                    stockAreaProductId: stockProductDetails.id,
                                    quantity: product.quantity,
                                    variationId: product.variationId,
                                });
                            }
                        }
                    }
                } else {
                    // No exist (creating StockAreaProducts)
                    const new_found_stock = newStockAreaProducts.find(
                        item => item.productId === productDetails.id
                    );

                    if (new_found_stock) {
                        newStockAreaProducts = newStockAreaProducts.map(
                            item => {
                                if (item.productId === productDetails.id) {
                                    return {
                                        ...item,
                                        quantity: mathOperation(
                                            item.quantity,
                                            product.quantity,
                                            "addition",
                                            precission_after_coma
                                        ),
                                    };
                                }
                                return item;
                            }
                        );
                    } else {
                        newStockAreaProducts.push({
                            productId: productDetails.id,
                            areaId: stockProductionAreaId,
                            type: productDetails.type,
                            quantity: product.quantity,
                            variations: [],
                        });
                    }

                    //Analyzing Variation
                    if (productDetails.type === "VARIATION") {
                        if (!product.variationId) {
                            return {
                                status: 404,
                                message: `No se recibió la variación del producto ${productDetails.name}.`,
                            };
                        }

                        //Updating quantity in variations
                        const foundStockIndex = newStockAreaProducts.findIndex(
                            item => item.productId === productDetails.id
                        );

                        if (foundStockIndex === -1) {
                            return {
                                status: 400,
                                message: `Se intentaba crear una variación sin su padre correspondiente.`,
                            };
                        }

                        const found_variation = newStockAreaProducts[
                            foundStockIndex
                        ].variations.find(
                            item => item.variationId === product.variationId
                        );

                        if (found_variation) {
                            newStockAreaProducts[foundStockIndex].variations =
                                newStockAreaProducts[
                                    foundStockIndex
                                ].variations.map(item => {
                                    if (
                                        item.variationId === product.variationId
                                    ) {
                                        return {
                                            ...item,
                                            quantity: mathOperation(
                                                item.quantity,
                                                product.quantity,
                                                "addition",
                                                precission_after_coma
                                            ),
                                        };
                                    }
                                    return item;
                                });
                        } else {
                            newStockAreaProducts[
                                foundStockIndex
                            ].variations.push({
                                variationId: product.variationId,
                                quantity: product.quantity,
                            });
                        }
                    }
                }

                break;
            }
        }
    }

    //Updating quantities in Central Stock
    if (productUpdates.length !== 0) {
        await Product.bulkCreate(productUpdates, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Updating quantities in Central Stock
    if (bulkStockMovements.length !== 0) {
        await StockMovement.bulkCreate(bulkStockMovements, {
            transaction: childt,
        });
    }

    //Updating quantities in Central Stock (StockAreaProduct Table)
    if (productStockAreaUpdates.length !== 0) {
        const to_delete = productStockAreaUpdates.filter(
            item => item.quantity === 0
        );

        const update = productStockAreaUpdates.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(update, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        //Deleting out StockAreaProducts
        if (to_delete.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: to_delete.map(item => item.id),
                },
                transaction: childt,
            });
        }
    }

    //Updating in stock area variation
    if (productVariationStockAreaUpdates.length !== 0) {
        const to_delete = productVariationStockAreaUpdates.filter(
            item => item.quantity === 0
        );

        const update = productVariationStockAreaUpdates.filter(
            item => item.quantity !== 0
        );

        await StockAreaVariation.bulkCreate(update, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        //Deleting out StockAreaVariation
        if (to_delete.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: to_delete.map(item => item.id),
                },
                transaction: childt,
            });
        }
    }

    //Creating new stock area products
    if (newStockAreaProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(newStockAreaProducts, {
            include: [{ model: StockAreaVariation, as: "variations" }],
            transaction: childt,
        });
    }

    if (newStockVariationAreaProducts.length !== 0) {
        await StockAreaVariation.bulkCreate(newStockVariationAreaProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
        data: {
            affectedProducts: blockedProducts,
            productsRemoved,
        },
    };
};

//Mode online dont support addons on products
export const registerSelledProductInOrder = async (
    initialData: {
        productsToSell: Array<ItemProductSelled>;
        stockAreaId: number;
        businessId: number;
        coupons?: Array<string>;
        origin: order_origin;
        posData?: {
            staticSelledProducts: any;
            salesById: number;
            updatedAt: string;
            prices: Array<OrderProductPrice>;
        };
        economicCycle?: EconomicCycle;
        areaSale?: Area;
        strict?: boolean;
        userId?: number;
        priceCodeCurrency?: string;
        // do not subtract product from the warehouse
        noRestore?: boolean;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    if (initialData.origin === "pos" && !initialData.posData) {
        return {
            status: 400,
            message: `No se recibió el el objeto estático`,
        };
    }

    //Analyzing cache for configurations
    const availableCurrencies = await getCurrenciesCache(
        initialData.businessId
    );

    const main_currency = availableCurrencies.find(item => item.isMain);
    if (!main_currency) {
        return {
            status: 404,
            message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
        };
    }

    //Analyzing cache for configurations
    const configurations = await getBusinessConfigCache(initialData.businessId);

    const priceSystems = configurations
        .find(item => item.key === "online_shop_price_system")
        ?.value.split(",");
    const enable_to_sale_in_negative =
        configurations.find(item => item.key === "enable_to_sale_in_negative")
            ?.value === "true";

    let result: InternalHelperResponse = {
        status: 400,
        message: "Ha ocurrido un error inesperado",
        data: null,
    };

    if (!initialData.noRestore) {
        result = await substractProductStockDisponibility(
            {
                products: initialData.productsToSell,
                stockAreaId: initialData.stockAreaId,
                businessId: initialData.businessId,
                strict: !enable_to_sale_in_negative,
            },
            childt
        );
        if (!internalCheckerResponse(result)) {
            return result;
        }
    } else {
        // send cache Product
        const ids = initialData.productsToSell.map(item => item.productId);

        const productsFound = await Product.findAll({
            where: { id: ids },
            include: [
                {
                    model: Product,
                    as: "availableAddons",
                    through: {
                        attributes: [],
                    },
                    include: [
                        {
                            model: ProductPrice,
                            attributes: [
                                "id",
                                "price",
                                "codeCurrency",
                                "isMain",
                                "priceSystemId",
                            ],
                        },
                        {
                            model: Supply,
                            as: "supplies",
                            include: [
                                {
                                    model: Product,
                                    as: "supply",
                                    include: [StockAreaProduct],
                                },
                            ],
                            required: false,
                        },
                        {
                            model: Price,
                            as: "onSalePrice",
                            attributes: ["codeCurrency", "amount"],
                        },
                    ],
                },
                SalesCategory,
                {
                    model: ProductPrice,
                    attributes: [
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                    ],
                },
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            as: "supply",
                            include: [StockAreaProduct],
                        },
                    ],
                    required: false,
                },
                {
                    model: StockAreaProduct,
                    include: [StockAreaVariation],
                },
                {
                    model: Area,
                    as: "listProductionAreas",
                    attributes: ["id", "name", "stockAreaId"],
                    through: {
                        attributes: [],
                    },
                    paranoid: false,
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
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Variation,
                    as: "variations",
                    separate: true,
                    include: [
                        {
                            model: Price,
                            as: "price",
                        },
                    ],
                },
            ],
            transaction: childt,
        });

        await redisClient.set(
            getEphimeralTermKey(initialData.businessId, "storeProducts", tId),
            JSON.stringify(productsFound),
            {
                EX: getExpirationTime("storeProducts"),
            }
        );
    }

    //Generals
    let addBulkSelledProduct: Array<any> = [];
    let listProductsToRecord = [];
    let generalTotalCost = 0;

    const productsFound = await getStoreProductsCache(
        initialData.businessId,
        tId
    );

    //configs the area
    const enforceCurrencyArea = initialData?.areaSale?.enforceCurrency;
    const availableCodeCurrencyArea =
        initialData.areaSale?.availableCodeCurrency;

    //Obtaining all variations
    const idsVariations = initialData.productsToSell
        .filter(item => item.variationId)
        .map(item => item.variationId);

    let foundVariations: Array<Variation> = [];
    if (idsVariations.length !== 0) {
        foundVariations = await Variation.findAll({
            where: {
                id: idsVariations,
            },
        });
    }

    const idsResources = initialData.productsToSell.map(
        item => item.resourceId
    );
    const foundResources = await Resource.findAll({
        where: {
            id: idsResources,
        },
    });

    for (const selledProduct of initialData.productsToSell) {
        //Analyzing if where found
        const productDetails = productsFound.find(
            item => item.id === selledProduct.productId
        );

        if (!productDetails) {
            return {
                status: 404,
                message: `El producto con id ${selledProduct.productId} no fue encontrado.`,
            };
        }

        if (
            ![
                "MENU",
                "ADDON",
                "SERVICE",
                "COMBO",
                "STOCK",
                "VARIATION",
            ].includes(productDetails.type)
        ) {
            return {
                status: 400,
                message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
            };
        }

        //Generals
        let productionAreaId: number | undefined;
        if (
            productDetails.listProductionAreas &&
            productDetails.listProductionAreas.length !== 0
        ) {
            if (productDetails.listProductionAreas.length === 1) {
                productionAreaId = productDetails.listProductionAreas[0].id;
            } else {
                const found = productDetails.listProductionAreas.find(
                    element => element.id === selledProduct.productionAreaId
                );

                if (found) {
                    productionAreaId = found.id;
                }
            }
        }

        //Calculate itemCost
        let totalSelledCost = mathOperation(
            productDetails.averageCost,
            selledProduct.quantity,
            "multiplication",
            2
        );

        //If it is available, creating a virtual selledProduct
        let selled_product: any = {
            name: productDetails.name,
            measure: productDetails.measure,
            colorCategory:
                productDetails.salesCategory?.color || productDetails.color,
            quantity: selledProduct.quantity,
            productId: productDetails.id,
            type: productDetails.type,
            productionAreaId: productionAreaId,
            addons: [],
            variationId: selledProduct.variationId,
            supplierId: productDetails.supplierId,
            isReservation: selledProduct.isReservation,
            resourceId: selledProduct?.resourceId,
            observations: selledProduct?.observations,
        };

        if (productDetails.type === "VARIATION") {
            const variation = foundVariations.find(
                item => item.id === selledProduct.variationId
            );

            if (!variation) {
                return {
                    status: 404,
                    message: `La variación del producto ${productDetails.name} no fue encontrada.`,
                };
            }

            if (variation.imageId) {
                selled_product.imageId = variation.imageId;
            } else {
                selled_product.imageId = productDetails.images?.[0]?.id;
            }
        } else {
            selled_product.imageId = productDetails.images?.[0]?.id;
        }

        if (initialData.origin === "pos") {
            let foundStaticSelledProduct =
                initialData.posData?.staticSelledProducts.find(
                    (item: any) => item.productId === selledProduct.productId
                );

            if (selledProduct.variationId) {
                foundStaticSelledProduct =
                    initialData.posData?.staticSelledProducts.find(
                        (item: any) =>
                            item.productId === selledProduct.productId &&
                            item.variationId === selledProduct.variationId
                    );
            }

            if (!foundStaticSelledProduct) {
                return {
                    status: 404,
                    message: `El producto con id ${selledProduct.productId} no fue encontrado en los productos estáticos.`,
                };
            }

            //Analyzing if price is modified
            //Searching price
            let found = false;

            //1. Trying to find according currency
            const foundCommonCurrency = productDetails.prices.filter(
                item =>
                    item.codeCurrency ===
                    foundStaticSelledProduct.priceUnitary?.codeCurrency
            );

            if (
                foundCommonCurrency.some(
                    item =>
                        item.price ===
                        foundStaticSelledProduct.priceUnitary?.amount
                )
            ) {
                found = true;
            }

            //2.Trying to find according exchange rate
            if (foundCommonCurrency.length === 0) {
                for (const price of productDetails.prices) {
                    const convertion = exchangeCurrency(
                        {
                            amount: price.price,
                            codeCurrency: price.codeCurrency,
                        },
                        foundStaticSelledProduct.priceUnitary?.codeCurrency,
                        availableCurrencies || [],
                        3
                    );

                    //Taking into account that number must be calculate in ceil mode
                    const rounding = Number(convertion?.amount.toFixed(2));

                    if (
                        rounding ===
                        foundStaticSelledProduct.priceUnitary?.amount
                    ) {
                        found = true;
                        break;
                    }
                }
            }

            selled_product = {
                ...selled_product,
                economicCycleId: initialData.economicCycle?.id,
                priceUnitary: {
                    amount: foundStaticSelledProduct.priceUnitary.amount,
                    codeCurrency:
                        foundStaticSelledProduct.priceUnitary.codeCurrency,
                },
                priceTotal: {
                    amount: foundStaticSelledProduct.priceTotal.amount,
                    codeCurrency:
                        foundStaticSelledProduct.priceTotal.codeCurrency,
                },
                observations: foundStaticSelledProduct.observations,
                modifiedPrice: !found,
            };
        } else {
            //Obtaining price of product
            let itemPrice = obtainingProductPriceSystemPriceDefined(
                productDetails,
                selledProduct.variationId,
                priceSystems,
                initialData.priceCodeCurrency ??
                    selledProduct.priceUnitary?.codeCurrency,
                !!initialData.priceCodeCurrency //enforceCurrency
            );

            let modifiedPrice = false;
            if (!itemPrice) {
                return {
                    status: 404,
                    message: `El producto ${productDetails.name} no tiene un precio válido. Consulte al administrador.`,
                };
            }

            if (selledProduct.priceUnitary) {
                //Searching price
                let found = false;

                //1. Trying to find according currency
                const foundCommonCurrency = productDetails.prices.filter(
                    item =>
                        item.codeCurrency ===
                        selledProduct?.priceUnitary?.codeCurrency
                );

                if (
                    foundCommonCurrency.some(
                        item =>
                            item.price === selledProduct?.priceUnitary?.amount
                    )
                ) {
                    found = true;
                }

                //2.Trying to find according exchange rate
                if (foundCommonCurrency.length === 0) {
                    for (const price of productDetails.prices) {
                        const convertion = exchangeCurrency(
                            {
                                amount: price.price,
                                codeCurrency: price.codeCurrency,
                            },
                            selledProduct?.priceUnitary?.codeCurrency,
                            availableCurrencies || [],
                            3
                        );

                        //Taking into account that number must be calculate in ceil mode
                        const rounding = Number(convertion?.amount.toFixed(2));

                        if (rounding === selledProduct?.priceUnitary?.amount) {
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    modifiedPrice = true;
                    itemPrice.price = selledProduct.priceUnitary.amount;
                    itemPrice.codeCurrency =
                        selledProduct.priceUnitary.codeCurrency;
                }

                if (!found && !initialData?.areaSale?.allowManualPrice) {
                    return {
                        status: 404,
                        message: `El punto de venta no tiene habilitado modificar el precio del producto en una orden .`,
                    };
                }
            }

            if (
                enforceCurrencyArea &&
                availableCodeCurrencyArea !== itemPrice.codeCurrency
            ) {
                return {
                    status: 404,
                    message: `El punto de venta tiene restringidas todas las operaciones a la moneda ${availableCodeCurrencyArea}. Consulte al administrador.`,
                };
            }

            let totalSelledPrice = mathOperation(
                itemPrice.price,
                selledProduct.quantity,
                "multiplication",
                3
            );
            totalSelledPrice = truncateValue(totalSelledPrice, 2);

            selled_product = {
                ...selled_product,
                priceUnitary: {
                    amount: itemPrice.price,
                    codeCurrency: itemPrice.codeCurrency,
                },
                priceTotal: {
                    amount: totalSelledPrice,
                    codeCurrency: itemPrice.codeCurrency,
                },
                modifiedPrice,
            };
        }

        let addAddonsBulk: any = [];

        //Analizing if addons received
        if (selledProduct.addons && selledProduct.addons?.length !== 0) {
            if (!["MENU", "SERVICE"].includes(productDetails.type)) {
                return {
                    status: 400,
                    message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
                };
            }

            let listProductWithAddonToRecord = [];

            for (const addon of selledProduct.addons) {
                const addon_found = productDetails.availableAddons?.find(
                    item => item.id === addon.id
                );

                if (!addon_found) {
                    return {
                        status: 404,
                        message: `El agrego con id ${addon.id} ya no se encuentra disponible en el producto ${productDetails.name}.`,
                    };
                }

                //Calculate addon the cost
                totalSelledCost += addon_found.averageCost;

                listProductWithAddonToRecord.push(
                    `+(x${addon.quantity}) ${addon_found.name}`
                );

                //Obtaining price of product
                const addonPrice = obtainingProductPriceSystemPriceDefined(
                    addon_found,
                    undefined,
                    initialData.economicCycle?.priceSystemId,
                    initialData.priceCodeCurrency
                );
                if (!addonPrice) {
                    return {
                        status: 400,
                        message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consule al propietario de negocio.`,
                    };
                }

                addAddonsBulk.push({
                    productId: addon.id,
                    quantity: addon.quantity,
                    price: {
                        amount: addonPrice.price,
                        codeCurrency: addonPrice.codeCurrency,
                    },
                    name: addon_found.name,
                });
            }

            listProductsToRecord.push(
                `(x${selledProduct.quantity}) ${
                    productDetails.name
                } ${listProductWithAddonToRecord.join(", ")}`
            );
        } else {
            //If not addons
            listProductsToRecord.push(
                `(x${selledProduct.quantity}) ${productDetails.name}`
            );
        }

        if (
            ["MENU", "ADDON", "SERVICE", "COMBO"].includes(productDetails.type)
        ) {
            selled_product.status = "RECEIVED";
            selled_product.startDateAt = selledProduct.startDateAt;
            selled_product.endDateAt = selledProduct.endDateAt;
            selled_product.numberAdults = selledProduct.numberAdults;
            selled_product.numberKids = selledProduct.numberKids;
            selled_product.isReservation = selledProduct.isReservation;
            selled_product.colorCategory = productDetails.color;
        } else {
            selled_product.status = "COMPLETED";
            selled_product.areaId = initialData.stockAreaId;
        }

        //Adding selled product to the virtual store for creating at the end and updating total price
        addBulkSelledProduct.push({
            ...selled_product,
            totalCost: totalSelledCost,
            addons: addAddonsBulk,
        });

        generalTotalCost += totalSelledCost;
    }

    let orderTemplate = await getOrderFromCacheTransaction(
        initialData.businessId,
        tId
    );
    if (!orderTemplate) {
        return {
            status: 404,
            message: `La orden no fue encontrada en la caché del servidor.`,
        };
    }

    let prices = orderTemplate.prices;

    //Fullfilling prices if origin is online
    if (initialData.origin !== "pos") {
        let localPrices: any = [];
        addBulkSelledProduct.forEach(selledProduct => {
            const foundIndex = localPrices.findIndex(
                (item: any) =>
                    item.codeCurrency === selledProduct.priceTotal.codeCurrency
            );

            if (foundIndex !== -1) {
                localPrices[foundIndex].price = mathOperation(
                    localPrices[foundIndex].price,
                    selledProduct.priceTotal.amount,
                    "addition",
                    2
                );
            } else {
                localPrices.push({
                    price: selledProduct.priceTotal.amount,
                    codeCurrency: selledProduct.priceTotal.codeCurrency,
                });
            }
        });

        prices = localPrices;
    }

    const hasModifiedPrices = addBulkSelledProduct.some(
        item => item.modifiedPrice
    );

    const nextOrderTemplate = {
        ...orderTemplate,
        prices,
        selledProducts: addBulkSelledProduct,
        totalCost: generalTotalCost,
        modifiedPrice: hasModifiedPrices,
    };

    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "order", tId),
        JSON.stringify(nextOrderTemplate),
        {
            EX: getExpirationTime("order"),
        }
    );

    const listRecordsCache: Array<Partial<OrderReceiptRecord>> =
        await getOrderRecordsCache(initialData.businessId, tId);

    listRecordsCache.unshift({
        action: "PRODUCT_ADDED",
        title: getTitleOrderRecord("PRODUCT_ADDED"),
        details: listProductsToRecord.join(";"),
        madeById: initialData.posData?.salesById!,
        createdAt: initialData.posData?.updatedAt,
    });

    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "records", tId),
        JSON.stringify(listRecordsCache),
        {
            EX: getExpirationTime("records"),
        }
    );

    return {
        status: 200,
        data: {
            selledProductsCreated: addBulkSelledProduct,
            ...result?.data,
        },
    };
};

export const payOrderProcessator = async (
    initialData: {
        businessId: number;
        shippingPrice?: SimplePrice;
        userId?: number;
        origin: "pos" | "online" | "admin";
        onlineData?: {
            currenciesPayment?: CurrencyPaymentReduced[];
            amountReturned?: Price;
            includeInArea?: boolean;
            paidAt?: Date | string;
        };
        posData?: {
            closedDate: string;
            salesById: number;
            updatedAt: string;
            currenciesPayment: CurrencyPaymentReduced[];
            amountReturned: Price;
            shippingPrice: Price;
            tipPrice: ExtendedPrice;
            discount: number;
            commission: number;
            houseCosted: boolean;
            observations: string;
            name: string;
            isReferenceCurrencyActive?: boolean;
            referenceCurrencyActive?: string;
            selledProducts?: Array<SelledProduct>;
        };
        economicCycle?: EconomicCycle;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    if (initialData.origin === "pos" && !initialData.posData) {
        return {
            status: 400,
            message: `No se recibió el objeto estático`,
        };
    }

    //@ts-ignore
    const tId = childt.id;

    let orderTemplate = await getOrderFromCacheTransaction(
        initialData.businessId,
        tId
    );

    if (!orderTemplate) {
        return {
            status: 404,
            message: `Order not found or not available`,
        };
    }

    // --> BLOCKED Order
    if (orderTemplate.id) {
        await OrderReceipt.findByPk(orderTemplate.id, {
            lock: true,
            transaction: childt,
        });

        //Populating order
        //@ts-ignore
        orderTemplate = await OrderReceipt.findByPk(orderTemplate.id, {
            include: [
                OrderReceiptPrice,
                {
                    model: SelledProduct,
                    include: [
                        { model: Price, as: "priceTotal" },
                        { model: Price, as: "priceUnitary" },
                        {
                            model: SelledProductAddon,
                            include: [Price],
                        },
                    ],
                },
                PaymentGateway,
                CurrencyPayment,
                CashRegisterOperation,
                OrderReceiptTotal,
                {
                    model: Price,
                    as: "shippingPrice",
                },
                {
                    model: Price,
                    as: "taxes",
                },
                {
                    model: Price,
                    as: "amountReturned",
                },
                {
                    model: Price,
                    as: "tipPrice",
                },
                {
                    model: Area,
                    as: "areaSales",
                },
                {
                    model: Resource,
                    as: "listResources",
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Price,
                    as: "couponDiscountPrice",
                    attributes: ["amount", "codeCurrency"],
                },
            ],
            transaction: childt,
        });

        if (!orderTemplate) {
            return {
                status: 404,
                message: `Order not found or not available`,
            };
        }
    }
    // --> END Block Order

    if (initialData.origin === "pos") {
        if (
            orderTemplate.status === "CANCELLED" ||
            orderTemplate.status === "BILLED" ||
            orderTemplate.status === "REFUNDED"
        ) {
            return {
                status: 400,
                message: `La orden ha sido cerrada y no puede ser modificada.`,
            };
        }

        if (orderTemplate.economicCycleId !== initialData.economicCycle?.id) {
            return {
                status: 400,
                message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
            };
        }

        if (!initialData.userId) {
            return {
                status: 400,
                message: `No se recibió ningún dato de usuario`,
            };
        }

        //Default parameters to set
        const closedAt = initialData.posData?.closedDate
            ? moment(initialData.posData?.closedDate).toDate()
            : moment().toDate();

        orderTemplate.closedDate = closedAt;
        orderTemplate.paidAt = closedAt;
        orderTemplate.salesById = initialData.posData?.salesById
            ? initialData.posData.salesById
            : initialData.userId;
        orderTemplate.houseCosted = initialData.posData?.houseCosted ?? false;

        if (initialData.posData?.observations) {
            orderTemplate.observations = initialData.posData.observations;
        }
        if (initialData.posData?.discount) {
            orderTemplate.discount = Number(initialData.posData.discount);
        } else {
            orderTemplate.discount = 0;
        }

        if (initialData.posData?.commission) {
            orderTemplate.commission = Number(initialData.posData.commission);
        } else {
            orderTemplate.commission = 0;
        }

        if (initialData.posData?.name) {
            orderTemplate.name = initialData.posData.name;
        }
    } else {
        //Online mode
        if (initialData.onlineData?.paidAt) {
            orderTemplate.paidAt = initialData.onlineData.paidAt as Date;
        } else {
            orderTemplate.paidAt = moment().toDate();
        }
    }

    const availableCurrencies = await getCurrenciesCache(
        initialData.businessId
    );

    const main_currency = availableCurrencies.find(item => item.isMain);
    if (!main_currency) {
        return {
            status: 404,
            message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
        };
    }

    let listRecords: any = [];
    //Setting total cost
    const totalCost =
        orderTemplate.selledProducts?.reduce(
            (total, item) => (total += item.totalCost),
            0
        ) || 0;
    orderTemplate.totalCost = mathOperation(totalCost, 0, "addition", 2);

    const configurations = await getBusinessConfigCache(initialData.businessId);

    const cash_operations_include_deliveries =
        configurations.find(
            item => item.key === "cash_operations_include_deliveries"
        )?.value === "true";

    const cash_operations_include_tips = configurations.find(
        item => item.key === "cash_operations_include_tips"
    )?.value;

    //Checking and destroying if orderreceipt payment records exist
    if (orderTemplate.currenciesPayment.length !== 0) {
        await CurrencyPayment.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    if (orderTemplate.cashRegisterOperations.length !== 0) {
        await CashRegisterOperation.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    //General
    let addBulkCurrencies: any = [];
    let bulkOperations: any = [];
    const allowedPaymentWays = ["CASH", "TRANSFER", "CARD", "CREDIT_POINTS"];

    let realPayReceived: Array<SimplePrice> = [];
    let totalToPay: Array<SimplePrice> = [];

    if (initialData.origin === "pos") {
        //Checking if must be changed the sales currency when order was previously openned
        if (
            initialData.posData?.isReferenceCurrencyActive &&
            orderTemplate.id
        ) {
            let bulkPricesUpdated: Array<any> = [];
            let nextSelledProducts: Array<any> = [];
            orderTemplate.selledProducts?.forEach(item => {
                const found = initialData.posData?.selledProducts?.find(
                    selled => selled.id === item.id
                );

                if (found) {
                    bulkPricesUpdated.push(
                        {
                            id: item.priceTotalId,
                            amount: found.priceTotal.amount,
                            codeCurrency: found.priceTotal.codeCurrency,
                        },
                        {
                            id: item.priceUnitaryId,
                            amount: found.priceUnitary.amount,
                            codeCurrency: found.priceUnitary.codeCurrency,
                        }
                    );

                    nextSelledProducts.push({
                        ...item,
                        priceTotal: found.priceTotal,
                        priceUnitary: found.priceUnitary,
                    });
                }
            });

            if (bulkPricesUpdated.length !== 0) {
                await Price.bulkCreate(bulkPricesUpdated, {
                    updateOnDuplicate: ["amount", "codeCurrency"],
                    transaction: childt,
                });
            }

            //Updating local data object
            orderTemplate.selledProducts = nextSelledProducts;
        }

        //Transforming all the currencies that is not found in prices,  make cash operation and register payment
        for (const registerPay of initialData.posData?.currenciesPayment ||
            []) {
            //Analyzing if paymentWay is set
            if (!allowedPaymentWays.includes(registerPay.paymentWay)) {
                return {
                    status: 400,
                    message: `${registerPay.paymentWay} is not an allowed type. Fields allowed: ${allowedPaymentWays}`,
                };
            }

            //Registering payment
            addBulkCurrencies.push({
                amount: registerPay.amount,
                codeCurrency: registerPay.codeCurrency,
                orderReceiptId: orderTemplate.id,
                paymentWay: registerPay.paymentWay,
            });

            //For checking if the amount received is legal
            const found = realPayReceived.find(
                item => item.codeCurrency === registerPay.codeCurrency
            );
            if (found) {
                realPayReceived = realPayReceived.map(item => {
                    if (item.codeCurrency === registerPay.codeCurrency) {
                        return {
                            ...item,
                            amount: mathOperation(
                                item.amount,
                                registerPay.amount,
                                "addition",
                                2
                            ),
                        };
                    }
                    return item;
                });
            } else {
                realPayReceived.push({
                    amount: registerPay.amount,
                    codeCurrency: registerPay.codeCurrency,
                });
            }

            if (registerPay.paymentWay === "CASH") {
                bulkOperations.push({
                    operation: "DEPOSIT_SALE",
                    amount: registerPay.amount,
                    codeCurrency: registerPay.codeCurrency,
                    orderReceiptId: orderTemplate.id,
                    type: "debit",
                    economicCycleId: initialData.economicCycle?.id,
                    areaId: orderTemplate.areaSalesId,
                    madeById: initialData.posData?.salesById,
                    createdAt: initialData.posData?.updatedAt,
                });
            }
        }

        //Obtaining if default currency is defined
        const areaSales = orderTemplate.areaSales;
        let defaultCurrency = main_currency.currency.code;

        if (areaSales && areaSales.defaultPaymentCurrency) {
            defaultCurrency = areaSales.defaultPaymentCurrency;
        }

        //Analyzing if amount provided is enough
        if (
            initialData.posData?.amountReturned &&
            initialData.posData.amountReturned.amount > 0
        ) {
            //Processing to real received to pay
            const found = realPayReceived.find(
                item =>
                    item.codeCurrency ===
                    initialData.posData?.amountReturned.codeCurrency
            );
            if (found) {
                realPayReceived = realPayReceived.map(item => {
                    if (
                        item.codeCurrency ===
                        initialData.posData?.amountReturned.codeCurrency
                    ) {
                        return {
                            ...item,
                            amount: mathOperation(
                                item.amount,
                                initialData.posData?.amountReturned?.amount,
                                "subtraction",
                                2
                            ),
                        };
                    }
                    return item;
                });
            } else {
                realPayReceived.push({
                    amount: initialData.posData?.amountReturned?.amount * -1,
                    codeCurrency:
                        initialData.posData?.amountReturned.codeCurrency,
                });
            }

            bulkOperations.push({
                operation: "WITHDRAW_SALE",
                amount: initialData.posData?.amountReturned?.amount * -1,
                codeCurrency: initialData.posData?.amountReturned.codeCurrency,

                orderReceiptId: orderTemplate.id,
                type: "credit",
                economicCycleId: initialData.economicCycle?.id,
                areaId: orderTemplate.areaSalesId,
                madeById: initialData.posData?.salesById,
                createdAt: initialData.posData?.updatedAt,
            });

            if (orderTemplate.amountReturned) {
                orderTemplate.amountReturned.amount =
                    initialData.posData.amountReturned.amount;
                await orderTemplate.amountReturned.save({
                    transaction: childt,
                });
            } else {
                if (orderTemplate.id) {
                    const new_price = Price.build({
                        amount: initialData.posData.amountReturned.amount,
                        codeCurrency: defaultCurrency,
                    });
                    await new_price.save({ transaction: childt });
                    orderTemplate.amountReturnedId = new_price.id;
                }

                //@ts-ignore
                orderTemplate.amountReturned = {
                    amount: initialData.posData.amountReturned.amount,
                    codeCurrency: defaultCurrency,
                };
            }
        }

        //Checking control amountReturned
        if (
            orderTemplate.id &&
            orderTemplate.amountReturned &&
            initialData.posData?.amountReturned &&
            initialData.posData.amountReturned.amount === 0
        ) {
            await orderTemplate.amountReturned.destroy({ transaction: childt });
        }

        //Tip price
        if (initialData.posData?.tipPrice) {
            if (
                cash_operations_include_tips === "true" &&
                initialData.posData.tipPrice.paymentWay === "CASH"
            ) {
                bulkOperations.push({
                    operation: "DEPOSIT_TIP",
                    amount: initialData.posData.tipPrice.amount,
                    codeCurrency: initialData.posData.tipPrice.codeCurrency,
                    orderReceiptId: orderTemplate.id,
                    type: "debit",
                    economicCycleId: initialData.economicCycle?.id,
                    areaId: orderTemplate.areaSalesId,
                    madeById: initialData.posData?.salesById,
                    createdAt: initialData.posData?.updatedAt,
                });
            }

            if (orderTemplate.tipPrice) {
                orderTemplate.tipPrice.amount =
                    initialData.posData.tipPrice.amount;
                orderTemplate.tipPrice.codeCurrency =
                    initialData.posData.tipPrice.codeCurrency;
                orderTemplate.tipPrice.paymentWay =
                    initialData.posData.tipPrice.paymentWay;
                await orderTemplate.tipPrice.save({ transaction: childt });
            } else {
                if (orderTemplate.id) {
                    const new_price = Price.build({
                        amount: initialData.posData.tipPrice.amount,
                        codeCurrency: initialData.posData.tipPrice.codeCurrency,
                        paymentWay: initialData.posData.tipPrice.paymentWay,
                    });

                    await new_price.save({ transaction: childt });
                    orderTemplate.tipPriceId = new_price.id;
                }

                //@ts-ignore
                orderTemplate.tipPrice = {
                    amount: initialData.posData.tipPrice.amount,
                    codeCurrency: initialData.posData.tipPrice.codeCurrency,
                    paymentWay: initialData.posData.tipPrice.paymentWay,
                };
            }
        }

        //Checking control tipPrice
        if (
            orderTemplate.id &&
            orderTemplate.tipPrice &&
            initialData.posData?.tipPrice &&
            initialData.posData?.tipPrice.amount === 0
        ) {
            await orderTemplate.tipPrice.destroy({ transaction: childt });
        }

        //Checking shippingPrice
        if (initialData.posData?.shippingPrice) {
            if (orderTemplate.shippingPrice) {
                orderTemplate.shippingPrice.amount =
                    initialData.posData.shippingPrice.amount;
                orderTemplate.shippingPrice.paymentWay =
                    initialData.posData.shippingPrice.paymentWay;
                orderTemplate.shippingPrice.codeCurrency =
                    initialData.posData.shippingPrice.codeCurrency;
                await orderTemplate.shippingPrice.save({ transaction: childt });
            } else {
                if (orderTemplate.id) {
                    const new_price = Price.build({
                        amount: initialData.posData.shippingPrice.amount,
                        codeCurrency:
                            initialData.posData.shippingPrice.codeCurrency,
                        paymentWay:
                            initialData.posData.shippingPrice.paymentWay,
                    });
                    await new_price.save({ transaction: childt });
                    orderTemplate.shippingPriceId = new_price.id;
                }

                //@ts-ignore
                orderTemplate.shippingPrice = {
                    amount: initialData.posData.shippingPrice.amount,
                    codeCurrency:
                        initialData.posData.shippingPrice.codeCurrency,
                    paymentWay: initialData.posData.shippingPrice.paymentWay,
                };
            }

            if (
                (!cash_operations_include_deliveries &&
                    orderTemplate.shippingPrice?.paymentWay === "CASH") ||
                orderTemplate.shippingPrice?.paymentWay !== "CASH"
            ) {
                bulkOperations.push({
                    operation: "WITHDRAW_SHIPPING_PRICE",
                    amount: initialData.posData?.shippingPrice?.amount * -1,
                    codeCurrency:
                        initialData.posData?.shippingPrice.codeCurrency,

                    orderReceiptId: orderTemplate.id,
                    type: "credit",
                    economicCycleId: initialData.economicCycle?.id,
                    areaId: orderTemplate.areaSalesId,
                    madeById: initialData.posData?.salesById,
                    createdAt: initialData.posData?.updatedAt,
                });
            }
        } else {
            if (orderTemplate.id && orderTemplate.shippingPrice) {
                await orderTemplate.shippingPrice.destroy({
                    transaction: childt,
                });
            }
        }

        if (orderTemplate.id) {
            await orderTemplate.save({ transaction: childt });
        }

        //Registering actions
        listRecords.unshift({
            action: "ORDER_BILLED",
            title: getTitleOrderRecord("ORDER_BILLED"),
            details: `Facturada en punto de venta: ${orderTemplate.areaSales?.name}.`,
            madeById: initialData.posData?.salesById,
            createdAt: initialData.posData?.updatedAt,
            isPublic: true,
        });

        //Updating used resources
        if (
            orderTemplate.id &&
            orderTemplate.listResources &&
            orderTemplate.listResources.length !== 0
        ) {
            await Resource.update(
                {
                    isAvailable: true,
                },
                {
                    where: {
                        id: orderTemplate.listResources.map(item => item.id),
                    },
                    transaction: childt,
                }
            );
        }

        await redisClient.set(
            getEphimeralTermKey(initialData.businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        //Setting totals - At the end of pos in order to include the shippingPrice
        const result_totals = await calculateOrderTotal(
            initialData.businessId,
            childt
        );

        if (!internalCheckerResponse(result_totals)) {
            return result_totals;
        }

        totalToPay = result_totals.data.totalToPay;
    } else {
        //Setting totals - At the begining because is online
        const result_totals = await calculateOrderTotal(
            initialData.businessId,
            childt
        );

        if (!internalCheckerResponse(result_totals)) {
            return result_totals;
        }

        totalToPay = result_totals.data.totalToPay;

        if (initialData.onlineData?.currenciesPayment) {
            for (const payment of initialData.onlineData?.currenciesPayment) {
                //Analyzing if paymentWay is set
                if (!allowedPaymentWays.includes(payment.paymentWay)) {
                    return {
                        status: 400,
                        message: `${payment.paymentWay} is not an allowed type. Fields allowed: ${allowedPaymentWays}`,
                    };
                }

                //Registering payment
                addBulkCurrencies.push({
                    amount: payment.amount,
                    codeCurrency: payment.codeCurrency,
                    orderReceiptId: orderTemplate.id,
                    paymentWay: payment.paymentWay,
                });

                //For checking if the amount received is legal
                const found = realPayReceived.find(
                    item => item.codeCurrency === payment.codeCurrency
                );
                if (found) {
                    realPayReceived = realPayReceived.map(item => {
                        if (item.codeCurrency === payment.codeCurrency) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    payment.amount,
                                    "addition",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    realPayReceived.push({
                        amount: payment.amount,
                        codeCurrency: payment.codeCurrency,
                    });
                }

                if (initialData.onlineData.includeInArea) {
                    if (payment.paymentWay === "CASH") {
                        bulkOperations.push({
                            operation: "DEPOSIT_SALE",
                            amount: payment.amount,
                            codeCurrency: payment.codeCurrency,
                            orderReceiptId: orderTemplate.id,
                            type: "debit",
                            economicCycleId: orderTemplate.economicCycleId,
                            areaId: orderTemplate.areaSalesId,
                            madeById: initialData.userId,
                        });
                    }
                }
            }

            //Analyzing if amount provided is enough
            if (
                initialData.onlineData?.amountReturned &&
                initialData.onlineData.amountReturned.amount > 0
            ) {
                //Processing to real received to pay
                const found = realPayReceived.find(
                    item =>
                        item.codeCurrency ===
                        initialData.posData?.amountReturned.codeCurrency
                );
                if (found) {
                    realPayReceived = realPayReceived.map(item => {
                        if (
                            item.codeCurrency ===
                            initialData.posData?.amountReturned.codeCurrency
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    initialData.posData?.amountReturned?.amount,
                                    "subtraction",
                                    2
                                ),
                            };
                        }
                        return item;
                    });
                } else {
                    realPayReceived.push({
                        amount:
                            initialData.onlineData?.amountReturned?.amount * -1,
                        codeCurrency:
                            initialData.onlineData?.amountReturned.codeCurrency,
                    });
                }

                bulkOperations.push({
                    operation: "WITHDRAW_SALE",
                    amount: initialData.onlineData?.amountReturned?.amount * -1,
                    codeCurrency:
                        initialData.onlineData?.amountReturned.codeCurrency,

                    orderReceiptId: orderTemplate.id,
                    type: "credit",
                    economicCycleId: orderTemplate.economicCycleId,
                    areaId: orderTemplate.areaSalesId,
                    madeById: initialData.userId,
                });

                if (orderTemplate.amountReturned) {
                    orderTemplate.amountReturned.amount =
                        initialData.onlineData.amountReturned.amount;
                    await orderTemplate.amountReturned.save({
                        transaction: childt,
                    });
                } else {
                    if (orderTemplate.id) {
                        const new_price = Price.build({
                            amount: initialData.onlineData.amountReturned
                                .amount,
                            codeCurrency:
                                initialData.onlineData.amountReturned
                                    .codeCurrency,
                        });
                        await new_price.save({ transaction: childt });
                        orderTemplate.amountReturnedId = new_price.id;
                    }

                    //@ts-ignore
                    orderTemplate.amountReturned = {
                        amount: initialData.onlineData.amountReturned.amount,
                        codeCurrency:
                            initialData.onlineData.amountReturned.codeCurrency,
                    };
                }
            }
        } else {
            const defaultMethod =
                orderTemplate.paymentGateway?.paymentWay || "CARD";

            for (const price of result_totals.data.totalToPay) {
                //Registering payment
                addBulkCurrencies.push({
                    amount: price.amount,
                    codeCurrency: price.codeCurrency,
                    orderReceiptId: orderTemplate.id,
                    paymentWay: defaultMethod,
                });
            }
        }

        //Registering actions
        listRecords.push({
            action: "ORDER_BILLED",
            title: getTitleOrderRecord("ORDER_BILLED"),
            madeById: initialData.userId,
            isPublic: true,
        });
    }

    //Checking if total received is enough
    let amountRealReceived = 0;
    let amountRealToPay = 0;
    for (const payment of realPayReceived) {
        const realToMainCurrency = exchangeCurrency(
            payment,
            main_currency.currency.code,
            availableCurrencies
        );
        if (realToMainCurrency) {
            amountRealReceived = mathOperation(
                amountRealReceived,
                realToMainCurrency.amount,
                "addition",
                2
            );
        }
    }

    for (const payment of totalToPay) {
        const toPayMainCurrency = exchangeCurrency(
            payment,
            main_currency.currency.code,
            availableCurrencies
        );

        if (toPayMainCurrency) {
            amountRealToPay = mathOperation(
                amountRealToPay,
                toPayMainCurrency.amount,
                "addition",
                2
            );
        }
    }

    //FIXME: Provisional
    // const errorMargin = amountRealToPay * 0.01;
    if (amountRealToPay > amountRealReceived) {
        return {
            status: 400,
            message: `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
        };
    }

    //Setting final data
    if (orderTemplate.id && addBulkCurrencies.length !== 0) {
        await CurrencyPayment.bulkCreate(addBulkCurrencies, {
            transaction: childt,
        });
    }

    //Updating cache
    orderTemplate.currenciesPayment = addBulkCurrencies;

    if (orderTemplate.id && bulkOperations.length !== 0) {
        await CashRegisterOperation.bulkCreate(bulkOperations, {
            transaction: childt,
        });
    }

    //Updating cache
    orderTemplate.cashRegisterOperations = bulkOperations;
    orderTemplate.status = "BILLED";

    //@ts-ignore
    orderTemplate.totalToPay = totalToPay;

    if (orderTemplate.id) {
        await orderTemplate.save({ transaction: childt });
    }

    //Create Records
    let listCacheRecords = await getOrderRecordsCache(
        initialData.businessId,
        tId
    );
    listCacheRecords = listCacheRecords.concat(listRecords);

    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "records", tId),
        JSON.stringify(listCacheRecords),
        {
            EX: getExpirationTime("records"),
        }
    );

    //Updating cache
    await redisClient.set(
        getEphimeralTermKey(initialData.businessId, "order", tId),
        JSON.stringify(orderTemplate),
        {
            EX: getExpirationTime("order"),
        }
    );

    return {
        status: 200,
    };
};

export const calculateOrderTotal = async (
    businessId: number,
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    //Obtaining data from cache
    const availableCurrencies = await getCurrenciesCache(businessId);
    const orderTemplate = await getOrderFromCacheTransaction(businessId, tId);

    if (!orderTemplate) {
        return {
            status: 404,
            message: `Order not found or not available/calculateOrderTotal`,
        };
    }

    if (orderTemplate.houseCosted) {
        if (orderTemplate.id) {
            OrderReceiptTotal.destroy({
                where: {
                    orderReceiptId: orderTemplate.id,
                },
                transaction: childt,
            });
        } else {
            orderTemplate.totalToPay = [];
        }

        //Updating cache
        await redisClient.set(
            getEphimeralTermKey(businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        return {
            status: 200,
            data: {
                totalToPay: [],
            },
        };
    }

    //Destroying if OrderPriceTotal exist
    if (orderTemplate.id && orderTemplate.totalToPay.length !== 0) {
        await OrderReceiptTotal.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    if (orderTemplate.id && orderTemplate.prices.length !== 0) {
        await OrderReceiptPrice.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    const main_currency = availableCurrencies.find(item => item.isMain);
    if (!main_currency) {
        return {
            status: 404,
            message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
        };
    }

    let totalPrices: Array<SimplePrice> = [];
    let totalPriceInMainCurrency = {
        amount: 0,
        codeCurrency: main_currency.currency.code,
    };

    //1. Calculating totalPrice
    for (const selledProduct of orderTemplate.selledProducts) {
        const found = totalPrices.find(
            item =>
                item.codeCurrency === selledProduct.priceUnitary.codeCurrency
        );

        //Taking into account if sales is by weight places after comma could be up to 3
        let priceTotal = mathOperation(
            selledProduct.priceUnitary.amount,
            selledProduct.quantity,
            "multiplication",
            3
        );
        priceTotal = truncateValue(priceTotal, 2);

        if (found) {
            totalPrices = totalPrices.map(item => {
                if (
                    item.codeCurrency ===
                    selledProduct.priceUnitary.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            priceTotal,
                            "addition",
                            2
                        ),
                    };
                }

                return item;
            });
        } else {
            totalPrices.push({
                amount: priceTotal,
                codeCurrency: selledProduct.priceUnitary.codeCurrency,
            });
        }

        //In main currency
        const foundCurrency = availableCurrencies.find(
            item =>
                item.currency.code === selledProduct.priceUnitary.codeCurrency
        );

        if (!foundCurrency) {
            return {
                status: 404,
                message: `Currency ${selledProduct.priceUnitary.codeCurrency} is not available in the business`,
            };
        }

        totalPriceInMainCurrency.amount += mathOperation(
            priceTotal,
            foundCurrency.exchangeRate,
            "multiplication",
            2
        );
    }

    //@ts-ignore
    orderTemplate.prices = totalPrices.map(item => {
        return {
            price: item.amount,
            codeCurrency: item.codeCurrency,
        };
    });

    //Registering totals prices
    let bulkTotalPrices = [];
    for (const price of totalPrices) {
        bulkTotalPrices.push({
            price: price.amount,
            codeCurrency: price.codeCurrency,
            orderReceiptId: orderTemplate.id,
        });
    }

    if (orderTemplate.id && bulkTotalPrices.length !== 0) {
        await OrderReceiptPrice.bulkCreate(bulkTotalPrices, {
            transaction: childt,
        });
    }

    //2. Analyzing discount
    if (orderTemplate.discount) {
        for (const price of totalPrices) {
            let amountToBeDiscounted =
                (parseInt(orderTemplate.discount.toString() || "0") / 100) *
                price.amount;

            // //Taking into account that number must be calculate in ceil mode
            amountToBeDiscounted = truncateValue(amountToBeDiscounted, 3);
            amountToBeDiscounted = Number(amountToBeDiscounted.toFixed(2));

            price.amount = mathOperation(
                price.amount,
                amountToBeDiscounted,
                "subtraction",
                2
            );
        }

        //In main currency
        totalPriceInMainCurrency.amount = mathOperation(
            totalPriceInMainCurrency.amount,
            (totalPriceInMainCurrency.amount * orderTemplate.discount) / 100,
            "subtraction",
            2
        );
    }

    //3. Analyzing commission
    if (orderTemplate.commission) {
        for (const price of totalPrices) {
            let amountToBeAdded =
                (parseInt(orderTemplate.commission.toString() || "0") *
                    price.amount) /
                100;

            //Taking into account that number must be calculate in ceil mode
            amountToBeAdded = truncateValue(amountToBeAdded, 3);
            amountToBeAdded = Number(amountToBeAdded.toFixed(2));

            price.amount = mathOperation(
                price.amount,
                amountToBeAdded,
                "addition",
                2
            );
        }

        //In main currency
        totalPriceInMainCurrency.amount = mathOperation(
            totalPriceInMainCurrency.amount,
            (totalPriceInMainCurrency.amount * orderTemplate.commission) / 100,
            "addition",
            2
        );
    }

    //4. Analyzing if has discount Coupons
    if (orderTemplate.couponDiscountPrice) {
        const found = totalPrices.find(
            item =>
                item.codeCurrency ===
                orderTemplate.couponDiscountPrice?.codeCurrency
        );

        if (found) {
            totalPrices = totalPrices.map(item => {
                if (
                    item.codeCurrency ===
                    orderTemplate.couponDiscountPrice?.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            orderTemplate.couponDiscountPrice.amount,
                            "subtraction",
                            2
                        ),
                    };
                }

                return item;
            });

            //In main currency
            const foundCurrency = availableCurrencies.find(
                item =>
                    item.currency.code ===
                    orderTemplate.couponDiscountPrice?.codeCurrency
            );

            if (!foundCurrency) {
                return {
                    status: 404,
                    message: `Currency ${orderTemplate.couponDiscountPrice?.codeCurrency} is not available in the business`,
                };
            }

            totalPriceInMainCurrency.amount = mathOperation(
                totalPriceInMainCurrency.amount,
                orderTemplate.couponDiscountPrice.amount *
                    foundCurrency.exchangeRate,
                "subtraction",
                2
            );
        }
    }

    //5. Adding shipping
    if (orderTemplate.shippingPrice) {
        const found = totalPrices.find(
            item =>
                item.codeCurrency === orderTemplate.shippingPrice?.codeCurrency
        );

        if (found) {
            totalPrices = totalPrices.map(item => {
                if (
                    item.codeCurrency ===
                    orderTemplate.shippingPrice?.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            orderTemplate.shippingPrice.amount,
                            "addition",
                            2
                        ),
                    };
                }

                return item;
            });

            //In main currency
            const foundCurrency = availableCurrencies.find(
                item =>
                    item.currency.code ===
                    orderTemplate.shippingPrice?.codeCurrency
            );

            if (!foundCurrency) {
                return {
                    status: 404,
                    message: `Currency ${orderTemplate.shippingPrice.codeCurrency} is not available in the business`,
                };
            }

            totalPriceInMainCurrency.amount = mathOperation(
                totalPriceInMainCurrency.amount,
                orderTemplate.shippingPrice.amount * foundCurrency.exchangeRate,
                "subtraction",
                2
            );
        } else {
            totalPrices.push({
                amount: orderTemplate.shippingPrice.amount,
                codeCurrency: orderTemplate.shippingPrice.codeCurrency,
            });
        }
    }

    

    //Registering totals to pay
    let bulkTotal = [];
    for (const price of totalPrices) {
        bulkTotal.push({
            amount: price.amount,
            codeCurrency: price.codeCurrency,
            orderReceiptId: orderTemplate.id,
        });
    }

    if (orderTemplate.id && bulkTotal.length !== 0) {
        await OrderReceiptTotal.bulkCreate(bulkTotal, {
            transaction: childt,
        });
    }

    //@ts-ignore
    orderTemplate.totalToPay = bulkTotal;

    //Updating cache
    await redisClient.set(
        getEphimeralTermKey(businessId, "order", tId),
        JSON.stringify(orderTemplate),
        {
            EX: getExpirationTime("order"),
        }
    );

    return {
        status: 200,
        data: {
            totalToPay: bulkTotal,
        },
    };
};

export const calculateOrderTotalV2 = async (
    businessId: number,
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    //Obtaining data from cache
    const availableCurrencies = await getCurrenciesCache(businessId);
    const orderTemplate = await getOrderFromCacheTransaction(businessId, tId);

    if (!orderTemplate) {
        return {
            status: 404,
            message: `Order not found or not available/calculateOrderTotalv2`,
        };
    }

    const notCheckAreaSale: order_origin[] = [
        "marketplace",
        "online",
        "shop",
        "shopapk",
    ];
    const isOrderOnline = notCheckAreaSale.includes(orderTemplate.origin);

    const area = await getAreaCache(orderTemplate?.areaSalesId);

    if (!area && !isOrderOnline) {
        return {
            status: 404,
            message: `Area not found or not available/calculateOrderTotal`,
        };
    }

    if (orderTemplate.houseCosted) {
        if (orderTemplate.id) {
            OrderReceiptTotal.destroy({
                where: {
                    orderReceiptId: orderTemplate.id,
                },
                transaction: childt,
            });
        } else {
            orderTemplate.totalToPay = [];
        }

        //Updating cache
        await redisClient.set(
            getEphimeralTermKey(businessId, "order", tId),
            JSON.stringify(orderTemplate),
            {
                EX: getExpirationTime("order"),
            }
        );

        return {
            status: 200,
            data: {
                totalToPay: [],
            },
        };
    }

    //Destroying if OrderPriceTotal exist
    if (orderTemplate.id && orderTemplate.totalToPay.length !== 0) {
        await OrderReceiptTotal.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    if (orderTemplate.id && orderTemplate.prices.length !== 0) {
        await OrderReceiptPrice.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    if (orderTemplate.id && orderTemplate.orderModifiers.length !== 0) {
        await OrderReceiptModifier.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    const main_currency = availableCurrencies.find(item => item.isMain);
    if (!main_currency) {
        return {
            status: 404,
            message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
        };
    }

    let simplePrices: Array<SimplePrice> = [];
    let totalPrices: Array<SimplePrice> = [];
    let totalPriceInMainCurrency = {
        amount: 0,
        codeCurrency: main_currency.currency.code,
    };
    let orderModifiers: Array<{
        showName: string;
        amount: number;
        codeCurrency: string;
        modifierId: number;
    }> = [];

    //1. Calculating totalPrice
    for (const selledProduct of orderTemplate.selledProducts) {
        const found = simplePrices.find(
            item =>
                item.codeCurrency === selledProduct.priceUnitary.codeCurrency
        );

        //Taking into account if sales is by weight places after comma could be up to 3
        let priceTotal = mathOperation(
            selledProduct.priceUnitary.amount,
            selledProduct.quantity,
            "multiplication",
            3
        );
        priceTotal = truncateValue(priceTotal, 2);

        if (found) {
            simplePrices = simplePrices.map(item => {
                if (
                    item.codeCurrency ===
                    selledProduct.priceUnitary.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            priceTotal,
                            "addition",
                            2
                        ),
                    };
                }

                return item;
            });
        } else {
            simplePrices.push({
                amount: priceTotal,
                codeCurrency: selledProduct.priceUnitary.codeCurrency,
            });
        }

        //In main currency
        const foundCurrency = availableCurrencies.find(
            item =>
                item.currency.code === selledProduct.priceUnitary.codeCurrency
        );

        if (!foundCurrency) {
            return {
                status: 404,
                message: `Currency ${selledProduct.priceUnitary.codeCurrency} is not available in the business`,
            };
        }

        totalPriceInMainCurrency.amount += mathOperation(
            priceTotal,
            foundCurrency.exchangeRate,
            "multiplication",
            2
        );
    }

    //Registering totals prices
    let bulkTotalPrices = [];
    totalPrices = [...simplePrices];
    for (const price of simplePrices) {
        bulkTotalPrices.push({
            price: price.amount,
            codeCurrency: price.codeCurrency,
            orderReceiptId: orderTemplate.id,
        });
    }

    if (orderTemplate.id && bulkTotalPrices.length !== 0) {
        await OrderReceiptPrice.bulkCreate(bulkTotalPrices, {
            transaction: childt,
        });
    } 

    //2. Analyzing discount and 3. Analyzing commission
    if (orderTemplate.discount || orderTemplate.commission) {
        //Total to discount and comision
        let discountOperation = 0;
        let commissionOperation = 0;

        // var helper
        let auxDiscount = 0;
        let auxCommission = 0;

        for (const price of simplePrices) {
            if (orderTemplate.discount) {
                //calculate value before discount
                discountOperation = mathOperation(
                    price.amount,
                    (price.amount * orderTemplate.discount) / 100,
                    "subtraction",
                    2
                );
                //calculate total to dicount
                auxDiscount = mathOperation(
                    price.amount,
                    discountOperation,
                    "subtraction"
                );
            }
            if (orderTemplate.commission) {
                //calculate value before commission
                commissionOperation = mathOperation(
                    price.amount,
                    (price.amount * orderTemplate.commission) / 100,
                    "addition",
                    2
                );
                //calculate total to comission
                auxCommission = mathOperation(
                    commissionOperation,
                    price.amount,
                    "subtraction"
                );
            }

            // operation in total to pay
            price.amount = mathOperation(
                price.amount,
                auxCommission,
                "addition",
                2
            );
            price.amount = mathOperation(
                price.amount,
                auxDiscount,
                "subtraction",
                2
            );
        }

        //In main currency
        totalPriceInMainCurrency.amount = mathOperation(
            totalPriceInMainCurrency.amount,
            auxDiscount,
            "subtraction",
            2
        );

        //In main currency
        totalPriceInMainCurrency.amount = mathOperation(
            totalPriceInMainCurrency.amount,
            auxCommission,
            "subtraction",
            2
        );
    }

    //4. Analyzing if has discount Coupons
    if (orderTemplate.couponDiscountPrice) {
        const found = totalPrices.find(
            item =>
                item.codeCurrency ===
                orderTemplate.couponDiscountPrice?.codeCurrency
        );

        if (found) {
            totalPrices = totalPrices.map(item => {
                if (
                    item.codeCurrency ===
                    orderTemplate.couponDiscountPrice?.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            orderTemplate.couponDiscountPrice.amount,
                            "subtraction",
                            2
                        ),
                    };
                }

                return item;
            });

            //In main currency
            const foundCurrency = availableCurrencies.find(
                item =>
                    item.currency.code ===
                    orderTemplate.couponDiscountPrice?.codeCurrency
            );

            if (!foundCurrency) {
                return {
                    status: 404,
                    message: `Currency ${orderTemplate.couponDiscountPrice?.codeCurrency} is not available in the business`,
                };
            }

            totalPriceInMainCurrency.amount = mathOperation(
                totalPriceInMainCurrency.amount,
                orderTemplate.couponDiscountPrice.amount *
                    foundCurrency.exchangeRate,
                "subtraction",
                2
            );
        }
    }

    if (area) {
        //---> Processing modifiers
        const modifiersFromGrosSubtotal = area.modifiers.filter(
            item => item.applyToGrossSales
        );

        for (const modifier of modifiersFromGrosSubtotal) {
            if (modifier.applyFixedAmount) {
                if (!modifier.fixedPrice) {
                    continue;
                }

                let normalizedAmount = modifier.fixedPrice.amount;
                if (modifier.type === "discount") {
                    normalizedAmount = normalizedAmount * -1;
                }

                const found = totalPrices.find(
                    item =>
                        item.codeCurrency === modifier.fixedPrice.codeCurrency
                );

                if (found) {
                    totalPrices = totalPrices.map(item => {
                        if (
                            item.codeCurrency ===
                            modifier.fixedPrice.codeCurrency
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    normalizedAmount,
                                    "addition",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                } else {
                    totalPrices.push({
                        amount: normalizedAmount,
                        codeCurrency: modifier.fixedPrice.codeCurrency,
                    });
                }

                orderModifiers.push({
                    showName: modifier.showName || modifier.name,
                    amount: normalizedAmount,
                    codeCurrency: modifier.fixedPrice.codeCurrency,
                    modifierId: modifier.id,
                });
            } else {
                for (const price of simplePrices) {
                    let normalizedAmount = mathOperation(
                        price.amount,
                        modifier.amount / 100,
                        "multiplication",
                        2
                    );
                    if (modifier.type === "discount") {
                        normalizedAmount = normalizedAmount * -1;
                    }

                    const found = totalPrices.find(
                        item => item.codeCurrency === price.codeCurrency
                    );

                    if (found) {
                        totalPrices = totalPrices.map(item => {
                            if (item.codeCurrency === price.codeCurrency) {
                                return {
                                    ...item,
                                    amount: mathOperation(
                                        item.amount,
                                        normalizedAmount,
                                        "addition",
                                        2
                                    ),
                                };
                            }

                            return item;
                        });
                    } else {
                        totalPrices.push({
                            amount: normalizedAmount,
                            codeCurrency: price.codeCurrency,
                        });
                    }

                    orderModifiers.push({
                        showName: modifier.showName || modifier.name,
                        amount: normalizedAmount,
                        codeCurrency: price.codeCurrency,
                        modifierId: modifier.id,
                    });
                }
            }
        }
    }

    if (area) {
        //Rest of modifiers by order
        const otherModifiers = area.modifiers
            .filter(item => item.applyAcumulative)
            .sort(item => (item.index > item.index ? 1 : -1));

        for (const modifier of otherModifiers) {
            if (modifier.applyFixedAmount) {
                if (!modifier.fixedPrice) {
                    continue;
                }

                let normalizedAmount = modifier.fixedPrice.amount;
                if (modifier.type === "discount") {
                    normalizedAmount = normalizedAmount * -1;
                }

                const found = totalPrices.find(
                    item =>
                        item.codeCurrency === modifier.fixedPrice.codeCurrency
                );

                if (found) {
                    totalPrices = totalPrices.map(item => {
                        if (
                            item.codeCurrency ===
                            modifier.fixedPrice.codeCurrency
                        ) {
                            return {
                                ...item,
                                amount: mathOperation(
                                    item.amount,
                                    normalizedAmount,
                                    "addition",
                                    2
                                ),
                            };
                        }

                        return item;
                    });
                } else {
                    totalPrices.push({
                        amount: normalizedAmount,
                        codeCurrency: modifier.fixedPrice.codeCurrency,
                    });
                }

                orderModifiers.push({
                    showName: modifier.showName || modifier.name,
                    amount: normalizedAmount,
                    codeCurrency: modifier.fixedPrice.codeCurrency,
                    modifierId: modifier.id,
                });
            } else {
                for (const price of totalPrices) {
                    let normalizedAmount = mathOperation(
                        price.amount,
                        modifier.amount / 100,
                        "multiplication",
                        2
                    );
                    if (modifier.type === "discount") {
                        normalizedAmount = normalizedAmount * -1;
                    }

                    price.amount = mathOperation(
                        price.amount,
                        normalizedAmount,
                        "addition",
                        2
                    );

                    orderModifiers.push({
                        showName: modifier.showName || modifier.name,
                        amount: normalizedAmount,
                        codeCurrency: price.codeCurrency,
                        modifierId: modifier.id,
                    });
                }
            }
        }
    }

    //5. Adding shipping
    if (orderTemplate.shippingPrice) {
        const found = totalPrices.find(
            item =>
                item.codeCurrency === orderTemplate.shippingPrice?.codeCurrency
        );

        if (found) {
            totalPrices = totalPrices.map(item => {
                if (
                    item.codeCurrency ===
                    orderTemplate.shippingPrice?.codeCurrency
                ) {
                    return {
                        ...item,
                        amount: mathOperation(
                            item.amount,
                            orderTemplate.shippingPrice.amount,
                            "addition",
                            2
                        ),
                    };
                }

                return item;
            });

            //In main currency
            const foundCurrency = availableCurrencies.find(
                item =>
                    item.currency.code ===
                    orderTemplate.shippingPrice?.codeCurrency
            );

            if (!foundCurrency) {
                return {
                    status: 404,
                    message: `Currency ${orderTemplate.shippingPrice.codeCurrency} is not available in the business`,
                };
            }

            totalPriceInMainCurrency.amount = mathOperation(
                totalPriceInMainCurrency.amount,
                orderTemplate.shippingPrice.amount * foundCurrency.exchangeRate,
                "subtraction",
                2
            );
        } else {
            totalPrices.push({
                amount: orderTemplate.shippingPrice.amount,
                codeCurrency: orderTemplate.shippingPrice.codeCurrency,
            });
        }
    }

    //Registering totals to pay
    let bulkTotal = [];
    for (const price of totalPrices) {
        bulkTotal.push({
            amount: price.amount,
            codeCurrency: price.codeCurrency,
            orderReceiptId: orderTemplate.id,
        });
    }

    if (orderTemplate.id && bulkTotal.length !== 0) {
        await OrderReceiptTotal.bulkCreate(bulkTotal, {
            transaction: childt,
        });
    }

    if (orderTemplate.id && orderModifiers.length !== 0) {
        let bulkCreate = orderModifiers.map(item => {
            return {
                ...item,
                orderReceiptId: orderTemplate.id,
            };
        });

        await OrderReceiptModifier.bulkCreate(bulkCreate, {
            transaction: childt,
        });
    }

    //@ts-ignore
    orderTemplate.totalToPay = bulkTotal;
    //@ts-ignore
    orderTemplate.prices = bulkTotalPrices;
    //@ts-ignore
    orderTemplate.orderModifiers = orderModifiers;

    //Updating cache
    await redisClient.set(
        getEphimeralTermKey(businessId, "order", tId),
        JSON.stringify(orderTemplate),
        {
            EX: getExpirationTime("order"),
        }
    );

    return {
        status: 200,
        data: {
            totalToPay: bulkTotal,
        },
    };
};

export const getSuppliesDependencies = async (initialData: {
    criteria: Array<{ id: number; quantity: number }>;
    precission_after_coma?: string;
}): Promise<InternalHelperResponse> => {
    //Obtaining all the products
    let checkControl = 0;
    let listAllProductsInvolved: Array<Product> = [];
    let listManufacturablesProducts: Array<Product> = [];
    let listRawProducts: Array<{
        product: Partial<Product>;
        totalQuantity: number;
    }> = [];

    const getSupplies = async (
        criteria: Array<{ id: number; quantity: number }>
    ) => {
        checkControl++;

        //Unique ids
        const ids = Array.from(new Set([...criteria.map(item => item.id)]));

        const result_products = await Product.findAll({
            where: {
                id: ids,
            },
            include: [
                {
                    model: Supply,
                    as: "supplies",
                    include: [
                        {
                            model: Product,
                            as: "supply",
                            include: [
                                {
                                    model: ProductCategory,
                                    attributes: ["id", "name", "description"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: Recipe,
                    include: [
                        {
                            model: ProductRawRecipe,
                            include: [
                                {
                                    model: Product,
                                    include: [
                                        {
                                            model: ProductCategory,
                                            attributes: [
                                                "id",
                                                "name",
                                                "description",
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: ProductCategory,
                    attributes: ["id", "name", "description"],
                },
            ],
        });

        listAllProductsInvolved = listAllProductsInvolved.concat(
            result_products.map(item => item)
        );

        if (checkControl > 1000) {
            Logger.warn(
                `La orden de producción ${name} tiene más de 1000 dependencias.`
            );
            return;
        }

        let nextSearch: Array<{ id: number; quantity: number }> = [];
        for await (const product of criteria) {
            const found = result_products.find(item => item.id === product.id);

            if (!found) {
                return {
                    status: 404,
                    message: `El producto con id ${product.id} no fue encontrado.`,
                };
            }

            if (found.type === "STOCK" || found.type === "MANUFACTURED") {
                listManufacturablesProducts.push(found);
            }

            if (found.recipe) {
                //Raw products from recipe
                for (const rawProduct of found.recipe.productsRawRecipe) {
                    const stored = listRawProducts.find(
                        item => item.product.id === rawProduct.productId
                    );

                    if (stored) {
                        listRawProducts = listRawProducts.map(item => {
                            if (item.product === rawProduct.productId) {
                                return {
                                    ...item,
                                    totalQuantity: mathOperation(
                                        item.totalQuantity,
                                        product.quantity *
                                            rawProduct.consumptionIndex,
                                        "addition",
                                        initialData.precission_after_coma
                                    ),
                                };
                            }

                            return item;
                        });
                    } else {
                        listRawProducts.push({
                            product: rawProduct.product,
                            totalQuantity: mathOperation(
                                rawProduct.consumptionIndex,
                                product.quantity,
                                "multiplication",
                                initialData.precission_after_coma
                            ),
                        });
                    }
                }
            } else {
                //Processing products from supply
                for (const supply of found.supplies) {
                    if (supply.supply.type === "RAW") {
                        const stored = listRawProducts.find(
                            item => item.product.id === supply.supply.id
                        );
                        if (stored) {
                            listRawProducts = listRawProducts.map(item => {
                                if (item.product === supply.supply.id) {
                                    return {
                                        ...item,
                                        totalQuantity: mathOperation(
                                            item.totalQuantity,
                                            (supply.quantity /
                                                found.performance) *
                                                product.quantity,
                                            "addition",
                                            initialData.precission_after_coma
                                        ),
                                    };
                                }

                                return item;
                            });
                        } else {
                            listRawProducts.push({
                                product: supply.supply,
                                totalQuantity: mathOperation(
                                    supply.quantity / found.performance,
                                    product.quantity,
                                    "multiplication",
                                    initialData.precission_after_coma
                                ),
                            });
                        }
                    } else {
                        if (
                            !["STOCK", "MANUFACTURED"].includes(
                                supply.supply.type
                            )
                        ) {
                            return {
                                status: 404,
                                message: `Solo pueden ser incluido en las órdenes de producción los productos de tipo Almacén/Procesado.`,
                            };
                        }

                        //It is not necesary to validate when product is repeated in nextSearch ;-)
                        nextSearch.push({
                            id: supply.supplyId,
                            quantity: mathOperation(
                                product.quantity,
                                supply.quantity / found.performance,
                                "multiplication",
                                initialData.precission_after_coma
                            ),
                        });
                    }
                }
            }
        }

        if (nextSearch.length !== 0) {
            await getSupplies(nextSearch);
        }
    };

    await getSupplies(initialData.criteria);

    return {
        status: 200,
        data: {
            listAllProductsInvolved,
            listManufacturablesProducts,
            listRawProducts,
        },
    };
};

export const afterOrderCancelled = async (
    initialData: {
        businessId: number;
        listResources?: Array<Resource>;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //@ts-ignore
    const tId = childt.id;

    const orderTemplate = await getOrderFromCacheTransaction(
        initialData.businessId,
        tId
    );

    if (!orderTemplate) {
        return {
            status: 404,
            message: `Order not found or not available/afterOrderCancelled`,
        };
    }

    //Canceling all tickets productions pending
    await ProductionTicket.update(
        {
            status: "CLOSED",
        },
        {
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        }
    );

    //Checking and destroying if orderreceipt payment records exist
    if (orderTemplate.currenciesPayment.length !== 0) {
        await CurrencyPayment.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    if (orderTemplate.cashRegisterOperations.length !== 0) {
        await CashRegisterOperation.destroy({
            where: {
                orderReceiptId: orderTemplate.id,
            },
            transaction: childt,
        });
    }

    //Updating used resources
    if (initialData.listResources && initialData.listResources.length !== 0) {
        await Resource.update(
            {
                isAvailable: true,
            },
            {
                where: {
                    id: initialData.listResources.map(item => item.id),
                },
                transaction: childt,
            }
        );
    }

    //Analyzing if coupons where registered
    if (orderTemplate.coupons) {
        await ListUsedClientsCoupon.destroy({
            where: {
                couponId: orderTemplate.coupons.map(item => item.id),
            },
            transaction: childt,
        });

        let listBulk = [];
        for (const coupon of orderTemplate.coupons) {
            listBulk.push({
                id: coupon.id,
                usageCount: coupon.usageCount--,
                amount: coupon.amount,
            });
        }

        await Coupon.bulkCreate(listBulk, {
            updateOnDuplicate: ["usageCount"],
            transaction: childt,
        });
    }

    return {
        status: 200,
    };
};

export const newProductElaboration = async (
    initialData: {
        quantity: number;
        productId: number;
        stockAreaFromId: number;
        stockAreaToId: number;
        precission_after_coma: string | undefined;
        businessId: number;
        userId: number;
        productionOrderId?: number;
        createdAt?: string;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    const activeEconomicCycle = await EconomicCycle.findOne({
        where: {
            isActive: true,
            businessId: initialData.businessId,
        },
    });

    const product = await Product.findByPk(initialData.productId, {
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
            {
                model: Recipe,
                include: [
                    {
                        model: ProductRawRecipe,
                        include: [Product],
                    },
                ],
            },
        ],
    });

    if (!product) {
        return {
            status: 404,
            message: `El producto no fue encontrado`,
        };
    }

    //Checking if action belongs to user Business
    if (product.businessId !== initialData.businessId) {
        return {
            status: 401,
            message: `No tiene acceso al recurso solicitado.`,
        };
    }

    //Creating products
    let bulkMovements = [];

    //Creating the new processed operation
    const baseMovement = StockMovement.build(
        {
            quantity: Math.abs(initialData.quantity),
            productId: initialData.productId,
            areaId: initialData.stockAreaToId,

            //Managed values
            businessId: initialData.businessId,
            movedById: initialData.userId,
            operation: "ENTRY",
            economicCycleId: activeEconomicCycle?.id,
            productionOrderId: initialData?.productionOrderId,
            createdAt: initialData.createdAt || moment().toDate(),
        },
        {
            include: [MovementStateRecord],
        }
    );

    await baseMovement.save({ transaction: childt });

    //New Elaboration Entry
    let productToAdd: Array<ProductItemMove> = [
        {
            productId: initialData.productId,
            quantity: Math.abs(initialData.quantity),
        },
    ];
    const result_to = await addProductsToStockArea(
        {
            products: productToAdd,
            precission_after_coma: initialData.precission_after_coma,
            areaId: initialData.stockAreaToId,
            businessId: initialData.businessId,
        },
        childt
    );

    if (!internalCheckerResponse(result_to)) {
        return result_to;
    }

    //Substraction
    let productsToSubstract: Array<ProductItemMove> = [];
    let to_return_supplies: any = [];

    if (!!product.recipe) {
        for (const rawProduct of product.recipe.productsRawRecipe) {
            //Creating operation movement
            bulkMovements.push({
                quantity:
                    mathOperation(
                        rawProduct.consumptionIndex,
                        initialData.quantity,
                        "multiplication",
                        initialData.precission_after_coma
                    ) * -1,
                productId: rawProduct.productId,
                areaId: initialData.stockAreaToId,

                //Managed values
                businessId: initialData.businessId,
                movedById: initialData.userId,
                operation: "PROCESSED",
                parentId: baseMovement.id,
                costBeforeOperation: rawProduct.product.averageCost,
                economicCycleId: activeEconomicCycle?.id,
                productionOrderId: initialData?.productionOrderId,
                createdAt: initialData.createdAt || moment().toDate(),
            });

            //To return
            const cost = mathOperation(
                rawProduct.product.averageCost,
                rawProduct.consumptionIndex,
                "multiplication",
                initialData.precission_after_coma
            );

            to_return_supplies.push({
                id: rawProduct.productId,
                quantity: rawProduct.consumptionIndex,
                supplyId: rawProduct.productId,
                name: rawProduct.product.name,
                measure: rawProduct.product.measure,
                images: rawProduct.product.images,
                cost,
            });

            //Populating array
            productsToSubstract.push({
                productId: rawProduct.productId,
                quantity: mathOperation(
                    rawProduct.consumptionIndex,
                    initialData.quantity,
                    "multiplication",
                    initialData.precission_after_coma
                ),
            });
        }
    } else {
        for (const supply of product.supplies) {
            //Creating operation movement
            bulkMovements.push({
                quantity:
                    mathOperation(
                        supply.quantity / product.performance,
                        initialData.quantity,
                        "multiplication",
                        initialData.precission_after_coma
                    ) * -1,
                productId: supply.supplyId,
                areaId: initialData.stockAreaFromId,

                //Managed values
                businessId: initialData.businessId,
                movedById: initialData.userId,
                operation: "PROCESSED",
                parentId: baseMovement.id,
                costBeforeOperation: supply.supply.averageCost,
                economicCycleId: activeEconomicCycle?.id,
                productionOrderId: initialData?.productionOrderId,
                createdAt: initialData.createdAt || moment().toDate(),
            });

            //To return
            const cost = mathOperation(
                supply.supply.averageCost,
                supply.quantity,
                "multiplication",
                initialData.precission_after_coma
            );

            to_return_supplies.push({
                id: supply.id,
                quantity: supply.quantity,
                supplyId: supply.supplyId,
                name: supply.supply.name,
                measure: supply.supply.measure,
                images: supply.supply.images,
                performance: product.performance,
                cost,
            });

            //Populating array
            productsToSubstract.push({
                productId: supply.supplyId,
                quantity: mathOperation(
                    supply.quantity / product.performance,
                    initialData.quantity,
                    "multiplication",
                    initialData.precission_after_coma
                ),
            });
        }
    }

    const result_from = await substractProductsFromStockArea(
        {
            products: productsToSubstract,
            precission_after_coma: initialData.precission_after_coma,
            areaId: initialData.stockAreaFromId,
            businessId: initialData.businessId,
            strict: "no",
            strictMode: "full",
        },
        childt
    );

    if (!internalCheckerResponse(result_from)) {
        return result_from;
    }

    const movements = await StockMovement.bulkCreate(bulkMovements, {
        transaction: childt,
        returning: true,
    });

    return {
        status: 200,
        data: {
            entry_movement_id: baseMovement.id,
            movements,
            to_return_supplies,
        },
    };
};

//Base of inventory control
//Deprecated from 16-06-2024
// Use substractProductsFromStockAreaV2
export const substractProductsFromStockArea = async (
    initialData: {
        products: Array<ProductItemMove>;
        areaId: number;
        precission_after_coma: string | undefined;
        strict?: "yes" | "no";
        businessId: number;
        strictMode?: "full" | "production";
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    const strict = initialData.strict || "yes";
    const strictMode = initialData.strictMode || "full";

    //General Validations
    const area = await getAreaCache(initialData.areaId);

    if (!area) {
        return {
            status: 404,
            message: `El área proporcinada no fue encontrada`,
        };
    }

    if (area.type !== "STOCK") {
        return {
            status: 404,
            message: `El área proporcinada no es de tipo Almacén`,
        };
    }

    //Security validation
    if (area.businessId !== initialData.businessId) {
        return {
            status: 401,
            message: `No tiene acceso al recurso solicitado.`,
        };
    }

    //Product
    let bulkUpdateProducts: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    //Stock Area
    let bulkAddStockProducts: Array<{
        quantity: number;
        productId: number;
        areaId: number;
        type: productType;
        variations?: Array<{
            quantity: number;
            variationId: number;
        }>;
    }> = [];
    let bulkUpdateStockProducts: Array<{
        id: number;
        quantity: number;
    }> = [];

    //Variations
    let bulkUpdateStockVariationProducts: Array<{
        id: number;
        stockAreaProductId: number;
        quantity: number;
    }> = [];
    let bulkAddStockVariationProducts: Array<{
        quantity: number;
        stockAreaProductId: number;
        variationId: number;
    }> = [];

    const [foundProducts, foundStockAreaProducts] = await Promise.all([
        Product.findAll({
            where: {
                id: initialData.products.map(item => item.productId),
                businessId: initialData.businessId,
            },
            include: [{ model: Variation, paranoid: false }],
            transaction: childt,
        }),
        StockAreaProduct.findAll({
            where: {
                productId: initialData.products.map(item => item.productId),
                areaId: initialData.areaId,
            },
            include: [StockAreaVariation, { model: Product, paranoid: false }],
            transaction: childt,
        }),
    ]);

    for (const product of initialData.products) {
        const foundStockProduct = foundStockAreaProducts.find(
            item => item.productId === product.productId
        );

        const foundProduct = foundProducts.find(
            item => item.id === product.productId
        );

        if (!foundProduct) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado.`,
            };
        }

        if (["MENU", "SERVICE", "COMBO", "ADDON"].includes(foundProduct.type)) {
            return {
                status: 400,
                message: `No puede realizar movimientos sobre productos elaborados, servicios, agregos o combos.`,
            };
        }

        if (foundProduct.type === "VARIATION") {
            if (!product.variationId) {
                return {
                    status: 400,
                    message: `El parámetro variationId no fue proporcionado en el producto variable ${foundProduct.name}`,
                };
            }

            const foundVariation = foundProduct.variations.find(
                item => item.id === product.variationId
            );

            if (!foundVariation) {
                return {
                    status: 400,
                    message: `La variación ${product.variationId} no fue encontrada en el producto seleccionado.`,
                };
            }
        }

        //1. Updating in Product Central
        //Analyzing if was updated before the product
        const foundIndex = bulkUpdateProducts.findIndex(
            item => item.id === product.productId
        );
        if (foundIndex !== -1) {
            bulkUpdateProducts[foundIndex].totalQuantity = mathOperation(
                bulkUpdateProducts[foundIndex].totalQuantity,
                product.quantity,
                "subtraction",
                initialData.precission_after_coma
            );
        } else {
            bulkUpdateProducts.push({
                id: product.productId,
                totalQuantity: mathOperation(
                    foundProduct.totalQuantity,
                    product.quantity,
                    "subtraction",
                    initialData.precission_after_coma
                ),
            });
        }

        if (strict === "yes") {
            if (!foundStockProduct) {
                return {
                    status: 404,
                    message: `El producto con id ${foundProduct.name} no fue encontrado en el área especificada.`,
                };
            }

            //2. Updating in Stock Area
            const foundStockIndex = bulkUpdateStockProducts.findIndex(
                item => item.id === foundStockProduct.id
            );

            if (foundStockIndex !== -1) {
                //Analyzing if quantity provided is enough to substract
                if (strictMode === "production") {
                    if (product.quantity > foundStockProduct.quantity) {
                        return {
                            status: 400,
                            message: `No existe suficiente cantidad de ${foundProduct.name} en el almacén para completar la operación.`,
                        };
                    }
                }

                bulkUpdateStockProducts[foundStockIndex].quantity =
                    mathOperation(
                        bulkUpdateStockProducts[foundStockIndex].quantity,
                        product.quantity,
                        "subtraction",
                        initialData.precission_after_coma
                    );
            } else {
                bulkUpdateStockProducts.push({
                    id: foundStockProduct.id,
                    quantity: mathOperation(
                        foundStockProduct.quantity,
                        product.quantity,
                        "subtraction",
                        initialData.precission_after_coma
                    ),
                });
            }

            //3. Verifying if it is a variation
            if (foundStockProduct.type === "VARIATION") {
                const foundVariation = foundStockProduct.variations?.find(
                    item => item.variationId === product.variationId
                );

                if (!foundVariation) {
                    return {
                        status: 400,
                        message: `La variación ${product.variationId} no fue encontrada en el área proporcionada.`,
                    };
                }

                if (product.quantity > foundVariation.quantity) {
                    return {
                        status: 400,
                        message: `No existe suficiente cantidad de ${foundProduct.name} - ${foundVariation.variation?.name} en el almacén para completar la operación.`,
                    };
                }

                bulkUpdateStockVariationProducts.push({
                    id: foundVariation.id,
                    stockAreaProductId: foundStockProduct.id,
                    quantity: mathOperation(
                        foundVariation.quantity,
                        product.quantity,
                        "subtraction",
                        initialData.precission_after_coma
                    ),
                });
            }
        } else {
            //2. Analyzing Variation
            if (foundProduct.type === "VARIATION") {
                if (foundStockProduct) {
                    const foundAddedStockPreviously =
                        bulkUpdateStockProducts.findIndex(
                            item => item.id === foundStockProduct.id
                        );

                    if (foundAddedStockPreviously !== -1) {
                        bulkUpdateStockProducts[
                            foundAddedStockPreviously
                        ].quantity = mathOperation(
                            bulkUpdateStockProducts[foundAddedStockPreviously]
                                .quantity,
                            product.quantity,
                            "subtraction",
                            initialData.precission_after_coma
                        );
                    } else {
                        bulkUpdateStockProducts.push({
                            id: foundStockProduct.id,
                            quantity: mathOperation(
                                foundStockProduct.quantity,
                                product.quantity,
                                "subtraction",
                                initialData.precission_after_coma
                            ),
                        });
                    }

                    const found_variation = foundStockProduct.variations?.find(
                        item => item.variationId === product.variationId
                    );

                    if (found_variation) {
                        bulkUpdateStockVariationProducts.push({
                            id: found_variation.id,
                            stockAreaProductId: foundStockProduct.id,
                            quantity: mathOperation(
                                found_variation.quantity,
                                product.quantity,
                                "subtraction",
                                initialData.precission_after_coma
                            ),
                        });
                    } else {
                        bulkAddStockVariationProducts.push({
                            quantity: product.quantity * -1,
                            stockAreaProductId: foundStockProduct.id,
                            variationId: product.variationId!,
                        });
                    }
                } else {
                    const foundAddedStockPreviously =
                        bulkAddStockProducts.findIndex(
                            item => item.productId === product.productId
                        );
                    if (foundAddedStockPreviously !== -1) {
                        bulkAddStockProducts[
                            foundAddedStockPreviously
                        ].quantity -= product.quantity;
                        bulkAddStockProducts[
                            foundAddedStockPreviously
                        ]?.variations?.push({
                            quantity: product.quantity * -1,
                            variationId: product.variationId!,
                        });
                    } else {
                        bulkAddStockProducts.push({
                            quantity: product.quantity * -1,
                            productId: product.productId,
                            areaId: initialData.areaId,
                            type: foundProduct.type,
                            variations: [
                                {
                                    quantity: product.quantity * -1,
                                    variationId: product.variationId!,
                                },
                            ],
                        });
                    }
                }
            } else {
                if (foundStockProduct) {
                    bulkUpdateStockProducts.push({
                        id: foundStockProduct.id,
                        quantity: mathOperation(
                            foundStockProduct.quantity,
                            product.quantity,
                            "subtraction",
                            initialData.precission_after_coma
                        ),
                    });
                } else {
                    bulkAddStockProducts.push({
                        quantity: product.quantity * -1,
                        productId: product.productId,
                        areaId: initialData.areaId,
                        type: foundProduct.type,
                    });
                }
            }
        }
    }

    //Product
    if (bulkUpdateProducts.length !== 0) {
        await Product.bulkCreate(bulkUpdateProducts, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Stock Area
    if (bulkUpdateStockProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockProducts.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    if (bulkAddStockProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
            include: [{ model: StockAreaVariation, as: "variations" }],
            transaction: childt,
        });
    }

    //Variations
    if (bulkUpdateStockVariationProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockVariationProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockVariationProducts.filter(
            item => item.quantity !== 0
        );

        if (idsToRemove.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }

        await StockAreaVariation.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });
    }

    if (bulkAddStockVariationProducts.length !== 0) {
        await StockAreaVariation.bulkCreate(bulkAddStockVariationProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
    };
};

interface BasicItemToMove {
    productId: number;
    quantity: number;
    variationId: number | undefined;
    batches:
        | Array<{
              quantity: number;
              batchId: number;
          }>
        | undefined;
}

/*
    This method substracts products from stock area, it can be used in two ways, 
    either in strict mode or permissive mode, in strict mode it will check if the product exists in the stock area

    Lock Product and StockAreaProduct rows
*/
export const substractProductsFromStockAreaV2 = async (
    initialData: {
        products: Array<BasicItemToMove>;
        stockAreaId: number;
        businessId: number;
        mode: "strict" | "permissive";
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //General Validations
    if (initialData.products.length === 0) {
        return {
            status: 400,
            message: `No se proporcionaron productos para realizar la operación.`,
        };
    }

    const area = await getAreaCache(initialData.stockAreaId);
    const configurations = await getBusinessConfigCache(initialData.businessId);
    const precission_after_coma = configurations.find(
        item => item.key === "precission_after_coma"
    )?.value;
    const algoritm_to_manage_batchs = configurations.find(
        item => item.key === "algoritm_to_manage_batchs"
    )?.value;

    if (!area) {
        return {
            status: 404,
            message: `El área proporcinada no fue encontrada`,
        };
    }

    if (area.type !== "STOCK") {
        return {
            status: 404,
            message: `El área proporcinada no es de tipo Almacén`,
        };
    }

    //Security validation
    if (area.businessId !== initialData.businessId) {
        return {
            status: 401,
            message: `No tiene acceso al recurso solicitado.`,
        };
    }

    //Product
    let bulkUpdateProducts: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    //Stock Area
    let bulkAddStockProducts: Array<{
        quantity: number;
        productId: number;
        areaId: number;
        type: productType;
        variations?: Array<{
            quantity: number;
            variationId: number;
        }>;
    }> = [];

    let bulkUpdateStockProducts: Array<{
        id: number;
        quantity: number;
    }> = [];

    //Variations
    let bulkUpdateStockVariationProducts: Array<{
        id: number;
        stockAreaProductId: number;
        quantity: number;
    }> = [];
    let bulkAddStockVariationProducts: Array<{
        quantity: number;
        stockAreaProductId: number;
        variationId: number;
    }> = [];

    //Batchs
    let bulkBatchesUpdated: Array<{
        id: number;
        quantity: number;
    }> = [];

    const ids = initialData.products.map(item => item.productId);
    const foundStockAreaProducts = await StockAreaProduct.findAll({
        where: {
            productId: ids,
            areaId: initialData.stockAreaId,
        },
        include: [StockAreaVariation, BatchProductStockArea],
        transaction: childt,
    });

    //--> INIT BLOCK Resources
    const fullProducts = await Product.findAll({
        where: {
            id: ids,
        },
        lock: true,
        transaction: childt,
    });

    await StockAreaProduct.findAll({
        where: {
            id: foundStockAreaProducts.map(item => item.id),
        },
        lock: true,
        transaction: childt,
    });
    //--> END BLOCK Resources

    for (const product of initialData.products) {
        const productDetails = fullProducts.find(
            item => item.id === product.productId
        );
        if (!productDetails) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado en el negocio.`,
            };
        }

        if (
            ["MENU", "SERVICE", "COMBO", "ADDON"].includes(productDetails.type)
        ) {
            return {
                status: 400,
                message: `No puede realizar movimientos sobre productos elaborados, servicios, agregos o combos.`,
            };
        }

        //1. Updating in Product Central
        //Analyzing if was updated before the product
        const foundIndex = bulkUpdateProducts.findIndex(
            item => item.id === product.productId
        );
        if (foundIndex !== -1) {
            bulkUpdateProducts[foundIndex].totalQuantity = mathOperation(
                bulkUpdateProducts[foundIndex].totalQuantity,
                product.quantity,
                "subtraction",
                precission_after_coma
            );
        } else {
            bulkUpdateProducts.push({
                id: product.productId,
                totalQuantity: mathOperation(
                    productDetails.totalQuantity,
                    product.quantity,
                    "subtraction",
                    precission_after_coma
                ),
            });
        }

        const foundStockProduct = foundStockAreaProducts.find(
            item => item.productId === product.productId
        );

        if (initialData.mode === "strict") {
            if (!foundStockProduct) {
                return {
                    status: 404,
                    message: `El producto ${productDetails.name} no fue encontrado en el área especificada.`,
                };
            }

            if (product.quantity > foundStockProduct.quantity) {
                return {
                    status: 400,
                    message: `No existe suficiente cantidad de ${productDetails.name} en el almacén para completar la operación.`,
                };
            }

            //2. Updating in Stock Area
            const foundStockIndex = bulkUpdateStockProducts.findIndex(
                item => item.id === foundStockProduct.id
            );

            if (foundStockIndex !== -1) {
                bulkUpdateStockProducts[foundStockIndex].quantity =
                    mathOperation(
                        bulkUpdateStockProducts[foundStockIndex].quantity,
                        product.quantity,
                        "subtraction",
                        precission_after_coma
                    );
            } else {
                bulkUpdateStockProducts.push({
                    id: foundStockProduct.id,
                    quantity: mathOperation(
                        foundStockProduct.quantity,
                        product.quantity,
                        "subtraction",
                        precission_after_coma
                    ),
                });
            }

            //3. Verifying if it is a variation
            if (foundStockProduct.type === "VARIATION") {
                if (!product.variationId) {
                    return {
                        status: 400,
                        message: `El parámetro variationId no fue proporcionado en el producto variable ${productDetails.name}`,
                    };
                }

                const foundVariation = foundStockProduct.variations?.find(
                    item => item.variationId === product.variationId
                );

                if (!foundVariation) {
                    return {
                        status: 400,
                        message: `La variación ${product.variationId} no fue encontrada en el área proporcionada.`,
                    };
                }

                if (product.quantity > foundVariation.quantity) {
                    return {
                        status: 400,
                        message: `No existe suficiente cantidad de ${productDetails.name} - ${foundVariation.variation.name} en el almacén para completar la operación.`,
                    };
                }

                bulkUpdateStockVariationProducts.push({
                    id: foundVariation.id,
                    stockAreaProductId: foundStockProduct.id,
                    quantity: mathOperation(
                        foundVariation.quantity,
                        product.quantity,
                        "subtraction",
                        precission_after_coma
                    ),
                });
            }
        } else {
            //For permissive action
            //2. Analyzing Variation
            if (productDetails.type === "VARIATION") {
                if (foundStockProduct) {
                    const foundAddedStockPreviously =
                        bulkUpdateStockProducts.findIndex(
                            item => item.id === foundStockProduct.id
                        );

                    if (foundAddedStockPreviously !== -1) {
                        bulkUpdateStockProducts[
                            foundAddedStockPreviously
                        ].quantity = mathOperation(
                            bulkUpdateStockProducts[foundAddedStockPreviously]
                                .quantity,
                            product.quantity,
                            "subtraction",
                            precission_after_coma
                        );
                    } else {
                        bulkUpdateStockProducts.push({
                            id: foundStockProduct.id,
                            quantity: mathOperation(
                                foundStockProduct.quantity,
                                product.quantity,
                                "subtraction",
                                precission_after_coma
                            ),
                        });
                    }

                    const found_variation = foundStockProduct.variations?.find(
                        item => item.variationId === product.variationId
                    );

                    if (found_variation) {
                        bulkUpdateStockVariationProducts.push({
                            id: found_variation.id,
                            stockAreaProductId: foundStockProduct.id,
                            quantity: mathOperation(
                                found_variation.quantity,
                                product.quantity,
                                "subtraction",
                                precission_after_coma
                            ),
                        });
                    } else {
                        bulkAddStockVariationProducts.push({
                            quantity: product.quantity * -1,
                            stockAreaProductId: foundStockProduct.id,
                            variationId: product.variationId!,
                        });
                    }
                } else {
                    const foundAddedStockPreviously =
                        bulkAddStockProducts.findIndex(
                            item => item.productId === product.productId
                        );
                    if (foundAddedStockPreviously !== -1) {
                        bulkAddStockProducts[
                            foundAddedStockPreviously
                        ].quantity -= product.quantity;
                        bulkAddStockProducts[
                            foundAddedStockPreviously
                        ]?.variations?.push({
                            quantity: product.quantity * -1,
                            variationId: product.variationId!,
                        });
                    } else {
                        bulkAddStockProducts.push({
                            quantity: product.quantity * -1,
                            productId: product.productId,
                            areaId: initialData.stockAreaId,
                            type: productDetails.type,
                            variations: [
                                {
                                    quantity: product.quantity * -1,
                                    variationId: product.variationId!,
                                },
                            ],
                        });
                    }
                }
            } else {
                if (foundStockProduct) {
                    bulkUpdateStockProducts.push({
                        id: foundStockProduct.id,
                        quantity: mathOperation(
                            foundStockProduct.quantity,
                            product.quantity,
                            "subtraction",
                            precission_after_coma
                        ),
                    });
                } else {
                    bulkAddStockProducts.push({
                        quantity: product.quantity * -1,
                        productId: product.productId,
                        areaId: initialData.stockAreaId,
                        type: productDetails.type,
                    });
                }
            }
        }

        //Processing batch in case arrive
        if (foundStockProduct && foundStockProduct.batchs.length !== 0) {
            let organizedBatches = [];
            if (algoritm_to_manage_batchs === "FIFO") {
                organizedBatches = foundStockProduct.batchs.sort((a, b) =>
                    a.entryAt < b.entryAt ? -1 : 1
                );
            } else if (algoritm_to_manage_batchs === "FEFO") {
                organizedBatches = foundStockProduct.batchs.sort((a, b) =>
                    a.expirationAt < b.expirationAt ? -1 : 1
                );
            } else {
                organizedBatches = foundStockProduct.batchs;
            }

            let amountSubtracted = 0;
            for (const batch of product.batches || []) {
                const found = organizedBatches.find(
                    item => item.batchId === batch.batchId
                );
                if (found) {
                    //Updating quantity in the same array to avoid duplication in the next logic step
                    found.quantity = mathOperation(
                        found.quantity,
                        batch.quantity,
                        "subtraction",
                        precission_after_coma
                    );

                    bulkBatchesUpdated.push({
                        id: found.id,
                        quantity: mathOperation(
                            found.quantity,
                            batch.quantity,
                            "subtraction",
                            precission_after_coma
                        ),
                    });

                    amountSubtracted = mathOperation(
                        amountSubtracted,
                        batch.quantity,
                        "addition",
                        precission_after_coma
                    );
                }
            }

            let iterator = 0;
            while (
                amountSubtracted < foundStockProduct.quantity &&
                iterator < foundStockProduct.batchs.length
            ) {
                const found = organizedBatches[iterator];
                let needToSubstract = mathOperation(
                    foundStockProduct.quantity,
                    amountSubtracted,
                    "subtraction",
                    precission_after_coma
                );

                if (found) {
                    if (needToSubstract <= found.quantity) {
                        bulkBatchesUpdated.push({
                            id: found.id,
                            quantity: mathOperation(
                                found.quantity,
                                needToSubstract,
                                "subtraction",
                                precission_after_coma
                            ),
                        });
                    } else {
                        bulkBatchesUpdated.push({
                            id: found.id,
                            quantity: 0,
                        });
                    }

                    amountSubtracted = mathOperation(
                        amountSubtracted,
                        needToSubstract,
                        "addition",
                        precission_after_coma
                    );
                }
                iterator++;
            }
        }
    }

    //Product
    if (bulkUpdateProducts.length !== 0) {
        await Product.bulkCreate(bulkUpdateProducts, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Stock Area
    if (bulkUpdateStockProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockProducts.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    if (bulkAddStockProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
            include: [{ model: StockAreaVariation, as: "variations" }],
            transaction: childt,
        });
    }

    //Batches
    if (bulkBatchesUpdated.length !== 0) {
        const idsToRemove = bulkBatchesUpdated
            .filter(item => item.quantity <= 0)
            .map(item => item.id);

        const toUpdate = bulkBatchesUpdated.filter(item => item.quantity !== 0);
        await BatchProductStockArea.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await BatchProductStockArea.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    //Variations
    if (bulkUpdateStockVariationProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockVariationProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockVariationProducts.filter(
            item => item.quantity !== 0
        );

        if (idsToRemove.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }

        await StockAreaVariation.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });
    }

    if (bulkAddStockVariationProducts.length !== 0) {
        await StockAreaVariation.bulkCreate(bulkAddStockVariationProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
    };
};

//Deprecated
// From 17062024
// Used instead V2
export const addProductsToStockArea = async (
    initialData: {
        products: Array<ProductItemMove>;
        areaId: number;
        precission_after_coma: string | undefined;
        businessId: number;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //General Validations
    const area = await getAreaCache(initialData.areaId);

    if (!area) {
        return {
            status: 404,
            message: `El área proporcinada no fue encontrada`,
        };
    }

    if (area.type !== "STOCK") {
        return {
            status: 404,
            message: `El área proporcinada no es de tipo Almacén`,
        };
    }

    //Security validation
    const business = await Business.findByPk(initialData.businessId, {
        include: [
            {
                model: Business,
                as: "branches",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
        ],
    });

    const businesses = [
        initialData.businessId,
        ...(business?.branches?.map(item => item.id) || []),
    ];

    if (!businesses.some(item => item === area.businessId)) {
        return {
            status: 401,
            message: `No tiene acceso al recurso solicitado.`,
        };
    }

    //Product
    let bulkUpdateProducts: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    //Stock Area
    let bulkAddStockProducts: Array<{
        quantity: number;
        productId: number;
        areaId: number;
        type: productType;
        variations?: Array<{
            quantity: number;
            variationId: number;
        }>;
    }> = [];
    let bulkUpdateStockProducts: Array<{
        id: number;
        quantity: number;
    }> = [];

    //Variations
    let bulkUpdateStockVariationProducts: Array<{
        id: number;
        stockAreaProductId: number;
        quantity: number;
    }> = [];
    let bulkAddStockVariationProducts: Array<{
        quantity: number;
        stockAreaProductId: number;
        variationId: number;
    }> = [];

    const [foundProducts, foundStockAreaProducts] = await Promise.all([
        Product.findAll({
            where: {
                id: initialData.products.map(item => item.productId),
                businessId: initialData.businessId,
            },
            include: [{ model: Variation, paranoid: false }],
            transaction: childt,
        }),
        StockAreaProduct.findAll({
            where: {
                productId: initialData.products.map(item => item.productId),
                areaId: initialData.areaId,
            },
            include: [StockAreaVariation],
            transaction: childt,
        }),
    ]);

    for (const product of initialData.products) {
        const foundProduct = foundProducts.find(
            item => item.id === product.productId
        );

        if (!foundProduct) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado.`,
            };
        }

        if (["MENU", "SERVICE", "COMBO", "ADDON"].includes(foundProduct.type)) {
            return {
                status: 400,
                message: `No puede realizar movimientos sobre productos elaborados, servicios, agregos o combos.`,
            };
        }

        if (foundProduct.type === "VARIATION") {
            if (!product.variationId) {
                return {
                    status: 400,
                    message: `El parámetro variationId no fue proporcionado en el producto variable ${foundProduct.name}`,
                };
            }

            const foundVariation = foundProduct.variations.find(
                item => item.id === product.variationId
            );

            if (!foundVariation) {
                return {
                    status: 400,
                    message: `La variación ${product.variationId} no fue encontrada en el producto seleccionado.`,
                };
            }
        }

        //1. Updating in Product Central
        //Analyzing if was updated before the product
        const foundIndex = bulkUpdateProducts.findIndex(
            item => item.id === product.productId
        );
        if (foundIndex !== -1) {
            bulkUpdateProducts[foundIndex].totalQuantity = mathOperation(
                bulkUpdateProducts[foundIndex].totalQuantity,
                product.quantity,
                "addition",
                initialData.precission_after_coma
            );
        } else {
            bulkUpdateProducts.push({
                id: product.productId,
                totalQuantity: mathOperation(
                    foundProduct.totalQuantity,
                    product.quantity,
                    "addition",
                    initialData.precission_after_coma
                ),
            });
        }

        //Updating quantities in Stock Area
        const foundStockProduct = foundStockAreaProducts.find(
            item => item.productId === product.productId
        );

        //2. Analyzing Variation
        if (foundProduct.type === "VARIATION") {
            if (foundStockProduct) {
                const foundAddedStockPreviously =
                    bulkUpdateStockProducts.findIndex(
                        item => item.id === foundStockProduct.id
                    );
                if (foundAddedStockPreviously !== -1) {
                    bulkUpdateStockProducts[
                        foundAddedStockPreviously
                    ].quantity += product.quantity;
                } else {
                    bulkUpdateStockProducts.push({
                        id: foundStockProduct.id,
                        quantity: mathOperation(
                            foundStockProduct.quantity,
                            product.quantity,
                            "addition",
                            initialData.precission_after_coma
                        ),
                    });
                }

                const found_variation = foundStockProduct.variations?.find(
                    item => item.variationId === product.variationId
                );

                if (found_variation) {
                    bulkUpdateStockVariationProducts.push({
                        id: found_variation.id,
                        stockAreaProductId: foundStockProduct.id,
                        quantity: mathOperation(
                            found_variation.quantity,
                            product.quantity,
                            "addition",
                            initialData.precission_after_coma
                        ),
                    });
                } else {
                    bulkAddStockVariationProducts.push({
                        quantity: product.quantity,
                        stockAreaProductId: foundStockProduct.id,
                        variationId: product.variationId!,
                    });
                }
            } else {
                const foundAddedStockPreviously =
                    bulkAddStockProducts.findIndex(
                        item => item.productId === product.productId
                    );
                if (foundAddedStockPreviously !== -1) {
                    bulkAddStockProducts[foundAddedStockPreviously].quantity +=
                        product.quantity;
                    bulkAddStockProducts[
                        foundAddedStockPreviously
                    ]?.variations?.push({
                        quantity: product.quantity,
                        variationId: product.variationId!,
                    });
                } else {
                    bulkAddStockProducts.push({
                        quantity: product.quantity,
                        productId: product.productId,
                        areaId: initialData.areaId,
                        type: foundProduct.type,
                        variations: [
                            {
                                quantity: product.quantity,
                                variationId: product.variationId!,
                            },
                        ],
                    });
                }
            }
        } else {
            if (foundStockProduct) {
                bulkUpdateStockProducts.push({
                    id: foundStockProduct.id,
                    quantity: mathOperation(
                        foundStockProduct.quantity,
                        product.quantity,
                        "addition",
                        initialData.precission_after_coma
                    ),
                });
            } else {
                bulkAddStockProducts.push({
                    quantity: product.quantity,
                    productId: product.productId,
                    areaId: initialData.areaId,
                    type: foundProduct.type,
                });
            }
        }
    }

    //Product
    if (bulkUpdateProducts.length !== 0) {
        await Product.bulkCreate(bulkUpdateProducts, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Stock Area
    if (bulkUpdateStockProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockProducts.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    if (bulkAddStockProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
            include: [{ model: StockAreaVariation, as: "variations" }],
            transaction: childt,
        });
    }

    //Variations
    if (bulkUpdateStockVariationProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockVariationProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockVariationProducts.filter(
            item => item.quantity !== 0
        );

        if (idsToRemove.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }

        await StockAreaVariation.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });
    }

    if (bulkAddStockVariationProducts.length !== 0) {
        await StockAreaVariation.bulkCreate(bulkAddStockVariationProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
    };
};

/*
    This method add products into stock area

    Lock Product and StockAreaProduct rows
*/
export const addProductsToStockAreaV2 = async (
    initialData: {
        products: Array<BasicItemToMove>;
        stockAreaId: number;
        businessId: number;
        batches:
            | Array<{
                  quantity: number;
                  batchId: number;
              }>
            | undefined;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    //General Validations
    if (initialData.products.length === 0) {
        return {
            status: 400,
            message: `No se proporcionaron productos para realizar la operación.`,
        };
    }

    const area = await getAreaCache(initialData.stockAreaId);
    const configurations = await getBusinessConfigCache(initialData.businessId);
    const precission_after_coma = configurations.find(
        item => item.key === "precission_after_coma"
    )?.value;

    if (!area) {
        return {
            status: 404,
            message: `El área proporcinada no fue encontrada`,
        };
    }

    if (area.type !== "STOCK") {
        return {
            status: 404,
            message: `El área proporcinada no es de tipo Almacén`,
        };
    }

    //Security validation
    const business = await Business.findByPk(initialData.businessId, {
        include: [
            {
                model: Business,
                as: "branches",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
        ],
    });

    const businesses = [
        initialData.businessId,
        ...(business?.branches?.map(item => item.id) || []),
    ];

    if (!businesses.some(item => item === area.businessId)) {
        return {
            status: 401,
            message: `No tiene acceso al recurso solicitado.`,
        };
    }

    //Product
    let bulkUpdateProducts: Array<{
        id: number;
        totalQuantity: number;
    }> = [];

    //Stock Area
    let bulkAddStockProducts: Array<{
        quantity: number;
        productId: number;
        areaId: number;
        type: productType;
        variations?: Array<{
            quantity: number;
            variationId: number;
        }>;
        batchs: Array<{
            quantity: number;
            entryAt: Date;
            expirationAt: Date;
            variationId: number;
            batchId: number;
        }>;
    }> = [];
    let bulkUpdateStockProducts: Array<{
        id: number;
        quantity: number;
    }> = [];

    //Variations
    let bulkUpdateStockVariationProducts: Array<{
        id: number;
        stockAreaProductId: number;
        quantity: number;
    }> = [];
    let bulkAddStockVariationProducts: Array<{
        quantity: number;
        stockAreaProductId: number;
        variationId: number;
    }> = [];

    //Batchs
    let bulkBatchesUpdated: Array<{
        id: number;
        quantity: number;
    }> = [];
    let bulkAddBatchStockProducts: Array<{
        quantity: number;
        entryAt: Date;
        expirationAt: Date;
        stockAreaProductId: number;
        variationId: number;
        batchId: number;
    }> = [];

    const ids = initialData.products.map(item => item.productId);
    const foundStockAreaProducts = await StockAreaProduct.findAll({
        where: {
            productId: ids,
            areaId: initialData.stockAreaId,
        },
        include: [StockAreaVariation, BatchProductStockArea],
        transaction: childt,
    });

    let fullBatches: Array<Batch> = [];
    let idsBatches: Array<number> = [];
    for (const product of initialData.products) {
        const ids = product.batches?.map(item => item.batchId);
        if (ids && ids.length !== 0) {
            idsBatches = idsBatches.concat(ids);
        }
    }

    if (idsBatches.length !== 0) {
        fullBatches = await Batch.findAll({
            where: {
                id: idsBatches,
            },
            transaction: childt,
        });
    }

    //--> INIT BLOCK Resources
    const fullProducts = await Product.findAll({
        where: {
            id: ids,
        },
        lock: true,
        transaction: childt,
    });

    await StockAreaProduct.findAll({
        where: {
            id: foundStockAreaProducts.map(item => item.id),
        },
        lock: true,
        transaction: childt,
    });
    //--> END BLOCK Resources

    for (const product of initialData.products) {
        const productDetails = fullProducts.find(
            item => item.id === product.productId
        );
        if (!productDetails) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado en el negocio.`,
            };
        }

        if (
            ["MENU", "SERVICE", "COMBO", "ADDON"].includes(productDetails.type)
        ) {
            return {
                status: 400,
                message: `No puede realizar movimientos sobre productos elaborados, servicios, agregos o combos.`,
            };
        }

        if (productDetails.type === "VARIATION") {
            if (!product.variationId) {
                return {
                    status: 400,
                    message: `El parámetro variationId no fue proporcionado en el producto variable ${productDetails.name}`,
                };
            }
        }

        //1. Updating in Product Central
        //Analyzing if was updated before the product
        const foundIndex = bulkUpdateProducts.findIndex(
            item => item.id === product.productId
        );
        if (foundIndex !== -1) {
            bulkUpdateProducts[foundIndex].totalQuantity = mathOperation(
                bulkUpdateProducts[foundIndex].totalQuantity,
                product.quantity,
                "addition",
                precission_after_coma
            );
        } else {
            bulkUpdateProducts.push({
                id: product.productId,
                totalQuantity: mathOperation(
                    productDetails.totalQuantity,
                    product.quantity,
                    "addition",
                    precission_after_coma
                ),
            });
        }

        //Updating quantities in Stock Area
        const foundStockProduct = foundStockAreaProducts.find(
            item => item.productId === product.productId
        );

        //2. Analyzing Variation
        if (productDetails.type === "VARIATION") {
            //2.1 When stockProduct exist
            if (foundStockProduct) {
                const foundAddedStockPreviously =
                    bulkUpdateStockProducts.findIndex(
                        item => item.id === foundStockProduct.id
                    );

                const found_variation = foundStockProduct.variations?.find(
                    item => item.variationId === product.variationId
                );

                if (foundAddedStockPreviously !== -1) {
                    bulkUpdateStockProducts[
                        foundAddedStockPreviously
                    ].quantity += product.quantity;

                    if (found_variation) {
                        bulkUpdateStockVariationProducts.push({
                            id: found_variation.id,
                            stockAreaProductId: foundStockProduct.id,
                            quantity: mathOperation(
                                found_variation.quantity,
                                product.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    } else {
                        bulkAddStockVariationProducts.push({
                            quantity: product.quantity,
                            stockAreaProductId: foundStockProduct.id,
                            variationId: product.variationId!,
                        });
                    }
                } else {
                    bulkUpdateStockProducts.push({
                        id: foundStockProduct.id,
                        quantity: mathOperation(
                            foundStockProduct.quantity,
                            product.quantity,
                            "addition",
                            precission_after_coma
                        ),
                    });

                    if (found_variation) {
                        bulkUpdateStockVariationProducts.push({
                            id: found_variation.id,
                            stockAreaProductId: foundStockProduct.id,
                            quantity: mathOperation(
                                found_variation.quantity,
                                product.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    } else {
                        bulkAddStockVariationProducts.push({
                            quantity: product.quantity,
                            stockAreaProductId: foundStockProduct.id,
                            variationId: product.variationId!,
                        });
                    }
                }

                //Adding batches
                for (const batch of product.batches || []) {
                    const foundBatchStock = foundStockProduct.batchs.find(
                        item => item.batchId === batch.batchId
                    );

                    if (foundBatchStock) {
                        bulkBatchesUpdated.push({
                            id: foundBatchStock.id,
                            quantity: mathOperation(
                                foundBatchStock.quantity,
                                batch.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    } else {
                        const batchDetail = fullBatches.find(
                            item => item.id === batch.batchId
                        );

                        if (batchDetail) {
                            bulkAddBatchStockProducts.push({
                                quantity: batch.quantity,
                                entryAt: batchDetail.entryAt,
                                expirationAt: batchDetail.expirationAt,
                                stockAreaProductId: foundStockProduct.id,
                                variationId: batchDetail.variationId,
                                batchId: batchDetail.id,
                            });
                        }
                    }
                }
            } else {
                //2.2 When stock product don't exist
                const foundAddedStockPreviously =
                    bulkAddStockProducts.findIndex(
                        item => item.productId === product.productId
                    );

                if (foundAddedStockPreviously !== -1) {
                    bulkAddStockProducts[foundAddedStockPreviously].quantity +=
                        product.quantity;

                    bulkAddStockProducts[
                        foundAddedStockPreviously
                    ]?.variations?.push({
                        quantity: product.quantity,
                        variationId: product.variationId!,
                    });

                    let batches = [];
                    for (const batch of product.batches || []) {
                        const batchDetail = fullBatches.find(
                            item => item.id === batch.batchId
                        );

                        if (batchDetail) {
                            batches.push({
                                quantity: batch.quantity,
                                entryAt: batchDetail.entryAt,
                                expirationAt: batchDetail.expirationAt,
                                variationId: batchDetail.variationId,
                                batchId: batchDetail.id,
                            });
                        }
                    }

                    bulkAddStockProducts[
                        foundAddedStockPreviously
                    ]?.batchs.push(...batches);
                } else {
                    let batches = [];
                    for (const batch of product.batches || []) {
                        const batchDetail = fullBatches.find(
                            item => item.id === batch.batchId
                        );

                        if (batchDetail) {
                            batches.push({
                                quantity: batch.quantity,
                                entryAt: batchDetail.entryAt,
                                expirationAt: batchDetail.expirationAt,
                                variationId: batchDetail.variationId,
                                batchId: batchDetail.id,
                            });
                        }
                    }

                    bulkAddStockProducts.push({
                        quantity: product.quantity,
                        productId: product.productId,
                        areaId: initialData.stockAreaId,
                        type: productDetails.type,
                        variations: [
                            {
                                quantity: product.quantity,
                                variationId: product.variationId!,
                            },
                        ],
                        batchs: batches,
                    });
                }
            }
        } else {
            //3. Stock product
            if (foundStockProduct) {
                bulkUpdateStockProducts.push({
                    id: foundStockProduct.id,
                    quantity: mathOperation(
                        foundStockProduct.quantity,
                        product.quantity,
                        "addition",
                        precission_after_coma
                    ),
                });

                //Adding batches
                for (const batch of product.batches || []) {
                    const foundBatchStock = foundStockProduct.batchs.find(
                        item => item.batchId === batch.batchId
                    );
                    if (foundBatchStock) {
                        bulkBatchesUpdated.push({
                            id: foundBatchStock.id,
                            quantity: mathOperation(
                                foundBatchStock.quantity,
                                batch.quantity,
                                "addition",
                                precission_after_coma
                            ),
                        });
                    } else {
                        const batchDetail = fullBatches.find(
                            item => item.id === batch.batchId
                        );

                        if (batchDetail) {
                            bulkAddBatchStockProducts.push({
                                quantity: batch.quantity,
                                entryAt: batchDetail.entryAt,
                                expirationAt: batchDetail.expirationAt,
                                stockAreaProductId: foundStockProduct.id,
                                variationId: batchDetail.variationId,
                                batchId: batchDetail.id,
                            });
                        }
                    }
                }
            } else {
                let batches = [];
                for (const batch of product.batches || []) {
                    const batchDetail = fullBatches.find(
                        item => item.id === batch.batchId
                    );

                    if (batchDetail) {
                        batches.push({
                            quantity: batch.quantity,
                            entryAt: batchDetail.entryAt,
                            expirationAt: batchDetail.expirationAt,
                            variationId: batchDetail.variationId,
                            batchId: batchDetail.id,
                        });
                    }
                }

                bulkAddStockProducts.push({
                    quantity: product.quantity,
                    productId: product.productId,
                    areaId: initialData.stockAreaId,
                    type: productDetails.type,
                    batchs: batches,
                });
            }
        }
    }

    //Product
    if (bulkUpdateProducts.length !== 0) {
        await Product.bulkCreate(bulkUpdateProducts, {
            updateOnDuplicate: ["totalQuantity"],
            transaction: childt,
        });
    }

    //Stock Area
    if (bulkUpdateStockProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockProducts.filter(
            item => item.quantity !== 0
        );
        await StockAreaProduct.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await StockAreaProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    if (bulkAddStockProducts.length !== 0) {
        await StockAreaProduct.bulkCreate(bulkAddStockProducts, {
            include: [
                { model: StockAreaVariation, as: "variations" },
                { model: BatchProductStockArea, as: "batchs" },
            ],
            transaction: childt,
        });
    }

    //Batches
    if (bulkBatchesUpdated.length !== 0) {
        const idsToRemove = bulkBatchesUpdated
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkBatchesUpdated.filter(item => item.quantity !== 0);
        await BatchBuyedProduct.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });

        if (idsToRemove.length !== 0) {
            await BatchBuyedProduct.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }
    }

    if (bulkAddBatchStockProducts.length !== 0) {
        await BatchProductStockArea.bulkCreate(bulkAddBatchStockProducts, {
            transaction: childt,
        });
    }

    //Variations
    if (bulkUpdateStockVariationProducts.length !== 0) {
        const idsToRemove = bulkUpdateStockVariationProducts
            .filter(item => item.quantity === 0)
            .map(item => item.id);

        const toUpdate = bulkUpdateStockVariationProducts.filter(
            item => item.quantity !== 0
        );

        if (idsToRemove.length !== 0) {
            await StockAreaVariation.destroy({
                where: {
                    id: idsToRemove,
                },
                transaction: childt,
            });
        }

        await StockAreaVariation.bulkCreate(toUpdate, {
            updateOnDuplicate: ["quantity"],
            transaction: childt,
        });
    }

    if (bulkAddStockVariationProducts.length !== 0) {
        await StockAreaVariation.bulkCreate(bulkAddStockVariationProducts, {
            transaction: childt,
        });
    }

    return {
        status: 200,
    };
};

//This method link prices and images
export const productDuplicator = async (
    initialData: {
        universalCodes: Array<number>;
        fromBusinessId: number;
        toBusinessId: number;
        duplicateSalesCategory?: boolean;
        duplicateProductCategory?: boolean;
    },
    childt: Transaction
): Promise<InternalHelperResponse> => {
    const [productsFound, productsAlreadyInBusiness] = await Promise.all([
        Product.findAll({
            where: {
                universalCode: initialData.universalCodes,
                businessId: initialData.fromBusinessId,
            },
            paranoid: false,
            include: [
                ProductCategory,
                SalesCategory,
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
                        "id",
                        "price",
                        "codeCurrency",
                        "isMain",
                        "priceSystemId",
                        "updatedAt",
                    ],
                    separate: true,
                },
            ],
            transaction: childt,
        }),
        Product.findAll({
            where: {
                universalCode: initialData.universalCodes,
                businessId: initialData.toBusinessId,
            },
            paranoid: false,
            transaction: childt,
        }),
    ]);

    //Filtering categories in products
    if (initialData.duplicateSalesCategory) {
        let bulkCategories: Array<SalesCategory> = [];
        for (const product of productsFound) {
            const found = bulkCategories.find(
                item => item.id === product.salesCategoryId
            );

            if (!found && product.salesCategory) {
                bulkCategories.push(product.salesCategory);
            }
        }

        const salesCategoryAlreadyInBusiness = await SalesCategory.findAll({
            where: {
                universalCode: bulkCategories
                    .filter(item => !!item.universalCode)
                    .map(item => item.universalCode),
                businessId: initialData.toBusinessId,
            },
        });

        let bulkNewSalesCategories = [];
        for (const category of bulkCategories) {
            const isInBusiness = salesCategoryAlreadyInBusiness.find(
                item => item.universalCode === category.universalCode
            );

            if (!isInBusiness) {
                bulkNewSalesCategories.push({
                    name: category.name,
                    description: category.description,
                    universalCode: category.universalCode,
                    businessId: Number(initialData.toBusinessId),
                });
            }
        }

        if (bulkNewSalesCategories.length !== 0) {
            await SalesCategory.bulkCreate(bulkNewSalesCategories, {
                transaction: childt,
            });
        }
    }

    if (initialData.duplicateProductCategory) {
        let bulkCategories: Array<ProductCategory> = [];
        for (const product of productsFound) {
            const found = bulkCategories.find(
                item => item.id === product.productCategoryId
            );

            if (!found && product.productCategory) {
                bulkCategories.push(product.productCategory);
            }
        }

        const productCategoryAlreadyInBusiness = await ProductCategory.findAll({
            where: {
                universalCode: bulkCategories
                    .filter(item => !!item.universalCode)
                    .map(item => item.universalCode),
                businessId: Number(initialData.toBusinessId),
            },
        });

        let bulkNewProductCategories = [];
        for (const category of bulkCategories) {
            const isInBusiness = productCategoryAlreadyInBusiness.find(
                item => item.universalCode === category.universalCode
            );

            if (!isInBusiness) {
                bulkNewProductCategories.push({
                    name: category.name,
                    description: category.description,
                    universalCode: category.universalCode,
                    businessId: Number(initialData.toBusinessId),
                });
            }
        }

        if (bulkNewProductCategories.length !== 0) {
            await ProductCategory.bulkCreate(bulkNewProductCategories, {
                transaction: childt,
            });
        }
    }

    //Finding sales and product categories
    const [productCategories, salesCategories] = await Promise.all([
        ProductCategory.findAll({
            where: {
                businessId: initialData.toBusinessId,
            },
            transaction: childt,
        }),
        SalesCategory.findAll({
            where: {
                businessId: initialData.toBusinessId,
            },
            transaction: childt,
        }),
    ]);

    let bulkNewProducts = [];
    for (const product of productsFound) {
        const isInBusiness = productsAlreadyInBusiness.find(
            item => item.universalCode === product.universalCode
        );

        if (!isInBusiness) {
            //Analyzing if salesCategory is created
            const salesCategoryId = salesCategories.find(
                item =>
                    item.universalCode === product.salesCategory?.universalCode
            )?.id;
            const productCategoryId = productCategories.find(
                item =>
                    item.universalCode ===
                    product.productCategory?.universalCode
            )?.id;

            let body: any = {
                name: product.name,
                universalCode: product.universalCode,
                salesCode: product.salesCode,
                description: product.description,
                type: product.type,
                showForSale: product.showForSale,
                measure: product.measure,
                businessId: initialData.toBusinessId,
                salesCategoryId,
                productCategoryId,
            };

            if (product.prices) {
                body.prices = product.prices.map(item => {
                    return {
                        price: item.price,
                        codeCurrency: item.codeCurrency,
                    };
                });
            }

            if (product.images) {
                body.images = product.images.map(item => {
                    return {
                        path: item.path,
                        src: item.src,
                        thumbnail: item.thumbnail,
                        blurHash: item.blurHash,
                    };
                });
            }

            bulkNewProducts.push(body);
        }
    }

    if (bulkNewProducts.length !== 0) {
        await Product.bulkCreate(bulkNewProducts, {
            include: [
                { model: Image, as: "images" },
                { model: ProductPrice, as: "prices" },
            ],
            transaction: childt,
            returning: true,
        });
    }

    return {
        status: 200,
    };
};
