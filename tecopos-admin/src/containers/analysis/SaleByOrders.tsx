import { useState } from "react";
import Results from "./SaleByOrdersTabs/Results";
import Criteria from "./SaleByOrdersTabs/Criteria";
import Resumen from "./SaleByOrdersTabs/Resumen";
import Export from "./SaleByOrdersTabs/Export";
import Breadcrumb from "../../components/navigation/Breadcrumb";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import SideNav from "../../components/misc/SideNav";
import useServerEcoCycle from "../../api/useServerEconomicCycle";


const SaleByOrders = () => {

  const { getAllSalesbyOrders, salesbyOrders, isLoading } = useServerEcoCycle();
  const dataAccess = { getAllSalesbyOrders, salesbyOrders, isLoading };
  let resumen: Record<string, any> = {};
  if (salesbyOrders) resumen = salesbyOrders.summarize;

  // -------------------------------------------------

  const [currentTab, setCurrentTab] = useState("criterio");

  const tabs = [
    {
      name: "Criterios",
      href: "criterio",
      current: currentTab === "criterio",
    },
  ];

  if (salesbyOrders && Array.isArray(salesbyOrders.orders)  && salesbyOrders.orders.length > 0) {
    tabs.push(
      {
        name: "Resultados",
        href: "resultados",
        current: currentTab === "resultados",
      },
      {
        name: "Resumen",
        href: "resumen",
        current: currentTab === "resumen",
      },
      {
        name: "Exportar",
        href: "export",
        current: currentTab === "export",
      },
    )
  }

  return (
    <>
      <Breadcrumb
        icon={<ArrowTrendingUpIcon className="h-6 text-gray-500" />}
        paths={[{ name: "Análisis" }, { name: "Venta por órdenes" }]}
      />
      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav tabs={tabs} action={setCurrentTab} className="col-span-10 sm:col-span-2" />
        <div className="sm:col-span-8 pl-3 pt-2">

          {<Criteria dataAccess={dataAccess} show={currentTab === "criterio" ? true : false} />}
          {<Results dataAccess={dataAccess} show={currentTab === "resultados" ? true : false} />}
          {<Resumen dataAccess={resumen} show={currentTab === "resumen" ? true : false} />}
          {<Export dataAccess={dataAccess} show={currentTab === "export" ? true : false} />}

        </div>
      </div>

    </>
  );
};

export default SaleByOrders;
