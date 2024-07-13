import Chart from 'react-apexcharts';
export interface ChartDataInterface {
	label: string;
	value: number;
}

interface ChartComponentInterface {
	data: ChartDataInterface[];
	title?: string;
}

const HBar = ({ data, title }: ChartComponentInterface) => {
	const values: number[] = [];
	const labels: string[] = [];
	data.forEach((elem) => {
		values.push(elem.value);
		labels.push(elem.label);
	});
	return (
		<div className=''>
			<Chart
				type='bar'
				series={[
					{
						data: values,
   					},
				]}
				options={{
            			title: {
						text: title,
						align: 'center',
						offsetY: 15,
						style: { fontFamily: 'Verdana,sans-serif', color: '#808080' },
					},
					chart: {
						type: 'bar',
					},
					plotOptions: {
						bar: {
							borderRadius: 4,
							horizontal: true,
						},
					},
					dataLabels: {
						enabled: true,
					},
					noData: {
						text: 'Sin datos que mostrar',
						align: 'center',
						verticalAlign: 'middle',
						offsetX: 50,						
					},
					xaxis: {
						categories: labels,
						
					},
				}}
			/>
		</div>
	);
};

export default HBar;
