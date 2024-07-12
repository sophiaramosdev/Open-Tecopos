import React from 'react'
import { TagIcon } from '@heroicons/react/24/outline'
import GenericTable, { DataTableInterface } from '../../../../components/misc/GenericTable';
import { Client } from '../../../../interfaces/ServerInterfaces';

const TopClientsWithHighestSpending = ({ clientsWithHighestSpending }: { clientsWithHighestSpending: Client[] }) => {

    const tableTitles = [
        "Puesto",
        "Nombre",
        "Cantidad",
    ];

    const tableData: DataTableInterface[] = [];


    clientsWithHighestSpending.forEach((element, indx) => {
        tableData.push(
            {
                payload: {
                    "Puesto": indx + 1,
                    "Nombre": element.nameClient,
                    "Cantidad": element.totalPayInOrden,
                }
            }
        )
    })

    return (
        <div>
            <div className="w-full flex items-center mb-5">
                <img src="/podio.png" alt="" className="h-6 w-auto" />

                <p className="w-full text-center text-xl font-semibold">Top 10 - Clientes con mayor gasto</p>
                <div className="flex items-center bg-slate-300 rounded-lg p-2">
                    <TagIcon className="h-6 text-gray-500" />

                    <p className="text-end   font-semibold ">Cantidad</p>
                </div>
            </div>

            <GenericTable
                tableTitles={tableTitles}
                tableData={tableData}
            // loading={isLoading}
            />
        </div>
    )
}

export default TopClientsWithHighestSpending
