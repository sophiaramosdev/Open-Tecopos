import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../../store/hooks";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import Select from "../../../../components/forms/Select";
import Button from "../../../../components/misc/Button";
import { DispatchStatus } from "../../../../interfaces/ServerInterfaces";

interface TransformInterface {
  action: (payload: Record<string, any>) => void;
  loading: boolean;
}

const TransformToBill = ({ action, loading }: TransformInterface) => {
  const { handleSubmit, control } = useForm();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { business } = useAppSelector((state) => state.init);
  const { availableCurrencies } = business!;

  const areasSelector: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const currencySelector: SelectInterface[] = availableCurrencies.map(
    (item) => ({ id: item.code, name: item.code })
  );

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    action(data);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col w-full gap-3">
      <Select
        data={areasSelector}
        name="areaSalesId"
        control={control}
        label="Punto de venta *"
        rules={{ required: "Seleccione *" }}
      />
      <Select
        data={currencySelector}
        name="codeCurrencyToSale"
        control={control}
        label="Moneda de venta"
      />
      <div className="flex justify-end pt-5">
        <Button name="Aceptar" type="submit" loading={loading} />
      </div>
    </form>
  );
};

export default TransformToBill;
