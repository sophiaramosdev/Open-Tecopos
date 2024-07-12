import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

const TotalAmountBreakdown = () => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <CurrencyDollarIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Desglose de importe total</p>
      </div>
      <Chart options={{
        labels: ['Pagado', 'Importe']
      }} series={[44, 55]} type="donut" width="380" />

    </div>
  )
}

export default TotalAmountBreakdown
