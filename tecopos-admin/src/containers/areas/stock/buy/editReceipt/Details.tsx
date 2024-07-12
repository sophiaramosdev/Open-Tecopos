import React, { useContext, useState } from "react";
import { FaPaperclip } from "react-icons/fa6";
import { StatusBadge } from "../../../../../components/misc/badges/StatusBadge";
import { formatCurrency } from "../../../../../utils/helpers";
import ReceiptContext from "../ReceiptContext";
import { useAppSelector } from "../../../../../store/hooks";
import MultipleActBtn, {
  BtnActions,
} from "../../../../../components/misc/MultipleActBtn";
import { CiEdit, CiMoneyCheck1, CiSaveDown2 } from "react-icons/ci";
import { TiCancelOutline } from "react-icons/ti";
import Modal from "../../../../../components/misc/GenericModal";
import DispatchModal from "./DispatchModal";
import AccountModal from "./AccountModal";
import EditModal from "./EditModal";
import { FaRegEye } from "react-icons/fa6";
import DetailDispatch from "../../dispatch/DetailDispatch";

const Details = () => {
  const { receipt, cancelReceipt, isFetching, updateOuterList } = useContext(ReceiptContext);
  const { business } = useAppSelector((state) => state.init);

  const [dispatchModal, setDispatchModal] = useState(false);
  const [dispatchModalDetail, setDispatchModalDetail] = useState<number | null>(
    null
  );
  const [accountModal, setAccountModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const actionItems: BtnActions[] = [
    {
      icon: <CiEdit className="text-xl" />,
      title: "Editar",
      action: () => setEditModal(true),
    },
  ];
  if (!receipt?.dispatch)
    actionItems.push({
      icon: <CiSaveDown2 className="text-xl" />,
      title: "Despachar",
      action: () => setDispatchModal(true),
    });

  if (!receipt?.account)
    actionItems.push({
      icon: <CiMoneyCheck1 className="text-xl" />,
      title: "Extraer fondos de",
      action: () => setAccountModal(true),
    });

  if (receipt?.status === "CREATED")
    actionItems.push({
      icon: <TiCancelOutline className="text-xl" />,
      title: "Cancelar",
      action: () => cancelReceipt!(receipt.id!, ()=>updateOuterList!(receipt.id!, {status:"CANCELLED"})),
      loading:isFetching
    });

  return (
    <div className="relative overflow-auto scrollbar-none sm:rounded-lg">
      <div className="absolute top-2 right-5">
        <MultipleActBtn items={actionItems} />
      </div>
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-base font-semibold leading-7 text-gray-900">
          Detalles de informe de recepción de mercancia
        </h3>
        {/*<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Personal details and application.</p>*/}
      </div>
      <div className="border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">Estado</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              <StatusBadge status={receipt?.status} />
            </dd>
          </div>
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">Costo total</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {formatCurrency(receipt?.totalCost ?? 0, business?.costCurrency)}
            </dd>
          </div>
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">Recibido por</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {receipt?.createdBy.displayName}
            </dd>
          </div>
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">
              Área de destino
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0 inline-flex items-center gap-5">
              {receipt?.dispatch?.stockAreaTo?.name ?? "-"}
              {receipt?.dispatch && (
                <FaRegEye
                  className="text-lg hover:cursor-pointer"
                  onClick={() => setDispatchModalDetail(receipt.dispatch.id)}
                />
              )}
            </dd>
          </div>
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">
              Fondos extraídos de
            </dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {receipt?.account?.name ?? "-"}
            </dd>
          </div>
          <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900">Observaciones</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {receipt?.observations ?? "-"}
            </dd>
          </div>
        </dl>
      </div>
      {dispatchModal && (
        <Modal state={!!dispatchModal} close={setDispatchModal}>
          <DispatchModal close={() => setDispatchModal(false)} />
        </Modal>
      )}
      {accountModal && (
        <Modal state={!!accountModal} close={setAccountModal}>
          <AccountModal close={() => setAccountModal(false)} />
        </Modal>
      )}
      {editModal && (
        <Modal state={!!editModal} close={setEditModal}>
          <EditModal close={() => setEditModal(false)} />
        </Modal>
      )}
      {!!dispatchModalDetail && (
        <Modal
          state={!!dispatchModalDetail}
          close={() => setDispatchModalDetail(null)}
          size="m"
        >
          <DetailDispatch id={dispatchModalDetail} />
        </Modal>
      )}
    </div>
  );
};

export default Details;
