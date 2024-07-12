import { useState } from "react";

import AreaResources from "./AreaResources";
import SalesConfig from "./SalesConfig";

import Salary from "./Salary";
import TransferOfFounds from "./TransferOfFounds";
import { useAppSelector } from "../../../store/hooks";
import { convertBoolean } from "../../../utils/translate";
import GenerateExitTicket from "./GenerateExitTicket";
import SideNav from "../../../components/misc/SideNav";
import PaymentWay from "./PaymentWay";
import InvoiceModifiers from "./InvoiceModifiers";

const DetailSalesContainer = () => {
  
  //TabNav --------------------------------------
  const changeTab = (to: string) => setCurrentTab(to);

  const { business, branches, user } = useAppSelector((state) => state.init);

  const moduleAccount = business?.configurationsKey.find(
    (item) => item.key === "module_accounts"
  )?.value;
  const moduleBilling = business?.configurationsKey.find(
    (item) => item.key === "module_billing"
  )?.value;

  //-- extract_salary_from_cash
  const extract_salary_from_cash = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'extract_salary_from_cash')?.value ?? '');
  
  const [currentTab, setCurrentTab] = useState("settingSales");
  const tabs = [
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Configuración de ventas",
      href: "settingSales",
      current: currentTab === "settingSales",
    },
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Formas de pago",
      href: "paymentWay",
      current: currentTab === "paymentWay",
    },
    {
      //icon: <BanknotesIcon className="h-6" />,
      name: "Recursos",
      href: "resource",
      current: currentTab === "resource",
    },
  ];

  if(extract_salary_from_cash){
    tabs.push({
        name: "Salarios",
        href: "salary",
        current: currentTab === "salary", 
      },
    );
  }

  if (moduleAccount === "true") {
    if (
      user?.roles.find((item) =>
        ["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"].includes(item.code)
      )
    ) {
      tabs.push({
          name: "Transferencia de fondos",
          href: "transfer_of_funds",
          current: currentTab === "transfer_of_funds",
        },
      );
    }   
  }

  if(moduleBilling === "true"){
    tabs.push({
      name: "Modificadores de factura",
      href: "invoice_modifiers",
      current: currentTab === "invoice_modifiers",
    },
  );
  }

  tabs.push({
    name: "Generales",
    href: "generals",
    current: currentTab === "generals",
  },);
  //-----------------------------------------------------------

  return (
    <>
      <div className="py-2">
        <div className="sm:grid grid-cols-10 gap-3">
          <SideNav tabs={tabs} action={setCurrentTab} className="col-span-10 sm:col-span-2"/>
          <div className="sm:col-span-8 pl-3 pt-2">
            {currentTab === "settingSales" && <SalesConfig />}
            {currentTab === "paymentWay" && <PaymentWay />}
            {currentTab === "resource" && <AreaResources />} 
            {currentTab === "salary" && <Salary />}
            {currentTab === "transfer_of_funds" && <TransferOfFounds />}
            {currentTab === "invoice_modifiers" && <InvoiceModifiers />}
            {currentTab === "generals" && <GenerateExitTicket />}
          </div>
        </div>
      </div>
      
    </>
  );
};

export default DetailSalesContainer;
