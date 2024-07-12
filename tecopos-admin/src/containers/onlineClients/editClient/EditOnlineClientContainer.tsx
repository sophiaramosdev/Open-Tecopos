import { useState, createContext, useEffect, useMemo, useContext } from "react";
import Fetching from "../../../components/misc/Fetching";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import {
  OnlineClientInterface,
  Client,
} from "../../../interfaces/ServerInterfaces";
import EditAddressData from "./EditOnlineAddressData";
import EditOnlinePersonalData from "./EditOnlinePersonalDataContainer";
import EditPhones from "./EditPhones";
import { EditSettingsClient } from "./EditSettingsClient";
import SideNav from "../../../components/misc/SideNav";
import DetailOnlineClientContainerV2 from "../DetailOnlineClientContainerV2";
import { useAppSelector } from "../../../store/hooks";
import useServerEcoCycle from "../../../api/useServerEconomicCycle";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { ClientContex } from "../OnlineClientsContainer";

interface EditClientCtxItf {
  client: OnlineClientInterface | null;
  editClient: Function;
}

interface EditComponent {
  client: OnlineClientInterface;
  editClient: Function;
  deleteClient: Function;
  isFetching: boolean;
  isLoading: boolean;
  callback?: (client: OnlineClientInterface) => void;
}

export const EditClientCtx = createContext<Partial<EditClientCtxItf>>({});

const EditOnlineClientContainer = ({
  client: clientSelect,
  editClient,
  deleteClient,
  isFetching,
  isLoading,
  callback,
}: EditComponent) => {
  //TabNav ------------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("personalData");

  const tabs: TabsAttr[] = [
    {
      name: "Datos personales",
      current: currentTab === "personalData",
      href: "personalData",
    },
    {
      name: "Dirección",
      current: currentTab === "address",
      href: "address",
    },
    {
      name: "Teléfonos",
      current: currentTab === "phones",
      href: "phones",
    },
    {
      name: "Ordenes asociadas",
      current: currentTab === "order",
      href: "order",
    },
    {
      name: "Ajustes",
      current: currentTab === "settings",
      href: "settings",
    },
  ];

  const {
    getMainClientInfo = () => {},
    clientOrders = [],
    isLoading: isLoadingOrder,
    paginate = {},
    getClient,
    clientServer: client,
    isEdit,
    isGetClient
  } = useContext(ClientContex);

  const {
    setAllOrderState,
    allOrdes,
    editOrder,
    isFetching: fetchingOrder,
    updateAllOrderState,
  } = useServerEcoCycle();

  useEffect(() => {
    getClient && getClient(clientSelect.id);
  }, []);

  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);
  //const { allowRoles: verifyRoles } = useServer();
  const [filter, setFilter] = useState<BasicType>({
    clientId: client?.id as number,
  });
  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    orderId?: number;
  }>({ state: false });

  useEffect(() => {
    client?.id &&
      getMainClientInfo!(client?.id as number, filter, setAllOrderState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const orderOrigin = useMemo(
    () =>
      clientOrders?.find((order) => order.id === detailOrderModal.orderId)
        ?.origin,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailOrderModal]
  );
  if (isGetClient ) return <Fetching className="h-96" />;

  return (
    <div className="grid grid-cols-12 gap-x-5">
      {/* <TabNav action={setCurrentTab} tabs={tabs} /> */}
      <aside className="col-span-2">
        <SideNav action={setCurrentTab} tabs={tabs} />
      </aside>
      <section className="col-span-10 relative">
        {isEdit && <Fetching className="" />}

        <EditClientCtx.Provider value={{ client, editClient }}>
          {
            <section
              className={`${currentTab !== "personalData" ? "hidden" : ""}`}
            >
              <EditOnlinePersonalData />
            </section>
          }

          {
            <section className={`${currentTab !== "address" ? "hidden" : ""}`}>
              <EditAddressData />
            </section>
          }
          {currentTab === "phones" && <EditPhones />}
          {
            <section className={`${currentTab !== "order" ? "hidden" : ""}`}>
              <DetailOnlineClientContainerV2
                clientId={client?.id as number}
                dependencies={{
                  getMainClientInfo,
                  clientOrders,
                  isLoading,
                  //@ts-ignore
                  paginate,
                  setAllOrderState,
                  allOrdes,
                  editOrder,
                  fetchingOrder,
                  updateAllOrderState,
                }}
              />
            </section>
          }
          {currentTab === "settings" && (
            <EditSettingsClient
              client={client as OnlineClientInterface}
              deleteClient={deleteClient}
              isFetching={isFetching}
            />
          )}
        </EditClientCtx.Provider>
      </section>
    </div>
  );
};

export default EditOnlineClientContainer;
