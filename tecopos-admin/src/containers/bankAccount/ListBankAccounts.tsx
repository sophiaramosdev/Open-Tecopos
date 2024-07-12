import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useServerBankAccount from "../../api/useServerBankAccount";

import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";
import { faLock, faLockOpen, faUser } from "@fortawesome/free-solid-svg-icons";

import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import NewBankAccount from "./bankAccounts/NewBankAccountModal";
import { formatMaskAccount } from "../../utils/helpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import Paginate from "../../components/misc/Paginate";
import { Tooltip as ReactTooltip } from 'react-tooltip'

export default function ListBankAccounts() {
  const {
    allBankAccount,
    addBankAccount,
    getAllBankAccount,
    outLoading,
    isFetching,
    paginate
  } = useServerBankAccount();

  //Declaración de la Variable Navegate para navegar a la ruta de detalle del BankAccount
  const navigate = useNavigate();

  //Metodo ascociado al filtrado de Accounts en DB
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });

  useEffect(() => {
    getAllBankAccount(filter);
  }, [filter]);

  //----------------------------------------------------------------------------------------------------

  const [newAccountModal, setNewAccountModal] = useState(false); //useState para adicionar o no un nuevo Bank Account

  //-------------------------------------------------------------------------------------------------------

  //Accion para enviar a la pagina de detalle del bankAccount al seleccionar una fila del DataTable

  const rowAction = (bankAccount: string) =>
    navigate(`/bank_accounts/${bankAccount}`);

  //Encabezado Tabla
  const titles: string[] = ["Nombre", "Código", "Número", ""];

  //DataTable´s Body
  const bankAccountDisplay: Array<DataTableInterface> = [];

  allBankAccount.map((item) =>
    bankAccountDisplay.push({
      rowId: item.id,
      payload: {
        Nombre: item?.name,
        Código: item?.code ?? "---",
        Número: formatMaskAccount(item?.address, "-", 4) ?? "---",
        "": (
          <>
         <div className="flex items-center">
         <div data-tooltip-id="my-tooltip" data-tooltip-content={item.isBlocked ? "Cuenta incativa":"Cuenta activa"}>
            <IconPublic showForBlocked={item.isBlocked}  />
          </div>
          <div data-tooltip-id="my-tooltip" data-tooltip-content={item.isPrivate ? "Cuenta privada" : "Cuenta pública"}>

            <IconPrivate showForBlocked={item.isPrivate}  />
          </div>
         </div>

            <ReactTooltip place="top" id="my-tooltip" />

          </>
        ),
      },
    })
  );

  const actions: BtnActions[] = [
    {
      title: "Añadir cuenta",
      action: () => setNewAccountModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  //--------------------------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Cuentas bancarias",
    },
  ];
  //------------------------------------------------------------------------------------

  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar",
  };

  return (
    <>
      <Breadcrumb
        icon={<CreditCardIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        actions={actions}
        tableTitles={titles}
        tableData={bankAccountDisplay}
        rowAction={rowAction}
        loading={outLoading}
        searching={searching}
        paginateComponent={<Paginate action={(page: number) => setFilter({ ...filter, page })} data={paginate} />}
      />

      {newAccountModal && (
        <Modal
          state={newAccountModal}
          close={() => setNewAccountModal(false)}
          size="m"
        >
          <NewBankAccount
            loading={isFetching}
            addBankAccount={addBankAccount}
            closeModal={() => setNewAccountModal(false)}
          />
        </Modal>
      )}
    </>
  );
}

function IconPublic(props: any) {
  const { showForBlocked } = props;

  return (
    <>
      {showForBlocked ? (
        <FontAwesomeIcon
          //@ts-ignore
          icon={faLock}
          className="text-red-700 mr-5"
        />
      ) : (
        <FontAwesomeIcon
          //@ts-ignore
          icon={faLockOpen}
          className="text-green-700 mr-5"
        />
      )}
    </>
  );
}

function IconPrivate(props: any) {
  const { showForBlocked } = props;

  return (
    <>
      {showForBlocked && (
        <FontAwesomeIcon
          //@ts-ignore
          icon={faUser}
        />
      )}
    </>
  );
}
