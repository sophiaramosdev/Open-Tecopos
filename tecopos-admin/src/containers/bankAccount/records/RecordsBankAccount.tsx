import { useContext, useEffect, useState } from "react";
import GenericTable, { DataTableInterface, FilterOpts } from "../../../components/misc/GenericTable"
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import { BankAccountRecordsInterface } from "../../../interfaces/ServerInterfaces";
import Paginate from "../../../components/misc/Paginate";
import { formatDate } from "../../../utils/helpers";

export const RecordsBankAccount = () => {
  // Hooks
  const { bankAccount, bankAccountRecords, getAllRecords, paginateRecords, isLoading } = useContext(DetailAccountContext)

  // Local States
  const [filter, setFilter] = useState<Record<string, string | number | boolean> | undefined>({ page: 1 })
  const displayData: DataTableInterface[] = []

  // FILTER SECTION
  const actionsSelector: SelectInterface[] = [
    {
      id: "ACCOUNT_CREATED",
      name: "Cuenta Creada",
      disabled: false,
    },
    {
      id: "ACCOUNT_EDITED",
      name: "Cuenta Editada",
      disabled: false,
    },
    {
      id: "ACCOUNT_DELETED",
      name: "Cuenta Eliminada",
      disabled: false,
    },
    {
      id: "OPERATION_CREATED",
      name: "Operacion Creada",
      disabled: false,
    },
    {
      id: "OPERATION_EDITED",
      name: "Operacion Editada",
      disabled: false,
    },
    {
      id: "OPERATION_DELETED",
      name: "Operacion Eliminada",
      disabled: false,
    },
    {
      id: "ACCOUNT_TRANSFERRED",
      name: "Cuenta Transferida",
      disabled: false,
    },
    {
      id: "ADD_USER_TO_ACCOUNT",
      name: "Ceder acceso a usuarios",
      disabled: false,
    },
    {
      id: "DELETE_USER_TO_ACCOUNT",
      name: "Retirar acceso a usuarios",
      disabled: false,
    },
    {
      id: "CURRENCY_EXCHANGE",
      name: "Cambio de moneda",
      disabled: false,
    },
  ];

  const filterCodeDatePickerRange = [
    {
      filterCode: "dateFrom",
      name: "Desde",
      isUnitlToday: true,
    },
    {
      filterCode: "dateTo",
      name: "Hasta",
      isUnitlToday: true,
    },
  ];
  const availableFilters: FilterOpts[] = [
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Rango de Fecha",
      datepickerRange: filterCodeDatePickerRange,
    },
    {
      format: "select",
      filterCode: "action",
      name: "Tipo de Acción",
      data: actionsSelector.map((actions) => ({
        id: actions.id,
        name: actions.name,
      })),
    },
  ];

  const tableTitles = ['Acción', 'Realizada por', 'Fecha', "Detalles"]

  //Filter Action
  const filterAction = (data: Record<string, string | number | boolean> | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  // Effects
  useEffect(() => {
    getAllRecords && getAllRecords(bankAccount?.id, filter)
}, [filter]);

  // Record LIST
  bankAccountRecords && bankAccountRecords.length > 0 && bankAccountRecords?.forEach((item: BankAccountRecordsInterface) => {

    let payload: Record<string, string | number | boolean | React.ReactNode> =
    {
      "Acción": (
        <div>
          <p

            className='text-sm font-medium text-gray-900 text-ellipsis max-w-xs break-words text-center'
          >
            {item.title}
          </p>
        </div>
      ),
      "Realizada por": (
        <div>
          <p

            className='text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center'
          >
            {item.madeBy.displayName}            
          </p>
        </div>
      ),
      "Fecha":(
        <div>
                    <p className='text-sm max-w-xs break-words text-gray-500 text-ellipsis text-center' >
                    {formatDate(item.createdAt)}
                    </p>
        </div>
      ),
      "Detalles": (
        <div>
          <p

            className='ml-4 text-sm font-medium text-left text-gray-500 '
          >
            {item.observations ?? '------'}
          </p>
        </div>
      )
    };
    displayData.push({ deletedRow: false, payload: payload })
  })

  return (
    <div>
      <GenericTable
        tableData={displayData}
        tableTitles={tableTitles}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginateRecords}
          />
        }
        loading={isLoading}
      />
    </div>
  )
}
