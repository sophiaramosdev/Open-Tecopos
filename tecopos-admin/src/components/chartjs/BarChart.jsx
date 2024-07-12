import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function BarChart(props) {
  const { scores, max, backgroundColor, borderColor } = props;
  const labels = [
    "Total de Ingresos",
    "Total de Ventas",
    "Total de Tax",
    "Total de Propinas",
  ];
  const options = {
    fill: true,
    scales: {
      y: {
        min: 0,
        max: max,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const data = useMemo(function () {
    return {
      datasets: [
        {
          label: "Ingreso por ciclo económico",
          tension: 0.3,
          data: scores,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 1,
        },
      ],
      labels,
    };
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-5 sm:mx-10 lg:px-8 flex-1 mt-10">
        <Bar data={data} options={options} />
      </div>
    </>
  );
}
