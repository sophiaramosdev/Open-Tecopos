import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { PersonCategory } from "../../../interfaces/ServerInterfaces";
import Modal from "../../../components/misc/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import useServerUsers from "../../../api/useServerUsers";

interface NewCatInterface {
  category?: PersonCategory;
  closeModal: Function;
}

const CatForm = ({
  category,
  closeModal,
}: NewCatInterface) => {
  const {addCategory, editCategory, deleteCategory, isFetching} = useServerUsers();
  const { control, handleSubmit, formState } = useForm();
  const {isSubmitting} = formState

  const [deleteModal, setDeleteModal] = useState(false);

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    if (!!category) {
      await editCategory(category.id, data, closeModal);
    } else {
      await addCategory(data, closeModal);
    }
  };

  return (
    <div>
      <h5 className="text-xl font-semibold"></h5>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="inline-flex gap-2 w-full">
          <Input name="name" type="textOnly" control={control} label="Nombre" defaultValue={category?.name} />
          <Input name="code" control={control} label="Código" defaultValue={category?.code} />
        </div>
        <div className="flex justify-between pt-3">
          {category ? (
            <Button
              name="Eliminar"
              textColor="slate-600"
              color="slate-600"
              action={() => setDeleteModal(true)}
              outline
            />
          ) : (
            <div></div>
          )}
          <Button
            name={!!category ? "Actualizar" :"Insertar"}
            color="slate-600"
            type="submit"
            loading={isFetching && isSubmitting}
            disabled={isFetching}
          />
        </div>
      </form>
      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            onAction={() => deleteCategory!(category!.id, closeModal)}
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea continuar?"
            title={`Está intentando eliminar la categoría ${category?.name}`}
            loading={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};

export default CatForm;
