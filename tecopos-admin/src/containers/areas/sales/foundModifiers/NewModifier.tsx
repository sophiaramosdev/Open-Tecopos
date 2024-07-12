import { useContext, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  AreasInterface,
  BankAccountTagInterfaces,
  FundDestinationInterface,
} from "../../../../interfaces/ServerInterfaces";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import ComboBox from "../../../../components/forms/Combobox";
import Button from "../../../../components/misc/Button";
import { translatePaymetMethods } from "../../../../utils/translate";
import Toggle from "../../../../components/forms/Toggle";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { cleanObj } from "../../../../utils/helpers";
import Input from "../../../../components/forms/Input";
import Select from "../../../../components/forms/Select";
import TextArea from "../../../../components/forms/TextArea";
import { ContextModifier } from "../InvoiceModifiers";
import AmountCurrencyInput from "../../../../components/forms/AmountCurrencyInput";
import CurrencyAmountInput from "../../../../components/forms/CurrencyAmountInput";
import GenericToggle from "../../../../components/misc/GenericToggle";

interface Props {
  close: Function;
}
const NewModifier = ({ close }: Props) => {
  const {
    handleSubmit,
    control,
    getValues,
    watch,
    formState: { isSubmitting },
  } = useForm();

  const { addNewModifier, currentArea, isLoading } =
    useContext(ContextModifier);

  const [isSubmit, setIsSubmit] = useState(false);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    setIsSubmit(true);
    data.applyToGrossSales = applyToGrossSales;
    data.applyAcumulative = applyAcumulative;
    data.areaId = currentArea?.id ?? "";
    addNewModifier &&
      addNewModifier(data, () => {
       
        close();
      },()=> setIsSubmit(false));
  };

  const { business } = useAppSelector((state) => state.init);

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  const typeModifier: SelectInterface[] = [
    { id: "tax", name: "Impuesto" },
    { id: "discount", name: "Descuento" },
  ];

  // useEffect(() => {
  //   if(applyFixedAmount){

  //   }else{

  //   }
  // }, [applyFixedAmount]);

  const applyFixedAmount = watch("applyFixedAmount");

  const [applyToGrossSales, setApplyToGrossSales] = useState(false);
  const [applyAcumulative, setApplyAcumulative] = useState(false);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border flex flex-col gap-5 border-slate-300 rounded p-4 overflow-y-visible">
        <div className="flex justify-between gap-x-2">
          <Toggle
            name="active"
            title="Activo"
            control={control}
            defaultValue={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <Input
            name="name"
            label="Nombre"
            control={control}
            rules={{ required: "Este campo es requerido" }}
          />
          <Input
            name="showName"
            label="Nombre a mostrar en factura"
            control={control}
            rules={{ required: "Este campo es requerido" }}
          />
        </div>
        <div className="">
          <Select
            name="type"
            label="Tipo"
            control={control}
            data={typeModifier}
            rules={{ required: "Este campo es requerido" }}
          />
        </div>

        <div className="   gap-x-3 w-full">
          <div className="">
            <Input
              name="index"
              label="Prioridad"
              control={control}
              textAsNumber
              rules={{ required: "Este campo es requerido" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <div className="mt-6">
            <Toggle
              name="applyFixedAmount"
              title="Aplicar monto fijo"
              control={control}
            />
          </div>
          {applyFixedAmount ? (
            <div className="">
              <CurrencyAmountInput
                currencies={currenciesSelector}
                name="fixedPrice"
                control={control}
                label="Monto(*)"
                rules={{
                  required: "Escoja el monto y la moneda que desea aplicar",
                  validate:{
                    amountGreaterThanZero: (value) => value.amount > 0 || "Monto debe ser mayor a 0",
                    validCurrency: (value) => value.codeCurrency !== "Moneda" || "Escoja una moneda"
                  } 
                }}
              />
            </div>
          ) : (
            <Input
              name="amount"
              label="Monto(%)"
              maxLength={2}
              control={control}
              textAsNumber
              rules={{ required: "Este campo es requerido" }}
            />
          )}
        </div>

        <section className="grid grid-cols-2 justify-items-start">
          <GenericToggle
            //name="applyToGrossSales"
            title="Aplicar a ventas brutas"
            //control={control}
            currentState={applyToGrossSales}
            changeState={() => {
              setApplyAcumulative(false);
              setApplyToGrossSales(!applyToGrossSales);
            }}
          />
          <GenericToggle
            // name="applyAcumulative"
            title="Aplicar de forma acumulativa"
            // control={control}
            currentState={applyAcumulative}
            changeState={() => {
              setApplyToGrossSales(false);
              setApplyAcumulative(!applyAcumulative);
            }}
          />
        </section>

        <div>
          <TextArea
            name="observations"
            label="Observaciones"
            control={control}
          />
        </div>
        <div className="py-2">
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
            <Button
              color="slate-600"
              type="submit"
              name="Registrar"
              loading={isSubmit}
              disabled={isSubmit}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default NewModifier;
