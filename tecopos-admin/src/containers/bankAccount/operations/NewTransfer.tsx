import { useForm, SubmitHandler, UseFormWatch } from "react-hook-form";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useAppSelector } from "../../../store/hooks";

import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import TextArea from "../../../components/forms/TextArea";
import ComboBox from "../../../components/forms/Combobox";

import InlineRadio from "../../../components/forms/InlineRadio";
import {
  Amount,
  BankAccountInterfaces,
} from "../../../interfaces/ServerInterfaces";
import InputMaskComponent from "../../../components/forms/InputMask";
import { useContext, useState } from "react";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import Button from "../../../components/misc/Button";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";

interface NewTransferProp {
  closeModal: Function;
}

const NewTransfer = ({
  closeModal,
}: NewTransferProp) => {
  const { bankAccountId } = useParams();
  const { business } = useAppSelector((state) => state.init);
  const { handleSubmit, control, watch, getValues } = useForm({
    mode: "onBlur",
  });
  const { bankAccount, addAccountTransfer, isFetching } = useContext(DetailAccountContext);

  const [submitModal, setSubmitModal] = useState(false); //Modal de Notificar si va a realizar la transferencia

  const watchTypeTransfer = watch("typeTransfer");
  const watchSelectAccount = watch("accountToId");

  const submitActionTransfer = () => {
    let newData = {};
    const data = getValues();

    watchTypeTransfer === "internal"
      ? (newData = {
        accountToId: data.accountToId,
        accountTagId: data.accountTagId,
        amount: data.amount,
        description: data.description,
      })
      : (newData = {
        address: data.address.replaceAll("-", ""),
        accountTagId: data.accountTagId,
        amount: data.amount,
        description: data.description,
      });

    addAccountTransfer!(bankAccountId!, newData, closeModal);

  };

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    const balance_currency = bankAccount?.actualBalance.find(
      (item) => item.codeCurrency === data.amount.codeCurrency
    );

    if (!balance_currency) {
      toast.error(`La cuenta no tiene fondos en ${data.amount.codeCurrency}`);
    } else {
      if (data.amount.amount > balance_currency.amount) {
        toast.error(
          `La cuenta no tiene saldo suficiente en ${data.amount.codeCurrency}`
        );
      } else {
        setSubmitModal(true);
      }
    }
  };

  const RadioValues = [
    {
      label: "Interna",
      value: "internal",
    },
    {
      label: "Externa",
      value: "external",
    },
  ];

  let array_currency: any = [];
  if (bankAccount?.allowMultiCurrency === true) {
    array_currency =
      business?.availableCurrencies.map((currency) => currency.code) ?? [];
  } else {
    array_currency.push(bankAccount?.definedCurrency);
  }
  //--------------------------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        <div>
          <InlineRadio
            name="typeTransfer"
            data={RadioValues}
            control={control}
            rules={{ required: "Este campo es requerido" }}
          />
        </div>
        {watchTypeTransfer === "internal" && (
          <div className="pb-3">
            <AsyncComboBox
              name="accountToId"
              dataQuery={{ url: "/administration/bank/business/account", defaultParams: { page: 1 } }}
              normalizeData={{ id: "id", name: "name", disabled: [Number(bankAccountId)] }}
              label="Cuenta *"
              control={control}
              defaultValue={watchSelectAccount}
              rules={{ required: "Este campo es requerido" }}
            />
          </div>
        )}

        {watchTypeTransfer === "external" && (
          <div className="pb-2">
            <InputMaskComponent
              label="No. cuenta *"
              name="address"
              mask="9999-9999-9999"
              control={control}
              rules={{
                required: "Este campo es requerido",
                validate: (value: string) =>
                  (value.match(/[0-9]/g) ?? []).length === 12 ||
                  "El numero de cuenta debe tener 12 dígitos",
              }}
            />
          </div>
        )}

        <div className="py-2">
          <AsyncComboBox
            name="accountTagId"
            dataQuery={{ url: `/administration/bank/tag/${bankAccountId}`, defaultParams: { page: 1 } }}
            normalizeData={{ id: "id", name: "name" }}
            label="Concepto"
            control={control}
          />
        </div>

        <CurrencyAmountInput
          label="Monto *"
          currencies={['Moneda'].concat(array_currency)}
          name="amount"
          control={control}
          placeholder="$0.00"
          rules={{
            required: "Escoja el monto y la moneda que desea transferir",
            validate:{
              amountGreaterThanZero: (value) => value.amount > 0 || "Monto debe ser mayor a 0",
              validCurrency: (value) => value.codeCurrency !== "Moneda" || "Escoja una moneda"
            } 
          }}
        />

        <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
          <TextArea label="Descripción" name="description" control={control} />
        </div>
        <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
          <Button
            color="slate-600"
            type="submit"
            name="Transferir"
          />
        </div>
      </div>

      {submitModal && (
        <Modal close={setSubmitModal} state={submitModal}>
          <AlertContainer
            title={`¡Transferencia entre Cuentas!`}
            onAction={() => submitActionTransfer()}
            onCancel={() => setSubmitModal(false)}
            text={`¿Seguro que desea hacer la transferencia?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </form>
  );
};

export default NewTransfer;
