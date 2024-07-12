import React from "react";
import { OrderInterface } from "../../../interfaces/ServerInterfaces";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { formatCalendar } from "../../../utils/helpers";

interface Opp {
  order: OrderInterface | null;
}

const Opperations = ({ order }: Opp) => {
  const tableTitles = [
    "Tipo de operación",
    "Fecha",
    "Realizada por",
    "Descripción",
  ];

  const tableData: DataTableInterface[] =
    order?.records
      ?.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return Number(dateB) - Number(dateA);
      })
      .map((item, idx) => ({
        rowId: idx,
        payload: {
          "Tipo de operación": item?.title,
          Fecha: formatCalendar(item?.createdAt),
          "Realizada por": item?.madeBy?.displayName,
          Descripción: <p className="text-justify">{item?.details}</p> ,
        },
      })) ?? [];

  return (
    <div className="h-96 overflow-scroll scrollbar-thin scrollbar-thumb-gray-300">
      <GenericTable tableData={tableData} tableTitles={tableTitles} />
    </div>
  );
};

export default Opperations;
