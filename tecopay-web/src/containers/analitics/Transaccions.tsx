import GenericTable, {
	DataTableInterface,
	FilterOpts,
} from '../../components/misc/GenericTable';

import './analitics.css';
import Paginate from '../../components/misc/Paginate';

import Breadcrumb, {
	type PathInterface,
} from '../../components/navigation/Breadcrumb';
import { useEffect, useState } from 'react';
import moment from 'moment';

import { formatCardNumber } from '../../utils/helpers';
import { ChartBarOutline, FilterOutline } from 'heroicons-react';
import useServerAnalitics from '../../api/useServerAnalitics';
import { SelectInterface } from '../../interfaces/localInterfaces';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { Operations } from '../../interfaces/serverInterfaces';

const Transaccions = () => {
	const CRUD_origin = useServerAnalitics();
	type CRUD = { id?: number } & typeof CRUD_origin;
	let CRUD: CRUD = CRUD_origin;

	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});

	useEffect(() => {
		CRUD.getAllOperations(filter);
		CRUD.getAllPayment(filter);
		CRUD.getAllDeposit(filter);
		CRUD.getAllTransactions(filter);
	}, [filter]);

	const [finalData, setFinalData] = useState([...CRUD.allOperations]);

	const [finalOption, setFinalOption] = useState([...CRUD.allOperations]);

	useEffect(() => {
		setFinalData([...CRUD.allOperations]);
	}, [CRUD.allOperations]);

	// Data for table ------------------------------------------------------------------------
	const tableTitles = [
		'Código',
		'Fecha',
		'Entidad',
		'Tipo',
		'Cuenta/Tarjeta',
		'Monto',
	];
	const tableData: DataTableInterface[] = [];

	function filterProcessor(value: { search: string | undefined }) {
		let final_data = [...CRUD.allOperations];
		if (labelFilter.includes('entidad')) {
			if (value?.search && typeof value?.search === 'string') {
				const searchStringLowercase = value?.search.toLowerCase();
				final_data = final_data.filter((object: Operations) => {
					if (object.sourceAccount) {
						const objectNameLowercase =
							object.sourceAccount.issueEntity.name.toLowerCase();
						return objectNameLowercase.includes(searchStringLowercase);
					}
				});
			}
		} else {
			if (value?.search) {
				const searchStringLowercase = value?.search.toLowerCase();
				final_data = final_data.filter((object: Operations) => {
					if (object.sourceAccount) {
						const objectNameLowercase = object.sourceAccount.address;
						return objectNameLowercase.includes(searchStringLowercase);
					}
				});
			}
		}

		setFinalData(final_data);
	}


	finalData.map((item: any) => {
		tableData.push({
			rowId: item.transactionNumber,
			payload: {
				Código: item?.transactionNumber,
				//Descripción: item?.description ?? '-',
				Fecha: moment(item.createdAt).format('DD/MM/YYYY h:mm:ssA'),
				Entidad: item.sourceAccount ? item.sourceAccount.issueEntity.name : '_',
				Tipo:
					item.type === 'PAYMENT'
						? 'Pago'
						: item.type === 'DEPOSIT'
							? 'Recarga'
							: 'Transferencia',
				Monto: item.amountTransferred,
				'Cuenta/Tarjeta': item.sourceAccount
					? formatCardNumber(item.sourceAccount.address)
					: '_',
			},
		});
	});

	const actions = [
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Ver Total',
			action: () => {
				setFinalData([...CRUD.allOperations]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Ver Transacciones',
			action: () => {
				setFinalData([...CRUD.allTransations]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Ver Pagos',
			action: () => {
				setFinalData([...CRUD.allPayment]);
			},
		},
		{
			icon: <FilterOutline className='h-5' />,
			title: 'Ver Recargas',
			action: () => {
				setFinalData([...CRUD.allDeposit]);
			},
		},
	];

	// Breadcrumb-----------------------------------------------------------------------------------
	const paths: PathInterface[] = [
		{
			name: 'Transacciones',
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
	];

	const filterAction = (data: SelectInterface) => {
		data ? setFilter({ ...data }) : setFilter({});
	};
	const [mostrarBotones, setMostrarBotones] = useState(false);
	const [labelFilter, setlabelFilter] = useState('Buscar por cuentas');

	const handleBotonWeekClick = () => {
		setMostrarBotones(false);
		setlabelFilter('Buscar por entidad');
	};
	const handleBotonDiaryClick = () => {
		setMostrarBotones(false);
		setlabelFilter('Buscar por cuentas ');
	};

	const handleShowBtn = () => {
		setMostrarBotones(!mostrarBotones);
	};

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
						<h1 className='font-medium'>Total </h1>
						<h1 className='font-semibold'>{CRUD.totalOpe}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Recargas </h1>
						<h1 className='font-semibold'>{CRUD.totalDeposit}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Pagos </h1>
						<h1 className='font-semibold'>{CRUD.totalPay}</h1>
					</div>
					<div className='divTitle'>
						<h1 className='font-sans'>Transferencias </h1>
						<h1 className='font-semibold'>{CRUD.totalTransaction}</h1>
					</div>
				</div>
				<div className='divCol2'>
					<div>
						<div>
							<div className='div-filter'>
								<button onClick={handleShowBtn} className='btn-filter'>
									{labelFilter}
									<ChevronRightIcon width={25} height={25} />
								</button>
								{mostrarBotones && (
									<div>
										<div className='btnModal'>
											<button
												onClick={handleBotonDiaryClick}
												className=' buttonAccount'
											>
												cuentas
											</button>
											<button onClick={handleBotonWeekClick} className='ml-2'>
												entidad
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
					<GenericTable
						tableData={tableData}
						tableTitles={tableTitles}
						loading={CRUD.isLoading}
						filterComponent={{ availableFilters, filterAction }}
						searching={{
							action: (value: string) => filterProcessor({ search: value }),
							placeholder: labelFilter.includes('entidad')
								? 'Buscar por entidad'
								: 'Buscar por # de cuenta',
						}}
						actions={actions}
						//	rowAction={rowAction}
						// filterComponent={{ availableFilters, filterAction }}
						paginateComponent={
							<Paginate
								action={(page: number) => {
									setFilter({ ...filter, page });
								}}
								data={CRUD.paginate}
							/>
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default Transaccions;
