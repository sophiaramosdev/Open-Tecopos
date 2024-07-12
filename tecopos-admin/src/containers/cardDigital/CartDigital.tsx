import useServerBusiness from "../../api/useServerBusiness";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import {
  CheckIcon,
  PresentationChartBarIcon,
  TvIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatDateForReportsWithYear } from "../../utils/helpers";
import { createContext, useEffect, useState } from "react";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import NewTv from "./NewTv";
import DetailsTvContainer from "./DetailsTvContainer";
import { BasicType } from "../../interfaces/InterfacesLocal";
import { Tv } from "../../interfaces/Interfaces";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
interface CartDigitalContext {
  isFetching: boolean;
  newTv: (data: BasicType, callback: Function) => Promise<void>;
  getTv: (data: number | string, callback: Function) => Promise<void>;
  selectTv: Tv | null;
  deletedTv: (id: number | string, callback: Function) => Promise<void>;
  updateTv: (
    data: BasicType ,
    id: string | number,
    callback: Function
  ) => Promise<void>;
  newPage: (
    data: BasicType,
    id: string | number,
    callback: Function
  ) => Promise<void>;
  updatePage: (
    data: BasicType,
    id: string | number,
    callback: Function
  ) => Promise<void>;
  deletedPage: (id: string | number, callback: Function) => Promise<void>;
  closeModal: Function;
}

export const CartDigitalContext = createContext<Partial<CartDigitalContext>>(
  {}
);

const CartDigital = () => {
  const [modalTv, setModaTv] = useState(false);
  const [currentTv, setCurrentTv] = useState(null);

  const {
    getAllTvs,
    selectTv,
    getTv,
    isLoading,
    allTVs,
    newTv,
    isFetching,
    deletedTv,
    newPage,
    updatePage,
    deletedPage,
    updateTv
  } = useServerBusiness();
  const closeModal = () => {
    setCurrentTv(null);
  };
  const tableTitles = [
    "Nombre",
    "Activo",
    "Orientación",
    "Código",
    "Creado en",
  ];

  useEffect(() => {
    getAllTvs({});
  }, []);

  const tableData: DataTableInterface[] = [];

  allTVs.forEach((item) => {
    tableData.push({
      rowId: item?.id,
      payload: {
        Nombre: item?.name,
        Activo: (
          <div className="flex justify-center">
            {item?.isActive ? (
              <CheckIcon className="h-8 text-green-600" />
            ) : (
              <XMarkIcon className="h-8 text-red-600" />
            )}
          </div>
        ),
        Orientación: (
          <span>
            {item?.orientation} <sup className="text-xs align-top">&deg;</sup>
          </span>
        ),
        Código: item?.uniqueCode,
        "Creado en": formatDateForReportsWithYear(item?.createdAt),
      },
    });
  });

  const tableActions: BtnActions[] = [
    {
      title: "Nuevo Tv",
      icon: <TvIcon className="h-5" />,
      action: () => setModaTv(true),
    },
  ];

  const rowAction = (id: any) => {
    setCurrentTv(id);
  };
  const paths: PathInterface[] = [
    { name: "Cartelera digital" },
    { name: "Mis Tv" },
  ];
  return (
    <section className=" bg-white rounded-md shadow-md border border-gray-200 p-5">
      <Breadcrumb
        paths={paths}
        icon={<PresentationChartBarIcon className="h-6 text-gray-500" />}
      />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        loading={isLoading}
        actions={tableActions}
        rowAction={rowAction}
      />

      <CartDigitalContext.Provider
        value={{
          isFetching,
          newTv,
          selectTv,
          getTv,
          deletedTv,
          newPage,
          closeModal,
          updatePage,
          deletedPage,
          updateTv
        }}
      >
        {modalTv && (
          <Modal state={modalTv} close={setModaTv} size="l">
            <NewTv closeModal={() => setModaTv(false)} />
          </Modal>
        )}

        {!!currentTv && (
          <Modal state={!!currentTv} close={setCurrentTv} size="l">
            <DetailsTvContainer
              closeModal={() => setCurrentTv(null)}
              currentTv={currentTv}
            />
          </Modal>
        )}
      </CartDigitalContext.Provider>
    </section>
  );
};

export default CartDigital;
