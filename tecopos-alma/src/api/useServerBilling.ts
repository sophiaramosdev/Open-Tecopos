import { useState } from "react";
import {
  BillingBusiness,
  InvoiceInterface,
  PaginateInterface,
} from "../interfaces/ServerInterfaces";
import query from "./APIServices";
import useServer from "./useServer";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/LocalInterfaces";
import { generateUrlParams } from "../utils/helpers";

const useServerBilling = () => {
  const { manageErrors } = useServer();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allBilling, setAllBilling] = useState<Array<InvoiceInterface>>([]);
  const [billing, setBilling] = useState<InvoiceInterface | null>(null);
  const [nextBillingBusiness, setNextBillingBusiness] = useState<
    BillingBusiness[]
  >([]);
  

  const getAllBilling = async (id:string, filter:BasicType) => {
    setIsLoading(true);
    await query
      .get(`/control/billing/business/${id}${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllBilling(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getBilling = async (invoiceId: number) => {
    setIsLoading(true);
    await query
      .get(`/control/billing/invoice/${invoiceId}`)
      .then((resp) => {
        let status;
        switch (resp.data.status) {
          case "APPROVED":
            status = "APROBADA";
            break;

          case "REJECTED":
            status = "RECHAZADA";
            break;

          case "PENDING":
            status = "PENDIENTE";
            break;
        }
        setBilling({ ...resp.data, status });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addInvoice = async (
    businessId: string,
    data: Partial<InvoiceInterface>,
    closeModal: Function
  ) => {

    setIsFetching(true);
    await query
      .post(`/control/billing/business/${businessId}`, data)
      .then((resp) => {
        setAllBilling([resp.data,...allBilling])
        toast.success("Factura agregada con éxito");
        closeModal();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteInvoice = async (invoiceId: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/control/billing/invoice/${invoiceId}`, {})
      .then(() => {
        setAllBilling(allBilling.filter(item=>item.id !== invoiceId))
        toast.success("Factura Eliminada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
      setIsFetching(false)

  };

  const getNextBillingBusiness = async (filter:BasicType) => {
    setIsLoading(true);
    await query
      .get(`/control/billing/next-billing${generateUrlParams(filter)}`)
      .then((resp) => {
        setNextBillingBusiness(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });

      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  return {
    isLoading,
    isFetching,
    paginate,
    
    allBilling, 
    billing,
    nextBillingBusiness,

    getAllBilling,
    getBilling,
    getNextBillingBusiness,
    addInvoice,
    deleteInvoice,
    
  };
};

export default useServerBilling;
