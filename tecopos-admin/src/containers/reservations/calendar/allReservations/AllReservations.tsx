import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAppSelector } from "../../../../store/hooks";
import useServerReservation from "../../../../api/useServerReservation";
import {
  Event2,
  ViewsActions,
} from "../../../../components/calendar/GenericCalendar";
import moment from "moment";
import Breadcrumb, {
  PathInterface,
} from "../../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../../components/misc/GenericTable";
import { formatCurrency } from "../../../../utils/helpers";
import OrderStatusBadge from "../../../../components/misc/badges/OrderStatusBadge";
import { BsFiletypeXlsx } from "react-icons/bs";
import { CalendarIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import { SlotInfo } from "react-big-calendar";
import Paginate from "../../../../components/misc/Paginate";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { NewReservationWizard } from "../newReservationStep/NewReservationWizard";
import DetailsReservations from "../DetailsReservation";
import EditReservationTab from "../EditReservationTab";
import ConfirmReservation from "../ConfirmReservation";
import BlockTimeFrom from "../newReservationStep/blcokTime/BlockTimeFrom";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import { Reservation } from "../../../../interfaces/Interfaces";

interface Props {
  newReservation: Function;
  getReservation: Function;
  isFetching: boolean;
  isLoading: boolean;
  newTimeBlock: Function;
  reservation: Reservation | null;
  slotSelect: string;
  deletedTimeBlock: Function;
  cancelOrder: Function;
  editTimeBlock: Function;
  setShowEdit: Function;
  editReservation: Function;
  selectEvent: any;
  currentStep: "calendar" | "table";
  closeTimeBlock: Function;
  isAvailability: boolean;
  isChecking: boolean;
  chekcAvailability: Function;
  confirmOrder: Function;
  setShowConfirm: Function;
  exportReservationExcel: Function;
  cancelReservation: Function;
  updateStatusPay: Function;
}

export const ReservationsContext = createContext<Partial<Props>>({});

const AllReservations: React.FC = () => {
  const currentYear = moment().year();

  const startDateOfYear = moment().year(currentYear).startOf("year").toDate();
  const endDateOfYear = moment().year(currentYear).endOf("year").toDate();

  const [currentStep, setCurrentStep] = useState<"calendar" | "table">(
    "calendar"
  );
  const [filter, setFilter] = useState<BasicType>({
    page: 1,
    dateFrom: startDateOfYear.toISOString(),
    dateTo: endDateOfYear.toISOString(),
  });
  const [selectOrder, setSelectOrder] = useState<any>(null);
  const { business } = useAppSelector((store) => store.init);
  const {
    getAllReservations,
    allReservations,
    getReservation,
    reservation,
    newReservation,
    newTimeBlock,
    deletedTimeBlock,
    isFetching,
    isLoading,
    cancelOrder,
    paginate,
    editTimeBlock,
    editReservation,
    isAvailability,
    chekcAvailability,
    confirmOrder,
    exportReservationExcel,
    cancelReservation,
    isChecking,
    updateStatusPay,
  } = useServerReservation();

  useEffect(() => {
    getAllReservations(filter);
  }, [currentStep, filter]);

  const paths: PathInterface[] = [
    {
      name: "Reservaciones",
    },
    {
      name: "Todas",
    },
  ];

  const tableTitles = [
    "No.",
    "Cliente",
    "Negocio",
    "Servicio",
    "Recurso",
    "Fecha de reserva",
    "Duración",
    "Precio Total",
    "Fecha de creación",
    "Origen",
    "Estado",
  ];

  const tableData: DataTableInterface[] = [];
  allReservations.forEach((item, index) => {
    const dateReservation = tableData.push({
      rowId: item?.id,
      payload: {
        "No.": item.orderReceipt.reservationNumber,
        Cliente: `${item?.orderReceipt?.client?.firstName ?? ""} ${
          item?.orderReceipt?.client?.lastName ?? ""
        }`,
        Negocio: business?.name,
        Servicio: item?.name,
        Recurso: item?.resource?.code,
        "Fecha de reserva": (() => {
          const startDate = moment(item?.startDateAt);
          const endDate = moment(item?.endDateAt);
          const isSameDay = startDate.isSame(endDate, "day");
          if (isSameDay) {
            return startDate.format("DD/MM/YYYY");
          } else {
            return `${startDate.format("DD/MM/YYYY")} - ${endDate.format(
              "DD/MM/YYYY"
            )}`;
          }
        })(),
        Duración: (() => {
          const startDate = moment(item?.startDateAt);
          const endDate = moment(item?.endDateAt);
          const durationInHours = endDate.diff(startDate, "hours");
          const durationInDays = endDate.diff(startDate, "days");
          if (!item?.product?.hasDuration) {
            return `${durationInDays < 1 ? 1 : durationInDays} ${durationInDays === 1 ? "dia" : "días" }`;
          } else {
            return `${durationInHours} hora(s)`;
          }
        })(),
        "Precio Total": formatCurrency(
          item?.priceUnitary?.amount as number,
          item?.priceUnitary?.codeCurrency
        ),
        "Fecha de creación":
          moment(item?.createdAt).format("DD/MM/YYYY") ?? " ",
        Origen: traslateOrigin(item?.orderReceipt?.origin),
        Estado: (
          <>
            {" "}
            <OrderStatusBadge status={item?.orderReceipt?.status} />
          </>
        ),
      },
    });
  });

  const rowAction = (id: number | string) => {
    setSelectEvent(id);
    const data = allReservations.find((item) => item.id === id);
    const orderAssociate = allReservations.find((item) => item.id === id);
    if (orderAssociate) {
      setSelectOrder(
        orderAssociate.orderReceiptId ?? orderAssociate.orderReceipt?.id
      );
    }
    setShowDetails(true);
  };
  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Añadir reserva" />,
      action: () => setShowNewReservation(true),
      title: "Añadir reserva",
    },
    {
      title: "Exportar a excel",
      icon: <BsFiletypeXlsx className="h-10 ml-2" size={18} />,
      action: () => setExportModal(true),
    },
    // {
    //   title: "Exportar a pdf",
    //   icon: <FaRegFilePdf className="h-5 text-gray-500" />,
    //   action: () => {},
    // },
  ];

  const { areas } = useAppSelector((state) => state.nomenclator);

  const salesAreas = areas
    .filter((item) => item.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const availableFilters: FilterOpts[] = [
    {
      format: "select",
      filterCode: "productId",
      name: "Producto",
      asyncData: {
        url: "/administration/product",
        defaultParams: {
          type: "SERVICE",
        },
        dataCode: ["name"],
        idCode: "id",
      },
    },
    {
      format: "select",
      filterCode: "areaSalesId",
      name: "Punto de venta",
      data: salesAreas,
    },
    {
      format: "select",
      filterCode: "status",
      name: "Estado de reserva",
      data: billingStates,
    },
    {
      format: "select",
      name: "Tipo",
      filterCode: "isPreReceipt",
      data: billingType,
    },
  ];

  const searching = {
    placeholder: "Buscar",
    action: (value: string) => {},
  };

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  const [showNewReservation, setShowNewReservation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectEvent, setSelectEvent] = useState<any>(null);
  const [selectBlock, setSelectBlock] = useState<any>(null);
  const [showBlock, setShowBlock] = useState<any>(false);
  const [slotSelect, setSlotSelect] = useState<any>(null);
  const [exportModal, setExportModal] = useState(false);

  const crud = {
    newReservation,
    isFetching,
    isLoading,
    getReservation,
    reservation,
    newTimeBlock,
    slotSelect,
    deletedTimeBlock,
    cancelOrder,
    editTimeBlock,
    setShowEdit,
    selectEvent,
    currentStep,
    editReservation,
    isAvailability,
    closeTimeBlock: () => setShowBlock(false),
    chekcAvailability,
    confirmOrder,
    setShowConfirm,
    exportReservationExcel,
    cancelReservation,
    isChecking,
  }

  return (
    <div className="w-full h-full ">
      <Breadcrumb
        icon={<CalendarIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <ReservationsContext.Provider
        value={{
          newReservation,
          isFetching,
          isLoading,
          getReservation,
          reservation,
          newTimeBlock,
          slotSelect,
          deletedTimeBlock,
          cancelOrder,
          editTimeBlock,
          setShowEdit,
          selectEvent,
          currentStep,
          editReservation,
          isAvailability,
          closeTimeBlock: () => setShowBlock(false),
          chekcAvailability,
          confirmOrder,
          setShowConfirm,
          exportReservationExcel,
          cancelReservation,
          isChecking,
          updateStatusPay
        }}
      >
        <>
          <GenericTable
            searching={searching}
            tableData={tableData}
            showSpecificColumns
            tableTitles={tableTitles}
            filterComponent={{ availableFilters, filterAction }}
            actions={actions}
            rowAction={rowAction}
            loading={isLoading}
            paginateComponent={
              <Paginate
                action={(page: number) => setFilter({ ...filter, page })}
                data={paginate}
              />
            }
          />
        </>

        <Modal
          close={() => setShowNewReservation(false)}
          state={showNewReservation}
          size="l"
        >
          <NewReservationWizard
            close={() => setShowNewReservation(false)}
            newReservation={newReservation}
            context={ReservationsContext}
          />
        </Modal>
        <Modal close={() => setShowDetails(false)} state={showDetails} size="l">
          <DetailsReservations
            close={() => setShowDetails(false)}
            select={selectEvent}
            context={ReservationsContext}
            orderId={selectOrder}

          />
        </Modal>
        <Modal close={() => setShowEdit(false)} state={showEdit} size="l">
          <EditReservationTab close={() => setShowEdit(false)} context={ReservationsContext} />
        </Modal>
        <Modal close={() => setShowConfirm(false)} state={showConfirm} size="m">
          <ConfirmReservation close={() => setShowConfirm(false)} />
        </Modal>

        {exportModal && (
          <Modal state={exportModal} close={setExportModal}>
            <ExcelFileExport
              filter={filter}
              closeModal={() => setExportModal(false)}
            />
          </Modal>
        )}
      </ReservationsContext.Provider>
    </div>
  );
};

export default AllReservations;

const billingType: SelectInterface[] = [
  {
    id: "false",
    name: "Reserva",
  },
  {
    id: "true",
    name: "Pre-reserva",
  },
];

const statusPay: SelectInterface[] = [
  {
    id: "PAYMENT_PENDING",
    name: "Pendiente de pago",
  },
  {
    id: "PARTIAL_PAYMENT",
    name: "Pago parcial",
  },
  {
    id: "OVERDUE",
    name: "Vencido",
  },
  {
    id: "PAY",
    name: "Pagado",
  },
  {
    id: "REFUNDED",
    name: "Reembolsado",
  },
  {
    id: "CANCELLED",
    name: "Cancelado",
  },
];
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
    name: "Vencida",
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
    name: "Cancelada",
  },
];

const traslateOrigin = (origin: string) => {
  switch (origin) {
    case "admin":
      return "Administración";
    case "external":
      return "Externo";
    case "APP":
      return "App";
    default:
      return " ";
  }
};
interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}
const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportReservationExcel, isFetching } =
    useContext(ReservationsContext);

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportReservationExcel &&
      exportReservationExcel(filter, data.name, closeModal());
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
          loading={isFetching}
          disabled={isFetching}
        />
      </div>
    </form>
  );
};
