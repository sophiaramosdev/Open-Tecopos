/* eslint-disable array-callback-return */
import { useState } from "react";
import query from "./APIServices";
import {
  Movement,
  PaginateInterface,
  SupplierInterfaces,
} from "../interfaces/ServerInterfaces";
import useServer from "./useServerMain";
import {
  address_complete,
  exportExcel,
  generateUrlParams,
} from "../utils/helpers";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";

export const useServerSupplier = () => {
  const { manageErrors } = useServer();

  const [paginate, setPaginate] = useState<PaginateInterface>({
    currentPage: 0,
    totalItems: 0,
    totalPages: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<SupplierInterfaces[]>([]);
  const [supplier, setSupplier] = useState<SupplierInterfaces | null>(null);
  const [supplierOperation, setSupplierOperation] = useState<Movement[] | []>(
    []
  );

  const managePaginate = (
    opp: "add" | "del",
    setPaginate: Function,
    paginate: PaginateInterface | null
  ) => {
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

  const getAllSuppliers = async (filter: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/administration/supplier${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllSuppliers(resp.data.items);

        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getAllSuppliersWithOutFilter = async () => {
    setIsLoading(true);
    await query
      .get(`/administration/supplier`)
      .then((resp) => {
        setAllSuppliers(resp.data.items);

        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addSupplier = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);

    await query
      .post("/administration/supplier", data)
      .then((resp) => {
        setAllSuppliers([resp.data, ...allSuppliers]);
        managePaginate("add", setPaginate, paginate);
        callback();
        toast.success("Proveedor agregado");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editSupplier = async (
    id: number,
    data: Record<string, string | number | boolean>
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/supplier/${id}`, data)
      .then((resp) => {
        const updated = [...allSuppliers];
        updated.splice(
          updated.findIndex((item) => item.id === resp.data.id),
          1,
          resp.data
        );
        setSupplier({ ...supplier, ...resp.data });

        toast.success("Datos del proveedor actualizados");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteSupplier = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/supplier/${id}`, {})
      .then(() => {
        setAllSuppliers(allSuppliers.filter((item) => item.id !== id));
        managePaginate("del", setPaginate, paginate);
        toast.success("Proveedor eliminado con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getSupplier = async (supplerId: string) => {
    setIsLoading(true);
    await Promise.all([
      query.get(`/administration/supplier/${supplerId}`),
      query.get(`/administration/movement?supplierId=${supplerId}`),
    ])
      .then((resp) => {
        setSupplier(resp[0].data);
        setSupplierOperation(resp[1].data.items);

        setPaginate({
          currentPage: resp[1].data.currentPage,
          totalItems: resp[1].data.totalItems,
          totalPages: resp[1].data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getOperationsSupplier = async (
    supplerId: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/movement?supplierId=${supplerId}`)
      .then((resp) => setSupplierOperation(resp.data.items))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const exportSuppliers = async (
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/supplier${generateUrlParams({
          ...filter,
          all_data: true,
        })}`
      )

      .then((resp) => {
        const suppliers: SupplierInterfaces[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        suppliers.map((item) => {
          dataToExport.push({
            Nombre: item?.name,
            Dirección: address_complete(
              item?.address?.street_1,
              item?.address?.municipality?.name,
              item?.address?.municipality?.name
            ),
            Teléfono: item?.phones[0]?.number ?? "---",
            Observación: item?.observations ?? "---",
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
    allSuppliers,
    paginate,
    supplier,

    getAllSuppliers,
    getSupplier,
    addSupplier,
    editSupplier,
    deleteSupplier,
    exportSuppliers,
    getOperationsSupplier,
    supplierOperation,
    getAllSuppliersWithOutFilter,
  };
};

export default useServerSupplier;
