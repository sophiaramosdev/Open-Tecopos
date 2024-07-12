import { SubmitHandler, useForm } from "react-hook-form";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import Button from "../../../components/misc/Button";
import Select from "../../../components/forms/Select";
import useServerBusiness from "../../../api/useServerBusiness";
import { cleanObj } from "../../../utils/helpers";
import Toggle from "../../../components/forms/Toggle";
import Input from "../../../components/forms/Input";
import MultiSelect from "../../../components/forms/Multiselect";
import CurrencyInput from "../../../components/forms/CurrencyInput";
import { useState } from "react";
import { toast } from "react-toastify";


const WoocomerceConfig = () => {
  const { handleSubmit, control, watch } = useForm();
  const { business } = useAppSelector((state) => state.init);
  const { areas } = useAppSelector((state) => state.nomenclator);

  const { updateConfigs, isFetching, editBusiness } = useServerBusiness();

  let online_shop_main_currency!: string[],
    online_shop_area_stock!: string,
    online_shop_price_system!: number[],
    online_shop_enable_cancel_orders_automatically!: string,
    online_shop_cancel_order_after_X_hours!: string,
    minimun_amount_to_buy_with_delivery!: { amount: number, codeCurrency: string }[],
    enable_sale_shop_multiple_currencies_from_exchange_rate!: boolean,
    currencies_for_sale_exchange_rate!: string[],
    create_order_in_status!: string,
    substract_from_inventory_at!: string,
    when_shop_create_preorder!: boolean,
    online_shop_show_current_currency_modal!: boolean,
    order_notification_users!: string[];

  //load woocomerce config -------------------------------------------------------------
  business!.configurationsKey.forEach((item) => {
    switch (item.key) {
      case "online_shop_area_stock":
        online_shop_area_stock = item.value;
        break;
      case "online_shop_price_system":
        online_shop_price_system = item.value.split(",").map(elem => Number(elem));
        break;
      case "online_shop_main_currency":
        online_shop_main_currency = item.value.split(",");
        break;
      case "online_shop_enable_cancel_orders_automatically":
        online_shop_enable_cancel_orders_automatically = item.value;
        break;
      case "online_shop_cancel_order_after_X_hours":
        online_shop_cancel_order_after_X_hours = item.value;
        break;
      case "minimun_amount_to_buy_with_delivery":
        minimun_amount_to_buy_with_delivery = JSON.parse(item.value);
        break;
      case "enable_sale_shop_multiple_currencies_from_exchange_rate":
        enable_sale_shop_multiple_currencies_from_exchange_rate = JSON.parse(item.value)
        break;
      case "currencies_for_sale_exchange_rate":
        currencies_for_sale_exchange_rate = item.value.split(",")
        break;
      case "create_order_in_status":
        create_order_in_status = item.value;
        break;
      case "substract_from_inventory_at":
        substract_from_inventory_at = item.value;
        break;

      case "when_shop_create_preorder":
        when_shop_create_preorder = JSON.parse(item.value)
        break;

      case "online_shop_show_current_currency_modal":
        online_shop_show_current_currency_modal = JSON.parse(item.value)
        break;

      case "order_notification_users":
        order_notification_users = item.value.split(",")
        break;
    }
  });

  //select currency data ----------------------------------
  const currencies: SelectInterface[] = business!.availableCurrencies.map(
    (item) => ({
      id: item.code,
      name: item.code,
    })
  );

  //select price system data---------------------------------------------
  const priceSystems: SelectInterface[] = business!.priceSystems.map(
    (item) => ({
      id: item.id,
      name: item.name,
    })
  );

  //select stock areas data---------------------------------------------
  const stockAreas: SelectInterface[] = areas!
    .filter((area) => area.type === "STOCK")
    .map((item) => ({
      id: item.id,
      name: item.name,
    }));

  function validarString(input: string): string[] | string {
    // Definir el patrón para validar correos electrónicos
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Dividir el input en un arreglo de posibles correos electrónicos
    const emails = input.split(',');

    // Verificar si todos los elementos del arreglo son correos electrónicos válidos
    for (const email of emails) {
      // Si hay espacios alrededor del email, no es válido
      if (email.trim() !== email) {
        return "El input debe contener correos electrónicos separados solo por comas, sin espacios.";
      }

      // Verificar si el email cumple con el patrón de correo electrónico
      if (!emailPattern.test(email) && input !== "") {
        return `El correo electrónico ${email} no es válido.`;
      }
    }

    // Si todas las verificaciones pasaron, retornar el arreglo de correos electrónicos
    return emails;
  }

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    let {
      online_shop_main_currency,
      online_shop_price_system,
      online_shop_area_stock,
      online_shop_enable_cancel_orders_automatically,
      online_shop_cancel_order_after_X_hours,

      includeShop,
      enableManagementOrders,
      defineCarShopLimit,
      minimun_amount_to_buy_with_delivery_CUP,
      minimun_amount_to_buy_with_delivery_USD,
      minimun_amount_to_buy_with_delivery_EUR,
      minimun_amount_to_buy_with_delivery_MLC,
      enable_sale_shop_multiple_currencies_from_exchange_rate,
      currencies_for_sale_exchange_rate,

      when_shop_create_preorder,
      online_shop_show_current_currency_modal,
      create_order_in_status,
      substract_from_inventory_at,
      order_notification_users
    } = data
    if (!enable_sale_shop_multiple_currencies_from_exchange_rate) { currencies_for_sale_exchange_rate = '' }

    const minimun_amount_to_buy_with_delivery = []

    if (defineCarShopLimit) {
      if (minimun_amount_to_buy_with_delivery_CUP !== undefined) {
        const { price: cup_price } = minimun_amount_to_buy_with_delivery_CUP! as unknown as { price: number }
        minimun_amount_to_buy_with_delivery.push({ amount: cup_price, codeCurrency: "CUP" })
      }

      if (minimun_amount_to_buy_with_delivery_USD !== undefined) {
        const { price: usd_price } = minimun_amount_to_buy_with_delivery_USD! as unknown as { price: number }
        minimun_amount_to_buy_with_delivery.push({ amount: usd_price, codeCurrency: "USD" })
      }

      if (minimun_amount_to_buy_with_delivery_EUR !== undefined) {
        const { price: eur_price } = minimun_amount_to_buy_with_delivery_EUR! as unknown as { price: number }
        minimun_amount_to_buy_with_delivery.push({ amount: eur_price, codeCurrency: "EUR" })
      }

      if (minimun_amount_to_buy_with_delivery_MLC !== undefined) {
        const { price: mlc_price } = minimun_amount_to_buy_with_delivery_MLC! as unknown as { price: number }
        minimun_amount_to_buy_with_delivery.push({ amount: mlc_price, codeCurrency: "MLC" })
      }
    }

    const dataUpdate = {
      online_shop_main_currency,
      online_shop_price_system,
      online_shop_area_stock,
      online_shop_enable_cancel_orders_automatically,
      online_shop_cancel_order_after_X_hours,
      minimun_amount_to_buy_with_delivery,
      enable_sale_shop_multiple_currencies_from_exchange_rate,
      currencies_for_sale_exchange_rate,
      create_order_in_status,
      when_shop_create_preorder,
      substract_from_inventory_at,
      online_shop_show_current_currency_modal,
      //@ts-ignore
      order_notification_users: validarString(order_notification_users as string) === "string" ? "" : validarString(order_notification_users as string).join(",").trim()
    }

    const dataEdit = {
      includeShop,
      enableManagementOrders,
    }

    if (typeof validarString(order_notification_users as string) === "string") {
      toast.error(validarString(order_notification_users as string))
    } else {
      updateConfigs(cleanObj(dataUpdate));
      editBusiness(dataEdit as {
        includeShop: string | number | boolean;
        enableManagementOrders: string | number | boolean;
      })
    }


  };

  const [includeShop, setincludeShop] = useState<boolean>(business?.includeShop ? true : false)
  const [defineCarShopLimit, setDefineCarShopLimit] = useState<boolean>(minimun_amount_to_buy_with_delivery.length > 0)
  const [multipleCurrenciesFromExchangeRate, setMultipleCurrenciesFromExchangeRate] = useState<boolean>(enable_sale_shop_multiple_currencies_from_exchange_rate)

  return (
    <div className="h-full bg-white rounded-md shadow-md border border-gray-200 p-5">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-y-3 items-stretch h-full"
      >
        <Toggle
          name="enable_sale_shop_multiple_currencies_from_exchange_rate"
          control={control}
          defaultValue={multipleCurrenciesFromExchangeRate ?? false}
          title="Vender en múltiples monedas vía Tasa de cambio"
          changeState={setMultipleCurrenciesFromExchangeRate}
        />
        {
          multipleCurrenciesFromExchangeRate ? (

            <MultiSelect
              data={currencies}
              label="Moneda en tienda online"
              name="currencies_for_sale_exchange_rate"
              byDefault={currencies_for_sale_exchange_rate}
              control={control}
            />

          ) : (
            <>
              <MultiSelect
                data={currencies}
                label="Moneda en tienda online"
                name="online_shop_main_currency"
                byDefault={online_shop_main_currency}
                control={control}
              />
              <MultiSelect
                data={priceSystems}
                label="Sistema de precios en tienda online"
                name="online_shop_price_system"
                byDefault={online_shop_price_system}
                control={control}
              />
            </>
          )
        }

        <Select
          data={stockAreas}
          label="Almacén de tienda online"
          name="online_shop_area_stock"
          defaultValue={
            online_shop_area_stock ? Number(online_shop_area_stock) : undefined
          }
          control={control}
        />

        <Toggle
          name="includeShop"
          control={control}
          defaultValue={business?.includeShop ?? false}
          title="Mostrar carrito de venta"
          changeState={setincludeShop}
        />
        {
          (includeShop && (
            <div className="ml-8">
              <Toggle
                name="defineCarShopLimit"
                control={control}
                defaultValue={minimun_amount_to_buy_with_delivery.length > 0}
                title="Establecer un valor mínimo de compra en el carrito de ventas"
                changeState={setDefineCarShopLimit}
              />
              {
                ((defineCarShopLimit || watch!("defineCarShopLimit")) && (
                  <div>
                    {
                      business?.availableCurrencies?.map((currency, indx) => (
                        <div className="w-1/2 my-1" key={indx}>
                          <CurrencyInput
                            label={`Precio en ${currency.code}`}
                            currencies={[currency.code]
                            }
                            name={`minimun_amount_to_buy_with_delivery_${currency.code}`}
                            control={control}
                            rules={{ required: "Campo requerido" }}
                            defaultValue={{
                              price: minimun_amount_to_buy_with_delivery.length !== undefined ? minimun_amount_to_buy_with_delivery.find(amount => amount.codeCurrency === currency.code)?.amount! : 0,
                              codeCurrency: minimun_amount_to_buy_with_delivery.length !== undefined ? minimun_amount_to_buy_with_delivery.find(amount => amount.codeCurrency === currency.code)?.codeCurrency! : " "
                            }}
                          />
                        </div>

                      ))
                    }
                  </div>

                ))
              }

            </div>

          ))
        }

        <Toggle
          name="online_shop_enable_cancel_orders_automatically"
          control={control}
          title="Cancelar órdenes no pagadas automáticamente"
          defaultValue={
            online_shop_enable_cancel_orders_automatically === "true"
          }
        />

        {(watch("online_shop_enable_cancel_orders_automatically") ??
          online_shop_enable_cancel_orders_automatically === "true") && (

            <Input
              name="online_shop_cancel_order_after_X_hours"
              type="number"
              defaultValue={Number(online_shop_cancel_order_after_X_hours)}
              label="Cancelar órdenes luego de: (horas)"
              control={control}
            />
          )}

        {/* //--------------------------------- */}

        <Toggle name='enableManagementOrders' control={control} defaultValue={business?.enableManagementOrders ?? false} title='Habilitar gestión de órdenes online' />


        <Toggle name='when_shop_create_preorder' control={control} defaultValue={when_shop_create_preorder ?? false} title='Crear prefacturas al realizar la compra' />

        <Toggle name='online_shop_show_current_currency_modal' control={control} defaultValue={online_shop_show_current_currency_modal ?? false} title='Mostrar modal de moneda actual al cargar la tienda' />

        <Select
          data={[{ id: "CREATED", name: "Creada" }, { id: "PAYMENT_PENDING", name: "Pendiente de pago" }]}
          label="Al crear las órdenes poner en estado "
          name="create_order_in_status"
          defaultValue={
            create_order_in_status
          }
          control={control}
        />

        <Select
          data={[{ id: "ORDER_CREATED", name: "Al crear la orden" }, { id: "ORDER_BILLED", name: "Al facturar la orden" }]}
          label="Rebajar de inventario "
          name="substract_from_inventory_at"
          defaultValue={
            substract_from_inventory_at
          }
          control={control}
        />

        <div className="w-full mr-1">
          <Input
            label="Al recibir un nuevo pedido, notificar:"
            name="order_notification_users"
            control={control}
            placeholder="Ejemplo: usuario1@gmail.com, usuario2@gmail.com"
            defaultValue={order_notification_users.join(",")}
          />

          <p className="font-thin text-sm text-slate-500 p-2">*Los correos (en caso de ser más de uno) tienen que estar separadas por comas*</p>
        </div>

        <div className="flex justify-end self-end py-5">
          <Button
            color="slate-600"
            name="Actualizar"
            type="submit"
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    </div>
  );
};

export default WoocomerceConfig;
