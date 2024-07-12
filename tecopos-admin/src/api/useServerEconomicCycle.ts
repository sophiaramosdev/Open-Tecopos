import { useState } from "react";
import {
  AreaSalesIncomes,
  AreasInterface,
  CashOperationInterface,
  EconomicCycle,
  OrderInterface,
  PaginateInterface,
  PartialPaymentInterface,
  SelledReport,
  ServerStockInventoryInterface,
  salesOrders,
} from "../interfaces/ServerInterfaces";
import query from "./APIServices";

import useServer from "./useServerMain";
import { BasicType, SelectInterface } from "../interfaces/InterfacesLocal";
import { exportExcel, generatePdf, generateUrlParams } from "../utils/helpers";
import { toast } from "react-toastify";
import { Order } from "../interfaces/Interfaces";
import { getStatusOrderSpanish } from "../utils/functions";
import moment from "moment";
import { useAppSelector } from "../store/hooks";
import CashBoxPdf from "../reports/CashboxPdf";

export const useServerEcoCycle = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allEcoCycles, setAllEcoCycles] = useState<EconomicCycle[]>([]);
  const [activeEcoCycles, setActiveEcoCycles] = useState<EconomicCycle[]>([]);

  const [allOrdes, setAllOrdes] = useState<OrderInterface[]>([]);
  const [allDuplicatorAreaSales, setAllDuplicatorAreaSales] = useState<
    SelectInterface[]
  >([]);
  const [partialpaymentsByEconomicCycle, setPartialpaymentsByEconomicCycle] =
    useState<PartialPaymentInterface[]>();
  const [ecoCycle, setEcoCycle] = useState<EconomicCycle | null>(null);
  const [selledReport, setSelledReport] = useState<SelledReport | null>(null);
  const [salesbyOrders, setAllSalesbyOrders] = useState<salesOrders | null>(
    null
  );
  const [areaSalesIncome, setAreaSalesIncome] = useState<AreaSalesIncomes[]>(
    []
  );
  const [order, setOrder] = useState<OrderInterface | null>(null);
  const [stockInventory, setStockInventory] =
    useState<ServerStockInventoryInterface | null>(null);
  const { manageErrors } = useServer();
  const { business } = useAppSelector((state) => state.init);

  const getAllEcoCycles = async (page: number) => {
    setIsFetching(true);
    await query
      .get(`/administration/economiccycle?page=${page}`)
      .then((resp) => {
        setAllEcoCycles(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getActiveEcoCycle = async () => {
    setIsFetching(true);
    await query
      .get("/administration/active-economiccycle")
      .then((resp) => {
        setActiveEcoCycles([resp.data]);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getAllOrdesV1 = async (filter: BasicType) => {
    if (!(Object.values(filter).length > 0)) {
      setAllOrdes([]);
      return;
    }
    setIsLoading(true);
    await query
      .get(`/sales/order${generateUrlParams(filter)}`)
      // .get(`/sales/order${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllOrdes(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  const getAllOrdesV2 = async (filter: BasicType) => {
    if (!(Object.values(filter).length > 0)) {
      setAllOrdes([]);
      return;
    }
    setIsLoading(true);
    await query
      .get(`/sales/v2/order${generateUrlParams(filter)}`)
      // .get(`/sales/order${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllOrdes(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const findAllOrdersByProduct = async (
    id: number,
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/sales/order/products/${id}${generateUrlParams({
          ...filter,
        })}`
      )
      .then((resp) => {
        setAllOrdes(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const updateAllOrderState = (order: OrderInterface, del?: boolean) => {
    const current = [...allOrdes!];
    const idx = current.findIndex((itm) => itm.id === order.id);
    if (idx !== -1) {
      !del ? current.splice(idx, 1, order) : current.splice(idx, 1);
    }
    setAllOrdes(current);
  };

  const updateSingleOrderState = (order: OrderInterface) => {
    setOrder(order);
  };

  const getOrder = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/sales/order/${id}`)
      .then(async (resp) => {
        const order = {
          ...resp.data,
          selledProducts: await Promise.all(
            resp.data.selledProducts.map(async (product: any) => {
              if (product.type === "COMBO") {
                return {
                  ...product,
                  compositions: await query
                    .get(
                      `/administration/product/combocompositions${generateUrlParams(
                        {
                          ids: product.productId,
                        }
                      )}`
                    )
                    .then((response) => {
                      return response.data.length
                        ? response.data[0].compositions
                        : [];
                    })
                    .catch(() => {
                      return [];
                    }),
                };
              }
              return product;
            })
          ),
        };
        setOrder(order);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const registerOrderPayment = async (
    orderId: number,
    data: Record<string, any>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/pay-order/${orderId}`, data)
      .then((resp) => {
        callback(resp.data);
        toast.success("Pago registrado con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const cancelOrderPayment = async (orderId: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/sales/pay/online-order/${orderId}`, {})
      .then((resp) => callback(resp.data))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editOrder = async (
    id: number,
    data: BasicType,
    updateState: (order: OrderInterface) => void
  ) => {
    setIsFetching(true);
    await query
      .patch(`/sales/online-order/${id}`, data)
      .then((resp) => {
        const data: OrderInterface = resp.data;
        setAllOrdes(
          allOrdes.map((item) => (item.id === data.id ? data : item))
        );
        updateState(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const addEcoCycle = async (
    data: { name: string; priceSystemId: number; observations?: string },
    closeModal?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/economiccycle/open`, data)
      .then((resp) => {
        setAllEcoCycles([resp.data, ...allEcoCycles]);
      })
      .catch((e) => manageErrors(e));
    closeModal && closeModal();
    setIsFetching(false);
  };

  const editEcoCycle = async (
    id: string,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/economiccycle/${id}`, data)
      .then((resp) => {
        setEcoCycle(resp.data);
        toast.success("Actualización exitosa");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getEcoCycle = async (id: string) => {
    setIsLoading(true);
    await query
      .get(`/administration/economiccycle/${id}`)
      .then((resp) => {
        setEcoCycle(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getSelledReport = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/report/selled-products${generateUrlParams(filter)}`)
      .then((resp) => setSelledReport(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getAllSalesbyOrders = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/report/byorders${generateUrlParams(filter)}`)
      .then((resp) => setAllSalesbyOrders(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getAreaSalesIncomes = async (areasId: number[], ecoCycleId: string) => {
    setIsLoading(true);
    await Promise.all(
      areasId.map((id) =>
        query.get(`/report/incomes/cycle/${ecoCycleId}/area/${id}`)
      )
    )
      .then((resp) => {
        let report: AreaSalesIncomes[] = [];
        // eslint-disable-next-line array-callback-return
        resp.map((item, idx) => {
          if (item.data.totalSales.length !== 0)
            report.push({ areaId: areasId[idx], ...item.data });
        });
        setAreaSalesIncome(report);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const closeEconomicCycle = async (callback: Function) => {
    setIsFetching(true);
    await query
      .post(`/administration/economiccycle/close`, {})
      .then((resp) => {
        setEcoCycle(resp.data);
        toast.success("El ciclo económico se cerró satisfactoriamente");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteEconomicCycle = async (id: string, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/economiccycle/${id}`, {})
      .then(() => {
        toast.success("El ciclo económico se eliminó satisfactoriamente");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const exportOrdersCycle = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(`/sales/order${generateUrlParams(filter)}`)
      .then((resp) => {
        const Orders: OrderInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];
        // eslint-disable-next-line array-callback-return
        Orders.map((item) => {
          dataToExport.push({
            "No. Orden": item.operationNumber,
            Nombre: item.name,
            Estado: getStatusOrderSpanish(item.status),
            Apertura:
              moment().diff(item.createdAt, "hour") < 24
                ? moment(item.createdAt).format("hh:mm A")
                : moment(item.createdAt).format("DD/MM hh:mm A"),
            Cierre:
              item.closedDate !== null
                ? moment().diff(item.closedDate, "hour") < 24
                  ? moment(item.closedDate).format("hh:mm A")
                  : moment(item.closedDate).format("DD/MM hh:mm A")
                : "Sin Cerrar",
            Total: !item.houseCosted
              ? item.totalToPay
                ? item.totalToPay.length > 0
                  ? item.totalToPay.length === 1
                    ? item.totalToPay[0].amount
                    : item.totalToPay.map((pay) => pay.amount).join(", ")
                  : 0
                : 0
              : item.totalCost,
            // Total: !item.houseCosted
            //   ? item.prices
            //     ? item.prices.length > 0
            //       ? item.prices.length === 1
            //         ? item.prices[0].price
            //         : item.prices.map((pay) => pay.price).join(", ")
            //       : 0
            //     : 0
            //   : item.totalCost,
            Monedas: !item.houseCosted
              ? item.prices
                ? item.prices.length > 0
                  ? item.prices.length === 1
                    ? item.prices[0].codeCurrency
                    : item.prices.map((pay) => pay.codeCurrency).join(", ")
                  : business?.costCurrency ?? ""
                : business?.costCurrency ?? ""
              : business?.costCurrency ?? "",
            "":
              item.discount === 100
                ? "%"
                : item.houseCosted
                ? "Por la casa"
                : item.currenciesPayment.some(
                    (item) => item.paymentWay === "TRANSFER"
                  )
                ? "Transferencia"
                : "",
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const [syncFetching, setSyncFetching] = useState(false);
  const syncronizeOnlineOrder = async (
    externalId: number,
    updCallback: (order: OrderInterface) => void
  ) => {
    setSyncFetching(true);
    await query
      .post(`/woocommerce/sync-order/${externalId}`, {})
      .then((resp) => {
        setOrder(resp.data);
        updCallback(resp.data);
        toast.success("Sincronización exitosa");
      })
      .catch((e) => manageErrors(e));
    setSyncFetching(false);
  };

  const setAllOrderState = (data: OrderInterface[]) => setAllOrdes(data);

  const getStockInventory = async (ecoCycleId: string, areaId: string) => {
    setIsLoading(true);
    await query
      .get(`/administration/stock/inventory/${ecoCycleId}/${areaId}`)
      .then((resp) => setStockInventory(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const createOrder = async (data: Order, callback?: Function) => {
    setIsLoading(true);
    await query
      .post("/sales/order", data)
      .then((resp) => {
        setAllOrdes([...allOrdes, resp.data]);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const createFastOrder = async (data: Order, callback?: Function) => {
    setIsLoading(true);
    await query
      .post("/sales/queue/neworder", data)
      .then((resp) => {
        setAllOrdes([...allOrdes, resp.data]);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const exportCashbox = ({
    ecoCycle,
    configKeys,
    areas,
    report,
    cashOperation,
  }: {
    ecoCycle: EconomicCycle | null;
    configKeys: {
      cash_operations_include_deliveries: boolean;
      cash_operations_include_tips: boolean;
      enable_delivery: boolean;
      extract_salary_from_cash: boolean;
    };
    cashOperation: CashOperationInterface | any;
    areas: AreasInterface[];
    report: AreaSalesIncomes[];
  }) => {
    const promise = query
      .get(
        `/sales/order${generateUrlParams({
          economicCycleId: ecoCycle!.id,
          status: "PAYMENT_PENDING",
          all_data: true,
        })}`
      )
      .then((resp) => {
        const orders: OrderInterface[] = resp.data.items;
        generatePdf(
          CashBoxPdf({
            configKeys,
            areas,
            report,
            ecoCycle,
            orders,
            cashOperation,
            areaSalesIncome,
            costCurrency: business?.costCurrency!,
          }),
          "Reporte de Caja"
        );
      });
    toast.promise(promise, {
      pending: "Generando reporte",
      success: "Reporte generado",
      error: "No se pudo generar el reporte",
    });
  };

  const postEconomicCycleDuplicator = async (data: any) => {
    setIsFetching(true);
    await query
      .post("/administration/duplicator/economiccycle", data)
      .then((resp) => {
        toast.success("El ciclo económico se duplicó satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getAllDuplicatorAreaSales = async () => {
    setIsFetching(true);
    await query
      .get("/administration/economiccycle/duplicator/areas")
      .then((resp) => {
        setAllDuplicatorAreaSales(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getPartialpaymentsByEconomicCycle = async (ecoCycleId: number) => {
    setIsFetching(true);
    await query
      .get(
        `/sales/partialpayments${generateUrlParams({
          economicCycleId: ecoCycleId,
        })}`
      )
      .then((resp) => {
        setPartialpaymentsByEconomicCycle(resp.data);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        })
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  return {
    allEcoCycles,
    ecoCycle,
    allOrdes,
    selledReport,
    areaSalesIncome,
    order,
    stockInventory,

    getAllOrdesV1,
    getAllOrdesV2,
    registerOrderPayment,
    cancelOrderPayment,
    updateAllOrderState,
    updateSingleOrderState,
    getAllEcoCycles,
    getActiveEcoCycle,
    getEcoCycle,
    addEcoCycle,
    getSelledReport,
    getAreaSalesIncomes,
    getOrder,
    closeEconomicCycle,
    editEcoCycle,
    editOrder,
    deleteEconomicCycle,
    syncFetching,
    syncronizeOnlineOrder,
    setAllOrderState,
    getStockInventory,
    exportCashbox,
    activeEcoCycles,
    findAllOrdersByProduct,

    isLoading,
    isFetching,
    paginate,

    exportOrdersCycle,
    createOrder,
    createFastOrder,

    postEconomicCycleDuplicator,
    getAllDuplicatorAreaSales,
    allDuplicatorAreaSales,
    salesbyOrders,
    getAllSalesbyOrders,

    getPartialpaymentsByEconomicCycle,
    partialpaymentsByEconomicCycle
  };
};

export default useServerEcoCycle;
