/* eslint-disable react-hooks/exhaustive-deps */
import moment from "moment";
import { useEffect, useState } from "react";
import { getStatusOrderSpanish } from "../../utils/functions";
import { getColorStatusOrder } from "../../utils/tailwindcss";
import { useParams, useLocation } from "react-router-dom";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
  SearchingInterface,
} from "../../components/misc/GenericTable";
import {
  CreditCardIcon,
  HomeModernIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Paginate from "../../components/misc/Paginate";
import { ReceiptPercentIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "../../store/hooks";
import { formatCurrency, generatePdf } from "../../utils/helpers";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import PosOrderDetails from "./orders/PosOrderDetails";
import Modal from "../../components/modals/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import { MdOutlinePriceChange } from "react-icons/md";
import OrderForm from "./orders/OrderForm";
import { Order } from "../../interfaces/Interfaces";
import { FaRegFilePdf } from "react-icons/fa";
import AccountsReceivablePdf from "../../reports/AccountsReceivablePdf";
import { Tooltip as ReactTooltip } from "react-tooltip";
import useServer from "../../api/useServerMain";
import OrderStatusBadge from "../../components/misc/badges/OrderStatusBadge";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export default function OrdersEcoCycle() {
  const { ecoCycleId } = useParams();
  const { pathname, state } = useLocation();
  const {
    getAllOrdesV2,
    getAllOrdesV1,
    allOrdes,
    isLoading,
    paginate,
    createFastOrder,
    updateAllOrderState,
  } = useServerEcoCycle();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { allowRoles: verifyRoles } = useServer();

  const defaultFilter: BasicType = !!ecoCycleId
    ? { economicCycleId: ecoCycleId ?? null }
    : { isFromEconomicCycle: true, status: "PAYMENT_PENDING" };
  const [filter, setFilter] = useState<BasicType>(defaultFilter);
  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    orderId?: number;
  }>({ state: false });
  const [openAddOrderModal, setOpenAddOrderModal] = useState(false);

  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-globals
    if (location.pathname.includes("ecocycle/accounts")) {
      getAllOrdesV1(filter);
    } else {
      getAllOrdesV2(filter);
    }
  }, [filter]);

  const currentPath = pathname.split("/")[2];

  //Data for generic Table-------------------------------------------------------------------
  const tableTitles: string[] =
    currentPath === "accounts"
      ? ["No. Orden/Factura", "Nombre", "Apertura", "Total", ""]
      : ["No. Orden/Factura", "Nombre", "Estado", "Apertura", "Cierre", "Total", ""];

  const tableData: DataTableInterface[] = [];
  allOrdes.forEach((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        "No. Orden/Factura": item.operationNumber,
        Nombre: item?.name || item?.client?.name || "",
        Estado: (
          <OrderStatusBadge status={item?.status}  />
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
        Total: (
          <div className="flex flex-col">
            {item.totalToPay.map((elem, key) => (
              <p key={key}>{formatCurrency(elem.amount, elem.codeCurrency)}</p>
            ))}
          </div>
        ),
        "": (
          <div className="inline-flex gap-2">
            {item.discount === 100 ? (
              <ReceiptPercentIcon
                className="h-6"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Descuento 100%"
              />
            ) : item.houseCosted ? (
              <HomeModernIcon
                className="h-5 text-green-600"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Consumo casa"
              />
            )
              : item.currenciesPayment !== undefined ? item.currenciesPayment.some(
                (item) => item.paymentWay === "TRANSFER"
              ) : (
                ""
              ) ? (
                <CreditCardIcon
                  className="h-5"
                  data-tooltip-id="my-tooltip"
                  data-tooltip-content="Pagado por transferencia"
                />
              )
                : (
                  ""
                )}
            {item.modifiedPrice && (
              <MdOutlinePriceChange
                style={{ height: "2rem", width: "1.4rem" }}
              />
            )}

            <ReactTooltip place="top" id="my-tooltip" />
          </div>
        ),
      },
    })
  }

  );

  const actions: BtnActions[] = [
    {
      title: "Exportar a Excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];


  // eslint-disable-next-line no-restricted-globals
  if (location.pathname.includes("ecocycle/accounts")) {
    actions.push(
      {
        title: "Exportar cuentas por cobrar Pdf",
        icon: <FaRegFilePdf className="h-5 text-gray-500" />,
        action: () =>
          generatePdf(
            <AccountsReceivablePdf accounts={allOrdes} ecoCycle={" "} />,
            "Cuentas por cobrar"
          ),
      }
    )
  }

  if (state?.isActive)
    actions.unshift({
      title: "Nueva orden",
      icon: <PlusIcon className="h-5" />,
      action: () => setOpenAddOrderModal(true),
    });

  const rowAction = (id: number) => {
    setDetailOrderModal({ state: true, orderId: id });
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
    {
      format: "boolean",
      filterCode: "modifiedPrice",
      name: "Precios modificados",
    },
    {
      format: "select",
      filterCode: "shippingById",
      name: "Repartidor",
      asyncData: {
        url: "/shipping/deliverers",
        idCode: "id",
        dataCode: "displayName",
      },
    },
    {
      format: "select",
      filterCode: "coupons",
      name: "Cupón",
      asyncData: {
        url: "/administration/marketing/coupon",
        idCode: "code",
        dataCode: "code",
      },
    },
  ];

  if (verifyRoles(['ADMIN']))
    availableFilters.push({
      format: "select",
      filterCode: "areaSalesId",
      name: "Punto de venta",
      data: salesAreas,
    });

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...defaultFilter, ...data }) : setFilter(defaultFilter);
  };

  //--------------------------------------------------------------------------------------------------------

  return (
    <>
      <GenericTable
        actions={actions}
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
          size="l"
        >
          <PosOrderDetails
            id={detailOrderModal.orderId}
            updState={updateAllOrderState}
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
            isFetching={isLoading}
            ecoCycleId={Number(ecoCycleId)}
            closeModal={(open: boolean) => setOpenAddOrderModal(!open)}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}
    </>
  );
}

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportOrdersCycle, isLoading } = useServerEcoCycle();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportOrdersCycle(
      {
        ...filter,
        all_data: true,
      },
      data.name,
      closeModal()
    );
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
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};
