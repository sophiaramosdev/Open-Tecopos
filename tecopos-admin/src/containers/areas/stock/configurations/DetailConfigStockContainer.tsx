import { useState } from "react";
import { useParams } from "react-router";

import { useNavigate } from "react-router";

import { useAppSelector } from "../../../../store/hooks";
import { PathInterface } from "../../../../components/navigation/Breadcrumb";
import Areas_stock from "./Areas_stock";
import SideNav from "../../../../components/misc/SideNav";


const DetailConfigStockContainer = () => {

  const { areaId } = useParams();

  const {areas} = useAppSelector(state=>state.nomenclator);

  const goTo = useNavigate();

  const currentArea = areas.find(area=>area.id === Number(areaId))

  //--------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------------------
  const paths:PathInterface[] = [
    {
      name:"Mis áreas",
      action:()=>goTo("/configurations/my_areas")
    },
    {
      name:currentArea?.name??""
    }
  ]

  const [currentTab, setCurrentTab] = useState("areas_stock");

  const tabs = [
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Generales",
      href: "areas_stock",
      current: currentTab === "areas_stock",
    },
  ];

  //------------------------------------------------------------------------------------------

  return (
    <>
      <>
      <div className="grid grid-cols-10 gap-3">
        <SideNav tabs={tabs} action={setCurrentTab} className="col-span-10 sm:col-span-2"/>
        <div className="sm:col-span-8 pl-3">
          {currentTab === "areas_stock" && <Areas_stock />}
          
        </div>
          {/* <TabsVertical data={data} default_tabs={default_tabs} /> */}
        </div>
      </>
    </>
  );
};

export default DetailConfigStockContainer;
