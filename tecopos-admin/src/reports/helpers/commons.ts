import { CurrencyInterface } from '../../interfaces/ServerInterfaces';

export const getMaxSizeOfStrings = (strings: Array<string>) => {
  return Math.max(...strings.map((el) => el.length));
};

// @ts-ignore
export const cleanObjectData = (data) => {
  for (let key in data) {
    if (!data[key]) {
      delete data[key];
    }
  }
  return data;
};

export const cleanArrayData = (data: Array<any>) =>
  data.filter((value) => {
    return !!value;
  });

export const countObjects = (
  arr: Array<Array<string> | Record<string, string>>
) => {
  let arrayTotal = 0;
  let objectTotal = 0;
  for (const value of arr) {
    if (Array.isArray(value)) {
      arrayTotal++;
    } else {
      objectTotal++;
    }
  }
  return { arrayTotal, objectTotal };
};

export const colorByAmount = (amount: number) => {
  switch (Math.sign(amount)) {
    case -1:
      return 'negative';
    case 1:
      return 'positive';
    default:
      return 'zero';
  }
};

export const calculatePercent = (
  amount: number,
  total: number,
  amountCurrency: string,
  totalCurrency: string,
  availableCurrencies = Array<CurrencyInterface>
) => {
  const mainCurrencyAmount =
    totalCurrency === amountCurrency
      ? amount
      : amount *
          //@ts-ignore
          availableCurrencies.find(
            (currency: { code: any }) => currency.code === amountCurrency
          )?.exchangeRate || 1;

  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(
    //@ts-ignore
    mainCurrencyAmount / total
  );
};

export const blobToDataURL = async (blob: Blob) => {
  const promise = new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        resolve(e.target?.result!);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });

  const dataurl = await promise;
  return dataurl;
};
