import {
  BusinessInterface,
  OrderInterface,
} from "../interfaces/ServerInterfaces";
import Report from "./components/Report";
import moment from "moment";
import { cleanArrayData } from "./helpers/commons";

interface DeliveryReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: OrderInterface;
}

const DeliveryReport = ({
  reportName,
  businessData,
  reportData,
}: DeliveryReportProps) => {
  let shippingBySubsection = [];
  let shippingToSubsection = [];

  if (reportData.billing) {
    let text;
    text = cleanArrayData([
      reportData.billing.firstName ?? "",
      reportData.billing.lastName ?? "",
    ]).join(" ");
    text && shippingBySubsection.push(text);
  }

  if (reportData.shipping) {
    let text;
    // @ts-ignore
    if (reportData.pickUpInStore) {
      shippingToSubsection.push("Entregar en la Tienda");
    } else {
      text = cleanArrayData([
        reportData.shipping.firstName ?? "",
        reportData.shipping.lastName ?? "",
      ]).join(" ");
      text && shippingToSubsection.push(text);
      text = cleanArrayData([
        reportData.shipping.street_1 ?? "",
        reportData.shipping.street_2 ?? "",
      ]).join(", ");
      text && shippingToSubsection.push(text);
      text = cleanArrayData([
        reportData.shipping.city ?? "",
        reportData.shipping.postalCode ?? "",
      ]).join(", ");
      text && shippingToSubsection.push(text);
      text = reportData.shipping.municipality?.name;
      text && shippingToSubsection.push(text);
      text = reportData.shipping.province?.name;
      text && shippingToSubsection.push(text);
      text = reportData.shipping.country?.name;
      text && shippingToSubsection.push(text);
      text = reportData.shipping.email;
      text && shippingToSubsection.push(text);
      text = reportData.shipping.phone;
      text && shippingToSubsection.push(text);
    }
  }

  const data: Array<any> = [
    `${reportName}~title`,
    "titleSeparator",
    {
      display: "section",
      widths: [[24, 1]],
      subsections: [
        {
          "Número de pedido:": reportData.operationNumber.toString(),
          "Fecha de pedido:": moment(reportData.updatedAt).format(
            "DD [de] MMMM [de] YYYY"
          ),
        },
      ],
    },
  ];

  const shippingSubsections = [];
  if (shippingBySubsection.length) {
    shippingSubsections.push([
      "Enviado por:~subtitle",
      ...shippingBySubsection,
    ]);
  } else {
    shippingSubsections.push(["Enviado por:~subtitle", "-"]);
  }
  if (shippingToSubsection.length) {
    shippingSubsections.push(["Enviar a:~subtitle", ...shippingToSubsection]);
  } else {
    shippingSubsections.push(["Enviar a:~subtitle", "-"]);
  }
  if (shippingSubsections.length) {
    data.push("sectionSeparator");
    data.push({
      display: "section",
      widths: [50, 1],
      subsections: shippingSubsections,
    });
  }

  if (reportData.customerNote) {
    data.push(
      "sectionSeparator",
      "Nota ofrecida por el cliente:~subtitle",
      "titleSeparator"
    );
    data.push({
      display: "section",
      widths: [1],
      subsections: [[reportData.customerNote]],
    });
  }

  data.push("sectionSeparator");
  data.push({
    display: "table",
    headers: ["Producto", "Cantidad~nColumn"],
    values: reportData.selledProducts.map((product) => [
      cleanArrayData([
        product.name,
        product.variation?.name && "(" + product.variation?.name + ")",
        //@ts-ignore
        product.compositions &&
          "(" +
            //@ts-ignore
            product.compositions.map((product) => product.name).join(", ") +
            ")",
      ]).join("\n"),
      product.quantity.toString() + "~nColumn",
    ]),
  });

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};
export default DeliveryReport;
