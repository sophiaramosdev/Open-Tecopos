import { Request, Response } from "express";
import Logger from "../../lib/logger";
import Product from "../../database/models/product";
import Client from "../../database/models/client";
import ReservationPolicy from "../../database/models/reservationPolicy";
import Resource from "../../database/models/resource";
import moment from "moment";
import { config_transactions } from "../../database/seq-transactions";
import db from "../../database/connection";
import User from "../../database/models/user";
import OrderReceipt from "../../database/models/orderReceipt";
import {
  getActiveEconomicCycleCache,
  getAreaCache,
  getBusinessConfigCache,
  getEphimeralTermKey,
  getExpirationTime,
  getOrderFromCacheTransaction,
  getStoreProductsCache,
} from "../../helpers/redisStructure";
import { redisClient } from "../../../app";
import { ItemProductSelled, SimpleProductItem } from "../../interfaces/models";
import {
  calculateOrderTotal,
  calculateOrderTotalV2,
  registerSelledProductInOrder,
} from "../helpers/products";
import { internalCheckerResponse, mathOperation } from "../../helpers/utils";
import { getTitleOrderRecord, getTitleReservationRecord } from "../../helpers/translator";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import SelledProduct from "../../database/models/selledProduct";
import Price from "../../database/models/price";
import { Op, literal, where } from 'sequelize';
import SelledProductAddon from "../../database/models/selledProductAddon";
import { pag_params } from "../../database/pag_params";
import CurrencyPayment from "../../database/models/currencyPayment";
import CashRegisterOperation from "../../database/models/cashRegisterOperation";
import Area from "../../database/models/area";
import ConfigurationKey from "../../database/models/configurationKey";
import Event from '../../database/models/event';
import { orderQueue } from "../../bull-queue/order";
import ReservationRecord from '../../database/models/reservationRecord';
import Image from "../../database/models/image";
import { emailQueue } from "../../bull-queue/email";
import Business from "../../database/models/business";
import Modifier from "../../database/models/modifier";
import OrderReceiptModifier from "../../database/models/orderReceiptModifier";
import AccessPointTicket from "../../database/models/accessPointTicket";
import Dispatch from "../../database/models/dispatch";
import OrderReceiptRecord from '../../database/models/orderReceiptRecord';
import { order_receipt_status } from "../../interfaces/nomenclators";


interface bodyOrderReceipt extends Partial<OrderReceipt> { }
interface ProductReservationItem {
  productId: number;
  resourceId: number;
}

export interface ItemProductReservation extends SimpleProductItem {
  productionAreaId?: number | undefined;
  addons: Array<{
    id: number;
    quantity: number;
  }>;
  resourceId: number;
  startDateAt: string;
  endDateAt: string;
  numberAdults: number;
  numberKids: number;
  isReservation: boolean;
  priceUnitary?: { amount: number; codeCurrency: string };
  numberReservation?: number
  observations?: string
}
export const createdReservationTemp = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  //@ts-ignore
  const tId = t.id;
  try {
    const {
      reservationProducts,
      clientId,
      houseCosted,
      areaSalesId,
      ...params
    } = req.body;
    const user: User = req.user;
    const business: Business = req.business;

    if (!clientId) {
      t.rollback();
      return res.status(400).json({
        message: `Debe proporcionar al cliente al que se va a asociar la factura .`,
      });
    }

    const client = await Client.findOne({
      where: {
        businessId: user.businessId,
        id: clientId,
      },
    });

    if (!client) {
      t.rollback();
      return res.status(400).json({
        message: `El cliente seleccionado no existe en su negocio.`,
      });
    }

    const area = await getAreaCache(areaSalesId);

    if (!area || !area?.isActive) {
      t.rollback();
      return res.status(404).json({
        message: `Área no encontrada`,
      });
    }

    if (area.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (area.type !== "SALE") {
      t.rollback();
      return res.status(406).json({
        message: `El área proporcionada no es de tipo VENTA`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    let listRecords: any = [];
    let listRecordsReservation: Partial<ReservationRecord>[] = [];
    let orderTemplate: bodyOrderReceipt | any = {
      managedById: user.id,
      salesById: user.id,
      status: "PAYMENT_PENDING",
      businessId: user.businessId,
      economicCycleId: economicCycle.id,
      areaSalesId,
      name: params.name || ``,
      discount: Number(params.discount) || 0,
      commission: Number(params.commission) || 0,
      observations: params.observations || null,
      houseCosted: houseCosted ?? false,
      clientId: clientId,
      origin: "admin",
      isReservation: true,
      currenciesPayment: [],
      cashRegisterOperations: [],
    };

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(orderTemplate),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Analyzing cache for configurations
    const configurations = await getBusinessConfigCache(user.businessId);

    const force_consecutive_invoice_numbers =
      configurations.find(
        (item) => item.key === "force_consecutive_invoice_numbers"
      )?.value === "true";


    const productsToSell: Array<ItemProductReservation> = [];
    for (let element of reservationProducts) {
      productsToSell.push({
        productId: element.productId,
        quantity: element.quantity ?? 1,
        variationId: element.variationId,
        addons: element.addons,
        startDateAt: element.startDateAt,
        endDateAt: element.endDateAt,
        resourceId: element.resourceId,
        numberAdults: element.numberAdults,
        numberKids: element.numberKids,
        priceUnitary: element?.priceUnitary,
        isReservation: true,
        observations: element?.observations
      });
    }

    // const products = await Product.findAll({
    //   where: {
    //     id: productsToSell.map(item => item.productId),
    //     businessId: user.businessId
    //   },
    //   include: [Resource, ReservationPolicy]
    // })


    const today = moment()


    const result = await registerSelledProductInOrder(
      {
        productsToSell,
        stockAreaId: area.stockAreaId,
        businessId: user.businessId,
        origin: "admin",
        userId: user.id,
        economicCycle,
        areaSale: area,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "newBillingOrder/registerSelledProductInOrder",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    const productsCache = await getStoreProductsCache(
      user.businessId,
      tId
    );

    for (const product of productsCache) {
      if (product.type !== "SERVICE") {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no es reservable al no ser un servicio`,
        });
      }

      if (!product.availableForReservation) {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no es reservable`,
        });
      }

      const productIteration = productsToSell.find(item => item.productId === product.id)

      //1# validate what product is reservable 
      if (!product.alwaysAvailableForReservation) {
        const reservationAvailableFrom = product.reservationAvailableFrom
        const reservationAvailableTo = product.reservationAvailableTo

        if (moment(reservationAvailableFrom).isBefore(productIteration?.startDateAt) &&
          moment(reservationAvailableTo).isAfter(productIteration?.endDateAt)) {

          const formatFrom = moment(reservationAvailableFrom).format("DD/MM/YY")
          const formatTo = moment(reservationAvailableTo).format("DD/MM/YY")

          t.rollback();
          return res.status(406).json({
            message: `El producto : ${product.name} solo tiene permitido reservar ente el ${formatFrom} y ${formatTo}`,
          });
        }

      }

      //2# Validate resources 
      if (productIteration?.resourceId) {
        if (product.resources?.length === 0 || !product.resources) {
          t.rollback();
          return res.status(404).json({
            message: `El producto : ${product.name} no tiene ese recursos asociados`,
          });
        }
        const resource = product.resources.find(item => item.id === productIteration.resourceId)
        if (!resource) {
          t.rollback();
          return res.status(404).json({
            message: `El producto : ${product.name} no tiene ese recurso asignado`,
          });
        }

        if (resource.numberAdults < productIteration.numberAdults) {
          t.rollback();
          return res.status(404).json({
            message: `El recurso : ${resource.code} tiene un limite para ${resource.numberAdults} de adultos`,
          });
        }

        if (resource.numberKids < productIteration.numberKids) {
          t.rollback();
          return res.status(404).json({
            message: `El recurso : ${resource.code} tiene un limite para ${resource.numberKids} de adultos`,
          });
        }
      }

      if (!productIteration?.startDateAt || !productIteration?.endDateAt) {
        t.rollback();
        return res.status(404).json({
          message: `El producto : ${product.name} debe proporcionar fecha de inicio y fin`,
        });
      }

      //3# Check range date is availability 
      const freeTheEvents = await checkEventAvailability({
        startAt: productIteration?.startDateAt,
        endAt: productIteration?.endDateAt,
        businessId: user.businessId
      })

      if (freeTheEvents) {
        t.rollback()
        return res.status(400).json({ message: "Ya existe un bloqueo en ese horario" })
      }

      if (productIteration.resourceId) {
        const freeTheReservations = await checkReservationAvailability({
          startAt: productIteration?.startDateAt,
          endAt: productIteration?.endDateAt,
          businessId: user.businessId,
          focusId: product.id,
          resourceId: productIteration.resourceId,
        })
        if (freeTheReservations) {
          t.rollback()
          return res.status(400).json({ message: "Ya existe una reserva en este rango" })
        }
      }


      // console.log("==================================")
      // console.log(freeTheEvents)
      // console.log(freeTheReservations)
      // console.log(product.id)
      // console.log("==================================")



    }

    //Updating order from cache
    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);

    const result_totals = await calculateOrderTotal(
      orderTemplate.businessId,
      t
    );

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "manageProductsInOrder/newBillingOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    listRecords.push({
      action: "ORDER_CREATED",
      title: getTitleOrderRecord("ORDER_CREATED"),
      details: `Orden creada desde administración y pendiente a cobro.`,
      madeById: params.salesById,
      createdAt: params.createdAt,
      isPublic: true,
    });

    let lastOperationNumber: number = 1;
    if (force_consecutive_invoice_numbers) {
      lastOperationNumber = await OrderReceipt.max("operationNumber", {
        where: {
          businessId: user.businessId,
          createdAt: {
            [Op.gte]: moment(new Date())
              .startOf("year")
              .format("YYYY-MM-DD HH:mm"),
          },
        },
      });
    } else {
      lastOperationNumber = await OrderReceipt.max("operationNumber", {
        where: {
          businessId: user.businessId,
          //economicCycleId: economicCycle.id,
        },
      });
    }

    if (!lastOperationNumber) {
      lastOperationNumber = 1;
    } else {
      //@ts-ignore
      lastOperationNumber += 1;
    }

    let lastReservationNumber;
    lastReservationNumber = await OrderReceipt.max("reservationNumber", {
      where: {
        businessId: user.businessId,
        createdAt: {
          [Op.gte]: moment(new Date())
            .startOf("year")
            .format("YYYY-MM-DD HH:mm"),
        },
      },
    })

    if (!lastReservationNumber) {
      lastReservationNumber = 1;
    } else {
      //@ts-ignore
      lastReservationNumber += 1;
    }

    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);
    orderTemplate.operationNumber = lastOperationNumber;
    orderTemplate.reservationNumber = lastReservationNumber;

    const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
          ],
        },
      ],
    });

    await order.save({ transaction: t });

    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      { include: [{ model: SelledProduct, include: [Product] }], transaction: t }
    );

    //Register record for reservations 
    order_to_emit?.selledProducts.forEach(item => {
      listRecordsReservation.push({
        action: "RESERVATION_CREATED",
        title: getTitleReservationRecord("RESERVATION_CREATED"),
        details: `Reserva creada desde administración.`,
        madeById: user.id,
        status: order.status,
        selledProductId: item.id
      });
    })

    await t.commit();
    res.status(200).json(order_to_emit);

    const config_message_confirmation =
      configurations.find(
        (item) => item.key === "config_message_confirmation"
      )?.value === "true";

    if (config_message_confirmation && order_to_emit?.client?.email) {
      emailQueue.add(
        {
          code: "NOTIFICATION_RESERVATIONS",
          params: {
            email: order_to_emit?.client?.email,
            business,
            order_to_emit,
            type: "RESERVATION_CONFIRMATION"
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (listRecords.length !== 0) {
      orderQueue.add(
        {
          code: "REGISTER_RECORDS",
          params: {
            records: listRecords,
            orderId: order.id,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }


    if (listRecordsReservation.length > 0) {
      await ReservationRecord.bulkCreate(listRecordsReservation)
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

export const getReservation = async (req: any, res: Response) => {
  try {
    const user: User = req.user;
    const { id } = req.params;

    const reservation = await SelledProduct.findOne({
      where: {
        id,
        isReservation: true,
      },

      include: [
        {
          model: Image,
          attributes: ["id", "src", "thumbnail", "blurHash"],
        },
        { model: Product },
        { model: Price, as: "priceTotal", attributes: ["amount", "codeCurrency"] },
        { model: Price, as: "priceUnitary", attributes: ["amount", "codeCurrency"] },
        {
          model: OrderReceipt,
          attributes: [
            "id",
            "status",
            "origin",
            "discount",
            "commission",
            "operationNumber",
            "preOperationNumber",
            "reservationNumber",
            "isPreReceipt",
            "paymentDeadlineAt",
            "managedById",
            "areaSalesId",
            "isReservation",
          ],
          where: {
            businessId: user.businessId,
          },
          include: [{
            model: Client, attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "barCode",
              "codeClient",
              "contractNumber",
              "ci",
              "sex",
            ]
          }]
        },
        {
          model: Resource
        },
        { model: ReservationRecord, include: [User] },

      ],
    });

    if (!reservation) {
      return res.status(404).json({
        message: "La reserva no a sido encontrada.",
      });
    }

    return res.status(200).json(reservation);
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
export const checkDisposability = async (req: any, res: Response) => {
  try {
    const user: User = req.user
    let { startAt, endAt, productId, resourceId, update } = req.query


    const freeTheEvents = await checkEventAvailability({ startAt, endAt, businessId: user.businessId })

    if (freeTheEvents) {
      return res.status(400).json({ message: "Ya existe un tiempo de bloqueo en ese horario" })
    }

    if (productId && resourceId) {
      const freeTheReservations = await checkReservationAvailability(
        {
          startAt, endAt,
          businessId: user.businessId,
          focusId: productId,
          resourceId: resourceId,
          ignoreId: update
        }
      )



      if (freeTheReservations) {
        return res.status(400).json({ message: "Ya existe una reserva en este rango" })
      }
    }

    return res.status(200).json({ message: "Rango disponible" })
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
export const findAllReservations = async (req: any, res: Response) => {
  try {
    const user: User = req.user;
    const { per_page, page,
      status, order, orderBy,
      dateFrom, dateTo, endDateAt,
      startDateAt, isPreReceipt, productId, calendar, areaSalesId,
      ...params } =
      req.query;

    let where_clause: any = {};
    let where_order: Partial<OrderReceipt> = {

    };

    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    //Date filtering
    if (dateFrom && dateTo) {
      //Special case between dates
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
    //Date filtering
    if (startDateAt && endDateAt) {
      where_clause["startDateAt"] = {
        [Op.between]: [
          moment(startDateAt, "YYYY-MM-DD HH:mm").startOf("day").toDate(),
          moment(endDateAt, "YYYY-MM-DD HH:mm").endOf("day").toDate(),
        ],
      };
    }

    if (calendar) {
      where_clause["startDateAt"] = {
        [Op.between]: [
          moment().startOf("year").toDate(),
          moment().endOf("year").toDate(),
        ],
      };
    }

    if (isPreReceipt === "true") {
      where_order.isPreReceipt = isPreReceipt;
    }
    if (isPreReceipt === "false") {
      //@ts-ignore
      where_order.isPreReceipt = {
        [Op.or]: [false, null],
      };
    }

    if (status) {
      where_order.status = status
    }

    if (productId) {
      where_clause.productId = productId
    }

    if (areaSalesId) {
      where_order.areaSalesId = areaSalesId
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const reservations = await SelledProduct.findAndCountAll({
      where: {
        type: "SERVICE",
        isReservation: true,
        ...where_clause,
      },
      include: [
        { model: Resource },
        { model: Product, attributes: ["id", "name", "duration", "hasDuration"] },
        { model: Price, as: "priceTotal" },
        { model: Price, as: "priceUnitary" },
        {

          model: OrderReceipt,
          attributes: [
            "id",
            "status",
            "origin",
            "discount",
            "commission",
            "operationNumber",
            "reservationNumber",
            "isPreReceipt",
          ],
          where: {
            businessId: user.businessId,
            isReservation:true,
            ...where_order
          },
          include: [{
            model: Client, attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "barCode",
              "codeClient",
              "contractNumber",
              "ci",
              "sex",
            ]
          }]
        },
      ],
      limit: calendar ? undefined : limit,
      offset,
      //@ts-ignore
      order: ordenation
    });

    let totalPages = Math.ceil(reservations.count / limit);
    if (reservations.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: reservations.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: reservations.rows,
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

// Update a reservation
export const updateReservation = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  //@ts-ignore
  const tId = t.id;
  try {
    const { id } = req.params;
    const user: User = req.user
    const business: Business = req.business;
    const {
      reservationProducts,
      observations,
      clientId,
      ...params
    } = req.body;


    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido.`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [
        {
          model: SelledProduct,
          required: false,
          include: [{
            model: Price,
            as: "priceTotal",
            attributes: ["amount", "codeCurrency"],
          },
          {
            model: Price,
            as: "priceUnitary",
            attributes: ["amount", "codeCurrency"],
          }]
        },
        OrderReceiptModifier,
        Area,
        {
          model: Resource,
          as: "listResources",
          through: {
            attributes: [],
          },
        },
        OrderReceiptTotal,
        OrderReceiptPrice,
        Client,
      ],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Pedido no encontrado o no disponible.`,
      });
    }
    //Checking if action belongs to user Business
    if (order.businessId !== order.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (!order.isReservation) {
      t.rollback();
      return res.status(401).json({
        message: `Solo puede reprogramr una reserva.`,
      });
    }

    if (order.status === "CANCELLED" || order.status === "BILLED" || order.status === "REFUNDED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    if (clientId) {
      const client = await Client.findByPk(clientId);

      if (!client || client.businessId !== user.businessId) {
        t.rollback();
        return res.status(404).json({
          message: `El cliente introducido no fue encontrado.`,
        });
      }
      order.clientId = client.id
    }

    //Precision
    const configurations = await getBusinessConfigCache(user.businessId);
    const precission_after_coma = configurations.find(
      item => item.key === "precission_after_coma"
    )?.value;

    const product = await Product.findOne({
      where: {
        id: reservationProducts.productId,
        businessId: user.businessId
      },
      include: [Resource, ReservationPolicy]
    })

    const reservation = order.selledProducts.find(item => item.id === reservationProducts.id)

    if (!reservation) {
      t.rollback();
      return res.status(404).json({
        message: `No se a encontrado datos de la reserva.`,
      });
    }

    if (!product) {
      t.rollback();
      return res.status(404).json({
        message: `No se a encontrado al producto relacionado con la reserva.`,
      });
    }
    if (product.type !== "SERVICE") {
      t.rollback();
      return res.status(406).json({
        message: `El producto : ${product.name} no es reservable al no ser un servicio.`,
      });
    }



    let listRecordsReservation: Partial<ReservationRecord>[] = [];


    if (reservationProducts.startDateAt || reservationProducts.endDateAt) {
      // if (moment(reservationProducts.startDateAt).isBefore(today)) {
      //   t.rollback();
      //   return res.status(406).json({
      //     message: `La fecha de inicio no puede ser menor a la fecha actual`,
      //   });
      // }

      //Cache selledProducts
      let cacheSelledProducts: Partial<SelledProduct>[] | any = order.selledProducts.map(
        item => item
      );

      const startDate = moment.utc(reservationProducts.startDateAt);
      const endDate = moment.utc(reservationProducts.endDateAt).add(1, "day");
      const differenceInDays = endDate.diff(startDate, 'days');
      const newQuantity = differenceInDays === 0 ? 1 : differenceInDays

      if (!product.availableForReservation) {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no es reservable.`,
        });
      }

      if (!product.alwaysAvailableForReservation) {
        const reservationAvailableFrom = product.reservationAvailableFrom
        const reservationAvailableTo = product.reservationAvailableTo

        if (moment(reservationAvailableFrom).isBefore(reservationProducts?.startDateAt) &&
          moment(reservationAvailableTo).isAfter(reservationProducts?.endDateAt)) {

          const formatFrom = moment(reservationAvailableFrom).format("DD/MM/YY")
          const formatTo = moment(reservationAvailableTo).format("DD/MM/YY")

          t.rollback();
          return res.status(406).json({
            message: `El producto : ${product.name} solo tiene permitido reservar ente el ${formatFrom} y ${formatTo}.`,
          });
        }
      }

      const freeTheEvents = await checkEventAvailability({
        startAt: reservationProducts?.startDateAt,
        endAt: reservationProducts?.endDateAt,
        businessId: user.businessId
      })

      if (freeTheEvents) {
        t.rollback()
        return res.status(400).json({ message: "Ya existe un bloqueo en este rango." })
      }

      if (reservation.resourceId) {
        const freeTheReservations = await checkReservationAvailability({
          startAt: reservationProducts?.startDateAt,
          endAt: reservationProducts?.endDateAt,
          businessId: user.businessId,
          focusId: product.id,
          ignoreId: reservation.id,
          resourceId: reservation.resourceId
        })
        if (freeTheReservations) {
          t.rollback()
          return res.status(400).json({ message: "Ya existe una reserva en este rango." })
        }
      }


      reservation.startDateAt = reservationProducts.startDateAt
      reservation.endDateAt = reservationProducts.endDateAt
      reservation.observations = observations
      await reservation.save({ transaction: t })

      const priceUpdate = {
        amount: mathOperation(
          reservation.priceUnitary.amount,
          newQuantity,
          "multiplication",
          precission_after_coma
        ),
      }

      let selledProductFoundIndex = -1

      selledProductFoundIndex = cacheSelledProducts.findIndex(
        (item: any) => {
          return item.id === reservation.id
        }
      ) ?? {}

      if (selledProductFoundIndex === -1) {
        t.rollback()
        return res.status(400).json({ message: "No se a encontrado la reserva asociada a la orden." })
      }

      cacheSelledProducts[selledProductFoundIndex].quantity = newQuantity

      let orderTemplate = {
        ...order.dataValues,
        selledProducts: cacheSelledProducts,
      };

      await redisClient.set(
        getEphimeralTermKey(order.businessId, "order", tId),
        JSON.stringify(orderTemplate),
        {
          EX: getExpirationTime("order"),
        }
      );

      //Setting totals
      const result_totals = await calculateOrderTotalV2(order.businessId, t);

      if (!internalCheckerResponse(result_totals)) {
        t.rollback();
        Logger.error(
          result_totals.message || "Ha ocurrido un error inesperado.",
          {
            origin: "modifyProductsInOrder/calculateOrderTotal",
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: user.businessId,
            userId: user.id,
          }
        );
        return res.status(result_totals.status).json({
          message: result_totals.message,
        });
      }

      await Price.update(priceUpdate,
        {
          where: { id: reservation.priceTotalId },
          transaction: t
        })

      await SelledProduct.update(
        { quantity: newQuantity },
        {
          where: { id: reservation.id },
          transaction: t
        }
      );

      listRecordsReservation.push({
        action: "RESERVATION_EDITED",
        title: getTitleReservationRecord("RESERVATION_EDITED"),
        details: `La reserva fue reprogramada (${moment(reservation.startDateAt).format("DD/MM/YY")} - ${moment(reservation.endDateAt).format("DD/MM/YY")}).`,
        status: order.status,
        madeById: user.id,
        selledProductId: reservation.id
      });
    }

    if (reservationProducts?.resourceId) {
      if (product.resources?.length === 0 || !product.resources) {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no tiene ese recursos asociados.`,
        });
      }
      const resource = product.resources.find(item => item.id === reservationProducts.resourceId)
      if (!resource) {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no tiene ese recurso asignado.`,
        });
      }

      if (resource.numberAdults > reservationProducts.numberAdults) {
        t.rollback();
        return res.status(406).json({
          message: `El recurso : ${resource.code} tiene un limite para ${resource.numberAdults} de adultos.`,
        });
      }

      if (resource.numberKids > reservationProducts.numberKids) {
        t.rollback();
        return res.status(406).json({
          message: `El recurso : ${resource.code} tiene un limite para ${resource.numberKids} de niños.`,
        });
      }
    }

    await t.commit()
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id, {
      include: [
        {
          model: SelledProduct,
          attributes: [
            "id",
            "name",
            "quantity",
            "status",
            "observations",
            "type",
            "areaId",
            "productionAreaId",
            "productionTicketId",
            "productId",
            "variationId",
            "createdAt",
            "updatedAt",
            "totalCost",
            "endDateAt",
            "startDateAt"
          ],
          required: false,
          separate: true,
          include: [
            {
              model: Image,
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
            {
              model: Price,
              as: "priceTotal",
              attributes: ["amount", "codeCurrency"],
            },
            {
              model: Price,
              as: "priceUnitary",
              attributes: ["amount", "codeCurrency"],
            },
            {
              model: Product,
              as: "product",
              attributes: ["hasDuration", "duration"],
            },
          ],
        }]
    }
    );


    const config_message_reminder =
      configurations.find(
        (item) => item.key === "config_message_reminder"
      )?.value === "true";

    if (config_message_reminder && order_to_emit?.client?.email) {
      emailQueue.add(
        {
          code: "NOTIFICATION_RESERVATIONS",
          params: {
            email: order_to_emit?.client?.email,
            business,
            order_to_emit,
            type: "RESERVATION_RESCHEDULE"
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }


    if (listRecordsReservation.length > 0) {
      await ReservationRecord.bulkCreate(listRecordsReservation)
    }

    res.status(200).json(order_to_emit);
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

export const cancelReservation = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  //@ts-ignore
  const tId = t.id;
  try {
    const { id } = req.params;
    const { idReservation } = req.body
    const user: User = req.user;
    const business: Business = req.business;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          required: false,
          include: [
            {
              model: SelledProductAddon,
              include: [Product],
            },
            {
              model: Price,
              as: "priceUnitary",
              include: [Product],
            },
          ],
        },
        AccessPointTicket,
        Dispatch,
        Area,
        {
          model: Resource,
          as: "listResources",
          through: {
            attributes: [],
          },
        },
      ],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Pedido no encontrado o no disponible`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== order.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (order.status === "CANCELLED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden ya ha sido cancelada. Por favor elimine esta instancia para poder continuar.`,
      });
    }

    if (order.status === "REFUNDED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser cancelada debido a que ha sido reembolsada.`,
      });
    }

    const reservationToDeleted = order.selledProducts.find(item => item.id === idReservation)

    if (!reservationToDeleted) {
      t.rollback();
      return res.status(400).json({
        message: `No se a encontrado la reserva.`,
      });
    }

    //Cache selledProducts
    let cacheSelledProducts: Array<SelledProduct> = order.selledProducts.map(
      item => item
    );

    cacheSelledProducts = cacheSelledProducts.filter((item => item.id !== reservationToDeleted.id))


    //Todo : update cascade db
    await ReservationRecord.destroy({
      where: {
        selledProductId: reservationToDeleted.id
      }
    })

    await SelledProduct.destroy({
      where: {
        id: reservationToDeleted.id,
      },
      transaction: t,
    })

    let orderTemplate = {
      ...order.dataValues,
      selledProducts: cacheSelledProducts,
    };

    await redisClient.set(
      getEphimeralTermKey(order.businessId, "order", tId),
      JSON.stringify(orderTemplate),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals
    const result_totals = await calculateOrderTotal(order.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "modifyProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }


    //Analyzing cache for configurations
    const configurations = await getBusinessConfigCache(user.businessId);


    let details = "";

    if (order.isPreReceipt) {
      details = "Prefactura cancelada desde Administración.";
    } else {
      details = `Orden cancelada desde Administración.`;
    }


    await order.save({ transaction: t });

    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );


    await t.commit();
    res.status(200).json(order_to_emit);

    if (order_to_emit?.isReservation) {
      //register reservation records 
      let listRecordsReservation: Partial<OrderReceiptRecord>[] = [];
      const start = moment(reservationToDeleted.startDateAt).format("DD/MM/YYYY");
      const end = moment(reservationToDeleted.endDateAt).format("DD/MM/YYYY");
      listRecordsReservation.push({
        action: "RESERVATION_CANCELLED",
        title: getTitleReservationRecord("RESERVATION_CANCELLED"),
        details: `La reserva de ${reservationToDeleted.name} desde ${start} hasta ${end}  fue cancelada.`,
        madeById: user.id,
        isPublic: true,
        orderReceiptId: order_to_emit.id
      });

      if (listRecordsReservation.length > 0) {
        await OrderReceiptRecord.bulkCreate(listRecordsReservation)
      }

      // send notification mail 
      const config_message_cancellation =
        configurations.find(
          (item) => item.key === "config_message_cancellation"
        )?.value === "true";
      if (config_message_cancellation && order_to_emit?.client?.email) {

        emailQueue.add(
          {
            code: "NOTIFICATION_RESERVATIONS",
            params: {
              email: order_to_emit?.client?.email,
              business,
              order_to_emit,
              type: "RESERVATION_CANCELLATION"
            },
          },
          { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
      }

    }

    // orderQueue.add(
    //   {
    //     code: "REGISTER_RECORDS",
    //     params: {
    //       records: [record],
    //       orderId: order.id,
    //     },
    //   },
    //   { attempts: 2, removeOnComplete: true, removeOnFail: true }
    // );


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
}


export const finAllBlokTime = async (req: any, res: Response) => {
  try {
    const { dateFrom, dateTo, } = req.params;
    const user: User = req.user

    let where_clause: any = {};
    //Special case between dates
    where_clause["createdAt"] = {
      [Op.gte]: moment()
        .startOf("year")
        .format("YYYY-MM-DD HH:mm:ss"),
      [Op.lte]: moment()
        .endOf("year")
        .format("YYYY-MM-DD HH:mm:ss"),
    };

    const evenst = await Event.findAndCountAll({
      where: {
        businessId: user.businessId,
        ...where_clause
      }
    });

    res.status(200).json({
      totalItems: evenst.count,
      items: evenst.rows,
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
}
export const createdNewTiemBlock = async (req: any, res: Response) => {
  try {
    const { title, notes, endAt, startAt } = req.body;
    const user: User = req.user

    if (!moment(startAt).isValid() || !moment(endAt).isValid()) {
      return res.status(400).json({ error: 'Las fechas proporcionadas no son válidas.' });
    }

    const freeTheEvents = await checkEventAvailability({ startAt, endAt, businessId: user.businessId })
    const freeTheReservations = await checkReservationAvailability({ startAt, endAt, businessId: user.businessId })

    if (freeTheEvents) {
      return res.status(400).json({ message: "Ya existe un bloqueo en ese horario" })
    }
    if (freeTheReservations) {
      return res.status(400).json({ message: "Ya existe una reserva en este rango" })
    }


    // if (reservations.length > 0){
    //   const orderIds = reservations.map(reservation => reservation.id)
    //   const orders = await SelledProduct.findAll({
    //     where: {
    //       id: orderIds 
    //     },
    //     include: [{ model: OrderReceipt, where: { businessId: user.businessId } }]
    //   })

    //   if (orders.length > 0) return res.status(400).json({ message: "Ya existen reservas en ese horario" })
    //   return res.status(400).json({ message: "Ya existen reservas en ese horario" })
    // } 

    const eventCreated = await Event.create({
      eventType: "BLOCKINGTIME",
      title: title ?? "Tiempo de Bloqueo",
      notes,
      endAt,
      startAt,
      businessId: user.businessId,
    });

    res.status(200).json(eventCreated);
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
}

export const updateEvent = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, notes, endAt, startAt } = req.body;
    const user: User = req.user

    if (!moment(startAt).isValid() || !moment(endAt).isValid()) {
      return res.status(400).json({ error: 'Las fechas proporcionadas no son válidas.' });
    }

    const eventUpdate = await Event.findOne({
      where: {
        id,
        businessId: user.businessId
      }
    })

    if (!eventUpdate) {
      return res.status(400).json({ message: "No se encontró el tiempo de bloqueo " });
    }

    const freeTheEvents = await checkEventAvailability(
      {
        startAt,
        endAt,
        businessId: user.businessId,
        ignoreId: [eventUpdate.id]
      })

    const freeTheReservations = await checkReservationAvailability({ startAt, endAt, businessId: user.businessId })

    if (freeTheEvents) {
      return res.status(400).json({ message: "Ya existe un bloqueo en ese horario" })
    }
    if (freeTheReservations) {
      return res.status(400).json({ message: "Ya existe una reserva en este rango" })
    }

    if (title) {
      eventUpdate.title = title
    }
    if (notes) {
      eventUpdate.notes = notes
    }
    if (endAt) {
      eventUpdate.endAt = moment(endAt).toDate()
    }
    if (startAt) {
      eventUpdate.startAt = moment(startAt).toDate()
    }

    await eventUpdate.save()

    const updatedEvent = await Event.findByPk(id)

    res.status(200).json(updatedEvent);
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
}

export const deleteEvent = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user: User = req.user

    const event = await Event.findByPk(id)

    if (!event || event.businessId !== user.businessId) {
      return res.status(404).json({ message: 'Evento no encontrado.' });
    }
    await event.destroy({ force: true });

    res.status(204).json({});
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

export const confirmReservation = async (
  req: any,
  res: Response
) => {
  const t = await db.transaction(config_transactions);
  //@ts-ignore
  const tId = t.id;
  try {
    const { id } = req.params;
    const user: User = req.user;
    const business: Business = req.business;
    const {
      paymentDeadlineAt,
    } = req.body;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findOne({
      where: {
        id,
        businessId: user.businessId,
      },
      include: [
        {
          model: SelledProduct,
          include: [
            {
              model: SelledProductAddon,
              as: "addons",
              include: [{ model: Price, as: "priceUnitary" }],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `La orden no esta disponible.`,
      });
    }

    if (!order.isPreReceipt) {
      t.rollback();
      return res.status(404).json({
        message: `Esta orden ya es una factura.`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(
      user.businessId
    );

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    // const area = await getAreaCache(order.areaSalesId);

    // if (!area) {
    //   t.rollback();
    //   return res.status(404).json({
    //     message: `No se a encontrado el area relacionada con la order`,
    //   });
    // }
    const configurations = await getBusinessConfigCache(user.businessId);

    const enable_to_sale_in_negative =
      configurations.find(
        item => item.key === "enable_to_sale_in_negative"
      )?.value === "true";

    const force_consecutive_invoice_numbers =
      configurations.find(
        item => item.key === "force_consecutive_invoice_numbers"
      )?.value === "true";

    let listRecords: Partial<OrderReceiptRecord>[] = []; //records
    let orderTemplate: any = {};
    let normalizeProducts: Array<ItemProductReservation> = [];
    order.selledProducts.forEach((element: any) => {
      normalizeProducts.push({
        productId: element.productId,
        quantity: element.quantity ?? 1,
        variationId: element.variationId,
        addons: element.addons,
        startDateAt: element.startDateAt,
        endDateAt: element.endDateAt,
        resourceId: element.resourceId,
        numberAdults: element.numberAdults,
        numberKids: element.numberKids,
        priceUnitary: element?.priceUnitary,
        isReservation: true,
      });
    });

    const products = await Product.findAll({
      where: {
        id: normalizeProducts.map(item => item.productId),
        businessId: user.businessId
      },
      include: [Resource, ReservationPolicy]
    })


    for (const product of products) {
      if (product.type !== "SERVICE") {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no es reservable al no ser un servicio`,
        });
      }

      if (!product.availableForReservation) {
        t.rollback();
        return res.status(406).json({
          message: `El producto : ${product.name} no es reservable`,
        });
      }

      const productIteration = normalizeProducts.find(item => item.productId === product.id)

      //1# validate what product is reservable 
      if (!product.alwaysAvailableForReservation) {
        const reservationAvailableFrom = product.reservationAvailableFrom
        const reservationAvailableTo = product.reservationAvailableTo

        if (moment(reservationAvailableFrom).isBefore(productIteration?.startDateAt) &&
          moment(reservationAvailableTo).isAfter(productIteration?.endDateAt)) {

          const formatFrom = moment(reservationAvailableFrom).format("DD/MM/YY")
          const formatTo = moment(reservationAvailableTo).format("DD/MM/YY")

          t.rollback();
          return res.status(406).json({
            message: `El producto : ${product.name} solo tiene permitido reservar ente el ${formatFrom} y ${formatTo}`,
          });
        }

      }

      //2# Validate resources 
      if (productIteration?.resourceId) {
        if (product.resources?.length === 0 || !product.resources) {
          t.rollback();
          return res.status(404).json({
            message: `El producto : ${product.name} no tiene ese recursos asociados`,
          });
        }
        const resource = product.resources.find(item => item.id === productIteration.resourceId)
        if (!resource) {
          t.rollback();
          return res.status(404).json({
            message: `El producto : ${product.name} no tiene ese recurso asignado`,
          });
        }

        if (resource.numberAdults < productIteration.numberAdults) {
          t.rollback();
          return res.status(404).json({
            message: `El recurso : ${resource.code} tiene un limite para ${resource.numberAdults} de adultos`,
          });
        }

        if (resource.numberKids < productIteration.numberKids) {
          t.rollback();
          return res.status(404).json({
            message: `El recurso : ${resource.code} tiene un limite para ${resource.numberKids} de adultos`,
          });
        }
      }

      if (!productIteration?.startDateAt || !productIteration?.endDateAt) {
        t.rollback();
        return res.status(404).json({
          message: `El producto : ${product.name} debe proporcionar fecha de inicio y fin`,
        });
      }

      //3# Check range date is availability 
      const freeTheEvents = await checkEventAvailability({
        startAt: productIteration?.startDateAt,
        endAt: productIteration?.endDateAt,
        businessId: user.businessId
      })

      if (freeTheEvents) {
        t.rollback()
        return res.status(400).json({ message: "Ya existe un bloqueo en ese horario" })
      }

      if (productIteration.resourceId) {
        const freeTheReservations = await checkReservationAvailability({
          startAt: productIteration?.startDateAt,
          endAt: productIteration?.endDateAt,
          businessId: user.businessId,
          focusId: product.id,
          resourceId: productIteration.resourceId,
        })
        if (freeTheReservations) {
          t.rollback()
          return res.status(400).json({ message: "Ya existe una reserva en este rango" })
        }
      }
    }

    order.isPreReceipt = false;
    order.status = "PAYMENT_PENDING";


    let lastOperationNumber: number = 1;
    if (force_consecutive_invoice_numbers) {
      lastOperationNumber = await OrderReceipt.max("operationNumber", {
        where: {
          businessId: user.businessId,
          createdAt: {
            [Op.gte]: moment(new Date())
              .startOf("year")
              .format("YYYY-MM-DD HH:mm"),
          },
        },
      });
    } else {
      lastOperationNumber = await OrderReceipt.max("operationNumber", {
        where: {
          businessId: user.businessId,
          economicCycleId: economicCycle.id,
        },
      });
    }

    if (!lastOperationNumber) {
      lastOperationNumber = 1;
    } else {
      //@ts-ignore
      lastOperationNumber += 1;
    }

    listRecords.push({
      action: "TRANSFORMED_TO_INVOICE",
      title: getTitleOrderRecord("TRANSFORMED_TO_INVOICE"),
      details: ``,
      madeById: user.id,
      createdAt: new Date(),
      isPublic: true,
      orderReceiptId:order.id
    });

    order.operationNumber = lastOperationNumber;
    //order.paymentDeadlineAt = paymentDeadlineAt;

    await order.save({ transaction: t });
    await t.commit();

    const order_to_emit = await OrderReceipt.scope(
      "to_return"
    ).findByPk(order.id);

    res.json(order_to_emit);


    let listRecordsReservation: Partial<ReservationRecord>[] = [];
    order_to_emit?.selledProducts.forEach(item => {
      listRecordsReservation.push({
        action: "RESERVATION_CONFIRMED",
        title: getTitleReservationRecord("RESERVATION_CONFIRMED"),
        details: `La reservación fue confirmada`,
        madeById: user.id,
        status: order.status,
        selledProductId: item.id
      });
    })

    if (listRecordsReservation.length > 0) {
      await ReservationRecord.bulkCreate(listRecordsReservation)
    }

    const config_message_reminder =
      configurations.find(
        (item) => item.key === "config_message_reminder"
      )?.value === "true";

    if (config_message_reminder && order_to_emit?.client?.email) {
      emailQueue.add(
        {
          code: "NOTIFICATION_RESERVATIONS",
          params: {
            email: order_to_emit?.client?.email,
            business,
            order_to_emit,
            type: "RESERVATION_CONFIRMATION"
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (listRecords.length !== 0) {
      orderQueue.add(
        {
          code: "REGISTER_RECORDS",
          params: {
            records: listRecords,
            orderId: order_to_emit?.id,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
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

interface AvailabilityCheckParams {
  startAt: string;
  endAt: string;
  businessId: number;
  ignoreId?: Array<number | string>
  focusId?: Array<number | string>
  resourceId?: number | string
}

async function checkEventAvailability({ startAt, endAt, businessId, ignoreId }: AvailabilityCheckParams): Promise<boolean> {


  let where: any = {}

  if (ignoreId) {
    where.id = {
      [Op.notIn]: ignoreId
    }
  }

  // console.log()
  // console.log({ startAt, endAt, businessId, ignoreId })
  // console.log()

  const existingEvents = await Event.findAll({
    where: {
      businessId,
      startAt: {
        [Op.between]: [
          moment(startAt, "YYYY-MM-DD HH:mm").startOf("day").toDate(),
          moment(endAt, "YYYY-MM-DD HH:mm").endOf("day").toDate(),
        ],
      },
      ...where
    }
  });

  return existingEvents.length > 0;
}

async function checkReservationAvailability({ startAt, endAt, businessId, ignoreId, focusId, resourceId }: AvailabilityCheckParams): Promise<boolean> {

  let where: any = {}

  // if (ignoreId) {
  //   where.id = {
  //     [Op.notIn]: [ignoreId]
  //   }
  // }
  // if (focusId) {
  //   where.productId = focusId
  // }
  if (resourceId) {
    where.resourceId = resourceId
  }

  // console.log("=============================")
  // console.log({ startAt, endAt, businessId, ignoreId, focusId, resourceId })
  // console.log("=============================")
  // console.log("=============================")
  // console.log({ startAt, endAt, businessId, ignoreId, focusId, resourceId })
  // console.log("=============================")

  //fixed temp 
  const existingReservations = await SelledProduct.findAll({
    where: {
      [Op.or]: [
        {
          startDateAt: { [Op.lt]: moment(endAt, "YYYY-MM-DD HH:mm").toDate() },
          endDateAt: { [Op.gt]: moment(startAt, "YYYY-MM-DD HH:mm").toDate() }
        },
        {
          startDateAt: { [Op.between]: [moment(startAt, "YYYY-MM-DD HH:mm").toDate(), moment(endAt, "YYYY-MM-DD HH:mm").toDate()] },
          endDateAt: { [Op.gt]: moment(startAt, "YYYY-MM-DD HH:mm").toDate() }
        },
        {
          startDateAt: { [Op.lt]: moment(endAt, "YYYY-MM-DD HH:mm").toDate() },
          endDateAt: { [Op.between]: [moment(startAt, "YYYY-MM-DD HH:mm").toDate(), moment(endAt, "YYYY-MM-DD HH:mm").toDate()] }
        }
      ],
      ...where
    },
    include: [{
      model: OrderReceipt, where:
      {
        businessId, status: ["BILLED", "CREATED", "PAYMENT_PENDING", "OVERDUE"],
        isPreReceipt: false
      }
    }, { model: Resource }]
  });


  // const existingReservations = await SelledProduct.findAll({
  //   where: {
  //     startDateAt: {
  //       [Op.between]: [
  //         moment(startAt, "YYYY-MM-DD HH:mm").toDate(),
  //         moment(endAt, "YYYY-MM-DD HH:mm").toDate(),
  //       ],
  //     },
  //     ...where
  //   },
  //   include: [{
  //     model: OrderReceipt, where:
  //     {
  //       businessId, status: ["BILLED", "CREATED", "PAYMENT_PENDING", "OVERDUE"],
  //       isPreReceipt: false
  //     }
  //   }, { model: Resource }]
  // });

  // console.log(existingReservations)
  // console.log("==================================")
  // console.log(existingReservations[0]?.resource)

  return existingReservations.length > 0;
}