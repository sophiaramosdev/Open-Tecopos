import { PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import {  useState } from "react";
import useServerProduct from "../../api/useServerProducts";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import { ProductCategoriesInterface } from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import FormStockCategory from "./stockCategories/FormStockCategory";
import Breadcrumb, { PathInterface } from "../../components/navigation/Breadcrumb";

const ListStockCategories = () => {
  const {productCategories} = useAppSelector(state=>state.nomenclator)
  const { addStockCategory, updateStockCategory, deleteStockCategory, isFetching } = useServerProduct();
  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [editCategoryModal, setEditCategoryModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<ProductCategoriesInterface | null>(null);

  const crud = {
    add:addStockCategory,
    upd:updateStockCategory,
    del:deleteStockCategory,
    isFetching    
  }

  //Data to display in Table------------------------------------------------------------------
  //Action after click in RowTable

  //Data
  const titles: string[] = ["Nombre", "Descripción"];
  const dataDisplay: Array<DataTableInterface> = [];
  productCategories.map((item) =>
    dataDisplay.push({
      rowId: item.id,
      payload: {
        Nombre: item?.name,
        "Descripción": item.description,
      },
    })
  );

  const actions: BtnActions[] = [
    {
      title: "Nueva categoría",
      action: () => setNewCategoryModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  const rowAction = (id: number) => {
    setEditCategoryModal(true);
    setCurrentCategory(productCategories.find((item) => item.id === id)??null);
  };

  //--------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    { name: "Categorías de almacén" },
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
        <FormStockCategory crud={crud} closeModal={()=>setNewCategoryModal(false)} />
      </Modal>}

      {editCategoryModal && 
      <Modal close={setEditCategoryModal} state={editCategoryModal} size="m">
        <FormStockCategory categoryData={currentCategory} crud={crud}  closeModal={()=>setEditCategoryModal(false)} edit/>
      </Modal>}
    </div>
  );
};

export default ListStockCategories;
