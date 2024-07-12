import { Fragment } from "react";
import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { formatCurrency, formatDateForTable } from "../utils/helpers";
import DocumentHeader from "../components/pdf/DocumentHeader";
import {
  RegisterBillingInterface,
  BusinessInterface,
} from "../interfaces/ServerInterfaces";
import { translateOrderOrigin, translateOrderState } from "../utils/translate";
import { Image as Logo, StyleSheet, Text, View } from "@react-pdf/renderer";
import APIMediaServer from "../api/APIMediaServer";
import { blobToDataURL } from "./helpers/commons";
interface PdfSelledInterface {
  orders: RegisterBillingInterface[];
  filters: { dateFrom: string | Date; dateTo: string | Date };
  business: BusinessInterface | null;
}

const styles = StyleSheet.create({
  logoContainer: {
    flexBasis: "50%",
    alignItems: "flex-start",
  },
  businessLogo: {
    height: 85.4,
    objectFit: "contain",
    paddingLeft: 0.9,
  },
});
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
  

const BillingOrderListPdf = ({ orders, filters,business }: PdfSelledInterface) => {
  return (
    <DocumentPage>
         <Logo
          style={styles.businessLogo}
          src={business?.logo ? getBusinessLogo(business?.logo?.id) : ""}
        />
      <DocumentHeader text="Reporte de facturas" subtext={""} />
      <Fragment>
       
        <TableTemplate
          tableName={"Facturas"}
          data={orders.map((item, idx) => {
            return {
              Tipo: !item?.isPreReceipt ? "Factura" : "Pre-Factura",
              "No.": !item?.isPreReceipt
                ? item.operationNumber
                : item.preOperationNumber,
              Cliente: `${item.client?.firstName ?? ""} ${item.client?.lastName ?? ""}`,
              Estado: translateOrderState(item.status),
              Emisión: formatDateForTable(item?.createdAt),
              Origen: translateOrderOrigin(item.origin),
              Importe: item.totalToPay
                .map(
                  (total) =>
                    `${formatCurrency(total.amount, total.codeCurrency)}`
                )
                .join(" "),
            };
          })}
          containTotals
        />
      </Fragment>
    </DocumentPage>
  );
};

export default BillingOrderListPdf;
