import { PlusIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../../components/misc/GenericTable';
import Paginate from '../../../components/misc/Paginate';
import Modal from '../../../components/modals/GenericModal';
import { useEffect, useState } from 'react';
import useServerCardsRequests from '../../../api/userServerCardsRequests';
import StatusForCardRequest from '../../../components/misc/StatusForCardRequest';
import { translateCardRequestType } from '../../../utils/translateCardStatus';
import BulkCardRequestModal from '../CardRequestModal/BulkCardRequestModal';
import SimpleCardRequestModal from '../CardRequestModal/SimpleCardRequestModal';
import Button from '../../../components/misc/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/free-solid-svg-icons';
import GenericList from '../../../components/misc/GenericList';
import {  translateCardRequestStatus } from '../../../utils/translate';
import moment from 'moment';
import { formatCalendar } from '../../../utils/helpers';

const AcceptedStatus = () => {
	const CRUD = useServerCardsRequests();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({ page: 1, status: 'ACCEPTED' });
	const [simpleCardRequestModal, setSimpleCardRequestModal] = useState(false);
	const [bulkCardRequestModal, setBulkCardRequestModal] = useState(false);
	const [cardRequest, setCardRequest] = useState<any>(false);

	useEffect(() => {
		CRUD.getAllCardsRequests(filter);
	}, [filter]);

	//Data for table ------------------------------------------------------------------------------

	const tableTitles = [
		'Fecha de Solicitud',
		'Titular',
		'Cantidad',
		'Categoría',
		'Entidad',
		'No. Cuenta',
		'No. Tarjeta',
		'Tipo',
		'Estado',
	];

	const tableData: DataTableInterface[] = [];

	CRUD?.allCardsRequests?.map((item: any) => {
		tableData.push({
			rowId: item.id,
			payload: {
				'Fecha de Solicitud':
					moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA') ?? '-',
				Titular: item?.holderName ?? '-',
				Cantidad: item?.quantity,
				Categoría: item?.category?.name ?? '-',
				Entidad: item?.issueEntity?.name ? item?.issueEntity?.name : '',
				Negocio: item?.issueEntity?.business?.name ?? '-',
				'No. Cuenta': item?.accounts[0]?.address ?? '-',
				'No. Tarjeta': (
					<div className='flex flex-col'>
						{item?.cards.map((card: any, idx: number) => (
							<p key={idx}>{card.address}</p>
						))}
					</div>
				),
				Tipo: translateCardRequestType(item?.priority),
				Estado: <StatusForCardRequest currentState={item.status} />,
			},
		});
	});

	const closeSimpleRequestModal = () => setSimpleCardRequestModal(false);
	const closeBulkRequestModal = () => setBulkCardRequestModal(false);

	const rowAction = (id: number) => {
		const cardRequest = CRUD.allCardsRequests.find(
			(item: any) => item.id === id,
		);
		setCardRequest(cardRequest);
	};

	//---------------------------------------------------------------------------------------

	const availableFilters: FilterOpts[] = [
		{
			format: 'datepicker-range',
			name: 'Rango de fecha',
			filterCode: 'dateRange',
			datepickerRange: [
				{
					isUnitlToday: true,
					filterCode: 'fromDate',
					name: 'Desde',
				},
				{
					isUnitlToday: true,
					filterCode: 'toDate',
					name: 'Hasta',
				},
			],
		},
		{
			format: 'select',
			filterCode: 'businessId',
			name: 'Negocio',
			asyncData: {
				url: '/business',
				idCode: 'id',
				dataCode: ['name'],
			},
		},
		{
			format: 'select',
			filterCode: 'issueEntityId',
			name: 'Entidad',
			asyncData: {
				url: '/entity',
				idCode: 'id',
				dataCode: ['name'],
			},
		},
		{
			format: 'select',
			filterCode: 'accountId',
			name: 'Cuenta',
			asyncData: {
				url: `/account`,
				idCode: 'id',
				dataCode: ['address'],
			},
		},
		{
			format: 'select',
			filterCode: 'type',
			name: 'Tipo de solicitud',
			data: [
				{ id: 'SIMPLE', name: 'Solicitud Simple' },
				{ id: 'BULK', name: 'Solicitud por bulto' },
			],
		},
	];

	const filterAction = (data: any) => {
		data
			? setFilter({ ...data, status: 'ACCEPTED' })
			: setFilter({ page: 1, status: 'ACCEPTED' });
	};

	const actions = [
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar Solicitud Simple',
			action: () => setSimpleCardRequestModal(true),
		},
		{
			icon: <PlusIcon className='h-5' />,
			title: 'Agregar Solicitud por Bulto',
			action: () => setBulkCardRequestModal(true),
		},
	];

	//---------------------------------------------------------------------------------------

	return (
		<div className=''>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={CRUD?.isLoading}
				searching={{
					action: (value: string) => filterAction({ ...filter, search: value }),
					placeholder: 'Buscar por # Tarjeta',
				}}
				actions={actions}
				filterComponent={{ availableFilters, filterAction }}
				rowAction={rowAction}
				paginateComponent={
					<Paginate
						action={(page: number) => setFilter({ ...filter, page })}
						data={CRUD?.paginate}
					/>
				}
			/>

			{/*Modal to Create Simple Card Request*/}
			{simpleCardRequestModal && (
				<Modal state={simpleCardRequestModal} close={setSimpleCardRequestModal}>
					<SimpleCardRequestModal close={closeSimpleRequestModal} />
				</Modal>
			)}

			{/*Modal to Create Bulk Card Request*/}
			{bulkCardRequestModal && (
				<Modal state={bulkCardRequestModal} close={setBulkCardRequestModal}>
					<BulkCardRequestModal close={closeBulkRequestModal} />
				</Modal>
			)}

			{/*Modal to Edit Card Request*/}
			{!!cardRequest && (
				<Modal state={!!cardRequest} close={setCardRequest}>
					<div className='min-h-96'>
						<ModalCardRequest
							close={() => setCardRequest(false)}
							CRUD={CRUD}
							cardRequest={cardRequest}
						/>
					</div>
				</Modal>
			)}
		</div>
	);
};

export default AcceptedStatus;

interface propsDestructured {
	CRUD: any;
	cardRequest: any;
	close: Function;
}

const ModalCardRequest = ({ CRUD, cardRequest, close }: propsDestructured) => {
	function accepted() {
		CRUD.updateCardStatus(cardRequest.id, { status: 'PRINTED' }, close);
	}

	let body: Record<string, string> = {
		'Nombre del propietario': cardRequest?.holderName ?? '-',

		Prioridad: cardRequest?.priority,

		Estado: translateCardRequestStatus(cardRequest?.status) ?? '',

		Entidad: cardRequest?.issueEntity?.name ?? '-',

		Categoría: cardRequest?.category?.name ?? '-',

		Observaciones: cardRequest?.observations,
	};

	const { requestRecord } = cardRequest;

	requestRecord?.forEach((item: any) => {
		switch (item.status) {
			case 'CREATED':
				body['Generada el'] = `${moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				)} (${item.description})`;
				break;

			case 'MODIFIED':
				body['Modificada el'] = `${moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				)} (${item.description})`;
				break;

			case 'CLOSED':
				body['Impresa el'] =
					`${moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA')}`;
				break;

			case 'DENIED':
				body['Denegada el'] = `${moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				)} (${item.description})`;
				break;

			case 'CANCELLED':
				body['Cancelada el'] = `${moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				)} (${item.description})`;
				break;

			default:
				return;
		}
	});

	return (
		<>
			<div className='flex'>
				<div>
					<p className='mb-4 font-semibold text-lg'>
						Solicitud {cardRequest?.queryNumber}
					</p>
					{cardRequest?.quantity === 1 && (
						<p className='mb-4 font-semibold text-lg'>Simple ( cantidad: 1 )</p>
					)}
					{cardRequest?.quantity > 1 && (
						<>
							<p className='mb-4 font-semibold text-lg'>
								Por bulto ( cantidad: <span>{cardRequest?.quantity}</span> )
							</p>
						</>
					)}
				</div>
				<div className='flex justify-end items-center grow'>
					<div className='flex justify-end items-center grow'>
						<div className='mx-10 flex gap-5'>
							{cardRequest?.status === 'ACCEPTED' && (
								<Button
									iconAfter={
										<FontAwesomeIcon
											icon={faPrint}
											className='h-5 text-white'
										/>
									}
									color={'indigo-600'}
									action={() => accepted()}
									name='Imprimir'
									textColor='white'
									loading={CRUD.isFetching}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
			<GenericList body={body}></GenericList>
		</>
	);
};
