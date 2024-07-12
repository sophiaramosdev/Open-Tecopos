import { useContext } from "react";
import { AddPersonCtx } from "./NewPersonWizzard";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import GenericImageDrop from "../../../../components/misc/Images/GenericImageDrop";
import { useFieldArray } from "react-hook-form";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const DetailPersonComponent = () => {
  const { control, nextStep, trigger } = useContext(AddPersonCtx);
  const { fields, append, remove } = useFieldArray({ control, name: "phones" });

  const afterAction = async () => {
    if (trigger && (await trigger())) {
      nextStep && nextStep();
    }
  };

  return (
    <>
      <div className="h-96 overflow-auto scrollbar-thin px-1">
        <GenericImageDrop
          className="h-40 w-40 rounded-full border border-gray-400 m-auto overflow-hidden"
          control={control}
          name="profilePhotoId"
        />
        <div className="pt-3 grid grid-cols-2 gap-2">
          <Input
            name="firstName"
            label="Nombre"
            control={control}
            rules={{ required: "Campo requerido" }}
            type="textOnly"
          />
          <Input name="lastName" label="Apellidos" control={control} type="textOnly"/>
        </div>
        {/**Phones */}
        <div className="pt-8">
          <div className="relative border-t border-slate-500 flex justify-center">
            <span className="relative text-center bg-gray-50 px-5 -top-3">
              Teléfonos
            </span>
          </div>
        </div>
        {fields.map((item, idx) => (
          <div key={item.id} className="inline-flex w-full gap-2">
            <div key={item.id} className="grid grid-cols-2 gap-2 w-full mb-2">
              <Input
                name={`phones.${idx}.number`}
                control={control}
                label="Teléfono"
                rules={{ required: "Llene los datos o elimine el campo" }}
                textAsNumber
              />
              <Input
                name={`phones.${idx}.description`}
                control={control}
                label="Descripción"
                //rules={{ required: "Llene los datos o elimine el campo" }}
              />
            </div>
            <div className="flex items-end pt-5 mb-2">
              <Button
                color="red-500"
                icon={<TrashIcon className="h-5" />}
                action={() => remove(idx)}
              />
            </div>
          </div>
        ))}
        <div className="flex justify-end mt-5 gap-2">
          <Button
            color="slate-400"
            textColor="slate-500"
            icon={<PlusIcon className="h-5" />}
            name="Insertar"
            action={() => append({})}
            full
            outline
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <div></div>
        <Button name="Siguiente" color="slate-600" action={afterAction} />
      </div>
    </>
  );
};

export default DetailPersonComponent;
