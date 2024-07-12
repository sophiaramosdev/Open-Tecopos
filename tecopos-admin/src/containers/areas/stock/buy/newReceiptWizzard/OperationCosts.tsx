import { useContext, useState } from "react";
import ReceiptContext from '../ReceiptContext' 
import Button from "../../../../../components/misc/Button";
import { FaPlus } from "react-icons/fa";
import Modal from "../../../../../components/misc/GenericModal";
import OperationsForm from "./OperationsForm";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import { formatCurrency } from "../../../../../utils/helpers";

const OperationCosts = () => {
  const { fieldsOperations } = useContext(ReceiptContext);
  const [operationsForm, setOperationsForm] = useState<number | null>(null); //value = -1 means new item

  //Manage Table -----------------------------------------------------
  const tableTitles = ["Categorías de costo", "Costos", "Observaciones"];
  const tableData: DataTableInterface[] = [];
  fieldsOperations!.forEach((item: any, idx: number) => {
    tableData.push({
      rowId: idx,
      payload: {
        "Categorías de costo": item.fixedCostCategory?.name ?? "-",
        Costos: formatCurrency(
          item.registeredPrice.amount,
          item.registeredPrice.codeCurrency
        ),
        Observaciones: item.observations,
      },
    });
  });

  const rowAction = (id: number) => {
    setOperationsForm(id);
  };

  //----------------------------------------------------
  return (
    <div className="p-3 h-full overflow-auto scrollbar-none">
      <div className="flex justify-end pb-5">
        <Button
          color="slate-400"
          textColor="slate-500"
          icon={<FaPlus />}
          name="Añadir"
          action={()=>setOperationsForm(-1)}
          outline
        />
      </div>
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
      />
      {operationsForm !== null && (
        <Modal
          state={operationsForm !== null}
          close={() => setOperationsForm(null)}
          size="m"
        >
          <OperationsForm
            id={operationsForm}
            close={() => setOperationsForm(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default OperationCosts;
