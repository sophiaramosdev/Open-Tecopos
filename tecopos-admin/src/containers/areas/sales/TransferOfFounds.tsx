import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import Toggle from "../../../components/forms/Toggle";
import useServerArea from "../../../api/useServerArea";
import useServerBankAccount from "../../../api/useServerBankAccount";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import Paginate from "../../../components/misc/Paginate";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { translatePaymetMethods } from "../../../utils/translate";
import { Check } from "heroicons-react";
import Modal from "../../../components/modals/GenericModal";
import NewFundDestinations from "./fundDestinatios/NewFundDestinations";
import { FundDestinationInterface } from "../../../interfaces/ServerInterfaces";
import EditFundDestinations from "./fundDestinatios/EditFundDestinations";

const TransferOfFounds = () => {
  const { isFetching, updateArea } = useServerArea();
  const {
    isLoading,
    outLoading,
    isFetchingB,
    paginate,
    allBankAccount,
    allBankAccountTag,
    fundDestinationArea,
    getBankAccountTagConfig,
    addFundDestinations,
    setAllBankAccountTag,
    updateFundDestinations,
    deleteFundDestinations,
    getMainTransferOfFounds,
  } = useServerBankAccount();

  const { areaId } = useParams();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { control, watch, getValues } = useForm({
    mode: "onChange",
  });
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });
  const [openDetailModal, setOpenDetailModal] = useState<boolean>(false);
  const [currentFundDestinations, setFundDestinations] =
    useState<FundDestinationInterface | null>(null);

  const currentArea = areas.find((item) => item.id === Number(areaId));

  useEffect(() => {
    getMainTransferOfFounds(areaId!);
  }, []);

  const changeToggleAndSubmit = () => {
    const data = getValues();
    updateArea(Number(areaId), data);
  };

  // Llenar el comboBox de Cuentas bancarias ------------------------
  const selectAccountData: SelectInterface[] = [];
  allBankAccount.map((item) => {
    selectAccountData.push({
      id: item.id,
      name: item.name,
    });
  });

  //-- Llenar el comboBox de Conceptos

  const titles: string[] = [
    "Cuenta",
    "Concepto",
    "Código moneda",
    "Tipo de pago",
    "Por defecto",
  ];
  const displayData: Array<DataTableInterface> = [];

  fundDestinationArea.forEach((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Cuenta: `${item.account.name} ${
          item.account?.code ? `(${item.account.code})` : ""
        }`,
        Concepto: item.accountTag !== null ? item.accountTag.name : "---",
        "Código moneda": item.codeCurrency,
        "Tipo de pago": translatePaymetMethods(item.paymentWay),
        "Por defecto": item.default && (
          <span className="flex justify-center rounded-full text-sm text-green-700 font-semibold text-center">
            <Check className="h-6" />
          </span>
        ),
      },
    })
  );

  const actions = [
    {
      icon: (
        <PlusIcon className="h-7" title="Agregar nuevo destino de fondos" />
      ),
      action: () => setOpenModal(true),
      title: "Nuevo destino de fondos",
    },
  ];

  //Action after click in RowTable
  const rowAction = (id: number) => {
    setOpenDetailModal(true);
    setFundDestinations(
      fundDestinationArea.find((item) => item.id === id) ?? null
    );
  };

  //-----------------------------------------------------------------------------

  const defaultTransferFounds: boolean =
    watch("transferFoundsAfterClose") ?? currentArea?.transferFoundsAfterClose;

  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form>
          <div className="py-1">
            <Toggle
              name="transferFoundsAfterClose"
              control={control}
              defaultValue={defaultTransferFounds}
              changeState={changeToggleAndSubmit}
              title="Transferir fondos luego de cerrar el ciclo económico"
            />
          </div>
        </form>
        {defaultTransferFounds && (
          <div className="pt-7">
            <GenericTable
              tableTitles={titles}
              tableData={displayData}
              actions={actions}
              rowAction={rowAction}
              paginateComponent={
                <Paginate
                  action={(page: number) => setFilter({ ...filter, page })}
                  data={paginate}
                />
              }
              loading={isLoading}
            />
          </div>
        )}
      </div>

      {openModal && (
        <Modal state={openModal} close={() => setOpenModal(false)} size="m">
          <NewFundDestinations
            fundDestinationArea={fundDestinationArea}
            currentArea={currentArea ?? null}
            selectAccountData={selectAccountData}
            addFundDestinations={addFundDestinations}
            loading={isFetchingB}
            outLoading={outLoading}
            setAllBankAccountTag={setAllBankAccountTag}
            setOpenModal={() => setOpenModal(false)}
          />
        </Modal>
      )}

      {openDetailModal && (
        <Modal state={openDetailModal} close={setOpenDetailModal} size="m">
          <EditFundDestinations
            allBankAccountTag={allBankAccountTag}
            currentArea={currentArea ?? null}
            loading={isFetchingB}
            outLoading={outLoading}
            selectAccountData={selectAccountData}
            getBankAccountTagConfig={getBankAccountTagConfig}
            setAllBankAccountTag={setAllBankAccountTag}
            fundDestinationArea={fundDestinationArea}
            currentFundDestinations={currentFundDestinations ?? null}
            setOpenModal={() => setOpenModal(false)}
            setOpenDetailModal={() => setOpenDetailModal(false)}
            updateFundDestinations={updateFundDestinations}
            deleteFundDestinations={deleteFundDestinations}
          />
        </Modal>
      )}
    </>
  );
};

export default TransferOfFounds;
