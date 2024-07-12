import Chart from "react-apexcharts";
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

const PercentOfRegistrationsByState = ({ ordersByResumeType }: { ordersByResumeType: any }) => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <DocumentDuplicateIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">% de Registros por Tipo</p>
      </div>
      <Chart options={{
        labels: ['Factura', 'Pre-Factura', 'Pagos anticipados',]
      }} series={[ordersByResumeType?.facture ?? 0, ordersByResumeType?.prefecture ?? 0, ordersByResumeType?.prepaid ?? 0]} type="donut" width="380" />

    </div>
  )
}

export default PercentOfRegistrationsByState
