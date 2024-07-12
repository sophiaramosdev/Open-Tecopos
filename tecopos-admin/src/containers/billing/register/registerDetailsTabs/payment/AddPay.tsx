import { SubmitHandler, useForm } from "react-hook-form";
import InputPrefix from "../../../../../components/forms/InputPrefix";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import Select from "../../../../../components/forms/Select";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import TextArea from "../../../../../components/forms/TextArea";
import moment from "moment";
import { useAppSelector } from "../../../../../store/hooks";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { translatePaymetMethods } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import { useEffect } from "react";

interface Props {
  close: Function;
  action: Function;
  defaultPaymentMethod?: string;
  defaultPaymentCurrency?: string;
}
export const AddPay = ({
  close,
  action,
  defaultPaymentMethod,
  defaultPaymentCurrency,
}: Props) => {
  // Hooks
  const { handleSubmit, control, watch, trigger, clearErrors } = useForm();

  const { business } = useAppSelector((state) => state.init);

  const currenciesSelector: string[] = [];
  business?.availableCurrencies.forEach((itm) => {
    currenciesSelector.push(itm.code);
  });

  const paymentMethods: SelectInterface[] =
    business?.configurationsKey
      .find((itm) => itm.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((elem) => ({ id: elem, name: translatePaymetMethods(elem) })) ?? [];

  const onSubmitPay: SubmitHandler<Record<string, any>> = async () => {
    if (!(await trigger())) return;
    const registeredPaymentsFrom = watch("registeredPayments");
    const paymentWay = watch("paymentWay");
    const operationNumber = watch("operationNumber");
    const observations = watch("observations");
    //data.registeredPayments.paymentWay = data?.paymentWay

    const registeredPayments = {
      amount: registeredPaymentsFrom.amount,
      codeCurrency: registeredPaymentsFrom.codeCurrency,
      paymentWay,
      operationNumber,
      observations,
    };
    action(registeredPayments);
    close();
  };

  useEffect(() => {
    clearErrors();
  }, [watch("registeredPayments"), watch("paymentWay")]);

  const paymentWay = watch("paymentWay") ?? paymentMethods[0].id;
  return (
    <>
      <form className="px-8" onSubmit={handleSubmit(onSubmitPay)} id="payFrom">
        <div className="">
          {/* payments */}
          <div className="flex flex-col pt-2 gap-2 items-start ">
            <>
              <div className="grid w-full grid-cols-2 gap-4">
                <div className="grid mt-2">
                  <CurrencyAmountInput
                    label="Monto (*) "
                    currencies={currenciesSelector}
                    name={`registeredPayments`}
                    control={control}
                    defaultCurrency={
                      defaultPaymentCurrency ?? business?.mainCurrency
                    }
                    placeholder="$0.00"
                    rules={{
                      required:
                        "Escoja el monto y la moneda que desea ingresar",
                      validate: {
                        amountGreaterThanZero: (value) =>
                          value.amount > 0 || "Monto debe ser mayor a 0",
                        validCurrency: (value) =>
                          value.codeCurrency !== "Moneda" ||
                          "Escoja una moneda",
                      },
                    }}
                  />
                </div>

                <div className="grid items-start py-2">
                  <Select
                    className=""
                    name={`paymentWay`}
                    data={paymentMethods}
                    defaultValue={defaultPaymentMethod ?? paymentMethods[0].id}
                    label="Método de pago"
                    control={control}
                    rules={{ required: "* Requerido" }}
                  />
                </div>

                {paymentWay === "CASH" && (
                  <div className=" col-span-full">
                    <InputPrefix
                      label="Registro de caja"
                      name="operationNumber"
                      prefix={`RC-${moment().year()}/`}
                      control={control}
                    />
                  </div>
                )}

                <div className="col-span-full">
                  <TextArea
                    label="Observaciones"
                    name="observations"
                    control={control}
                  />
                </div>
              </div>
            </>
          </div>
          <footer className="flex w-full gap-x-3 mt-5 ">
            <Button
              name="Cancelar"
              color="white"
              textColor="blue-800"
              outline
              //type="submit"
              action={() => close()}
              full
            />

            <Button
              name="Agregar"
              color="slate-700"
              type="button"
              action={onSubmitPay}
              full
            />
          </footer>
        </div>
      </form>
    </>
  );
};
