import Chart from "react-apexcharts";
import { CurrencyDollarIcon, TagIcon, } from '@heroicons/react/24/outline'
import { SalesByMonthInterface } from "../../../../interfaces/ServerInterfaces";

const TotalSales = ({ salesByMonthInMainCurrency }: {
    salesByMonthInMainCurrency: SalesByMonthInterface[]
}) => {

    return (
        <div >
            <div className="w-full flex items-center mb-5">
                <CurrencyDollarIcon className="h-8 text-gray-500" />
                <p className="w-full text-center text-xl font-semibold">Ventas totales</p>
                <div className="flex items-center bg-slate-300 rounded-lg p-2">
                    <TagIcon className="h-6 text-gray-500" />
                    <p className="text-end   font-semibold ">Cantidad</p>
                </div>
            </div>

            <Chart
                options={{
                    chart: {
                        id: "line"
                    },
                    xaxis: {
                        categories: salesByMonthInMainCurrency?.map(e => e?.month ?? "-")
                        // categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]
                    }
                }}
                series={[
                    {
                        name: "Importe",
                        data: salesByMonthInMainCurrency?.map(e => e?.amount ?? 0)
                    },
                    {
                        name: "Pagado",
                        data: salesByMonthInMainCurrency?.map(e => e?.amount ?? 0)
                    },
                ]}
                type="line"
                // width="max"
                height={250}
            />
        </div>
    )
}

export default TotalSales
