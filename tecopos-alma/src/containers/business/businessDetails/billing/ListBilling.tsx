import moment from "moment";
import { useState, useEffect } from "react";
import useServer from "../../../../api/useServer";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import BillingForm from "./BillingForm";
import useServerBilling from "../../../../api/useServerBilling";
import Modal from "../../../../components/misc/GenericModal";
import Paginate from "../../../../components/misc/Paginate";
import { BasicType } from "../../../../interfaces/LocalInterfaces";
import { BanknotesIcon } from "@heroicons/react/20/solid";
import Breadcrumb, { PathInterface } from "../../../../components/navigation/Breadcrumb";

const ListBilling = () => {
  const {
    getNextBillingBusiness,
    nextBillingBusiness,
    addInvoice,
    paginate,
    isLoading,
  } = useServerBilling();
  const [openBillingModal, setOpenBillingModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });
  const [filter, setFilter] = useState<BasicType>({page:1});

  useEffect(() => {
    getNextBillingBusiness(filter);
  }, [filter]);

  const paths:PathInterface[] = [
		{
			name: 'Facturación',
		},
	];

  //Data to display in table---------------------------------------------------------------------
  const tableTitles = ["Nombre", "Estado", "Tipo", "Licencia válida hasta"];
  const displayData: DataTableInterface[] = [];
  nextBillingBusiness.map((item) => {
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.name,
        Estado: item.status,
        Tipo: item.type,
        "Licencia válida hasta": moment(item.licenceUntil).format(
          "DD [de] MMMM"
        ),
      },
    });
  });

  const rowAction = (id: number) => setOpenBillingModal({ state: true, id });
  //---------------------------------------------------------------------------------------------

  //Billing Modal -------------------------------------------------------------------------------
  const formBillingAction = (
    data: Record<string, string | number | boolean>
  ) => {
    const callback = () => {
      getNextBillingBusiness(filter);
      setOpenBillingModal({ state: false, id: null });
    };
    addInvoice((openBillingModal?.id ?? 0).toString(), data, callback);
  };
  //---------------------------------------------------------------------------------------------

  return (
    <div>
     <Breadcrumb icon={<BanknotesIcon className="h-6" />} paths={paths} />
      <GenericTable
        tableTitles={tableTitles}
        tableData={displayData}
        loading={isLoading}
        rowAction={rowAction}
        paginateComponent={
          <Paginate
            data={paginate}
            action={(page: number) => setFilter({ ...filter, page })}
          />
        }
      />
      {openBillingModal.state && (
        <Modal
          state={openBillingModal.state}
          close={() =>
            setOpenBillingModal({ state: false, id: openBillingModal.id })
          }
        >
          <BillingForm
            action={formBillingAction}
            isFetching={isLoading}
            plan={
              nextBillingBusiness.find(
                (item) => item.id === openBillingModal.id
              )?.subscriptionPlan.name
            }
            price={
              nextBillingBusiness.find(
                (item) => item.id === openBillingModal.id
              )?.subscriptionPlan.price ??
              nextBillingBusiness.find(
                (item) => item.id === openBillingModal.id
              )?.subscriptionPlanPrice
            }
          />
        </Modal>
      )}
    </div>
  );
};

export default ListBilling;
