/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { GiCheckMark, GiCardExchange } from "react-icons/gi";
import useServerBusiness from "../../api/useServerBusiness";
import Input from "../../components/forms/Input";
import Toggle from "../../components/forms/Toggle";
import StateSpanForTable from "../../components/misc/badges/StateSpanForTable";
import Button from "../../components/misc/Button";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import Modal from "../../components/modals/GenericModal";
import { CurrencyInterface } from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import { Cog8ToothIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import PriceChangeModal from "./PriceChangeModal";
// import ElToqueComponent from "./ElToqueComponent";

const CurrenciesConfig = () => {
  const { business } = useAppSelector((state) => state.init);
  const {
    getCurrencies,
    updateCurrencies,
    allCurrencies,
    isLoading,
    isFetching,
    ModifyProductPricesFromReference,
    TransformProductPrices
  } = useServerBusiness();
  const initState = { state: false };
  const [modalState, setModalState] = useState<{
    state: boolean;
    data?: CurrencyInterface;
  }>(initState);

  const [priceChange, setPriceChange] = useState<boolean>(false);

  useEffect(() => {
    getCurrencies();
  }, []);

  //Table data --------------------------------------------------------------
  const titles = ["Moneda", "Principal", "Estado"];
  const data: DataTableInterface[] =
    allCurrencies.map((item) => ({
      rowId: item.id,
      payload: {
        Moneda: item.currency?.name,
        Principal: <div className="flex justify-center">{item.isMain ? <GiCheckMark /> : ""}</div>,
        Estado: (
          <StateSpanForTable
            currentState={item.isActive}
            greenState={"Activa"}
            redState={"Desactivada"}
          />
        ),
      },
    })) ?? [];

  const rowAction = (id: number) => {
    const currentCurrency = allCurrencies.find((item) => item.id === id);
    if (currentCurrency?.isMain) {
      toast.error("No puede realizar cambios en la moneda principal")
    } else {
      setModalState({ state: true, data: currentCurrency });
    }

  };

  //-----------------------------------------------------------------------------

  const FormModalAction = (data: Record<string, number>) => {

    const {
      oficialExchangeRate,
      exchangeRate,
      isActive,
      replyToChilds,
    } = data

      updateCurrencies(modalState.data?.id!, {
        oficialExchangeRate,
        exchangeRate,
        isActive,
        replyToChilds
      }, () =>
        setModalState(initState)
      );
   
  };

  const formAction = (data: Record<string, number>) => {

    const {
      mode,
      codeCurrency,
      percent,
      adjustType,
      adjustRound, /*Array */
      priceSystemId,


      oficialExchangeRate,
      exchangeRate,
      isActive,
      replyToChilds,
      propagateToAllChilds
    } = data

    //@ts-ignore
    if (propagateToAllChilds === false) {
      updateCurrencies(modalState.data?.id!, {
        oficialExchangeRate,
        exchangeRate,
        isActive,
        replyToChilds
      }, () =>
        setModalState(initState)
      );
    }

    //@ts-ignore
    if (propagateToAllChilds === true) {
      if (mode === undefined) {
        toast.error("Seleccione si aumentar o disminuir los precios.")
      } else {
        if (adjustType === undefined) {
          toast.error("Seleccione un tipo de ajuste.")
        } else {

          if (adjustRound !== undefined) {
            TransformProductPrices({
              mode,
              codeCurrency,
              percent,
              adjustType,
              //@ts-ignore
              adjustRound: adjustRound.join(","),
              propagateToAllChilds,
              priceSystemId
            }, ()=> setPriceChange(false))
          } else {
            TransformProductPrices({
              mode,
              codeCurrency,
              percent,
              adjustType,
              propagateToAllChilds,
              priceSystemId
            }, ()=> setPriceChange(false))
          }



        }
      }
    }
  };

  const modifyProductPricesAction = (data: Record<string, number>) => {

    ModifyProductPricesFromReference(data, () => setPriceChange(false))

  }

  //Breadcrumb ----------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Monedas",
    },
  ];
  //-----------------------------------------------------------------------------------------
  const actions = [
    {
      title: 'Cambio de precios',
      action: () => setPriceChange(true),
      icon: <GiCardExchange className='h-5' />,
    },
  ];
  return (
    <div>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableData={data}
        tableTitles={titles}
        rowAction={rowAction}
        loading={isLoading}
        actions={actions}
      />

      {/* <ElToqueComponent/> */}

      {modalState.state && (
        <Modal state={modalState.state} close={() => setModalState(initState)}>
          <FormModal
            mainCurrency={business?.mainCurrency ?? ""}
            data={modalState.data}
            action={FormModalAction}
            isFetching={isFetching}
          />
        </Modal>
      )}

      {priceChange && (
        <Modal state={priceChange} close={() => setPriceChange(false)}>
          <PriceChangeModal
            modifyProductPricesAction={modifyProductPricesAction}
            formAction={formAction}
            isFetching={isFetching}
          />
        </Modal>
      )}
    </div>
  );
};

//=======================================================================================

interface FormModalInterface {
  action: Function;
  data?: CurrencyInterface;
  mainCurrency: string;
  isFetching: boolean;
}

const FormModal = ({
  mainCurrency,
  data,
  action,
  isFetching,
}: FormModalInterface) => {

  const { business } = useAppSelector((state) => state.init);
  const { control, handleSubmit, watch } = useForm();
  const onSubmit: SubmitHandler<Record<string, number>> = (formData) => {
    const { oficialExchangeRate, isActive, replyToChilds, exchangeRate } = formData
    action({ oficialExchangeRate, isActive, replyToChilds, propagateToAllChilds: false, exchangeRate });
  };

  const enable_oficial_exchange_rate = business?.configurationsKey.find(elem => elem.key === "enable_oficial_exchange_rate")?.value === "true"

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        {
          (watch("isActive") ?? data?.isActive) && (
            <p className="font-semibold py-2">Tasa aplicada</p>
          )
        }
        <div className="inline-flex w-full justify-between gap-3 items-center ml-2">
          <div className="inline-flex w-full items-center gap-3">
            <p className="font-semibold">1 {data?.currency.code}  = </p>
            <span><Input
              name="exchangeRate"
              control={control}
              defaultValue={data?.exchangeRate}
              type="number"
              numberAsCurrency={{ precision: 10 }}
            /></span>
            <p className="font-semibold">{mainCurrency}</p>
          </div>
          <div className="flex items-center">
            {
              (watch("exchangeRate") !== undefined && ((((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100) > 0 || (((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100) < 0))
                ? (((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100) > 0
                  ? <ArrowUpIcon className="h-6 text-green-500" />
                  : <ArrowDownIcon className="h-6 text-red-500" />
                : ""
            }
            {
              (watch("exchangeRate") !== undefined && ((((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100) > 0 || (((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100) < 0)) && <p className="text-2xl font-thin whitespace-nowrap self-center">  {(((watch("exchangeRate") - data?.exchangeRate!) / data?.exchangeRate!) * 100).toFixed(2)} %</p>
            }

          </div>
        </div>

        {
          (enable_oficial_exchange_rate && (watch("isActive") ?? data?.isActive)) && (
            <>
              <p className="font-semibold py-2">Tasa oficial</p>

              <div className="inline-flex w-full justify-between gap-3 items-center ml-2">
                <div className="inline-flex w-full items-center gap-3">
                  <p className="font-semibold">1 {data?.currency.code}  = </p>
                  <span><Input
                    name="oficialExchangeRate"
                    control={control}
                    defaultValue={data?.oficialExchangeRate}
                    type="number"
                    numberAsCurrency={{ precision: 10 }}
                  /></span>
                  <p className="font-semibold">{mainCurrency}</p>
                </div>
                <div className="flex items-center">
                  {
                    (watch("oficialExchangeRate") !== undefined && ((((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100) > 0 || (((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100) < 0))
                      ? (((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100) > 0
                        ? <ArrowUpIcon className="h-6 text-green-500" />
                        : <ArrowDownIcon className="h-6 text-red-500" />
                      : ""
                  }
                  {
                    (watch("oficialExchangeRate") !== undefined && ((((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100) > 0 || (((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100) < 0)) && <p className="text-2xl font-thin whitespace-nowrap self-center">  {(((watch("oficialExchangeRate") - data?.oficialExchangeRate!) / data?.oficialExchangeRate!) * 100).toFixed(2)} %</p>
                  }

                </div>
              </div>
            </>
          )
        }

        <Toggle
          name="isActive"
          control={control}
          defaultValue={data?.isActive}
          title="Activa"
        />

        {business!.mode === 'GROUP' && (
          <>
            <Toggle
              name="replyToChilds"
              control={control}
              title="Replicar en todos mis negocios hijos"
            />
            {
              watch("replyToChilds") && (
                <p className="text-red-600">La réplica solo será efectiva en los negocios que compartan la misma moneda principal</p>
              )
            }
          </>

        )
        }

        {/* ------------------------------------------------------------------------------------k */}



        <div className="flex justify-end mt-10">
          <Button
            type="submit"
            color="slate-600"
            name="Actualizar"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default CurrenciesConfig;
