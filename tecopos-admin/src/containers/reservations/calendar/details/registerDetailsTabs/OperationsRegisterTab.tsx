import React, { useContext } from 'react'
import { RegisterDetailsContext } from '../RegisterDetailsContainer'
import GenericTable, { DataTableInterface } from '../../../../../components/misc/GenericTable'
import { formatDate } from '../../../../../utils/helpers'

export const OperationsRegisterTab = () => {
  const { order } = useContext(RegisterDetailsContext)
  const tableTitles = ['Acción', 'Fecha', 'Realizada por', "Detalles"]
  const displayData: DataTableInterface[] = []


 order?.records && order?.records.map(item => {
    let payload: Record<string, string | number | boolean | React.ReactNode> =
    {
      "Acción": (
        <div>
          <p

            className='text-sm font-medium text-gray-900 text-ellipsis max-w-xs break-words text-center'
          >
            {item?.title}
          </p>
        </div>
      ),
      "Realizada por": (
        <div>
          <p

            className='text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center'
          >
            {item?.madeBy?.displayName}
          </p>
        </div>
      ),
      "Fecha": (
        <div>
          <p className='text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center' >
            {formatDate(item?.createdAt)}
          </p>
        </div>
      ),
      "Detalles": (
        <div>
          <p

            className='text-sm max-w-xs break-words text-gray-500 text-ellipsis text-justify'
          >
            {item?.details ?? '-'}
          </p>
        </div>
      )
    };
    displayData.push({ deletedRow: false, payload: payload })
  })



  return (
    <div className='overflow-y-auto h-[26rem] px-3'>
      <GenericTable
        tableTitles={tableTitles}
        tableData={displayData}
      />
    </div>
  )
}
