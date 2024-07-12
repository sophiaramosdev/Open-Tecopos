import { useState } from "react";
import { toast } from "react-toastify";
import {  useParams } from "react-router-dom";

import query from "./APIServices";
import { generateUrlParams } from "../utils/helpers";

import {
  PaginateInterface,
  BankAccountInterfaces,
  BankAccountTagInterfaces,
  BankAccountOperationInterfaces,
  BalanceBankAccountInterfaces,
  FinancialBankAccountInterface,
  FundDestinationInterface,
  BankAccountRecordsInterface,
  SysUserInterface,
  ListBalanceInterface,
} from "../interfaces/ServerInterfaces";

import useServer from "./useServerMain";
import { BasicType } from "../interfaces/InterfacesLocal";

export const useServerBankAccount = () => {

  //Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outLoading, setOutLoading] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isFetchingB, setIsFetchingB] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //Paginate State
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [paginateOperation, setPaginateOperation] =
    useState<PaginateInterface | null>(null);
  const [paginateTag, setPaginateTag] = useState<PaginateInterface | null>(
    null
  );
  const [paginateRecords, setPaginateRecords] =
    useState<PaginateInterface | null>(null);

  // UserEnableAcount State
  const [userEnableAcount, setUserEnableAcount] = useState<
    SysUserInterface[] | null
  >(null);
  const [userEnableAcountWithOutAccess, setUserEnableAcountWithOutAccess] =
    useState<SysUserInterface[] | null>(null);
  const [
    allUsersEnableAcountWithOutAccess,
    setAllUsersEnableAcountWithOutAccess,
  ] = useState<SysUserInterface[] | null>(null);

  // BankAccountRecords
  const [bankAccountRecords, setBankAccountRecords] = useState<
    BankAccountRecordsInterface[]
  >([]);

  //BankAccont States
  const [allBankAccount, setAllBankAccount] = useState<BankAccountInterfaces[]>(
    []
  );
  const [bankAccount, setBankAccount] = useState<BankAccountInterfaces | null>(
    null
  );

  //Operation States
  const [bankAccountOperation, setBankAccountOperation] =
    useState<BankAccountOperationInterfaces | null>(null);
  const [allBankAccountOperation, setAllBankAccountOperation] = useState<
    BankAccountOperationInterfaces[]
  >([]);

  //AccountTag States
  const [bankAccountTag, setBankAccountTag] =
    useState<BankAccountTagInterfaces | null>(null);
  const [allBankAccountTag, setAllBankAccountTag] = useState<
    BankAccountTagInterfaces[]
  >([]);

  //Report Balances States
  const [balanceBankAccount, setBalanceBankAccount] = useState<
    BalanceBankAccountInterfaces[]
  >([]);

  //Report Financial States
  const [financialBankAccount, setFinancialBankAccount] = useState<
    FinancialBankAccountInterface[]
  >([]);

  // Fund Destinations
  const [fundDestinationArea, setFundDestinationArea] = useState<
    FundDestinationInterface[]
  >([]);

  //Lists
  const [allList, setAllList] = useState<ListBalanceInterface[]>([]);

  const [allBankAccountForList, setAllBankAccountForList] = useState<
    ListBalanceInterface[]
  >([]);

  const { bankAccountId } = useParams();

  const { manageErrors } = useServer();

  //Permite adicionar cuentas en el sistema
  const addBankAccount = async (
    data: Partial<BankAccountInterfaces>,
    closeModal: Function
  ) => {
    const newBankAccount = { ...data };
    setIsFetching(true);
    await query
      .post("/administration/bank/account", newBankAccount)
      .then((resp) => {
        setAllBankAccount([resp.data, ...allBankAccount]);
        closeModal();
        toast.success("Cuenta insertada correctamente");
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const getAllBankAccount = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    await query
      .get(`/administration/bank/account${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllBankAccount(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getAllBankAccountWithOutFilter = async () => {
    setIsLoading(true);
    await query
      .get(`/administration/bank/account`)

      .then((resp) => {
        setAllBankAccount(resp.data.items);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const updateBankAccount = async (
    id: string,
    data: BasicType,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/bank/account/${id}`, data)
      .then((resp) => {
        setBankAccount({ ...bankAccount, ...resp.data });
        callback && callback();
        toast.success("Cuenta actualizada con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getBankAccountDetails = async (id: string) => {
    setIsLoading(true);

    await query
      .get(`/administration/bank/account/${id}`)
      .then((resp) => {
        setBankAccount(resp.data);
      })
      .catch((e) =>
        setError(e.message.data ?? "Ha ocurrido un error vuelva a intentarlo")
      );

    setIsLoading(false);
  };

  const deleteBankAccount = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/bank/account/${id}`, {})
      .then(() => {
        toast.success("Cuenta eliminada con éxito");
        callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  //--ACCOUNT OPERATIONS --------------------

  const getAllBankAccountOperations = async (
    accountId?: string,
    filter?: Record<string, string | number | boolean | null>,
    toReturn?: boolean
  ) => {
    setIsLoading(true);
    const resp = await query
      .get(
        `/administration/bank/account/${accountId}/operation${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setAllBankAccountOperation(resp.data.items);
        setPaginateOperation({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
        return resp.data.items;
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
    if (toReturn) return resp;
  };

  const updateBalance = (amount: number, codeCurrency: string) => {
    const actualBalance = bankAccount!.actualBalance;
    const currentItemIdx = actualBalance.findIndex(
      (elem) => elem.codeCurrency === codeCurrency
    );
    if (currentItemIdx !== -1) {
      const currentItem = actualBalance[currentItemIdx];
      actualBalance.splice(currentItemIdx, 1, {
        ...currentItem,
        amount: currentItem.amount + amount,
      });
    } else {
      actualBalance.push({
        amount,
        codeCurrency,
      });
    }
    setBankAccount({ ...bankAccount!, actualBalance });
  };

  const addAccountOperations = async (
    accountId: string,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/account/${accountId}/operation`, data)
      .then((resp) => {
        setAllBankAccountOperation([resp.data, ...allBankAccountOperation]);
        const { amount, codeCurrency } = resp.data.amount;
        updateBalance(amount, codeCurrency);
        callback();
        toast.success("Operación de Cuenta insertada correctamente");
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const addAccountTransfer = async (
    id: string,
    data: BasicType,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/transfer/${id}`, data)
      .then((resp) => {
        setAllBankAccountOperation([resp.data, ...allBankAccountOperation]);
        const { amount, codeCurrency } = resp.data.amount;
        updateBalance(amount, codeCurrency);
        toast.success("Operación de Cuenta insertada correctamente");
        closeModal();
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const updateBankAccountOperation = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/bank/account/operation/${id}`, data)
      .then((resp) => {
        const updated = [...allBankAccountOperation];
        const idx = allBankAccountOperation.findIndex(
          (item) => item.id === resp.data.id
        );
        updated.splice(idx, 1, resp.data);
        setAllBankAccountOperation(updated);
        callback();
        toast.success("Operación actualizada con éxito");
      })
      .catch((e) => manageErrors(e));

    setIsFetching(false);
  };

  const getBankAccountOperation = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/bank/operation/${id}`)
      .then((resp) => {
        setBankAccountOperation(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const deleteBankAccountOperation = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/bank/account/${id}/operation`, {})
      .then(() => {
        const { amount, codeCurrency } = allBankAccountOperation.find(
          (elem) => elem.id === id
        )!.amount!;
        updateBalance(-amount, codeCurrency);
        setAllBankAccountOperation(
          allBankAccountOperation.filter((item) => item.id !== id)
        );
        toast.success("Se eliminó la operación de la Cuenta correctamente");
        callback();
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const addExchangeCurrency = async (
    id: string,
    data: BasicType,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/currency-exchange/${id}`, data)
      .then((resp) => {
        const operations: BankAccountOperationInterfaces[] = resp.data;
        setAllBankAccountOperation([...operations, ...allBankAccountOperation]);
        operations.forEach((item) => {
          const { amount, codeCurrency } = item.amount!;
          updateBalance(amount, codeCurrency);
        });
        callback();
        toast.success("Cambio de moneda insertado correctamente");
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  //--BANK ACCOUNT TAG --------------------
  const getAllBankAccountTag = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/bank/tag/${bankAccountId}${generateUrlParams(filter)}`
      )
      .then((resp) => {
        setAllBankAccountTag(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addAccountTag = async (
    data: Partial<BankAccountTagInterfaces>,
    closeModal: Function
  ) => {
    const newBankAccountTag = { ...data };

    setIsFetching(true);
    await query
      .post(`/administration/bank/tag/${bankAccountId}`, newBankAccountTag)
      .then((resp) => {
        setAllBankAccountTag([...allBankAccountTag, resp.data]);
        toast.success("Concepto de Cuenta insertado correctamente");
        closeModal();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const deleteBankAccountTag = async (id: number, closeModal: Function) => {
    setIsFetching(true);

    await query
      .deleteAPI(`/administration/bank/tag/${id}`, {})
      .then(() => {
        setAllBankAccountTag(
          allBankAccountTag.filter((item) => item.id !== Number(id))
        );
        toast.success("Se eliminó el Concepto de la Cuenta correctamente");
      })
      .catch((error) => manageErrors(error));

    closeModal();
    setIsFetching(false);
  };

  const getAllBankAccountTagOutFilter = async () => {
    setOutLoading(true);

    await query
      .get(`/administration/bank/tag/${bankAccountId}`)

      .then((resp) => {
        setAllBankAccountTag(resp.data.items);

        setPaginateTag({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getBankAccountTag = async (id: number) => {
    setIsLoading(true);

    await query
      .get(`/administration/bank/tag/${bankAccountId}`)

      .then((resp) => {
        setBankAccountTag(resp.data.items);
      })
      .catch((e) => manageErrors(e));

    setIsLoading(false);
  };

  const getBankAccountTagConfig = async (id: number) => {
    setOutLoading(true);
    setAllBankAccountTag([]);

    await query
      .get(`/administration/bank/tag/${id}`)
      .then((resp) => {
        setAllBankAccountTag(resp.data.items);
      })
      .catch((e) => manageErrors(e));

    setOutLoading(false);
  };

  const updateBankAccountTag = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);

    await query
      .patch(`/administration/bank/tag/${id}`, data)

      .then((resp) => {
        const updated = allBankAccountTag;
        updated.splice(
          allBankAccountTag.findIndex((item) => item.id === resp.data.id),
          1,
          resp.data
        );
        setAllBankAccountTag(updated);
        setBankAccountTag({ ...bankAccountTag, ...resp.data });
        toast.success("Concepto actualizado con éxito");
      })
      .catch((e) => manageErrors(e));
    callback();
    setIsFetching(false);
  };

  //--------------------- ACCOUNT REPORTS ---------------------------------------

  const getAllBalanceBankAccount = async () => {
    setOutLoading(true);

    await query
      .get(`/administration/bank/report/balance`)

      .then((resp) => {
        setBalanceBankAccount(resp.data);
      })
      .catch((e) => manageErrors(e));

    setOutLoading(false);
  };

  const changeTotalReportState = (idx: number, checked: boolean) => {
    if (balanceBankAccount) {
      const newBalanceBankAccount = [...balanceBankAccount];

      newBalanceBankAccount.splice(idx, 1, {
        ...balanceBankAccount[idx],
        active: checked,
      });

      setBalanceBankAccount(newBalanceBankAccount);
    }
  };

  //--------------------- FINANCIAL REPORTS ---------------------------------------

  const getAllFinancialBankAccount = async (filter: {
    accountIds: number[];
    dateTo: number;
    dateFrom: number;
    codeCurrency: number;
  }) => {
    setIsFetching(true);

    await query
      .post(`/administration/bank/report/financial`, filter)

      .then((resp) => {
        setFinancialBankAccount(resp.data);
      })
      .catch((e) => manageErrors(e));

    setIsFetching(false);
  };

  //-------- FUND DESTINATIONS

  const geFundDestinatios = async (areaId: number) => {
    setIsLoading(true);

    await query
      .get(`/administration/funddestination/${areaId}`)
      .then((resp) => {
        setFundDestinationArea(resp.data.items);

        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addFundDestinations = async (
    data: Partial<FundDestinationInterface>,
    closeModal: Function
  ) => {
    setIsFetchingB(true);

    await query
      .post(`/administration/funddestination/`, data)
      .then((resp) => {
        setFundDestinationArea([resp.data, ...fundDestinationArea]);

        closeModal();
        toast.success("Destino de fondo insertado correctamente");
      })
      .catch((error) => manageErrors(error));

    setIsFetchingB(false);
  };

  const updateFundDestinations = async (
    id: string,
    data: Partial<FundDestinationInterface>,
    closeModal: Function
  ) => {
    setIsFetchingB(true);

    await query
      .patch(`/administration/funddestination/${id}`, data)

      .then((resp) => {
        const new_data = fundDestinationArea;
        new_data.splice(
          fundDestinationArea.findIndex((item) => item.id === resp.data.id),
          1,
          resp.data
        );

        setFundDestinationArea(new_data);

        toast.success("Concepto actualizado con éxito");
      })
      .catch((e) => manageErrors(e));

    closeModal();
    setIsFetchingB(false);
  };

  const deleteFundDestinations = async (id: number, callback: Function) => {
    setIsFetchingB(true);

    await query
      .deleteAPI(`/administration/funddestination/${id}`, {})
      .then(() => {
        setFundDestinationArea(
          fundDestinationArea.filter((item) => item.id !== Number(id))
        );
        toast.success("Se eliminó el destino de fondo correctamente");
      })
      .catch((error) => manageErrors(error));

    callback();
    setIsFetchingB(false);
  };

  const getAccountInfo = async (id: string) => {
    setOutLoading(true);
    await Promise.all([
      query.get(`/administration/bank/account/${id}`),
      query.get(`/administration/bank/tag/${id}`),
      query.get(`/administration/bank/account/${id}/operation`),
    ])
      .then((resp) => {
        setBankAccount(resp[0].data);
        setAllBankAccountTag(resp[1].data.items);
        setPaginateTag({
          currentPage: resp[1].data.currentPage,
          totalItems: resp[1].data.totalItems,
          totalPages: resp[1].data.totalPages,
        });
        setAllBankAccountOperation(resp[2].data.items);
        setPaginateOperation({
          currentPage: resp[2].data.currentPage,
          totalItems: resp[2].data.totalItems,
          totalPages: resp[2].data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));
    setOutLoading(false);
  };

  const getMainTransferOfFounds = async (areaId: string) => {
    setIsLoading(true);
    await query
      .get(`/administration/funddestination/${areaId}`)
      .then((resp) => {
        setFundDestinationArea(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  // -----Records System-----
  const getAllRecords = async (
    id: number,
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/bank/account/${id}/records${generateUrlParams(filter)}`
      )
      .then((resp) => {
        setBankAccountRecords(resp.data.items);
        setPaginateRecords({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  // -----Acount Access------

  // that func get all users
  const getUserEnableAcount = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    if (typeof filter === "string" || "number") {
      await query
        .get(
          `/administration/bank/account/${bankAccountId}/user-enable-account?search=${filter}`
        )
        .then((resp) => {
          setUserEnableAcount(resp.data);
        })
        .catch((error) => manageErrors(error));
    } else {
      setUserEnableAcount(null);
    }
    setIsLoading(false);
  };

  // That func get the users except ( owner, users whit access )
  const getUserEnableAcountWhitoutAccess = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    if ((typeof filter === "string" || "number") && filter !== null) {
      setIsFetchingB(true);
      await query
        .get(
          `/administration/bank/account/${bankAccountId}/user-enable-account-add?search=${filter}`
        )
        .then((resp) => {
          setUserEnableAcountWithOutAccess(resp.data);
        })
        .catch((error) => manageErrors(error));
    } else {
      setUserEnableAcountWithOutAccess(null);
    }
    setIsFetchingB(false);
  };

  const getAllUserEnableAcountWhitoutAccess = async () => {
    setIsFetching(true);

    await query
      .get(
        `/administration/bank/account/${bankAccountId}/user-enable-account-add?search=${"   "}`
      )
      .then((resp) => {
        setAllUsersEnableAcountWithOutAccess(resp.data);
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const transferProperty = async (newOwnerId: string) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/account/${bankAccountId}/trasfer-account`, {
        newOwnerId,
      })
      .then(async (resp) => {
        toast.success("Cuenta transferida correctamente");
        await getAllBankAccount({ page: 1 });
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const addNewUserAccess = async (
    accountId: string,
    data: Record<string, any>,
    callback: Function
  ) => {
    setIsFetchingB(true);
    await query
      .post(`/administration/bank/account/${accountId}/add-user`, data)
      .then((resp) => {
        setBankAccount({
          ...bankAccount!,
          allowedUsers: [...bankAccount!.allowedUsers, ...resp.data],
        });
        callback();
      })
      .catch((error) => manageErrors(error));

    setIsFetchingB(false);
  };

  const deleteUserAccess = async (userId: string, callback?: Function) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/account/${bankAccountId}/delete-user`, {
        userId,
      })
      .then((resp) => {
        toast.success("Se le ha retirado el acceso al usuario correctamente");

        const allowedUsersFiltrated = bankAccount
          ? bankAccount?.allowedUsers.filter((user) => user.id !== userId)
          : [];
        bankAccount &&
          setBankAccount({
            ...bankAccount,
            allowedUsers: allowedUsersFiltrated,
          });
        callback && callback();
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  //Lists -------------------------------
  const addList = async (
    data: Partial<ListBalanceInterface>,
    closeModal: Function
  ) => {
    const newList = { ...data };
    setIsFetching(true);
    await query
      .post("/administration/bank/list", newList)
      .then((resp) => {
        setAllList([
          { ...resp.data, listName: resp.data.name, listId: resp.data.id },
          ...allList,
        ]);
        closeModal();
        toast.success("Lista insertada correctamente");
      })
      .catch((error) => manageErrors(error));

    setIsFetching(false);
  };

  const getAllList = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    await query
      .get(
        `/administration/bank/report/listbalance${generateUrlParams(filter)}`
      )
      .then((resp) => {
        setAllList(resp.data);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const updateList = async (
    id: number,
    data: BasicType,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/bank/list/${id}`, data)
      .then((resp) => {
        setAllList((prevList) =>
          prevList.map((item) =>
            item.listId === id
              ? { ...item, listId: id, listName: resp.data.name }
              : item
          )
        );
        callback && callback();
        toast.success("Lista actualizada con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteList = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/bank/list/${id}`, {})
      .then((resp) => {
        setAllList(allList.filter((list) => list.listId !== id));
        toast.success("Lista eliminada con éxito");
        callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const getAllBankAccountForList = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/bank/account${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllBankAccountForList(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addBankAccountToList = async (
    accountId: number,
    listId: number,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/bank/list/account/${accountId}/${listId}`, {})
      .then((resp) => {
        const update = allList.map((item) => {
          if (item.listId === listId) {
            return {
              ...resp.data,
              listId: resp.data.id,
              listName: resp.data.name,
              accountList: [...resp.data.accounts],
            };
          }
          return item;
        });
        setAllList(update);
        setAllBankAccountForList((prevState) =>
          prevState.filter((item) => item.id !== accountId)
        );
        closeModal();
        toast.success("Cuenta añadida a la lista correctamente");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const deleteBankAccountFromList = async (
    accountId: number,
    listId: number,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/bank/list/account/${accountId}/${listId}`, {})
      .then((resp) => {
        const update = allList.map((item) => {
          if (item.listId === listId) {
            return {
              ...resp.data,
              listId: resp.data.id,
              listName: resp.data.name,
              accountList: [...resp.data.accounts],
            };
          }
          return item;
        });
        setAllList(update);
        toast.success("Cuenta eliminada de la lista con éxito");
        closeModal();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  return {
    isLoading,
    setIsLoading,
    isFetching,
    isFetchingB,
    outLoading,
    paginate,
    paginateOperation,
    paginateTag,
    error,
    allBankAccount,
    bankAccount,
    getBankAccountDetails,
    getAllBankAccountWithOutFilter,
    getAllBankAccount,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    bankAccountTag,
    addAccountTag,
    getAllBankAccountTag,
    getBankAccountTag,
    getBankAccountTagConfig,
    allBankAccountTag,
    deleteBankAccountTag,
    getAllBankAccountTagOutFilter,
    setAllBankAccountTag,
    updateBankAccountTag,

    bankAccountOperation,
    setBankAccountOperation,
    allBankAccountOperation,
    getAllBankAccountOperations,
    addAccountOperations,
    getBankAccountOperation,
    deleteBankAccountOperation,
    updateBankAccountOperation,
    addAccountTransfer,

    balanceBankAccount,
    getAllBalanceBankAccount,
    changeTotalReportState,
    addExchangeCurrency,

    getAllFinancialBankAccount,
    financialBankAccount,
    geFundDestinatios,
    fundDestinationArea,
    addFundDestinations,
    updateFundDestinations,
    deleteFundDestinations,
    getAccountInfo,
    getMainTransferOfFounds,

    transferProperty,

    userEnableAcount,
    userEnableAcountWithOutAccess,
    allUsersEnableAcountWithOutAccess,
    getUserEnableAcount,
    getUserEnableAcountWhitoutAccess,
    getAllUserEnableAcountWhitoutAccess,

    getAllRecords,
    bankAccountRecords,
    paginateRecords,

    addNewUserAccess,
    deleteUserAccess,

    getAllList,
    allList,
    addList,
    updateList,
    deleteList,
    getAllBankAccountForList,
    allBankAccountForList,
    addBankAccountToList,
    deleteBankAccountFromList,
  };
};

export default useServerBankAccount;
