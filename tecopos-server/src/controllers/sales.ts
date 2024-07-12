import { Request, Response } from "express";
import { Op, where, fn, col, Transaction } from "sequelize";
import moment from "moment";

import db from "../database/connection";
import { pag_params } from "../database/pag_params";

import Product from "../database/models/product";
import StockAreaProduct from "../database/models/stockAreaProduct";
import ProductCategory from "../database/models/productCategory";
import SalesCategory from "../database/models/salesCategory";
import OrderReceipt from "../database/models/orderReceipt";
import EconomicCycle from "../database/models/economicCycle";
import Resource from "../database/models/resource";
import Area from "../database/models/area";
import SelledProduct from "../database/models/selledProduct";
import User from "../database/models/user";
import SelledProductAddon from "../database/models/selledProductAddon";
import CurrencyPayment from "../database/models/currencyPayment";
import AvailableCurrency from "../database/models/availableCurrency";
import ProductionTicket from "../database/models/productionTicket";
import ProductPrice from "../database/models/productPrice";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import PriceSystem from "../database/models/priceSystem";
import {
  mathOperation,
  internalCheckerResponse,
  obtainingProductPriceSystemPriceDefined,
  exchangeCurrency,
  normalizingCurrenciesToMeta,
} from "../helpers/utils";
import CashRegisterOperation from "../database/models/cashRegisterOperation";
import Client from "../database/models/client";
import Address from "../database/models/address";
import Phone from "../database/models/phone";
import Price from "../database/models/price";
import Image from "../database/models/image";
import { payments_ways, app_origin } from "../interfaces/nomenclators";
import Variation from "../database/models/variation";
import ProductAttribute from "../database/models/productAttribute";
import StockAreaVariation from "../database/models/stockAreaVariation";
import Combo from "../database/models/Combo";
import OrderReceiptRecord from "../database/models/orderReceiptRecord";
import { getOrderStatus, getTitleOrderRecord } from "../helpers/translator";
import AccessPointTicket from "../database/models/accessPointTicket";
import Dispatch from "../database/models/dispatch";
import OrderResource from "../database/models/orderResource";
import { socketQueue } from "../bull-queue/socket";
import { config_transactions } from "../database/seq-transactions";
import Logger from "../lib/logger";
import ShippingAddress from "../database/models/shippingAddress";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Country from "../database/models/country";
import { productQueue } from "../bull-queue/product";
import Coupon from "../database/models/coupon";
import { ItemProductSelled, SimpleProductItem } from "../interfaces/models";
import {
  afterOrderCancelled,
  calculateOrderTotal,
  payOrderProcessator,
  registerSelledProductInOrder,
  restoreProductStockDisponibility,
  substractProductStockDisponibility,
} from "./helpers/products";
import Business from "../database/models/business";
import { processCoupons } from "./helpers/coupons";
import ListUsedClientsCoupon from "../database/models/listUsedClientsCoupon";
import OrderReceiptTotal from "../database/models/OrderReceiptTotal";
import PaymentGateway from "../database/models/paymentGateway";
import { redisClient } from "../../app";
import {
  getActiveEconomicCycleCache,
  getAreaCache,
  getBusinessConfigCache,
  getCurrenciesCache,
  getEphimeralTermKey,
  getExpirationTime,
  getOrderFromCacheTransaction,
  getOrderRecordsCache,
  getStoreProductsCache,
} from "../helpers/redisStructure";
import { orderQueue } from "../bull-queue/order";
import { notificationsQueue } from "../bull-queue/notifications";
import OrderReceiptCoupon from "../database/models/orderReceiptCoupon";
import { SimplePrice } from "../interfaces/commons";
import OrderReceiptModifier from "../database/models/orderReceiptModifier";
import PartialPayment from "../database/models/partialPayment";
import { emailQueue } from "../bull-queue/email";

export const searchSalesProductsInArea = async (req: any, res: Response) => {
  try {
    const { search, notStrickStock, per_page, page, all_data, ...params } =
      req.query;
    const { areaId } = req.params;
    const user: User = req.user;

    // Obtaining Sale area
    const area = await Area.findOne({
      where: {
        id: areaId,
        type: "SALE",
      },
    });

    if (!area) {
      return res.status(404).json({
        message: `Sale area not found.`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    //Configurations
    const configurations = await getBusinessConfigCache(user.businessId);

    const enable_to_sale_in_negative =
      configurations.find((item) => item.key === "enable_to_sale_in_negative")
        ?.value === "true";

    //Preparing search
    let where_clause: any = {};

    //Searchable
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.or] = [
        where(fn("unaccent", col("Product.name")), {
          [Op.or]: includeToSearch,
        }),
      ];
    }

    const searchable_fields = ["salesCategoryId"];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    const forSaleType = [
      "MENU",
      "STOCK",
      "COMBO",
      "VARIATION",
      "SERVICE",
      "ADDON",
    ];

    let conditionalsOnWhere: any = [
      {
        stockLimit: false,
      },
      {
        stockLimit: true,
        totalQuantity: {
          [Op.gt]: 0,
        },
      },
      {
        showWhenOutStock: true,
      },
    ];

    let conditionalOnArea: any = {};
    if (!enable_to_sale_in_negative && !notStrickStock) {
      conditionalOnArea.quantity = {
        [Op.gt]: 0,
      };
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_records = await Product.findAll({
      attributes: [
        "id",
        "name",
        "salesCode",
        "description",
        "promotionalText",
        "type",
        "showForSale",
        "stockLimit",
        "qrCode",
        "totalQuantity",
        "measure",
        "suggested",
        "onSale",
        "alertLimit",
        "isPublicVisible",
        "averagePreparationTime",
        "elaborationSteps",
        "averageCost",
        "isAlertable",
        "productCategoryId",
        "salesCategoryId",
        "groupName",
        "groupConvertion",
        "isWholesale",
        "minimunWholesaleAmount",
        "enableGroup",
        "performance",
        "onSaleType",
        "onSaleDiscountAmount",
        "saleByWeight",
      ],
      where: {
        type: {
          [Op.or]: forSaleType,
        },
        showForSale: true,
        businessId: user.businessId,
        [Op.or]: conditionalsOnWhere,
        ...where_clause,
      },
      include: [
        {
          model: ProductCategory,
          attributes: ["id", "name", "description"],
        },
        {
          model: Variation,
          attributes: ["id", "name", "description", "onSale"],
          as: "variations",
          separate: true,
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
              model: ProductAttribute,
              attributes: ["id", "name", "code", "value"],
              through: {
                attributes: [],
              },
            },
          ],
          required: false,
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
          model: StockAreaProduct,
          attributes: ["id", "quantity", "type", "productId", "areaId"],
          where: {
            areaId: area.stockAreaId,
            ...conditionalOnArea,
          },
          include: [StockAreaVariation],
          required: false,
        },
        {
          model: ProductPrice,
          attributes: [
            "id",
            "price",
            "codeCurrency",
            "isMain",
            "priceSystemId",
          ],
          separate: true,
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
          model: Combo,
          attributes: ["id", "quantity", "variationId"],
          as: "compositions",
          separate: true,
          include: [
            {
              attributes: ["id", "name", "averageCost", "measure", "type"],
              model: Product,
              as: "composed",
            },
            { model: Variation, attributes: ["id", "name"] },
          ],
        },
      ],
      limit: all_data ? undefined : limit,
      offset,
      order: [["name", "ASC"]],
    });

    let productsToReturn = [];

    for (const product of found_records) {
      if (!["STOCK", "VARIATION"].includes(product.type)) {
        productsToReturn.push(product);
        continue;
      }

      const found = product.stockAreaProducts?.find(
        (item) => item.areaId === area.stockAreaId
      );

      if (!found && enable_to_sale_in_negative) {
        productsToReturn.push(product);
        continue;
      }

      if (!found) {
        continue;
      }

      if (product.type === "STOCK") {
        productsToReturn.push({
          //@ts-ignore
          ...product.dataValues,
          totalQuantity: found.quantity,
        });
        continue;
      }

      let variations = [];
      const areaProducts = product.stockAreaProducts?.find(
        (item) => item.areaId === areaId
      );
      if (areaProducts) {
        for (const element of areaProducts.variations) {
          const found = product.variations.find(
            (item) => item.id === element.variationId
          );

          if (found) {
            variations.push(element);
          }
        }
      }

      if (variations.length !== 0) {
        productsToReturn.push({
          //@ts-ignore
          ...product.dataValues,
          variations,
        });
      }
    }

    return res.status(200).json(productsToReturn);
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `sales/getAllSalesProductsInArea`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const getAllSalesProductsInArea = async (req: any, res: Response) => {
  try {
    const { areaId } = req.params;
    const { order, orderBy, type, ...params } = req.query;
    const user: User = req.user;

    // Obtaining Sale area
    const area = await Area.findOne({
      where: {
        id: areaId,
        type: "SALE",
      },
      include: [
        {
          model: SalesCategory,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!area) {
      return res.status(404).json({
        message: `Sale area not found.`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    //Configurations
    const configurations = await getBusinessConfigCache(user.businessId);

    const enable_to_sale_in_negative =
      configurations.find((item) => item.key === "enable_to_sale_in_negative")
        ?.value === "true";

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = ["salesCategoryId"];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    if (area.saleByCategory) {
      const ids_categories = area.salesCategories?.map((item) => item.id);
      where_clause["salesCategoryId"] = {
        [Op.or]: ids_categories,
      };
    }

    const forSaleType = [
      "MENU",
      "STOCK",
      "COMBO",
      "VARIATION",
      "SERVICE",
      "ADDON",
    ];

    let where_type: any = {};
    if (type) {
      const productTypes = type.split(",");

      for (const item of productTypes) {
        if (!forSaleType.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed type. Fields allowed: ${forSaleType}`,
          });
        }
      }

      where_type.type = {
        [Op.or]: productTypes,
      };
    } else {
      where_type.type = {
        [Op.or]: forSaleType,
      };
    }

    if (area.saleOnlyMyStock) {
      const found_products_stock_area = await StockAreaProduct.findAll({
        where: {
          areaId: area.stockAreaId,
        },
        include: [
          {
            model: Product,
            where: {
              showForSale: true,
              ...where_clause,
              ...where_type,
            },
            attributes: [
              "id",
              "name",
              "salesCode",
              "description",
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
              "isPublicVisible",
              "isAlertable",
              "averagePreparationTime",
              "elaborationSteps",
              "averageCost",
              "salesCategoryId",
              "createdAt",
              "updatedAt",
              "universalCode",
              "showWhenOutStock",
              "showRemainQuantities",
              "visibleOnline",
              "externalId",
              "newArrival",
              "newArrivalAt",
              "isUnderAlertLimit",
              "saleByWeight",
              "onSaleType",
              "onSaleDiscountAmount",
            ],
            include: [
              {
                model: ProductCategory,
                attributes: ["id", "name", "description"],
              },
              {
                model: SalesCategory,
                attributes: [
                  "id",
                  "name",
                  "description",
                  "externalId",
                  "color",
                ],
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
                  "id",
                  "price",
                  "codeCurrency",
                  "isMain",
                  "priceSystemId",
                  "updatedAt",
                ],
                include: [
                  {
                    model: PriceSystem,
                    attributes: ["name"],
                  },
                ],
                separate: true,
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
                model: Combo,
                attributes: ["id", "quantity", "variationId"],
                as: "compositions",
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
                    as: "composed",
                  },
                  {
                    model: Variation,
                    attributes: ["id", "name"],
                  },
                ],
              },
              {
                model: ProductAttribute,
                attributes: ["id", "name", "code", "value"],
              },
            ],
          },
          {
            model: StockAreaVariation,
            attributes: ["quantity", "variationId"],
            include: [
              {
                model: Variation,
                attributes: ["id", "name", "description", "onSale"],
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
                    attributes: ["id", "name", "code", "value"],
                    through: {
                      attributes: [],
                    },
                  },
                ],
                required: false,
              },
            ],
          },
        ],
      });

      const stockAreaProducts = found_products_stock_area.map((stap) => {
        return {
          //@ts-ignore
          ...stap.product.dataValues,
          quantity: stap.quantity,
          areaId: stap.areaId,
        };
      });

      return res.status(200).json(stockAreaProducts);
    } else {
      let productsTypeToInclude: Array<string> = [
        "MENU",
        "SERVICE",
        "COMBO",
        "ADDON",
      ];
      let conditionalsOnWhere: any = [
        {
          stockLimit: false,
        },
        {
          stockLimit: true,
          totalQuantity: {
            [Op.gt]: 0,
          },
        },
      ];

      if (enable_to_sale_in_negative) {
        productsTypeToInclude = productsTypeToInclude.concat([
          "STOCK",
          "VARIATION",
        ]);
        conditionalsOnWhere = conditionalsOnWhere.concat([
          {
            showWhenOutStock: true,
          },
        ]);
      }

      const found_products_show_for_sale = await Product.findAll({
        attributes: [
          "id",
          "name",
          "salesCode",
          "description",
          "promotionalText",
          "type",
          "stockLimit",
          "totalQuantity",
          "measure",
          "suggested",
          "onSale",
          "isPublicVisible",
          "salesCategoryId",
          "createdAt",
          "updatedAt",
          "universalCode",
          "showWhenOutStock",
          "showRemainQuantities",
          "visibleOnline",
          "saleByWeight",
          "onSaleType",
          "onSaleDiscountAmount",
        ],
        where: {
          type: {
            [Op.or]: productsTypeToInclude,
          },
          showForSale: true,
          businessId: user.businessId,
          [Op.or]: conditionalsOnWhere,
          ...where_clause,
        },
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
            model: Product,
            as: "availableAddons",
            attributes: ["id", "name", "salesCode", "description"],
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
                separate: true,
              },
            ],
            required: false,
            where: {
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
            ],
            include: [
              {
                model: PriceSystem,
                attributes: ["name"],
              },
            ],
            separate: true,
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
            model: Combo,
            attributes: ["id", "quantity", "variationId"],
            as: "compositions",
            separate: true,
            include: [
              {
                attributes: ["id", "name", "averageCost", "measure", "type"],
                model: Product,
                as: "composed",
              },
              { model: Variation, attributes: ["id", "name"] },
            ],
          },
        ],
      });

      let found_products_stock_area: any = [];
      if (!enable_to_sale_in_negative) {
        found_products_stock_area = await StockAreaProduct.findAll({
          where: {
            areaId: area.stockAreaId,
          },
          include: [
            {
              model: Product,
              where: {
                showForSale: true,
                ...where_clause,
              },
              attributes: [
                "id",
                "name",
                "salesCode",
                "description",
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
                "isPublicVisible",
                "isAlertable",
                "averagePreparationTime",
                "elaborationSteps",
                "averageCost",
                "salesCategoryId",
                "createdAt",
                "updatedAt",
                "universalCode",
                "showWhenOutStock",
                "showRemainQuantities",
                "visibleOnline",
                "externalId",
                "newArrival",
                "newArrivalAt",
                "isUnderAlertLimit",
                "saleByWeight",
                "onSaleType",
                "onSaleDiscountAmount",
              ],
              include: [
                {
                  model: ProductCategory,
                  attributes: ["id", "name", "description"],
                },
                {
                  model: SalesCategory,
                  attributes: [
                    "id",
                    "name",
                    "description",
                    "externalId",
                    "color",
                  ],
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
                    "id",
                    "price",
                    "codeCurrency",
                    "isMain",
                    "priceSystemId",
                    "updatedAt",
                  ],
                  include: [
                    {
                      model: PriceSystem,
                      attributes: ["name"],
                    },
                  ],
                  separate: true,
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
                  model: Combo,
                  attributes: ["id", "quantity", "variationId"],
                  as: "compositions",
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
                      as: "composed",
                    },
                    {
                      model: Variation,
                      attributes: ["id", "name"],
                      paranoid: false,
                    },
                  ],
                },
                {
                  model: ProductAttribute,
                  attributes: ["id", "name", "code", "value"],
                },
              ],
            },
            {
              model: StockAreaVariation,
              attributes: ["quantity", "variationId"],
              separate: true,
              include: [
                {
                  model: Variation,
                  attributes: ["id", "name", "description", "onSale"],
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
                      attributes: ["id", "name", "code", "value"],
                      through: {
                        attributes: [],
                      },
                    },
                  ],
                  required: false,
                  paranoid: false,
                },
              ],
            },
          ],
        });
      }

      const stockAreaProducts = found_products_stock_area.map((stap: any) => {
        return {
          //@ts-ignore
          ...stap.product.dataValues,
          //@ts-ignore
          variations: stap.variations.map((item) => {
            return {
              ...item.variation?.dataValues,
              quantity: item.quantity,
            };
          }),
          quantity: stap.quantity,
          areaId: stap.areaId,
        };
      });

      const forSale = found_products_show_for_sale.map((item) => {
        return {
          //@ts-ignore
          ...item.dataValues,
          quantity: item.totalQuantity,
          areaId: null,
        };
      });

      return res.status(200).json([...forSale, ...stockAreaProducts]);
    }
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `sales/getAllSalesProductsInArea`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

//From queue
export const createFastOrderFromQueue = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  const order_origin: app_origin = req.header("X-App-Origin");

  try {
    const user: User = req.user;
    const {
      areaSalesId,
      selledProducts,
      currenciesPayment,
      houseCosted,
      economicCycleId,
      coupons,
      clientId,
      barCodeClient,
      ...params
    } = req.body;

    //INIT --> Validations
    if (!areaSalesId) {
      t.rollback();
      return res.status(406).json({
        message: `areaSalesId field is missing`,
      });
    }

    const area = await getAreaCache(areaSalesId);

    if (!area || !area?.isActive) {
      t.rollback();
      return res.status(404).json({
        message: `Area Sales not found`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (area.type !== "SALE") {
      t.rollback();
      return res.status(406).json({
        message: `Area provided is not a SALE type`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    if (economicCycleId && Number(economicCycleId) !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `La orden fue registrada en un ciclo económico que ya ha sido cerrado o no existe. Por favor, elimine esta orden para continuar.`,
      });
    }

    //Checking if there is an order created in the same moment
    const foundDuplicate = await OrderReceipt.findOne({
      where: {
        businessId: user.businessId,
        createdAt: params.createdAt,
        areaSalesId,
      },
    });

    if (foundDuplicate) {
      await t.commit();
      const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
        foundDuplicate.id
      );

      return res.status(200).json(order_to_emit);
    }

    //Checking client
    let client;
    if (clientId) {
      client = await Client.findOne({
        where: {
          id: clientId,
          businessId: user.businessId,
        },
      });

      if (!client) {
        t.rollback();
        return res.status(400).json({
          message: `El cliente proporcionado no fue encontrado.`,
        });
      }
    } else if (barCodeClient) {
      client = await Client.findOne({
        where: {
          barCode: {
            [Op.iLike]: `%${barCodeClient}%`,
          },
          businessId: user.businessId,
        },
      });
    }

    //Preparing meta
    const availableCurrencies = await getCurrenciesCache(user.businessId);
    const toSaveMeta = {
      exchange_rates: normalizingCurrenciesToMeta(availableCurrencies),
    };
    const meta = JSON.stringify(toSaveMeta);

    let orderTemplate: any = {
      status: "CREATED",
      isForTakeAway: true,
      managedById: params.managedById,
      salesById: params.salesById,
      businessId: user.businessId,
      economicCycleId: economicCycle.id,
      areaSalesId,
      name: params.name || ``,
      discount: Number(params.discount) || 0,
      commission: Number(params.commission) || 0,
      observations: params.observations || null,
      closedDate: params.closedDate,
      updatedAt: params.updatedAt,
      paidAt: params.updatedAt,
      createdAt: params.createdAt,
      houseCosted: houseCosted ?? false,
      prices: params.prices,
      clientId: clientId || (client ? client.id : undefined),
      origin: order_origin === "Tecopos-Terminal" ? "apk" : "pos",
      currenciesPayment: [],
      cashRegisterOperations: [],
      areaSales: area,
      meta,
    };

    // if (params.amountReturned.amount > 0) {
    //     orderTemplate = {
    //         ...orderTemplate,
    //         amountReturned: params.amountReturned,
    //     };
    // }

    // if (params.tipPrice) {
    //     orderTemplate = {
    //         ...orderTemplate,
    //         tipPrice: params.tipPrice,
    //     };
    // }

    //@ts-ignore
    const tId = t.id;

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(orderTemplate),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Registering actions in cache
    const listBulkOrderReceipt = [
      {
        action: "ORDER_CREATED",
        title: getTitleOrderRecord("ORDER_CREATED"),
        details: `En punto de venta: ${area.name} (${area.id}).`,
        madeById: params.salesById,
        createdAt: params.createdAt,
        isPublic: true,
      },
    ];

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "records", tId),
      JSON.stringify(listBulkOrderReceipt),
      {
        EX: getExpirationTime("records"),
      }
    );

    //Analyzing cache for configurations
    const configurations = await getBusinessConfigCache(user.businessId);

    const force_consecutive_invoice_numbers =
      configurations.find(
        (item) => item.key === "force_consecutive_invoice_numbers"
      )?.value === "true";
    const shouldGenerateProductionTickets =
      configurations.find(
        (item) => item.key === "generate_ticket_for_production_in_fast_orders"
      )?.value === "true";

    //1. Normalize products to Sell and register
    const productsToSell: Array<ItemProductSelled> = [];
    selledProducts.forEach((element: any) => {
      productsToSell.push({
        productId: element.productId,
        quantity: element.quantity,
        productionAreaId: element.productionAreaId,
        variationId: element.variationId,
        addons: element.addons,
      });
    });

    const result = await registerSelledProductInOrder(
      {
        productsToSell,
        stockAreaId: area.stockAreaId,
        businessId: user.businessId,
        coupons,
        origin: "pos",
        posData: {
          staticSelledProducts: selledProducts,
          salesById: params.salesById,
          updatedAt: params.updatedAt,
          prices: params.prices,
        },
        economicCycle,
        areaSale: area,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "createFastOrderFromQueue/registerSelledProductInOrder",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    //Updating order from cache
    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);

    //Checking and registering coupons
    if (coupons && coupons.length !== 0) {
      const result_coupons = await processCoupons({
        coupons,
        listProducts: productsToSell,
        priceSystem: economicCycle.priceSystemId,
        businessId: user.businessId,
        userId: user?.id,
      });

      if (!internalCheckerResponse(result_coupons)) {
        t.rollback();
        Logger.error(
          result_coupons.message || "Ha ocurrido un error inesperado.",
          {
            origin: "createFastOrderFromQueue/processCoupons",
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: user.businessId,
            userId: user.id,
          }
        );
        return res.status(result_coupons.status).json({
          message: result_coupons.message,
        });
      }

      //Registering in order and desecadenating actions
      if (result_coupons.data.listCoupons.length !== 0) {
        //Found and block coupons
        const coupons = await Coupon.findAll({
          where: {
            id: result_coupons.data.listCoupons,
          },
          lock: true,
          transaction: t,
        });

        const listUsedBulk = [];
        for (const coupon of coupons) {
          coupon.usageCount++;
          await coupon.save({ transaction: t });

          if (result_coupons.data.client) {
            listUsedBulk.push({
              clientId: result_coupons.data.client.id,
              couponId: coupon.id,
            });
          }
        }

        if (listUsedBulk.length !== 0) {
          await ListUsedClientsCoupon.bulkCreate(listUsedBulk, {
            transaction: t,
          });
        }

        const listBulk = result_coupons.data.listCoupons.map((item: number) => {
          return {
            couponId: item,
          };
        });

        orderTemplate.coupons = listBulk;
      }

      if (result_coupons.data.couponDiscount.length !== 0) {
        //First position. In the future could be more than one
        const priceDiscount = result_coupons.data.couponDiscount[0];

        //Registering discount
        if (orderTemplate.couponDiscountPrice) {
          orderTemplate.couponDiscountPrice.amount = priceDiscount.amount;
          orderTemplate.couponDiscountPrice.codeCurrency =
            priceDiscount.codeCurrency;
        } else {
          orderTemplate.couponDiscountPrice = priceDiscount;
        }
      }

      await redisClient.set(
        getEphimeralTermKey(user.businessId, "orderCoupon", tId),
        JSON.stringify(coupons),
        {
          EX: getExpirationTime("orderCoupon"),
        }
      );
    }

    //Updating cache
    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(orderTemplate),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Checking stability of products
    if (selledProducts.length === 0) {
      t.rollback();
      return res.status(400).json({
        message: `Se ha recibido la orden sin productos. Por favor, vuelva a intentarlo creando una orden nueva.`,
      });
    }

    if (selledProducts.length !== orderTemplate.selledProducts.length) {
      t.rollback();
      return res.status(400).json({
        message: `Todos los productos de la orden no fueron encontrados. Por favor, revise su orden y vuelva a intentarlo.`,
      });
    }

    //2. Pay order
    const result_pay = await payOrderProcessator(
      {
        origin: "pos",
        userId: user.id,
        businessId: user.businessId,
        posData: {
          closedDate: params.closedDate,
          salesById: params.salesById,
          updatedAt: params.updatedAt,
          currenciesPayment,
          amountReturned: params.amountReturned,
          tipPrice: params.tipPrice,
          discount: params.discount,
          commission: params.commission,
          houseCosted,
          observations: params.observations,
          name: params.name,
          shippingPrice: params.shippingPrice,
        },
        economicCycle,
      },
      t
    );

    if (!internalCheckerResponse(result_pay)) {
      t.rollback();
      Logger.error(result_pay.message || "Ha ocurrido un error inesperado.", {
        origin: "createFastOrderFromQueue/payOrderProcessator",
        "X-App-Origin": req.header("X-App-Origin"),
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result_pay.status).json({
        message: result_pay.message,
      });
    }

    //Obtain the last operationNumber
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

    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);
    orderTemplate.operationNumber = lastOperationNumber;

    //Removing temporal data  used as auxiliar
    delete orderTemplate.areaSales;

    const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        { model: Price, as: "tipPrice" },
        { model: Price, as: "amountReturned" },
        { model: Price, as: "couponDiscountPrice" },
        { model: Price, as: "shippingPrice" },
        { model: Price, as: "taxes" },
        {
          model: SelledProduct,
          include: [
            {
              model: SelledProductAddon,
              as: "addons",
              include: [{ model: Price, as: "priceUnitary" }],
            },
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
          ],
        },
        { model: CurrencyPayment, as: "currenciesPayment" },
        { model: CashRegisterOperation, as: "cashRegisterOperations" },
        { model: ProductionTicket, as: "tickets" },
      ],
    });

    await order.save({ transaction: t });

    //Analyzing if coupons must be updated
    if (orderTemplate.coupons && orderTemplate.coupons.length !== 0) {
      await OrderReceiptCoupon.bulkCreate(
        orderTemplate.coupons.map((item: any) => {
          return {
            ...item,
            orderReceiptId: order.id,
          };
        }),
        {
          transaction: t,
        }
      );
    }

    //Preparing data to return
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    let listTickets: Array<ProductionTicket> = [];
    let preparation_areas: Array<number> = [];
    if (shouldGenerateProductionTickets && order_to_emit) {
      let bulkSelledUpdated: any = [];

      //Creating preparation areas
      orderTemplate.selledProducts.forEach((item: SelledProduct) => {
        if (
          item.productionAreaId &&
          !preparation_areas.includes(item.productionAreaId)
        ) {
          preparation_areas.push(item.productionAreaId);
        }
      });

      let addBulkTickets = [];
      for (const area of preparation_areas) {
        addBulkTickets.push({
          status: "RECEIVED",
          areaId: area,
          orderReceiptId: order_to_emit.id,
          name: orderTemplate.name || `#${orderTemplate.operationNumber}`,
          productionNumber: 1,
        });
      }

      listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
        transaction: t,
        returning: true,
      });

      order_to_emit.selledProducts.forEach((item) => {
        if (item.productionAreaId) {
          const ticket_found = listTickets.find(
            (ticket) => ticket.areaId === item.productionAreaId
          );

          if (ticket_found) {
            bulkSelledUpdated.push({
              id: item.id,
              productionTicketId: ticket_found.id,
              status: "RECEIVED",
            });
          }
        }
      });

      if (bulkSelledUpdated.length !== 0) {
        await SelledProduct.bulkCreate(bulkSelledUpdated, {
          updateOnDuplicate: ["productionTicketId", "status"],
          transaction: t,
        });
      }
    }

    await t.commit();

    res.status(200).json(order_to_emit);

    //Executing actions after order creation
    socketQueue.add(
      {
        code: "PROCESS_A_FAST_SALE",
        params: {
          order: order_to_emit,
          from: user.id,
          businessId: user.businessId,
          selledProducts,
          addons: [],
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

    const listCacheRecords = await getOrderRecordsCache(user.businessId, tId);
    if (listCacheRecords.length !== 0) {
      orderQueue.add(
        {
          code: "REGISTER_RECORDS",
          params: {
            records: listCacheRecords,
            orderId: order.id,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    //Checking products
    if (result.data.affectedProducts) {
      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds: result.data.affectedProducts,
            businessId: user.businessId,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (listTickets.length !== 0) {
      socketQueue.add(
        {
          code: "PROCESS_TICKETS_PRODUCTION_AREA",
          params: {
            order: order_to_emit,
            listTickets,
            preparation_areas,
            deleteInPreparationArea: [],
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
    }
  } catch (error: any) {
    t.rollback();
    Logger.error(error.toString(), {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      userId: req.user.id,
      businessName: req.business.name,
      userName: req.user.username,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const returnOrderToOnline = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  try {
    const { id } = req.params;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (order.status === "CANCELLED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    //Registering actions
    const record = OrderReceiptRecord.build({
      action: "ORDER_MOVED",
      title: getTitleOrderRecord("ORDER_MOVED"),
      details: `Desde el punto de venta: ${order.areaSales?.name} a Tienda online.`,
      orderReceiptId: order.id,
      madeById: user.id,
    });
    await record.save({ transaction: t });

    //@ts-ignore
    order.economicCycleId = null;
    //@ts-ignore
    order.areaSalesId = null;
    order.status = "IN_PROCESS";
    //@ts-ignore
    order.paidAt = null;

    //Checking and destroying if orderreceipt payment records exist
    await CurrencyPayment.destroy({
      where: {
        orderReceiptId: order.id,
      },
      transaction: t,
    });

    await CashRegisterOperation.destroy({
      where: {
        orderReceiptId: order.id,
      },
      transaction: t,
    });

    await order.save({ transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json(order_to_emit);

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: order_to_emit,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );
  } catch (error: any) {
    t.rollback();
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const transformOrderToPOS = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  try {
    const user: User = req.user;
    const { areaSalesId, orderId } = req.body;

    //validations
    if (!areaSalesId) {
      t.rollback();
      return res.status(406).json({
        message: `areaSalesId field is missing`,
      });
    }

    const area = await getAreaCache(areaSalesId);

    if (!area || !area?.isActive) {
      t.rollback();
      return res.status(404).json({
        message: `Area Sales not found`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (area.type !== "SALE") {
      t.rollback();
      return res.status(406).json({
        message: `Area provided is not a SALE type`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    const order = await OrderReceipt.findOne({
      where: {
        id: orderId,
        businessId: user.businessId,
      },
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available`,
      });
    }

    if (order.areaSalesId === area.id) {
      t.rollback();
      return res.status(400).json({
        message: `La orden ya se encuentra en el punto de venta seleccionado.`,
      });
    }

    //Check order origin
    if (
      !["woo", "online", "shop", "shopapk", "marketplace", "apk"].includes(
        order.origin
      ) &&
      order.status !== "PAYMENT_PENDING"
    ) {
      t.rollback();
      return res.status(400).json({
        message: `El origen de la orden no es válido.`,
      });
    }

    if (["CANCELLED", "REFUNDED"].includes(order.status)) {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    //Registering actions
    const listRecords = [
      {
        action: "ORDER_MOVED",
        title: getTitleOrderRecord("ORDER_MOVED"),
        details: `Hacia punto de venta: ${area.name}.`,
        orderReceiptId: order.id,
        madeById: user.id,
        isPublic: true,
      },
    ];

    order.economicCycleId = economicCycle.id;
    order.status = "IN_PROCESS";
    order.areaSalesId = areaSalesId;

    await order.save({ transaction: t });

    //Preparing data to return
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();

    res.status(200).json(order_to_emit);

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
  } catch (error: any) {
    t.rollback();
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

interface ProductReduced {
  productId: number;
  price?: {
    amount: number;
    codeCurrency: string;
  };
  quantity: number;
  addons: Array<{
    id: number;
    quantity: number;
  }>;
  observations?: string;
  productionAreaId: number;
  variationId: number;
}

interface SelledProductReduced {
  selledProductId: number;
  observations: string;
  quantity: number;
  restore: boolean;

  //Pending to make to work
  addons: Array<{
    selledProductAddonId: number;
    quantity: number;
  }>;
}

export const createOpenOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  const order_origin: app_origin = req.header("X-App-Origin");

  //@ts-ignore
  const tId = t.id;

  try {
    const origin = req.header("X-App-Origin");
    const user: User = req.user;
    const { added, order_creator } = req.body;
    const {
      resources,
      areaSalesId,
      name,
      createdAt,
      updatedAt,
      managedById,
      salesById,
      prices,
      selledProducts,
      economicCycleId,
    } = order_creator;

    let listRecords: any = [];

    if (!areaSalesId) {
      t.rollback();
      return res.status(406).json({
        message: `areaSalesId field is missing`,
      });
    }
    const areaSales = await getAreaCache(areaSalesId);

    if (!areaSales || !areaSales?.isActive) {
      t.rollback();
      return res.status(404).json({
        message: `El punto de venta (caja) no fue encontrado.`,
      });
    }
    //Checking if action belongs to user Business
    if (areaSales.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }
    if (areaSales.type !== "SALE") {
      t.rollback();
      return res.status(406).json({
        message: `El área proporcionada no es de tipo Punto de venta (caja).`,
      });
    }

    const activeEconomicCycle = await getActiveEconomicCycleCache(
      user.businessId
    );

    if (!activeEconomicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    if (economicCycleId && Number(economicCycleId) !== activeEconomicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `La orden fue registrada en un ciclo económico que ya ha sido cerrado o no existe. Por favor, elimine esta orden para continuar.`,
      });
    }

    //Checking if there is an order created in the same moment
    const foundDuplicate = await OrderReceipt.findOne({
      where: {
        businessId: user.businessId,
        createdAt,
        areaSalesId: areaSales.id,
        managedById,
      },
    });

    if (foundDuplicate) {
      await t.commit();
      const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
        foundDuplicate.id
      );

      return res.status(200).json(order_to_emit);
    }

    const availableCurrencies: Array<AvailableCurrency> =
      await getCurrenciesCache(user.businessId);

    const main_currency = availableCurrencies.find((item) => item.isMain);
    if (!main_currency) {
      t.rollback();
      return res.status(404).json({
        message: `No existe ninguna moneda configurada como principal. Por favor, consulte al dueño del negocio.`,
      });
    }

    if (!added || added.length === 0) {
      t.rollback();
      return res.status(404).json({
        message: `No pueden crearse órdenes abiertas sin productos.`,
      });
    }

    let orderTemplate: any = {
      status: "CREATED",
      businessId: user.businessId,
      economicCycleId: activeEconomicCycle.id,
      areaSalesId,
      createdAt,
      updatedAt,
      managedById,
      salesById,
      origin: "pos",
      prices: prices.map((item: any) => {
        return {
          price: item.price,
          codeCurrency: item.codeCurrency,
        };
      }),
      areaSales,
    };

    let bulkAddResources = [];
    if (resources && resources?.length !== 0) {
      const resources_found = await Resource.findAll({
        where: {
          id: resources,
        },
      });

      let listNames = [];
      for (const resource of resources) {
        const foundAvailable = resources_found.find(
          (item) => item.id === resource
        );
        if (!foundAvailable) {
          t.rollback();
          return res.status(406).json({
            message: `La mesa con id ${resource} no fue encontrada.`,
          });
        }
        if (!foundAvailable.isAvailable) {
          t.rollback();
          return res.status(406).json({
            message: `La mesa seleccionada no está disponible. Por favor, seleccione otra.`,
          });
        }
        listNames.push(foundAvailable.code);
        bulkAddResources.push({
          resourceId: resource,
        });
      }

      //Blocking resources
      await Resource.update(
        { isAvailable: false },
        {
          where: {
            id: resources,
          },
          transaction: t,
        }
      );
      orderTemplate.name = name ? `${name}` : `${listNames.join("/")}`;
      orderTemplate.isForTakeAway = false;
      orderTemplate.listResources = bulkAddResources;
    } else {
      orderTemplate.name = name;
      orderTemplate.isForTakeAway = true;
    }

    //Registering actions
    listRecords.push({
      action: "ORDER_CREATED",
      title: getTitleOrderRecord("ORDER_CREATED"),
      details: `En punto de venta: ${areaSales.name} (${areaSales.id}).`,
      madeById: managedById,
      isPublic: true,
    });

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "records", tId),
      JSON.stringify(listRecords),
      {
        EX: getExpirationTime("records"),
      }
    );

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

    //1. Normalize products to Sell and register
    const productsToSell: Array<ItemProductSelled> = [];
    selledProducts.forEach((element: any) => {
      productsToSell.push({
        productId: element.productId,
        quantity: element.quantity,
        productionAreaId: element.productionAreaId,
        variationId: element.variationId,
        addons: element.addons,
      });
    });

    const result = await registerSelledProductInOrder(
      {
        productsToSell,
        stockAreaId: areaSales.stockAreaId,
        businessId: user.businessId,
        origin: order_origin === "Tecopos-Terminal" ? "apk" : "pos",
        posData: {
          staticSelledProducts: selledProducts,
          salesById,
          updatedAt,
          prices: orderTemplate.prices,
        },
        economicCycle: activeEconomicCycle,
        areaSale: areaSales,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "createOpenOrder/registerSelledProductInOrder",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    //To emit via sockets
    const productsAdded = result.data.productsAdded;

    //Updating order from cache
    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);

    //For determining order Status;
    let hasAMenuProduct = false;

    //Obtain the last operationNumber
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
          economicCycleId: activeEconomicCycle.id,
        },
      });
    }

    if (!lastOperationNumber) {
      lastOperationNumber = 1;
    } else {
      //@ts-ignore
      lastOperationNumber += 1;
    }

    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);
    orderTemplate.operationNumber = lastOperationNumber;

    //Analyzing status
    if (hasAMenuProduct) {
      //Means there area a MENU product in the order, then status order change.
      orderTemplate.status = "IN_PROCESS";
    } else {
      //Means all products were from stock
      orderTemplate.status = "COMPLETED";
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(orderTemplate),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals
    const result_totals = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "manageProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    //Updating local data object
    orderTemplate = await getOrderFromCacheTransaction(user.businessId, tId);

    //Removing temporal data  used as auxiliar
    delete orderTemplate.areaSales;

    orderTemplate.totalToPay = result_totals.data.totalToPay;

    const order: OrderReceipt = OrderReceipt.build(orderTemplate, {
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          include: [
            {
              model: SelledProductAddon,
              as: "addons",
              include: [{ model: Price, as: "priceUnitary" }],
            },
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
          ],
        },
        { model: CashRegisterOperation, as: "cashRegisterOperations" },
        { model: ProductionTicket, as: "tickets" },
      ],
    });

    await order.save({ transaction: t });

    //Processing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    let listTickets: Array<ProductionTicket> = [];
    let preparation_areas: Array<number> = [];
    if (order_to_emit) {
      let bulkSelledUpdated: any = [];

      //Creating preparation areas
      orderTemplate.selledProducts.forEach((item: SelledProduct) => {
        if (
          item.productionAreaId &&
          !preparation_areas.includes(item.productionAreaId)
        ) {
          preparation_areas.push(item.productionAreaId);
        }
      });

      let addBulkTickets = [];
      for (const area of preparation_areas) {
        addBulkTickets.push({
          status: "RECEIVED",
          areaId: area,
          orderReceiptId: order_to_emit.id,
          name: orderTemplate.name || `#${orderTemplate.operationNumber}`,
          productionNumber: 1,
        });
      }

      listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
        transaction: t,
        returning: true,
      });

      order_to_emit.selledProducts.forEach((item) => {
        if (item.productionAreaId) {
          const ticket_found = listTickets.find(
            (ticket) => ticket.areaId === item.productionAreaId
          );

          if (ticket_found) {
            bulkSelledUpdated.push({
              id: item.id,
              productionTicketId: ticket_found.id,
              status: "RECEIVED",
            });
          }
        }
      });

      if (bulkSelledUpdated.length !== 0) {
        await SelledProduct.bulkCreate(bulkSelledUpdated, {
          updateOnDuplicate: ["productionTicketId", "status"],
          transaction: t,
        });
      }
    }

    await t.commit();

    res.status(200).json(order_to_emit);

    //Updating resources
    if (bulkAddResources.length !== 0) {
      const normalized: any = bulkAddResources.map((item) => {
        return {
          ...item,
          orderReceiptId: order_to_emit?.id,
        };
      });
      await OrderResource.bulkCreate(normalized);
    }

    if (listTickets.length !== 0) {
      socketQueue.add(
        {
          code: "PROCESS_TICKETS_PRODUCTION_AREA",
          params: {
            order: order_to_emit,
            listTickets,
            preparation_areas,
            deleteInPreparationArea: [],
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
    }

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "PROCESS_PRODUCTS_IN_ORDER",
        params: {
          order: order_to_emit,
          productsAdded,
          productsDeleted: [],
          from: user.id,
          newOrder: true,
          fromName: user.displayName || user.username,
          origin,
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

    const listCacheRecords = await getOrderRecordsCache(user.businessId, tId);

    if (listCacheRecords.length !== 0) {
      orderQueue.add(
        {
          code: "REGISTER_RECORDS",
          params: {
            records: listCacheRecords,
            orderId: order_to_emit?.id,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (productsAdded.length !== 0) {
      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds: productsAdded.map((item: any) => item.productId),
            businessId: user.businessId,
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

export const modifyProductsInOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const origin = req.header("X-App-Origin");
    const { orderId } = req.params;
    const { added, deleted } = req.body;

    const user: User = req.user;
    let listRecords: any = [];

    //Validations
    const order = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["CANCELLED", "BILLED", "REFUNDED"],
        },
      },
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
            {
              model: SelledProductAddon,
              include: [Price],
            },
            Product,
          ],
        },
        Area,
        ProductionTicket,
        {
          model: Price,
          as: "couponDiscountPrice",
        },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Price,
          as: "taxes",
        },
        {
          model: Coupon,
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
        message: `La orden no esta disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    //Destroying coupons in the case it has one
    if (order.couponDiscountPrice) {
      await order.couponDiscountPrice.destroy({ transaction: t });

      //TODO: Run a task that update coupon
      // const listCoupondIds = order.coupons?.map(item => item.id);
      // await OrderReceiptCoupon.destroy({
      //     where: {
      //         orderReceiptId: order.id,
      //     },
      //     transaction: t,
      // });
      // if (order.clientId) {
      //     await ListUsedClientsCoupon.destroy({
      //         where: {
      //             clientId: order.clientId,
      //             couponId: listCoupondIds,
      //         },
      //     });
      // }
      // for (const coupon of order.coupons || []) {
      //     coupon.usageCount--;
      //     await coupon.save({ transaction: t });
      // }
    }

    if (order.dispatch) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden tiene asociado un despacho y no puede ser modificada.`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }

    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }
    //Precission
    const configurations = await getBusinessConfigCache(user.businessId);

    const precission_after_coma = configurations.find(
      (item) => item.key === "precission_after_coma"
    )?.value;
    const shouldGenerateProductionTickets =
      configurations.find(
        (item) => item.key === "generate_ticket_for_production_in_fast_orders"
      )?.value === "true";
    const enable_to_sale_in_negative =
      configurations.find((item) => item.key === "enable_to_sale_in_negative")
        ?.value === "true";

    const availableCurrencies: Array<AvailableCurrency> =
      await getCurrenciesCache(user.businessId);

    const main_currency = availableCurrencies.find((item) => item.isMain);
    if (!main_currency) {
      t.rollback();
      return res.status(404).json({
        message: `No existe ninguna moneda configurada como principal. Por favor, consulte al dueño del negocio.`,
      });
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
      {
        EX: getExpirationTime("order"),
      }
    );

    //For updating quantities
    let priceUpdates: Array<{
      id: number;
      amount: number;
    }> = [];
    let selledProductUpdatesQuantities: Array<{
      id: number;
      quantity: number;
      status: string;
      observations: string;
      totalCost: number;
    }> = [];
    let selledProductAddonUpdatesQuantities: Array<{
      id: number;
      quantity: number;
    }> = [];
    //To update via Sockets
    let productsAdded: Array<{ productId: number; quantity: number }> = [];
    let productsDeleted: Array<{ productId: number; quantity: number }> = [];
    //Generals
    let listTickets: Array<ProductionTicket> = [];
    let addBulkSelledProduct: Array<any> = [];
    let preparation_areas: Array<number> = [];
    let listIdsToDelete: Array<number> = [];
    //For determining order Status;
    let hasAMenuProduct = false;
    //Sockets
    let toUpdateInProductionArea: Array<{
      product_selled: SelledProductReduced;
      takeAction: boolean;
      areaId: number;
      productionTicketId: number;
    }> = [];

    //Cache selledProducts
    let cacheSelledProducts: Array<any> = order.selledProducts.map(
      (item) => item.dataValues
    );

    if (!!deleted) {
      let listProductsToRecord = [];
      const product_selled = [...deleted.product_selled];
      //Local validations
      if (
        !product_selled &&
        (product_selled as SelledProductReduced[]).length === 0
      ) {
        t.rollback();
        return res.status(406).json({
          message: `product_selled can't be empty`,
        });
      }

      let normalizeProducts: Array<ItemProductSelled> = [];
      for (const element of product_selled as SelledProductReduced[]) {
        const foundSelled = order.selledProducts.find(
          (item) => item.id === element.selledProductId
        );
        if (!foundSelled) {
          t.rollback();
          return res.status(404).json({
            message: `El producto vendido con id ${element.selledProductId} no fue encontrado en la orden.`,
          });
        }
        let bulkAddon = [];
        for (const addon of element.addons || []) {
          const found = foundSelled.addons?.find(
            (item) => item.id === addon.selledProductAddonId
          );
          if (found) {
            bulkAddon.push({
              id: found.id,
              quantity: addon.quantity,
            });
          }
        }
        //If was deleted selledProduct completly, remove all its addons
        if (foundSelled.quantity === element.quantity) {
          bulkAddon = [];
          for (const addon of foundSelled.addons || []) {
            bulkAddon.push({
              id: addon.productId,
              quantity: addon.quantity,
            });
          }
        }
        if (element.restore) {
          normalizeProducts.push({
            productId: foundSelled.productId,
            quantity: element.quantity,
            productionAreaId: foundSelled.productionAreaId,
            variationId: foundSelled.variationId,
            addons: bulkAddon,
          });
        }
      }

      const result = await restoreProductStockDisponibility(
        {
          products: normalizeProducts,
          stockAreaId: order.areaSales!.stockAreaId,
          businessId: user.businessId,
          userId: user.id,
          isAtSameEconomicCycle:
            order.createdInActualCycle === undefined ||
            order.createdInActualCycle,
        },
        t
      );

      if (!internalCheckerResponse(result)) {
        t.rollback();
        Logger.error(result.message || "Ha ocurrido un error inesperado.", {
          origin: "manageProductsInOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        });
        return res.status(result.status).json({
          message: result.message,
        });
      }
      //To emit via sockets
      productsDeleted = result.data.productsRemoved;
      for (const deletedProduct of product_selled as SelledProductReduced[]) {
        let totalRemoved = 0;
        const foundDeletedSelled = order.selledProducts.find(
          (item) => item.id === deletedProduct.selledProductId
        )!;

        //Updating total to remove in order
        if (foundDeletedSelled.quantity === deletedProduct.quantity) {
          totalRemoved = foundDeletedSelled.priceTotal.amount;
          //Removing product
          listIdsToDelete.push(foundDeletedSelled.id);
        } else {
          totalRemoved = mathOperation(
            foundDeletedSelled.priceUnitary.amount,
            deletedProduct.quantity,
            "multiplication",
            2
          );
        }
        let totalSelledCostToReduce = mathOperation(
          foundDeletedSelled.product.averageCost,
          deletedProduct.quantity,
          "multiplication",
          precission_after_coma
        );
        //For emit to update Production Area via Sockets
        if (foundDeletedSelled.productionAreaId) {
          toUpdateInProductionArea.push({
            product_selled: deletedProduct,
            takeAction: false,
            areaId: foundDeletedSelled.productionAreaId,
            productionTicketId: foundDeletedSelled.productionTicketId,
          });
        }
        let productRemovedToRecord = [];

        //By default all products cancelled are restored
        productRemovedToRecord.push(
          `Restaurado en almacén (x${deletedProduct.quantity}) ${foundDeletedSelled?.name}`
        );
        //Analyzing how should be the restore depending of the specific product type
        if (
          ["MENU", "SERVICE", "ADDON", "COMBO"].includes(
            foundDeletedSelled.type
          )
        ) {
          if (foundDeletedSelled.quantity === deletedProduct.quantity) {
            //Analyzing if product has addons and updating its quantities
            if (
              foundDeletedSelled.addons &&
              foundDeletedSelled.addons?.length !== 0
            ) {
              let listProductWithAddonToRecord = [];
              for (const addon of foundDeletedSelled.addons) {
                listProductWithAddonToRecord.push(
                  `(x${addon.quantity}) ${addon.name}`
                );
              }
              productRemovedToRecord.push(
                `${listProductWithAddonToRecord.join(",")}`
              );
            }
          } else {
            //Analyzing if addons were received
            if (deletedProduct.addons && deletedProduct.addons.length !== 0) {
              let listProductWithAddonToRecord = [];
              for (const addon_received of deletedProduct.addons) {
                const addon_found = foundDeletedSelled.addons?.find(
                  (item) => item.id === addon_received.selledProductAddonId
                );

                if (!addon_found) {
                  t.rollback();
                  return res.status(404).json({
                    message: `SelledAddonProduct id ${addon_received.selledProductAddonId} not found`,
                  });
                }

                if (addon_found.quantity < addon_received.quantity) {
                  t.rollback();
                  return res.status(404).json({
                    message: `La cantidad seleccionada de ${addon_found.name} no es válida. Cantidad posible a eliminar: ${addon_found.quantity}`,
                  });
                }

                totalRemoved += mathOperation(
                  addon_received.quantity,
                  addon_found.priceUnitary.amount,
                  "multiplication",
                  2
                );
                listProductWithAddonToRecord.push(
                  `(x${addon_received.quantity}) ${addon_found.name}`
                );

                //Calculate addon the cost
                totalSelledCostToReduce += mathOperation(
                  addon_found.product.averageCost,
                  addon_received.quantity,
                  "multiplication",
                  precission_after_coma
                );
                //Updating quantities in Selled Addon Product (*** This is a substract ***)
                const found_selled_quantity =
                  selledProductAddonUpdatesQuantities.find(
                    (item) => item.id === addon_found.id
                  );
                if (found_selled_quantity) {
                  selledProductAddonUpdatesQuantities =
                    selledProductAddonUpdatesQuantities.map((item) => {
                      if (item.id === addon_found.id) {
                        return {
                          ...item,
                          quantity: mathOperation(
                            item.quantity,
                            addon_received.quantity,
                            "subtraction",
                            precission_after_coma
                          ),
                        };
                      }
                      return item;
                    });
                } else {
                  selledProductAddonUpdatesQuantities.push({
                    id: addon_found.id,
                    quantity: mathOperation(
                      addon_found.quantity,
                      addon_received.quantity,
                      "subtraction",
                      precission_after_coma
                    ),
                  });
                }
              }
              productRemovedToRecord.push(
                `${listProductWithAddonToRecord.join(",")}`
              );
            }
          }
        }

        priceUpdates.push({
          id: foundDeletedSelled.priceTotal.id,
          amount: foundDeletedSelled.priceTotal.amount - totalRemoved,
        });

        selledProductUpdatesQuantities.push({
          id: foundDeletedSelled.id,
          quantity: foundDeletedSelled.quantity - deletedProduct.quantity,
          status: foundDeletedSelled.status,
          totalCost: mathOperation(
            foundDeletedSelled.totalCost,
            totalSelledCostToReduce,
            "subtraction",
            precission_after_coma
          ),
          observations: deletedProduct.observations,
        });
        listProductsToRecord.push(productRemovedToRecord);
      }

      //Registering actions
      listRecords.push({
        action: "PRODUCT_REMOVED",
        title: getTitleOrderRecord("PRODUCT_REMOVED"),
        details: listProductsToRecord.join(";"),
        madeById: user.id,
      });
    }

    if (!!added) {
      let listProductsToRecord = [];
      const areaSalesId = added.areaSalesId;
      let products = [...added.products] as ProductReduced[];

      //Local validations
      if (!areaSalesId) {
        t.rollback();
        return res.status(406).json({
          message: `areaSalesId filed is missing.`,
        });
      }
      const areaSale = await getAreaCache(areaSalesId);

      if (!areaSale) {
        t.rollback();
        return res.status(404).json({
          message: `Area sale not found`,
        });
      }

      if (areaSale.type !== "SALE") {
        t.rollback();
        return res.status(400).json({
          message: `Area provided is not SALE type`,
        });
      }

      //Checking if action belongs to user Business
      if (areaSale.businessId !== user.businessId) {
        t.rollback();
        return res.status(401).json({
          message: `No tiene acceso al recurso solicitado.`,
        });
      }

      let normalizeProducts: Array<ItemProductSelled> = [];
      added.products.forEach((element: ProductReduced) => {
        normalizeProducts.push({
          productId: element.productId,
          quantity: element.quantity,
          productionAreaId: element.productionAreaId,
          variationId: element.variationId,
          addons: element.addons,
        });
      });

      const result = await substractProductStockDisponibility(
        {
          products: normalizeProducts,
          stockAreaId: areaSale.stockAreaId,
          businessId: user.businessId,
          strict: !enable_to_sale_in_negative,
        },
        t
      );
      if (!internalCheckerResponse(result)) {
        t.rollback();
        Logger.error(result.message || "Ha ocurrido un error inesperado.", {
          origin: "manageProductsInOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        });
        return res.status(result.status).json({
          message: result.message,
        });
      }

      //To emit via sockets
      productsAdded = result.data.productsAdded;

      //Obtaining full data from products
      const productsFound = await getStoreProductsCache(user.businessId, tId);

      //Generals
      //Analyzing and creating production tickets
      products.forEach((item) => {
        const fullProduct = productsFound.find(
          (element) => element.id === item.productId
        );
        if (fullProduct) {
          let areaId: number | undefined;
          if (
            fullProduct.listProductionAreas &&
            fullProduct.listProductionAreas.length !== 0
          ) {
            if (fullProduct.listProductionAreas.length === 1) {
              areaId = fullProduct.listProductionAreas[0].id;
            } else {
              const productReceived = products.find(
                (p) => p.productId === fullProduct.id
              )!;
              const found = fullProduct.listProductionAreas.find(
                (a) => a.id === productReceived.productionAreaId
              );
              if (found) {
                areaId = found.id;
              }
            }
          }
          //Checking if area is already created
          if (areaId && !preparation_areas.includes(areaId)) {
            preparation_areas.push(areaId);
          }
        }
      });

      let addBulkTickets = [];
      for (const area of preparation_areas) {
        let nextProductionNumber = 0;
        order.tickets
          .filter((item) => item.areaId === area)
          .forEach((element) => {
            if (element.productionNumber > nextProductionNumber) {
              nextProductionNumber = element.productionNumber;
            }
          });
        nextProductionNumber++;
        addBulkTickets.push({
          status: "RECEIVED",
          areaId: area,
          orderReceiptId: order.id,
          name: order.name || `#${order.operationNumber}`,
          productionNumber: nextProductionNumber,
        });
      }

      listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
        transaction: t,
        returning: true,
      });

      for (const product of added.products as ProductReduced[]) {
        //Analyzing if where found
        const productDetails = productsFound.find(
          (item) => item.id === product.productId
        );
        if (!productDetails) {
          t.rollback();
          return res.status(404).json({
            message: `El producto con id ${product.productId} no fue encontrado.`,
          });
        }
        if (
          !["MENU", "ADDON", "SERVICE", "COMBO", "STOCK", "VARIATION"].includes(
            productDetails.type
          )
        ) {
          t.rollback();
          return res.status(400).json({
            message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
          });
        }
        //Defining stockProductionAreaId
        let productionAreaId: number = areaSale.stockAreaId;
        if (
          productDetails.listProductionAreas &&
          productDetails.listProductionAreas.length !== 0
        ) {
          if (productDetails.listProductionAreas.length === 1) {
            productionAreaId = productDetails.listProductionAreas[0].id;
          } else {
            const found = productDetails.listProductionAreas.find(
              (element) => element.id === product.productionAreaId
            );
            if (found) {
              productionAreaId = found.id;
            }
          }
        }
        let itemPrice;
        if (product.price) {
          itemPrice = {
            price: product.price.amount,
            codeCurrency: product.price.codeCurrency,
          };
        } else {
          //Obtaining price of product
          itemPrice = obtainingProductPriceSystemPriceDefined(
            productDetails,
            product.variationId,
            economicCycle.priceSystemId
          );
        }
        if (!itemPrice) {
          t.rollback();
          return res.status(400).json({
            message: `El precio del producto ${productDetails.name} no fue encontrado. Por favor consule al propietario de negocio.`,
          });
        }
        let totalSelledPrice = mathOperation(
          itemPrice.price,
          product.quantity,
          "multiplication",
          precission_after_coma
        );
        //Calculate itemCost
        let totalSelledCost = mathOperation(
          productDetails.averageCost,
          product.quantity,
          "multiplication",
          precission_after_coma
        );
        //If it is available, creating a virtual selledProduct
        let selled_product: any = {
          name: productDetails.name,
          measure: productDetails.measure,
          colorCategory: productDetails.salesCategory?.color,
          quantity: product.quantity,
          productId: productDetails.id,
          type: productDetails.type,
          orderReceiptId: order.id,
          economicCycleId: economicCycle.id,
          imageId: productDetails.images?.[0]?.id,
          addons: [],
          productionAreaId,
          observations: product.observations,
          variationId: product.variationId,
          priceUnitary: {
            amount: itemPrice.price,
            codeCurrency: itemPrice.codeCurrency,
          },
        };

        let addAddonsBulk: any = [];
        //Analizing if addons received
        if (product.addons && product.addons?.length !== 0) {
          hasAMenuProduct = true;
          if (!["MENU", "SERVICE"].includes(productDetails.type)) {
            t.rollback();
            return res.status(400).json({
              message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
            });
          }
          let listProductWithAddonToRecord = [];
          for (const addon of product.addons) {
            const addon_found = productDetails.availableAddons?.find(
              (item) => item.id === addon.id
            );
            if (!addon_found) {
              t.rollback();
              return res.status(404).json({
                message: `Addon id ${addon.id} provided not available in the product provided ${product.productId}.`,
              });
            }
            //Calculate addon the cost
            totalSelledCost += mathOperation(
              addon_found.averageCost,
              addon.quantity,
              "multiplication",
              precission_after_coma
            );
            listProductWithAddonToRecord.push(
              `+(x${addon.quantity}) ${addon_found.name}`
            );
            //Obtaining price of product
            const addonPrice = obtainingProductPriceSystemPriceDefined(
              addon_found,
              undefined,
              economicCycle.priceSystemId
            );
            if (!addonPrice) {
              t.rollback();
              return res.status(400).json({
                message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consule al propietario de negocio.`,
              });
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
            if (addonPrice.codeCurrency === itemPrice.codeCurrency) {
              totalSelledPrice += addonPrice.price * addon.quantity;
            } else {
              const availableCurrency = availableCurrencies.find(
                (item) => item.currency.code === addonPrice?.codeCurrency
              );
              if (!availableCurrency) {
                t.rollback();
                return res.status(404).json({
                  message: `The currency of addon not found as available`,
                });
              }
              totalSelledPrice += mathOperation(
                addonPrice.price,
                availableCurrency.exchangeRate,
                "multiplication",
                2
              );
            }
          }
          listProductsToRecord.push(
            `(x${product.quantity}) ${
              productDetails.name
            } ${listProductWithAddonToRecord.join(",")}`
          );
        } else {
          //If not addons
          listProductsToRecord.push(
            `(x${product.quantity}) ${productDetails.name}`
          );
        }
        //Adding to ticket if productionArea exist
        if (productionAreaId) {
          const ticket_found = listTickets.find(
            (item) => item.areaId === productionAreaId
          );
          if (ticket_found) {
            selled_product.productionTicketId = ticket_found.id;
          }
        }

        if (
          ["MENU", "ADDON", "SERVICE", "COMBO"].includes(productDetails.type) ||
          (shouldGenerateProductionTickets && productDetails.type === "STOCK")
        ) {
          selled_product.status = "RECEIVED";
          //Adding selled product to the virtual store for creating at the end
          addBulkSelledProduct.push({
            ...selled_product,
            totalCost: totalSelledCost,
            addons: addAddonsBulk,
            priceTotal: {
              amount: totalSelledPrice,
              codeCurrency: itemPrice.codeCurrency,
            },
          });
        } else {
          selled_product.status = !!selled_product.productionTicketId
            ? "RECEIVED"
            : "COMPLETED";

          //Analyzing if product exist already
          //Taking in consideration cacheSelledProducts because of deleted
          let selledProductFound;
          if (product.variationId) {
            selledProductFound = cacheSelledProducts.find(
              (item) =>
                item.productId === productDetails.id &&
                item.variationId === product.variationId
            );
          } else {
            selledProductFound = cacheSelledProducts.find(
              (item) => item.productId === productDetails.id
            );
          }
          if (selledProductFound) {
            const newQuantity = selledProductFound.quantity + product.quantity;
            //Calculate itemCost
            totalSelledCost = mathOperation(
              productDetails.averageCost,
              newQuantity,
              "multiplication",
              precission_after_coma
            );

            priceUpdates.push({
              id: selledProductFound.priceTotalId,
              amount: mathOperation(
                itemPrice.price,
                newQuantity,
                "multiplication",
                precission_after_coma
              ),
            });

            selledProductUpdatesQuantities.push({
              id: selledProductFound.id,
              quantity: newQuantity,
              status: selled_product.status,
              observations: selled_product.observations,
              totalCost: totalSelledCost,
            });
          } else {
            //Adding selled product to the virtual store for creating at the end
            addBulkSelledProduct.push({
              ...selled_product,
              totalCost: totalSelledCost,
              addons: addAddonsBulk,
              areaId: areaSale.stockAreaId,
              priceTotal: {
                amount: totalSelledPrice,
                codeCurrency: itemPrice.codeCurrency,
              },
            });
          }
        }
      }

      //Registering actions
      listRecords.push({
        action: "PRODUCT_ADDED",
        title: getTitleOrderRecord("PRODUCT_ADDED"),
        details: listProductsToRecord.join(";"),
        madeById: user.id,
      });
    }

    //Updating local store object
    let nextSelledProducts = [];
    for (const element of order.selledProducts) {
      if (listIdsToDelete.includes(element.id)) {
        continue;
      }

      const found = selledProductUpdatesQuantities.find(
        (item) => item.id === element.id
      );

      if (found) {
        nextSelledProducts.push({
          ...element.dataValues,
          quantity: found.quantity,
        });
      } else {
        nextSelledProducts.push(element);
      }
    }

    cacheSelledProducts = nextSelledProducts.concat(addBulkSelledProduct);

    //Updating SelledProductAddon quantities
    if (selledProductAddonUpdatesQuantities.length !== 0) {
      const to_removed = selledProductAddonUpdatesQuantities.filter(
        (item) => item.quantity === 0
      );
      const update = selledProductAddonUpdatesQuantities.filter(
        (item) => item.quantity !== 0
      );
      await SelledProductAddon.bulkCreate(update, {
        updateOnDuplicate: ["quantity"],
        transaction: t,
      });
      if (to_removed.length !== 0) {
        await SelledProductAddon.destroy({
          where: {
            id: to_removed.map((item) => item.id),
          },
          transaction: t,
        });
      }
    }

    //Creating stockSelledProducts if exists
    if (addBulkSelledProduct.length !== 0) {
      await SelledProduct.bulkCreate(addBulkSelledProduct, {
        include: [
          {
            model: SelledProductAddon,
            as: "addons",
            include: [{ model: Price, as: "priceUnitary" }],
          },
          { model: Price, as: "priceTotal" },
          { model: Price, as: "priceUnitary" },
        ],
        transaction: t,
      });
    }

    //Updating prices
    if (priceUpdates.length !== 0) {
      await Price.bulkCreate(priceUpdates, {
        updateOnDuplicate: ["amount"],
        transaction: t,
      });
    }

    //Updating SelledProduct Table
    //Verifiying there is no selled product to update that has been marked for delete
    const selled_to_update = selledProductUpdatesQuantities.filter(
      (item) => !listIdsToDelete.includes(item.id)
    );
    if (selled_to_update.length !== 0) {
      await SelledProduct.bulkCreate(selled_to_update, {
        updateOnDuplicate: ["quantity", "status", "observations", "totalCost"],
        transaction: t,
      });
    }

    //Deleting selled Products
    if (listIdsToDelete.length !== 0) {
      await SelledProduct.destroy({
        where: {
          id: listIdsToDelete,
        },
        transaction: t,
      });
    }

    //Analyzing status
    if (hasAMenuProduct) {
      //Means there area a MENU product in the order, then status order change.
      order.status = "IN_PROCESS";
    } else if (order.status !== "IN_PROCESS") {
      //Means all products were from stock
      order.status = "COMPLETED";
    }

    const orderTemplate = {
      ...order.dataValues,
      selledProducts: cacheSelledProducts,
    };

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
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

    //Analyzing if modifiedPrices
    order.modifiedPrice = orderTemplate.selledProducts.some(
      (item: any) => item.modifiedPrice
    );

    await order.save({ transaction: t });
    await t.commit();

    //Processing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id
    );

    res.status(200).json(order_to_emit);

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "PROCESS_PRODUCTS_IN_ORDER",
        params: {
          order: order_to_emit,
          productsAdded,
          productsDeleted,
          from: user.id,
          newOrder: false,
          fromName: user.displayName || user.username,
          origin,
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

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

    let productsForChecking = [
      ...productsAdded.map((item) => item.productId),
      ...productsDeleted.map((item) => item.productId),
    ];

    if (productsForChecking.length !== 0) {
      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds: productsForChecking,
            businessId: user.businessId,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (listTickets.length !== 0 || toUpdateInProductionArea.length !== 0) {
      socketQueue.add(
        {
          code: "PROCESS_TICKETS_PRODUCTION_AREA",
          params: {
            order: order_to_emit,
            listTickets,
            preparation_areas,
            deleteInPreparationArea: toUpdateInProductionArea,
            from: user.id,
            fromName: user.displayName || user.username,
            origin,
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

//Deprecated
export const manageProductsInOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const origin = req.header("X-App-Origin");
    const { orderId, creation } = req.params;
    const { added, deleted, order_creator } = req.body;

    const user: User = req.user;
    let listRecords: any = [];
    let id = orderId;

    if (orderId === "0" && creation === "first-creation") {
      const {
        resources,
        areaSalesId,
        name,
        createdAt,
        updatedAt,
        managedById,
        salesById,
        economicCycleId,
      } = order_creator;

      if (!areaSalesId) {
        t.rollback();
        return res.status(406).json({
          message: `areaSalesId field is missing`,
        });
      }
      const areaSales = await getAreaCache(areaSalesId);

      if (!areaSales || !areaSales?.isActive) {
        t.rollback();
        return res.status(404).json({
          message: `El punto de venta (caja) no fue encontrado.`,
        });
      }
      //Checking if action belongs to user Business
      if (areaSales.businessId !== user.businessId) {
        t.rollback();
        return res.status(401).json({
          message: `No tiene acceso al recurso solicitado.`,
        });
      }
      if (areaSales.type !== "SALE") {
        t.rollback();
        return res.status(406).json({
          message: `El área proporcionada no es de tipo Punto de venta (caja).`,
        });
      }
      let economicCycle;
      if (economicCycleId) {
        economicCycle = await EconomicCycle.findOne({
          where: {
            businessId: user.businessId,
            id: economicCycleId,
            isActive: true,
          },
          include: [PriceSystem],
        });
        if (!economicCycle) {
          t.rollback();
          return res.status(400).json({
            message: `La orden fue registrada en un ciclo económico que ya ha sido cerrado o no existe. Por favor, elimine esta orden para continuar.`,
          });
        }
      } else {
        economicCycle = await getActiveEconomicCycleCache(user.businessId);

        if (!economicCycle) {
          t.rollback();
          return res.status(400).json({
            message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
          });
        }
      }
      //Checking if there is an order created in the same moment
      const foundDuplicate = await OrderReceipt.findOne({
        where: {
          businessId: user.businessId,
          createdAt,
          areaSalesId: areaSales.id,
          managedById,
        },
      });

      if (foundDuplicate) {
        await t.commit();
        const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
          foundDuplicate.id
        );

        return res.status(200).json(order_to_emit);
      }

      let orderTemplate: any = {
        status: "CREATED",
        businessId: user.businessId,
        economicCycleId: economicCycle.id,
        areaSalesId,
        createdAt,
        updatedAt,
        managedById,
        salesById,
        origin: "pos",
      };

      let bulkAddResources = [];
      if (resources && resources?.length !== 0) {
        const resources_found = await Resource.findAll({
          where: {
            id: resources,
          },
        });

        let listNames = [];
        for (const resource of resources) {
          const foundAvailable = resources_found.find(
            (item) => item.id === resource
          );
          if (!foundAvailable) {
            t.rollback();
            return res.status(406).json({
              message: `La mesa con id ${resource} no fue encontrada.`,
            });
          }
          if (!foundAvailable.isAvailable) {
            t.rollback();
            return res.status(406).json({
              message: `La mesa seleccionada no está disponible. Por favor, seleccione otra.`,
            });
          }
          listNames.push(foundAvailable.code);
          bulkAddResources.push({
            resourceId: resource,
          });
        }

        //Blocking resources
        await Resource.update(
          { isAvailable: false },
          {
            where: {
              id: resources,
            },
            transaction: t,
          }
        );
        orderTemplate.name = name ? `${name}` : `${listNames.join("/")}`;
        orderTemplate.isForTakeAway = false;
        orderTemplate.listResources = bulkAddResources;
      } else {
        orderTemplate.name = name;
        orderTemplate.isForTakeAway = true;
      }

      const pre_order: OrderReceipt = OrderReceipt.build(orderTemplate);
      await pre_order.save({ transaction: t });

      //Updating resources
      if (bulkAddResources.length !== 0) {
        const normalized = bulkAddResources.map((item) => {
          return {
            ...item,
            orderReceiptId: pre_order.id,
          };
        });
        await OrderResource.bulkCreate(normalized, { transaction: t });
      }

      //Registering actions
      listRecords.push({
        action: "ORDER_CREATED",
        title: getTitleOrderRecord("ORDER_CREATED"),
        details: `En punto de venta: ${areaSales.name} (${areaSales.id}).`,
        madeById: managedById,
        isPublic: true,
      });

      id = pre_order.id;
      user.id = managedById;
    }

    //Validations
    const order = await OrderReceipt.findOne({
      where: {
        id,
        status: {
          [Op.not]: ["CANCELLED", "BILLED", "REFUNDED"],
        },
      },
      include: [
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
            {
              model: SelledProductAddon,
              include: [Price],
            },
            Product,
          ],
        },
        OrderReceiptPrice,
        Area,
        ProductionTicket,
        {
          model: Price,
          as: "couponDiscountPrice",
        },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Coupon,
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
        message: `La orden no esta disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    //Destroying coupons in the case it has one
    if (order.couponDiscountPrice) {
      await order.couponDiscountPrice.destroy({ transaction: t });
      // const listCoupondIds = order.coupons?.map(item => item.id);
      // await OrderReceiptCoupon.destroy({
      //     where: {
      //         orderReceiptId: order.id,
      //     },
      //     transaction: t,
      // });
      // if (order.clientId) {
      //     await ListUsedClientsCoupon.destroy({
      //         where: {
      //             clientId: order.clientId,
      //             couponId: listCoupondIds,
      //         },
      //     });
      // }
      // for (const coupon of order.coupons || []) {
      //     coupon.usageCount--;
      //     await coupon.save({ transaction: t });
      // }
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }
    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }
    //Precission
    const configurations = await getBusinessConfigCache(user.businessId);

    const precission_after_coma = configurations.find(
      (item) => item.key === "precission_after_coma"
    )?.value;
    const force_consecutive_invoice_numbers =
      configurations.find(
        (item) => item.key === "force_consecutive_invoice_numbers"
      )?.value === "true";
    const shouldGenerateProductionTickets =
      configurations.find(
        (item) => item.key === "generate_ticket_for_production_in_fast_orders"
      )?.value === "true";
    const enable_to_sale_in_negative =
      configurations.find((item) => item.key === "enable_to_sale_in_negative")
        ?.value === "true";

    const availableCurrencies: Array<AvailableCurrency> =
      await getCurrenciesCache(user.businessId);

    const main_currency = availableCurrencies.find((item) => item.isMain);
    if (!main_currency) {
      t.rollback();
      return res.status(404).json({
        message: `No existe ninguna moneda configurada como principal. Por favor, consulte al dueño del negocio.`,
      });
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
      {
        EX: getExpirationTime("order"),
      }
    );

    //For updating quantities
    let priceUpdates: Array<{
      id: number;
      amount: number;
    }> = [];
    let selledProductUpdatesQuantities: Array<{
      id: number;
      quantity: number;
      status: string;
      observations: string;
      totalCost: number;
    }> = [];
    let selledProductAddonUpdatesQuantities: Array<{
      id: number;
      quantity: number;
    }> = [];
    //To update via Sockets
    let productsAdded: Array<{ productId: number; quantity: number }> = [];
    let productsDeleted: Array<{ productId: number; quantity: number }> = [];
    //Generals
    let listTickets: Array<ProductionTicket> = [];
    let addBulkSelledProduct: Array<any> = [];
    let preparation_areas: Array<number> = [];
    let listIdsToDelete: Array<number> = [];
    //For determining order Status;
    let hasAMenuProduct = false;
    //Sockets
    let toUpdateInProductionArea: Array<{
      product_selled: SelledProductReduced;
      takeAction: boolean;
      areaId: number;
      productionTicketId: number;
    }> = [];

    if (!!added) {
      let listProductsToRecord = [];
      const areaSalesId = added.areaSalesId;
      let products = [...added.products] as ProductReduced[];

      //Local validations
      if (!areaSalesId) {
        t.rollback();
        return res.status(406).json({
          message: `areaSalesId filed is missing.`,
        });
      }
      const areaSale = await getAreaCache(areaSalesId);

      if (!areaSale) {
        t.rollback();
        return res.status(404).json({
          message: `Area sale not found`,
        });
      }

      if (areaSale.type !== "SALE") {
        t.rollback();
        return res.status(400).json({
          message: `Area provided is not SALE type`,
        });
      }

      //Checking if action belongs to user Business
      if (areaSale.businessId !== user.businessId) {
        t.rollback();
        return res.status(401).json({
          message: `No tiene acceso al recurso solicitado.`,
        });
      }

      let normalizeProducts: Array<ItemProductSelled> = [];
      added.products.forEach((element: ProductReduced) => {
        normalizeProducts.push({
          productId: element.productId,
          quantity: element.quantity,
          productionAreaId: element.productionAreaId,
          variationId: element.variationId,
          addons: element.addons,
        });
      });

      const result = await substractProductStockDisponibility(
        {
          products: normalizeProducts,
          stockAreaId: areaSale.stockAreaId,
          businessId: user.businessId,
          strict: !enable_to_sale_in_negative,
        },
        t
      );
      if (!internalCheckerResponse(result)) {
        t.rollback();
        Logger.error(result.message || "Ha ocurrido un error inesperado.", {
          origin: "manageProductsInOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        });
        return res.status(result.status).json({
          message: result.message,
        });
      }

      //To emit via sockets
      productsAdded = result.data.productsAdded;

      //Obtaining full data from products
      const productsFound = await getStoreProductsCache(user.businessId, tId);

      //Generals
      //Analyzing and creating production tickets
      products.forEach((item) => {
        const fullProduct = productsFound.find(
          (element) => element.id === item.productId
        );
        if (fullProduct) {
          let areaId: number | undefined;
          if (
            fullProduct.listProductionAreas &&
            fullProduct.listProductionAreas.length !== 0
          ) {
            if (fullProduct.listProductionAreas.length === 1) {
              areaId = fullProduct.listProductionAreas[0].id;
            } else {
              const productReceived = products.find(
                (p) => p.productId === fullProduct.id
              )!;
              const found = fullProduct.listProductionAreas.find(
                (a) => a.id === productReceived.productionAreaId
              );
              if (found) {
                areaId = found.id;
              }
            }
          }
          //Checking if area is already created
          if (areaId && !preparation_areas.includes(areaId)) {
            preparation_areas.push(areaId);
          }
        }
      });

      let addBulkTickets = [];
      for (const area of preparation_areas) {
        let nextProductionNumber = 0;
        order.tickets
          .filter((item) => item.areaId === area)
          .forEach((element) => {
            if (element.productionNumber > nextProductionNumber) {
              nextProductionNumber = element.productionNumber;
            }
          });
        nextProductionNumber++;
        addBulkTickets.push({
          status: "RECEIVED",
          areaId: area,
          orderReceiptId: order.id,
          name: order.name || `#${order.operationNumber}`,
          productionNumber: nextProductionNumber,
        });
      }

      listTickets = await ProductionTicket.bulkCreate(addBulkTickets, {
        transaction: t,
        returning: true,
      });

      for (const product of added.products as ProductReduced[]) {
        //Analyzing if where found
        const productDetails = productsFound.find(
          (item) => item.id === product.productId
        );
        if (!productDetails) {
          t.rollback();
          return res.status(404).json({
            message: `El producto con id ${product.productId} no fue encontrado.`,
          });
        }
        if (
          !["MENU", "ADDON", "SERVICE", "COMBO", "STOCK", "VARIATION"].includes(
            productDetails.type
          )
        ) {
          t.rollback();
          return res.status(400).json({
            message: `El producto ${productDetails.name} no es un producto Listo para la venta.`,
          });
        }
        //Defining stockProductionAreaId
        let productionAreaId: number = areaSale.stockAreaId;
        if (
          productDetails.listProductionAreas &&
          productDetails.listProductionAreas.length !== 0
        ) {
          if (productDetails.listProductionAreas.length === 1) {
            productionAreaId = productDetails.listProductionAreas[0].id;
          } else {
            const found = productDetails.listProductionAreas.find(
              (element) => element.id === product.productionAreaId
            );
            if (found) {
              productionAreaId = found.id;
            }
          }
        }
        let itemPrice;
        if (product.price) {
          itemPrice = {
            price: product.price.amount,
            codeCurrency: product.price.codeCurrency,
          };
        } else {
          //Obtaining price of product
          itemPrice = obtainingProductPriceSystemPriceDefined(
            productDetails,
            product.variationId,
            economicCycle.priceSystemId
          );
        }
        if (!itemPrice) {
          t.rollback();
          return res.status(400).json({
            message: `El precio del producto ${productDetails.name} no fue encontrado. Por favor consule al propietario de negocio.`,
          });
        }

        let totalSelledPrice = mathOperation(
          itemPrice.price,
          product.quantity,
          "multiplication",
          precission_after_coma
        );

        //Calculate itemCost
        let totalSelledCost = mathOperation(
          productDetails.averageCost,
          product.quantity,
          "multiplication",
          precission_after_coma
        );
        //If it is available, creating a virtual selledProduct
        let selled_product: any = {
          name: productDetails.name,
          measure: productDetails.measure,
          colorCategory: productDetails.salesCategory?.color,
          quantity: product.quantity,
          productId: productDetails.id,
          type: productDetails.type,
          orderReceiptId: order.id,
          economicCycleId: economicCycle.id,
          imageId: productDetails.images?.[0]?.id,
          addons: [],
          productionAreaId,
          observations: product.observations,
          variationId: product.variationId,
          priceUnitary: {
            amount: itemPrice.price,
            codeCurrency: itemPrice.codeCurrency,
          },
        };

        let addAddonsBulk: any = [];
        //Analizing if addons received
        if (product.addons && product.addons?.length !== 0) {
          hasAMenuProduct = true;
          if (!["MENU", "SERVICE"].includes(productDetails.type)) {
            t.rollback();
            return res.status(400).json({
              message: `Solo los productos de tipo Menú/Servicio pueden contener agregos. Agrego en ${productDetails.name} no válido.`,
            });
          }
          let listProductWithAddonToRecord = [];
          for (const addon of product.addons) {
            const addon_found = productDetails.availableAddons?.find(
              (item) => item.id === addon.id
            );
            if (!addon_found) {
              t.rollback();
              return res.status(404).json({
                message: `Addon id ${addon.id} provided not available in the product provided ${product.productId}.`,
              });
            }
            //Calculate addon the cost
            totalSelledCost += mathOperation(
              addon_found.averageCost,
              addon.quantity,
              "multiplication",
              precission_after_coma
            );
            listProductWithAddonToRecord.push(
              `+(x${addon.quantity}) ${addon_found.name}`
            );
            //Obtaining price of product
            const addonPrice = obtainingProductPriceSystemPriceDefined(
              addon_found,
              undefined,
              economicCycle.priceSystemId
            );
            if (!addonPrice) {
              t.rollback();
              return res.status(400).json({
                message: `El precio del producto ${addon_found.name} no fue encontrado. Por favor consule al propietario de negocio.`,
              });
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
            if (addonPrice.codeCurrency === itemPrice.codeCurrency) {
              totalSelledPrice += addonPrice.price * addon.quantity;
            } else {
              const availableCurrency = availableCurrencies.find(
                (item) => item.currency.code === addonPrice?.codeCurrency
              );
              if (!availableCurrency) {
                t.rollback();
                return res.status(404).json({
                  message: `The currency of addon not found as available`,
                });
              }
              totalSelledPrice += mathOperation(
                addonPrice.price,
                availableCurrency.exchangeRate,
                "multiplication",
                2
              );
            }
          }
          listProductsToRecord.push(
            `(x${product.quantity}) ${
              productDetails.name
            } ${listProductWithAddonToRecord.join(",")}`
          );
        } else {
          //If not addons
          listProductsToRecord.push(
            `(x${product.quantity}) ${productDetails.name}`
          );
        }
        //Adding to ticket if productionArea exist
        if (productionAreaId) {
          const ticket_found = listTickets.find(
            (item) => item.areaId === productionAreaId
          );
          if (ticket_found) {
            selled_product.productionTicketId = ticket_found.id;
          }
        }
        if (
          ["MENU", "ADDON", "SERVICE", "COMBO"].includes(productDetails.type) ||
          (shouldGenerateProductionTickets && productDetails.type === "STOCK")
        ) {
          selled_product.status = "RECEIVED";
          //Adding selled product to the virtual store for creating at the end
          addBulkSelledProduct.push({
            ...selled_product,
            totalCost: totalSelledCost,
            addons: addAddonsBulk,
            priceTotal: {
              amount: totalSelledPrice,
              codeCurrency: itemPrice.codeCurrency,
            },
          });
        } else {
          selled_product.status = !!selled_product.productionTicketId
            ? "RECEIVED"
            : "COMPLETED";
          //Analyzing if product exist already
          let selledProductFound;
          if (product.variationId) {
            selledProductFound = order.selledProducts.find(
              (item) =>
                item.productId === productDetails.id &&
                item.variationId === product.variationId
            );
          } else {
            selledProductFound = order.selledProducts.find(
              (item) => item.productId === productDetails.id
            );
          }
          if (selledProductFound) {
            const newQuantity = selledProductFound.quantity + product.quantity;
            //Calculate itemCost
            totalSelledCost = mathOperation(
              productDetails.averageCost,
              newQuantity,
              "multiplication",
              precission_after_coma
            );
            priceUpdates.push({
              id: selledProductFound.priceTotalId,
              amount: mathOperation(
                itemPrice.price,
                newQuantity,
                "multiplication",
                precission_after_coma
              ),
            });
            selledProductUpdatesQuantities.push({
              id: selledProductFound.id,
              quantity: newQuantity,
              status: selled_product.status,
              observations: selled_product.observations,
              totalCost: totalSelledCost,
            });
          } else {
            //Adding selled product to the virtual store for creating at the end
            addBulkSelledProduct.push({
              ...selled_product,
              totalCost: totalSelledCost,
              addons: addAddonsBulk,
              areaId: areaSale.stockAreaId,
              priceTotal: {
                amount: totalSelledPrice,
                codeCurrency: itemPrice.codeCurrency,
              },
            });
          }
        }
      }

      //Registering actions
      listRecords.push({
        action: "PRODUCT_ADDED",
        title: getTitleOrderRecord("PRODUCT_ADDED"),
        details: listProductsToRecord.join(";"),
        madeById: user.id,
      });
    }

    if (!!deleted) {
      let listProductsToRecord = [];
      const product_selled = [...deleted.product_selled];
      //Local validations
      if (
        !product_selled &&
        (product_selled as SelledProductReduced[]).length === 0
      ) {
        t.rollback();
        return res.status(406).json({
          message: `product_selled can't be empty`,
        });
      }

      let normalizeProducts: Array<ItemProductSelled> = [];
      for (const element of product_selled as SelledProductReduced[]) {
        const foundSelled = order.selledProducts.find(
          (item) => item.id === element.selledProductId
        );
        if (!foundSelled) {
          t.rollback();
          return res.status(404).json({
            message: `El producto vendido con id ${element.selledProductId} no fue encontrado en la orden.`,
          });
        }
        let bulkAddon = [];
        for (const addon of element.addons || []) {
          const found = foundSelled.addons?.find(
            (item) => item.id === addon.selledProductAddonId
          );
          if (found) {
            bulkAddon.push({
              id: found.id,
              quantity: addon.quantity,
            });
          }
        }
        //If was deleted selledProduct completly, remove all its addons
        if (foundSelled.quantity === element.quantity) {
          bulkAddon = [];
          for (const addon of foundSelled.addons || []) {
            bulkAddon.push({
              id: addon.productId,
              quantity: addon.quantity,
            });
          }
        }
        if (element.restore) {
          normalizeProducts.push({
            productId: foundSelled.productId,
            quantity: element.quantity,
            productionAreaId: foundSelled.productionAreaId,
            variationId: foundSelled.variationId,
            addons: bulkAddon,
          });
        }
      }

      const result = await restoreProductStockDisponibility(
        {
          products: normalizeProducts,
          stockAreaId: order.areaSales!.stockAreaId,
          businessId: user.businessId,
          userId: user.id,
          isAtSameEconomicCycle:
            order.createdInActualCycle === undefined ||
            order.createdInActualCycle,
        },
        t
      );

      if (!internalCheckerResponse(result)) {
        t.rollback();
        Logger.error(result.message || "Ha ocurrido un error inesperado.", {
          origin: "manageProductsInOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        });
        return res.status(result.status).json({
          message: result.message,
        });
      }
      //To emit via sockets
      productsDeleted = result.data.productsRemoved;
      for (const deletedProduct of product_selled as SelledProductReduced[]) {
        let totalRemoved = 0;
        const foundDeletedSelled = order.selledProducts.find(
          (item) => item.id === deletedProduct.selledProductId
        )!;

        //Updating total to remove in order
        if (foundDeletedSelled.quantity === deletedProduct.quantity) {
          totalRemoved = foundDeletedSelled.priceTotal.amount;
          //Removing product
          listIdsToDelete.push(foundDeletedSelled.id);
        } else {
          totalRemoved = mathOperation(
            foundDeletedSelled.priceUnitary.amount,
            deletedProduct.quantity,
            "multiplication",
            2
          );
        }
        let totalSelledCostToReduce = mathOperation(
          foundDeletedSelled.product.averageCost,
          deletedProduct.quantity,
          "multiplication",
          precission_after_coma
        );
        //For emit to update Production Area via Sockets
        if (foundDeletedSelled.productionAreaId) {
          toUpdateInProductionArea.push({
            product_selled: deletedProduct,
            takeAction: false,
            areaId: foundDeletedSelled.productionAreaId,
            productionTicketId: foundDeletedSelled.productionTicketId,
          });
        }
        let productRemovedToRecord = [];

        //By default all products cancelled are restored
        productRemovedToRecord.push(
          `Restaurado en almacén (x${deletedProduct.quantity}) ${foundDeletedSelled?.name}`
        );
        //Analyzing how should be the restore depending of the specific product type
        if (
          ["MENU", "SERVICE", "ADDON", "COMBO"].includes(
            foundDeletedSelled.type
          )
        ) {
          if (foundDeletedSelled.quantity === deletedProduct.quantity) {
            //Analyzing if product has addons and updating its quantities
            if (
              foundDeletedSelled.addons &&
              foundDeletedSelled.addons?.length !== 0
            ) {
              let listProductWithAddonToRecord = [];
              for (const addon of foundDeletedSelled.addons) {
                listProductWithAddonToRecord.push(
                  `(x${addon.quantity}) ${addon.name}`
                );
              }
              productRemovedToRecord.push(
                `${listProductWithAddonToRecord.join(",")}`
              );
            }
          } else {
            //Analyzing if addons were received
            if (deletedProduct.addons && deletedProduct.addons.length !== 0) {
              let listProductWithAddonToRecord = [];
              for (const addon_received of deletedProduct.addons) {
                const addon_found = foundDeletedSelled.addons?.find(
                  (item) => item.id === addon_received.selledProductAddonId
                );

                if (!addon_found) {
                  t.rollback();
                  return res.status(404).json({
                    message: `SelledAddonProduct id ${addon_received.selledProductAddonId} not found`,
                  });
                }

                if (addon_found.quantity < addon_received.quantity) {
                  t.rollback();
                  return res.status(404).json({
                    message: `La cantidad seleccionada de ${addon_found.name} no es válida. Cantidad posible a eliminar: ${addon_found.quantity}`,
                  });
                }

                totalRemoved += mathOperation(
                  addon_received.quantity,
                  addon_found.priceUnitary.amount,
                  "multiplication",
                  2
                );
                listProductWithAddonToRecord.push(
                  `(x${addon_received.quantity}) ${addon_found.name}`
                );

                //Calculate addon the cost
                totalSelledCostToReduce += mathOperation(
                  addon_found.product.averageCost,
                  addon_received.quantity,
                  "multiplication",
                  precission_after_coma
                );
                //Updating quantities in Selled Addon Product (*** This is a substract ***)
                const found_selled_quantity =
                  selledProductAddonUpdatesQuantities.find(
                    (item) => item.id === addon_found.id
                  );
                if (found_selled_quantity) {
                  selledProductAddonUpdatesQuantities =
                    selledProductAddonUpdatesQuantities.map((item) => {
                      if (item.id === addon_found.id) {
                        return {
                          ...item,
                          quantity: mathOperation(
                            item.quantity,
                            addon_received.quantity,
                            "subtraction",
                            precission_after_coma
                          ),
                        };
                      }
                      return item;
                    });
                } else {
                  selledProductAddonUpdatesQuantities.push({
                    id: addon_found.id,
                    quantity: mathOperation(
                      addon_found.quantity,
                      addon_received.quantity,
                      "subtraction",
                      precission_after_coma
                    ),
                  });
                }
              }
              productRemovedToRecord.push(
                `${listProductWithAddonToRecord.join(",")}`
              );
            }
          }
        }

        priceUpdates.push({
          id: foundDeletedSelled.priceTotal.id,
          amount: foundDeletedSelled.priceTotal.amount - totalRemoved,
        });

        selledProductUpdatesQuantities.push({
          id: foundDeletedSelled.id,
          quantity: foundDeletedSelled.quantity - deletedProduct.quantity,
          status: foundDeletedSelled.status,
          totalCost: mathOperation(
            foundDeletedSelled.totalCost,
            totalSelledCostToReduce,
            "subtraction",
            precission_after_coma
          ),
          observations: deletedProduct.observations,
        });
        listProductsToRecord.push(productRemovedToRecord);
      }

      //Registering actions
      listRecords.push({
        action: "PRODUCT_REMOVED",
        title: getTitleOrderRecord("PRODUCT_REMOVED"),
        details: listProductsToRecord.join(";"),
        madeById: user.id,
      });
    }

    //Updating SelledProductAddon quantities
    if (selledProductAddonUpdatesQuantities.length !== 0) {
      const to_removed = selledProductAddonUpdatesQuantities.filter(
        (item) => item.quantity === 0
      );
      const update = selledProductAddonUpdatesQuantities.filter(
        (item) => item.quantity !== 0
      );
      await SelledProductAddon.bulkCreate(update, {
        updateOnDuplicate: ["quantity"],
        transaction: t,
      });
      if (to_removed.length !== 0) {
        await SelledProductAddon.destroy({
          where: {
            id: to_removed.map((item) => item.id),
          },
          transaction: t,
        });
      }
    }

    //Creating stockSelledProducts if exists
    if (addBulkSelledProduct.length !== 0) {
      await SelledProduct.bulkCreate(addBulkSelledProduct, {
        include: [
          {
            model: SelledProductAddon,
            as: "addons",
            include: [{ model: Price, as: "priceUnitary" }],
          },
          { model: Price, as: "priceTotal" },
          { model: Price, as: "priceUnitary" },
        ],
        transaction: t,
      });
    }

    //Updating prices
    if (priceUpdates.length !== 0) {
      await Price.bulkCreate(priceUpdates, {
        updateOnDuplicate: ["amount"],
        transaction: t,
      });
    }

    //Create Records
    if (listRecords.length !== 0) {
      await OrderReceiptRecord.bulkCreate(listRecords, {
        transaction: t,
      });
    }

    //Updating SelledProduct Table
    //Verifiying there is no selled product to update that has been marked for delete
    const selled_to_update = selledProductUpdatesQuantities.filter(
      (item) => !listIdsToDelete.includes(item.id)
    );
    if (selled_to_update.length !== 0) {
      await SelledProduct.bulkCreate(selled_to_update, {
        updateOnDuplicate: ["quantity", "status", "observations", "totalCost"],
        transaction: t,
      });
    }

    //Deleting selled Products
    if (listIdsToDelete.length !== 0) {
      await SelledProduct.destroy({
        where: {
          id: listIdsToDelete,
        },
        transaction: t,
      });
    }
    //Obtain the last operationNumber if first time
    if (orderId === "0" && creation === "first-creation") {
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
        lastOperationNumber += 1;
      }
      order.operationNumber = lastOperationNumber;
    }

    //Analyzing status
    if (hasAMenuProduct) {
      //Means there area a MENU product in the order, then status order change.
      order.status = "IN_PROCESS";
    } else if (order.status !== "IN_PROCESS") {
      //Means all products were from stock
      order.status = "COMPLETED";
    }
    await order.save({ transaction: t });
    await order.reload({ transaction: t });

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
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
          origin: "manageProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    await t.commit();

    //Processing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id
    );
    res.status(200).json(order_to_emit);

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "PROCESS_PRODUCTS_IN_ORDER",
        params: {
          order: order_to_emit,
          productsAdded,
          productsDeleted,
          from: user.id,
          newOrder: orderId === "0" && creation === "first-creation",
          fromName: user.displayName || user.username,
          origin,
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

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

    if (productsAdded.length !== 0) {
      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds: productsAdded.map((item) => item.productId),
            businessId: user.businessId,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    if (productsDeleted.length !== 0) {
      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds: productsDeleted.map((item) => item.productId),
            businessId: user.businessId,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }
    if (listTickets.length !== 0 || toUpdateInProductionArea.length !== 0) {
      socketQueue.add(
        {
          code: "PROCESS_TICKETS_PRODUCTION_AREA",
          params: {
            order: order_to_emit,
            listTickets,
            preparation_areas,
            deleteInPreparationArea: toUpdateInProductionArea,
            from: user.id,
            fromName: user.displayName || user.username,
            origin,
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

export const checkStatusOrder = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    let order = await OrderReceipt.findByPk(id);

    if (!order) {
      return res.status(404).json({
        message: `Order not found`,
      });
    }

    //Permission Check
    if (order?.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    res.status(200).json({
      id: order.id,
      status: order.status,
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

export const getOrder = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    let order = await OrderReceipt.scope("full_details").findByPk(id);

    if (!order) {
      return res.status(404).json({
        message: `Order not found`,
      });
    }

    //Permission Check
    if (order?.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    res.status(200).json(order);
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

export const getAllOrderStatus = async (req: any, res: Response) => {
  try {
    const orderStatus = [
      {
        code: "WITH_ERRORS",
        value: "Con errores",
      },
      {
        code: "CREATED",
        value: "Creada",
      },
      {
        code: "PAYMENT_PENDING",
        value: "Pendiente de pago",
      },
      {
        code: "IN_PROCESS",
        value: "Procesando",
      },
      {
        code: "BILLED",
        value: "Facturada",
      },
      {
        code: "CANCELLED",
        value: "Cancelada",
      },

      {
        code: "REFUNDED",
        value: "Reembolsada",
      },
      {
        code: "COMPLETED",
        value: "Completada",
      },
      {
        code: "IN_TRANSIT",
        value: "En tránsito",
      },
      {
        code: "DELIVERED",
        value: "Entregada",
      },
    ];

    res.status(200).json(orderStatus);
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

export const findAllOrdersForTransfer = async (req: any, res: Response) => {
  try {
    const { per_page, page, search, isPayed, ...params } = req.query;
    const user: User = req.user;

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = [
      "isForTakeAway",
      "clientId",
      "origin",
      "modifiedPrice",
      "pickUpInStore",
      "operationNumber",
    ];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    //Searchable
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.and] = [
        where(fn("unaccent", col("OrderReceipt.name")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_orders = await OrderReceipt.findAndCountAll({
      attributes: [
        "id",
        "name",
        "status",
        "createdAt",
        "updatedAt",
        "businessId",
        "operationNumber",
        "customerNote",
        "origin",
        "paidAt",
        "pickUpInStore",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        paidAt: null,
        ...where_clause,
        status: {
          [Op.not]: ["CANCELLED", "REFUNDED", "BILLED"],
        },
      },
      include: [
        {
          model: SelledProduct,
          attributes: ["name"],
        },
        {
          model: OrderReceiptTotal,
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: Client,
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    let totalPages = Math.ceil(found_orders.count / limit);
    if (found_orders.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_orders.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: totalPages,
      items: found_orders.rows,
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

export const findAllOrdersV2 = async (req: any, res: Response) => {
  try {
    const {
      per_page,
      page,
      status,
      order,
      orderBy,
      actives,
      paymentCurrencyCode,
      billFrom,
      billTo,
      dateFrom,
      dateTo,
      paidFrom,
      paidTo,
      origin,
      activeEconomicCycle,
      isFromEconomicCycle,
      search,
      productName,
      hasDiscount,
      paymentWay,
      deliveryAt,
      coupons,
      isPayed,
      productId,
      ...params
    } = req.query;
    const user: User = req.user;    

    //Preparing search
    let where_clause: any = {};
    let where_product_clause: any = {};
    const searchable_fields = [
      "isForTakeAway",
      "managedById",
      "createdAt",
      "areaSalesId",
      "economicCycleId",
      "houseCosted",
      "discount",
      "clientId",
      "origin",
      "modifiedPrice",
      "pickUpInStore",
      "operationNumber",
      "shippingById",
    ];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    const isManagerShipping = user.roles?.some(item=>item.code === "MANAGER_SHIPPING");

    if(isManagerShipping){
        where_clause.shippingById = user.id;
    }

    if (activeEconomicCycle) {
      const economicCycle = await getActiveEconomicCycleCache(user.businessId);

      if (!economicCycle) {
        return res.status(404).json({
          message: `There is no an economic cycle active.`,
        });
      }

      where_clause.economicCycleId = economicCycle.id;
    }

    if (isFromEconomicCycle) {
      where_clause.economicCycleId = {
        [Op.not]: null,
      };
    }

    if (origin) {
      const originTypes = origin.split(",");

      const allTypes = [
        "online",
        "woo",
        "pos",
        "admin",
        "shop",
        "shopapk",
        "marketplace",
        "apk",
      ];

      for (const item of originTypes) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
          });
        }
      }

      where_clause.origin = {
        [Op.or]: originTypes,
      };
    }

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["id", "DESC"]];
    }

    if (status) {
      const statusTypes = status.split(",");

      where_clause.status = {
        [Op.or]: statusTypes,
      };
    }

    //Including esential rows
    let includeBody: any = [
      {
        model: OrderReceiptTotal,
        attributes: ["amount", "codeCurrency"],
      },

      //Provisional for online orders
      {
        model: ShippingAddress,
        attributes: [
          "street_1",
          "street_2",
          "firstName",
          "lastName",
          "company",
          "city",
          "postalCode",
          "phone",
          "email",
          "description",
        ],
        include: [
          {
            model: Municipality,
            attributes: ["name", "code"],
          },
          {
            model: Province,
            attributes: ["name", "code"],
          },
          {
            model: Country,
            attributes: ["name", "code"],
          },
        ],
      },
    ];

    if (coupons) {
      const allCoupos = coupons.split(",");
      includeBody.push({
        model: Coupon,
        attributes: ["code", "amount", "discountType"],
        through: {
          attributes: [],
        },
        where: {
          code: {
            [Op.or]: allCoupos,
          },
        },
      });
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

    //Date paidAt filtering
    if (billFrom && billTo) {
      //Special case between dates
      where_clause["paidAt"] = {
        [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };

      ordenation = [["paidAt", "DESC"]];
    } else {
      if (billFrom) {
        where_clause["paidAt"] = {
          [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };

        ordenation = [["paidAt", "DESC"]];
      }

      if (billTo) {
        where_clause["paidAt"] = {
          [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };

        ordenation = [["paidAt", "DESC"]];
      }
    }

    if (deliveryAt) {
      //Special case between dates
      where_clause["deliveryAt"] = {
        [Op.gte]: moment(deliveryAt, "YYYY-MM-DD")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(deliveryAt, "YYYY-MM-DD")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };
    }

    if (paidFrom || paidTo) {
      //Bill from and to
      const clauseTotalPay: any = {
        model: OrderReceiptPrice,
        attributes: ["id", "price", "codeCurrency"],
      };

      if (paidFrom && paidTo) {
        //Special case between amounts
        clauseTotalPay.where = {
          price: {
            [Op.gte]: paidFrom,
            [Op.lte]: paidTo,
          },
        };
      } else {
        if (paidFrom) {
          clauseTotalPay.where = {
            price: {
              [Op.gte]: paidFrom,
            },
          };
        }

        if (paidTo) {
          clauseTotalPay.where = {
            price: {
              [Op.lte]: paidTo,
            },
          };
        }
      }

      includeBody.push(clauseTotalPay);
    }

    //Searchable
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.and] = [
        where(fn("unaccent", col("OrderReceipt.name")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    if (productName || productId) {
      let includeWhereSelled: any = {
        model: SelledProduct,
        attributes: [
          "id",
          "name",
          "areaId",
          "productId",
          "variationId",
          "createdAt",
          "updatedAt",
          "totalCost",
          "modifiedPrice",
          "quantity",
        ],
        include: [
          {
            model: Variation,
            attributes: ["name"],
          },
        ],
      };

      if (productName) {
        const separatlyWords: Array<string> = productName.split(" ");
        let includeToSearch: Array<{ [key: string]: string }> = [];
        separatlyWords.forEach((word) => {
          const cleanWord = word
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
        });

        where_product_clause[Op.and] = [
          where(fn("unaccent", col("selledProducts.name")), {
            [Op.and]: includeToSearch,
          }),
        ];
      }

      if (productId) {
        where_product_clause.productId = productId;
      }

      includeWhereSelled.where = where_product_clause;
      includeBody.push(includeWhereSelled);
    }

    if (hasDiscount === "true") {
      where_clause[Op.and] = {
        discount: {
          [Op.gt]: 0,
        },
      };
    }

    if (isPayed === "true") {
      where_clause.paidAt = {
        [Op.not]: null,
      };
    } else if (isPayed === "false") {
      where_clause.paidAt = null;
    }

    //Payment way
    const clausePaymentWay: any = {
      model: CurrencyPayment,
      attributes: ["id", "amount", "codeCurrency", "paymentWay"],
    };

    if (paymentWay && paymentCurrencyCode) {
      const paymentTypes = paymentWay.split(",");

      const allTypes = ["CASH", "TRANSFER"];

      for (const item of paymentTypes) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
          });
        }
      }
      clausePaymentWay.where = {
        paymentWay: paymentTypes,
        codeCurrency: paymentCurrencyCode,
      };
    } else {
      if (paymentWay) {
        const paymentTypes = paymentWay.split(",");

        const allTypes = ["CASH", "TRANSFER"];

        for (const item of paymentTypes) {
          if (!allTypes.includes(item)) {
            return res.status(400).json({
              message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
            });
          }
        }
        clausePaymentWay.where = {
          paymentWay: paymentTypes,
        };
      }

      if (paymentCurrencyCode) {
        clausePaymentWay.where = {
          codeCurrency: paymentCurrencyCode,
        };
      }
    }

    includeBody.push(clausePaymentWay);

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_orders = await OrderReceipt.findAndCountAll({
      attributes: [
        "id",
        "name",
        "status",
        "discount",
        "observations",
        "numberClients",
        "closedDate",
        "isForTakeAway",
        "createdAt",
        "updatedAt",
        "businessId",
        "operationNumber",
        "houseCosted",
        "totalCost",
        "modifiedPrice",
        "customerNote",
        "origin",
        "paidAt",
        "pickUpInStore",
        "shippingById",
        "deliveryAt",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        ...where_clause,
      },
      include: includeBody,
      limit,
      offset,
      //@ts-ignore
      order: ordenation,
    });

    let totalPages = Math.ceil(found_orders.count / limit);
    if (found_orders.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_orders.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: totalPages,
      items: found_orders.rows,
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

//@Deprecated
export const findAllOrders = async (req: any, res: Response) => {
  try {
    //Enought time to process this request
    req.setTimeout(180000); //3 minutes = 60*3*1000

    const {
      per_page,
      page,
      status,
      order,
      orderBy,
      actives,
      paymentCurrencyCode,
      billFrom,
      billTo,
      dateFrom,
      dateTo,
      paidFrom,
      paidTo,
      origin,
      activeEconomicCycle,
      isFromEconomicCycle,
      search,
      productName,
      hasDiscount,
      paymentWay,
      deliveryAt,
      coupons,
      isPayed,
      all_data,
      productId,
      ...params
    } = req.query;
    const user: User = req.user;

    //Preparing search
    let where_clause: any = {};
    let where_product_clause: any = {};
    let requiredSelledProduct = false;
    const searchable_fields = [
      "isForTakeAway",
      "managedById",
      "createdAt",
      "areaSalesId",
      "economicCycleId",
      "houseCosted",
      "discount",
      "clientId",
      "origin",
      "modifiedPrice",
      "pickUpInStore",
      "operationNumber",
      "shippingById",
    ];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    if (activeEconomicCycle) {
      const economicCycle = await getActiveEconomicCycleCache(user.businessId);

      if (!economicCycle) {
        return res.status(404).json({
          message: `There is no an economic cycle active.`,
        });
      }

      where_clause.economicCycleId = economicCycle.id;
    }

    if (isFromEconomicCycle) {
      where_clause.economicCycleId = {
        [Op.not]: null,
      };
    }

    if (origin) {
      const originTypes = origin.split(",");

      const allTypes = [
        "online",
        "woo",
        "pos",
        "admin",
        "shop",
        "shopapk",
        "marketplace",
        "apk",
      ];

      for (const item of originTypes) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
          });
        }
      }

      where_clause.origin = {
        [Op.or]: originTypes,
      };
    }

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["id", "DESC"]];
    }

    if (status) {
      const statusTypes = status.split(",");

      where_clause.status = {
        [Op.or]: statusTypes,
      };
    }

    let clauseCoupons: any = {
      model: Coupon,
      attributes: ["code", "amount", "discountType"],
      through: {
        attributes: [],
      },
      paranoid: false,
    };

    if (coupons) {
      const allCoupos = coupons.split(",");
      clauseCoupons = {
        model: Coupon,
        attributes: ["code", "amount", "discountType"],
        through: {
          attributes: [],
        },
        where: {
          code: {
            [Op.or]: allCoupos,
          },
        },
      };
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

    //Date paidAt filtering
    if (billFrom && billTo) {
      //Special case between dates
      where_clause["paidAt"] = {
        [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };

      ordenation = [["paidAt", "DESC"]];
    } else {
      if (billFrom) {
        where_clause["paidAt"] = {
          [Op.gte]: moment(billFrom, "YYYY-MM-DD HH:mm")
            .startOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };

        ordenation = [["paidAt", "DESC"]];
      }

      if (billTo) {
        where_clause["paidAt"] = {
          [Op.lte]: moment(billTo, "YYYY-MM-DD HH:mm")
            .endOf("day")
            .format("YYYY-MM-DD HH:mm:ss"),
        };

        ordenation = [["paidAt", "DESC"]];
      }
    }

    if (deliveryAt) {
      //Special case between dates
      where_clause["deliveryAt"] = {
        [Op.gte]: moment(deliveryAt, "YYYY-MM-DD")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        [Op.lte]: moment(deliveryAt, "YYYY-MM-DD")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      };
    }

    //Bill from and to
    const clauseTotalPay: any = {
      model: OrderReceiptPrice,
      attributes: ["id", "price", "codeCurrency"],
    };

    if (paidFrom && paidTo) {
      //Special case between amounts
      clauseTotalPay.where = {
        price: {
          [Op.gte]: paidFrom,
          [Op.lte]: paidTo,
        },
      };
    } else {
      if (paidFrom) {
        clauseTotalPay.where = {
          price: {
            [Op.gte]: paidFrom,
          },
        };
      }

      if (paidTo) {
        clauseTotalPay.where = {
          price: {
            [Op.lte]: paidTo,
          },
        };
      }
    }

    //Searchable
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.and] = [
        where(fn("unaccent", col("OrderReceipt.name")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    if (productName) {
      const separatlyWords: Array<string> = productName.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_product_clause[Op.and] = [
        where(fn("unaccent", col("selledProducts.name")), {
          [Op.and]: includeToSearch,
        }),
      ];

      requiredSelledProduct = true;
    }

    if (productId) {
      where_product_clause.productId = productId;
      requiredSelledProduct = true;
    }

    if (hasDiscount === "true") {
      where_clause[Op.and] = {
        discount: {
          [Op.gt]: 0,
        },
      };
    }

    if (isPayed === "true") {
      where_clause.paidAt = {
        [Op.not]: null,
      };
    } else if (isPayed === "false") {
      where_clause.paidAt = null;
    }

    //Payment way
    const clausePaymentWay: any = {
      model: CurrencyPayment,
      attributes: ["id", "amount", "codeCurrency", "paymentWay"],
    };

    if (paymentWay && paymentCurrencyCode) {
      const paymentTypes = paymentWay.split(",");

      const allTypes = ["CASH", "TRANSFER"];

      for (const item of paymentTypes) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
          });
        }
      }
      clausePaymentWay.where = {
        paymentWay: paymentTypes,
        codeCurrency: paymentCurrencyCode,
      };
    } else {
      if (paymentWay) {
        const paymentTypes = paymentWay.split(",");

        const allTypes = ["CASH", "TRANSFER"];

        for (const item of paymentTypes) {
          if (!allTypes.includes(item)) {
            return res.status(400).json({
              message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
            });
          }
        }
        clausePaymentWay.where = {
          paymentWay: paymentTypes,
        };
      }

      if (paymentCurrencyCode) {
        clausePaymentWay.where = {
          codeCurrency: paymentCurrencyCode,
        };
      }
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_orders = await OrderReceipt.findAndCountAll({
      attributes: [
        "id",
        "name",
        "status",
        "discount",
        "observations",
        "numberClients",
        "closedDate",
        "isForTakeAway",
        "createdAt",
        "updatedAt",
        "businessId",
        "operationNumber",
        "houseCosted",
        "totalCost",
        "modifiedPrice",
        "customerNote",
        "origin",
        "paidAt",
        "pickUpInStore",
        "shippingById",
        "deliveryAt",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        ...where_clause,
      },
      include: [
        {
          model: SelledProduct,
          required: requiredSelledProduct,
          where: where_product_clause,
          attributes: [
            "id",
            "name",
            "areaId",
            "productId",
            "variationId",
            "createdAt",
            "updatedAt",
            "totalCost",
            "modifiedPrice",
            "quantity",
          ],
          include: [
            {
              model: Variation,
              attributes: ["name"],
            },
          ],
        },
        clauseTotalPay,
        clausePaymentWay,
        { model: Area, attributes: ["id", "name"], paranoid: false },
        {
          model: User,
          as: "shippingBy",
          attributes: ["id", "username", "displayName"],
          paranoid: false,
        },
        {
          model: Price,
          as: "shippingPrice",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: Price,
          as: "taxes",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: OrderReceiptTotal,
          attributes: ["amount", "codeCurrency"],
          // separate: true,
        },
        {
          model: ShippingAddress,
          attributes: [
            "street_1",
            "street_2",
            "firstName",
            "lastName",
            "company",
            "city",
            "postalCode",
            "phone",
            "email",
            "description",
          ],
          include: [
            {
              model: Municipality,
              attributes: ["name", "code"],
            },
            {
              model: Province,
              attributes: ["name", "code"],
            },
            {
              model: Country,
              attributes: ["name", "code"],
            },
          ],
        },
        // {
        //     model: BillingAddress,
        //     attributes: [
        //         "street_1",
        //         "street_2",
        //         "firstName",
        //         "lastName",
        //         "company",
        //         "city",
        //         "postalCode",
        //         "phone",
        //         "email",
        //         "description",
        //     ],
        //     include: [
        //         {
        //             model: Municipality,
        //             attributes: ["name", "code"],
        //         },
        //         {
        //             model: Province,
        //             attributes: ["name", "code"],
        //         },
        //         {
        //             model: Country,
        //             attributes: ["name", "code"],
        //         },
        //     ],
        // },
        clauseCoupons,
        {
          model: Client,
          attributes: ["id", "firstName", "lastName", "email"],
          paranoid: false,
        },
        {
          model: Price,
          as: "couponDiscountPrice",
          attributes: ["amount", "codeCurrency"],
        },
      ],
      limit: all_data ? undefined : limit,
      offset,
      //@ts-ignore
      order: ordenation,
    });

    let totalPages = Math.ceil(found_orders.count / limit);
    if (found_orders.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_orders.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: all_data ? 1 : totalPages,
      items: found_orders.rows,
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

export const findAllOrdersWhereProducts = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      per_page,
      page,
      status,
      order,
      orderBy,
      dateFrom,
      dateTo,
      paidFrom,
      paidTo,
      origin,
      ...params
    } = req.query;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = [
      "isForTakeAway",
      "managedById",
      "createdAt",
      "areaSalesId",
      "houseCosted",
      "discount",
      "clientId",
      "origin",
      "modifiedPrice",
      "pickUpInStore",
      "operationNumber",
      "shippingById",
    ];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    if (origin) {
      const originTypes = origin.split(",");

      const allTypes = ["online", "woo", "pos"];

      for (const item of originTypes) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed origin. Fields allowed: ${originTypes}`,
          });
        }
      }

      where_clause.origin = {
        [Op.or]: originTypes,
      };
    }

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["id", "DESC"]];
    }

    if (status) {
      const statusTypes = status.split(",");

      where_clause.status = {
        [Op.or]: statusTypes,
      };
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

    //Paid from and to
    const clauseTotalPay: any = {
      model: OrderReceiptPrice,
      attributes: ["id", "price", "codeCurrency"],
    };

    if (paidFrom && paidTo) {
      //Special case between amounts
      clauseTotalPay.where = {
        price: {
          [Op.gte]: paidFrom,
          [Op.lte]: paidTo,
        },
      };
    } else {
      if (paidFrom) {
        clauseTotalPay.where = {
          price: {
            [Op.gte]: paidFrom,
          },
        };
      }

      if (paidTo) {
        clauseTotalPay.where = {
          price: {
            [Op.lte]: paidTo,
          },
        };
      }
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_selled_products = await SelledProduct.findAndCountAll({
      distinct: true,
      where: {
        productId: id,
      },
      attributes: [
        "id",
        "name",
        "areaId",
        "productId",
        "variationId",
        "totalCost",
        "modifiedPrice",
        "quantity",
      ],
      include: [
        {
          model: OrderReceipt,
          attributes: [
            "id",
            "name",
            "status",
            "createdAt",
            "operationNumber",
            "houseCosted",
            "paidAt",
          ],
          where: {
            businessId: user.businessId,
            ...where_clause,
          },
          include: [
            {
              model: Client,
              attributes: ["id", "firstName", "lastName", "email"],
              paranoid: false,
            },
          ],
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
          model: Variation,
          attributes: ["name"],
        },
      ],
      limit,
      offset,
      //@ts-ignore
      order: ordenation,
    });

    let totalPages = Math.ceil(found_selled_products.count / limit);
    if (found_selled_products.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_selled_products.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages: totalPages,
      items: found_selled_products.rows,
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

export const getAllOrdersPOS = async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    const { areaId } = req.params;
    const user: User = req.user;

    //Analyzing economicCycle
    const economicCycle = await EconomicCycle.findOne({
      where: {
        businessId: user.businessId,
        isActive: true,
      },
    });

    if (!economicCycle) {
      return res.status(404).json({
        message: `No hay ningún ciclo económico abierto. Por favor, consulte al administrador.`,
      });
    }

    //Searchable
    let where_clause: any = {};
    if (search) {
      const separatlyWords: Array<string> = search.split(" ");
      let includeToSearch: Array<{ [key: string]: string }> = [];
      separatlyWords.forEach((word) => {
        const cleanWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
      });

      where_clause[Op.and] = [
        where(fn("unaccent", col("OrderReceipt.name")), {
          [Op.and]: includeToSearch,
        }),
      ];
    }

    const found_orders = await OrderReceipt.findAndCountAll({
      attributes: [
        "id",
        "name",
        "status",
        "discount",
        "commission",
        "observations",
        "numberClients",
        "closedDate",
        "isForTakeAway",
        "createdAt",
        "updatedAt",
        "businessId",
        "operationNumber",
        "houseCosted",
        "totalCost",
        "modifiedPrice",
        "origin",
      ],
      distinct: true,
      where: {
        businessId: user.businessId,
        areaSalesId: areaId,
        economicCycleId: economicCycle.id,
        status: {
          [Op.not]: ["CANCELLED", "CLOSED"],
        },
        ...where_clause,
      },
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
            "modifiedPrice",
          ],
          separate: true,
          include: [
            {
              model: SelledProductAddon,
              attributes: ["id", "quantity", "name", "productId"],
              include: [
                {
                  model: Price,
                  attributes: ["amount", "codeCurrency"],
                },
              ],
            },
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
              model: Variation,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: OrderReceiptPrice,
          attributes: ["price", "codeCurrency"],
          separate: true,
        },
        {
          model: OrderReceiptTotal,
          attributes: ["amount", "codeCurrency"],
          separate: true,
        },
        {
          model: CurrencyPayment,
          attributes: ["amount", "codeCurrency", "paymentWay"],
          separate: true,
        },
        {
          model: User,
          as: "salesBy",
          attributes: ["id", "username", "displayName"],
          paranoid: false,
        },
        {
          model: User,
          as: "managedBy",
          attributes: ["id", "username", "displayName"],
          paranoid: false,
          include: [
            {
              model: Image,
              as: "avatar",
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
          ],
        },
        { model: Area, attributes: ["id", "name"], paranoid: false },
        {
          model: Client,
          attributes: ["id", "firstName", "lastName", "observations", "email"],
          include: [
            {
              model: Address,
              attributes: [
                "id",
                "street_1",
                "street_2",
                "description",
                "city",
                "postalCode",
              ],
            },
            {
              model: Phone,
              through: { attributes: [] },
              attributes: ["id", "number", "description"],
            },
          ],
          paranoid: false,
        },
        {
          model: Price,
          as: "shippingPrice",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: Price,
          as: "taxes",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: Price,
          as: "tipPrice",
          attributes: ["amount", "codeCurrency", "paymentWay"],
        },
        {
          model: Price,
          as: "amountReturned",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: User,
          as: "shippingBy",
          attributes: ["id", "username", "displayName"],
          paranoid: false,
        },
        {
          model: Resource,
          as: "listResources",
          attributes: ["id", "code"],
          through: {
            attributes: [],
          },
        },
        {
          model: Price,
          as: "couponDiscountPrice",
          attributes: ["amount", "codeCurrency"],
        },
        {
          model: Coupon,
          attributes: ["code", "amount", "discountType"],
          through: {
            attributes: [],
          },
        },
        {
          model: OrderReceiptModifier,
          attributes: ["showName", "amount", "codeCurrency"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      totalItems: found_orders.count,
      currentPage: 1,
      totalPages: 1,
      items: found_orders.rows,
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

export const cancelOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const { id } = req.params;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [
        CurrencyPayment,
        CashRegisterOperation,
        {
          model: SelledProduct,
          required: false,
          include: [
            {
              model: SelledProductAddon,
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
        message: `Order not found or not available`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
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

    if (order.dispatch?.status === "ACCEPTED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser cancelada debido a que su despacho asociado fue aceptado.`,
      });
    }

    if (order.status === "REFUNDED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser cancelada debido a que ha sido reembolsada.`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }

    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Sockets
    let toUpdateInProductionArea: Array<{
      product_selled: SelledProductReduced;
      takeAction: boolean;
      areaId: number;
      productionTicketId: number;
    }> = [];

    //General variables
    order.status = "CANCELLED";

    //Unregistering payment date
    //@ts-ignore
    order.paidAt = null;

    let normalizeProducts: Array<ItemProductSelled> = [];
    for (const element of order.selledProducts) {
      const foundSelled = order.selledProducts.find(
        (item) => item.id === element.id
      );

      if (!foundSelled) {
        t.rollback();
        return res.status(404).json({
          message: `El producto vendido con id ${element.id} no fue encontrado en la orden.`,
        });
      }

      let bulkAddon = [];
      for (const addon of element.addons || []) {
        const found = foundSelled.addons?.find((item) => item.id === addon.id);

        if (found) {
          bulkAddon.push({
            id: found.id,
            quantity: addon.quantity,
          });
        }
      }

      //If was deleted selledProduct completly, remove all its addons
      if (foundSelled.quantity === element.quantity) {
        bulkAddon = [];
        for (const addon of foundSelled.addons || []) {
          bulkAddon.push({
            id: addon.id,
            quantity: addon.quantity,
          });
        }
      }

      normalizeProducts.push({
        productId: foundSelled.productId,
        quantity: element.quantity,
        productionAreaId: foundSelled.productionAreaId,
        variationId: foundSelled.variationId,
        addons: bulkAddon,
      });
    }

    const result = await restoreProductStockDisponibility(
      {
        products: normalizeProducts,
        stockAreaId: order.areaSales!.stockAreaId,
        businessId: user.businessId,
        userId: user.id,
        isAtSameEconomicCycle:
          order.createdInActualCycle === undefined ||
          order.createdInActualCycle,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "cancelOrder/restoreProductStockDisponibility",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    for (const product_selled of order.selledProducts) {
      if (["MENU", "SERVICE", "ADDON"].includes(product_selled.type)) {
        if (product_selled.productionAreaId) {
          toUpdateInProductionArea.push({
            product_selled: {
              selledProductId: product_selled.id,
              observations: product_selled.observations,
              quantity: product_selled.quantity,
              restore: true,
              addons:
                product_selled.addons?.map((item) => {
                  return {
                    selledProductAddonId: item.id,
                    quantity: item.quantity,
                  };
                }) ?? [],
            },
            takeAction: false,
            productionTicketId: product_selled.productionTicketId,
            areaId: product_selled.productionAreaId,
          });
        }
      }
    }

    await afterOrderCancelled(
      {
        businessId: order.businessId,
        listResources: order.listResources,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "cancelOrder/afterOrderCancelled",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    //Registering actions
    const record = {
      action: "ORDER_CANCELLED",
      title: getTitleOrderRecord("ORDER_CANCELLED"),
      details: `En punto de venta: ${order.areaSales?.name}.`,
      orderReceiptId: order.id,
      madeById: user.id,
    };

    await order.save({ transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json(order_to_emit);

    orderQueue.add(
      {
        code: "REGISTER_RECORDS",
        params: {
          records: [record],
          orderId: order.id,
        },
      },
      { attempts: 2, removeOnComplete: true, removeOnFail: true }
    );

    socketQueue.add(
      {
        code: "CANCEL_ORDER",
        params: {
          order: order_to_emit,
          productsDeleted: result.data.productsRemoved,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

    //Alert to MANUFACTURER Area
    if (toUpdateInProductionArea.length !== 0) {
      socketQueue.add(
        {
          code: "DELETE_TICKET_IN_PRODUCTION_AREA",
          params: {
            order: order_to_emit,
            deleteInPreparationArea: toUpdateInProductionArea,
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
    }

    productQueue.add(
      {
        code: "CHECKING_PRODUCT",
        params: {
          productsIds: result.data.affectedProducts,
          businessId: user.businessId,
        },
      },
      { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

export const editOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  try {
    const { id } = req.params;
    const { currenciesPayment, ...params } = req.body;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const modelKeys = Object.keys(OrderReceipt.getAttributes());
    const paramsKey = Object.keys(params);
    let message;
    [
      "id",
      "businessId",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "economicCycleId",
      "areaSaleId",
    ].forEach((att) => {
      if (paramsKey.includes(att)) {
        message = `You are not allowed to change ${att} attribute.`;
      }
    });

    if (message) {
      t.rollback();
      return res.status(406).json({ message });
    }

    const allowedStatus = ["COMPLETED"];
    if (params.status && !allowedStatus.includes(params.status)) {
      t.rollback();
      return res.status(400).json({
        message: `${params.status} is not an allowed type. Fields allowed: ${allowedStatus}`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [
        CurrencyPayment,
        CashRegisterOperation,
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Price,
          as: "tipPrice",
        },
      ],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (order.status === "CANCELLED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    const allowedAttributes = [...modelKeys];
    paramsKey.forEach((att) => {
      if (allowedAttributes.includes(att)) {
        //@ts-ignore
        order[att] = params[att];
      }
    });

    if (params.clientId) {
      //Defining ordershipping price
      const client = await Client.findByPk(params.clientId);

      if (!client) {
        t.rollback();
        return res.status(404).json({
          message: `El cliente introducido no fue encontrado.`,
        });
      }
    }

    if (
      order.status === "BILLED" &&
      params.status &&
      params.status !== "BILLED"
    ) {
      //Registering actions
      const record = OrderReceiptRecord.build({
        action: "ORDER_REOPEN",
        title: getTitleOrderRecord("ORDER_REOPEN"),
        details: `En punto de venta: ${order.areaSales?.name}.`,
        orderReceiptId: order.id,
        madeById: user.id,
      });
      await record.save({ transaction: t });

      order.status = "CREATED";
      order.houseCosted = false;
      order.commission = 0;
      order.discount = 0;
      order.meta = "";

      if (order.shippingPrice) {
        await order.shippingPrice.destroy({ transaction: t });
      }

      if (order.tipPrice) {
        await order.tipPrice.destroy({ transaction: t });
      }

      //Unregistering payment date
      //@ts-ignore
      order.paidAt = null;

      //Checking and destroying if orderreceipt payment records exist
      if (order.currenciesPayment.length !== 0) {
        await CurrencyPayment.destroy({
          where: {
            orderReceiptId: order.id,
          },
          transaction: t,
        });
      }

      if (order.cashRegisterOperations.length !== 0) {
        await CashRegisterOperation.destroy({
          where: {
            orderReceiptId: order.id,
          },
          transaction: t,
        });
      }
    }

    await order.save({ transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json(order_to_emit);

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: order_to_emit,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

export const reOpenOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  try {
    const { id } = req.params;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [CurrencyPayment, CashRegisterOperation],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (order.status !== "BILLED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser reabierta.`,
      });
    }

    //Registering actions
    const record = OrderReceiptRecord.build({
      action: "ORDER_REOPEN",
      title: getTitleOrderRecord("ORDER_REOPEN"),
      details: `En punto de venta: ${order.areaSales?.name}.`,
      orderReceiptId: order.id,
      madeById: user.id,
    });
    await record.save({ transaction: t });

    order.status = "CREATED";
    order.houseCosted = false;
    order.commission = 0;
    order.discount = 0;
    order.meta = "";

    if (order.shippingPrice) {
      await order.shippingPrice.destroy({ transaction: t });
    }

    if (order.tipPrice) {
      await order.tipPrice.destroy({ transaction: t });
    }

    //Unregistering payment date
    //@ts-ignore
    order.paidAt = null;

    //Checking and destroying if orderreceipt payment records exist
    if (order.currenciesPayment.length !== 0) {
      await CurrencyPayment.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    if (order.cashRegisterOperations.length !== 0) {
      await CashRegisterOperation.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    await order.save({ transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json(order_to_emit);

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: order_to_emit,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

export const refundOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  try {
    const { id } = req.params;
    const { areaSalesId } = req.body;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [SelledProduct, OrderReceiptPrice, OrderReceiptTotal],
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    if (order.status !== "BILLED") {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser reembolsada. Solo es posible reembolsar órdenes en estado facturada.`,
      });
    }

    let listRecords: any = [];
    //Update original order status
    order.status = "REFUNDED";
    order.save({ transaction: t });

    const area = await getAreaCache(areaSalesId);

    if (!area) {
      t.rollback();
      return res.status(404).json({
        message: `Area not found or not available`,
      });
    }

    if (area.type !== "SALE") {
      t.rollback();
      return res.status(404).json({
        message: `Area is not a SALE`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay ningún ciclo económico abierto. Por favor, abra uno o contacte al propietario de negocio.`,
      });
    }

    //Extracting cash to refund
    let bulkOperations: any = [];
    for (const registerPay of order.totalToPay) {
      bulkOperations.push({
        operation: "MANUAL_WITHDRAW",
        amount: Math.abs(registerPay.amount) * -1,
        codeCurrency: registerPay.codeCurrency,
        orderReceiptId: order.id,
        type: "credit",
        economicCycleId: economicCycle.id,
        areaId: areaSalesId,
        madeById: user.id,
        observations: `Reembolso creado a partir de la orden #${
          order.operationNumber
        } del ${moment(order.createdAt).format("DD/MM/YYYY HH:mm")}`,
      });
    }

    if (bulkOperations.length !== 0) {
      await CashRegisterOperation.bulkCreate(bulkOperations, {
        transaction: t,
      });
    }

    //Returning products to stock
    let normalizeProducts: Array<ItemProductSelled> = [];
    for (const element of order.selledProducts) {
      const foundSelled = order.selledProducts.find(
        (item) => item.id === element.id
      );

      if (!foundSelled) {
        t.rollback();
        return res.status(404).json({
          message: `El producto vendido con id ${element.id} no fue encontrado en la orden.`,
        });
      }

      let bulkAddon = [];
      for (const addon of element.addons || []) {
        const found = foundSelled.addons?.find((item) => item.id === addon.id);

        if (found) {
          bulkAddon.push({
            id: found.id,
            quantity: addon.quantity,
          });
        }
      }

      //If was deleted selledProduct completly, remove all its addons
      if (foundSelled.quantity === element.quantity) {
        bulkAddon = [];
        for (const addon of foundSelled.addons || []) {
          bulkAddon.push({
            id: addon.id,
            quantity: addon.quantity,
          });
        }
      }

      normalizeProducts.push({
        productId: foundSelled.productId,
        quantity: element.quantity,
        productionAreaId: foundSelled.productionAreaId,
        variationId: foundSelled.variationId,
        addons: bulkAddon,
      });
    }

    const result = await restoreProductStockDisponibility(
      {
        products: normalizeProducts,
        stockAreaId: area.stockAreaId,
        businessId: user.businessId,
        userId: user.id,
        isAtSameEconomicCycle:
          order.createdInActualCycle === undefined ||
          order.createdInActualCycle,
      },
      t
    );

    if (!internalCheckerResponse(result)) {
      t.rollback();
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "refundOrder/restoreProductStockDisponibility",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    //Registering actions of old order
    listRecords.push({
      action: "ORDER_REFUNDED",
      title: getTitleOrderRecord("ORDER_REFUNDED"),
      details: `En punto de venta: ${order.areaSales?.name}`,
      orderReceiptId: order.id,
      madeById: user.id,
    });

    await OrderReceiptRecord.bulkCreate(listRecords, { transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
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

export const editOnlineOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const { id } = req.params;
    const { status, ...params } = req.body;
    const user: User = req.user;
    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }
    const modelKeys = Object.keys(OrderReceipt.getAttributes());
    const paramsKey = Object.keys(params);
    let message;
    [
      "id",
      "businessId",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "economicCycleId",
      "areaSaleId",
    ].forEach((att) => {
      if (paramsKey.includes(att)) {
        message = `You are not allowed to change ${att} attribute.`;
      }
    });
    if (message) {
      t.rollback();
      return res.status(406).json({ message });
    }
    const allowedStatus = [
      "COMPLETED",
      "CANCELLED",
      "BILLED",
      "IN_PROCESS",
      "COMPLETED",
      "REFUNDED",
      "IN_TRANSIT",
      "DELIVERED",
    ];

    if (status && !allowedStatus.includes(status)) {
      t.rollback();
      return res.status(400).json({
        message: `${status} is not an allowed type. Fields allowed: ${allowedStatus}`,
      });
    }
    const order = await OrderReceipt.findOne({
      where: {
        id,
        businessId: user.businessId,
      },
      include: [
        CurrencyPayment,
        CashRegisterOperation,
        OrderReceiptPrice,
        OrderReceiptTotal,
        { model: Client, attributes: ["email"] },
        {
          model: SelledProduct,
          include: [
            SelledProductAddon,
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
          ],
          required: false,
        },
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
          as: "couponDiscountPrice",
        },
        {
          model: Coupon,
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
        message: `Order not found or not available`,
      });
    }
    //Check order origin
    if (
      !["woo", "online", "shop", "shopapk", "marketplace", "apk"].includes(
        order.origin
      )
    ) {
      t.rollback();
      return res.status(401).json({
        message: `El origen de la orden no es válido.`,
      });
    }
    if (order.economicCycleId) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden ha sido transferida a un Punto de venta y no puede ser modificada.`,
      });
    }
    if (["CANCELLED", "REFUNDED"].includes(order.status)) {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
      {
        EX: getExpirationTime("order"),
      }
    );

    const configurations = await getBusinessConfigCache(user.businessId);
    const online_shop_area_stock = configurations.find(
      (item) => item.key === "online_shop_area_stock"
    )?.value;
    const allowedAttributes = [...modelKeys];
    paramsKey.forEach((att) => {
      if (allowedAttributes.includes(att)) {
        //@ts-ignore
        order[att] = params[att];
      }
    });

    let listRecords: any = [];
    listRecords.push({
      action: "ORDER_EDITED",
      title: getTitleOrderRecord("ORDER_EDITED"),
      details: `Estado: ${getOrderStatus(status ?? order.status)}`,
      isPublic: false,
      madeById: user.id,
    });

    if (status !== order.status) {
      switch (status) {
        case "CANCELLED":
          {
            //General variables
            order.status = "CANCELLED";

            //Unregistered payment date
            //@ts-ignore
            order.paidAt = null;

            let normalizeProducts: Array<ItemProductSelled> = [];

            for (const selledProduct of order.selledProducts) {
              let bulkAddon = [];
              for (const addon of selledProduct.addons || []) {
                const found = selledProduct.addons?.find(
                  (item) => item.id === addon.id
                );
                if (found) {
                  //If was deleted selledProduct completly, remove all its addons
                  if (selledProduct.quantity === addon.quantity) {
                    bulkAddon = [];
                    for (const addon of selledProduct.addons || []) {
                      bulkAddon.push({
                        id: addon.id,
                        quantity: addon.quantity,
                      });
                    }
                  } else {
                    bulkAddon.push({
                      id: found.id,
                      quantity: addon.quantity,
                    });
                  }
                }
              }
              normalizeProducts.push({
                productId: selledProduct.productId,
                quantity: selledProduct.quantity,
                productionAreaId: selledProduct.productionAreaId,
                variationId: selledProduct.variationId,
                addons: bulkAddon,
              });
            }
            const result = await restoreProductStockDisponibility(
              {
                products: normalizeProducts,
                stockAreaId: Number(online_shop_area_stock),
                businessId: user.businessId,
                userId: user.id,
                isAtSameEconomicCycle:
                  order.createdInActualCycle === undefined ||
                  order.createdInActualCycle,
              },
              t
            );
            if (!internalCheckerResponse(result)) {
              t.rollback();
              Logger.error(
                result.message || "Ha ocurrido un error inesperado.",
                {
                  origin: "editOnlineOrder/restoreProductStockDisponibility",
                  "X-App-Origin": req.header("X-App-Origin"),
                  businessId: user.businessId,
                  userId: user.id,
                }
              );
              return res.status(result.status).json({
                message: result.message,
              });
            }

            await afterOrderCancelled({ businessId: user.businessId }, t);

            if (!internalCheckerResponse(result)) {
              t.rollback();
              Logger.error(
                result.message || "Ha ocurrido un error inesperado.",
                {
                  origin: "editOnlineOrder/afterOrderCancelled",
                  businessId: user.businessId,
                  userId: user.id,
                }
              );
              return res.status(result.status).json({
                message: result.message,
              });
            }

            //Registering actions
            listRecords.push({
              action: "ORDER_CANCELLED",
              title: getTitleOrderRecord("ORDER_CANCELLED"),
              orderReceiptId: order.id,
              madeById: user.id,
            });
          }
          break;
        case "BILLED":
          {
            //Pay order
            const result_pay = await payOrderProcessator(
              {
                businessId: order.businessId,
                origin: "online",
              },
              t
            );
            if (!internalCheckerResponse(result_pay)) {
              t.rollback();
              Logger.error(
                result_pay.message || "Ha ocurrido un error inesperado.",
                {
                  origin: "newOnlineOrder/payOrderProcessator",
                  "X-App-Origin": req.header("X-App-Origin"),
                  businessId: user.businessId,
                  userId: user.id,
                }
              );
              return res.status(result_pay.status).json({
                message: result_pay.message,
              });
            }
            //Registering actions
            listRecords.push({
              action: "ORDER_BILLED",
              title: getTitleOrderRecord("ORDER_BILLED"),
              orderReceiptId: order.id,
              madeById: user.id,
            });
          }
          break;
        default: {
          order.status = status;
          break;
        }
      }

      if (["IN_PROCESS", "IN_TRANSIT", "DELIVERED"].includes(status)) {
        emailQueue.add(
          {
            code: "CHANGE_ORDER_STATUS_NOTIFICATION",
            params: { order },
          },
          { attempts: 2, removeOnComplete: true, removeOnFail: true }
        );
      }
    }

    await order.save({ transaction: t });
    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );
    await t.commit();

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

    res.status(200).json(order_to_emit);

    notificationsQueue.add(
      {
        code: "NOTIFY_ORDER_STATUS_CHANGED",
        params: {
          orderId: order.id,
        },
      },
      { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

export interface CurrencyPaymentReduced {
  amount: number;
  codeCurrency: string;
  paymentWay: payments_ways;
}

//Pay orders comming from POS-Tecopos
export const payOrder = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const { id } = req.params;
    const { coupons, barCodeClient, ...params } = req.body;

    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    let order = await OrderReceipt.findByPk(id, {
      include: [
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
        OrderReceiptPrice,
        CurrencyPayment,
        CashRegisterOperation,
        OrderReceiptTotal,
        PartialPayment,
        {
          model: Coupon,
          through: {
            attributes: [],
          },
        },
        { model: Price, as: "tipPrice" },
        { model: Price, as: "amountReturned" },
        { model: Price, as: "couponDiscountPrice" },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Resource,
          as: "listResources",
          through: {
            attributes: [],
          },
        },
        Area,
      ],
      transaction: t,
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found at the accesspoint process.`,
      });
    }

    if (order.selledProducts.length === 0) {
      t.rollback();
      return res.status(400).json({
        message: `La orden no tiene productos asociados y no puede ser facturada.`,
      });
    }

    if (order.partialPayments.length !== 0) {
      t.rollback();
      return res.status(400).json({
        message: `La orden no puede ser facturada porque contiene pagos parciales. Complete la operación desde la web de Administración.`,
      });
    }

    // --> LOCK ORDER
    await OrderReceipt.findByPk(order.id, {
      lock: true,
      transaction: t,
    });
    // --> LOCK ORDER

    //Local object data
    let orderTemplate: any = {};

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }

    //Destroying cupons already exist in the order
    if (order.coupons?.length !== 0) {
      await OrderReceiptCoupon.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });

      //Updating local data object
      orderTemplate.coupons = [];
    }

    if (order.couponDiscountPrice) {
      await order.couponDiscountPrice.destroy({ transaction: t });
      await order.save({ transaction: t });

      //Updating local data object
      orderTemplate.couponDiscountPrice = undefined;
    }

    //Checking and registering coupons
    if (coupons && coupons.length !== 0) {
      let normalizeProducts: Array<SimpleProductItem> = [];
      order?.selledProducts.forEach((element) => {
        normalizeProducts.push({
          productId: element.productId,
          quantity: element.quantity,
          variationId: element.variationId,
        });
      });

      const result_coupons = await processCoupons({
        coupons,
        listProducts: normalizeProducts,
        priceSystem: economicCycle.priceSystemId,
        businessId: user.businessId,
        userId: user?.id,
      });

      if (!internalCheckerResponse(result_coupons)) {
        t.rollback();
        Logger.error(
          result_coupons.message || "Ha ocurrido un error inesperado.",
          {
            origin: "payOrder/processCoupons",
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: user.businessId,
            userId: user.id,
          }
        );
        return res.status(result_coupons.status).json({
          message: result_coupons.message,
        });
      }

      //Registering in order and desecadenating actions
      if (result_coupons.data.listCoupons.length !== 0) {
        //Found and block coupons
        const coupons = await Coupon.findAll({
          where: {
            id: result_coupons.data.listCoupons,
          },
          lock: true,
          transaction: t,
        });

        const listUsedBulk = [];
        for (const coupon of coupons) {
          coupon.usageCount++;
          await coupon.save({ transaction: t });
          if (result_coupons.data.client) {
            listUsedBulk.push({
              clientId: result_coupons.data.client.id,
              couponId: coupon.id,
            });
          }
        }
        if (listUsedBulk.length !== 0) {
          await ListUsedClientsCoupon.bulkCreate(listUsedBulk, {
            transaction: t,
          });
        }
        const listBulk = result_coupons.data.listCoupons.map((item: number) => {
          return {
            orderReceiptId: order?.id,
            couponId: item,
          };
        });

        await OrderReceiptCoupon.bulkCreate(listBulk, {
          transaction: t,
        });

        //Updating local data object
        orderTemplate.coupons = listBulk;
      }

      if (result_coupons.data.couponDiscount.length !== 0) {
        //First position. In the future could be more than one
        const priceDiscount = result_coupons.data.couponDiscount[0];
        //Registering discount
        const new_price = Price.build(priceDiscount);
        await new_price.save({ transaction: t });
        order.couponDiscountPriceId = new_price.id;

        //Updating local data object
        orderTemplate.couponDiscountPrice =
          result_coupons.data.couponDiscount[0];
      }
    }

    let client;
    if (barCodeClient) {
      client = await Client.findOne({
        where: {
          barCode: {
            [Op.iLike]: `%${barCodeClient}%`,
          },
          businessId: user.businessId,
        },
      });
      if (client) {
        order.clientId = client.id;
      }
    }

    if (
      order.status === "CANCELLED" ||
      order.status === "BILLED" ||
      order.status === "REFUNDED"
    ) {
      t.rollback();
      return res.status(400).json({
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      });
    }

    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }

    //Default parameters to set
    const closedAt = params.closedDate
      ? moment(params.closedDate).toDate()
      : moment().toDate();
    order.closedDate = closedAt;
    order.paidAt = closedAt;
    order.salesById = params.salesById ? params.salesById : user.id;
    order.houseCosted = params.houseCosted ?? false;
    order.observations = params.observations;
    order.discount = params.discount ? Number(params.discount) : 0;
    order.commission = params.commission ? Number(params.commission) : 0;
    order.name = params.name;
    order.status = "BILLED";

    //Setting total cost
    const totalCost =
      order.selledProducts?.reduce(
        (total, item) => (total += item.totalCost),
        0
      ) || 0;
    order.totalCost = mathOperation(totalCost, 0, "addition", 2);

    const configurations = await getBusinessConfigCache(user.businessId);
    const availableCurrencies = await getCurrenciesCache(user.businessId);

    const main_currency = availableCurrencies.find((item) => item.isMain);
    if (!main_currency) {
      t.rollback();
      return res.status(400).json({
        message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
      });
    }

    //Preparing order meta
    const toSaveMeta = {
      exchange_rates: normalizingCurrenciesToMeta(availableCurrencies),
    };
    const meta = JSON.stringify(toSaveMeta);
    order.meta = meta;

    const cash_operations_include_tips = configurations.find(
      (item) => item.key === "cash_operations_include_tips"
    )?.value;

    const cash_operations_include_deliveries =
      configurations.find(
        (item) => item.key === "cash_operations_include_deliveries"
      )?.value === "true";

    //Checking and destroying if orderreceipt payment records exist
    if (order.currenciesPayment.length !== 0) {
      await CurrencyPayment.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    if (order.cashRegisterOperations.length !== 0) {
      await CashRegisterOperation.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    //General
    let addBulkCurrencies: any = [];
    let bulkOperations: any = [];

    let realPayReceived: Array<SimplePrice> = [];
    let totalToPay: Array<SimplePrice> = [];

    //Checking if must be changed the sales currency when order was previously openned
    if (params.isReferenceCurrencyActive) {
      let bulkPricesUpdated: Array<any> = [];
      let nextSelledProducts: Array<any> = [];
      order.selledProducts?.forEach((item) => {
        const found = params.selledProducts?.find(
          (selled: SelledProduct) => selled.id === item.id
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
            ...item.dataValues,
            priceUnitary: found.priceUnitary,
            priceTotal: found.priceTotal,
          });
        }
      });

      if (bulkPricesUpdated.length !== 0) {
        await Price.bulkCreate(bulkPricesUpdated, {
          updateOnDuplicate: ["amount", "codeCurrency"],
          transaction: t,
        });
      }

      //Updating local data object
      orderTemplate.selledProducts = nextSelledProducts;
    }

    //Transforming all the currencies that is not found in prices,  make cash operation and register payment
    for (const registerPay of params.registeredPayments || []) {
      //Registering payment
      addBulkCurrencies.push({
        amount: registerPay.amount,
        codeCurrency: registerPay.codeCurrency,
        orderReceiptId: order.id,
        paymentWay: registerPay.paymentWay,
      });

      //For checking if the amount received is legal
      const found = realPayReceived.find(
        (item) => item.codeCurrency === registerPay.codeCurrency
      );
      if (found) {
        realPayReceived = realPayReceived.map((item) => {
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
          orderReceiptId: order.id,
          type: "debit",
          economicCycleId: economicCycle.id,
          areaId: order.areaSalesId,
          madeById: params.salesById,
          createdAt: params.updatedAt,
        });
      }
    }

    //Analyzing if amount provided is enough
    if (params.amountReturned && params.amountReturned.amount > 0) {
      //Processing to real received to pay
      const found = realPayReceived.find(
        (item) => item.codeCurrency === params.amountReturned.codeCurrency
      );
      if (found) {
        realPayReceived = realPayReceived.map((item) => {
          if (item.codeCurrency === params.amountReturned.codeCurrency) {
            return {
              ...item,
              amount: mathOperation(
                item.amount,
                params.amountReturned?.amount,
                "subtraction",
                2
              ),
            };
          }
          return item;
        });
      } else {
        realPayReceived.push({
          amount: params.amountReturned?.amount * -1,
          codeCurrency: params.amountReturned.codeCurrency,
        });
      }

      bulkOperations.push({
        operation: "WITHDRAW_SALE",
        amount: params.amountReturned?.amount * -1,
        codeCurrency: params.amountReturned.codeCurrency,

        orderReceiptId: order.id,
        type: "credit",
        economicCycleId: economicCycle?.id,
        areaId: order.areaSalesId,
        madeById: params.salesById,
        createdAt: params.updatedAt,
      });

      if (order.amountReturned) {
        order.amountReturned.amount = params.amountReturned.amount;
        await order.amountReturned.save({
          transaction: t,
        });
      } else {
        const new_price = Price.build({
          amount: params.amountReturned.amount,
          codeCurrency: params.amountReturned.codeCurrency,
        });
        await new_price.save({ transaction: t });
        order.amountReturnedId = new_price.id;
      }

      //Update local data object
      orderTemplate.amountReturned = params.amountReturned;
    }

    //Checking control amountReturned
    if (
      order.amountReturned &&
      params.amountReturned &&
      params.amountReturned.amount === 0
    ) {
      await order.amountReturned.destroy({ transaction: t });
      orderTemplate.amountReturned = undefined;
    }

    //Tip price
    if (params.tipPrice) {
      if (
        cash_operations_include_tips === "true" &&
        params.tipPrice.paymentWay === "CASH"
      ) {
        bulkOperations.push({
          operation: "DEPOSIT_TIP",
          amount: params.tipPrice.amount,
          codeCurrency: params.tipPrice.codeCurrency,
          orderReceiptId: order.id,
          type: "debit",
          economicCycleId: economicCycle?.id,
          areaId: order.areaSalesId,
          madeById: params.salesById,
          createdAt: params.updatedAt,
        });
      }

      if (order.tipPrice) {
        order.tipPrice.amount = params.tipPrice.amount;
        order.tipPrice.codeCurrency = params.tipPrice.codeCurrency;
        order.tipPrice.paymentWay = params.tipPrice.paymentWay;
        await order.tipPrice.save({ transaction: t });
      } else {
        const new_price = Price.build({
          amount: params.tipPrice.amount,
          codeCurrency: params.tipPrice.codeCurrency,
          paymentWay: params.tipPrice.paymentWay,
        });

        await new_price.save({ transaction: t });
        order.tipPriceId = new_price.id;
      }

      //Updating local data object
      orderTemplate.tipPrice = params.tipPrice;
    }

    //Checking control tipPrice
    if (order.tipPrice && params?.tipPrice && params?.tipPrice.amount === 0) {
      await order.tipPrice.destroy({ transaction: t });
    }

    //Checking shippingPrice
    if (params.shippingPrice) {
      if (order.shippingPrice) {
        order.shippingPrice.amount = params.shippingPrice.amount;
        order.shippingPrice.codeCurrency = params.shippingPrice.codeCurrency;
        order.shippingPrice.paymentWay = params.shippingPrice.paymentWay;
        await order.shippingPrice.save({ transaction: t });
      } else {
        const new_price = Price.build({
          amount: params.shippingPrice.amount,
          codeCurrency: params.shippingPrice.codeCurrency,
          paymentWay: params.shippingPrice.paymentWay,
        });
        await new_price.save({ transaction: t });
        order.shippingPriceId = new_price.id;
      }

      if (!cash_operations_include_deliveries) {
        bulkOperations.push({
          operation: "WITHDRAW_SHIPPING_PRICE",
          amount: params.shippingPrice.amount * -1,
          codeCurrency: params.shippingPrice.codeCurrency,
          orderReceiptId: order.id,
          type: "credit",
          economicCycleId: economicCycle?.id,
          areaId: order.areaSalesId,
          madeById: params.salesById,
          createdAt: params.updatedAt,
        });
      }

      //Updating local data object
      orderTemplate.shippingPrice = params.shippingPrice;
    } else {
      await order.shippingPrice?.destroy({
        transaction: t,
      });

      //updating local data object
      orderTemplate.shippingPrice = undefined;
    }

    await order.save({ transaction: t });

    let updatedObjectOrder = {
      ...order.dataValues,
      ...orderTemplate,
    };

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(updatedObjectOrder),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals - At the end of pos in order to include the shippingPrice
    const result_totals = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "payOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    totalToPay = result_totals.data.totalToPay;

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

    // //FIXME: Provisional
    // const errorMargin = amountRealToPay * 0.01;
    if (amountRealToPay > amountRealReceived) {
      t.rollback();
      Logger.error(
        `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
        {
          origin: "payOrder",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
          amountRealReceived,
          amountRealToPay,
        }
      );
      return res.status(400).json({
        message: `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
      });
    }

    //Setting final data
    if (addBulkCurrencies.length !== 0) {
      await CurrencyPayment.bulkCreate(addBulkCurrencies, {
        transaction: t,
      });
    }

    if (bulkOperations.length !== 0) {
      await CashRegisterOperation.bulkCreate(bulkOperations, {
        transaction: t,
      });
    }

    await t.commit();

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id
    );
    res.status(200).json(order_to_emit);

    const listCacheRecords = [
      {
        action: "ORDER_BILLED",
        title: getTitleOrderRecord("ORDER_BILLED"),
        details: `Facturada en punto de venta: ${order.areaSales?.name}.`,
        madeById: params.salesById,
        createdAt: params.updatedAt,
        isPublic: true,
      },
    ];

    if (listCacheRecords.length !== 0) {
      orderQueue.add(
        {
          code: "REGISTER_RECORDS",
          params: {
            records: listCacheRecords,
            orderId: order.id,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }

    //Updating used resources
    if (order.listResources && order.listResources.length !== 0) {
      await Resource.update(
        {
          isAvailable: true,
        },
        {
          where: {
            id: order.listResources.map((item) => item.id),
          },
        }
      );
    }

    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: order_to_emit,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
    );

    productQueue.add(
      {
        code: "CHECKING_PRODUCT",
        params: {
          productsIds: order.selledProducts.map((item) => item.productId),
          businessId: user.businessId,
        },
      },
      { attempts: 2, removeOnComplete: true, removeOnFail: true }
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

//Orders coming from Tecopos-Admin
//@Deprecated use billingOrder/registerAPayment
export const registerAPayment = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  //@ts-ignore
  const tId = t.id;

  try {
    const { id } = req.params;
    const { registeredPayments, areaId, amountReturned, includeInArea } =
      req.body;
    const user: User = req.user;

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
        CurrencyPayment,
        CashRegisterOperation,
        OrderReceiptPrice,
        OrderReceiptTotal,
        {
          model: SelledProduct,
          include: [
            SelledProductAddon,
            {
              model: Price,
              as: "priceUnitary",
              attributes: ["amount", "codeCurrency"],
            },
          ],
          required: false,
        },
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
          as: "couponDiscountPrice",
        },
        {
          model: Coupon,
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
        message: `La orden no fue encontrada.`,
      });
    }
    if (areaId) {
      const area = await getAreaCache(areaId);

      if (!area) {
        t.rollback();
        return res.status(404).json({
          message: `El área de venta no fue encontrada.`,
        });
      }
      if (area.type !== "SALE") {
        t.rollback();
        return res.status(404).json({
          message: `El área introducida no es de tipo Punto de venta.`,
        });
      }
      order.areaSalesId = area.id;
    }

    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(order),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Get configurations
    const configurations = await getBusinessConfigCache(user.businessId);
    const isPOSAllowingPendinOrders =
      configurations.find((item) => item.key === "pos_allow_pending_payment")
        ?.value === "true";

    if (order.origin !== "pos" && !isPOSAllowingPendinOrders) {
      t.rollback();
      return res.status(400).json({
        message: `Solo es posible registrar pagos en órdenes generadas online.`,
      });
    }

    if (order.paidAt) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden ya tiene un pago registrado. Acción no permitida.`,
      });
    }

    if (order.origin === "pos") {
      if (!includeInArea || !areaId) {
        t.rollback();
        return res.status(400).json({
          message: `Las órdenes generadas en puntos de ventas, sus pagos deben ser incluidos en algún puntos de ventas.`,
        });
      }
      const economicCycle = await getActiveEconomicCycleCache(user.businessId);

      if (!economicCycle) {
        t.rollback();
        return res.status(400).json({
          message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
        });
      }
      order.economicCycleId = economicCycle.id;
    }

    const availableCurrencies = await getCurrenciesCache(user.businessId);

    const main_currency = availableCurrencies.find((item) => item.isMain);
    if (!main_currency) {
      return {
        status: 404,
        message: `Operación no permitida. No hay ninguna moneda configurada como principal en el negocio.`,
      };
    }

    //General
    let addBulkCurrencies: any = [];
    let bulkOperations: any = [];
    const allowedPaymentWays = ["CASH", "TRANSFER", "CARD", "CREDIT_POINTS"];
    let listRecords: any = [];

    let realPayReceived: Array<SimplePrice> = [];
    let totalToPay: Array<SimplePrice> = [];

    //Blocking order
    await OrderReceipt.findByPk(order.id, {
      lock: true,
      transaction: t,
    });

    order.paidAt = moment().toDate();
    order.status = "BILLED";

    if (order.currenciesPayment.length !== 0) {
      await CurrencyPayment.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    if (order.cashRegisterOperations.length !== 0) {
      await CashRegisterOperation.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    //Setting totals - At the begining because is online
    const result_totals = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      return result_totals;
    }

    totalToPay = result_totals.data.totalToPay;

    if (registeredPayments) {
      for (const payment of registeredPayments) {
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
          orderReceiptId: order.id,
          paymentWay: payment.paymentWay,
        });

        //For checking if the amount received is legal
        const found = realPayReceived.find(
          (item) => item.codeCurrency === payment.codeCurrency
        );
        if (found) {
          realPayReceived = realPayReceived.map((item) => {
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

        if (includeInArea) {
          if (payment.paymentWay === "CASH") {
            bulkOperations.push({
              operation: "DEPOSIT_SALE",
              amount: payment.amount,
              codeCurrency: payment.codeCurrency,
              orderReceiptId: order.id,
              type: "debit",
              economicCycleId: order.economicCycleId,
              areaId: order.areaSalesId,
              madeById: user.id,
            });
          }
        }
      }

      //Analyzing if amount provided is enough
      if (amountReturned && amountReturned.amount > 0) {
        //Processing to real received to pay
        const found = realPayReceived.find(
          (item) => item.codeCurrency === amountReturned.codeCurrency
        );
        if (found) {
          realPayReceived = realPayReceived.map((item) => {
            if (item.codeCurrency === amountReturned.codeCurrency) {
              return {
                ...item,
                amount: mathOperation(
                  item.amount,
                  amountReturned?.amount,
                  "subtraction",
                  2
                ),
              };
            }
            return item;
          });
        } else {
          realPayReceived.push({
            amount: amountReturned?.amount * -1,
            codeCurrency: amountReturned.codeCurrency,
          });
        }

        bulkOperations.push({
          operation: "WITHDRAW_SALE",
          amount: amountReturned?.amount * -1,
          codeCurrency: amountReturned.codeCurrency,

          orderReceiptId: order.id,
          type: "credit",
          economicCycleId: order.economicCycleId,
          areaId: order.areaSalesId,
          madeById: user.id,
        });

        if (order.amountReturned) {
          order.amountReturned.amount = amountReturned.amount;
          await order.amountReturned.save({
            transaction: this,
          });
        } else {
          if (order.id) {
            const new_price = Price.build({
              amount: amountReturned.amount,
              codeCurrency: amountReturned.codeCurrency,
            });
            await new_price.save({ transaction: t });
            order.amountReturnedId = new_price.id;
          }

          //@ts-ignore
          orderTemplate.amountReturned = {
            amount: amountReturned.amount,
            codeCurrency: amountReturned.codeCurrency,
          };
        }
      }
    } else {
      const defaultMethod = order.paymentGateway?.paymentWay || "CARD";

      for (const price of result_totals.data.totalToPay) {
        //Registering payment
        addBulkCurrencies.push({
          amount: price.amount,
          codeCurrency: price.codeCurrency,
          orderReceiptId: order.id,
          paymentWay: defaultMethod,
        });
      }
    }

    //Registering actions
    listRecords.push({
      action: "ORDER_BILLED",
      title: getTitleOrderRecord("ORDER_BILLED"),
      madeById: user.id,
      isPublic: true,
    });

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

    // //FIXME: Provisional
    // const errorMargin = amountRealToPay * 0.01;
    if (amountRealToPay > amountRealReceived) {
      return {
        status: 400,
        message: `El monto enviado no es suficiente. Por favor, actualice su estación de trabajo y vuelva a intentarlo.`,
      };
    }

    await order.save({ transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(id, {
      transaction: t,
    });
    await t.commit();
    res.status(200).json(order_to_emit);

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

export const deleteRegisteredPayment = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);
  try {
    const { id } = req.params;
    const user: User = req.user;

    //Validations
    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const order = await OrderReceipt.findByPk(id, {
      include: [SelledProduct],
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `La orden no fue encontrada.`,
      });
    }

    if (order.origin === "pos") {
      t.rollback();
      return res.status(400).json({
        message: `Solo es posible registrar pagos en órdenes generadas online.`,
      });
    }

    if (!order.paidAt) {
      t.rollback();
      return res.status(400).json({
        message: `Solo puede eliminar pagos que han sido registrados en las últimas 24 horas.`,
      });
    }

    if (moment().diff(order.paidAt, "hours") > 24) {
      t.rollback();
      return res.status(400).json({
        message: `Solo puede eliminar los pagos registrados en las últimas 24 horas.`,
      });
    }

    //@ts-ignore
    order.paidAt = null;

    //Checking and destroying if orderreceipt payment records exist
    if (order.currenciesPayment.length !== 0) {
      await CurrencyPayment.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    if (order.cashRegisterOperations.length !== 0) {
      await CashRegisterOperation.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    order.save({ transaction: t });

    let listRecords: any = [];
    //Registering actions
    listRecords.push({
      action: "ORDER_REMOVED_BILLED",
      title: getTitleOrderRecord("ORDER_REMOVED_BILLED"),
      orderReceiptId: order.id,
      madeById: user.id,
      isPublic: true,
    });

    await OrderReceiptRecord.bulkCreate(listRecords, {
      transaction: t,
    });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(id, {
      transaction: t,
    });

    await t.commit();
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

//Move order
export const moveLocallyAnOrder = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const { orderId } = req.params;
    const { resources } = req.body;
    const user: User = req.user;

    const order = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED", "CLOSED"],
        },
      },
      include: [
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
      ],
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `La orden que intenta mover no se encuentra disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const economicCycle = await EconomicCycle.findOne({
      where: { businessId: user.businessId, isActive: true },
      include: [PriceSystem],
    });

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }

    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }

    //Persisting data to send via sockets
    const previousResources = order.listResources?.map((item) => item.id) || [];

    const found_all_resources = await Resource.findAll({
      where: {
        areaId: order.areaSalesId,
      },
    });

    //Generals
    let listBulkAdd = [];
    let previousName = order.name;

    //Free resources
    if (order.listResources && order.listResources.length !== 0) {
      await Resource.update(
        {
          isAvailable: true,
        },
        {
          where: {
            id: order.listResources.map((item) => item.id),
          },
          transaction: t,
        }
      );

      //Deleting all the existing resources in order to edit them later
      await OrderResource.destroy({
        where: {
          orderReceiptId: order.id,
        },
        transaction: t,
      });
    }

    let listNames = [];

    if ((resources as Array<number>).length === 0) {
      order.isForTakeAway = true;
    } else {
      let bulkAddResources: any = [];
      for (const resourceId of resources) {
        const found = found_all_resources.find(
          (item) => item.id === resourceId
        );

        if (!found) {
          t.rollback();
          return res.status(406).json({
            message: `El recurso con id ${resourceId} no fue encontrado.`,
          });
        }

        if (!found.isAvailable) {
          t.rollback();
          return res.status(404).json({
            message: `El recurso ${found.code} no está disponible.`,
          });
        }

        listNames.push(found.code);

        bulkAddResources.push({
          resourceId: resourceId,
          orderReceiptId: order.id,
        });
      }

      await OrderResource.bulkCreate(bulkAddResources, {
        transaction: t,
      });

      await Resource.update(
        {
          isAvailable: false,
        },
        {
          where: {
            id: resources,
          },
          transaction: t,
        }
      );

      order.isForTakeAway = false;
      order.name = listNames.join("/");
    }

    //Registering actions
    listBulkAdd.push({
      action: "ORDER_MOVED",
      title: getTitleOrderRecord("ORDER_MOVED"),
      details: `Movimiento interno desde ${previousName} hacia: ${order.name}.`,
      orderReceiptId: order.id,
      madeById: user.id,
    });

    order.previousName = previousName;
    await order.save({ transaction: t });

    await OrderReceiptRecord.bulkCreate(listBulkAdd, { transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );
    await t.commit();

    res.status(200).json({
      order: order_to_emit,
      previousResources,
    });

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: order_to_emit,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

export const moveOrderBetweenAreas = async (req: any, res: Response) => {
  const t = await db.transaction();

  //@ts-ignore
  const tId = t.id;

  try {
    const { orderId, areaToId } = req.params;
    const user: User = req.user;

    const order = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED", "CLOSED"],
        },
      },
      include: [
        {
          model: SelledProduct,
          separate: true,
          required: false,
          include: [
            {
              model: Product,
              include: [
                {
                  model: ProductPrice,
                  separate: true,
                },
              ],
            },
            {
              model: SelledProductAddon,
              attributes: ["id", "quantity", "name", "productId"],
              include: [
                {
                  model: Price,
                  attributes: ["amount", "codeCurrency"],
                },
              ],
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
            { model: Variation, attributes: ["id", "name"] },
          ],
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
      ],
    });
    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `La orden seleccionada no se encuentra disponible`,
      });
    }
    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }
    if (order.economicCycleId !== economicCycle.id) {
      t.rollback();
      return res.status(400).json({
        message: `Esta orden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }
    //Persisting data where order is moved from
    const areaFrom = order.areaSales;
    const previousResources = order.listResources;
    const areaToMove = await Area.findOne({
      where: {
        id: areaToId,
        businessId: user.businessId,
      },
    });
    if (!areaToMove) {
      t.rollback();
      return res.status(406).json({
        message: `Area to move not found.`,
      });
    }
    if (areaToMove.type !== "SALE") {
      t.rollback();
      return res.status(406).json({
        message: `Area provided is not SALE`,
      });
    }
    //Generals
    let listBulkAdd = [];
    if (order.listResources && order.listResources.length !== 0) {
      //Free resources
      await Resource.update(
        {
          isAvailable: true,
        },
        {
          where: {
            id: order.listResources.map((item) => item.id),
          },
          transaction: t,
        }
      );
    }
    //Deleting all the existing resources in order to edit them later
    await OrderResource.destroy({
      where: {
        orderReceiptId: order.id,
      },
      transaction: t,
    });
    order.areaSalesId = areaToId;
    //Registering actions
    listBulkAdd.push({
      action: "ORDER_MOVED",
      title: getTitleOrderRecord("ORDER_MOVED"),
      details: `Movimiento externo del punto de venta: ${order.areaSales?.name} (${order.areaSales?.id}) hacia: ${areaToMove.name} (${areaToMove.id}).`,
      orderReceiptId: order.id,
      madeById: user.id,
    });
    await order.save({ transaction: t });
    await OrderReceiptRecord.bulkCreate(listBulkAdd, { transaction: t });
    //Analyzing if area has enforcement prices
    if (areaToMove.enforceCurrency) {
      let listPricesUpdate: Array<{
        id: number;
        amount: number;
        codeCurrency: string;
      }> = [];
      for (const selledProduct of order.selledProducts) {
        if (
          selledProduct.priceUnitary.codeCurrency !==
          areaToMove.availableCodeCurrency
        ) {
          const foundPrice = selledProduct.product.prices.find(
            (item) => item.codeCurrency === areaToMove.availableCodeCurrency
          );
          if (foundPrice) {
            //Unitary price
            listPricesUpdate.push(
              {
                id: selledProduct.priceUnitaryId,
                amount: foundPrice.price,
                codeCurrency: foundPrice.codeCurrency,
              },
              {
                id: selledProduct.priceTotalId,
                amount: foundPrice.price * selledProduct.quantity,
                codeCurrency: foundPrice.codeCurrency,
              }
            );
          }
        }
      }
      await Price.bulkCreate(listPricesUpdate, {
        updateOnDuplicate: ["amount", "codeCurrency"],
        transaction: t,
      });

      await redisClient.set(
        getEphimeralTermKey(user.businessId, "order", tId),
        JSON.stringify(order),
        {
          EX: getExpirationTime("order"),
        }
      );

      //Setting totals
      const result_totals = await calculateOrderTotal(user.businessId, t);

      if (!internalCheckerResponse(result_totals)) {
        t.rollback();
        Logger.error(
          result_totals.message || "Ha ocurrido un error inesperado.",
          {
            origin: "manageProductsInOrder/calculateOrderTotal",
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: user.businessId,
            userId: user.id,
          }
        );
        return res.status(result_totals.status).json({
          message: result_totals.message,
        });
      }
    }

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );
    await t.commit();
    res.status(200).json({
      order: order_to_emit,
      previousResources,
    });
    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "MOVE_ORDER_BETWEEN_AREAS",
        params: {
          order: order_to_emit,
          areaFrom: {
            name: areaFrom?.name,
            id: areaFrom?.id,
          },
          areaToId,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

export const joinOrder = async (req: any, res: Response) => {
  const t = await db.transaction();

  //@ts-ignore
  const tId = t.id;

  try {
    const { orderId } = req.params;
    const { orderToJoinId } = req.body;
    const user: User = req.user;

    const baseOrder = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED"],
        },
      },
      include: [
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
            {
              model: SelledProductAddon,
              include: [Price],
            },
            Product,
          ],
        },
        OrderReceiptPrice,
        OrderReceiptTotal,
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
        },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Coupon,
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!baseOrder) {
      t.rollback();
      return res.status(404).json({
        message: `La orden base seleccionada no fue encontrada o no está disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (baseOrder.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const orderToJoin = await OrderReceipt.findOne({
      where: {
        id: orderToJoinId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED"],
        },
      },
      include: [
        SelledProduct,
        OrderReceiptPrice,
        {
          model: Resource,
          as: "listResources",
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!orderToJoin) {
      t.rollback();
      return res.status(404).json({
        message: `La orden base seleccionada no fue encontrada o no está disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (orderToJoin.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const economicCycle = await getActiveEconomicCycleCache(user.businessId);

    if (!economicCycle) {
      t.rollback();
      return res.status(400).json({
        message: `No hay un ciclo económico abierto. Por favor, consulte al dueño del negocio.`,
      });
    }

    if (
      baseOrder.economicCycleId !== economicCycle.id ||
      orderToJoin.economicCycleId !== economicCycle.id
    ) {
      t.rollback();
      return res.status(400).json({
        message: `Una de las órden pertenece a un ciclo económico que ya ha sido cerrado. Por favor, elimínela para continuar.`,
      });
    }

    if (baseOrder.areaSalesId !== orderToJoin.areaSalesId) {
      t.rollback();
      return res.status(400).json({
        message: `Las órdenes no se encuentran en el mismo punto de Venta.`,
      });
    }

    //Generals
    let listBulkAdd = [];
    await SelledProduct.update(
      {
        orderReceiptId: baseOrder.id,
      },
      {
        where: {
          id: orderToJoin.selledProducts.map((item) => item.id),
        },
        transaction: t,
      }
    );

    await baseOrder.reload({ transaction: t });

    //Updating price of order
    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(baseOrder),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals
    const result_totals = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "manageProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    //Transfering resources
    let bulkAddResources = [];
    if (orderToJoin.listResources && orderToJoin.listResources.length !== 0) {
      for (const resource of orderToJoin.listResources) {
        bulkAddResources.push({
          resourceId: resource.id,
          orderReceiptId: baseOrder.id,
        });
      }

      await OrderResource.bulkCreate(bulkAddResources, {
        transaction: t,
      });
    }

    //Cancelling previous order
    orderToJoin.status = "CANCELLED";
    orderToJoin.closedDate = moment().toDate();
    orderToJoin.observations = `La orden #${orderToJoin.operationNumber} fue unida con #${baseOrder.operationNumber}`;
    await orderToJoin.save({ transaction: t });

    //Registering actions
    listBulkAdd.push(
      {
        action: "ORDER_MOVED",
        title: getTitleOrderRecord("ORDER_MOVED"),
        details: `Movimiento de unión de ${orderToJoin.name} con ${baseOrder.name}.`,
        orderReceiptId: baseOrder.id,
        madeById: user.id,
      },
      {
        action: "ORDER_CLOSED",
        title: getTitleOrderRecord("ORDER_CLOSED"),
        details: `Cerrada por movimiento de unión con la orden #${baseOrder.operationNumber}.`,
        orderReceiptId: orderToJoin.id,
        madeById: user.id,
      }
    );

    await OrderReceiptRecord.bulkCreate(listBulkAdd, { transaction: t });

    //Procesing data to emit
    // Obtaining order
    const base_order_to_return = await OrderReceipt.scope("to_return").findByPk(
      baseOrder.id,
      { transaction: t }
    );
    const order_joined_to_return = await OrderReceipt.scope(
      "to_return"
    ).findByPk(orderToJoin.id, { transaction: t });

    await t.commit();

    res.status(200).json({
      baseOrder: base_order_to_return,
      orderToJoin: order_joined_to_return,
    });

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "JOIN_ORDERS",
        params: {
          baseOrder: base_order_to_return,
          orderToJoin: order_joined_to_return,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

interface ItemSelledQuantity {
  selledProductId: number;
  quantity: number;
}

export const splitOrder = async (req: any, res: Response) => {
  const t = await db.transaction();

  //@ts-ignore
  const tId = t.id;

  try {
    const { orderId } = req.params;
    const { selledProducts } = req.body;
    const user: User = req.user;

    const baseOrder = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED"],
        },
      },
      include: [
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
            Product,
          ],
        },
        OrderReceiptPrice,
        OrderReceiptTotal,
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
        },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Coupon,
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!baseOrder) {
      t.rollback();
      return res.status(404).json({
        message: `La orden base seleccionada no fue encontrada o no está disponible.`,
      });
    }

    //Checking if action belongs to user Business
    if (baseOrder.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    let orderTemplate: any = {
      status: "IN_PROCESS",
      isForTakeAway: baseOrder.isForTakeAway,
      managedById: baseOrder.managedById,
      salesById: user.id,
      businessId: user.businessId,
      economicCycleId: baseOrder.economicCycleId,
      areaSalesId: baseOrder.areaSalesId,
      name: `${baseOrder.name || `#${baseOrder.operationNumber}`} (2)`,
      origin: "pos",
    };

    const orderSplitted: OrderReceipt = OrderReceipt.build(orderTemplate);
    await orderSplitted.save({ transaction: t });

    let bulkToCompletedMove = [];
    let bulkNewSelledProduct = [];
    let bulkUpdateInBase = [];
    let updatedPrice = [];
    let listAddProductsToRecord = [];

    for (const selledProduct of selledProducts as ItemSelledQuantity[]) {
      const found = baseOrder.selledProducts.find(
        (item) => item.id === selledProduct.selledProductId
      );

      if (!found) {
        t.rollback();
        return res.status(400).json({
          message: `No se encontró uno de los productos seleccionados. Por favor, sincronice su estación de trabajo y vuelva a intentarlo.`,
        });
      }

      listAddProductsToRecord.push(
        `(x${selledProduct.quantity}) ${found.name}`
      );

      if (found.quantity === selledProduct.quantity) {
        bulkToCompletedMove.push(found.id);
      } else {
        const quantity = mathOperation(
          found.quantity,
          selledProduct.quantity,
          "subtraction",
          2
        );
        const totalPriceRemain = mathOperation(
          found.priceUnitary.amount,
          quantity,
          "multiplication",
          2
        );

        const totalSelledCost = mathOperation(
          found.product.averageCost,
          quantity,
          "multiplication",
          2
        );

        bulkNewSelledProduct.push({
          quantity: selledProduct.quantity,
          name: found.name,
          measure: found.measure,
          colorCategory: found.colorCategory,
          productId: found.productId,
          type: found.type,
          orderReceiptId: orderSplitted.id,
          economicCycleId: found.economicCycleId,
          imageId: found.imageId,
          variationId: found.variationId,
          priceUnitaryId: found.priceUnitaryId,
          areaId: found.areaId,
          totalCost: totalSelledCost,
          priceTotal: {
            amount: totalPriceRemain,
            codeCurrency: found.priceUnitary.codeCurrency,
          },
          baseUnitaryPriceId: found.baseUnitaryPriceId,
        });

        const priceTotal = mathOperation(
          found.priceUnitary.amount,
          selledProduct.quantity,
          "multiplication",
          2
        );

        updatedPrice.push({
          id: found.priceTotal.id,
          amount: priceTotal,
        });

        bulkUpdateInBase.push({
          id: found.id,
          quantity,
        });
      }
    }

    if (bulkToCompletedMove.length !== 0) {
      await SelledProduct.update(
        {
          orderReceiptId: orderSplitted.id,
        },
        {
          where: {
            id: bulkToCompletedMove,
          },
          transaction: t,
        }
      );
    }

    if (bulkNewSelledProduct.length !== 0) {
      await SelledProduct.bulkCreate(bulkNewSelledProduct, {
        include: [{ model: Price, as: "priceTotal" }],
        transaction: t,
      });
    }

    if (updatedPrice.length !== 0) {
      await Price.bulkCreate(updatedPrice, {
        updateOnDuplicate: ["amount"],
        transaction: t,
      });
    }

    //Registering actions in cache
    const listBulkOrderReceipt = [
      {
        action: "ORDER_CREATED",
        title: getTitleOrderRecord("ORDER_CREATED"),
        details: `A partir de división de la orden #${baseOrder.operationNumber}`,
        madeById: user.id,
        isPublic: true,
        orderReceiptId: orderSplitted.id,
      },
      {
        action: "PRODUCT_ADDED",
        title: getTitleOrderRecord("PRODUCT_ADDED"),
        details: `Productos añadido a partir de división de la orden desde #${
          baseOrder.operationNumber
        }.\n ${listAddProductsToRecord.join(";")}`,
        madeById: user.id,
        isPublic: true,
        orderReceiptId: orderSplitted.id,
      },
      {
        action: "PRODUCT_REMOVED",
        title: getTitleOrderRecord("PRODUCT_REMOVED"),
        details: `Productos eliminados a partir de división de la orden hacia #${
          orderSplitted.operationNumber
        }\n ${listAddProductsToRecord.join(";")}`,
        madeById: user.id,
        isPublic: true,
        orderReceiptId: baseOrder.id,
      },
    ];

    if (listAddProductsToRecord.length !== 0) {
      await OrderReceiptRecord.bulkCreate(listBulkOrderReceipt, {
        transaction: t,
      });
    }

    await baseOrder.reload({ transaction: t });

    //Updating price in base Order
    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(baseOrder),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals
    const result_totals = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals)) {
      t.rollback();
      Logger.error(
        result_totals.message || "Ha ocurrido un error inesperado.",
        {
          origin: "manageProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals.status).json({
        message: result_totals.message,
      });
    }

    const spOrder = await OrderReceipt.findOne({
      where: {
        id: orderSplitted.id,
      },
      include: [
        {
          model: SelledProduct,
          include: [
            { model: Price, as: "priceTotal" },
            { model: Price, as: "priceUnitary" },
            Product,
          ],
        },
        OrderReceiptPrice,
        OrderReceiptTotal,
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
        },
        {
          model: Price,
          as: "shippingPrice",
        },
        {
          model: Coupon,
          through: {
            attributes: [],
          },
        },
      ],
      transaction: t,
    });

    //Updating price in base Order
    await redisClient.set(
      getEphimeralTermKey(user.businessId, "order", tId),
      JSON.stringify(spOrder),
      {
        EX: getExpirationTime("order"),
      }
    );

    //Setting totals
    const result_totals2 = await calculateOrderTotal(user.businessId, t);

    if (!internalCheckerResponse(result_totals2)) {
      t.rollback();
      Logger.error(
        result_totals2.message || "Ha ocurrido un error inesperado.",
        {
          origin: "manageProductsInOrder/calculateOrderTotal",
          "X-App-Origin": req.header("X-App-Origin"),
          businessId: user.businessId,
          userId: user.id,
        }
      );
      return res.status(result_totals2.status).json({
        message: result_totals2.message,
      });
    }

    //Analyzing cache for configurations
    const configurations = await getBusinessConfigCache(user.businessId);

    const force_consecutive_invoice_numbers =
      configurations.find(
        (item) => item.key === "force_consecutive_invoice_numbers"
      )?.value === "true";

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
          economicCycleId: baseOrder.id,
        },
      });
    }

    if (!lastOperationNumber) {
      lastOperationNumber = 1;
    } else {
      //@ts-ignore
      lastOperationNumber += 1;
    }

    if (spOrder) {
      spOrder.operationNumber = lastOperationNumber;
      await spOrder.save({ transaction: t });
    }

    //Procesing data to emit
    // Obtaining order
    const base_order = await OrderReceipt.scope("to_return").findByPk(
      baseOrder.id,
      { transaction: t }
    );
    const order_splitted = await OrderReceipt.scope("to_return").findByPk(
      orderSplitted.id,
      { transaction: t }
    );

    await t.commit();

    res.status(200).json({
      baseOrder: base_order,
      orderSplitted: order_splitted,
    });

    //Generating task to send via Sockets
    socketQueue.add(
      {
        code: "UPDATE_ORDER",
        params: {
          order: base_order,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

//Deprecated - To deleted
//TODO:
export const orderMovement = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const { orderId } = req.params;
    const { operation, resources, areaMoveToId } = req.body;
    const user: User = req.user;

    const allowedOperations = ["MOVE", "UNITE", "MOVE_TO_AREA"];
    if (operation && !allowedOperations.includes(operation)) {
      t.rollback();
      return res.status(400).json({
        message: `${operation} is not an allowed type. Fields allowed: ${allowedOperations}`,
      });
    }

    if (!operation) {
      t.rollback();
      return res.status(406).json({
        message: `operation param is missing`,
      });
    }

    const order = await OrderReceipt.findOne({
      where: {
        id: orderId,
        status: {
          [Op.not]: ["BILLED", "CANCELLED", "CLOSED"],
        },
      },
      include: [
        OrderReceiptPrice,
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
      ],
    });

    if (!order) {
      t.rollback();
      return res.status(404).json({
        message: `Order not found or not available.`,
      });
    }

    //Checking if action belongs to user Business
    if (order.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const found_all_resources = await Resource.findAll({
      include: [
        {
          model: Area,
          where: {
            businessId: user.businessId,
          },
        },
      ],
    });

    //Generals
    let listBulkAdd = [];

    let cancelledId;
    let previousName = order.name;
    if (operation === "MOVE") {
      if (!resources) {
        t.rollback();
        return res.status(404).json({
          message: `resources fiel is missing.`,
        });
      }

      //Free resources
      if (order.listResources && order.listResources.length !== 0) {
        await Resource.update(
          {
            isAvailable: true,
          },
          {
            where: {
              id: order.listResources.map((item) => item.id),
            },
            transaction: t,
          }
        );

        //Deleting all the existing resources in order to edit them later
        await OrderResource.destroy({
          where: {
            orderId: order.id,
          },
          transaction: t,
        });
      }

      let listNames = [];
      if ((resources as Array<number>).length === 0) {
        order.isForTakeAway = true;
      } else {
        let bulkAddResources: any = [];
        for (const resourceId of resources) {
          const found = found_all_resources.find(
            (item) => item.id === resourceId
          );

          if (!found) {
            t.rollback();
            return res.status(406).json({
              message: `El recurso con id ${resourceId} no fue encontrado.`,
            });
          }

          if (!found.isAvailable) {
            t.rollback();
            return res.status(406).json({
              message: `El recurso ${found.code} no está disponible.`,
            });
          }

          listNames.push(found.code);

          bulkAddResources.push({
            resourceId: resourceId,
            orderReciptId: order.id,
          });
        }

        await OrderResource.bulkCreate(bulkAddResources, {
          transaction: t,
        });
        await Resource.update(
          {
            isAvailable: false,
          },
          {
            where: {
              id: resources,
            },
            transaction: t,
          }
        );

        order.isForTakeAway = false;
        order.name = order.name || listNames.join("/");
      }

      //Registering actions
      listBulkAdd.push({
        action: "ORDER_MOVED",
        title: getTitleOrderRecord("ORDER_MOVED"),
        details: `Movimiento interno desde ${previousName} hacia: ${order.name}.`,
        orderReceiptId: order.id,
        madeById: user.id,
      });
    } else if (operation === "UNITE") {
      // if (!resources) {
      //     t.rollback();
      //     return res.status(404).json({
      //         message: `resources fiel is missing.`,
      //     });
      // }
      // const listReceived = new Float64Array(resources).sort();
      // const order_receipt_to_join = await OrderReceipt.findOne({
      //     where: {
      //         listResources: listReceived.join(","),
      //         status: {
      //             [Op.not]: ["BILLED", "CANCELLED", "CLOSED"],
      //         },
      //         businessId: user.businessId,
      //     },
      //     include: [SelledProduct, OrderReceiptPrice],
      // });
      // if (!order_receipt_to_join) {
      //     t.rollback();
      //     return res.status(404).json({
      //         message: `Order to join not found.`,
      //     });
      // }
      // const ids_selled_products =
      //     order_receipt_to_join.selledProducts.map(item => item.id);
      // await SelledProduct.update(
      //     {
      //         orderReceiptId: orderId,
      //     },
      //     {
      //         where: {
      //             id: ids_selled_products,
      //         },
      //         transaction: t,
      //     }
      // );
      // //Updating prices
      // let baseOrderPrices = order.prices.map(item => {
      //     return {
      //         price: item.price,
      //         codeCurrency: item.codeCurrency,
      //         orderReceiptId: item.orderReceiptId,
      //     };
      // });
      // let movedOrderPrices = order_receipt_to_join.prices;
      // for (const basePrice of baseOrderPrices) {
      //     const found = movedOrderPrices.find(
      //         item => item.codeCurrency === basePrice.codeCurrency
      //     );
      //     if (found) {
      //         baseOrderPrices = baseOrderPrices.map(item => {
      //             if (item.codeCurrency === found.codeCurrency) {
      //                 return {
      //                     ...item,
      //                     price: item.price + found.price,
      //                 };
      //             }
      //             return item;
      //         });
      //         movedOrderPrices = movedOrderPrices.filter(
      //             item => item.codeCurrency !== found.codeCurrency
      //         );
      //     }
      // }
      // movedOrderPrices.forEach(item => {
      //     baseOrderPrices.push({
      //         price: item.price,
      //         codeCurrency: item.codeCurrency,
      //         orderReceiptId: order.id,
      //     });
      // });
      // //Creating new ones
      // await OrderReceiptPrice.bulkCreate(baseOrderPrices, {
      //     transaction: t,
      // });
      // order_receipt_to_join.status = "CANCELLED";
      // order_receipt_to_join.closedDate = moment().toDate();
      // order_receipt_to_join.observations = `La orden #${order_receipt_to_join.operationNumber} fue unida con #${order.operationNumber}`;
      // //Ordering resources
      // const myArray = [];
      // if (
      //     !order_receipt_to_join.isForTakeAway &&
      //     order_receipt_to_join.listResources !== ""
      // ) {
      //     myArray.push(...order_receipt_to_join.listResources.split(","));
      // }
      // if (!order.isForTakeAway && order.listResources !== "") {
      //     myArray.push(...order.listResources.split(","));
      // }
      // const integerArray = new Float64Array([
      //     ...myArray.map(item => parseInt(item)),
      // ]).sort();
      // order.listResources = integerArray.join(",");
      // order_receipt_to_join.save({ transaction: t });
      // cancelledId = order_receipt_to_join.id;
      // //Registering actions
      // listBulkAdd.push(
      //     {
      //         action: "ORDER_MOVED",
      //         title: getTitleOrderRecord("ORDER_MOVED"),
      //         details: `Movimiento de unión de ${previousName} con ${order.name}.`,
      //         orderReceiptId: order.id,
      //         madeById: user.id,
      //     },
      //     {
      //         action: "ORDER_CLOSED",
      //         title: getTitleOrderRecord("ORDER_CLOSED"),
      //         details: `Cerrada por movimiento de unión con la orden #${order.operationNumber}.`,
      //         orderReceiptId: order_receipt_to_join.id,
      //         madeById: user.id,
      //     }
      // );
    } else if (operation === "MOVE_TO_AREA") {
      //Validations
      if (!areaMoveToId) {
        t.rollback();
        return res.status(406).json({
          message: `areaMoveToId is missing.`,
        });
      }

      const areaToMove = await getAreaCache(areaMoveToId);

      if (!areaToMove) {
        t.rollback();
        return res.status(406).json({
          message: `Area to move not found.`,
        });
      }

      if (areaToMove.type !== "SALE") {
        t.rollback();
        return res.status(406).json({
          message: `Area provided is not SALE`,
        });
      }

      if (order.listResources && order.listResources.length !== 0) {
        //Free resources
        await Resource.update(
          {
            isAvailable: true,
          },
          {
            where: {
              id: order.listResources.map((item) => item.id),
            },
            transaction: t,
          }
        );
      }

      order.areaSalesId = areaMoveToId;

      //Registering actions
      listBulkAdd.push({
        action: "ORDER_MOVED",
        title: getTitleOrderRecord("ORDER_MOVED"),
        details: `Movimiento externo del punto de venta: ${order.areaSales?.name} (${order.areaSales?.id}) hacia: ${areaToMove.name} (${areaToMove.id}).`,
        orderReceiptId: order.id,
        madeById: user.id,
      });
    }

    order.previousName = previousName;
    await order.save({ transaction: t });

    await OrderReceiptRecord.bulkCreate(listBulkAdd, { transaction: t });

    //Procesing data to emit
    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    //Obtaining free resources
    const free_resources = await Resource.findAll({
      where: {
        areaId: order.areaSalesId,
        isAvailable: true,
        isReservable: true,
      },
      transaction: t,
    });

    await t.commit();

    if (operation === "MOVE") {
      res.status(200).json(order_to_emit);

      //Sockets
      req.io.to(`area:${order_to_emit!.areaSalesId}`).emit("order", {
        action: "update",
        data: order_to_emit,
        from: user.id,
      });
    } else if (operation === "UNITE") {
      res.status(200).json({
        unified: order_to_emit,
        cancelledId,
      });

      //Sockets
      //United order
      req.io.to(`area:${order_to_emit!.areaSalesId}`).emit("order", {
        action: "update",
        data: order_to_emit,
        from: user.id,
      });

      //Removed order
      req.io.to(`area:${order_to_emit!.areaSalesId}`).emit("order", {
        action: "delete",
        data: {
          id: cancelledId,
        },
        from: user.id,
      });
    } else {
      res.status(200).json(order_to_emit);

      //Sockets
      req.io.to(`area:${areaMoveToId}`).emit("order", {
        action: "new",
        data: order_to_emit,
        from: user.id,
      });
    }

    req.io.to(`area:${order_to_emit!.areaSalesId}`).emit("resources", {
      action: "update",
      data: free_resources,
      from: user.id,
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

//Active products
export const getAllActiveProducts = async (req: any, res: Response) => {
  try {
    const { order, orderBy, status, ...params } = req.query;
    const user: User = req.user;
    const { areaId } = req.params;

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

    if (area.type !== "MANUFACTURER") {
      return res.status(404).json({
        message: `Area is not MANUFACTURER type`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = ["orderReceiptId", "createdAt"];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    //Obtaining Economic Cycle active
    let listEconomicCycles = [];
    const economicCycles = await EconomicCycle.findAll({
      where: { businessId: user.businessId },
      order: [["id", "desc"]],
      limit: 2,
    });

    listEconomicCycles = economicCycles.map((item) => item.id);

    if (status) {
      const statusType = status.split(",");

      const allTypes = ["RECEIVED", "IN_PROCESS", "CLOSED", "DISPATCHED"];

      for (const item of statusType) {
        if (!allTypes.includes(item)) {
          return res.status(400).json({
            message: `${item} is not an allowed type. Fields allowed: ${allTypes}`,
          });
        }
      }

      where_clause.status = {
        [Op.or]: statusType,
      };

      listEconomicCycles =
        economicCycles.length !== 0 ? [economicCycles[0].id] : [];
    } else {
      where_clause[Op.or] = [
        {
          status: ["RECEIVED", "IN_PROCESS"],
        },
        {
          status: "CLOSED",
          preparedById: null,
        },
      ];
    }

    //Order
    let ordenation = [["createdAt", "ASC"]];
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "ASC"]];
    }

    const active_products_found = await ProductionTicket.findAll({
      where: {
        areaId,
        ...where_clause,
      },
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
            "colorCategory",
          ],
          include: [
            {
              model: SelledProductAddon,
              attributes: ["id", "quantity", "name", "productId"],
            },
          ],
        },
        {
          model: OrderReceipt,
          attributes: ["id", "status", "isForTakeAway"],
          where: {
            economicCycleId: listEconomicCycles,
          },
        },
        {
          model: User,
          attributes: ["id", "username", "displayName"],
          paranoid: false,
          include: [
            {
              model: Image,
              as: "avatar",
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
          ],
        },
      ],
      //@ts-ignore
      order: ordenation,
    });

    res.status(200).json(active_products_found);
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

export const getActiveProductVariations = async (req: any, res: Response) => {
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
        message: `El producto con id ${id} no fue encontrado.`,
      });
    }

    if (product.type !== "VARIATION") {
      return res.status(400).json({
        message: `El producto proporcionado no es de tipo Variable.`,
      });
    }

    //Permission Check
    if (product.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No está autorizado a realizar operaciones sobre este producto.`,
      });
    }

    const variations = await Variation.findAll({
      attributes: ["id", "description", "onSale"],
      where: {
        productId: id,
      },
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
          model: StockAreaVariation,
          attributes: ["quantity", "variationId"],
          where: {
            quantity: {
              [Op.gt]: 0,
            },
          },
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
    });

    let attributes: Array<{ code: string; value: string }> = [];
    variations.forEach((item) => {
      item.attributes?.forEach((at) => {
        attributes.push(at);
      });
    });

    let data_to_return: any = {};
    let uniqueAtt: Array<string> = [];
    for (const att of attributes) {
      if (!uniqueAtt.includes(att.code)) {
        uniqueAtt.push(att.code);
        data_to_return[att.code] = [att.value];
      } else {
        const found_value = data_to_return[att.code].find(
          (item: string) => item === att.value
        );

        if (!found_value) {
          data_to_return[att.code].push(att.value);
        }
      }
    }

    res.status(200).json({
      attributes: data_to_return,
      variations,
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

interface SelledProductReduced2 {
  id: number;
  status: "RECEIVED" | "IN_PROCESS" | "COMPLETED" | "REMOVED" | "CANCELLED";
}

//Bulk editing of selledProducts
export const bulkEditStatusSelledProducts = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const { products } = req.body;
    const user: User = req.user;

    const products_selled = await SelledProduct.findAll({
      where: {
        id: products.map((item: SelledProductReduced2) => item.id),
      },
      include: [OrderReceipt, Product],
    });

    let selledProductUpdates: Array<{
      id: number;
      status: string;
    }> = [];

    for (const product_received of products as SelledProductReduced2[]) {
      const productSelled = products_selled.find(
        (item) => item.id === product_received.id
      );

      if (!productSelled) {
        t.rollback();
        return res.status(404).json({
          message: `SelledProduct with id ${product_received.id} not found`,
        });
      }

      //Checking if action belongs to user Business
      if (productSelled.product.businessId !== user.businessId) {
        t.rollback();
        return res.status(401).json({
          message: `No tiene acceso al recurso solicitado.`,
        });
      }

      const allowedTypes = ["RECEIVED", "IN_PROCESS", "COMPLETED"];
      if (
        product_received.status &&
        !allowedTypes.includes(product_received.status)
      ) {
        t.rollback();
        return res.status(400).json({
          message: `${product_received.status} is not an allowed type. Fields allowed: ${allowedTypes}`,
        });
      }

      selledProductUpdates.push({
        id: productSelled.id,
        status: product_received.status,
      });
    }

    //Updating SelledProduct Table
    if (selledProductUpdates.length !== 0) {
      await SelledProduct.bulkCreate(selledProductUpdates, {
        updateOnDuplicate: ["status"],
        transaction: t,
      });
    }
    await t.commit();

    //Preparing Socket to emit
    const to_return = await SelledProduct.findAll({
      where: {
        id: products.map((item: SelledProductReduced2) => item.id),
      },
      include: [ProductionTicket],
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
      ],
    });
    res.status(200).json(to_return);

    if (products_selled.length !== 0) {
      socketQueue.add(
        {
          code: "UPDATE_STATUS_SELLED_PRODUCT_SALE_AREA",
          params: {
            selledProducts: to_return,
            orderId: products_selled[0].orderReceiptId,
            fullOrder: products_selled[0].orderReceipt,
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

//Normal editing
export const editSelledProduct = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { ...params } = req.body;
    const user: User = req.user;

    //Validations
    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const modelKeys = Object.keys(SelledProduct.getAttributes());
    const paramsKey = Object.keys(params);
    let message;
    ["id", "businessId", "createdAt", "updatedAt", "deletedAt"].forEach(
      (att) => {
        if (paramsKey.includes(att)) {
          message = `You are not allowed to change ${att} attribute.`;
        }
      }
    );

    if (message) {
      return res.status(406).json({ message });
    }

    const selledProduct = await SelledProduct.findByPk(id, {
      include: [OrderReceipt],
    });

    if (!selledProduct) {
      return res.status(404).json({
        message: `SelledProduct not found`,
      });
    }

    //Checking if action belongs to user Business
    if (selledProduct.orderReceipt.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const allowedAttributes = [...modelKeys];
    paramsKey.forEach((att) => {
      if (allowedAttributes.includes(att)) {
        //@ts-ignore
        selledProduct[att] = params[att];
      }
    });

    await selledProduct.save();

    //Preparing Socket to emit. Sales Area -> To production Area
    const product_selled_to_emit = await SelledProduct.findByPk(id, {
      include: [
        ProductionTicket.scope("to_return"),
        {
          model: SelledProductAddon,
          attributes: ["id", "quantity", "name", "productId"],
          include: [
            {
              model: Price,
              attributes: ["amount", "codeCurrency"],
            },
          ],
        },
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
      ],
    });

    res.status(200).json(product_selled_to_emit);

    if (product_selled_to_emit && product_selled_to_emit.productionTicket) {
      socketQueue.add(
        {
          code: "UPDATE_NOTE_SELLED_PRODUCT_MANUFACTURER_AREA",
          params: {
            selledProduct: product_selled_to_emit,
            orderId: product_selled_to_emit.orderReceiptId,
            fullOrder: selledProduct.orderReceipt,
            areaId: product_selled_to_emit.productionTicket.areaId,
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
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

export const editStatusProductionTicket = async (req: any, res: Response) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;
    const { status, userId } = req.body;
    const user: User = req.user;

    if (!id) {
      t.rollback();
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    if (!status) {
      t.rollback();
      return res.status(406).json({
        message: `status param is missing`,
      });
    }

    const allowedTypes = ["RECEIVED", "IN_PROCESS", "DISPATCHED", "CLOSED"];
    if (status && !allowedTypes.includes(status)) {
      t.rollback();
      return res.status(400).json({
        message: `${status} is not an allowed type. Fields allowed: ${allowedTypes}`,
      });
    }

    const productionTicket = await ProductionTicket.findByPk(id, {
      include: [SelledProduct, OrderReceipt],
    });

    if (!productionTicket) {
      t.rollback();
      return res.status(404).json({
        message: `ProductionTicket not found`,
      });
    }

    if (
      productionTicket.status === status &&
      status !== "CLOSED" &&
      !!productionTicket.preparedById
    ) {
      t.rollback();
      return res.status(400).json({
        message: `Este ticket ya fue tomado por otra persona. Por favor actualice su estación de trabajo para continuar.`,
      });
    }

    if (productionTicket.status === "DISPATCHED") {
      t.rollback();
      return res.status(400).json({
        message: `Este ticket ya fue despachado.`,
      });
    }

    //Checking if action belongs to user Business
    if (productionTicket.orderReceipt.businessId !== user.businessId) {
      t.rollback();
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    productionTicket.status = status;
    if (!productionTicket.preparedById) {
      productionTicket.preparedById = userId ? userId : user.id;
    }

    const ids = productionTicket.selledProducts?.map((item) => item.id);

    if (ids.length !== 0 && status === "CLOSED") {
      t.rollback();
      return res.status(400).json({
        message: `No puede cerrar tickets con productos asignados.`,
      });
    }

    if (status === "DISPATCHED") {
      await SelledProduct.update(
        { status: "COMPLETED" },
        {
          where: {
            id: ids,
          },
          transaction: t,
        }
      );
    } else if (status === "IN_PROCESS") {
      await SelledProduct.update(
        { status: "IN_PROCESS" },
        {
          where: {
            id: ids,
            status: {
              [Op.not]: ["COMPLETED"],
            },
          },
          transaction: t,
        }
      );
    }

    await productionTicket.save({ transaction: t });
    await t.commit();

    //Preparing data to emit
    const to_return = await ProductionTicket.findByPk(id, {
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
            "colorCategory",
          ],
          include: [
            {
              model: SelledProductAddon,
              attributes: ["id", "quantity", "name", "productId"],
            },
          ],
        },
        {
          model: OrderReceipt,
          attributes: ["id", "status", "isForTakeAway"],
        },
        {
          model: User,
          attributes: ["id", "username", "displayName"],
          paranoid: false,
          include: [
            {
              model: Image,
              as: "avatar",
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
          ],
        },
      ],
    });

    res.status(200).json(to_return);

    if (to_return?.selledProducts.length !== 0) {
      socketQueue.add(
        {
          code: "UPDATE_STATUS_SELLED_PRODUCT_SALE_AREA",
          params: {
            selledProducts: to_return?.selledProducts,
            orderId: productionTicket.orderReceiptId,
            fullOrder: productionTicket.orderReceipt,
            from: user.id,
            fromName: user.displayName || user.username,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
    }

    socketQueue.add(
      {
        code: "UPDATE_TICKET_PRODUCTION_AREA",
        params: {
          ticket: to_return,
          businessId: user.businessId,
          from: user.id,
          fromName: user.displayName || user.username,
          origin: req.header("X-App-Origin"),
        },
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: true }
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

//Cash register operations
export const addCashOperation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { ...params } = req.body;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido`,
      });
    }

    const area = await getAreaCache(id);

    if (!area) {
      return res.status(404).json({
        message: `Area no encontrada`,
      });
    }

    if (area.type !== "SALE") {
      return res.status(404).json({
        message: `El área introducida no es de tipo POS`,
      });
    }

    //Checking if action belongs to user Business
    if (area.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No tiene acceso al recurso solicitado.`,
      });
    }

    const economicCycle = await EconomicCycle.findOne({
      where: {
        businessId: user.businessId,
        isActive: true,
      },
    });

    if (!economicCycle) {
      return res.status(404).json({
        message: `No hay ningún ciclo económico abierto. Consulte al administrador.`,
      });
    }

    //Validations
    const allowedTypes = ["MANUAL_DEPOSIT", "MANUAL_WITHDRAW", "MANUAL_FUND"];
    if (params.operation && !allowedTypes.includes(params.operation)) {
      return res.status(400).json({
        message: `${params.operation} no es un valor permitido. Valores permitidos: ${allowedTypes}`,
      });
    }

    const paramsKey = Object.keys(params);
    let message;
    [
      "id",
      "economicCycleId",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "madeById",
      "areaId",
    ].forEach((att) => {
      if (paramsKey.includes(att)) {
        message = `You are not allowed to change ${att} attribute.`;
      }
    });

    if (message) {
      return res.status(406).json({ message });
    }

    let amount = Math.abs(params.amount);
    if (params.operation === "MANUAL_WITHDRAW") {
      amount = amount * -1;
    }

    let type = "credit";
    if (
      params.operation == "MANUAL_FUND" ||
      params.operation == "MANUAL_DEPOSIT"
    ) {
      type = "debit";
    }

    const cashOperation: CashRegisterOperation = CashRegisterOperation.build({
      ...params,
      amount,
      type,
      economicCycleId: economicCycle.id,
      madeById: user.id,
      areaId: id,
    });

    await cashOperation.save();

    const to_return = await CashRegisterOperation.scope("to_return").findByPk(
      cashOperation.id
    );
    res.status(201).json(to_return);
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `administration/addCashOperation`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const removeCashOperation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user: User = req.user;

    if (!id) {
      return res.status(406).json({
        message: `El parámetro id no fue introducido.`,
      });
    }

    const cashOperation = await CashRegisterOperation.findByPk(id, {
      include: [EconomicCycle],
    });

    if (!cashOperation) {
      return res.status(404).json({
        message: `CashRegisterOperation no fue encontrado.`,
      });
    }

    //Permission Check
    if (cashOperation.economicCycle.businessId !== user.businessId) {
      return res.status(401).json({
        message: `No está autorizado a acceder a este recurso.`,
      });
    }

    await cashOperation.destroy();
    res.status(204).json({});
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `administration/removeCashOperation`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findAllCashOperations = async (req: any, res: Response) => {
  try {
    const {
      per_page,
      page,
      order,
      orderBy,
      fullOperations,
      economicCycleId,
      ...params
    } = req.query;
    const user = req.user;

    let economicCycle;

    if (!economicCycleId) {
      economicCycle = await EconomicCycle.findOne({
        where: {
          businessId: user.businessId,
          isActive: true,
        },
      });

      if (!economicCycle) {
        return res.status(404).json({
          message: `No hay ningún ciclo económico abierto. Consulte al administrador.`,
        });
      }
    } else {
      economicCycle = await EconomicCycle.findOne({
        where: {
          id: economicCycleId,
          businessId: user.businessId,
        },
      });

      if (!economicCycle) {
        return res.status(404).json({
          message: `El id de ciclo económico proporcionado no fue encontrado. Consulte al administrador.`,
        });
      }
    }

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = ["codeCurrency", "type", "areaId", "madeById"];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    if (fullOperations === undefined || !fullOperations) {
      where_clause.operation = {
        [Op.or]: ["MANUAL_DEPOSIT", "MANUAL_WITHDRAW", "MANUAL_FUND"],
      };
    }

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_operations = await CashRegisterOperation.findAndCountAll({
      attributes: [
        "id",
        "amount",
        "codeCurrency",
        "observations",
        "operation",
        "createdAt",
        "operationNumber",
      ],
      distinct: true,
      where: { economicCycleId: economicCycle.id, ...where_clause },
      include: [
        {
          model: User,
          attributes: ["id", "username", "displayName"],
          include: [
            {
              model: Image,
              as: "avatar",
              attributes: ["id", "src", "thumbnail", "blurHash"],
            },
          ],
          paranoid: false,
        },
        {
          model: OrderReceipt,
          attributes: ["id", "operationNumber"],
        },
      ],
      limit,
      offset,
      //@ts-ignore
      order: ordenation,
    });

    let totalPages = Math.ceil(found_operations.count / limit);
    if (found_operations.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_operations.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: found_operations.rows,
    });
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `administration/findAllCashOperations`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const findAllPartialPayments = async (req: any, res: Response) => {
  try {
    const { per_page, page, order, orderBy, economicCycleId, ...params } =
      req.query;
    const user = req.user;

    let economicCycle;

    if (!economicCycleId) {
      economicCycle = await getActiveEconomicCycleCache(user.businessId);

      if (!economicCycle) {
        return res.status(404).json({
          message: `No hay ningún ciclo económico abierto. Consulte al administrador.`,
        });
      }
    } else {
      economicCycle = await EconomicCycle.findOne({
        where: {
          id: economicCycleId,
          businessId: user.businessId,
        },
      });

      if (!economicCycle) {
        return res.status(404).json({
          message: `El id de ciclo económico proporcionado no fue encontrado. Consulte al administrador.`,
        });
      }
    }

    //Preparing search
    let where_clause: any = {};
    const searchable_fields = ["codeCurrency"];
    const keys = Object.keys(params);
    keys.forEach((att) => {
      if (searchable_fields.includes(att)) {
        where_clause[att] = params[att];
      }
    });

    //Order
    let ordenation;
    if (orderBy && ["createdAt"].includes(orderBy)) {
      ordenation = [[orderBy, order ? order : "DESC"]];
    } else {
      ordenation = [["createdAt", "DESC"]];
    }

    //With pagination
    const limit = per_page ? parseInt(per_page) : pag_params.limit;
    const offset = page
      ? (parseInt(page) - 1) * limit
      : pag_params.offset * limit;

    const found_operations = await PartialPayment.findAndCountAll({
      attributes: [
        "id",
        "amount",
        "codeCurrency",
        "observations",
        "paymentNumber",
        "createdAt",
        "paymentWay",
      ],
      distinct: true,
      where: { economicCycleId: economicCycle.id, ...where_clause },
      include: [
        {
          model: OrderReceipt,
          attributes: ["id", "operationNumber"],
        },
      ],
      limit,
      offset,
      //@ts-ignore
      order: ordenation,
    });

    let totalPages = Math.ceil(found_operations.count / limit);
    if (found_operations.count === 0) {
      totalPages = 0;
    } else if (totalPages === 0) {
      totalPages = 1;
    }

    res.status(200).json({
      totalItems: found_operations.count,
      currentPage: page ? parseInt(page) : 1,
      totalPages,
      items: found_operations.rows,
    });
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
      businessName: req.business?.name,
      userId: req.user.id,
      userName: req.user?.displayName,
      rute: `administration/findAllCashOperations`,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const applyCouponToOrderPOS = async (req: any, res: Response) => {
  try {
    const business: Business = req.business;
    const user: User = req.user;

    const { listProducts, coupons, clientId } = req.body;

    let priceSystemId;

    const activeEconomicCycle = await EconomicCycle.findOne({
      where: {
        isActive: true,
        businessId: user?.businessId,
      },
    });

    if (activeEconomicCycle) {
      priceSystemId = activeEconomicCycle.priceSystemId;
    }

    if (!priceSystemId) {
      const priceSystem = await PriceSystem.findOne({
        where: {
          isMain: true,
          businessId: business.id,
        },
      });

      if (!priceSystem) {
        return res.status(400).json({
          message:
            "No fue encontrado un sistema de precio en el negocio. Por favor consulte al administrador.",
        });
      }

      priceSystemId = priceSystem.id;
    }

    const result = await processCoupons({
      coupons,
      listProducts,
      priceSystem: priceSystemId,
      businessId: business.id,
      clientId,
      userId: user.id,
    });

    if (!internalCheckerResponse(result)) {
      Logger.error(result.message || "Ha ocurrido un error inesperado.", {
        origin: "sales/applyCouponToOrder",
        businessId: user.businessId,
        userId: user.id,
      });
      return res.status(result.status).json({
        message: result.message,
      });
    }

    res.status(200).json(result.data);
  } catch (error: any) {
    Logger.error(error, {
      "X-App-Origin": req.header("X-App-Origin"),
      businessId: req.business.id,
    });
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const successTecopaySale = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  try {
    const { reference, status, amount, message, transactionNumber } = req.body;

    const order = await OrderReceipt.findByPk(reference);

    if (!order) {
      t.rollback();
      Logger.error(`La referencia no fue encontrada`, {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `successTecopaySale`,
      });
      return res.status(400).json({
        message: "La referencia no fue encontrada",
      });
    }

    let listRecords: any = [];
    let addBulkCurrencies: any = [];

    if (status !== 200) {
      t.rollback();
      Logger.error(`Tecopay no ha podido procesar su solicitud`, {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `successTecopaySale`,
      });
      return res.status(400).json({
        message: "Tecopay no ha podido procesar su solicitud",
      });
    }

    if (
      order.status === "CANCELLED" ||
      order.status === "BILLED" ||
      order.status === "REFUNDED"
    ) {
      t.rollback();
      Logger.error(`La orden ha sido cerrada y no puede ser modificada.`, {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `successTecopaySale`,
        order: order.id,
      });
      return res.status(400).json({
        message: "La orden ha sido cerrada y no puede ser modificada.",
      });
    }

    const foundPaymentGateway = await PaymentGateway.findOne({
      where: {
        businessId: order.businessId,
        code: "G_TECOPAY",
      },
    });

    order.paidAt = moment().toDate();
    order.paymentGatewayId = foundPaymentGateway?.id;
    order.status = "BILLED";
    order.closedDate = moment().toDate();

    //Registering actions
    listRecords.push({
      action: "ORDER_BILLED",
      title: getTitleOrderRecord("ORDER_BILLED"),
      orderReceiptId: order.id,
      observations: `Transacción: ${transactionNumber}, ${message}.`,
      madeById: 1,
      isPublic: true,
    });

    //Create Records
    if (listRecords.length !== 0) {
      await OrderReceiptRecord.bulkCreate(listRecords, {
        transaction: t,
      });
    }

    //Registering payment
    //Checking and destroying if orderreceipt payment records exist
    await CurrencyPayment.destroy({
      where: {
        orderReceiptId: order.id,
      },
      transaction: t,
    });

    await CashRegisterOperation.destroy({
      where: {
        orderReceiptId: order.id,
      },
      transaction: t,
    });

    //Registering payment
    addBulkCurrencies.push({
      amount,
      codeCurrency: "PTP",
      orderReceiptId: order.id,
      paymentWay: foundPaymentGateway?.paymentWay,
    });

    await order.save({ transaction: t });

    //Setting final data
    if (addBulkCurrencies.length !== 0) {
      await CurrencyPayment.bulkCreate(addBulkCurrencies, {
        transaction: t,
      });
    }

    // Obtaining order
    const order_to_emit = await OrderReceipt.scope("to_return").findByPk(
      order.id,
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json(`done`);

    if (status === 200) {
      socketQueue.add(
        {
          code: "UPDATE_ORDER",
          params: {
            order: order_to_emit,
            from: 1,
            fromName: `Tecobot Tecopay`,
            origin: req.header("X-App-Origin"),
          },
        },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );

      productQueue.add(
        {
          code: "CHECKING_PRODUCT",
          params: {
            productsIds:
              order_to_emit?.selledProducts.map((item) => item.productId) || [],
            businessId: order.businessId,
          },
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: true }
      );
    }
  } catch (error: any) {
    t.rollback();
    Logger.error(
      error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
      {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `successTecopaySale`,
      }
    );
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};

export const failTecopaySale = async (req: any, res: Response) => {
  const t = await db.transaction(config_transactions);

  try {
    const { reference, message } = req.body;

    const order = await OrderReceipt.findByPk(reference);

    if (!order) {
      t.rollback();
      Logger.error(`La referencia no fue encontrada`, {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `failTecopaySale`,
      });
      return res.status(400).json({
        message: "La referencia no fue encontrada",
      });
    }

    let listRecords: any = [];
    if (
      order.status === "CANCELLED" ||
      order.status === "BILLED" ||
      order.status === "REFUNDED"
    ) {
      t.rollback();
      return {
        status: 400,
        message: `La orden ha sido cerrada y no puede ser modificada.`,
      };
    }

    //Registering actions
    listRecords.push({
      action: "PAYMENT_FAILS",
      title: getTitleOrderRecord("PAYMENT_FAILS"),
      orderReceiptId: order.id,
      observations: `${message}`,
      madeById: 1,
      isPublic: true,
    });

    //Create Records
    if (listRecords.length !== 0) {
      await OrderReceiptRecord.bulkCreate(listRecords, {
        transaction: t,
      });
    }

    await t.commit();
    res.status(200).json(`done`);
  } catch (error: any) {
    t.rollback();
    Logger.error(
      error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
      {
        "X-App-Origin": req.header("X-App-Origin"),
        rute: `failTecopaySale`,
      }
    );
    res.status(500).json({
      message:
        error.toString() ||
        "Ha ocurrido un error interno. Por favor consulte al administrador.",
    });
  }
};
