import { SubmitHandler, useForm } from "react-hook-form";
import {
  BasicType,
} from "../../../interfaces/InterfacesLocal";
import useServerBusiness from "../../../api/useServerBusiness";
import { cleanObj } from "../../../utils/helpers";
import Button from "../../../components/misc/Button";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import { useAppSelector } from "../../../store/hooks";
import Toggle from "../../../components/forms/Toggle";

const BillConfig = () => {

  const { handleSubmit, control } = useForm();
  const { updateConfigs, isFetching } = useServerBusiness();
  const { business } = useAppSelector((state) => state.init);

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    const { invoice_observations,
      invoice_header,
      invoice_business_name,
      billing_show_customer_data,
      billing_show_business_data,
      billing_show_business_logo,
      force_consecutive_invoice_numbers,
    } =
      data;
    updateConfigs(
      cleanObj({
        invoice_observations,
        invoice_header,
        invoice_business_name,
        billing_show_customer_data,
        billing_show_business_data,
        billing_show_business_logo,
        force_consecutive_invoice_numbers,
      })
    );
  };

  const invoice_business_name = business!.configurationsKey.find(
    (configuration) => configuration.key === "invoice_business_name"
  )?.value;
  const invoice_observations = business!.configurationsKey.find(
    (configuration) => configuration.key === "invoice_observations"
  )?.value;
  const invoice_header = business!.configurationsKey.find(
    (configuration) => configuration.key === "invoice_header"
  )?.value;
  const billing_show_customer_data = business!.configurationsKey.find(
    (configuration) => configuration.key === "billing_show_customer_data"
  )?.value;
  const billing_show_business_data = business!.configurationsKey.find(
    (configuration) => configuration.key === "billing_show_business_data"
  )?.value;
  const billing_show_business_logo = business!.configurationsKey.find(
    (configuration) => configuration.key === "billing_show_business_logo"
  )?.value;
  const force_consecutive_invoice_numbers = business!.configurationsKey.find(
    (configuration) => configuration.key === "force_consecutive_invoice_numbers"
  )?.value;

  return (
    <div className="h-full bg-white rounded-md shadow-md border border-gray-200 p-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex flex-col gap-y-3 items-stretch h-full">
          <Input
            name="invoice_business_name"
            control={control}
            label="Nombre oficial del negocio"
            placeholder="Nombre"
            defaultValue={invoice_business_name || ""}
          />
          <TextArea
            name="invoice_header"
            control={control}
            label="Cabecera"
            placeholder="Cabecera"
            defaultValue={invoice_header || ""}
          />
          <TextArea
            name="invoice_observations"
            control={control}
            label="Observaciones"
            placeholder="Observaciones"
            defaultValue={invoice_observations || ""}
          />

          <Toggle
            name="force_consecutive_invoice_numbers"
            control={control}
            defaultValue={force_consecutive_invoice_numbers === "true"}
            title="Establecer números de factura consecutivos en un año"
          />

          <h2 className='text-md font-medium text-gray-900 ml-4 mt-8'>Al exportar/imprimir facturas</h2>

          <Toggle
            name="billing_show_customer_data"
            control={control}
            defaultValue={billing_show_customer_data === "true"}
            title="Mostrar información del cliente"
          />

          <Toggle
            name="billing_show_business_data"
            control={control}
            defaultValue={billing_show_business_data === "true"}
            title="Mostrar información del negocio"
          />

          <Toggle
            name="billing_show_business_logo"
            control={control}
            defaultValue={billing_show_business_logo === "true"}
            title="Mostrar logo del negocio"
          />

          <div className="grid gap-2">
          </div>
          <div className="flex justify-end items-end h-full py-5">
            <div>
              <Button
                color="slate-600"
                name="Actualizar"
                type="submit"
                loading={isFetching}
                disabled={isFetching}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BillConfig;
