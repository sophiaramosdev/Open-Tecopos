import { useState } from "react";

import {
  Movement,
  PaginateInterface,
  CouponClientInterface,
  SuppliesInterface,
  FixedCost,
} from "../interfaces/ServerInterfaces";

import query from "./APIServices";
import { toast } from "react-toastify";
import {
  exportExcel,
  generateUrlParams,
} from "../utils/helpers";

import useServer from "./useServerMain";

const generateParams = (options: Record<string, string | number | boolean |null>) => {
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

const useServerCouponClients = () => {
  //Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outLoading, setOutLoading] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  //Paginate State
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);

  //Items States
  const [allClients, setAllClients] = useState<CouponClientInterface[]>([]);
  const [client, setClient] = useState<CouponClientInterface | null>(null);

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

  const getAllClientByCoupon = async (coupon: string | undefined) => {
    setOutLoading(true);

    await query
      .get(`/customer?coupons=${coupon}`)
      .then((resp) => {
        setAllClients(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));

    setOutLoading(false);
  };

  const getAllClients = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    await query
      .get(`/customer${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllClients(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));

    setOutLoading(false);
  };

  const getAllClientsForPage = async (
    page?: number | null,
    filter?: Record<string, string | number | null> | null
  ) => {
    const urlParams = filter ? generateParams(filter) : "";
    setIsLoading(true);
    await query
      .get(`/customer?page=${page ? page : 1}${urlParams}`)
      .then((resp) => {
        setAllClients(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const editCouponClient = async (
    id: number,
    data: Record<string, string | number | boolean>
  ) => {
    setIsFetching(true);
    await query
      .patch(`/customer/${id}`, data)
      .then((resp) => {
        setClient(resp.data);
        toast.success("Datos actualizados");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteCouponClient = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/customer/${id}`, {})
      .then(() => {
        setAllClients(allClients.filter((item) => item.id !== id));
        toast.success("Cliente eliminado con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };


  const getCouponClient= async(clientId:string)=>{
    setIsLoading(true)
    await query.get(`/customer/${clientId}`)
    .then(resp=>{
        setClient(resp.data)
    })
    .catch(e=>manageErrors(e));
    setIsLoading(false)

  }

  const exportCouponsClients = async (
    coupon: string | undefined,
    filename: string,
    callback?: Function
  ) => {
    setOutLoading(true);
    await query
      .get(`/customer?coupons=${coupon}`)
      .then((resp) => {
        // const productCost = (
        //   avCost: number,
        //   supplies: SuppliesInterface[],
        //   fixedCost: FixedCost[],
        //   type?: string
        // ) => {
        //   if (
        //     ["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(type ?? "") &&
        //     supplies.length !== 0
        //   ) {
        //     return (
        //       supplies.reduce(
        //         (total, value) =>
        //           total + value.quantity * value.supply.averageCost,
        //         0
        //       ) + fixedCost.reduce((total, item) => total + item.costAmount, 0)
        //     );
        //   } else {
        //     return avCost;
        //   }
        // };

        const CouponsClients: CouponClientInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        // eslint-disable-next-line array-callback-return
        CouponsClients.map((item) => {
          dataToExport.push({
            ID: item.id,
            "Fecha de Creacion": item.createdAt,
            Email: item.email,
            Tipo: item.phones[0].number,
            "Forma de Registro": item.registrationWay,
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  return {
    managePaginate,
    isLoading,
    isFetching,
    outLoading,
    paginate,
    allClients,
    client,
    setClient,
    exportCouponsClients,
    editCouponClient,
    deleteCouponClient,
    getCouponClient,

    getAllClients,
    getAllClientsForPage,
    getAllClientByCoupon,
  };
};

export default useServerCouponClients;
