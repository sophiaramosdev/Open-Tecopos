import { useState } from "react";
import query from "./APIServices";
import {
  ClientInterface,
  OrderInterface,
  PaginateInterface,
} from "../interfaces/ServerInterfaces";
import useServer from "./useServerMain";
import { exportExcel, generateUrlParams } from "../utils/helpers";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";

export const useServerClients = () => {
  const { manageErrors } = useServer();
  const [paginate, setPaginate] = useState<PaginateInterface >({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [allClients, setAllClients] = useState<ClientInterface[]>([]);
  const [client, setClient] = useState<ClientInterface|null>(null)
  const [clientOrders, setClientOrders] = useState<OrderInterface[]>([])

  const getAllClients = async (filter:Record<string, string|number|boolean | null>) => {
    setIsLoading(true);
    await query
      .get(`/client-shipping/client/${generateUrlParams(filter)}`)
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

  const addClient = async(data:Record<string, string|number|boolean>, callback:Function) =>{
    setIsFetching(true);
    await query.post("/client-shipping/client",data )
    .then(resp=>{
      setAllClients([resp.data,...allClients]);
      setPaginate({
        ...paginate,
        totalItems:paginate?.totalItems+1 ?? 0
      });
      callback();
    toast.success("Cliente agregado")
    })
    .catch(e=>manageErrors(e));
    setIsFetching(false)
  }

  const editClient = async(id:number, data:Record<string, string|number| boolean>) =>{
    setIsFetching(true)
    await query.patch(`/client-shipping/client/${id}`, data)
    .then(resp=>{
      setClient(resp.data);
      toast.success("Datos actualizados")
    })
    .catch(e=>manageErrors(e))
    setIsFetching(false)
  }

  const deleteClient = async(id:number, callback:Function) =>{
    setIsFetching(true);
    await query.deleteAPI(`/client-shipping/client/${id}`,{})
    .then(()=>{
      setAllClients(allClients.filter(item=>item.id!==id));
      toast.success("Cliente eliminado con éxito")
      callback();
    })
    .catch(e=>manageErrors(e))
    setIsFetching(false)

  }

  const getClient= async(clientId:string)=>{
    setIsLoading(true)
    await query.get(`/client-shipping/client/${clientId}`)
    .then(resp=>setClient(resp.data))
    .catch(e=>manageErrors(e));
    setIsLoading(false)

  }

  const getMainClientInfo = async(clientId:string, filter:BasicType) =>{
    const queries = [query.get(`/sales/order${generateUrlParams({clientId, ...filter})}`)]
    if(!client) queries.push(query.get(`/client-shipping/client/${clientId}`))
    setIsLoading(true);
    await Promise.all(queries)
    .then(resp=>{
      setClientOrders(resp[0].data.items);
      setPaginate({
        totalItems: resp[0].data.totalItems,
        totalPages: resp[0].data.totalPages,
        currentPage: resp[0].data.currentPage,
      });
      if(!client) setClient(resp[1].data)
    })
    .catch(e=>manageErrors(e));
    setIsLoading(false)
  }

  const exportClients = async (
    filter: BasicType,
    filename: string,
    callback?: Function

  ) => {
    setIsLoading(true);
    await query
      .get(`/client-shipping/client${generateUrlParams({...filter, all_data:true})}`)

      .then((resp) => {

        const Products: ClientInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        // eslint-disable-next-line array-callback-return
        Products.map((item) => {

          dataToExport.push({
            Nombre: item.name,
            Dirección: ` ${item?.address?.street ?? ""} ${
              item?.address?.locality ?? ""
            } ${item?.address?.municipality?.name ?? ""}`,
            Teléfono: item?.phones[0]?.number,
          })
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
    exportClients
  };
};

export default useServerClients;
