import { useForm } from "react-hook-form";
import Select from "../../../../../components/forms/Select";
import { productTypes } from "../../../../../utils/staticData";
import Input from "../../../../../components/forms/BasicInput";
import CurrencyInput from "../../../../../components/forms/CurrencyInput";
import { useAppSelector } from "../../../../../store/hooks";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import Button from "../../../../../components/misc/Button";
import useServerProduct from "../../../../../api/useServerProducts";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";

const FastEntryComponent = ({
  setQuantity,
}: {
  setQuantity: (product: ProductInterface) => void;
}) => {
  const { business } = useAppSelector((state) => state.init);
  const { measures } = useAppSelector((state) => state.nomenclator);
  const { addProduct, isFetching } = useServerProduct();
  const currencies =
    business?.availableCurrencies.map((curr) => curr.code) ?? [];
  const measureSelector: SelectInterface[] = measures.map((item) => ({
    id: item.code,
    name: item.value,
  }));

  const { control, getValues, trigger, watch } = useForm({ mode: "onChange" });

  const onSubmit = async () => {
    const isValid = await trigger();
    if (isValid) {
      const data = getValues();
      addProduct(data, (product) => setQuantity(product!), true);
    }
  };
  return (
    <div>
      <h5 className="text-lg text-slate-500">Nuevo producto</h5>
      <div className="p-5 flex flex-col gap-y-4">
        <Select
          name="type"
          data={productTypes}
          control={control}
          label="Tipo *"
          rules={{ required: "* Seleccione el tipo de producto" }}
        />
        <Input
          name="name"
          control={control}
          label="Producto *"
          rules={{ required: "* Indique el nombre del producto" }}
        />
        {!!watch("type") && watch("type") === "STOCK" && (
          <CurrencyInput
            name="prices"
            currencies={currencies}
            control={control}
            label="Precio"
          />
        )}
        {!!watch("type") && watch("type") !== "STOCK" && (
          <Select
            name="measure"
            data={measureSelector}
            control={control}
            label="Unidad de medida"
          />
        )}
      </div>
      <div className="inline-flex py-3 justify-end w-full">
        <Button
          type="button"
          color="slate-600"
          name="Añadir"
          action={onSubmit}
          loading={isFetching}
        />
      </div>
    </div>
  );
};

export default FastEntryComponent;
