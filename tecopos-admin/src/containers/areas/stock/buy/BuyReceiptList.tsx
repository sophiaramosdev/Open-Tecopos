import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb, {
  PathInterface,
} from "../../../../components/navigation/Breadcrumb";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { FaPlus } from "react-icons/fa6";
import { useAppSelector } from "../../../../store/hooks";
import useServerArea from "../../../../api/useServerArea";
import { formatCalendar, formatCurrency } from "../../../../utils/helpers";
import { StatusBadge } from "../../../../components/misc/badges/StatusBadge";
import Modal from "../../../../components/misc/GenericModal";
import ReceiptWizardContainer from "./newReceiptWizzard/ReceiptWizardContainer";
import Paginate from "../../../../components/misc/Paginate";
import { BasicType } from "../../../../interfaces/InterfacesLocal";
import EditContainer from "./editReceipt/EditContainer";

const BuyReceiptList = () => {
  const navigate = useNavigate();
  const { business } = useAppSelector((state) => state.init);
  const {
    getAllReceipt,
    addReceipt,
    receiptList,
    isLoading,
    isFetching,
    paginate,
    updateReceiptsLocally
  } = useServerArea();
  const [newReceipt, setNewReceipt] = useState(false);
  const [editReceipt, setEditReceipt] = useState<number | null>();
  const [filter, setFilter] = useState<BasicType>({});

  useEffect(() => {
    getAllReceipt(filter);
  }, [filter]);

  //Breadcrumb -----------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis almacenes",
      action: () => navigate("/stocks"),
    },
    {
      name: "Compra",
    },
  ];
  //------------------------------------------
  //Table data ---------------------------------
  const tableTitles = [
    "Fecha de creación",
    "Estado",
    "Creado por",
    "Costo total",
  ];

  const tableData: DataTableInterface[] = [];
  receiptList.forEach((receipt) => {
    tableData.push({
      rowId: receipt.id,
      payload: {
        "Fecha de creación": formatCalendar(receipt.createdAt),
        Estado: <StatusBadge status={receipt.status} />,
        "Creado por": receipt.createdBy.displayName,
        "Costo total": formatCurrency(
          receipt.totalCost,
          business?.costCurrency
        ),
      },
    });
  });

  const tableActions: BtnActions[] = [
    {
      title: "Nueva compra",
      icon: <FaPlus className="h-5" />,
      action: () => setNewReceipt(true),
    },
  ];

  const rowAction = (id: number) => {
    setEditReceipt(id);
  };
  //--------------------------------------------
  return (
    <div>
      <Breadcrumb
        icon={<RectangleGroupIcon className="h-7 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        actions={tableActions}
        rowAction={rowAction}
        loading={isLoading}
        paginateComponent={
          <Paginate
            data={paginate}
            action={(page: number) => setFilter({ ...filter, page })}
          />
        }
      />
      {newReceipt && (
        <Modal state={newReceipt} close={setNewReceipt} size="l">
          <ReceiptWizardContainer
            addReceipt={addReceipt}
            isFetching={isFetching}
            closeModal={() => setNewReceipt(false)}
          />
        </Modal>
      )}

      {!!editReceipt && (
        <Modal state={!!editReceipt} close={() => setEditReceipt(null)} size="l">
          <EditContainer id={editReceipt} updateLocaly={updateReceiptsLocally} />
        </Modal>
      )}
    </div>
  );
};

export default BuyReceiptList;
