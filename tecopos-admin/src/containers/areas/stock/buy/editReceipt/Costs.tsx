import React, { useContext } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import ReceiptContext from "../ReceiptContext";
import { formatCurrency } from "../../../../../utils/helpers";
import { useAppSelector } from "../../../../../store/hooks";

const Costs = () => {
  const { receipt } = useContext(ReceiptContext);
  const {business} = useAppSelector(state=>state.init);

  const tableTitles = ["Categorías de costo", "Costos", "Observaciones"];
  const tableData: DataTableInterface[] = [];
  receipt?.costs.forEach((item: any, idx: number) => {
    tableData.push({
      rowId: idx,
      payload: {
        "Categorías de costo": item.fixedCostCategory?.name ?? "-",
        Costos: formatCurrency(
          item.costAmount,
          business?.costCurrency
        ),
        Observaciones: item.observations,
      },
    });
  });

  return (
    <div className="h-full overflow-auto scrollbar-none p-3">
      <GenericTable tableTitles={tableTitles} tableData={tableData} />
    </div>
  );
};

export default Costs;
