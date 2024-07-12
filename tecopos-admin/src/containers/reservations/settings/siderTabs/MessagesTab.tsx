import { useState } from "react";
import TabNav from "../../../../components/navigation/TabNav";
import ReminderTab from "./messagesTabs/ReminderConfirmTab";
import { useAppSelector } from "../../../../store/hooks";
import ReminderReminderTab from "./messagesTabs/ReminderReminderTab";
import ReminderConfirmTab from "./messagesTabs/ReminderConfirmTab";
import ReminderPreTab from "./messagesTabs/ReminderPreTab";
import ReminderEditTab from "./messagesTabs/ReminderEditTab";
import ReminderCancelationTab from "./messagesTabs/ReminderCancelationTab";

const MessagesTab = () => {
  const [currentTab, setCurrentTab] = useState("reminder");
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

  const { business,  user } = useAppSelector((state) => state.init);

  const [config_message_cancellation, set_conifg_message_cancellation] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "config_message_cancellation"
      )?.value === "true" ?? false
    );

  return (
    <>
      <div className="">
        <TabNav className=" m-auto" tabs={tabs} action={setCurrentTab} />
        <div className=" p-8 rounded-md ">
          {currentTab === "reminder" && (
            <ReminderReminderTab
              data={{ config_message_cancellation }}
              textMessage="recordatorio"
              affair="Asunto del recordatorio "
            />
          )}
          {currentTab === "confirmation" && (
            <ReminderConfirmTab
              data={{}}
              showSelect={true}
              textMessage="confirmación"
              affair="Asunto de confirmación de reserva"
            />
          )}
          {currentTab === "pre-reservation" && (
            <ReminderPreTab
              data={{}}
              textMessage="pre-reserva"
              affair="Asunto del confirmación de pre-reserva  "
            />
          )}
          {currentTab === "reschedule" && (
            <ReminderEditTab
              data={{}}
              affair="Asunto de modificación de reserva  "
            />
          )}
          {currentTab === "cancellation" && (
            <ReminderCancelationTab
              data={{}}
              textMessage="cancelación de reserva"
              affair="Asunto de cancelación de reserva"
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MessagesTab;
