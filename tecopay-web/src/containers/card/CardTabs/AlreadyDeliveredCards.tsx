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
import GenericList from '../../../components/misc/GenericList';
import { formatCalendar } from '../../../utils/helpersAdmin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard } from '@fortawesome/free-solid-svg-icons';
import Button from '../../../components/misc/Button';
import { useForm, SubmitHandler } from 'react-hook-form';
import Input from '../../../components/forms/Input';
import { toast } from 'react-toastify';
import moment from 'moment';
import ChargeCardAccount from './ChargeCardAccount';

const Card = () => {
	const CRUD = useServerCards();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});
	const [requestToPrint, setRequestToPrint] = useState<{
		state: boolean;
		id: number;
	}>({ state: false, id: 0 });

	useEffect(() => {
		CRUD.getAllCards({ isDelivered: 'true', ...filter });
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

	CRUD?.allCards?.map((item: any) => {
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

	const close = () => setRequestToPrint({ state: false, id: 0 });

	const rowAction = (id: number) => {
		setRequestToPrint({ state: true, id });
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
			? setFilter({ ...data, isDelivered: 'true' })
			: setFilter({ page: 1, isDelivered: 'true' });
	};

	//---------------------------------------------------------------------------------------

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

			{requestToPrint.state && (
				<Modal state={requestToPrint.state} close={close} size='m'>
					<EditCardContainer
						id={requestToPrint.id}
						allCards={CRUD?.allCards}
						CRUD={CRUD}
					/>
				</Modal>
			)}
		</div>
	);
};

export default Card;

interface UserWizzardInterface {
	id: number;
	allCards: any;
	CRUD: any;
}

const EditCardContainer = ({ id, allCards, CRUD }: UserWizzardInterface) => {
	const [resetPinModal, setResetPinModal] = useState<{
		state: boolean;
	}>({ state: false });

	const [rechargeModal, setRechargeModal] = useState(false);

	const closePIN = () => setResetPinModal({ state: false });

	const desiredObject: any = allCards?.find((item: any) => item.id === id);

	return (
		<>
			<GenericList
				header={{
					title: `Detalles de tarjeta ${
						formatCardNumber(desiredObject?.address) ?? '-'
					}`,
				}}
				body={{
					'No. Tarjeta': formatCardNumber(desiredObject?.address) ?? '-',
					Titular: desiredObject?.holderName ?? '-',
					Entidad: desiredObject?.account?.issueEntity?.name ?? '-',
					Categoría: desiredObject?.category?.name ?? '-',
					'Fecha de emisión':
						moment(desiredObject?.emitedAt).format('DD/MM/YYYY h:mm A') ??
						'-',
					'Fecha de expiración':
						moment(desiredObject?.expiratedAt).format('DD/MM/YYYY h:mm A') ??
						'-',
				}}
			/>

			<div className='grid grid-cols-2 gap-2 pt-5'>
				<Button
					name='Recargar cuenta'
					color='indigo-600'
					textColor='indigo-600'
					action={() => setRechargeModal(true)}
					outline
				/>
				<Button
					color={'indigo-600'}
					action={() => {
						setResetPinModal({ state: true });
					}}
					name='Resetear PIN'
					textColor='white'
					full
				/>
			</div>

			{resetPinModal.state && (
				<Modal state={resetPinModal.state} close={closePIN}>
					<ResetPinModal
						address={desiredObject?.address}
						close={closePIN}
						updatePIN={CRUD.updatePIN}
					/>
				</Modal>
			)}

			{rechargeModal && (
				<Modal state={rechargeModal} close={setRechargeModal}>
					<ChargeCardAccount
						cardAddress={desiredObject.address}
						close={() => setRechargeModal(false)}
					/>
				</Modal>
			)}
		</>
	);
};

const ResetPinModal = ({ address, close, updatePIN }: any) => {
	const { control, handleSubmit, watch } = useForm<any>();
	const password = watch('password', '');
	const repeatedPassword = watch('repeatedPassword', '');

	const validatePasswordMatch = (value: any) => {
		if (password !== repeatedPassword) {
			return 'Las contraseñas no coinciden';
		}
		return true;
	};

	const onSubmitPIN: SubmitHandler<Record<string, string | number | null>> = (
		dataToSubmit,
	) => {
		if (dataToSubmit.password !== dataToSubmit.repeatedPassword) {
			toast.error('Los valores introducidos no coinciden');
			return;
		}
		updatePIN(address, password, close);
	};
	return (
		<form onSubmit={handleSubmit(onSubmitPIN)}>
			<p className='mb-4 font-semibold text-lg'>Resetear PIN</p>
			<div className='flex flex-col gap-4'>
				<div className='flex flex-col gap-y-6'>
					<Input
						control={control}
						name='password'
						label='Nuevo PIN'
						textAsNumber
						rules={{
							required: 'Campo requerido',
							validate: (value: string) => {
								if (value.length === 4) return true;
								return "* El PIN debe tener 4 caracteres";
							},
						}}
					/>
					<Input
						control={control}
						name='repeatedPassword'
						textAsNumber
						label='Repita nuevo PIN'
						rules={{
							required: 'Campo requerido',
							validate: (value: string) => {
								if (value !== watch('password')) return "Los números no coinciden";
								return true;
							},
						}}
					/>
					<div className='my-2.5'>
						<Button
							name='Resetear'
							color='slate-600'
							type='submit'
							//loading={CRUD.isFetching}
						/>
					</div>
				</div>
			</div>
		</form>
	);
};
