import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

const TotalReservesByProducts = () => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <CurrencyDollarIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Total de reservas por producto</p>
      </div>
      <Chart options={{
        labels: ['Producto A', 'Producto B', 'Producto C']
      }} series={[44, 55 , 40]} type="donut" width="380" />

    </div>
  )
}

export default TotalReservesByProducts
