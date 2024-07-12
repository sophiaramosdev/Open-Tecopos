import { createContext, useState } from "react";
import TabNav from "../../components/navigation/TabNav";
import DetailsResourceTab from "./resourceDetails/DetailsResourseTab";
import { Resource } from "../../interfaces/Interfaces";
import ImagesResoursetab from "./resourceDetails/ImagesResoursetab";

interface Props {
  data?: Resource | null;
  update?:Function
}

export const EditResourceContext = createContext<Props>({});
const EditResource = ({ data ,update}: Props) => {
  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Imagen",
      href: "image",
      current: currentTab === "image",
    },
  ];

  //   if (loading)
  //     return (
  //       <div className="h-96 flex items-center justify-center">
  //         <SpinnerLoading />
  //       </div>
  //     );

  return (
    <div className="h-full">
      <TabNav action={setCurrentTab} tabs={tabs} />
        {currentTab === "details" && <DetailsResourceTab />}
        {currentTab === "image" && < ImagesResoursetab/>}
    </div>
  );
};

export default EditResource;
