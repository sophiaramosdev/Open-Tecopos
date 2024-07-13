import { useState } from 'react';

import query from './APIServices';
import useServerMain from './useServer';
import { toast } from 'react-toastify';
import { generateUrlParams } from '../utils/helpers';
import { BasicType, SelectInterface } from '../interfaces/localInterfaces';
import { PaginateInterface } from '../interfaces/serverInterfaces';

const useServerCards = () => {
	const { manageErrors } = useServerMain();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [allCards, setAllCards] = useState<any>([]);
	const [card, setCard] = useState<any>(null);
	const [selectedDataToParent, setSelectedDataToParent] =
		useState<SelectInterface | null>(null);


	//Postman -> 'card / findAllCards'
	const getAllCards = async (filter: BasicType) => {
		setIsLoading(true)
		try {
			let resp = await query.get(`/card${generateUrlParams(filter)}`);
			setPaginate({
				totalItems: resp.data.totalItems,
				totalPages: resp.data.totalPages,
				currentPage: resp.data.currentPage,
			});
			setAllCards(resp.data.items);
		} catch (error) {
			manageErrors(error);
		} finally {
			setIsLoading(false);
		}
	};

	const addCard = async (data: any, close: Function) => {
		setIsFetching(true);
		setIsLoading(true);
		await query
			.post('/card', data)
			.then((resp) => {
				setAllCards([...resp.data.data]);

				toast.success('Ticket agregado satisfactoriamente');
			})
			.then(() => close())
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
		setIsLoading(false);
	};

	const editCard = async (
		id: number,
		data: Record<string, string | number | boolean | string[]>,
		callback?: Function,
	) => {
		setIsFetching(true);
		await query
			.put(`/card/${id}`, data)
			.then((resp) => {
				const newCards: any = [...allCards];
				const idx = newCards.findIndex((card: any) => card.id === id);
				const cardWithId = allCards.find((card: any) => card.id == id);
				const wholeData = Object.assign(data, {
					id,
					holder: { fullName: cardWithId.holder.fullName },
					currency: { code: selectedDataToParent?.name },
				});
				newCards.splice(idx, 1, wholeData);

				setAllCards(newCards);
				callback?.();
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
	};

	const deliverCard = async (id: number, data: any, close: Function) => {
		setIsFetching(true);
		await query
			.post(`/card/${id}/deliver`, data)
			.then(() => {
				const newCards = allCards.filter((item: any) => item.id !== id);
				setAllCards(newCards);
				toast.success('Tarjeta entregada satisfactoriamente');
			})
			.then(() => close())
			.catch((e) => {
				manageErrors(e);
				console.log(e);
			});
		setIsFetching(false);
	};

	const getCard = async (id: any) => {
		setIsLoading(true);
		await query
			.get(`/card/${id}`)
			.then((resp) => {
				setCard(resp.data);
			})
			.catch((error) => {
				manageErrors(error);
			});
		setIsLoading(false);
	};

	const deleteCard = async (id: number, callback?: Function) => {
		setIsFetching(true);
		await query
			.deleteAPI(`/card/${id}`, {})
			.then(() => {
				toast.success('Tarjeta Eliminada con éxito');
				const newCard = allCards.filter((item: any) => item.id !== id);
				setAllCards(newCard);
				callback?.();
			})
			.catch((error) => {
				manageErrors(error);
			});
		setIsFetching(false);
	};

	const updatePIN = async (
		address: string,
		newSecurityPin: number,
		close: Function,
	) => {
		setIsFetching(true);
		try {
			await query.patch(`/card/editSecurityPin`, { address, newSecurityPin });
			toast.success('PIN actualizado exitosamente');
			close && close();
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
		card,
		allCards,
		updatePIN,
		getAllCards,
		addCard,
		getCard,
		editCard,
		deleteCard,
		manageErrors,
		setAllCards,
		setSelectedDataToParent,
		deliverCard,
	};
};
export default useServerCards;
