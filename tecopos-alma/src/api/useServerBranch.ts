import { useState } from "react";
import {
  BusinessBranchInterface,
  PaginateInterface,
  UserInterface,
} from "../interfaces/ServerInterfaces";
import query from "./APIServices";
import useServer from "./useServer";
import { Flip, toast } from "react-toastify";

const useServerBranch = () => {
  const { manageErrors } = useServer();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allBranches, setAllBranches] = useState<
    Array<BusinessBranchInterface>
  >([]);

  const getAllBranch = async (businessId: string) => {
    setIsLoading(true);
    await query
      .get(`/control/business/${businessId}/branches`)
      .then((resp) => {
        setAllBranches(resp.data);
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };
  const addBranch = async (
    businessId: string,
    data: any,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/control/business/${businessId}/branches`, data)
      .then(async (resp) => {
        setAllBranches([resp.data, ...allBranches]);
        toast.success("Hijo incluido con éxito");
        callback && callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };
  const deleteBranch = async (
    id: number,
    businessId: number,
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .deleteAPI(`/control/business/${businessId}/branches/${id}`, {})
      .then(async () => {
        setAllBranches(allBranches.filter((branch) => branch.id! !== id));
        toast.success("Hijo Eliminado con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  return {
    paginate,
    isLoading,
    isFetching,
    manageErrors,
    addBranch,
    getAllBranch,
    deleteBranch,
    allBranches,
    setAllBranches,
  };
};

export default useServerBranch;
