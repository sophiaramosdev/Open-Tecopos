import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";

interface NewList {
  loading: boolean;
  addList: Function;
  closeModal: Function;
}

const NewListModal = ({ loading, addList, closeModal }: NewList) => {
  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    addList(data, closeModal);
  };

  //--------------------------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-medium leading-6 text-gray-700">
        Nueva lista
      </h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="col-span-6 flex flex-col gap-4">
          <Input
            label="Nombre *"
            name="name"
            control={control}
            placeholder="Nombre de la lista"
            rules={{
              required: "Este campo es requerido",
            }}
          />

          <div className="flex justify-end">
            <Button
              color="slate-600"
              type="submit"
              name="Crear"
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewListModal;
