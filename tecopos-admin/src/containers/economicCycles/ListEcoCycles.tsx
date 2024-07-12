/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import useServerEcoCycle from "../../api/useServerEconomicCycle";
import Paginate from "../../components/misc/Paginate";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  FunnelIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import Modal from "../../components/modals/GenericModal";
import { useAppSelector } from "../../store/hooks";
import NewEcocycleComponent from "../../components/economicCycle/NewEcocycleComponent";
import { CalendarEconomicCycle } from "../../components";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { formatCalendar } from "../../utils/helpers";
import useServer from "../../api/useServerMain";

const ListEcoCyclesPage = () => {
  const navigate = useNavigate();
  const { getAllEcoCycles, addEcoCycle, allEcoCycles, isFetching, paginate } =
    useServerEcoCycle();
  const { allowRoles } = useServer();
  const { business } = useAppSelector((state) => state.init);
  const [page, setPage] = useState<number>(1);
  const [filterByDateModal, setFilterByDateModal] = useState(false);
  const [newEcocycleModal, setNewEcocycleModal] = useState(false);

  useEffect(() => {
    getAllEcoCycles(page);
  }, [page]);

  //Data for generic Table-------------------------------------------------------------------
  const tableTitles: string[] = [
    "Nombre",
    "Sistema de Precios",
    "Fecha de Inicio",
    "Fecha de Cierre",
    "Estado",
    "Iniciado por",
    "Cerrado por",
  ];

  if ((business?.priceSystems ?? []).length <= 1) tableTitles.shift();
  if (
    business?.configurationsKey.find(
      (item) => item.key === "is-economiccycle-automated"
    )?.value === "true"
  )
    tableTitles.splice(-2, 2);
  const tableData: DataTableInterface[] = [];
  allEcoCycles.map((item) =>
    tableData.push({
      rowId: item.id,
      payload: {
        "Nombre": item?.name,
        "Sistema de Precios": item?.priceSystem?.name,
        "Fecha de Inicio": formatCalendar(item.openDate),
        "Fecha de Cierre": formatCalendar(item.closedDate),
        Estado: (
          <StateSpanForTable
            currentState={!item.isActive}
            greenState={"cerrado"}
            redState={"abierto"}
          />
        ),
        "Iniciado por": item.openBy?.displayName,
        "Cerrado por": item.closedBy?.displayName,
      },
    })
  );
  const rowAction = (id: number) => {
    const ecoCycle = allEcoCycles.find((ecoCycle) => ecoCycle.id === id);
    navigate(id.toString(), { state: { isActive: ecoCycle?.isActive } });
  };
  const tableActions = [
    {
      title: "Nuevo ciclo económico",
      icon: <PlusIcon className="h-5" />,
      action: () => setNewEcocycleModal(true),
    },
    {
      title: "Búsqueda por fechas",
      icon: <FunnelIcon className="h-5" />,
      action: () => setFilterByDateModal(true),
    },
  ];

  //-------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Ciclos económicos",
    },
  ];
  //------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<ArrowPathRoundedSquareIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
        actions={allowRoles(["ADMIN", "MANAGER_ECONOMIC_CYCLE"]) ? tableActions : undefined}
        loading={isFetching}
        paginateComponent={
          <Paginate action={(page: number) => setPage(page)} data={paginate} />
        }
      // showSpecificColumns={true}
      // specificColumnSpaceToSave={"ecoCycles"}
      />
      {newEcocycleModal && (
        <Modal
          state={newEcocycleModal}
          close={() => setNewEcocycleModal(false)}
        >
          <NewEcocycleComponent
            priceSystem={business?.priceSystems ?? []}
            action={(data: { name: string; priceSystemId: number }) =>
              addEcoCycle(data, () => setNewEcocycleModal(false))
            }
            loading={isFetching}
          />
        </Modal>
      )}

      {filterByDateModal && (
        <Modal
          close={() => setFilterByDateModal(false)}
          state={filterByDateModal}
          size="m"
        >
          <CalendarEconomicCycle setShowDate={setFilterByDateModal} />
        </Modal>
      )}
    </>
  );
};

export default ListEcoCyclesPage;
