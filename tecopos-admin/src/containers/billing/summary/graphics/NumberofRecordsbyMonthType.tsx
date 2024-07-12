import React from 'react'
import Chart from "react-apexcharts";
import { DocumentDuplicateIcon, ClockIcon } from '@heroicons/react/24/outline'
import { MonthOrder } from '../../../../interfaces/ServerInterfaces';

const NumberofRecordsbyMonthType = ({ orderByMonth }: { orderByMonth: MonthOrder[] }) => {


    return (
        <div>
            <div className="w-full flex items-center mb-5">
                <DocumentDuplicateIcon className="h-8 text-gray-500" />
                <p className="w-full text-center text-xl font-semibold">Cantidad de registros por tipo de mes</p>
                <div className="flex items-center bg-slate-300 rounded-lg p-2">
                    <ClockIcon className="h-6 text-gray-500" />
                    <p className="text-end   font-semibold ">Semana</p>
                </div>
            </div>
            <Chart
                options={
                    {
                        chart: {
                            id: "bar"
                        },
                        xaxis: {
                            categories: orderByMonth.map(e => e.month ?? "-"),
                            // categories: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC'],
                        }
                    }
                }
                series={[
                    {
                        name: "Facturas",
                        data: orderByMonth?.map(e => e.bills ?? 0),
                    },
                    {
                        name: "Pre-Facturas",
                        data: orderByMonth?.map(e => e.preBills ?? 0),
                    },
                    {
                        name: "Pagos Anticipados",
                        data: orderByMonth?.map(e => e.prepaid ?? 0),
                    }
                ]}
                height={250}
                type="bar"
            />
        </div>
    )
}

export default NumberofRecordsbyMonthType
