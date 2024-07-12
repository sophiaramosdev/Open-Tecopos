import React, { useState } from "react";
import { DispatchProductNomenclator } from "../../../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import { useForm, SubmitHandler } from "react-hook-form";

interface ComponentProps {
  data: Partial<DispatchProductNomenclator> | null;
  action: Function;
}

const SetProdQuantComponent = ({ data, action }: ComponentProps) => {
  const { control, handleSubmit } = useForm<Record<string, string | number>>();
  const onSubmit: SubmitHandler<Record<string, string | number>> = (values) => {    
    action({id: data?.id,quantity:values.quantity, stockAreaProductId:data?.stockAreaProductId, measure:data?.measure, name:data?.name})
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="relative">
          <Input
            label="Cantidad a Mover"
            name="quantity"
            control={control}
            type="number"
            placeholder={`Cantidad en ${translateMeasure(data?.measure)}`}
            rules={{
              max: {value: data?.available ?? 0, message:"No puede mover una cantidad mayor a la disponible",},                
              required: "Debe indicar una cantidad",
            }}
          />
        </div>

        <div className="flex justify-end py-2">
          <Button name="Aceptar" color="slate-600" type="submit" />
        </div>
      </form>
    </>
  );
};

export default SetProdQuantComponent;
