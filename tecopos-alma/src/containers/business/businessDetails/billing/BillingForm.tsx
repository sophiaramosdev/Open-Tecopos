import { useState, useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import {
  ArrowDownOnSquareStackIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { InvoiceInterface } from "../../../../interfaces/ServerInterfaces";
import LoadingSpin from "../../../../components/misc/LoadingSpin";
import ActiveToggle from "../../../../components/forms/Toggle";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import subDays from "date-fns/subDays";
import Inputmask from "inputmask";
import { useAppSelector } from "../../../../store/hooks";
import moment from "moment";
import { formatCurrency } from "../../../../utils/helpers";

registerLocale("es", es);

interface BillingFormProps {
  action: Function;
  isFetching: boolean;
  plan?: string;
  price?: { amount: number; codeCurrency: string };
}

export default function BusinessForm({
  action,
  isFetching,
  plan,
  price,
}: BillingFormProps) {
  //Get Available Currency
  const { currency, config } = useAppSelector((state) => state.nomenclator);
  const currencyCode = currency?.map((item) => item.code);

  const currencyItem = config?.find(
    (currency) => currency.key === "payment_currency_enabled"
  );
  const availableCurrency = currencyItem?.value.split(",");

  //Parameters to manage form
  const {
    register,
    handleSubmit,
    control,
    unregister,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Partial<InvoiceInterface>>({
    shouldFocusError: false,
    defaultValues: {
      discount: null,
    },
  });

  //Submit Manager
  const onSubmit: SubmitHandler<Partial<InvoiceInterface>> = (data) => {
    if (data.discount && data.price) {
      const { discount, price } = data;
      data.discount = Number(discount);
      data.price.amount = Number(price.amount);
    } else if (data.dateUntil) {
      data.dateUntil = moment(data.dateUntil).format("YYYY-MM-DD");
    }
    action(data);
  };

  //Aply mask to price and discount fields
  Inputmask({ mask: "9{*}[.9{0,2}]", greedy: false, placeholder: " " }).mask(
    document.getElementsByName("price.amount")
  );
  Inputmask({ mask: "99", greedy: false, placeholder: " " }).mask(
    document.getElementsByName("discount")
  );

  //Form behaviour since promo toggle
  const [promo, setPromo] = useState(false);
  const switchPromo = (state: boolean) => setPromo(state);

  useEffect(() => {
    if (promo) {
      unregister("price");
      unregister("discount");
    } else {
      unregister("dateUntil");
    }
  }, [promo]);

  //Form behaviour to calculate Total Payment
  const payment = watch(["price.amount", "price.codeCurrency", "discount"]);
  const paymentAmount = Number(payment[0]);
  const paymentDiscount = Number(payment[2]);
  const totalPay = paymentAmount - (paymentAmount * paymentDiscount) / 100;

  return (
    <>
      <div className="flex justify-between md:justify-center mb-2 ">
        <h3 className="md:text-lg text-md font-medium text-gray-900">
          Nuevo Pago
        </h3>
      </div>

      <form
        className="space-y-8 divide-y divide-gray-300"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-6 pt-8 sm:space-y-5 sm:pt-10">
          <div className="space-y-6 sm:space-y-5">
            {/*Plan [Readonly] */}
            <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
              <label
                htmlFor="first-name"
                className="block text-md font-medium text-gray-700 sm:mt-px"
              >
                Plan
              </label>
              <div className="mt-1 sm:col-span-2 sm:mt-0 first-letter:uppercase">
                <h3 className="flex items-center gap-5">
                  {plan}{" "}
                  <span>
                    {price && formatCurrency(price.amount, price.codeCurrency)}
                  </span>
                </h3>
              </div>
            </div>

            {/**Promoción [toggle] */}
            <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
              <label
                htmlFor="last-name"
                className="block text-md font-medium text-gray-700 sm:mt-px"
              >
                Promoción
              </label>
              <div className="mt-1 sm:col-span-2 sm:mt-0">
                <ActiveToggle
                  name="promotion"
                  control={control}
                  defaultValue={false}
                  changeState={switchPromo}
                />
              </div>
            </div>

            {promo ? (
              /**Hasta*/
              <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
                <label
                  htmlFor="email"
                  className="block text-md font-medium text-gray-700 sm:mt-px"
                >
                  Hasta:
                </label>
                <div className=" w-full sm:w-3/4 mt-1 sm:col-span-2 sm:mt-0">
                  <Controller
                    name="dateUntil"
                    control={control}
                    rules={{ required: "Campo Requerido" }}
                    render={({ field: { onChange, value }, fieldState }) => (
                      <div className="relative w-full">
                        <DatePicker
                          selected={value ? moment(value).toDate() : null}
                          onChange={onChange}
                          className={`block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-orange-600 focus:ring-orange-600 sm:text-md ${
                            fieldState.error &&
                            "text-red-700 border-red-600 border-2"
                          }`}
                          locale={es}
                          dateFormat="dd MMMM yyyy"
                          minDate={subDays(new Date(), 0)}
                        />
                        {fieldState.error && (
                          <div>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center -top-6">
                              <ExclamationCircleIcon
                                className="h-5 w-5 text-red-500"
                                aria-hidden="true"
                              />
                            </div>
                            <span className="text-xs text-red-600 w-3/4">
                              {fieldState.error.message}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>
            ) : (
              <>
                {/**Monto */}
                <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
                  <label
                    htmlFor="email"
                    className="block text-md font-medium text-gray-700 sm:mt-px"
                  >
                    Monto:
                  </label>
                  <div className="relative w-full md:w-3/4 mt-1 rounded-md shadow-sm sm:col-span-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-md">$</span>
                    </div>
                    <input
                      {...register("price.amount", {
                        required: "Campo requerido",
                      })}
                      type="text"
                      className={`block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-orange-600 focus:ring-orange-600 sm:text-md${
                        errors.price?.amount &&
                        "text-red-700 border-red-600 border-2"
                      }`}
                      placeholder="0.00"
                    />

                    {errors.price?.amount && (
                      <>
                        <div className="pointer-events-none absolute inset-y-0 sm:right-14 right-2 flex items-center pr-3 top-0">
                          <ExclamationCircleIcon
                            className="h-5 w-5 text-red-500"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="text-xs text-red-600 absolute">
                          {errors.price.amount?.message}
                        </span>
                      </>
                    )}

                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <label htmlFor="currency" className="sr-only">
                        Currency
                      </label>
                      <select
                        {...register("price.codeCurrency")}
                        className="h-full rounded-md border-transparent bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:border-orange-600 focus:ring-orange-600 sm:text-sm"
                      >
                        {currencyCode?.map((currency) => (
                          <option
                            className="disabled:text-gray-300 text-black"
                            key={currency}
                            value={currency}
                            disabled={!availableCurrency?.includes(currency)}
                          >
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/*Descuento */}
                <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
                  <label
                    htmlFor="email"
                    className="block text-md font-medium text-gray-700 sm:mt-px"
                  >
                    Descuento:
                  </label>
                  <div className="relative w-full sm:w-3/4 mt-1 rounded-md shadow-sm sm:col-span-2">
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-md">%</span>
                    </div>
                    <input
                      {...register("discount")}
                      type="text"
                      className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-orange-600 focus:ring-orange-600 sm:text-md"
                    />
                  </div>
                </div>

                {/*Total [Readonly] */}
                <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
                  <label className="block text-md font-medium text-gray-700 sm:mt-px">
                    Total a Pagar:
                  </label>
                  <div className="mt-1 sm:col-span-2 sm:mt-0">
                    <h3>
                      $ {totalPay} {payment[1]}
                    </h3>
                  </div>
                </div>
              </>
            )}

            {/**Observaciones */}
            <div className="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
              <label
                htmlFor="email"
                className="block text-md font-medium text-gray-700 sm:mt-px"
              >
                Observaciones:
              </label>
              <div className="mt-1 sm:col-span-2 sm:mt-0">
                <textarea
                  {...register("observations")}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-600 focus:ring-orange-600 sm:text-sm"
                  defaultValue={""}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="submit"
              className="relative ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary py-2 pl-8 pr-2 text-sm font-medium text-white shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-secondary"
              disabled={
                isSubmitting ||
                isFetching ||
                Object.entries(dirtyFields).length === 0
              }
            >
              {isSubmitting || isFetching ? (
                <div className="absolute left-2">
                  <LoadingSpin />
                </div>
              ) : (
                <ArrowDownOnSquareStackIcon className="absolute left-2 w-5 h-5" />
              )}
              <span className="ml-1">
                {isSubmitting || isFetching ? "Enviando..." : "Insertar"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
