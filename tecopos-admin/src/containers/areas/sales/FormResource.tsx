import React, { useState } from "react";
import Input from "../../../components/forms/Input";
import { useForm, SubmitHandler } from "react-hook-form";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import { AreaResourcesInterface } from "../../../interfaces/ServerInterfaces";
import AlertContainer from "../../../components/misc/AlertContainer";
import Modal from "../../../components/modals/GenericModal";

interface EditResource {
  data?: Partial<AreaResourcesInterface> | null;
  addAction?: Function;
  updAction?: Function;
  delAction?: Function;
  loading: boolean;
}

const FormResource = ({
  data,
  delAction,
  loading,
  addAction,
  updAction,
}: EditResource) => {
  const { control, handleSubmit } = useForm();
  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    body
  ) => {
    updAction && updAction(data?.id,body);
    addAction && addAction(body);
  };

  const [deletModal, setDeletModal] = useState(false);

  return (
    <div>
      <div className="flex justify-between pb-3 items-center">
        <h2 className="text-lg text-gray-700 font-semibold">
          {`${updAction ? "Editar: " + data?.code : "Crear recurso"} `}
        </h2>
        {updAction && (
          <Button
            action={() => setDeletModal(true)}
            color="red-500"
            icon={<TrashIcon className="h-5 text-red-500" />}
            disabled={loading}
            textColor="red-500"
            outline
          />
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Nombre"
          placeholder="Nombre del recurso"
          name="code"
          control={control}
          defaultValue={data?.code}
        />
        <div className="flex items-center gap-24 mt-2">
          <Toggle
            name="isAvailable"
            title="Disponible"
            control={control}
            defaultValue={data?.isAvailable}
          />
          <Toggle
            name="isReservable"
            title="Reservable"
            control={control}
            defaultValue={data?.isReservable}
          />
        </div>
        <div className="flex justify-end py-4">
          <Button
            color="slate-600"
            type="submit"
            name="Aceptar"
            disabled={loading}
          />
        </div>
      </form>

      {deletModal && (
        <Modal state={deletModal} close={() => setDeletModal(false)}>
          <AlertContainer
            title="Eliminar"
            text={`Está a punto de eliminar ${data?.code}, seguro que desea continuar?`}
            onAction={() => delAction && delAction(data?.id)}
            onCancel={() => setDeletModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default FormResource;
