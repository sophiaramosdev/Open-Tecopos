import { useState } from "react";
import Toggle from "../../../../../components/forms/Toggle";
import { SubmitHandler, useForm } from "react-hook-form";
import Check from "../../../../../components/forms/GenericCheck";
import Input from "../../../../../components/forms/Input";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import Modal from "../../../../../components/misc/GenericModal";
import useServerBusiness from "../../../../../api/useServerBusiness";
import { useAppSelector } from "../../../../../store/hooks";
import { BasicType } from "../../../../../interfaces/InterfacesLocal";
import { deleteUndefinedAttr } from "../../../../../utils/helpers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import TabNav from "../../../../../components/navigation/TabNav";
import { ModalAlert } from "../../../../../components";

interface Props {
  showSelect?: boolean;
  textMessage?: string;
  affair?: string;
  data: any;
}
const ReminderCancelationTab = ({
  showSelect,
  textMessage = "",
  affair = "",
  data,
}: Props) => {
  const { control, handleSubmit } = useForm();
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

  const [config_message_cancellation, set_config_message_cancellation] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "config_message_cancellation"
      )?.value === "true" ?? false
    );

  const [cancellation_subject, set_cancellation_subject] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "cancellation_subject"
    )?.value ?? ""
  );

  const [cancellation_message_template, set_cancellation_message_template] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "cancellation_message_template"
      )?.value ?? ""
    );
  const [
    cancellation_notification_method,
    set_cancellation_notification_method,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) =>
        configuration.key === "cancellation_notification_method"
    )?.value.split(",") ?? []
  );

  const [method, setMethod] = useState(
    cancellation_notification_method.includes("email")
  );
  const [methodSMS, setMethodSMS] = useState(
    cancellation_notification_method.includes("sms")
  );
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const {
      config_message_cancellation,
      cancellation_subject,
      cancellation_message_template,
    } = data;
    updateConfigs(
      deleteUndefinedAttr({
        config_message_cancellation,
        cancellation_subject,
        cancellation_message_template,
        cancellation_notification_method : (method ? "email" : "") + (methodSMS ? ",sms" : "")
      })
    );
  };

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
            name="config_message_cancellation"
            title="Habilitar los mensajes de cancelación"
            control={control}
            defaultValue={config_message_cancellation || ""}
          />

          <p className="mt-4 ">
          Envía automáticamente a los clientes cuando su reservación ha sido cancelada.
          </p>
        </header>

        <div className=" border-2 rounded-md p-5 mt-9">
          <h3 className="text-md font-semibold text-center">
            Configuración de mensajes
          </h3>

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

           {methodSMS && <div className=" flex gap-x-4 items-center">
              <ExclamationTriangleIcon className="w-5 text-yellow-500 mt-1" />
              <span className="text-yellow-600">
                Para utilizar el canal SMS debe pagar un costo adicional.
              </span>
            </div>}

            <div>
              <h3> </h3>
              <Input
                control={control}
                name="cancellation_subject"
                label={affair}
                placeholder="Recordatorio de reserva"
                defaultValue={cancellation_subject || ""}
              />
            </div>

            <div className="">
              <TextArea
                control={control}
                name="cancellation_message_template"
                label={`Plantilla del mensaje  ${
                  textMessage ? `de ${textMessage}` : ""
                } `}
                defaultValue={cancellation_message_template || ""}
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

export default ReminderCancelationTab;
