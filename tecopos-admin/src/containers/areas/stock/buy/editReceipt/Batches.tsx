import React, { useContext, useState } from "react";
import ReceiptContext from "../ReceiptContext";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import { formatCurrency } from "../../../../../utils/helpers";
import { translateMeasure } from "../../../../../utils/translate";
import Button from "../../../../../components/misc/Button";
import ProductSelector from "../newReceiptWizzard/ProductSelector";

const Batches = () => {
  const { receipt } = useContext(ReceiptContext);
  const [updateModal, setUpdateModal] = useState(false);

  const tableTitles = [
    "Nombre",
    "Cantidad",
    "Unidad de medida",
    "No. paquetes",
    "Costo bruto",
    "Costo neto",
    "Lote",
  ];

  const tableData: DataTableInterface[] = [];
  receipt?.batches.map((batch) =>
    tableData.push({
      rowId: batch.id,
      payload: {
        Nombre: batch.product.name,
        Cantidad: batch.entryQuantity,
        "Unidad de medida": translateMeasure(batch.measure),
        "No. paquetes": batch?.noPackages ?? "-",
        "Costo neto": formatCurrency(
          batch.netCost?.amount ?? 0,
          batch.netCost?.codeCurrency
        ),
        "Costo bruto": formatCurrency(
          batch.grossCost?.amount ?? 0,
          batch.grossCost?.codeCurrency
        ),
        Lote: batch.uniqueCode,
      },
    })
  );

  return (
    <div className="h-full overflow-auto scrollbar-none p-2">
      {receipt?.status === "CREATED" && (
        <div className="w-full flex justify-end pb-2">
          <Button
            name={updateModal ? "Atras" : "Actualizar"}
            color="slate-400"
            textColor="slate-600"
            action={() => setUpdateModal(!updateModal)}
            outline
          />
        </div>
      )}
      {updateModal ? (
        <div className="h-[27.5rem]">
          <ProductSelector />
        </div>
      ) : (
        <GenericTable tableTitles={tableTitles} tableData={tableData} />
      )}
    </div>
  );
};

export default Batches;
