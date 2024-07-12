import {
  PlusIcon,
  ShoppingBagIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createContext, useEffect, useState } from "react";
import useServerProduct from "../../api/useServerProducts";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { useAppSelector } from "../../store/hooks";
import DetailProductContainer from "./DetailProductContainer";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { BasicType } from "../../interfaces/InterfacesLocal";
import NewWizardResource from "./newResourceModal/NewWizardResource";
import { Resource } from "../../interfaces/Interfaces";
import DetailResource from "./EditResource";
import EditResource from "./EditResource";

interface Context {
  isLoading?: boolean;
  isFetching?: boolean;
  updateResource?: Function;
  closeDetails?: Function;
  deleteResource?: Function;
  selectResource?: Resource | null;
}

export const ResourceContext = createContext<Context>({});
export default function ListResource() {
  const {
    paginate,
    isLoading,
    isFetching,
    getAllResources,
    allResources = [],
    newResource,
    updateResource,
    deleteResource
  } = useServerProduct();

  const [filter, setFilter] = useState<BasicType>({ page: 1, orderBy: true });
  const [detailModal, setDetailModal] = useState(false);

  //Initial Config------------------------------------------------------------------------------------

  const { business } = useAppSelector((state) => state.init);

  const precission = Number(
    business?.configurationsKey.find(
      (item) => item.key === "precission_after_coma"
    )?.value
  );

  //CRUD Variable for detail modal

  //----------------------------------------------------------------------------------------------------

  const [newResourceModal, setNewResourceModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  const [selectResource, setSelectResource] = useState<Resource | null>(null);

  useEffect(() => {
    getAllResources(filter);
  }, [filter]);

  //Data to display in Table------------------------------------------------------------------
  //Action after click in RowTable
  const action = (id: any) => {
    const select = allResources.find((item) => item.id === id) ?? null;
    setSelectResource(select);
    setDetailModal(true);
  };

  //Data
  const titles: string[] = [
    "Nombre",
    "Área",
    "",
    "",
    "Disponible",
    "",
    "Reservable",
    "Descripción",
  ];
  const resourcesDisplay: Array<DataTableInterface> = [];
  if (allResources.length > 0) {
    allResources?.forEach((item) =>
      resourcesDisplay.push({
        rowId: item.id,
        payload: {
          Nombre: item?.code,
          Descripción: item?.description,
          Área: item?.area?.name,
          Disponible: (
            <div className=" flex justify-center">
              {item?.isAvailable ? (
                <CheckIcon className="w-7 text-green-400" />
              ) : (
                <XMarkIcon className="w-7 text-red-400" />
              )}
            </div>
          ),
          Reservable: (
            <div className=" flex justify-center">
              {item?.isReservable ? (
                <CheckIcon className="w-7  text-green-400" />
              ) : (
                <XMarkIcon className="w-7 text-red-400" />
              )}
            </div>
          ),
        },
      })
    );
  }

  const actions: BtnActions[] = [
    {
      title: "Añadir recurso",
      action: () => setNewResourceModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  //--------------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    { name: "Recursos" },
  ];
  //------------------------------------------------------------------------------------

  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar Recurso",
  };

  return (
    <>
      <Breadcrumb
        icon={<ShoppingBagIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        actions={actions}
        tableTitles={titles}
        tableData={resourcesDisplay}
        rowAction={action}
        loading={isLoading}
        searching={searching}
        // filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      <ResourceContext.Provider
        value={{
          updateResource,
          isFetching,
          isLoading,
          closeDetails: () => setDetailModal(false),
          selectResource,
          deleteResource
        }}
      >
        {detailModal && (
          <Modal
            state={detailModal}
            close={() => setDetailModal(false)}
            size="m"
          >
            <EditResource />
          </Modal>
        )}

        {newResourceModal && (
          <Modal
            state={newResourceModal}
            close={() => setNewResourceModal(false)}
            size="m"
          >
            <NewWizardResource
              mode="new"
              action={newResource}
              closeModal={() => setNewResourceModal(false)}
              loading={isFetching}
              fetching={isLoading}
            />
          </Modal>
        )}

        {exportModal && (
          <Modal state={exportModal} close={setExportModal}>
            <ExcelFileExport
              filter={filter}
              closeModal={() => setExportModal(false)}
            />
          </Modal>
        )}
      </ResourceContext.Provider>
    </>
  );
}

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportProducts, isLoading } = useServerProduct();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    //exportProducts(filter, data.name, closeModal());
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre del archivo"
        placeholder="Nombre del archivo .xlsx"
        control={control}
        rules={{ required: "Debe indicar un nombre para el archivo" }}
      />
      <div className="flex py-2 justify-end">
        <Button
          type="submit"
          name="Exportar"
          color="slate-600"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};
