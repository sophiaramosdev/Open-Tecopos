import { AxiosResponse } from "axios";
import bigDecimal from "js-big-decimal";

import Product from "../database/models/product";
import {
    order_receipt_status,
    social_network_types,
} from "../interfaces/nomenclators";
import Logger from "../lib/logger";
import { order_status } from "../interfaces/wocoommerce";
import { InternalHelperResponse } from "../controllers/helpers/interfaces";
import Address from "../database/models/address";
import { OrderProductPrice, SimplePrice } from "../interfaces/commons";
import ProductPrice from "../database/models/productPrice";
import AvailableCurrency from "../database/models/availableCurrency";
import moment from "moment";

export const checkerResponse = (response: AxiosResponse) => {
    if (!response) {
        return false;
    }

    if (response.status >= 200 && response.status < 300) {
        return true;
    }

    return false;
};

//For response made by Victor in helpers Controller
export const internalCheckerResponse = (response: InternalHelperResponse) => {
    if (response.status >= 200 && response.status < 300) {
        return true;
    }
    return false;
};

export const mixSimplePricesArrays = (
    array1: Array<SimplePrice>,
    array2: Array<SimplePrice>
) => {
    const mergedArray = [...array1, ...array2].reduce(
        (acc: SimplePrice[], curr: SimplePrice) => {
            const existingIndex = acc.findIndex(
                item => item.codeCurrency === curr.codeCurrency
            );
            if (existingIndex === -1) {
                acc.push({
                    amount: curr.amount,
                    codeCurrency: curr.codeCurrency,
                });
            } else {
                acc[existingIndex].amount = mathOperation(
                    acc[existingIndex].amount,
                    curr.amount,
                    "addition",
                    2
                );
            }
            return acc;
        },
        []
    );

    return mergedArray;
};

//FIXME: Variation os Simple Price when key is not amount
export const mixPricesArrays = (
    array1: Array<OrderProductPrice>,
    array2: Array<OrderProductPrice>
) => {
    const mergedArray = [...array1, ...array2].reduce(
        (acc: OrderProductPrice[], curr: OrderProductPrice) => {
            const existingIndex = acc.findIndex(
                item => item.codeCurrency === curr.codeCurrency
            );
            if (existingIndex === -1) {
                acc.push({
                    price: curr.price,
                    codeCurrency: curr.codeCurrency,
                });
            } else {
                acc[existingIndex].price = mathOperation(
                    acc[existingIndex].price,
                    curr.price,
                    "addition",
                    2
                );
            }
            return acc;
        },
        []
    );

    return mergedArray;
};

export const truncateValue = (
    value: number | string,
    precission?: number | string
) => {
    if (!value) {
        return 0;
    }

    if (!precission) {
        return Number(value);
    }

    const array = value.toString().split(".");
    const decimalPart = array[1]?.substring(0, Number(precission) || 0) || "0";
    return Number([array[0], decimalPart].join("."));
};

export const longNumber = (value: number) => {
    return new Intl.NumberFormat("es").format(value);
};

export const mathOperation = (
    value1: number,
    value2: number,
    operation: "addition" | "subtraction" | "multiplication" | "division",
    precission?: number | string
): number => {
    try {
        //Limit number to precission
        const operator1 = new bigDecimal(truncateValue(value1, precission));
        const operator2 = new bigDecimal(truncateValue(value2, precission));

        let result;
        switch (operation) {
            case "addition":
                result = operator1.add(operator2);
                break;
            case "subtraction":
                result = operator1.subtract(operator2);
                break;
            case "division":
                result = operator1.divide(operator2);
                break;
            case "multiplication":
                result = operator1.multiply(operator2);
                break;
        }

        return Number(truncateValue(result.getValue(), precission));
    } catch (error: any) {
        Logger.warn(error, {
            value1,
            value2,
        });
        return 0;
    }
};

export const getUrlSocialNetwork = (type: social_network_types) => {
    switch (type) {
        case "FACEBOOK":
            return "https://www.facebook.com/";
        case "INSTAGRAM":
            return "https://www.instagram.com/";
        case "TWITTER":
            return "https://twitter.com/";
        case "WHATSAPP":
            return "https://wa.me/";
        default:
            break;
    }
};

export const createSlug = (text: string) => {
    return text
        .toString()
        .normalize("NFD") // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "") // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, "-");
};

//Product must include: ProductPrice, onSalePrice
export const getProductPrice = (
    product: Product,
    variationId: number | undefined,
    availableCurrencies: AvailableCurrency[],
    priceSystems: Array<string>,
    currencyDefined?: string | undefined
): { amount: number; codeCurrency: string } | undefined => {
    //1.Check if product is onSale
    if (product.onSale) {
        if (product.onSaleType === "fixed" && product.onSalePrice) {
            if (currencyDefined) {
                if (product.onSalePrice.codeCurrency === currencyDefined) {
                    return {
                        amount: product.onSalePrice.amount,
                        codeCurrency: product.onSalePrice.codeCurrency,
                    };
                } else {
                    const convertedPrice = exchangeCurrency(
                        {
                            amount: product.onSalePrice.amount,
                            codeCurrency: product.onSalePrice.codeCurrency,
                        },
                        currencyDefined,
                        availableCurrencies,
                        2
                    );

                    return {
                        amount: convertedPrice?.amount || 0,
                        codeCurrency: convertedPrice?.codeCurrency || "CUP",
                    };
                }
            } else {
                return {
                    amount: product.onSalePrice.amount,
                    codeCurrency: product.onSalePrice.codeCurrency,
                };
            }
        } else if (product.onSaleType === "percent") {
            //This case must be analyze in every next scenario because basePrice is needeed.
        }
    }

    //2 Analyzing if product is variable
    if (product.type === "VARIATION" && variationId) {
        const variation = product.variations.find(
            item => item.id === variationId
        );

        if (variation && variation.price) {
            if (product.onSale && product.onSaleType === "percent") {
                if (currencyDefined) {
                    if (variation.price.codeCurrency === currencyDefined) {
                        let priceReduced = mathOperation(
                            variation.price.amount,
                            product.onSaleDiscountAmount / 100 + 1,
                            "division",
                            3
                        );

                        priceReduced = Number(priceReduced.toFixed(2));

                        return {
                            amount: priceReduced,
                            codeCurrency: variation.price.codeCurrency,
                        };
                    } else {
                        const convertedPrice = exchangeCurrency(
                            {
                                amount: variation.price.amount,
                                codeCurrency: variation.price.codeCurrency,
                            },
                            currencyDefined,
                            availableCurrencies,
                            2
                        );

                        let priceReduced = mathOperation(
                            convertedPrice?.amount || 0,
                            product.onSaleDiscountAmount / 100 + 1,
                            "division",
                            3
                        );

                        priceReduced = Number(priceReduced.toFixed(2));

                        return {
                            amount: priceReduced,
                            codeCurrency: convertedPrice?.codeCurrency || "CUP",
                        };
                    }
                } else {
                    let priceReduced = mathOperation(
                        variation.price.amount,
                        product.onSaleDiscountAmount / 100 + 1,
                        "division",
                        3
                    );

                    priceReduced = Number(priceReduced.toFixed(2));

                    return {
                        amount: priceReduced,
                        codeCurrency: variation.price.codeCurrency,
                    };
                }
            } else {
                if (currencyDefined) {
                    if (variation.price.codeCurrency === currencyDefined) {
                        return {
                            amount: variation.price.amount,
                            codeCurrency: variation.price.codeCurrency,
                        };
                    } else {
                        const convertedPrice = exchangeCurrency(
                            {
                                amount: variation.price.amount,
                                codeCurrency: variation.price.codeCurrency,
                            },
                            currencyDefined,
                            availableCurrencies,
                            2
                        );

                        return {
                            amount: convertedPrice?.amount || 0,
                            codeCurrency: convertedPrice?.codeCurrency || "CUP",
                        };
                    }
                } else {
                    return {
                        amount: variation.price.amount,
                        codeCurrency: variation.price.codeCurrency,
                    };
                }
            }
        }

        //In case variation has no price continue to next scenarios
    }

    //3. Analyzing by defined codeCurrency
    if (currencyDefined) {
        let foundPrice;
        if (priceSystems.length !== 0) {
            foundPrice = product.prices.find(
                item =>
                    item.codeCurrency === currencyDefined &&
                    priceSystems.includes(item.priceSystemId.toString())
            );
        } else {
            foundPrice = product.prices.find(
                item => item.codeCurrency === currencyDefined
            );
        }

        if (foundPrice) {
            if (product.onSale && product.onSaleType === "percent") {
                if (currencyDefined) {
                    if (foundPrice.codeCurrency === currencyDefined) {
                        let priceReduced = mathOperation(
                            foundPrice.price,
                            1 - product.onSaleDiscountAmount / 100,
                            "multiplication",
                            3
                        );

                        priceReduced = Number(priceReduced.toFixed(2));

                        return {
                            amount: priceReduced,
                            codeCurrency: foundPrice.codeCurrency,
                        };
                    } else {
                        const convertedPrice = exchangeCurrency(
                            {
                                amount: foundPrice.price,
                                codeCurrency: foundPrice.codeCurrency,
                            },
                            currencyDefined,
                            availableCurrencies,
                            2
                        );

                        let priceReduced = mathOperation(
                            convertedPrice?.amount || 0,
                            1 - product.onSaleDiscountAmount / 100,
                            "division",
                            3
                        );

                        priceReduced = Number(priceReduced.toFixed(2));

                        return {
                            amount: priceReduced,
                            codeCurrency: convertedPrice?.codeCurrency || "CUP",
                        };
                    }
                } else {
                    let priceReduced = mathOperation(
                        foundPrice.price,
                        1 - product.onSaleDiscountAmount / 100,
                        "multiplication",
                        3
                    );

                    priceReduced = Number(priceReduced.toFixed(2));

                    return {
                        amount: priceReduced,
                        codeCurrency: foundPrice.codeCurrency,
                    };
                }
            } else {
                if (currencyDefined) {
                    if (foundPrice.codeCurrency === currencyDefined) {
                        return {
                            amount: foundPrice.price,
                            codeCurrency: foundPrice.codeCurrency,
                        };
                    } else {
                        const convertedPrice = exchangeCurrency(
                            {
                                amount: foundPrice.price,
                                codeCurrency: foundPrice.codeCurrency,
                            },
                            currencyDefined,
                            availableCurrencies,
                            2
                        );

                        return {
                            amount: convertedPrice?.amount || 0,
                            codeCurrency: convertedPrice?.codeCurrency || "CUP",
                        };
                    }
                } else {
                    return {
                        amount: foundPrice.price,
                        codeCurrency: foundPrice.codeCurrency,
                    };
                }
            }
        }
    }

    //4. Taking main price
    const mainPrice = product.prices.find(item => item.isMain);

    if (!mainPrice) {
        return undefined;
    }

    if (product.onSale && product.onSaleType === "percent") {
        if (currencyDefined) {
            if (mainPrice.codeCurrency === currencyDefined) {
                let priceReduced = mathOperation(
                    mainPrice.price,
                    1 - product.onSaleDiscountAmount / 100,
                    "division",
                    3
                );

                priceReduced = Number(priceReduced.toFixed(2));

                return {
                    amount: priceReduced,
                    codeCurrency: mainPrice.codeCurrency,
                };
            } else {
                const convertedPrice = exchangeCurrency(
                    {
                        amount: mainPrice.price,
                        codeCurrency: mainPrice.codeCurrency,
                    },
                    currencyDefined,
                    availableCurrencies
                );

                let priceReduced = mathOperation(
                    convertedPrice?.amount || 0,
                    1 - product.onSaleDiscountAmount / 100,
                    "division",
                    3
                );

                priceReduced = Number(priceReduced.toFixed(2));

                return {
                    amount: priceReduced,
                    codeCurrency: convertedPrice?.codeCurrency || "CUP",
                };
            }
        } else {
            let priceReduced = mathOperation(
                mainPrice.price,
                1 - product.onSaleDiscountAmount / 100,
                "division",
                3
            );

            priceReduced = Number(priceReduced.toFixed(2));

            return {
                amount: priceReduced,
                codeCurrency: mainPrice.codeCurrency,
            };
        }
    }

    if (currencyDefined) {
        if (mainPrice.codeCurrency === currencyDefined) {
            return {
                amount: mainPrice.price,
                codeCurrency: mainPrice.codeCurrency,
            };
        } else {
            const convertedPrice = exchangeCurrency(
                {
                    amount: mainPrice.price,
                    codeCurrency: mainPrice.codeCurrency,
                },
                currencyDefined,
                availableCurrencies,
                2
            );

            return {
                amount: convertedPrice?.amount || 0,
                codeCurrency: convertedPrice?.codeCurrency || "CUP",
            };
        }
    } else {
        return {
            amount: mainPrice.price,
            codeCurrency: mainPrice.codeCurrency,
        };
    }
};

//Product must include: ProductPrice, onSalePrice
//Deprecated 
export const obtainingProductPriceSystemPriceDefined = (
    product: Product,
    variationId: number | undefined,
    priceSystem?: number | Array<string> | undefined,
    currencyDefined?: string | undefined,
    enforceCurrency?: boolean
): { price: number; codeCurrency: string } | undefined => {
    //1.Check if product is onSale
    if (product.onSale) {
        if (product.onSaleType === "fixed" && product.onSalePrice) {
            if (currencyDefined) {
                if (product.onSalePrice.codeCurrency === currencyDefined) {
                    return {
                        price: product.onSalePrice.amount,
                        codeCurrency: product.onSalePrice.codeCurrency,
                    };
                }
            } else if (!enforceCurrency) {
                return {
                    price: product.onSalePrice.amount,
                    codeCurrency: product.onSalePrice.codeCurrency,
                };
            }
        }
    }

    //1a) Analyzing if product is variable
    if (product.type === "VARIATION" && variationId) {
        const variation = product.variations.find(
            item => item.id === variationId
        );

        if (variation && variation.price && !enforceCurrency) {
            if (product.onSale && product.onSaleType === "percent") {
                const priceReduced = mathOperation(
                    variation.price.amount,
                    product.onSaleDiscountAmount / 100,
                    "division",
                    2
                );
                return {
                    price: priceReduced,
                    codeCurrency: variation.price.codeCurrency,
                };
            }

            return {
                price: variation.price.amount,
                codeCurrency: variation.price.codeCurrency,
            };
        }
    }

    //2a. Enforcement price
    if (enforceCurrency) {
        const price = product.prices.find(
            item => item.codeCurrency === currencyDefined
        );

        if (price) {
            if (product.onSale && product.onSaleType === "percent") {
                const priceReduced = mathOperation(
                    price.price,
                    product.onSaleDiscountAmount / 100,
                    "division",
                    2
                );
                return {
                    price: priceReduced,
                    codeCurrency: price.codeCurrency,
                };
            }

            return price;
        }
    }

    //2. If one price is defined
    if (product.prices.length === 1) {
        if (currencyDefined) {
            if (product.prices[0].codeCurrency === currencyDefined) {
                return product.prices[0];
            }
        } else {
            return product.prices[0];
        }
    }

    //3.Find in the pricesSytemDefined
    if (!Array.isArray(priceSystem)) {
        let foundPrice = product.prices.find(
            item => item.priceSystemId === priceSystem
        );

        if (foundPrice) {
            //Check if currency was defined as mandatory
            if (currencyDefined) {
                if (foundPrice.codeCurrency === currencyDefined) {
                    return foundPrice;
                }
            } else {
                return foundPrice;
            }
        }
    } else {
        let foundPrices = product.prices.filter(item =>
            priceSystem.includes(item.priceSystemId.toString())
        );

        if (foundPrices.length > 0) {
            //Check if currency was defined as mandatory
            if (currencyDefined) {
                const found = foundPrices.find(
                    item => item.codeCurrency === currencyDefined
                );
                if (found) {
                    return found;
                }
            } else {
                return foundPrices[0];
            }
        }
    }

    //4. If no found, taking principal
    let foundPrice = product.prices.find(item => item.isMain);

    if (foundPrice) {
        //Check if currency was defined as mandatory
        if (currencyDefined) {
            if (foundPrice.codeCurrency === currencyDefined) {
                return foundPrice;
            }
        } else {
            return foundPrice;
        }
    }

    //5. If no found, search a similar in the currency
    foundPrice = product.prices.find(
        item => item.codeCurrency === currencyDefined
    );

    return foundPrice;
};

export const obtainFeatureImageFromProduct = (
    product: Product
): string | null => {
    if (product.images && product.images[0]) {
        return product.images[0].thumbnail;
    }

    return null;
};

export const orderStatusTransformer = (
    action: order_status
): order_receipt_status => {
    let transformed: order_receipt_status = "PAYMENT_PENDING";

    switch (action) {
        case "processing":
            transformed = "IN_PROCESS";
            break;
        case "completed":
            transformed = "COMPLETED";
            break;
        case "cancelled":
            transformed = "CANCELLED";
            break;
        case "refunded":
            transformed = "REFUNDED";
            break;
    }

    return transformed;
};

export const orderTransformerToWoo = (
    action: order_receipt_status
): order_status => {
    let transformed: order_status = "pending";

    switch (action) {
        case "IN_PROCESS":
        case "BILLED":
            transformed = "processing";
            break;
        case "COMPLETED":
            transformed = "completed";
            break;
        case "CANCELLED":
            transformed = "cancelled";
            break;
        case "REFUNDED":
            transformed = "refunded";
            break;
    }

    return transformed;
};

export function clearHTMLToString(value: string | undefined) {
    if (!value) return "";
    let result;
    value.length > 0
        ? (result = value.replace(/(<([^>]+)>)/gi, ""))
        : (result = value);
    return result;
}
export const isUserNameValid = (username: string) => {
    /* 
      Usernames can only have: 
      - Lowercase Letters (a-z) 
      - Numbers (0-9)
      - Dots (.)
      - Underscores (_)
    */
    const res = /^[a-z0-9_\-\.]+$/.exec(username);
    return !!res;
};

export const getFullAddress = (address: Address | undefined) => {
    if (!address) return "";

    let to_return = "";

    if (address.street_1) {
        to_return += address.street_1 + " ";
    }
    if (address.street_2) {
        to_return += address.street_2 + " ";
    }
    if (address.city) {
        to_return += address.city;

        if (address.municipality || address.province || address.country) {
            to_return += ", ";
        }
    }

    if (address.municipality) {
        to_return += address.municipality.name + " ";
    }

    if (address.province) {
        to_return += address.province.name + ". ";
    }

    if (address.country) {
        to_return += address.country.name;
    }

    if (address.postalCode) {
        to_return += "(" + address.postalCode + ")";
    }

    return to_return;
};

//Deprecated
export const getPriceExchanged = (
    price: SimplePrice | ProductPrice,
    availableCurrencies: AvailableCurrency[],
    returnedCurrency?: string
): SimplePrice | null => {
    try {
        let priceReturn;
        const currencyToReturn =
            returnedCurrency ||
            availableCurrencies.find(item => item.isMain)?.currency.code;

        if (!currencyToReturn) {
            return null;
        }

        //@ts-ignore
        if (price.amount === 0 || price.price === 0) {
            return {
                amount: 0,
                codeCurrency: currencyToReturn,
            };
        }

        if ((price as SimplePrice).amount) {
            const simplePrice = price as SimplePrice;

            if (simplePrice.codeCurrency !== currencyToReturn) {
                const availableCurrency = availableCurrencies.find(
                    item => item.currency.code === simplePrice.codeCurrency
                );

                if (!availableCurrency) {
                    return null;
                }

                priceReturn = mathOperation(
                    simplePrice.amount,
                    availableCurrency.exchangeRate,
                    "multiplication",
                    2
                );

                return {
                    amount: priceReturn,
                    codeCurrency: currencyToReturn,
                };
            } else {
                return simplePrice;
            }
        } else {
            const productPrice = price as ProductPrice;

            if (productPrice.codeCurrency !== currencyToReturn) {
                const availableCurrency = availableCurrencies.find(
                    item => item.currency.code === currencyToReturn
                );

                if (!availableCurrency) {
                    return null;
                }

                priceReturn = mathOperation(
                    productPrice.price,
                    availableCurrency.exchangeRate,
                    "multiplication",
                    2
                );

                return {
                    amount: priceReturn,
                    codeCurrency: currencyToReturn,
                };
            } else {
                return {
                    amount: productPrice.price,
                    codeCurrency: currencyToReturn,
                };
            }
        }
    } catch (error) {
        return null;
    }
};

export const formatCurrency = (
    amount: number,
    currency?: string | null,
    precision: number = 2
) => {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: currency || "CUP",
        currencyDisplay: "code",
        maximumFractionDigits: precision,
    }).format(amount);
};

export const normalizingCurrenciesToMeta = (
    availableCurrencies: AvailableCurrency[]
) => {
    const exposed_data = availableCurrencies
        .filter(item => item.isActive)
        .map(item => {
            return {
                exchangeRate: item.exchangeRate,
                isMain: item.isMain,
                name: item.currency.name,
                code: item.currency.code,
            };
        });

    return exposed_data;
};

export const exchangeCurrency = (
    fromPrice: SimplePrice,
    toCurrency: string,
    availableCurrencies: AvailableCurrency[],
    precissionAfterComma?: number,
    mode?: "oficial" | "sale"
): SimplePrice | null => {
    const mainCurrency = availableCurrencies.find(item => item.isMain)!;

    try {
        const transformMode = mode ? mode : "sale";

        //1. Analyze if from is same toCurrency
        if (fromPrice.codeCurrency === toCurrency) {
            return fromPrice;
        }

        //2. If exchange is in the oposite from main currency
        if (mainCurrency.currency.code === fromPrice.codeCurrency) {
            const currency = availableCurrencies.find(
                item => item.currency.code === toCurrency
            );

            let exchangeRate = currency?.exchangeRate || 1;
            if (transformMode === "oficial") {
                exchangeRate = currency?.oficialExchangeRate || exchangeRate;
            }

            const priceReturn = mathOperation(
                fromPrice.amount,
                exchangeRate,
                "division",
                precissionAfterComma || 2
            );

            return {
                amount: priceReturn,
                codeCurrency: toCurrency,
            };
        }

        //3. If currencies from and to has no direct convertibility or currency from is main currency
        const currencyFrom = availableCurrencies.find(
            item => item.currency.code === fromPrice.codeCurrency
        );

        let exchangeRateFrom = currencyFrom?.exchangeRate || 1;
        if (transformMode === "oficial") {
            exchangeRateFrom =
                currencyFrom?.oficialExchangeRate || exchangeRateFrom;
        }

        const priceFrom = mathOperation(
            fromPrice.amount,
            exchangeRateFrom,
            "multiplication",
            precissionAfterComma || 2
        );

        const currencyTo = availableCurrencies.find(
            item => item.currency.code === toCurrency
        );

        let exchangeRateTo = currencyTo?.exchangeRate || 1;
        if (transformMode === "oficial") {
            exchangeRateTo = currencyTo?.oficialExchangeRate || exchangeRateTo;
        }

        const priceReturn = mathOperation(
            priceFrom,
            exchangeRateTo,
            "division",
            precissionAfterComma || 2
        );

        return {
            amount: priceReturn,
            codeCurrency: toCurrency,
        };
    } catch (error: any) {
        Logger.warn(
            error.toString() ||
                "Ha ocurrido un error mientras se convería a una tasa de cambio",
            {
                businessId: mainCurrency?.businessId,
            }
        );
        return null;
    }
};

export const getBaseReferenceOpenAndCloseAt = (
    business_startsat_working_hours: string,
    business_endsat_working_hours: string,
    baseReference: string
) => {
    const now = moment(baseReference, "YYYY-MM-DD").startOf("day");
    const tomorrow = moment(now).add(1, "day");

    let workStartsAt;
    let workEndsAt;

    //Clearing baseReference
    const clearBaseReference = moment(baseReference).format("YYYY-MM-DD");

    //Conditions in order to determine open and close
    if (
        Number(business_startsat_working_hours) >
        Number(business_endsat_working_hours)
    ) {
        workStartsAt = moment(
            `${clearBaseReference} ${Number(
                business_startsat_working_hours
            )}:00`
        );
        workEndsAt = moment(
            `${tomorrow.format("YYYY-MM-DD")} ${Number(
                business_endsat_working_hours
            )}:59`
        );
    } else {
        workStartsAt = moment(
            `${clearBaseReference} ${Number(
                business_startsat_working_hours
            )}:00`
        );
        workEndsAt = moment(
            `${clearBaseReference} ${Number(business_endsat_working_hours)}:59`
        );
    }

    return {
        workStartsAt,
        workEndsAt,
    };
};

interface formatDateProps {
    date: Date;
    format?: "normal" | "exstens";
    includeTime?: boolean;
}

export const formatDate = ({ date, format, includeTime }: formatDateProps) => {
    moment.locale("es");

    switch (format) {
        case "normal":
            return moment(date).format(
                `DD/M/YYYY ${includeTime ? "HH:mm:ss" : ""} `
            );
        case "exstens":
            return moment(date).format(
                `dddd D [de] MMMM [del] YYYY ${includeTime ? "HH:mm:ss" : ""} `
            );
        default:
            return moment(date).format(
                `DD/M/YYYY ${includeTime ? "HH:mm:ss" : ""} `
            );
    }
};
