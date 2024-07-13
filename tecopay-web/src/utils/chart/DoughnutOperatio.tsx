import { useEffect, useState } from 'react';
import useServerAnalitics from '../../api/useServerAnalitics';
import '../../utils/chart/barChart.css';

import Chart from 'react-apexcharts';

export const DoughnutOperatio = () => {
	const [filter, setFilter] = useState<
		Record<string, string | number | boolean | null>
	>({});

	const {
		totalTransaction,
		totalPay,
		totalDeposit,
		getAllPayment,
		getAllDeposit,
		getAllTransactions,
	} = useServerAnalitics();

	useEffect(() => {
		getAllTransactions(filter);
		getAllDeposit(filter);
		getAllPayment(filter);
	}, [filter]);

	const data = [
		{ name: 'Recargas', value: totalDeposit },
		{ name: 'Pagos', value: totalPay },
		{ name: 'Transferencias', value: totalTransaction },
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
		labels: data.map((item: any) => item.name),

		colors: data.map(() => getRandomColor()),
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
							label: 'Total de operaciones',
						},
					},
				},
			},
		},
	};
	const series = data.map((i: any) => i.value);
	return (
		<div className='doughnutChart'>
			<h1 className='titleChart'>Tipo de operaciones</h1>
			<Chart
				//@ts-ignore
				options={options}
				series={series}
				type='donut'
				width='460'
				height={420}
			/>
		</div>
	);
};
