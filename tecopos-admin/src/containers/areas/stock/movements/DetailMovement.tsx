import React, { useEffect, useState } from "react";
import useServerArea from "../../../../api/useServerArea";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import moment from "moment";
import { translateMeasure } from "../../../../utils/translate";
import MovementsTypeBadge from "../../../../components/misc/badges/MovementsTypeBadge";
import GenericList from "../../../../components/misc/GenericList";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/modals/GenericModal";
import MovementDeleteComponent from "./MovementDeleteComponent";
import { formatCurrency } from "../../../../utils/helpers";

interface MovementDetail {
  id: number | null;
}

const DetailMovement = ({ id }: MovementDetail) => {
  const { getMovement, deleteStockMovement, movement, isLoading, isFetching } =
    useServerArea();
  useEffect(() => {
    id && getMovement(id);
  }, []);

  const [deleteModal, setDeleteModal] = useState(false);

  //Data to Display in list --------------------------------------------------------
  const header = {
    title: movement?.product?.name ?? "",
    subtitle: (
      <div className="flex flex-col gap-1 font-semibold">
        {movement?.variation && (
          <p className="text-gray-500">{movement?.variation?.name}</p>
        )}
        <div>
          <MovementsTypeBadge operation={movement?.operation ?? null} />
        </div>
      </div>
    ),
    alert: movement?.removedOperation !== null,
  };
  const actionBtn = {
    action: () => setDeleteModal(true),
    icon: <TrashIcon className="h-5 text-white" />,
    btnColor: "red",
  };
  let displayData: Record<string, string | number | React.ReactNode> = {};
  displayData = {
    Fecha: moment(movement?.createdAt).format("DD/MM/YYYY hh:mm A"),
    Cantidad: `${movement?.quantity} ${translateMeasure(
      movement?.product?.measure
    )}`,
    "Realizado por": movement?.movedBy?.displayName,
    Área: movement?.area.name,
    Observaciones: movement?.description,
  };

  if (
    movement?.operation === "ENTRY" &&
    !movement?.parentId &&
    movement?.price
  ) {
    displayData["Precio unitario de compra"] = formatCurrency(
      movement?.price.amount / movement.quantity,
      movement?.price?.codeCurrency
    );
    displayData["Precio total de compra"] = formatCurrency(
      movement?.price.amount,
      movement?.price?.codeCurrency
    );
  }
  if (movement?.operation === "MOVEMENT") {
    displayData["Movido a"] = movement?.movedTo?.name;
  }
  if (movement?.removedOperation) {
    displayData["Detalles de elimininación"] = (
      <GenericList
        body={{
          Por: movement?.removedOperation.movedBy.displayName,
          Fecha: moment(movement?.removedOperation.createdAt).format("LLL"),
        }}
      />
    );
  }
  if (movement?.parent || movement?.childs.length !== 0) {
    const titles = ["Tipo", "Producto", "Área", "Cantidad", "Realizado por"];
    const tableData: DataTableInterface[] = [];
    movement?.parent &&
      tableData.push({
        payload: {
          Tipo: <MovementsTypeBadge operation={movement?.parent.operation} />,
          Producto: movement?.parent?.product?.name ?? "",
          Área: movement?.parent?.area.name,
          Cantidad: `${movement?.parent.quantity} ${translateMeasure(
            movement?.parent?.product?.measure
          )}`,
          "Realizado por": movement?.parent.movedBy.displayName,
        },
      });
    movement?.childs.length !== 0 &&
      movement?.childs.map((item) => {
        tableData.push({
          payload: {
            Tipo: <MovementsTypeBadge operation={item?.operation} />,
            Producto: item?.product?.name ?? "",
            Área: item?.area?.name ?? "No",
            Cantidad: `${item?.quantity ?? ""} ${translateMeasure(
              item?.product?.measure ?? ""
            )}`,
            "Realizado por": item?.movedBy?.displayName,
          },
        });
      });
    displayData["Operaciones Asociadas"] = (
      <GenericTable tableTitles={titles} tableData={tableData} />
    );
  }
  //-----------------------------------------------------------------------------------------

  if (isLoading)
    return (
      <div className="h-96">
        <SpinnerLoading />
      </div>
    );
  return (
    <>
      <GenericList
        header={header}
        body={displayData}
        actionBtn={
          movement?.removedOperation || movement?.operation === "SALE"
            ? undefined
            : actionBtn
        }
      />

      {deleteModal && (
        <Modal close={() => setDeleteModal(false)} state={deleteModal}>
          <MovementDeleteComponent
            deleteAction={(value: { description: string }) =>
              deleteStockMovement(id ?? 0, value, () => {
                getMovement(id ?? 0);
                setDeleteModal(false);
              })
            }
            name={movement?.product.name ?? ""}
            movType={movement?.operation}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailMovement;
