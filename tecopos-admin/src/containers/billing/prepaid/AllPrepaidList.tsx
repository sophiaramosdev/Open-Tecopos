import { createContext, useEffect, useState } from "react";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb from "../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import { useServerBilling } from "../../../api/useServerBilling";
import { formatDate, formatCurrency } from "../../../utils/helpers";
import { NewPrepaidWizard } from "./newPrepaid/NewPrepaidWizard";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import Paginate from "../../../components/misc/Paginate";
import { useAppSelector } from "../../../store/hooks";
import Modal from "../../../components/misc/GenericModal";
import DetailsPrepaidPayment from "./DetailsPrepaidPayment";
import {
  Control,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormReset,
  UseFormSetValue,
  UseFormTrigger,
  UseFormWatch,
  useForm,
} from "react-hook-form";
import PrepaidStatusBadge from "../../../components/misc/badges/PrepaidStatusBadge";

interface PrepaidContext {
  setPrepaidsList: Function;
  prepaidsList: any;
  prepaidById: any;
  getPrepaidPaymentById: Function;
  refundPrepaidPayment: Function;
  editPrepaid: Function;
  addNewPrepaid: Function;
  watch: UseFormWatch<Record<string, any>>;
  getValues: UseFormGetValues<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  reset: UseFormReset<Record<string, any>>;
  control: Control;
  handleSubmit: UseFormHandleSubmit<Record<string, any>>;
  trigger: UseFormTrigger<Record<string, any>>;
  fields: Record<string, any>[];
  clearErrors: UseFormClearErrors<Record<string, any>>;
  isFetching?: boolean;
  isSubmit?: boolean;
  isLoading: boolean;
  currentStep: any;
  setCurrentStep: Function;
  editMode?: boolean;
}
interface WizzardRegisterBillingInterface {
  editMode?: boolean;
  defaultValues?: any;
  close?: Function;
}

export const PrepaidContext = createContext<Partial<PrepaidContext>>({});

const AllPrepaidList = () => {
  // Hooks
  const {
    getAllPrepaidsList,
    prepaidsList,
    isFetching,
    isLoading,
    prepaidPaginate,
    modalDetail,
    setModalDetail,
    setPrepaidWizardModal,
    prepaidWizardModal,
    setPrepaidsList,
    prepaidById,
    getPrepaidPaymentById,
    refundPrepaidPayment,
    editPrepaid,
    addNewPrepaid,
  } = useServerBilling();

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

  const [currentPrepaid, setCurrentPrepaid] = useState({});

  const { business } = useAppSelector((store) => store.init);

  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  // const handlerCurrentPrepaidObject = (id: number | string) => {
  //   const currentPrepaid = prepaidsList?.find(
  //     (prepaid: any) => prepaid.id === id
  //   );
  //   currentPrepaid && setCurrentPrepaid(currentPrepaid);
  // };

  const tableTitle = ["Cliente", "Estado", "Emisión", "Monto", ""];

  // Currencies
  const currenciesList: SelectInterface[] | [] = business
    ? business?.availableCurrencies?.map((currency) => ({
        id: currency.code,
        name: currency.code,
      }))
    : [];

  const rowAction = (id: number) => {
    setModalDetail(id);
  };

  const tableData: DataTableInterface[] = [];
  prepaidsList.map((item: any) =>
    tableData.push({
      rowId: item?.id,
      payload: {
        Cliente: (
          <div className="flex justify-center">
            {item?.client?.firstName} {item?.client?.lastName}
          </div>
        ),
        Estado: (
          <div className="flex flex-col">
            <div>{<PrepaidStatusBadge status={item?.status}  />}</div>
          </div>
        ),
        Emisión: (
          <div className="flex flex-col">{formatDate(item?.createdAt)}</div>
        ),
        Monto: (
          <div className="flex flex-col">
            {formatCurrency(item?.amount, item?.codeCurrency)}
          </div>
        ),
        // "": (
        //   <div className="flex flex-col">
        // <GenericMultipleActBtn
        //   defaultIcon={false}
        //   btnName=""
        //   btnIcon={<Icon icon="ph:dots-three-outline-vertical-light" width="1.5rem" height="1.5rem" />}
        //   items={rowActions}
        //   action={ () => handlerCurrentPrepaidObject(item.id) }
        //   />
        //   </div>
        // ),
      },
    })
  );

  const tableActions = [
    {
      title: "Agregar ",
      icon: <PlusIcon className="h-5 text-gray-500" />,
      action: () => {
        setPrepaidWizardModal(true);
      },
    },
    // {
    //   title: "Exportar a Pdf",
    //   icon: <FaRegFilePdf className="h-5 text-gray-500" />,
    //   action: () =>
    //     reportDownloadHandler(
    //       "Ordenes con productos",
    //       "order_list",
    //       business!,
    //       allOrdes,
    //       { page: { orientation: "landscape" } }
    //     ),
    // },
    // {
    //   title: "Exportar a Excel",
    //   icon: <FaRegFileExcel className="h-5 text-gray-500" />,
    //   action: () => setExportModal(true),
    // },
    // {
    //   title: "Importar a Excel",
    //   icon: <FaRegFileExcel className="h-5 text-gray-500" />,
    //   action: () => setExportModal(true),
    // },
  ];

  const prepaidPaymentStatus: any[] = [
    {
      id: "PAID",
      name: "Pagada",
    },
    {
      id: "USED",
      name: "Utilizado",
    },
    {
      id: "REFUNDED",
      name: "Reembolsada",
    },
  ];

  const availableFilters: FilterOpts[] = [
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
      format: "select",
      name: "Estado",
      filterCode: "status",
      data: prepaidPaymentStatus,
    },
    {
      format: "select",
      name: "Moneda",
      filterCode: "currency",
      data: currenciesList,
    },
    {
      format: "boolean",
      name: "Ordenar por monto",
      filterCode: "amount",
      //data: true,
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };
  useEffect(() => {
    getAllPrepaidsList(filter);
  }, [filter]);

  const [currentStep, setCurrentStep] = useState<number>(0);

  return (
    <div>
      <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Facturación" }, { name: "Pagos anticipados" }]}
      />

      <GenericTable
        tableTitles={tableTitle}
        tableData={tableData}
        syncAction={{
          action: () => {
            getAllPrepaidsList(filter);
          },
          loading: isLoading,
        }}
        actions={tableActions}
        filterComponent={{ availableFilters, filterAction }}
        loading={isLoading}
        rowAction={rowAction}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={prepaidPaginate}
          />
        }
      />
      {/* PrepaidWizardModal */}
      <PrepaidContext.Provider
        value={{
          prepaidsList,
          setPrepaidsList,
          isFetching,
          prepaidById,
          getPrepaidPaymentById,
          refundPrepaidPayment,
          editPrepaid,
          addNewPrepaid,
          control,
          handleSubmit,
          setCurrentStep,
          currentStep,
          watch,
          reset,
          setValue,
          trigger,
          getValues,
          clearErrors,
        }}
      >
        <NewPrepaidWizard
          state={prepaidWizardModal}
          close={() => {
            setPrepaidWizardModal(false);
          }}
        />

        {modalDetail && (
          <Modal
            state={!!modalDetail}
            close={() => setModalDetail(null)}
            size="m"
          >
            <DetailsPrepaidPayment
              fetching={isFetching}
              id={modalDetail}
              closeModal={() => setModalDetail(null)}
            />
            {/* <OnlineOrderDetailContainer
            fetching={isFetching}
            id={modalDetail}
            updListState={updateAllOrderState}
            editOrder={editOrder}
            closeModal={() => setModalDetail(null)}
          /> */}
          </Modal>
        )}
      </PrepaidContext.Provider>
    </div>
  );
};
export default AllPrepaidList;
