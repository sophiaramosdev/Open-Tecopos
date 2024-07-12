import { useContext } from "react";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { AddSupplierCtx } from "./AddSupplierWizzard";
import GenericImageDrop from "../../../components/misc/Images/GenericImageDrop";


const PersonalSupplier = () => {
  const { control, trigger, nextStep } = useContext(AddSupplierCtx);

  const nextAction = async () => {
    if (trigger) {
      const validate = await trigger("name");
      if (validate && nextStep) nextStep();
    }
  };

  return (
    <>
      <div className="grid grid-cols-5 gap-3">
        <GenericImageDrop
          name="imageId"
          className="col-span-2 border border-gray-300 p-2 rounded focus:outline-none cursor-pointer"
          control={control}
        />
        <div className="border border-gray-300 p-2 rounded col-span-3">
          <div className="flex-col">
            <Input
              label="Nombre"
              name="name"
              control={control}
              rules={{ required: "Campo requerido" }}
            />
            <TextArea
              name="observations"
              label="Descripción"
              control={control}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <div className="w-1/2">
          <Button
            name="Siguiente"
            color="indigo-600"
            action={nextAction}
            full
          />
        </div>
      </div>
    </>
  );
};

export default PersonalSupplier;
