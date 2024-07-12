import { useState, useEffect, createContext } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import useServerArea from "../../../api/useServerArea";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import Paginate from "../../../components/misc/Paginate";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Check } from "heroicons-react";
import Modal from "../../../components/modals/GenericModal";
import {
  AreasInterface,
  FundDestinationInterface,
  Modifier,
} from "../../../interfaces/ServerInterfaces";
import { useServerBilling } from "../../../api/useServerBilling";
import NewModifier from "./foundModifiers/NewModifier";
import EditModifier from "./foundModifiers/EditModifier";

interface ContextModifier {
  isLoading?: boolean;
  addNewModifier?: Function;
  updateModifier?: Function;
  deleteModifier?: Function;
  currentArea?: AreasInterface;
  isFetching?: boolean;
  isFetchingAux?: boolean;
}

export const ContextModifier = createContext<ContextModifier>({});
const InvoiceModifiers = () => {
  const {
    isLoading,
    isFetching,
    getAllModifier,
    allModifier,
    modifierPaginate,
    addNewModifier,
    updateModifier,
    deleteModifier,
    isFetchingAux,
  } = useServerBilling();

  const { areaId } = useParams();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { control, watch, getValues } = useForm({
    mode: "onChange",
  });
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });
  const [openDetailModal, setOpenDetailModal] = useState<boolean>(false);
  const [selectModifier, setSelectModifier] = useState<Modifier | null>(null);

  const currentArea = areas.find((item) => item.id === Number(areaId));

  useEffect(() => {
    //@ts-ignore
    getAllModifier({areaId});
  }, []);

  const titles: string[] = ["Nombre", "Tipo", "Prioridad", "Mostrar", "Activo"];
  const displayData: Array<DataTableInterface> = [];

  allModifier?.forEach((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: `${item?.name}`,
        Tipo: translateModifierType(item?.type),
        Prioridad: item?.index,
        Mostrar: item?.showName,
        Activo: item.active ? (
          <span className="flex justify-center rounded-full text-sm text-green-700 font-semibold text-center">
            <Check className="h-6" />
          </span>
        ) : (
          <span className="flex justify-center rounded-full text-sm text-red-700 font-semibold text-center">
            <XMarkIcon className="h-6" />
          </span>
        ),
      },
    })
  );

  const actions = [
    {
      icon: (
        <PlusIcon className="h-7" title="Agregar nuevo destino de fondos" />
      ),
      action: () => setOpenModal(true),
      title: "Nuevo modificador",
    },
  ];

  //Action after click in RowTable
  const rowAction = (id: number) => {
    setSelectModifier(allModifier.find((item) => item.id === id) ?? null);
  };

  //-----------------------------------------------------------------------------

  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <div className="pt-7">
          <GenericTable
            tableTitles={titles}
            tableData={displayData}
            actions={actions}
            rowAction={rowAction}
            paginateComponent={
              <Paginate
                action={(page: number) => setFilter({ ...filter, page })}
                data={modifierPaginate}
              />
            }
            loading={isLoading}
          />
        </div>
      </div>

      <ContextModifier.Provider
        value={{
          addNewModifier,
          currentArea,
          isFetching,
          isLoading,
          updateModifier,
          deleteModifier,
          isFetchingAux,
        }}
      >
        {openModal && (
          <Modal state={openModal} close={() => setOpenModal(false)} size="m">
            <NewModifier close={() => setOpenModal(false)} />
          </Modal>
        )}

        {selectModifier && (
          <Modal
            state={!!selectModifier}
            close={() => setSelectModifier(null)}
            size="m"
          >
            <EditModifier
              close={() => setSelectModifier(null)}
              data={selectModifier}
            />
          </Modal>
        )}
      </ContextModifier.Provider>
    </>
  );
};

export default InvoiceModifiers;

const translateModifierType = (type: string): string => {
  switch (type) {
    case "tax":
      return "Impuesto";
    case "discount":
      return "Descuento";
    default:
      return "Desconocido";
  }
};
