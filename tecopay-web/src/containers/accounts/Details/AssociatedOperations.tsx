import { useEffect, useState } from 'react';
import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../../components/misc/GenericTable';
import { formatCalendar } from '../../../utils/helpersAdmin';
import { translateOperationType } from '../../../utils/translateOperations';
import Paginate from '../../../components/misc/Paginate';
import {
	AccountOperations,
	PaginateInterface,
} from '../../../interfaces/serverInterfaces';
import { generateUrlParams } from '../../../utils/helpers';
import { useParams } from 'react-router-dom';
import moment from 'moment';

interface OperationsViewInterface {
	operations: AccountOperations[];
	getAccountOperations: Function;
	paginate: PaginateInterface;
	isFetching: boolean;
}

const AssociatedOperations = ({
	operations,
	getAccountOperations,
	isFetching,
	paginate,
}: OperationsViewInterface) => {
	const { accountId: id } = useParams();

	const [filter, setFilter] = useState<Record<
		string,
		string | number | boolean | null
	> | null>(null);

	useEffect(() => {
		if (filter) {
			console.log('render');
			getAccountOperations(
				`/account/${id}/operations${generateUrlParams(filter)}`,
			);
		}
	}, [filter]);

	// Data for table ------------------------------------------------------------------------
	const tableTitles = [
		'Fecha',
		'Tipo de Operación',
		'Monto',
		'Hecho por',
		'Descripción',
	];

	const tableData: DataTableInterface[] = [];
	operations?.map((item) => {
		tableData.push({
			rowId: item.id,
			payload: {
				Fecha: moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA'),
				'Tipo de Operación': translateOperationType(item?.operation ?? '-'),
				Monto: item?.amount ?? '-',
				'Hecho por': item?.madeBy.fullName ?? '-',
				Descripción: item?.description,
			},
		});
	});

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
			filterCode: 'ownerId',
			name: 'Propietario',
			asyncData: {
				url: '/user',
				idCode: 'id',
				dataCode: ['username'],
			},
		},
		{
			format: 'select',
			filterCode: 'operation',
			name: 'Operación',
			data: [
				{ id: 'DEBIT', name: 'Débito' },
				{ id: 'CREDIT', name: 'Crédito' },
			],
		},
		{
			format: 'select',
			filterCode: 'cardAddress',
			name: 'Tarjeta',
			asyncData: {
				url: `/card`,
				defaultParams: { accountId: id! },
				idCode: 'address',
				dataCode: ['address'],
			},
		},
	];

	const filterAction = (data: any) => {
		data
			? setFilter({ ...data, accountId: id })
			: setFilter({ page: 1, accountId: id! });
	};

	//---------------------------------------------------------------------------------------

	return (
		<>
			<GenericTable
				tableData={tableData}
				tableTitles={tableTitles}
				filterComponent={{ availableFilters, filterAction }}
				paginateComponent={
					<Paginate
						action={(page: number) => {
							setFilter({ ...filter, page });
						}}
						data={paginate}
					/>
				}
				loading={isFetching}
			/>
		</>
	);
};

export default AssociatedOperations;
