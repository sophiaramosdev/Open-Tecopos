import { useState } from "react";

import TabNav from "../../../components/navigation/TabNav";

import BalanceReport from "./BalanceReport";
import FinancialState from "./FinancialState";
import Breadcrumb, { PathInterface } from "../../../components/navigation/Breadcrumb";
import { useNavigate } from "react-router-dom";
import { CreditCardIcon } from "@heroicons/react/24/outline";



const MainBankAccountReport = () => {

  const navigate = useNavigate()

  //---------------------------------------------------------------------------------------

  const paths: PathInterface[] = [
    {
      name: "Cuentas bancarias",
      action:()=>navigate("/bank_accounts")
    },
    {
      name:"Reportes",
    },
   ];
  //------------------------------------------------------------------------------------

  //TabNav Data for Bank Account Area------------------------------------------------------------
  
  const [currentBankAccountTab, setCurrentBankAccountTab] = useState("balance");
  
  const bankAccountsTabs = [
    {
      name: "Balance",
      href: "balance",
      current: currentBankAccountTab === "balance",
    },
    {
      name: "Estados financieros",
      href: "financial_states",
      current: currentBankAccountTab === "financial_states",
    },    
  ];
  //---------------------------------------------------------------------------------------

  return (

    <>
      <Breadcrumb
        icon={<CreditCardIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <TabNav tabs={bankAccountsTabs} action={(to: string) => setCurrentBankAccountTab(to)} />
      {currentBankAccountTab === "balance" && <BalanceReport />}
      {currentBankAccountTab === "financial_states" && <FinancialState />}
    </>
  );
};

export default MainBankAccountReport;
