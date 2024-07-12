import { SubmitHandler, useForm } from "react-hook-form";
import AmountCurrencyInput from "../../../../../components/forms/AmountCurrencyInput";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../../store/hooks";
import Select from "../../../../../components/forms/Select";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import { FaPlus } from "react-icons/fa";
import { useContext, useMemo, useState } from "react";
import ReceiptContext from '../ReceiptContext' 
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import { FaArrowRotateRight, FaTrashCan } from "react-icons/fa6";
import Modal from "../../../../../components/misc/GenericModal";
import AlertContainer from "../../../../../components/misc/AlertContainer";
import { formatCurrency } from "../../../../../utils/helpers";

interface OperationsProps {
  id: number | null;
  close: Function;
}

const OperationsForm = ({ id, close }: OperationsProps) => {
  const { business } = useAppSelector((state) => state.init);
  const { fixedCostCategories } = useAppSelector((state) => state.nomenclator);
  const {
    fieldsOperations,
    appendOperation,
    updateOperation,
    removeOperation,
  } = useContext(ReceiptContext);

  const [del, setDel] = useState(false);

  const currentOperation = fieldsOperations!.find(
    (_: any, idx: number) => id === idx
  );

  const { control, watch, trigger, getValues } = useForm({ mode: "onChange" });
  const onSubmit = async () => {
    if (await trigger()) {
      let data = getValues();
      data.fixedCostCategory = fixedCostCategory;
      id === -1 ? appendOperation!(data) : updateOperation!(id!, data);
      close();
    }
  };

  const costCategories: SelectInterface[] = fixedCostCategories?.map((cat) => ({
    id: cat.id,
    name: cat.name,
  }))??[];

  const fixedCostCategory = useMemo(
    () =>
      costCategories.find(
        (item: SelectInterface) => item.id === watch("fixedCostCategoryId")
      ),
    [watch("fixedCostCategoryId")]
  );

  const currencies =
    business?.availableCurrencies.map((item) => item.code) ?? [];

  return (
    <>
      <div className="grid gid-cols-2 gap-x-3">
        <CurrencyAmountInput
          name="registeredPrice"
          currencies={currencies}
          control={control}
          label="Monto *"
          rules={{ required: "* Campo requerido" }}
          byDefault={currentOperation?.registeredPrice}
        />
        <Select
          name="fixedCostCategoryId"
          data={costCategories}
          control={control}
          label="Categoría de costo fijo"
          defaultValue={currentOperation?.fixedCostCategoryId}
        />

        <div className="col-span-2">
          <TextArea
            name="observations"
            label="Observaciones"
            control={control}
            defaultValue={currentOperation?.observations}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 py-5 gap-3">
        {id !== -1 ? (
          <Button
            color="red-500"
            action={() => setDel(true)}
            name="Eliminar"
            textColor="red-600"
            icon={<FaTrashCan />}
            outline
          />
        ) : (
          <span />
        )}
        <Button
          color="slate-600"
          icon={id === -1 ? <FaPlus /> : <FaArrowRotateRight />}
          name={id === -1 ? "Añadir" : "Actualizar"}
          action={onSubmit}
        />
      </div>

      {del && (
        <Modal state={del} close={setDel}>
          <AlertContainer
            title={`Eliminar costo fijo de ${formatCurrency(
              currentOperation.registeredPrice.amount,
              currentOperation.registeredPrice.codeCurrency
            )} ${!!fixedCostCategory ? `en ${fixedCostCategory.name}` : ""}`}
            onCancel={setDel}
            text="¿Seguro que desea continuar?"
            onAction={() => {
              removeOperation!(id!);
              close();
            }}
          />
        </Modal>
      )}
    </>
  );
};

export default OperationsForm;
