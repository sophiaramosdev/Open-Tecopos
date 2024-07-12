import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);


interface BarCharProps{
    title?:string; 
    name:string;
    xlabels?:string[];
    dataShow?:number[];  
}

export default function BarChar({name, xlabels, dataShow, title}:BarCharProps) {
  const data = {
    labels:xlabels,
    datasets: [
      {
        label: name,
        data: dataShow,
        backgroundColor: "#ffa600",
      },
    ],    
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: title ? true : false,
        text: title,
      },
    },
      
  };

  return <Bar options={options} data={data} />;
}


