import { useEffect } from 'react';
import StatusComponent from '../containers/dashBoard/StatusComponent';
import { BarAccount } from '../utils/chart/BarAccount';
import useServerAnalitics from '../api/useServerAnalitics';
import { DoughnutCard } from '../utils/chart/DoughutCard';
import SpinnerLoading from '../components/misc/SpinnerLoading';
import Chart from 'react-apexcharts';
import HBar, { ChartDataInterface } from '../components/charts/HBar';
import { translateCardRequestType } from '../utils/translateCardStatus';
import { translateCardRequestStatus } from '../utils/translate';

const Dashboard = () => {
	const { getDashboardData, dashboardData, isLoading } = useServerAnalitics();

	useEffect(() => {
		getDashboardData();
	}, []);

	const stats = [
		{
			name: 'Entidades emisoras',
			stat: dashboardData?.issueEntitiesTotal,
		},
		{
			name: 'Usuarios registrados',
			stat: dashboardData?.usersRegisteredTotal,
		},
		{
			name: 'Cuentas emitidas',
			stat: dashboardData?.accountsTotal,
		},
		{
			name: 'Tarjetas impresas',
			stat: dashboardData?.cardsPrinted,
		},
		{
			name: 'Puntos en circulación',
			stat: dashboardData?.totalAmountInAccounts,
		},
	];

	const cardRequestData: ChartDataInterface[] =
		dashboardData?.requestStatus.map((item, idx) => ({
			label: translateCardRequestStatus(item.status),
			value: Number(item.count),
		})) ?? [];

	return isLoading ? (
		<SpinnerLoading text='Cargando información, por favor espere ...' />
	) : (
		<div>
			<StatusComponent data={stats} />

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5'>
				<HBar data={cardRequestData} />
			</div>
		</div>
	);
};

export default Dashboard;
