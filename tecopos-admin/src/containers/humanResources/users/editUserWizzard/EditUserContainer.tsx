import { useState, useEffect } from "react";
import Fetching from "../../../../components/misc/Fetching";
import DetailUserEditComponent from "./DetailUserEditComponent";
import useServerUsers from "../../../../api/useServerUsers";

import TabNav from "../../../../components/navigation/TabNav";
import EditRolesComponent from "./EditRolesComponent";
import { FaBoxOpen, FaBusinessTime } from "react-icons/fa";
import EditUser from "./EditUser";
import { useAppSelector } from "../../../../store/hooks";
import useServerArea from "../../../../api/useServerArea";
import SideNav from "../../../../components/misc/SideNav";

interface UserWizzardInterface {
  id: number | null;
  editUser: Function;
  deleteUser: Function;
  isFetching: boolean;
  closeModal: Function;
}

const EditUserContainer = ({
  id,
  editUser,
  deleteUser,
  isFetching,
  closeModal,
}: UserWizzardInterface) => {
  const { getUser, user, isLoading } = useServerUsers();

  const { business } = useAppSelector((state) => state.init);

  const { allAreas, getAllAreas } = useServerArea();

  useEffect(() => {
    getAllAreas({ inAllMyBusiness: true, all_data: true });
  }, []);

  useEffect(() => {
    id && getUser(id);
  }, []);

  //Tabs data --------------------------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
      icon: <FaBoxOpen />,
    },
    {
      name: "Negocio",
      href: "business",
      current: currentTab === "business",
      icon: <FaBusinessTime />,
    },
    {
      name: "Roles",
      href: "roles",
      current: currentTab === "roles",
      icon: <FaBusinessTime />,
    },
  ];

  if (business?.mode !== "GROUP") tabs.splice(1, 1);

  const action = (href: string) => setCurrentTab(href);

  //------------------------------------------------------------------------------------------------------

  if (isLoading)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );
  return (
    <div className="grid grid-cols-12 gap-x-5">
      {isFetching && <Fetching />}
      <header className="col-span-2">
        {/* <TabNav tabs={tabs} action={action} /> */}
        <SideNav tabs={tabs} action={action} />
      </header>
      <section className="col-span-10">
        {currentTab === "details" && (
          <DetailUserEditComponent
            editUser={editUser}
            deleteUser={deleteUser}
            user={user}
            closeModal={closeModal}
            isFetching={isFetching}
          />
        )}
        {currentTab === "business" && (
          <EditUser editUser={editUser} user={user} isFetching={isFetching} />
        )}
        {currentTab === "roles" && (
          <EditRolesComponent user={user} allAreas={allAreas} />
        )}
      </section>
    </div>
  );
};

export default EditUserContainer;
