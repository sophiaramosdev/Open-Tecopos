import { useEffect, useState } from "react";
import { ArrowPathRoundedSquareIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import Modal from "../../../components/misc/GenericModal";
import { useServerBilling } from "../../../api/useServerBilling";
import {
} from "../../../interfaces/ServerInterfaces";
import SalesByOrdersModal from "./analysisModals/SalesByOrdersModal";
import AccountingSummaryByOrdersModal from "./analysisModals/AccountingSummaryByOrdersModal";
import SalesByGrossMerchandise from "./analysisModals/SalesByGrossMerchandise";


export const EconomicCyclesAnalysis = ({breadcrumb = true }) => {

  //ShowModalsState--------------------------------------------------------------------------------------
  const [showModalSalesByOrders, setShowModalSalesByOrders] = useState(false);
  const [showModalAccountingSummaryByOrders, setShowModalAccountingSummaryByOrders] = useState(false);
  const [showModalSalesByGrossMerchandise, setShowModalSalesByGrossMerchandise] = useState(false);

  
  //-----------------------------------------------------------------------------------------------------
 
  
  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle: string[] = ["Nombre del reporte"];

  const reportsType = [
    {
      id: 1,
      name: "Buscador de órdenes",
    },
    {
      id: 2,
      name: "Resumen contable por órdenes",
    },
    {
      id: 3,
      name: "Venta bruta de mercancías",
    },
  ];

  const tableData: DataTableInterface[] = [];
  reportsType.map(({ id, name }) => {
    tableData.push({
      rowId: id,
      payload: {
        "Nombre del reporte": name,
      },
    });
  });

  // Row table actions
  const rowAction = (id: number) => {
    if (id === 1) {
      setShowModalSalesByOrders(true);
    }
    if (id === 2) {
      setShowModalAccountingSummaryByOrders(true);
    }
    if (id === 3) {
      setShowModalSalesByGrossMerchandise(true);
    }
  };

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Ciclos económicos",
    },
    {
      name: "Análisis",
    },
  ];

  return (
    <>
     {breadcrumb && <Breadcrumb
        icon={<ArrowPathRoundedSquareIcon className="h-6 text-gray-500" />}
        paths={paths}
      />}

      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        rowAction={rowAction}
      />

      {showModalSalesByOrders && (
        <Modal state={showModalSalesByOrders} close={() => setShowModalSalesByOrders(false)}>
        {<SalesByOrdersModal  setShowModal={setShowModalSalesByOrders}/>}
        </Modal>
      )} 

     {showModalAccountingSummaryByOrders && (
        <Modal state={showModalAccountingSummaryByOrders} close={() => setShowModalAccountingSummaryByOrders(false)}>
         <AccountingSummaryByOrdersModal  setShowModal={setShowModalAccountingSummaryByOrders}/>
        </Modal>
      )} 

      {showModalSalesByGrossMerchandise && (
        <Modal state={showModalSalesByGrossMerchandise} close={() => setShowModalSalesByGrossMerchandise(false)}>
        {<SalesByGrossMerchandise />}
        </Modal>
      )} 
    </>
  );
};

export default EconomicCyclesAnalysis;
