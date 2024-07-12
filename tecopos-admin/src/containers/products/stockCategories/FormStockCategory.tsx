import { useEffect, useState } from "react";
import { ProductCategoriesInterface, SalesCategories } from "../../../interfaces/ServerInterfaces";
import { useForm, SubmitHandler } from "react-hook-form";
import useServer from "../../../api/useServerMain";
import { FileRejection, useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import GenericImageDrop from "../../../components/misc/Images/GenericImageDrop";
import { cleanObj } from "../../../utils/helpers";

interface FormStock {
  categoryData?: ProductCategoriesInterface | null;
  edit?: boolean;
  closeModal: Function;
  crud: { add: Function; upd: Function; del: Function; isFetching: boolean };
}

const FormStockCategory = ({
  categoryData,
  edit,
  closeModal,
  crud,
}: FormStock) => {
  const { control, handleSubmit, } = useForm();
  const { add, del, upd, isFetching } = crud;


  const [deleteModal, setDeleteModal] = useState(false);

 const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    if (edit) {
      upd(categoryData?.id, cleanObj(data), closeModal);
    } else {
      add(cleanObj(data), closeModal);
    }
  };

  return (
    <div className="min-h-96">
      {edit && (
        <div className="pb-2 flex justify-end">
          <Button
            color="red-500"
            icon={<TrashIcon className="h-5 text-red-500" />}
            action={() => setDeleteModal(true)}
            disabled={isFetching}
            outline
          />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-5 gap-3">
        <GenericImageDrop
            name="imageId"
            className="flex justify-center col-span-2 border border-gray-300 rounded focus:outline-none cursor-pointer w-full h-full"
            control={control}
            previewDefault={categoryData?.image?.src}
            previewHash={categoryData?.image?.blurHash}
          />
          <div className="border border-gray-300 p-2 rounded col-span-3">
            <div className="flex-col">
              <Input
                label="Nombre"
                name="name"
                control={control}
                placeholder="Nombre de la categoría"
                rules={{ required: "Este campo es requerido" }}
                defaultValue={categoryData?.name}
              />
              <TextArea
                label="Descripción"
                name="description"
                placeholder="Breve descripción de la categoría"
                control={control}
                defaultValue={categoryData?.description}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end py-3">
          <Button
            name={edit ? "Actualizar" : "Insertar"}
            color="slate-600"
            type="submit"
            disabled={isFetching}
            loading={isFetching}
          />
        </div>
      </form>

      {deleteModal && (
        <Modal state={deleteModal} close={setDeleteModal}>
          <AlertContainer
            title={`Eliminar ${categoryData?.name}`}
            text="Seguro que desea eliminar esta categoría?"
            onAction={() => del(categoryData?.id, closeModal)}
            onCancel={setDeleteModal}
            loading={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};

export default FormStockCategory;
