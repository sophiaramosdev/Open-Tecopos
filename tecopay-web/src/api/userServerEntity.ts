import { useState, useRef } from 'react';

import query from './APIServices';
import useServerMain from './useServer';
import { toast } from 'react-toastify';
import { generateUrlParams } from '../utils/helpers';
import { EntityInterface, PaginateInterface } from '../interfaces/serverInterfaces';
import { BasicType } from '../interfaces/localInterfaces';


const useServerEntity = () => {
	const { manageErrors } = useServerMain();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [entity, setEntity] = useState<EntityInterface | null>(null);
	const [allEntity, setAllEntity] = useState<any>([]);
	const [business, setBusiness] = useState<any>([]);

	//Postman -> 'entity / all'
	const getAllEntity = async (filter: BasicType) => {
		setIsLoading(true);
		await query
			.get(`/entity${generateUrlParams(filter)}`)
			.then((resp) => {
				setPaginate({
					totalItems: resp.data.totalItems,
					totalPages: resp.data.totalPages,
					currentPage: resp.data.currentPage,
				});
				setAllEntity(resp.data.items);
			})
			.catch((e) => manageErrors(e));
		setIsLoading(false);
	};

	//Postman -> 'entity / register'
	const addEntity = async (data: any, close: Function) => {
		setIsFetching(true);
		await query
			.post('/entity', data)
			.then((resp) => {
				setAllEntity([resp.data, ...allEntity]);
				toast.success('Entidad agregada satisfactoriamente');
				close();
			})
			.catch((error) => manageErrors(error));
		setIsFetching(false);
	};

	//Postman -> 'entity / find by id'
	const getEntity = async (id: string) => {
		setIsLoading(true);
		await query
			.get(`/entity/${id}`)
			.then((resp) => setEntity(resp.data))
			.catch((e) => manageErrors(e));
		setIsLoading(false);
	};

	//Postman -> 'entity / update'
	const updateEntity = async (id: number, data: Record<string, any>) => {
		setIsFetching(true);
		await query
			.patch(`/entity/${id}`, data)
			.then((resp) => {
				setEntity({ ...entity, ...resp.data });
				const allEntities = [...allEntity];
				const idx = allEntities.findIndex((item) => item.id === id);
				allEntities.splice(idx, 1, { ...allEntities[idx], ...resp.data });
				setAllEntity(allEntities);
				toast.success('Entidad actualizada exitosamente');
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	//Postman -> 'entity / delete'
	const deleteEntity = async (id: number, callback?: Function) => {
		setIsFetching(true);
		await query
			.deleteAPI(`/entity/${id}`, {})
			.then(() => {
				setAllEntity(allEntity.filter((obj: any) => obj.id !== id));
				toast.success('Entidad eliminada exitosamente');
				callback && callback();
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	//CATEGORIES ---------------------------------------------------------------

	const addCategory = async (
		entityId: number,
		data: Record<string, any>,
		callback: Function,
	) => {
		setIsFetching(true);
		await query
			.post(`/entity/${entityId}/categories`, data)
			.then((resp) => {
				setEntity({ ...entity!, categories: resp.data });
				callback();
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	const updateCategory = async (
		id: number,
		data: Record<string, any>,
		callback: Function,
	) => {
		setIsFetching(true);
		await query
			.patch(`/entity/categories/${id}`, data)
			.then((resp) => {
				setEntity({ ...entity!, categories: resp.data });
				callback();
			})
			.catch((e) => manageErrors(e));
		setIsFetching(false);
	};

	const deleteCategory = async (
		id: number,
		callback:Function
	) => {
		setIsFetching(true);
		await query.deleteAPI(`/entity/categories/${id}`, {}).then(()=>{
			const categories = entity!.categories.filter(item=>item.id !== id);
			setEntity({...entity!, categories});
			callback();
		}).catch(e=>manageErrors(e));
		setIsFetching(false);
	};

	//Postman -> 'bussines / findAll'
	const getAllBussinnes = async () => {
		setIsLoading(true);
		try {
			let resp = await query.get(`/business`);
			//setPaginate({
			//  totalItems: resp.data.totalItems,
			//  totalPages: resp.data.totalPages,
			//  currentPage: resp.data.currentPage,
			//});
			setBusiness(resp.data.items);
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
		entity,
		business,
		allEntity,
		getAllBussinnes,
		getAllEntity,
		addEntity,
		getEntity,
		updateEntity,
		deleteEntity,
		manageErrors,
		addCategory,
		updateCategory,
		deleteCategory,
	};
};

export default useServerEntity;
