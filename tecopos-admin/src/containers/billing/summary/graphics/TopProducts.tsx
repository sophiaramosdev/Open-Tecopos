import React from 'react'
import { TagIcon } from '@heroicons/react/24/outline'
import GenericTable, { DataTableInterface } from '../../../../components/misc/GenericTable'
import { Product } from '../../../../interfaces/ServerInterfaces';

const TopProducts = ({ topsProductOrder }: { topsProductOrder: Product[] }) => {

    topsProductOrder?.sort((a, b) => (b?.sales) - (a?.sales));

    const tableTitles = [
        "Puesto",
        "Nombre",
        "Cantidad de ventas",
    ];

    const tableData: DataTableInterface[] = [];

    topsProductOrder?.forEach((element, indx) => {
        tableData.push({
            payload: {
                "Puesto": indx + 1,
                "Nombre": element.product,
                "Cantidad de ventas": element.sales,
            }
        })
    })

    return (
        <div>
            <div className="w-full flex items-center mb-5">
                <img src="/podio.png" alt="" className="h-6 w-auto" />

                <p className="w-full text-center text-xl font-semibold">Top 10 - Productos</p>
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

export default TopProducts
