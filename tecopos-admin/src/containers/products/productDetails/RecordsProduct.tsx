import { useContext, useEffect, useState } from "react";
import GenericTable, { DataTableInterface, FilterOpts } from "../../../components/misc/GenericTable"
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import Paginate from "../../../components/misc/Paginate";
import { formatDate } from "../../../utils/helpers";
import { DetailProductContext } from "../DetailProductContainer";
import { ProductRecordsInterface } from "../../../interfaces/ServerInterfaces";

export const RecordsProduct = () => {
  // Hooks
  const { productRecords, getRecordsProduct, paginateRecords, product, isFetchingB } = useContext(DetailProductContext)


  // Local States
  const [filter, setFilter] = useState<Record<string, string | number | boolean> | undefined>({ page: 1 })


  const displayData: DataTableInterface[] = []

  // Functions
  const actionTableLabel = (action: string) => {
    if (action === "ADD_NEW_PRICE") return 'Nuevo precio añadido'
    if (action === "CREATED_PRODUCT") return 'Producto creado'
    if (action === "EDIT_GENERAL_DATA_PRODUCT") return 'Producto editado'
    if (action === "REMOVED_PRODUCT") return 'Producto eliminado'
    
    if (action === "CHANGE_PRICE") return 'Precio modificado'
    if (action === "EDIT_TECHNICAL_FILE") return 'Ficha técnica modificada'
    if (action === "CREATED_FIXED_COST") return 'Costo fijo creado'
    if (action === "REMOVE_FIXED_COST") return 'Costo fijo eliminado'
    if (action === "EDIT_FIXED_COST") return 'Costo fijo modificado'

    return action
  }

  // FILTER SECTION 
  const actionsSelector: SelectInterface[] = [
    {
      id: "CREATED_PRODUCT",
      name: "Producto creado",
      disabled: false,
    },
    {
      id: "EDIT_GENERAL_DATA_PRODUCT",
      name: "Producto editado",
      disabled: false,
    },
    {
      id: "REMOVED_PRODUCT",
      name: "Producto eliminado",
      disabled: false,
    },
    {
      id: "ADD_NEW_PRICE",
      name: "Nuevo precio añadido",
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
    getRecordsProduct && getRecordsProduct(product?.id, filter)

  }, [filter]);

  // Record LIST
  productRecords && productRecords.length > 0 && productRecords.forEach((item: ProductRecordsInterface) => {

    let payload: Record<string, string | number | boolean | React.ReactNode> =
    {
      "Acción": (
        <div>
          <p

            className=' text-sm font-medium text-gray-500 '
          >
            {actionTableLabel(item.action)}
          </p>
        </div>
      ),
      "Realizada por": (
        <div>
          <p

            className=' text-sm text-gray-500 '
          >
            {item?.madeByUser?.displayName}
          </p>
        </div>
      ),
      "Fecha": (
        <div>
          <p className='text-sm text-gray-500 ' >
            {formatDate(item.createdAt)}
          </p>
        </div>
      ),
      "Detalles": (
        <div>
          <p

            className='text-sm text-justify text-gray-500 '
          >
            {item.details ?? '------'}
          </p>
        </div>
      )
    };
    displayData.push({ deletedRow: false, payload: payload, rowId: item.id })
  })


  return (
    <div className="h-[34rem] p-5 overflow-auto border border-slate-300 scrollbar-thin rounded-md">
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
        loading={isFetchingB}
      />

    </div>
  )
}
