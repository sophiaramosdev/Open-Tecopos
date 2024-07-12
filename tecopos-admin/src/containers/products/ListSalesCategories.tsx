import { PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import useServerProduct from "../../api/useServerProducts";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import { SalesCategories } from "../../interfaces/ServerInterfaces";
import FormSalesCategory from "./salesCategories/FormSalesCategory";
import { useAppSelector } from "../../store/hooks";
import Breadcrumb, { PathInterface } from "../../components/navigation/Breadcrumb";

const ListSalesCategories = () => {
  const {salesCategories} = useAppSelector(state=>state.nomenclator)
  const { addSalesCategory, updateSalesCategory, deleteSalesCategory, isFetching } = useServerProduct();
  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [editCategoryModal, setEditCategoryModal] = useState(false);
  const [currentCategory, setCurrentCategory] =
    useState<SalesCategories | null>(null);

  const crud = {
    add:addSalesCategory,
    upd:updateSalesCategory,
    del:deleteSalesCategory,
    isFetching    
  }

  //Data to display in Table------------------------------------------------------------------
  //Action after click in RowTable

  //Data
  const titles: string[] = ["Nombre", "Estado"];
  const dataDisplay: Array<DataTableInterface> = [];
  salesCategories.map((item) =>
    dataDisplay.push({
      rowId: item.id,
      payload: {
        Nombre: item?.name,
        Estado: (
          <StateSpanForTable
            currentState={item.isActive}
            greenState="Activa"
            redState="Inactiva"
          />
        ),
      },
    })
  );

  const actions: BtnActions[] = [
    {
      title: "Nueva categoría de venta",
      action: () => setNewCategoryModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  const rowAction = (id: number) => {
    setEditCategoryModal(true);
    setCurrentCategory(salesCategories.find((item) => item.id === id)??null);
  };

  //--------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    { name: "Categorías de venta" },
  ];
  //------------------------------------------------------------------------------------

  return (
    <div>
      <Breadcrumb
        icon={<ShoppingBagIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableData={dataDisplay}
        tableTitles={titles}
        actions={actions}
        rowAction={rowAction}
      />

      {newCategoryModal && 
      <Modal close={setNewCategoryModal} state={newCategoryModal} size="m">
        <FormSalesCategory crud={crud} closeModal={()=>setNewCategoryModal(false)} />
      </Modal>}

      {editCategoryModal && 
      <Modal close={setEditCategoryModal} state={editCategoryModal} size="m">
        <FormSalesCategory categoryData={currentCategory} crud={crud}  closeModal={()=>setEditCategoryModal(false)} edit/>
      </Modal>}
    </div>
  );
};

export default ListSalesCategories;
