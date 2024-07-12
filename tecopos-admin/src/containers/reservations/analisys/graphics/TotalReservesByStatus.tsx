import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

const TotalReservesByStatus = () => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <CurrencyDollarIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Total de reservas por estado</p>
      </div>
      <Chart options={{
        labels: ['Creada', 'Confirmada', 'Cancelada','Reprogramada']
      }} series={[44, 55 , 40,10]} type="donut" width="380" />

    </div>
  )
}

export default TotalReservesByStatus
