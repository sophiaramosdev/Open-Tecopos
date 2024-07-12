import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

const PaymentsbyMethod = ({ordersByPaymentWay}: {ordersByPaymentWay: { [way: string]: number }}) => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <CurrencyDollarIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Pagos por métodos</p>
      </div>
      <Chart options={{
        labels: ['Efectivo', 'Transferencia', 'TropiPay']
      }} series={[ordersByPaymentWay?.CASH ?? 0, ordersByPaymentWay?.TRANSFER ?? 0, ordersByPaymentWay?.TROPIPAY ?? 0]} type="donut" width="380" />

    </div>
  )
}

export default PaymentsbyMethod
