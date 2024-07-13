import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../../components/misc/GenericTable';
import Paginate from '../../../components/misc/Paginate';
import Modal from '../../../components/modals/GenericModal';
import { useState, useEffect } from 'react';
import { formatCardNumber } from '../../../utils/helpers';
import StatusForCard from '../../../components/misc/StatusForCard';
import useServerCards from '../../../api/userServerCards';
import Button from '../../../components/misc/Button';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import { useForm, SubmitHandler } from 'react-hook-form';
import Toggle from '../../../components/forms/Toggle';
import Input from '../../../components/forms/Input';
import moment from 'moment';
import ChargeCardAccount from './ChargeCardAccount';

const PendingDelivery = () => {
	const CRUD = useServerCards();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});
	const [requestToDeliver, setRequestToDeliver] = useState<any>(false);

	useEffect(() => {
		CRUD.getAllCards({ isDelivered: 'false', ...filter });
	}, [filter]);

	//Data for table ------------------------------------------------------------------------
	const tableTitles = [
		'No. Tarjeta',
		'No. Cuenta',
		'Titular',
		'Categoría',
		'Entidad',
		'Estado',
	];
	const tableData: DataTableInterface[] = [];

	CRUD.allCards?.map((item: any) => {
		tableData.push({
			rowId: item?.id,
			payload: {
				'No. Tarjeta': formatCardNumber(item?.address),
				'No. Cuenta': formatCardNumber(item?.account?.address),
				Titular: item?.holderName ?? '-',
				Categoría: item?.category?.name ?? '-',
				Entidad: item?.account?.issueEntity?.name ?? '-',
				Estado: <StatusForCard currentState={item.isDelivered} />,
			},
		});
	});

	const close = () => setRequestToDeliver(false);

	const rowAction = (id: number) => {
		const request = CRUD.allCards?.find((elem: any) => elem.id === id);
		setRequestToDeliver(request);
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
					filterCode: 'createdFrom',
					name: 'Desde',
				},
				{
					isUnitlToday: true,
					filterCode: 'createdTo',
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
			filterCode: 'categoryId',
			name: 'Categoría',
			asyncData: {
				url: `/entity/3/categories`,
				idCode: 'id',
				dataCode: ['name'],
			},
		},
	];

	const filterAction = (data: any) => {
		data
			? setFilter({ ...data, isDelivered: 'false' })
			: setFilter({ page: 1, isDelivered: 'false' });
	};

	//------------------------------------------------------------------------------------

	return (
		<div>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={CRUD.isLoading}
				rowAction={rowAction}
				filterComponent={{ availableFilters, filterAction }}
				paginateComponent={
					<Paginate
						action={(page: number) => setFilter({ ...filter, page })}
						data={CRUD.paginate}
					/>
				}
			/>

			{!!requestToDeliver && (
				<Modal state={!!requestToDeliver} close={close}>
					<DeliveryCardModal
						card={requestToDeliver}
						close={close}
						CRUD={CRUD}
					/>
				</Modal>
			)}
		</div>
	);
};

export default PendingDelivery;

interface UserWizzardInterface {
	card: any;
	close: Function;
	CRUD: any;
}

const DeliveryCardModal = ({ card, close, CRUD }: UserWizzardInterface) => {
	const { control, handleSubmit } = useForm<Record<string, string | number>>();

	const onSubmit: SubmitHandler<Record<string, string | number | null>> = (
		dataToSubmit,
	) => {
		CRUD.deliverCard(card.id, dataToSubmit, close);
	};

	const { address } = card;
	const inFormat =
		address.substring(0, 4) +
		'-' +
		address.substring(4, 8) +
		'-' +
		address.substring(8);

	const [rechargeModal, setRechargeModal] = useState(false);

	return (
		<>
			<p className='mb-4 font-semibold text-lg'>Información de la tarjeta</p>
			<form onSubmit={handleSubmit(onSubmit)}>
				<div className='flex flex-col gap-4'>
					<div className='inline-flex gap-3 items-center py-3'>
						<dt className='text-sm font-medium text-gray-900'>Código:</dt>
						<dd className='mt-1 text-sm leading-6 text-gray-700 sm:mt-0'>
							{inFormat}
						</dd>
					</div>

					<div className='inline-flex gap-3 items-center py-3'>
						<dt className='text-sm font-medium text-gray-900'>Categoría:</dt>
						<dd className='mt-1 text-sm leading-6 text-gray-700 sm:mt-0'>
							{card?.category?.name ?? '-'}
						</dd>
					</div>

					{!card.account.owner ? (
						<>
							<AsyncComboBox
								rules={{ required: 'Campo requerido' }}
								name='ownerId'
								normalizeData={{ id: 'id', name: 'fullName' }}
								control={control}
								label='Asignar propietario de cuenta'
								dataQuery={{ url: '/user' }}
							/>
						</>
					) : (
						<>
							<div className='inline-flex gap-3 items-center py-3'>
								<dt className='text-sm font-medium text-gray-900'>
									Propietario de la cuenta:
								</dt>
								<dd className='mt-1 text-sm leading-6 text-gray-700 sm:mt-0'>
									{card?.account?.owner?.fullName ?? '-'}
								</dd>
							</div>
						</>
					)}
					<div className='inline-flex gap-3 items-center py-3'>
						<dt className='text-sm font-medium text-gray-900'>
							Titular de la tarjeta:
						</dt>
						<dd className='mt-1 text-sm leading-6 text-gray-700 sm:mt-0'>
							{card?.holderName ?? '-'}
						</dd>
					</div>

					<div className='inline-flex gap-3 items-center py-3'>
						<dt className='text-sm font-medium text-gray-900'>
							Fecha de emisión:
						</dt>
						<dd className='mt-1 text-sm leading-6 text-gray-700 sm:mt-0'>
							{moment(card?.emitedAt).format('DD/MM/YYYY') ?? '-'}
						</dd>
					</div>
					<div className='grid grid-cols-2 gap-2'>
						{!!card.account.owner ? (
							<Button
								name='Recargar'
								color='indigo-600'
								textColor='indigo-600'
								action={()=>setRechargeModal(true)}
								outline
							/>
						) : (
							<div></div>
						)}
						<Button
							name='Entregar tarjeta'
							color='indigo-600'
							type='submit'
							loading={CRUD.isFetching}
							full
						/>
					</div>
				</div>
				{rechargeModal && (
					<Modal state={rechargeModal} close={setRechargeModal}>
						<ChargeCardAccount
							cardAddress={card.address}
							close={() => setRechargeModal(false)}
						/>
					</Modal>
				)}
			</form>
		</>
	);
};
