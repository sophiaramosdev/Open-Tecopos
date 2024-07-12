import Queue from "bull";
import { Op } from "sequelize";

import { SocketData } from "./interfaces";
import StockAreaProduct from "../database/models/stockAreaProduct";
import Product from "../database/models/product";
import Area from "../database/models/area";
import { productQueue } from "./product";
import AccessPointTicket from "../database/models/accessPointTicket";
import OrderReceipt from "../database/models/orderReceipt";
import Resource from "../database/models/resource";
import ProductionTicket from "../database/models/productionTicket";
import SelledProduct from "../database/models/selledProduct";
import SelledProductAddon from "../database/models/selledProductAddon";
import Dispatch from "../database/models/dispatch";
import Logger from "../lib/logger";
import { getAreaCache } from "../helpers/redisStructure";

export const socketQueue = new Queue(
    `socket-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
socketQueue.process(async (job: Queue.Job<SocketData>, done) => {
    try {
        switch (job.data.code) {
            case "NEW_BULK_ENTRY":
                {
                    const {
                        stockAreaId,
                        products,
                        businessId,
                        from,
                        fromName,
                        origin,
                        costMustBePropagated,
                    } = job.data.params;

                    //Preparing data to emit via sockets
                    const products_to_emit_to_sales =
                        await StockAreaProduct.findAll({
                            where: {
                                areaId: stockAreaId,
                            },
                            include: [
                                {
                                    model: Product.scope("to_return"),
                                    where: {
                                        type: ["STOCK", "VARIATION"],
                                        showForSale: true,
                                        id: products.map(
                                            (item: any) => item.productId
                                        ),
                                        totalQuantity: {
                                            [Op.gt]: 0,
                                        },
                                    },
                                },
                            ],
                        });

                    const products_to_emit_to_stock =
                        await StockAreaProduct.scope("to_stock").findAll({
                            where: {
                                areaId: stockAreaId,
                                productId: products.map(
                                    (item: any) => item.productId
                                ),
                            },
                        });

                    const productsForSale = products_to_emit_to_sales.map(
                        stap => {
                            const findQuantity =
                                products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;

                            return {
                                //@ts-ignore
                                ...stap.product.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                                areaId: stap.areaId,
                            };
                        }
                    );

                    const productsForStock = products_to_emit_to_stock.map(
                        stap => {
                            const findQuantity =
                                products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;
                            return {
                                //@ts-ignore
                                ...stap.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                            };
                        }
                    );

                    //Finding all salesArea associated to the stock
                    const areaSales = await Area.findAll({
                        where: {
                            type: "SALE",
                            businessId,
                            stockAreaId,
                        },
                    });

                    if (costMustBePropagated) {
                        //Propagate cost
                        products.forEach((item: any) => {
                            productQueue.add(
                                {
                                    code: "PROPAGATE_COST",
                                    params: {
                                        productId: item.productId,
                                        businessId,
                                    },
                                },
                                {
                                    attempts: 2,
                                    removeOnComplete: true,
                                    removeOnFail: true,
                                }
                            );
                        });
                    }

                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("products/bulkEntry", {
                            data: {
                                productsForSale,
                                productsForStock,
                            },
                            areaSales: areaSales.map(item => item.id),
                            stockAreaId,
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;
            case "BULK_OUT":
                {
                    const {
                        stockAreaId,
                        products,
                        businessId,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    const found_products = await Product.findAll({
                        where: {
                            id: products.map((item: any) => item.productId),
                        },
                    });

                    const forSaleType = [
                        "MENU",
                        "STOCK",
                        "COMBO",
                        "VARIATION",
                        "SERVICE",
                        "ADDON",
                    ];
                    let productsForSale = [];
                    for (const product of found_products) {
                        if (forSaleType.includes(product.type)) {
                            const found = products.find(
                                (item: any) => item.productId === product.id
                            );
                            found && productsForSale.push(found);
                        }
                    }

                    //Finding all salesArea associated to the stock
                    const areaSales = await Area.findAll({
                        where: {
                            type: "SALE",
                            businessId,
                            stockAreaId,
                        },
                    });

                    //Emiting via sockets
                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("productForSale/bulkDelete", {
                            data: {
                                productsForSale,
                                productsForStock: products,
                            },
                            areaSales: areaSales.map(item => item.id),
                            stockAreaId: Number(stockAreaId),
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;
            case "PROCESS_PRODUCTS_IN_ORDER":
                {
                    const {
                        order,
                        productsAdded,
                        productsDeleted,
                        newOrder,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    //Finding all salesArea associated to the stock
                    const areaSale = await getAreaCache(order.areaSales.id);

                    //Obtaining free resources
                    const freeResources = await Resource.scope(
                        "to_return"
                    ).findAll({
                        where: {
                            areaId: order.areaSales.id,
                            isAvailable: true,
                            isReservable: true,
                        },
                    });

                    //Emiting via sockets
                    if (areaSale) {
                        (global as any).socket
                            .to(`business:${order.businessId}`)
                            .emit("order/processProducts", {
                                data: {
                                    order,
                                    freeResources,
                                    productsAdded,
                                    productsDeleted,
                                },
                                areaId: order.areaSales.id,
                                stockAreaId: areaSale.stockAreaId,
                                newOrder,
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "BULK_MOVEMENT_OUT":
                {
                    const {
                        stockAreaId,
                        products,
                        businessId,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    const found_products = await Product.findAll({
                        where: {
                            id: products.map((item: any) => item.productId),
                        },
                    });

                    const forSaleType = [
                        "MENU",
                        "STOCK",
                        "COMBO",
                        "VARIATION",
                        "SERVICE",
                        "ADDON",
                    ];
                    let productsForSale = [];
                    for (const product of found_products) {
                        if (forSaleType.includes(product.type)) {
                            const found = products.find(
                                (item: any) => item.productId === product.id
                            );
                            found && productsForSale.push(found);
                        }
                    }

                    //Finding all salesArea associated to the stock
                    const areaSales = await Area.findAll({
                        where: {
                            type: "SALE",
                            businessId,
                            stockAreaId,
                        },
                    });

                    //Emiting via sockets
                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("products/bulkMovementOut", {
                            data: {
                                productsForSale,
                                productsForStock: products,
                            },
                            areaSales: areaSales.map(item => item.id),
                            stockAreaId: Number(stockAreaId),
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "PROCESS_A_FAST_SALE":
                {
                    const {
                        order,
                        selledProducts,
                        businessId,
                        addons,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    const productToRemove = [
                        ...selledProducts.map((item: any) => {
                            return {
                                quantity: item.quantity,
                                productId: item.productId,
                            };
                        }),
                        ...addons.map((item: any) => {
                            return {
                                quantity: item.removedQuantity,
                                productId: item.id,
                            };
                        }),
                    ];

                    //Finding all salesArea associated to the stock
                    const area = await getAreaCache(order.areaSales.id);

                    if (!area) {
                        done();
                        return;
                    }

                    //Obtaining free resources
                    const freeResources = await Resource.scope(
                        "to_return"
                    ).findAll({
                        where: {
                            areaId: order.areaSales.id,
                            isAvailable: true,
                            isReservable: true,
                        },
                    });

                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("order/add", {
                            data: {
                                order,
                                productsForSale: productToRemove,
                                productsForStock: productToRemove,
                                freeResources,
                            },
                            areaId: order.areaSales.id,
                            stockAreaId: area.stockAreaId,
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "MANUFACTURER_STOCK_MOVEMENT_DELETE":
                {
                    const { movement, area, from, fromName, origin } =
                        job.data.params;

                    const manufacturerConnectedAreas = await Area.findAll({
                        where: {
                            businessId: area.businessId,
                            initialStockId: area.endStockId,
                            type: "MANUFACTURER",
                        },
                    });

                    (global as any).socket
                        .to(`business:${area.businessId}`)
                        .emit("manufacturerArea/stockMovement/delete", {
                            data: movement,
                            manufacturerAreas: manufacturerConnectedAreas.map(
                                item => {
                                    return {
                                        id: item.id,
                                        productionMode: item.productionMode,
                                    };
                                }
                            ),
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "MANUFACTURER_STOCK_MOVEMENT_ADD":
                {
                    const {
                        stock_movement,
                        stock_product,
                        area,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    const manufacturerConnectedAreas = await Area.findAll({
                        where: {
                            businessId: area.businessId,
                            initialStockId: area.endStockId,
                            type: "MANUFACTURER",
                        },
                    });

                    (global as any).socket
                        .to(`business:${area.businessId}`)
                        .emit("manufacturerArea/stockMovement/add", {
                            data: {
                                stock_movement,
                                stock_product,
                            },
                            manufacturerAreas: manufacturerConnectedAreas.map(
                                item => {
                                    return {
                                        id: item.id,
                                        productionMode: item.productionMode,
                                    };
                                }
                            ),
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "NEW_DISPATCH":
                {
                    const { dispatchId, from, fromName, origin } =
                        job.data.params;

                    const dispatch = await Dispatch.scope("to_return").findByPk(
                        dispatchId
                    );

                    if (!dispatch) {
                        done();
                        return;
                    }

                    //Finding all salesArea associated to the stock
                    const notificationAreas = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "SALE",
                                    stockAreaId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaTo.id,
                                },
                            ],
                        },
                    });

                    const allBusinessToAlert = Array.from(
                        new Set([
                            ...notificationAreas.map(item => item.businessId),
                        ])
                    );

                    for (const businessId of allBusinessToAlert) {
                        (global as any).socket
                            .to(`business:${businessId}`)
                            .emit("dispatch/received", {
                                notificationAreasTo: notificationAreas.map(
                                    item => item.id
                                ),
                                data: dispatch,
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "ACCEPT_DISPATCH":
                {
                    const { dispatchId, from, fromName, origin } =
                        job.data.params;

                    const dispatch = await Dispatch.scope("to_return").findByPk(
                        dispatchId
                    );

                    if (!dispatch) {
                        done();
                        return;
                    }

                    const [
                        products_to_emit_to_sales,
                        products_to_emit_to_stock,
                    ] = await Promise.all([
                        StockAreaProduct.findAll({
                            where: {
                                areaId: dispatch.stockAreaTo.id,
                            },
                            include: [
                                {
                                    model: Product.scope("to_return"),
                                    where: {
                                        type: ["STOCK", "VARIATION"],
                                        showForSale: true,
                                        id: dispatch.products.map(
                                            item => item.productId
                                        ),
                                        totalQuantity: {
                                            [Op.gt]: 0,
                                        },
                                    },
                                },
                            ],
                        }),
                        StockAreaProduct.scope("to_stock").findAll({
                            where: {
                                areaId: dispatch.stockAreaTo.id,
                                productId: dispatch.products.map(
                                    item => item.productId
                                ),
                            },
                        }),
                    ]);

                    const productsForSale = products_to_emit_to_sales.map(
                        stap => {
                            const findQuantity =
                                dispatch.products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;

                            return {
                                //@ts-ignore
                                ...stap.product.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                                areaId: stap.areaId,
                            };
                        }
                    );

                    const productsForStock = products_to_emit_to_stock.map(
                        stap => {
                            const findQuantity =
                                dispatch.products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;
                            return {
                                //@ts-ignore
                                ...stap.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                            };
                        }
                    );

                    //Finding all salesArea associated to the stock
                    const notificationAreasTo = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "SALE",
                                    stockAreaId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaTo.id,
                                },
                            ],
                        },
                    });

                    const notificationAreasFrom = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaFrom.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaFrom.id,
                                },
                            ],
                        },
                    });

                    const allBusinessToAlert = Array.from(
                        new Set([
                            ...notificationAreasTo.map(item => item.businessId),
                            ...notificationAreasFrom.map(
                                item => item.businessId
                            ),
                        ])
                    );

                    for (const businessId of allBusinessToAlert) {
                        (global as any).socket
                            .to(`business:${businessId}`)
                            .emit("dispatch/accepted", {
                                notificationAreasTo: notificationAreasTo.map(
                                    item => item.id
                                ),
                                notificationAreasFrom:
                                    notificationAreasFrom.map(item => item.id),
                                data: {
                                    dispatch,
                                    productsForSale,
                                    productsForStock,
                                },
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "UPDATE_DISPATCH":
                {
                    const { dispatchId, from, fromName, origin } =
                        job.data.params;

                    const dispatch = await Dispatch.scope("to_return").findByPk(
                        dispatchId
                    );

                    if (!dispatch) {
                        done();
                        return;
                    }

                    const notificationAreasTo = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaTo.id,
                                },
                            ],
                        },
                    });

                    const notificationAreasFrom = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaFrom.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaFrom.id,
                                },
                            ],
                        },
                    });

                    const allBusinessToAlert = Array.from(
                        new Set([
                            ...notificationAreasTo.map(item => item.businessId),
                            ...notificationAreasFrom.map(
                                item => item.businessId
                            ),
                        ])
                    );

                    for (const businessId of allBusinessToAlert) {
                        (global as any).socket
                            .to(`business:${businessId}`)
                            .emit("dispatch/update", {
                                notificationAreasTo: notificationAreasTo.map(
                                    item => item.id
                                ),
                                notificationAreasFrom:
                                    notificationAreasFrom.map(item => item.id),
                                data: {
                                    dispatch,
                                },
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;
            case "REJECT_DISPATCH":
                {
                    const { dispatchId, from, fromName, origin } =
                        job.data.params;

                    const dispatch = await Dispatch.scope("to_return").findByPk(
                        dispatchId
                    );

                    if (!dispatch) {
                        done();
                        return;
                    }

                    const [
                        products_to_emit_to_sales,
                        products_to_emit_to_stock,
                    ] = await Promise.all([
                        StockAreaProduct.findAll({
                            where: {
                                areaId: dispatch.stockAreaFrom.id,
                            },
                            include: [
                                {
                                    model: Product.scope("to_return"),
                                    where: {
                                        type: ["STOCK", "VARIATION"],
                                        showForSale: true,
                                        id: dispatch.products.map(
                                            item => item.productId
                                        ),
                                        totalQuantity: {
                                            [Op.gt]: 0,
                                        },
                                    },
                                },
                            ],
                        }),
                        StockAreaProduct.scope("to_stock").findAll({
                            where: {
                                areaId: dispatch.stockAreaFrom.id,
                                productId: dispatch.products.map(
                                    item => item.productId
                                ),
                            },
                        }),
                    ]);

                    const productsForSale = products_to_emit_to_sales.map(
                        stap => {
                            const findQuantity =
                                dispatch.products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;

                            return {
                                //@ts-ignore
                                ...stap.product.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                                areaId: stap.areaId,
                            };
                        }
                    );

                    const productsForStock = products_to_emit_to_stock.map(
                        stap => {
                            const findQuantity =
                                dispatch.products.find(
                                    (item: any) =>
                                        item.productId === stap.productId
                                )?.quantity || 0;
                            return {
                                //@ts-ignore
                                ...stap.dataValues,
                                quantity: stap.quantity,
                                extraQuantity: findQuantity,
                            };
                        }
                    );

                    //Finding all salesArea associated to the stock
                    const notificationAreasTo = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "SALE",
                                    stockAreaId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaTo.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaTo.id,
                                },
                            ],
                        },
                    });

                    const notificationAreasFrom = await Area.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    type: "MANUFACTURER",
                                    initialStockId: dispatch.stockAreaFrom.id,
                                },
                                {
                                    type: "STOCK",
                                    id: dispatch.stockAreaFrom.id,
                                },
                            ],
                        },
                    });

                    const allBusinessToAlert = Array.from(
                        new Set([
                            ...notificationAreasTo.map(item => item.businessId),
                            ...notificationAreasFrom.map(
                                item => item.businessId
                            ),
                        ])
                    );

                    for (const businessId of allBusinessToAlert) {
                        (global as any).socket
                            .to(`business:${businessId}`)
                            .emit("dispatch/rejected", {
                                notificationAreasTo: notificationAreasTo.map(
                                    item => item.id
                                ),
                                notificationAreasFrom:
                                    notificationAreasFrom.map(item => item.id),
                                data: {
                                    dispatch,
                                    productsForSale,
                                    productsForStock,
                                },
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "UPDATE_ORDER":
                {
                    const { order, from, fromName, origin } = job.data.params;

                    //Obtaining free resources
                    const freeResources = await Resource.scope(
                        "to_return"
                    ).findAll({
                        where: {
                            areaId: order.areaSales?.id,
                            isAvailable: true,
                            isReservable: true,
                        },
                    });

                    (global as any).socket
                        .to(`business:${order.businessId}`)
                        .emit("order/update", {
                            data: {
                                order,
                                freeResources,
                            },
                            areaId: order.areaSales?.id,
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "JOIN_ORDERS":
                {
                    const { baseOrder, orderToJoin, from, fromName, origin } =
                        job.data.params;

                    (global as any).socket
                        .to(`business:${baseOrder.businessId}`)
                        .emit("order/join", {
                            data: {
                                baseOrder,
                                orderToJoin,
                            },
                            areaId: baseOrder.areaSales.id,
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "MOVE_ORDER_BETWEEN_AREAS":
                {
                    const {
                        order,
                        areaFrom,
                        areaToId,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    //Obtaining free resources
                    const freeResources = await Resource.scope(
                        "to_return"
                    ).findAll({
                        where: {
                            areaId: order.areaSales.id,
                            isAvailable: true,
                            isReservable: true,
                        },
                    });

                    (global as any).socket
                        .to(`business:${order.businessId}`)
                        .emit("order/movement/external", {
                            data: {
                                order,
                                freeResources,
                                areaFrom,
                            },
                            areaId: Number(areaToId),
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "CANCEL_ORDER":
                {
                    const { order, productsDeleted, from, fromName, origin } =
                        job.data.params;

                    //Obtaining free resources
                    const freeResources = await Resource.scope(
                        "to_return"
                    ).findAll({
                        where: {
                            areaId: order.areaSales.id,
                            isAvailable: true,
                            isReservable: true,
                        },
                    });

                    const areaSale = await getAreaCache(order.areaSales.id);

                    if (areaSale) {
                        (global as any).socket
                            .to(`business:${order.businessId}`)
                            .emit("order/cancel", {
                                data: {
                                    order,
                                    freeResources,
                                    productsDeleted,
                                },
                                areaId: order.areaSales.id,
                                stockAreaId: areaSale.stockAreaId,
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "PROCESS_TICKETS_PRODUCTION_AREA":
                {
                    const {
                        order,
                        listTickets,
                        preparation_areas,
                        deleteInPreparationArea,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    const pticketIds = listTickets.map((item: any) => item.id);
                    let production_tickets: any = [];

                    if (pticketIds.length !== 0) {
                        production_tickets = await ProductionTicket.findAll({
                            where: {
                                id: pticketIds,
                            },
                            include: [
                                {
                                    model: SelledProduct,
                                    include: [
                                        {
                                            model: SelledProductAddon,
                                            as: "addons",
                                            attributes: [
                                                "id",
                                                "name",
                                                "quantity",
                                            ],
                                        },
                                    ],
                                },
                            ],
                            order: [["createdAt", "ASC"]],
                        });
                    }

                    (global as any).socket
                        .to(`business:${order.businessId}`)
                        .emit("manufacturerArea/productionTicket/process", {
                            data: {
                                ticketsAdd: production_tickets,
                                selledProductsDeleted: deleteInPreparationArea,
                            },
                            preparationAreasAdd: preparation_areas,
                            preparationAreasDelete: [
                                ...new Set(
                                    deleteInPreparationArea.map(
                                        (item: any) => item.areaId
                                    )
                                ),
                            ],
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "UPDATE_TICKET_PRODUCTION_AREA":
                {
                    const { ticket, businessId, from, fromName, origin } =
                        job.data.params;

                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("manufacturerArea/productionTicket/update", {
                            ticket,
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "DELETE_TICKET_IN_PRODUCTION_AREA":
                {
                    const {
                        order,
                        deleteInPreparationArea,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    (global as any).socket
                        .to(`business:${order.businessId}`)
                        .emit("manufacturerArea/productionTicket/bulkDelete", {
                            data: {
                                selledProductsDeleted: deleteInPreparationArea,
                            },
                            preparationAreasDelete: [
                                ...new Set(
                                    deleteInPreparationArea.map(
                                        (item: any) => item.areaId
                                    )
                                ),
                            ],
                            from,
                            fromName,
                            origin,
                        });

                    done();
                }
                break;

            case "NOTIFY_USER":
                {
                    const { message, userToId, origin } = job.data.params;

                    (global as any).socket
                        .to(`user:${userToId}`)
                        .emit("notification", {
                            data: message,
                            origin,
                        });

                    done();
                }
                break;

            case "UPDATE_STATUS_SELLED_PRODUCT_SALE_AREA":
                {
                    const {
                        selledProducts,
                        orderId,
                        from,
                        fromName,
                        origin,
                        fullOrder,
                    } = job.data.params;

                    let order;

                    if (fullOrder) {
                        order = fullOrder;
                    } else {
                        order = await OrderReceipt.findOne({
                            where: {
                                id: orderId,
                                status: {
                                    [Op.not]: ["BILLED"],
                                },
                            },
                        });
                    }

                    if (order) {
                        (global as any).socket
                            .to(`business:${order.businessId}`)
                            .emit("selledProduct/status/update", {
                                data: {
                                    selledProducts,
                                    orderId,
                                },
                                areaId: order.areaSalesId,
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;
            case "UPDATE_NOTE_SELLED_PRODUCT_MANUFACTURER_AREA":
                {
                    const {
                        selledProduct,
                        orderId,
                        fullOrder,
                        areaId,
                        from,
                        fromName,
                        origin,
                    } = job.data.params;

                    let order;
                    if (fullOrder) {
                        order = fullOrder;
                    } else {
                        order = await OrderReceipt.findOne({
                            where: {
                                id: orderId,
                                status: {
                                    [Op.not]: ["BILLED"],
                                },
                            },
                        });
                    }

                    if (order) {
                        (global as any).socket
                            .to(`business:${order.businessId}`)
                            .emit("selledProduct/notes/update", {
                                data: {
                                    selledProduct,
                                    orderId,
                                },
                                areaId: Number(areaId),
                                from,
                                fromName,
                                origin,
                            });
                    }

                    done();
                }
                break;

            case "NEW_ACCESSPOINT_TICKET":
                {
                    const {
                        businessId,
                        from,
                        fromName,
                        accessPointId,
                        origin,
                    } = job.data.params;

                    const accessPointAreas = await Area.findAll({
                        where: {
                            businessId,
                            type: "ACCESSPOINT",
                        },
                    });

                    const access_point_to_return =
                        await AccessPointTicket.scope("to_return").findByPk(
                            accessPointId
                        );

                    (global as any).socket
                        .to(`business:${businessId}`)
                        .emit("accessPointTicket/add", {
                            data: access_point_to_return,
                            accessPointAreas: accessPointAreas.map(
                                item => item.id
                            ),
                            from,
                            fromName,
                            origin,
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
