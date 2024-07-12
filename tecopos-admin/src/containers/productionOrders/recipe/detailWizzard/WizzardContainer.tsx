import React, { useEffect, useState } from "react";
import TabNav from "../../../../components/navigation/TabNav";
import DetailContainer from "./DetailContainer";
import useServerOrderProd from "../../../../api/useServerOrderProd";
import Fetching from "../../../../components/misc/Fetching";
import AddonsContainer from "./AddonsContainer";
import Button from "../../../../components/misc/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import Asociation from "./Asociation";

interface WizardRecipe {
  id: number;
  editRecipe: Function;
  addRecipeProducts: Function;
  deleteRecipe: Function;
  isFetching: boolean;
  closeModal: Function;
}

const WizzardContainer = ({
  id,
  editRecipe,
  addRecipeProducts,
  deleteRecipe,
  isFetching,
  closeModal,
}: WizardRecipe) => {
  const {
    getRecipe,
    recipe,
    isLoading,
    setRecipeState,
    addAssociatedProducts,
    isFetching:fetching
  } = useServerOrderProd();
  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Ingredientes",
      href: "addons",
      current: currentTab === "addons",
    },
    {
      name: "Asociaciones",
      href: "assoc",
      current: currentTab === "assoc",
    },
  ];
  const [deleteAlert, setDeleteAlert] = useState(false);

  useEffect(() => {
    getRecipe(id);
  }, []);

  if (isLoading) {
    return <Fetching className="h-96" />;
  } else {
    return (
      <div className="relative">
        <div className="absolute -top-5">
          <Button
            color="red-500"
            icon={<TrashIcon className="h-5 text-red-500" />}
            action={() => setDeleteAlert(true)}
            outline
          />
        </div>
        <TabNav action={setCurrentTab} tabs={tabs} />
        {currentTab === "details" && (
          <DetailContainer
            recipe={recipe!}
            editRecipe={editRecipe}
            isFetching={isFetching}
          />
        )}
        {currentTab === "addons" && (
          <AddonsContainer
            recipe={recipe!}
            addRecipeProducts={addRecipeProducts}
            isFetching={isFetching}
            setRecipeState={setRecipeState}
          />
        )}
        {currentTab === "assoc" && (
          <Asociation
            recipe={recipe!}
            addAssociatedProducts={addAssociatedProducts}
            isFetching={fetching}
          />
        )}

        {deleteAlert && (
          <Modal state={deleteAlert} close={setDeleteAlert}>
            <AlertContainer
              onAction={() => deleteRecipe(recipe?.id, closeModal)}
              onCancel={() => setDeleteAlert(false)}
              title={`Eliminar receta ${recipe?.name}`}
              text="Seguro que desea continuar?"
            />
          </Modal>
        )}
      </div>
    );
  }
};

export default WizzardContainer;
