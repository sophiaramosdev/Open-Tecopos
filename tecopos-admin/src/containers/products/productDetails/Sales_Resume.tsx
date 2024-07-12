import { useEffect, useContext, useState } from "react";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import useServerProduct from "../../../api/useServerProducts";
import { DetailProductContext } from "../DetailProductContainer";
import {
  formatDateTime,
  getStatusOrderSpanish,
} from "../../../utils/functions";
import Paginate from "../../../components/misc/Paginate";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { orderStatus } from "../../../utils/staticData";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import Modal from "../../../components/misc/GenericModal";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import {
  formatCurrency,
  formatDateForReportsWithYearAndHour,
} from "../../../utils/helpers";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import GenericList from "../../../components/misc/GenericList";
import PosOrderDetails from "../../economicCycles/orders/PosOrderDetails";
import useServerEcoCycle from "../../../api/useServerEconomicCycle";

const Sales_Resume = () => {
  const { product } = useContext(DetailProductContext);
  const { findAllOrdersWhereProduct, paginate, productSalesReport, isLoading } =
    useServerProduct();
  const  { updateAllOrderState} = useServerEcoCycle();
  const [filter, setFilter] = useState<BasicType>({});
  const [exportModal, setExportModal] = useState(false);
  const [productInfoModal, setProductInfoModal] = useState<any>(null)
  
  useEffect(() => {
    findAllOrdersWhereProduct(product?.id!, filter);
    // getProductSales(product?.id);
  }, [filter]);

  //Table data ---------------------------------------------------------------------------------------
  const titles = [
    "Número de la orden",
    "Nombre de la orden",
    "Fecha de creación",
    "Cantidad",
    "Precio unitario",
    "Fecha de pago",
    "Estado",
    "Cliente",
  ];
  const dataTable: DataTableInterface[] = [];
  productSalesReport.forEach((item) => {
    dataTable.push({
      rowId: item.id,
      payload: {
        "Número de la orden": item.orderReceipt.operationNumber,
        "Nombre de la orden": item.orderReceipt.name,
        "Fecha de creación": formatDateForReportsWithYearAndHour(
          item.orderReceipt.createdAt
        ),
        Cantidad: item.quantity,
        "Precio unitario": formatCurrency(
          item.priceUnitary?.amount,
          item.priceUnitary?.codeCurrency
        ),
        "Fecha de pago": formatDateTime(item.orderReceipt.paidAt),
        Estado: (
          <div className="flex flex-col">
            {
              <div>
                <OrderStatusBadge status={item.orderReceipt.status} />
              </div>
            }
          </div>
        ), 
        Cliente:
          (item.orderReceipt?.client?.firstName ?? "-") +
          " " +
          (item.orderReceipt?.client?.lastName ?? "-"),
      },
    });
  });

  const paymentMethods: SelectInterface[] = [
    { id: "CASH", name: "Efectivo" },
    { id: "TRANSFER", name: "Transferencia" },
    { id: "TROPIPAY", name: "TropiPay" },
  ];

  //Management filters ------------------------------------------------------------------------
  const availableFilters: FilterOpts[] = [
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
    {
      name: "Origen",
      filterCode: "origin",
      format: "multiselect",
      data: [
        { name: "Puntos de venta", id: "pos" },
        { name: "Tienda online", id: "online" },
      ],
    },
    {
      format: "select",
      filterCode: "paymentWay",
      name: "Método de pago",
      data: paymentMethods,
    },
    {
      format: "select",
      filterCode: "status",
      name: "Estado",
      data: orderStatus.map((element) => {
        return {
          id: element.code,
          name: element.value,
        };
      }),
    },
  ];

  const filterAction = (data: BasicType) => {
    data ? setFilter(data) : setFilter({ page: 1 });
  };

  const actions: BtnActions[] = [
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  const rowAction = (id: number) => {
    const productSold: any = productSalesReport?.find((item) => item.id == id);
    setProductInfoModal(productSold)
  };

  return (
    <>
      <div className="h-[34rem] overflow-y-auto scrollbar-thin border border-gray-300 rounded-md p-5">
        <GenericTable
          tableData={dataTable}
          tableTitles={titles}
          loading={isLoading}
          rowAction={rowAction}
          paginateComponent={
            <Paginate
              action={(page: number) => setFilter({ ...filter, page })}
              data={paginate}
            />
          }
          filterComponent={{ availableFilters, filterAction }}
          actions={actions}
        />
      </div>
      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            //@ts-ignore
            filter={filter}
            closeModal={() => setExportModal(false)}
            productId={product?.id!}
          />
        </Modal>
      )}
      {productInfoModal && (
        <Modal state={!!productInfoModal} close={() => setProductInfoModal(null)} size="l">
          <PosOrderDetails
            id={productInfoModal?.orderReceipt?.id}
            updState={updateAllOrderState}
          />
        </Modal>
      )}
    </>
  );
};

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
  productId: number;
}

const ExcelFileExport = ({
  filter,
  closeModal,
  productId,
}: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportOrdersWhereProducts, isLoading } = useServerProduct();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportOrdersWhereProducts(productId, filter, data.name, closeModal());
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

export default Sales_Resume;
