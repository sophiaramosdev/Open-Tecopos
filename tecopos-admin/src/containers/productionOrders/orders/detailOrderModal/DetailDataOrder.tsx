import {
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";
import { useState } from "react";
import {
  NewOrderInterface,
  ProductionOrderState,
} from "../../../../interfaces/ServerInterfaces";
import { translateMeasure } from "../../../../utils/translate";
import AlertContainer from "../../../../components/misc/AlertContainer";
import OrderStatusBadge from "../../../../components/misc/badges/OrderStatusBadge";
import GenericList from "../../../../components/misc/GenericList";
import GenericTable, { DataTableInterface } from "../../../../components/misc/GenericTable";
import Modal from "../../../../components/modals/GenericModal";
import DuplicateOrderForm from "./DuplicateOrderForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarMinus } from "@fortawesome/free-solid-svg-icons";
import NewProdOrderWizard from "../newOrderModal/NewProdOrderWizard";

interface Order {
  order: ProductionOrderState | null;
  crud: {
    get: Function;
    upd: Function;
    del: Function;
    dup: Function;
    loading: boolean;
  };
}

const DetailDataOrder = ({ order, crud }: Order) => {
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [closeOppModal, setCloseOppModal] = useState(false);

  //Data for List ------------------------------------------------------------
  const actionBtn = [
    {
      icon: <DocumentDuplicateIcon className="h-5 text-blue-800" />,
      btnColor: "blue-400",
      action: () => setDuplicateModal(true),
    },
  ];

  if (["ACTIVE", "CREATED"].includes(order?.productionOrder.status ?? ""))
    actionBtn.push({
      icon: <PencilIcon className="h-5 text-orange-800" />,
      btnColor: "orange-400",
      action: () => setEditModal(true),
    });

  if (order?.productionOrder.status === "CREATED")
    actionBtn.push({
      icon: <TrashIcon className="h-5 text-red-500" />,
      btnColor: "red-500",
      action: () => setDeleteModal(true),
    });

  if (order?.productionOrder.status === "ACTIVE")
    actionBtn.push({
      icon: (
        <FontAwesomeIcon icon={faCalendarMinus} className="h-5 text-red-800" />
      ),
      btnColor: "red-400",
      action: () => setCloseOppModal(true),
    });

  
  //End Products
  const listTitlesEndProd = ["Nombre", "Producido", "Total a producir"];
  const dataEnd: DataTableInterface[] = [];
  order?.endProducts.map((item) =>
    dataEnd.push({
      payload: {
        Nombre: item.name,
        Producido: `${item.realProduced ?? 0} ${translateMeasure(
          item.measure
        )}`,
        "Total a producir": `${item.goalQuantity ?? 0} ${translateMeasure(
          item.measure
        )}`,
      },
    })
  );

  //List Body
  const listBody = {
    "Fecha de Apertura": moment(order?.productionOrder.openDate).format("DD/MM/YYYY hh:mm A"),
    Observaciones: order?.productionOrder.observations,
    "Productos Finales": (
      <GenericTable tableTitles={listTitlesEndProd} tableData={dataEnd} />
    ),
  };

  //-------------------------------------------------------------------------------------

  return (
    <>
      <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-slate-100">
        <GenericList
          header={{
            title: order?.productionOrder?.name??"Orden de Producción",
            subtitle: (
              <OrderStatusBadge status={order?.productionOrder.status ?? ""} />
            ),
          }}
          body={listBody}
          actionBtn={actionBtn}
        />
      </div>

      {editModal && (
        <Modal state={editModal} close={() => setEditModal(false)} size="m">
          <NewProdOrderWizard
            loading={crud.loading}
            updateData={order}
            update={(data: NewOrderInterface) =>
              crud.upd(order?.productionOrder.id ?? 0, data, () =>
                setEditModal(false)
              )
            }
          />
        </Modal>
      )}

      {duplicateModal && (
        <Modal
          state={duplicateModal}
          close={() => setDuplicateModal(false)}
          size="m"
        >
          <DuplicateOrderForm
            action={(data: NewOrderInterface) =>
              crud.dup(data, () => setDuplicateModal(false))
            }
            loading={crud.loading}
          />
        </Modal>
      )}

      {deleteModal && (
        <Modal state={deleteModal} close={() => setDeleteModal(false)}>
          <AlertContainer
            onAction={() => crud.del(order?.productionOrder.id ?? 0)}
            onCancel={() => setDeleteModal(false)}
            title={"Eliminar orden"}
            text={"Seguro que desea Eliminar esta orden"}
            loading={crud.loading}
          />
        </Modal>
      )}

      {closeOppModal && (
        <Modal state={closeOppModal} close={() => setCloseOppModal(false)}>
          <AlertContainer
            onAction={() =>
              crud.upd(
                order?.productionOrder.id ?? 0,
                { status: "CLOSED" },
                () => setCloseOppModal(false)
              )
            }
            onCancel={() => setDeleteModal(false)}
            title={"Cerrar orden"}
            text={"Confirma que desea CERRAR esta orden"}
            loading={crud.loading}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailDataOrder;
