import React, { useState } from "react";
import EmptyList from "../../../../components/misc/EmptyList";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import { ListBalanceInterface } from "../../../../interfaces/ServerInterfaces";
import useServerBankAccount from "../../../../api/useServerBankAccount";
import { useForm } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/misc/GenericModal";
import { TrashIcon } from "@heroicons/react/24/outline";
interface EditListModalProps {
  CRUD: any;
  allList: any;
  dataList: {
    listName: string;
    listId: number;
    accountList: {
      id: number;
      name: string;
      code: string;
    }[];
    currencies: {
      amount: number;
      codeCurrency: string;
    }[];
  };
}

function AccountSelectedList({ dataList, CRUD }: EditListModalProps | any) {
  // State of the modal ------------------------------------------------
  const [deleteModalAction, setDeleteModalAction] =
    useState<ListBalanceInterface | null>(null);

  // Determines the message displayed in the EmptyList
  const emptyListMessage = "No products to display";
  // ------------------------------------------------------

  // Format data to display
  const dataToDisplay = CRUD?.allList?.find(
    (item: any) => item?.listId === dataList?.listId
  );

  return (
    <div className="h-full">
      {false ? (
        <SpinnerLoading />
      ) : dataToDisplay?.accountList?.length > 0 ? (
        <ul className="grid gap-4">
          <div className="top-0 p-1 rounded text-sm inline-flex gap-2 items-center">
            <span className="text-gray-600 text-xs font-semibold mt-2">
              Añadidas:
            </span>
          </div>

          {dataToDisplay?.accountList?.map((account: any, index: any) => (
            <li
              className="w-full group rounded-md shadow hover:bg-red-50 py-4 px-2 cursor-pointer duration-150 flex justify-between text-sm"
              key={index}
              onClick={() => {
                setDeleteModalAction(account);
              }}
            >
              {account.name}
              <TrashIcon className="w-5 h-5 group-hover:text-red-600 text-red-600" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex justify-center items-center h-full">
          <EmptyList title={emptyListMessage} />
        </div>
      )}

      {deleteModalAction && (
        <Modal
          state={!!deleteModalAction}
          close={() => setDeleteModalAction(null)}
        >
          <div className="grid gap-2">
            <p>
              Eliminar de la lista la cuenta:
              <span className="font-bold"> {deleteModalAction?.name}</span>
            </p>
            <div className="ml-auto">
              <Button
                color="red-600"
                type="submit"
                name="Eliminar"
                action={() => {
                  CRUD.deleteBankAccountFromList(
                    deleteModalAction?.id,
                    dataList?.listId,
                    () => setDeleteModalAction(null)
                  );
                }}
                loading={CRUD.isFetching}
                disabled={CRUD.isFetching}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AccountSelectedList;
