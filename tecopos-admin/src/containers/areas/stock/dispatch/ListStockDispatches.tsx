import { useState, useEffect } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import useServerArea from "../../../../api/useServerArea";
import {
  ArrowsRightLeftIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import { FilterComponentInterface } from "../products/FilterContainer";
import {
  DispatchItemInterface,
  DispatchStatus,
} from "../../../../interfaces/ServerInterfaces";
import Paginate from "../../../../components/misc/Paginate";
import DetailDispatch from "./DetailDispatch";
import { StatusBadge } from "../../../../components/misc/badges/StatusBadge";
import { useAppSelector } from "../../../../store/hooks";
import DispatchWizard from "./modalNewDispatch/DispatchWizard";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import Breadcrumb, {
  PathInterface,
} from "../../../../components/navigation/Breadcrumb";
import { useLocation, useNavigate } from "react-router-dom";
import ScrollTypeFilter from "../../../../components/misc/ScrollTypeFilter";
import { formatCalendar } from "../../../../utils/helpers";
import Modal from "../../../../components/misc/GenericModal";

const ListStockDispatches = () => {
  const {
    allDispatches,
    paginate,
    getAllDispatches,
    addDispatch,
    responseDispatch,
    transformDispatchToBill,
    isFetching,
    isLoading,
  } = useServerArea();
  const { business } = useAppSelector((state) => state.init);
  const navigate = useNavigate();
  const { areas } = useAppSelector((state) => state.nomenclator);

  //For external state
  const location = useLocation();
  const externalState = location.state;

  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >({ ...externalState?.filter, page: 1 });
  const [showDispatchModal, setShowDispatchModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });
  const [newDispatchModal, setNewDispatchModal] = useState(false);

  useEffect(() => {
    getAllDispatches(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  //Data for Table List --------------------------------------------------------------------
  const titles: string[] = ["Fecha", "Área origen", "Área destino", "Estado","No. pedido"];
  const displayData: Array<DataTableInterface> = [];
  allDispatches.map((item) =>
    displayData.push({
      rowId: item.id,
      boldRow: item.status === "CREATED",
      payload: {
        Fecha: formatCalendar(item.createdAt),
        "Área origen": !!item.stockAreaFrom
          ? `${
              item?.stockAreaFrom?.business.id !== business?.id
                ? item?.stockAreaFrom?.business?.name + " - "
                : ""
            }` + item?.stockAreaFrom?.name
          : "-",
        "Área destino":
          `${
            item.stockAreaTo.business.id !== business?.id
              ? item.stockAreaTo.business.name + " - "
              : ""
          }` + item.stockAreaTo.name,
        Estado: <StatusBadge status={item.status} />,
        "No. pedido" : item?.id
      },
    })
  );

  const rowAction = (id: number) => setShowDispatchModal({ state: true, id });

  const actions = [
    {
      title: "Nuevo despacho",
      action: () => setNewDispatchModal(true),
      icon: <ArrowsRightLeftIcon className="h-5" />,
    },
  ];

  const paginateAction = (page: number) => setFilter({ ...filter, page });

  const modalDispatchSubmit = (data: DispatchItemInterface) =>
    addDispatch(data, () => setNewDispatchModal(false));

  const modalResponseDispatch = (
    id: number,
    response: DispatchStatus,
    payload?: Record<string, any>
  ) => {
    if (["ACCEPTED", "REJECTED"].includes(response)) {
      responseDispatch(id, response, () =>
        setShowDispatchModal({ id: null, state: false })
      );
    } else if (response === "BILLED") {
      transformDispatchToBill(id, payload!, () =>
        setShowDispatchModal({ id: null, state: false })
      );
    }
  };

  //-------------------------------------------------------------------------------------------------------------

  //Management filters ------------------------------------------------------------------------
  const availableFilters: FilterComponentInterface[] = [
    //Filter by productCategories index 0
    {
      format: "select",
      filterCode: "stockAreaFromId",
      name: "Área Origen",
      data: areas.map((item) => ({ id: item.id, name: item.name })),
    },
    {
      format: "select",
      filterCode: "stockAreaToId",
      name: "Área destino",
      data: areas.map((item) => ({ id: item.id, name: item.name })),
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ all_data: true, ...data }) : setFilter({ page: 1 });
  };

  //--------------------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis almacenes",
      action: () => navigate("/stocks"),
    },
    { name: "Despachos" },
  ];
  //------------------------------------------------------------------------------------

  //Data for Filter Scroll -------------------------------------------------
  let availableStatus: SelectInterface[] = [
    { id: "CREATED", name: "Pendientes" },
    { id: "ACCEPTED", name: "Recibidos" },
    { id: "REJECTED", name: "Rechazados" },
  ];
  //--------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<RectangleGroupIcon className="h-7 text-gray-500" />}
        paths={paths}
      />
      <ScrollTypeFilter
        title="Filtrar despachos"
        items={availableStatus}
        current={filter?.status ?? null}
        onChange={(item: string | number | null) =>
          setFilter({
            ...filter,
            status: item,
          })
        }
      />
      <GenericTable
        tableData={displayData}
        tableTitles={titles}
        loading={isLoading}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={<Paginate action={paginateAction} data={paginate} />}
        filterComponent={{ availableFilters, filterAction }}
      />
      {newDispatchModal && (
        <Modal
          state={newDispatchModal}
          close={() => setNewDispatchModal(false)}
          size="l"
        >
          <DispatchWizard
            submitAction={modalDispatchSubmit}
            loading={isFetching}
          />
        </Modal>
      )}

      {showDispatchModal && (
        <Modal
          close={() => setShowDispatchModal({ state: false, id: null })}
          state={showDispatchModal.state}
          size="m"
        >
          <DetailDispatch
            id={showDispatchModal.id}
            response={modalResponseDispatch}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default ListStockDispatches;
