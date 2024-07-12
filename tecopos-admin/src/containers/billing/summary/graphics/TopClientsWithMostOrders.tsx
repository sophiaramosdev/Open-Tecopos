import React from 'react'
import { TagIcon } from '@heroicons/react/24/outline'
import GenericTable, { DataTableInterface } from '../../../../components/misc/GenericTable';
import { Client } from '../../../../interfaces/ServerInterfaces';

const TopordersByClient = ({ ordersByClient }: { ordersByClient: Client[] }) => {


    ordersByClient?.sort((a, b) => (b?.totalPayInOrden * b?.totalOrder) - (a?.totalPayInOrden * a?.totalOrder));

    const tableTitles = [
        "Puesto",
        "Nombre",
        "Total de órdenes",
        "Total pagado",
    ];

    const tableData: DataTableInterface[] = [];


    ordersByClient?.forEach((element, indx) => {
        tableData.push(
            {
                payload: {
                    "Puesto": indx + 1,
                    "Nombre": element.nameClient,
                    "Total de órdenes": element.totalOrder,
                    "Total pagado": element.totalPayInOrden,
                }
            }
        )
    })

    return (
        <div>
            <div className="w-full flex items-center mb-5">
                <img src="/podio.png" alt="" className="h-6 w-auto" />

                <p className="w-full text-center text-xl font-semibold">Top 10 - Clientes</p>
                {/* <p className="w-full text-center text-xl font-semibold">Top 10 - Clientes con más ordenes</p> */}
                <div className="flex items-center bg-slate-300 rounded-lg p-2">
                    <TagIcon className="h-6 text-gray-500" />

                    <p className="text-end   font-semibold ">Cantidad</p>
                </div>
            </div>

            <div className='max-h-72 overflow-y-auto'>
                <GenericTable
                    tableTitles={tableTitles}
                    tableData={tableData}
                // loading={isLoading}
                />
            </div>

        </div>
    )
}

export default TopordersByClient
