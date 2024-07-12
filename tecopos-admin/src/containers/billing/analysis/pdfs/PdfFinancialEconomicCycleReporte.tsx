//@ts-nocheck
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import DocumentPage from "../../../../components/pdf/DocumentPage";
import {
  formatCurrency,
  formatCurrencyWithOutCurrency,
  formatDateForReportsWithYearAndHour,
} from "../../../../utils/helpers";
import { getColorCashOperation } from "../../../../utils/tailwindcss";
import { getCashOperationSpanish } from "../../../../utils/functions";
import TableTemplate from "../../../../components/pdf/TableTemplate";
import moment from "moment";
import { BsCashCoin, BsCreditCard } from "react-icons/bs";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    gap: 1,
    fontSize: 10,
    borderRadius: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: "medium",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 2,
  },
  SubHeader: {
    fontSize: 14,
    fontWeight: "medium",
    paddingBottom: 2,
    marginTop: 4,
    marginBottom: 2,
    textDecoration: "underline"
  },
  rowHeader: {
    // borderBottom: "solid",
    // borderBottomColor: "#9ca3af",
    // borderBottomWidth: 2,
    backgroundColor: "#000000",
    color: "#ffffff",
    fontWeight: 500
  },
  flexRow: {
    flexDirection: "row",
    gap: 2,
  },
  fontMedium: {
    fontWeight: "medium",
  },
  textGray: {
    color: "#374151",
  },
  spaceX1: {
    flexDirection: "row",
    gap: 1,
  },
  flexCol: {
    flexDirection: "column",
  },
  itemStart: {
    justifyContent: "flex-start",
  },
  itemEnd: {
    justifyContent: "flex-end",
  },
  itemBetween: {
    justifyContent: "space-between",
  },
  ml16: {
    marginLeft: 16,
  },
  my5: {
    marginVertical: 5,
  },
  mt32:{
    marginTop: 32
  },
  textBase: {
    fontSize: 12,
  },
  textCenter: {
    textAlign: "center",
  },
  justifyBetween: {
    justifyContent: "space-between",
  },
  color1: {
    backgroundColor: "red",
  },
  borderB: {
    borderBottomWidth: 1,
  },
  borderGray200: {
    borderBottomColor: "#edf2f7",
  },
  wFull: {
    width: "100%",
  },
  wHalf: {
    width: "50%",
  },
  textGray900: {
    color: "#1a202c",
  },
  flexWrap: {
    flexWrap: "wrap",
  },
  paddingY4: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bfbfbf",
    borderStyle: "solid",
  },
  tableCol: {
    width: "33.33%",
    borderRightWidth: 1,
    borderRightColor: "#bfbfbf",
    borderStyle: "solid",
    justifyContent: "center",
  },
  tableCell: {
    margin: "auto",
    fontSize: 10,
    paddingVertical:4,
    paddingHorizontal:2
  },
  flex: {
    display:"flex"
  },
  topLine: {
    fontSize: 10,
    borderTop: 1,
    paddingTop : 2
  }
});

function PdfFinancialEconomicCycleReporte({
  financialEconomicCycleReporte,
  mainCurrency,
  costCurrency,
  existExchangeRates,
  getCostCurrency,
  existTotalIncomesInCash,
  existTotalIncomesNotInCash,
  totalIncomes,
  user
}: any) {
  return (
    <DocumentPage orientation="landscape">
      <Text style={styles.header}>Listado ampliado de cierre contable</Text>
      <View style={[styles.flexRow, styles.textBase]}>
        <Text style={styles.fontMedium}>Fecha:</Text>
        <View style={styles.flexRow}>
          <Text style={styles.textGray}>
            {formatDateForReportsWithYearAndHour(
              financialEconomicCycleReporte?.economicCycle?.openAt!
            )}
          </Text>
          <Text style={styles.fontMedium}>-</Text>
          <Text style={styles.textGray}>
            {formatDateForReportsWithYearAndHour(
              financialEconomicCycleReporte?.economicCycle?.closedAt!
            )}
          </Text>
        </View>
      </View>
      <View style={[styles.flexRow, styles.textBase]}>
        <Text style={styles.fontMedium}>Total vendido:</Text>
        <View>
          <View style={styles.spaceX1}>
            <Text style={styles.textGray}>
              {financialEconomicCycleReporte?.economicCycle?.totalSalesInMainCurrency.amount.toFixed(
                2
              )}
            </Text>
            <Text style={styles.textGray}>
              {
                financialEconomicCycleReporte?.economicCycle
                  ?.totalSalesInMainCurrency?.codeCurrency
              }
            </Text>
          </View>
          {mainCurrency !== costCurrency && existExchangeRates && (
            <View style={styles.spaceX1}>
              <Text style={styles.textGray}>{getCostCurrency()}</Text>
              <Text style={styles.textGray}>{costCurrency}</Text>
            </View>
          )}
        </View>
      </View>

      {(existTotalIncomesInCash || existTotalIncomesNotInCash) && (
        <View
          style={[
            styles.flexRow,
            styles.borderB,
            styles.borderGray200,
            styles.wFull,
            styles.textBase,
          ]}
        >
          <View style={styles.wHalf}>
            <Text style={[styles.fontMedium, styles.textGray900]}>
              Total de Ingresos:
            </Text>
            <View style={styles.flexCol}>
              {totalIncomes.map((element: any) => {
                if (element.transfer > 0 || element.cash > 0) {
                  return (
                    <View
                      style={[
                        styles.flexRow,
                        styles.justifyBetween,
                        styles.my5,
                      ]}
                      key={element.codeCurrency}
                    >
                      <Text style={[styles.fontMedium, styles.textGray900]}>
                        {element.codeCurrency}
                      </Text>
                      <View
                        style={[
                          styles.flexCol,
                          styles.itemStart,
                          styles.itemEnd,
                          styles.ml16,
                        ]}
                      >
                        {element.transfer > 0 && (
                          <Text style={styles.textGray}>Transferencia</Text>
                        )}
                        {element.cash > 0 && (
                          <Text style={styles.textGray}>Efectivo</Text>
                        )}
                      </View>
                    </View>
                  );
                }
              })}
            </View>
          </View>
          <View style={[styles.wHalf, styles.textBase]}>
            <Text style={styles.textCenter}> </Text>
            <View style={[styles.flexCol, styles.ml16]}>
              {totalIncomes.map((element: any) => (
                <View
                  style={[
                    styles.flexCol,
                    styles.itemStart,
                    styles.itemEnd,
                    styles.my5,
                  ]}
                  key={element.codeCurrency}
                >
                  {element.transfer > 0 && (
                    <Text
                      style={[
                        styles.textCenter,
                        styles.textGray,
                        styles.flexWrap,
                      ]}
                    >
                      {formatCurrencyWithOutCurrency(element.transfer)}
                    </Text>
                  )}
                  {element.cash > 0 && (
                    <Text
                      style={[
                        styles.textCenter,
                        styles.textGray,
                        styles.flexWrap,
                      ]}
                    >
                      {formatCurrencyWithOutCurrency(element.cash)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {mainCurrency !== costCurrency && existExchangeRates && (
        <View>
          <View style={styles.SubHeader}>
            <Text>Tasa de cambio del día:</Text>
          </View>
          <View>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Moneda</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {mainCurrency ?? "-"}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>USD</Text>
              </View>
            </View>

            {financialEconomicCycleReporte?.exchange_rates
              ?.filter((rate: any) => rate.code !== mainCurrency)
              .map((rate: any, index: any) => (
                <View style={styles.tableRow} key={rate.code}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{rate.code}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{rate.exchangeRate}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>
                      {(
                        rate.exchangeRate /
                        (financialEconomicCycleReporte?.exchange_rates?.find(
                          (r: any) => r.code === costCurrency
                        )?.exchangeRate ?? 1)
                      ).toFixed(2) === "1.00"
                        ? "-"
                        : (
                            rate.exchangeRate /
                            (financialEconomicCycleReporte?.exchange_rates?.find(
                              (r: any) => r.code === costCurrency
                            )?.exchangeRate ?? 1)
                          ).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}

      {financialEconomicCycleReporte?.orders?.length > 0 && (
        <View style={styles.flexCol}>
        <Text style={styles.SubHeader}>Facturas:</Text>
        <View style={styles.wFull}>
          <View style={[styles.tableRow , styles.rowHeader]}>
           {/* Encabezados de la tabla */}
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '10%' }]}>No</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Tipo de cliente</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Cliente</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Comercial</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Total de productos</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Comprobante de caja</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Total pagado</Text>
            <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Monto devuelto</Text>
            <Text style={[styles.textBase, styles.tableCell, { width: '15%' }]}>Observaciones</Text>
          </View>
          {/* Filas de la tabla */}
          {financialEconomicCycleReporte?.orders?.map((order:any, index:any) => (
        <View key={index} style={styles.tableRow}>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '10%' }]}>{order?.operationNumber ?? '-'}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.client?.customerCategory?.name ? order?.client?.customerCategory?.name : '-'}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{`${order?.client?.firstName ?? '-'} ${order?.client?.lastName ?? '-'}`}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.managedBy?.displayName ?? '-'}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.selledProducts?.reduce((acc:any, product:any) => acc + product.quantity, 0) ?? '-'}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.cashRegisterOperations?.map((item:any) => `${item?.operationNumber ?? '-'}`)}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.currenciesPayment?.map((payment:any) => `${payment.amount ?? '-'} ${payment.codeCurrency ?? '-'}`).join(', ') ?? '-'}</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.amountReturned ? `${order?.amountReturned?.amount ?? 0} ${order?.amountReturned?.codeCurrency ?? '-'}` : '-'}</Text>
          <Text style={[styles.textBase, styles.tableCell, { width: '15%' }]}>{order?.observations || '-'}</Text>
        </View>
      ))}
       <View style={styles.tableRow}>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '10%' }]}>Total</Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}></Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}></Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}></Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{financialEconomicCycleReporte?.orders?.reduce((acc: any, order: any) => acc + order?.selledProducts.reduce((accP: any, product: any) => accP + product?.quantity, 0), 0)}</Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}></Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>
           {Object.entries(financialEconomicCycleReporte?.orders?.reduce((acc, order) => {
              order?.currenciesPayment?.forEach(payment => {
                const key = `${payment.codeCurrency}_${payment.paymentWay}`;
                acc[key] = (acc[key] || 0) + payment.amount;
              });
              return acc;
            }, {})).map(([key, amount]) => (
             <View><Text key={key}>{amount} {key.split('_')[1] === "CASH" ? "Efectivo" : "Transferencia"}</Text></View> 
            ))}
         </Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>
           {Object.entries(financialEconomicCycleReporte?.orders?.reduce((acc, order) => {
              if (order?.amountReturned) {
                const key = order.amountReturned.codeCurrency;
                acc[key] = (acc[key] || 0) + (order.amountReturned.amount || 0);
              }
              return acc;
            }, {})).map(([key, amount]) => (
              <Text key={key}>{amount} {key}</Text>
            ))}
         </Text>
         <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}></Text>
       </View>
        </View>
      </View>
      )}
      
      {/*Can use this table for other cases */}
      {/*  {financialEconomicCycleReporte?.orders?.length > 0 && (
         <View style={styles.flexCol}>
           <Text style={styles.SubHeader}>Facturas:</Text>
           <View style={styles.wFull}>
             <TableTemplate
               data={financialEconomicCycleReporte?.orders?.map((order:any) => ({
                 "No": order?.operationNumber ?? '-',
                 "Tipo de cliente": order?.client?.customerCategory?.name ?? '-',
                 "Cliente": `${order?.client?.firstName ?? '-'} ${order?.client?.lastName ?? '-'}`,
                 "Comercial": order?.managedBy?.displayName ?? '-',
                 "Total de productos": order?.selledProducts?.reduce((acc:any, product:any) => acc + product.quantity, 0) ?? '-',
                 "Comprobante de caja": order?.cashRegisterOperations?.map((item:any) => `${item.amount ?? '-'} ${item.codeCurrency ?? '-'}`).join(', ') ?? '-', 
                 "Total pagado": order?.currenciesPayment?.map((payment:any) => `${payment.amount ?? '-'} ${payment.codeCurrency ?? '-'}`).join(', ') ?? '-',
                 "Monto devuelto": order?.amountReturned ? `${order?.amountReturned?.amount ?? 0} ${order?.amountReturned?.codeCurrency ?? '-'}` : '0',
                 "Observaciones": order?.observations || 'Sin observaciones'
               }))}
               tableName="Facturas"
             />
           </View>
         </View>
       )} */}
     
     
      {financialEconomicCycleReporte?.cashOperations?.length > 0 && (
       <View>
       <TableTemplate
         data={financialEconomicCycleReporte?.cashOperations?.map((operation:any) => ({
          "No": operation?.operationNumber ?? "-",
           "Nombre": operation.madeBy?.displayName,
           "Operación": getCashOperationSpanish(operation.operation),
           Monto: operation.amount + " " + operation.codeCurrency,
           Fecha: moment(operation.createdAt).format("hh:mm A"),
           Observaciones: operation.observations ?? "-"
         }))}
         tableName="Operaciones de caja:"
       />
      </View>
      )}
            
    <View style={[styles.flexRow ,styles.flex,styles.itemBetween, styles.mt32]}>
    <View >
      <Text style={styles.textBase}>{user?.displayName}</Text>
      <Text style={styles.topLine}>Confeccionado por:</Text>
    </View>
    <View >
      <Text style={styles.topLine}>Revisado por:</Text>
    </View>
    
    </View>
            
    </DocumentPage>
  );
}

export default PdfFinancialEconomicCycleReporte;
