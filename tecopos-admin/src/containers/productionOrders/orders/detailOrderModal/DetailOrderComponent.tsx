import React, { useState, useEffect } from "react";
import useServerOrderProd from "../../../../api/useServerOrderProd";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import TabNav from "../../../../components/navigation/TabNav";
import DetailStateOrder from "./DetailStateOrder";
import DetailDataOrder from "./DetailDataOrder";
import { NewOrderInterface, ProductionOrder, ProductionOrderState } from "../../../../interfaces/ServerInterfaces";
import DetailCostOrder from "./DetailCostOrder";

interface DetailOrder {
  id: number | null;
  updAll:Function,
  closeModal:Function,
}
const DetailOrderComponent = ({ id, updAll, closeModal }: DetailOrder) => {
  const { getOrder:get, updateOrder, updateFixedCostState, deleteOrder, duplicateOrder, order, isLoading, isFetching } = useServerOrderProd();

  useEffect(() => {
    id && get(id);
  }, []);
  //TabNav Component Data --------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("state");
  const tabs = [
    {
      name: "Estado",
      href: "state",
      current: currentTab === "state",
    },
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Costos",
      href: "costs",
      current: currentTab === "costs",
    },
  ];

  //Update order Function ------------------------------------------------------------------
  const upd = (id:number, data:NewOrderInterface,closeModal:Function) => {
    const closeAndUpd = () => {
      closeModal();
      get(id)
      updAll();
    }
    updateOrder(id,data,closeAndUpd);
  }
  //------------------------------------------------------------------------------

  //Delete Order Function --------------------------------------------------------------
  const del = (id:number) =>{
    const closeAndUpdate = () =>{
      closeModal();
      updAll();
    }
    deleteOrder(id,closeAndUpdate)
  }
  //-------------------------------------------------------------------------------------

  //Duplicate Order Function --------------------------------------------------------------
  const dup = (data:ProductionOrder,close:Function) => {
    const updateList = () => {
      close();
      updAll();
    }
    duplicateOrder({...data,orderProductionId:id??0},updateList)
  }
  //---------------------------------------------------------------------------------------

  if(isLoading) return <div className="h-96"><SpinnerLoading /></div>
  return (
    <>
      <TabNav action={(to: string) => setCurrentTab(to)} tabs={tabs} />
      {currentTab === "state" && <DetailStateOrder endProducts={order?.endProducts} produced={order?.productionOrder.totalProduced ?? 0} totalGoal={order?.productionOrder.totalGoalQuantity ?? 1} />}
      {currentTab === "details" && <DetailDataOrder order={order} crud={{get,upd,del,dup,loading:isFetching}} />}
      {currentTab === "costs" && <DetailCostOrder order={order} updateFixedCostState={updateFixedCostState} />}
    </>
  );
};

export default DetailOrderComponent;
