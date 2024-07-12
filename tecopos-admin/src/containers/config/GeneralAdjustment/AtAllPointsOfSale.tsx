
import { useForm, SubmitHandler } from "react-hook-form";

import { useAppSelector } from "../../../store/hooks";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";

import Button from "../../../components/misc/Button";
import MultiSelect from "../../../components/forms/Multiselect";

import ComboBox from "../../../components/forms/Combobox";
import Toggle from "../../../components/forms/Toggle";
import { create_array_number } from "../../../utils/helpers";

import useServerBusiness from "../../../api/useServerBusiness";
import Input from "../../../components/forms/Input";

const AtAllPointsOfSale = () => {
  // const {
  //   outLoading,
  //   isLoading,
  //   allMethodsPayment,
  //   getMethodspaymentWay,
  // } = useServer();

  const { business } = useAppSelector((state) => state.init);
  const { paymentWays } = useAppSelector((state) => state.nomenclator);
  const { updateConfigs, isFetching } = useServerBusiness();

  const { control, handleSubmit, watch } = useForm();

  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | string[]>
  > = (data) => {
    updateConfigs(data);
  };

  let payment_methods_enabled: string[] = [],
    allow_to_cancel_orders: string[] = [],
    default_method_payment: string | null = null,
    allow_discounts: boolean = false,
    enabled_discounts: string[] = [],
    cash_operations_include_tips: boolean = false,
    cash_operations_include_deliveries: boolean = false,
    extract_salary_from_cash: boolean = false,
    // enable_testing_orders_printing: boolean = false,
    enable_ongoing_orders: boolean = false,
    allow_commission: boolean = false,
    enabled_commissions: number[] = [],
    allow_to_make_dispatch_from_sale: boolean = false,
    print_number_order: boolean = false,
    print_hours_in_order: boolean = false,
    show_revenue_in_tablet: boolean = false,
    show_pos_transfer_online_orders: boolean = false,
    show_coupons_in_tablet: boolean = false,
    open_cashbox_at_print: boolean = false,
    calculate_salary_from: string | null = null,
    show_cash_report_in_tablet: boolean = false,
    show_cash_operations_in_tablet: boolean = false,
    limit_number_order_billed_in_tablet: boolean = false,
    amount_order_to_show_billed_in_tablet: number | null,
    pos_allow_pending_payment: boolean = false,
    transform_invoice_into_sell_currency: boolean = false,
    enable_to_sale_in_negative: boolean = false,
    return_order_change_according_oficial_exchange: boolean = false,
    print_order_with_prices_adjust_to_oficial_exchange: boolean = false,
    enable_oficial_exchange_rate: boolean = false;

  //load config -------------------------------------------------------------
  business!.configurationsKey.forEach((item) => {
    switch (item.key) {
      case "allow_to_cancel_orders":
        allow_to_cancel_orders = item.value.split(",");
        break;
      case "payment_methods_enabled":
        payment_methods_enabled = item.value.split(",");
        break;
      case "allow_discounts":
        allow_discounts = item.value === "true";
        break;
      case "enabled_discounts":
        enabled_discounts = item.value.split(",");
        break;
      case "cash_operations_include_tips":
        cash_operations_include_tips = item.value === "true";
        break;
      case "cash_operations_include_deliveries":
        cash_operations_include_deliveries = item.value === "true";
        break;
      case "extract_salary_from_cash":
        extract_salary_from_cash = item.value === "true";
        break;
      // case "enable_testing_orders_printing":
      //   enable_testing_orders_printing = item.value === "true";
      //   break;
      case "enable_ongoing_orders":
        enable_ongoing_orders = item.value === "true";
        break;
      case "show_coupons_in_tablet":
        show_coupons_in_tablet = item.value === "true";
        break;
      case "open_cashbox_at_print":
        open_cashbox_at_print = item.value === "true";
        break;
      case "allow_commission":
        allow_commission = item.value === "true";
        break;
      case "enabled_commissions":
        enabled_commissions = item.value.split(",").map(item => Number(item));
        break;
      case "allow_to_make_dispatch_from_sale":
        allow_to_make_dispatch_from_sale = item.value === "true";
        break;
      case "print_number_order":
        print_number_order = item.value === "true";
        break;
      case "print_hours_in_order":
        print_hours_in_order = item.value === "true";
        break;
      case "show_revenue_in_tablet":
        show_revenue_in_tablet = item.value === "true";
        break;
      case "show_pos_transfer_online_orders":
        show_pos_transfer_online_orders = item.value === "true";
        break;
      case "calculate_salary_from":
        calculate_salary_from = item.value;
        break;
      case "show_cash_report_in_tablet":
        show_cash_report_in_tablet = item.value === "true";
        break;
      case "show_cash_operations_in_tablet":
        show_cash_operations_in_tablet = item.value === "true";
        break;
      case "limit_number_order_billed_in_tablet":
        limit_number_order_billed_in_tablet = item.value === "true";
        break;
      case "amount_order_to_show_billed_in_tablet":
        amount_order_to_show_billed_in_tablet = Number(item.value);
        break;
      case "pos_allow_pending_payment":
        pos_allow_pending_payment = item.value === "true"
        break;
      case "transform_invoice_into_sell_currency":
        transform_invoice_into_sell_currency = item.value === "true"
        break;
      case "enable_to_sale_in_negative":
        enable_to_sale_in_negative = item.value === "true"
        break;
      case "return_order_change_according_oficial_exchange":
        return_order_change_according_oficial_exchange = item.value === "true"
        break;
      case "print_order_with_prices_adjust_to_oficial_exchange":
        print_order_with_prices_adjust_to_oficial_exchange = item.value === "true"
        break;
      case "enable_oficial_exchange_rate":
        enable_oficial_exchange_rate = item.value === "true"
    }
  });
  //--------------------------------------------------------------------------------------
  const paymentMethodsSelector: SelectInterface[] = paymentWays.map((item) => ({
    id: item.code,
    name: item.name,
  }));

  const salayOriginSelector: SelectInterface[] = [
    {
      id: "TOTAL_SALES",
      name: "TOTAL DE LAS VENTAS",
    },
    {
      id: "GROSS_REVENUE",
      name: "GANANCIA BRUTA",
    },
  ];

  const { roles } = useAppSelector((state) => state.nomenclator);

  const dataRoles: SelectInterface[] = roles
    .filter((item) => {
      return !["OWNER", "GROUP_OWNER"].includes(item.code);
    })
    .map((item) => ({ id: item.code, name: item.name }));

  return (
    <>
      <div className="min-w-full mx-4 px-4 py-5 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-full xl:px-5 xl:pb-20 xl:pt-6 bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <div className="py-3">
              <MultiSelect
                name="payment_methods_enabled"
                data={paymentMethodsSelector}
                label="Métodos de pago"
                control={control}
                byDefault={payment_methods_enabled}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>
          </div>

          <div className="py-3">
            <Toggle
              name="allow_discounts"
              control={control}
              defaultValue={allow_discounts}
              title="Habilitar descuento"
            />
          </div>

          {(watch("allow_discounts") ?? allow_discounts) && (
            <div className="py-2">
              <MultiSelect
                name="enabled_discounts"
                data={create_array_number(1, 100)}
                label="Descuentos permitidos *"
                control={control}
                rules={{ required: "Este campo es requerido" }}
                byDefault={enabled_discounts.map((item) => Number(item))}
              />
            </div>
          )}
          <div className="py-3">
            <Toggle
              name="cash_operations_include_tips"
              control={control}
              defaultValue={cash_operations_include_tips}
              title="Incluir propinas en caja"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="cash_operations_include_deliveries"
              control={control}
              defaultValue={cash_operations_include_deliveries}
              title="Mantener en caja los montos de envíos registrados"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="extract_salary_from_cash"
              control={control}
              defaultValue={extract_salary_from_cash}
              title="Extraer salario de caja"
            />
          </div>
          {(watch("extract_salary_from_cash") ?? extract_salary_from_cash) && (
            <div className="py-3">
              <ComboBox
                name="calculate_salary_from"
                data={salayOriginSelector}
                label=" Calcular salario a partir de: *"
                control={control}
                defaultValue={calculate_salary_from}
                rules={{ required: "Este campo es requerido" }}
              />
            </div>
          )}

          {/* <div className="py-3">
            <Toggle
              name="enable_testing_orders_printing"
              control={control}
              defaultValue={enable_testing_orders_printing}
              title="Habilitar impresión de orden de prueba"
            />
          </div> */}
          
          <div className="py-3">
            <Toggle
              name="enable_ongoing_orders"
              control={control}
              defaultValue={enable_ongoing_orders}
              title="Habilitar órdenes en marcha"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_coupons_in_tablet"
              control={control}
              defaultValue={show_coupons_in_tablet}
              title="Permitir gestión de cupones en el tablet"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="open_cashbox_at_print"
              control={control}
              defaultValue={open_cashbox_at_print}
              title="Abrir cashbox al facturar"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="allow_commission"
              control={control}
              defaultValue={allow_commission}
              title="Habilitar comisiones"
            />
          </div>
          {(watch("allow_commission") ?? allow_commission) && (
            <div className="py-2">
              <MultiSelect
                name="enabled_commissions"
                data={create_array_number(1, 100)}
                label="Comisiones permitidas *"
                control={control}
                rules={{ required: "Este campo es requerido" }}
                byDefault={enabled_commissions}
              />
            </div>
          )}
          <div className="py-3">
            <Toggle
              name="allow_to_make_dispatch_from_sale"
              control={control}
              defaultValue={allow_to_make_dispatch_from_sale}
              title="Permitir despachos por recibo de pago"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="print_number_order"
              control={control}
              defaultValue={print_number_order}
              title="Imprimir número de orden"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="print_hours_in_order"
              control={control}
              defaultValue={print_hours_in_order}
              title="Imprimir hora en la orden"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_revenue_in_tablet"
              control={control}
              defaultValue={show_revenue_in_tablet}
              title="Mostrar Ganancias en Reporte de Caja"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_pos_transfer_online_orders"
              control={control}
              defaultValue={show_pos_transfer_online_orders}
              title="Mostrar botón de transferir órdenes online"
            />
          </div>
          <div className="py-3">
            <MultiSelect
              name="allow_to_cancel_orders"
              data={dataRoles}
              label="Pueden eliminar órdenes"
              control={control}
              byDefault={allow_to_cancel_orders}
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_cash_report_in_tablet"
              control={control}
              defaultValue={show_cash_report_in_tablet}
              title=" Mostrar reporte de caja en el tablet"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="show_cash_operations_in_tablet"
              control={control}
              defaultValue={show_cash_operations_in_tablet}
              title="Mostrar operaciones de caja en el tablet"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="limit_number_order_billed_in_tablet"
              control={control}
              defaultValue={limit_number_order_billed_in_tablet}
              title="Limitar el número de órdenes facturadas"
            />
          </div>
          {(watch("limit_number_order_billed_in_tablet") ??
            limit_number_order_billed_in_tablet) && (
              <div className="py-3">
                <Input
                  type="number"
                  label="Cantidad de órdenes a mostrar"
                  name="amount_order_to_show_billed_in_tablet"
                  control={control}
                  defaultValue={amount_order_to_show_billed_in_tablet!}
                />
              </div>
            )}

          <div className="py-3">
            <Toggle
              name="pos_allow_pending_payment"
              control={control}
              defaultValue={pos_allow_pending_payment}
              title="Permitir órdenes pendientes de pago"
            />
          </div>

          <div className="py-3">
            <Toggle
              name="transform_invoice_into_sell_currency"
              control={control}
              defaultValue={transform_invoice_into_sell_currency}
              title="Transformar precios de factura a otra moneda"
            />
          </div>
          <div className="py-3">
            <Toggle
              name="enable_to_sale_in_negative"
              control={control}
              defaultValue={enable_to_sale_in_negative}
              title="Habilitar vender en negativo"
            />
          </div>
          {
            enable_oficial_exchange_rate && (
              <>
                <div className="py-3">
                  <Toggle
                    name="return_order_change_according_oficial_exchange"
                    control={control}
                    defaultValue={return_order_change_according_oficial_exchange}
                    title="Retornar vuelto cuando se pague en moneda no principal al cambio oficial"
                  />
                </div>
                <div className="py-3">
                  <Toggle
                    name="print_order_with_prices_adjust_to_oficial_exchange"
                    control={control}
                    defaultValue={print_order_with_prices_adjust_to_oficial_exchange}
                    title="Imprimir orden con precios ajustados a tasa de cambio oficial"
                  />
                </div>
              </>
            )
          }


          <div className="pt-6">
            <div className="max-w-full flow-root  pt-5 pb-4  bg-slate-50 sm:px-6">
              <div className="float-right">
                <Button
                  color="slate-600"
                  type="submit"
                  name="Actualizar"
                  loading={isFetching}
                  disabled={isFetching}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AtAllPointsOfSale;
