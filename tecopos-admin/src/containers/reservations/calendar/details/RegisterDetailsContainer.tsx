import React, { createContext, useContext, useEffect, useState } from "react";
import { Control } from "react-hook-form";
import { BasicType } from "../../../../interfaces/InterfacesLocal";
import { OrderInterface } from "../../../../interfaces/ServerInterfaces";
import { TabsAttr } from "../../../../components/navigation/TabNav";
import RegisterDetailsTab from "./registerDetailsTabs/RegisterDetailsTab";
import { ShippingAndBillingTab } from "./registerDetailsTabs/ShippingAndBillingTab";
import { ProductsTab } from "./registerDetailsTabs/ProductsTab";
import { OperationsRegisterTab } from "./registerDetailsTabs/OperationsRegisterTab";
import { PartialPaysDetailsTab } from "./registerDetailsTabs/PartialPaysDetailsTab";
import SideNav from "../../../../components/misc/SideNav";
import Fetching from "../../../../components/misc/Fetching";
import { useServerBilling } from "../../../../api/useServerBilling";

interface RegisterDetailsContextInterface {
  control?: Control<BasicType>;
  order?: OrderInterface | null;
  closeModalDetails?: Function;
  updateSingleOrderState?: Function;
  updateAllOrdersState?: Function;
  deletePartialPayment?: Function;
  isFetching?: boolean;
  updateStatusPay?:Function
}

interface RegisterDetailsInterface {
  id: any;
  updateState: Function;
  closeModalDetails: Function;
  context:React.Context<any>
  dependencies:any
}

export const RegisterDetailsContext =
  createContext<RegisterDetailsContextInterface>({});

export const RegisterDetailsContainer = ({
  id,
  updateState,
  closeModalDetails,
  dependencies,
  context
}: RegisterDetailsInterface) => {
  const {
    orderById,
    getOrderBillingById,
    isLoading = true,
    updateSingleOrderState,
    deletePartialPayment,
    isFetching,
    isFetchingAux,
    setIsLoading,
  } = dependencies;

  const {updateStatusPay} = useContext(context)

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

    tabs.push({
      name: `${orderById?.status === "BILLED" ? "Pagos" : "Pagos parciales"}`,
      href: "partialPays",
      current: currentTab === "partialPays",
    });
  }

  tabs.push({
    name: "Trazas",
    href: "opperations",
    current: currentTab === "opperations",
  });

  // useEffect(() => {
  //     setIsLoading!(true);
  //     getOrderBillingById!(+id);
  // }, []);

  // if (isLoading && isFetchingAux)
  //   return (
  //     <div className="h-96">
  //       <Fetching />
  //     </div>
  //   );
  return (
    <>
      <RegisterDetailsContext.Provider
        value={{
          order: orderById,
          updateSingleOrderState,
          updateAllOrdersState: updateState,
          closeModalDetails,
          deletePartialPayment,
          isFetching,
          updateStatusPay
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
