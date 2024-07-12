import { useState, useEffect, useContext } from "react";
import useServerBankAccount from "../../../api/useServerBankAccount";
import { BankAccountOperationInterfaces } from "../../../interfaces/ServerInterfaces";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import {
  ArrowLongRightIcon,
  ArrowPathRoundedSquareIcon,
  PlusIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import NewOperation from "./NewOperation";
import {
  formatCalendar,
  formatCurrency,
  formatCurrencyWithOutCurrency,
  formatDateForReports,
  formatDateForReportsWithYear,
} from "../../../utils/helpers";
import DetailOperationModal from "./DetailOperationModal";
import { ReportInterface } from "../../../components/misc/ReportsComponent";
import NewTransfer from "./NewTransfer";
import ReportBalanceOperations from "./ReportBalanceOperations";
import NewExchangeCurrency from "./NewExchangeCurrency";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import ExcelFileExport from "../../../components/commos/ExcelFileExport";
import { exportExcel } from "../../../utils/helpers";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import moment from "moment";

export default function ListOperations() {
  const { bankAccountId } = useParams();
  const {
    bankAccount,
    allBankAccountOperation,
    getAllBankAccountOperations,
    paginateOperation,
    isLoading,
  } = useContext(DetailAccountContext);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [openTransferModal, setOpenTransferModal] = useState<boolean>(false);
  const [openExchangeCurrencyModal, setOpenExchangeCurrencyModal] =
    useState<boolean>(false);

  const [currentAccountOperation, setCurrentAccountOperation] =
    useState<BankAccountOperationInterfaces | null>(null);

  //Metodo ascociado al filtrado de AccountsOperation en DB
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean> | undefined
  >();

  useEffect(() => {
    if (!!filter) getAllBankAccountOperations!(bankAccountId, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  //Selectors ----------------------------------------------------------------------------------
  const operationSelector: SelectInterface[] = [
    {
      id: "credit",
      name: "Débito",
      disabled: false,
    },
    {
      id: "debit",
      name: "Crédito",
      disabled: false,
    },
  ];
  //Reports data ---------------------------------------------------------------------------------X
  const report: ReportInterface[] = [];

  bankAccount?.actualBalance.forEach((balance) => {
    let color: string;
    balance.amount === 0
      ? (color = "black")
      : balance.amount < 0
        ? (color = "red-800")
        : (color = "green-800");

    report.push({
      name: balance.codeCurrency,
      value: formatCurrencyWithOutCurrency(
        balance.amount,
        balance.codeCurrency
      ),
      color: color,
    });
  });

  //Data for Table List --------------------------------------------------------------------

  const titles: string[] = [
    "Concepto",
    "Fecha",
    "Monto",
    "Hecho por",
    "No.Transacción",
    "Descripción",
  ];
  const displayData: Array<DataTableInterface> = [];
  allBankAccountOperation?.forEach((item) => {

    if (showBalance) {
      return displayData.push({
        rowId: item.id,
        borderTop: item.operation === "balance",
        borderBottom: item.operation === "balance",
        rowWihtoutIcon: item.operation === "balance",
        boldRow: item.operation === "balance",
        rowColor: item.operation === "balance" ? "orange-100  cursor-text text-bold" : "",
        payload: {
          Concepto: item?.accountTag ? item?.accountTag?.name : "---",
          Fecha: item.operation === "balance" ? formatDateForReportsWithYear(item.registeredAt) : formatCalendar(item.registeredAt),
          Monto:
            <span className={`py-1 px-2 rounded-full text-sm ${item.amount?.amount! > 0 ? "text-green-700" : "text-red-700"}  font-semibold text-center`}>
              {formatCurrency(
                item?.amount?.amount ?? 0,
                item?.amount?.codeCurrency
              )}
            </span>
          ,
          "Hecho por": item?.madeBy?.displayName,
          "No.Transacción": item.noTransaction,
          Descripción: <p className="text-justify">{item.description}</p>,
        },
      })
    } else {
      if (item.operation !== "balance") {
        return displayData.push({
          rowId: item.id,
          payload: {
            Concepto: item?.accountTag ? item?.accountTag?.name : "---",
            Fecha: formatCalendar(item.registeredAt),
            Monto:
              <span className={`py-1 px-2 rounded-full text-sm ${item.amount?.amount! > 0 ? "text-green-700" : "text-red-700"}  font-semibold text-center`}>
                {formatCurrency(
                  item?.amount?.amount ?? 0,
                  item?.amount?.codeCurrency
                )}
              </span>
            ,
            "Hecho por": item?.madeBy?.displayName,
            "No.Transacción": item.noTransaction,
            Descripción: <p className="text-justify">{item.description}</p>,
          },
        })
      }
    }
  }
  );

  //Action after click in RowTable
  const rowAction = (id: number) => {
    const currentOp = allBankAccountOperation!.find((item) => item.id === id)!;
    if (currentOp.operation !== "balance") {
      setCurrentAccountOperation(currentOp);
    }
  };

  const actions = [
    {
      icon: showBalance ? <EyeSlashIcon className="h-5" title="Ocultar balance" /> : <EyeIcon className="h-5" title="Mostrar balance" />,
      action: () => setShowBalance(!showBalance),
      title: showBalance ? "Ocultar balance" : "Mostrar balance",
    },
    {
      icon: <PlusIcon className="h-5" title="Agregar operación" />,
      action: () => setOpenModal(true),
      title: "Nueva operación",
    },
    {
      icon: <ArrowLongRightIcon className="h-5" title="Nueva transferencia" />,
      action: () => setOpenTransferModal(true),
      title: "Nueva transferencia",
    },
    {
      icon: (
        <ArrowPathRoundedSquareIcon
          className="h-5"
          title="Nuevo cambio de moneda"
        />
      ),
      action: () => setOpenExchangeCurrencyModal(true),
      title: "Cambio de moneda",
    },
    {
      title: "Exportar a Excel",
      icon: <ArrowDownTrayIcon className="h-5" title="Exportar a Excel" />,
      action: () => {
        if (filter?.dateFrom !== undefined) {
          setExportModal(true);
        } else {
          toast.error("Por favor defina un rango de fecha en el filtro");
        }
      },
    },
  ];

  //Management filters ------------------------------------------------------------------------

  const filterCodeDatePickerRange = [
    {
      filterCode: "dateFrom",
      name: "Desde",
      isUnitlToday: false,
      includingTime: true,
    },
    {
      filterCode: "dateTo",
      name: "Hasta",
      isUnitlToday: true,
      includingTime: true,
    },
  ];

  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "datepicker-range",
      filterCode: "",
      name: "Rango de Fecha",
      datepickerRange: filterCodeDatePickerRange,
    },
    {
      format: "select",
      filterCode: "accountTagId",
      name: "Conceptos",
      asyncData: {
        url: `/administration/bank/tag/${bankAccountId}`,
        dataCode: "name",
        idCode: "id",
        defaultParams: { page: 1 },
      },
    },
    {
      format: "select",
      filterCode: "operation",
      name: "Operaciones",
      data: operationSelector.map((operation) => ({
        id: operation.id,
        name: operation.name,
      })),
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ all_data: true, ...data }) : setFilter({ page: 1 });
  };

  //--------------------------------------------------------------------------------------------------------

  //Export to excel
  const [exportModal, setExportModal] = useState(false);
  const {
    getAllBankAccountOperations: getAllOperations,
    isLoading: loadingExport,
  } = useServerBankAccount();

  const exportBankAccounts = async (filename: string) => {
    const data = await getAllOperations(
      bankAccountId,
      { ...filter, all_data: true },
      true
    );

    let dataToExport;

    const mapItem = (item: any) => ({
      Concepto: item?.accountTag ? item?.accountTag?.name : "---",
      Fecha: item?.operation === "balance" ? moment(item.registeredAt).format("DD-MM-YYYY") : moment(item.registeredAt).format("DD-MM-YYYY hh:mm A"),
      Monto: item?.amount?.amount ?? "-",
      Moneda: item?.amount?.codeCurrency,
      "Hecho por": item?.madeBy?.displayName ?? "",
      Descripción: item.description,
    });

    if (showBalance) {
      dataToExport = data.map(mapItem);
    } else {
      dataToExport = data.filter((e: any) => e.operation !== "balance").map(mapItem);
    }

    exportExcel(dataToExport, filename);
    setExportModal(false);
  };

  return (
    <>
      <ReportBalanceOperations report={report} />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        actions={actions}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginateOperation}
          />
        }
        loading={isLoading}
      />

      {openModal && (
        <Modal state={openModal} close={() => setOpenModal(false)} size="m">
          <NewOperation closeModal={() => setOpenModal(false)} />
        </Modal>
      )}

      {openTransferModal && (
        <Modal
          state={openTransferModal}
          close={() => setOpenTransferModal(false)}
          size="m"
        >
          <NewTransfer closeModal={() => setOpenTransferModal(false)} />
        </Modal>
      )}

      {openExchangeCurrencyModal && (
        <Modal
          state={openExchangeCurrencyModal}
          close={() => setOpenExchangeCurrencyModal(false)}
          size="m"
        >
          <NewExchangeCurrency
            closeModal={() => setOpenExchangeCurrencyModal(false)}
          />
        </Modal>
      )}

      {!!currentAccountOperation && (
        <Modal
          state={!!currentAccountOperation}
          close={() => setCurrentAccountOperation(null)}
          size="m"
        >
          <DetailOperationModal
            closeModal={() => setCurrentAccountOperation(null)}
            accountOperation={currentAccountOperation}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            exportAction={exportBankAccounts}
            loading={loadingExport}
          />
        </Modal>
      )}
    </>
  );
}
