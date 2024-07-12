import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { BankAccountInterfaces } from "../../../interfaces/ServerInterfaces";

import Input from "../../../components/forms/Input";
import LoadingSpin from "../../../components/misc/LoadingSpin";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import ComboBox from "../../../components/forms/Combobox";
import Toggle from "../../../components/forms/Toggle";

interface NewBankAccountProp {
  loading: boolean;
  addBankAccount: Function;
  closeModal: Function;
}

const NewBankAccount = ({
  loading,
  addBankAccount,
  closeModal,
}: NewBankAccountProp) => {
  const { handleSubmit, control } = useForm();
  const { business } = useAppSelector((state) => state.init);

  const [allowMultiCurrency_toggle, setAllowMultiCurrency_toggle] =
    useState(true);

  const selectDataCodeCurrency: SelectInterface[] =
    business!.availableCurrencies.map((itm) => ({
      id: itm.code,
      name: itm.code,
    }));

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    addBankAccount(data, closeModal);
  };

  //--------------------------------------------------------------------------------------------

  return (
    <div className="md:grid-cols-3 md:grid  md:gap-6">
      <div className="md:col-span-1">
        <div className="px-4 sm:px-0">
          <h3 className="text-lg font-medium leading-6 text-slate-900">
            Nueva Cuenta
          </h3>
          <p className="mt-1 text-sm text-slate-600 text-justify">
            Registrar una Cuenta le permitirá tener el control sobre sus
            Operaciones y Conceptos.
          </p>
        </div>
      </div>
      <div className="md:col-span-2 mt-5 md:mt-0 ">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="shadow sm:rounded-md sm:overflow-visible">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                  <Input
                    label="Nombre *"
                    name="name"
                    control={control}
                    placeholder="Nombre de la Cuenta"
                    rules={{
                      required: "Este campo es requerido",
                    }}
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
                  />
                </div>
              </div>
              <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
                <TextArea
                  label="Descripción"
                  name="description"
                  placeholder="Descripción de la Cuenta"
                  control={control}
                />
              </div>
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6">
                  <Toggle
                    name="allowMultiCurrency"
                    control={control}
                    defaultValue={true}
                    title="Permitir múltiples monedas"
                    changeState={setAllowMultiCurrency_toggle}
                  />
                </div>
              </div>

              {allowMultiCurrency_toggle === false && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <ComboBox
                      name="definedCurrency"
                      data={selectDataCodeCurrency}
                      label="Código de moneda predefinida *"
                      control={control}
                      rules={{ required: "Este campo es requerido" }}
                    />
                  </div>
                </div>
              )}

              <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
                <Button
                  color="slate-600"
                  type="submit"
                  name="Registrar"
                  loading={loading}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBankAccount;
