import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import { PostInterface } from "../../../interfaces/ServerInterfaces";
import Modal from "../../../components/misc/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import useServerUsers from "../../../api/useServerUsers";

interface NewCatInterface {
  post?: PostInterface;
  closeModal: Function;
}

const PostForm = ({
  post,
  closeModal,
}: NewCatInterface) => {
  const { addPost, editPost, deletePost, isFetching } = useServerUsers();
  const { control, handleSubmit, formState } = useForm();
  const { isSubmitting } = formState

  const [deleteModal, setDeleteModal] = useState(false);

  const onSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    if (!!post) {
      await editPost(post.id, data, closeModal);
    } else {
      await addPost(data, closeModal);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="inline-flex gap-2 w-full">
          <Input name="name" type="textOnly" control={control} label="Nombre" defaultValue={post?.name} />
          <Input name="code" control={control} label="Código" defaultValue={post?.code} />
        </div>
        <div className="flex justify-between pt-3">
          {post ? (
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
            name={!!post ? "Actualizar" : "Insertar"}
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
            onAction={() => deletePost!(post!.id, closeModal)}
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea continuar?"
            title={`Está intentando eliminar ${post?.name}`}
            loading={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};

export default PostForm;
