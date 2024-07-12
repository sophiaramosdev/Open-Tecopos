import React, { useContext, useEffect } from "react";
import Input from "../../../components/forms/Input";
import Select from "../../../components/forms/Select";
import { ProductContext } from "./NewWizardContainer";
import { useAppSelector } from "../../../store/hooks";
import Button from "../../../components/misc/Button";
import Multiselect from "../../../components/forms/Multiselect";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import CurrencyInput from "../../../components/forms/CurrencyInput";
import TextArea from "../../../components/forms/TextArea";
import Toggle from "../../../components/forms/Toggle";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import TimeInput from "../../../components/forms/InputTimer";
import InputColor from "../../../components/forms/InputColor";
import InputDuration from "../../../components/forms/InputDuration";

const ProductForm = () => {
  const { business } = useAppSelector((state) => state.init);
  const { productCategories, measures, salesCategories, areas } =
    useAppSelector((state) => state.nomenclator);
  const { control, stepDown, watch, unregister } = useContext(ProductContext);

  const productType = control?._getWatch("type") ?? "";

  const module_booking =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  //Data for Select and Multiselect Components ---------------------------------------------------------------------
  const selectSalesCategory: SelectInterface[] = [];
  salesCategories.map((cat) =>
    selectSalesCategory.push({
      name: cat.name,
      id: cat.id,
    })
  );

  const selectStockCategory: SelectInterface[] = [];
  productCategories?.forEach((cat) =>
    selectStockCategory.push({
      name: cat.name,
      id: cat.id,
    })
  );

  const selectMeasure: SelectInterface[] = [];
  measures.forEach((item) =>
    selectMeasure.push({
      id: item.code,
      name: item.value,
    })
  );

  const productionAreas: SelectInterface[] = [];
  areas?.forEach(
    (item) =>
      item.type === "MANUFACTURER" &&
      productionAreas.push({
        name: item.name,
        id: item.id,
      })
  );

  //----------------------------------------------------------------------------------------------------
  const price = control?._getWatch("prices");
  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 overflow-y-visible">
        <div className={`grid grid-cols-2 gap-3`}>
          <Input
            label="Nombre"
            name="name"
            control={control}
            placeholder="Inserte el nombre del producto"
            rules={{ required: "Este campo es requerido" }}
          />
          {["STOCK", "MENU", "SERVICE", "ADDON", "COMBO", "VARIATION"].includes(
            productType
          ) && (
            <Select
              label="Categoría de Venta"
              data={selectSalesCategory}
              name="salesCategoryId"
              control={control}
            />
          )}

          {["STOCK", "MENU", "SERVICE", "ADDON", "COMBO", "VARIATION"].includes(
            productType
          ) && (
            <CurrencyInput
              label="Precio de venta"
              currencies={
                business?.availableCurrencies.map(
                  (currency) => currency.code
                ) ?? []
              }
              name="prices"
              control={control}
              placeholder="$0.00"
              byDefault={
                !price
                  ? { price: 0, codeCurrency: business?.costCurrency! }
                  : price
              }
              defaultCurrency={business?.costCurrency!}
            />
          )}

          {["STOCK", "RAW", "MANUFACTURED", "WASTE", "ASSET"].includes(
            productType
          ) && (
            <Select
              label="Categoría de almacén"
              data={selectStockCategory}
              name="productCategoryId"
              control={control}
            />
          )}

          {["RAW", "MANUFACTURED", "WASTE"].includes(productType) && (
            <Select
              label="Unidad de medida"
              data={selectMeasure}
              name="measure"
              control={control}
              rules={{ required: "Este campo es requerido" }}
            />
          )}

          {["MENU", "ADDON"].includes(productType) && (
            <div className="">
              <Multiselect
                label="Areas de producción"
                data={productionAreas}
                name="listProductionAreas"
                control={control}
                disabled={business?.subscriptionPlan.code === "FREE"}
              />
            </div>
          )}
          {["SERVICE"].includes(productType) && module_booking && (
            <>
              <div className="">
                <InputColor
                  name="color"
                  control={control}
                  label="Color identificativo"
                />
              </div>
              <div className=""></div>
            </>
          )}
          {["SERVICE"].includes(productType) && module_booking && (
            <div className="col-span-2 grid grid-cols-2 items-center  ">
              <div className="">
                <Toggle
                  control={control}
                  name="hasDuration"
                  title="Definir duración"
                />
              </div>
              <div className="mb-2">
                {watch("hasDuration") && (
                  <InputDuration
                    name="duration"
                    control={control}
                    label="Duración"
                  />
                )}
              </div>
            </div>
          )}

          <div className="col-span-2">
            <TextArea
              control={control}
              name="description"
              label="Descripción"
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
        <Button color="slate-600" type="submit" name="Siguiente" full />
      </div>
    </>
  );
};

export default ProductForm;
