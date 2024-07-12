import React, { useContext, useEffect} from "react";
import Button from "../../../../../components/misc/Button";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../../store/hooks";
import Select from "../../../../../components/forms/Select";
import useServerBusiness from "../../../../../api/useServerBusiness";
import TextArea from "../../../../../components/forms/TextArea";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import ComboBox from "../../../../../components/forms/Combobox";
import { translatePaymetMethods } from "../../../../../utils/translate";
import { PrepaidContext } from "../../AllPrepaidList";
import InputPrefix from "../../../../../components/forms/InputPrefix";
import moment from "moment";

export const PaymentsPrepaidStep = () => {
  const { getAllPaymentGateways } = useServerBusiness();

  //const { isFetching } = useServerBilling();
  const { business } = useAppSelector((store) => store.init);
  const { control, setCurrentStep, isFetching, watch } =
    useContext(PrepaidContext);

  const currencies =
    business?.availableCurrencies.map((curr) => {
      return curr.code;
    }) ?? [];

  const paymentMethods: SelectInterface[] =
    business?.configurationsKey
      .find((itm) => itm.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((elem) => ({ id: elem, name: translatePaymetMethods(elem) })) ?? [];
  const { areas } = useAppSelector((state) => state.nomenclator);

  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  useEffect(() => {
    getAllPaymentGateways();
  }, []);

  return (
    <div className="px-8">
      <div className="min-h-[25rem]">
        <div className="grid grid-cols-5 gap-x-4 py-2 items-center">
          <div className="grid items-center">
            {/* <div>
            <Button
              icon={<PlusIcon width={20} />}
              textColor='black'
              name='Añadir'
              color='gray-200'
              action={() => append({})}
            />
          </div> */}
          </div>
        </div>
        {/* payments */}
        <div className="flex flex-col pt-2 gap-2 items-start ">
          <>
            <div className="grid w-full grid-cols-2 gap-4">
              <div className="grid items-start mt-2">
                <CurrencyAmountInput
                  label="Monto (*) "
                  currencies={currencies}
                  name={`registeredPayments`}
                  control={control}
                  placeholder="$0.00"
                  rules={{
                    required: "Escoja el monto y la moneda que desea ingresar",
                    validate: {
                      amountGreaterThanZero: (value) =>
                        value.amount > 0 || "Monto debe ser mayor a 0",
                      validCurrency: (value) =>
                        value.codeCurrency !== "Moneda" || "Escoja una moneda",
                    },
                  }}
                />
              </div>

              <div className="grid items-start py-2">
                <Select
                  className=""
                  name={`paymentWay`}
                  data={paymentMethods}
                  label="Método de pago"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                />
              </div>

              {
                //@ts-ignore
                watch("paymentWay") === "CASH" && (
                  <div className=" col-span-2">
                    <InputPrefix
                      label="Registro de caja"
                      name="operationNumber"
                      prefix={`RC-${moment().year()}/`}
                      control={control}
                    />
                  </div>
                )
              }

              {/* <div className="col-span-2 mt-1">
                <AsyncComboBox
                  label="Cobrador/a"
                  dataQuery={{
                    url: "/security/users",
                    defaultParams: {
                      isActive: true,
                    },
                  }}
                  normalizeData={{ id: "id", name: "username" }}
                  name="madeById"
                  control={control}
                />
              </div> */}

              <div className="flex flex-col w-full col-span-2">
                <ComboBox
                  data={salesAreas}
                  name="areaId"
                  label="Punto de venta (*)"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                />
              </div>
            </div>
          </>
          <div className="grid w-full py-2">
            <TextArea
              label="Observaciones"
              name="description"
              control={control}
            />
          </div>
        </div>
      </div>
      <footer className="flex gap-x-3 w-full mt-2 ">
        <Button
          name="Atrás"
          color="white"
          textColor="blue-800"
          outline
          type="button"
          action={() => setCurrentStep!(0)}
          disabled={isFetching}
          full
        />

        <Button
          name="Registrar"
          color="slate-700"
          type="submit"
          //action={onSubmit}
          full
          loading={isFetching}
          disabled={isFetching}
        />
      </footer>
    </div>
  );
};
