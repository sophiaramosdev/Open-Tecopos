import { PlusIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../../components/misc/GenericTable';
import Paginate from '../../../components/misc/Paginate';
import Modal from '../../../components/modals/GenericModal';
import { useEffect, useState } from 'react';
import useServerCardsRequests, {
	CardsRequests,
} from '../../../api/userServerCardsRequests';
import StatusForCardRequest from '../../../components/misc/StatusForCardRequest';
import { translateCardRequestType } from '../../../utils/translateCardStatus';
import { formatCalendar } from '../../../utils/helpersAdmin';
import BulkCardRequestModal from '../CardRequestModal/BulkCardRequestModal';
import SimpleCardRequestModal from '../CardRequestModal/SimpleCardRequestModal';
import { useForm, SubmitHandler } from 'react-hook-form';
import Select from '../../../components/forms/Select';
import TextArea from '../../../components/forms/TextArea';
import Button from '../../../components/misc/Button';
import {
	TrashIcon,
	CheckIcon,
	NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { deleteUndefinedAttr } from '../../../utils/helpers';
import Input from '../../../components/forms/Input';
import AlertContainer from '../../../components/misc/AlertContainer';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import moment from 'moment';

const RequestStatus = () => {
	const {
		getAllCardsRequests,
		allCardsRequests,
		isLoading,
		paginate,
		editCardRequest,
		updateCardStatus,
		deleteCardRequest,
		isFetching,
	} = useServerCardsRequests();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({ page: 1, status: 'REQUESTED' });
	const [simpleCardRequestModal, setSimpleCardRequestModal] = useState(false);
	const [bulkCardRequestModal, setBulkCardRequestModal] = useState(false);
	const [cardRequest, setCardRequest] = useState<any>(null);

	useEffect(() => {
		getAllCardsRequests(filter);
	}, [filter]);

	//Data for table ------------------------------------------------------------------------------

	const tableTitles = [
		'Fecha de Solicitud',
		'Titular',
		'Cantidad',
		'Categoría',
		'Entidad',
		'Negocio',
		'No. Cuenta',
		'Tipo',
		'Estado',
	];

	const tableData: DataTableInterface[] = [];
	allCardsRequests?.map((item: any) => {
		tableData.push({
			rowId: item.id,
			payload: {
				'Fecha de Solicitud':
					moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA') ?? '-',
				Titular: item?.holderName ?? '-',
				Cantidad: item?.quantity,
				Categoría: item?.category?.name ?? '-',
				Entidad: item?.issueEntity?.name ?? '-',
				Negocio: item?.issueEntity?.business?.name ?? '-',
				'No. Cuenta': item?.accounts[0]?.address ?? '-',
				Tipo: translateCardRequestType(item?.priority),
				Estado: <StatusForCardRequest currentState={item.status} />,
			},
		});
	});

	

	const closeSimpleRequestModal = () => setSimpleCardRequestModal(false);
	const closeBulkRequestModal = () => setBulkCardRequestModal(false);

	const crud = {
		editCardRequest,
		updateCardStatus,
		deleteCardRequest,
		isFetching,
	};

	const rowAction = (id: number) => {
		const currentCardRequest = allCardsRequests.find(
			(item: any) => item.id === id,
		);
		setCardRequest(currentCardRequest);
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
			? setFilter({ ...data, status: 'REQUESTED' })
			: setFilter({ page: 1, status: 'REQUESTED' });
	};

	//---------------------------------------------------------------------------------------

	return (
		<div className=''>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={isLoading}
				searching={{
					action: (value: string) => filterAction({ ...filter, search: value }),
					placeholder: 'Buscar por titular',
				}}
				filterComponent={{ availableFilters, filterAction }}
				rowAction={rowAction}
				paginateComponent={
					<Paginate
						action={(page: number) => setFilter({ ...filter, page })}
						data={paginate}
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
							close={() => setCardRequest(null)}
							crud={crud}
							cardRequest={cardRequest}
						/>
					</div>
				</Modal>
			)}
		</div>
	);
};

export default RequestStatus;

//--------------------------------------------------------------------------
//CARD REQUEST MODAL
interface propsDestructured {
	close: Function;
	crud: {
		editCardRequest: Function;
		updateCardStatus: Function;
		deleteCardRequest: Function;
		isFetching: boolean;
	};
	cardRequest: any;
}

const ModalCardRequest = ({ cardRequest, crud, close }: propsDestructured) => {
	const [delAction, setDelAction] = useState(false);
	const [denyModal, setDenyModal] = useState(false);
	const { editCardRequest, updateCardStatus, deleteCardRequest, isFetching } =
		crud;

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useForm<Record<string, string | number>>();

	let dataCardStatus: any;

	const onSubmit: SubmitHandler<Record<string, string | number | null>> = (
		dataToSubmit,
	) => {
		if (dataToSubmit.priority === 'Expresa') {
			dataCardStatus = { ...dataToSubmit, priority: 'EXPRESS' };
		}
		if (dataToSubmit.priority === 'Normal') {
			dataCardStatus = { ...dataToSubmit, priority: 'NORMAL' };
		}

		editCardRequest(
			cardRequest.id,
			deleteUndefinedAttr(dataCardStatus ?? []),
			() => {},
		);

		close();
	};
	function denied(observations: string) {
		updateCardStatus(cardRequest.id, { status: 'DENIED', observations }, close);
	}

	function accepted() {
		updateCardStatus(cardRequest.id, { status: 'ACCEPTED' }, close);
	}

	const priorityData = [
		{ id: 1, name: 'Normal', code: 'NORMAL' },
		{ id: 2, name: 'Expresa', code: 'EXPRESS' },
	];

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
					<div className='mx-10 flex gap-5'>
						<Button
							icon={<NoSymbolIcon className='h-5 text-red-600' />}
							color={'red-200'}
							action={() => setDenyModal(true)}
						/>
						{cardRequest?.status === 'REQUESTED' && (
							<Button
								icon={<CheckIcon className='h-5 text-green-600' />}
								color={'green-200'}
								action={() => accepted()}
							/>
						)}
					</div>
				</div>
			</div>
			<form onSubmit={handleSubmit(onSubmit)}>
				<div className='flex flex-col gap-4'>
					{cardRequest?.quantity === 1 && (
						<Input
							label='Nombre del propietario'
							name='holderName'
							defaultValue={cardRequest?.holderName ?? '-'}
							control={control}
						></Input>
					)}
					{cardRequest?.quantity > 1 && (
						<p className='mb-4 font-semibold text-lg'>
							Por bulto ( cantidad: <span>{cardRequest?.quantity}</span> )
						</p>
					)}
					<div className='flex gap-4'>
						<div className='w-1/2'>
							<Select
								defaultValue={
									priorityData?.find(
										(priority: any) => priority.code === cardRequest?.priority,
									)?.name
								}
								control={control}
								name='priority'
								label='Prioridad'
								data={priorityData}
							></Select>
						</div>
						<div className='w-1/2'>
							<AsyncComboBox
								name='categoryId'
								normalizeData={{ id: 'id', name: 'name' }}
								control={control}
								label='Categoría'
								dataQuery={{
									url: `/entity/${cardRequest?.issueEntity?.id}/categories`,
								}}
								defaultItem={{
									id: cardRequest?.category?.id,
									name: cardRequest?.category?.name,
								}}
							></AsyncComboBox>
						</div>
					</div>

					<TextArea
						name='observations'
						defaultValue={cardRequest?.observations}
						rules={{ required: 'Campo requerido' }}
						control={control}
						label='Observaciones'
					></TextArea>

					<div className='flex justify-between'>
						<Button
							color='red-600'
							action={() => {
								setDelAction(true);
							}}
							name='Eliminar solicitud'
							outline
							textColor='text-red-600'
							iconAfter={<TrashIcon className='text-red-600  w-4 h-4' />}
							type={'button'}
						/>
						<Button
							name='Actualizar'
							color='indigo-600'
							type='submit'
							loading={isFetching && isSubmitting}
						/>
					</div>
				</div>
			</form>
			
			{delAction && (
				<Modal state={delAction} close={setDelAction}>
					<AlertContainer
						onAction={() => deleteCardRequest(cardRequest.id, close)}
						onCancel={setDelAction}
						title={`Eliminar solicitud ${cardRequest?.queryNumber}`}
						text='¿Seguro que desea eliminar esta solicitud del sistema?'
						loading={isFetching}
					/>
				</Modal>
			)}
			{denyModal && (
				<Modal state={denyModal} close={setDenyModal}>
					<DenyNote action={denied} isFetching={isFetching} />
				</Modal>
			)}
		</>
	);
};

//--------------------------------------
//NOTES FOR DENY ACTION

const DenyNote = ({
	action,
	isFetching,
}: {
	action: Function;
	isFetching: boolean;
}) => {
	const { handleSubmit, control } = useForm();
	const onSubmit: SubmitHandler<Record<string, string>> = async (data) => {
		await action(data.note);
	};
	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<TextArea
				name='note'
				label='Nota *'
				placeholder='Indique los motivos de la denegación'
				control={control}
				rules={{ required: '* Campo requerido' }}
			/>
			<div className='w-full flex justify-end pt-2'>
				<Button name='Enviar' color='indigo-600' loading={isFetching} />
			</div>
		</form>
	);
};
