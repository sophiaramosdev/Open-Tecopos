import moment from "moment";
import { SelectInterface } from "../interfaces/InterfacesLocal";
import FileSaver from "file-saver";
import { utils, write } from "sheetjs-style";
import bigDecimal from "js-big-decimal";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { daysOfTheWeek } from "./staticData";
import {
  AddressInterface,
  AvailableCurrency,
  ExchangeRatesInterface,
  SimplePrice,
} from "../interfaces/ServerInterfaces";
import { toast } from "react-toastify";

moment.defineLocale("es", {
  invalidDate: " -",
});

export const roundOneDecimals = (value: number) => {
  return Math.ceil(value * 10) / 10;
};

export const roundTwoDecimals = (value: number) => {
  return Math.ceil(value * 100) / 100;
};

export const roundFourDecimals = (value: number) => {
  return Math.round(value * 10000) / 10000;
};

export const getPercent = (part: number = 0, total: number = 1) => {
  const percent = (part / total) * 100;
  return roundTwoDecimals(percent);
};

export const truncateValue = (
  value: number | string,
  precission?: number | string
) => {
  if (!value) {
    return 0;
  }

  if (!precission) {
    return Number(value);
  }

  const array = value.toString().split(".");
  const decimalPart = array[1]?.substring(0, Number(precission) || 0) || "0";
  return Number([array[0], decimalPart].join("."));
};

export const mathOperation = (
  value1: number,
  value2: number,
  operation: "addition" | "subtraction" | "multiplication" | "division",
  precission?: number | string
): number => {
  try {
    //Limit number to precission
    const operator1 = new bigDecimal(truncateValue(value1, precission));
    const operator2 = new bigDecimal(truncateValue(value2 || 1, precission));

    let result;
    switch (operation) {
      case "addition":
        result = operator1.add(operator2);
        break;
      case "subtraction":
        result = operator1.subtract(operator2);
        break;
      case "division":
        result = operator1.divide(operator2);
        break;
      case "multiplication":
        result = operator1.multiply(operator2);
        break;
    }

    return Number(truncateValue(result.getValue(), precission));
  } catch (error: any) {
    return 0;
  }
};

export const validateEmail = (email: string | null) => {
  if (email) {
    return (
      email.match(
        /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/
      ) !== null || "Formato inválido"
    );
  }
  return true;
};

export const validateLength = (data: string) => {
  if (data.length < 14) {
    return false;
  } else {
    return true;
  }
};

export const generateUrlParams = (
  options?: Record<string, string | number | boolean | null>
) => {
  let list: string[] = [];
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (!value) continue;
      list.push(`${key}=${value}`);
    }
  }
  if (list.length !== 0) {
    return "?" + list.join("&");
  } else {
    return "";
  }
};

export const formatCurrency = (
  amount: number,
  currency?: string | null,
  precision: number = 2
) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "CUP",
    currencyDisplay: "code",
    maximumFractionDigits: precision,
  }).format(amount);
};

export const formatCurrencyV2 = (
  amount: number,
  currency?: string | null,
  precision: number = 2
) => {
  // Normalizar la moneda al formato "USD"
  const normalizedCurrency = currency ? currency.replace(/["\\]/g, "") : "USD";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: normalizedCurrency,
    currencyDisplay: "code",
    maximumFractionDigits: precision,
  }).format(amount);
};

//Funcion para mostrar el los valores sin Currency
export const formatCurrencyWithOutCurrency = (
  amount: number,
  currency?: string,
  precision: number = 2
) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "CUP",
    currencyDisplay: "code",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
    .formatToParts(amount)
    .filter((x) => x.type !== "currency")
    .map((x) => x.value)
    .join("")
    .trim();
};

export const cleanObj = (object: any, attributes: string[] = []) => {
  let newObj: any = {};
  const data = Object.entries(object);
  for (const [key, value] of data) {
    if (value !== undefined && !attributes.includes(key)) {
      newObj[key] = value;
    }
  }
  return newObj;
};

export const counterTimeAboutDate = (
  final_date: string,
  initial_date: string
) => {
  return initial_date ? moment(final_date).diff(initial_date, "d") : Infinity;
};

export const formatMaskAccount = (
  text: string,
  separator: string,
  countForSeparator: number
) => {
  return text !== "---"
    ? text
        ?.split("")
        .map((x, i) =>
          i > 0 && i % countForSeparator === 0 ? separator + x : x
        )
        .join("")
    : "---";
};

export const formatAddressAccount = (value: string, separator: string) => {
  if (value === undefined) {
    return "---";
  }

  let arr = value
    .split(" ")
    .map((x) => {
      if (x.match(/\b[0-9]+\b/g)) {
        return x.match(/.{1,4}/g)?.join(separator);
      } else {
        return x;
      }
    })
    .join(" ");

  return arr;
};

export const convert_positive = (a: number) => {
  if (a < 0) {
    a = a * -1;
  }
  return a;
};

export const create_array_number = (
  value_initial: number,
  value_final: number
) => {
  let results: SelectInterface[] = [];

  for (let i = value_initial; i <= value_final; i++) {
    results.push({
      id: i,
      name: i.toString(),
    });
  }

  return results;
};

export const getTimeArray = () => {
  const minutesInDay = 1440;
  const timeBlocksArr = [{ id: "0", name: "12:00 am" }];

  for (let i = 60; i <= minutesInDay - 60; i += 60) {
    const halfHourInLoop = i / 60;

    let formattedBlock = String(halfHourInLoop);
    const hour = formattedBlock.split(".")[0];
    const minute = 0; /* i % 60 === 0 ? '00' : '30' */
    formattedBlock = `${hour}`; /* :${minute} */

    let ampm = Number(hour) >= 12 ? "pm" : "am";

    const today = new Date();
    const timeString = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      Number(hour),
      Number(minute)
    );

    timeBlocksArr.push({
      id: formattedBlock,
      name: `${timeString.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} ${ampm}`,
    });
  }

  return timeBlocksArr;
};

export const getMaxValue = (current: number = 0) => {
  let max: number = current;
  let pow = 1;
  while (max / 10 ** pow > 10) pow += 1;
  let resp: number;
  resp = Math.ceil((max * 1.1) / 10 ** (pow - 1)) * 10 ** (pow - 1);
  return resp;
};

export const prettyNumber = (current: number = 0) => {
  if (Math.abs(current / 10 ** 6) >= 1)
    return `${(current / 10 ** 6).toFixed(1)}M`;
  if (Math.abs(current / 10 ** 3) >= 1)
    return `${(current / 10 ** 3).toFixed(1)}k`;
  return current;
};

export const exportExcel = async (
  data: Record<string, string | number | string[]>[],
  fileName: string
) => {

  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });


  const dataWithAllKeys = data.map(row => {
    const rowWithAllKeys: Record<string, string | number | string[]> = {};
    allKeys.forEach(key => {
      rowWithAllKeys[key] = row[key]!== undefined? row[key] : "";
    });
    return rowWithAllKeys;
  });

  const ws = utils.json_to_sheet(dataWithAllKeys);

  let colWidth: { wch: number }[] = [];
  dataWithAllKeys.forEach((row, idx) => {
    const cols = Object.entries(row);
    for (let index = 0; index < cols.length; index++) {
      const headerIndex = utils.encode_cell({ r: 0, c: index });
      ws[headerIndex].s = {
        font: { bold: true },
        alignment: { horizontal: index === 0 ? "left" : "center" },
      };
      const body_index = utils.encode_cell({ r: idx + 1, c: index });
      ws[body_index].s = {
        alignment: { horizontal: index === 0 ? "left" : "center" },
      };
      if (typeof cols[index][1] === "number") {
        ws[body_index].t = "n";
      }
      if (idx === 0) {
        colWidth.push({ wch: cols[index][0]?.toString().length });
      } else {
        const wch: number = cols[index][1]?.toString().length;
        if (wch > colWidth[index]?.wch) {
          colWidth.splice(index, 1, { wch });
        }
      }
    }
  });
  ws["!cols"] = colWidth;
  const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
  const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
  const excelData = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  FileSaver.saveAs(excelData, fileName + ".xlsx");
};

const WeekDay = (day: number) => {
  switch (day) {
    case 1:
      return "Lunes";

    case 2:
      return "Martes";

    case 3:
      return "Miércoles";

    case 4:
      return "Jueves";

    case 5:
      return "Viernes";

    case 6:
      return "Sábado";

    case 7:
      return "Domingo";

    default:
      return "";
  }
};

export const formatDate = (date_initial: string) => {
  const date_actual = moment().format("YYYY-MM-DD");
  const date_initial_mod = moment(date_initial).format("YYYY-MM-DD");

  const month_i = moment().month();
  const year_i = moment().year();

  const month_f = moment(date_initial).month();
  const year_f = moment(date_initial).year();

  const date = moment().diff(date_initial, "days");
  const date_after = moment(date_actual).diff(date_initial_mod, "day");

  if (date_after === -1) {
    return moment(date_initial).format("[Mañana a las] hh:mm A");
  }

  if (date === 0) {
    if (date_actual === date_initial_mod) {
      return `Hoy, ${moment(date_initial).format("hh:mm A")}, ${moment(
        date_initial
      ).fromNow()}`;
    } else {
      return `Ayer, ${moment(date_initial).format("hh:mm A")}, ${moment(
        date_initial
      ).fromNow()}`;
    }
  }

  if (date >= 1 && date <= 7) {
    return `${WeekDay(moment(date_initial).isoWeekday())} ${moment(
      date_initial
    ).format("DD, [de] MMM hh:mm A")} `;
  }

  if (month_i === month_f) {
    return `${WeekDay(moment(date_initial).isoWeekday())} ${moment(
      date_initial
    ).format("DD, hh:mm A")}`;
  } else {
    if (year_i === year_f) {
      return `${moment(date_initial).format("DD [de] MMMM, hh:mm A")}`;
    } else {
      return moment(date_initial).format("DD [de] MMMM [de] YYYY hh:mm A");
    }
  }
};

export const formatDateWihtoutYear = (date_initial: string) => {
  const date_actual = moment().format("YYYY-MM-DD");
  const date_initial_mod = moment(date_initial).format("YYYY-MM-DD");

  const month_i = moment().month();
  const year_i = moment().year();

  const month_f = moment(date_initial).month();
  const year_f = moment(date_initial).year();

  const date = moment().diff(date_initial, "days");
  const date_after = moment(date_actual).diff(date_initial_mod, "day");

  if (date_after === -1) {
    return moment(date_initial).format("[Mañana a las] hh:mm A");
  }

  if (date === 0) {
    if (date_actual === date_initial_mod) {
      return `Hoy, ${moment(date_initial).format("hh:mm A")}, ${moment(
        date_initial
      ).fromNow()}`;
    } else {
      return `Ayer, ${moment(date_initial).format("hh:mm A")}, ${moment(
        date_initial
      ).fromNow()}`;
    }
  }

  if (date >= 1 && date <= 7) {
    return `${WeekDay(moment(date_initial).isoWeekday())} ${moment(
      date_initial
    ).format("DD, [de] MMM hh:mm A")} `;
  }

  if (month_i === month_f) {
    return `${WeekDay(moment(date_initial).isoWeekday())} ${moment(
      date_initial
    ).format("DD, hh:mm A")}`;
  } else {
    if (year_i === year_f) {
      // Cambio en esta parte para excluir el año
      return `${moment(date_initial).format("DD [de] MMMM, hh:mm A")}`;
    } else {
      // Cambio en esta parte para excluir el año
      return moment(date_initial).format("DD [de] MMMM [de] hh:mm A");
    }
  }
};

export function formatDateForReports(dateString: string): string {
  const date = moment(dateString);
  return date.format("DD-MMM").toLowerCase();
}

export function formatDateForReportsWithYear(dateString: string): string {
  const date = moment(dateString);
  return date.format("DD-MMM-YYYY").toLowerCase();
}

export function formatDateForReportsWithYearAndHour(
  dateString: string
): string {
  const date = moment(dateString);
  return date.format("YYYY-MMM-DD, hh:mm A").toLowerCase();
}

export const formatDateHours = (value: string) => {
  if (moment(value).isValid()) {
    return moment(value).format("hh:mm A");
  }
  return value;
};

export function formatDateForTable(fecha: string): string {
  const fechaFormateada = moment(fecha).format("DD MMM h:mm A");
  return fechaFormateada;
}

export const formatCalendarDetailsOrderWithoutHour = (
  date?: string | null,
  article?: boolean
) => {
  const momentDate = moment(date).utc(); // Parsear la fecha como UTC
  const todayObj = moment().toObject();

  const diffYear = Math.abs(momentDate.year() - todayObj.years);
  const diffMonth = Math.abs(momentDate.month() - todayObj.months);
  const diffDay = momentDate.date() - todayObj.date;

  if (date) {
    if (diffYear === 0) {
      if (diffMonth === 0) {
        if (diffDay === 1) return momentDate.format("[Mañana]");
        if (diffDay === 0) return momentDate.format("[Hoy]");
        if (diffDay === -1) return momentDate.format("[Ayer]");
      }
      return momentDate.format(`${article ? "[el]" : ""} D [de] MMM`);
    }
    return momentDate.format(`${article ? "[el]" : ""} DD/MM/YYYY`);
  }
  return "-";
};

export const formatCalendar = (date?: string | null, article?: boolean) => {
  const dateObj = moment(date).toObject();
  const todayObj = moment().toObject();

  const diffYear = Math.abs(dateObj.years - todayObj.years);
  const diffMonth = Math.abs(dateObj.months - todayObj.months);
  const diffDay = dateObj.date - todayObj.date;

  if (date) {
    if (diffYear === 0) {
      if (diffMonth === 0) {
        if (diffDay === 1) return moment(date).format("[Mañana a las] hh:mm A");
        if (diffDay === 0) return moment(date).format("[Hoy a las] hh:mm A");
        if (diffDay === -1) return moment(date).format("[Ayer a las] hh:mm A");
      }
      return moment(date).format(
        `${article ? "[el]" : ""} D [de] MMM [a las] hh:mm A`
      );
    }
    return moment(date).format(
      `${article ? "[el]" : ""} DD/MM/YYYY${
        article ? " [a las]" : "[,]"
      } hh:mm A`
    );
  }
  return "-";
};

export const address_complete = (
  street: string,
  locality: string,
  municipality: string
) => {
  const addrees: string[] = [];

  if (street) {
    addrees.push(street);
  }
  if (locality) {
    addrees.push(locality);
  }
  if (municipality) {
    addrees.push(municipality);
  }

  if (addrees.length > 0) return addrees.join(", ");
  else return "---";
};

export const validateUserChar = (user: string) => {
  if (user) {
    return user.match(/^[A-Za-z0-9_\-.]{1,}$/) !== null;
  }
  return true;
};

export const calculateAmountTotalOfDifferentCurrencies = (
  amounts: Array<{ amount: number; codeCurrency: string }>
) => {
  const totals = amounts.reduce(
    (
      acc: Record<string, number>,
      curr: { amount: number; codeCurrency: string }
    ) => {
      acc[curr.codeCurrency] = (acc[curr.codeCurrency] || 0) + curr.amount;
      return acc;
    },
    {}
  );

  return Object.keys(totals).map((currency) => {
    return { codeCurrency: currency, amount: totals[currency] };
  });
};

export const cleanObject = (obj: Record<string, any>, elements: string[]) => {
  const objToArray = Object.entries(obj).filter(
    (itm) => !elements.includes(itm[0])
  );
  return Object.fromEntries(objToArray);
};

export const groupBy = (obj: Array<Record<any, any>>, key: string) => {
  return obj.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

export const generatePdf = (component: React.ReactElement, name?: string) =>
  pdf(component)
    .toBlob()
    .then((resp: Blob) => {
      const url = URL.createObjectURL(resp);
      saveAs(url, name ? `${name}.pdf` : "Document.pdf");
    });

export const printPdf = (component: React.ReactElement, name?: string) =>
  pdf(component)
    .toBlob()
    .then((resp: Blob) => {
      const url = URL.createObjectURL(resp);

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe?.contentWindow?.print();
    });

type Order = {
  codeCurrency: string;
  amount: number;
};

type Tips = {
  amount: number;
  codeCurrency: string;
};

type OrderData = {
  totalOrdersManaged: Order[];
  tips: Tips;
  realToPay: Tips;
};

// Función para sumar los valores de 'tips' con el mismo 'codeCurrency'
export function sumTipsByCurrency(data: OrderData[]): Order[] {
  const tipsMap: { [key: string]: number } = {};

  data.forEach((item) => {
    if (tipsMap[item.tips.codeCurrency]) {
      tipsMap[item.tips.codeCurrency] += item.tips.amount;
    } else {
      tipsMap[item.tips.codeCurrency] = item.tips.amount;
    }
  });

  return Object.keys(tipsMap).map((codeCurrency) => ({
    codeCurrency,
    amount: tipsMap[codeCurrency],
  }));
}

export function sumRealToPay(data: OrderData[]): Order[] {
  const tipsMap: { [key: string]: number } = {};

  data.forEach((item) => {
    if (tipsMap[item.tips.codeCurrency]) {
      tipsMap[item.tips.codeCurrency] += item.realToPay.amount;
    } else {
      tipsMap[item.tips.codeCurrency] = item.realToPay.amount;
    }
  });

  return Object.keys(tipsMap).map((codeCurrency) => ({
    codeCurrency,
    amount: tipsMap[codeCurrency],
  }));
}

type CurrencyAmount = {
  amount: number;
  codeCurrency: string;
};

export function sumCurrencyAmounts(arr: CurrencyAmount[]): CurrencyAmount[] {
  const result: { [key: string]: number } = {};

  arr.forEach((item) => {
    if (result[item.codeCurrency]) {
      result[item.codeCurrency] += item.amount;
    } else {
      result[item.codeCurrency] = item.amount;
    }
  });

  return Object.keys(result).map((codeCurrency) => ({
    amount: result[codeCurrency],
    codeCurrency,
  }));
}

export function sumTotalByCurrencyArray(
  transactionArray: CurrencyAmount[][]
): CurrencyAmount[] {
  const currencyMap: { [key: string]: number } = {};

  transactionArray.forEach((transactionGroup) => {
    transactionGroup.forEach((transaction) => {
      if (currencyMap[transaction.codeCurrency]) {
        currencyMap[transaction.codeCurrency] += transaction.amount;
      } else {
        currencyMap[transaction.codeCurrency] = transaction.amount;
      }
    });
  });

  return Object.keys(currencyMap).map((codeCurrency) => ({
    codeCurrency,
    amount: currencyMap[codeCurrency],
  }));
}

export function convertArrayToString(arr: number[]): string {
  return arr.join(",");
}

export function convertStringToArray(inputString: string): any {
  return inputString.split(",").map(Number);
}

export const getDaysByIds = (ids: any): { name: string; id: number }[] => {
  const result = ids.map((idx: number) => {
    return daysOfTheWeek.find((day) => day.id === idx);
  });

  // Filtrar resultados para eliminar valores indefinidos
  return result.filter((day: undefined) => day !== undefined) as {
    name: string;
    id: number;
  }[];
};

export const exchangeCurrency = (
  fromPrice: SimplePrice,
  toCurrency: string,
  availableCurrencies: AvailableCurrency[],
  mode?: "oficial" | "sale"
): SimplePrice | null => {
  if (availableCurrencies.length > 0) {
    const mainCurrency = availableCurrencies.find(
      (item: { isMain: any }) => item.isMain
    )!;

    try {
      const transformMode = mode ? mode : "sale";

      //1. Analyze if from is same toCurrency
      if (fromPrice.codeCurrency === toCurrency) {
        return fromPrice;
      }
      //2. If exchange is in the oposite from main currency
      if (
        (mainCurrency?.currency?.code ?? mainCurrency?.code) ===
        fromPrice.codeCurrency
      ) {
        const currency = availableCurrencies.find(
          (item: { currency: { code: string }; code?: string }) =>
            (item?.currency?.code ?? item?.code) === toCurrency
        );

        let exchangeRate: number = currency?.exchangeRate ?? 1;
        if (transformMode === "oficial") {
          exchangeRate = currency!.oficialExchangeRate;
        }

        const priceReturn = mathOperation(
          fromPrice.amount,
          exchangeRate,
          "division",
          15
        );

        return {
          amount: priceReturn,
          codeCurrency: toCurrency,
        };
      }

      //3. If currencies from and to has no direct convertibility or currency from is main currency
      const currencyFrom = availableCurrencies.find(
        (item: { currency: { code: string }; code?: string }) =>
          (item?.currency?.code ?? item?.code) === fromPrice.codeCurrency
      );

      let exchangeRateFrom = currencyFrom?.exchangeRate || 1;
      if (transformMode === "oficial") {
        exchangeRateFrom =
          currencyFrom?.oficialExchangeRate || exchangeRateFrom;
      }

      const priceFrom = mathOperation(
        fromPrice.amount,
        exchangeRateFrom,
        "multiplication",
        15
      );

      const currencyTo = availableCurrencies.find(
        (item: { currency: { code: string }; code?: string }) =>
          (item?.currency?.code ?? item?.code) === toCurrency
      );

      let exchangeRateTo = currencyTo?.exchangeRate;
      if (transformMode === "oficial") {
        exchangeRateTo = currencyTo?.oficialExchangeRate || exchangeRateTo;
      }

      const priceReturn = mathOperation(
        priceFrom,
        exchangeRateTo || 1,
        "division",
        15
      );

      return {
        amount: priceReturn,
        codeCurrency: toCurrency,
      };
    } catch (error: any) {
      toast.error(
        "Ha ocurrido un error mientras se convertía a una tasa de cambio"
      );

      return null;
    }
  } else {
    return null;
  }
};

export const transformAmountCurrencysArray = (
  Array: number[] | undefined,
  fromPrice: string | undefined,
  toPrice: string | undefined,
  allCurrencies: AvailableCurrency[]
) => {
  if (allCurrencies.length > 0) {
    return Array?.map((item) => {
      return exchangeCurrency(
        {
          amount: item,
          codeCurrency: fromPrice!,
        },
        toPrice! ?? "CUP",
        allCurrencies.filter((currency) => currency.isActive)
      )?.amount;
    });
  }
};

export const convertCurrency: (
  quantity: number,
  rate: number,
  isMain: boolean
) => number = (quantity, rate, isMain) => {
  if (isMain) {
    return quantity / rate;
  } else {
    return quantity * rate;
  }
};

export function calculatePercentage(
  PreviousFact: number,
  ActualFact: number
): number {
  // Calcula la diferencia entre los datos
  const diferencia = ActualFact - PreviousFact;

  // Calcula el porcentaje
  const porcentaje = ((diferencia / Math.abs(PreviousFact)) * 100).toFixed(3);

  return parseFloat(porcentaje);
}

export function increaseInTenPercent(numero: number): number {
  const incremento = numero * 0.1;
  return numero + incremento;
}

export function decreaseInTenPercent(numero: number): number {
  const incremento = numero * 0.1;
  return numero - incremento;
}

export const getElToqueDate = (dateFrom: boolean): string => {
  // Obtener la fecha actual
  const currentDate = moment();

  // Formatear la fecha como "YYYY-MM-DD 00:00:01" o "YYYY-MM-DD 23:59:01"
  const formattedDate = currentDate
    .startOf("day")
    .add(1, "second")
    .format(`${dateFrom ? "YYYY-MM-DD 00:00:01" : "YYYY-MM-DD 23:59:01"}`);

  return formattedDate;
};

interface CurrencyObject {
  amount: number;
  codeCurrency: string;
}

export function sumarMontos(arreglo: CurrencyObject[]): number {
  return arreglo.reduce((total, obj) => total + obj.amount, 0);
}

export function sumarMontosArr(arr: any[][]) {
  let suma = 0;

  arr.forEach((subArr: any[]) => {
    subArr.forEach((obj) => {
      if (obj.codeCurrency === "CUP") {
        suma += obj.amount;
      }
    });
  });

  if (suma > 0) {
    return suma;
  } else {
    return "";
  }
}

export const colorFunction = (count: number): string[] => {
  const randomColor = (): string =>
    `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  const isDarkColor = (color: string): boolean => {
    // Convertir el color a HSL para obtener la luminosidad
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Puedes ajustar este umbral según tus necesidades
    const darkThreshold = 0.5;

    return luminance < darkThreshold;
  };

  const colors: string[] = [];

  while (colors.length < count) {
    const newColor = randomColor();
    if (
      newColor !== "#000000" &&
      newColor !== "#FFFFFF" &&
      !isDarkColor(newColor) &&
      !colors.some((color) => isSimilarColor(color, newColor))
    ) {
      colors.push(newColor);
    }
  }

  return colors;
};

const isSimilarColor = (color1: string, color2: string): boolean => {
  const threshold = 50; // Puedes ajustar este umbral según tus necesidades

  const getColorDifference = (c1: number, c2: number): number =>
    Math.abs(c1 - c2);

  const rgb1 = parseInt(color1.slice(1), 16);
  const rgb2 = parseInt(color2.slice(1), 16);

  const r1 = (rgb1 >> 16) & 0xff;
  const g1 = (rgb1 >> 8) & 0xff;
  const b1 = (rgb1 >> 0) & 0xff;

  const r2 = (rgb2 >> 16) & 0xff;
  const g2 = (rgb2 >> 8) & 0xff;
  const b2 = (rgb2 >> 0) & 0xff;

  const diffR = getColorDifference(r1, r2);
  const diffG = getColorDifference(g1, g2);
  const diffB = getColorDifference(b1, b2);

  return diffR < threshold && diffG < threshold && diffB < threshold;
};

// Función para encontrar el objeto con la propiedad exchangeRate
export function findExchangeRateObject(
  arr: any[]
): ExchangeRatesInterface | null {
  for (const obj of arr) {
    if ("exchange_rates" in obj) {
      return obj as ExchangeRatesInterface;
    }
  }
  return null;
}

export function getDaysDifference(date1: string, date2: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000; // Cantidad de milisegundos en un día

  const date1Obj = new Date(date1);
  const date2Obj = new Date(date2);

  // Convertimos las fechas a milisegundos y las restamos para obtener la diferencia
  const differenceMilliseconds = date2Obj.getTime() - date1Obj.getTime();

  // Convertimos la diferencia de milisegundos a días
  const differenceDays = Math.round(
    differenceMilliseconds / millisecondsPerDay
  );

  return differenceDays;
}

export function printTicketPrice(price: number | undefined) {
  if (!price) {
    return "0.00";
  }

  if (typeof price === "string" && !isNaN(price)) {
    return Number(price).toFixed(2);
  }

  return price?.toFixed(2) || "";
}

export const getShortName = (
  value: string,
  paperDimension: number,
  fullPage?: boolean
) => {
  let breaker = fullPage ? 32 : 17;

  if (paperDimension === 80) {
    breaker = fullPage ? 40 : 25;
  }

  const rounds = Math.ceil(value.length / breaker);

  let newValue = [];
  for (let index = 0; index < rounds; index++) {
    newValue.push(
      `${value.substring(index * breaker, breaker * index + breaker)}`
    );
  }

  if (value.length > breaker) {
    return newValue.join("\n");
  }

  return value;
};

export const getFullAddress = (address: AddressInterface) => {
  if (!address) return "";

  let to_return = "";

  if (address.street) {
    to_return += address.street;
  }

  if (address.locality) {
    to_return += address.locality;

    if (address.municipality || address.province || address.country) {
      to_return += ", ";
    }
  }

  if (address.municipality) {
    to_return += address.municipality.name + " ";
  }

  if (address.province) {
    to_return += address.province.name + ". ";
  }

  if (address.country) {
    to_return += address.country.name;
  }

  if (address.postalCode) {
    to_return += "(" + address.postalCode + ")";
  }

  return to_return;
};

export const getDayName = (dayNumber: number): string => {
  switch (dayNumber) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    default:
      return "";
  }
};

export const getDayNumber = (dayName: string): number => {
  switch (dayName.toLowerCase()) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    default:
      return -1;
  }
};

export const formatDateR = (date: string, hours: boolean = false) => {
  if (hours) {
    return moment(date).format("DD/MM/YYYY hh:mm");
  } else {
    return moment(date).format("DD/MM/YYYY");
  }
};

export const deleteUndefinedAttr = (object: any) => {
  let newObj: any = {};
  const data = Object.entries(object);
  for (const [key, value] of data) {
    if (value !== undefined) {
      newObj[key] = value;
    }
  }
  return newObj;
};
