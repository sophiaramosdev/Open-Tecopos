import moment from "moment";
import { SelectInterface } from "../interfaces/localInterfaces";



moment.defineLocale("es", {
  invalidDate: " -",
});


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



