import { UserCircleIcon } from '@heroicons/react/24/outline';
import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../components/misc/GenericTable';
import Paginate from '../../components/misc/Paginate';
import Breadcrumb, {
	type PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCalendar, formatCardNumber } from '../../utils/helpers';
import useServerAccounts from '../../api/userServerAccounts';
import moment from 'moment';

const Accounts = () => {
	const { getAllAccounts, allAccounts, isLoading, paginate } =
		useServerAccounts();

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({ page: 1 });

	useEffect(() => {
		getAllAccounts(filter);
	}, [filter]);

	const navigate = useNavigate();

	// Breadcrumb-------------------------------------------

	const paths: PathInterface[] = [
		{
			name: 'Cuentas',
		},
	];

	// Data for table ----------------------------------------

	const tableTitles = [
		'No. Cuenta',
		'Saldo',
		'Propietario',
		'Fecha de Activación',
		'Entidad',
		'Negocio',
	];

	type filterAccounts = {
		business?: number;
		entities?: number;
		owner?: number;
		dateFrom?: string;
		dateTo?: string;
		accountAddress?: string;
	};

	const tableData: DataTableInterface[] = [];
	allAccounts?.map((item) => {
		tableData.push({
			rowId: item.id,
			payload: {
				'Fecha de Activación': moment(item.createdAt).format(
					'DD/MM/YYYY h:mm:ssA',
				),
				'No. Cuenta': formatCardNumber(item.address),
				Saldo: item?.amount,
				'Número de Cuenta': formatCardNumber(item?.address),
				Nombre: item?.name,
				Propietario: item?.owner?.fullName ?? '-',
				Entidad: item?.issueEntity?.name,
				Negocio: item?.issueEntity?.business?.name ?? '-',
			},
		});
	});

	const rowAction = (id: number) => {
		navigate(`${id}`);
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
			filterCode: 'ownerId',
			name: 'Propietario',
			asyncData: {
				url: '/user',
				idCode: 'id',
				dataCode: ['username'],
			},
		},
	];

	const filterAction = (data: filterAccounts) => {
		data ? setFilter({ ...data }) : setFilter({ page: 1 });
	};

	//---------------------------------------------------------------------------------------

	return (
		<div>
			<Breadcrumb
				icon={<UserCircleIcon className='h-6 text-gray-500' />}
				paths={paths}
			/>

			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				loading={isLoading}
				rowAction={rowAction}
				searching={{
					action: (value: string) =>
						filterAction({ ...filter, accountAddress: value }),
					placeholder: 'Buscar Cuenta',
				}}
				filterComponent={{ availableFilters, filterAction }}
				paginateComponent={
					<Paginate
						action={(page: number) => {
							setFilter({ ...filter, page });
						}}
						data={paginate}
					/>
				}
			/>
		</div>
	);
};

export default Accounts;
