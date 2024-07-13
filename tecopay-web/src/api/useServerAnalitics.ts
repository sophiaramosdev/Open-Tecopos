import { useState } from 'react';

import query from './APIServices';
import useServer from './useServer';
import { BasicType } from '../interfaces/localInterfaces';
import { generateUrlParams } from '../utils/helpers';
import {
	AccountRecord,
	DashboardDataInterface,
	Operations,
	PaginateInterface,
	RequestRecord,
} from '../interfaces/serverInterfaces';

const useServerAnalitics = () => {
	const { manageErrors } = useServer();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [paginateRequest, setPaginateRequest] =
		useState<PaginateInterface | null>(null);
	const [allOperations, setAllOperations] = useState<Operations[]>([]);
	const [totalOpe, setTtotalOpe] = useState<number>(0);
	const [allPayment, setAllPayment] = useState<Operations[]>([]);
	const [totalPay, setTtotalPay] = useState<number>(0);
	const [allTransations, setAllTransactions] = useState<Operations[]>([]);
	const [totalTransaction, setTtotalTransaction] = useState<number>(0);
	const [allDeposit, setAllDeposit] = useState<Operations[]>([]);
	const [allAccountRecord, setAllAccountRecord] = useState<AccountRecord[]>([]);
	const [totalDeposit, setTtotalDeposit] = useState<number>(0);
	const [totalAccount, setTtotalAccount] = useState<number>(0);
	const [totalRequestCreated, setTtotalRequestCreated] = useState<number>(0);
	const [allRequestCreated, setallRequestCreated] = useState<RequestRecord[]>(
		[],
	);
	const [totalRequestDenied, setTtotalRequestDenied] = useState<number>(0);
	const [allRequestDenied, setallRequestDenied] = useState<RequestRecord[]>([]);
	const [totalRequestCanceled, setTtotalRequestCanceled] = useState<number>(0);
	const [allRequestCanceled, setallRequestCanceled] = useState<RequestRecord[]>(
		[],
	);
	const [totalRequestModified, setTtotalRequestModified] = useState<number>(0);
	const [allRequestModifiied, setallRequestModified] = useState<
		RequestRecord[]
	>([]);
	const [totalRequestRequest, setTtotalRequestRequest] = useState<number>(0);
	const [allRequestRequest, setallRequestRequest] = useState<RequestRecord[]>(
		[],
	);
	const [totalAccCreated, setTtotalAccCreated] = useState<number>(0);
	const [allAccCreated, setallAccCreated] = useState<RequestRecord[]>([]);
	const [totalAccCanceled, setTtotalAccCanceled] = useState<number>(0);
	const [allAccCanceled, setallAccCanceled] = useState<RequestRecord[]>([]);
	const [totalRequest, setTotalRequest] = useState<number>(0);
	const [allRequest, setallRequest] = useState<RequestRecord[]>([]);
	const [totalRequestClose, setTotalRequestClose] = useState<number>(0);
	const [allRequestClose, setallRequestClose] = useState<RequestRecord[]>([]);
	const [dashboardData, setDashboardData] = useState<DashboardDataInterface|null>(null);

	const getAllOperations = async (filter: BasicType) => {
		setIsLoading(true);

		try {
			let resp = await query.get(
				`/accountopp/transactions${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setAllOperations(resp.data.items);
			setTtotalOpe(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllAccountRecord = async (filter: BasicType) => {
		setIsLoading(true);

		try {
			let resp = await query.get(
				`/traces/accounts${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.paginationInfo.totalItems,
				totalPages: resp.data.paginationInfo.totalPages,
				currentPage: resp.data.paginationInfo.currentPage,
			});
			setAllAccountRecord(resp.data.records);
			setTtotalAccount(resp.data.paginationInfo.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllAccountCreated = async (filter: BasicType) => {
		setIsLoading(true);

		try {
			let resp = await query.get(
				`/traces/accounts?action=ACCOUNT_CREATED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.paginationInfo.totalItems,
				totalPages: resp.data.paginationInfo.totalPages,
				currentPage: resp.data.paginationInfo.currentPage,
			});
			setallAccCreated(resp.data.records);
			setTtotalAccCreated(resp.data.paginationInfo.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllAccountBlocked = async (filter: BasicType) => {
		setIsLoading(true);

		try {
			let resp = await query.get(
				`/traces/accounts?action=ACCOUNT_BLOCKED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.paginationInfo.totalItems,
				totalPages: resp.data.paginationInfo.totalPages,
				currentPage: resp.data.paginationInfo.currentPage,
			});
			setallAccCanceled(resp.data.records);
			setTtotalAccCanceled(resp.data.paginationInfo.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestCreated = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=CREATED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestCreated(resp.data.items);
			setTtotalRequestCreated(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestRequested = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=REQUESTED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestRequest(resp.data.items);
			setTtotalRequestRequest(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequest = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests${generateUrlParams(filter)}`,
			);
			setPaginateRequest({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequest(resp.data.items);
			setTotalRequest(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestModified = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=MODIFIED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestModified(resp.data.items);
			setTtotalRequestModified(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestCanceled = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=CANCELLED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestRequest(resp.data.items);
			setTtotalRequestRequest(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestDenied = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=DENIED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestDenied(resp.data.items);
			setTtotalRequestDenied(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllRequestClosed = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/traces/requests?status=CLOSED${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setallRequestClose(resp.data.items);
			setTotalRequestClose(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllPayment = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/accountopp/transactions?transactionType=PAYMENT${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setAllPayment(resp.data.items);
			setTtotalPay(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllDeposit = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/accountopp/transactions?transactionType=DEPOSIT${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setAllDeposit(resp.data.items);
			setTtotalDeposit(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};
	const getAllTransactions = async (filter: BasicType) => {
		setIsLoading(true);
		try {
			let resp = await query.get(
				`/accountopp/transactions?transactionType=TRANSACTION${generateUrlParams(filter)}`,
			);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setAllTransactions(resp.data.items);
			setTtotalTransaction(resp.data.totalItems);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};

	const getDashboardData = async () => {
		setIsLoading(true);
		await query
			.get('/traces')
			.then((resp) => setDashboardData(resp.data))
			.catch((e) => manageErrors(e));

		setIsLoading(false);
	};

	return {
		paginate,
		paginateRequest,
		isLoading,
		isFetching,
		allOperations,
		totalOpe,
		totalAccount,
		getAllAccountRecord,
		allAccountRecord,
		getAllDeposit,
		allDeposit,
		totalDeposit,
		getAllTransactions,
		allTransations,
		totalTransaction,
		getAllOperations,
		getAllPayment,
		allPayment,
		totalPay,
		getAllRequestCreated,
		getAllRequestCanceled,
		getAllRequestDenied,
		getAllRequestModified,
		getAllRequestRequested,
		getAllAccountBlocked,
		getAllAccountCreated,
		getAllRequest,
		getAllRequestClosed,
		totalRequest,
		totalRequestClose,
		allRequestClose,
		allRequest,
		totalAccCreated,
		totalAccCanceled,
		totalRequestCreated,
		totalRequestCanceled,
		totalRequestDenied,
		totalRequestModified,
		totalRequestRequest,
		allRequestCreated,
		allRequestCanceled,
		allRequestDenied,
		allRequestModifiied,
		allRequestRequest,
		allAccCanceled,
		allAccCreated,
		manageErrors,
    getDashboardData,
    dashboardData
	};
};

export default useServerAnalitics;
