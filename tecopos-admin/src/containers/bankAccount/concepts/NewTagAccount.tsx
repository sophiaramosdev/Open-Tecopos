import { useContext, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import useServerBankAccount from "../../../api/useServerBankAccount";
import { BankAccountTagInterfaces } from "../../../interfaces/ServerInterfaces";

import Input from "../../../components/forms/Input";

import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { TrashIcon } from "@heroicons/react/24/outline";
import Button from "../../../components/misc/Button";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";

interface FormAccountTag {
  accountTagData?: BankAccountTagInterfaces | null;
  closeModal: Function;
}

const TagAccountForm = ({ accountTagData, closeModal }: FormAccountTag) => {
  const { control, handleSubmit, formState} = useForm();
  const {isSubmitting} = formState;
  const {
    addAccountTag: add,
    deleteBankAccountTag: del,
    updateBankAccountTag: upd,
    isFetching,
  } = useContext(DetailAccountContext);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = async(
    data
  ) => {
    if (!!accountTagData) {
      await upd!(accountTagData?.id, data, closeModal);
    } else {
      add!(data, closeModal);
    }
  };
  const [deleteModal, setdeleteModal] = useState(false); //Modal de eliminar operacion de Cuenta bancaria

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        {!!accountTagData && (
          <div className="flex w-full justify-end">
            <Button
              action={() => setdeleteModal(true)}
              type="button"
              color="red-500"
              icon={<TrashIcon className="h-5 text-red-600" />}
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
              defaultValue={accountTagData?.name}
              placeholder="Inserte el nombre del Concepto"
              rules={{
                required: "Este campo es requerido",
              }}
            />
          </div>
        </div>

        <div className="flow-root pt-6 pb-0">
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
            <Button
              color="slate-600"
              type="submit"
              name={`${!!accountTagData ? "Actualizar" : "Registrar"}`}
              loading={isFetching&&isSubmitting}
              disabled={isFetching}
            />
          </div>
        </div>
      </div>

      {deleteModal && (
        <Modal close={() => setdeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar Concepto `}
            onAction={() => del!(accountTagData?.id, closeModal)}
            onCancel={() => setdeleteModal(false)}
            text={`¿Seguro que desea eliminar esta el Concepto  ${accountTagData?.name}?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </form>
  );
};

export default TagAccountForm;
