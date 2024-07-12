import { useContext, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../store/hooks";

import { toast } from "react-toastify";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import Button from "../../../components/misc/Button";
import Toggle from "../../../components/forms/Toggle";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { printPriceWithCommasAndPeriods } from "../../../utils/functions";

interface NewTransferProp {
  closeModal: Function;
}

const NewExchangeCurrency = ({ closeModal }: NewTransferProp) => {
  const { bankAccountId } = useParams();
  const { business } = useAppSelector((state) => state.init);
  const { handleSubmit, control, watch } = useForm();
  const { bankAccount, addExchangeCurrency, isFetching } =
    useContext(DetailAccountContext);

  const [transfer_toggle, setTransfer_toggle] = useState(false);

  const [buyOrSell, setBuyOrSell] = useState("toBuyCurrency");


  let currenciesToBuy: any = []
  if (business?.availableCurrencies) {
    currenciesToBuy = business.availableCurrencies.map((currency) => currency.code)
  }

  let array_currency: any = [];
  if (bankAccount?.allowMultiCurrency === true) {
    array_currency =
      business?.availableCurrencies.map((currency) => currency.code) ?? [];
  } else {
    array_currency.push(bankAccount?.definedCurrency);
  }
  //--------------------------------------------------------------------------------------------
  const amount = watch('amount')
  const amount_rate = watch('amount_rate')

  const totalAmount = () => {

    if (amount && amount_rate && typeof amount.amount === 'number' && typeof amount_rate.amount === 'number') {
      return amount.amount * amount_rate.amount
    } else {
      return 0
    }
  }

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    let newData = {};
    if (buyOrSell === "") {
      toast.error("Seleccione si es compra o venta.");
    } else {
      if (data.amount_rate.codeCurrency === data.amount.codeCurrency) {
        toast.error("Los tipos de monedas no pueden ser iguales");
      } else {
        if (data.amount.amount === 0 || data.amount_rate.amount === 0) {
          toast.error("El monto a convertir no puede ser igual a cero.");
        } else {
          if (
            data.amount.amount.length === 0 ||
            data.amount_rate.amount.length === 0
          ) {
            toast.error("Los montos de la operación son requeridos.");
          } else {
            if (data.other_account === true) {
              newData = {

                toBuyCodeCurrency: buyOrSell === "toBuyCurrency" ? data.amount.codeCurrency : data.amount_rate.codeCurrency,
                // toBuyCodeCurrency: data.amount.codeCurrency,

                toSellCodeCurrency: buyOrSell === "toBuyCurrency" ? data.amount_rate.codeCurrency : data.amount.codeCurrency,
                // toSellCodeCurrency: data.amount_rate.codeCurrency,


                amount: data.amount.amount,
                exchangeRate: data.amount_rate.amount,
                accountToId: data.accountToId,
                operation: buyOrSell === "toBuyCurrency" ? "buy" : "sell"
              };
            } else {
              newData = {

                toBuyCodeCurrency: buyOrSell === "toBuyCurrency" ? data.amount.codeCurrency : data.amount_rate.codeCurrency,
                // toBuyCodeCurrency: data.amount.codeCurrency,

                toSellCodeCurrency: buyOrSell === "toBuyCurrency" ? data.amount_rate.codeCurrency : data.amount.codeCurrency,
                // toSellCodeCurrency: data.amount_rate.codeCurrency,


                amount: data.amount.amount,
                exchangeRate: data.amount_rate.amount,
                operation: buyOrSell === "toBuyCurrency" ? "buy" : "sell"
              };
            }

            addExchangeCurrency!(bankAccountId!, newData, () => closeModal());
          }
        }
      }
    }

  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        <div className="flex w-full justify-center">
          <div className="flex w-full justify-between gap-x-2">
            <Button type="button" color={buyOrSell === "toBuyCurrency" ? "slate-600" : "slate-100 ring-1 ring-inset ring-gray-300 bg-white text-gray-900"} textColor={buyOrSell === "toBuyCurrency" ? "white" : "black"} name="Compra" full action={() => setBuyOrSell("toBuyCurrency")} />
            <Button type="button" color={buyOrSell === "toSellCurrency" ? "slate-600" : "slate-100 ring-1 ring-inset ring-gray-300 bg-white text-gray-900"} textColor={buyOrSell === "toSellCurrency" ? "white" : "black"} name="Venta" full action={() => setBuyOrSell("toSellCurrency")} />
          </div>
        </div>

        <div className="py-1">
          <CurrencyAmountInput
            label={buyOrSell === "toBuyCurrency" ? "Comprar *" : "Vender *"}
            currencies={['Moneda'].concat(currenciesToBuy)}
            name="amount"
            control={control}
            placeholder="$0.00"
            rules={{
              required: "Escoja el monto y la moneda que desea transferir",
              validate: {
                amountGreaterThanZero: (value) => value.amount > 0 || "Monto debe ser mayor a 0",
                validCurrency: (value) => value.codeCurrency !== "Moneda" || "Escoja una moneda"
              }
            }}
          />
        </div>

        <div className="py-1">
          <CurrencyAmountInput
            label="A (Tasa de cambio) *"
            currencies={['Moneda'].concat(array_currency)}
            name="amount_rate"
            control={control}
            placeholder="$0.00"
            rules={{
              required: "Escoja el monto y la moneda que desea transferir",
              validate: {
                amountGreaterThanZero: (value) => value.amount > 0 || "Monto debe ser mayor a 0",
                validCurrency: (value) => value.codeCurrency !== "Moneda" || "Escoja una moneda"
              }
            }}
          />
        </div>

        <div className="text-md text-base font-medium text-gray-900 mb-4">
          Total: {printPriceWithCommasAndPeriods(totalAmount())} {amount_rate && amount_rate.codeCurrency}
        </div>

        <div className="py-1">
          <Toggle
            name="other_account"
            control={control}
            defaultValue={false}
            changeState={setTransfer_toggle}
            title="Transferir a otra cuenta"
          />
        </div>

        {transfer_toggle && (
          <div className="pb-3">
            <AsyncComboBox
              dataQuery={{
                url: "/administration/bank/account",
                defaultParams: { page: 1 },
              }}
              normalizeData={{ id: "id", name: "name", disabled: [bankAccount!.id] }}
              name="accountToId"
              control={control}
              rules={{ required: "Campo requerido" }}
            />
          </div>
        )}

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

export default NewExchangeCurrency;