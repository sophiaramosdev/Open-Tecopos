import  { useContext } from "react";
import Input from "../../../../components/forms/Input";
import { CouponContext } from "./NewWizardContainer";
import Button from "../../../../components/misc/Button";
import TextArea from "../../../../components/forms/TextArea";
import DateTimePicker from "../../../../components/marketing/DateTimePicker";
import Select from "../../../../components/forms/Select";
import { useAppSelector } from "../../../../store/hooks";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";



const CouponForm = () => {

  const { availableCurrencies } = useAppSelector((state) => state.init.business!);


  const { control, stepDown } = useContext(CouponContext);


  const selectCodeCurrency: SelectInterface[] = availableCurrencies.map((currency) => ({
    name: currency.name,
    id: currency.code,
  }));

  //----------------------------------------------------------------------------------------------------
  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 overflow-y-visible">
        <div className="grid grid-cols-2 gap-3">
          <div className="">
            <Input
              label="Código"
              name="code"
              control={control}
              placeholder="Inserte el código del cupón"
              rules={{ required: "Este campo es requerido" }}
            />
          </div>          
          <div className="">
            <Input
              label="Importe"
              name="amount"
              type="number"
              control={control}
              placeholder="Inserte el importe del cupón"
              rules={{ required: "Este campo es requerido" }}
            />
          </div>

          <div className="py-2 w-full">
            <DateTimePicker
              label="Fecha de caducidad"
              name="expirationAt"
              control={control}
              type="date"
              placeholder="Inserte la fecha y tiempo de la caducidad del cupón"
              // rules={{ required: "Este campo es requerido" }}
              // defaultValue={moment('2024}
            />
          </div>

          <div>
            <Select
              label="Tipo de moneda"
              data={selectCodeCurrency}
              name="codeCurrency"
              control={control}
            />
          </div>
          <div className="col-span-2">
            <TextArea
              label="Descripción"
              name="description"
              control={control}
              placeholder="Inserte la descripción del cupón"
              // rules={{ required: "Este campo es requerido" }}
            />
          </div>

        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-2">
        <Button
          color="slate-500"
          action={stepDown}
          name="Atrás"
          full
          outline
          textColor="slate-600"
        />
        <Button color="slate-500" type="submit" name="Finalizar" full />
      </div>
    </>
  );
}

export default CouponForm
