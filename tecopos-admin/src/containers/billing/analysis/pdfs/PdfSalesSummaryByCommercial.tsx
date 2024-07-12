
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import DocumentPage from "../../../../components/pdf/DocumentPage";
import {
  formatCurrencyWithOutCurrency,
  formatDateHours,
} from "../../../../utils/helpers";
import { getColorCashOperation } from "../../../../utils/tailwindcss";
import { getCashOperationSpanish } from "../../../../utils/functions";
import TableTemplate from "../../../../components/pdf/TableTemplate";
import moment from "moment";

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

function PdfSalesSummaryByCommercial({
  showReportDataModal
}: any) {
  return (
    <DocumentPage orientation="landscape">
    {showReportDataModal.length > 0 && (
      <View style={styles.flexCol}>
      <Text style={styles.SubHeader}>Resumen de ventas por comerciales:</Text>
      <View style={styles.wFull}>
        <View style={[styles.tableRow , styles.rowHeader]}>
         {/*headers*/}
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Comercial</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>Importe mercancías</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>Total</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>Cantidad de Productos</Text>
          <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>Propinas</Text>
        </View>
        {/*rows*/}
        {showReportDataModal.map((order:any, index:any) => (
      <View key={index} style={styles.tableRow}>
        <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.managedBy?.displayName ?? '-'}</Text>
        <View style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>{order?.prices.length > 0 ? order.prices.map((price:any) => (
          <Text key={price.codeCurrency}>{price.price ? `${price.price} ${price.codeCurrency}` : '-'}</Text>
        )) : <Text>-</Text>}</View>
        <View style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>{order?.totalToPay.length > 0 ? order.totalToPay.map((total:any) => (
          <Text key={total.codeCurrency}>{total.amount ? `${total.amount} ${total.codeCurrency}` : '-'}</Text>
        )) : <Text>-</Text>}</View>
        <Text style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '15%' }]}>{order?.amountOfProducts ?? '-'}</Text>
        <View style={[styles.textBase,styles.textCenter, styles.tableCell, { width: '20%' }]}>{order?.tipPrices.length > 0 ? order.tipPrices.map((tip:any) => (
          <Text key={tip.codeCurrency}>{tip.amount ? `${tip.amount} ${tip.codeCurrency}` : '-'}</Text>
        )) : <Text>-</Text>}</View>
      </View>
    ))}
      </View>
    </View>
    )}

  </DocumentPage>

  );
}


export default PdfSalesSummaryByCommercial;
