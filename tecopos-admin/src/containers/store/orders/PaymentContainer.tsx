import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  OrderInterface,
  PriceInvoiceInterface,
} from "../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../store/hooks";
import Button from "../../../components/misc/Button";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Select from "../../../components/forms/Select";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import AmountCurrencyInput from "../../../components/forms/AmountCurrencyInput";
import useServerEcoCycle from "../../../api/useServerEconomicCycle";
import { formatCurrency } from "../../../utils/helpers";
import useServer from "../../../api/useServerMain";
import { translatePaymetMethods } from "../../../utils/translate";
import Toggle from "../../../components/forms/Toggle";
import ComboBox from "../../../components/forms/Combobox";

interface PaymentInterface {
  order: OrderInterface | null;
  updState: (order: OrderInterface) => void;
  closeModal: Function;
}

const PaymentContainer = ({
  order,
  updState,
  closeModal,
}: PaymentInterface) => {
  const { trigger, getValues, control, watch } = useForm({
    mode: "onChange",
  });
  const { append, remove, fields, replace } = useFieldArray<any>({
    name: "registeredPayments",
    control,
  });
  const { business } = useAppSelector((state) => state.init);
  const { registerOrderPayment, isFetching } = useServerEcoCycle();
  const { cancelOrderPayment, isFetching: fetchingCancel } =
    useServerEcoCycle();
  const { calculatePaymentDiff } = useServer();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { availableCurrencies, costCurrency: mainCurrency } = useAppSelector(
    (state) => state.init.business!
  );


  useEffect(() => {
    if (order?.currenciesPayment.length !== 0) {
      replace(order!.currenciesPayment);
    } else {
      append({
        amount: undefined,
        codeCurrency: business?.costCurrency,
        paymentWay: undefined,
      });
    }
  }, []);

  //Selectors ----------------------------------------------------------
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  const paymentMethods: SelectInterface[] =
    business?.configurationsKey
      .find((itm) => itm.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((elem) => ({ id: elem, name: translatePaymetMethods(elem) })) ?? [];

  const updateOrderState = (order: OrderInterface) => {
    updState(order);
    remove();
    closeModal();
  };
  //-----------------------------------------------------------------------

  //Submit ----------------------------------------------------------------
  const submitAction = async () => {
    if (await trigger()) {
      const data = getValues();
      const currenciesPayment: (PriceInvoiceInterface & {
        paymentWay: string;
      })[] = [];
      data.registeredPayments.forEach(
        (
          elem: PriceInvoiceInterface & {
            paymentWay: string;
          }
        ) => {
          const idx = currenciesPayment.findIndex(
            (itm) =>
              itm.codeCurrency === elem.codeCurrency &&
              itm.paymentWay === elem.paymentWay
          );
          if (idx !== -1) {
            currenciesPayment.splice(idx, 1, {
              ...currenciesPayment[idx],
              amount: elem.amount + currenciesPayment[idx].amount,
            });
          } else {
            currenciesPayment.push(elem);
          }
        }
      );
      data.registeredPayments = currenciesPayment;

      const diffCalculated = difference.reduce((total, item) => {
        const exchange =
          item.codeCurrency === mainCurrency
            ? item.amount
            : item.amount *
              availableCurrencies.find(
                (currency) => currency.code === item.codeCurrency
              )!.exchangeRate;
        return total + exchange;
      }, 0);
      data.amountReturned = {
        amount: diffCalculated,
        codeCurrency: mainCurrency,
      };
      registerOrderPayment(order!.id, data, updateOrderState);
    }
  };
  //----------------------------------------------------------------------

  const totalPaymentRegistered: (PriceInvoiceInterface & {
    paymentWay: string;
  })[] = [];
  order?.currenciesPayment.forEach((itm) => {
    const idx = totalPaymentRegistered.findIndex(
      (elem) => elem.codeCurrency === itm.codeCurrency
    );
    if (idx !== -1) {
      const current = totalPaymentRegistered[idx];
      totalPaymentRegistered.splice(idx, 1, {
        ...current,
        amount: itm.amount + current.amount,
      });
    } else {
      totalPaymentRegistered.push(itm);
    }
  });

  const paymentField =
    fields.length !== 0
      ? watch("registeredPayments")?.map((item: Record<string, any>) => ({
          amount: item.amount ?? 0,
          codeCurrency: item.codeCurrency,
        }))
      : order?.currenciesPayment;

  const difference = calculatePaymentDiff(order?.totalToPay!, paymentField);

  const negativeDiff = difference.some((itm) => itm.amount < 0);

  return (
    <form>
      <h3 className="font-semibold text-lg text-gray-600 mt-4 ">
        Registro de pago
      </h3>
      <div className="h-full">
        {
          /*fields.length !== 0 ? (*/
          <div className="mt-3">
            <div className="flex flex-col w-1/2">
              <Toggle
                name="includeInArea"
                control={control}
                title="Incluir en caja"
              />
              {watch("includeInArea") && (
                <ComboBox
                  data={salesAreas}
                  name="areaId"
                  label="Punto de venta"
                  control={control}
                />
              )}
            </div>
            <div className="h-96 mt-3 border border-gray-400 p-5 rounded-md overflow-ellipsis scrollbar-thin scrollbar-thumb-slate-100">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="inline-flex gap-2 w-full items-center"
                >
                  <div className="grid grid-cols-2 gap-5 w-full">
                    <AmountCurrencyInput
                      name={`registeredPayments.${idx}`}
                      currencies={currenciesSelector}
                      control={control}
                      label="Monto"
                      rules={{
                        validate: {
                          notUndef: (value) => !!value.amount || "* Requerido",
                        },
                      }}
                    />
                    <Select
                      className="py-2"
                      name={`registeredPayments.${idx}.paymentWay`}
                      data={paymentMethods}
                      label="Método de pago"
                      control={control}
                      rules={{ required: "* Requerido" }}
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      color="red-500"
                      textColor="red-500"
                      outline
                      icon={<TrashIcon className="h-5" />}
                      action={() => remove(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3">
              {
                /*order?.currenciesPayment.length === 0 ? (*/
                <Button
                  icon={<PlusIcon className="h-5" />}
                  name="Nuevo pago"
                  color="gray-400"
                  textColor="slate-600"
                  action={() =>
                    append({
                      amount: undefined,
                      codeCurrency: business?.costCurrency,
                      paymentWay: undefined,
                    })
                  }
                  full
                  outline
                />
                /*) : (
          <Button
            icon={<XMarkIcon className="h-5" />}
            name="Eliminar registro"
            color="gray-400"
            textColor="slate-600"
            action={() => cancelOrderPayment(order!.id, updateOrderState)}
            full
            outline
            loading={fetchingCancel}
            disabled={fetchingCancel}
          />
        )*/
              }
            </div>

            <div className="my-2 border border-gray-400 p-5 rounded-md grid grid-cols-2">
              <div className="flex flex-col gap-0">
                <p className="text-gray-700 font-semibold text-center">
                  Total a pagar:
                </p>{" "}
                <span className="flex flex-col">
                  {order?.totalToPay.reduce(
                    (total, itm) => total + itm.amount,
                    0
                  ) !== 0 ? (
                    order?.totalToPay.map((itm, idx) => (
                      <p className="text-md text-center" key={idx}>
                        {formatCurrency(itm.amount, itm.codeCurrency)}
                      </p>
                    ))
                  ) : (
                    <p className="text-md text-center">0,00</p>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-0">
                <p className="text-gray-700 font-semibold text-center">
                  Cambio:
                </p>{" "}
                <span className="flex flex-col">
                  {difference.length !== 0 ? (
                    difference.map((itm, idx) => (
                      <p
                        className={`text-md text-center ${
                          itm.amount >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                        key={idx}
                      >
                        {formatCurrency(itm.amount, itm.codeCurrency)}
                      </p>
                    ))
                  ) : (
                    <p className="text-md text-center">0,00</p>
                  )}
                </span>
              </div>
            </div>
          </div>
          /*) : (
          <div className="h-80 flex flex-col items-center gap-1 border border-gray-400 p-5 rounded-md mt-3">
            <div className="flex flex-col gap-0">
              <p className="text-gray-700 font-semibold text-center">
                Total registrado:
              </p>{" "}
              <span className="flex flex-col">
                {totalPaymentRegistered.reduce(
                  (total, itm) => total + itm.amount,
                  0
                ) !== 0 ? (
                  totalPaymentRegistered.map((itm, idx) => (
                    <p className="text-md text-center" key={idx}>
                      {formatCurrency(itm.amount, itm.codeCurrency)}
                    </p>
                  ))
                ) : (
                  <p className="text-md text-center">0,00</p>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-0">
              <p className="text-gray-700 font-semibold text-center">
                Total a pagar:
              </p>{" "}
              <span className="flex flex-col">
                {order?.totalToPay.reduce(
                  (total, itm) => total + itm.amount,
                  0
                ) !== 0 ? (
                  order?.totalToPay.map((itm, idx) => (
                    <p className="text-md text-center" key={idx}>
                      {formatCurrency(itm.amount, itm.codeCurrency)}
                    </p>
                  ))
                ) : (
                  <p className="text-md text-center">0,00</p>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-0">
              <p className="text-gray-700 font-semibold text-center">
                Diferencia:
              </p>{" "}
              <span className="flex flex-col">
                {difference.length !== 0 ? (
                  difference.map((itm, idx) => (
                    <p
                      className={`text-md text-center ${
                        itm.amount >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                      key={idx}
                    >
                      {formatCurrency(itm.amount, itm.codeCurrency)}
                    </p>
                  ))
                ) : (
                  <p className="text-md text-center">0,00</p>
                )}
              </span>
            </div>
          </div>
                )*/
        }
      </div>

      <div className="inline-flex gap-3 justify-end pt-5 w-full">
        {fields.length !== 0 && (
          <Button
            name="Registrar"
            color="slate-600"
            action={() => submitAction()}
            loading={isFetching}
            disabled={isFetching || negativeDiff}
          />
        )}
        <Button
          name="Cancelar"
          color="slate-600"
          textColor="slate-600"
          action={() => closeModal()}
          outline
        />
      </div>
    </form>
  );
};

export default PaymentContainer;
