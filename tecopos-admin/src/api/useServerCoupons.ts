import { useState } from "react";

import {
  CouponInterface,
  CustomerSumarizeOrder,
  PaginateInterface,
} from "../interfaces/ServerInterfaces";

import query from "./APIServices";
import { setCoupon as setCouponState } from "../store/couponSlice";
import { useAppDispatch } from "../store/hooks";
import { toast } from "react-toastify";
import { exportExcel, generateUrlParams } from "../utils/helpers";

import useServer from "./useServerMain";
import { BasicType } from "../interfaces/InterfacesLocal";
import { formatDateTime } from "../utils/functions";

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

export const useServerCoupon = () => {

  //Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outLoading, setOutLoading] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //Paginate State
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);

  //Items States
  const [allCoupons, setAllCoupons] = useState<CouponInterface[]>([]);
  const [coupon, setCoupon] = useState<CouponInterface | null>(null);
  const [customerSumarizeOrders, setCustomerSumarizeOrders] = useState<
    CustomerSumarizeOrder[]
  >([]);

  const { manageErrors } = useServer();
  const dispatch = useAppDispatch();

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

  const updAllCouponState = (
    opp: "del" | "add",
    { coupon, id }: { coupon?: CouponInterface; id?: number | null }
  ) => {
    if (opp === "add") {
      coupon &&
        (managePaginate("add")
          ? setAllCoupons([
              coupon,
              ...allCoupons.filter((item, idx) => idx !== 34),
            ])
          : setAllCoupons([coupon, ...allCoupons]));
    } else {
      id && setAllCoupons(allCoupons.filter((item) => item.id !== id));
      managePaginate("del");
    }
  };

  const addCoupon = async (
    body: Record<string, string | number>,
    closeModal: Function
  ) => {
    let data: Record<string, any> = body;

    setIsFetching(true);
    await query
      .post("/administration/marketing/coupon", data)
      .then((resp) => {
        updAllCouponState("add", { coupon: resp.data });
        toast.success("Coupon agregado con éxito");
        closeModal();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteCoupon = async (id: number | null,  updateState?:Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/marketing/coupon/${id}`, {})
      .then(() => {
        updateState && updateState(id);
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const updateCoupon = async (
    id: number,
    data: Record<string, string | number | boolean>,
    updateState?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/marketing/coupon/${id}`, data)
      .then((resp) => {
        const updated = allCoupons;
        updated.splice(
          allCoupons.findIndex((item) => item.id === resp.data.id),
          1,
          resp.data
        );
        setAllCoupons(updated);
        setCoupon({ ...coupon, ...resp.data });
        updateState && updateState(id, resp.data);
        toast.success("Cupón actualizado con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const newCoupon = async (
    body: Record<string, string | number | boolean>,
    callback: any
  ) => {
    setIsLoading(true);
    //Create coupon
    query
      .post(`/administration/marketing/coupon`, body)
      .then(async (resp) => {
        setIsLoading(false);
        toast.success("Cupón agregado con éxito");
        setAllCoupons([resp.data, ...allCoupons]);
        callback();
      })
      .catch((error) => manageErrors(error));
  };

  const getAllCoupons = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    await query
      .get(`/administration/marketing/coupon${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllCoupons(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getAllCouponsForPage = async (
    page?: number | null,
    filter?: Record<string, string | number | null> | null
  ) => {
    const urlParams = filter ? generateParams(filter) : "";
    setIsLoading(true);
    await query
      .get(
        `/administration/marketing/coupon?page=${page ? page : 1}${urlParams}`
      )
      .then((resp) => {
        setAllCoupons(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getCoupon = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/marketing/coupon/${id}`)
      .then((resp) => {
        dispatch(setCouponState(resp.data));
        setCoupon(resp.data);
      })
      .catch((e) =>
        setError(e.message.data ?? "Ha ocurrido un error vuelva a intentarlo")
      );
    setIsLoading(false);
  };

  const exportCoupons = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setOutLoading(true);
    await query
      .get(`/administration/marketing/coupon${generateUrlParams(filter)}`)

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

        const Coupons: CouponInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        Coupons.map((item) => {
          dataToExport.push({
            Codigo: item.code && item.code,
            "Tipo de Descuento": item.discountType && item.discountType,
            Importe: item.amount && item.amount,
            "Fecha de Caducidad": formatDateTime(item.expirationAt),
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getCustomerSumarizeOrder = async (code:string, filter: BasicType) => {
    if (
      Object.values(filter).length === 1 &&
      customerSumarizeOrders.length !== 0
    ) {
      setCustomerSumarizeOrders([]);
    } else {
      setIsFetching(true);
      await query
        .get(`/report/summarize/customer/${code}${generateUrlParams(filter)}`)
        .then((resp) => {
          setCustomerSumarizeOrders(resp.data);
        })
        .catch((e) => manageErrors(e));
      setIsFetching(false);
    }
  };

  const updateCouponsState = (id: number, data?: CouponInterface) => {
    const couponList = [...allCoupons];
    const idx = couponList.findIndex((item) => item.id === id)!;
    !!data ? couponList.splice(idx, 1, data) : couponList.splice(idx, 1);
    setAllCoupons(couponList);
  };

  return {
    managePaginate,
    isLoading,
    isFetching,
    outLoading,
    paginate,
    error,
    allCoupons,
    coupon,
    customerSumarizeOrders,
    getAllCouponsForPage,
    getCoupon,
    getAllCoupons,
    exportCoupons,
    newCoupon,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    getCustomerSumarizeOrder,
    updateCouponsState,
  };
};

export default useServerCoupon;
