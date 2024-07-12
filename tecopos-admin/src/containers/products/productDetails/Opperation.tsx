import React, { useState, useEffect, useContext } from "react";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import useServerProduct from "../../../api/useServerProducts";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinusCircle } from "@fortawesome/free-solid-svg-icons";
import { translateMeasure, translateOperation, translateDispatchStatus } from '../../../utils/translate';
import Paginate from "../../../components/misc/Paginate";
import MovementsTypeBadge from "../../../components/misc/badges/MovementsTypeBadge";
import Modal from "../../../components/modals/GenericModal";
import DetailMovement from "../../areas/stock/movements/DetailMovement";
import { DetailProductContext } from "../DetailProductContainer";
import ScrollTypeFilter from "../../../components/misc/ScrollTypeFilter";
import { useAppSelector } from "../../../store/hooks";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { FilterOptions } from "../../../components/misc/FiltersComponent";
import { BsFiletypeXlsx } from "react-icons/bs";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { Movement } from "../../../interfaces/ServerInterfaces";
import { exportExcel } from "../../../utils/helpers";

const Opperations = () => {
  const { product } = useContext(DetailProductContext);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { getOperations, allOperations, paginate, isLoading } =
    useServerProduct();
  const defaultFilter = { productId: product?.id ?? null, page: 1 };
  const [filter, setFilter] =
    useState<Record<string, string | number | boolean | null>>(defaultFilter);
  const [modalMovement, setModalMovement] = useState<{
    movementId: number | null;
    modalState: boolean;
  }>({ movementId: null, modalState: false });

  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    getOperations(filter);
  }, [filter]);

  //Data for filters -----------------------------------------------------------------------------------
  const typesDisplay: SelectInterface[] = [];
  const types: string[] = [
    "ENTRY",
    "MOVEMENT",
    "OUT",
    "TRANSFORMATION",
    "SALE",
  ];
  types.forEach((item) =>
    typesDisplay.push({ id: item, name: translateOperation(item) })
  );

  //------------------------------------------------------------------------------------

  //Data for GenericTable -----------------------------------------------------------------
  const tableTitles = ["Operación", "Cantidad", "Fecha", "Usuario"];
  if (product?.type === "VARIATION") tableTitles.unshift("Variación");
  const tableData: DataTableInterface[] = [];
  allOperations.map((items) => {
    if (product?.type === "VARIATION") {
      tableData.push({
        rowId: items.id,
        deletedRow: items.removedOperationId !== null,
        payload: {
          Variación: items.variation?.name,
          Operación: <MovementsTypeBadge operation={items.operation} />,
          Cantidad: `${items.quantity} ${translateMeasure(
            items.product.measure
          )}`,
          Fecha: `${moment(items.createdAt).format("DD/MM/YYYY hh:mm A")}`,
          Usuario: items.movedBy ? (
            items.movedBy.displayName
          ) : (
            <FontAwesomeIcon
              icon={faMinusCircle}
              className="text-gray-400 h-4"
            />
          ),
        },
      });
    } else {
      tableData.push({
        rowId: items.id,
        deletedRow: items.removedOperationId !== null,
        payload: {
          Operación: <MovementsTypeBadge operation={items.operation} />,
          Cantidad: `${items.quantity} ${translateMeasure(
            items.product.measure
          )}`,
          Fecha: `${moment(items.createdAt).format("DD/MM/YYYY hh:mm A")}`,
          Usuario: items.movedBy ? (
            items.movedBy.displayName
          ) : (
            <FontAwesomeIcon
              icon={faMinusCircle}
              className="text-gray-400 h-4"
            />
          ),
        },
      });
    }
  });

  const availableFilters: FilterOpts[] = [
    {
      name: "Operación",
      filterCode: "operation",
      format: "select",
      data: typesDisplay,
    },
    {
      name: "Área",
      filterCode: "areaId",
      format: "select",
      data: areas
        .filter((item) => item.type === "STOCK")
        .map((elem) => ({ id: elem.id, name: elem.name })),
    },
    {
      filterCode: "dateRange",
      name: "Rango de fechas",
      format: "datepicker-range",
      isUntilToday: true,
      datepickerRange: [
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
      ],
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...defaultFilter, ...data }) : setFilter(defaultFilter);
  };

  const actions: BtnActions[] = [
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //-------------------------------------------------------------------------------------

  return (
    <div className="px-5 pb-16 border border-slate-300 rounded-md h-[34rem] p-5 overflow-auto scrollbar-none">
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        rowAction={(id: number) => {
          setModalMovement({ modalState: true, movementId: id });
        }}
        filterComponent={{ availableFilters, filterAction }}
        loading={isLoading}
        actions={actions}
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

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            closeModal={() => setExportModal(false)}
            allOperations={allOperations}
          />
        </Modal>
      )}
    </div>
  );
};

interface ExportContainer {
  closeModal: Function;
  allOperations: Movement[];
}
const ExcelFileExport = ({
  closeModal,
  allOperations,
}: ExportContainer  ) => {
  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    const dataToExport: Record<string, string | number>[] = [];
    allOperations.map((item) =>
      dataToExport.push({
        "Operación": translateOperation(item.operation),
        //@ts-ignore
        "Estado":translateDispatchStatus(item?.status),
        "Producto": item?.product?.name,
        "Cantidad": item.quantity,
        "Fecha": moment(item.createdAt).format("DD/MM/YYYY hh:mm A"),
        "Usuario": item.movedBy ? item.movedBy.displayName : "",
        "Area": item.area.name,
        "Descripción" : item.description,

      })
    );
    exportExcel(dataToExport, data.name);
    closeModal()
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre del archivo"
        placeholder="Nombre del archivo .xlsx"
        control={control}
        rules={{ required: "Debe indicar un nombre para el archivo" }}
      />
      <div className="flex py-2 justify-end">
        <Button
          type="submit"
          name="Exportar"
          color="slate-600"
        />
      </div>
    </form>
  );
};

export default Opperations;
