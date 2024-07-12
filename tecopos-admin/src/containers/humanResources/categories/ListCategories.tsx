import { useState, useEffect } from "react";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import useServerUsers from "../../../api/useServerUsers";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/misc/GenericModal";
import CatForm from "./CatForm";
import { PersonCategory } from "../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../store/hooks";

const ListCategories = () => {
  const {personCategories} = useAppSelector(state=>state.nomenclator)
  const [newCat, setNewCat] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<PersonCategory | null>(
    null
  );

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Capital humano",
    },
    {
      name: "Categorías de Personas",
    },
  ];
  //------------------------------------------------------------------------------------------

  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Nombre", "Código"];
  const tableData: DataTableInterface[] = [];
  personCategories.forEach((cat) =>
    tableData.push({
      rowId: cat.id,
      payload: {
        Nombre: cat.name,
        Código: cat.code,
      },
    })
  );


  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nueva categoría",
      action: () => setNewCat(true),
    },
  ];

  const rowAction = (id: number) => {
    const current = personCategories.find((cat) => cat.id === id);
    setCurrentCategory(current!);
  };

  //----------------------------------------------------------------------------------------------------
  return (
    <div>
      <Breadcrumb
        icon={<UserGroupIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        actions={actions}
        rowAction={rowAction}
      />

      {newCat && (
        <Modal state={newCat} close={setNewCat} size="m">
          <CatForm
            closeModal={() => setNewCat(false)}
          />
        </Modal>
      )}
      {!!currentCategory && (
        <Modal state={!!currentCategory} close={()=>setCurrentCategory(null)} size="m">
          <CatForm
            category={currentCategory}
            closeModal={() => setCurrentCategory(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ListCategories;
