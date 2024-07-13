import {
  SendConfigUpdate,
} from "../../../../interfaces/ServerInterfaces";
import Toggle from "../../../../components/misc/Toggle";
import { SubmitHandler, useForm } from "react-hook-form";
import ButtonActualizado from "../../../../components/misc/ButtonActualizado";
import useServerBusiness from "../../../../api/useServerBusiness";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import LoadingSpin from "../../../../components/misc/LoadingSpin";
import { setDefaultBussiness } from "../../../../store/slices/nomenclatorSlice";

// @ts-ignore
const Configuration = ({ configurationsKey }) => {

  const dispatch = useAppDispatch()

  const { isLoading, isFetching, updateConfigBusiness, getBusiness } = useServerBusiness();
  const { businessId } = useParams();
  const { handleSubmit, control, watch } = useForm({
    mode: "onChange",
  });

  const list_convert_to_boolean = configurationsKey.map((item: any) => {
    return {
      key: item.key,
      value: item.value === "true",
    };
  });
  const module_accounts = list_convert_to_boolean.find(
    (p: any) => p.key === "module_accounts"
  )?.value;
  const module_production = list_convert_to_boolean.find(
    (p: any) => p.key === "module_production"
  )?.value;

  const module_human_resources = list_convert_to_boolean.find(
    (p: any) => p.key === "module_human_resources"
  )?.value;
  const module_duplicator = list_convert_to_boolean.find(
    (p: any) => p.key === "module_duplicator"
  )?.value;

  const duplicator_businessId = configurationsKey.filter(
    (config: { key: string; }) => config.key === "duplicator_businessId"
  )[0]?.value;

  const module_billing = list_convert_to_boolean.find(
    (p: any) => p.key === "module_billing"
  )?.value;

  const module_booking = list_convert_to_boolean.find(
    (p: any) => p.key === "module_booking"
  )?.value;

  useEffect(() => {
    dispatch(setDefaultBussiness(null))
    if (duplicator_businessId && module_duplicator) {
      getBusiness(duplicator_businessId, true)
    }
  }, [])

  const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (data) => {
    const configsSend: SendConfigUpdate = {
      configs: [
        {
          key: "module_accounts",
          value: data.module_accounts.toString(),
        },
        {
          key: "module_production",
          value: data.module_production.toString(),
        },
        {
          key: "module_human_resources",
          value: data.module_human_resources.toString(),
        },
        {
          key: "module_billing",
          value: data.module_billing.toString(),
        },
        {
          key: "module_booking",
          value: data.module_booking.toString(),
        },
      ],
    };

    if (data.module_duplicator_toggle) {
      configsSend.configs.push(
        {
          key: "duplicator_businessId",
          value: data.duplicator_businessId,
        },
        {
          key: "module_duplicator",
          value: "true",
        },
      )
    } else {
      configsSend.configs.push(
        {
          key: "module_duplicator",
          value: "false"
        }
      )
    }

    updateConfigBusiness!(businessId, configsSend);
    getBusiness(watch("duplicator_businessId"), true)
  };

  return (
    <>
      <div className='mt-1 min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pt-6 bg-white'>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='py-3'>
            <Toggle
              name='module_accounts'
              control={control}
              defaultValue={module_accounts}
              title='Cuentas bancarias'
            />
          </div>
          <div className='py-3'>
            <Toggle
              name='module_production'
              control={control}
              defaultValue={module_production}
              title='Procesos productivos'
            />
          </div>
         {/*  <div className='py-3'>
            <Toggle
              name='module_woocommerce'
              control={control}
              defaultValue={module_woocommerce}
              title='Woocommerce'
            />
          </div> */}
          <div className='py-3'>
            <Toggle
              name='module_human_resources'
              control={control}
              defaultValue={module_human_resources}
              title='Recursos humanos'
            />
          </div>
          <div className='py-3'>
            <Toggle
              name='module_duplicator_toggle'
              control={control}
              defaultValue={module_duplicator}
              title='Duplicador de valores'
            />
            {watch("module_duplicator_toggle") && (
              <div className="mt-2">
                {
                  isLoading ? (
                    <LoadingSpin color="black" />
                  ) : (
                    <AsyncComboBox
                      name="duplicator_businessId"
                      label="Negocio"
                      control={control}
                      dataQuery={{ url: `/control/business` }}
                      normalizeData={{ id: "id", name: "name", disabled:[Number(businessId!)] }}
                      rules={{ required: 'Campo requerido' }}
                      />
                  )
                }

              </div>
            )}
          </div>
          <div className='py-3'>
            <Toggle
              name='module_billing'
              control={control}
              defaultValue={module_billing}
              title='Facturación'
            />
          </div>
          <div className='py-3'>
            <Toggle
              name='module_booking'
              control={control}
              defaultValue={module_booking}
              title='Reservaciones'
            />
          </div>
          <div className='pt-6'>
            <div className='max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6'>
              <div className='float-right'>
                <ButtonActualizado
                  color='slate-600'
                  type='submit'
                  name='Actualizar'
                  loading={isFetching}
                  disabled={isLoading || isFetching}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};
export default Configuration;
