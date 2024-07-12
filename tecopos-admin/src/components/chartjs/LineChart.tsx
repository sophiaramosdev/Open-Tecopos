import React, { useMemo } from "react";
import { CommonGraphDataInterface } from "../../api/useServerMain";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartInterface {
  scores: CommonGraphDataInterface | null;
  max: number;
}

export default function LineChart({ scores, max }: LineChartInterface) {
  const options = {
    fill: true,
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: max,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
      datalabels: {
        display: false,
      },
    },
  };

  const data = useMemo(
    function () {
      return {
        datasets: [
          {
            label: "Ventas",
            data: scores?.totalSales,
            tension: 0.3,
            borderColor: "rgb(81, 154, 68)",
            pointRadius: 2,
            backgroundColor: "rgb(160, 200, 154,0.3)",
          },
          {
            label: "Costos",
            data: scores?.totalCost,
            tension: 0.3,
            borderColor: "rgb(115, 27, 10)",
            pointRadius: 3,
            backgroundColor: "rgb(209, 44, 10,0.3)",
          },
          {
            label: "Ganancia Bruta",
            data: scores?.grossProfit,
            tension: 0.3,
            borderColor: "rgb(9, 106, 106)",
            pointRadius: 4,
            backgroundColor: "rgb(15, 216, 216,0.3)",
          },
        ],
        labels: scores?.axisLabel,
      };
    },
    [scores]
  );

  return (
    <>
      <div className="max-w-7xl mx-5 sm:mx-10 lg:px-8 flex-1 mt-10">
        <Line data={data} options={options} />
      </div>
    </>
  );
}
