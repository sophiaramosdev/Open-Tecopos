import { PencilIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import Modal from "../../components/modals/GenericModal";
import Button from "../../components/misc/Button";
import PosOrderDetails from "../economicCycles/orders/PosOrderDetails";
import useServerSupplier from "../../api/useServerSupplier";
import MovementsTypeBadge from "../../components/misc/badges/MovementsTypeBadge";
import { translateMeasure } from "../../utils/translate";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinusCircle } from "@fortawesome/free-solid-svg-icons";
import EditSupplierWizzard from "./editSupplier/EditSupplierWizzard";

interface Props {
  supplierId?: number | string | any;
}
const DetailSupplier = ({ supplierId }: Props) => {
  //const { supplierId } = useParams();

  const {
    isLoading,
    isFetching,
    addSupplier,
    editSupplier,
    deleteSupplier,
    supplierOperation,
    getSupplier,
    supplier,
  } = useServerSupplier();

  const [detailOrderModal, setDetailOrderModal] = useState<{
    state: boolean;
    orderId?: number;
  }>({ state: false });

  const navigate = useNavigate();

  const [editClientModal, setEditClientModal] = useState(false);

  useEffect(() => {
    supplierId && getSupplier(supplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Data for generic Table-------------------------------------------------------------------
  const tableTitles = ["Nombre", "Operación", "Cantidad", "Fecha", "Usuario"];
  const displayData: Array<DataTableInterface> = [];

  supplierOperation?.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.product.name,
        Operación: <MovementsTypeBadge operation={item.operation} />,
        Cantidad: `${item.quantity} ${translateMeasure(item.product.measure)}`,
        Fecha: `${moment(item.createdAt).format("DD/MM/YYYY hh:mm A")}`,
        Usuario: `${
          item.movedBy !== null ? (
            item.movedBy.displayName
          ) : (
            <FontAwesomeIcon
              icon={faMinusCircle}
              className="text-gray-400 h-4"
            />
          )
        }`,
      },
    })
  );

  const crud = {
    add: addSupplier,
    update: editSupplier,
    del: deleteSupplier,
    isLoading,
    isFetching,
  };

  //---------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Proveedores",
      action: () => navigate("/suppliers"),
    },
  ];
  supplier && paths.push({ name: supplier.name });
  //------------------------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<TruckIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <div className="flex gap-2 items-center justify-end py-3 flex-shrink pb-3">
        <Button
          name="Editar"
          color="slate-500"
          action={() => setEditClientModal(true)}
          icon={<PencilIcon className="h-4" />}
        />
      </div>

      <GenericTable
        tableTitles={tableTitles}
        tableData={displayData}
        loading={isLoading}
      />
      {detailOrderModal.state && (
        <Modal
          state={detailOrderModal.state}
          close={() => setDetailOrderModal({ state: false })}
          size="m"
        >
          <PosOrderDetails
            id={detailOrderModal.orderId}
            updState={() => null}
          />
        </Modal>
      )}

      {editClientModal && (
        <Modal state={editClientModal} close={setEditClientModal} size="m">
          <EditSupplierWizzard currentSupplier={supplier!} crud={crud} />
        </Modal>
      )}
    </>
  );
};

export default DetailSupplier;
