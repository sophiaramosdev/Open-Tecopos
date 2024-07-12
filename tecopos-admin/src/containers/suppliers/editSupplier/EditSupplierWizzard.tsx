import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import Fetching from "../../../components/misc/Fetching";
import EditPersonalSupplier from "./EditPersonalSupplierData";
import EditAddressSupplierData from "./EditAddressSupplierData";
import EditPhonesSupplierData from "./EditPhonesSupplierData";
import { SupplierInterfaces } from "../../../interfaces/ServerInterfaces";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { useNavigate } from "react-router-dom";
import SideNav from "../../../components/misc/SideNav";
import DetailSupplier from "../DetailSupplier";
import DetailSupplieV2 from "../DetailSupplierV2";

interface WizzardInterface {
  currentSupplier: SupplierInterfaces | null;
  crud: {
    update: Function;
    del: Function;
    isLoading: boolean;
    isFetching: boolean;
  };
}

const EditSupplierWizzard = ({ currentSupplier, crud }: WizzardInterface) => {
  const { update, del, isLoading, isFetching } = crud;

  const [deleteModal, setDeleteModal] = useState(false);

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
      name: "Pedidos",
      current: currentTab === "supplier",
      href: "supplier",
    },
  ];

  const navigate = useNavigate();

  if (isFetching)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );
  return (
    <>
      <div className="px-4 py-3 text-right sm:px-6">
        <button
          onClick={() => setDeleteModal(true)}
          type="button"
          className="inline-flex items-center rounded-md border border-red-500  bg-red-50 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-50 focus:ring-offset-2"
        >
          <TrashIcon className="h-5 text-red-500" />
        </button>
      </div>

      {/* <TabNav action={setCurrentTab} tabs={tabs} /> */}
      <section className="grid grid-cols-12 gap-x-5">
        <aside className="col-span-2">
          <SideNav action={setCurrentTab} tabs={tabs} />
        </aside>

        <section className="col-span-10">
          {currentTab === "personalData" && (
            <EditPersonalSupplier
              isLoading={isLoading}
              update={update}
              currentSupplier={currentSupplier}
            />
          )}
          {currentTab === "address" && (
            <EditAddressSupplierData
              isLoading={isLoading}
              update={update}
              currentSupplier={currentSupplier}
            />
          )}
          {currentTab === "phones" && (
            <EditPhonesSupplierData
              isLoading={isLoading}
              update={update}
              currentSupplier={currentSupplier}
            />
          )}
          {currentTab === "supplier" && (
            <DetailSupplieV2
            supplierId={currentSupplier?.id}
            />
          )}
        </section>
      </section>

      {deleteModal && (
        <Modal close={setDeleteModal} state={deleteModal}>
          <AlertContainer
            title={`¡Eliminar proveedor!`}
            onAction={() =>
              del(Number(currentSupplier?.id), () => navigate("/suppliers"))
            }
            onCancel={() => setDeleteModal(false)}
            text={`¿Seguro que desea eliminar este proveedor: ${currentSupplier?.name}?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default EditSupplierWizzard;
