import React from "react";
import { Chart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart as ChartJS, registerables } from "chart.js";
import { ProductReduced } from "../../../../interfaces/ServerInterfaces";
import { getPercent } from "../../../../utils/helpers";

ChartJS.register(ChartDataLabels, ...registerables);

interface OrderState {
    endProducts?: ProductReduced[];
    totalGoal: number | null;
    produced: number | null;
}

const DetailStateOrder = ({ endProducts, produced, totalGoal }: OrderState) => {
    const labels: string[] = ["Producción Total"];
    const data: { part: number; total: number; percent: number }[] = [
        {
            part: produced ?? 0,
            total: totalGoal ?? 1,
            percent: getPercent(produced ?? 0, totalGoal ?? 1),
        },
    ];
    const colors: string[] = ["rgb(69, 38, 225)"];

    endProducts?.map(item => {
        labels.push(item.name);
        data.push({
            part: item.realProduced,
            total: item.goalQuantity,
            percent: getPercent(item.realProduced, item.goalQuantity),
        });
        colors.push("#858ae8");
    });

    return (
        <div className="flex">
            <Chart
                data={{
                    labels: labels,
                    datasets: [
                        {
                            yAxisID: "y",
                            label: "Estado de Producción",
                            data: data.map(item => item.percent),
                            backgroundColor: colors,
                            datalabels: {
                                color: "white",
                                formatter: (value, ctx) =>
                                    `${data[ctx.dataIndex].part} / ${
                                        data[ctx.dataIndex].total
                                    } (${data[ctx.dataIndex].percent}%)`,
                            },
                        },
                    ],
                }}
                style={{height:30, display:'flex'}}
                type="bar"
                options={{
                    plugins: {
                        datalabels: {
                            display: true
                        },
                    },
                    responsive: true,
                    maintainAspectRatio:true,
                    indexAxis: "y" as const,
                    scales: {
                        x: {
                            max: 100,
                            min: 0,
                        },
                    },
                }}                
            />
        </div>
    );
};

export default DetailStateOrder;
