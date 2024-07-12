import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { StyleSheet, View, Text } from "@react-pdf/renderer";
import { SalaryReportPersons, SimplePrice } from "../interfaces/ServerInterfaces";
import { formatDateForReports, formatDateForReportsWithYear, sumCurrencyAmounts, sumarMontosArr } from "../utils/helpers";
import { printPriceWithCommasAndPeriods } from "../utils/functions";
interface PdfOrderInterface {
  data: SalaryReportPersons[];
  // data: TransformedMatrixInterface[];
  dateRange: {
    startsAt: string;
    endsAt: string
  };
  codeCurrency: string;
  businessName: string;
  totalToPay: number;
  totalTip: number;
  titlesForExport: Array<string>
}



const styles = StyleSheet.create({
  nowrap: {
    display: "flex",
    flexWrap: "nowrap",
    marginBottom: 1,
    marginTop: 1,
  },
  flexCol: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start"
  },
  subtotalRow: {
    color: "#ffffff",
    backgroundColor: "#777777",
    padding: 2
  },
  h2: {
    fontSize: 12,
  },
  width: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  }

});

const AllGeneralReport = ({ data, dateRange, codeCurrency, businessName, totalToPay, totalTip, titlesForExport }: PdfOrderInterface) => {

  const titlesForExportInAllGeneralReport: (string | undefined)[] = []

  titlesForExport.forEach(title => {
    titlesForExportInAllGeneralReport.push(title)
  })

  titlesForExportInAllGeneralReport.push("Firma")
  titlesForExportInAllGeneralReport.push("Conformidad")

  return (
    <DocumentPage orientation={"landscape"}>

      <View>
        <Text>Nómina</Text>
        <Text style={styles.h2}>{businessName}</Text>
        <Text> </Text>
        <Text style={styles.h2}>Desde: {formatDateForReportsWithYear(dateRange.startsAt)}   </Text>
        <Text style={styles.h2}>Hasta: {formatDateForReportsWithYear(dateRange.endsAt)}   </Text>
        <Text style={styles.h2}>Moneda: {codeCurrency}</Text>
        {/* <Text style={styles.h2}>Total en propina: {printPriceWithCommasAndPeriods(totalTip)}  </Text> */}
        <Text style={styles.h2}>Total a pagar: {printPriceWithCommasAndPeriods(totalToPay)}</Text>
      </View>

      <View>
        <TableTemplate
          data={data?.sort((a, b) => {
            const postA = a?.person?.post?.name as string
            const postB = b?.person?.post?.name as string

            if (postA < postB) {
              return -1;
            }
            if (postA > postB) {
              return 1;
            }
            return 0;
          }).map((salaryReport) => {
            let startsAt: string[] = []
            let baseAmount: SimplePrice[] = []
            let specialHours: SimplePrice[] = []
            let tips: SimplePrice[] = []
            let realToPay: SimplePrice[] = []
            let plus: SimplePrice[] = []



            const totalOrdersSalesInPOS: any[] = []
            const totalOrdersManaged: any[] = []
            const totalOrdersServed: any[] = []
            const totalProductsProduced: any[] = []
            const totalSales: any[] = []
            const totalReferenceToPay: any[] = []
            const amountFixed: SimplePrice[] = []

            salaryReport.listEconomicCycles.forEach(ecoCycle => {
              if (ecoCycle.amountFixed) {
                baseAmount.push(ecoCycle.amountFixed)
              }
              if (ecoCycle.startsAt) {
                startsAt.push(ecoCycle.startsAt)
              }
              if (ecoCycle.specialHours) {
                specialHours.push(ecoCycle.specialHours)
              }
              if (ecoCycle.tips) {
                tips.push(ecoCycle.tips)
              }
              if (ecoCycle.realToPay) {
                realToPay.push(ecoCycle.realToPay)
              }
              if (ecoCycle.plusAmount) {
                plus.push(ecoCycle.plusAmount)
              }

              ecoCycle.totalOrdersSalesInPOS.forEach((order: any) => {
                totalOrdersSalesInPOS.push(order)
              })

              totalOrdersManaged.push(sumCurrencyAmounts(ecoCycle.totalOrdersManaged))

              totalOrdersServed.push(sumCurrencyAmounts(ecoCycle.totalOrdersServed))

              totalProductsProduced.push(sumCurrencyAmounts(ecoCycle.totalProductsProduced))

              totalSales.push(sumCurrencyAmounts(ecoCycle.totalSales))

              totalReferenceToPay.push(sumCurrencyAmounts(ecoCycle.totalReferenceToPay))

              amountFixed.push(ecoCycle.amountFixed)

            })

            totalOrdersSalesInPOS.push([{
              amount: sumarMontosArr(totalOrdersSalesInPOS), codeCurrency: codeCurrency
            }])
            totalOrdersManaged.push([{
              amount: sumarMontosArr(totalOrdersManaged), codeCurrency: codeCurrency
            }])
            totalOrdersServed.push([{
              amount: sumarMontosArr(totalOrdersServed), codeCurrency: codeCurrency
            }])
            totalProductsProduced.push([{
              amount: sumarMontosArr(totalProductsProduced), codeCurrency: codeCurrency
            }])
            totalSales.push([
              { amount: sumarMontosArr(totalSales), codeCurrency: codeCurrency }
            ])
            totalReferenceToPay.push([
              { amount: sumarMontosArr(totalReferenceToPay), codeCurrency: codeCurrency }
            ])

            startsAt.push("SUBTOTAL")
            baseAmount.push({
              amount: salaryReport?.baseAmount! ?? "",
              codeCurrency: "SUBTOTAL"
            })
            amountFixed.push({
              amount: salaryReport?.baseAmount! ?? "",
              codeCurrency: "SUBTOTAL"
            })
            specialHours.push({
              amount: salaryReport?.specialHours! ?? "",
              codeCurrency: "SUBTOTAL"
            })
            tips.push({
              amount: salaryReport?.tips! ?? "",
              codeCurrency: "SUBTOTAL"
            })
            realToPay.push({
              amount: salaryReport?.totalToPay! ?? "",
              codeCurrency: "SUBTOTAL"
            })
            plus.push({
              amount: salaryReport?.plusAmount! ?? "",
              codeCurrency: "SUBTOTAL"
            })

            return (Object.fromEntries(
              Object.entries(
                {
                  "Nombre": [(salaryReport?.person?.firstName ?? "") + " " + (salaryReport?.person?.lastName ?? ""), salaryReport.person?.post?.name ?? "", salaryReport.person?.personCategory?.name ?? ""],
                  "Cargo": salaryReport.person?.post?.name ?? "",
                  "Categoría": salaryReport.person?.personCategory?.name ?? "",
                  // "Nombre Cargo Categoría": [(matrix?.person?.firstName ?? "") + " " + (matrix?.person?.lastName ?? ""), matrix.person?.post?.name ?? "", matrix.person?.personCategory?.name ?? ""],
                  "Días trabajados": (
                    startsAt.map(element => {
                      if (element !== "SUBTOTAL") {
                        return (
                          <Text style={styles.nowrap}>{formatDateForReports(element)}</Text>
                        )
                      } else {
                        return <Text style={{ ...styles.nowrap, ...styles.subtotalRow }}>{element}</Text>
                      }

                    })
                  ),
                  "Negocio": salaryReport?.person?.business?.name ?? "",

                  "Ventas en POS": totalOrdersSalesInPOS.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalOrdersSalesInPOS.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),
                  "Ordenes manejadas": totalOrdersManaged.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalOrdersManaged.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),
                  "Ordenes elaboradas": totalOrdersServed.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalOrdersServed.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),
                  "Productos producidos": totalProductsProduced.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalProductsProduced.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),
                  "Total en ventas": totalSales.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalSales.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),
                  "Total referencia": totalReferenceToPay.map((element, index) => {
                    const currencyElement = element.find((elem: { codeCurrency: string }) => elem.codeCurrency === codeCurrency);
                    const amount = currencyElement?.amount ?? 0;

                    if (index + 1 === totalReferenceToPay.length) {
                      return (
                        <Text style={{ ...styles.nowrap, ...(styles.subtotalRow) }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={{ ...styles.nowrap }}>
                          {amount > 0 ? printPriceWithCommasAndPeriods(amount) : "-"}
                        </Text>
                      );
                    }
                  }),


                  "Salario fijo": (amountFixed.map((element: { amount: number; codeCurrency: string; }, index: number) => (
                    <Text style={totalReferenceToPay.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>
                      {(element.amount > 0 || element.codeCurrency === "SUBTOTAL")
                        ? (printPriceWithCommasAndPeriods(element?.amount! ?? ""))
                        : "-"}
                    </Text>
                  ))),


                  "Salario base":
                    baseAmount.map((element, index) => (
                      <Text style={baseAmount.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>{(element.amount > 0 || element.codeCurrency === "SUBTOTAL") ? (printPriceWithCommasAndPeriods(element?.amount! ?? "")) : "-"}</Text>
                    )),
                  // "Importe": "",
                  "Horas especiales": specialHours.map((element, index) => (
                    <Text style={specialHours.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>{(element.amount > 0 || element.codeCurrency === "SUBTOTAL") ? (printPriceWithCommasAndPeriods(element?.amount! ?? "")) : "-"}</Text>
                  )),
                  "Extras": plus.map((element, index) => (
                    <Text style={plus.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>{(element.amount !== 0 || element.codeCurrency === "SUBTOTAL") ? (printPriceWithCommasAndPeriods(element?.amount! ?? "")) : "-"}</Text>
                  )),
                  "Propinas": tips.map((element, index) => (
                    <Text style={tips.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>{(element.amount > 0 || element.codeCurrency === "SUBTOTAL") ? (printPriceWithCommasAndPeriods(element?.amount! ?? "")) : "-"}</Text>
                  )),
                  "Conformidad": ["1( ) 2( ) 3( )", "4( ) 5( )"],
                  "Firma": "",
                  "Total a pagar": realToPay.map((element, index) => (
                    <Text style={realToPay.length === (index + 1) ? { ...styles.nowrap, ...styles.subtotalRow } : { ...styles.nowrap }}>{(element.amount > 0 || element.codeCurrency === "SUBTOTAL") ? (printPriceWithCommasAndPeriods(element?.amount! ?? "")) : "-"}</Text>
                  )),
                }
              ).filter(([key]) => titlesForExportInAllGeneralReport.includes(key))
            )
            )
          }) || []}
        />
      </View>

    </DocumentPage>
  )
}

export default AllGeneralReport
