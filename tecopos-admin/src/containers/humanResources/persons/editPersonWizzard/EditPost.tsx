import Button from "../../../../components/misc/Button";
import { cleanObj } from "../../../../utils/helpers";
import { SubmitHandler, useForm } from "react-hook-form";
import { PersonInterface } from "../../../../interfaces/ServerInterfaces";
import { BasicType, SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import ComboBox from "../../../../components/forms/Combobox";
import Toggle from "../../../../components/forms/Toggle";
import Select from "../../../../components/forms/Select";

interface EditPostInterface {
  person: PersonInterface | null;
  editPerson: Function;
  isFetching: boolean;
}

const EditPost = ({ editPerson, person, isFetching }: EditPostInterface) => {
  const { personCategories, personPosts } = useAppSelector(
    (state) => state.nomenclator
  );
  const { control, handleSubmit } = useForm();

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    editPerson(person?.id, cleanObj(data));
  };

  const { branches, business } = useAppSelector((state) => state.init);

  const branchSelector: SelectInterface[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));
  let businessDefault = branchSelector.find(business => business.id === person?.businessId)
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className=" flex flex-col gap-3 h-96 pt-3">
          {business?.mode === "GROUP" && (
            <Select
              className="w-full"
              data={branchSelector.length > 0 ? branchSelector : [{ name: business.name, id: business.id }]}
              control={control}
              name="businessId"
              label="Negocio"
              // defaultValue={}
              rules={{ required: "* Campo requerido" }}
              defaultValue={branchSelector.length > 0 ? businessDefault?.id! : business.id}
            />
          )}
          <ComboBox
            data={personPosts}
            label="Cargo"
            control={control}
            name="postId"
            defaultValue={person?.post?.id}
          />
          <ComboBox
            data={personCategories}
            label="Categoría"
            control={control}
            name="personCategoryId"
            defaultValue={person?.personCategory?.id}
          />
          <Toggle
            name="isInBusiness"
            control={control}
            defaultValue={person?.isInBusiness}
            title="Está en el negocio"
          />
        </div>
        <div className="flex justify-end mt-5">
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default EditPost;
