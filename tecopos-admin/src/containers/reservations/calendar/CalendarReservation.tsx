/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from "react";
import GenericCalendar, {
  Event2,
} from "../../../components/calendar/GenericCalendar";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import moment from "moment";
import "moment/locale/es";
import "./caledare.css";
import { CalendarIcon, PlusIcon } from "@heroicons/react/24/outline";
import  {
  FilterOpts,
} from "../../../components/misc/GenericTable";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { BsFiletypeXlsx } from "react-icons/bs";
import Button from "../../../components/misc/Button";
import Modal from "../../../components/misc/GenericModal";
import { NewReservationWizard } from "./newReservationStep/NewReservationWizard";
import useServerReservation from "../../../api/useServerReservation";
import DetailsReservations from "./DetailsReservation";
import { Reservation } from "../../../interfaces/Interfaces";
import { useAppSelector } from "../../../store/hooks";
import BlockTimeFrom from "./newReservationStep/blcokTime/BlockTimeFrom";
import { SlotInfo } from "react-big-calendar";
import EditReservationTab from "./EditReservationTab";
import { SubmitHandler, useForm } from "react-hook-form";
import ConfirmReservation from "./ConfirmReservation";
import Input from "../../../components/forms/Input";

interface Props {
  newReservation: Function;
  getReservation: Function;
  isFetching: boolean;
  isLoading: boolean;
  isChecking: boolean;
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
  changeAvailability: boolean;
  chekcAvailability: Function;
  confirmOrder: Function;
  setShowConfirm: Function;
  exportReservationExcel: Function;
  cancelReservation: Function;
}

export const ReservationsContext = createContext<Partial<Props>>({});

const CalendarReservation: React.FC = () => {

  const [currentStep, setCurrentStep] = useState<"calendar" | "table">(
    "calendar"
  );
  const [filter, setFilter] = useState<BasicType>({
    // dateFrom: startDateOfYear.toISOString(),
    // dateTo: endDateOfYear.toISOString(),
    calendar: true,
  });

  const {
    getAllReservations,
    allReservations,
    getAllEvents,
    allEvents: blockTime,
    getReservation,
    reservation,
    newReservation,
    newTimeBlock,
    deletedTimeBlock,
    isFetching,
    isLoadingEvent,
    isLoading,
    cancelOrder,
    editTimeBlock,
    editReservation,
    isAvailability,
    chekcAvailability,
    confirmOrder,
    exportReservationExcel,
    isChecking,
    cancelReservation,
    //events
  } = useServerReservation();

  const events: Event2[] = [];
  const [totalPreReserve, setTotalPreReserve] = useState(0);

  useEffect(() => {
    if (allReservations) {
      setTotalPreReserve(
        allReservations.filter((item) => item.orderReceipt.isPreReceipt).length
      );
    }
  }, [allReservations]);

  useEffect(() => {
    getAllReservations(filter);
    getAllEvents(filter);
  }, [currentStep, filter]);

  const notStatus = ["CANCELLED", "REFUNDED"];

  allReservations?.forEach((item) => {
    if (
      notStatus.includes(item?.orderReceipt?.status) ||
      (item.orderReceipt.isPreReceipt && !filter.isPreReceipt)
    ) {
      return;
    }
    // events.push({
    //   id: item.id,
    //   type: "reservation",
    //   title: item?.name,
    //   color: item.colorCategory ?? "#000",
    //   status: item?.orderReceipt?.status,
    //   start: moment(item?.startDateAt).endOf("day").toDate(),
    //   end: moment(item?.endDateAt).endOf("day").toDate(),
    //   allDay:true
    // });

    events.push({
      id: item.id,
      type: "reservation",
      orderId: item.orderReceiptId,
      title: item?.name,
      color: item.colorCategory ?? "#000",
      status: item?.orderReceipt?.status,
      start: moment.utc(item?.startDateAt).local().toDate(),
      end: moment.utc(item?.endDateAt).local().toDate(),
      allDay: !!!item?.product?.hasDuration,
    });
  });

  blockTime?.forEach((item: any) => {
    events.push({
      id: item.id,
      type: "blockTime",
      title: item?.title,
      color: item.colorCategory ?? "#000",
      status: item?.status,
      notes: item.notes,
      start: moment(item?.startAt).toDate(),
      end: moment(item?.endAt).toDate(),
    });
  });

  const paths: PathInterface[] = [
    {
      name: "Reservaciones",
    },
    {
      name: "Calendario",
      action: () => setCurrentStep("calendar"),
    },
  ];

  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Añadir" />,
      action: () => setShowNewReservation(true),
      title: "Añadir",
    },
    {
      title: "Exportar a excel",
      icon: <BsFiletypeXlsx className="text-base" />,
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

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  const [showNewReservation, setShowNewReservation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectEvent, setSelectEvent] = useState<any>(null);
  const [selectOrder, setSelectOrder] = useState<any>(null);
  const [selectBlock, setSelectBlock] = useState<any>(null);
  const [showBlock, setShowBlock] = useState<any>(false);
  const [slotSelect, setSlotSelect] = useState<any>(null);
  const [exportModal, setExportModal] = useState(false);

  const handleSelectEvent = (event: Event2) => {
    if (event.type === "reservation") {
      setSelectEvent(event.id);
      setSelectOrder(event.orderId);
      setShowDetails(true);
    }
    if (event.type === "blockTime") {
      setSelectBlock(event);
      setShowBlock(true);
    }
  };

  const onSelectSlot = (slot: SlotInfo) => {
    setShowNewReservation(true);
    setSlotSelect(slot.start);
  };

  return (
    <div className="w-full h-full">
      <Breadcrumb
        icon={<CalendarIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <ReservationsContext.Provider
        value={{
          newReservation,
          isFetching,
          isLoading,
          isChecking,
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
        }}
      >
        {currentStep === "calendar" && (
          <>
            <GenericCalendar
              onNewReservation={() => {
                if (filter.isPreReceipt) {
                  setFilter({
                    calendar: true,
                  });
                } else {
                  setFilter({
                    isPreReceipt: true,
                  });
                }
              }}
              events={events}
              actions={actions}
              filterComponent={{ availableFilters, filterAction }}
              handleSelectEvent={handleSelectEvent}
              onSelectSlot={onSelectSlot}
              loading={isLoading || isLoadingEvent}
              notificationCount={!filter.isPreReceipt ? totalPreReserve : 0}
              notificationText={
                !filter.isPreReceipt ? "Pre-Reservas pendientes" : "Reservas"
              }
            />
          </>
        )}

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
          <EditReservationTab
            close={() => setShowEdit(false)}
            context={ReservationsContext}
          />
        </Modal>
        <Modal close={() => setShowConfirm(false)} state={showConfirm} size="m">
          <ConfirmReservation close={() => setShowConfirm(false)} />
        </Modal>
        {showBlock && (
          <Modal close={() => setShowBlock(false)} state={showBlock} size="l">
            <BlockTimeFrom
              close={() => setShowBlock(false)}
              event={selectBlock}
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
      </ReservationsContext.Provider>
    </div>
  );
};

export default CalendarReservation;

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
