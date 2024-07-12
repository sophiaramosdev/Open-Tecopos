import { useState, useEffect, useContext } from "react";
import { ProductInterface } from "../../../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import { useForm } from "react-hook-form";
import GenericToggle from "../../../../../components/misc/GenericToggle";
import { useAppSelector } from "../../../../../store/hooks";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import ComboBox from "../../../../../components/forms/Combobox";
import useServerSupplier from "../../../../../api/useServerSupplier";
import { MovementsContext } from "./WizzardContainer";
import { cleanObj } from "../../../../../utils/helpers";

interface QuantitySelectorInterface {
  productData: Partial<ProductInterface>;
  close: Function;
  idx?: number;
  variation?: {
    id: number;
    name: string;
  };
}

const QuantitySelector = ({
  productData,
  close,
  idx,
  variation,
}: QuantitySelectorInterface) => {
  const { business } = useAppSelector((state) => state.init);
  const { control, unregister, getValues, trigger } = useForm();
  const { fields, append, update, watch } = useContext(MovementsContext);
  const { isLoading, allSuppliers, getAllSuppliersWithOutFilter } =
    useServerSupplier();

  const [price, setPrice] = useState(false);
  const [priceType, setPriceType] = useState<"unit" | "total">("unit");

  let selectedProduct: Record<string, any> = {};
  if (idx !== undefined) {
    selectedProduct = fields![idx];
  }

  const setProduct = async () => {
    const valid = await trigger();
    if (valid) {
      let selectedValues = cleanObj(getValues());
      selectedValues.productId = productData.id;
      selectedValues.productName = productData.name;
      selectedValues.measure = productData.measure;
      selectedValues.stockQuantity = productData.stockQuantity;
      if (productData.stockVariations) {
        selectedValues.stockVariations = productData.stockVariations;
      }

      if (productData.averageCost !== undefined) {
        selectedValues.averageCost = productData.averageCost;
      }
      if (selectedValues?.price) {
        if (priceType === "total") {
          selectedValues.price.amount =
            selectedValues.price.amount / selectedValues.quantity;
        }
      }
      if (variation) {
        selectedValues.variationId = variation.id;
        selectedValues.variationName = variation.name
      }

      if (idx !== undefined) {
        const newData = fields![idx]
        update!(idx, { ...newData, ...selectedValues });
      } else {
        append!(selectedValues);
      }
      close();
    }
  };

  const movementType = watch!("movementType");

  useEffect(() => {
    if (movementType === "ENTRY") getAllSuppliersWithOutFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Data for Currency Select----------------------------------------------------------------------------
  const currency: SelectInterface[] = [];
  business?.availableCurrencies.map((item) =>
    currency.push({
      id: item.code,
      name: item.code,
    })
  );

  const suppliers: SelectInterface[] = [];
  allSuppliers.map((item) =>
    suppliers.push({
      id: item.id,
      name: item.name,
    })
  );
  //-------------------------------------------------------------------------------------------------------
  return (
    <>
      <div className="relative pb-2">
        <Input
          label="Definir cantidad"
          name="quantity"
          control={control}
          type="number"
          placeholder={`Cantidad en ${translateMeasure(productData?.measure)}`}
          rules={{
            max: {
              value:
                productData?.stockQuantity &&
                  (movementType === "MOVEMENT" || movementType === "OUT")
                  ? productData.stockQuantity
                  : Infinity,
              message: "No puede mover una cantidad mayor a la disponible",
            },
            validate: {
              minVal: (value: number) => {
                if (movementType !== "ADJUST") {
                  return value > 0 || "Debe indicar una cantidad";
                } else {
                  return true;
                }
              },
            },
          }}
          defaultValue={selectedProduct?.quantity ?? 0}
        />
      </div>

      {movementType === "ENTRY" && (
        <>
          <div className="relative">
            <ComboBox
              name="supplierId"
              data={suppliers}
              label="Proveedor"
              control={control}
              defaultValue={selectedProduct?.supplierId}
              loading={isLoading}
            />
          </div>

          {(productData?.averageCost !== undefined || selectedProduct?.price) && (
            <GenericToggle
              title="Establecer precio de compra"
              currentState={price}
              changeState={(value: boolean) => {
                if (!value) {
                  unregister("price");
                  unregister("currency");
                }
                setPrice(value);
              }}
            />
          )}
        </>
      )}

      {(price || selectedProduct?.price) && (
        <>
          <div className="inline-flex gap-5 py-2">
            <button
              className={`px-3 py- border border-slate-500 rounded-full ${priceType === "unit" && "bg-slate-300 ring-1 ring-slate-500"
                }`}
              type="button"
              onClick={() => setPriceType("unit")}
            >
              Por precio unitario
            </button>
            <button
              className={`px-3 py-1 border border-slate-500 rounded-full ${priceType === "total" && "bg-slate-300 ring-1 ring-slate-500"
                }`}
              type="button"
              onClick={() => setPriceType("total")}
            >
              Por precio total
            </button>
          </div>

          <div className="">
            <CurrencyAmountInput
              name="price"
              currencies={currency.map((item) => item.name)}
              label="Precio"
              control={control}
              defaultCurrency={selectedProduct.price !== undefined ? selectedProduct.price : currency.find(elem => elem.name === business?.costCurrency)?.id}
              // defaultValue={selectedProduct?.price}
              rules={{ required: "Indique un precio" }}
            />
          </div>
        </>
      )}
      <div className="flex justify-end py-2">
        <Button name="Aceptar" color="slate-600" action={setProduct} />
      </div>
    </>
  );
};

export default QuantitySelector;
