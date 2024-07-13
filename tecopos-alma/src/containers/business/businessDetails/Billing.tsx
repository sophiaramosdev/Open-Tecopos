import { useEffect, useState } from "react";
//import { BusinessContext } from "../../../contexts/BusinessContext";
import Paginate from "../../../components/misc/Paginate";
import "moment/locale/es";
import BillingInfo from "./billing/BillingInfo";
import useServerBilling from "../../../api/useServerBilling";
import { useParams } from "react-router-dom";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { formatCalendar, formatCurrency } from "../../../utils/helpers";
import { BasicType } from "../../../interfaces/LocalInterfaces";
import Modal from "../../../components/misc/GenericModal";
import { ActionBtnInterface } from "../../../components/misc/GenericList";
import { PlusIcon } from "@heroicons/react/24/outline";
import BillingForm from "./billing/BillingForm";
import {
  BusinessInterface,
  InvoiceInterface,
} from "../../../interfaces/ServerInterfaces";

function classNames(...classes: Array<string>) {
  return classes.filter(Boolean).join(" ");
}

interface Bill {
  business: BusinessInterface;
}

const Billing = ({ business }: Bill) => {
  const { businessId } = useParams();
  const {
    getAllBilling,
    deleteInvoice,
    addInvoice,
    allBilling,
    paginate,
    isLoading,
    isFetching,
  } = useServerBilling();

  const [filter, setFilter] = useState<BasicType>({ page: 1 });

  useEffect(() => {
    getAllBilling(businessId!, filter);
  }, [filter]);

  //State of Billing Info Modal
  const [billingInfoModal, setBillingInfoModal] = useState<{
    state: boolean;
    id?: number;
  }>({ state: false });

  //State of newBillingModal
  const [addBillingForm, setAddBillingForm] = useState(false);

  //Data for table -------------------------
  const tableTitles = ["No. Factura", "Fecha", "Monto", "Plan"];
  const tableData: DataTableInterface[] = [];
  allBilling.forEach((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        "No. Factura": item?.invoiceNumber,
        Fecha: formatCalendar(item.createdAt),
        Monto: formatCurrency(item.price.amount, item.price.codeCurrency),
        Plan: item.subscriptionPlan.name,
      },
    });
  });

  //Searching param
  const search = {
    placeholder: "Buscar factura",
    action: (search: string) => setFilter({ search }),
  };

  //Action after click Row
  const rowAction = (id: number) => setBillingInfoModal({ state: true, id });

  //Table Actions
  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nuevo pago",
      action: () => setAddBillingForm(true),
    },
  ];

  //----------------------------------------------------------------------

  //Delete Invoice Function--------------------------
  const deleteAction = (id: number) => {
    deleteInvoice(id, () => setBillingInfoModal({ state: false }));
  };
  //---------------------------------------------

  //Add InvoiceAction
  const addInvoiceAction = (data: Partial<InvoiceInterface>) => {
    addInvoice(businessId!, data, () => setAddBillingForm(false));
  };

  return (
    <>
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        loading={isLoading}
        searching={search}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={
          <Paginate
            data={paginate}
            action={(page: number) => setFilter({ ...filter, page })}
          />
        }
      />

      {billingInfoModal.state && (
        <Modal
          state={billingInfoModal.state}
          close={() => setBillingInfoModal({ state: false })}
          size="m"
        >
          <BillingInfo
            id={billingInfoModal.id!}
            deleteInvoice={{
              fetching: isFetching,
              deleteAction,
            }}
          />
        </Modal>
      )}

      {addBillingForm && (
        <Modal state={addBillingForm} close={setAddBillingForm} size="m">
          <BillingForm
            action={addInvoiceAction}
            isFetching={isFetching}
            plan={business.subscriptionPlan.name}
            price={business.subscriptionPlan.price}
          />
        </Modal>
      )}
    </>
  );
};

export default Billing;
