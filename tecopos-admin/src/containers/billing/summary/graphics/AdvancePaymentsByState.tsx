import Chart from "react-apexcharts";
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { PrepaidByStatusInterface } from "../../../../interfaces/ServerInterfaces";

const AdvancePaymentsByState = ({prepaidByStatus}: {prepaidByStatus: PrepaidByStatusInterface}) => {
  
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <DocumentDuplicateIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Pagos Anticipados por estado</p>
      </div>
      <Chart options={{
        labels: ['Creado', 'Reembolsado', 'Cobrado']
      }} series={[44, 55, 33]} type="donut" width="380" />

    </div>
  )
}

export default AdvancePaymentsByState
