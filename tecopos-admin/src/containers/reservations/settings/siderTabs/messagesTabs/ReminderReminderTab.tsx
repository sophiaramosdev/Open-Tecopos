import { useState } from "react";
import Toggle from "../../../../../components/forms/Toggle";
import { SubmitHandler, useForm } from "react-hook-form";
import Select from "../../../../../components/forms/Select";
import Check from "../../../../../components/forms/GenericCheck";
import Input from "../../../../../components/forms/Input";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import TabNav from "../../../../../components/navigation/TabNav";
import { ModalAlert } from "../../../../../components";
import useServerBusiness from "../../../../../api/useServerBusiness";
import { useAppSelector } from "../../../../../store/hooks";
import { BasicType } from "../../../../../interfaces/InterfacesLocal";
import {
  deleteUndefinedAttr,
} from "../../../../../utils/helpers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface Props {
  showSelect?: boolean;
  textMessage?: string;
  affair?: string;
  data: any;
}
const ReminderReminderTab = ({
  showSelect,
  textMessage = "",
  affair = "",
  data,
}: Props) => {
  const { control, handleSubmit, watch } = useForm();
  const [showModal, setShowModal] = useState(false);

  const [currentTab, setCurrentTab] = useState("app");
  const tabs = [
    {
      name: "Reservas en la Aplicación",
      href: "app",
      current: currentTab === "app",
    },
    {
      name: "Reservas en Línea",
      href: "line",
      current: currentTab === "line",
    },
  ];

  const { business,  user } = useAppSelector((state) => state.init);
  const { updateConfigs, isFetching, isLoading } = useServerBusiness();

  const [config_message_reminder, set_conifg_message_reminder] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "config_message_reminder"
    )?.value === "true" ?? false
  );
  const [reminder_subject, set_reminder_subject] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "reminder_subject"
    )?.value ?? ""
  );
  const [reminder_message_template, set_reminder_message_template] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "reminder_message_template"
    )?.value ?? ""
  );
  const [notification_reservation_before, set_notification_reservation_before] =
    useState(
      business!.configurationsKey.find(
        (configuration) =>
          configuration.key === "notification_reservation_before"
      )?.value ?? 0
    );

  const [reminder_notification_method, set_reminder_notification_method] =
    useState(
      business!.configurationsKey
        .find(
          (configuration) =>
            configuration.key === "reminder_notification_method"
        )
        ?.value.split(",") ?? []
    );

  const [method, setMethod] = useState(
    reminder_notification_method.includes("email")
  );
  const [methodSMS, setMethodSMS] = useState(
    reminder_notification_method.includes("sms")
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const {
      config_message_reminder,
      reminder_subject,
      reminder_message_template,
      notification_reservation_before,
    } = data;
    updateConfigs(
      deleteUndefinedAttr({
        config_message_reminder,
        reminder_subject,
        reminder_message_template,
        notification_reservation_before,
        reminder_notification_method:
          (method ? "email" : "") + (methodSMS ? ",sms" : ""),
      })
    );
  };

  const hourRanges = [2, 3, 6, 8, 12, 24, 48, 96];
  const arrayTimeRemined: any = [];
  hourRanges.forEach((range) => {
    arrayTimeRemined.push({
      id: range,
      name: `${range} horas`,
    });
  });

  return (
    <>
      <form className="" onSubmit={handleSubmit(onSubmit)}>
        {showSelect && (
          <div className="flex justify-start gap-x-2">
            <TabNav className="border " tabs={tabs} action={setCurrentTab} />
          </div>
        )}
        <header className=" border-2 rounded-md p-5">
          <Toggle
            name="config_message_reminder"
            title="Habilitar mensajes de recordatorios"
            control={control}
            defaultValue={config_message_reminder}
          />

          <p className="mt-4 ">
            Envía recordatorios automáticamente a los clientes al aproximarse su
            reservación
          </p>
        </header>

        <div className=" border-2 rounded-md p-5 mt-9">
          <h3 className="text-md font-semibold text-center">
            Configuración de mensajes
          </h3>

          <div>
            <span>Se enviarán recordatorios</span>
            <Select
              name="notification_reservation_before"
              control={control}
              data={arrayTimeRemined}
              defaultValue={Number(notification_reservation_before)}
              placeholder="Seleccione un valor"
            />
          </div>

          <div className="my-5 flex flex-col gap-y-6">
            <h3>Seleccione los canales en los que se enviará este mensaje</h3>

            <aside className="flex gap-x-10">
              <Check
                value={"email"}
                label="Correo electrónico"
                checked={method}
                onChange={() => setMethod(!method)}
              />
              <Check
                value={"sms"}
                label="SMS"
                checked={methodSMS}
                onChange={() => setMethodSMS(!methodSMS)}
              />
            </aside>

            {methodSMS && (
              <div className=" flex gap-x-4 items-center">
                <ExclamationTriangleIcon className="w-5 text-yellow-500 mt-1" />
                <span className="text-yellow-600">
                  Para utilizar el canal SMS debe pagar un costo adicional.
                </span>
              </div>
            )}
            <div>
              <h3> </h3>
              <Input
                control={control}
                name="reminder_subject"
                label={affair}
                placeholder="Recordatorio de reserva"
                defaultValue={reminder_subject}
              />
            </div>

            <div className="min-h-[100px]">
              <TextArea
                control={control}
                name="reminder_message_template"
                label={`Plantilla del mensaje  ${
                  textMessage ? `de ${textMessage}` : ""
                } `}
                defaultValue={reminder_message_template}
                size={200}
              />
            </div>
          </div>
        </div>

        <footer className="flex justify-end mt-3">
          <div className="min-w-[200px]">
            <Button
              color="slate-700"
              name="Guardar"
              full
              // action={() => setShowModal(true)}
              type="submit"
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </footer>

        {showModal && (
          <ModalAlert
            type=""
            title={`Activado Mensajes  `}
            text={`¡Se han activado los mensajes Automáticos! `}
            onAccept={async () => {}}
            onClose={() => setShowModal(false)}
            isLoading={false}
          />
        )}
      </form>
    </>
  );
};

export default ReminderReminderTab;
