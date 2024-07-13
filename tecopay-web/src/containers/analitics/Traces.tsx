import './analitics.css';
import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../components/misc/GenericTable';

import Paginate from '../../components/misc/Paginate';

import Breadcrumb, {
	type PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useEffect, useState } from 'react';

import { ChartBarOutline, FilterOutline } from 'heroicons-react';

import useServerAnalitics from '../../api/useServerAnalitics';

import moment from 'moment';

import { RequestRecord } from '../../interfaces/serverInterfaces';
import StatusBadge from '../../components/misc/badges/StatusBadge';

const Traces = () => {
	const CRUD_origin = useServerAnalitics();
	type CRUD = { id?: number } & typeof CRUD_origin;
	let CRUD: CRUD = CRUD_origin;

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});

	const [finalData, setfinalData] = useState([...CRUD.allRequest]);

	useEffect(() => {
		setfinalData([...CRUD.allRequest]);
	}, [CRUD.allRequest]);

	useEffect(() => {
		CRUD.getAllAccountRecord(filter);
		CRUD.getAllRequest(filter);
		CRUD.getAllRequestCreated(filter);
		CRUD.getAllRequestModified(filter);
		CRUD.getAllRequestClosed(filter);
		CRUD.getAllRequestCanceled(filter);
		CRUD.getAllRequestDenied(filter);
	}, [filter]);

	// Data for table ------------------------------------------------------------------------

	const tableData: DataTableInterface[] = [];
	const tableTitles = ['Fecha', 'Entidad', 'Descripción', 'Nombre', 'Status'];
	function filterProcessor(value: { search: string | undefined }) {
		let final_data = [...CRUD.allRequest];

		if (value?.search && typeof value?.search === 'string') {
			const searchStringLowercase = value?.search.toLowerCase();
			final_data = final_data.filter((object: RequestRecord) => {
				if (object.issuedBy) {
					const objectNameLowercase = object.issuedBy.fullName.toLowerCase();
					return objectNameLowercase.includes(searchStringLowercase);
				}
			});
		}

		setfinalData(final_data);
	}

	finalData.map((item: RequestRecord) => {
		tableData.push({
			payload: {
				Fecha: moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA'),
				Entidad: item.request.issueEntity.name,
				Descripción: item.description,
				Nombre: item.issuedBy.fullName,
				Status: <StatusBadge status={item.status} />,
			},
		});
	});
	const actions = [
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Total de Solicitudes',
			action: () => {
				setfinalData([...CRUD.allRequest]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Solicitudes Creadas',
			action: () => {
				setfinalData([...CRUD.allRequestCreated]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Solicitudes Canceladas',
			action: () => {
				setfinalData([...CRUD.allRequestCanceled]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Solicitudes Cerradas',
			action: () => {
				setfinalData([...CRUD.allRequestClose]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Solicitudes Modificadas',
			action: () => {
				setfinalData([...CRUD.allRequestModifiied]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Solicitudes Denegadas',
			action: () => {
				setfinalData([...CRUD.allRequestDenied]);
			},
		},
	];

	// Breadcrumb-----------------------------------------------------------------------------------
	const paths: PathInterface[] = [
		{
			name: 'Trazas',
		},
	];
	// ------------------------------------------------------------------------------------

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
			filterCode: 'issueEntityId',
			name: 'Entidad',
			asyncData: {
				url: '/entity',
				idCode: 'id',
				dataCode: ['name'],
			},
		},
	];

	const filterAction = (data: any) => {
		data ? setFilter({ ...data }) : setFilter({});
	};

	//--------

	return (
		<div>
			<Breadcrumb
				icon={<ChartBarOutline className='h-6 text-gray-500' />}
				paths={paths}
			/>
			<div className='divHeader'>
				<div className='divCol1'>
					<h1 className=' font-bold , text-center'>Acciones</h1>

					<div className='divTitle'>
						<h1 className='font-sans'>Cuentas</h1>
						<h1 className='font-semibold'>{CRUD.totalAccount}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes de tarjeta </h1>
						<h1 className='font-semibold'>{CRUD.totalRequest}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes creadas</h1>
						<h1 className='font-semibold'>{CRUD.totalRequestCreated}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes cerradas</h1>
						<h1 className='font-semibold'>{CRUD.totalRequestClose}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes denegadas</h1>
						<h1 className='font-semibold'>{CRUD.totalRequestDenied}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes canceladas</h1>
						<h1 className='font-semibold'>{CRUD.totalRequestCanceled}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Solicitudes Modificadas</h1>
						<h1 className='font-semibold'>{CRUD.totalRequestModified}</h1>
					</div>
				</div>
				<div className='divCol2'>
					<GenericTable
						tableData={tableData}
						tableTitles={tableTitles}
						loading={CRUD?.isLoading}
						filterComponent={{ availableFilters, filterAction }}
						searching={{
							action: (value: string) => filterProcessor({ search: value }),
							placeholder: 'Buscar por nombre',
						}}
						actions={actions}
						paginateComponent={
							<Paginate
								action={(page: number) => {
									setFilter({ ...filter, page });
								}}
								data={CRUD.paginateRequest}
							/>
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default Traces;
