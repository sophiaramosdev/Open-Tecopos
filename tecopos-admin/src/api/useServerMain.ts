import { useState } from "react";
import {
  BillingInterface,
  DocumentInterface,
  LocationNomenclator,
  MunicipalityNomenclator,
  PaginateInterface,
  PriceInvoiceInterface,
  RoleCode,
} from "../interfaces/ServerInterfaces";
import query from "./APIServices";
import mediaQuery from "./APIMediaServer";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toast } from "react-toastify";
import { generateUrlParams, mathOperation } from '../utils/helpers';
import { setKeys } from "../store/slices/sessionSlice";
import { useNavigate } from "react-router-dom";
import { updateSpecificElementBussiness } from "../store/slices/initSlice";
import { SendConfigUpdate } from "../interfaces/Interfaces";
import { closeSystem } from "../store/actions/globals";
import { BasicType } from "../interfaces/InterfacesLocal";
import { roundToTwoDecimal, roundToTwoDecimalDow } from "../utils/functions";
import axios from "axios";
import {
  addFixedCosts,
  updateFixedCosts,
  updateFixedCostsAfterDelete,
} from "../store/slices/nomenclatorSlice";

export interface CommonGraphDataInterface {
  axisLabel: string[];
  totalSales: number[];
  totalCost: number[];
  grossProfit: number[];
}

export interface ImageLoad {
  id: number;
  src: string;
  hash: string;
}

export interface DocumentLoad {
  id: number;
  src: string;
}

export const useServer = () => {
   const { key } = useAppSelector((state) => state.session);
  const { business, user } = useAppSelector((state) => state.init);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [imgPreview, setImgPreview] = useState<ImageLoad[]>([]);
  const [docPreview, setDocPreview] = useState<DocumentLoad | null>(null);
  const [allInvoices, setAllInvoices] = useState<BillingInterface[]>([]);
  const [invoice, setInvoice] = useState<BillingInterface | null>(null);
  const [countries, setCountries] = useState<LocationNomenclator[]>([]);
  const [provinces, setProvinces] = useState<LocationNomenclator[]>([]);
  const [municipality, setMunicipality] = useState<MunicipalityNomenclator[]>(
    []
  );
  const [progress, setProgress] = useState<number | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const manageErrors = (error: any) => {
    console.log(error);
    if (error.status === 401 || error.status === 403) {
      toast.error(error.response?.data?.message);
      return;
    }
    if (error.response?.data?.message) {
      toast.error(error.response?.data?.message);
      return;
    } else {
      toast.error(
        "Upss, ha ocurrido un error inesperado. \n Intente de nuevo o consulte con su administrador..."
      );
      return;
    }
  };

  const logIn = async (data: Record<string, string | number | boolean>) => {
    setIsFetching(true);
    await query
      .post("/security/login", data)
      .then((resp) => {
        dispatch(setKeys(resp.data));
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const logOut = async () => {
    setIsFetching(true);
    await query
      .post("/security/logout", {})
      .then((data) => {
        if (data.status === 204) {
          dispatch(closeSystem(null));
          navigate("/");
        }
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getMostSelledCategories = async () => {
    setIsLoading(true);
    await query
      .get(
        "/report/incomes/most-selled-categories?dateFrom=2022-01-01&dateTo=2023-03-27"
      )
      .then((resp) => {})
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const uploadImg = async (data: FormData, multiple: boolean = false) => {
    setIsFetching(true);
    await mediaQuery
      .post("/files", data)
      .then((resp) => {
        if (multiple) {
          setImgPreview([
            ...imgPreview,
            ...resp.data.map((item: any) => ({
              id: item.id,
              src: item.src,
              hash: item.blurHash,
            })),
          ]);
        } else {
          setImgPreview([
            {
              id: resp.data[0].id,
              src: resp.data[0].src,
              hash: resp.data[0].blurHash,
            },
          ]);
        }
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const uploadDoc = async (data: FormData, callback?:(doc:DocumentInterface)=>void) => {
    setIsFetching(true);
    await axios
      .post(
        `${process.env.REACT_APP_API_HOST}${
          process.env.REACT_APP_VERSION_API
        }${"/files/docs"}`,
        data,
        {
          headers: {
            "X-App-Origin": "Tecopos-Admin",
            Authorization: `Bearer ${key?.token}`,
          },
          onUploadProgress: (progress) => {
            const total = progress.total;
            const loaded = progress.loaded;
            const percent = Number((loaded / total).toFixed(2)) * 100;
            if (percent === 100) {
              setProgress(null);
            } else {
              setProgress(percent);
            }
          },
        }
      )
      .then((resp) => {
        callback && callback(resp.data)
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateImgLocal = (data: ImageLoad[]) => {
    setImgPreview(data);
  };

  const editUser = async (
    data: Record<string, string | number>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query.patch("/security/user", data).then((resp) => {
      toast.success("Configuración guardada");
      closeModal();
      //dispatch(setUser(resp.data));
    });
    setIsFetching(false);
  };

  const getAllInvoices = async () => {
    setIsLoading(true);
    await query
      .get("/administration/billing/invoice")
      .then((resp) => {
        setAllInvoices(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getInvoice = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/billing/invoice/${id}`)
      .then((resp) => setInvoice(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  //---- CONFIGURACIONES-----
  const EditBussinesAdjustment = async (data: Partial<SendConfigUpdate>) => {
    setIsFetching(true);

    await query
      .patch(`/administration/configurations`, data)

      .then((resp) => {
        dispatch(updateSpecificElementBussiness(resp.data));
        toast.success("Configuración guardada exitosamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const EditMySensibleConfigurations = async (
    data: Partial<SendConfigUpdate>
  ) => {
    setIsLoading(true);
    setIsFetching(true);

    await query
      .patch(`/administration/configurations/sensible`, data)

      .then((resp) => {
        dispatch(updateSpecificElementBussiness(resp.data));
        toast.success("Configuración guardada exitosamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const GetMySensibleConfigs = async () => {
    setIsFetching(true);
    await query
      .get(`/administration/configurations`)

      .then((resp) => {
        dispatch(updateSpecificElementBussiness(resp.data));
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getCountries = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/public/countries${generateUrlParams(filter)}`)
      .then((resp) => setCountries(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getProvinces = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/public/provinces${generateUrlParams(filter)}`)
      .then((resp) => setProvinces(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getMunicipality = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/public/municipalities${generateUrlParams(filter)}`)
      .then((resp) => setMunicipality(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getCurrencyRate = (code: string) => {
    const currency = business?.availableCurrencies.find(
      (item) => item.code === code
    );
    return currency?.exchangeRate || 1;
  };

  const calculatePaymentDiff = (
    totalToPay: PriceInvoiceInterface[] = [],
    payments: PriceInvoiceInterface[] = []
  ) => {
    let paymentState: (PriceInvoiceInterface & { diff: number })[] =
      totalToPay.map((item) => ({ ...item, diff: item.amount }));
    let remain = 0;
    //match same currencies ------------------
    payments.forEach((payment) => {
      const idx = paymentState.findIndex(
        (toPay) => toPay.codeCurrency === payment.codeCurrency
      );
      if (idx !== -1) {
        const matchCurrency = paymentState[idx];
        //Fixed temp redondeo 
         const diff = roundToTwoDecimalDow(payment.amount - matchCurrency.diff);
        //const diff = mathOperation(payment.amount, matchCurrency.diff, "subtraction");
        if (diff > 0) {
          matchCurrency.diff = 0;
          const sum = roundToTwoDecimalDow(mathOperation(diff, getCurrencyRate(payment.codeCurrency), "multiplication", 2));
          remain = mathOperation(remain, sum, "addition");

          //remain += diff * getCurrencyRate(matchCurrency.codeCurrency);
        } else {
          matchCurrency.diff = Math.abs(diff);
        }
        paymentState.splice(idx, 1, matchCurrency);
      } else {
        const sum = mathOperation(payment.amount, getCurrencyRate(payment.codeCurrency), "multiplication");
        remain = mathOperation(remain, sum, "addition");
        //remain += payment.amount * getCurrencyRate(payment.codeCurrency);
      }
    });
    //------------------------------------------------------------

    //complete with remain (first not main currencies) ------------------------
    while (remain > 0) {
      //find non zero & not null differences & not mainCurrency -------------------------
      const idx = paymentState.findIndex(
        (item) =>
          ![0, null].includes(item.diff) &&
          item.codeCurrency !== business?.mainCurrency
      );
      if (idx !== -1) {
        const notMainOrNull = paymentState[idx];
        const remainConverted =
          remain / getCurrencyRate(notMainOrNull.codeCurrency);
        const diff = remainConverted - notMainOrNull.diff!;
        if (diff > 0) {
          notMainOrNull.diff = 0;
          remain = diff * getCurrencyRate(notMainOrNull.codeCurrency);
          totalToPay.splice(idx, 1, notMainOrNull);
        } else {
          remain = 0;
          notMainOrNull.diff = Math.abs(diff);
          totalToPay.splice(idx, 1, notMainOrNull);
          break;
        }
      }

      //-------------------------------------------------------------------

      //find null difference & notMainCurrency ----------------------------------------------
      const diffIsNull = paymentState.find(
        (item) =>
          item.diff === null && item.codeCurrency !== business?.mainCurrency
      );
      if (diffIsNull) {
        const remainConverted =
          remain / getCurrencyRate(diffIsNull.codeCurrency);
        const diff = remainConverted - diffIsNull.amount;
        if (diff > 0) {
          diffIsNull.diff = 0;
          remain = diff * getCurrencyRate(diffIsNull.codeCurrency);
        } else {
          remain = 0;
          diffIsNull.diff = Math.abs(diff);
          break;
        }
      }

      //-------------------------------------------------------------------------------------

      //find mainCurrency ------------------------------------------------------------------
      const mainCurrency = paymentState.find(
        (item) =>
          item.codeCurrency === business?.mainCurrency && item.diff !== 0
      );
      if (mainCurrency) {
        const remainConverted =
          remain / getCurrencyRate(mainCurrency.codeCurrency);
        const diff =
          remainConverted - (mainCurrency.diff ?? mainCurrency.amount);
        if (diff > 0) {
          mainCurrency.diff = 0;
          remain = diff * getCurrencyRate(mainCurrency.codeCurrency);
        } else {
          remain = 0;
          mainCurrency.diff = Math.abs(diff);
          break;
        }
      } else {
        break;
      }
      //-----------------------------------------------------------------------------------
    }
    //--------------------------------------------------------------------------
    //Complete null diff with amount---------------------------------------------
    paymentState = paymentState.map((item) =>
      item.diff === null ? { ...item, diff: item.amount } : item
    );
    //---------------------------------------------------------------------------
    return remain !== 0
      ? [
          {
            amount: roundToTwoDecimal(remain),
            codeCurrency: business?.mainCurrency,
          },
        ]
      : paymentState
          .filter((item) => item.diff !== 0)
          .map((itm) => ({
            amount: -roundToTwoDecimal(itm.diff!),
            codeCurrency: itm.codeCurrency,
          }));
  };

  const addFixedCostCategory = async (
    data: Record<string, any>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/fixedcostcategory", data)
      .then((resp) => {
        dispatch(addFixedCosts(resp.data));
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateFixedCostCategory = async (
    id: number,
    data: Record<string, any>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/fixedcostcategory/${id}`, data)
      .then((resp) => {
        dispatch(updateFixedCosts(resp.data));
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteFixedCostCategory = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/fixedcostcategory/${id}`, {})
      .then(() => {
        dispatch(updateFixedCostsAfterDelete(id));
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const allowRoles: (allowedRoles: RoleCode[], strict?: boolean) => boolean = (
    allowedRoles,
    strict = false
  ) => {
    const userRoles: RoleCode[] = user?.roles.map((item) => item.code) ?? [];
    if (strict) {
      return userRoles.some((role) => allowedRoles.includes(role));
    }
    return userRoles.some((role) =>
      ["OWNER", ...allowedRoles].includes(role)
    );
  };

  return {
    paginate,
    logIn,
    logOut,
    imgPreview,
    isLoading,
    isFetching,
    allInvoices,
    invoice,
    uploadImg,
    editUser,
    manageErrors,
    getMostSelledCategories,
    getAllInvoices,
    getInvoice,
    updateImgLocal,
    EditBussinesAdjustment,
    EditMySensibleConfigurations,
    GetMySensibleConfigs,
    countries,
    getCountries,
    provinces,
    getProvinces,
    municipality,
    getMunicipality,
    calculatePaymentDiff,
    uploadDoc,
    docPreview,
    progress,
    addFixedCostCategory,
    updateFixedCostCategory,
    deleteFixedCostCategory,
    allowRoles
  };
};

export default useServer;
