import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";

import Button from "../../../components/misc/Button";

import { convertBoolean } from "../../../utils/translate";
import ComboBox from "../../../components/forms/Combobox";

import Toggle from "../../../components/forms/Toggle";
import { create_array_number, getTimeArray } from "../../../utils/helpers";
import useServer from "../../../api/useServerMain";
import { ConfigUpdate, SendConfigUpdate } from "../../../interfaces/Interfaces";
import Select from "../../../components/forms/Select";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import Modal from "../../../components/misc/GenericModal";


const ConfigGeneral = () => {

  const { isLoading, isFetching, EditBussinesAdjustment } = useServer();

  const { business } = useAppSelector((state) => state.init);

  const { control, handleSubmit, watch } = useForm({ mode: "onChange" });

  const onSubmit: SubmitHandler<Record<string, string | number | boolean | string[]>> = (
    data
  ) => {

    let configsSend: SendConfigUpdate = {
      configs: []
    }

    const config: ConfigUpdate[] = [];

    config.push({
      key: 'show-menu-in-pos',
      value: data.show_menu_in_pos.toString()
    });

    config.push({
      key: 'is-economiccycle-automated',
      value: data.is_economiccycle_automated.toString()
    });

    if (is_economiccycle_automated_toggle === true) {
      config.push({
        key: 'economiccycle-startAt',
        value: data.economiccycle_startAt.toString()
      });
    }

    config.push({
      key: 'shifts_management',
      value: data.shifts_management.toString()
    });

    config.push({
      key: 'precission_after_coma',
      value: data.precission_after_coma.toString()
    });

    config.push({
      key: 'unify_categories_stock_sale',
      value: data.unify_categories_stock_sale.toString()
    });

    config.push({
      key: 'transfer_orders_to_next_economic_cycle',
      value: data.transfer_orders_to_next_economic_cycle.toString()
    });

    config.push({
      key: 'force_access_system',
      value: data.force_access_system.toString()
    });

    config.push({
      key: 'enable_notifications_in_tablet',
      value: data.enable_notifications_in_tablet.toString()
    });

    config.push({
      key: 'general_cost_currency',
      value: data.general_cost_currency.toString()
    });

    config.push({
      key: 'enforce_business_open_close',
      value: data.enforce_business_open_close.toString()
    });

    if (data.enforce_business_open_close.toString() === "true") {
      config.push({
        key: 'business_startsat_working_hours',
        value: data.business_startsat_working_hours.toString()
      });

      config.push({
        key: 'business_endsat_working_hours',
        value: data.business_endsat_working_hours.toString()
      });
    }

    // config.push({
    //   key: 'enable_edition_operation_accounts',
    //   value: data.enable_edition_operation_accounts.toString()
    // });
    config.push({
      key: 'enable_oficial_exchange_rate',
      value: data.enable_oficial_exchange_rate.toString()
    });

    configsSend = {
      configs: config
    }

    EditBussinesAdjustment(configsSend);

  };

  //-- Array de los tipos de metodos de pago
  // const selectMethodsPayment: SelectInterface[] = [
  //   {
  //     id: 'CASH',
  //     name: "EFECTIVO",
  //     disabled: false
  //   },
  //   {
  //     id: 'TRANSFER',
  //     name: "TRANSFERENCIA",
  //     disabled: false
  //   }
  // ];

  //-- show-menu-in-pos
  const show_menu_in_pos = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'show-menu-in-pos')?.value ?? '');

  //-- is-economiccycle-automated
  const is_economiccycle_automated = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'is-economiccycle-automated')?.value ?? '');
  const [is_economiccycle_automated_toggle, setIs_economiccycle_automated_toggle] = useState(is_economiccycle_automated);

  //-- economiccycle-endsAt
  const economiccycle_startAt = business?.configurationsKey?.find((item) => item.key === 'economiccycle-startAt')?.value ?? '';

  //-- shifts_management
  const shifts_management = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'shifts_management')?.value ?? '');

  //-- precission_after_coma
  const precission_after_coma = business?.configurationsKey?.find((item) => item.key === 'precission_after_coma')?.value ?? '';

  //-- unify_categories_stock_sale
  const unify_categories_stock_sale = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'unify_categories_stock_sale')?.value ?? '');

  //-- transfer_orders_to_next_economic_cycle
  const transfer_orders_to_next_economic_cycle = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'transfer_orders_to_next_economic_cycle')?.value ?? '');

  //-- force_access_system
  const force_access_system = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'force_access_system')?.value ?? '');

  //-- enable_notifications_in_tablet
  const enable_notifications_in_tablet = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enable_notifications_in_tablet')?.value ?? '');

  // business_startsat_working_hours 
  const business_startsat_working_hours = business?.configurationsKey?.find((item) => item.key === 'business_startsat_working_hours')?.value ?? ''

  // business_endsat_working_hours 
  const business_endsat_working_hours = business?.configurationsKey?.find((item) => item.key === 'business_endsat_working_hours')?.value ?? ''

   //-- enable_edition_operation_accounts
  //  const enable_edition_operation_accounts = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enable_edition_operation_accounts')?.value ?? '');

   //-- enable_oficial_exchange_rate
   const enable_oficial_exchange_rate = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enable_oficial_exchange_rate')?.value ?? '');

  // general_cost_currency 
  const general_cost_currency = business?.configurationsKey?.find((item) => item.key === 'general_cost_currency')?.value ?? ''

  // enforce_business_open_close 
  const enforce_business_open_close = convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enforce_business_open_close')?.value ?? '')

  const enforce_business_open_close_default = watch!("enforce_business_open_close") === undefined ? convertBoolean(business?.configurationsKey?.find((item) => item.key === 'enforce_business_open_close')?.value ?? '') : watch!("enforce_business_open_close")

  const currencies: SelectInterface[] = business!.availableCurrencies.map(
    (item) => ({
      id: item.code,
      name: item.code,
    })
  );


  //---------------------------------------------------------------------------------------
  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-3">
            <Select
              data={currencies}
              label="Establecer moneda como base de costos"
              name="general_cost_currency"
              defaultValue={general_cost_currency}
              control={control}
              warning="El cambio de la moneda base, modificará todos los costos pasados y presentes de los productos y órdenes a la tasa de cambio definida."
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_menu_in_pos"
              control={control}
              defaultValue={show_menu_in_pos}
              title="Mostrar carta de venta en el tablet"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="is_economiccycle_automated"
              control={control}
              defaultValue={is_economiccycle_automated}
              changeState={setIs_economiccycle_automated_toggle}
              title="Habilitar ciclo económico automático"
            />
          </div>
          {is_economiccycle_automated_toggle === true &&
            <div className="pb-3">
              <ComboBox
                name="economiccycle_startAt"
                data={getTimeArray()}
                label="Apertura/Cierre"
                control={control}
                rules={{ required: "Este campo es requerido" }}
                defaultValue={economiccycle_startAt}
              />
            </div>
          }
          <div className="py-3">
            <Toggle
              name="shifts_management"
              control={control}
              defaultValue={shifts_management}
              title="Habilitar turnos de trabajo"
            />
          </div>
          <div className="pb-3">
            <ComboBox
              name="precission_after_coma"
              data={create_array_number(0, 8)}
              label="Precisión después de la coma"
              control={control}
              defaultValue={parseInt(precission_after_coma)}
            />
          </div>
          <div className="py-3">
            <Toggle
              name="unify_categories_stock_sale"
              control={control}
              defaultValue={unify_categories_stock_sale}
              title="Unificar categorías de venta y almacén"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="transfer_orders_to_next_economic_cycle"
              control={control}
              defaultValue={transfer_orders_to_next_economic_cycle}
              title="Transferir órdenes abiertas hacia el próximo ciclo económico"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="force_access_system"
              control={control}
              defaultValue={force_access_system}
              title="Forzar acceso al sistema por registro de asistencia"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="enable_notifications_in_tablet"
              control={control}
              defaultValue={enable_notifications_in_tablet}
              title="Habilitar recibir notificaciones en el tablet"
            />
          </div>

          <div className="py-3">
            <Toggle
              name="enforce_business_open_close"
              control={control}
              defaultValue={enforce_business_open_close}
              title="Forzar inicio y fin de horario laboral"
            />
          </div>

          {enforce_business_open_close_default && (
            <>
              <div className="py-3">
                <ComboBox
                  name="business_startsat_working_hours"
                  data={getTimeArray()}
                  label="Inicio de horario laboral"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  defaultValue={business_startsat_working_hours}
                />
              </div>

              <div className="py-3">
                <ComboBox
                  name="business_endsat_working_hours"
                  data={getTimeArray()}
                  label="Fin de horario laboral"
                  control={control}
                  rules={{ required: "Este campo es requerido" }}
                  defaultValue={business_endsat_working_hours}
                />
              </div>
            </>
          )}

          <div className="py-3">
            <Toggle
              name="enable_oficial_exchange_rate"
              control={control}
              defaultValue={enable_oficial_exchange_rate}
              title="Habilitar tasa de cambio oficial"
            />
          </div>


          <div className="pt-6">
            <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
              <div className="float-right">
                <Button
                  color="slate-600"
                  type="submit"
                  name="Actualizar"
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

export default ConfigGeneral;
