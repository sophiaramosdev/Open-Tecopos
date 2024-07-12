import { useContext, useState } from "react";
import {
  useFieldArray,
  useForm,
} from "react-hook-form";

import PartialList from "./PartialList";
import { useAppSelector } from "../../../../store/hooks";
import { OnlineOrderContext } from "../OnlineOrderDetailContainer";
import useServerEcoCycle from "../../../../api/useServerEconomicCycle";
import useServer from "../../../../api/useServerMain";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { translatePaymetMethods } from "../../../../utils/translate";
import { OrderInterface, PriceInvoiceInterface } from "../../../../interfaces/ServerInterfaces";
import { cleanObj, formatCurrency } from "../../../../utils/helpers";
import ComboBox from "../../../../components/forms/Combobox";
import Button from "../../../../components/misc/Button";
import AmountCurrencyInput from "../../../../components/forms/AmountCurrencyInput";
import Select from "../../../../components/forms/Select";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Toggle from "../../../../components/forms/Toggle";
import Modal from "../../../../components/misc/GenericModal";

export interface PrepaidReduced {
  paymentId: number;
  amount: number;
  codeCurrency: string;
  payment: number;
}
interface PaymentInterface {
  closeModal: Function;
}

const PaymentContainer = ({
  closeModal,  
}: PaymentInterface) => {
  const { trigger, getValues, control, watch } = useForm();
  const { append, remove, fields } = useFieldArray<any>({
    name: "registeredPayments",
    control,
  });
  const { business } = useAppSelector((state) => state.init);
  const { order, updateSingleOrderState, updListState } = useContext(OnlineOrderContext);
  const { registerOrderPayment, isFetching } = useServerEcoCycle();
  const { calculatePaymentDiff } = useServer();
  const { areas } = useAppSelector((state) => state.nomenclator);

  const [prepaidView, setPrepaidView] = useState(false);

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
    updateSingleOrderState!(order);
    updListState!(order)
    remove();
    closeModal();
  };
  //-----------------------------------------------------------------------

  //Submit ----------------------------------------------------------------
  const submitAction = async () => {
    if (await trigger()) {
      let data = getValues();
      if (negativeDiff) {
        data.isPartialPay = true;
      }
      if (!!data.prepaidPayment && data.prepaidPayment.length !== 0) {
        data.prepaidPaymentIds = data.prepaidPayment.map(
          (item: any) => item.paymentId
        );
      }

      delete data.prepaidPayment;

      data = cleanObj(data);

      registerOrderPayment(order!.id, data, updateOrderState);
    }
  };
  //----------------------------------------------------------------------

  const paymentField =
    watch("registeredPayments")?.map((item: Record<string, any>) => ({
      amount: item.amount ?? 0,
      codeCurrency: item.codeCurrency,
    })) ?? [];

  const prepaidAmounts: PriceInvoiceInterface[] =
    watch("prepaidPayment")?.map((item: PrepaidReduced) => ({
      amount: item.amount,
      codeCurrency: item.codeCurrency,
    })) ?? [];

  const difference = calculatePaymentDiff(order?.totalToPay, [
    ...paymentField,
    ...(order?.partialPayments ?? []),
    ...prepaidAmounts,
  ]);

  const negativeDiff = difference.some((itm) => itm.amount < 0);

  return (
    <form>
      <div className="h-full">
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            <ComboBox
              data={salesAreas}
              name="areaId"
              label="Punto de venta"
              control={control}
            />
            <div className="flex w-full items-end">
              <Button
                name="Pagos anticipados"
                color="slate-600"
                textColor="slate-600"
                action={() => setPrepaidView(true)}
                outline
                full
              />
            </div>
          </div>
          <div className="h-64 mt-2 border border-gray-400 p-5 pt-1 rounded-md overflow-scroll scrollbar-none scrollbar-thumb-slate-100">
            {/*Pagos parciales */}
            {order?.partialPayments.map((partial) => (
              <>
                <div className="grid grid-cols-2 gap-5 w-full pr-16">
                  <div className="flex flex-col w-full">
                    <h3 className="text-sm font-semibold text-gray-600">
                      Monto
                    </h3>
                    <div className="flex justify-between border border-gray-500 p-2 rounded-md">
                      <p className="pl-1 text-sm text-gray-600">
                        {partial.amount}
                      </p>
                      <p className="pr-3 text-sm text-gray-600">
                        {partial.codeCurrency}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col w-full">
                    <h3 className="text-sm font-semibold text-gray-600">
                      Método de pago
                    </h3>
                    <div className="border border-gray-500 p-2 rounded-md">
                      <p className="pl-1 text-sm text-gray-600">
                        {translatePaymetMethods(partial.paymentWay)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ))}

            {/**Pagos actuales */}
            {fields.map((field:any, idx) => (
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
                    defaultValue={field.paymentWay}
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
            }
          </div>
          {/**Resume -------------- */}
          <div className="my-2 border border-gray-400 p-5 rounded-md grid grid-cols-2 gap-x-8">
            <div className="flex flex-col gap-y-1">
              {/*
              <Toggle name="house" title="Consumo casa" control={control} />
              {!watch("house") && (
                <>
                  <AsyncComboBox
                    label="Cupón"
                    name="coupon"
                    control={control}
                    dataQuery={{ url: "/administration/marketing/coupon" }}
                    normalizeData={{ id: "id", name: "code" }}
                  />
                  <Input
                    name="discount"
                    label="Descuento"
                    control={control}
                    type="number"
                  />

                  <Input
                    name="comission"
                    label="Comisión"
                    control={control}
                    type="number"
                  />
                </>
              )}
              */}

              {/**Subtotal */}
              <div className="flex gap-5">
                <h3 className="text-gray-700 font-semibold text-center">
                  Subtotal:
                </h3>{" "}
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

              {/**Anticipo */}
              <div className="flex gap-5">
                <h3 className="text-gray-700 font-semibold text-center">
                  Anticipo:
                </h3>{" "}
                <span className="flex flex-col">
                  {prepaidAmounts.length !== 0 ? (
                    prepaidAmounts.map((itm, idx) => (
                      <p className="text-md text-center" key={idx}>
                        {formatCurrency(itm.amount, itm.codeCurrency)}
                      </p>
                    ))
                  ) : (
                    <p className="text-md text-center">0,00</p>
                  )}
                </span>
              </div>
            </div>

            <div
              className={`flex flex-col gap-y-${
                /*!watch("house") ? "10" : "2"*/ "1"
              }`}
            >
              {/**Total */}
              <div className="flex gap-5">
                <h3 className="text-gray-700 font-semibold text-center">
                  Total a pagar:
                </h3>{" "}
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

              {/**Cambio */}
              <div className="flex gap-5">
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
        </div>
      </div>

      <div className="inline-flex justify-between w-full mt-5">
        <Toggle
          name="sendEmail"
          control={control}
          title="Notificar por correo"
        />
        <div className="inline-flex gap-3 justify-end pt-2 items-center">
          <Button
            name={`${
              negativeDiff ? "Registrar pago parcial" : "Pagar factura"
            }`}
            color="slate-600"
            action={() => submitAction()}
            loading={isFetching}
            disabled={
              isFetching || (fields.length === 0 && prepaidAmounts.length === 0)
            }
          />

          <Button
            name="Cancelar"
            color="slate-600"
            textColor="slate-600"
            action={() => closeModal()}
            outline
          />
        </div>
      </div>
      {prepaidView && <Modal state={prepaidView} close={setPrepaidView}>
      <PartialList setPartialView={setPrepaidView} control={control} />
        </Modal>}
    </form>
  );
};

export default PaymentContainer;
