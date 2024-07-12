import React from "react";
import Select from "../../../components/forms/Select";
import { useAppSelector } from "../../../store/hooks";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import useServerArea from "../../../api/useServerArea";
import Button from "../../../components/misc/Button";
import { translatePaymetMethods } from "../../../utils/translate";

const PaymentWay = () => {
  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { areaId } = useParams();
  const { isFetching, updateArea } = useServerArea();

  const currentSaleArea = areas.find((item) => item.id === Number(areaId));

  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | (string | number)[]>
  > = (data) => {
    updateArea(Number(areaId), data);
  };

  const paymentMethods: SelectInterface[] =
    business?.configurationsKey
      .find((item) => item.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((itm) => ({ id: itm, name: translatePaymetMethods(itm) })) ?? [];

   const availableCurrencies:SelectInterface[] = business?.availableCurrencies.map(item=>({id:item.code, name:item.name}))??[];

    
  return (
    <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8  lg:col-span-full xl:px-5 xl:pt-6 bg-white">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Select
          label="Método de pago por defecto"
          control={control}
          data={paymentMethods}
          name="defaultPaymentMethod"
          defaultValue={currentSaleArea?.defaultPaymentMethod}
        />
        <Select
          label="Moneda de pago por defecto"
          control={control}
          data={availableCurrencies}
          name="defaultPaymentCurrency"
          defaultValue={currentSaleArea?.defaultPaymentCurrency}
        />
        <div className="py-5 flex justify-end">
          <Button
            color="slate-600"
            type="submit"
            name="Actualizar"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </div>
  );
};

export default PaymentWay;
