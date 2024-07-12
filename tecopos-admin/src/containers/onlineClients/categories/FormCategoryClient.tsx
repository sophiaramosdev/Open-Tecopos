import { useContext, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import useServerBankAccount from "../../../api/useServerBankAccount";
import { BankAccountTagInterfaces } from "../../../interfaces/ServerInterfaces";

import Input from "../../../components/forms/Input";

import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { TrashIcon } from "@heroicons/react/24/outline";
import Button from "../../../components/misc/Button";
import useServerOnlineClients from "../../../api/useServerOnlineClients";
import { HelperContext } from "./ListCustomerCategories";

interface NewCategoryClient {
  categoryData?: any;
  closeModal: Function;
}

const FormCategoryClient = ({
  categoryData,
  closeModal,
}: NewCategoryClient) => {
  const {
    control,
    handleSubmit,
    formState: { isSubmitted },
  } = useForm();
  const [isSubmit, setIsSubmit] = useState(false);

  const {
    editCategoryClient,
    addCustomerCategory,
    isFetching,
    deleteClientCategory,
  } = useContext(HelperContext);

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean>
  > = async (data) => {
    setIsSubmit(true);
    if (!!categoryData) {
      //@ts-ignore
      editCategoryClient(categoryData.id, data, closeModal);
    } else {
      //@ts-ignore
      addCustomerCategory(data, ()=>{closeModal()});
    }
    setIsSubmit(false);
  };

  const [deleteModal, setdeleteModal] = useState(false);
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="font-semibold mb-2">Nueva categoría de cliente </h2>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        {!!categoryData && (
          <div className="flex w-full justify-end">
            <Button
              action={() => setdeleteModal(true)}
              type="button"
              color="red-500"
              icon={<TrashIcon className="h-5 text-red-500" />}
              outline
            />
          </div>
        )}

        <div className={`grid grid-cols-1 gap-3`}>
          <div className="">
            <Input
              label="Nombre *"
              name="name"
              control={control}
              defaultValue={categoryData?.name}
              placeholder="Inserte el nombre del Concepto"
              rules={{
                required: "Este campo es requerido",
              }}
            />
          </div>
          <div className="">
            <Input
              label="Descripción"
              name="description"
              control={control}
              defaultValue={categoryData?.description}
              placeholder="Inserte una descripción de la categoría"
            />
          </div>
        </div>

        <div className="flow-root pt-6 pb-0">
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
            <Button
              color="slate-600"
              type="submit"
              name={`${!!categoryData ? "Actualizar" : "Registrar"}`}
              loading={isFetching && isSubmitted}
              disabled={isFetching}
            />
          </div>
        </div>
      </div>

      {deleteModal && (
        <Modal close={() => setdeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar categoría`}
            //@ts-ignore
            onAction={() => deleteClientCategory(categoryData.id, closeModal)}
            onCancel={() => setdeleteModal(false)}
            text={`¿Seguro que desea eliminar esta la Categoría  ${categoryData?.name}?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </form>
  );
};

export default FormCategoryClient;
