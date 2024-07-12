import { createContext, useEffect, useState } from "react";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import Breadcrumb from "../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import { useServerBilling } from "../../../api/useServerBilling";
import Paginate from "../../../components/misc/Paginate";
import {
  exportExcel,
  formatCurrency,
  formatCurrencyWithOutCurrency,
} from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";
import {
  OrderInterfaceV2,
  PaginateInterface,
  RegisterBillingInterface,
  SimplePrice,
} from "../../../interfaces/ServerInterfaces";
import { FaRegFileExcel } from "react-icons/fa";
import Modal from "../../../components/misc/GenericModal";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import ListOverdue from "./ListOverdue";
import { RegisterDetailsContainerOverdue } from "./RegisterDetailsContainer";

interface OverduePaymentsInterface {
  cliente: string;
  totalToPay: SimplePrice[];
  totalPaid: SimplePrice[];
  under30Days: SimplePrice[];
  between30And60Days: SimplePrice[];
  over60Days: SimplePrice[];
}

interface ListOverdueContext {
  getAllRegisterBillingList: Function;
  deletePartialPayment: Function;
  updateSingleOrderState: Function;
  refundBillingOrder: Function;
  getOrderBillingById: Function;
  cancelOrder: Function;
  registerBillingList: RegisterBillingInterface[];
  isFetching: boolean;
  isLoading: boolean;
  registerPaginate: PaginateInterface;
  orderById: RegisterBillingInterface | null | undefined;
}

export const ListOverdueContext = createContext<Partial<ListOverdueContext>>(
  {}
);

const OverduePayments = () => {
  // Hooks
  const {
    // getAllOverduePayments,
    overduePaymentsList,
    overduePaginate,
    isFetching,
    getAllOverduePaymentsV2,
    getAllRegisterBillingList,
    registerBillingList,
    deletePartialPayment,
    updateSingleOrderState,
    getOrderBillingById,
    orderById,
    isLoading,
    registerPaginate,
    refundBillingOrder,
    cancelOrder,
  } = useServerBilling();

  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  const [exportModal, setExportModal] = useState(false);
  const [lisOrderModal, setLisOrderModal] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<number | null>(null);

  const tableTitle = [
    "Cliente",
    "Σ Vencido",
    "Σ Pagado",
    "< 30 días",
    "30 - 60 días",
    " 60 días <",
  ];

  const tableData: DataTableInterface[] = [];
  overduePaymentsList?.map((item: OverduePaymentsInterface, idx) =>
    tableData.push({
      //@ts-ignore
      rowId: item.id,
      payload: {
        Cliente: <span className="flex flex-col">{item.cliente}</span>,
        // "Σ Pendientes": (
        //   <div className="flex flex-col">
        //      { formatCurrencyWithOutCurrency(item.totalPending)}
        //   </div>
        // ),
        // "Σ Pendientes": (
        //   <div className="flex flex-col">
        //      { formatCurrency(item.totalPending,mainCurrency)}
        //   </div>
        // ),
        "Σ Vencido": (
          <span className="flex flex-col gap-y-1">
            {item.totalToPay.length !== 0 ? (
              item.totalToPay.map((item) => (
                <p className="block">
                  {formatCurrency(item?.amount, item?.codeCurrency)}
                </p>
              ))
            ) : (
              <p>{formatCurrencyWithOutCurrency(0.0)}</p>
            )}
          </span>
        ),
        "Σ Pagado": (
          <span className="flex flex-col gap-y-1">
            {item.totalPaid.length !== 0 ? (
              item.totalPaid.map((item) => (
                <p className="block">
                  {formatCurrency(item?.amount, item?.codeCurrency)}
                </p>
              ))
            ) : (
              <p>{formatCurrencyWithOutCurrency(0.0)}</p>
            )}
          </span>
        ),
        "< 30 días": (
          <span className="flex flex-col gap-y-1">
            {item.under30Days.length !== 0 ? (
              item.under30Days.map((item) => (
                <p className="block">
                  {formatCurrency(item?.amount, item?.codeCurrency)}
                </p>
              ))
            ) : (
              <p>{formatCurrencyWithOutCurrency(0.0)}</p>
            )}
          </span>
        ),
        "30 - 60 días": (
          <span className="flex flex-col gap-y-1">
            {item.between30And60Days.length !== 0 ? (
              item.between30And60Days.map((item) => (
                <p className="block">
                  {formatCurrency(item?.amount, item?.codeCurrency)}
                </p>
              ))
            ) : (
              <p>{formatCurrencyWithOutCurrency(0.0)}</p>
            )}
          </span>
        ),
        " 60 días <": (
          <span className="flex flex-col gap-y-1">
            {item.over60Days.length !== 0 ? (
              item.over60Days.map((item) => (
                <p className="block">
                  {formatCurrency(item?.amount, item?.codeCurrency)}
                </p>
              ))
            ) : (
              <p>{formatCurrencyWithOutCurrency(0.0)}</p>
            )}
          </span>
        ),
      },
    })
  );

  const exportAction = (name: string) => {
    const dataToExport: Record<string, string | number | string[]>[] = [];
    overduePaymentsList.forEach((element: OverduePaymentsInterface) => {
      dataToExport.push({
        Cliente: element.cliente,
        "Σ Vencido": element.totalToPay
          .map((item) => `${formatCurrency(item?.amount, item?.codeCurrency)}`)
          .join("\n"),
        "Σ Pagado": element.totalPaid
          .map((item) => `${formatCurrency(item?.amount, item?.codeCurrency)}`)
          .join("\n"),
        "< 30 días": element.under30Days
          .map((item) => `${formatCurrency(item?.amount, item?.codeCurrency)}`)
          .join("\n"),
        "30 - 60 días": element.between30And60Days
          .map((item) => `${formatCurrency(item?.amount, item?.codeCurrency)}`)
          .join("\n"),
        " 60 días <": element.over60Days
          .map((item) => `${formatCurrency(item?.amount, item?.codeCurrency)}`)
          .join("\n"),
      });
    });
    exportExcel(dataToExport, name);
  };

  useEffect(() => {
    getAllOverduePaymentsV2(filter);
  }, [filter]);

  const tableActions = [
    {
      title: "Exportar a Excel",
      icon: <FaRegFileExcel className="h-5 text-gray-500" />,
      action: () => setExportModal(true),
    },
  ];

  const rowAction = (id: number | null) => {
    setLisOrderModal(id);
  };

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter(filter);
  };

  const actionModalList = (id: number | null) => {
    setLisOrderModal(null);
    setDetailsModal(id);
  };

  return (
    <div>
      <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Facturación" }, { name: "Pagos vencidos" }]}
      />

      <GenericTable
        tableTitles={tableTitle}
        tableData={tableData}
        actions={tableActions}
        rowAction={rowAction}
        syncAction={{
          action: () => {
            getAllOverduePaymentsV2(filter);
          },
          loading: isFetching,
        }}
        loading={isFetching}
        //filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={overduePaginate}
          />
        }
      />
      <ListOverdueContext.Provider
        value={{
          isFetching,
          getAllRegisterBillingList,
          registerBillingList,
          deletePartialPayment,
          updateSingleOrderState,
          getOrderBillingById,
          orderById,
          isLoading,
          registerPaginate,
          refundBillingOrder,
          cancelOrder,
        }}
      >
        {lisOrderModal && (
          <Modal state={!!lisOrderModal} close={setLisOrderModal} size="l">
            <ListOverdue
              close={() => setLisOrderModal(null)}
              id={lisOrderModal}
              action={actionModalList}
            />
          </Modal>
        )}
        {detailsModal && (
          <Modal state={!!detailsModal} close={setDetailsModal} size="l">
            <RegisterDetailsContainerOverdue
              closeModalDetails={() => setDetailsModal(null)}
              id={detailsModal}
            />
          </Modal>
        )}
      </ListOverdueContext.Provider>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportAction}
            close={() => setExportModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};
export default OverduePayments;

const ExportModalContainer = ({
  exportAction,
  close,
}: {
  exportAction: Function;
  close: Function;
}) => {
  const { control, handleSubmit } = useForm();
  const submit: SubmitHandler<Record<string, string>> = (data) => {
    exportAction(data.name);
    close();
  };
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Input
        name="name"
        control={control}
        label="Nombre del archivo .xlsx"
        rules={{ required: "Requerido *" }}
      />
      <div className="flex justify-end py-2">
        <Button color="slate-600" name="Aceptar" type="submit" />
      </div>
    </form>
  );
};
