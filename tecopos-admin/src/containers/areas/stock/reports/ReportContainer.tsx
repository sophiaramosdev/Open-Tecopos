import { useState } from "react";
import {
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb, {
  PathInterface,
} from "../../../../components/navigation/Breadcrumb";
import StockReports from "./StockReports";
import { useNavigate } from "react-router-dom";
import StockAviable from "./balance/StockAviable";
import { useAppSelector } from "../../../../store/hooks";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import Modal from "../../../../components/misc/GenericModal";
import Button from "../../../../components/misc/Button";
import { formatDateForReportsWithYearAndHour } from "../../../../utils/helpers";
import CalendarEconomicCycle from "../../../billing/analysis/analysisModals/CalendarEconomicCycle";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Select from "../../../../components/forms/Select";
import InventoryStatusByCycleAndArea from "./balance/InventoryStatusByCycleAndArea";
import useServer from "../../../../api/useServerMain";

const ReportContainer = ({breadcrumb = true }) => {
  const { allowRoles: verifyRoles } = useServer();

  const navigate = useNavigate();

  //Areas ------------------------------------
  const { areas } = useAppSelector((state) => state.nomenclator);

  const stockAreas =
    areas
      ?.filter((area) => area.type === "STOCK")
      .map(({ id, name }) => {
        return { id, name };
      }) || [];

  //------------------------------------------------------------------------------
  const [showModal, setShowModal] = useState(false);
  const [showModalInventory, setShowModalInventory] = useState(false);
  const [showModalInventoryHistory, setShowModalInventoryHistory] =
    useState(false);
  const [showModalInventoryHistory2, setShowModalInventoryHistory2] =
    useState<any>(false);

  const [filterByDateModal, setFilterByDateModal] = useState(false);
  const [econCiclSelected, setEconCiclSelected] = useState<any>();

  //Breadcrumbs paths-------------------------------------------------------------------------

  const paths: PathInterface[] = [
    {
      name: "Mis almacenes",
      action: () => navigate("/stocks"),
    },
    {
      name: "Análisis",
    },
  ];

  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle: string[] = ["Nombre del reporte"];

  const reportsType = [
    {
      id: 2,
      name: "Inventario general por productos/categorías",
    },
    {
      id: 3,
      name: "Estado de inventarios histórico",
    },
  ];

  if (verifyRoles(["ADMIN", "MANAGER_CONTABILITY", "OWNER"], true)) {
    reportsType.unshift({
      id: 1,
      name: "Resumen simplificado de inventarios",
    });
  }

  const tableData: DataTableInterface[] = [];
  reportsType.map(({ id, name }) => {
    tableData.push({
      rowId: id,
      payload: {
        "Nombre del reporte": name,
      },
    });
  });

  // Row table actions
  const rowAction = (id: number) => {
    if (id === 1) {
      setShowModal(true);
    }
    if (id === 2) {
      setShowModalInventory(true);
    }
    if (id === 3) {
      setShowModalInventoryHistory(true);
    }
  };
  //React Hook Form-----------------------------------------------------------------------
  const { register, handleSubmit, control, watch, setValue } = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    if (data.economicCycleId === undefined) {
      toast.warn("Debe seleccionar un ciclo económico");
      return;
    }
    setShowModalInventoryHistory2(data);
  };

  //-----------------------------------------------------------------------
  return (
    <>
      {breadcrumb && <Breadcrumb
        icon={<RectangleGroupIcon className="h-7 text-gray-500" />}
        paths={paths}
      />
      }
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        rowAction={rowAction}
      />

      {showModalInventoryHistory && (
        <Modal
          state={showModalInventoryHistory}
          close={() => setShowModalInventoryHistory(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-xl font-semibold mb-6">
              Estado de inventarios histórico
            </h2>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 items-center w-full">
                <span className="w-full">
                  <Button
                    color="gray-200"
                    textColor="slate-900"
                    type="button"
                    name="Seleccionar ciclo económico"
                    outline
                    full
                    action={() => {
                      setFilterByDateModal(true);
                    }}
                  />
                </span>
                {econCiclSelected?.openDate && econCiclSelected?.closedDate && (
                  <span className="w-full">
                    {formatDateForReportsWithYearAndHour(econCiclSelected?.openDate)}{" "}
                    {!!econCiclSelected?.openDate &&
                    !!econCiclSelected?.closedDate
                      ? "-"
                      : ""}{" "}
                    {formatDateForReportsWithYearAndHour(econCiclSelected?.closedDate)}
                  </span>
                )}
              </div>
              <div className="py-1 col-span-2">
                <Select
                  name="areaId"
                  data={stockAreas}
                  label="Area *"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                />
              </div>

              <div className="w-full flex justify-end gap-3 mt-4">
                <div>
                  <Button
                    color="slate-600"
                    textColor="slate-600"
                    type="submit"
                    name="Cancelar"
                    outline
                    action={() => {
                      setShowModalInventoryHistory(false);
                    }}
                  />
                </div>
                <div>
                  <Button
                    color="slate-600"
                    type="submit"
                    name="Generar"
                    /* loading={isFetching}
                    disabled={isFetching} */
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {filterByDateModal && (
        <Modal
          close={() => setFilterByDateModal(false)}
          state={filterByDateModal}
          size="m"
        >
          <CalendarEconomicCycle
            setShowDate={setFilterByDateModal}
            setValue={setValue}
            setEconCiclSelected={setEconCiclSelected}
          />
        </Modal>
      )}
      {showModal && (
        <Modal state={showModal} close={() => setShowModal(false)} size="l">
          <StockReports />
        </Modal>
      )}
      {showModalInventory && (
        <Modal
          state={showModalInventory}
          close={() => setShowModalInventory(false)}
          size="l"
        >
          <StockAviable />
        </Modal>
      )}
      {!!showModalInventoryHistory2 && (
        <Modal
          state={!!showModalInventoryHistory2}
          close={() => setShowModalInventoryHistory2(null)}
          size="l"
        >
          <InventoryStatusByCycleAndArea
            area={showModalInventoryHistory2?.areaId}
            ecoCycleId={showModalInventoryHistory2?.economicCycleId}
          />
        </Modal>
      )}
    </>
  );
};

export default ReportContainer;
