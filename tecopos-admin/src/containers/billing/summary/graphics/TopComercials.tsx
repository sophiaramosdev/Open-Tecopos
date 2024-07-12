import Chart from "react-apexcharts";
import { TagIcon } from '@heroicons/react/24/outline'
import { Seller } from "../../../../interfaces/ServerInterfaces";

const TopComercials = ({ topsSellers }: { topsSellers: Seller[] | undefined }) => {

    topsSellers?.sort((a, b) => b?.orderCount - a?.orderCount);

    return (
        <div >
            <div className="w-full flex items-center mb-5">
                <img src="/podio.png" alt="" className="h-6 w-auto" />

                <p className="w-full text-center text-xl font-semibold">Top 10 - Comerciales</p>
                <div className="flex items-center bg-slate-300 rounded-lg p-2">
                    <TagIcon className="h-6 text-gray-500" />

                    <p className="text-end   font-semibold ">Cantidad</p>
                </div>
            </div>

            <div className="w-full flex-col">

                <p className="text-xl text-center">{topsSellers !== undefined ? topsSellers[0]?.nameSeller : "-"}</p>

                <div className="flex justify-between items-center px-16 mt-5">
                    <p className="text-xl text-left">{topsSellers !== undefined ? topsSellers[1]?.nameSeller : "-"}</p>

                    <img src="/podio.png" alt="" className="h-16 w-auto" />

                    <p className="text-xl text-right">{topsSellers !== undefined ? topsSellers[2]?.nameSeller : "-"}</p>
                </div>

            </div>

            <Chart
                options={{
                    // series: [{
                    //     data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
                    // }],
                    colors: ["#DDAD03", "#B2AAAA", "#B67801DE"],
                    chart: {
                        type: 'bar',
                        height: 100,
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
                        categories: topsSellers?.map((e, indx) => indx+1),
                    }
                }}
                series={[{
                    name:"Total pagado en órdenes",
                    data: topsSellers !== undefined ? topsSellers.map(e => e?.totalPayInOrden ?? 0) : []
                }]}
                type="bar"
                // width="max"
                height={100}
            />
        </div>
    )
}

export default TopComercials
