import { useState, useEffect } from "react";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import useServerOrderProd from "../../../api/useServerOrderProd";
import moment from "moment";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Modal from "../../../components/modals/GenericModal";
import ProgressBar from "../../../components/misc/ProgressBar";
import NewProdOrderWizard from "./newOrderModal/NewProdOrderWizard";
import { NewOrderInterface } from "../../../interfaces/ServerInterfaces";
import DetailOrderComponent from "./detailOrderModal/DetailOrderComponent";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import Paginate from "../../../components/misc/Paginate";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { formatCurrency } from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { productionOrdersStatus } from "../../../utils/staticData";
import useServer from "../../../api/useServerMain";

const ListProductionOrders = () => {
  const { allOrders, getAllOrders, addOrder, isLoading, isFetching, paginate } =
    useServerOrderProd();
    const {allowRoles} = useServer();
  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });
  useEffect(() => {
    getAllOrders(filter);
  }, [filter]);

  //Data for Data Table------------------------------------------------------
  const titles = [
    "Nombre",
    "Fecha de apertura",
    "Costo total",
    "Creada por",
    "Estado",
    "Producción",
  ];
  const displayData: DataTableInterface[] = [];
  allOrders.forEach((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item?.name ?? "-",
        "Fecha de apertura": moment(item.openDate).format("DD/MM/YYYY hh:mm A"),
        "Costo total":
          item.status === "CLOSED" ? (
            formatCurrency(item.totalCost, business?.costCurrency)
          ) : item?.plannedCost ? (
            <div className="inline-flex gap-1">
              {formatCurrency(item.plannedCost, business?.costCurrency)}{" "}
              <span>(planificado)</span>
            </div>
          ) : (
            "-"
          ),
        "Creada por":
          item.createdBy?.displayName ?? item.createdBy?.email ?? "-",
        Estado: <OrderStatusBadge status={item.status} />,
        Producción: (
          <ProgressBar
            part={item?.totalProduced ?? 0}
            total={item?.totalGoalQuantity ?? 1}
          />
        ),
      },
    })
  );

  const tableActions: BtnActions[] = [
    {
      icon: <PlusIcon className="h-7" />,
      title: "Nueva orden",
      action: () => setNewOrderModal(true),
    },
  ];

  const rowAction = (id: number) => {
    setDetailOrderModal({ state: true, id });
  };

  //Filters
  const areasSelector: SelectInterface[] = areas
    ?.filter((area) => area.type === "MANUFACTURER")
    .map((itm) => ({ id: itm.id, name: itm.name }));
  const availableFilters: FilterOpts[] = [
    {
      format: "select",
      name: "Área de producción",
      filterCode: "areaId",
      data: areasSelector,
    },
    {
      format: "select",
      name: "Estado",
      filterCode: "status",
      data: productionOrdersStatus,
    },
    {
      format: "datepicker",
      name: "Fecha de creado",
      filterCode: "dateFrom",
    },
  ];

  const filterAction = (data: BasicType | null) =>
    data ? setFilter(data) : setFilter({ page: 1 });
  //-----------------------------------------------------------------------------

  //New Order Action Modal ------------------------------------------------------
  const newOrder = (data: NewOrderInterface) => {
    addOrder(data, () => setNewOrderModal(false));
  };
  //----------------------------------------------------------------------------------------------
  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Producción",
    },
    {
      name: "Órdenes",
    },
  ];
  //------------------------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        loading={isLoading}
        rowAction={rowAction}
        actions={allowRoles(["ADMIN", "CHIEF_PRODUCTION"])?tableActions:undefined}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {newOrderModal && (
        <Modal
          state={newOrderModal}
          close={() => setNewOrderModal(false)}
          size="m"
        >
          <NewProdOrderWizard action={newOrder} loading={isFetching} />
        </Modal>
      )}

      {detailOrderModal.state && (
        <Modal
          close={() => setDetailOrderModal({ state: false, id: null })}
          state={detailOrderModal.state}
          size="m"
        >
          <DetailOrderComponent
            id={detailOrderModal.id}
            updAll={getAllOrders}
            closeModal={() => setDetailOrderModal({ state: false, id: null })}
          />
        </Modal>
      )}
    </>
  );
};

export default ListProductionOrders;
