import { useEffect, useState } from "react";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/misc/GenericModal";
import useServerBankAccount from "../../../api/useServerBankAccount";
import NewListModal from "./listBalanceModals/NewListModal";
import EditListModal from "./listBalanceModals/EditListModal";
import { formatCurrencyWithOutCurrency } from "../../../utils/helpers";

const ListBalance = () => {
  const CRUD = useServerBankAccount();
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });

  const [newList, setnewList] = useState(false);

  const [editModal, setEditModal] = useState<{
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
  } | null>(null);

  useEffect(() => {
    CRUD.getAllList(filter);
  }, [filter]);

  //Data to dislay in table ---------------------------------------------------------------------------
  let uniqueCurrencyCodes: string[] = [];

  CRUD.allList?.forEach((list) => {
    list.currencies?.forEach((currency) => {
      if (!uniqueCurrencyCodes.includes(currency.codeCurrency)) {
        uniqueCurrencyCodes.push(currency.codeCurrency);
      }
    });
  });

  const tableTitle: string[] = ["Nombre", ...uniqueCurrencyCodes];

  const tableData: DataTableInterface[] = [];
  CRUD.allList?.forEach((list) => {
    const currencyMap = uniqueCurrencyCodes.reduce((acc, title) => {
      const value = list?.currencies?.find((c) => c.codeCurrency === title);
      const amount = value ? value.amount : 0;
      acc[title] = (
        <span
          className={`py-1 px-2 rounded-full text-black font-semibold ${
            amount === 0 ? "" : amount < 0 ? "text-red-700" : "text-green-700"
          }`}
        >
          {formatCurrencyWithOutCurrency(amount, title) ?? 0}
        </span>
      );
      return acc;
    }, {} as Record<string, JSX.Element>);
    tableData.push({
      rowId: list.listId,
      payload: {
        Nombre: list.listName,
        ...currencyMap,
      },
    });
  });

  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nueva lista",
      action: () => setnewList(true),
    },
  ];

  const rowAction = (id: number) => {
    const list: any = CRUD.allList?.find((item) => item.listId === id);
    setEditModal(list);
  };

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Cuentas bancarias",
    },
    {
      name: "Mis listas",
    },
  ];

  //----------------------------------------------------------------------------------------------------
  return (
    <>
      <Breadcrumb
        icon={<CreditCardIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        loading={CRUD.outLoading}
        actions={actions}
        rowAction={rowAction}
        searching={{
          action: (value: string | null) => {
            value !== null
              ? setFilter({ ...filter, search: value })
              : setFilter({ ...filter, search: value! });
          },
          placeholder: "Buscar por nombre",
        }}
        syncAction={{
          action: () => CRUD.getAllList(filter),
          loading: CRUD.outLoading,
        }}
        /* paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={CRUD.paginate}
          />
        } */
      />
      {newList && (
        <Modal state={newList} close={setnewList}>
          <NewListModal
            loading={CRUD.isFetching}
            addList={CRUD.addList}
            closeModal={() => setnewList(false)}
          />
        </Modal>
      )}

      {editModal && (
        <Modal state={!!editModal} close={() => setEditModal(null)} size="m">
          <EditListModal
            dataList={editModal}
            CRUD={CRUD}
            closeModal={() => setEditModal(null)}
          />
        </Modal>
      )}
    </>
  );
};

export default ListBalance;
