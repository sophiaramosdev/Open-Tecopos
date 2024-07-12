import { useState } from "react";

import AtAllPointsOfSale from "./GeneralAdjustment/AtAllPointsOfSale";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";

import { Cog8ToothIcon } from "@heroicons/react/24/outline";
import ConfigGeneral from "./GeneralAdjustment/ConfigGeneral";
import AtAllProducts from "./GeneralAdjustment/AtAllProducts";
import AtAllStock from "./GeneralAdjustment/AtAllStock";
import HomeDelivery from "./GeneralAdjustment/HomeDelivery";
import ListShareArea from "./GeneralAdjustment/shareArea/ListShareArea";
import SideNav from "../../components/misc/SideNav";
import WoocomerceConfig from "./GeneralAdjustment/WoocomerceConfig";
import { useAppSelector } from "../../store/hooks";
import PaymentGateway from "./GeneralAdjustment/PaymentGateways";
import Visual from "./GeneralAdjustment/Visual";
import BillConfig from "./GeneralAdjustment/BillConfig";
import TropiPayInformation from "./GeneralAdjustment/TropiPayInformation";
import AtAllSalesAreas from "./GeneralAdjustment/AtAllSalesAreas";
import Tickets from "./GeneralAdjustment/Tickets";
import AccessLogging from "./GeneralAdjustment/AccessLogging";
import useServer from "../../api/useServerMain";
import Resources from "./GeneralAdjustment/Reservations";
import CartDigital from "../cardDigital/CartDigital";

const ConfigMain = () => {
  const { allowRoles } = useServer();
  const isAdmin = allowRoles(["ADMIN"]);
  const [currentTab, setCurrentTab] = useState(
    !isAdmin ? "tickets" : "general"
  );
  const { business } = useAppSelector((state) => state.init);
  const tabs = [
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Generales",
      href: "general",
      current: currentTab === "general",
      disabled: !isAdmin,
    },
    {
      //icon: <BanknotesIcon className="h-6" />,
      name: "Áreas compartidas",
      href: "share_areas",
      current: currentTab === "share_areas",
      disabled: !isAdmin,
    },
    {
      //icon: <ClipboardDocumentCheckIcon className="h-6" />,
      name: "Entregas a domicilio",
      href: "home_delivery",
      current: currentTab === "home_delivery",
      disabled: !isAdmin,
    },
    {
      //icon: <ArrowTrendingUpIcon className="h-6" />,
      name: "En todos los almacenes",
      href: "all_stocks",
      current: currentTab === "all_stocks",
      disabled: !isAdmin,
    },
    {
      //icon: <ArrowTrendingUpIcon className="h-6" />,
      name: "Productos",
      href: "all_products",
      current: currentTab === "all_products",
      disabled: !isAdmin,
    },
    {
      //icon: <ArrowTrendingUpIcon className="h-6" />,
      name: "En todos los puntos de venta",
      href: "all_points_of_sale",
      current: currentTab === "all_points_of_sale",
      disabled: !isAdmin,
    },
    {
      name: "En todas las áreas de producción",
      href: "all_sales_areas",
      current: currentTab === "all_sales_areas",
      disabled: !isAdmin,
    },
    {
      name: "Tienda online",
      href: "woocomerce",
      current: currentTab === "woocomerce",
      disabled: !isAdmin,
    },
    {
      name: "Interfaz visual",
      href: "visual",
      current: currentTab === "visual",
      disabled: !isAdmin,
    },
    {
      name: "Factura",
      href: "bill",
      current: currentTab === "bill",
      disabled: !isAdmin,
    },
    {
      name: "Registro de accesos",
      href: "accessLogging",
      current: currentTab === "accessLogging",
      disabled: !isAdmin,
    },
    {
      name: "TropiPay",
      href: "tropiPay",
      current: currentTab === "tropiPay",
      disabled: !isAdmin,
    },

    {
      name: "Pasarelas de pago",
      href: "paymentGateway",
      current: currentTab === "paymentGateway",
      disabled: !isAdmin,
    },
    {
      name: "Tickets",
      href: "tickets",
      current: currentTab === "tickets",
    },
  ];

  if (
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true"
  ) {
    tabs.push({
      name: "Reservaciones",
      href: "reservations",
      current: currentTab === "reservations",
    });
  }

  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Ajustes",
    },
  ];

  //---------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={tabs}
          action={setCurrentTab}
          className="col-span-10 sm:col-span-2"
        />

        <div className="sm:col-span-8 pl-3 pt-1">
          {currentTab === "general" && <ConfigGeneral />}
          {currentTab === "share_areas" && <ListShareArea />}
          {currentTab === "home_delivery" && <HomeDelivery />}
          {currentTab === "all_stocks" && <AtAllStock />}
          {currentTab === "all_products" && <AtAllProducts />}
          {currentTab === "all_points_of_sale" && <AtAllPointsOfSale />}
          {currentTab === "woocomerce" && <WoocomerceConfig />}
          {currentTab === "paymentGateway" && <PaymentGateway />}
          {currentTab === "visual" && <Visual />}
          {currentTab === "bill" && <BillConfig />}
          {currentTab === "accessLogging" && <AccessLogging />}
          {currentTab === "tropiPay" && <TropiPayInformation />}
          {currentTab === "all_sales_areas" && <AtAllSalesAreas />}
          {currentTab === "tickets" && <Tickets />}
          {currentTab === "reservations" && <Resources />}
        </div>
      </div>
      {/* <TabsVertical data={data} default_tabs={default_tabs} /> */}
    </>
  );
};

export default ConfigMain;
