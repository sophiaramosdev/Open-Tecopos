import React, { useCallback, useEffect, useState, ReactNode } from "react";
import { Calendar, Event, Views, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ArrowLeft, ArrowRight } from "heroicons-react";
import { BellAlertIcon } from "@heroicons/react/24/outline";
import MultipleFilterBtn from "../misc/MultipleFilterBtn";
import { FilterOpts } from "../misc/GenericTable";
import { BasicNomenclator } from "../../interfaces/ServerInterfaces";
import ComboBox from "../forms/Combobox";
import Button from "../misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../interfaces/InterfacesLocal";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import AsyncComboBox from "../forms/AsyncCombobox";
import { Fragment } from "react";
import { useMemo } from "react";
import OrderStatusBadge from "../misc/badges/OrderStatusBadge";
import Fetching from "../misc/Fetching";
import { Tooltip } from "react-tooltip";
// Configura Moment.js en español
moment.locale("es");

// Define el tipo de los eventos del calendario
export interface Event2 extends Event {
  id: number | string;
  orderId?: number | string;
  title: string;
  type: "blockTime" | "reservation";
  color?: string;
  notes?: string;
  status: string;
  resources?: string[];
  start: Date;
  end: Date;
}
interface FilterComponent {
  availableFilters: FilterOpts[];
  filterAction: Function;
}
type Keys = keyof typeof Views;
interface Props {
  events: Event[];
  onChangeView?: ViewsActions[];
  filterComponent?: FilterComponent;
  actions?: BtnActions[];
  onSelectSlot?: Function;
  onNewReservation?: Function;
  handleSelectEvent?: any;
  loading?: boolean;
  notificationCount: number;
  notificationText: string;
}

interface MyEventWrapperProps {
  children: ReactNode;
  event: Event2;
  style?: React.CSSProperties;
}
const GenericCalendar = ({
  events,
  onChangeView,
  filterComponent,
  actions,
  onSelectSlot = () => {},
  onNewReservation = () => {},
  handleSelectEvent,
  loading,
  notificationCount,
  notificationText,
}: Props) => {
  const localizer = momentLocalizer(moment);

  const [currentDate, setCurrentDate] = useState(moment().toDate());
  const [view, setView] = useState<(typeof Views)[Keys]>(Views.MONTH);
  const [filterActived, setFilterActived] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<BasicNomenclator[]>([]);

  const { control, handleSubmit, unregister, register, watch } = useForm();
  const activeIndex = selectedFilter.map((item) => item.id);

  useEffect(() => {
    const disabledFiltersCode = filterComponent?.availableFilters
      .filter((_, idx) => !activeIndex.includes(idx))
      .map((item) => item.filterCode);
    if (selectedFilter.length === 0 && filterActived) {
      filterComponent?.filterAction(null);
      setFilterActived(false);
    }
    unregister(disabledFiltersCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

  const filterSelectorData: BasicNomenclator[] =
    filterComponent?.availableFilters?.map((item, idx) => ({
      id: idx,
      name: item.name,
    })) ?? [];

  const activatedFilters = filterComponent?.availableFilters?.filter((_, idx) =>
    activeIndex.includes(idx)
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    filterComponent?.filterAction(data);
  };

  const onTodayClick = () => {
    setCurrentDate(new Date());
  };

  const onPrevClick = useCallback(() => {
    if (view === Views.DAY) {
      setCurrentDate(moment(currentDate).subtract(1, "d").toDate());
    } else if (view === Views.WEEK) {
      setCurrentDate(moment(currentDate).subtract(1, "w").toDate());
    } else {
      setCurrentDate(moment(currentDate).subtract(1, "M").toDate());
    }
  }, [view, currentDate]);

  const onNextClick = useCallback(() => {
    if (view === Views.DAY) {
      setCurrentDate(moment(currentDate).add(1, "d").toDate());
    } else if (view === Views.WEEK) {
      setCurrentDate(moment(currentDate).add(1, "w").toDate());
    } else {
      setCurrentDate(moment(currentDate).add(1, "M").toDate());
    }
  }, [view, currentDate]);

  //const dateText = moment(currentDate).format("MMMM  yyyy");

  const dateText = useMemo(() => {
    if (view === Views.DAY) {
      const date = moment(currentDate);
      const dayOfWeek = date.format("dddd");
      const month = date.format("MMMM");
      const dayOfMonth = date.format("DD");
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      return `${dayOfWeek}, ${capitalizedMonth} ${dayOfMonth}`;
    }
    if (view === Views.WEEK) {
      const from = moment(currentDate).startOf("week");
      const to = moment(currentDate).endOf("week");
      const year = moment(currentDate).year();
      const fromMonth =
        from.format("MMMM").charAt(0).toUpperCase() +
        from.format("MMMM").slice(1);
      const toMonth =
        to.format("MMMM").charAt(0).toUpperCase() + to.format("MMMM").slice(1);
      const dateString = `${from.format("DD")} - ${to.format(
        "DD"
      )} ${fromMonth}, ${year}`;
      return dateString;
    }
    if (view === Views.MONTH) {
      return moment(currentDate).format("MMMM YYYY");
    }
    return "";
  }, [view, currentDate]);

  const defaultVIEWS: ViewsActions[] = [
    { title: "Día", action: () => setView("day") },
    { title: "Semana", action: () => setView("week") },
    { title: "Mes", action: () => setView("month") },
  ];

  if (onChangeView) {
    defaultVIEWS.push(...onChangeView);
  }

  const components: any = {
    header: ({ date, label }: { date: Date; label: string }) => (
      <>
        <span className="text-xl">
          {moment(date).format("dddd").charAt(0).toUpperCase() +
            moment(date).format("dddd").slice(1)}
        </span>
      </>
    ),
    event: (event: any) => (
      <>
        {event.event.type === "blockTime" ? (
          <div className="flex flex-col  relative bg-black/80 rounded-md py-1 w-full h-full group overflow-visible">
            <div className=" rounded-xl  ">
              <header className="flex pl-2">
                <p className="text-sm text-white text-start font-semibold">
                  {event?.title}
                </p>
              </header>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2  relative rounded-md bg-gray-200 py-2 w-full h-full group overflow-visible">
            <span
              className={`w-[5px] h-full bg-[${event.event?.color}] absolute top-0 left-0 min-w-[8px] rounded-tl-md rounded-bl-md`}
              style={{ backgroundColor: event.event?.color }}
            ></span>
            <div className=" rounded-xl pl-3">
              <header className="flex items-start justify-between">
                <p className="text-sm text-black font-semibold">
                  {event?.title}
                </p>
                {event?.event?.status && (
                  <div className="text-sm">
                    <OrderStatusBadge
                    onlyShowIcon={!!event?.event?.status}
                      status={event?.event?.status}
                    />
                  </div>
                )}
              </header>
            </div>
          </div>
        )}
      </>
    ),
    eventWrapper: ({ children, event }: MyEventWrapperProps) => {
      const isSingleDayEvent =
        moment(event.end).diff(moment(event.start), "days") === 0;
      return (
        <>
          <div
            className={`${
              event.type === "reservation"
                ? `${
                    isSingleDayEvent ? "bg-none" : "bg-gray-200"
                  } hover:bg-gray-200 `
                : "bg-black"
            } rounded-lg my-[2px] m-1`}
          >
            {children}
          </div>
        </>
      );
    },
    tooltipAccessor: (event: any) => (
      <>
        <div>
          <h3>{event.title}</h3>
          <p>{event.start.toLocaleString()}</p>
          <p>{event.end.toLocaleString()}</p>
        </div>
      </>
    ),
    // month: {
    //   // header: () => {},
    //   // dateHeader: () => {},
    //   event: ({ event }: { event: Event2 }) => {
    //     const isSingleDayEvent =
    //       moment(event.end).diff(moment(event.start), "days") === 0;
    //     const duration = moment(event.end).diff(moment(event.start), "hours");
    //     const eventTitle = isSingleDayEvent
    //       ? `${event.title}- ${duration}h`
    //       : `${event.title}`;
    //     return (
    //       <>
    //         {event?.type === "blockTime" ? (
    //           <div className="flex flex-col relative bg-black/80 rounded-md py-1 w-full h-full group overflow-visible">
    //             <div className=" rounded-xl ">
    //               <header className="flex  pl-2">
    //                 <p className="text-sm text-white font-semibold text-start">
    //                   {event?.title}
    //                 </p>
    //               </header>
    //             </div>
    //           </div>
    //         ) : (
    //           <div
    //             className={`flex flex-col gap-2 relative rounded-md py-1 ${
    //               isSingleDayEvent ? "bg-none" : "bg-gray-200"
    //             }   w-full h-full group overflow-visible bg-transparent`}
    //           >
    //             {!isSingleDayEvent && (
    //               <span
    //                 className={`w-2 h-full bg-[${event?.color}] absolute top-0 left-0 min-w-[8px] rounded-tl-md rounded-bl-md`}
    //                 style={{ backgroundColor: event?.color }}
    //               ></span>
    //             )}
    //             {isSingleDayEvent && (
    //               <span
    //                 className={`${
    //                   isSingleDayEvent
    //                     ? `block bg-[#000] rounded-full w-2.5 h-2.5 absolute top-2 left-0 `
    //                     : `hidden`
    //                 } `}
    //               ></span>
    //             )}
    //             <div className=" rounded-xl pl-4">
    //               <header className="flex justify-between">
    //                 <p
    //                   className={`${
    //                     isSingleDayEvent ? "text-xs" : "text-sm"
    //                   } text-black font-semibold`}
    //                 >
    //                   {eventTitle}
    //                 </p>
    //                 {event?.status && !isSingleDayEvent && (
    //                   <div className="text-sm">
    //                     <OrderStatusBadge
    //                       onlyShowIcon={!!event?.status}
    //                       status={event?.status}
    //                     />
    //                   </div>
    //                 )}
    //               </header>
    //             </div>
    //           </div>
    //         )}
    //       </>
    //     );
    //   },
    // },
  };

  if (loading) {
    return <Fetching className="fixed z-50 h-full w-full bg-white bg-opacity-80 top-20 left-20 rounded-lg" />;
  }
  return (
    <div className="w-full h-full">
      {filterComponent && selectedFilter.length !== 0 && (
        <div
          className={`flex border border-gray-200 bg-gray-50 rounded-lg  shadow-md px-5 py-2 w-full`}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="lg:inline-flex gap-10 items-center w-full p-2  "
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center w-full justify-center relative z-50">
              {activatedFilters?.map((item, idx) =>
                item.format === "select" && item.asyncData ? (
                  <AsyncComboBox
                    key={idx}
                    name={item.filterCode}
                    control={control}
                    dataQuery={{
                      url: item.asyncData.url,
                      defaultParams: item.asyncData?.defaultParams,
                    }}
                    label={item.name}
                    normalizeData={{
                      id: item.asyncData.idCode,
                      name: item.asyncData.dataCode,
                    }}
                    dependendValue={
                      item.dependentOn
                        ? { [item.dependentOn]: watch(item.dependentOn) }
                        : undefined
                    }
                  />
                ) : (
                  item.format === "select" && (
                    <ComboBox
                      key={idx}
                      name={item.filterCode}
                      control={control}
                      data={item.data ?? []}
                      label={item.name}
                      rules={{ required: "Seleccione" }}
                    />
                  )
                )
              )}
            </div>
            <div className="pt-5 lg:p-0 flex justify-center items-center flex-shrink-0 gap-1">
              <Button
                name="Aplicar"
                color="slate-500"
                type="submit"
                textColor="slate-500"
                outline
              />
              <Button
                name="Eliminar filtros"
                color="slate-500"
                action={() => setSelectedFilter([])}
                textColor="slate-500"
                outline
              />
            </div>
          </form>
        </div>
      )}
      <header className=" relative z-40">
        <div className="flex flex-col h-full w-full gap-2 p-2">
          <div className="flex justify-between items-center">
            <article className="flex  gap-4 bg-gray-200 rounded-xl border ">
              <button
                className="bg-primary-500 hover:bg-primary-700 text-black font-bold py-2 px-4 rounded"
                onClick={onTodayClick}
              >
                Hoy
              </button>
              <div className="flex ">
                <button
                  className=" rounded px-2 py-2"
                  aria-label="Previous"
                  onClick={onPrevClick}
                >
                  <ArrowLeft />
                </button>
                <div className="flex items-center justify-center bg-primary-500  px-4 py-2 w-64">
                  <p className="text-base">
                    {dateText?.charAt(0).toUpperCase() + dateText?.slice(1)}
                  </p>
                </div>
                <button
                  className=" rounded px-2 py-2"
                  aria-label="Next"
                  onClick={onNextClick}
                >
                  <ArrowRight />
                </button>
              </div>
            </article>
            <section className="p-2 w-72">
              <article className="flex justify-end items-center gap-4 relative">
                <div className="min-w-[28px] relative">
                  <BellAlertIcon
                    onClick={() => onNewReservation()}
                    className="cursor-pointer"
                    data-tooltip-id="my-tooltip"
                  />
                  <Tooltip
                    id="my-tooltip"
                    content={notificationText}
                    events={["hover"]}
                  />
                  {notificationCount > 0 && (
                    <div className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center absolute -top-2 -right-2">
                      {notificationCount}
                    </div>
                  )}
                </div>
                <div className=" min-w-[28px] max-w-[35px] mt-1 cursor-pointer">
                  <IconMenu
                    icon={<HeroicosOutlineViewBoards />}
                    items={defaultVIEWS}
                  />
                  {/* // <HeroicosOutlineViewBoards onClick={()=>setShowView(true)} /> */}
                </div>
                <div className="">
                  {filterComponent && (
                    <MultipleFilterBtn
                      selected={selectedFilter}
                      data={filterSelectorData}
                      setSelected={(data: BasicNomenclator[]) => {
                        setSelectedFilter(data);
                        !filterActived && setFilterActived(true);
                      }}
                    />
                  )}
                </div>
              </article>
            </section>
          </div>
        </div>
      </header>
      <Calendar
        localizer={localizer}
        messages={{
          allDay: "Todo el día",
          previous: "Anterior",
          next: "Siguiente",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
          date: "Fecha",
          time: "Hora",
          event: "Evento",
          noEventsInRange: "No hay eventos en este rango",
          yesterday: "Ayer",
          tomorrow: "Mañana",
          work_week: "Semana laboral",
          showMore: (total: number) => `+ Ver más (${total})`,
        }}
        toolbar={false}
        selectable
        className=""
        dayLayoutAlgorithm={"no-overlap"}
        date={currentDate}
        view={view}
        events={events}
        showAllEvents={false}
        allDayMaxRows={2}
        popup={true}
        //@ts-ignore
        onSelectSlot={onSelectSlot}
        //@ts-ignore
        onSelectEvent={handleSelectEvent && handleSelectEvent}
        components={components}
      ></Calendar>
    </div>
  );
};

export default GenericCalendar;

export function HeroicosOutlineViewBoards(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        d="M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10V7m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2"
      />
    </svg>
  );
}

export interface ViewsActions {
  icon?: React.ReactNode;
  title: string;
  action?: () => void;
}

interface BtnActions {
  icon?: React.ReactNode;
  loading?: boolean;
  title: string;
  action?: () => void;
}
interface Propss {
  icon: React.ReactNode;
  items: BtnActions[];
}
function IconMenu({ icon, items }: Propss) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-flex flex-shrink-0">
      <Menu as="div" className="relative -ml-px block">
        <Menu.Button
          className={`relative inline-flex items-center ${
            icon
              ? ""
              : "gap-2 rounded-md bg-white px-2 py-2 text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10 border-none"
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {icon ? (
            icon
          ) : (
            <div className=" w-7 flex justify-center items-center">
              <ChevronDownIcon className="h-5 w-5 " aria-hidden="true" />
            </div>
          )}
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 -mr-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {items.map((item) => (
              <Menu.Item key={item.title}>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => item.action && item.action()}
                    className={`flex items-center gap-2 w-full rounded-md p-2 text-sm  font-semibold ${
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {item.icon && item.icon}
                    {item.title}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
