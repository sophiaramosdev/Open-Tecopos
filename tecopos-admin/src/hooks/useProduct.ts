import bigDecimal from "js-big-decimal";
import {
  GenericPriceInterface,
  PricesInterface,
  ProductInterface,
} from "../interfaces/ServerInterfaces";
import { useAppSelector } from "../store/hooks";

interface GetPriceProps {
  product: ProductInterface;
  codeCurrency?: string;
  priceSystemId?: number;
  returnAsPrice?: boolean;
}
type GetPriceFunction = ({
  product,
  codeCurrency,
  priceSystemId,
  returnAsPrice,
}: GetPriceProps) => GenericPriceInterface | string;

interface GetProfitProps {
  product: ProductInterface;
  codeCurrency?: string;
  priceSystemId?: number;
  mode?: "percent" | "number" | "price";
}
type FormatPriceFunction = (
  price: GenericPriceInterface,
  setPrecision?: boolean
) => string;

type GetProfitFunction = ({
  product,
  codeCurrency,
  mode,
  priceSystemId,
}: GetProfitProps) => string | number;

type ConvertCurrencyFunction = (
  price: GenericPriceInterface,
  codeCurrency: string
) => GenericPriceInterface;

type GetMainPriceFunction = (
  product: ProductInterface,
  priceSystemId?: number
) => PricesInterface;

type GetCostFunction = ({
  product,
}: {
  product: ProductInterface;
  mode?: "price" | "number";
  setPrecision?: boolean;
}) => number | string;

const useProduct = () => {
  const { business } = useAppSelector((state) => state.init);
  const { availableCurrencies, mainCurrency, costCurrency, configurationsKey } =
    business!;
  const precision =
    Number(
      configurationsKey.find((item) => item.key === "precission_after_coma")
        ?.value
    ) ?? 2;

  const formatPrice: FormatPriceFunction = (price, setPrecision) => {
    const newPrice = new bigDecimal(price?.amount ?? price.price ?? 0);
    const currency = availableCurrencies.find(
      (currency) => currency.code === price.codeCurrency
    );

    let toReturn = newPrice
      .round(setPrecision ? precision : 2)
      .getPrettyValue();

    if (setPrecision) {
      const patron = /^([0-9]?[,0-9]+\.\d{2})([0-9]*[1-9]+)*(0+)$/g;
      toReturn = toReturn.replace(patron, "$1$2");
    }

    return `${toReturn} ${currency ? price.codeCurrency : mainCurrency}`;
  };

  const convertCurrency: ConvertCurrencyFunction = (price, codeCurrency) => {
    if (price.codeCurrency === codeCurrency) return price;

    let targetCurrency = availableCurrencies.find(
      (curr) => curr.code === codeCurrency
    );

    const key: keyof GenericPriceInterface = price.price !== undefined ? "price" : "amount";

    //verificar que la moneda especificada existe y esta configurada en el negocio
    if (!targetCurrency) {
      return price;
    }

    let priceInMainCurrency: GenericPriceInterface = price;
    //Get price in mainCurrency
    if (price.codeCurrency !== mainCurrency) {
      const priceAmount = new bigDecimal(price.price || price.amount);
      const currency = availableCurrencies.find(
        (curr) => curr.code === price.codeCurrency
      )!;
      const rate = new bigDecimal(currency?.exchangeRate);
      const amount = priceAmount.multiply(rate).getValue();
      priceInMainCurrency[key] = Number(amount);
      priceInMainCurrency.codeCurrency = mainCurrency;
    }

    if (codeCurrency === mainCurrency) {
      return {
        [key]: priceInMainCurrency[key],
        codeCurrency: priceInMainCurrency.codeCurrency,
      };
    }

    const targetPrice = Number(
      bigDecimal.divide(priceInMainCurrency[key], targetCurrency?.exchangeRate)
    );

    return { [key]: targetPrice, codeCurrency };
  };

  const getMainPrice: GetMainPriceFunction = (product, priceSystemId) => {
    let mainPrice = {
      ...product.prices.find((price) => price.isMain)!,
    };

    if (priceSystemId) {
      const idx = product.prices.findIndex(
        (price) => price.priceSystemId === priceSystemId
      );

      if (idx === -1) {
      } else {
        mainPrice = { ...product.prices[idx] };
      }
    }

    if (!!product?.onSale) {
      if (product.onSaleType === "percent") {
        const discountAmount = bigDecimal.multiply(
          mainPrice.price,
          product.onSaleDiscountAmount * 0.01
        );
        const priceAmount = bigDecimal.subtract(
          mainPrice.price,
          discountAmount
        );
        mainPrice.price = Number(priceAmount);
      } else if (product.onSaleType === "fixed") {
        mainPrice = {
          ...mainPrice,
          price: product.onSalePrice.amount,
          codeCurrency: product.onSalePrice.codeCurrency,
        };
      }
    }

    return mainPrice;
  };

  const getCost: GetCostFunction = ({
    product,
    mode = "price",
    setPrecision,
  }) => {
    const { type, averageCost, supplies, fixedCosts } = product;

    let cost = new bigDecimal(averageCost);

    if (
      ["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(type) &&
      (supplies?.length !== 0 || fixedCosts?.length !== 0)
    ) {
      const suppliesCost = new bigDecimal(
        supplies?.reduce(
          (total, value) => total + value.quantity * value.supply.averageCost,
          0
        )
      );

      const fixedCost = new bigDecimal(
        fixedCosts?.reduce((total, item) => total + item.costAmount, 0)
      );

      cost = suppliesCost.add(fixedCost);
    }

    const toReturn = Number(
      cost.round(setPrecision ? precision : 2).getValue()
    );

    return mode === "number"
      ? toReturn
      : formatPrice({ price: toReturn, codeCurrency: costCurrency! }, true);
  };

  const getPrice: GetPriceFunction = ({
    product,
    codeCurrency,
    priceSystemId,
    returnAsPrice,
  }) => {
    const mainPrice = getMainPrice(product, priceSystemId);

    if (!codeCurrency || mainPrice.codeCurrency === codeCurrency)
      return returnAsPrice
        ? { price: mainPrice.price, codeCurrency: mainPrice.codeCurrency }
        : formatPrice(mainPrice);

    const targetPrice = convertCurrency(mainPrice, codeCurrency);

    return returnAsPrice
      ? targetPrice
      : formatPrice({
          price: targetPrice.price,
          codeCurrency: targetPrice.codeCurrency,
        });
  };

  const getProfit: GetProfitFunction = ({
    product,
    codeCurrency,
    priceSystemId,
    mode = "number",
  }) => {
    if (!costCurrency) {
      console.error("Verifique que este configurada la moneda de costo");
      return 0;
    }

    const cost = new bigDecimal(getCost({ product, mode: "number" }) as number);
    const priceToCostCurrency = getPrice({
      product,
      codeCurrency: costCurrency,
      priceSystemId,
      returnAsPrice: true,
    });

    const price = new bigDecimal(
      (priceToCostCurrency as GenericPriceInterface).price
    );
    let profit = price.subtract(cost);
    let currency = costCurrency;

    if (codeCurrency && codeCurrency !== costCurrency) {
      const currentProfitValue = Number(profit.getValue());
      const profitToCurrency = convertCurrency(
        {
          price: currentProfitValue,
          codeCurrency: costCurrency,
        },
        codeCurrency
      ).price;

      profit = new bigDecimal(profitToCurrency);
      currency = codeCurrency;
    }

    switch (mode) {
      case "percent":
        return Number(cost.getValue()) !== 0
          ? Number(
              profit
                .divide(cost)
                .round(2)
                .multiply(new bigDecimal(100))
                .getValue()
            )
          : 100;
      case "price":
        return `${profit?.round(2).getPrettyValue()} ${currency}`;
      default:
        return Number(profit.round(2).getValue());
    }
  };

  return {
    convertCurrency,
    formatPrice,
    getCost,
    getPrice,
    getProfit,
  };
};

export default useProduct;
