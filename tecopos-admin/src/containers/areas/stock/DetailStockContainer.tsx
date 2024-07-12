import { useState } from "react";
import ListStockProduct from "./products/ListStockProduct";
import ListStockMovements from "./movements/ListStockMovements";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import SideNav, { TabsAttr } from "../../../components/misc/SideNav";
import Summary from "./Summary";
import useServer from "../../../api/useServerMain";

const DetailStockContainer = () => {
  const { pathname } = useLocation();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { allowRoles: verifyRoles } = useServer();
  const navigate = useNavigate();

  //TabNav ------------------------------------------------------------
  const disableSumary = !verifyRoles([
    "ADMIN",
    "MANAGER_CONTABILITY",
  ]);
  const [current, setCurrent] = useState<string>("inventory");
  const changeTab = (to: string) => setCurrent(to);

  const stockTabs:TabsAttr[] = [    
    {
      name: "Inventario",
      href: "inventory",
      current: current === "inventory",
    },
    {
      name: "Resumen",
      href: "summary",
      current: current === "summary",
      disabled:disableSumary
    },
    {
      name: "Operaciones",
      href: "opperations",
      current: current === "opperations",
    },
  ];

  //-----------------------------------------------------------------------------------

  //Breadcrumb --------------------------------------------------------------------------
  const currentArea = areas.find(
    (area) => area.id === Number(pathname.split("/")[2])
  )?.name;
  const paths: PathInterface[] = [
    {
      name: "Mis almacenes",
      action: () => navigate("/stocks"),
    },
    {
      name: currentArea ?? "",
    },
    {
      name:
        current === "inventory"
          ? "Inventario"
          : current === "opperations"
          ? "Operaciones"
          : "Resumen",
    },
  ];
  //--------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<RectangleGroupIcon className="h-7 text-gray-500" />}
        paths={paths}
      />
      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={stockTabs}
          action={changeTab}
          className="col-span-10 sm:col-span-2"
        />

        <div className="sm:col-span-8 pl-3 pt-1">
          {current === "inventory" && <ListStockProduct />}
          {current === "opperations" && <ListStockMovements />}
          {current === "summary" && <Summary />}
        </div>
      </div>
    </>
  );
};

export default DetailStockContainer;
