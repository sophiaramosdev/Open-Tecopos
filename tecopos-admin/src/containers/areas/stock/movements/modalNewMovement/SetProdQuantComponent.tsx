import React, { useState, useEffect } from "react";
import {
  PriceInvoiceInterface,
  ProductInterface,
} from "../../../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import { useForm, SubmitHandler } from "react-hook-form";
import GenericToggle from "../../../../../components/misc/GenericToggle";
import { useAppSelector } from "../../../../../store/hooks";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import ComboBox from "../../../../../components/forms/Combobox";
import useServerSupplier from "../../../../../api/useServerSupplier";

interface ComponentProps {
  data:
    | (Partial<ProductInterface> & {
        quantity?: number;
        price?: PriceInvoiceInterface;
      })
    | null;
  action: Function;
  movementType: string|null;
}

const SetProdQuantComponent = ({
  data,
  action,
  movementType,
}: ComponentProps) => {
  const { business } = useAppSelector((state) => state.init);
  const { isLoading, allSuppliers, getAllSuppliersWithOutFilter } =
    useServerSupplier();

  const { control, handleSubmit, unregister } =
    useForm<Record<string, string | number>>();

  const [price, setPrice] = useState(false);
  const [priceType, setPriceType] = useState<"unit" | "total">("unit");
  const [disabledBtn, setDisabledBtn] = useState(false);
  
  const onSubmit: SubmitHandler<Record<string, any>> = (values) => {
    setDisabledBtn(true);
    const id = data?.id;
    const name = data?.name;
    const measure = data?.measure;
    const averageCost = data?.averageCost;
    if (price || data?.price) {
      values.price.amount =
        priceType === "total"
          ? Number(values.price.amount) / Number(values.quantityToMove)
          : Number(values.price.amount);
    }
    action({ id, name, measure,averageCost, ...values });
  };

  useEffect(() => {
    if(movementType ==="ENTRY") getAllSuppliersWithOutFilter();
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="relative">
          <Input
            label="Definir cantidad"
            name="quantityToMove"
            control={control}
            type="number"
            placeholder={`Cantidad en ${translateMeasure(data?.measure)}`}
            rules={{
              max: {
                value:
                  data?.totalQuantity &&
                  (movementType === "MOVEMENT" || movementType === "OUT")
                    ? data.totalQuantity
                    : Infinity,
                message: "No puede mover una cantidad mayor a la disponible",
              },
              required: "Debe indicar una cantidad",
            }}
            defaultValue={data?.quantity}
          />
        </div>

        {movementType === "ENTRY" && <div className="relative">
          <ComboBox
            name="supplierId"
            data={suppliers}
            label="Proveedor"
            control={control}
            defaultValue={data?.supplier?.id}
            loading={isLoading}
          />
        </div>}
        
        {(data?.averageCost !== undefined || data?.price) && (
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

        {(price || data?.price) && (
          <>
            <div className="inline-flex gap-5 py-2">
              <button
                className={`px-3 py- border border-slate-500 rounded-full ${
                  priceType === "unit" && "bg-slate-300 ring-1 ring-slate-500"
                }`}
                type="button"
                onClick={() => setPriceType("unit")}
              >
                Por precio unitario
              </button>
              <button
                className={`px-3 py-1 border border-slate-500 rounded-full ${
                  priceType === "total" && "bg-slate-300 ring-1 ring-slate-500"
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
                defaultValue={data?.price}
                rules={{ required: "Indique un precio" }}
              />
            </div>
          </>
        )}

        <div className="flex justify-end py-2">
          <Button
            name="Aceptar"
            color="slate-600"
            type="submit"
            disabled={disabledBtn}
          />
        </div>
      </form>
    </>
  );
};

export default SetProdQuantComponent;
