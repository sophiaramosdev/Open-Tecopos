import { useState, useEffect, createContext } from 'react';
import EditEntityGeneralInfo from './EditEntityGeneralInfo';
import TabNav from '../../../components/navigation/TabNav';
import SpinnerLoading from '../../../components/misc/SpinnerLoading';
import { EntityInterface } from '../../../interfaces/serverInterfaces';
import EditCardTypes from './EditCardTypes';
import EditCardTypeForm from './EditCardTypeForm';

interface propsDestructured {
	id: number;
	close: Function;
	crud: {
		getEntity: Function;
		entity: EntityInterface | null;
		updateEntity: Function;
		deleteEntity: Function;
		addCategory: Function;
		updateCategory: Function;
		deleteCategory: Function;
		isFetching: boolean;
		isLoading: boolean;
	};
}

const editContext: {
	entity?: EntityInterface | null;
	getEntity?: Function;
	updateEntity?: Function;
	deleteEntity?: Function;
	addCategory?: Function;
	updateCategory?: Function;
	deleteCategory?: Function;
	isFetching?: boolean;
	close?: Function;
	setCurrentType?:Function;
	currentType?:number|null
} = {};

export const EditEntityContext = createContext(editContext);

const EditEntityModal = ({ id, close, crud }: propsDestructured) => {
	const {
		updateEntity,
		isFetching,
		deleteEntity,
		getEntity,
		entity,
		addCategory,
		updateCategory,
		deleteCategory,
		isLoading
	} = crud;

	const [currentTab, setCurrentTab] = useState('info');
	const [currentType, setCurrentType] = useState<number|null>(null)

	useEffect(() => {
		getEntity(id);
	}, []);

	const tabs = [
		{
			name: 'Información general',
			href: 'info',
			current: currentTab === 'info',
		},
		{
			name: 'Tipos de tarjeta',
			href: 'categories',
			current: currentTab === 'categories',
		},
	];

	if (isLoading)
		return (
			<div className='h-96 flex justify-center items-center'>
				<SpinnerLoading />
			</div>
		);

	return (
		<>
			<TabNav action={setCurrentTab} tabs={tabs} />
			<EditEntityContext.Provider
				value={{
					entity,
					isFetching,
					updateEntity,
					deleteEntity,
					close,
					addCategory,
					updateCategory,
					deleteCategory,
					setCurrentType,
					currentType
				}}
			>
				{currentTab === 'info' && <EditEntityGeneralInfo />}
				{currentTab === 'categories' && currentType === null && <EditCardTypes/>}
				{currentTab === 'categories' && currentType!==null && <EditCardTypeForm/>}
			</EditEntityContext.Provider>
		</>
	);
};

export default EditEntityModal;
