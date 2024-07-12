import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import {
  AvailableCurrency,
  BusinessInterface,
  OrderInterface,
  PriceInvoiceInterface,
  SimplePrice,
} from "../interfaces/ServerInterfaces";

import { StyleSheet, View, Text, Image as Logo } from "@react-pdf/renderer";
import {
  getMeasureSpanish,
  printPriceWithCommasAndPeriods,
  roundToTwoDecimal,
  roundToTwoDecimalDow,
} from "../utils/functions";
import moment from "moment";
import { parseISO } from "date-fns";
import APIMediaServer from "../api/APIMediaServer";
import { blobToDataURL } from "./helpers/commons";
import {
  translateOrderState,
  translatePaymetMethods,
  translatePaymetMethodsShort,
} from "../utils/translate";
import { mathOperation } from "../utils/helpers";
import BillingTableTemplate from "../components/pdf/BillingTableTemplate";

interface BillingReportPdfInterface {
  order: OrderInterface | null | undefined;
  business: BusinessInterface | null;
  reportType?: "billing" | "delivery" | "prebilling";
}

const styles = StyleSheet.create({
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  image: {
    width: 20,
    height: 20,
  },
  pageEnd: {
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "flex-end",
    fontSize: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  pageStart: {
    display: "flex",
    justifyContent: "flex-start",
    width: "100%",
    alignItems: "flex-start",
    fontSize: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  pageEndTitle: {
    fontWeight: "bold",
    color: "#000000",
    textAlign: "right",
  },
  pageEndRow: {
    borderTop: "solid",
    borderTopWidth: 1,
    borderTopColor: "#7a7a7a",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    width: "100%",
    textAlign: "right",
  },
  pageEndRowWithoutFlex: {
    borderTop: "solid",
    borderTopWidth: 1,
    borderTopColor: "#7a7a7a",
    padding: 4,
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
    justifyContent: "space-between",
  },
  flex: {
    display: "flex",
    flexDirection: "row",
    width: "50%",
    justifyContent: "space-between",
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
    color: "#000000",
    fontSize: 10,
    marginTop: 2,
    paddingTop: 2,
    marginBottom: 15,
    width: "80%",
  },
  bottomBorder: {
    borderBottom: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    width: "55%",
  },
  textStyle: {
    color: "#000000",
    fontSize: 10,
    paddingTop: 1,
  },
  bigTextStyle: {
    color: "#000000",
    fontSize: 16,
    paddingTop: 1,
  },
  logoContainer: {
    border: 0,
    borderRadius: 50,
    overflow: "hidden",
    width: 50,
    height: 50,
  },
  businessLogo: {
    height: 85.4,
    objectFit: "contain",
    paddingLeft: 0.9,
    borderRadius: "50%",
    marginTop: 10,
  },
  LogoAndInfoContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    alignContent: "flex-start",
    width: "100%",
  },
  statusPage: {
    position: "absolute",
    top: "50%",
    left: "20%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 80,
    color: "#000",
    opacity: 0.6,
    zIndex: 1000,
  },
});

const BillingReportPdf = ({
  order,
  business,
  reportType,
}: BillingReportPdfInterface) => {
  const invoice_business_name = business?.configurationsKey.find(
    (config) => config.key === "invoice_business_name"
  )?.value;

  const invoice_header = business?.configurationsKey.find(
    (config) => config.key === "invoice_header"
  )?.value;

  const invoice_observations = business?.configurationsKey.find(
    (config) => config.key === "invoice_observations"
  )?.value;

  const billing_show_customer_data =
    business?.configurationsKey.find(
      (config) => config.key === "billing_show_customer_data"
    )?.value === "true";
  const billing_show_business_data =
    business?.configurationsKey.find(
      (config) => config.key === "billing_show_business_data"
    )?.value === "true";
  const billing_show_business_logo =
    business?.configurationsKey.find(
      (config) => config.key === "billing_show_business_logo"
    )?.value === "true";

  const getBusinessLogo = async (logoId: number) => {
    try {
      const response = await APIMediaServer.get("/files/" + logoId, {
        responseType: "blob",
      });
      return await blobToDataURL(response.data);
    } catch (error) {
      console.error(error);
      return require("../assets/image-default.jpg");
    }
  };

  const titlePDF = () => {
    if (reportType === "billing") {
      return "Factura";
    }
    if (reportType === "delivery") {
      return "Albaran";
    }
    if (reportType === "prebilling") {
      return "Pre-Factura";
    }
  };

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

  const totalPartialPay: SimplePrice[] = [];

  if (order?.status !== "BILLED") {
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
  }

  const difference = calculatePaymentDiff(
    order?.totalToPay,
    [...(order?.partialPayments || [])],
    business?.availableCurrencies as AvailableCurrency[],
    business?.mainCurrency as string
  );

  const statusNotPay = ["CREATED", "PAYMENT_PENDING", "OVERDUE"];
  const totalToPay: any = statusNotPay.includes(order?.status || "")
    ? [...difference]
    : [...(order?.totalToPay || [])];

  return (
    <DocumentPage>
      <View style={styles.h1}>
        <Text style={{ ...styles.h1, ...styles.bottomBorder }}>
          {titlePDF()}
        </Text>
      </View>

      {["CANCELLED", "REFUNDED"].includes(order?.status ?? "") && (
        <View style={styles.statusPage}>
          <Text style={{ position: "relative", zIndex: 1000 }}>
            {translateOrderState(order?.status ?? "")}
          </Text>
        </View>
      )}

      {billing_show_business_logo && (
        <View style={styles.pageStart}>
          <div>
            <View style={styles.flexCol}>
              <Logo
                style={styles.businessLogo}
                //@ts-ignore
                src={
                  business.logo
                    ? getBusinessLogo(business.logo.id)
                    : require("../assets/image-default.jpg")
                }
              />
            </View>
          </div>
        </View>
      )}

      <View style={{ ...styles.flexCol, gap: 5, width: "100%" }}>
        {billing_show_business_data && (
          <View style={{ ...styles.flexCol, width: "50%", marginTop: 10 }}>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* <Text>Negocio: </Text> */}
              <Text style={styles.bigTextStyle}>
                {invoice_business_name || business?.name}
              </Text>
            </View>

            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* <Text>Negocio: </Text> */}
              <Text style={styles.textStyle}>{invoice_header}</Text>
            </View>

            {business?.email && (
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* <Text>Correo electrónico: </Text> */}
                <Text style={styles.textStyle}>{business?.email}</Text>
              </View>
            )}

            {business?.phones &&
              business?.phones.length > 0 &&
              Number(business?.phones[0]?.number) !== 0 && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* <Text>Teléfono: </Text> */}
                  <Text style={styles.textStyle}>
                    {business?.phones[0].number}
                  </Text>
                </View>
              )}

            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* <Text>Dirección: </Text> */}
              <Text
                style={{
                  ...styles.textStyle,
                  display: "flex",
                  flexWrap: "wrap",
                }}
              >
                {(business?.address?.city
                  ? business?.address?.city + ", "
                  : "") +
                  (business?.address?.municipality?.name
                    ? business?.address?.municipality?.name + ", "
                    : "") +
                  (business?.address?.province?.name
                    ? business?.address?.province?.name
                    : "")}
              </Text>
            </View>
          </View>
        )}

        <View
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          {billing_show_customer_data && (
            <View style={{ ...styles.flexCol, width: "50%" }}>
              {order?.client && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Text>Cliente: </Text>
                  <Text style={styles.textStyle}>
                    {(order?.client?.firstName || order?.client?.lastName)
                      && (order?.client?.firstName ?? "") +
                      " " +
                      (order?.client?.lastName ?? "")
                    }
                  </Text>
                </View>
              )}

              {order?.client?.address?.country && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Text>País: {order?.client?.address?.country?.name} </Text>
                </View>
              )}
              {order?.client?.address?.province && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Text>Provincia: {order?.client?.address?.province?.name} </Text>
                </View>
              )}
              {order?.client?.address?.municipality && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Text>Municipio: {order?.client?.address?.municipality?.name}</Text>
                </View>
              )}
              {order?.client !== null && (
                <>
                  {/* {order?.client?.codeClient && (
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text>Código de cliente: </Text>
                      <Text style={styles.textStyle}>
                        {order?.client.codeClient}
                      </Text>
                    </View>
                  )} */}
                  {order?.client?.ci && (
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* <Text>Número de identificación: </Text> */}
                      <Text style={styles.textStyle}>{order?.client.ci}</Text>
                    </View>
                  )}
                  {order?.client?.phones &&
                    order?.client?.phones?.length > 0 &&
                    Number(order?.client?.phones[0]?.number) !== 0 && (
                      <View
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {/* <Text>Teléfono: </Text> */}
                        <Text style={styles.textStyle}>
                          {order?.client?.phones[0].number}
                        </Text>
                      </View>
                    )}
                  {order?.client?.email && (
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* <Text>Correo electrónico: </Text> */}
                      <Text style={styles.textStyle}>
                        {order?.client?.email}
                      </Text>
                    </View>
                  )}
                  {order?.client?.contractNumber && (
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* <Text>No. de contrato: </Text> */}
                      <Text style={styles.textStyle}>
                        {order?.client?.contractNumber}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {order?.billing && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* <Text>Dirección: </Text> */}
                  <Text
                    style={{
                      ...styles.textStyle,
                      display: "flex",
                      flexWrap: "wrap",
                    }}
                  >
                    {(order?.billing?.city ? order?.billing?.city + ", " : "") +
                      (order?.billing?.municipality?.name
                        ? order?.billing?.municipality?.name + ", "
                        : "") +
                      (order?.billing?.province?.name
                        ? order?.billing?.province?.name
                        : "")}
                  </Text>
                </View>
              )}
              {order?.client?.legalNotes && (
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text>Apuntes legales: </Text>
                  <Text style={styles.textStyle}>
                    {order?.client.legalNotes}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={{ marginTop: 10, textAlign: "right" }}>
            <Text>
              Fecha: {moment(order?.createdAt).format("DD [de] MMMM [de] YYYY")}
            </Text>
            <Text>
              {order?.isPreReceipt
                ? `Pre-Factura No.${order?.preOperationNumber}/${parseISO(
                  order?.createdAt!
                ).getFullYear()}`
                : `Factura No.${order?.operationNumber ?? ""}/${parseISO(
                  order?.createdAt!
                ).getFullYear()}`}
            </Text>
          </View>
        </View>
      </View>

      {reportType !== "delivery" ? (
        <View>
          <BillingTableTemplate
            data={
              order?.selledProducts?.map((prod) => ({
                Producto: (
                  <View style={(styles.flex, styles.flexCol)}>
                    <Text style={[{ textAlign: "left" }]}>{prod.name}</Text>

                    {prod.observations && (
                      <Text
                        style={{
                          color: "gray",
                          opacity: 0.8,
                          textAlign: "left",
                        }}
                      >
                        {prod.observations}
                      </Text>
                    )}
                  </View>
                ),
                " ": " ",
                UM: prod.measure ? getMeasureSpanish(prod.measure) : "-",
                Cant: (
                  <Text style={[{ textAlign: "center" }]}>{prod.quantity}</Text>
                ),
                "Precio unitario": (
                  <Text style={[{ textAlign: "center" }]}>
                    {printPriceWithCommasAndPeriods(prod.priceUnitary.amount) +
                      " " +
                      prod.priceUnitary.codeCurrency}
                  </Text>
                ),
                "Importe total": (
                  <Text style={[{ textAlign: "center" }]}>
                    {printPriceWithCommasAndPeriods(prod.priceUnitary.amount * prod.quantity) +
                      " " +
                      prod.priceTotal.codeCurrency}
                  </Text>
                ),
              })) || []
            }
          />
        </View>
      ) : (
        <View>
          <TableTemplate
            data={
              order?.selledProducts?.map((prod) => ({
                Producto: prod.name,
                " ": " ",
                UM: prod.measure ? getMeasureSpanish(prod.measure) : "-",
                Cantidad: prod.quantity,
              })) || []
            }
          />
        </View>
      )}

      {reportType !== "delivery" && (
        <View style={styles.pageEnd}>
          <View style={{ ...styles.h2, width: 200 }}>
            <Text style={styles.pageEndRow}>
              <Text style={styles.pageEndTitle}>
                {order?.discount! > 0 || order?.commission! > 0
                  ? "Importe "
                  : "Subtotal "}
              </Text>
              <Text>
                {subtotal.map((elem) => (
                  <Text>
                    {printPriceWithCommasAndPeriods(elem.amount) +
                      " " +
                      elem.codeCurrency +
                      " " +
                      "\n"}
                  </Text>
                ))}
              </Text>
            </Text>

            {order?.shippingPrice && (
              <Text style={styles.pageEndRow}>
                <Text style={styles.pageEndTitle}>Envío </Text>
                <Text>
                  {order?.shipping
                    ? order?.shippingPrice?.amount
                      ? printPriceWithCommasAndPeriods(order?.shippingPrice?.amount) +
                      " " +
                      order?.shippingPrice?.codeCurrency
                      : "-"
                    : "0"}
                </Text>
              </Text>
            )}

            {(order?.discount! > 0 || order?.couponDiscountPrice) &&
              order?.status === "BILLED" && (
                <Text style={styles.pageEndRow}>
                  <Text style={styles.pageEndTitle}>Descuento: </Text>
                  <Text>
                    <Text> {order.discount}%</Text>
                    <Text>  </Text>
                    {discount.map((elem) => (
                      <Text>
                        {printPriceWithCommasAndPeriods(elem.amount) +
                          " " +
                          elem.codeCurrency +
                          " "}
                      </Text>
                    ))}
                  </Text>

                </Text>
              )}

            {order?.status === "BILLED" && (
              <>
                {order?.commission! > 0 && (
                  <Text style={styles.pageEndRow}>
                    <Text style={styles.pageEndTitle}>Comisiones: </Text>
                    <Text> {order.commission}%</Text>
                    <Text>  </Text>
                    <Text>
                      {comission.map((elem) => (
                        <Text>
                          {printPriceWithCommasAndPeriods(elem.amount) +
                            " " +
                            elem.codeCurrency +
                            " "}
                        </Text>
                      ))}
                    </Text>
                  </Text>
                )}
              </>
            )}

            {(order?.couponDiscountPrice ||
              order?.discount !== 0 ||
              order?.commission! > 0 ||
              order?.shippingPrice ||
              order?.taxes) &&
              order?.status === "BILLED" && (
                <Text style={styles.pageEndRow}>
                  <Text style={styles.pageEndTitle}>Subtotal </Text>
                  <Text style={styles.flexCol}>
                    {order?.prices?.map((itm) => (
                      <Text>
                        {printPriceWithCommasAndPeriods(
                          sumarPriceInvoices(
                            discount,
                            comission,
                            order?.taxes!,
                            order?.shippingPrice!
                          ).find(
                            (elem) => elem.codeCurrency === itm.codeCurrency
                          )
                            ? itm.price +
                            sumarPriceInvoices(
                              discount,
                              comission,
                              order?.taxes!,
                              order?.shippingPrice!
                            )?.find(
                              (elem) =>
                                elem.codeCurrency === itm.codeCurrency
                            )?.amount!
                            : itm.price
                        )}{" "}
                        {itm.codeCurrency}
                        {"\n"}
                      </Text>
                    ))}
                  </Text>
                </Text>
              )}

            {order?.orderModifiers?.length! > 0 && (
              <View style={styles.pageEndRowWithoutFlex}>
                <View
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "flex-end",
                    width: "100%",
                    textAlign: "right",
                  }}
                >
                  {order?.orderModifiers?.map((modifier) => (
                    <View
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        textAlign: "right",
                      }}
                    >
                      <Text style={{ marginRight: 4 }}>
                        {modifier.showName}
                      </Text>
                      <Text>{printPriceWithCommasAndPeriods(modifier.amount)}</Text>
                      <Text style={{ marginLeft: 4 }}>
                        {modifier.codeCurrency}{" "}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.pageEnd}>
              <View style={{ ...styles.h2, width: 200 }}>
                <Text style={styles.pageEndRow}>
                  {order?.status === "BILLED" ? (
                    <>
                      <Text style={styles.pageEndTitle}>Total pagado: </Text>
                    </>
                  ) : (
                    <Text style={styles.pageEndTitle}>
                      Total a pagar: {"  "}
                    </Text>
                  )}

                  {order?.status === "BILLED" ? (
                    <View>
                      {order?.currenciesPayment.map((item, idx) => {
                        return (
                          <Text style={styles.pageEndTitle}>
                            {translatePaymetMethodsShort(item.paymentWay)}{" "}
                            {printPriceWithCommasAndPeriods(item?.amount) +
                              "  " +
                              item?.codeCurrency}{" "}
                            {"\n"}
                          </Text>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.flexCol}>
                      {totalToPay.map((item: SimplePrice) => {
                        return (
                          <Text>
                            {printPriceWithCommasAndPeriods(item?.amount) +
                              "  " +
                              item?.codeCurrency +
                              " " +
                              "\n"}
                          </Text>
                        );
                      })}
                    </Text>
                  )}
                </Text>
              </View>
            </View>

            {order?.amountReturned && order?.amountReturned?.amount! > 0 && (
              <Text style={styles.pageEndFinalRow}>
                <Text style={styles.pageEndTitle}>Cambio </Text>

                <Text style={styles.flexCol}>
                  <Text>
                    {printPriceWithCommasAndPeriods(order?.amountReturned?.amount) +
                      "  " +
                      order?.amountReturned?.codeCurrency +
                      " "}
                  </Text>
                </Text>
              </Text>
            )}

            {order?.paidAt && (
              <Text style={{ marginTop: 4, textAlign: "right" }}>
                {" "}
                Fecha de pago:{" "}
                {moment(order?.paidAt).format("DD [de] MMMM [de] YYYY")}{" "}
              </Text>
            )}
          </View>
        </View>
      )}

      {/*  */}
      <View style={styles.flexCol}>
        {order?.shipping && reportType === "delivery" && (
          <View style={{ width: "100%", paddingTop: 10 }}>
            <div>
              <View>
                {order?.shipping ? (
                  <Text
                    style={{
                      borderBottom: "1px solid black",
                      paddingBottom: 3,
                      marginBottom: 4,
                      width: "30%",
                    }}
                  >
                    Datos de envío:{" "}
                  </Text>
                ) : (
                  ""
                )}

                {order?.shipping?.firstName ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Receptor:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.firstName +
                        " " +
                        order?.shipping?.lastName}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.phone &&
                  Number(order?.shipping?.phone) !== 0 ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    {/* <Text>Teléfono:</Text> */}
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.phone}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.email ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Correo electrónico:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.email}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.street_1 ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Calle principal:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.street_1}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.street_2 ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Calle secundaria:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.street_2}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.city ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Localidad:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.city}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.postalCode &&
                  Number(order?.shipping?.postalCode) !== 0 ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Código postal:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.postalCode}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.municipality ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Municipio:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.municipality?.name}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.province ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>Provincia:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.province?.name}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}

                {order?.shipping?.country ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <Text>País:</Text>
                    <Text style={styles.textStyle}>
                      {" "}
                      {order?.shipping?.country?.name}{" "}
                    </Text>
                  </View>
                ) : (
                  ""
                )}
              </View>
            </div>
          </View>
        )}

        {order?.shipping?.description && reportType === "delivery" && (
          <View style={{ width: "100%", paddingTop: 10 }}>
            <div>
              <View>
                <Text
                  style={{
                    borderBottom: "1px solid black",
                    paddingBottom: 3,
                    marginBottom: 4,
                    width: "30%",
                  }}
                >
                  Descripción de envío:{" "}
                </Text>
                <Text
                  style={{
                    ...styles.textStyle,
                    flexWrap: "wrap",
                    paddingRight: 4,
                  }}
                >
                  {" "}
                  {order?.shipping?.description}{" "}
                </Text>
              </View>
            </div>
          </View>
        )}

        {order?.partialPayments?.length! > 0 && (
          <View style={{ width: "70%" }}>
            <Text
              style={{
                borderBottom: "1px solid black",
                paddingBottom: 3,
                marginBottom: 4,
                width: "30%",
              }}
            >
              {order?.status !== "BILLED"
                ? `Pagos parciales:`
                : `Detalles del pago`}{" "}
            </Text>
            <TableTemplate
              data={
                order?.partialPayments?.map((partial) => ({
                  Fecha: moment(partial.createdAt).format(
                    "DD [de] MMMM [de] YYYY"
                  ),
                  Monto:
                    printPriceWithCommasAndPeriods(partial.amount) + " " + partial.codeCurrency,
                  "Forma de pago": translatePaymetMethods(partial.paymentWay),
                  Observaciones: partial.observations,
                })) || []
              }
            />
          </View>
        )}

        {order?.customerNote && (
          <View style={{ width: "100%", paddingTop: 10 }}>
            <div>
              <View>
                <Text
                  style={{
                    borderBottom: "1px solid black",
                    paddingBottom: 3,
                    marginBottom: 4,
                    width: "30%",
                  }}
                >
                  Notas del cliente:{" "}
                </Text>
                <Text
                  style={{
                    ...styles.textStyle,
                    flexWrap: "wrap",
                    paddingRight: 4,
                  }}
                >
                  {" "}
                  {order?.customerNote}{" "}
                </Text>
              </View>
            </div>
          </View>
        )}

        {order?.observations && (
          <View style={{ width: "100%", paddingTop: 10 }}>
            <div>
              <View>
                <Text
                  style={{
                    borderBottom: "1px solid black",
                    paddingBottom: 3,
                    marginBottom: 4,
                    width: "30%",
                  }}
                >
                  Observaciones:{" "}
                </Text>
                <Text
                  style={{
                    ...styles.textStyle,
                    flexWrap: "wrap",
                    paddingRight: 4,
                  }}
                >
                  {" "}
                  {order?.observations}{" "}
                </Text>
              </View>
            </div>
          </View>
        )}
      </View>

      <Text style={styles.textStyle}>{invoice_observations}</Text>

      (
      <View style={{ display: "flex", flexDirection: "row", width: "100%", justifyContent: "center", alignItems: "center" }}>
        <View style={{ ...styles.flex, marginTop: 50 }}>
          <View style={{ width: 100 }}>
            <Text style={{ borderBottom: "2px", width: 100 }}> </Text>
            <Text style={{ textAlign: "center", fontSize: 10 }}>
              Entregado{" "}
            </Text>
          </View>
          <View style={{ width: 100 }}>
            <Text style={{ borderBottom: "2px", width: 100 }}> </Text>
            <Text style={{ textAlign: "center", fontSize: 10 }}>Recibido </Text>
          </View>
        </View>
      </View>
      )
    </DocumentPage>
  );
};
export default BillingReportPdf;

const getCurrencyRate = (
  code: string,
  availableCurrencies: AvailableCurrency[]
) => {
  const currency = availableCurrencies.find((item) => item.code === code);
  return currency?.exchangeRate || 1;
};
const calculatePaymentDiff = (
  totalToPay: PriceInvoiceInterface[] = [],
  payments: PriceInvoiceInterface[] = [],
  availableCurrencies: AvailableCurrency[],
  mainCurrencyBusiness: string
) => {
  let paymentState: (PriceInvoiceInterface & { diff: number })[] =
    totalToPay.map((item) => ({ ...item, diff: item.amount }));
  let remain = 0;
  //match same currencies ------------------
  payments.forEach((payment) => {
    const idx = paymentState.findIndex(
      (toPay) => toPay.codeCurrency === payment.codeCurrency
    );
    if (idx !== -1) {
      const matchCurrency = paymentState[idx];
      //Fixed temp redondeo
      const diff = roundToTwoDecimalDow(payment.amount - matchCurrency.diff);
      if (diff > 0) {
        matchCurrency.diff = 0;
        const sum = roundToTwoDecimalDow(
          mathOperation(
            diff,
            getCurrencyRate(payment.codeCurrency, availableCurrencies),
            "multiplication",
            2
          )
        );
        remain = mathOperation(remain, sum, "addition");
      } else {
        matchCurrency.diff = Math.abs(diff);
      }
      paymentState.splice(idx, 1, matchCurrency);
    } else {
      const sum = mathOperation(
        payment.amount,
        getCurrencyRate(payment.codeCurrency, availableCurrencies),
        "multiplication"
      );
      remain = mathOperation(remain, sum, "addition");
      //remain += payment.amount * getCurrencyRate(payment.codeCurrency);
    }
  });
  //------------------------------------------------------------

  //complete with remain (first not main currencies) ------------------------
  while (remain > 0) {
    //find non zero & not null differences & not mainCurrency -------------------------
    const idx = paymentState.findIndex(
      (item) =>
        ![0, null].includes(item.diff) &&
        item.codeCurrency !== mainCurrencyBusiness
    );
    if (idx !== -1) {
      const notMainOrNull = paymentState[idx];
      const remainConverted =
        remain /
        getCurrencyRate(notMainOrNull.codeCurrency, availableCurrencies);
      const diff = remainConverted - notMainOrNull.diff!;
      if (diff > 0) {
        notMainOrNull.diff = 0;
        remain =
          diff *
          getCurrencyRate(notMainOrNull.codeCurrency, availableCurrencies);
        totalToPay.splice(idx, 1, notMainOrNull);
      } else {
        remain = 0;
        notMainOrNull.diff = Math.abs(diff);
        totalToPay.splice(idx, 1, notMainOrNull);
        break;
      }
    }

    //-------------------------------------------------------------------

    //find null difference & notMainCurrency ----------------------------------------------
    const diffIsNull = paymentState.find(
      (item) => item.diff === null && item.codeCurrency !== mainCurrencyBusiness
    );
    if (diffIsNull) {
      const remainConverted =
        remain / getCurrencyRate(diffIsNull.codeCurrency, availableCurrencies);
      const diff = remainConverted - diffIsNull.amount;
      if (diff > 0) {
        diffIsNull.diff = 0;
        remain =
          diff * getCurrencyRate(diffIsNull.codeCurrency, availableCurrencies);
      } else {
        remain = 0;
        diffIsNull.diff = Math.abs(diff);
        break;
      }
    }

    //-------------------------------------------------------------------------------------

    //find mainCurrency ------------------------------------------------------------------
    const mainCurrency = paymentState.find(
      (item) => item.codeCurrency === mainCurrencyBusiness && item.diff !== 0
    );
    if (mainCurrency) {
      const remainConverted =
        remain /
        getCurrencyRate(mainCurrency.codeCurrency, availableCurrencies);
      const diff = remainConverted - (mainCurrency.diff ?? mainCurrency.amount);
      if (diff > 0) {
        mainCurrency.diff = 0;
        remain =
          diff *
          getCurrencyRate(mainCurrency.codeCurrency, availableCurrencies);
      } else {
        remain = 0;
        mainCurrency.diff = Math.abs(diff);
        break;
      }
    } else {
      break;
    }
    //-----------------------------------------------------------------------------------
  }
  //--------------------------------------------------------------------------
  //Complete null diff with amount---------------------------------------------
  paymentState = paymentState.map((item) =>
    item.diff === null ? { ...item, diff: item.amount } : item
  );
  //---------------------------------------------------------------------------
  return paymentState
    .filter((item) => item.diff !== 0)
    .map((itm) => ({
      amount: roundToTwoDecimal(itm.diff!),
      codeCurrency: itm.codeCurrency,
    }));
};
