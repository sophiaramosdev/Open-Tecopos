import { useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import useServerBilling from "../../../../api/useServerBilling";
import GenericList, { ListHeader } from "../../../../components/misc/GenericList";
import { formatCalendar, formatCurrency } from "../../../../utils/helpers";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";

interface BillingInfoProps {
  id: number;
  deleteInvoice: {
    fetching: boolean;
    deleteAction: Function;
  };
}

export default function BillingInfo({ id, deleteInvoice }: BillingInfoProps) {
  const { fetching, deleteAction } = deleteInvoice;
  const { getBilling, billing, isLoading } = useServerBilling();

  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    getBilling(id);
  }, []);

  //List Component data------------------
  const header: ListHeader = {
    title: (
      <h5 className="font-semibold text-lg">
        Factura{" "}
        <span className="p-1 border border-gray-200 bg-gray-200 rounded-md">
          {billing?.invoiceNumber}
        </span>
      </h5>
    ),
    subtitle: "Detalles del pago",
  };

  const body = {
    Plan: billing?.subscriptionPlan.name,
    "Fecha de registro": formatCalendar(billing?.createdAt),
    "Registrado por": billing?.registeredBy.displayName,
    "Total cobrado": `${
      billing?.price
        ? formatCurrency(billing?.price?.amount, billing?.price.codeCurrency)
        : "-"
    }`,
    Descuento: billing?.discount ?? 0 + " %",
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <SpinnerLoading />
      </div>
    );
  }

  return (
    <div className="relative pt-3">
      <div className="absolute -top-8">
        <Button
          color="gray-500"
          textColor="gray-500"
          action={() => setDeleteModal(true)}
          outline
          icon={<TrashIcon className="h-5" />}
        />
      </div>
      <GenericList header={header} body={body} />

      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            onAction={()=>deleteAction(billing?.id)}
            onCancel={setDeleteModal}
            title={`Eliminar factura ${billing?.invoiceNumber}`}
            text="Seguro que desea continuar?"
            loading={fetching}
          />
        </Modal>
      )}
    </div>
  );
}
