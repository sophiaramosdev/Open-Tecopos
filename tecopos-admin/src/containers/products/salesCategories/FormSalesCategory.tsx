import { useEffect, useState } from "react";
import { SalesCategories } from "../../../interfaces/ServerInterfaces";
import { useForm, SubmitHandler } from "react-hook-form";
import useServer from "../../../api/useServerMain";
import { FileRejection, useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import Input from "../../../components/forms/Input";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import Toggle from "../../../components/forms/Toggle";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import GenericImageDrop from "../../../components/misc/Images/GenericImageDrop";
import { useAppSelector } from "../../../store/hooks";

interface FormSales {
  categoryData?: SalesCategories | null;
  edit?: boolean;
  closeModal: Function;
  crud: { add: Function; upd: Function; del: Function; isFetching: boolean };
}

const FormSalesCategory = ({
  categoryData,
  edit,
  closeModal,
  crud,
}: FormSales) => {
  const { control, handleSubmit, setValue } = useForm();
  const { add, del, upd, isFetching } = crud;
  const { business } = useAppSelector((state) => state.init);
  const [deleteModal, setDeleteModal] = useState(false);

  const module_woocommerce = business?.configurationsKey.find(
    (item) => item.key === "module_woocommerce"
  )?.value === "true";

  const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
    data
  ) => {
    if (edit) {
      upd(categoryData?.id, data, closeModal);
    } else {
      add(data, closeModal);
    }
  };
  return (
    <div className="">
      {edit && (
        <div className="pb-2 flex">
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
              {edit && (
                <>
                  <Input
                    label="Índice (Orden de aparición)"
                    name="index"
                    type="number"
                    control={control}
                    placeholder="Índice"
                    defaultValue={categoryData?.index}
                  />
                  <Toggle
                    name="isActive"
                    control={control}
                    defaultValue={categoryData?.isActive}
                    title="Activa"
                  />
                  {module_woocommerce && (
                    <Toggle
                      name="visibleOnline"
                      control={control}
                      defaultValue={categoryData?.visibleOnline}
                      title="Visible en tienda online"
                    />
                  )}
                </>
              )}
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

export default FormSalesCategory;
