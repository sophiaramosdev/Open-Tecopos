import { useState } from 'react';
import query from './APIServices';
import useServerMain from './useServer';
import { toast } from 'react-toastify';
import { generateUrlParams } from '../utils/helpers';
import type { BasicType } from '../interfaces/localInterfaces';
import {
	AccountInterface,
	AccountOperations,
	PaginateInterface,
} from '../interfaces/serverInterfaces';

const useServerAccounts = () => {
	const { manageErrors } = useServerMain();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [allAccounts, setAllAccounts] = useState<AccountInterface[]>([]);
	const [account, setAccount] = useState<AccountInterface | null>(null);
	const [records, setRecords] = useState<any | null>(null);
	const [operations, setOperations] = useState<AccountOperations[]>([]);

	// 'account / all'
	const getAllAccounts = async (filter: BasicType) => {
		setIsLoading(true);
		await query
			.get(`/account${generateUrlParams(filter)}`)
			.then((resp) => {
				setPaginate({
					totalItems: resp.data.totalItems,
					totalPages: resp.data.totalPages,
					currentPage: resp.data.currentPage,
				});
				setAllAccounts(resp.data.items);
			})
			.catch((error) => manageErrors(error));
		setIsLoading(false);
	};

	// 'account / register'
	const addAccount = async (data: any, close: Function) => {
		setIsFetching(true);
		setIsLoading(true);
		try {
			let resp = await query.post('/account', data);
			setAllAccounts([...allAccounts, resp.data]);
			toast.success('Cuenta agregada satisfactoriamente');
			close();
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
			setIsLoading(false);
		}
	};

	// 'account / update'
	const editAccount = async (
		id: number,
		data: Record<string, string | number | boolean | number[]>,
		callback?: Function,
	) => {
		setIsFetching(true);
		try {
			let resp = await query.patch(`/account/${id}`, data);
			const newAccounts: any = [...allAccounts];
			const idx = newAccounts.findIndex((user: any) => user.id === id);
			newAccounts.splice(idx, 1, resp.data);
			setAllAccounts(newAccounts);
			callback && callback();

			toast.success('Cuenta modificada con éxito');
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
		}
	};

	// 'account / find by id'
	const getAccountInfo = async (id: string) => {
		setIsLoading(true);
		await Promise.all([
			await query.get(`/account/${id}`),
			await query.get(`/account/${id}/operations`),
		])
			.then((resp) => {
				setAccount(resp[0].data);
				setOperations(resp[1].data.items);
				setPaginate({
					totalItems: resp[1].data.totalItems,
					totalPages: resp[1].data.totalPages,
					currentPage: resp[1].data.currentPage,
				});
			})
			.catch((e) => manageErrors(e));
		setIsLoading(false);
	};

	// 'account / getAccountRecords'
	const getAccountRecords = async (id: any): Promise<any> => {
		setIsLoading(true);
		try {
			const response = await query.get(`/account/${id}/records`);
			const account = response.data;
			setRecords(account);
			return account;
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};

	// 'account / getAccountOp'
	const getAccountOperations = async (
		id:number,
		param: Record<string, string | number | boolean | null>,
	): Promise<any> => {
		setIsFetching(true);
		await query
			.get(`/account/${id}/operations${generateUrlParams(param)}`)
			.then((resp) => {
				setPaginate({
					totalItems: resp.data.totalItems,
					totalPages: resp.data.totalPages,
					currentPage: resp.data.currentPage,
				});
				setOperations(resp.data.items);
			})
			.catch((error) => manageErrors(error));
		setIsFetching(false);
	};

	// 'account / delete'
	const deleteAccount = async (id: number, callback?: Function) => {
		setIsFetching(true);
		try {
			await query.deleteAPI(`/account/${id}`, {});
			toast.success('Cuenta eliminada con éxito');
			const newAccounts = allAccounts.filter((item: any) => item.id !== id);
			setAllAccounts(newAccounts);
			callback && callback();
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
		}
	};

	// 'account operation / transfer'
	const Transfer = async (data: any, callback?: Function) => {
		setIsFetching(true);
		try {
			let resp = await query.post(`/account/transfer`, data);
			if (resp.data.sourceAccount.address == account!.address) {
				const changed: AccountInterface = {
					...account!,
					amount: resp.data.sourceAccount.amount,
				};
				setAccount(changed);
			} else if (resp.data.targetAccount.address == account!.address) {
				const changed = { ...account!, amount: resp.data.targetAccount.amount };
				setAccount(changed);
			}
			callback && callback();
			toast.success('Transferencia exitosa');
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
		}
	};

	// 'account operation / charge'
	const charge = async (data: {address:string, amount:number}, callback?: Function) => {
		setIsFetching(true);
		try {
			await query.post(`/accountopp/charge`, data);
			callback && callback();
			toast.success('Recarga exitosa');
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
		}
	};

	// 'account operation / charge'
	const registerAccountCategory = async (data: any) => {
		setIsFetching(true);
		try {
			await query.post(`/account/assignCategory`, data);
			toast.success('Categoría registrada');
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsFetching(false);
		}
	};

	return {
		paginate,
		isLoading,
		isFetching,
		allAccounts,
		account,
		records,
		operations,
		getAllAccounts,
		addAccount,
		getAccountInfo,
		editAccount,
		deleteAccount,
		setAllAccounts,
		manageErrors,
		getAccountOperations,
		getAccountRecords,
		Transfer,
		charge,
		registerAccountCategory,
	};
};
export default useServerAccounts;
