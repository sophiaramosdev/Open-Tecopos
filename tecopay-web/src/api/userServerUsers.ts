import { useState } from 'react';

import query from './APIServices';
import useServerMain from './useServer';
import { toast } from 'react-toastify';

import { generateUrlParams } from '../utils/helpers';
import { BasicType } from '../interfaces/localInterfaces';
import {
	PaginateInterface,
	UserInterface,
} from '../interfaces/serverInterfaces';

const useServerUsers = () => {
	const { manageErrors } = useServerMain();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [allUsers, setAllUsers] = useState<UserInterface[]>([]);
	const [user, setUser] = useState<UserInterface|null>(null);
	const [modalWaiting, setModalWaiting] = useState<boolean>(false);
	const [modalWaitingError, setModalWaitingError] = useState<string | null>(
		null,
	);
	const [waiting, setWaiting] = useState<boolean>(false);

	const getAllUsers = async (filter: BasicType) => {
		setIsLoading(true);
		await query
			.get(`/user${generateUrlParams(filter)}`)
			.then((resp) => {
				setPaginate({
					totalItems: resp.data.totalItems,
					totalPages: resp.data.totalPages,
					currentPage: resp.data.currentPage,
				});
				setAllUsers(resp.data.items);
			})
			.catch((error) => {
				manageErrors(error);
			});
		setIsLoading(false);
	};

	const registerNewUser = async (data: any, close: Function) => {
		setIsFetching(true);

		await query
			.post('/user/register/new', data)
			.then((resp) => {
				setAllUsers([resp.data,...allUsers]);
				toast.success('Usuario registrado satisfactoriamente');
				close();
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
	};

	const addFromTecopos = async (data: any, close: Function) => {
		setIsFetching(true);
		await query
			.post('/user/register', data)
			.then((resp) => {
				console.log(resp.data)
				setAllUsers([resp.data,...allUsers]);
				toast.success('Usuario integrado satisfactoriamente');
				close();
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
	};

	const assignUserRoles = async (
		id: number,
		data: Record<string, string | number | boolean | string[]>,
		callback?: Function,
	) => {
		setIsFetching(true);
		await query
			.patch(`/user/${id}`, data)
			.then((resp) => {
   				const newUsers: UserInterface[] = [...allUsers];
				const idx = newUsers.findIndex((user: any) => user.id === id);
				newUsers.splice(idx, 1, resp.data);
				setAllUsers(newUsers);
				toast.success('Usuario editado satisfactoriamente');
				callback?.();
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
	};

	const getUser = async (id: any): Promise<any> => {
		setIsLoading(true);
		await query
			.get(`/user/${id}`)
			.then((resp) => {
        console.log(resp.data)
        setUser(resp.data);
      })
			.catch((error) => manageErrors(error));
		setIsLoading(false);
	};

	const deleteUser = async (id: number, callback?: Function) => {
		setIsFetching(true);
		await query
			.deleteAPI(`/user/${id}`, {})
			.then(() => {
				toast.success('Usuario Eliminado con éxito');
				const newUsers = allUsers.filter((item: any) => item.id !== id);
				setAllUsers(newUsers);
				callback?.();
			})
			.catch((error) => {
				manageErrors(error);
			});
		setIsFetching(false);
	};
	return {
		paginate,
		isLoading,
		isFetching,
		waiting,
		modalWaiting,
		allUsers,
		user,
		getAllUsers,
		registerNewUser,
		getUser,
		assignUserRoles,
		deleteUser,
		setAllUsers,
		manageErrors,
		modalWaitingError,
		addFromTecopos,
	};
};
export default useServerUsers;
