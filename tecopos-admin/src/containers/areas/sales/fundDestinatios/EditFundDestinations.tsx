import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  AreasInterface,
  BankAccountTagInterfaces,
  FundDestinationInterface,
} from "../../../../interfaces/ServerInterfaces";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import ComboBox from "../../../../components/forms/Combobox";
import Button from "../../../../components/misc/Button";
import { translatePaymetMethods } from "../../../../utils/translate";
import Toggle from "../../../../components/forms/Toggle";
import Modal from "../../../../components/modals/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { TrashIcon } from "@heroicons/react/24/outline";

interface NewFundDestinationsProp {
  allBankAccountTag: BankAccountTagInterfaces[] | [];
  currentArea: AreasInterface | null;
  loading: boolean;
  outLoading: boolean;
  selectAccountData: SelectInterface[];
  getBankAccountTagConfig: Function;
  setAllBankAccountTag: Function;
  fundDestinationArea: FundDestinationInterface[];
  currentFundDestinations: FundDestinationInterface | null;
  setOpenModal: Function;
  setOpenDetailModal: Function;
  updateFundDestinations: Function;
  deleteFundDestinations: Function;
}

const EditFundDestinations = ({
  allBankAccountTag,
  currentFundDestinations,
  loading,
  outLoading,
  getBankAccountTagConfig,
  setAllBankAccountTag,
  fundDestinationArea,
  setOpenDetailModal,
  updateFundDestinations,
  deleteFundDestinations,
}: NewFundDestinationsProp) => {
  const { handleSubmit, control, unregister, getValues, watch } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    const send_data = {
      codeCurrency: getValues("codeCurrency"),
      paymentWay: getValues("paymentWay"),
      default: getValues("default"),
      accountId: getValues("accountId"),
      accountTagId: getValues("accountTagId"),
    };

    updateFundDestinations(
      currentFundDestinations?.id,
      send_data,
      setOpenDetailModal
    );
  };

  const { business } = useAppSelector((state) => state.init);

  const [deleteModal, setdeleteModal] = useState(false);

  const [currentBankAccount, setCurrentBankAccount] = useState<number>(
    Number(currentFundDestinations?.account.id) ?? 0
  );

  useEffect(() => {
    if (currentFundDestinations?.id !== 0) {
      getBankAccountTagConfig(Number(currentBankAccount));
    } else {
      setAllBankAccountTag([]);
    }
  }, [currentBankAccount]);

  const selectDataAccountTag: SelectInterface[] = [];

  selectDataAccountTag.push({ id: null, name: "Busque o seleccione" });

  allBankAccountTag.map((item) => {
    selectDataAccountTag.push({
      id: item.id,
      name: item.name,
      disabled: false,
    });
  });

  let default_accountTag = null;

  if (currentFundDestinations?.accountTag !== null) {
    default_accountTag = currentFundDestinations?.accountTag.id;
  }

  const selectDataCodeCurrency: SelectInterface[] = [];

  //selectDataAccountTag.push({id: null, name: 'Busque o seleccione'});

  business?.availableCurrencies.map((item) => {
    selectDataCodeCurrency.push({
      id: item.code,
      name: item.code,
      disabled: false,
    });
  });

  //--------------------------------------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-4 py-3 text-right sm:px-6">
          <button
            onClick={() => setdeleteModal(true)}
            type="button"
            className="inline-flex items-center rounded-md border border-red-500  bg-red-50 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-50 focus:ring-offset-2"
          >
            <TrashIcon className="h-5 text-red-500" />
          </button>
        </div>

        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
          <div className="py-3">
            <AsyncComboBox
              name="accountId"
              dataQuery={{
                url: "/administration/bank/account",
                defaultParams: { inAllMyBusiness: true },
              }}
              normalizeData={{ id: "id", name: ["name", "code"], format: "name (code)"  }}
              label="Cuenta *"
              control={control}
              defaultItem={
                currentFundDestinations?.account
                  ? {
                      id: currentFundDestinations?.account.id,
                      name: currentFundDestinations?.account.name,
                    }
                  : undefined
              }
              rules={{ required: "Este campo es requerido" }}
            />
          </div>

          <div className="py-2">
            <ComboBox
              loading={outLoading}
              name="accountTagId"
              data={selectDataAccountTag.map((item) => ({
                id: item.id,
                name: item.name,
              }))}
              label="Concepto"
              control={control}
              disabled={!currentBankAccount && !allBankAccountTag}
              defaultValue={default_accountTag}
            />
          </div>

          {currentFundDestinations?.default ? (
            <div className="py-1">
              <Toggle
                name="default"
                control={control}
                defaultValue={currentFundDestinations?.default}
                title="Destino de fondo por defecto"
              />
            </div>
          ) : (
            fundDestinationArea.some((item) => item.default === true) ===
              false && (
              <div className="py-1">
                <Toggle
                  name="default"
                  control={control}
                  title="Destino de fondo por defecto"
                />
              </div>
            )
          )}

          {!(watch("default") ?? currentFundDestinations?.default) && (
            <>
              <div className="py-3">
                <ComboBox
                  name="codeCurrency"
                  data={selectDataCodeCurrency}
                  label="Código de moneda *"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  defaultValue={currentFundDestinations?.codeCurrency}
                />
              </div>

              <div className="py-3">
                <ComboBox
                  name="paymentWay"
                  data={
                    business?.configurationsKey
                      ?.find((item) => item.key === "payment_methods_enabled")
                      ?.value.split(",")
                      .map((value) => ({
                        id: value,
                        name: translatePaymetMethods(value),
                      })) ?? []
                  }
                  label="Tipo de pago *"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  defaultValue={currentFundDestinations?.paymentWay}
                />
              </div>
            </>
          )}

          <div className="py-2">
            <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
              <Button
                color="slate-600"
                type="submit"
                name="Actualizar"
                loading={loading}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </form>

      {deleteModal && (
        <Modal close={setdeleteModal} state={deleteModal}>
          <AlertContainer
            title={`¡Eliminar destino de fondo!`}
            onAction={() =>
              deleteFundDestinations(
                currentFundDestinations?.id,
                setOpenDetailModal
              )
            }
            onCancel={() => setdeleteModal(false)}
            text={`¿Seguro que desea eliminar este destino de fondo?`}
            loading={loading}
          />
        </Modal>
      )}
    </>
  );
};

export default EditFundDestinations;
