import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import { RecipeInterface } from "../../../../interfaces/ServerInterfaces";
import Button from "../../../../components/misc/Button";

export interface DetailRecipeInterface {
  recipe: RecipeInterface;
  editRecipe: Function;
  isFetching: boolean;
}

const DetailContainer = ({
  recipe,
  editRecipe,
  isFetching,
}: DetailRecipeInterface) => {
  const { handleSubmit, control } = useForm();
  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    editRecipe(recipe.id, data);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-96">
        <Input
          name="name"
          label="Nombre *"
          control={control}
          rules={{ required: "* Campo requerido" }}
          defaultValue={recipe?.name}
        />
      </div>
      <div className="flex justify-end">
        <Button
          name="Actualizar"
          color="slate-600"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
        />
      </div>
    </form>
  );
};

export default DetailContainer;
