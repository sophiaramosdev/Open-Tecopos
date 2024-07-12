import { Op, where, fn, col } from "sequelize";
import moment from "moment";

import Coupon from "../../database/models/coupon";
import { InternalHelperResponse } from "./interfaces";
import Product from "../../database/models/product";
import ProductPrice from "../../database/models/productPrice";
import SalesCategory from "../../database/models/salesCategory";
import { SimplePrice } from "../../interfaces/commons";
import { getProductPrice, mathOperation } from "../../helpers/utils";
import Client from "../../database/models/client";
import ListUsedClientsCoupon from "../../database/models/listUsedClientsCoupon";
import { SimpleProductItem } from "../../interfaces/models";
import Price from "../../database/models/price";
import Variation from "../../database/models/variation";
import { getCurrenciesCache } from "../../helpers/redisStructure";

//Addons products must be provided separatly in the listProducts
//Coupons is not applicable to specifically product variations
//Multicoupons in only one currency
export interface ProcessCouponInterface {
    couponDiscount: SimplePrice;
    listCoupons: Array<number>;
    freeShipping: boolean;
    client: Client | null;
}

export const processCoupons = async (initialData: {
    coupons: Array<string>;
    listProducts: Array<SimpleProductItem>;
    priceSystem: number | Array<string>;
    businessId: number;
    userId?: number;
    clientId?: number;
    codeCurrencyDefined?: string;
}): Promise<InternalHelperResponse> => {
    if (!initialData.coupons || initialData.coupons.length === 0) {
        return {
            status: 200,
        };
    }

    const foundCoupons = await Coupon.findAll({
        where: {
            code: initialData.coupons.map(item => item.trim().toUpperCase()),
            expirationAt: {
                [Op.gte]: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            },
            businessId: initialData.businessId,
        },
        include: [
            {
                model: Product,
                as: "allowedProducts",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
            {
                model: Product,
                as: "excludedProducts",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
            {
                model: SalesCategory,
                as: "allowedSalesCategories",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
            {
                model: SalesCategory,
                as: "excludedSalesCategories",
                attributes: ["id"],
                through: {
                    attributes: [],
                },
            },
        ],
    });

    let client;
    if (initialData.clientId) {
        client = await Client.findByPk(initialData.clientId);
    } else {
        client = await Client.findOne({
            where: {
                userId: initialData.userId,
                businessId: initialData.businessId,
            },
        });
    }

    let freeShipping = false;
    let currency;
    let processedCoupon: Array<string> = [];
    for (const coupon of initialData.coupons) {
        const found = foundCoupons.find(
            item => item.code?.toUpperCase() === coupon.toUpperCase()
        );

        if (!found) {
            return {
                status: 404,
                message: `El cupón ${coupon} no es válido o ya expiró.`,
            };
        }

        //Analyzing if coupons is not apply twice
        if (processedCoupon.includes(coupon.toUpperCase())) {
            return {
                status: 400,
                message: `El cupón ${coupon} ya fue aplicado anteriormente.`,
            };
        } else {
            processedCoupon.push(coupon.toUpperCase());
        }

        //Coupons must be in only one currency
        if (!currency) {
            currency = found.codeCurrency;
        } else {
            if (currency !== found.codeCurrency) {
                return {
                    status: 400,
                    message: `No puede aplicar cupones múltiples de diferentes tipos de monedas.`,
                };
            }
        }

        //Checking usage
        if (
            found.usageLimit &&
            found.usageLimit !== 0 &&
            found.usageCount > found.usageLimit
        ) {
            return {
                status: 400,
                message: `El cupón ${coupon} excedió el límite de uso permitido.`,
            };
        }

        //Individual use
        if (found.individualUse && initialData.coupons.length > 1) {
            return {
                status: 400,
                message: `Solo es posible usar el cupón ${coupon} individualmente.`,
            };
        }

        //Checking ussage limit user
        if (found.usageLimitPerUser) {
            if (!client) {
                return {
                    status: 400,
                    message: `Solo los clientes fidelizados pueden acceder al cupón ${coupon}.`,
                };
            }

            const countUses = await ListUsedClientsCoupon.count({
                where: {
                    couponId: found.id,
                    clientId: client.id,
                },
            });

            if (
                found.usageLimitPerUser !== 0 &&
                countUses > found.usageLimitPerUser
            ) {
                return {
                    status: 400,
                    message: `Ha excedido la cantidad posible permitida de uso del cupón ${coupon}.`,
                };
            }
        }

        //Free shipping
        if (found.freeShipping) {
            freeShipping = true;
        }
    }

    //Finding all products
    const products = await Product.findAll({
        where: {
            id: initialData.listProducts.map(item => item.productId),
        },
        include: [
            ProductPrice,
            Price,
            {
                model: Variation,
                as: "variations",
                include: [
                    {
                        model: Price,
                        as: "price",
                    },
                ],
            },
        ],
    });

    const salesCategories = await SalesCategory.findAll({
        include: [
            {
                model: Product,
                where: {
                    id: initialData.listProducts.map(item => item.productId),
                },
            },
        ],
    });

    const productIds = products.map(item => item.id);
    const salesCategoryIds = salesCategories.map(item => item.id);

    let totalPrices: Array<{
        coupon: string;
        total: Array<SimplePrice>;
    }> = initialData.coupons.map(item => {
        return {
            coupon: item,
            total: [],
        };
    });
    let couponDiscount: Array<SimplePrice> = [];
    let totalItems: number = 0;

    const availableCurrencies = await getCurrenciesCache(
        initialData.businessId
    );

    for (const product of initialData.listProducts) {
        const found = products.find(item => item.id === product.productId);

        if (!found) {
            return {
                status: 404,
                message: `El producto con id ${product.productId} no fue encontrado.`,
            };
        }

        //Finding price
        const itemPrice = getProductPrice(
            found,
            product.variationId,
            availableCurrencies,
            [initialData.priceSystem.toString()],
            initialData.codeCurrencyDefined
        );

        totalItems += product.quantity;

        if (!itemPrice) {
            return {
                status: 404,
                message: `El producto ${found.name} no tiene un precio válido de sistema. Por favor consulte al administrador.`,
            };
        }

        //Including product and categories
        for (const coupon of initialData.coupons) {
            const foundCoupon = foundCoupons.find(
                item => item.code?.toUpperCase() === coupon.toUpperCase()
            )!;

            let viaAllow = true;
            let viaDeny = false;

            if (
                foundCoupon.allowedProducts &&
                foundCoupon.allowedProducts.length !== 0
            ) {
                if (
                    foundCoupon.allowedProducts.some(item =>
                        productIds.includes(item.id)
                    )
                ) {
                    viaAllow = true;
                }
            }

            if (
                foundCoupon.excludedProducts &&
                foundCoupon.excludedProducts.length !== 0
            ) {
                if (
                    foundCoupon.excludedProducts.some(item =>
                        productIds.includes(item.id)
                    )
                ) {
                    viaDeny = false;
                }
            }

            if (
                foundCoupon.allowedSalesCategories &&
                foundCoupon.allowedSalesCategories.length !== 0
            ) {
                if (
                    foundCoupon.allowedSalesCategories.some(item =>
                        salesCategoryIds.includes(item.id)
                    )
                ) {
                    viaAllow = true;
                }
            }

            if (
                foundCoupon.excludedSalesCategories &&
                foundCoupon.excludedSalesCategories.length !== 0
            ) {
                if (
                    foundCoupon.excludedSalesCategories.some(item =>
                        salesCategories.includes(item.id)
                    )
                ) {
                    viaDeny = false;
                }
            }

            //OnSale excluded
            if (foundCoupon.excludeOnSaleProducts && found.onSale) {
                viaAllow = false;
            }

            //TotalPrice
            if (viaAllow && !viaDeny) {
                const foundTotalIndex = totalPrices.findIndex(
                    item =>
                        item.coupon?.toUpperCase() ===
                        foundCoupon.code?.toUpperCase()
                );

                if (foundTotalIndex !== -1) {
                    const foundTPIndex = totalPrices[
                        foundTotalIndex
                    ].total.findIndex(
                        item => item.codeCurrency === itemPrice.codeCurrency
                    );

                    if (foundTPIndex !== -1) {
                        totalPrices[foundTotalIndex].total[
                            foundTPIndex
                        ].amount = mathOperation(
                            totalPrices[foundTotalIndex].total[foundTPIndex]
                                .amount,
                            itemPrice.amount * product.quantity,
                            "addition",
                            2
                        );
                    } else {
                        totalPrices[foundTotalIndex].total.push({
                            amount: itemPrice.amount * product.quantity,
                            codeCurrency: itemPrice.codeCurrency,
                        });
                    }
                }
            }
        }
    }

    //Other validations
    for (const coupon of initialData.coupons) {
        const foundCoupon = foundCoupons.find(
            item => item.code?.toUpperCase() === coupon?.toUpperCase()
        )!;

        //Minimun amount
        if (foundCoupon.minimumAmount && foundCoupon.minimumAmount !== 0) {
            const foundTotalIndex = totalPrices.findIndex(
                item =>
                    item.coupon?.toUpperCase() ===
                    foundCoupon.code?.toUpperCase()
            );

            if (foundTotalIndex !== -1) {
                for (const total of totalPrices[foundTotalIndex].total) {
                    if (
                        total.codeCurrency === foundCoupon.codeCurrency &&
                        total.amount < foundCoupon.minimumAmount
                    ) {
                        return {
                            status: 400,
                            message: `Para usar el cupón ${coupon} se requiere un monto mínimo de ${foundCoupon.minimumAmount}.`,
                        };
                    }
                }
            }
        }

        //Manimun amount
        if (foundCoupon.maximumAmount && foundCoupon.maximumAmount !== 0) {
            const foundTotalIndex = totalPrices.findIndex(
                item =>
                    item.coupon?.toUpperCase() ===
                    foundCoupon.code?.toUpperCase()
            );
            if (foundTotalIndex !== -1) {
                for (const total of totalPrices[foundTotalIndex].total) {
                    if (
                        total.codeCurrency === foundCoupon.codeCurrency &&
                        total.amount > foundCoupon.maximumAmount
                    ) {
                        return {
                            status: 400,
                            message: `Para usar el cupón ${coupon} se requiere un monto de compra menor a ${foundCoupon.maximumAmount}.`,
                        };
                    }
                }
            }
        }

        //Usage X items
        if (foundCoupon.limitUsageToXItems) {
            if (
                foundCoupon.limitUsageToXItems !== 0 &&
                totalItems > foundCoupon.limitUsageToXItems
            ) {
                return {
                    status: 400,
                    message: `Solo puede usar el cupón ${coupon} hasta un máximo de ${foundCoupon.limitUsageToXItems} artículos.`,
                };
            }
        }

        //Process coupon
        if (foundCoupon.discountType === "PERCENT") {
            const foundTotalIndex = totalPrices.findIndex(
                item =>
                    item.coupon?.toUpperCase() ===
                    foundCoupon.code?.toUpperCase()
            );

            if (foundTotalIndex !== -1) {
                for (const total of totalPrices[foundTotalIndex].total) {
                    if (foundCoupon.codeCurrency === total.codeCurrency) {
                        const discount = mathOperation(
                            total.amount,
                            Number(foundCoupon.amount) / 100,
                            "multiplication",
                            2
                        );

                        const foundDiscountIndex = couponDiscount.findIndex(
                            item => item.codeCurrency === total.codeCurrency
                        );
                        if (foundDiscountIndex !== -1) {
                            couponDiscount[foundDiscountIndex].amount =
                                mathOperation(
                                    couponDiscount[foundDiscountIndex].amount,
                                    total.amount,
                                    "addition",
                                    2
                                );
                        } else {
                            couponDiscount.push({
                                amount: discount,
                                codeCurrency: total.codeCurrency,
                            });
                        }
                    }
                }
            }
        } else if (foundCoupon.discountType === "FIXED_CART") {
            const foundDiscountIndex = couponDiscount.findIndex(
                item => item.codeCurrency === foundCoupon.codeCurrency
            );
            if (foundDiscountIndex !== -1) {
                couponDiscount[foundDiscountIndex].amount = mathOperation(
                    couponDiscount[foundDiscountIndex].amount,
                    foundCoupon.amount,
                    "addition",
                    2
                );
            } else {
                couponDiscount.push({
                    amount: foundCoupon.amount,
                    codeCurrency: foundCoupon.codeCurrency,
                });
            }
        } else if (foundCoupon.discountType === "FIXED_PRODUCT") {
            let viaAllow = true;
            let viaDeny = false;

            if (
                foundCoupon.allowedProducts &&
                foundCoupon.allowedProducts.length !== 0
            ) {
                if (
                    foundCoupon.allowedProducts.some(item =>
                        productIds.includes(item.id)
                    )
                ) {
                    viaAllow = true;
                }
            }

            if (
                foundCoupon.excludedProducts &&
                foundCoupon.excludedProducts.length !== 0
            ) {
                if (
                    foundCoupon.excludedProducts.some(item =>
                        productIds.includes(item.id)
                    )
                ) {
                    viaDeny = false;
                }
            }

            if (
                foundCoupon.allowedSalesCategories &&
                foundCoupon.allowedSalesCategories.length !== 0
            ) {
                if (
                    foundCoupon.allowedSalesCategories.some(item =>
                        salesCategoryIds.includes(item.id)
                    )
                ) {
                    viaAllow = true;
                }
            }

            if (
                foundCoupon.excludedSalesCategories &&
                foundCoupon.excludedSalesCategories.length !== 0
            ) {
                if (
                    foundCoupon.excludedSalesCategories.some(item =>
                        salesCategories.includes(item.id)
                    )
                ) {
                    viaDeny = false;
                }
            }

            if (!viaAllow || viaDeny) {
                return {
                    status: 400,
                    message: `El cupón ${coupon} no es aplicable.`,
                };
            }

            const foundDiscountIndex = couponDiscount.findIndex(
                item => item.codeCurrency === foundCoupon.codeCurrency
            );
            if (foundDiscountIndex !== -1) {
                couponDiscount[foundDiscountIndex].amount = mathOperation(
                    couponDiscount[foundDiscountIndex].amount,
                    foundCoupon.amount,
                    "addition",
                    2
                );
            } else {
                couponDiscount.push({
                    amount: foundCoupon.amount,
                    codeCurrency: foundCoupon.codeCurrency,
                });
            }
        }
    }

    return {
        status: 200,
        data: {
            couponDiscount,
            listCoupons: foundCoupons.map(item => item.id),
            freeShipping,
            client,
        },
    };
};
