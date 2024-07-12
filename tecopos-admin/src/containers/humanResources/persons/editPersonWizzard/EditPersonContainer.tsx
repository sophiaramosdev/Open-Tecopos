import { useState, useEffect } from "react";
import Fetching from "../../../../components/misc/Fetching";
import DetailUserEditComponent from "./EditDetail";
import useServerUsers from "../../../../api/useServerUsers";

import TabNav from "../../../../components/navigation/TabNav";
import EditAddress from "./EditAddress";
import EditPost from "./EditPost";
import EditSettings from "./EditSettings";
import EditAccess from "./EditAccess";
import { FaBoxOpen, FaAddressBook, FaBusinessTime } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faGears,
  faTasks,
} from "@fortawesome/free-solid-svg-icons";
import EditUserRolesComponent from "../../users/editUserWizzard/EditRolesComponent";
import { UserInterface } from "../../../../interfaces/ServerInterfaces";
import useServerArea from "../../../../api/useServerArea";
import EditRecords from "./EditRecords";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import EditSalaries from "./EditSalaries";
import SideNav from "../../../../components/misc/SideNav";

interface UserWizzardInterface {
  id: number | null;
  editPerson: Function;
  deletePerson: Function;
  isFetching: boolean;
  closeModal: Function;
  currentTab?: string;
}

const EditPerson = ({
  id,
  editPerson,
  deletePerson,
  isFetching,
  closeModal,
  currentTab: ListPeopleCurrentTab,
}: UserWizzardInterface) => {
  const { getPersonUser, person, isLoading, user } = useServerUsers();

  const [personUser, setPersonUser] = useState<UserInterface | null>();

  const { allAreas, getAllAreas } = useServerArea();

  useEffect(() => {
    getAllAreas({ inAllMyBusiness: true, all_data: true });
  }, []);

  useEffect(() => {
    id && getPersonUser(id);
  }, []);

  useEffect(() => {
    setPersonUser(user);
  }, [user]);

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
      name: "Dirección",
      href: "address",
      current: currentTab === "address",
      icon: <FaAddressBook />,
    },
    {
      name: "Negocio",
      href: "business",
      current: currentTab === "business",
      icon: <FaBusinessTime />,
    },
    {
      name: "Usuario y roles",
      href: "roles",
      current: currentTab === "roles",
      icon: <FaBusinessTime />,
    },
    {
      name: "Accesos",
      href: "access",
      current: currentTab === "access",
      icon: <FontAwesomeIcon icon={faArrowRightArrowLeft} />,
    },
    {
      name: "Registros",
      href: "records",
      current: currentTab === "records",
      icon: <FontAwesomeIcon icon={faTasks} />,
    },
    {
      name: "Salarios",
      href: "salaries",
      current: currentTab === "salaries",
      icon: <BanknotesIcon className="h-5" />,
    },
  ];

  if (ListPeopleCurrentTab !== undefined && ListPeopleCurrentTab !== null) {
    if (ListPeopleCurrentTab !== "historical") {
      tabs.push({
        name: "Ajustes",
        href: "settings",
        current: currentTab === "settings",
        icon: <FontAwesomeIcon icon={faGears} />,
      });
    }
  } else {
    tabs.push({
      name: "Ajustes",
      href: "settings",
      current: currentTab === "settings",
      icon: <FontAwesomeIcon icon={faGears} />,
    });
  }

  // if (user !== null) {
  //   tabs.splice(3, 0, { name: "Usuario y roles", href: "roles", current: currentTab === "roles", icon: <FaBusinessTime /> })
  // }

  const action = (href: string) => setCurrentTab(href);

  //------------------------------------------------------------------------------------------------------

  if (isLoading)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <div className="grid grid-cols-12 gap-x-5  h-fit  overflow-auto scrollbar-thin ">
      {isFetching && <Fetching />}
      <aside className="col-span-2">
        {/* <TabNav tabs={tabs} action={action} /> */}
        <SideNav tabs={tabs} action={action} />
      </aside>
      <section className="col-span-10 min-h-[400px] ">
        {currentTab === "details" && (
          <DetailUserEditComponent
            editPerson={editPerson}
            person={person}
            user={user}
            closeModal={closeModal}
            isFetching={isFetching}
          />
        )}
        {currentTab === "address" && (
          <EditAddress
            editPerson={editPerson}
            person={person}
            isFetching={isFetching}
          />
        )}
        {currentTab === "business" && (
          <EditPost
            editPerson={editPerson}
            person={person}
            isFetching={isFetching}
          />
        )}
        {currentTab === "roles" && (
          // {(currentTab === "roles" && user !== null) && (
          <EditUserRolesComponent
            user={personUser as UserInterface}
            allAreas={allAreas}
            personId={person?.id}
            closeModal={closeModal}
          />
        )}
        {currentTab === "access" && <EditAccess person={person} />}
        {currentTab === "records" && <EditRecords person={person} />}
        {currentTab === "salaries" && <EditSalaries person={person} />}
        {currentTab === "settings" && (
          <EditSettings
            deletePerson={deletePerson}
            person={person}
            isFetching={isFetching}
            closeModal={closeModal}
          />
        )}
      </section>
    </div>
  );
};

export default EditPerson;
