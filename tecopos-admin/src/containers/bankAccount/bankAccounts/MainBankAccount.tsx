import { useState, useEffect, createContext, useContext } from "react";

import ListOperations from "../operations/ListOperations";
import ListAccountTag from "../concepts/ListAccountTag";
import { DetailBankAccount } from "./DetailBankAccount";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import useServerBankAccount from "../../../api/useServerBankAccount";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import {
  BankAccountInterfaces,
  BankAccountOperationInterfaces,
  BankAccountRecordsInterface,
  BankAccountTagInterfaces,
  PaginateInterface,
} from "../../../interfaces/ServerInterfaces";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import SideNav from "../../../components/misc/SideNav";
import { UserAccess } from "../userAccess/UserAccess";
import { RecordsBankAccount } from "../records/RecordsBankAccount";
import { useAppSelector } from "../../../store/hooks";

//Bank Account context --------------------------------
interface AccountContextInterface {
  //General Info
  getAccountInfo: (id: number) => void;
  bankAccount: BankAccountInterfaces | null;
  outLoading: boolean;

  //Operations
  getAllBankAccountOperations: (
    accountId?: string,
    filter?: Record<string, string | number | boolean | null>
  ) => void;
  addAccountOperations: (
    accountId: string,
    data: BasicType,
    closeModal: Function
  ) => void;
  updateBankAccountOperation: (
    id: number,
    data: Record<string, string | number | boolean>,
    closeModal: Function
  ) => Promise<void>;
  deleteBankAccountOperation: (accountId: number, callback: Function) => void;
  allBankAccountOperation: BankAccountOperationInterfaces[];
  paginateOperation: PaginateInterface | null;
  addAccountTransfer: (
    id: string,
    data: BasicType,
    closeModal: Function
  ) => void;
  addExchangeCurrency: (
    id: string,
    data: BasicType,
    closeModal: Function
  ) => void;

  //Tags
  paginateTag: PaginateInterface | null;
  addAccountTag: Function;
  getAllBankAccountTag: (filter: BasicType) => void;
  updateBankAccountTag: (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => Promise<void>;
  deleteBankAccountTag: Function;
  allBankAccountTag: BankAccountTagInterfaces[];

  //Bank Account
  updateBankAccount: (id: string, data: BasicType) => Promise<void>;
  deleteBankAccount: (id: number, callback: Function) => void;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingB: boolean;

  // UserEnableAcount
  userEnableAcount: any;
  userEnableAcountWithOutAccess: any;
  allUsersEnableAcountWithOutAccess: any;
  getUserEnableAcount: Function;
  getUserEnableAcountWhitoutAccess: Function;
  getAllUserEnableAcountWhitoutAccess: Function;

  // RecordSys
  bankAccountRecords: BankAccountRecordsInterface[];
  paginateRecords: any;
  getAllRecords: Function;

  // userAcess
  addNewUserAccess: Function;
  deleteUserAccess: Function;
}

const detailProdContext: Partial<AccountContextInterface> = {};

export const DetailAccountContext = createContext(detailProdContext);

const MainBankAccount = () => {
  // hooks
  const navigate = useNavigate();
  const { bankAccountId } = useParams();
  const { user } = useAppSelector((state) => state.init);
  const {
    getAccountInfo,
    bankAccount,
    outLoading,

    userEnableAcount,
    userEnableAcountWithOutAccess,
    allUsersEnableAcountWithOutAccess,
    getUserEnableAcount,
    getUserEnableAcountWhitoutAccess,
    getAllUserEnableAcountWhitoutAccess,

    bankAccountRecords,
    getAllRecords,
    paginateRecords,

    getAllBankAccountOperations,
    allBankAccountOperation,
    addAccountOperations,
    updateBankAccountOperation,
    deleteBankAccountOperation,
    addAccountTransfer,
    addExchangeCurrency,
    paginateOperation,

    paginateTag,

    allBankAccountTag,
    getAllBankAccountTag,
    addAccountTag,
    updateBankAccountTag,
    deleteBankAccountTag,
    updateBankAccount,
    deleteBankAccount,

    addNewUserAccess,
    deleteUserAccess,

    isLoading,
    isFetching,
    isFetchingB,
  } = useServerBankAccount();

  // Effects
  useEffect(() => {
    getAccountInfo(bankAccountId!);
  }, []);

  //TabNav Data for Bank Account Area------------------------------------------------------------
  const [currentBankAccountTab, setCurrentBankAccountTab] =
    useState("operations");

  const bankAccountsTabs = [
    {
      name: "Operaciones",
      href: "operations",
      current: currentBankAccountTab === "operations",
    },
    {
      name: "Conceptos",
      href: "concepts",
      current: currentBankAccountTab === "concepts",
    },
    {
      name: "Detalles",
      href: "details",
      current: currentBankAccountTab === "details",
    },
  ];
  if (bankAccount?.owner?.id === user?.id || user?.isSuperAdmin) {
    bankAccountsTabs.push({
      name: "Trazas",
      href: "traces",
      current: currentBankAccountTab === "traces",
    });

    bankAccount?.isPrivate &&
      bankAccountsTabs.push({
        name: "Accesos a usuario",
        href: "access",
        current: currentBankAccountTab === "access",
      });
  }

  //---------------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Cuentas bancarias",
      action: () => navigate("/bank_accounts"),
    },
  ];

  bankAccount &&
    paths.push({
      name: bankAccount.name,
    });

  //------------------------------------------------------------------------------------
  if (outLoading)
    return (
      <SpinnerLoading
        className="flex flex-col h-full justify-center items-center"
        text="Cargando información de la cuenta"
      />
    );
  return (
    <>
      <Breadcrumb
        icon={<CreditCardIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      {/* Provider */}
      <DetailAccountContext.Provider
        value={{
          bankAccount,
          userEnableAcount,
          userEnableAcountWithOutAccess,
          getUserEnableAcount,
          getUserEnableAcountWhitoutAccess,
          allUsersEnableAcountWithOutAccess,
          getAllUserEnableAcountWhitoutAccess,
          addNewUserAccess,
          deleteUserAccess,
          bankAccountRecords,
          getAllRecords,
          paginateRecords,
          allBankAccountOperation,
          getAllBankAccountOperations,
          addAccountOperations,
          updateBankAccountOperation,
          deleteBankAccountOperation,
          addAccountTransfer,
          addExchangeCurrency,
          paginateOperation,
          paginateTag,
          allBankAccountTag,
          getAllBankAccountTag,
          addAccountTag,
          updateBankAccountTag,
          deleteBankAccountTag,
          updateBankAccount,
          deleteBankAccount,
          isLoading,
          isFetching,
          isFetchingB,
        }}
      >
        {/* Details Lists and Sidebar */}
        <div className="sm:grid grid-cols-10 gap-3">
          <SideNav
            tabs={bankAccountsTabs}
            action={(to: string) => setCurrentBankAccountTab(to)}
            className="col-span-10 sm:col-span-2"
          />

          <div className="sm:col-span-8 pl-3">
            {currentBankAccountTab === "operations" && <ListOperations />}
            {currentBankAccountTab === "concepts" && <ListAccountTag />}
            {currentBankAccountTab === "details" && <DetailBankAccount />}
            {currentBankAccountTab === "access" && <UserAccess />}
            {currentBankAccountTab === "traces" && <RecordsBankAccount />}
          </div>
        </div>
      </DetailAccountContext.Provider>
    </>
  );
};

export default MainBankAccount;
