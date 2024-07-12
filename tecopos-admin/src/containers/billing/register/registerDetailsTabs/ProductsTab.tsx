import React, { useContext } from "react";
import { RegisterDetailsContext } from "../RegisterDetailsContainer";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { formatCurrency, truncateValue } from "../../../../utils/helpers";
import {
  PriceInvoiceInterface,
  SimplePrice,
} from "../../../../interfaces/ServerInterfaces";
import ImageComponent from "../../../../components/misc/Images/Image";
import { TooltipG } from "../AllRegistersList";

export const ProductsTab = () => {
  const { order } = useContext(RegisterDetailsContext);

  // ===========================
  //Products Table-----------------------------------------------------
  const tableTitles = ["Nombre", "Cantidad", "Precio unitario", "Precio total"];
  const tableData: DataTableInterface[] =
    order?.selledProducts?.map((item) => {
      return {
        rowId: item?.id,
        payload: {
          Nombre: (
            <article className="flex flex-col">
              <div className="inline-flex gap-2 items-center">
                <ImageComponent
                  src={item?.image?.src}
                  hash={item?.image?.blurHash}
                  className="h-10 w-10 rounded-lg overflow-hidden"
                />
                <div className="flex flex-col">
                  <p>{item?.name}</p>
                  {item?.variation && (
                    <p className="text-xs text-gray-400">
                      {item?.variation?.name}
                    </p>
                  )}
                  {item?.observations && (
                    <p className="opacity-80 text-slate-500 mt-2">
                      {item?.observations}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ),
          Cantidad: item.quantity,
          "Precio unitario": (
            <TooltipG
              content={`${item.modifiedPrice ? "Precio modificado" : ""}`}
              anchorSelect="modifiedPrice"
            >
              <span
                className={`${item.modifiedPrice ? "text-yellow-500" : ""}`}
              >
                {formatCurrency(
                  item?.priceUnitary?.amount,
                  item?.priceUnitary?.codeCurrency
                )}
              </span>
            </TooltipG>
          ),
          "Precio total": formatCurrency(
            item?.priceUnitary?.amount * item?.quantity,
            item?.priceTotal?.codeCurrency
          ),
        },
      };
    }) ?? [];

  const rowTotals: {
    name: string;
    amount: string | PriceInvoiceInterface | PriceInvoiceInterface[];
    color?: string;
    prefix?: string;
  }[] = [];

  if (order?.prices.length! > 0) {
    rowTotals.push({
      name: `${
        order?.discount! > 0 || order?.commission! > 0 ? "Importe" : "Subtotal"
      }`,
      amount:
        order?.prices?.map((itm) => ({
          amount: itm?.price,
          codeCurrency: itm?.codeCurrency,
        })) ?? [],
    });
  } else {
    let subtotal: Array<{ amount: number; codeCurrency: string }> = [];

    order?.selledProducts.forEach((prod) => {
      if (
        subtotal.find(
          (elem) =>
            elem.codeCurrency ===
            (prod.priceUnitary !== null
              ? prod.priceUnitary?.codeCurrency
              : prod.priceTotal.codeCurrency)
        )
      ) {
        subtotal = subtotal.map((item) => {
          if (
            item.codeCurrency ===
            (prod.priceUnitary !== null
              ? prod.priceUnitary?.codeCurrency
              : prod.priceTotal.codeCurrency)
          ) {
            return {
              codeCurrency: item.codeCurrency,
              amount:
                (prod.priceUnitary !== null
                  ? prod.priceUnitary?.amount * prod.quantity
                  : prod.priceTotal.amount) + item.amount,
            };
          } else {
            return item;
          }
        });
      } else {
        subtotal.push({
          amount:
            prod.priceUnitary !== null
              ? prod.priceUnitary?.amount * prod.quantity
              : prod.priceTotal.amount,
          codeCurrency:
            prod.priceUnitary !== null
              ? prod.priceUnitary?.codeCurrency
              : prod.priceTotal.codeCurrency,
        });
      }
    });

    rowTotals.push({
      name: `${
        order?.discount! > 0 || order?.commission! > 0 ? "Importe" : "Subtotal"
      }`,
      amount:
        subtotal?.map((itm) => ({
          amount: itm?.amount,
          codeCurrency: itm?.codeCurrency,
        })) ?? [],
    });
  }

  if (order?.shippingPrice)
    rowTotals.push({
      name: "Costo de envío",
      amount: order?.shippingPrice,
      color: "text-green-500",
    });

  if (order?.taxes)
    rowTotals.push({
      name: "Impuestos",
      amount: order?.taxes,
      color: "text-green-500",
    });

  const discount: PriceInvoiceInterface[] = [];
  if (order?.couponDiscountPrice || order?.discount !== 0) {
    if (order?.couponDiscountPrice) discount.push(order?.couponDiscountPrice);
    if (order?.discount !== 0) {
      order?.prices.forEach((item) => {
        const amount = (order.discount / 100) * item.price;
        const idx = discount.findIndex(
          (elem) => elem.codeCurrency === item.codeCurrency
        );
        if (idx !== -1) {
          discount.splice(idx, 1, {
            ...discount[idx],
            amount: discount[idx].amount + amount,
          });
        } else {
          discount.push({ amount: amount, codeCurrency: item.codeCurrency });
        }
      });
    }
    rowTotals.push({
      name: "Descuentos",
      amount: discount,
      //color: "text-red-400",
      prefix: "-",
    });
  }

  const comission: PriceInvoiceInterface[] = [];
  if (order?.commission! > 0) {
    order?.prices.forEach((item) => {
      const amount = (order.commission / 100) * item.price;
      const idx = comission.findIndex(
        (elem) => elem.codeCurrency === item.codeCurrency
      );
      if (idx !== -1) {
        comission.splice(idx, 1, {
          ...comission[idx],
          amount: comission[idx]?.amount + amount,
        });
      } else {
        comission.push({ amount: amount, codeCurrency: item.codeCurrency });
      }
    });

    rowTotals.push({
      name: "Comisiones",
      // amount: `${truncateValue(comission[0].amount, 2)} ${
      //   discount[0].codeCurrency
      // }`,
      amount: comission,
      //color: "text-green-500",
    });
  }

  function sumarPriceInvoices(
    ...priceInvoices: (PriceInvoiceInterface | PriceInvoiceInterface[])[]
  ): PriceInvoiceInterface[] {
    const combined: { [key: string]: number } = {};

    // Sumar los valores de los objetos individuales
    for (const invoice of priceInvoices) {
      if (invoice !== null && invoice !== undefined) {
        if (Array.isArray(invoice)) {
          for (const item of invoice) {
            if (item && item.codeCurrency) {
              if (invoice === discount) {
                combined[item.codeCurrency] =
                  (combined[item.codeCurrency] || 0) - item.amount;
              } else {
                combined[item.codeCurrency] =
                  (combined[item.codeCurrency] || 0) + item.amount;
              }
            }
          }
        } else {
          if (invoice.codeCurrency) {
            combined[invoice.codeCurrency] =
              (combined[invoice.codeCurrency] || 0) + invoice.amount;
          }
        }
      }
    }

    // Convertir el objeto combinado en un arreglo de PriceInvoiceInterface
    const result: PriceInvoiceInterface[] = [];
    for (const codeCurrency in combined) {
      if (combined.hasOwnProperty(codeCurrency)) {
        result.push({ amount: combined[codeCurrency], codeCurrency });
      }
    }

    return result;
  }

  if (
    order?.couponDiscountPrice ||
    order?.discount !== 0 ||
    order?.commission! > 0 ||
    order?.shippingPrice ||
    order?.taxes
  ) {
    const result = sumarPriceInvoices(
      discount,
      comission,
      order?.taxes!,
      order?.shippingPrice!
    );

    rowTotals.push({
      name: "Subtotal",
      amount:
        order?.prices?.map((itm) => ({
          amount: result.find((elem) => elem.codeCurrency === itm.codeCurrency)
            ? itm.price +
              result?.find((elem) => elem.codeCurrency === itm.codeCurrency)
                ?.amount!
            : itm.price,
          codeCurrency: itm?.codeCurrency,
        })) ?? [],
    });
  }

  if ((order?.orderModifiers?.length || 0) > 0) {
    order?.orderModifiers?.forEach((elem) => {
      rowTotals.push({
        name: elem.showName,
        // amount: order?.orderModifiers ?? [],
        amount: {
          amount: elem.amount,
          codeCurrency: elem.codeCurrency,
        },
      });
    });
  }

  if (order?.status !== "BILLED") {
    rowTotals.push({
      name: "Total",
      amount: order?.totalToPay ?? [],
    });
  }
  if (order?.paymentGateway) {
    rowTotals.push({
      name: "Pasarela de pago",
      amount: order.paymentGateway.name,
    });
  }

  const totalPartialPay: SimplePrice[] = [];
  //if (order?.status !== "BILLED") {
  if (order?.partialPayments && order?.partialPayments?.length > 0) {
    for (const item of order?.partialPayments) {
      const found = totalPartialPay.find(
        (data) => data.codeCurrency === item.codeCurrency
      );

      if (found) {
        found.amount += item.amount;
      } else {
        totalPartialPay.push({
          amount: item.amount,
          codeCurrency: item.codeCurrency,
        });
      }
    }
  }
  // }

  if (totalPartialPay.length > 0) {
    rowTotals.push({
      name: "Total Pagado",
      amount: totalPartialPay,
    });
  }
  if (order?.amountReturned) {
    rowTotals.push({
      name: "Cambio",
      amount: [order?.amountReturned],
    });
  }

  const rowTotal = {
    rowId: "totals",
    payload: {
      Nombre: "",
      Cantidad: "",
      "Precio unitario": (
        <div className="flex flex-col gap-y-1">
          {rowTotals.map((title, idx) => {
            if (Array.isArray(title.amount)) {
              return title.amount.map((_, ix) => (
                <div key={ix} className="p-0 h-4 font-semibold text-right">
                  {ix === 0 ? title?.name : ""}
                </div>
              ));
            } else {
              return (
                <p key={idx} className="p-0 h-4 font-semibold text-right">
                  {title?.name}
                </p>
              );
            }
          })}
        </div>
      ),
      "Precio total": (
        <div className="flex flex-col gap-y-1">
          {rowTotals.map((item, idx) => {
            if (Array.isArray(item.amount)) {
              return item.amount.map((elem, ix) => (
                <div
                  className={`${
                    item.color ?? ""
                  } flex flex-col items-start justify-start`}
                >
                  <div key={ix} className="p-0 h-4 font-semibold text-left">
                    {item?.prefix ?? ""}
                    {formatCurrency(elem.amount, elem.codeCurrency)}
                  </div>
                </div>
              ));
            } else if (typeof item.amount === "string") {
              return (
                <p
                  key={idx}
                  className={`${
                    item.color ?? ""
                  } p-0 h-4 font-semibold text-left`}
                >
                  {item.amount}
                </p>
              );
            } else {
              return (
                <p
                  key={idx}
                  className={`${
                    item.color ?? ""
                  } p-0 h-4 font-semibold text-left`}
                >
                  {formatCurrency(item.amount.amount, item.amount.codeCurrency)}
                </p>
              );
            }
          })}
        </div>
      ),
    },
  };
  tableData.length !== 0 && tableData.push(rowTotal);
  return (
    <div className="overflow-y-auto h-[26rem] px-3">
      <div className="flex flex-col gap-2 mt-2 w-full">
        <h5 className="text-gray-600 font-semibold text-md">Productos:</h5>
        <GenericTable tableTitles={tableTitles} tableData={tableData} />
      </div>
    </div>
  );
};
