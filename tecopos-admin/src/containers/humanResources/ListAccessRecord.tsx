import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import useServerUsers from "../../api/useServerUsers";
import GenericTable, {
  DataTableInterface, FilterOpts,
} from "../../components/misc/GenericTable";
import Paginate from "../../components/misc/Paginate";
import ImageComponent from "../../components/misc/Images/Image";
import { exportExcel, formatCalendar, formatDateForReportsWithYear } from "../../utils/helpers";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import Modal from "../../components/misc/GenericModal";
import ExcelFileExport from "../../components/commos/ExcelFileExport";
import { SelectInterface } from "../../interfaces/InterfacesLocal";
import MovementsTypeBadge from "../../components/misc/badges/MovementsTypeBadge";
import { useAppSelector } from "../../store/hooks";
import NewAttendanceRecordModal from "./NewAttendanceRecordModal";
import ModalAlert from "../../components/commos/ModalAlert";


interface ListAccessRecordInterface {
  id?: number | null;
}

const ListAccessRecord = ({ id }: ListAccessRecordInterface) => {
  const {
    getAccessRecords,
    accessRecords,
    paginate,
    isLoading,
    deleteAccessRecords
  } = useServerUsers();

  const [deleteAccessModal, setDeleteAccessModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });


  const { areas } = useAppSelector(state => state.nomenclator)


  const [filter, setFilter] = useState<Record<string, string | number | boolean>>({ page: 1, personId: id !== null ? id as number : false });


  const [exportModal, setExportModal] = useState(false);
  const [newAttendanceRecord, setNewAttendanceRecord] = useState(false);

  useEffect(() => {
    if (id !== null) {
      getAccessRecords({ ...filter, personId: id as number })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);


  const operationTypes = [{ value: "ENTRY", title: "Entrada" }, { value: "EXIT", title: "Salida" }]

  const operationTypeSelectorData: SelectInterface[] = operationTypes.map((item: {
    value: string;
    title: string;
  }) => ({ id: item.value, name: item.title })) ?? []

  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Nombre", "Registro", "Operación", "Registrado por"];
  const tableData: DataTableInterface[] = [];

  accessRecords.forEach((item) =>
    tableData.push({
      rowId: item.id,
      payload: {
        Nombre: (
          <div className="inline-flex items-center gap-2">
            <ImageComponent
              className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden"
              src={item?.person?.profilePhoto?.src}
              hash={item?.person?.profilePhoto?.blurHash}
            />
            <div className="flex flex-col">
              <p>{`${item?.person?.firstName ?? ""} ${item?.person?.lastName ?? ""} `}</p>
            </div>
          </div>
        ),
        Registro: formatCalendar(item.createdAt),
        "Operación": item.type === "ENTRY" ? "Entrada" : "Salida",
        "Registrado por": item?.registeredBy?.displayName !== undefined ? item?.registeredBy?.displayName : item?.registeredBy?.email,
      },
    })
  );


  const tableTitleForOnePerson = ["Operación", "Registro", "Area", "Registrado por"];
  const tableDataForOnePerson: DataTableInterface[] = [];
  accessRecords.forEach((item) =>
    tableDataForOnePerson.push({
      rowId: item.id,
      payload: {
        "Operación": <MovementsTypeBadge operation={item.type} />,
        "Registro": formatCalendar(item.createdAt),
        "Area": areas.filter(area => area?.id === item?.area?.id)[0]?.name!,
        "Registrado por": item?.registeredBy?.displayName !== undefined ? item?.registeredBy?.displayName : item?.registeredBy?.email,
      },
    })
  );


  //Actions
  const actions: BtnActions[] = [
    {
      title: "Nuevo acceso",
      action: () => setNewAttendanceRecord(true),
      icon: <PlusIcon className="h-5 w-5" />,
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    }
  ];

  //------------------------------------------------------------------------------------

  //Available Filters

  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "datepicker",
      filterCode: "dateFrom",
      name: "Fecha desde",
    },
    {
      format: "datepicker",
      filterCode: "dateTo",
      name: "Fecha hasta",
    },
    {
      format: "select",
      filterCode: "type",
      name: "Tipo de operación",
      data: operationTypeSelectorData,
    },

  ];
  //------------------------------------------------------------------------------------

  //Filter Action
  const filterAction = (data: Record<string, string | number | boolean> | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  //-----------------------------------------------------------------------
  const exportAction = async (name: string) => {
    // exportStoreOrders(filter, name, () => setExportModal(false))
    const dataToExport: Record<string, string | number>[] = [];
    accessRecords.forEach((item) => {
      dataToExport.push({
        'Nombre': `${item?.person?.firstName ?? ""} ${item?.person?.lastName ?? ""} `,
        'Registro': formatDateForReportsWithYear(item.createdAt),
        "Operación": item.type === "ENTRY" ? "Entrada" : "Salida"
      });
    });
    exportExcel(dataToExport, name);
    setExportModal(false)
  };

  const rowAction = (id: number) => setDeleteAccessModal({ state: true, id });

  return (
    <>
      {
        id === undefined ? (
          <>
            <GenericTable
              rowAction={rowAction}
              rowActionDeleteIcon
              tableData={tableData}
              tableTitles={tableTitle}
              loading={isLoading}
              //searching={searching}
              actions={actions}
              filterComponent={{ availableFilters, filterAction }}
              paginateComponent={
                <Paginate
                  action={(page: number) => setFilter({ ...filter, page })}
                  data={paginate}
                />
              }
            />
          </>
        ) : (
          <GenericTable
            rowAction={rowAction}
            rowActionDeleteIcon
            tableData={tableDataForOnePerson}
            tableTitles={tableTitleForOnePerson}
            loading={isLoading}
            //searching={searching}
            actions={actions}
            filterComponent={{ availableFilters, filterAction }}
            paginateComponent={
              <Paginate
                action={(page: number) => setFilter({ ...filter, page })}
                data={paginate}
              />
            }
          />
        )
      }

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            exportAction={exportAction}
            loading={isLoading}
          />
        </Modal>
      )}

      {newAttendanceRecord && (
        <Modal state={newAttendanceRecord} close={setNewAttendanceRecord}>
          <NewAttendanceRecordModal close={() => {
            setNewAttendanceRecord(false)
            setFilter({ page: 1 })
          }} personId={id!} />
        </Modal>
      )}


      {deleteAccessModal.state && (
        <ModalAlert
          type={""}
          title="Eliminar registro"
          text="Está a punto de eliminar este registro. Esta acción es definitiva y no puede ser revertida. ¿Está seguro de querer eliminar el registro?"
          onClose={() => setDeleteAccessModal({ state: false, id: null })}
          onAccept={() => {
            deleteAccessRecords(deleteAccessModal.id!)
            setDeleteAccessModal({ state: false, id: null })
          }}
          isLoading={isLoading}
        />
      )}

    </>
  );
};

export default ListAccessRecord;
