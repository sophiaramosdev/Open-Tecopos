import { useState } from "react";
import Toggle from "../../../../../components/forms/Toggle";
import { SubmitHandler, useForm } from "react-hook-form";
import Check from "../../../../../components/forms/GenericCheck";
import Input from "../../../../../components/forms/Input";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import TabNav from "../../../../../components/navigation/TabNav";
import { ModalAlert } from "../../../../../components";
import useServerBusiness from "../../../../../api/useServerBusiness";
import { useAppSelector } from "../../../../../store/hooks";
import { BasicType } from "../../../../../interfaces/InterfacesLocal";
import { deleteUndefinedAttr } from "../../../../../utils/helpers";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface Props {
  showSelect?: boolean;
  textMessage?: string;
  affair?: string;
  data: any;
}
const ReminderConfirmTab = ({
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
      href: "online",
      current: currentTab === "online",
    },
  ];

  const { business,  user } = useAppSelector((state) => state.init);
  const { updateConfigs, isFetching, isLoading } = useServerBusiness();

  const [config_message_confirmation, set_conifg_message_confirmation] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "config_message_confirmation"
      )?.value === "true" ?? false
    );
  const [
    config_message_confirmation_online,
    set_conifg_message_confirmation_online,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) =>
        configuration.key === "config_message_confirmation_online"
    )?.value === "true" ?? false
  );

  const [confirmation_subject, set_confirmation_subject] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "confirmation_subject"
    )?.value ?? ""
  );
  const [
    confirmation_subject_online,
    set_confirmation_subject_confirmation_online,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "confirmation_subject_online"
    )?.value ?? ""
  );

  const [confirmation_message_template, set_confirmation_message_template] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "confirmation_message_template"
      )?.value ?? ""
    );

  const [
    confirmation_message_template_online,
    set_confirmation_message_template_online,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) =>
        configuration.key === "confirmation_message_template_online"
    )?.value ?? ""
  );

  const [
    confirmation_notification_method,
    set_confirmation_notification_method,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) =>
        configuration.key === "confirmation_notification_method"
    )?.value.split(",") ?? []
  );

  const [method, setMethod] = useState(
    confirmation_notification_method.includes("email")
  );
  const [methodSMS, setMethodSMS] = useState(
    confirmation_notification_method.includes("sms")
  );
  const [
    confirmation_online_notification_method,
    set_confirmation_online_notification_method,
  ] = useState(
    business!.configurationsKey.find(
      (configuration) =>
        configuration.key === "confirmation_online_notification_method"
    )?.value.split(",") ?? []
  );

  const [method_online, setMethodOnline] = useState(
    confirmation_online_notification_method.includes("email")
  );
  const [method_onlineSMS, setMethodOnlineSMS] = useState(
    confirmation_online_notification_method.includes("sms")
  );

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const {
      config_message_confirmation,
      config_message_confirmation_online,
      confirmation_subject,
      confirmation_subject_online,
      confirmation_message_template,
      confirmation_message_template_online,
    } = data;

    if (currentTab === "app") {
      updateConfigs(
        deleteUndefinedAttr({
          config_message_confirmation,
          confirmation_subject,
          confirmation_message_template,
          confirmation_notification_method:(method ? "email" : "") + (methodSMS ? ",sms" : "")
        })
      );
    } else {
      updateConfigs(
        deleteUndefinedAttr({
          config_message_confirmation_online,
          confirmation_subject_online,
          confirmation_message_template_online,
          confirmation_online_notification_method: (method_online ? "email" : "") + (method_onlineSMS ? ",sms" : "")
        })
      );
    }
  };

  return (
    <>
      <form className="" onSubmit={handleSubmit(onSubmit)}>
        {showSelect && (
          <div className="flex justify-start gap-x-2">
            <TabNav className="border " tabs={tabs} action={setCurrentTab} />
          </div>
        )}

        {currentTab === "app" && (
          <section>
            <header className=" border-2 rounded-md p-5">
              <Toggle
                name="config_message_confirmation"
                title={
                  currentTab === "app"
                    ? "Activar confirmaciones de reservas en la aplicación"
                    : "Activar confirmaciones de reservas en línea"
                }
                control={control}
                defaultValue={config_message_confirmation}
              />

              <p className="mt-4 ">
              Envía automáticamente un mensaje de confirmación a los clientes cuando se les reserva.
              </p>
            </header>

            <div className=" border-2 rounded-md p-5 mt-9">
              <h3 className="text-md font-semibold text-center">
                Configuración de mensajes
              </h3>

              <div className="my-5 flex flex-col gap-y-6">
                <h3>
                  Seleccione los canales en los que se enviará este mensaje
                </h3>

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
                    name="confirmation_subject"
                    label={affair}
                    placeholder="Recordatorio de reserva"
                    defaultValue={confirmation_subject}
                  />
                </div>

                <div>
                  <TextArea
                    control={control}
                    name="confirmation_message_template"
                    label={`Plantilla del mensaje  ${
                      textMessage ? `de ${textMessage}` : ""
                    } `}
                    defaultValue={confirmation_message_template}
                    size={200}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
        {currentTab === "online" && (
          <section>
            <header className=" border-2 rounded-md p-5">
              <Toggle
                name="config_message_confirmation_online"
                title={"Activar confirmaciones de reservas en línea"}
                control={control}
                defaultValue={config_message_confirmation_online}
              />

              <p className="mt-4 ">
              Envía automáticamente un mensaje de confirmación a los clientes cuando realizan una reservación.
              </p>
            </header>

            <div className=" border-2 rounded-md p-5 mt-9">
              <h3 className="text-md font-semibold text-center">
                Configuración de mensajes
              </h3>

              <div className="my-5 flex flex-col gap-y-6">
                <h3>
                  Seleccione los canales en los que se enviará este mensaje
                </h3>

                <aside className="flex gap-x-10">
                  <Check
                    value={"email"}
                    label="Correo electrónico"
                    checked={method_online}
                    onChange={() => setMethodOnline(!method_online)}
                  />
                  <Check
                    value={"sms"}
                    label="SMS"
                    checked={method_onlineSMS}
                    onChange={() => setMethodOnlineSMS(!method_onlineSMS)}
                  />
                </aside>

                {method_onlineSMS && (
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
                    name="confirmation_subject_online"
                    label={affair}
                    placeholder="Recordatorio de reserva"
                    defaultValue={confirmation_subject_online}
                  />
                </div>

                <div>
                  <TextArea
                    control={control}
                    name="confirmation_message_template_online"
                    label={`Plantilla del mensaje  ${
                      textMessage ? `de ${textMessage}` : ""
                    } `}
                    defaultValue={confirmation_message_template_online}
                    size={200}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

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

export default ReminderConfirmTab;
