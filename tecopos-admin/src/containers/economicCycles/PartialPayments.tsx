/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable array-callback-return */
import { useEffect, useState } from "react";
import moment from "moment";
import GenericTable, { DataTableInterface } from "../../components/misc/GenericTable";
import { translatePaymetMethods } from "../../utils/translate";
import { formatCurrency, formatDate } from "../../utils/helpers";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import Paginate from "../../components/misc/Paginate";
import PosOrderDetails from "./orders/PosOrderDetails";
import Modal from "../../components/misc/GenericModal";

export const PartialPayments = (ecoCycle: any) => {
  const {
    getPartialpaymentsByEconomicCycle,
    partialpaymentsByEconomicCycle,
    isFetching,
    paginate
  } = useServerEcoCycle();

  const [ecoCycleId, setEcoCycleId] = useState<number | null | undefined>(null)

  useEffect(() => {
    getPartialpaymentsByEconomicCycle(ecoCycle?.ecoCycle?.id);
  }, []);



  const tableTitles = [
    "No. de pago",
    /*  "Registro de caja", */
    "Método de pago",
    "Importe",
    "Fecha",
    "Observaciones",
  ];

  const tableData: DataTableInterface[] = [];
  //@ts-ignore
  partialpaymentsByEconomicCycle?.items?.map((item) => {
    const newRow: any = {
      rowId: item.orderReceipt.id,
      payload: {
        "No. de pago": item?.paymentNumber ?? "-",
        "Método de pago": translatePaymetMethods(item?.paymentWay) ?? "-",
        Importe: formatCurrency(item?.amount, item?.codeCurrency) ?? "-",
        Fecha: formatDate(item?.createdAt) ?? "-",
        Observaciones: item?.observations ?? "-",
      },
    };

    if (item?.cashRegisterOperations?.length > 0) {
      if (item?.cashRegisterOperations[0]?.paymentDateClient) {
        newRow.payload["Fecha de pago del cliente"] = formatDate(
          item.cashRegisterOperations[0]?.paymentDateClient
        ) ?? "-";
      }
      if (item?.cashRegisterOperations[0]?.operationNumber) {
        newRow.payload["Registro de caja"] = `RC-${moment(
          item.createdAt
        ).year()}/${item.cashRegisterOperations[0]?.operationNumber}` ?? "-";
      }
    }

    tableData.push(newRow);
  });

  const rowAction = (id: number) => {

    setEcoCycleId(id)
  };

  return (
    <>
      <div className="h-[26rem] px-3">
        <GenericTable
          rowAction={rowAction}
          loading={isFetching}
          tableTitles={tableTitles}
          paginateComponent={
            <Paginate
              action={(page: number) => { }}
              data={paginate}
            />
          }
          tableData={tableData}
        />
      </div>

      {!!ecoCycleId && (
        <Modal state={!!ecoCycleId} close={() => setEcoCycleId(null)} size="l">
          <PosOrderDetails
            id={ecoCycleId}
            updState={() => { }}
          />
        </Modal>
      )}
    </>

  );
};

export default PartialPayments;
