import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { SubmitHandler, useForm } from "react-hook-form";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import useServerBusiness from "../../../api/useServerBusiness";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Select from "../../../components/forms/Select";
import { setRollSize } from "../../../store/slices/sessionSlice";
import { cleanObj } from "../../../utils/helpers";
import GenericImageDrop from "../../../components/misc/Images/GenericImageDrop";
import { useState } from "react";

const Tickets = () => {
  const { configurationsKey } = useAppSelector((state) => state.init.business!);
  const { rollSize } = useAppSelector((state) => state.session!);
  const { business } = useAppSelector((state) => state.init);

  const { handleSubmit, control, watch } = useForm();
  const { updateConfigs, isFetching, editBusiness } = useServerBusiness();

  const dispatch = useAppDispatch()

  let ticket_business_name!: string;
  let ticket_footer!: string;
  let ticket_print_allow_to_pay_in_other_currencies!: boolean;
  let ticket_print_all_data_client!: boolean;
  let ticket_print_barcode!: boolean;
  let ticket_print_unitary_price!: boolean;
  let ticket_print_logo!: boolean;

  //load config -------------------------------------------------------------
  configurationsKey.forEach((item) => {
    switch (item.key) {
      case "ticket_business_name":
        ticket_business_name = item.value;
        break;
      case "ticket_footer":
        ticket_footer = item.value;
        break;
      case "ticket_print_allow_to_pay_in_other_currencies":
        ticket_print_allow_to_pay_in_other_currencies = item.value === "true";
        break;
      case "ticket_print_all_data_client":
        ticket_print_all_data_client = item.value === "true";
        break;
      case "ticket_print_barcode":
        ticket_print_barcode = item.value === "true";
        break;
      case "ticket_print_unitary_price":
        ticket_print_unitary_price = item.value === "true";
        break;
      case "ticket_print_logo":
        ticket_print_logo = item.value === "true"
    }
  });
  //--------------------------------------------------------------------------------------

  const onSubmit: SubmitHandler<Record<string, boolean>> = (data) => {
    const { ticket_business_name,
      ticket_footer,
      ticket_print_allow_to_pay_in_other_currencies,
      ticket_print_all_data_client,
      ticket_print_barcode,
      ticket_print_unitary_price,
      ticket_print_logo,
      rollSize,
      logoTicketId
    } = data


    dispatch(setRollSize(rollSize))

    updateConfigs({
      ticket_business_name,
      ticket_footer,
      ticket_print_allow_to_pay_in_other_currencies,
      ticket_print_all_data_client,
      ticket_print_barcode,
      ticket_print_unitary_price,
      ticket_print_logo,
    });

    if (ticket_print_logo) {
      editBusiness(cleanObj({logoTicketId}));
    }
  };

  const [includeTicketLogo, setincludeTicketLogo] = useState<boolean>(ticket_print_logo)


  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-full bg-white rounded-md shadow-md border border-gray-200 p-5"
    >
      <div className="flex flex-col gap-y-5 pl-5">

        <Toggle
          title='Incluir logo del negocio'
          name="ticket_print_logo"
          defaultValue={ticket_print_logo}
          control={control}
          changeState={setincludeTicketLogo}
        />
        {
          includeTicketLogo && (
            <div className="flex items-center justify-center border border-gray-400 h-full w-full rounded-lg p-2 overflow-auto scrollbar-none">
              <div className="relative">
                <GenericImageDrop
                  name="logoTicketId"
                  control={control}
                  className="h-40 w-40 border border-gray-400 rounded-full bg-gray-100 z-10 cursor-pointer overflow-hidden"
                  previewDefault={business?.logoTicket?.src}
                  previewHash={business?.logoTicket?.blurHash}
                />
              </div>
            </div>

          )
        }

        <Input
          name="ticket_business_name"
          label="Nombre del negocio"
          control={control}
          defaultValue={ticket_business_name}
        />

        <TextArea
          name="ticket_footer"
          label="Texto al pie de página"
          control={control}
          defaultValue={ticket_footer}
        />
        <Toggle
          title='Imprimir sección: "También puede pagar con"'
          name="ticket_print_allow_to_pay_in_other_currencies"
          defaultValue={ticket_print_allow_to_pay_in_other_currencies}
          control={control}
        />
        <Toggle
          title="Imprimir todos los datos del cliente"
          name="ticket_print_all_data_client"
          defaultValue={ticket_print_all_data_client}
          control={control}
        />
        <Toggle
          title="Imprimir código de barras"
          name="ticket_print_barcode"
          defaultValue={ticket_print_barcode}
          control={control}
        />
        <Toggle
          title="Imprimir precio unitario"
          name="ticket_print_unitary_price"
          defaultValue={ticket_print_unitary_price}
          control={control}
        />

        <div className="">
          <Select
            name="rollSize"
            label="Tamaño del rollo"
            control={control}
            data={[{ id: 80, name: "80 mm" }, { id: 58, name: "58 mm" }]}
            rules={{ required: "Este campo es requerido" }}
            defaultValue={rollSize ?? 58}
          />
        </div>

      </div>
      <div className="flex justify-end py-5">
        <Button
          name="Actualizar"
          color="slate-600"
          type="submit"
          loading={isFetching}
        />
      </div>
    </form>
  );
};

export default Tickets;
