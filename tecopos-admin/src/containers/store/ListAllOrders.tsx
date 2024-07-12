import { useEffect, useState } from "react";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../components/misc/GenericTable";
import { formatCalendar, formatCurrencyV2 } from "../../utils/helpers";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import OnlineOrderDetailContainer from "./orders/OnlineOrderDetailContainer";
import OrderStatusBadge from "../../components/misc/badges/OrderStatusBadge";
import { useAppSelector } from "../../store/hooks";
import { toast } from "react-toastify";
import { BuildingStorefrontIcon, PlusIcon } from "@heroicons/react/24/outline";
import { FaRegFileExcel, FaRegFilePdf } from "react-icons/fa";
import reportDownloadHandler from "../../reports/helpers/reportDownloadHandler";
import { CurrencyInterface } from "../../interfaces/ServerInterfaces";
import ExcelFileExport from "../../components/commos/ExcelFileExport";
import { orderStatus } from "../../utils/staticData";
import {
  FaMoneyBillWave,
  FaPersonWalkingLuggage,
  FaTruckFast,
} from "react-icons/fa6";
import OrderForm from "../economicCycles/orders/OrderForm";
import { Order } from "../../interfaces/Interfaces";
import useServerOrders from "../../api/useServerOrders";
import { Tooltip as ReactTooltip } from "react-tooltip";

const ListAllOrders = () => {
  const {
    getAllOrdesV2,
    updateAllOrderState,
    editOrder,
    allOrdes,
    isLoading,
    isFetching,
    paginate,
    createFastOrder,
  } = useServerEcoCycle();
  const { exportStoreOrders, isLoading: loadingExport } = useServerOrders();
  const { business } = useAppSelector((state) => state.init);
  //@ts-ignore
  const { availableCurrencies } = business;
  const defaultFilter = { origin: "woo,online,shop,shopapk,marketplace,apk" };
  const [filter, setFilter] = useState<BasicType>(defaultFilter);
  const [modalDetail, setModalDetail] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [openAddOrderModal, setOpenAddOrderModal] = useState(false);

  useEffect(() => {
    getAllOrdesV2(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  //Breadcrumb -----------------------------------------------------------------
  const paths: PathInterface[] = [{ name: "Tienda online" }, { name: "Pedidos" }];

  //-------------------------------------------------------------------------------

  //Table -----------------------------------------------------------------------
  const tableTitle = [
    "Número de orden",
    "Fecha",
    "Estado",
    "Total",
    "Dirección de envío",
    "",
  ];
  const tableData: DataTableInterface[] = [];
  allOrdes.forEach((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        "Número de orden": (
          <div className="flex flex-col">
            <p>{item.operationNumber}</p>
            <p className="text-gray-400 text-sm">{`${
              item?.billing?.firstName ?? ""
            } ${item?.billing?.lastName ?? ""}`}</p>
          </div>
        ),
        Fecha: formatCalendar(item.createdAt),
        Estado: <OrderStatusBadge status={item.status} />,
        Total: (
          <div className="flex flex-col">
            {item.totalToPay.map((item) =>
              formatCurrencyV2(item?.amount, item?.codeCurrency) + " "
            )}
          </div>
        ),
        "Dirección de envío": (
          <p className="text-justify">{`${item?.shipping?.street_1 ?? ""} ${
            item?.shipping?.street_2 ?? ""
          } ${item?.shipping?.city ?? ""} ${
            item?.shipping?.municipality?.name ?? ""
          } ${item?.shipping?.province?.name ?? ""} ${
            item?.shipping?.country?.name ?? ""
          }`}</p>
        ),
        "": (
          <div className="inline-flex gap-2 ">
            {!item.pickUpInStore && (
              <FaTruckFast
                className="text-xl text-gray-800"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Recogida en tienda"
              />
            )}
            {!!item?.shippingById && (
              <FaPersonWalkingLuggage
                className="text-xl text-gray-800"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Enviado"
              />
            )}
            {!!item?.paidAt && (
              <FaMoneyBillWave
                className="text-xl text-gray-800"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Pagado"
              />
            )}

            <ReactTooltip place="top" id="my-tooltip" />
          </div>
        ),
      },
    });
  });

  const rowAction = (id: number) => {
    setModalDetail(id);
  };

  //---------------------------------------------------------------------------
  //Management filters ------------------------------------------------------------------------
  const createRange = [
    {
      filterCode: "dateFrom",
      name: "Desde",
      isUnitlToday: false,
    },
    {
      filterCode: "dateTo",
      name: "Hasta",
      isUnitlToday: true,
    },
  ];

  const billedRange = [
    {
      filterCode: "paidFrom",
      name: "Desde",
      isUnitlToday: false,
    },
    {
      filterCode: "paidTo",
      name: "Hasta",
      isUnitlToday: true,
    },
  ];

  const currencySelector: SelectInterface[] =
    availableCurrencies.map((currency: CurrencyInterface) => ({
      id: currency.code,
      name: currency.code,
    })) ?? [];

  const orderStatusSelector: SelectInterface[] = orderStatus.map((itm) => ({
    id: itm.code,
    name: itm.value,
  }));

  useEffect(() => {
    if (
      (!!filter.billTo ||
        !!filter.billFrom ||
        !!filter.paymentCurrencyCode ||
        !!filter.paymentWay) &&
      isLoading
    ) {
      toast.warning(
        "Uno de los filtros seleccionados provocará una demora en la entrega de los resultados. Por favor sea paciente y espere."
      );
    } else {
      toast.dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Fecha de creación",
      datepickerRange: createRange,
    },
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Fecha de facturación",
      datepickerRange: billedRange,
    },
    {
      format: "input",
      filterCode: "billFrom",
      name: "Monto de venta desde",
    },
    {
      format: "input",
      filterCode: "billTo",
      name: "Monto de venta hasta",
    },
    {
      format: "select",
      filterCode: "paymentCurrencyCode",
      name: "Moneda de pago",
      data: currencySelector,
    },
    {
      format: "multiselect",
      filterCode: "status",
      name: "Estado",
      data: orderStatusSelector,
    },
    {
      format: "select",
      name: "Repartidor",
      filterCode: "shippingById",
      asyncData: {
        url: "/shipping/deliverers",
        idCode: "id",
        dataCode: "displayName",
      },
    },
    {
      format: "select",
      filterCode: "pickUpInStore",
      name: "Recogida en tienda",
      data: [
        { id: "true", name: "Sí" },
        { id: "false", name: "No" },
      ],
    },
    {
      format: "datepicker",
      filterCode: "deliveryAt",
      name: "Entrega/Recogida",
      //isUntilToday: true,
    },
    {
      format: "select",
      filterCode: "coupons",
      name: "Cupones",
      asyncData: {
        url: "/administration/marketing/coupon",
        idCode: "id",
        dataCode: "code",
        defaultParams: { page: 1 },
      },
    },
    {
      format: "input",
      filterCode: "productName",
      name: "Nombre de productos",
    },
    {
      format: "input",
      filterCode: "operationNumber",
      name: "Número de orden",
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...defaultFilter, ...data }) : setFilter(defaultFilter);
  };

  //-----------------------------------------------------------------------
  const exportAction = async (name: string) => {
    exportStoreOrders(filter, name, () => setExportModal(false));
  };

  return (
    <>
      <Breadcrumb
        paths={paths}
        icon={<BuildingStorefrontIcon className="h-6 text-gray-500" />}
      />
      <GenericTable
        tableTitles={tableTitle}
        tableData={tableData}
        loading={isLoading}
        rowAction={rowAction}
        syncAction={{ action: () => getAllOrdesV2(filter), loading: isLoading }}
        actions={[
          // {
          //   title: "Nueva orden",
          //   icon: <PlusIcon className="h-5" />,
          //   action: () => setOpenAddOrderModal(true),
          // },
          {
            title: "Exportar a Pdf",
            icon: <FaRegFilePdf className="h-5 text-gray-500" />,
            action: () =>
              reportDownloadHandler(
                "Ordenes con productos",
                "order_list",
                business!,
                allOrdes,
                { page: { orientation: "landscape" } }
              ),
          },
          {
            title: "Exportar a Excel",
            icon: <FaRegFileExcel className="h-5 text-gray-500" />,
            action: () => setExportModal(true),
          },
        ]}
        searching={{
          placeholder: "Buscar orden",
          action: (search: string | null) =>
            setFilter({ ...filter, operationNumber: search }),
        }}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      {modalDetail && (
        <Modal
          state={!!modalDetail}
          close={() => setModalDetail(null)}
          size="l"
        >
          <OnlineOrderDetailContainer
            fetching={isFetching}
            id={modalDetail}
            updListState={updateAllOrderState}
            editOrder={editOrder}
            closeModal={() => setModalDetail(null)}
          />
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
      {openAddOrderModal && (
        <Modal
          close={() => setOpenAddOrderModal(false)}
          state={openAddOrderModal}
          size="m"
        >
          <OrderForm
            action={(data: Order) =>
              createFastOrder(data, () => setOpenAddOrderModal(false))
            } //TODO buscar/crear llamada a endpoint para crear orden
            isFetching={isFetching}
            closeModal={(open: boolean) => setOpenAddOrderModal(!open)}
          />
        </Modal>
      )}
    </>
  );
};

export default ListAllOrders;
