import { useEffect, useContext, useState } from "react";
import TabNav from "../../components/navigation/TabNav";
import Button from "../../components/misc/Button";
import { FaRegFilePdf } from "react-icons/fa";
import { EcoCycleContext } from "./DetailEcoCycleContainer";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import { useAppSelector } from "../../store/hooks";
import { useParams } from "react-router-dom";
import { useServer } from "../../hooks/useServer";

import CashRegisterReport from "./CashRegisterReport";
import CashOperation from "../../components/economicCycle/CashOperation";
import PartialPayments from "./PartialPayments";


export default function CashierContainer() {

  const {
    cashOperation,
  } = useServer({ startLoading: false });

  const { ecoCycleId: id } = useParams();

  // -------------------------------------------------

  const { business } = useAppSelector((state: { init: any; }) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);

  const { ecoCycle } = useContext(EcoCycleContext);
  const { exportCashbox, getAreaSalesIncomes, areaSalesIncome, isLoading: isLoadingCashRegister } =
    useServerEcoCycle();

  const salesAreas = areas
    .filter((area) => area.type === "SALE")
    .map((area) => area.id);

  useEffect(() => {
    id && getAreaSalesIncomes(salesAreas, id);
  }, []);

  const [cashTab, setCashTab] = useState("arching");

  const tabs = [
    {
      name: "Arqueo",
      href: "arching",
      current: cashTab === "arching",
    },
    {
      name: "Operaciones",
      href: "operations",
      current: cashTab === "operations",
    },
    {
      name: "Pagos parciales",
      href: "partialPayments",
      current: cashTab === "partialPayments",
    },
  ];

  //Operaciones con propinas
  const cash_operations_include_tips =
    business?.configurationsKey.find(
      (item: { key: string; }) => item.key === "cash_operations_include_tips"
    )?.value === "true";

  //Operaciones con domicilio
  const cash_operations_include_deliveries =
    business?.configurationsKey.find(
      (item: { key: string; }) => item.key === "cash_operations_include_deliveries"
    )?.value === "true";

  //Entregas habilitadas
  const enable_delivery =
    business?.configurationsKey.find((item: { key: string; }) => item.key === "enable_delivery")
      ?.value === "true";

  //Extracción de salario del efectivo
  const extract_salary_from_cash =
    business?.configurationsKey.find(
      (item: { key: string; }) => item.key === "extract_salary_from_cash"
    )?.value === "true";

  const configKeys = {
    cash_operations_include_tips,
    cash_operations_include_deliveries,
    enable_delivery,
    extract_salary_from_cash,
  };

  const reports = [...areaSalesIncome];

  return (
    <>
      <div className="flex justify-end w-full">
        <Button
          color="slate-600"
          textColor="slate-600"
          name="Exportar"
          icon={<FaRegFilePdf />}
          action={() =>
            exportCashbox({ ecoCycle, configKeys, areas, report: reports, cashOperation })
          }
          outline
        />
      </div>

      <TabNav tabs={tabs} action={(value: string) => setCashTab(value)} />

      {cashTab === "arching" && (
        <CashRegisterReport
          areaSalesIncome={areaSalesIncome}
          isLoading={isLoadingCashRegister}
          ecoCycle={ecoCycle}
        />)}
      {cashTab === "operations" && (
        <CashOperation ecoCycle={ecoCycle}/>
      )}
      {cashTab === "partialPayments" && (
        <PartialPayments ecoCycle={ecoCycle}/>
      )}
    </>
  );
};

