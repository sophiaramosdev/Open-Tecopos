import { useState, useContext, useEffect } from "react";
import Button from "../../../components/misc/Button";
import { DetailProductContext } from "../DetailProductContainer";
import { SubmitHandler, useForm } from "react-hook-form";
import Toggle from "../../../components/forms/Toggle";
import { formatCalendar } from "../../../utils/helpers";
import CurrencyInput from "../../../components/forms/CurrencyInput";
import { useAppSelector } from "../../../store/hooks";
import moment from "moment";
import SingleRadio from "../../../components/forms/SingleRadio";
import Input from "../../../components/forms/BasicInput";
import { toast } from "react-toastify";

const Promotions = () => {
  const { product, updateProduct, isFetching } =
    useContext(DetailProductContext);
  const { handleSubmit, control, watch, unregister, setValue } = useForm();

  const [onSale, setOnSale] = useState(product?.onSale ?? false);

  const { business } = useAppSelector((state) => state.init);

  const saleType = watch("onSaleType")

  useEffect(() => {
    if (!onSale) {
      unregister(["onSalePrice", "onSaleType", "onSaleDiscountAmount"]);
      setValue("onSalePrice", null);
      setValue("onSaleDiscountAmount", null);
      setValue("onSaleType", null);
    }
  }, [onSale]);

  useEffect(() => {
    switch (watch("onSaleType")) {
      case "fixed":
        unregister("onSaleDiscountAmount");
        setValue("onSaleDiscountAmount", null);
        break;
      case "percent":
        unregister("onSalePrice");
        setValue("onSalePrice", null);
        break;
      default:
        unregister("onSaleDiscountAmount");
        setValue("onSaleDiscountAmount", null);
        break;
    }
  }, [saleType]);

  const newArrival = watch("newArrival");

  useEffect(() => {
    if (newArrival) {
      setValue("newArrivalAt", moment().add(7, "days").format("YYYY-MM-DD"));
    }
  }, [newArrival]);

  //----------------------------------------------------------------

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {

    const { onSaleType, onSale } = data

    if (onSale) {
      if (onSaleType === null) {
        toast.error("Seleccione si la oferta es por porciento o por precio fijo")
      } else {

        if (onSaleType === 'fixed') {
          const onSalePrice = {
            amount: data.onSalePrice?.price,
            codeCurrency: data.onSalePrice.codeCurrency,
          };

          updateProduct!(product?.id, { ...data, onSalePrice });

        } else {
          updateProduct!(product?.id, data);
        }

      }
    } else {
      updateProduct!(product?.id, data);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 place-content-between"
    >
      <div className="p-7 grid grid-cols-3 border border-slate-300 rounded-md h-[34rem] items-start">
        <Toggle
          name="suggested"
          control={control}
          defaultValue={product?.suggested}
          title="Sugerencia de la casa"
        />

        <div className="flex flex-col gap-0">
          <Toggle
            name="newArrival"
            control={control}
            defaultValue={product?.newArrival}
            title="Nuevo arribo"
          />
          {product?.newArrival && (
            <p className="text-xs text-gray-400">{`* Hasta: ${formatCalendar(
              product.newArrivalAt
            )}`}</p>
          )}
        </div>
        <div>
          <Toggle
            name="onSale"
            control={control}
            defaultValue={product?.onSale}
            title="Producto en oferta"
            changeState={setOnSale}
          />

          {onSale && (
            <>
              <div className="inline-flex gap-2 p-5">
                <SingleRadio
                  name="onSaleType"
                  value="fixed"
                  label="Por precio fijo"
                  control={control}
                  checked={
                    product?.onSaleType === "fixed"
                  }
                  onChangeFunction={() => {
                    setValue("onSaleType", "fixed");
                  }}
                />
                <SingleRadio
                  name="onSaleType"
                  value="percent"
                  label="Por porciento"
                  control={control}
                  checked={product?.onSaleType === "percent"}
                  onChangeFunction={() => {
                    setValue("onSaleType", "percent");
                  }}
                />
              </div>
              {(saleType === "fixed" ?? product?.onSaleType === "fixed")
                ?
                (
                  <CurrencyInput
                    label="Precio *"
                    currencies={
                      business?.availableCurrencies.map(
                        (currency) => currency.code
                      ) ?? []
                    }
                    name="onSalePrice"
                    control={control}
                    byDefault={
                      product?.onSalePrice
                        ? {
                          ...product.onSalePrice,
                          price: product.onSalePrice.amount,
                        }
                        : undefined
                    }
                    rules={{ required: "Campo requerido" }}
                  />
                )
                :
                (saleType === "percent" ?? product?.onSaleType === "percent")
                  ?
                  (
                    <div className="relative">
                      <Input
                        name="onSaleDiscountAmount"
                        label="Porciento *"
                        control={control}
                        type="number"
                        rules={{ required: "* Campo requerido" }}
                        defaultValue={product?.onSaleDiscountAmount}
                      />
                      <span className="absolute top-8 right-3 text-gray-600 font-semibold">
                        %
                      </span>
                    </div>
                  )
                  :
                  (
                    ""
                  )}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end w-full p-5 pr-0">
        <Button
          color="slate-600"
          name="Actualizar"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
        />
      </div>
    </form>
  );
};

export default Promotions;
