import { useState, useEffect } from "react";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import Details from "./Details";
import useServerEcoCycle from "../../../api/useServerEconomicCycle";
import Opperations from "./Opperations";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Tickets from "./Tickets";
import { OrderInterface } from "../../../interfaces/ServerInterfaces";
import SideNav from "../../../components/misc/SideNav";

interface OrderDetail {
  id?: number;
  updState: Function;
}

const PosOrderDetails = ({ id, updState }: OrderDetail) => {
  const { getOrder, order, isLoading } = useServerEcoCycle();
  const [current, setCurrent] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      current: current === "details",
      href: "details",
    },
    {
      name: "Tickets",
      current: current === "ticket",
      href: "ticket",
    },
    {
      name: "Trazas",
      current: current === "opp",
      href: "opp",
    },
  ];
  useEffect(() => {
    id && getOrder(id);
  }, []);


  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">
        <SpinnerLoading />
      </div>
    );

  return (
    <>
      {/* <TabNav tabs={tabs} action={setCurrent} /> */}
      <section className="grid grid-cols-12">
        <SideNav tabs={tabs} action={setCurrent}  className="col-span-2"/>
        <section className="overflow-auto scrollbar-thin h-[500px] col-span-10 px-5">
          {current === "details" && (
            <Details
              item={order}
              updateOrderState={(order: OrderInterface) =>
                updState(order, true)
              }
            />
          )}
          {current === "opp" && <Opperations records={order?.records} />}
          {current === "ticket" && <Tickets tickets={order?.tickets ?? []} />}
        </section>
      </section>
    </>
  );
};

export default PosOrderDetails;
