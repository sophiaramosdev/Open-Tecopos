import { useState, useContext } from "react";
import { useAppSelector } from "../../../store/hooks";
import { formatMaskAccount } from "../../../utils/helpers";
import {
  PencilSquareIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { DetailAccountContext } from "./MainBankAccount";
import Button from "../../../components/misc/Button";
import GenericList from "../../../components/misc/GenericList";
import Modal from "../../../components/misc/GenericModal";
import EditBankAccountModal from "./EditBankAccountModal";
import { AccounTransferModal } from "./AccounTransferModal";

export const DetailBankAccount = () => {
  // Hooks
  const {
    name,
    address,
    code,
    owner,
    isPrivate,
    isBlocked,
    allowMultiCurrency,
    definedCurrency,
    description,
  } = useContext(DetailAccountContext).bankAccount!;
  const { user, business } = useAppSelector((state) => state.init);

  const [editModal, setEditModal] = useState(false);
  const [accountTransferModal, setAccountTransferModal] = useState(false);

  const detailBody = {
    Nombre: name ?? "---",
    Número: address ?? "---",
    Código: code,
    Propietario: owner?.displayName,
    Privada: isPrivate ? "Si" : "No",
    Bloqueada: isBlocked ? "Si" : "No",
    "Monedas permitidas":
      allowMultiCurrency === false
        ? definedCurrency
        : business?.availableCurrencies
            .map((currency) => currency.code)
            .join(", "),
    Descripción: description,
  };

  return (
    <>
      <div className="m-auto md:w-3/4 ">
        <GenericList body={detailBody} />
        {(user?.username === owner?.username || user?.isSuperAdmin) && (
          <div className=" flex gap-7 justify-end">
            <div className="flex justify-end pt-6 pb-0">
              <Button
                name="Transferir cuenta"
                color="red-600"
                action={() => setAccountTransferModal(true)}
                icon={<ArrowsRightLeftIcon className="h-5" />}
              />
            </div>
            <div className="flex justify-end pt-6 pb-0">
              <Button
                name="Editar"
                color="slate-600"
                action={() => setEditModal(true)}
                icon={<PencilSquareIcon className="h-5" />}
              />
            </div>
          </div>
        )}
        {}
      </div>

      {editModal && (
        <Modal state={editModal} close={() => setEditModal(false)} size="m">
          <EditBankAccountModal />
        </Modal>
      )}
      {accountTransferModal && (
        <Modal
          state={accountTransferModal}
          close={() => setAccountTransferModal(false)}
          size="m"
        >
          <AccounTransferModal
            closeModal={() => setAccountTransferModal(false)}
          />
        </Modal>
      )}
    </>
  );
};
