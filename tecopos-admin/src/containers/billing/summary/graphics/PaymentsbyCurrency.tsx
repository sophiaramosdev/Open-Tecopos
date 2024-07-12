import Chart from "react-apexcharts";
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { OrdersByCurrencyInterface } from "../../../../interfaces/ServerInterfaces";

const PaymentsbyCurrency = ({ ordersByCurrency }: { ordersByCurrency: OrdersByCurrencyInterface[] }) => {

    return (
        <div >
            <div className="w-full flex items-center mb-5">
                <CurrencyDollarIcon className="h-8 text-gray-500" />
                <p className="w-full text-center text-xl font-semibold">Pagos por monedas</p>
            </div>
            <Chart options={{

                labels: ordersByCurrency.map(e => e.currency ?? "-"),
                dataLabels: {
                    enabled: true,
                    background: {
                        enabled: true,
                        borderRadius: 2,
                    }
                }
            }
            } series={[
                {
                    name: "Monedas",
                    data: ordersByCurrency.map(e => e.total ?? 0)
                }

            ]} type="radar" width="380" />

        </div>
    )
}

export default PaymentsbyCurrency
