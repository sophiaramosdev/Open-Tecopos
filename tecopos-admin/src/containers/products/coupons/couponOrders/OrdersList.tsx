import { useEffect, useState } from "react";
import useServerOrders from "../../../../api/useServerOrders";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../../components/misc/GenericTable";
import {
  formatDateTime,
  getStatusOrderSpanish,
} from "../../../../utils/functions";
import Paginate from "../../../../components/misc/Paginate";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import {
  CouponInterface,
  OrderInterface,
  PriceInvoiceInterface,
} from "../../../../interfaces/ServerInterfaces";
import { getOrdersOrigin } from "../../../../utils/stylesHelpers";
import Modal from "../../../../components/modals/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import OnlineOrderDetailContainer from "../../../store/orders/OnlineOrderDetailContainer";
import { getColorStatusOrder } from "../../../../utils/tailwindcss";
import { formatCalendar, formatCurrency } from "../../../../utils/helpers";
import { translateOrderOrigin } from "../../../../utils/translate";
import { orderStatus } from "../../../../utils/staticData";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

const OrdersList = ({ coupon }: { coupon: CouponInterface | null }) => {
  const [modalDetail, setModalDetail] = useState<number | null>(null);

  const {
    paginate,
    allOrders,
    updateAllOrderState,
    getAllOrders,
    outLoading,
    isFetching,
    editOrder,
  } = useServerOrders();

  const [filter, setFilter] = useState<BasicType>({
    page: 1,
    coupons: coupon?.code !== undefined ? coupon?.code : "",
  });

  useEffect(() => {
    getAllOrders(filter);
  }, [filter]);

  //Data
  const titles: string[] = [
    "Número de orden",
    "Cliente",
    "Estado",
    "Facturada el",
    "Subtotal",
    "Total",
    "Origen",
  ];

  const couponDisplay: Array<DataTableInterface> = [];
  allOrders.forEach((item) =>
    couponDisplay.push({
      rowId: item.id,
      payload: {
        "Número de orden": item?.operationNumber,
        Cliente:
          item?.client?.firstName || item?.client?.lastName
            ? `${item?.client?.firstName ?? ""} ${item?.client?.lastName ?? ""}`
            : item?.client?.email ?? "Invitado",
        Estado: (
          <div
            className={classNames(
              getColorStatusOrder(item?.status),
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0"
            )}
          >
            {getStatusOrderSpanish(item?.status)}
          </div>
        ),
        "Facturada el": formatCalendar(item?.paidAt),
        Subtotal: (
          <div className="flex flex-col">
            {item.prices.map((elem, idx) => (
              <p key={idx}>
                {formatCurrency(elem.price, elem.codeCurrency)}
              </p>
            ))}
          </div>
        ),
        Total: (
          <div className="flex flex-col">
            {item.totalToPay.map((price, idx) => (
              <p key={idx}>
                {formatCurrency(price.amount, price.codeCurrency)}
              </p>
            ))}
          </div>
        ),
        Origen: translateOrderOrigin(item.origin),
      },
    })
  );

  const ordersOrigin = getOrdersOrigin("woo,pos,online");

  //Filtros ------------------------------------------------------------------------
  const filterCreatedRange = [
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

  const filterBilledRange = [
    {
      filterCode: "billFrom",
      name: "Desde",
      isUnitlToday: true,
    },
    {
      filterCode: "billTo",
      name: "Hasta",
      isUnitlToday: true,
    },
  ];

  const ordersOriginSelectorData: SelectInterface[] =
    ordersOrigin.map((item) => ({ id: item.value, name: item.title })) ?? [];
  const availableFilters: FilterOpts[] = [
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Fecha de creación",
      datepickerRange: filterCreatedRange,
    },
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Fecha de Facturación",
      datepickerRange: filterBilledRange,
    },
    {
      format: "select",
      filterCode: "status",
      name: "Estado de la orden",
      data: orderStatus.map((itm) => ({ id: itm.code, name: itm.value })),
    },    
    {
      format: "input",
      filterCode: "billFrom",
      name: "Total gastado desde",
    },
    {
      format: "input",
      filterCode: "billTo",
      name: "Total gastado hasta",
    },
    {
      format: "input",
      filterCode: "paidTo",
      name: "Total facturado hasta",
    },

    {
      format: "select",
      filterCode: "origin",
      name: "Origen",
      data: ordersOriginSelectorData,
    },
    {
      format: "select",
      filterCode: "clientId",
      name: "Cliente",
      asyncData: {
        url: "/customer",
        idCode: "id",
        dataCode: "email",
      },
    },
  ];
  const filterAction = (data: BasicType | null) => {
    data
      ? setFilter({ ...filter, ...data, page:null })
      : setFilter({
          page: 1,
          coupons: coupon?.code !== undefined ? coupon?.code : "",
        });
  };
  const [exportModal, setExportModal] = useState(false);

  const actions: BtnActions[] = [
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  const rowAction = (id: number) => {
    setModalDetail(id);
  };
  
  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar órden",
  };

  return (
    <div className="pt-1">
      <GenericTable
        tableTitles={titles}
        tableData={couponDisplay}
        actions={actions}
        loading={outLoading}
        rowAction={rowAction}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}

      {modalDetail && (
        <Modal
          state={!!modalDetail}
          close={() => setModalDetail(null)}
          size="m"
        >
          <OnlineOrderDetailContainer
            fetching={isFetching}
            id={modalDetail}
            editOrder={editOrder}
            closeModal={() => setModalDetail(null)}
            updListState={updateAllOrderState}
          />
        </Modal>
      )}
    </div>
  );
};

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { isLoading, exportOrders } = useServerOrders();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportOrders(filter, data.name, closeModal());
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

export default OrdersList;
