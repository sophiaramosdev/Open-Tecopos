import { useState } from "react";
import {
  CouponResultInterface,
  OrderInterface,
  PaginateInterface,
  PrepaidsInterface,
  PriceInvoiceInterface,
} from "../interfaces/ServerInterfaces";

import query from "./APIServices";
import { exportExcel, generateUrlParams } from "../utils/helpers";
import useServer from "./useServerMain";
import { Product, ProductSale } from "../interfaces/Interfaces";
import { translateOrderOrigin, translateOrderState } from "../utils/translate";
import moment from "moment";
import { ApplyCouponBody, BasicType } from "../interfaces/InterfacesLocal";

const generateParams = (options: Record<string, string | number | null>) => {
  let list: string[] = [];
  for (const [key, value] of Object.entries(options)) {
    if (!value) continue;
    list.push(`${key}=${value}`);
  }
  if (list.length !== 0) {
    return list.join("&");
  } else {
    return "";
  }
};

const useServerOrders = () => {
  //Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outLoading, setOutLoading] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  //Paginate State
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);

  //Items States
  const [allOrders, setAllOrders] = useState<OrderInterface[]>([]);
  const [order, setOrder] = useState<OrderInterface | null>(null);
  const [prepaids, setPrepaids] = useState<PrepaidsInterface[]>([]);
  const [couponResult, setCouponResult] =
    useState<CouponResultInterface | null>(null);

  //Hay que establecerle el tipado correcto a este estado
  const [orderWhereProduct, setOrderWhereProduct] = useState<any>();

  const [saleProducts, setSaleProducts] = useState<Product[]>([]); //Products of current Area
  const [saleProductsSearch, setSaleProductsSearch] = useState<ProductSale[]>([]); //Products of current Area

  const { manageErrors } = useServer();

  const managePaginate = (opp: "add" | "del") => {
    if (paginate !== null) {
      if (opp === "add") {
        if (paginate.totalItems / paginate.totalPages < 35) {
          setPaginate({ ...paginate, totalItems: paginate.totalItems + 1 });
          return false;
        } else {
          setPaginate({
            ...paginate,
            totalItems: paginate.totalItems + 1,
            totalPages: Math.ceil(paginate.totalItems / 35),
          });
          return true;
        }
      } else {
        if (paginate.totalItems / paginate.totalPages <= 35) {
          setPaginate({ ...paginate, totalItems: paginate.totalItems - 1 });
          return false;
        } else {
          setPaginate({
            ...paginate,
            totalPages: Math.ceil(paginate.totalItems / 35),
            totalItems: paginate.totalItems - 1,
          });
          return true;
        }
      }
    }
  };

  const editOrder = async (
    id: number,
    data: Record<string, string>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/sales/online-order/${id}`, data)
      .then((resp) => {
        let newOrdes = allOrders.filter((order) => order.id !== id);
        newOrdes = [resp.data, ...newOrdes];
        setAllOrders(newOrdes);
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getAllOrdersByCoupon = async (coupon: string | undefined) => {
    setOutLoading(true);
    await query
      .get(`/sales/order?coupons=${coupon}`)
      .then((resp) => {
        setAllOrders(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));

    setOutLoading(false);
  };

  const updateAllOrderState = (order: OrderInterface) => {
    const current = [...allOrders!];
    const idx = current.findIndex((itm) => itm.id === order.id);
    if (idx !== -1) current.splice(idx, 1, order);
    setAllOrders(current);
  };

  const getAllOrders = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    await query
      .get(`/sales/order${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllOrders(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getAllOrdersForPage = async (
    page?: number | null,
    filter?: Record<string, string | number | null> | null
  ) => {
    const urlParams = filter ? generateParams(filter) : "";
    setIsLoading(true);
    await query
      .get(`/shop/order?page=${page ? page : 1}${urlParams}`)
      .then((resp) => {
        setAllOrders(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const exportOrders = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setOutLoading(true);
    await query
      .get(`/sales/order${generateUrlParams({ ...filter, all_data: true })}`)
      .then((resp) => {
        const Orders: OrderInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        Orders.forEach((item) => {
          for (let index = 0; index < item.totalToPay.length; index++) {
            dataToExport.push({
              "No.Orden": item.operationNumber,
              Nombre: item?.name ?? "-",
              Cliente:
                item?.client?.firstName || item?.client?.lastName
                  ? `${item?.client?.firstName ?? ""} ${
                      item?.client?.lastName ?? ""
                    }`
                  : item?.client?.email ?? "-",
              Estado: translateOrderState(item.status),
              Origen: translateOrderOrigin(item.origin),
              Creada: moment(item.createdAt).format("DD[/]MM[/]YYYY HH:mm"),
              "Fecha de cobro": item.closedDate
                ? moment(item.closedDate).format("DD[/]MM[/]YYYY HH:mm")
                : "-",
              Subtotal: item.prices[index]?.price ?? "-",
              "Subtotal moneda": item.prices[index]?.codeCurrency ?? "-",
              Total: item.totalToPay[index]?.amount ?? "-",
              "Total moneda": item.totalToPay[index]?.codeCurrency ?? "-",
            });
          }
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const findAllOrdersWhereProduct = async (idProduct: number) => {
    setIsLoading(true);
    await query
      .get(`/sales/order/products/${idProduct}`)
      .then((resp) => {
        setOrderWhereProduct(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const exportStoreOrders = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(`/sales/order${generateUrlParams({ ...filter, all_data: true })}`)
      .then((resp) => {
        const dataToExport: Array<Record<string, any>> = [];
        resp.data.items.forEach((order: OrderInterface) => {
          const idx = order.totalToPay.length || 1;
          const discounts: PriceInvoiceInterface[] = [];
          if (order?.discount) {
            order.prices.forEach((price) => {
              const idx = discounts.findIndex(
                (disc) => disc.codeCurrency === price.codeCurrency
              );
              if (idx !== -1) {
                const amount =
                  discounts[idx].amount + price.price * 0.01 * order.discount;
                discounts.splice(idx, 1, {
                  amount,
                  codeCurrency: price.codeCurrency,
                });
              } else {
                discounts.push({
                  amount: price.price * 0.01 * order.discount,
                  codeCurrency: price.codeCurrency,
                });
              }
            });
          }
          if (order?.couponDiscountPrice) {
            const idx = discounts.findIndex(
              (itm) =>
                itm.codeCurrency === order.couponDiscountPrice.codeCurrency
            );
            if (idx !== -1) {
              const amount =
                discounts[idx].amount + order.couponDiscountPrice.amount;
              discounts.splice(idx, 1, { ...discounts[idx], amount });
            } else {
              discounts.push(order.couponDiscountPrice);
            }
          }
          for (let index = 0; index < idx; index++) {
            dataToExport.push({
              "Número de la orden": order.operationNumber,
              Fecha: moment(order.createdAt).format("DD[/]MM[/]YYYY"),
              Estado: translateOrderState(order.status),
              "¿Pagada?": order.paidAt ? "Si" : "No",
              "Entregar a":
                order.shipping?.firstName || order.shipping?.lastName
                  ? `${order.shipping?.firstName ?? ""} ${
                      order.shipping?.lastName ?? ""
                    }`
                  : order?.shipping?.email ?? "-",
              Contacto: order?.shipping?.phone ?? "-",
              Dirección: [
                order.shipping?.street_1,
                order.shipping?.street_2,
                order.shipping?.city,
              ]
                .filter((part) => !!part)
                .join(", "),
              Municipio: order.shipping?.municipality?.name ?? "-",
              Provincia: order.shipping?.province?.name ?? "-",
              Cupón: order.coupons.map((elem) => elem.code).join(", "),
              Descuento: discounts[index]?.amount,
              "Moneda Descuento": discounts[index]?.codeCurrency,
              "Precio de Envío": order?.shippingPrice?.amount ?? "-",
              "Moneda de envío": order?.shippingPrice?.codeCurrency ?? "-",
              Subtotal: order.prices[index]?.price,
              "Moneda Subtotal": order.prices[index]?.codeCurrency,
              Total: order.totalToPay[index]?.amount,
              Moneda: order.totalToPay[index]?.codeCurrency,
              Repartidor:
                order?.shippingBy?.displayName ??
                order?.shippingBy?.username ??
                "-",
              Observaciones: order.observations,
              "Nota del cliente": order.customerNote,
            });
          }
        });
        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(false));
    setIsLoading(false);
  };

  const getProductsByArea = async (
    areaId: number,
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/sales/area/${areaId}/products${generateUrlParams(filter)}`)
      .then((resp) => {
        setSaleProducts(resp.data);
      })
      .catch((e) => {
        manageErrors(e);
      });

    setIsLoading(false);
  };

  const getProductsByAreaSearch = async (
    areaId: number | string,
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/sales/area/${areaId}/search${generateUrlParams(filter)}`)
      .then((resp) => {
        setSaleProductsSearch(resp.data);
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsLoading(false);
  };

  const getAllDeliverers = async () => {
    setIsLoading(true);
    await query
      .get("/shipping/deliverers")
      .then((resp) => {
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getOrder = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/billing-order/${id}`)
      .then((resp) => {
        setOrder(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getPrepaids = async (
    filter: Record<string, string | number | boolean | null>,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/prepaid-payments${generateUrlParams(filter)}`)
      .then((resp) => {
        setPrepaids(resp.data.items);
        callback && callback();
      })
      .catch((e) => manageErrors(e));

    setIsLoading(false);
  };

  
  const applyCoupon: (data: ApplyCouponBody) => void = async (data) => {
    setIsFetching(true);
    await query
      .post("/administration/billing-order/coupon", data)
      .then((resp) => {
        setCouponResult(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const nullCoupon = () => {
    setCouponResult(null)
  }

  return {
    managePaginate,
    isLoading,
    isFetching,
    outLoading,
    paginate,
    allOrders,
    order,
    getOrder,
    setOrder,
    updateAllOrderState,
    exportOrders,
    exportStoreOrders,
    editOrder,
    getAllDeliverers,
    findAllOrdersWhereProduct,
    orderWhereProduct,
    getAllOrders,
    getAllOrdersForPage,
    getAllOrdersByCoupon,
    saleProducts,
    getProductsByArea,
    getPrepaids,
    prepaids,
    applyCoupon,
    couponResult,
    nullCoupon,
    getProductsByAreaSearch,
    saleProductsSearch
  };
};

export default useServerOrders;
