import { useEffect, useState } from "react";
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
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { cleanObj } from "../../../../utils/helpers";

interface NewFundDestinationsProp {
  currentArea: AreasInterface | null;
  addFundDestinations: Function;
  loading: boolean;
  outLoading: boolean;
  selectAccountData: SelectInterface[];
  setAllBankAccountTag: Function;
  fundDestinationArea: FundDestinationInterface[];
  setOpenModal: Function;
}

const NewFundDestinations = ({
  currentArea,
  addFundDestinations,
  loading,
  setAllBankAccountTag,
  fundDestinationArea,
  setOpenModal,
}: NewFundDestinationsProp) => {
  const { handleSubmit, control, getValues, watch } = useForm();

  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
    data.areaId = currentArea?.id ?? "";
    addFundDestinations(cleanObj(data), setOpenModal);
  };

  const { business } = useAppSelector((state) => state.init);

  useEffect(() => {
    setAllBankAccountTag([]);
  }, []);

  const selectDataCodeCurrency: SelectInterface[] = [];

  business?.availableCurrencies.map((item) => {
    selectDataCodeCurrency.push({
      id: item.code,
      name: item.code,
      disabled: false,
    });
  });

  const accountId = watch("accountId");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        <div className="py-3">
          <AsyncComboBox
            name="accountId"
            dataQuery={{
              url: "/administration/bank/account",
              defaultParams: { inAllMyBusiness: true },
            }}
            normalizeData={{ id: "id", name: "name" }}
            label="Cuenta *"
            control={control}
            rules={{ required: "Este campo es requerido" }}
          />
        </div>

        <div className="py-2">
          <AsyncComboBox
            name="accountTagId"
            label="Concepto"
            dataQuery={{
              url: `/administration/bank/tag/${accountId}`,
              defaultParams: { all_data: true },
            }}            
            normalizeData={{ id: "id", name: "name" }}
            control={control}
            disabled={!accountId}
            dependendValue={{accountId}}
          />
        </div>

        {fundDestinationArea.some((item) => item.default === true) ===
          false && (
          <div className="py-1">
            <Toggle
              name="default"
              control={control}
              title="Destino de fondo por defecto"
            />
          </div>
        )}

        {!watch("default") && (
          <>
            <div className="py-3">
              <ComboBox
                name="codeCurrency"
                data={selectDataCodeCurrency}
                label="Código de Moneda *"
                control={control}
                rules={{ required: "Este campo es requerido" }}
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
                label="Tipo de Pago *"
                control={control}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>
          </>
        )}

        <div className="py-2">
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6">
            <Button
              color="slate-600"
              type="submit"
              name="Registrar"
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default NewFundDestinations;
