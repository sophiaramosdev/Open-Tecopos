import { useEffect, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import useServerArea from "../../../api/useServerArea";
import { useParams } from "react-router-dom";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { CheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import FormResource from "./FormResource";
import { AreaResourcesInterface } from "../../../interfaces/ServerInterfaces";

const AreaResources = () => {
  const { areaId } = useParams();
  const {
    getAreaResources,
    addAreaResource,
    updateAreaResource,
    deleteAreaResource,
    areaResources,
    isLoading,
    isFetching,
    paginate,
  } = useServerArea();

  useEffect(() => {
    areaId && getAreaResources(areaId);
  }, []);

  const [newResourceModal, setNewResourceModal] = useState(false);

  const [editResourceModal, setEditResourceModal] = useState<{
    state: boolean;
    data: Partial<AreaResourcesInterface> | null;
  }>({ state: false, data: null });

  //Data for generic table --------------------------------------------------------------------------------
  const dataTable: DataTableInterface[] = [];
  const tableTitles = ["Nombre", "Disponible", "Reservable"];
  areaResources.map((item) =>
    dataTable.push({
      rowId: item.id,
      payload: {
        Nombre: item.code,
        Disponible: (
          <div className="flex justify-center">
            {item.isAvailable ? (
              <CheckIcon className="h-8 text-green-600" />
            ) : (
              <XMarkIcon className="h-8 text-red-600" />
            )}
          </div>
        ),
        Reservable: (
          <div className="flex justify-center">
            {" "}
            {item.isReservable ? (
              <CheckIcon className="h-8 text-green-600" />
            ) : (
              <XMarkIcon className="h-8 text-red-600" />
            )}
          </div>
        ),
      },
    })
  );

  //--------------------------------------------------------------------------------------------------

  //CRUD Actions ---------------------------------------------------------------------------------------
  const addAction = (data: Record<string, string | number | boolean>) => {
    areaId && addAreaResource(areaId, data, () => setNewResourceModal(false));
  };

  const updAction = (
    id: number,
    data: Record<string, string | number | boolean>
  ) => {
    areaId &&
      updateAreaResource(id, data, () =>
        setEditResourceModal({ state: false, data: null })
      );
  };

  const delAction = (id: string) => {
    deleteAreaResource(id, () =>
      setEditResourceModal({ state: false, data: null })
    );
  };

  //--------------------------------------------------------------------------------------------------
  return (
    <div>
      <GenericTable
        tableData={dataTable}
        tableTitles={tableTitles}
        loading={isLoading}
        paginateComponent={
          <Paginate action={(page: number) => null} data={paginate} />
        }
        rowAction={(id: number) =>
          setEditResourceModal({
            state: true,
            data: areaResources.find((item) => item.id === id) ?? null,
          })
        }
        actions={[
          {
            title: "Nuevo recurso",
            icon: <PlusIcon className="h-7" />,
            action: () => setNewResourceModal(true),
          },
        ]}
      />

      {newResourceModal && (
        <Modal
          state={newResourceModal}
          close={() => setNewResourceModal(false)}
        >
          <FormResource addAction={addAction} loading={isFetching} />
        </Modal>
      )}

      {editResourceModal.state && (
        <Modal
          state={editResourceModal.state}
          close={() => setEditResourceModal({ state: false, data: null })}
        >
          <FormResource
            data={editResourceModal.data}
            loading={isFetching}
            updAction={updAction}
            delAction={delAction}
          />
        </Modal>
      )}
    </div>
  );
};

export default AreaResources;
