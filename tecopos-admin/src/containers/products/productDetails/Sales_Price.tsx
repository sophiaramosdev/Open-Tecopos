/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { useAppSelector } from "../../../store/hooks";
import {
  formatCalendar,
  formatCurrency,
} from "../../../utils/helpers";
import { DetailProductContext } from "../DetailProductContainer";
import { useForm, SubmitHandler } from "react-hook-form";
import CurrencyInput from "../../../components/forms/CurrencyInput";
import Button from "../../../components/misc/Button";
import GenericToggle from "../../../components/misc/GenericToggle";
import ButtonSelector from "../../../components/misc/ButtonSelector";
import useServer from "../../../api/useServerMain";
import useProduct from "../../../hooks/useProduct";

const Sales_Price = () => {
  const { product, updateProduct } = useContext(DetailProductContext);
  const { business } = useAppSelector((state) => state.init);
  const { allowRoles: verifyRoles } = useServer();
  const { handleSubmit, control, unregister } = useForm();
  const { getPrice, getProfit } = useProduct();

  //Prices by PriceSystems----------------------------------------------------------------------------

  const [priceSystem, setPriceSystem] = useState(false);
  const [currentPriceSystem, setCurrentPriceSystem] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const currentPrice = product?.prices.find(
    (price) => price.priceSystemId === currentPriceSystem?.id
  );

  //----------------------------------------------------------------------------------------------------

  const profit = getProfit({ product: product! }) as number;

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    updateProduct && updateProduct(product?.id, data);
  };

  useEffect(() => {
    if (product && product?.prices.length > 1) {
      setPriceSystem(true);
    } else {
      setPriceSystem(false);
    }
  }, []);

  useEffect(() => {
    if (!priceSystem) {
      unregister("prices");
    }
    const mainPriceSystem = business?.priceSystems.find((item) => item.isMain)!;
    setCurrentPriceSystem({
      id: mainPriceSystem?.id,
      name: mainPriceSystem.name,
    });
  }, [priceSystem]);

  const roleIsAdmin = verifyRoles([
    "ADMIN",
    "MANAGER_COST_PRICES",
    "PRODUCT_PROCESATOR",
  ]);

  return (
    <div className="relative grid grid-cols-2 gap-2 border border-gray-300 rounded-md h-[34rem] p-5">
      {roleIsAdmin ? (
        <div className="relative flex flex-col m-auto">
          {priceSystem && (
            <div className="absolute -top-10 right-0">
              <ButtonSelector
                selected={currentPriceSystem}
                data={
                  business?.priceSystems.map((item) => ({
                    id: item.id,
                    name: item.name,
                  })) ?? []
                }
                setSelected={setCurrentPriceSystem}
              />
            </div>
          )}

          <Doughnut
            style={{ display: "flex" }}
            data={{
              labels: ["Costo ponderado", "Ganancia Bruta"],
              datasets: [
                {
                  data: [product?.averageCost ?? 0, profit],
                  backgroundColor: ["rgb(255, 99, 132)", "rgb(54, 162, 235)"],
                  datalabels: {
                    color: "black",
                    formatter: (value) =>
                      formatCurrency(value, business?.costCurrency ?? "CUP"),
                  },
                },
              ],
            }}
            options={{
              responsive: true,
            }}
          />
          <div className="absolute top-[150px] left-[100px]">
            <h3 className="font-medium text-sm text-center">
              Precio de venta:
            </h3>
            <p className={`text-sm font-semibold text-center text-gray-700`}>
              {getPrice({product:product!, priceSystemId:currentPriceSystem?.id}) as string }
            </p>
          </div>
          <div className="inline-flex gap-5 border shadow-md p-5 mt-2 rounded-md -mx-10">
            <div className="flex-col flex-grow">
              <h3 className="font-medium text-lg">
                Ganancia por precio de ventas
              </h3>
              <p
                className={`p-2 text-xl font-semibold ${
                  profit > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {getProfit({ product: product!, priceSystemId:currentPriceSystem?.id, mode: "price" })}
              </p>
            </div>
            <div className="flex justify-center flex-shrink">
              <p
                className={`flex justify-center text-gray-100 items-center p-2 text-lg font-semibold ${
                  profit > 0 ? "bg-green-400" : "bg-red-400"
                } rounded-full w-20 h-20 p-12`}
              >
                {getProfit({ product: product!, priceSystemId:currentPriceSystem?.id, mode: "percent" })+"%"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <span />
      )}
      <div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex items-start h-full"
        >
          <div className="relative flex flex-col w-full gap-y-5 p-1">
            {!roleIsAdmin && (
              <div className="absolute bg-white w-full h-full z-10 left-0 opacity-25"></div>
            )}

            {!priceSystem && currentPrice && (
              <div className="flex flex-col gap-0">
                <CurrencyInput
                  name="prices.0"
                  label="Precio"
                  control={control}
                  currencies={
                    business?.availableCurrencies.map(
                      (currency) => currency.code
                    ) ?? []
                  }
                  byDefault={{
                    price: currentPrice?.price ?? 0,
                    codeCurrency: currentPrice?.codeCurrency!,
                  }}
                  systemPriceId={currentPrice?.priceSystemId}
                  disabled={product?.onSale}
                />
                {!product?.onSale && (
                  <p className="flex gap-2 text-xs mt-1 text-gray-500">
                    Última modificación:
                    <span className="font-semibold">
                      {formatCalendar(currentPrice?.updatedAt)}
                    </span>
                  </p>
                )}
                {product?.onSale && (
                  <div className="flex gap-5 items-center">
                    <span className="text-xs text-gray-600">
                      * Este producto está en oferta
                    </span>
                    <span className="text-xs text-gray-600 font-semibold">
                      {getPrice({product:product!}) as string}
                    </span>
                  </div>
                )}
              </div>
            )}

            {business?.priceSystems && business.priceSystems.length > 1 && (
              <GenericToggle
                changeState={setPriceSystem}
                currentState={priceSystem}
                title="Habilitar sistema de precios"
              />
            )}

            {priceSystem && (
              <div className="max-h-full overflow-auto scrollbar-none">
                {business?.priceSystems.map((item, idx) => (
                  <CurrencyInput
                    key={idx}
                    name={`prices.${idx}`}
                    label={`Precio de venta (${item.name})`}
                    control={control}
                    currencies={
                      business?.availableCurrencies.map(
                        (currency) => currency.code
                      ) ?? []
                    }
                    byDefault={{
                      price:
                        product?.prices.find(
                          (price) => price.priceSystemId === item.id
                        )?.price ?? 0,
                      codeCurrency:
                        product?.prices.find(
                          (price) => price.priceSystemId === item.id
                        )?.codeCurrency ?? "CUP",
                    }}
                    systemPriceId={item.id}
                    disabled={product?.onSale}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="absolute -bottom-[4.5rem] -right-[0.1rem] flex justify-end self-end py-5">
            <Button type="submit" name="Actualizar" color="slate-600" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sales_Price;
