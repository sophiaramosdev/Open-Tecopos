import { useEffect, useState } from "react";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";
import Breadcrumb,{PathInterface} from "../../components/navigation/Breadcrumb";
import BusinessForm from "./BusinessForm";
import Paginate from "../../components/misc/Paginate";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { useNavigate } from "react-router-dom";
import useServerBusiness from "../../api/useServerBusiness";
import Modal from "../../components/misc/GenericModal";
import { TableActions } from "../../components/misc/MultipleActBtn";
import StateSpanForTable from "../../components/misc/StateSpanForTable";

const ListBusiness = () => {
  const redirect = useNavigate();
  const {
    getAllBusiness,
    addBusiness,
    checkField,
    isLoading,
    isFetching,
    allBusiness,
    paginate,
  } = useServerBusiness();

  const [modalState, setModalState] = useState(false);
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });

  const switchModalState = (state: boolean) => {
    setModalState(state);
  };

  useEffect(() => {
    getAllBusiness(filter);
  }, [filter]);

  //Data to display in table ------------------------------------------------------
  const tableTitles = ["Negocio", "Plan", "Estado"];
  const tableData: DataTableInterface[] = [];
  allBusiness.map((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        Negocio: item.name,
        Plan: <p className="font-semibold">{item.subscriptionPlan.name}</p>,
        Estado: (
          <StateSpanForTable
            currentState={item.status === "ACTIVE"}
            greenState="Activo"
            redState="Inactivo"
          />
        ),
      },
    });
  });

  const paths:PathInterface[] = [
		{
			name: 'Negocios',
		},
	];
  
  const searching = {
    placeholder: "Buscar negocio",
    action: (search: string) => setFilter({ ...filter, search }),
  };

  const actions: TableActions[] = [
    {
      icon: <PlusIcon className="h-5 text-gray-600" />,
      action: () => setModalState(true),
      title: "Nuevo negocio",
    },
  ];

  const rowAction = (id: number) => redirect(id.toString());

  //--------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb icon={<CreditCardIcon className="h-6" />} paths={paths} />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitles}
        searching={searching}
        loading={isLoading}
        actions={actions}
        rowAction={rowAction}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />
      {modalState && (
        <Modal state={modalState} close={setModalState} size="m">
          <BusinessForm
            closeModal={switchModalState}
            action={addBusiness}
            isFetching={isFetching}
            checkField={checkField}
          />
        </Modal>
      )}
    </>
  );
};

export default ListBusiness;
