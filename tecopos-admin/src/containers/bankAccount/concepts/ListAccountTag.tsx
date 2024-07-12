import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";

import useServerBankAccount from "../../../api/useServerBankAccount";

import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { PlusIcon } from "@heroicons/react/24/outline";

import TagAccountForm from "./NewTagAccount";
import { BankAccountTagInterfaces } from "../../../interfaces/ServerInterfaces";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import { BasicType } from "../../../interfaces/InterfacesLocal";

export default function ListAccountTag() {
  const { getAllBankAccountTag, allBankAccountTag, paginateTag, isLoading } =
    useContext(DetailAccountContext);

  const [openModal, setOpenModal] = useState<boolean>(false);

  const [currentAccountTag, setCurrentAccountTag] =
    useState<BankAccountTagInterfaces | null>(null);

  //Metodo ascociado al filtrado de Accounts en DB
  const [filter, setFilter] = useState<BasicType | null>(null);

  useEffect(() => {
    if (!!filter) getAllBankAccountTag!(filter);
  }, [filter]);

  //Data for Table List --------------------------------------------------------------------

  const titles: string[] = ["Nombre"];
  const displayData: Array<DataTableInterface> = [];

  allBankAccountTag?.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.name,
      },
    })
  );

  //Action after click in RowTable
  const rowAction = (id: number) => {
    setCurrentAccountTag(allBankAccountTag?.find((item) => item.id === id)!);
  };

  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Agregar nuevo concepto" />,
      action: () => setOpenModal(true),
      title: "Nuevo concepto",
    },
  ];

  let searching = {
    placeholder: "Buscar",
    action: (value: string) => setFilter({ search: value }),
  };

  //--------------------------------------------------------------------------------------

  return (
    <>
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        actions={actions}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginateTag}
          />
        }
        searching={searching}
        loading={isLoading}
      />

      {openModal && (
        <Modal state={openModal} close={() => setOpenModal(false)} size="m">
          <TagAccountForm closeModal={() => setOpenModal(false)} />
        </Modal>
      )}

      {!!currentAccountTag && (
        <Modal
          state={!!currentAccountTag}
          close={() => setCurrentAccountTag(null)}
          size="m"
        >
          <TagAccountForm
            accountTagData={currentAccountTag}
            closeModal={() => setCurrentAccountTag(null)}
          />
        </Modal>
      )}
    </>
  );
}
