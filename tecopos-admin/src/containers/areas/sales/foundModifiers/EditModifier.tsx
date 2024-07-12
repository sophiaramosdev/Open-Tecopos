import { useContext, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  AreasInterface,
  BankAccountTagInterfaces,
  FundDestinationInterface,
  Modifier,
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
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import GenericToggle from "../../../../components/misc/GenericToggle";
import CurrencyAmountInput from "../../../../components/forms/CurrencyAmountInput";

interface Props {
  close: Function;
  data: Modifier | null;
}
const EditModifier = ({ close, data }: Props) => {
  const { handleSubmit, control, getValues, watch } = useForm();

  const { updateModifier, deleteModifier, currentArea, isFetching, isLoading } =
    useContext(ContextModifier);

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    dataForm
  ) => {
    //dataForm.areaId = currentArea?.id ?? "";
    dataForm.applyToGrossSales = applyToGrossSales;
    dataForm.applyAcumulative = applyAcumulative;
    updateModifier && updateModifier(data?.id, dataForm, close);
  };

  const { business } = useAppSelector((state) => state.init);

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  const [deleteModal, setDeleteModal] = useState(false);
  useEffect(() => {}, []);

  const typeModifier: SelectInterface[] = [
    { id: "tax", name: "Impuesto" },
    { id: "discount", name: "Descuento" },
  ];

  const applyFixedAmount = watch("applyFixedAmount") ?? data?.applyFixedAmount ?? false

  const [applyToGrossSales, setApplyToGrossSales] = useState(
    data?.applyToGrossSales ?? false
  );
  const [applyAcumulative, setApplyAcumulative] = useState(
    data?.applyAcumulative ?? false
  );

  // useEffect(() => {
  //   if(applyFixedAmount){

  //   }else{

  //   }
  // }, [applyFixedAmount]);


  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border flex flex-col gap-5 border-slate-300 rounded p-2 overflow-y-visible">
        <div className="flex justify-between gap-x-2">
          <Toggle
            name="active"
            title="Activo"
            control={control}
            defaultValue={data?.active}
          />
          <Button
            action={() => setDeleteModal(true)}
            color="red-500"
            icon={<TrashIcon className="h-5 text-red-500" />}
            disabled={isLoading}
            textColor="red-500"
            outline
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <Input
            name="name"
            label="Nombre"
            control={control}
            rules={{ required: "Este campo es requerido" }}
            defaultValue={data?.name}
          />

          <Input
            name="showName"
            label="Nombre a mostrar en factura"
            control={control}
            rules={{ required: "Este campo es requerido" }}
            defaultValue={data?.showName}
          />
        </div>

        <div className=" grid grid-cols-1  gap-x-3 w-full">
          <Select
            name="type"
            label="Tipo"
            control={control}
            data={typeModifier}
            rules={{ required: "Este campo es requerido" }}
            defaultValue={data?.type}
          />
        </div>

        <div className=" grid grid-cols-1  gap-x-3 w-full">
          <Input
            name="index"
            label="Prioridad"
            control={control}
            type="number"
            rules={{ required: "Este campo es requerido" }}
            defaultValue={data?.index}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <div className="mt-6">
            <Toggle
              name="applyFixedAmount"
              title="Aplicar monto fijo"
              control={control}
              defaultValue={applyFixedAmount}
            />
          </div>
          {applyFixedAmount ? (
            <div className="">
              {/* <Input
                name="fixedPrice"
                label="Monto(%)"
                control={control}
                textAsNumber
                rules={{ required: "Este campo es requerido" }}
                defaultValue={data?.fixedPrice}
              /> */}
              <CurrencyAmountInput
                currencies={currenciesSelector}
                name="fixedPrice"
                control={control}
                label="Monto(*)"
                defaultCurrency={data?.fixedPrice?.codeCurrency}
                byDefault={data?.fixedPrice}
                rules={{
                  required: "Escoja el monto y la moneda que desea aplicar",
                  validate:{
                   // amountGreaterThanZero: (value) => value.amount > 0 || "Monto debe ser mayor a 0",
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
              defaultValue={data?.amount}
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
            defaultValue={data?.observations}
          />
        </div>
        <div className="py-2">
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
            <Button
              color="slate-600"
              type="submit"
              name="Actualizar"
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </div>
      </div>

      {deleteModal && (
        <Modal state={deleteModal} close={() => setDeleteModal(false)}>
          <AlertContainer
            title="Eliminar"
            text={`Está a punto de eliminar el modificador ${data?.name} seguro que desea continuar?`}
            onAction={() => deleteModifier && deleteModifier(data?.id, close)}
            onCancel={() => setDeleteModal(false)}
            loading={isLoading}
          />
        </Modal>
      )}
    </form>
  );
};

export default EditModifier;
