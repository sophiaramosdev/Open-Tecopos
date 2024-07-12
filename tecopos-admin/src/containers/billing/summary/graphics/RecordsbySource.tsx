import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

const RecordsbySource = ({ ordersByOrigin }: { ordersByOrigin: { [origin: string]: number } }) => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <CurrencyDollarIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Registros por origen</p>
      </div>
      <Chart options={{
        labels: ['Sitio administrativo', 'Tienda Online', 'Punto de Venta']
      }} series={[
        ordersByOrigin?.admin ?? 0,
        ordersByOrigin?.online ?? 0,
        ordersByOrigin?.pos ?? 0

      ]} type="donut" width="380" />

    </div>
  )
}

export default RecordsbySource
