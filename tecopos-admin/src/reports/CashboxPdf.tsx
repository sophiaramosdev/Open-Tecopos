import { StyleSheet, View } from "@react-pdf/renderer";
import DocumentPage from "../components/pdf/DocumentPage";
import DocumentHeader from "../components/pdf/DocumentHeader";
import {
  AreaSalesIncomes,
  AreasInterface,
  CashOperationInterface,
  CashOpperationInterface,
  EconomicCycle,
  OrderInterface,
  PriceInvoiceInterface,
} from "../interfaces/ServerInterfaces";
import TableTemplate from "../components/pdf/TableTemplate";
import { formatDateForReportsWithYearAndHour, formatCurrency, formatCurrencyWithOutCurrency } from "../utils/helpers";
import { getCashOperationSpanish } from "../utils/functions";
import moment from "moment";

interface PdfSelledInterface {
  report: AreaSalesIncomes[];
  ecoCycle: EconomicCycle | null;
  areas: AreasInterface[];
  areaSalesIncome: AreaSalesIncomes[];
  configKeys: {
    cash_operations_include_tips: boolean;
    cash_operations_include_deliveries: boolean;
    enable_delivery: boolean;
    extract_salary_from_cash: boolean;
  };
  orders: OrderInterface[];
  cashOperation: CashOperationInterface[];
  costCurrency: string
}

const styles = StyleSheet.create({
  tableContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
});

const CashBoxPdf = ({
  report,
  ecoCycle,
  areas,
  configKeys,
  orders,
  cashOperation,
  areaSalesIncome,
  costCurrency
}: PdfSelledInterface) => {
  const {
    cash_operations_include_tips, //Incluir propinas
    cash_operations_include_deliveries, //Operaciones con domicilio
    enable_delivery, //Operaciones con envios
    extract_salary_from_cash, //Extracción de salario del efectivo
  } = configKeys;

  //Reporte general -----------------------------------------------------------------------
  const getTotalPriceInvoices = (data: PriceInvoiceInterface[][]) => {
    const totals: PriceInvoiceInterface[] = [];
    data?.forEach((element) => {
      element.map((item) => {
        const index = totals.findIndex(
          (mount) => mount.codeCurrency === item.codeCurrency
        );
        if (index !== -1) {
          totals.splice(index, 1, {
            ...totals[index],
            amount: totals[index].amount + item.amount,
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  const getTotalCashOpperation = (data: CashOpperationInterface[][]) => {
    const totals: CashOpperationInterface[] = [];
    data.forEach((element) => {
      element.map((item) => {
        const index = totals.findIndex(
          (mount) =>
            mount.codeCurrency === item.codeCurrency &&
            mount.operation === item.operation
        );
        if (index !== -1) {
          totals.splice(index, 1, {
            ...totals[index],
            amount: totals[index].amount + item.amount,
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  const getTotalOrderModifiers = (data: any) => {
    const totals: any = [];
    data?.forEach((element:any) => {
      element?.map((item:any) => {
        const index = totals.findIndex(
          (modifier:any) => modifier.modifierName === item.modifierName
        );
        if (index !== -1) {
          item.prices.forEach((price:any) => {
            const priceIndex = totals[index].prices.findIndex(
              (totalPrice:any) => totalPrice.codeCurrency === price.codeCurrency
            );
            if (priceIndex !== -1) {
              totals[index].prices.splice(priceIndex, 1, {
                ...totals[index].prices[priceIndex],
                amount: totals[index].prices[priceIndex].amount + price.amount,
              });
            } else {
              totals[index].prices.push(price);
            }
          });
        } else {
          totals.push(item);
        }
      });
    });
    return totals;
  };

  if (areaSalesIncome.length > 1) {
    const generalReport = {
      totalHouseCosted: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalHouseCosted)
      ),
      totalSales: getTotalPriceInvoices(report.map((elem) => elem.totalSales)),
      totalOrderModifiers: getTotalOrderModifiers(
        areaSalesIncome.map((elem) => elem.totalOrderModifiers)
      ),
      totalIncomes: getTotalPriceInvoices(report.map((elem) => elem.totalIncomes)),
      // taxes: getTotalPriceInvoices(areaSalesIncome.map((elem) => elem.taxes)),
      totalTips: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalTips)
      ),
      totalCashOperations: getTotalCashOpperation(
        areaSalesIncome.map((elem) => elem.totalCashOperations)
      ),
      totalDiscounts: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalDiscounts)
      ),
      totalShipping: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalShipping)
      ),
      totalInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalInCash)
      ),
      totalInCashAfterOperations: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalInCashAfterOperations)
      ),
      totalIncomesNotInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalIncomesNotInCash)
      ),
      totalIncomesInCash: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalIncomesInCash)
      ),
      totalCommissions: getTotalPriceInvoices(
        areaSalesIncome.map((elem) => elem.totalCommissions)
      ),
      totalTipsMainCurrency: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalTipsMainCurrency.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
      totalSalesInMainCurrency: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalSalesInMainCurrency.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
      totalSalary: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalSalary.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
      totalCost: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalCost.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
      totalAsumedCost: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item?.totalAsumedCost?.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
      totalGrossRevenue: {
        amount: areaSalesIncome.reduce(
          (total, item) => total + item.totalGrossRevenue.amount,
          0
        ),
        codeCurrency: costCurrency ?? "CUP",
      },
    };

    report.unshift(generalReport);
  }

  const processedData1 = report.map((elem: AreaSalesIncomes) => {
    const verifyArray = (prices: PriceInvoiceInterface[]) => {
      if (prices.length === 0) return "0.00";
      return prices.map((item) =>
        formatCurrency(item.amount, item.codeCurrency)
      );
    };

    const verifyTotalIncomesArray = (totalIncomesNotInCash: any[], totalIncomesInCash: any[]) => {

      const totalIncomes: Array<{ codeCurrency: string, transfer: number, cash: number }> = []

      // Crear un conjunto (set) de todos los codeCurrency presentes en ambos arreglos
      const allCurrencies = new Set([...totalIncomesNotInCash.map(item => item.codeCurrency), ...totalIncomesInCash.map(item => item.codeCurrency)]);

      // Iterar sobre todos los códigos de moneda
      allCurrencies.forEach(currency => {
        const transferData = totalIncomesNotInCash.find(item => item.codeCurrency === currency);
        const cashData = totalIncomesInCash.find(item => item.codeCurrency === currency);

        const transferAmount = transferData ? transferData.amount : 0;
        const cashAmount = cashData ? cashData.amount : 0;

        totalIncomes.push({
          codeCurrency: currency,
          transfer: transferAmount,
          cash: cashAmount
        });
      });

      const data: string[] = []

      totalIncomes.forEach(price => {
        data.push(`${price.codeCurrency} ⬇`)
        if (price.transfer > 0) {
          data.push(`Transferencia:${formatCurrencyWithOutCurrency(price.transfer)}`)
        }
        if (price.cash > 0) {
          data.push(`Efectivo:${formatCurrencyWithOutCurrency(price.cash)}`)
        }
      })

      return data

    };

    // Create order modifiers for an object
    const modifierNameProcessed = (elem: any) => {
      let result: any = [];
      elem?.totalOrderModifiers?.forEach((modifier: any, index: number) => {
        result.push(`${index === 0 ? '' : '\n'}${modifier.modifierName}:`);
        let precios = modifier.prices.map(
          (price: any) => `${price.amount} ${price.codeCurrency}`
        );
        result.push(...precios);
      });
      return result;
    };

    return {
      area:
        areas.find((area) => area.id === elem.areaId)?.name ??
        "Resumen General",
      "Total en ventas": verifyArray(elem.totalSales),
      "Modificadores": modifierNameProcessed(elem),
      // Nueva forma
      "Total de ingresos": verifyTotalIncomesArray(elem.totalIncomesNotInCash, elem.totalIncomesInCash),
      // Antes
      // "Total de ingresos": verifyArray(elem.totalIncomes),
      "": "",
      OPERACIONES: "",
      "  Fondo": verifyArray(
        elem.totalCashOperations.filter(
          (itm: { operation: string; }) => itm.operation === "MANUAL_FUND"
        )
      ),
      "  Extracciones": verifyArray(
        elem.totalCashOperations.filter(
          (itm: { operation: string; }) => itm.operation === "MANUAL_WITHDRAW"
        )
      ),
      "  Depósitos": verifyArray(
        elem.totalCashOperations.filter(
          (itm: { operation: string; }) => itm.operation === "MANUAL_DEPOSIT"
        )
      ),
      RECAUDADO: "",
      "  Transferencia": verifyArray(elem.totalIncomesNotInCash),
      "  Efectivo en caja": verifyArray(elem.totalInCash),
      Salario:
        elem.totalSalary.amount !== 0
          ? formatCurrency(
            elem.totalSalary?.amount ?? 0,
            elem.totalSalary.codeCurrency
          )
          : 0,
      "Total a despachar": verifyArray(elem.totalInCashAfterOperations),
      "Costo de las mercancías": formatCurrency(
        elem.totalCost.amount,
        elem.totalCost.codeCurrency 
      ),
      "Subtotal": formatCurrency(
        elem.totalCost.amount + elem.totalAsumedCost?.amount,
        elem.totalCost.codeCurrency
      ),
      "Ganancia en ventas": formatCurrency(
        elem.totalGrossRevenue.amount,
        elem.totalGrossRevenue.codeCurrency
      ),
    };
  });

  

  const processedData2 = report.map((elem) => {
    const verifyArray = (prices: PriceInvoiceInterface[]) => {
      if (prices.length === 0) return "0.00";
      return prices.map((item) =>
        formatCurrency(item.amount, item.codeCurrency)
      );
    };
    return {
      " ": " ",
      "  ": " ",
      "   ": " ",
      "OTROS CONCEPTOS": "",
      "  Propinas": elem.totalTipsMainCurrency
        ? formatCurrency(
          elem.totalTipsMainCurrency?.amount ?? 0,
          elem.totalTipsMainCurrency.codeCurrency
        )
        : "0.00",
      "  Envíos": verifyArray(elem.totalShipping),
      "  Descuentos": verifyArray(elem.totalDiscounts),
      "  Comisiones": verifyArray(elem.totalCommissions),
      "  Consumo casa": verifyArray(elem.totalHouseCosted),
      "    ": " ",
      "      ": " ",
      "        ": " ",
      "          ": " ",
      "           ": " ",
      "             ": " ",
    };
  });


  const firstReport = processedData1.map((item) => {
    let data: Record<string, string | number | (string | number)[]>[] = [];
    const object = Object.entries(item);
    const inCashIncluded: Record<
      string,
      string | number | (string | number)[]
    >[] = [];

    for (const [key1, value1] of object) {
      if (key1 === "area" || (key1 === "Salario" && value1 === 0)) continue;
      if (
        (enable_delivery &&
          cash_operations_include_deliveries &&
          key1 === "totalShipping") ||
        (extract_salary_from_cash && key1 === "totalSalary") ||
        (cash_operations_include_tips &&
          ["totalTips", "totalTipsMainCurrency"].includes(key1))
      ) {
        inCashIncluded.push({ Concepto: key1, Monto: value1, Concepto_: " ", Monto_: " " });
      }
      data.push({ Concepto: key1, Monto: value1, Concepto_: "", Monto_: "" });
      if (inCashIncluded.length !== 0) {
        const idx = data.findIndex(
          (elem) => Object.keys(elem)[0] === "  Efectivo en caja"
        );
        if (idx !== -1) data.splice(idx, 0, { "   ": "" }, ...inCashIncluded);
      }
    }
    return { area: item.area, data };
  });

  const secondReport = processedData2.map((item) => {
    let data: Record<string, string | number | (string | number)[]>[] = [];
    const object = Object.entries(item);
    const inCashIncluded: Record<
      string,
      string | number | (string | number)[]
    >[] = [];

    for (const [key1, value1] of object) {
      if (key1 === "area" || (key1 === "Salario")) continue;
      if (
        (enable_delivery &&
          cash_operations_include_deliveries &&
          key1 === "totalShipping") ||
        (extract_salary_from_cash && key1 === "totalSalary") ||
        (cash_operations_include_tips &&
          ["totalTips", "totalTipsMainCurrency"].includes(key1))
      ) {
        inCashIncluded.push({ Concepto: " ", Monto: " ", Concepto_: key1, Monto_: value1 });
      }
      data.push({ Concepto: "", Monto: "", Concepto_: key1, Monto_: value1 });
      if (inCashIncluded.length !== 0) {
        const idx = data.findIndex(
          (elem) => Object.keys(elem)[0] === "  Efectivo en caja"
        );
        if (idx !== -1) data.splice(idx, 0, { "   ": "" }, ...inCashIncluded);
      }
    }
    return { data };
  });

  function mergeArrays(arr1: any[], arr2: any[]) {
    const mergedArray: any[] = [];

    arr1.forEach((item, index) => {
      let newItem = { ...item };  // Copiar el item actual

      // Verificar si las propiedades están vacías y tomar su valor del otro arreglo si es necesario
      Object.keys(newItem).forEach((key) => {
        if (newItem[key] === "" && arr2[index] && arr2[index][key] !== "") {
          newItem[key] = arr2[index][key];
        }
      });

      mergedArray.push(newItem);
    });

    return mergedArray;
  }

  const FinalReport: { area: string; data: any[]; }[] = []

  firstReport.forEach((report, indx) => {
    const merged = mergeArrays(report.data, secondReport[indx].data);

    FinalReport.push({
      area: report.area,
      data: merged
    })
  })

  return (
    <DocumentPage>
      <DocumentHeader
        text="Reporte de caja: Arqueo"
        subtext={`Ciclo: ${formatDateForReportsWithYearAndHour(ecoCycle?.openDate!)} ${ecoCycle?.closedDate
          ? "=> " + formatDateForReportsWithYearAndHour(ecoCycle?.closedDate)
          : ""
          }`}
      />

      <View style={styles.tableContainer}>
        {FinalReport.map((item, idx) => (
          <TableTemplate key={idx} data={item.data} tableName={item.area} displayTableTitles={false} />
        ))}
      </View>


      {orders.length !== 0 && (
        <View>
          <TableTemplate
            data={orders.map((order) => ({
              "No. Orden": order.operationNumber,
              Apertura: formatDateForReportsWithYearAndHour(order.createdAt),
              Total: order.totalToPay.map((payment) =>
                formatCurrency(payment.amount, payment.codeCurrency)
              ),
            }))}
            tableName="Órdenes pendientes"
          />
        </View>
      )}

      {
        cashOperation.length > 0 && (
          <>
            <View style={styles.tableContainer}>
              <TableTemplate data={[]} tableName={""} />
            </View>

            <DocumentHeader
              text="Reporte de caja: Operaciones"
            />
            <View>
              <TableTemplate
                data={cashOperation.map((operation) => ({
                  "Nombre": operation.madeBy?.displayName,
                  "Operación": getCashOperationSpanish(operation.operation),
                  Monto: operation.amount + " " + operation.codeCurrency,
                  Fecha: moment(operation.createdAt).format("hh:mm A"),
                  Observaciones: operation.observations
                }))}
                tableName="Operaciones"
              />
            </View>
          </>
        )
      }



    </DocumentPage>
  );
};

export default CashBoxPdf;
