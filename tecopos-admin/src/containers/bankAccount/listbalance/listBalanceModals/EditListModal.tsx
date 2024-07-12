import { useEffect, useState } from "react";
import AccountSelectableList from "./AccountSelectableList";
import { SubmitHandler, useForm } from "react-hook-form";
import AccountSelectedList from "./AccountSelectedList";
import useServerBankAccount from "../../../../api/useServerBankAccount";
import AlertContainer from "../../../../components/misc/AlertContainer";
import Modal from "../../../../components/misc/GenericModal";
import Button from "../../../../components/misc/Button";
import Input from "../../../../components/forms/Input";
import { ListBalanceInterface } from "../../../../interfaces/ServerInterfaces";

interface EditListModalProps {
  CRUD: any;
  dataList: {
    listId: number;
    listName: string;
  };
  closeModal: () => void;
}

function EditListModal({ dataList, closeModal, CRUD }: EditListModalProps) {
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const { handleSubmit, control, setValue } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    CRUD.updateList(dataList.listId, data, closeModal);
  };

  useEffect(() => {
    const currentList = CRUD.allList?.find(
      (item: any) => item.listId === dataList.listId
    );
    if (currentList) {
      setValue("name", currentList.listName);
    }
  }, [dataList, CRUD.allList, setValue]);

  return (
    <>
      <div className="grid grid-cols-2 h-96 border border-slate-300 p-2 rounded-md justify-center gap-2">
        <div className="border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <AccountSelectableList listId={dataList.listId} CRUD={CRUD} />
        </div>

        <div className="border border-slate-300 p-2 rounded overflow-y-auto scrollbar-thin">
          <AccountSelectedList dataList={dataList} CRUD={CRUD} />
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <Button
          name="Eliminar"
          textColor="red-600"
          color="red-600"
          action={() => setDeleteModal(true)}
          outline
        />
        <Button
          name="Editar"
          textColor="slate-600"
          color="slate-600"
          action={() => setEditModal(true)}
          outline
        />
        {editModal && (
          <Modal state={editModal} close={setEditModal}>
            <h3 className="text-lg font-medium leading-6 text-gray-700 mb-4">
              Editar lista
            </h3>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="col-span-6 flex flex-col gap-4">
                <Input
                  label="Nombre *"
                  name="name"
                  control={control}
                  placeholder="Nombre de la lista"
                  rules={{
                    required: "Este campo es requerido",
                  }}
                />

                <div className="flex justify-end">
                  <Button
                    color="slate-600"
                    type="submit"
                    name="Editar"
                    loading={CRUD.isFetching}
                    disabled={CRUD.isFetching}
                  />
                </div>
              </div>
            </form>
          </Modal>
        )}
        {deleteModal && (
          <Modal state={deleteModal} close={setDeleteModal}>
            <AlertContainer
              onAction={() =>
                CRUD.deleteList!(dataList?.listId, () => {
                  setDeleteModal(false);
                  closeModal();
                })
              }
              onCancel={() => setDeleteModal(false)}
              text="Seguro que desea continuar?"
              title={`Está intentando eliminar ${dataList?.listName}`}
              loading={CRUD.isFetching}
            />
          </Modal>
        )}
      </div>
    </>
  );
}

export default EditListModal;
