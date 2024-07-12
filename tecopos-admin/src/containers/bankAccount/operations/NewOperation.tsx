import { useForm, SubmitHandler } from "react-hook-form";
import { useAppSelector } from "../../../store/hooks";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import InlineRadio from "../../../components/forms/InlineRadio";
import { useContext } from "react";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import { useParams } from "react-router-dom";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";

const NewOperation = ({ closeModal }: { closeModal: Function }) => {
  const { handleSubmit, control } = useForm();
  const { bankAccount, isFetching, addAccountOperations } =
    useContext(DetailAccountContext);
  const { bankAccountId } = useParams();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    addAccountOperations!(bankAccountId!, data, closeModal);
  };

  const { business } = useAppSelector((state) => state.init);

  const currenciesSelector: string[] =
    business?.availableCurrencies
      .filter((item) =>
        !bankAccount?.allowMultiCurrency
          ? item.code === bankAccount?.definedCurrency
          : true
      )
      .map((elem) => elem.code) ?? [];

  //--------------------------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        <div>
          <AsyncComboBox
            name="accountTagId"
            dataQuery={{url:`/administration/bank/tag/${bankAccountId}`, defaultParams:{page:1} }}
            normalizeData={{id:"id", name:"name"}}
            label="Concepto"
            control={control} 
          />
        </div>

        <CurrencyAmountInput
          label="Monto *"
          currencies={["Moneda"].concat(currenciesSelector)}
          name="amount"
          control={control}
          placeholder="$0.00"
          rules={{
            required: "Escoja el monto y la moneda que desea transferir",
            validate:{
              amountGreaterThanZero: (value) => value.amount !== 0 || "Monto no debe ser 0",
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
            name="Registrar"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </div>
    </form>
  );
};

export default NewOperation;
