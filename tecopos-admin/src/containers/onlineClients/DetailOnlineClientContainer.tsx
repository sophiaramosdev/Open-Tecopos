import {
  CreditCardIcon,
  HomeModernIcon,
  PencilIcon,
  ReceiptPercentIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../utils/helpers";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
  SearchingInterface,
} from "../../components/misc/GenericTable";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import moment from "moment";
import { getStatusOrderSpanish } from "../../utils/functions";
import { getColorStatusOrder } from "../../utils/tailwindcss";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import Button from "../../components/misc/Button";
import EditOnlineClientContainer from "./editClient/EditOnlineClientContainer";
import PosOrderDetails from "../economicCycles/orders/PosOrderDetails";
import useServerOnlineClients from "../../api/useServerOnlineClients";
import OnlineOrderDetailContainer from "../store/orders/OnlineOrderDetailContainer";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import useServer from "../../api/useServerMain";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

const DetailOnlineClientContainer = () => {
  const { clientId } = useParams();
  const {
    getMainClientInfo,
    editClient,
    deleteClient,
    client,
    clientOrders,
    isLoading,
    isFetching,
    paginate,
  } = useServerOnlineClients();
  const {
    setAllOrderState,
    allOrdes,
    editOrder,
    isFetching: fetchingOrder,
    updateAllOrderState,
  } = useServerEcoCycle();

  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { allowRoles: verifyRoles } = useServer();
  const [filter, setFilter] = useState<BasicType>({ clientId: clientId! });
  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    orderId?: number;
  }>({ state: false });
  const navigate = useNavigate();

  const [editClientModal, setEditClientModal] = useState(false);

  useEffect(() => {
    clientId && getMainClientInfo(clientId, filter, setAllOrderState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const orderOrigin = useMemo(
    () =>
      clientOrders.find((order) => order.id === detailOrderModal.orderId)
        ?.origin,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailOrderModal]
  );

  //Data for generic Table-------------------------------------------------------------------
  const tableTitles: string[] = [
    "No. Orden",
    "Nombre",
    "Estado",
    "Apertura",
    "Cierre",
    "Total",
    "",
  ];
  const tableData: DataTableInterface[] = [];
  allOrdes.map((item) =>
    tableData.push({
      rowId: item.id,
      payload: {
        "No. Orden": item.operationNumber,
        Nombre: item.name,
        Estado: (
          <div
            className={classNames(
              getColorStatusOrder(item.status),
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0"
            )}
          >
            {getStatusOrderSpanish(item.status)}
          </div>
        ),
        Apertura:
          moment().diff(item.createdAt, "hour") < 24
            ? moment(item.createdAt).format("hh:mm A")
            : moment(item.createdAt).format("DD/MM hh:mm A"),
        Cierre:
          item.closedDate !== null &&
          (moment().diff(item.closedDate, "hour") < 24
            ? moment(item.closedDate).format("hh:mm A")
            : moment(item.closedDate).format("DD/MM hh:mm A")),
        Total: !item.houseCosted
          ? item.prices &&
            item.prices.length > 0 &&
            item.prices.map((pay, itemIdx) => (
              <p key={itemIdx}>{formatCurrency(pay.price, pay.codeCurrency)}</p>
            ))
          : formatCurrency(item.totalCost, business?.costCurrency ?? ""),
        "":
          item.discount === 100 ? (
            <ReceiptPercentIcon className="h-6" />
          ) : item.houseCosted ? (
            <HomeModernIcon className="h-5 text-green-600" />
          ) : item.currenciesPayment.some(
              (item) => item.paymentWay === "TRANSFER"
            ) ? (
            <CreditCardIcon className="h-5" />
          ) : (
            ""
          ),
      },
    })
  );

  const rowAction = (orderId: number) => {
    setDetailOrderModal({ state: true, orderId });
  };

  const searching: SearchingInterface = {
    placeholder: "Buscar productos en las órdenes...",
    action: (productName: string) => setFilter({ ...filter, productName }),
  };

  //---------------------------------------------------------------------------------------------
  //Management filters ------------------------------------------------------------------------
  const salesAreas = areas
    ?.filter((item) => item.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));
  const ordertatus: SelectInterface[] = [
    { id: "CREATED", name: "Creada" },
    { id: "IN_PROCESS", name: "En proceso" },
    { id: "BILLED", name: "Facturada" },
    { id: "CANCELLED", name: "Cancelada" },
    { id: "CLOSED", name: "Cerrada" },
    { id: "COMPLETED", name: "Completada" },
  ];
  const paymentMethods: SelectInterface[] = [
    { id: "CASH", name: "Efectivo" },
    { id: "TRANSFER", name: "Transferencia" },
  ];
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "input",
      filterCode: "discount",
      name: "% descuento",
    },
    {
      format: "select",
      filterCode: "status",
      name: "Estado de la orden",
      data: ordertatus,
    },
    {
      format: "multiselect",
      filterCode: "paymentWay",
      name: "Método de pago",
      data: paymentMethods,
    },
    {
      format: "boolean",
      filterCode: "houseCosted",
      name: "Consumo casa",
      icon: <HomeModernIcon className="h-5 text-green-600" />,
    },
    {
      format: "boolean",
      filterCode: "hasDiscount",
      name: "Descuento",
    },
  ];

  //Disable AreaSale filter to shopOnlineManager (this information don't load in redux for this role)
  if (verifyRoles(['ADMIN'])) {
    availableFilters.push({
      format: "select",
      filterCode: "areaSalesId",
      name: "Punto de venta",
      data: salesAreas,
    });
  }

  const filterAction = (data: BasicType) => {
    data ? setFilter(data) : setFilter({ page: 1 });
  };

  //--------------------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Clientes",
      action: () => navigate("/clients/all"),
    },
    {
      name: "Listado de órdenes",
    },
  ];
  //------------------------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<UsersIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <div className="flex gap-2 items-center justify-end py-3 flex-shrink">
        <Button
          name="Editar"
          color="slate-500"
          action={() => setEditClientModal(true)}
          icon={<PencilIcon className="h-4" />}
        />
      </div>

      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
        loading={isLoading}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      {detailOrderModal.state && (
        <Modal
          state={detailOrderModal.state}
          close={() => setDetailOrderModal({ state: false })}
          size="m"
        >
          {orderOrigin === "pos" ? (
            <PosOrderDetails
              id={detailOrderModal.orderId}
              updState={updateAllOrderState}
            />
          ) : (
            <OnlineOrderDetailContainer
              id={detailOrderModal.orderId!}
              closeModal={() => setDetailOrderModal({ state: false })}
              editOrder={editOrder}
              fetching={fetchingOrder}
              updListState={updateAllOrderState}
            />
          )}
        </Modal>
      )}
      {editClientModal && (
        <Modal state={editClientModal} close={setEditClientModal} size="m">
          <EditOnlineClientContainer
            client={client!}
            editClient={editClient}
            deleteClient={deleteClient}
            isFetching={isFetching}
            isLoading={isLoading}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailOnlineClientContainer;
