import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb from "../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import React, { createContext, useEffect, useState } from "react";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import Modal from "../../../components/modals/GenericModal";
import { useServerBilling } from "../../../api/useServerBilling";
import {
  exportExcel,
  formatCurrency,
  formatDate,
  formatDateForTable,
  generatePdf,
} from "../../../utils/helpers";
import Paginate from "../../../components/misc/Paginate";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import { WizzardRegisterBilling } from "./registers/WizzardRegisterBilling";
import { RegisterDetailsContainer } from "./RegisterDetailsContainer";
import {
  FaClipboard,
  FaMoneyBill,
  FaMoneyCheck,
  FaRegFileExcel,
  FaRegFilePdf,
} from "react-icons/fa";
import { printPriceWithCommasAndPeriods } from "../../../utils/functions";
import {
  Control,
  SubmitHandler,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
  UseFieldArrayUpdate,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormReset,
  UseFormSetValue,
  UseFormTrigger,
  UseFormWatch,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { RegisterBillingInterface } from "../../../interfaces/ServerInterfaces";
import { parseISO } from "date-fns";
import { useAppSelector } from "../../../store/hooks";
import {
  translateOrderOrigin,
  translateOrderState,
} from "../../../utils/translate";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { BsFiletypeXlsx } from "react-icons/bs";
import { toast } from "react-toastify";
import moment from "moment";
import reportDownloadHandler from "../../../reports/helpers/reportDownloadHandler";
import BillingOrderListPdf from "../../../reports/BillingOrderListPdf";
import {
  FaMoneyBill1,
  FaMoneyBill1Wave,
  FaRegMoneyBill1,
} from "react-icons/fa6";
import { Tooltip } from "react-tooltip";
export interface RegisterContextInterface {
  currentStep: number;
  setCurrentStep: Function;
  watch: UseFormWatch<Record<string, any>>;
  getValues: UseFormGetValues<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  reset: UseFormReset<Record<string, any>>;
  control: Control;
  handleSubmit: UseFormHandleSubmit<Record<string, any>>;
  trigger: UseFormTrigger<Record<string, any>>;
  fields: Record<string, any>[];
  append: UseFieldArrayAppend<any, "products">;
  remove: UseFieldArrayRemove;
  clearArrayOfProducts: UseFieldArrayReplace<any, "products">;
  update: UseFieldArrayUpdate<any, "products">;
  clearErrors: UseFormClearErrors<Record<string, any>>;
  isFetching?: boolean;
  isSubmit?: boolean;
  isLoading: boolean;
  isFetchingAux: boolean;
  orderById?: RegisterBillingInterface | null;
  convertPreBillToBill: Function;
  refundBillingOrder: Function;
  getOrderBillingById: Function;
  updateSingleOrderState: Function;
  editBilling: Function;
  addNewBilling: Function;
  addNewPreBilling: Function;
  cancelOrder: Function;
  close: Function;
  submit?: boolean;
  setSubmit?: Function;
  deletePartialPayment?: Function;
  setIsLoading?: Function;
  openPayModal?: boolean;
  setOpenPayModal?: Function;
  setDetailsRegisterModal?: Function;
}

export const RegisterContext = createContext<Partial<RegisterContextInterface>>(
  {}
);

const AllRegistersList = () => {
  // Hooks
  const {
    getAllRegisterBillingList,
    registerBillingList,
    isFetching,
    registerPaginate,
    updateOrderListLocally,
    addNewPreBilling,
    addNewBilling,
    editBilling,
    isLoading,
    cancelOrder,
    getOrderBillingById,
    orderById,
    updateSingleOrderState,
    convertPreBillToBill,
    refundBillingOrder,
    deletePartialPayment,
    isFetchingAux,
    setIsLoading,
    exportExcelOrders,
  } = useServerBilling();

  const [filter, setFilter] = useState<BasicType>({
    page: 1,
    partialPayment: true,
  });
  const [isSubmit, setSubmit] = useState<boolean>(false);
  const [wizzardRegisterBillingModal, setWizzardRegisterBillingModal] =
    useState(false);
  const [detailsRegisterModal, setDetailsRegisterModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });
  //---------Control for pay modal in register and billing --->
  const [openPayModal, setOpenPayModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  const { business } = useAppSelector((state) => state.init);

  useEffect(() => {
    if (!detailsRegisterModal.state) {
      setOpenPayModal(false);
    }
  }, [detailsRegisterModal]);

  const {
    trigger,
    getValues,
    control,
    watch,
    setValue,
    reset,
    clearErrors,
    handleSubmit,
  } = useForm();
  const { append, fields, remove, update, replace } = useFieldArray({
    name: "products",
    control,
  });
  const [currentStep, setCurrentStep] = useState<number>(0);

  const currencies =
    business?.availableCurrencies.map((item) => item.code) ?? [];

  const contextValues: RegisterContextInterface = {
    currentStep,
    setCurrentStep,
    control,
    watch,
    reset,
    setValue,
    fields,
    append,
    remove,
    update,
    trigger,
    getValues,
    clearErrors,
    isFetching,
    addNewBilling,
    addNewPreBilling,
    isLoading,
    editBilling,
    handleSubmit,
    orderById,
    cancelOrder,
    clearArrayOfProducts: replace,
    getOrderBillingById,
    convertPreBillToBill,
    updateSingleOrderState,
    refundBillingOrder,
    isSubmit,
    setSubmit,
    deletePartialPayment,
    close: () => setWizzardRegisterBillingModal(false),
    isFetchingAux,
    setIsLoading,
    setDetailsRegisterModal,
    setOpenPayModal,
    openPayModal,
  };
  // =================================================

  // BillingType
  const billingType: SelectInterface[] = [
    {
      id: "false",
      name: "Factura",
    },
    {
      id: "true",
      name: "Pre-factura",
    },
  ];
  // BillingStates
  const billingStates: SelectInterface[] = [
    {
      id: "PAYMENT_PENDING",
      name: "Pendiente de pago",
    },
    {
      id: "CREATED",
      name: "Creada",
    },
    {
      id: "OVERDUE",
      name: "Vencido",
    },
    {
      id: "BILLED",
      name: "Facturada",
    },
    {
      id: "REFUNDED",
      name: "Reembolsado",
    },
    {
      id: "CANCELLED",
      name: "Cancelado",
    },
    {
      id: "ACTIVE",
      name: "Activa",
    },
    {
      id: "CLOSED",
      name: "Cerrada",
    },
    {
      id: "DISPATCHED",
      name: "Despachada",
    },
    {
      id: "RECEIVED",
      name: "Procesando",
    },
    {
      id: "COMPLETED",
      name: "Completada",
    },
    {
      id: "WAITING",
      name: "En espera",
    },
    {
      id: "WITH_ERRORS",
      name: "Con errores",
    },
    {
      id: "IN_TRANSIT",
      name: "En tránsito",
    },
    {
      id: "DELIVERED",
      name: "Entregada",
    },
  ];
  // Billing Origin
  const billingOrigin: SelectInterface[] = [
    {
      id: "admin",
      name: "Administración",
    },
  ];
  // Table Titles
  const tableTitle = [
    "Tipo",
    "No.",
    "Cliente",
    "Estado",
    "Emisión",
    "Origen",
    "Importe",
  ];

  const tableData: DataTableInterface[] = [];
  registerBillingList &&
    registerBillingList?.map((item) => {
      tableData.push({
        rowId: item.id,
        payload: {
          Tipo: (
            <div className="flex justify-start flex-row">
              {!item?.isPreReceipt ? (
                <div className="flex gap-2">
                  <FaMoneyBill size={20} className="text-green-500" />
                  {item.partialPayments?.length > 0 &&
                    item.status === "PAYMENT_PENDING" && (
                      <TooltipG
                        content="Pago parcial"
                        anchorSelect="partialPayment"
                      >
                        {/* <FaMoneyBill1Wave size={20} className="text-green-400" /> */}
                        <span className="">🟡</span>
                      </TooltipG>
                    )}

                  <p>Factura</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <FaClipboard size={20} className="text-amber-500" />
                  <p>Pre-Factura</p>
                </div>
              )}
            </div>
          ),
          "No.": (
            <div className="flex justify-start">
              {item?.isPreReceipt
                ? `${parseISO(item.createdAt).getFullYear()}/${
                    item.preOperationNumber
                  }`
                : `${parseISO(item.createdAt).getFullYear()}/${
                    item.operationNumber
                  }`}
            </div>
          ),
          Cliente: (
            <div className="flex justify-start flex-row">
              {item.client?.firstName} {item.client?.lastName}
            </div>
          ),
          Estado: (
            <div className="flex flex-col">
              {
                <div>
                  <OrderStatusBadge status={item?.status} />
                </div>
              }
            </div>
          ),
          Emisión: (
            <div className="flex flex-col">
              {formatDateForTable(item?.createdAt)}
            </div>
          ),
          Origen: (
            <div className="flex flex-col">
              {translateOrderOrigin(item.origin)}
            </div>
          ),
          Importe: (
            <p className="flex flex-col">
              {
               item.totalToPay?.map((total) => (
                  <p key={total?.codeCurrency}>
                    <span className="text-sm">
                      {formatCurrency(total.amount,total.codeCurrency)}
                    </span>{" "}
                  </p>
                ))}
            </p>
          ),
        },
      });
    });

  const tableActions = [
    {
      title: "Nuevo registro",
      icon: <PlusIcon className="h-5 text-gray-500" />,
      action: () => setWizzardRegisterBillingModal(true),
    },
    // {
    //   title: "Exportar a Pdf",
    //   icon: <FaRegFilePdf className="h-5 text-gray-500" />,
    //   action: () =>
    //     reportDownloadHandler(
    //       "Ordenes con productos",
    //       "order_list",
    //       business!,
    //       registerBillingList,
    //       { page: { orientation: "landscape" } }
    //     ),
    // },
    {
      title: "Exportar a PDF",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        const toastId = toast.info("Creando Reporte...", {
          isLoading: true,
          autoClose: false,
        });
        generatePdf(
          <BillingOrderListPdf
            orders={registerBillingList}
            //@ts-ignore
            filters={{ dateFrom: filter.dateFrom, dateTo: filter.dateTo }}
            business={business}
          />
        )
          .then(() => {
            toast.update(toastId, {
              isLoading: false,
              autoClose: 5000,
              render: "Reporte listo para descargar",
            });
          })
          .catch(() => {
            toast.update(toastId, {
              type: "error",
              isLoading: false,
              autoClose: 5000,
              render: "Ocurrió un error creando el Reporte",
            });
          });
      },
    },
    {
      title: "Exportar a Excel",
      icon: <BsFiletypeXlsx />,
      action: () => {
        if (filter.dateFrom !== undefined) {
          setExportModal(true);
        } else {
          toast.error("Por favor defina un rango de fechas");
        }
      },
    },
    // {
    //   title: "Importar a Excel",
    //   icon: <FaRegFileExcel className="h-5 text-gray-500" />,
    //   // action: () => setExportModal(true),
    // },
  ];
  const searching = {
    action: (searchNumber: string | null) =>
      setFilter(searchNumber ? { searchNumber } : { page: 1 }),
    placeholder: "Buscar por número de operación",
  };

  const filterCodeDatePickerRangeCreatedAt = [
    {
      filterCode: "dateFrom",
      name: "Desde",
      isUnitlToday: false,
      includingTime: false,
    },
    {
      filterCode: "dateTo",
      name: "Hasta",
      isUnitlToday: true,
      includingTime: false,
    },
  ];

  const filterCodeDatePickerRangePaymentDL = [
    {
      filterCode: "paymentDeadlineFrom",
      name: "Desde",
      isUnitlToday: false,
      includingTime: false,
    },
    {
      filterCode: "paymentDeadlineTo",
      name: "Hasta",
      isUnitlToday: false,
      includingTime: false,
    },
  ];

  const filterCodePriceRange = [
    {
      name: "Desde",
      filterCode: "minTotalToPay",
    },
    {
      name: "Hasta",
      filterCode: "maxTotalToPay",
    },
    {
      name: "Moneda",
      filterCode: "currency",
      currencies: currencies,
    },
  ];

  const availableFilters: FilterOpts[] = [
    {
      format: "input",
      filterCode: "operationNumber",
      name: "No.Factura",
    },
    {
      format: "input",
      filterCode: "preOperationNumber",
      name: "No.Pre Factura",
    },
    {
      format: "select",
      name: "Tipo",
      filterCode: "isPreReceipt",
      data: billingType,
    },
    {
      format: "select",
      name: "Origen",
      filterCode: "origin",
      data: billingOrigin,
    },
    {
      name: "Cliente",
      filterCode: "clientId",
      format: "select",
      asyncData: {
        url: "/customer",
        dataCode: ["firstName", "lastName"],
        idCode: "id",
      },
    },
    {
      name: "Comercial",
      filterCode: "managedById",
      format: "select",
      asyncData: {
        url: "/security/users",
        dataCode: ["displayName"],
        idCode: "id",
      },
    },
    {
      format: "multiselect",
      name: "Estado",
      filterCode: "status",
      data: billingStates,
    },
    {
      format: "datepicker-range",
      filterCode: "dateFrom",
      name: "Fecha de emisión entre",
      datepickerRange: filterCodeDatePickerRangeCreatedAt,
    },
    {
      format: "datepicker-range",
      filterCode: "paymentDeadlineFrom",
      name: "Fecha de vencimiento entre",
      datepickerRange: filterCodeDatePickerRangePaymentDL,
    },
    {
      format: "price-range",
      filterCode: "",
      name: "Rango de importe",
      priceRange: filterCodePriceRange,
    },
    {
      format: "boolean",
      name: "Facturas con efectivo",
      filterCode: "withCashRegisterOperations",
    },
    // {
    //   format: "datepicker",
    //   filterCode: "importFrom",
    //   name: "Importe desde",
    // },
    // {
    //   format: "datepicker",
    //   filterCode: "importTo",
    //   name: "Importe hasta",
    // },

    // {
    //   format: "select",
    //   name: "Moneda",
    //   filterCode: "currency",
    //   data: currenciesList
    // },
  ];

  const filterAction = (
    data: Record<string, string | number | boolean> | null
  ) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  useEffect(() => {
    getAllRegisterBillingList(filter);
  }, [filter]);

  const closeWizzardRegisterBillingModal = () => {
    setWizzardRegisterBillingModal(false);
    setCurrentStep(0);
    replace([]);
    reset();
  };

  return (
    <div>
      <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Facturación" }, { name: "Registros" }]}
      />

      <GenericTable
        tableTitles={tableTitle}
        // searching={searching}
        tableData={tableData}
        actions={tableActions}
        syncAction={{
          action: () => getAllRegisterBillingList(filter),
          loading: isFetching,
        }}
        loading={isFetching}
        filterComponent={{ availableFilters, filterAction }}
        rowAction={(id: number) =>
          setDetailsRegisterModal(() => {
            setIsLoading(true);
            return { state: true, id: id };
          })
        }
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={registerPaginate}
          />
        }
      />
      <RegisterContext.Provider value={contextValues}>
        {/* NewRegisterModal */}
        {wizzardRegisterBillingModal && (
          <Modal
            state={wizzardRegisterBillingModal}
            close={closeWizzardRegisterBillingModal}
            size="l"
          >
            <WizzardRegisterBilling
              close={() => closeWizzardRegisterBillingModal()}
            />
          </Modal>
        )}

        {/* Details Register Modal */}
        {detailsRegisterModal.state && (
          <Modal
            state={detailsRegisterModal.state}
            close={() => setDetailsRegisterModal({ state: false, id: null })}
            size="l"
          >
            <RegisterDetailsContainer
              id={detailsRegisterModal?.id!}
              updateState={updateOrderListLocally}
              closeModalDetails={() =>
                setDetailsRegisterModal({ state: false, id: null })
              }
            />
          </Modal>
        )}
      </RegisterContext.Provider>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExportModalContainer
            exportAction={exportExcelOrders}
            filters={filter}
            close={() => setExportModal(false)}
            isLoading={isLoading}
          />
        </Modal>
      )}
    </div>
  );
};
export default AllRegistersList;

const ExportModalContainer = ({
  exportAction,
  filters,
  close,
  isLoading,
}: {
  exportAction: Function;
  filters: any;
  close: Function;
  isLoading: boolean;
}) => {
  const { control, handleSubmit } = useForm();
  const submit: SubmitHandler<Record<string, string>> = (data) => {
    exportAction(
      { dateFrom: filters.dateFrom, dateTo: filters.dateTo, all_data: true },
      data.name,
      close
    );
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
        <Button
          color="slate-600"
          name="Aceptar"
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};

interface TooltipProps {
  content: string;
  anchorSelect: string; // Identificador único para el tooltip
  children: React.ReactNode;
}

export const TooltipG: React.FC<TooltipProps> = ({
  children,
  content,
  anchorSelect,
}) => {
  return (
    <>
      <div id={anchorSelect}>{children}</div>
      <Tooltip anchorSelect={`#${anchorSelect}`} content={content}></Tooltip>
    </>
  );
};
