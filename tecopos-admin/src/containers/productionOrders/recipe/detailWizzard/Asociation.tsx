import React, { useCallback, useEffect, useState } from "react";
import {
  ProductInterface,
  RecipeInterface,
} from "../../../../interfaces/ServerInterfaces";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import ProductSelector from "../../../../components/misc/ProductSelector";
import Button from "../../../../components/misc/Button";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";

//MAIN COMPONENT ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface AsociationInterface {
  recipe: RecipeInterface;
  addAssociatedProducts: Function;
  isFetching: boolean;
}

const Asociation = ({
  recipe,
  addAssociatedProducts,
  isFetching,
}: AsociationInterface) => {
  const { handleSubmit, control } = useForm();
  const { replace, append, remove, fields } = useFieldArray({
    control,
    name: "products",
  });
  const [newProdModal, setNewProdModal] = useState(false);

  useEffect(() => {
    replace(
      recipe.products.map((prod) => ({
        productId: prod.id,
        productName: prod.name,
      }))
    );
  }, []);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    data.products = data.products.map((itm: any) => itm.productId);
    addAssociatedProducts(recipe.id, data);
  };

  const removeItem = (id: number) => {
    const idx = fields.findIndex((itm: any) => itm.productId === id);
    if (idx !== -1) remove(idx);
  };

  //Table ------------------------------------------------------------
  const tableTitles = ["Productos", ""];
  const tableData: DataTableInterface[] =
    fields.map((prod: any) => ({
      rowId: prod.productId,
      payload: {
        Productos: prod.productName,
        "": (
          <div className="flex justify-end">
            <Button
              color="red-500"
              icon={<TrashIcon className="text-red-500 h-5" />}
              action={() => removeItem(prod.productId)}
              outline
            />
          </div>
        ),
      },
    })) ?? [];
  const actions: BtnActions[] = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Insertar producto",
      action: () => setNewProdModal(true),
    },
  ];
  //-------------------------------------------------------------------

  return (
    <div>
      <div className="h-96 overflow-auto scrollbar-thin p-1">
        <GenericTable
          tableTitles={tableTitles}
          tableData={tableData}
          actions={actions}
        />
      </div>
      <form className="flex justify-end pt-3" onSubmit={handleSubmit(onSubmit)}>
        <Button
          name="Actualizar"
          color="slate-600"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
        />
      </form>
      {newProdModal && (
        <Modal state={newProdModal} close={setNewProdModal}>
          <ProductSelector
            append={append}
            remove={remove}
            productFilter={{ type: "STOCK,MANUFACTURED" }}
            fields={fields}
            close={() => setNewProdModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default Asociation;
