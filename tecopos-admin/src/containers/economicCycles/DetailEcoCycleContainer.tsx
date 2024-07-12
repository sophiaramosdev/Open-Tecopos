import { createContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  ArrowPathRoundedSquareIcon,
  DocumentMagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { useNavigate } from "react-router";
import SideNav, { TabsAttr } from "../../components/misc/SideNav";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import EcoCycleDetail from "./EcoCycleDetail";
import moment from "moment";
import OrdersEcoCycle from "./OrdersEcoCycle";
import CashierContainer from "./CashierContainer";
import SpinnerLoading from "../../components/misc/SpinnerLoading";
import ReportsSalesByProducts from "./SelledReport";
import InvetoriesRealTime from "./InvetoriesRealTime";
import { Metric } from "../../components";
import OrdersSummary from "./OrdersSummary";
import Duplicator from "./Duplicator";
import { EconomicCycle } from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import useServer from "../../api/useServerMain";

export const EcoCycleContext = createContext<{
  ecoCycle: EconomicCycle | null;
}>({ ecoCycle: null });

const DetailEcoCycleContainer = () => {
  const { ecoCycleId } = useParams();
  const {
    getEcoCycle,
    ecoCycle,
    editEcoCycle,
    closeEconomicCycle,
    isFetching,
    isLoading,
  } = useServerEcoCycle();
  const navigate = useNavigate();

  const { allowRoles: verifyRoles } = useServer();

  const { business } = useAppSelector((state) => state.init);

  const module_duplicator = business?.configurationsKey.find(
    (item) => item.key === "module_duplicator"
  )?.value;

  useEffect(() => {
    ecoCycleId && getEcoCycle(ecoCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Breadcrumbs paths-------------------------------------------------------------------------
  const paths: PathInterface[] = [
    { name: "Ciclos económicos", action: () => navigate("/ecocycle") },
    {
      name: moment(ecoCycle?.openDate).format("DD/MM/YY"),
    },
  ];

  //------------------------------------------------------------------------------
  const managerShift = verifyRoles(["MANAGER_SHIFT"], true);
  const managerSales = verifyRoles(["MANAGER_SALES"], true);
  const managerEcoCycle = verifyRoles(["MANAGER_ECONOMIC_CYCLE"], true);
  const reportAnalist = verifyRoles(["ANALYSIS_REPORT"], true);

  const [currentTab, setCurrentTab] = useState(
    managerShift ||managerSales || reportAnalist ? "cashbox" : "details"
  );
  const tabs: TabsAttr[] = [
    {
      icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
      disabled: managerShift || managerSales || reportAnalist,
    },
    {
      icon: <BanknotesIcon className="h-6" />,
      name: "Caja",
      href: "cashbox",
      current: currentTab === "cashbox",
      disabled: managerEcoCycle
    },
    {
      icon: <ClipboardDocumentCheckIcon className="h-6" />,
      name: "Órdenes/Facturas",
      href: "orders",
      current: currentTab === "orders",
      disabled: managerShift || managerEcoCycle || reportAnalist,
    },
    {
      icon: <ArrowTrendingUpIcon className="h-6" />,
      name: "Ventas por productos",
      href: "salesbyproducts",
      current: currentTab === "salesbyproducts",
      disabled: managerSales || managerEcoCycle,
    },
    {
      icon: <ClipboardDocumentCheckIcon className="h-6" />,
      name: "Estado de inventario",
      href: "inventorystatus",
      current: currentTab === "inventorystatus",
      disabled: managerShift || managerSales || managerEcoCycle,
    },
    {
      icon: <CurrencyDollarIcon className="h-6" />,
      name: "Resumen de propinas",
      href: "tipsummary",
      current: currentTab === "tipsummary",
      disabled: managerShift || managerSales || managerEcoCycle || reportAnalist,
    },
    {
      icon: <ClipboardDocumentCheckIcon className="h-6" />,
      name: "Resumen de órdenes/facturas",
      href: "orderSummary",
      current: currentTab === "orderSummary",
      disabled: managerSales || managerEcoCycle|| reportAnalist,
    },
  ];

  if (module_duplicator === "true" && verifyRoles(["ADMIN"])) {
    tabs.push({
      icon: <DocumentDuplicateIcon className="h-6" />,
      name: "Planificador",
      href: "duplicator",
      current: currentTab === "duplicator",
    });
  }

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <SpinnerLoading />
      </div>
    );

  return (
    <EcoCycleContext.Provider value={{ ecoCycle }}>
      <Breadcrumb
        icon={<ArrowPathRoundedSquareIcon className="h-6" />}
        paths={paths}
      />
      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={tabs}
          action={setCurrentTab}
          className="col-span-10 sm:col-span-2"
        />
        <div className="sm:col-span-8 pl-3">
          {currentTab === "details" && (
            <EcoCycleDetail
              data={ecoCycle}
              edit={editEcoCycle}
              close={closeEconomicCycle}
              isFetching={isFetching}
            />
          )}
          {currentTab === "orders" && <OrdersEcoCycle />}
          {currentTab === "cashbox" && <CashierContainer />}
          {currentTab === "salesbyproducts" && <ReportsSalesByProducts />}
          {currentTab === "inventorystatus" && <InvetoriesRealTime />}
          {currentTab === "tipsummary" && <Metric />}
          {currentTab === "orderSummary" && <OrdersSummary />}
          {currentTab === "duplicator" && module_duplicator === "true" && (
            <Duplicator />
          )}
        </div>
      </div>
    </EcoCycleContext.Provider>
  );
};

export default DetailEcoCycleContainer;
