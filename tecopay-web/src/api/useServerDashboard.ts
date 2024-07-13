import { useState } from "react";

import query from "./APIServices";
import useServerMain from "./useServer";
import { PaginateInterface } from "../interfaces/serverInterfaces";
import { DataDashboard } from "../utils/chart/DoughutCard";

interface DataTraces {
  issueEntities: number,
    usersRegistered:  number,
    accounts:  number,
    totalAmountInAccounts:  number,
    cardsPrinted:  number,
    accountOperations:  number,
    cardRequests:  number
}

const useServerDashboard = () => {

  const { manageErrors } = useServerMain();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [traces, setTraces] = useState<any>([]);
  const [tracesEntity, setTracesEntity] = useState<any>([]);
  const [requestStatus, setRequestStatus] = useState<any>([	{ status: 'Canceladas', value: 2 }]);

  const getTraces = async () => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/traces`)
      //setPaginate({
      //  totalItems: resp.data.totalItems,
      //  totalPages: resp.data.totalPages,
      //  currentPage: resp.data.currentPage,
      //});
      setTraces(resp.data)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };
  const getDasboardRequest = async () => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/traces`)
      //setPaginate({
      //  totalItems: resp.data.totalItems,
      //  totalPages: resp.data.totalPages,
      //  currentPage: resp.data.currentPage,
      //});
      setRequestStatus(resp.data.requestStatus)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };
  const getTracesFilter = async ( ) => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/traces`)
      //setPaginate({
      //  totalItems: resp.data.totalItems,
      //  totalPages: resp.data.totalPages,
      //  currentPage: resp.data.currentPage,
      //});
      setTraces(resp.data)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };


  const getTracesEntity = async (id:number) => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/traces?issueEntityId=${id}`)
      //setPaginate({
      //  totalItems: resp.data.totalItems,
      //  totalPages: resp.data.totalPages,
      //  currentPage: resp.data.currentPage,
      //});
      setTracesEntity(resp.data)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paginate,
    isLoading,
    isFetching,
    traces,
    tracesEntity,
    requestStatus,
    getDasboardRequest,
    getTraces,
    getTracesEntity,
    manageErrors,
  };
};

export default useServerDashboard;