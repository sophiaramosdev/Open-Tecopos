import { useState } from "react";
import {
  BusinessInterface,
  IncomeInterface,
  NewBusinessFields,
  PaginateInterface,
  ReportsInterface,
  SendConfigUpdate,
} from "../interfaces/ServerInterfaces";
import query from "../api/APIServices";
import { generateUrlParams } from "../utils/helpers";
import useServer from "../api/useServer";
import { Flip, toast } from "react-toastify";
import { useAppDispatch } from "../store/hooks";
import { setConfigurationKey } from "../store/slices/configurationsKeySlice";
import { useNavigate } from "react-router-dom";
import { BasicType } from "../interfaces/LocalInterfaces";
import { setDefaultBussiness } from "../store/slices/nomenclatorSlice";

const useServerBusiness = () => {
  const navigate = useNavigate();
  const { manageErrors } = useServer();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allBusiness, setAllBusiness] = useState<BusinessInterface[]>([]);
  const [business, setBusiness] = useState<BusinessInterface | null>(null);
  const [reports, setReports] = useState<ReportsInterface | null>(null);
  const [incomes, setIncomes] = useState<IncomeInterface[] | null>(null);
  const dispatch = useAppDispatch();

  const getAllBusiness = async (
    filter: BasicType
  ) => {
    setIsLoading(true);
    await query
      .get(`/control/business${generateUrlParams(filter)}`)
      .then((resp) => {
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
        setAllBusiness(resp.data.items);
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  const getAllBusinessSearchHijos = async (
    filter: Record<string, string | number | boolean>,
    ids: Array<Number> | undefined
  ) => {
    setIsLoading(true);
    let list: BusinessInterface[] = [];
    let found: BusinessInterface[] = [];
    list = await query
      .get(`/control/business${generateUrlParams(filter)}`)
      .then((resp) => {
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
        return resp.data.items;
      })
      .catch((error) => manageErrors(error));
    list.map((item: any) => {
      const foundBranch = ids?.findIndex((p) => p === item.id);

      if (foundBranch === -1) {
        // @ts-ignore
        found.push(item);
      }
    });
    return found;
  };

  const getBusiness = async (id: string | undefined, deffault?: boolean) => {
    if (id === undefined) return;
    setIsLoading(true);
    if (!id) {
      console.error('ID is undefined');
      return; 
     }
    await query
      .get(`/control/business/${id}`)
      .then((resp) => {
        if (deffault) {
          dispatch(setDefaultBussiness(resp.data));
        } else {
          setBusiness(resp.data);
          dispatch(setConfigurationKey(resp.data.configurationsKey));
        }
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  const addBusiness = async (data: NewBusinessFields, closeModal: Function) => {
    setIsFetching(true);
    await query
      .post("/control/business", data)
      .then((resp) => {
        setAllBusiness([resp.data, ...allBusiness]);
        toast.success("Negocio insertado con éxito");
        closeModal(false);
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const updateBusiness = async (
    id: string | undefined,
    data: Partial<BusinessInterface>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/control/business/${id}`, data)
      .then((resp) => {
        setBusiness(resp.data);
        setIsFetching(false);
        toast.success("Actualización exitosa");
        closeModal && closeModal(false);
      })
      .catch((error) => {
        manageErrors(error);
        closeModal(true);
      });
    setIsFetching(false);
  };

  const updateConfigBusiness = (
    id: string | undefined,
    data: SendConfigUpdate,
    closeModal?: Function
  ) => {
    setIsFetching(true);
    query
      .patch(`/control/configurations/${id}`, data)
      .then(async (resp) => {
        setBusiness(resp.data);
        setIsFetching(false);
        toast.success("Actualización exitosa", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        await getBusiness(id);

        closeModal && closeModal(false);
        setIsFetching(false);
      })
      .catch((error) => {
        let errorMsg = "";
        if (error.response?.data?.message) {
          errorMsg = error.response?.data?.message;
        } else {
          errorMsg = "Ha ocurrido un error. Contacte al administrador";
        }
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Flip,
        });
        setIsFetching(false);
      });
  };

  const deleteBusiness = async (id: any, closeModal: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/control/business/${id}`, {})
      .then(() => {
        toast.success("Negocio Eliminado con éxito", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Flip,
        });
        closeModal(false);
      })
      .catch((error) => {
        let errorMsg = "";
        if (error.response?.data?.message) {
          errorMsg = error.response?.data?.message;
        } else {
          errorMsg = "Ha ocurrido un error. Contacte al administrador";
        }
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Flip,
        });
      });
    setIsFetching(false);
    navigate("/business");
  };

  const getBusinessResume = async (id: string) => {
    setIsLoading(true);
    await Promise.all([
      query.get(`/control/reports/general/${id}`).then((resp) => resp.data),
      query.get(`/report/incomes/last-7-days/${id}`).then((resp) => resp.data),
    ])
      .then((values) => {
        setReports(values[0]);
        const incomes: IncomeInterface[] = values[1].map(
          (item: IncomeInterface) => {
            let day;
            switch (item.day) {
              case "sunday":
                day = "Domingo";
                break;
              case "monday":
                day = "Lunes";
                break;
              case "tuesday":
                day = "Martes";
                break;
              case "wednesday":
                day = "Miércoles";
                break;
              case "thursday":
                day = "Jueves";
                break;
              case "friday":
                day = "Viernes";
                break;
              case "saturday":
                day = "Sábado";
                break;
            }
            return { ...item, day };
          }
        );
        setIncomes(incomes);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getRegisteredBusiness = async (mode: string) => {
    setIsLoading(true);
    try {
      const registeredBusiness = await query.get(
        `/control/reports/business-registration/${mode}?orderBy=createdAt&order=ASC`
      );
      setReports(registeredBusiness.data);
    } catch (e) {
      manageErrors(e);
    }
    setIsLoading(false);
  };

  const checkField = async (field: string, data: string) => {
    return query
      .post(`/control/check/${field}`, { [field]: data })
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
  };

  return {
    isLoading,
    isFetching,
    paginate,
    business,
    allBusiness,
    reports,
    incomes,
    getBusiness,
    getAllBusiness,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    getBusinessResume,
    getRegisteredBusiness,
    checkField,
    getAllBusinessSearchHijos,
    updateConfigBusiness,
  };
};

export default useServerBusiness;
