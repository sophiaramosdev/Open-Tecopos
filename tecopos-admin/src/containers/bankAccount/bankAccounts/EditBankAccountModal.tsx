import { useState, useContext } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { TrashIcon } from "@heroicons/react/24/outline";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import ComboBox from "../../../components/forms/Combobox";
import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import { DetailAccountContext } from "./MainBankAccount";
import { useNavigate, useParams } from "react-router-dom";

const EditBankAccountModal = () => {
  const { bankAccount, deleteBankAccount, updateBankAccount, isFetching } = useContext(DetailAccountContext);
  const { business } = useAppSelector((state) => state.init);
  const { bankAccountId } = useParams();
  const navigate = useNavigate();

  const { handleSubmit, control, watch, formState } = useForm();
  const {isSubmitting} = formState;
  const [deleteModal, setdeleteModal] = useState(false); //Modal de eliminar Cuenta bancaria

  const onSubmit: SubmitHandler<Record<string, string>> = async(data) => {
    await updateBankAccount!(bankAccountId!, data);
  };

  const selectDataCodeCurrency: SelectInterface[] = [];

  business?.availableCurrencies.forEach((item) => {
    selectDataCodeCurrency.push({
      id: item.code,
      name: item.code,
      disabled: false,
    });
  });

  //--------------------------------------------------------------------------------------------

  return (
    <>
      {deleteModal && (
        <Modal close={() => setdeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar Cuenta: ${bankAccount?.name} `}
            onAction={() =>
              deleteBankAccount!(bankAccount!.id, () =>
                navigate("/bank_accounts")
              )
            }
            onCancel={() => setdeleteModal(false)}
            text="¿Seguro que desea eliminar esta cuenta?"
            loading={isFetching}
          />
        </Modal>
      )}

      <div className="md:col-span-2 mt-5 md:mt-0 ">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="shadow sm:rounded-md sm:overflow-visible">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <div className="grid grid-cols-6 gap-6">
                <div className="flow-root col-span-6">
                  <button
                    onClick={() => setdeleteModal(true)}
                    type="button"
                    className="float-right inline-flex items-center rounded-md border border-red-500  bg-red-50 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-50 focus:ring-offset-2"
                  >
                    <TrashIcon className="h-5 text-red-900" />
                  </button>
                </div>
                <div className="col-span-6">
                  <Input
                    label="Nombre *"
                    name="name"
                    control={control}
                    placeholder="Nombre de la Cuenta"
                    defaultValue={bankAccount?.name}
                  />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                  <Input
                    label="Código"
                    name="code"
                    control={control}
                    placeholder="Código de la Cuenta"
                    defaultValue={bankAccount?.code}
                  />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-3">
                  <Toggle
                    name="isBlocked"
                    control={control}
                    defaultValue={bankAccount?.isBlocked}
                    title="Bloqueada"
                  />
                </div>
                <div className="col-span-3">
                  <Toggle
                    name="isPrivate"
                    control={control}
                    defaultValue={bankAccount?.isPrivate}
                    title="Privada"
                  />
                </div>
              </div>

              <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
                <TextArea
                  label="Descripción"
                  name="description"
                  placeholder="Descripción de la Cuenta"
                  defaultValue={bankAccount?.description}
                  control={control}
                />
              </div>

              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                  <Toggle
                    name="allowMultiCurrency"
                    control={control}
                    defaultValue={bankAccount?.allowMultiCurrency}
                    title="Permitir múltiples monedas"
                  />
                </div>
              </div>

              {!(
                watch("allowMultiCurrency") ?? bankAccount?.allowMultiCurrency
              ) && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <ComboBox
                      name="definedCurrency"
                      data={selectDataCodeCurrency}
                      label="Código de moneda predefinida *"
                      control={control}
                      rules={{ required: "Este campo es requerido" }}
                      defaultValue={bankAccount?.definedCurrency}
                    />
                  </div>
                </div>
              )}

              <div className="flow-root  pt-6 pb-4 px-4 py-3 bg-slate-50 sm:px-6">
                <div className="float-right">
                  <Button
                    color="slate-600"
                    type="submit"
                    name="Actualizar"
                    loading={isFetching&&isSubmitting}
                    disabled={isFetching}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditBankAccountModal;
