import { useNavigate } from "react-router-dom";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { useState, useEffect } from "react";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import useServerArea from "../../api/useServerArea";
import Paginate from "../../components/misc/Paginate";
import { BasicType } from "../../interfaces/InterfacesLocal";
import Breadcrumb from "../../components/navigation/Breadcrumb";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import { PathInterface } from "../../components/navigation/Breadcrumb";

export default function ListStocks() {
  const navigate = useNavigate();
  const { getAllAreas, allAreas, paginate, isLoading } = useServerArea();
  const initialFilter = { page: 1, type: "STOCK" };
  const [filter, setFilter] = useState<BasicType>(initialFilter);

  useEffect(() => {
    getAllAreas(filter);
    // eslint-disable-next-line
  }, [filter]);

  //Data for Table List ----------------------------------------------------------------------
  const titles: string[] = ["Almacén", "Estado"];
  const displayData: Array<DataTableInterface> = [];
  allAreas.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Almacén: item.name,
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

  const rowAction = (area: string) => navigate(`/stocks/${area}`);

  let searching = {
    placeholder: "Buscar Almacén",
    action: (value: string) =>
      value
        ? setFilter({ search: value, type: "STOCK" })
        : setFilter(initialFilter),
  };

  const paginateAction = (page: number) => setFilter({ ...filter, page });

  //--------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis almacenes",
    },
  ];
  //------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<RectangleGroupIcon className="h-7 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        paginateComponent={<Paginate action={paginateAction} data={paginate} />}
        searching={searching}
        loading={isLoading}
      />
    </>
  );
}
