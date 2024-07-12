import { useContext } from "react";
import { RegisterDetailsContext } from "../RegisterDetailsContainer";
import { PartialPaymentInterface } from "../../../../interfaces/ServerInterfaces";
import GenericTable from "../../../../components/misc/GenericTable";
import { formatCurrency, formatDate } from "../../../../utils/helpers";
import { translatePaymetMethods } from "../../../../utils/translate";
import moment from "moment";

export const PartialPaysDetailsTab = () => {
  const { order } = useContext(RegisterDetailsContext);
  //@ts-ignore
  const partialPaymentsList: PartialPaymentInterface[] =
    order?.partialPayments?.map((item) => item) ?? [];
  const tableTitles = [
    "No. de pago",
    "Registro de caja",
    "Observaciones",
    "Método de pago",
    "Importe",
  ];

  const tableData: any[] = [];
  partialPaymentsList.map((item, i) => {
    const newRow: any = {
      rowId: item.id,
      payload: {
        "No. de pago": item?.paymentNumber ?? i + 1,
        "Método de pago": translatePaymetMethods(item?.paymentWay),
        Observaciones: item?.observations,
        Importe: formatCurrency(item?.amount, item?.codeCurrency),
      },
    };

    if (item?.cashRegisterOperations?.length > 0) {
      if (item?.cashRegisterOperations[0]?.paymentDateClient) {
        newRow.payload["Fecha de pago del cliente"] = formatDate(
          item.cashRegisterOperations[0]?.paymentDateClient
        );
      }
      if (item?.cashRegisterOperations[0]?.operationNumber) {
        newRow.payload["Registro de caja"] = `RC-${moment(
          item.createdAt
        ).year()}/${item.cashRegisterOperations[0]?.operationNumber}`;
      }
    }

    tableData.push(newRow);
  });

  return (
    <div className="h-[26rem] px-3">
      <GenericTable tableTitles={tableTitles} tableData={tableData} />
    </div>
  );
};
