import Queue from "bull";
import axios, { AxiosResponse } from "axios";
import { Op, where, fn, col, literal } from "sequelize";

import OAuth from "oauth-1.0a";
import hmacSHA1 from "crypto-js/hmac-sha1";
import Base64 from "crypto-js/enc-base64";

import { JobWooData } from "./interfaces";
import Business from "../database/models/business";
import SalesCategory from "../database/models/salesCategory";
import Product from "../database/models/product";
import ConfigurationKey from "../database/models/configurationKey";
import StockAreaProduct from "../database/models/stockAreaProduct";
import Logger from "../lib/logger";
import { checkerResponse } from "../helpers/utils";
import { Tag, WooProduct } from "../interfaces/wocoommerce";
import moment from "moment";
import SelledProduct from "../database/models/selledProduct";
import OrderReceipt from "../database/models/orderReceipt";
import Combo from "../database/models/Combo";
import { getBusinessConfigCache } from "../helpers/redisStructure";

export const wooQueue = new Queue(
    `woo-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Woo connexion
export const _getOAuth = async (businessId: number) => {
    //Obtaining configuration
    const business = await Business.findByPk(businessId);

    if (!business) {
        throw new Error("No business found");
    }

    if (
        !business.woo_ck ||
        !business.woo_sk ||
        !business.woo_apiBase ||
        !business.woo_apiVersion
    ) {
        throw new Error(
            "Existen parámetros de integración no válidos en Woocommerce."
        );
    }

    return {
        url: `${business.woo_apiBase}${business.woo_apiVersion}`,
        oAuth: new OAuth({
            consumer: {
                key: business.woo_ck,
                secret: business.woo_sk,
            },
            signature_method: "HMAC-SHA1",
            hash_function: (baseString: string, key: string) =>
                Base64.stringify(hmacSHA1(baseString, key)),
        }),
    };
};

//Axios headers
const headers = {
    Accept: "application/json",
    "User-Agent": "axios 1.2.4",
};

//Processators
wooQueue.process(async (job: Queue.Job<JobWooData>, done) => {
    try {
        switch (job.data.code) {
            case "WOO_BUSINESS_CHECKER":
                {
                    const { businessId } = job.data.params;

                    //Analyzing all the products in system
                    const products = await Product.scope("to_return").findAll({
                        where: {
                            businessId,
                            visibleOnline: true,
                        },
                    });

                    const DAYS_QUANTITY = 7;

                    const current_day = moment().endOf("day");
                    const from = moment(current_day)
                        .subtract(DAYS_QUANTITY, "days")
                        .startOf("day");
                    const most_selled = await SelledProduct.findAll({
                        attributes: [
                            "productId",
                            [fn("sum", col("quantity")), "totalSale"],
                        ],
                        include: [
                            {
                                model: OrderReceipt,
                                as: "orderReceipt",
                                where: {
                                    businessId,
                                    createdAt: {
                                        [Op.gte]: moment(
                                            from,
                                            "YYYY-MM-DD HH:mm"
                                        ).format("YYYY-MM-DD HH:mm:ss"),
                                        [Op.lte]: moment(
                                            current_day,
                                            "YYYY-MM-DD HH:mm"
                                        ).format("YYYY-MM-DD HH:mm:ss"),
                                    },
                                    status: {
                                        [Op.not]: ["CANCELLED", "REFUNDED"],
                                    },
                                },
                                attributes: [],
                            },
                        ],
                        group: ["productId"],
                        limit: DAYS_QUANTITY,
                        order: [[col("totalSale"), "DESC"]],
                    });

                    for (const product of products) {
                        let listTagsToInclude = [];
                        const foundMostSelled = most_selled.find(
                            item => item.productId === product.id
                        );
                        if (foundMostSelled) {
                            listTagsToInclude.push("alta-demanda");
                        }

                        wooQueue.add(
                            {
                                code: "UPDATE_PRODUCT_ATTRIBUTES",
                                params: {
                                    businessId,
                                    product,
                                    updatePreviousTags: true,
                                    includeTags: listTagsToInclude,
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
                }
                break;
            case "CREATE_CATEGORY":
                {
                    const { businessId, salesCategory } = job.data.params;

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products/categories`;

                    let body: any = {
                        name: salesCategory.name,
                        description: salesCategory.description,
                    };

                    if (salesCategory.image) {
                        body.image = {
                            src: salesCategory.image.src,
                        };
                    }

                    axios
                        .post(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "POST",
                            }),
                            headers,
                        })
                        .then(async (response: AxiosResponse) => {
                            await SalesCategory.update(
                                {
                                    externalId: response.data.id,
                                },
                                {
                                    where: {
                                        id: salesCategory.id,
                                    },
                                }
                            );
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "UPDATE_CATEGORY":
                {
                    const { businessId, salesCategory } = job.data.params;

                    const fullCategory = await SalesCategory.findByPk(
                        salesCategory.id
                    );

                    if (!fullCategory || !fullCategory.externalId) {
                        done(
                            new Error(
                                "La categoría no tiene referencia con la Tienda online."
                            )
                        );
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products/categories/${fullCategory?.externalId}`;

                    let body: any = {
                        name: salesCategory.name,
                        description: salesCategory.description,
                    };

                    if (salesCategory.image) {
                        body.image = {
                            src: salesCategory.image.src,
                        };
                    }

                    axios
                        .put(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "PUT",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    if (!salesCategory.visibleOnline) {
                        await SalesCategory.update(
                            {
                                externalId: null,
                            },
                            {
                                where: {
                                    id: salesCategory.id,
                                },
                            }
                        );
                    }

                    done();
                }
                break;
            case "DELETE_CATEGORY":
                {
                    const { businessId, salesCategory } = job.data.params;

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products/categories/${salesCategory?.externalId}?force=true`;

                    axios
                        .delete(url, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "DELETE",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "CREATE_PRODUCT":
                {
                    const {
                        product,
                        businessId,
                    }: { product: Product; businessId: number } =
                        job.data.params;

                    if (
                        ![
                            "MENU",
                            "ADDON",
                            "SERVICE",
                            "STOCK",
                            "COMBO",
                        ].includes(product.type)
                    ) {
                        done();
                        return;
                    }

                    //Obtatining configurations
                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    //Taking first position by default Woo
                    const online_shop_main_currency = configurations
                        .find(item => item.key === "online_shop_main_currency")
                        ?.value.split(",")[0];
                    const online_shop_price_system = configurations
                        .find(item => item.key === "online_shop_price_system")
                        ?.value.split(",")[0];

                    const online_shop_area_stock = configurations.find(
                        item => item.key === "online_shop_area_stock"
                    )?.value;
                    const isWooActive =
                        configurations.find(
                            item => item.key === "module_woocommerce"
                        )?.value === "true";

                    if (!isWooActive) {
                        Logger.warn("El negocio no tiene activo WooCommerce", {
                            businessId,
                        });
                        done();
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products`;

                    let foundPrice;
                    //1.Find in the pricessytemDefined
                    foundPrice = product.prices.find(
                        item =>
                            item.priceSystemId ===
                            Number(online_shop_price_system)
                    );

                    //2. If no found, search a similar in the currency
                    if (!foundPrice) {
                        foundPrice = product.prices.find(
                            item =>
                                item.codeCurrency === online_shop_main_currency
                        );
                    }

                    if (!foundPrice) {
                        Logger.error(
                            "La precio no esta disponible como válido para la Tienda online.",
                            { url, businessId }
                        );
                        done(
                            new Error(
                                "La precio no esta disponible como válido para la Tienda online."
                            )
                        );
                        return;
                    }

                    //-> FINDING PRODUCT IN STOCK
                    let quantity = product.totalQuantity;
                    if (product.type === "STOCK") {
                        const stockProduct = await StockAreaProduct.findOne({
                            where: {
                                productId: product.id,
                                areaId: online_shop_area_stock,
                            },
                        });

                        if (stockProduct) {
                            quantity = stockProduct.quantity;
                        } else {
                            quantity = 0;
                        }
                    }
                    // -> ENDING FINDING PRODUCT IN STOCK

                    let body: any = {
                        name: product.name,
                        type: "simple",
                        status: "publish",
                        featured: product.suggested,
                        description: product.description,
                        regular_price: foundPrice.price.toString(),
                        manage_stock: product.stockLimit,
                        stock_quantity: quantity,
                        stock_status: quantity === 0 ? "outofstock" : "instock",
                    };

                    //Analyzing status if showWhenOutStock
                    if (
                        quantity === 0 &&
                        !(product as Product).showWhenOutStock
                    ) {
                        body.status = "pending";
                    }

                    if (
                        product.salesCategory &&
                        product.salesCategory.externalId
                    ) {
                        body.categories = [
                            {
                                id: product.salesCategory.externalId,
                            },
                        ];
                    }

                    if (product.images?.length !== 0) {
                        body.images = product.images?.map(item => {
                            return {
                                src: item.src,
                            };
                        });
                    }

                    //Analyzing if product is onSale
                    if (product.onSale) {
                        if (
                            product.onSalePrice.codeCurrency ===
                            online_shop_main_currency
                        ) {
                            body.on_sale = true;
                            body.sale_price =
                                product.onSalePrice.amount.toString();
                        }
                    } else {
                        body.on_sale = false;
                        body.sale_price = "";
                    }

                    await axios
                        .post(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "POST",
                            }),
                            headers,
                        })
                        .then(async (response: AxiosResponse) => {
                            await Product.update(
                                {
                                    externalId: response.data.id,
                                },
                                {
                                    where: {
                                        id: product.id,
                                    },
                                }
                            );
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "UPDATE_PRODUCT":
                {
                    const {
                        product,
                        businessId,
                        imagesToUpdate,
                    }: {
                        product: Product;
                        businessId: number;
                        imagesToUpdate: Array<number>;
                    } = job.data.params;

                    //General validations
                    if (
                        ![
                            "MENU",
                            "ADDON",
                            "SERVICE",
                            "STOCK",
                            "COMBO",
                        ].includes(product.type)
                    ) {
                        done();
                        return;
                    }

                    if (!product.externalId) {
                        done(
                            new Error(
                                "El producto no fue encontrado en la Tienda online."
                            )
                        );
                        return;
                    }

                    //Obtatining configurations
                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    //Taking first position by default Woo
                    const online_shop_main_currency = configurations
                        .find(item => item.key === "online_shop_main_currency")
                        ?.value.split(",")[0];
                    const online_shop_price_system = configurations
                        .find(item => item.key === "online_shop_price_system")
                        ?.value.split(",")[0];

                    const online_shop_area_stock = configurations.find(
                        item => item.key === "online_shop_area_stock"
                    )?.value;

                    const isWooActive =
                        configurations.find(
                            item => item.key === "module_woocommerce"
                        )?.value === "true";

                    if (!isWooActive) {
                        Logger.warn("El negocio no tiene activo WooCommerce", {
                            businessId,
                        });
                        done();
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    let url = `${authorization.url}/products/${product.externalId}`;

                    //-> OBTAINING PRICE
                    let foundPrice;
                    //1.Find in the pricessytemDefined
                    foundPrice = product.prices.find(
                        item =>
                            item.priceSystemId ===
                            Number(online_shop_price_system)
                    );

                    //2. If no found, search a similar in the currency
                    if (!foundPrice) {
                        foundPrice = product.prices.find(
                            item =>
                                item.codeCurrency === online_shop_main_currency
                        );
                    }

                    if (!foundPrice) {
                        Logger.error(
                            "La precio no esta disponible como válido para la Tienda online.",
                            { url, businessId }
                        );
                        done(
                            new Error(
                                "La precio no esta disponible como válido para la Tienda online."
                            )
                        );
                        return;
                    }
                    //-> END OBTAINING PRICE

                    //-> FINDING PRODUCT IN STOCK
                    let quantity = product.totalQuantity;
                    if (product.type === "STOCK") {
                        const stockProduct = await StockAreaProduct.findOne({
                            where: {
                                productId: product.id,
                                areaId: online_shop_area_stock,
                            },
                        });

                        if (stockProduct) {
                            quantity = stockProduct.quantity;
                        } else {
                            quantity = 0;
                        }
                    }
                    // -> ENDING FINDING PRODUCT IN STOCK

                    let body: any = {
                        name: product.name,
                        type: "simple",
                        status: product.visibleOnline ? "publish" : "pending",
                        featured: product.suggested,
                        description: product.description,
                        regular_price: foundPrice.price.toString(),
                        manage_stock: product.stockLimit,
                        stock_quantity: quantity,
                        stock_status: quantity === 0 ? "outofstock" : "instock",
                    };

                    //Analyzing status if showWhenOutStock
                    if (
                        quantity === 0 &&
                        !(product as Product).showWhenOutStock
                    ) {
                        body.status = "pending";
                    }

                    if (
                        product.salesCategory &&
                        product.salesCategory.externalId
                    ) {
                        body.categories = [
                            {
                                id: product.salesCategory.externalId,
                            },
                        ];
                    }

                    if (product.images?.length !== 0) {
                        const bulkInsert = product.images?.filter(item =>
                            imagesToUpdate.includes(item.id)
                        );
                        if (bulkInsert?.length !== 0) {
                            body.images = bulkInsert?.map(item => {
                                return {
                                    src: item.src,
                                };
                            });
                        }
                    } else {
                        body.images = [];
                    }

                    //Analyzing if product is onSale
                    if (product.onSale) {
                        if (
                            product.onSalePrice.codeCurrency ===
                            online_shop_main_currency
                        ) {
                            body.on_sale = true;
                            body.sale_price =
                                product.onSalePrice.amount.toString();
                        }
                    } else {
                        body.on_sale = false;
                        body.sale_price = "";
                    }

                    await axios
                        .put(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "PUT",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    wooQueue.add(
                        {
                            code: "UPDATE_PRODUCT_ATTRIBUTES",
                            params: {
                                businessId,
                                product,
                                updatePreviousTags: false,
                                includeTags: [],
                            },
                        },
                        {
                            attempts: 2,
                            removeOnComplete: true,
                            removeOnFail: true,
                        }
                    );

                    done();
                }
                break;
            case "UPDATE_PRODUCT_ATTRIBUTES":
                {
                    const {
                        product,
                        businessId,
                        updatePreviousTags,
                        includeTags,
                    }: {
                        product: Product;
                        businessId: number;
                        updatePreviousTags: boolean;
                        includeTags: Array<string>;
                    } = job.data.params;

                    //General validations
                    if (
                        ![
                            "MENU",
                            "ADDON",
                            "SERVICE",
                            "STOCK",
                            "COMBO",
                        ].includes(product.type)
                    ) {
                        done();
                        return;
                    }

                    if (!product.externalId) {
                        done(
                            new Error(
                                "El producto no fue encontrado en la Tienda online."
                            )
                        );
                        return;
                    }

                    //Obtatining configurations
                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    const isWooActive =
                        configurations.find(
                            item => item.key === "module_woocommerce"
                        )?.value === "true";

                    if (!isWooActive) {
                        done();
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);

                    const response: any = await axios
                        .get(
                            `${authorization.url}/products/${product.externalId}`,
                            {
                                params: authorization.oAuth.authorize({
                                    url: `${authorization.url}/products/${product.externalId}`,
                                    method: "GET",
                                }),
                                headers,
                            }
                        )
                        .catch(error => {
                            console.log({
                                url: `${authorization.url}/products/${product.externalId}`,
                                error: error.toString(),
                            });
                            Logger.error(error.toString(), {
                                url: `${authorization.url}/products/${product.externalId}`,
                                businessId,
                            });
                        });

                    if (!checkerResponse(response)) {
                        done();
                        return;
                    }

                    const wooProduct: WooProduct = response.data;

                    const url = `${authorization.url}/products/${product.externalId}`;
                    let body: any = {
                        status: product.visibleOnline ? "publish" : "pending",
                    };

                    //1. Analyzing if new arrival
                    let meta_data = [...wooProduct.meta_data].filter(
                        item =>
                            item.key !== "_woodmart_new_label" &&
                            item.key !== "_woodmart_new_label_date"
                    );
                    meta_data.push(
                        {
                            key: "_woodmart_new_label",
                            value: product.newArrival ? "on" : "",
                        },
                        {
                            key: "_woodmart_new_label_date",
                            value:
                                product.newArrival && product.newArrivalAt
                                    ? moment(product.newArrivalAt).format(
                                          "YYYY-MM-DD"
                                      )
                                    : "",
                        }
                    );
                    body.meta_data = meta_data;

                    //2.Analyzing tags
                    if (updatePreviousTags) {
                        const response_2: any = await axios
                            .get(`${authorization.url}/products/tags`, {
                                params: authorization.oAuth.authorize({
                                    url: `${authorization.url}/products/tags`,
                                    method: "GET",
                                }),
                                headers,
                            })
                            .catch(error => {
                                console.log({ url, error: error.toString() });
                                Logger.error(error.toString(), {
                                    url,
                                    businessId,
                                });
                            });

                        if (!checkerResponse(response_2)) {
                            done();
                            return;
                        }

                        const wooTags: Array<Tag> = response_2.data;

                        let listBulkTag = [];
                        for (const tag of includeTags) {
                            const foundTag = wooTags.find(
                                item => item.slug === tag
                            );

                            if (foundTag) {
                                listBulkTag.push({
                                    id: foundTag.id,
                                });
                            }
                        }

                        body.tags = listBulkTag;
                    }

                    await axios
                        .put(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "PUT",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "UPDATE_PRODUCT_STOCK_QUANTITIES":
                {
                    const {
                        productsIds,
                        businessId,
                    }: { productsIds: Array<number>; businessId: number } =
                        job.data.params;

                    //Obtatining configurations
                    const configurations = await getBusinessConfigCache(
                        businessId
                    );

                    const online_shop_area_stock = configurations.find(
                        item => item.key === "online_shop_area_stock"
                    )?.value;
                    const isWooActive =
                        configurations.find(
                            item => item.key === "module_woocommerce"
                        )?.value === "true";

                    if (!isWooActive) {
                        done();
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products/batch`;

                    let foundProducts = await Product.findAll({
                        where: {
                            id: productsIds,
                            type: [
                                "STOCK",
                                "MENU",
                                "ADDON",
                                "SERVICE",
                                "VARIATION",
                                "COMBO",
                            ],
                        },
                        include: [StockAreaProduct],
                    });

                    if (
                        foundProducts.filter(item => item.type === "COMBO")
                            .length !== 0
                    ) {
                        const comboProductos = await Product.findAll({
                            where: {
                                id: foundProducts
                                    .filter(item => item.type === "COMBO")
                                    .map(item => item.id),
                            },
                            include: [
                                {
                                    model: Combo,
                                    as: "compositions",
                                },
                            ],
                        });

                        let compositionsIds = [];
                        for (const combo of comboProductos) {
                            compositionsIds.push(
                                ...combo.compositions.map(
                                    item => item.composedId
                                )
                            );
                        }

                        const nextfoundProducts = await Product.findAll({
                            where: {
                                id: compositionsIds,
                                type: [
                                    "STOCK",
                                    "MENU",
                                    "ADDON",
                                    "SERVICE",
                                    "VARIATION",
                                    "COMBO",
                                ],
                            },
                            include: [StockAreaProduct],
                        });

                        foundProducts.push(...nextfoundProducts);
                    }

                    let update = [];
                    for (const product of foundProducts) {
                        if (product.type === "STOCK") {
                            const found = product.stockAreaProducts?.find(
                                item =>
                                    item.areaId ===
                                    Number(online_shop_area_stock)
                            );

                            if (found) {
                                update.push({
                                    id: product.externalId,
                                    stock_quantity: found.quantity,
                                    stock_status:
                                        found.quantity > 0
                                            ? "instock"
                                            : "outofstock",
                                });
                            } else {
                                update.push({
                                    id: product.externalId,
                                    stock_quantity: 0,
                                    stock_status: "outofstock",
                                });
                            }
                        } else {
                            update.push({
                                id: product.externalId,
                                stock_quantity: product.totalQuantity,
                                stock_status:
                                    product.totalQuantity > 0 ||
                                    !product.stockLimit
                                        ? "instock"
                                        : "outofstock",
                            });
                        }
                    }

                    axios
                        .post(
                            url,
                            {
                                update,
                            },
                            {
                                params: authorization.oAuth.authorize({
                                    url,
                                    method: "POST",
                                }),
                                headers,
                            }
                        )
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "DELETE_PRODUCT":
                {
                    const {
                        externalId,
                        businessId,
                    }: {
                        productId: number;
                        externalId: number;
                        businessId: number;
                    } = job.data.params;

                    if (!externalId) {
                        done(
                            new Error("No se recibió el parámetro externalId.")
                        );
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/products/${externalId}`;

                    axios
                        .delete(url, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "DELETE",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
            case "EDIT_ORDER":
                {
                    const {
                        body,
                        externalId,
                        businessId,
                    }: {
                        body: Object;
                        externalId: number;
                        businessId: number;
                    } = job.data.params;

                    if (!externalId) {
                        done(
                            new Error(
                                "El parámetro externalId no fue proporcionado."
                            )
                        );
                        return;
                    }

                    //Making request
                    const authorization = await _getOAuth(businessId);
                    const url = `${authorization.url}/orders/${externalId}`;

                    axios
                        .put(url, body, {
                            params: authorization.oAuth.authorize({
                                url,
                                method: "PUT",
                            }),
                            headers,
                        })
                        .catch(error => {
                            console.log({ url, error: error.toString() });
                            Logger.error(error.toString(), { url, businessId });
                        });

                    done();
                }
                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
