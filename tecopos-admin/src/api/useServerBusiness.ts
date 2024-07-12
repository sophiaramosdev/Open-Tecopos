import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";

import { toast } from "react-toastify";
import query from "./APIServices";
import useServer from "./useServerMain";
import {
  CurrencyInterface,
  PaginateInterface,
  PaymentGatewayInterface,
  PriceSystem,
  Regions,
  ReservationPolicy,
} from "../interfaces/ServerInterfaces";
import { BasicType } from "../interfaces/InterfacesLocal";
import { updateBusiness } from "../store/slices/initSlice";
import { generateUrlParams } from "../utils/helpers";
// import { generateUrlParams, getElToqueDate } from "../utils/helpers";
// import { setElToqueRates } from "../store/slices/nomenclatorSlice";
import moment from "moment";
import axios, { AxiosResponse } from "axios";
import { Business, Tv } from "../interfaces/Interfaces";

export const useServerBusiness = () => {
  const { manageErrors } = useServer();
  const { business } = useAppSelector((state) => state.init);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allRegions, setAllRegions] = useState<Regions[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<CurrencyInterface[]>([]);
  const [allBusiness, setAllBusiness] = useState<Business[]>([]);
  const [allReservationsPolicy, setAllReservationsPolicy] = useState<
    ReservationPolicy[]
  >([]);
  const [allTVs, setAlTvs] = useState<Tv[]>([]);
  const [selectTv, setSelectTv] = useState<Tv | null>(null);

  const [allPayGateway, setAllPayGateway] = useState<PaymentGatewayInterface[]>(
    []
  );
  const [payGateway, setPayGateway] = useState<PaymentGatewayInterface | null>(
    null
  );

  const dispatch = useAppDispatch();

  const getAllBusiness = async (filter: Record<string, string>) => {
    setIsLoading(true);
    await query
      .get(`/control/business${generateUrlParams(filter)}`)
      .then((resp) => setAllBusiness(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const editBusiness = async (
    data: Record<string, string | number | boolean>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/business`, data)
      .then((resp) => {
        dispatch(updateBusiness(resp.data));
        toast.success("Datos actualizados con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editBusinesPlusConfig = async ({
    businessParams,
    configParams,
  }: {
    businessParams: Record<string, string | number | boolean>;
    configParams: Record<
      string,
      string | number | boolean | (string | number)[]
    >;
  }) => {
    const configs: { key: string; value: string | string[] }[] = Object.entries(
      configParams
    ).map((item) => ({
      key: item[0],
      value: Array.isArray(item[1]) ? item[1].join(",") : item[1].toString(),
    }));
    setIsFetching(true);
    await Promise.all([
      query.patch(`/administration/business`, businessParams),
      query.patch("/administration/configurations", { configs }),
    ]).then((resp) => {
      const currentConfigs = [...business!.configurationsKey];
      const configurationsKey: { key: string; value: string }[] = currentConfigs
        .filter(
          (item) =>
            !resp[1].data.find(
              (conf: { key: string; value: string }) => conf.key === item.key
            )
        )
        .concat([...resp[1].data]);
      dispatch(updateBusiness({ ...resp[0].data, configurationsKey }));
      toast.success("Cambios guardados con éxito");
    });
    setIsFetching(false);
  };

  const addPriceSystem = async (
    currentData: PriceSystem[],
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/pricesystem", data)
      .then((resp) => {
        const dataToSend = [
          ...currentData,
          { id: resp.data.id, name: resp.data.name, isMain: resp.data.isMain },
        ];
        dispatch(updateBusiness({ priceSystems: dataToSend }));
        toast.success("Sistema de precio agregado");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updatePriceSystem = async (
    id: number,
    currentData: PriceSystem[],
    data: Record<string, string>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/pricesystem/${id}`, data)
      .then((resp) => {
        const values = [...currentData];
        const index = values.findIndex((item) => item.id === id);
        values.splice(index, 1, resp.data);
        dispatch(updateBusiness({ priceSystems: values }));
        toast.success("Sistema de precio actualizado");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deletePriceSystem = async (
    id: number,
    currentData: PriceSystem[],
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/pricesystem/${id}`, {})
      .then((resp) => {
        dispatch(
          updateBusiness({
            priceSystems: currentData.filter((item) => item.id !== id),
          })
        );
        toast.success("Sistema de precio eliminado");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getCurrencies = async () => {
    setIsLoading(true);
    await query
      .get("/administration/currency")
      .then((resp) => {
        setAllCurrencies(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const updateCurrencies = async (
    id: number,
    data: Record<string, number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/currency/${id}`, data)
      .then((resp) => {
        const newData = [...allCurrencies];
        if (data.isMain) {
          const elem = newData.find((item) => item.isMain);
          if (elem) elem.isMain = false;
        }
        const index = allCurrencies.findIndex((item) => item.id === id);
        newData.splice(index, 1, { ...newData[index], ...resp.data });
        setAllCurrencies(newData);
        const adapterDateToRedux = newData.map((item) => ({
          ...item,
          code: item.currency.code,
        }));
        // if (data.isMain)
        dispatch(updateBusiness({ availableCurrencies: adapterDateToRedux }));
        toast.success("Moneda actualizada");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getAllRegions = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/shipping/region${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllRegions(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addRegion = async (data: BasicType, callback: Function) => {
    setIsFetching(true);
    await query
      .post("/shipping/region", data)
      .then((resp) => {
        setAllRegions([...allRegions, resp.data]);
        toast.success("Región añadida con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editRegion = async (
    id: number,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/shipping/region/${id}`, data)
      .then((resp) => {
        const newRegions = [...allRegions];
        const index = newRegions.findIndex((item) => item.id === id);
        newRegions.splice(index, 1, resp.data);
        setAllRegions(newRegions);
        toast.success("Región actualizada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteRegion = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query.deleteAPI(`/shipping/region/${id}`, {}).then(() => {
      const newRegions = [...allRegions];
      const index = newRegions.findIndex((item) => item.id === id);
      newRegions.splice(index, 1);
      setAllRegions(newRegions);
      toast.success("Región eliminada con éxito");
      callback();
    });
    setIsFetching(false);
  };

  const updateConfigs = async (
    data: Record<string, string | number | boolean | (string | number)[]>
  ) => {
    setIsFetching(true);

    const { minimun_amount_to_buy_with_delivery } = data;

    const configs: { key: string; value: string | string[] }[] = Object.entries(
      data
    ).map((item) => ({
      key: item[0],
      value: Array.isArray(item[1]) ? item[1].join(",") : item[1].toString(),
    }));

    if (!!minimun_amount_to_buy_with_delivery) {
      configs.forEach((config) => {
        if (config.key === "minimun_amount_to_buy_with_delivery") {
          config.value = JSON.stringify(minimun_amount_to_buy_with_delivery);
        }
      });

      // configs.push({
      //   key: "minimun_amount_to_buy_with_delivery",
      //   value: JSON.stringify(minimun_amount_to_buy_with_delivery),
      // });
    }

    await query
      .patch("/administration/configurations", { configs })
      .then((resp) => {
        const currentConfigs = [...business!.configurationsKey];
        const configurationsKey: { key: string; value: string }[] =
          currentConfigs
            .filter(
              (item) =>
                !resp.data.find(
                  (conf: { key: string; value: string }) =>
                    conf.key === item.key
                )
            )
            .concat([...resp.data]);
        dispatch(updateBusiness({ configurationsKey }));
        toast.success("Configuración guardada");
      })
      .catch((e) => manageErrors(e));

    setIsFetching(false);
  };

  const getAllPaymentGateways = async () => {
    setIsLoading(true);
    await query
      .get("/administration/paymentgateway")
      .then((resp) => {
        setAllPayGateway(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getPaymentGateway = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/paymentgateway/${id}`)
      .then((resp) => setPayGateway(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const updatePaymetGateway = async (
    id: number,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/paymentgateway/${id}`, data)
      .then((resp) => {
        const newValue = [...allPayGateway];
        const index = newValue.findIndex((item) => item.id === id);
        if (index !== -1) newValue.splice(index, 1, resp.data);
        setAllPayGateway(newValue);
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getElToqueRates = async () => {
    const date = moment().format("YYYY-MM-DD");
    const dateFrom = date + " 00:00:01";
    const dateTo = date + " 23:59:01";

    const headers: any = {
      Accept: "*/*",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTY5MzgwNTA2NSwianRpIjoiZmU1MjU4ZjgtNTFjYi00ZmJmLWJjOWQtNjE5NWY3M2JkOTg3IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjY0ZjU2YTA5NDVhZjllOGMxOTY5N2M3ZCIsIm5iZiI6MTY5MzgwNTA2NSwiZXhwIjoxNzI1MzQxMDY1fQ.ogPU75ykdNPK5FsLJluXH6RItKyOQ_lli3Dw45ASbVo",
    };

    setIsLoading(true);

    await axios
      .get(
        `https://tasas.eltoque.com/v1/trmi?date_from=${dateFrom}&date_to=${dateTo}`,
        {
          headers,
        }
      )
      .then((resp) => console.log(resp))
      .catch((e) => console.log(e));

    setIsLoading(false);
  };

  const TransformProductPrices = async (
    data: any,
    closeModalFunction?: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/product/transformprices", data)
      .then((resp) => {
        toast.success(`${resp.data.quantityModifies} cambios aplicados`);
        closeModalFunction!();
      })
      .catch((e) => {
        toast.error(
          "Ocurrió un error al cambiar los precios de los productos."
        );
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const ModifyProductPricesFromReference = async (
    data: any,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/product/pricesfromreference", data)
      .then((resp) => {
        toast.success(
          `Cambios aplicados en ${resp.data.quantityModifies} productos`
        );
        callback();
      })
      .catch((e) => {
        toast.error(
          "Ocurrió un error al cambiar los precios de los productos."
        );
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const getAllReservationPolicy = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/administration/reservation-policy/${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllReservationsPolicy(resp.data.items);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  const addNewReservationPolicy = async (
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/reservation-policy", data)
      .then((resp) => {
        setAllReservationsPolicy([resp.data, ...allReservationsPolicy]);
        callback();
        toast.success("Política creada con éxito");
      })
      .catch((e) => manageErrors(e))
      .finally(() => {
        setIsFetching(false);
      });
  };
  const updateSchedule = async (data: BasicType, callback: Function) => {
    setIsFetching(true);
    await query
      .post("/administration/schedule", data)
      .then((resp) => {
        const currentConfigs = [...business!.configurationsKey];
        const configurationsKey: { key: string; value: string }[] =
          currentConfigs
            .filter(
              (item) =>
                !resp.data.find(
                  (conf: { key: string; value: string }) =>
                    conf.key === item.key
                )
            )
            .concat([...resp.data]);
        dispatch(updateBusiness({ configurationsKey }));
        callback();
        toast.success("Horario guardado con éxito");
      })
      .catch((e) => manageErrors(e))
      .finally(() => {
        setIsFetching(false);
      });
  };
  const updateReservationPolicy = async (
    id: number | string,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/reservation-policy/${id}`, data)
      .then((resp) => {
        const newValue = allReservationsPolicy.map((item) => {
          if (item.id === resp.data.id) {
            return resp.data;
          }
          return item;
        });
        setAllReservationsPolicy(newValue);
        callback();
        toast.success("Política actualizada con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const deletedReservationPolicy = async (
    id: number | string,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/reservation-policy/${id}`, {})
      .then((resp) => {
        const newPolicy = [...allReservationsPolicy];
        const index = newPolicy.findIndex((item) => item.id === id);
        newPolicy.splice(index, 1);
        setAllReservationsPolicy(newPolicy);
        toast.success("Política borrada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  //Tvs controllers
  const getAllTvs = async (filter: Record<string, string>) => {
    setIsLoading(true);
    await query
      .get(`/tv/admin${generateUrlParams(filter)}`)
      .then((resp) => setAlTvs(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const newTv = async (data: BasicType, callback: Function): Promise<void> => {
    setIsFetching(true);
    await query
      .post("/tv/admin", data)
      .then((resp) => {
        setAlTvs([...allTVs, resp.data]);
        toast.success("Tv añadida con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const updateTv = async (
    data: BasicType,
    id: string | number,
    callback: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .patch(`/tv/admin/${id}`, data)
      .then((resp: AxiosResponse) => {
        const udpate = allTVs.map((item) => {
          if (resp.data.id === item.id) {
            return resp.data;
          }
          return item;
        });
        //setAlTvs(udpate);
        // setSelectTv(resp.data);
        toast.success("Tv editada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const newPage = async (
    data: BasicType,
    id: number | string,
    callback: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .post(`/tv/admin/${id}/pages`, data)
      .then((resp) => {
        const udpate = allTVs.map((item) => {
         
          return item;
        });
        setAlTvs(udpate);
        toast.success("Pagina añadida con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updatePage = async (
    data: BasicType,
    id: number | string,
    callback: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .patch(`/tv/admin/pages/${id}`, data)
      .then((resp) => {
        // const udpate = selectTv?.pages.map((item) => {
        //   if (resp.data.id === item.id) {
        //     return resp.data;
        //   }
        //   return item;
        // });
        // const updateTv = {
        //   ...selectTv,
        //   pages: udpate,
        // } as Tv;
        // setSelectTv(updateTv);
        toast.success("Pagina editada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deletedPage = async (
    id: number | string,
    callback: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .deleteAPI(`/tv/admin/pages/${id}`, {})
      .then((resp) => {
        const udpate = allTVs.map((item) => {
          if (resp.data.id === item.id) {
            return resp.data;
          }
          return item;
        });
        setAlTvs(udpate);
        toast.success("Pagina borrada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const getTv = async (
    id: number | string,
    callback: Function
  ): Promise<void> => {
    setIsFetching(true);
    await query
      .get(`/tv/admin/${id}`)
      .then((resp) => {
        setSelectTv(resp.data);
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const deletedTv = async (id: number | string, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/tv/admin/${id}`, {})
      .then((resp) => {
        const udpate = allTVs.filter((item) => item.id !== id);
        setAlTvs(udpate);
        toast.success("Tv borrada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  return {
    isFetching,
    isLoading,
    paginate,
    allRegions,
    allCurrencies,
    allPayGateway,
    payGateway,
    allBusiness,
    getAllBusiness,
    addPriceSystem,
    deletePriceSystem,
    updatePriceSystem,

    editBusiness,
    editBusinesPlusConfig,
    updateCurrencies,
    getAllRegions,
    addRegion,
    editRegion,
    deleteRegion,
    getCurrencies,
    updateConfigs,
    getAllPaymentGateways,
    getPaymentGateway,
    updatePaymetGatway: updatePaymetGateway,
    getElToqueRates,
    TransformProductPrices,
    ModifyProductPricesFromReference,
    getAllReservationPolicy,
    addNewReservationPolicy,
    updateReservationPolicy,
    deletedReservationPolicy,
    allReservationsPolicy,
    updateSchedule,
    getAllTvs,
    allTVs,
    newTv,
    selectTv,
    getTv,
    deletedTv,
    newPage,
    updatePage,
    deletedPage,
    updateTv,
  };
};

export default useServerBusiness;
