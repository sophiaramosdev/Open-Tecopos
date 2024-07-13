import { useEffect, useState } from 'react';
import useServerAnalitics from '../../api/useServerAnalitics';

import Chart from 'react-apexcharts';
import useServerDashboard from '../../api/useServerDashboard';
import SpinnerLoading from '../../components/misc/SpinnerLoading';

export interface DataDashboard {
	issueEntitiesTotal: number;
	usersRegisteredTotal: number;
	accountsTotal: number;
	accountsByEntity: number;
	totalAmountInAccounts: number;
	cardsPrinted: number;
	accountOperations: number;
	cardRequests: number;
	totalTransactions: totalTransaction[];
	totalTransactionsByEntity: {};
	requestStatus: requestStatus[];
}
export interface totalTransaction {
	type: string;
	count: string;
}
export interface requestStatus {
	status: string;
	count: string;
}

export const DoughnutCard = () => {

	const { getTraces, traces, isLoading, getDasboardRequest, requestStatus } =
		useServerDashboard();

	useEffect(() => {
		getDasboardRequest();
		getTraces();
	}, []);

	const dataTEST = [
		{
			status: 'Solicitadas',
			count:
				traces.requestStatus && traces.requestStatus[0]
					? parseInt(traces.requestStatus[0].count)
					: 0,
		},
		{
			status: 'Aceptadas',
			count:
				traces.requestStatus && traces.requestStatus[1]
					? parseInt(traces.requestStatus[1].count)
					: 0,
		},
		{
			status: 'Impresas',
			count:
				traces.requestStatus && traces.requestStatus[2]
					? parseInt(traces.requestStatus[2].count)
					: 0,
		},
	];

	// Generar colores aleatorios para cada banco
	const getRandomColor = () => {
		const letters = '0123456789ABCDEF';
		let color = '#';
		do {
			color = '#';
			for (let i = 0; i < 6; i++) {
				color += letters[Math.floor(Math.random() * 16)];
			}
		} while (color === '#FFFFFF' || color === '#000000');
		return color;
	};

	const options = {
		labels: dataTEST.map((item: any) => item.status),

		colors: dataTEST.map(() => getRandomColor()),
		legend: {
			position: 'bottom',
		},

		plotOptions: {
			pie: {
				donut: {
					labels: {
						show: true,
						total: {
							show: true,
							label: 'Total de solicitudes',
						},
					},
				},
			},
		},
	};
	const series = dataTEST.map((i: any) => i.count);

	if (isLoading) {
		<SpinnerLoading />;
	}

	return (
		<div className='doughnutChart'>
			<h1 className='titleChart'>Total de solicitudes de tarjetas</h1>
			<Chart
				//@ts-ignore
				options={options}
				series={series}
				type='donut'
				width={window.screen.width * 0.3}
			/>
		</div>
	);
};
