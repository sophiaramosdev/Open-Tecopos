import React, { useEffect } from 'react';
import Chart from 'react-apexcharts';

import './barChart.css';
import useServerDashboard from '../../api/useServerDashboard';
import SpinnerLoading from '../../components/misc/SpinnerLoading';
import { useAppSelector } from '../../store/hooks';

export const BarAccount = () => {
	const { getTraces, traces, isLoading, getTracesEntity, tracesEntity } =
		useServerDashboard();

	useEffect(() => {
		getTraces();
	}, [traces]);
	const data = [
		{
			name: 'Transacciones',
			operations:
				traces.totalTransactions && traces.totalTransactions[0]
					? parseInt(traces.totalTransactions[0].count)
					: 0,
		},
		{
			name: 'Pagos',
			operations:
				traces.totalTransactions && traces.totalTransactions[1]
					? parseInt(traces.totalTransactions[1].count)
					: 0,
		},
		{
			name: 'Recargas',
			operations:
				traces.totalTransactions && traces.totalTransactions[2]
					? parseInt(traces.totalTransactions[2].count)
					: 0,
		},
	];
	const dataEntity = [
		{
			name: 'Transacciones',
			operations:
				tracesEntity.totalTransactions && tracesEntity.totalTransactions[0]
					? parseInt(tracesEntity.totalTransactions[0].count)
					: 0,
		},
		{
			name: 'Pagos',
			operations:
				tracesEntity.totalTransactions && tracesEntity.totalTransactions[1]
					? parseInt(tracesEntity.totalTransactions[1].count)
					: 0,
		},
		{
			name: 'Recargas',
			operations:
				tracesEntity.totalTransactions && tracesEntity.totalTransactions[2]
					? parseInt(tracesEntity.totalTransactions[2].count)
					: 0,
		},
	];

	const getBarColor = () => {
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
	const colorsBar = data.map(() => getBarColor());
	const optionBar = {
		chart: {
			type: 'bar',
			height: 350,
		},
		plotOptions: {
			bar: {
				horizontal: true,
				distributed: true,
				borderRadius: 4,
			},
		},
		dataLabels: {
			formatter: function (val: any, opt: any) {
				const goals =
					opt.w.config.series[opt.seriesIndex].data[opt.dataPointIndex].goals;

				if (goals && goals.length) {
					return `${val} / ${goals[0].value}`;
				}
				return val;
			},
		},

		xaxis: {
			categories: data.map((i) => i.name),
		},

		legend: {
			position: 'bottom',
		},

		colors: colorsBar,
	};

	const seriesBar = [
		{
			name: 'Total',

			data: data.map((item) => ({
				x: item.name,
				y: item.operations,
			})),
		},
	];

	if (isLoading) {
		<SpinnerLoading />;
	}

	return (
		<div className='barChart'>
			<h1 className='titleChart'>Tipos de Operaciones</h1>
			<Chart
				//@ts-ignore
				options={optionBar}
				series={seriesBar}
				type='bar'
				height={250}
				width={window.screen.width * 0.43}
			/>
		</div>
	);
};
