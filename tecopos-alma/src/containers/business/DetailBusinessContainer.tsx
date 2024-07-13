import { useNavigate, useParams } from "react-router-dom";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import useServerBusiness from "../../api/useServerBusiness";
import Details from "./businessDetails/Details";
import Resumen from "./businessDetails/Resume";
import Loading from "../../components/misc/Loading";
import Billing from "./businessDetails/Billing";
import Branches from "./businessDetails/Branches";
import { TabsAttr } from "../../components/navigation/TabNav";
import Configuration from "./businessDetails/Configuration/Configuration";
import SideNav from "../../components/navigation/SideNav";
import { useAppSelector } from "../../store/hooks";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import Modal from "../../components/misc/GenericModal";
import BusinessForm from "./BusinessForm";
import Configurations from "./businessDetails/Configuration/Configurations";
import MobileApps from "./businessDetails/MobileApps";
import Button from "../../components/misc/Button";
import ListUser from "../users/ListUser";

const BusinessContainer = () => {
  const navigate = useNavigate();
  const { businessId } = useParams();
  const { getBusiness, business, isLoading, updateBusiness } =
    useServerBusiness();
  const [openEditBusinessModal, setEditBusinessModal] = useState(false);
  const editBusisnes = (data: any, closeModal: Function) => {
    updateBusiness(businessId, data, closeModal);
  };

  useEffect(() => {
    getBusiness(businessId!);
  }, []);

  const { configurationsKey } = useAppSelector(
    (state) => state.configurationsKey
  );

  //Breadcrumb data--------------------------
  const paths: PathInterface[] = [
    { name: "Negocios", action: () => navigate("/business") },
    { name: business?.name! },
  ];
  //--------------------------------------------

  //TabNav data ---------------------------------------
  const [currentTab, setCurrentTab] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      current: currentTab === "details",
      href: "details",
    },
    {
      name: "Resumen",
      current: currentTab === "resume",
      href: "resume",
    },
    {
      name: "Facturación",
      current: currentTab === "billing",
      href: "billing",
    },
    {
      name: "Usuarios",
      current: currentTab === "users",
      href: "users",
    },
    {
      name: "Módulos",
      current: currentTab === "configuration",
      href: "configuration",
    },
    {
      name: "Hijos",
      current: currentTab === "branch",
      href: "branch",
    },
    {
      name: "Configuraciones",
      current: currentTab === "configurations",
      href: "configurations",
    },
    {
      name: "Aplicaciones móviles",
      current: currentTab === "mobileApps",
      href: "mobileApps",
    },
  ];
  //--------------------------------------------------

  if (isLoading) return <Loading />;

  return (
    <>
      {openEditBusinessModal && (
        <Modal
          state={openEditBusinessModal}
          close={() => setEditBusinessModal(false)}
        >
          <BusinessForm
            initialValues={business}
            closeModal={setEditBusinessModal}
            action={editBusisnes}
            isFetching={false}
          />
        </Modal>
      )}
      <div className="flex gap-10 items-center">
        <Breadcrumb icon={<CreditCardIcon className="h-6" />} paths={paths} />
        <div>
          <Button
            color="primary"
            textColor="primary"
            name="Editar"
            action={() => setEditBusinessModal(true)}
            icon={<PencilSquareIcon className="text-primary h-5" />}
            outline
          />
        </div>
      </div>

      <div className="sm:grid grid-cols-10 gap-3">
        <SideNav
          tabs={tabs}
          action={setCurrentTab}
          className="col-span-10 sm:col-span-2"
        />
        <div className="sm:col-span-8 pl-3">
          {currentTab === "details" && <Details business={business!} />}
          {currentTab === "resume" && <Resumen />}
          {currentTab === "billing" && <Billing business={business!} />}
          {currentTab === "users" && <ListUser />}
          {currentTab === "branch" && <Branches />}
          {currentTab === "configuration" && (
            <Configuration configurationsKey={configurationsKey} />
          )}
          {currentTab === "configurations" && (
            <Configurations business={business!} />
          )}
          {currentTab === "mobileApps" && (
            <MobileApps configurationsKey={configurationsKey} />
          )}
        </div>
      </div>
    </>
  );
};

export default BusinessContainer;
