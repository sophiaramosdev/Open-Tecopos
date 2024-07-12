import { useState } from "react";
import { CalendarIcon, Cog8ToothIcon } from "@heroicons/react/24/outline";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import TabNav from "../../../components/navigation/TabNav";
import SideNav from "../../../components/misc/SideNav";
import MessagesTab from "./siderTabs/MessagesTab";
import SettingsCalendar from "./siderTabs/SettingsCalendar";
import SettingsReservation from "./siderTabs/SettingsReservation";

const ReservationSettingsMain = () => {
  const [currentTab, setCurrentTab] = useState("detail");
  const tabs = [
    {
      name: "Recordatorio",
      href: "reminder",
      current: currentTab === "reminder",
    },
    {
      name: "Confirmación",
      href: "confirmation",
      current: currentTab === "confirmation",
    },
    {
      name: "Pre-Reserva",
      href: "pre-reservation",
      current: currentTab === "pre-reservation",
    },
    {
      name: "Reprogramar",
      href: "reschedule",
      current: currentTab === "reschedule",
    },
    {
      name: "Cancelación",
      href: "cancellation",
      current: currentTab === "cancellation",
    },
  ];

  const paths: PathInterface[] = [
    {
      name: "Reservaciones",
    },
    {
      name: "Ajustes",
    },
  ];

  const [currentReservationSideTab, setReservationSideTab] =
    useState("messages");

  const reservationSideTabChange = () => {
    return [
      {
        name: "Mensajes",
        href: "messages",
        current: currentReservationSideTab === "messages",
      },
      {
        name: "Ajuste de calendario",
        href: "ajsCalendar",
        current: currentReservationSideTab === "ajsCalendar",
      },
      {
        name: "Ajuste de las reservaciones",
        href: "ajsReservations",
        current: currentReservationSideTab === "ajsReservations",
      },
    ];
  };

  const reservationSideTab = reservationSideTabChange();

  return (
    <>
      <Breadcrumb
        icon={<CalendarIcon className="h-6 text-gray-500 " />}
        paths={paths}
      />
      <div className="sm:grid grid-cols-12 gap-3 max-w-7xl">
        <SideNav
          tabs={reservationSideTab}
          action={(to: string) => setReservationSideTab(to)}
          className="col-span-10 sm:col-span-2"
        />

        <div className="sm:col-span-10 pl-3 bg-white rounded-md shadow-md">
          {currentReservationSideTab === "messages" && <MessagesTab />}
          {currentReservationSideTab === "ajsCalendar" && <SettingsCalendar />}
          {currentReservationSideTab === "ajsReservations" && (
            <SettingsReservation />
          )}
        </div>
      </div>
    </>
  );
};

export default ReservationSettingsMain;
