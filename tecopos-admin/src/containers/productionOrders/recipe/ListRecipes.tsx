import React, { useState, useEffect } from "react";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import useServerOrderProd from "../../../api/useServerOrderProd";
import moment from "moment";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Modal from "../../../components/modals/GenericModal";
import ProgressBar from "../../../components/misc/ProgressBar";
import Paginate from "../../../components/misc/Paginate";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { formatCurrency } from "../../../utils/helpers";
import { useAppSelector } from "../../../store/hooks";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import WizzardContainer from "./detailWizzard/WizzardContainer";

//MAIN COMPONENT ++++++++++++++++++++++++++++++++++++++++++++++++++++++
const ListRecipes = () => {
  const {
    allRecipes,
    getAllRecipes,
    addRecipe,
    editRecipe,
    addRecipeProducts,
    deleteRecipe,
    isLoading,
    isFetching,
    paginate,
  } = useServerOrderProd();
  const { business } = useAppSelector((state) => state.init);

  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });
  const [newRecipeModal, setNewRecipeModal] = useState(false);
  const [detailRecipeModal, setDetailRecipeModal] = useState<{
    state: boolean;
    id: number | null;
  }>({ state: false, id: null });

  useEffect(() => {
    getAllRecipes(filter);
  }, [filter]);

  //Data for Data Table------------------------------------------------------
  const titles = ["Nombre", "Costo total", "Costo unitario"];
  const displayData: DataTableInterface[] = [];
  allRecipes.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.name,
        "Costo total": formatCurrency(item.totalCost, business?.costCurrency),
        "Costo unitario": formatCurrency(item.unityToBeProducedCost ?? 0, business?.costCurrency),
      },
    })
  );

  const tableActions: BtnActions[] = [
    {
      icon: <PlusIcon className="h-7" />,
      title: "Nueva receta",
      action: () => setNewRecipeModal(true),
    },
  ];

  const rowAction = (id: number) => {
    setDetailRecipeModal({ state: true, id });
  };
  //-------------------------------------------------------------------

  //Breadcrumb-------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Producción",
    },
    {
      name: "Recetario",
    },
  ];
  //----------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<ClipboardDocumentListIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        loading={isLoading}
        rowAction={rowAction}
        actions={tableActions}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {newRecipeModal && (
        <Modal state={newRecipeModal} close={() => setNewRecipeModal(false)}>
          <NewRecipe
            addRecipe={addRecipe}
            isFetching={isFetching}
            closeModal={() => setNewRecipeModal(false)}
          />
        </Modal>
      )}

      {detailRecipeModal.state && (
        <Modal
          close={() => setDetailRecipeModal({ state: false, id: null })}
          state={detailRecipeModal.state}
          size="l"
        >
          <WizzardContainer
            id={detailRecipeModal.id!}
            editRecipe={editRecipe}
            addRecipeProducts={addRecipeProducts}
            deleteRecipe={deleteRecipe}
            isFetching={isFetching}
            closeModal={() => setDetailRecipeModal({ state: false, id: null })}
          />
        </Modal>
      )}
    </>
  );
};

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//NEW RECIPE +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface NewRecipeInterface {
  addRecipe: Function;
  isFetching: boolean;
  closeModal: Function;
}

const NewRecipe = ({
  addRecipe,
  closeModal,
  isFetching,
}: NewRecipeInterface) => {
  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    addRecipe(data, closeModal);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre *"
        placeholder="Nombre de la receta"
        control={control}
        rules={{ required: "* Campo requerido" }}
      />
      <div className="flex justify-end pt-5">
        <Button
          name="Añadir"
          color="slate-600"
          loading={isFetching}
          disabled={isFetching}
          type="submit"
        />
      </div>
    </form>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default ListRecipes;
