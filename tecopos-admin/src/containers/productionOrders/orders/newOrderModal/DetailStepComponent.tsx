import React from "react";
import Button from "../../../../components/misc/Button";
import Input from "../../../../components/forms/Input";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../../store/hooks";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import Select from "../../../../components/forms/Select";

interface DetailOrder {
  next: Function;
  defaultData:{name?:string, areaId?:number }
}

const DetailStepComponent = ({ next, defaultData }: DetailOrder) => {
  const { handleSubmit, control } = useForm();
  const { areas } = useAppSelector((state) => state.nomenclator);

  const areasSelector: SelectInterface[] = areas
    .filter((area) => area.type === "MANUFACTURER")
    .map((itm) => ({ id: itm.id, name: itm.name }));

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    next(data);
  };
  return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="w-full h-96 border border-slate-300 p-3 rounded-md">
          <div className="flex flex-col gap-4">
            <Input
              name="name"
              control={control}
              label="Nombre *"
              placeholder="Nombre de la orden"
              defaultValue={defaultData?.name}
            />
            <Select
              name="areaId"
              control={control}
              data={areasSelector}
              label="Área de producción *"
              rules={{ required: "* Campo requerido" }}
              defaultValue={defaultData?.areaId}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 py-3 ">
          <div className="col-span-1"></div>
          <Button color="slate-700" name="Siguiente" type="submit" full />
        </div>
      </form>
  );
};

export default DetailStepComponent;
