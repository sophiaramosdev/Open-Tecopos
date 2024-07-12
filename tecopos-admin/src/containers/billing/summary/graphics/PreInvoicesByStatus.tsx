import Chart from "react-apexcharts";
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

const PreInvoicesByStatus = () => {
  return (
    <div >
      <div className="w-full flex items-center mb-5">
        <DocumentDuplicateIcon className="h-8 text-gray-500" />
        <p className="w-full text-center text-xl font-semibold">Pre-Facturas por estado</p>
      </div>
      <Chart options={{
        labels: ['Pendiente de cobro', 'Creado','Reembolsado', 'Cancelado']
      }} series={[29, 17, 13, 33]} type="donut" width="380" />

    </div>
  )
}

export default PreInvoicesByStatus
