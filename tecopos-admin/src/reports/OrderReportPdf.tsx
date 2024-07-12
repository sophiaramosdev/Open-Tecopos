import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { BusinessInterface, OrderInterface } from "../interfaces/ServerInterfaces";

import { StyleSheet, View, Text } from "@react-pdf/renderer";
import { getMeasureSpanish, printPrice } from "../utils/functions";
import moment from "moment";
import { parseISO } from "date-fns";


interface PdfOrderInterface {
  order: OrderInterface | null | undefined;
  business: BusinessInterface | null
}

const styles = StyleSheet.create({
  pageEnd: {
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "flex-end",
    fontSize: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  pageEndTitle: {
    fontWeight: "bold",
    color: "#000000"
  },
  pageEndRow: {
    borderTop: "solid",
    borderTopWidth: 1,
    borderTopColor: "#7a7a7a",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
  },
  pageEndFinalRow: {
    width: "100%",
    borderTop: "solid",
    borderTopWidth: 2,
    borderTopColor: "#000000",
    borderBottom: "solid",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    padding: 4,
    display: "flex",
    justifyContent: "space-between"
  },
  flex: {
    display: "flex",
    flexDirection: "row",
    width: "50%",
    justifyContent: "space-between"
  },
  flexCol: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginRight: 10,
    fontSize: 10,
  },
  h1: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "bold",


  },
  h2: {
    color: "#334155",
    fontSize: 10,
    marginTop: 2,
    paddingTop: 2,
    marginBottom: 15,
    width: "80%"
  },
  bottomBorder: {
    borderBottom: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    width: "55%"
  }
});


const OrderReportPdf = ({ order, business }: PdfOrderInterface) => {

  const invoice_business_name = business?.configurationsKey.find(config => config.key === "invoice_business_name")?.value
  const invoice_header = business?.configurationsKey.find(config => config.key === "invoice_header")?.value
  const invoice_observations = business?.configurationsKey.find(config => config.key === "invoice_observations")?.value

  return (
    <DocumentPage>

      <View style={styles.h1}>

        <Text style={{ ...styles.h1, ...styles.bottomBorder }}>FACTURA</Text>
        {/* <DocumentHeader
          text="FACTURA"
        /> */}
      </View>


      <View style={styles.pageEnd}>

        <div>
          <Text >  Fecha: {moment(order?.createdAt).format(
            'DD [de] MMMM [de] YYYY'
          )} </Text>
          <Text> 
            {/* {`Número de factura: ${order?.operationNumber ?? ""}`} */}
          {`Número de factura: ${parseISO(order!.createdAt).getFullYear()}/${order?.operationNumber ?? order?.preOperationNumber
                }`}
           </Text>
        </div>

      </View>

      <View style={styles.flex}>
        {
          (invoice_business_name || invoice_header) && (
            <div>
              <View style={styles.flexCol}>
                <Text >{invoice_business_name}</Text>
                <Text >{invoice_header}</Text>
              </View>
            </div>
          )
        }

        <div>
          <View style={styles.flexCol}>
            {
              order?.client && (
                <Text >     Nombre Cliente: {(order?.client?.firstName || order?.client?.lastName)
                  ? ((order?.client?.firstName ?? "") + " " + (order?.client?.lastName ?? ""))
                  : (order?.client?.email ?? "")}
                </Text>
              )
            }
            {
              order?.billing && (
                <Text >     Dirección: {
                  (order?.billing?.city ? (order?.billing?.city + ", ") : "")
                  +
                  (order?.billing?.municipality?.name ? (order?.billing?.municipality?.name + ", ") : "")
                  +
                  (order?.billing?.province?.name ? order?.billing?.province?.name : "")
                }</Text>
              )
            }

            {
              order?.client?.legalNotes && (
                <Text >Apuntes legales: {order?.client.legalNotes}</Text>
              )
            }
          </View>
        </div>

      </View>

      <View>
        <TableTemplate
          data={order?.selledProducts?.map((prod) => ({
            "Producto": prod.name,
            " ": " ",
            "UM": prod.measure ? getMeasureSpanish(prod.measure) : "-",
            Cantidad: prod.quantity,
            "Precio unitario": printPrice(prod.priceUnitary.amount) + " " + prod.priceUnitary.codeCurrency,
            "Importe total": printPrice(prod.priceTotal.amount) + " " + prod.priceTotal.codeCurrency,
          })) || []}
        />
      </View>

      <View style={styles.pageEnd}>
        <View style={{ ...styles.h2, width: 200 }}>

          {
            order?.shippingPrice && (
              <Text style={styles.pageEndRow}>

                
                <Text style={styles.pageEndTitle}>Importe                    </Text>
                <Text>{order?.shipping
                  ? (order?.shippingPrice?.amount ? (printPrice(order?.shippingPrice?.amount) + " " + order?.shippingPrice?.codeCurrency) : "-")
                  : "0"} </Text>
              </Text>
            )
          }

          <Text style={styles.pageEndRow}>
            <Text style={styles.pageEndTitle}>Subtotal                   </Text>
            <Text>{order?.shippingPrice !== null
              ? (printPrice(order?.totalToPay[0]?.amount! - order?.shippingPrice?.amount!) + " " + order?.totalToPay[0]?.codeCurrency)
              : printPrice(order?.totalToPay[0]?.amount) + " " + order?.totalToPay[0]?.codeCurrency}</Text>
          </Text>

          <Text style={styles.pageEndFinalRow}>
            {
              order?.status === "BILLED"
                ?
                <Text style={styles.pageEndTitle}>Total pagado            </Text>
                :
                <Text style={styles.pageEndTitle}>Total a pagar           </Text>
            }
            <Text>{printPrice(order?.totalToPay[0]?.amount) + " " + order?.totalToPay[0]?.codeCurrency}</Text>
          </Text>

          {
            order?.paidAt && (
              <Text style={{ marginTop: 4 }}> Fecha de pago: {moment(order?.paidAt).format(
                'DD [de] MMMM [de] YYYY'
              )} </Text>
            )
          }
        </View>

      </View>

      {
        invoice_observations && (
          <View>
            <div>
              <View style={styles.h2}>
                <Text >{invoice_observations}</Text>
              </View>
            </div>
          </View>
        )
      }

    </DocumentPage>

  )
}

export default OrderReportPdf
