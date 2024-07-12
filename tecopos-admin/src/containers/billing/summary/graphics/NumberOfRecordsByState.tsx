import Chart from "react-apexcharts";
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { OrdersByStatus } from "../../../../interfaces/ServerInterfaces";


// ["Creado", "Pendiente Cobro", "Vencido", "Cobrado", "Reembolsado", "Archivado"]

const NumberOfRecordsByState = ({ orderByStatus }: { orderByStatus: OrdersByStatus }) => {

    return (
        <div >
            <div className="w-full flex items-center mb-5">
                <DocumentDuplicateIcon className="h-8 text-gray-500" />
                <p className="w-full text-center text-xl font-semibold">Cantidad de registros por estado</p>

            </div>

            <Chart
                options={{
                    chart: {
                        type: 'bar',
                        height: 350
                    },
                    plotOptions: {
                        bar: {
                            borderRadius: 4,
                            horizontal: true,
                        }
                    },
                    dataLabels: {
                        enabled: false
                    },
                    xaxis: {
                        categories: ["Creado", "Pendiente Cobro", "Facturada", "Pre-Facturada", "Reembolsado", "En tránsito", "Cancelada", "Nula"],
                    }
                }}
                series={[{
                    name:"Cantidad",
                    data: [orderByStatus?.CREATED, orderByStatus?.PAYMENT_PENDING, orderByStatus?.BILLED, orderByStatus?.PREFECTURE, orderByStatus?.REFUNDED, orderByStatus?.IN_TRANSIT, orderByStatus?.CANCELLED, orderByStatus?.null]
                }]}
                type="bar"
                // width="max"
                height={250}
            />
        </div>
    )
}

export default NumberOfRecordsByState
