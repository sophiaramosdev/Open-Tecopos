import { useState } from "react";
import ContactConfig from "./ContactConfig";
import TabNav from "../../components/navigation/TabNav";
import DetailConfig from "./DetailConfig";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { Cog8ToothIcon } from "@heroicons/react/24/outline";
import SideNav from "../../components/misc/SideNav";
import StoreGalery from "../store/StoreGalery";

const MyBusiness = () => {
  const [currentTab, setCurrentTab] = useState("detail");
  const tabs = [
    { name: "Detalles", href: "detail", current: currentTab === "detail" },
    { name: "Contactos", href: "contact", current: currentTab === "contact" },
    { name: "Galería", href: "galery", current: currentTab === "galery" },
  ];

  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Mi negocio",
    },
  ];

  return (
    <>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <div className="grid grid-cols-10 gap-5">
        <SideNav
          /* w-3/4 */ className="col-span-2 "
          tabs={tabs}
          action={setCurrentTab}
        />
        <div className="col-span-8">
          {currentTab === "detail" && <DetailConfig />}
          {currentTab === "contact" && <ContactConfig />}
          {currentTab === "galery" && <StoreGalery />}
        </div>
      </div>
    </>
  );
};

export default MyBusiness;
