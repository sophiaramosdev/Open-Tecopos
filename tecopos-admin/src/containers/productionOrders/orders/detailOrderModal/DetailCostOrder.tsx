import { SubmitHandler, useForm } from "react-hook-form";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import {
  FixedCost,
  OrderInterface,
  ProductionOrderState,
} from "../../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../../store/hooks";
import { formatCurrency } from "../../../../utils/helpers";
import { translateMeasure } from "../../../../utils/translate";
import useServerOrderProd from "../../../../api/useServerOrderProd";
import { useState } from "react";
import Button from "../../../../components/misc/Button";
import { Plus, TrashOutline } from "heroicons-react";
import Input from "../../../../components/forms/Input";
import AlertContainer from "../../../../components/misc/AlertContainer";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import Modal from "../../../../components/misc/GenericModal";

//MAIN COMPONENT ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface DetailCostInterface {
  order: ProductionOrderState | null;
  updateFixedCostState: Function;
}

const DetailCostOrder = ({
  order,
  updateFixedCostState,
}: DetailCostInterface) => {
  const { business } = useAppSelector((state) => state.init);
  const [fixCostModal, setFixCostModal] = useState<{
    state: boolean;
    current?: number;
  }>({ state: false });

  let globalCost = 0;

  //Table Raw Products -----------------------------------------------------------
  let rawCost = 0
  const tableData: DataTableInterface[] = [];
  const tableTitle = ["Nombre", "Cantidad", "Costo total"];
  order?.rawMateriales.forEach((item) =>{
    rawCost += item.averageCost*item.quantity
    tableData.push({
      payload: {
        Nombre: item.name,
        Cantidad: `${item.quantity} ${translateMeasure(item.measure)}`,
        "Costo total": formatCurrency(
          item.averageCost * item.quantity,
          business?.costCurrency
        ),
      },
    })}
  );
  if (!!order?.rawMateriales && order?.rawMateriales.length !== 0) {
    tableData.push({
      borderTop: true,
      borderBottom: true,
      payload: {
        Nombre: "Subtotal",
        Cantidad: "",
        "Costo total": (
          <div className="font-semibold">
            {formatCurrency(rawCost, business?.costCurrency)}
          </div>
        ),
      },
    });
  }

  //--------------------------------------------------------------------

  //Data for table fixed Cost ----------------------------------------------------
  let fixedCost = 0;
  const costTitles = ["Descripción", "Monto"];
  const costData: DataTableInterface[] = [];

  order?.fixedCosts?.forEach((item) => {
    costData.push({
      rowId: item.id,
      payload: {
        Descripción: item.description,
        Monto: `$${formatCurrency(item.costAmount, business?.costCurrency)}`,
      },
    });
    fixedCost += item.costAmount;
  });

  if(costData.length !== 0){
    costData.push({
        borderTop:true, 
        borderBottom:true,
        payload: {
          Descripción: <p className="text-sm font-semibold">Subtotal</p>,
          Monto: (
            <p className="text-sm font-semibold">
              {"$" + formatCurrency(fixedCost, business?.costCurrency ?? "CUP")}
            </p>
          ),
          "": "",
        },
      });

  }
    

  const rowActionCost = (id?: number) =>
    setFixCostModal({ state: true, current: id });

  const costActions: BtnActions[] = [
    {
      title: "Insertar gasto",
      icon: <Plus className="h-5" />,
      action: () => setFixCostModal({ state: true }),
    },
  ];
  //----------------------------------------------------------------------------------

  return (
    <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-slate-100 p-1 pr-3">
        <div className="inline-flex pb-3">
          <span className="text-gray-600 font-semibold uppercase">{`Costo total: $${formatCurrency(
            rawCost+fixedCost,
            business?.costCurrency
          )}`}</span>
        </div>
      <h5 className="text-gray-700 py-3 text-sm font-semibold">
        Costos de materia prima
      </h5>
      <GenericTable tableTitles={tableTitle} tableData={tableData} />
      <h5 className="text-gray-700 py-3 text-sm font-semibold">Costos fijos</h5>
      <GenericTable
        tableData={costData}
        tableTitles={costTitles}
        actions={costActions}
        rowAction={rowActionCost}
      />
      {fixCostModal.state && (
        <Modal
          state={fixCostModal.state}
          close={() => setFixCostModal({ state: false })}
        >
          <FixedCosts
            orderId={order?.productionOrder.id!}
            fixedCost={order?.fixedCosts.find(
              (item) => item.id === fixCostModal.current
            )}
            updateFixedCostState={updateFixedCostState}
            close={() => setFixCostModal({ state: false })}
          />
        </Modal>
      )}
    </div>
  );
};

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//FIXED COSTS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Costos Fijos --------------------------------------------------------------

//Componente de Costo Fijo -----------------------------------------------------------------------------------
interface FixCost {
  orderId: number;
  fixedCost?: FixedCost;
  updateFixedCostState: Function;
  close: Function;
}

const FixedCosts = ({
  orderId,
  fixedCost,
  updateFixedCostState,
  close,
}: FixCost) => {
  const { control, handleSubmit, reset } = useForm();
  const { addFixedCost, editFixedCost, deleteFixedCost, isFetching } =
    useServerOrderProd();
  const [view, setView] = useState("form");

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    if (fixedCost) {
      const callback = (cost: FixedCost, id: number) => {
        reset();
        close();
        updateFixedCostState && updateFixedCostState(cost, id);
      };
      editFixedCost(fixedCost.id, data, callback);
    } else {
      const callback = (cost: FixedCost) => {
        reset();
        close();
        updateFixedCostState && updateFixedCostState(cost);
      };
      addFixedCost(orderId, data, callback);
    }
  };

  //----------------------------------------------------------------------------------

  //Delete cost ---------------------------------------------------------------
  const deleteCost = (id?: number) => {
    const callback = (id: number) => {
      reset();
      updateFixedCostState && updateFixedCostState(undefined, id);
      close();
    };
    deleteFixedCost(id ?? 0, callback);
  };
  //--------------------

  return (
    <>
      {view === "form" && (
        <div className="relative pt-5">
          <div className="inline-flex gap-3 items-center">
            {fixedCost ? (
              <h5 className="text-gray-500">{fixedCost.description}</h5>
            ) : (
              <h5 className="text-gray-500 pb-3">Nuevo gasto fijo</h5>
            )}
            {fixedCost && (
              <div className="absolute -top-6">
                <Button
                  color="gray-400"
                  icon={<TrashOutline className="h-5 text-gray-500" />}
                  action={() => setView("delete")}
                  outline
                />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="description"
                control={control}
                placeholder="Descripción"
                defaultValue={fixedCost?.description}
              />
              <Input
                name="costAmount"
                control={control}
                type="number"
                placeholder="Monto"
                defaultValue={fixedCost?.costAmount}
                numberAsCurrency={{ precision: 2 }}
              />
            </div>

            <div className="inline-flex justify-end gap-2 pt-5 w-full">
              <Button
                name={`${fixedCost ? "Actualizar" : "Crear"}`}
                color="slate-600"
                type="submit"
                loading={isFetching}
              />
            </div>
          </form>
        </div>
      )}
      {view === "delete" && (
        <AlertContainer
          onAction={() => deleteCost(fixedCost?.id ?? 0)}
          onCancel={() => close()}
          text={`Seguro que desea continuar?`}
          title={`Eliminar ${fixedCost?.description}`}
          loading={isFetching}
        />
      )}
    </>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default DetailCostOrder;
