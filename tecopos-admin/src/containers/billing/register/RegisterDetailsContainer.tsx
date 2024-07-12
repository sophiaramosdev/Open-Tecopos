import React, { createContext, useContext, useEffect, useState } from "react";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import { Control } from "react-hook-form";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { OrderInterface } from "../../../interfaces/ServerInterfaces";
import RegisterDetailsTab from "./registerDetailsTabs/RegisterDetailsTab";
import Fetching from "../../../components/misc/Fetching";
import { OperationsRegisterTab } from "./registerDetailsTabs/OperationsRegisterTab";
import { PartialPaysDetailsTab } from "./registerDetailsTabs/PartialPaysDetailsTab";
import { RegisterContext } from "./AllRegistersList";
import SideNav from "../../../components/misc/SideNav";
import { ShippingAndBillingTab } from "./registerDetailsTabs/ShippingAndBillingTab";
import { ProductsTab } from "./registerDetailsTabs/ProductsTab";

interface RegisterDetailsContextInterface {
  control?: Control<BasicType>;
  order?: OrderInterface | null;
  closeModalDetails?: Function;
  updateSingleOrderState?: Function;
  updateAllOrdersState?: Function;
  deletePartialPayment?: Function;
  isFetching?: boolean;
}

interface RegisterDetailsInterface {
  id: number;
  updateState: Function;
  closeModalDetails: Function;
}

export const RegisterDetailsContext =
  createContext<RegisterDetailsContextInterface>({});

export const RegisterDetailsContainer = ({
  id,
  updateState,
  closeModalDetails,
}: RegisterDetailsInterface) => {
  const {
    orderById,
    control,
    getOrderBillingById,
    isLoading = true,
    updateSingleOrderState,
    deletePartialPayment,
    isFetching,
    isFetchingAux,
    setIsLoading,
    openPayModal
  } = useContext(RegisterContext);

  const [currentTab, setCurrentTab] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Productos",
      href: "products",
      current: currentTab === "products",
    },
  ];

  if (!orderById?.isPreReceipt) {
    tabs.splice(1, 0, {
      name: "Facturación y envío",
      href: "shipping",
      current: currentTab === "shipping",
    },);

    const isBilled = orderById?.status === "BILLED"

    tabs.push({
      name: isBilled ? "Pagos" : "Pagos parciales",
      href: "partialPays",
      current: currentTab === "partialPays",
    });
  }

  tabs.push({
    name: "Trazas",
    href: "opperations",
    current: currentTab === "opperations",
  });

  useEffect(() => {
    if(!openPayModal){
      setIsLoading!(true);
      getOrderBillingById!(id);
    }
  }, []);

  if (isLoading && isFetchingAux)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );
  return (
    <>
      <RegisterDetailsContext.Provider
        value={{
          control,
          order: orderById,
          updateSingleOrderState,
          updateAllOrdersState: updateState,
          closeModalDetails,
          deletePartialPayment,
          isFetching,
        }}
      >
        <section className="grid grid-cols-12 ">
          {/* <TabNav action={(tab: string) => setCurrentTab(tab)} tabs={tabs} /> */}
          <aside className="col-span-2">
            <SideNav tabs={tabs} action={setCurrentTab} />
          </aside>
          <form className="px-3 col-span-10 ">
            {currentTab === "details" && (
              <RegisterDetailsTab />
            )}
            {currentTab === "shipping" && <ShippingAndBillingTab />}
            {currentTab === "products" && <ProductsTab />}
            {currentTab === "opperations" && <OperationsRegisterTab />}
            {currentTab === "partialPays" && <PartialPaysDetailsTab />}
          </form>
        </section>
      </RegisterDetailsContext.Provider>
    </>
  );
};
