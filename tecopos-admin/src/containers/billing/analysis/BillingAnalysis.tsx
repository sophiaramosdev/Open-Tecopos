import { useEffect, useState } from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
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

import FinancialEconomicCycleReporteModal from "./analysisModals/FinancialEconomicCycleReporteModal";
import FinancialEconomicCycleSumaryModal from "./analysisModals/FinancialEconomicCycleSumaryModal";
import SalesSummaryByCommercialModal from "./analysisModals/SalesSummaryByCommercialModal";

export const BillingAnalysis = ({breadcrumb = true }:any) => {
  const {
    getFinancialEconomicCycleReporte,
    financialEconomicCycleReporte,
    isFetching,
  } = useServerBilling();

  //ShowModalsState--------------------------------------------------------------------------------------
  const [showModalFinancialEconomicCycleSummary, setShowModalFinancialEconomicCycleSummary] = useState(false);
  const [showModalFinancialEconomicCycleReporte, setShowModalFinancialEconomicCycleReporte] = useState(false);
  const [showModalSalesSummaryByCommercial, setShowModalSalesSummaryByCommercial] = useState(false);
  //-----------------------------------------------------------------------------------------------------
 
  
  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle: string[] = ["Nombre del reporte"];

  const reportsType = [
    {
      id: 1,
      name: "Resumen contable de ciclo económico",
    },
    {
      id: 2,
      name: "Listado ampliado de cierre contable de ciclo económico",
    },
    {
      id: 3,
      name: "Resumen de ventas por comerciales",
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
      setShowModalFinancialEconomicCycleSummary(true);
    }
    if (id === 2) {
      setShowModalFinancialEconomicCycleReporte(true);
    }
    if (id === 3) {
      setShowModalSalesSummaryByCommercial(true);
    }
  };

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Facturación",
    },
    {
      name: "Análisis",
    },
  ];

  return (
    <>

      {breadcrumb && <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={paths}
      />}

      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        rowAction={rowAction}
      />


      {showModalFinancialEconomicCycleSummary && (
        <Modal state={showModalFinancialEconomicCycleSummary} close={() => setShowModalFinancialEconomicCycleSummary(false)}>
          <FinancialEconomicCycleSumaryModal isFetching={isFetching} financialEconomicCycleReporte={financialEconomicCycleReporte} getFinancialEconomicCycleReporte={getFinancialEconomicCycleReporte} setShowModal={setShowModalFinancialEconomicCycleSummary}/>
        </Modal>
      )}

      {showModalFinancialEconomicCycleReporte && (
        <Modal state={showModalFinancialEconomicCycleReporte} close={() => setShowModalFinancialEconomicCycleReporte(false)}>
          <FinancialEconomicCycleReporteModal isFetching={isFetching} financialEconomicCycleReporte={financialEconomicCycleReporte} getFinancialEconomicCycleReporte={getFinancialEconomicCycleReporte} setShowModal={setShowModalFinancialEconomicCycleReporte}/>
        </Modal>
      )}

      {showModalSalesSummaryByCommercial && (
        <Modal state={showModalSalesSummaryByCommercial} close={() => setShowModalSalesSummaryByCommercial(false)}>
         <SalesSummaryByCommercialModal  setShowModal={setShowModalSalesSummaryByCommercial}/>
        </Modal>
      )}
    </>
  );
};

export default BillingAnalysis;
