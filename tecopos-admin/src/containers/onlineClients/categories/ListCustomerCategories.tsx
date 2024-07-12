import { useState, useEffect, useContext, createContext } from "react";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";

import { BankAccountTagInterfaces } from "../../../interfaces/ServerInterfaces";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import useServerOnlineClients from "../../../api/useServerOnlineClients";
import FormCategoryClient from "./FormCategoryClient";
import Breadcrumb, { PathInterface } from "../../../components/navigation/Breadcrumb";

interface HelperContext {
  allCategories: any;
  isLoading: boolean;
  editCategoryClient: Function;
  deleteClientCategory: Function;
  isFetching: boolean;
  addCustomerCategory: Function;
}

const detailProdContext: Partial<HelperContext> = {};

export const HelperContext = createContext(detailProdContext);

export default function ListCustomerCategory() {
  const {
    getAllClients,
    addClient,
    allClients,
    paginate,
    isLoading,
    isFetching,
    getAllCustomerCategories,
    allCategories,
    paginateCategories,
    deleteClientCategory,
    editCategoryClient,
    addCustomerCategory,
  } = useServerOnlineClients();

  const [openModal, setOpenModal] = useState<boolean>(false);

  const [currenctCategory, setCurrenctCategory] =
    useState<BankAccountTagInterfaces | null>(null);

  //Metodo ascociado al filtrado de Accounts en DB
  const [filter, setFilter] = useState<BasicType | null>(null);

  useEffect(() => {
    getAllCustomerCategories();
  }, []);

  //Data for Table List --------------------------------------------------------------------

  const titles: string[] = ["Nombre","Descripción"];
  const displayData: Array<DataTableInterface> = [];

  allCategories?.map((item: any) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.name,
        Descripción: item.description,
      },
    })
  );

  //Action after click in RowTable
  const rowAction = (id: number) => {
    setCurrenctCategory(allCategories?.find((item: any) => item.id === id)!);
  };

  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Agregar nuevo concepto" />,
      action: () => setOpenModal(true),
      title: "Nueva categoría",
    },
  ];

  let searching = {
    placeholder: "Buscar",
    action: (value: string) => setFilter({ search: value }),
  };

  //--------------------------------------------------------------------------------------

  const paths: PathInterface[] = [
    {
      name: "Clientes",
    },
    {
      name: "Mis Categorías",
    },
  ];

  return (
    <>
      <Breadcrumb
        icon={<UsersIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginateCategories}
          />
        }
        searching={searching}
        loading={isLoading}
      />

      <HelperContext.Provider
        value={{
          allCategories,
          deleteClientCategory,
          editCategoryClient,
          addCustomerCategory,
          isFetching,
        }}
      >
        {openModal && (
          <Modal state={openModal} close={() => setOpenModal(false)} size="m">
            <FormCategoryClient closeModal={() => setOpenModal(false)} />
          </Modal>
        )}

        {!!currenctCategory && (
          <Modal
            state={!!currenctCategory}
            close={() => setCurrenctCategory(null)}
            size="m"
          >
            <FormCategoryClient
              categoryData={currenctCategory}
              closeModal={() => setCurrenctCategory(null)}
            />
          </Modal>
        )}
      </HelperContext.Provider>
    </>
  );
}
