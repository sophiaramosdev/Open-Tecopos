import React, { useEffect, useState } from "react";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import EmptyList from "../../../../components/misc/EmptyList";
import useServerBankAccount from "../../../../api/useServerBankAccount";
import SearchComponent from "../../../../components/misc/SearchComponent";
import { useForm } from "react-hook-form";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Modal from "../../../../components/misc/GenericModal";
import Button from "../../../../components/misc/Button";
import { ListBalanceInterface } from "../../../../interfaces/ServerInterfaces";

function AccountSelectableList({ listId, CRUD }: any) {
  //Modal state ------------------------------------------------
  const [addModalAction, setAddModalAction] =
    useState<ListBalanceInterface | null>(null);

  // React hookhook form ----------------------------
  const { register, watch, setValue } = useForm();

  // Filters ---------------------------------------------------
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >({ page: 1 });
  const searchTerm = watch("search");

  useEffect(() => {
    const updatedFilter = { ...filter, search: searchTerm };
    setFilter(updatedFilter);

    if (searchTerm) {
      CRUD.getAllBankAccountForList(updatedFilter);
    }
  }, [searchTerm]);

  // Determina el mensaje a mostrar en el EmptyList
  const emptyListMessage = searchTerm
    ? "Sin productos para mostrar"
    : "Inserte un criterio de búsqueda";
  // ------------------------------------------

  return (
    <div className="h-full">
      <div className="sticky -top-3 bg-gray-50 p-2 rounded ">
        <SearchComponent
          findAction={(find: string | null) => setValue("search", find)}
          placeholder="Buscar cuenta"
        />
      </div>
      {CRUD.isLoading ? (
        <SpinnerLoading />
      ) : searchTerm && CRUD.allBankAccountForList.length > 0 ? (
        <ul className="grid gap-4">
          <span className="text-gray-600 text-xs font-semibold mt-2">
            Cuentas bancarias disponibles:
          </span>
          {CRUD.allBankAccountForList?.map((account: any, index: any) => (
            <li
              className="w-full rounded-md shadow hover:bg-gray-50 py-4 px-2 cursor-pointer duration-150 flex justify-between text-sm"
              key={index}
              onClick={() => {
                setAddModalAction(account);
              }}
            >
              {account.name}
              <ArrowRightIcon className="w-5 h-5 text-gray-600" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="my-auto py-16">
          <EmptyList title={emptyListMessage} />
        </div>
      )}

      {addModalAction && (
        <Modal state={!!addModalAction} close={() => setAddModalAction(null)}>
          <div className="grid gap-2">
            <p>
              Añadirá a la lista la cuenta:
              <span className="font-bold"> {addModalAction.name}</span>
            </p>
            <div className="ml-auto">
              <Button
                color="slate-600"
                type="submit"
                name="Añadir"
                action={() => {
                  CRUD.addBankAccountToList(addModalAction.id, listId, () =>
                    setAddModalAction(null)
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

export default AccountSelectableList;
