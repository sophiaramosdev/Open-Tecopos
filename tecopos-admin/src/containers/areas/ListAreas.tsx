import { useNavigate, useParams } from "react-router-dom";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { useState, useEffect } from "react";
import NewArea from "./NewArea";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import { Cog8ToothIcon, PlusIcon } from "@heroicons/react/24/outline";
import useServerArea from "../../api/useServerArea";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { translateAreaType } from "../../utils/translate";
import ScrollTypeFilter from "../../components/misc/ScrollTypeFilter";
import Breadcrumb, { PathInterface } from "../../components/navigation/Breadcrumb";

export default function ListAreas() {
  const { addArea, getAllAreas, allAreas, paginate, isLoading, isFetching } =
    useServerArea();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BasicType>({ page: 1 });

  useEffect(() => {
    getAllAreas(filter);
  }, [filter]);

  //Data for Table List --------------------------------------------------------------------
  const titles: string[] = ["Área", "Tipo", "Estado"];
  const displayData: Array<DataTableInterface> = [];
  allAreas.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        "Área": item.name,
        "Tipo": translateAreaType(item.type),
        Estado: (
          <StateSpanForTable
            currentState={item.isActive}
            greenState="Activa"
            redState="Inactiva"
          />
        ),
      },
    })
  );

  const rowAction = (area: string) => navigate(`${area}`);

  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Agregar Área" />,
      action: () => setOpenModal(true),
      title: "Insertar nueva área",
    },
  ];
  let searching = {
    placeholder: "Buscar Área",
    action: (value: string) =>
      value ? setFilter({ search: value }) : setFilter({ page: 1 }),
  };
  const paginateAction = (page: number) => setFilter({ ...filter, page });

  const submitAction = (data: Record<string, string>) =>
    addArea(data, () => setOpenModal(false));

  //--------------------------------------------------------------------------------------

  //New Area Modal ---------------------------------------------------------------------
  const [openModal, setOpenModal] = useState<boolean>(false);
  //------------------------------------------------------------------------------------

  //Scroll Filter ------------------------------------------------------------------------
  const areaTypes:SelectInterface[] = [
    {id:"STOCK", name:"Almacén"},    
    {id:"MANUFACTURER", name:"Área de procesado"},
    {id:"SALE", name:"Punto de venta"},
    {id:"ACCESSPOINT", name:"Punto de acceso"},
  ]

  //---------------------------------------------------------------------------------------

  //Breadcrumb ----------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name:"Mis áreas",
    },
   ];
  //-----------------------------------------------------------------------------------------

  return (
    <>
    <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
    <ScrollTypeFilter current={filter?.type?.toString()??null} items={areaTypes} onChange={(type:string)=>setFilter({...filter,type})} title="Tipo de área" />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={<Paginate action={paginateAction} data={paginate} />}
        searching={searching}
        loading={isLoading}
      />

      {openModal && (
        <Modal state={openModal} close={() => setOpenModal(false)} size="m">
          <NewArea submitAction={submitAction} loading={isFetching} />
        </Modal>
      )}
    </>
  );
}
