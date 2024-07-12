import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { useContext, useState } from "react";
import Modal from "../../../components/modals/GenericModal";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import AlertContainer from "../../../components/misc/AlertContainer";
import { FaPlus, FaTrashCan } from "react-icons/fa6";
import Button from "../../../components/misc/Button";
import NewUserAccess from "./NewUserAccess";

export const UserAccess = () => {
  const { bankAccount, deleteUserAccess, isLoading, isFetching } =
    useContext(DetailAccountContext);
  const [newUser, setNewUser] = useState(false);
  const [deleteUser, setDeleteUser] = useState<number | null>(null);

  //Table data --------------------------------------------

  const tableTitle = ["Nombre", "Usuario", "Email", ""];
  const displayData: DataTableInterface[] =
    bankAccount?.allowedUsers.map((user) => ({
      payload: {
        Nombre: user.displayName,
        Usuario: user.username,
        Email: user.email,
        "": (
          <div>
            <Button
              icon={<FaTrashCan />}
              color="red-500"
              textColor="red-600"
              action={() => setDeleteUser(user.id)}
              outline
            />
          </div>
        ),
      },
    })) ?? [];

  //-------------------------------------------------------

  return (
    <div className="grid grid-cols-10 gap-8 ">
      <div className="col-span-10 m-auto w-full p-1">
        <div className="flex justify-end py-2">
          <Button
            name="Añadir usuario"
            color="slate-400"
            textColor="slate-500"
            icon={<FaPlus />}
            action={() => setNewUser(true)}
            outline
          />
        </div>
        <GenericTable
          tableTitles={tableTitle}
          tableData={displayData}
          loading={isLoading}
        />
      </div>
      {newUser && (
        <Modal state={newUser} close={setNewUser}>
          <NewUserAccess close={()=>setNewUser(false)} />
        </Modal>
      )}
      {!!deleteUser && (
        <Modal state={!!deleteUser} close={() => setDeleteUser(null)}>
          <AlertContainer
            title={`Eliminar usuario permitido ${
              bankAccount?.allowedUsers.find((user) => user.id === deleteUser)
                ?.displayName
            }`}
            text="¿Seguro que desea continuar?"
            onAction={() =>
              deleteUserAccess!(deleteUser, () => setDeleteUser(null))
            }
            onCancel={() => setDeleteUser(null)}
            loading={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};
