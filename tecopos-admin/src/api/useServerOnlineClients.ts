/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import query from "./APIServices";
import {
  ClientInterface,
  OnlineClientInterface,
  OrderInterface,
  PaginateInterface,
} from "../interfaces/ServerInterfaces";
import useServer from "./useServerMain";
import { exportExcel, generateUrlParams } from "../utils/helpers";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";

export const useServerOnlineClients = () => {
  const { manageErrors } = useServer();
  const [paginate, setPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });
  const [paginateCategories, setPaginateCategories] =
    useState<PaginateInterface>({
      currentPage: 0,
      totalItems: 0,
      totalPages: 0,
    });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isGetClient, setGetClient] = useState(false);
  const [allClients, setAllClients] = useState<OnlineClientInterface[]>([]);
  //todo : tipar
  const [allCategories, setAllCategories] = useState<any>([]);
  const [client, setClient] = useState<OnlineClientInterface | null>(null);
  const [clientOrders, setClientOrders] = useState<OrderInterface[]>([]);
  let helperArray: number[] = [];

  const getAllClients = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/customer/${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllClients(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  const getAllCustomerCategories = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/customer/categories/customer${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllCategories(resp.data.items);
        setPaginateCategories({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addClient = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/customer", data)
      .then((resp) => {
        setAllClients([resp.data, ...allClients]);
        setPaginate({
          ...paginate,
          totalItems: paginate?.totalItems + 1 ?? 0,
        });
        helperArray.push(resp.data.id);
        callback(resp.data);
        toast.success("Cliente agregado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  const addCustomerCategory = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/customer/categories/customer", data)
      .then((resp) => {
        setAllCategories([resp.data, ...allCategories]);
        setPaginateCategories({
          ...paginateCategories,
          totalItems: paginateCategories?.totalItems + 1 ?? 0,
        });
        callback();
        toast.success("Categoría agregado correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editClient = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callBack?: Function
  ) => {
    setIsEdit(true);
    await query
      .patch(`/customer/${id}`, data)
      .then((resp) => {
        setClient(resp.data);
        const newAllClients = allClients.map((element) => {
          if (element.id === client?.id) {
            return resp.data;
          } else {
            return element;
          }
        });
        setAllClients(newAllClients);
        setClient(resp.data);
        callBack && callBack(resp.data);
        toast.success("Datos actualizados");
      })
      .catch((e) => manageErrors(e));
      setIsEdit(false);
  };
  const editCategoryClient = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/customer/categories/customer/${id}`, data)
      .then((resp) => {
        const newCategoryClient = allCategories.map((element: any) => {
          if (element.id === resp.data?.id) {
            return resp.data;
          } else {
            return element;
          }
        });
        setAllCategories(newCategoryClient);
        toast.success("Datos actualizados");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteClient = async (id: number, callback: Function) => {
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
  const deleteClientCategory = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/customer/categories/customer/${id}`, {})
      .then(() => {
        setAllCategories(allCategories.filter((item: any) => item.id !== id));
        setPaginateCategories({
          ...paginateCategories,
          totalItems: paginateCategories?.totalItems - 1 ?? 0,
        });
        toast.success("Categoría eliminado con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getClient = async (clientId: string | number) => {
    setGetClient(true);
    await query
      .get(`/customer/${clientId}`)
      .then((resp) => {
        setClient(resp.data);
      })
      .catch((e) => manageErrors(e));
      setGetClient(false);
  };

  const getMainClientInfo = async (
    clientId: string | number,
    filter: BasicType,
    setOrderState: Function
  ) => {
    const queries = [
      query.get(`/sales/order${generateUrlParams({ clientId, ...filter })}`),
    ];
    if (!client) queries.push(query.get(`/customer/${clientId}`));
    setIsFetching(true);
    await Promise.all(queries)
      .then((resp) => {
        setOrderState(resp[0].data.items);
        setPaginate({
          totalItems: resp[0].data.totalItems,
          totalPages: resp[0].data.totalPages,
          currentPage: resp[0].data.currentPage,
        });
        if (!client) setClient(resp[1].data);
      })
      .catch((e) => manageErrors(e));
      setIsFetching(false);
  };

  const exportClients = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(`/customer${generateUrlParams({ ...filter, all_data: true })}`)

      .then((resp) => {
        const Products: ClientInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        Products.map((item) => {
          dataToExport.push({
            Nombre: `${
              (item.firstName ?? "") || (item.lastName ?? "")
                ? (item.firstName ?? "") + (item.lastName ?? "")
                : item.email
            }`,
            Dirección: ` ${item?.address?.street ?? ""} ${
              item?.address?.locality ?? ""
            } ${item?.address?.municipality?.name ?? ""}`,
            Teléfono: item?.phones[0]?.number,
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  return {
    isLoading,
    isFetching,
    isEdit,
    isGetClient,
    allClients,
    paginate,
    client,
    clientOrders,
    getMainClientInfo,
    getAllClients,
    getClient,
    addClient,
    editClient,
    deleteClient,
    exportClients,
    helperArray,
    getAllCustomerCategories,
    allCategories,
    paginateCategories,
    addCustomerCategory,
    editCategoryClient,
    deleteClientCategory,
  };
};

export default useServerOnlineClients;
