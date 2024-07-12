import Chart from "react-apexcharts";
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { OrdersByStatus } from "../../../../interfaces/ServerInterfaces";

const InvoicesByStatus = ({ orderByStatus }: { orderByStatus: OrdersByStatus }) => {
  return (
    <div >
    <div className="w-full flex items-center mb-5">
      <DocumentDuplicateIcon className="h-8 text-gray-500" />
      <p className="w-full text-center text-xl font-semibold">Facturas por estado</p>
    </div>
    <Chart options={{
      labels: ["Creado", "Pendiente Cobro", "Facturada", "Pre-Facturada", "Reembolsado", "En tránsito", "Cancelada", "Nula"]
    }} series={[orderByStatus?.CREATED, orderByStatus?.PAYMENT_PENDING, orderByStatus?.BILLED, orderByStatus?.PREFECTURE, orderByStatus?.REFUNDED, orderByStatus?.IN_TRANSIT, orderByStatus?.CANCELLED, orderByStatus?.null]} type="donut" width="380" />

  </div>
  )
}

export default InvoicesByStatus
