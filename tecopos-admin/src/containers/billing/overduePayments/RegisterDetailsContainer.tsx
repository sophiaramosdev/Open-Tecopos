import React, { createContext, useContext, useEffect, useState } from "react";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import { Control, useForm } from "react-hook-form";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { OrderInterface } from "../../../interfaces/ServerInterfaces";
import Fetching from "../../../components/misc/Fetching";
import SideNav from "../../../components/misc/SideNav";
import { ListOverdueContext } from "./OverduePayments";
import RegisterDetailsTabOverdue from "./registerDetailsTabs/RegisterDetailsTabOverdue";
import { ShippingAndBillingTabOverdue } from "./registerDetailsTabs/ShippingAndBillingTabOverdue";
import { ProductsTabOverdue } from "./registerDetailsTabs/ProductsTabOverdue";
import { OperationsRegisterTabOverdue } from "./registerDetailsTabs/OperationsRegisterTab";
import { PartialPaysDetailsTab } from "./registerDetailsTabs/PartialPaysDetailsTab";

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
  updateState?: Function;
  closeModalDetails?: Function;
  openPayModal?: boolean;
}

export const RegisterDetailsContext =
  createContext<RegisterDetailsContextInterface>({});

export const RegisterDetailsContainerOverdue = ({
  id,
  updateState,
  closeModalDetails,
}: RegisterDetailsInterface) => {
  const {
    orderById,
    getOrderBillingById,
    isLoading = true,
    updateSingleOrderState,
    deletePartialPayment,
    isFetching,
   // setIsLoading,
  } = useContext(ListOverdueContext);
  const { control } = useForm();

  const [currentTab, setCurrentTab] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Facturación y envío",
      href: "shipping",
      current: currentTab === "shipping",
    },
    {
      name: "Productos",
      href: "products",
      current: currentTab === "products",
    },
  ];

  !orderById?.isPreReceipt &&
    tabs.push({
      name: "Pagos parciales",
      href: "partialPays",
      current: currentTab === "partialPays",
    });

  tabs.push({
    name: "Trazas",
    href: "opperations",
    current: currentTab === "opperations",
  });

  useEffect(() => {
    //setIsLoading!(true);
    getOrderBillingById!(id);
  }, []);

  if (isLoading)
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
              <RegisterDetailsTabOverdue  />
            )}
            {currentTab === "shipping" && <ShippingAndBillingTabOverdue />}
            {currentTab === "products" && <ProductsTabOverdue />}
            {currentTab === "opperations" && <OperationsRegisterTabOverdue />}
            {currentTab === "partialPays" && <PartialPaysDetailsTab />}
          </form>
        </section>
      </RegisterDetailsContext.Provider>
    </>
  );
};
