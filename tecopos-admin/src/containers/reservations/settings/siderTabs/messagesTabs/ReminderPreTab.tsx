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
const ReminderPreTab = ({
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

  const [config_message_pre_booking, set_conifg_message_pre_booking] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "config_message_pre_booking"
    )?.value === "true" ?? false
  );
  const [pre_booking_subject, set_pre_booking_subject] = useState(
    business!.configurationsKey.find(
      (configuration) => configuration.key === "pre_booking_subject"
    )?.value ?? ""
  );
  const [pre_booking_message_template, set_pre_booking_message_template] =
    useState(
      business!.configurationsKey.find(
        (configuration) => configuration.key === "pre_booking_message_template"
      )?.value ?? ""
    );

    const [
      pre_booking_notification_method,
      set_pre_booking_notification_method,
    ] = useState(
      business!.configurationsKey.find(
        (configuration) =>
          configuration.key === "pre_booking_notification_method"
      )?.value.split(",") ?? []
    );
  
    const [method, setMethod] = useState(
      pre_booking_notification_method.includes("email")
    );
    
    const [methodSMS, setMethodSMS] = useState(
      pre_booking_notification_method.includes("sms")
    );
    
  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const {
      config_message_pre_booking,
      pre_booking_subject,
      pre_booking_message_template,
    } = data;
    updateConfigs(
      deleteUndefinedAttr({
        config_message_pre_booking,
        pre_booking_subject,
        pre_booking_message_template,
        pre_booking_notification_method : (method ? "email" : "") + (methodSMS ? ",sms" : ""),
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
            name="config_message_pre_booking"
            title="Habilitar mensajes de confirmación de pre-reserva realizada"
            control={control}
            defaultValue={config_message_pre_booking}
          />

          <p className="mt-4 ">
          Envía automáticamente un mensaje a los clientes cuando realizan una pre-reserva.
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
                name="pre_booking_subject"
                label={affair}
                placeholder="Recordatorio de reserva"
                defaultValue={pre_booking_subject}
              />
            </div>

            <div>
              <TextArea
                control={control}
                name="pre_booking_message_template"
                label={`Plantilla del mensaje  ${
                  textMessage ? `de ${textMessage}` : ""
                } `}
                defaultValue={pre_booking_message_template}
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

export default ReminderPreTab;
