import { useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import query from '../api/APIServices';
import { toast } from 'react-toastify';
import { setKeys } from '../store/slices/sessionSlice';
import mediaQuery from './APIMediaServer';
import { useNavigate } from 'react-router-dom';
import {
	deleteRoleState,
	editRoleState,
	setFullInfo,
	setRoles,
} from '../store/slices/initSlice';
import {
	PermissionCodes,
	PermissionInterface,
} from '../interfaces/serverInterfaces';
import { LocalPermissionInterface } from '../interfaces/localInterfaces';

export type CheckFieldInterface = Record<string, boolean>;

export interface ImageLoad {
	id: number;
	url: string;
	hash: string;
}
const useServerMain = () => {
	const [isFetching, setIsFetching] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState(false);
	const [imgPreview, setImgPreview] = useState<ImageLoad | null>(null);
	const [imgView, setImgView] = useState<ImageLoad>({
		id: 0,
		url: '',
		hash: '',
	});
	const [imgsFromArray, setImgsFromArray] = useState<any>([]);
	const [permissions, setPermissions] = useState<LocalPermissionInterface[]>(
		[],
	);

	const dispatch = useAppDispatch();

	const redirect = useNavigate();

	const manageErrors = (error: any) => {
		console.log(error);
		if (error.response?.data?.message) {
			toast.error(error.response?.data?.message);
		} else {
			toast.error(
				'Upss, ha ocurrido un error inesperado. \n Intente de nuevo o consulte con su administrador...',
			);
		}
	};

	const logIn = async (data: Record<string, string | number | boolean>) => {
		setIsFetching(true);
		await query
			.postAuth('/login', data)
			.then((resp) => {
				dispatch(setKeys(resp.data));
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
	};

	const logOut = async () => {
		setIsFetching(true);
		await query
			.postAuth('/logout', {})
			.then((data) => {
				if (data.status === 204) {
					dispatch(setKeys(null));
					redirect('/');
				}
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	const initSystem = async () => {
		setIsLoading(true);
		try {
			await Promise.all([
				await query.get('/user/myuser'),
				await query.get('/roles'),
				await query.get('/entity/types'),
			]).then((resp) => {
				const userRoles =
					resp[0].data.roles.map((elem: any) => elem.role.name) ?? [];
				const allowedPermissions: PermissionCodes[] = [];
				resp[1].data.items.forEach((item: any) => {
					if (!!userRoles.includes(item.name)) {
						const permissions = item.permissions
							.filter((perm: any) => !allowedPermissions.includes(perm.code))
							.map((elem: any) => elem.code);
						allowedPermissions.push(...permissions);
					}
				});
				dispatch(
					setFullInfo({
						user: resp[0].data,
						roles: resp[1].data.items,
						allowedPermissions,
						entityTypes: resp[2].data.map((item: any) => ({
							id: item.id,
							name: item.name,
						})),
					}),
				);
			});
		} catch (e) {
			manageErrors(e);
		}

		setIsLoading(false);
	};

	const uploadImg = async (data: FormData, multiple: boolean = false) => {
		setIsFetching(true);
		await mediaQuery
			.post('/image', data)
			.then((resp) => {
				setImgPreview({
					id: resp.data.id,
					url: resp.data.url,
					hash: resp.data.hash,
				});
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	const getImg = async (id: any) => {
		setIsLoading(true);
		try {
			// Código asíncrono que puede generar errores
			const resp = await mediaQuery.get(`/image/${id}`);
			setImgView(resp.data);
			return resp.data;
		} catch (error) {
			manageErrors(error);
		}
		setIsLoading(false);
	};

	const updateImgLocal = (data: ImageLoad) => {
		setImgPreview(data);
	};

	const getImgsFromArray = async (ids: number[]) => {
		setIsLoading(true);
		await Promise.all(
			ids.map(async (id: number) => {
				await mediaQuery
					.get(`/image/${id}`)
					.then((resp) => {
						setImgsFromArray([...imgsFromArray, resp.data]);
					})
					.catch((error) => {
						manageErrors(error);
					});
			}),
		);

		setIsLoading(false);
	};

	const getAllPermissions = async () => {
		setIsLoading(true);
		await query
			.get('/roles/permissions')
			.then((resp) => {
				const normalizedPermissions: LocalPermissionInterface[] = [];
				resp.data.forEach((item: PermissionInterface) => {
					const fromServerCat = item.code.split('_')[0];
					let category!:
						| 'Entidades'
						| 'Cuentas'
						| 'Solicitudes'
						| 'Tarjetas'
						| 'Trazas'
						| 'Usuarios'
						| 'Transacciones';
					switch (fromServerCat) {
						case 'ENTITIES':
							category = 'Entidades';
							break;
						case 'REQUESTS':
							category = 'Solicitudes';
							break;
						case 'USERS':
							category = 'Usuarios';
							break;
						case 'ACCOUNTS':
							category = 'Cuentas';
							break;
						case 'CARDS':
							category = 'Tarjetas';
							break;
						case 'TRANSACTIONS':
							category = 'Transacciones';
							break;
						case 'TRACES':
							category = 'Trazas';
							break;
						default:
							break;
					}

					const idx = normalizedPermissions.findIndex(
						(elem) => elem.category === category,
					);
					if (idx !== -1) {
						normalizedPermissions[idx].permissions.push(item);
					} else {
						normalizedPermissions.push({
							category,
							permissions: [item],
						});

						setPermissions(normalizedPermissions);
					}
				});
			})
			.catch((e) => manageErrors(e));
		setIsLoading(false);
	};

	const addRole = async (data: Record<string, any>, close: Function) => {
		setIsFetching(true);
		await query
			.post('/roles', data)
			.then((resp) => {
				dispatch(setRoles(resp.data));
				close();
			})
			.catch((e) => manageErrors(e));

		setIsFetching(false);
	};

	const editRole = async (
		id: number,
		data: Record<string, any>,
		close: Function,
	) => {
		setIsFetching(true);
		await query
			.patch(`/roles/${id}`, data)
			.then((resp) => {
				dispatch(editRoleState(resp.data));
				close();
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	const deleteRole = async (id: number, close: Function) => {
		setIsFetching(true);
		await query
			.deleteAPI(`/roles/${id}`, {})
			.then(() => {
				dispatch(deleteRoleState(id));
				close();
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	return {
		initSystem,
		manageErrors,
		logIn,
		logOut,
		imgPreview,
		imgView,
		uploadImg,
		getImgsFromArray,
		getImg,
		updateImgLocal,
		isFetching,
		isLoading,
		getAllPermissions,
		permissions,
		addRole,
		editRole,
		deleteRole,
	};
};

export default useServerMain;
