import { useState, createContext, useEffect, useMemo } from "react";
import DetailsReservationTab from "./editReservationsTabs/DetailsReservationTab";

interface Props {
  close: Function;
  context:React.Context<any>
}

const EditReservationTab = ({ close,context }: Props) => {
  //Manage Tabs --------------------------------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      name: "Servicio",
      href: "service",
      current: currentTab === "service",
    },
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
  ];

  return (
    <div className="h-full">
      <div className="flex justify-center gap-5">
        <h2 className="text-lg text-gray-700 font-medium text-center">
          Editar reserva
        </h2>
      </div>

      {/* <TabNav action={setCurrentTab} tabs={tabs} /> */}

      {/* {isFetching && <Fetching />} */}
      <div className="px-6 mx-auto">
        {/* {currentTab === "service" && <ServiceReservationTab/>} */}
        {currentTab === "details" && <DetailsReservationTab close={close} context={context} />}
      </div>
    </div>
  );
};

export default EditReservationTab;
