import { useState } from "react";
import query from "./APIServices";
import useServer from "./useServerMain";
import {
  PaginateInterface,
  OrderSummary,
  RegisterBillingInterface,
  OnlineBillShippingInterface,
  Modifier,
  FinancialEconomicCycleReporteInterface,
  OrdersManagedByInterface,
} from "../interfaces/ServerInterfaces";
import { toast } from "react-toastify";
import { generateUrlParams, exportExcel, formatDateForTable, formatCurrency } from '../utils/helpers';
import { translateOrderOrigin, translateOrderState } from "../utils/translate";

export interface ShippingWhitPickUpInterface extends OnlineBillShippingInterface {
  pickUpInStore: boolean
}

export const useServerBilling = () => {
  //=> Hooks
  const { manageErrors } = useServer();

  //=> States
  const [modalDetail, setModalDetail] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isFetchingAux, setIsFetchingAux] = useState<boolean>(true);
  const [prepaidWizardModal, setPrepaidWizardModal] = useState<boolean>(false);

  const [overduePaginate, setOverduePaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });

  const [registerPaginate, setRegisterPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });

  const [prepaidPaginate, setPrepaidPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });
  const [modifierPaginate, setModifierPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });

  // Registros
  const [registerBillingList, setRegisterBillingList] = useState<
    RegisterBillingInterface[]
  >([]);
  // Cobros Vencidos
  const [overduePaymentsList, setOverduePaymentsList] = useState([]);
  //  Pagos anticipados
  const [prepaidsList, setPrepaidsList] = useState<any>([]);
  // todo: tipar prepaidPayment
  const [prepaidById, setPrepaidById] = useState<any>();
  //  Orden por Id
  const [orderById, setorderById] = useState<RegisterBillingInterface | null>();
  // 
  const [AllSummaryOrders, setAllSummaryOrders] = useState<OrderSummary>();
  // Descuetno y comisiones 
  const [allModifier, setAllModifier] = useState<Modifier[]>([]);
  // List financial report in economic cycle
  const [financialEconomicCycleReporte, setFinancialEconomicCycleReporte] = useState<FinancialEconomicCycleReporteInterface>()
  // Report Orders By Managed
  const [reportOrdersManagedBy, setReportOrdersManagedBy] = useState<OrdersManagedByInterface>()
  // Resumen contable por órdenes
  const [accountingSummaryByOrders, setAccountingSummaryByOrders] = useState<OrdersManagedByInterface>()

  //  Fetch Methods
  const getAllOverduePayments = async (
    filter: Record<string, string | number | boolean | null>
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .get(`/administration/overdue-payment${generateUrlParams(filter)}`)
      .then((res) => {
        setOverduePaymentsList(res.data.items);
        setOverduePaginate({
          currentPage: res.data.currentPage,
          totalItems: res.data.totalItems,
          totalPages: res.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };
  const getAllOverduePaymentsV2 = async (
    filter: Record<string, string | number | boolean | null>
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .get(`/administration/overdue-paymentV2${generateUrlParams(filter)}`)
      .then((res) => {
        setOverduePaymentsList(res.data.items);
        setOverduePaginate({
          currentPage: res.data.currentPage,
          totalItems: res.data.totalItems,
          totalPages: res.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const getAllRegisterBillingList = async (
    filter: Record<string, string | number | boolean | null>
  ): Promise<RegisterBillingInterface[] | void> => {
    setIsFetching(true);
    await query
      .get(`/administration/billing-order${generateUrlParams(filter)}`)
      .then((res) => {
        setRegisterBillingList(res.data.items);
        setRegisterPaginate({
          currentPage: res.data.currentPage,
          totalItems: res.data.totalItems,
          totalPages: res.data.totalPages,
        });
        return res.data.items
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const exportExcelOrders = async (
    filter: Record<string, string | number | boolean | null>,
    fileName: string,
    callBack?: Function
  ): Promise<RegisterBillingInterface[] | void> => {
    setIsLoading(true);
    await query
      .get(`/administration/billing-order${generateUrlParams(filter)}`)
      .then((res) => {
        const data: RegisterBillingInterface[] = res.data.items
        const dataToExport: any = [];
        data?.forEach((item) => {
          dataToExport.push({
            Tipo: !item?.isPreReceipt ? "Factura" : "Pre-Factura",
            "No.": !item?.isPreReceipt
              ? item.operationNumber
              : item.preOperationNumber,
            Cliente: `${item.client?.firstName ?? ""} ${item.client?.lastName ?? ""}`,
            Estado: translateOrderState(item.status),
            Emisión: formatDateForTable(item?.createdAt),
            Origen: translateOrderOrigin(item.origin),
            Importe: item.totalToPay.map((total) => `${formatCurrency(total.amount, total.codeCurrency)}`).join(" ")
          });
        });

        exportExcel(dataToExport, fileName).then(() => {

          callBack && callBack()
        })
      })
      .catch((error) => manageErrors(error));

    setIsLoading(false);
  };

  const updateOrderListLocally = (order: RegisterBillingInterface) => {
    const allOrders = [...registerBillingList];
    const idx = registerBillingList.findIndex(item => item.id === order.id);
    allOrders.splice(idx, 1, { ...allOrders[idx], ...order })
    setRegisterBillingList(allOrders)
  }

  const getAllPrepaidsList = async (
    filter: Record<string, string | number | boolean | null>
  ): Promise<void> => {
    setIsLoading(true);
    await query
      .get(`/administration/prepaid-payments${generateUrlParams(filter)}`)
      .then((res) => {
        setPrepaidsList(res.data.items);
        setPrepaidPaginate({
          currentPage: res.data.currentPage,
          totalItems: res.data.totalItems,
          totalPages: res.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));

    setIsLoading(false);
  };

  const getPrepaidPaymentById = async (
    id: number,
    filter?: Record<string, string | number | boolean | null>
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .get(`/administration/prepaid-payments/${id}${generateUrlParams(filter)}`)
      .then((res) => {
        setPrepaidById(res.data);
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  }

  const cancelOrder = async (id: number): Promise<void> => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/billing-order/${id}`, {})
      .then((res) => {
        const update = registerBillingList.map(item =>{
          if(item.id === id){
            return res.data
          }
          return item
        })
        setRegisterBillingList(update)

        toast.success("Se canceló la orden correctamente");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const sendRemaindRegister = async (id: number) => {
    setIsLoading(true);
    await query
      .post(`/administration/remind-orders`, { orderId: id })
      .then(() => {
        toast.success("Recordatorio enviado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const refundBillingOrder = async (id: number) => {
    setIsFetching(true);
    await query
      .post(`/administration/refund-order/${id}`, () => { })
      .then(() => {
        setRegisterBillingList((prevRegisters) => prevRegisters.map(item => item.id === id ? ({ ...item, status: "REFUNDED" }) : item))

        toast.success("Reembolso realizado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const refundPrepaidPayment = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .post(`/administration/refund-prepaidPayment/${id}`, () => { })
      .then((res) => {
        const update = prepaidsList.map((item: any) => {
          if (item.id === id) {
            return res.data
          }
          return item
        })
        //setModalDetail(null);
        setPrepaidsList(update);
        callback(res.data)
        toast.success("Reembolso realizado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getResume = async (): Promise<void> => {
    setIsFetching(true);
    query
      .get(`/billings/resume`)
      .then((res) => {
        setOverduePaymentsList(res.data);
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const addNewBilling = async (newBilling: any, callback: Function, finallyCase?: Function): Promise<void> => {
    setIsLoading(true);
    query
      .post("/administration/billing-order", newBilling)
      .then((resp) => {
        setRegisterBillingList([resp.data, ...registerBillingList]);

        setRegisterPaginate({
          ...registerPaginate,
          totalItems: registerPaginate?.totalItems + 1 ?? 0,
        });
        //----- set del estado para el modal de pago --->
        callback((resp.data.id))
        setorderById(resp.data)
        toast.success("Factura creada exitosamente");
      })
      .catch((e) => { manageErrors(e) }).finally(() => finallyCase && finallyCase())
    setIsLoading(false);

  };

  const addNewPreBilling = async (
    newPreBilling: any,
    callback: Function,
    finallyCase?: Function
  ): Promise<void> => {
    setIsLoading(true);
    query
      .post("/administration/pre-billing-order", newPreBilling)
      .then((resp) => {
        setRegisterBillingList([resp.data, ...registerBillingList]);
        setRegisterPaginate({
          ...registerPaginate,
          totalItems: registerPaginate?.totalItems + 1 ?? 0,
        });

        callback();
        toast.success("Pre-factura creada exitosamente");
      })
      .catch((e) => { manageErrors(e) }).finally(() => finallyCase && finallyCase())
    setIsLoading(false);

  };
  const editBilling = async (id: number, data: any, callBack?: Function) => {
    setIsFetching(true);
    await query
      .patch(`/administration/billing-order/${id}`, data)
      .then((resp) => {
        const update = registerBillingList?.map(item => {
          if (item.id === resp.data.id) {
            return resp.data
          }
          return item
        })
        setorderById(resp.data)
        setRegisterBillingList(update)
        callBack && callBack(resp.data)
        toast.success(`Edición realizada exitosamente`);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const addNewPrepaid = async (newPrepaid: any, callback: Function) => {
    setIsFetching(true);
    await query
      .post("/administration/prepaid-payments", newPrepaid)
      .then((resp) => {
        setPrepaidsList([resp.data, ...prepaidsList])
        setPrepaidPaginate({
          ...prepaidPaginate,
          totalItems: registerPaginate?.totalItems + 1 ?? 0,
        });
        callback();
        toast.success("Pago anticipado creado exitosamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const editPrepaid = async (id: any, data: any, callback: Function) => {
    setIsFetching(true);
    await query
      .patch(`/administration/prepaid-payments/${id}`, data)
      .then((resp) => {
        callback(resp.data);
        toast.success("Pago anticipado editado exitosamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const GetAllSummaryOrders = async () => {
    setIsFetching(true);
    query
      .get(`/administration/summary-orders`)
      .then((res) => {
        setAllSummaryOrders(res.data);
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };
  const getOrderBillingById = async (id: number | string) => {
    setIsLoading(true)
    setIsFetchingAux(true)
    await query.get(`/administration/billing-order/${id}`)
      .then((resp) => {
        setorderById(resp.data)
      })
      .catch((e) => manageErrors(e))
    setIsLoading(false)
  }

  const convertPreBillToBill = async (id: number, data: any) => {
    setIsLoading(true)
    await query.patch(`/administration/transform-orders/${id}`, data)
      .then((resp) => {


        setRegisterBillingList((prevRegisters) => prevRegisters.map(item => item.id === id ? resp.data : item))


        toast.success("Factura creada exitosamente")
      })
      .catch((e) => manageErrors(e))
    setIsLoading(false)
  }

  const deletePartialPayment = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/partialPayment/${id}`, {})
      .then((response) => {
        setorderById(response.data)
        callback()
        toast.success("Pago eliminado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateSingleOrderState = (order: RegisterBillingInterface) => {
    setorderById(order);
  };

  const getAllModifier = async (
    filter: Record<string, string | number | boolean | null>
  ): Promise<void> => {
    setIsLoading(true);
    await query
      .get(`/administration/modifier${generateUrlParams(filter)}`)
      .then((res) => {
        setAllModifier(res.data.items);
        setModifierPaginate({
          currentPage: res.data.currentPage,
          totalItems: res.data.totalItems,
          totalPages: res.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));

    setIsLoading(false);
  };
  const addNewModifier = async (
    data: any,
    callback: Function,
    finallyCase?: Function
  ): Promise<void> => {
    setIsLoading(true);
    query
      .post("/administration/modifier", data)
      .then((resp) => {
        setAllModifier([resp.data, ...allModifier]);
        setModifierPaginate({
          ...modifierPaginate,
          totalItems: modifierPaginate?.totalItems + 1 ?? 0,
        });

        callback();
        toast.success("Modificador agregado");
      })
      .catch((e) => { manageErrors(e) }).finally(() => finallyCase && finallyCase())
    setIsLoading(false);
  };

  const deleteModifier = async (id: number, callback: Function) => {
    setIsLoading(true);
    await query
      .deleteAPI(`/administration/modifier/${id}`, {})
      .then(() => {
        setAllModifier((item) => item.filter(item => item.id !== id))
        setModifierPaginate({
          ...modifierPaginate,
          totalItems: modifierPaginate?.totalItems - 1 ?? 0,
        });
        callback()
        toast.success("Modificador eliminado");
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  const updateModifier = async (id: number, data: Record<string, any>, callback: Function, finallyCase?: Function) => {
    setIsFetching(true);
    await query
      .patch(`/administration/modifier/${id}`, data)
      .then((resp) => {
        const update = allModifier.map(item => {
          if (item.id === id) {
            return resp.data
          }
          return item
        })
        setAllModifier(update)
        toast.success("Modificador actualizado");
        callback()
      })
      .catch((e) => { manageErrors(e) }).finally(() => finallyCase && finallyCase())
    setIsFetching(false);
  };


  const getFinancialEconomicCycleReporte = async (data: any): Promise<void> => {
    setIsFetching(true);
    query
      .post("/report/billing/list/financial", data)
      .then((resp) => {
        setFinancialEconomicCycleReporte(resp.data);
       /*  toast.success("Reporte listo"); */
      })
      .catch((e) => {
        manageErrors(e);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const getReportOrdersManagedBy = async (dateFrom:string, dateTo:string, callback: Function): Promise<void> => {
    setIsFetching(true);
    query
      .get(`/report/orders/managedBy?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((resp) => {
        setReportOrdersManagedBy(resp.data);
        callback(resp.data);
      })
      .catch((e) => {
        manageErrors(e);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const getAccountingSummaryByOrders = async (data:any, callback?: Function): Promise<void> => {
    setIsFetching(true);
    query
      .get(`/report/orders/summary${generateUrlParams(data)}`)
      .then((resp) => {
        setAccountingSummaryByOrders(resp.data);
        callback && callback(resp.data);
      })
      .catch((e) => {
        manageErrors(e);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };


  return {
    isFetching,
    isLoading,
    registerBillingList,
    overduePaymentsList,
    exportExcelOrders,
    getAllRegisterBillingList,
    getAllOverduePayments,
    getResume,
    addNewBilling,
    overduePaginate,
    registerPaginate,
    GetAllSummaryOrders,
    AllSummaryOrders,
    cancelOrder,
    sendRemaindRegister,
    refundBillingOrder,
    addNewPreBilling,
    prepaidPaginate,
    getAllPrepaidsList,
    prepaidsList,
    addNewPrepaid,
    getOrderBillingById,
    orderById,
    editBilling,
    convertPreBillToBill,
    getPrepaidPaymentById,
    prepaidById,
    refundPrepaidPayment,
    modalDetail,
    setModalDetail,
    setPrepaidWizardModal,
    prepaidWizardModal,
    setPrepaidsList,
    deletePartialPayment,
    updateSingleOrderState,
    updateOrderListLocally,
    getAllOverduePaymentsV2,
    editPrepaid,
    getAllModifier,
    addNewModifier,
    deleteModifier,
    updateModifier,
    allModifier,
    modifierPaginate,
    isFetchingAux,
    setIsLoading,

    getFinancialEconomicCycleReporte,
    financialEconomicCycleReporte,

    getReportOrdersManagedBy,
    reportOrdersManagedBy,

    getAccountingSummaryByOrders,
    accountingSummaryByOrders
  };
};
