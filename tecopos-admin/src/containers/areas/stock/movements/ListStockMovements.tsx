import { useState, useEffect } from "react";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../../components/misc/GenericTable";
import useServerArea from "../../../../api/useServerArea";
import { useParams } from "react-router-dom";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinusCircle } from "@fortawesome/free-solid-svg-icons";
import { translateMeasure } from "../../../../utils/translate";
import Paginate from "../../../../components/misc/Paginate";
import MovementsTypeBadge from "../../../../components/misc/badges/MovementsTypeBadge";
import Modal from "../../../../components/modals/GenericModal";
import DetailMovement from "./DetailMovement";
import DeleteMovementComponent from "../../../../components/misc/DeleteMovementComponent";
import { TrashIcon } from "@heroicons/react/24/outline";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import { productTypes } from "../../../../utils/staticData";
import { BsFiletypeXlsx } from "react-icons/bs";
import { toast } from "react-toastify";
import useServer from "../../../../api/useServerMain";
import query from "../../../../api/APIServices";
import {
  exportExcel
} from "../../../../utils/helpers";
import ExcelFileExport from "../../../../components/commos/ExcelFileExport";
import { generateUrlParams } from "../../../../utils/helpers";
import { Movement } from "../../../../interfaces/ServerInterfaces";
import { translateOperation } from "../../../../utils/translate";

const StockMovementsContainer = () => {
  const { stockId } = useParams();
  const { allMovements, getMovementByArea, paginate, isLoading } =
    useServerArea();
  const { areas } = useAppSelector((state) => state.nomenclator);

  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >({ areaId: stockId ?? null, page: 1 });
  const [modalMovement, setModalMovement] = useState<{
    movementId: number | null;
    modalState: boolean;
  }>({ movementId: null, modalState: false });
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    stockId && getMovementByArea(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  //Data for GenericTable -----------------------------------------------------------------
  const tableTitles = ["Nombre", "Operación", "Cantidad", "Fecha", "Usuario"];

  const btnAction: BtnActions[] = [
    {
      icon: <TrashIcon className="h-5 text-red-500" />,
      title: "Eliminar por fecha",
      action: () => setDeleteModal(true),
    },
    {
      title: "Exportar a Excel",
      icon: <BsFiletypeXlsx />,
      action: () => {
          if (filter.dateFrom !== undefined) {
              setExportModal(true);
          } else {
              toast.error("Por favor defina un rango de fechas");
          } 
      },
    },
  ];

  let tableData: DataTableInterface[] = [];
  allMovements.map((items) =>
    tableData.push({
      rowId: items.id,
      deletedRow: items.removedOperationId !== null,
      payload: {
        Nombre: (
          <div className="flex flex-col">
            {items.product.name}
            {items.variation && <span>{items.variation.name}</span>}
          </div>
        ),
        Operación: <MovementsTypeBadge operation={items.operation} />,
        Cantidad: `${items.quantity} ${translateMeasure(
          items.product.measure
        )}`,
        Fecha: `${moment(items.createdAt).format("DD/MM/YYYY hh:mm A")}`,
        Usuario: `${
          items.movedBy !== null ? (
            items.movedBy.displayName
          ) : (
            <FontAwesomeIcon
              icon={faMinusCircle}
              className="text-gray-400 h-4"
            />
          )
        }`,
      },
    })
  );
  //-----------------------------------------------------------------------------------------------------

  //Management filters ------------------------------------------------------------------------
  const areasSelector: SelectInterface[] = areas
    .filter((area) => area.type === "STOCK")
    .map((item) => ({ id: item.id, name: item.name }));

  const availableFilters: FilterOpts[] = [
    {
      format: "datepicker-range",
      name: "Rango de fecha",
      filterCode: "",
      datepickerRange: [
        {
          isUnitlToday: true,
          filterCode: "dateFrom",
          name: "Desde",
        },
        {
          isUnitlToday: true,
          filterCode: "dateTo",
          name: "Hasta",
        },
      ],
    },
    {
      format: "multiselect",
      filterCode: "operation",
      name: "Tipo de operación",
      data: [
        { name: "Entrada", id: "ENTRY" },
        { name: "Traslado", id: "MOVEMENT" },
        { name: "Procesado", id: "PROCESSED" },
        { name: "Salida", id: "OUT" },
        { name: "Ventas", id: "SALE" },
        { name: "Eliminado", id: "REMOVED" },
        { name: "Desperdicio", id: "WASTE" },
      ],
    },
    {
      format: "select",
      filterCode: "movedById",
      name: "Usuario",
      asyncData: {
        url: "/security/users",
        idCode: "id",
        dataCode: ["displayName", "email", "username"],
      },
    },
    {
      format: "select",
      name: "Almacén",
      filterCode: "areaId",
      data: areasSelector,
    },
    {
      format: "multiselect",
      name: "Tipo de producto",
      filterCode: "type",
      data: productTypes,
    }
  ];

  const filterAction = (data: BasicType | null) => {
    data
      ? setFilter({ areaId: stockId ?? null, all_data: true, ...data })
      : setFilter({ areaId: stockId ?? null, page: 1 });
  };

  //--------------------------------------------------------------------------------------------------------
      //Export to excel
      const { manageErrors } = useServer();
      const [loadingExport, setloadingExport] = useState(false);
      const [exportModal, setExportModal] = useState(false);

  
      let allResults: Movement[] = [];
  
      const exportBankAccounts =  async (
         filename: string,
       ) => {
         const dataToExport: Record<string, string | number>[] = [];
         setloadingExport(true);

         await query
             .get(`/administration/movement${generateUrlParams({...filter, all_data: true})}`)
             .then(( resp ) => {
                 allResults = allResults.concat(resp.data.items);
             })
             .catch((e) => manageErrors(e));
         allResults.forEach((item) => {
             
             dataToExport.push({
                 'Nombre': item?.product?.name ? item?.product?.name : '',
                 'Operación': translateOperation(item?.operation), 
                 'Cantidad':  item.quantity,
                 "Medida": `${translateMeasure(item.product.measure)}`,
                 "Fecha": `${moment(item.createdAt).format("DD/MM/YYYY hh:mm A")}`,
                 "Usuario": item.movedBy !== null ? ( item.movedBy.displayName ) : '',
             });
       })
       exportExcel(dataToExport, filename);
       setloadingExport(false);
       setExportModal(false); 
        };
  
        const exportAction = async(name: string) => {
              exportBankAccounts(name); 
        };

  return (
    <>
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        filterComponent={{ availableFilters, filterAction }}
        rowAction={(id: number) => {
          setModalMovement({ modalState: true, movementId: id });
        }}
        actions={btnAction}
        loading={isLoading}
      />

      {modalMovement.modalState && (
        <Modal
          close={() =>
            setModalMovement({
              modalState: false,
              movementId: null,
            })
          }
          state={modalMovement.modalState}
          size="l"
        >
          <DetailMovement id={modalMovement.movementId} />
        </Modal>
      )}

      {deleteModal && (
        <Modal close={() => setDeleteModal(false)} state={deleteModal}>
          <DeleteMovementComponent close={() => setDeleteModal(false)} />
        </Modal>
      )}

      {exportModal && (
      
      <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
          exportAction={exportAction}
          loading={loadingExport}
          />
      </Modal>
      )} 
    </>
  );
};

export default StockMovementsContainer;
