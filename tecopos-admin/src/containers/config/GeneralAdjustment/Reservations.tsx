import { useState } from "react";
import { Resource } from '../../../interfaces/Interfaces';
import TabNav from "../../../components/navigation/TabNav";
import DiscountPolicy from "./resourcesTabs/DiscountPolicy";
import CancellationPolicy from "./resourcesTabs/CancellationPolicy";
import Avaliability from "./resourcesTabs/Avaliability2";
import AvaliabilityV2 from "./resourcesTabs/AvailabilityTab";

const Resources = () => {
  const [currentTab, setCurrentTab] = useState("availability");
  const tabs = [
    {
      name: "Disponibilidad",
      href: "availability",
      current: currentTab === "availability",
    },
    {
      name: "Política de descuento",
      href: "discountPolicy",
      current: currentTab === "discountPolicy",
    },
    {
      name: "Política de cancelación",
      href: "cancellationPolicy",
      current: currentTab === "cancellationPolicy",
    },
   
  ];

  return (
    <>
      <div className="bg-white rounded-md shadow-md">
        <TabNav className=" m-auto" tabs={tabs} action={setCurrentTab} />
        <div className="  p-8 rounded-md ">
          {currentTab === "availability" && <AvaliabilityV2/>}
          {currentTab === "discountPolicy" && <DiscountPolicy/>}
          {currentTab === "cancellationPolicy" && <CancellationPolicy/>}
        </div>
      </div>
    </>
  );
};

export default Resources;
