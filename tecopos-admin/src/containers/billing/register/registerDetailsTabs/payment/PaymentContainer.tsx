/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  OrderInterface,
  PriceInvoiceInterface,
  SimplePrice,
} from "../../../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../../../store/hooks";
import Button from "../../../../../components/misc/Button";
import {
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Select from "../../../../../components/forms/Select";
import {
  ApplyCouponBody,
  SelectInterface,
} from "../../../../../interfaces/InterfacesLocal";
import useServerEcoCycle from "../../../../../api/useServerEconomicCycle";
import {
  cleanObj,
  formatCurrency,
  formatDateForTable,
} from "../../../../../utils/helpers";
import useServer from "../../../../../api/useServerMain";
import { translatePaymetMethods } from "../../../../../utils/translate";
import Toggle from "../../../../../components/forms/Toggle";
import ComboBox from "../../../../../components/forms/Combobox";
import { RegisterDetailsContext } from "../../RegisterDetailsContainer";
import Modal from "../../../../../components/misc/GenericModal";
import PrepaidList from "./PrepaidList";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import { Check, X } from "heroicons-react";
import useServerOrders from "../../../../../api/useServerOrders";
import { toast } from "react-toastify";
import { mathOperation } from "../../../../../utils/helpers";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import { Disclosure } from "@headlessui/react";
import DateInput from "../../../../../components/forms/DateInput";
import InputPrefix from "../../../../../components/forms/InputPrefix";
import moment from "moment";
import TextArea from "../../../../../components/forms/TextArea";
import useServerArea from "../../../../../api/useServerArea";
import { CiWarning } from "react-icons/ci";
import Input from "../../../../../components/forms/Input";
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import InlineRadio from "../../../../../components/forms/InlineRadio";
import { AddPay } from "./AddPay";
import { add } from "lodash";
import { EditPay } from "./EditPay";
import Fetching from "../../../../../components/misc/Fetching";

export interface PrepaidReduced {
  paymentId: number;
  amount: number;
  codeCurrency: string;
  payment: number;
}
interface PaymentInterface {
  closeModal: Function;
}

const PaymentContainer = ({ closeModal }: PaymentInterface) => {
  const { control, getValues, trigger, watch, unregister, setValue } = useForm({
    mode: "onChange",
  });

  const { append, remove, fields } = useFieldArray<any>({
    name: "registeredPayments",
    control,
  });
  const { business } = useAppSelector((state) => state.init);
  const {
    order,
    updateSingleOrderState,
    updateAllOrdersState,
    deletePartialPayment,
    isFetching: isFetchingDeleted,
  } = useContext(RegisterDetailsContext);
  const { registerOrderPayment, isFetching } = useServerEcoCycle();
  const { calculatePaymentDiff } = useServer();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const [addPay, setAddPay] = useState(false);
  const [selectPay, setSelectPay] = useState<any | null>(null);

  const {
    applyCoupon,
    couponResult,
    isFetching: fetchingCoupon,
    nullCoupon,
  } = useServerOrders();

  const { getArea, area ,isLoading} = useServerArea();

  useEffect(() => {
    const areaId = watch("areaId");

    if (areaId) {
      getArea(areaId);
    }
  }, [watch("areaId")]);

  useEffect(() => {
    if (!!watch("houseCosted")) {
      unregister(["commission", "discount", "coupon"]);
    }
  }, [watch("houseCosted")]);

  //Selectors ----------------------------------------------------------
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  const paymentMethods: SelectInterface[] =
    business?.configurationsKey
      .find((itm) => itm.key === "payment_methods_enabled")
      ?.value.split(",")
      .map((elem) => ({ id: elem, name: translatePaymetMethods(elem) })) ?? [];

  const updateOrderState = (order: OrderInterface) => {
    updateSingleOrderState!(order);
    updateAllOrdersState!(order);
    remove();
    closeModal();
  };
  //-----------------------------------------------------------------------

  //Submit ----------------------------------------------------------------
  const submitAction = async () => {
    if (await trigger()) {
      let data = getValues();
      if (negativeDiff) {
        data.isPartialPay = true;
      }
      if (!!data.prepaidPayment && data.prepaidPayment.length !== 0) {
        data.prepaidPaymentIds = data.prepaidPayment.map(
          (item: any) => item.paymentId
        );
      }
      data.coupons = [];
      if (data.coupon) {
        data?.coupons.push(data.coupon);
      }
      delete data.prepaidPayment;
      data.discount = data?.discount ?? 0;
      data.commission = data?.commission ?? 0;
      data = cleanObj(data);

      if (area && !area.giveChangeWith) {
        data.amountReturned = [...difference][0];
      }
      registerOrderPayment(order!.id, data, updateOrderState);
    }
  };
  //----------------------------------------------------------------------

  const paymentField =
    watch("registeredPayments")?.map((item: Record<string, any>) => ({
      amount: item.amount ?? 0,
      codeCurrency: item.codeCurrency,
    })) ?? [];

  const prepaidAmounts: PriceInvoiceInterface[] =
    watch("prepaidPayment")?.map((item: PrepaidReduced) => ({
      amount: item.amount,
      codeCurrency: item.codeCurrency,
    })) ?? [];

  const {
    toReturn: totalWithDiscounts,
    discountedTotal,
    commissionTotal,
  } = useMemo(() => {
    const commission = watch("commission") ?? 0;
    const discount = watch("discount") ?? 0;
    const shippingPrice = watch("shippingPrice");

    setValue("commission", commission);
    setValue("discount", discount);

    const discountedTotal: PriceInvoiceInterface[] = [];
    const commissionTotal: PriceInvoiceInterface[] = [];

    let auxDiscount = 0;
    let auxCommission = 0;

    const toReturn: PriceInvoiceInterface[] =
      order?.totalToPay.map((elem) => {
        let amount = elem.amount;
        // let prevAmount = elem.amount;
        let discountOperation = 0;
        let commissionOperation = 0;
        let originalAmount = amount;

        if (discount) {
          discountOperation = mathOperation(
            amount,
            (amount * discount) / 100,
            "subtraction",
            2
          );
          auxDiscount = mathOperation(amount, discountOperation, "subtraction");
          discountedTotal.push({
            amount: mathOperation(amount, discountOperation, "subtraction"),
            codeCurrency: elem.codeCurrency,
          });
        }

        if (commission) {
          commissionOperation = mathOperation(
            amount,
            (amount * commission) / 100,
            "addition",
            2
          );
          auxCommission = mathOperation(
            commissionOperation,
            amount,
            "subtraction"
          );
          commissionTotal.push({
            amount: mathOperation(amount, commissionOperation, "subtraction"),
            codeCurrency: elem.codeCurrency,
          });
        }

        amount -= auxDiscount; //mathOperation(originalAmount, aux, "subtraction",2);
        amount += auxCommission; //mathOperation(originalAmount, aux, "subtraction",2);
        // amount = mathOperation(amount, discountOperation, "subtraction");
        //amount =  mathOperation(amount, commissionOperation, "subtraction");
        //amount = mathOperation(amount, discount, "subtraction");

        return {
          ...elem,
          amount,
        };
      }) ?? [];
    if (shippingPrice) {
      const found = toReturn.find(
        (item) => item.codeCurrency === shippingPrice.codeCurrency
      );

      if (found) {
        found.amount = mathOperation(
          found.amount,
          shippingPrice.amount,
          "addition"
        );
      } else {
        toReturn.push(shippingPrice);
      }
    }

    return { toReturn, discountedTotal, commissionTotal };
  }, [
    watch("commission"),
    watch("discount"),
    watch("coupon"),
    watch("shippingPrice"),
    area,
  ]);

  //Apply selected coupon
  const setCoupon = () => {
    const couponCode = watch("coupon");
    if (!couponCode) {
      toast.error("Seleccione un cupón");
      return;
    }
    const products = order?.selledProducts;
    const dataToCoupon: ApplyCouponBody = {
      coupons: [couponCode],
      listProducts:
        order?.selledProducts.map((prod) => ({
          productId: prod.productId,
          quantity: prod.quantity,
          variationId: prod.variationId,
        })) ?? [],
    };
    applyCoupon(dataToCoupon);
  };

  const couponDiscounts = couponResult?.couponDiscount ?? [];

  const difference = calculatePaymentDiff(totalWithDiscounts, [
    ...paymentField,
    ...(order?.partialPayments ?? []),
    ...prepaidAmounts,
    ...couponDiscounts,
  ]);

  const negativeDiff = difference.some((itm) => itm.amount < 0);

  const totalPayRegister: SimplePrice[] = useMemo(() => {
    if (!order?.partialPayments) return [];

    const groupedPayments: { [key: string]: SimplePrice } = {};

    order.partialPayments.forEach((payment) => {
      const { codeCurrency, amount } = payment;

      if (groupedPayments[codeCurrency]) {
        groupedPayments[codeCurrency].amount += amount;
      } else {
        groupedPayments[codeCurrency] = { codeCurrency, amount };
      }
    });

    return Object.values(groupedPayments);
  }, [order?.partialPayments]);

  const areaSelect = watch("areaId");

  const tableTitle = ["No.", "Fecha", "Monto"];
  const tableData: DataTableInterface[] = [];
  const [extraTable, setExtraTable] = useState<DataTableInterface[]>([]);

  order?.partialPayments.forEach((item, idx) => {
    tableData.push({
      rowId: idx, //item?.id || ,
      payload: {
        "No.": idx + 1,
        //@ts-ignore
        Fecha: formatDateForTable(item?.createdAt),
        Monto: formatCurrency(item?.amount, item?.codeCurrency),
        amount: item.amount,
        codeCurrency: item.codeCurrency,
        paymentWay: item.paymentWay,
        observations: item.observations,
        id: item.id,
      },
    });
  });

  const addPayToTable = (data: any) => {
    const pay = data.registeredPayments;
    setValue("registeredPayments", [...watch("registeredPayments"), pay]);
    setExtraTable([
      ...extraTable,
      {
        rowId: [...tableData, ...extraTable].length + 1,
        payload: {
          "No.": (order?.partialPayments?.length || 0) + extraTable.length + 1,
          Fecha: formatDateForTable(moment().toISOString()),
          Monto: formatCurrency(pay.amount, pay.codeCurrency),
          amount: pay.amount,
          codeCurrency: pay.codeCurrency,
          paymentWay: pay.paymentWay,
          observations: pay.observations,
          madeById: pay.madeById,
          operationNumber: pay.operationNumber,
          registeredPaymentsNumber: watch("registeredPayments").length + 1,
        },
      },
    ]);
  };

  const rowActions = (id: number) => {
    const currentPay = [...tableData, ...extraTable].find(
      (item) => item.rowId === id
    );
    setSelectPay({ ...currentPay?.payload, id });
  };

  const deletedPay = (id: any) => {
    const currentPay = [...tableData, ...extraTable].find(
      (item) => item.rowId === id
    );
    if (currentPay?.payload.id) {
      //Delete backend
      deletePartialPayment &&
        deletePartialPayment(currentPay?.payload.id, () => {});
    } else {
      const update = extraTable.filter((item) => item.rowId !== id);
      setExtraTable(update);
      const pays = watch("registeredPayments") ?? [];

      const updateRegisteredPayments = pays.splice(
        currentPay?.payload.registeredPaymentsNumber,
        1
      );

      setValue("registeredPayments", updateRegisteredPayments);

      //setValue("registeredPayments", update);
    }
  };

  const view = watch("view");
  const RadioValues = [
    {
      label: "Caja",
      value: "cash",
    },
    {
      label: "Pagos anticipados",
      value: "prepaid",
    },
  ];
  if (isFetchingDeleted || isLoading) {
    return (
      <div className="h-screen">
        <Fetching />
      </div>
    );
  }

  return (
    <form>
      <div className="h-full">
        <div className="mt-3">
          {/**Seleccionar Punto de venta y pagos anticipados */}
          <header className="grid grid-cols-2 gap-2  items-center">
            {area?.giveChangeWith && (
              <div className=" w-full col-span-2 flex items-center gap-x-2">
                <CiWarning className="text-yellow-700" />
                <span className="text-yellow-600">
                  El punto de venta no manejará devoluciones de cambio.
                </span>
              </div>
            )}
            <div className="col-span-2">
              <ComboBox
                data={salesAreas}
                name="areaId"
                label="Punto de venta"
                control={control}
                rules={{ required: "* Campo requerido" }}
              />
            </div>
          </header>
          <section>
            <div className="flex w-full gap-x-3 mt-4">
              <InlineRadio
                name="view"
                data={RadioValues}
                control={control}
                defaultValue={RadioValues[0].value}
              />
              {/* <Button
                name="Caja"
                color="slate-600"
                textColor="slate-600"
                action={() => setView("cash")}
                outline
                full
              />
              <Button
                name="Pagos anticipados"
                color="slate-600"
                textColor="slate-600"
                action={() => setView("prepaid")}
                outline
                full
              /> */}
            </div>
          </section>

          {/* Formulario de pago */}
          {view === "cash" && (
            <section className="grid grid-cols-2  border border-gray-400 rounded-md">
              {/*Col 1 */}
              <article className="min-h-[400px]  flex flex-col justify-between gap-y-2 p-5 pt-1  overflow-scroll scrollbar-none scrollbar-thumb-slate-100  border-r-2 ">
                <section className="flex flex-col justify-between  ">
                  <header className="flex justify-between font-semibold items-center my-2">
                    <span className="text-lg">Pagos</span>
                    <div className="max-w-40px max-h-[40px]">
                      <Button
                        icon={<PlusIcon className="h-5" />}
                        color="gray-400"
                        textColor="slate-600"
                        action={
                          () => setAddPay(true)
                          // append({
                          //   amount: undefined,
                          //   codeCurrency: business?.costCurrency,
                          //   paymentWay: undefined,
                          // })
                        }
                        disabled={!areaSelect}
                        outline
                      />
                    </div>
                  </header>
                  <article className="">
                    <GenericTable
                      tableData={[...tableData, ...extraTable]}
                      tableTitles={tableTitle}
                      rowAction={rowActions}
                    />
                  </article>
                  {/*Pagos parciales */}

                  {/*Pagos parciales */}
                  {/**Pagos actuales */}
                </section>

                {/**Resume ----Toggle---------- */}
                <footer className="my-1 border-t border-gray-400   grid grid-cols-1  gap-x-8">
                  {/* Col 1 */}
                  <div>
                    <div className="flex flex-col gap-y- 1">
                      <Toggle
                        name="houseCosted"
                        title="Consumo casa"
                        control={control}
                        disabled={!areaSelect}
                      />

                      {order?.shipping && (
                        <Toggle
                          name="shippingPriceShow"
                          title="Incluir envío"
                          control={control}
                          changeState={() => unregister("shippingPrice")}
                          disabled={!areaSelect}
                        />
                      )}
                      {!watch("houseCosted") && (
                        <>
                          {" "}
                          {/**Discount */}
                          <div className="flex flex-col gap-y-3">
                            <Toggle
                              name="showDiscount"
                              title="Incluir descuento"
                              control={control}
                              changeState={() => {
                                unregister("discount");
                              }}
                              disabled={!areaSelect}
                            />
                            {watch("showDiscount") && (
                              <Input
                                name="discount"
                                label="Descuento %"
                                control={control}
                                type="number"
                                maxLength={2}
                                rules={{
                                  min: 0,
                                  max: 100,
                                }}
                              />
                            )}
                          </div>
                          {/**Commission */}
                          <div className="flex flex-col gap-y-3">
                            <Toggle
                              name="showCommission"
                              title="Incluir comisión"
                              control={control}
                              changeState={() => {
                                unregister("commission");
                              }}
                              disabled={!areaSelect}
                            />

                            {watch("showCommission") && (
                              <Input
                                name="commission"
                                label="Comisión %"
                                control={control}
                                type="number"
                                maxLength={2}
                                rules={{
                                  min: 0,
                                  max: 100,
                                }}
                              />
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      {/** Apply Coupon */}
                      {!watch("houseCosted") && (
                        <div className="flex gap-2 max-w-xs">
                          <AsyncComboBox
                            className="w-full"
                            label="Cupón"
                            name="coupon"
                            control={control}
                            dataQuery={{
                              url: "/administration/marketing/coupon",
                            }}
                            normalizeData={{ id: "code", name: "code" }}
                            disabled={!areaSelect}
                          />
                          <div className="pt-6">
                            {!!couponResult ? (
                              <Button
                                icon={<X className="h-5" />}
                                color="green-700"
                                textColor="green-600"
                                action={nullCoupon}
                                outline
                                disabled={!areaSelect}
                              />
                            ) : (
                              <Button
                                icon={<Check className="h-5" />}
                                color="green-700"
                                textColor="green-600"
                                action={setCoupon}
                                outline
                                loading={fetchingCoupon}
                                disabled={!areaSelect}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/**Resume ----Toggle---------- */}
                  <div>
                    {order?.shipping && watch("shippingPriceShow") && (
                      <CurrencyAmountInput
                        label="Costo de envío "
                        currencies={currenciesSelector}
                        name={`shippingPrice`}
                        control={control}
                        placeholder="$0.00"
                        rules={{
                          required:
                            "Escoja el monto y la moneda que desea ingresar",
                          validate: {
                            amountGreaterThanZero: (value) =>
                              value.amount > 0 || "Monto debe ser mayor a 0",
                            validCurrency: (value) =>
                              value.codeCurrency !== "Moneda" ||
                              "Escoja una moneda",
                          },
                        }}
                      />
                    )}
                  </div>
                </footer>
              </article>

              {/*Col 2 */}
              <article
                className={`flex flex-col justify-between px-5  gap-y-${
                  !watch("houseCosted") ? "10" : "2"
                } mt-3`}
              >
                <aside className="flex flex-col gap-y-3">
                  {/**Subtotal */}
                  <div className="flex justify-between gap-5">
                    <h3 className="text-gray-700 font-semibold text-start">
                      Subtotal:
                    </h3>{" "}
                    <span className="flex flex-col">
                      {order?.totalToPay.reduce(
                        (total, itm) => total + itm.amount,
                        0
                      ) !== 0 ? (
                        order?.totalToPay.map((itm, idx) => (
                          <p className="text-md text-center" key={idx}>
                            {formatCurrency(itm.amount, itm.codeCurrency)}
                          </p>
                        ))
                      ) : (
                        <p className="text-md text-center">0,00</p>
                      )}
                    </span>
                  </div>

                  {/* modificadore */}
                  <div className="">
                    <span className="flex flex-col">
                      {order?.orderModifiers.reduce(
                        (total, itm) => total + itm.amount,
                        0
                      ) !== 0 ? (
                        order?.orderModifiers.map((itm, idx) => (
                          <div className="flex justify-between gap-5 w-full">
                            <h3 className="text-gray-700 font-semibold text-center">
                              {itm.showName}:
                            </h3>{" "}
                            <p className="text-md text-center" key={idx}>
                              {formatCurrency(itm?.amount, itm?.codeCurrency)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-md text-center">0,00</p>
                      )}
                    </span>
                  </div>
                  {/* Cupones */}
                  {couponDiscounts.length !== 0 && !watch("houseCosted") && (
                    <div className="flex justify-between  gap-5">
                      <p className="text-gray-700 font-semibold text-start">
                        Descuento del cupón:
                      </p>{" "}
                      <span className="flex flex-col">
                        {couponDiscounts.length !== 0 &&
                        !watch("houseCosted") ? (
                          couponDiscounts.map((itm, idx) => (
                            <p
                              className={`text-md text-center ${
                                itm.amount >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                              key={idx}
                            >
                              {formatCurrency(itm.amount, itm.codeCurrency)}
                            </p>
                          ))
                        ) : (
                          <p className="text-md text-center">0,00</p>
                        )}
                      </span>
                    </div>
                  )}
                  {/* Descuento */}
                  {discountedTotal &&
                    discountedTotal.length !== 0 &&
                    !watch("houseCosted") && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Descuento aplicado:
                        </p>{" "}
                        <span className="flex flex-col">
                          {discountedTotal.length !== 0 &&
                          !watch("houseCosted") ? (
                            discountedTotal.map((itm: any, idx: any) => (
                              <p
                                className={`text-md text-center ${
                                  itm.amount <= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                key={idx}
                              >
                                -
                                {formatCurrency(itm?.amount, itm?.codeCurrency)}
                              </p>
                            ))
                          ) : (
                            <></>
                          )}
                        </span>
                      </div>
                    )}
                  {/* Comisiones */}
                  {commissionTotal &&
                    commissionTotal.length !== 0 &&
                    !watch("houseCosted") && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Comisión aplicada:
                        </p>{" "}
                        <span className="flex flex-col">
                          {commissionTotal.length !== 0 &&
                          !watch("houseCosted") ? (
                            commissionTotal.map((itm: any, idx: any) => (
                              <p
                                className={`text-md text-center ${
                                  itm.amount <= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                key={idx}
                              >
                                +
                                {formatCurrency(
                                  Math.abs(itm?.amount),
                                  itm?.codeCurrency
                                )}
                              </p>
                            ))
                          ) : (
                            <></>
                          )}
                        </span>
                      </div>
                    )}

                  {/**Anticipo */}
                  {prepaidAmounts.length !== 0 && (
                    <div className="flex justify-between  gap-5">
                      <h3 className="text-gray-700 font-semibold text-center">
                        Anticipo:
                      </h3>{" "}
                      <span className="flex flex-col">
                        {prepaidAmounts.length !== 0 ? (
                          prepaidAmounts.map((itm, idx) => (
                            <p className="text-md text-center" key={idx}>
                              {formatCurrency(itm.amount, itm.codeCurrency)}
                            </p>
                          ))
                        ) : (
                          <p className="text-md text-center">0,00</p>
                        )}
                      </span>
                    </div>
                  )}
                </aside>

                <div className="mb-3 col-span-full ">
                  {/**Total */}
                  <div className="flex flex-col gap-y-3">
                    <div className="flex justify-between  gap-5">
                      <h3 className="text-gray-700 font-semibold text-start">
                        Total a pagar:
                      </h3>{" "}
                      <span className="flex flex-col">
                        {order?.totalToPay.reduce(
                          (total, itm) => total + itm.amount,
                          0
                        ) !== 0 && !watch("houseCosted") ? (
                          totalWithDiscounts.map((itm, idx) => (
                            <p className="text-md text-end" key={idx}>
                              {formatCurrency(itm.amount, itm.codeCurrency)}
                            </p>
                          ))
                        ) : (
                          <p className="text-md text-center">0,00</p>
                        )}
                      </span>
                    </div>

                    {totalPayRegister.length !== 0 && !watch("houseCosted") && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Total Pagado:
                        </p>
                        <span className="flex flex-col">
                          {totalPayRegister.length !== 0 &&
                          !watch("houseCosted") ? (
                            totalPayRegister.map((itm: any, idx: any) => (
                              <p
                                className={`text-md text-center ${
                                  itm.amount >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                key={idx}
                              >
                                {formatCurrency(itm.amount, itm.codeCurrency)}
                              </p>
                            ))
                          ) : (
                            <p className="text-md text-center">0,00</p>
                          )}
                        </span>
                      </div>
                    )}

                    {/**Cambio */}
                    {!area?.giveChangeWith && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-center">
                          Cambio:
                        </p>{" "}
                        <span className="flex flex-col">
                          {difference.length !== 0 && !watch("houseCosted") ? (
                            difference.map((itm, idx) => (
                              <p
                                className={`text-md text-center ${
                                  itm.amount >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                key={idx}
                              >
                                {formatCurrency(itm.amount, itm.codeCurrency)}
                              </p>
                            ))
                          ) : (
                            <p className="text-md text-center">0,00</p>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <footer className="grid grid-cols-2 gap-3  pt-2  my-3 border-t-2 col-span-full w-full ">
                    <Button
                      name="Cancelar"
                      color="slate-600"
                      textColor="slate-600"
                      action={() => closeModal()}
                      outline
                      full
                    />

                    <Button
                      name={`${
                        negativeDiff
                          ? "Registrar pago parcial"
                          : "Pagar factura"
                      }`}
                      color="indigo-600"
                      action={() => submitAction()}
                      loading={isFetching}
                      disabled={
                        isFetching ||
                        (fields.length === 0 && prepaidAmounts.length === 0)
                      }
                    />
                  </footer>
                </div>
              </article>
            </section>
          )}

          {view === "prepaid" && <PrepaidList control={control} />}

          {/* <div className="pt-3">
            {
              <Button
                icon={<PlusIcon className="h-5" />}
                name="Nuevo pago"
                color="gray-400"
                textColor="slate-600"
                action={() =>
                  append({
                    amount: undefined,
                    codeCurrency: business?.costCurrency,
                    paymentWay: undefined,
                  })
                }
                disabled={!areaSelect}
                full
                outline
              />
            }
          </div> */}
          {/* Formulario de pago */}
        </div>
      </div>

      <div className="inline-flex justify-between w-full mt-5">
        {/* <Toggle
          name="sendEmail"
          control={control}
          title="Notificar por correo"
        /> */}
      </div>
      {/* {prepaidView && (
        <Modal state={prepaidView} close={setPrepaidView} size="m">
          <PrepaidList control={control} setPartialView={setPrepaidView} />
        </Modal>
      )} */}
      {addPay && (
        <Modal state={addPay} close={setAddPay} size="m">
          <AddPay close={() => setAddPay(false)} action={addPayToTable} />
        </Modal>
      )}
      {selectPay && (
        <Modal state={!!selectPay} close={setSelectPay} size="m">
          <EditPay
            close={() => setSelectPay(null)}
            action={deletedPay}
            data={selectPay}
          />
        </Modal>
      )}
    </form>
  );
};

interface AccordionItemProps {
  children: React.ReactNode;
  title: string;
  className?: string;
}
const AccordionItem = ({ children, title, className }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Disclosure>
      {({ open }) => (
        <>
          <div className=" w-full">
            <Disclosure.Button className="flex w-full justify-between rounded-lg px-4 py-2 text-left text-sm font-medium  hover:bg-gray-200 focus:outline-none focus-visible:ring ">
              <span className="block text-sm font-medium text-gray-700">
                {title}
              </span>
              <ChevronUpIcon
                className={`${
                  open ? "rotate-180 transform" : ""
                } h-5 w-5 text-gray-500-500 duration-150`}
              />
            </Disclosure.Button>
            {/* <Transition
              show={open}
              enter="transition-opacity duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            > */}
            {/* <Disclosure.Panel className="px-4 pb-2 "> */}
            <div className={`${open ? "block" : "hidden"}`}>{children}</div>
            {/* </Disclosure.Panel> */}
            {/* </Transition> */}
          </div>
        </>
      )}
    </Disclosure>
  );
};

export default PaymentContainer;

// {order?.partialPayments.map((partial, idx) => (
//   <Fragment key={idx}>
//     <AccordionItem title={`Pago # ${idx + 1} `}>
//       <div
//         key={partial.id}
//         className="inline-flex gap-2 w-full items-center mt-5"
//       ></div>
//       <div className="grid grid-cols-2 gap-5 w-full pr-16">
//         <div className="flex flex-col w-full">
//           <h3 className="text-sm font-semibold text-gray-600">
//             Monto
//           </h3>
//           <div className="flex justify-between border border-gray-500 p-2 rounded-md">
//             <p className="pl-1 text-sm text-gray-600">
//               {partial?.amount}
//             </p>
//             <p className="pr-3 text-sm text-gray-600">
//               {partial?.codeCurrency}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col w-full">
//           <h3 className="text-sm font-semibold text-gray-600">
//             Método de pago
//           </h3>
//           <div className="border border-gray-500 p-2 rounded-md">
//             <p className="pl-1 text-sm text-gray-600">
//               {translatePaymetMethods(partial?.paymentWay)}
//             </p>
//           </div>
//         </div>

//         {partial?.cashRegisterOperations?.length >= 0 && (
//           <>
//             {partial?.cashRegisterOperations[0]
//               ?.paymentDateClient && (
//               <div className="flex flex-col w-full col-span-2">
//                 <h3 className="text-sm font-semibold text-gray-600">
//                   Fecha de pago:
//                 </h3>
//                 <div className="border border-gray-500 p-2 rounded-md">
//                   <p className="pl-1 text-sm text-gray-600">
//                     {moment(
//                       partial?.cashRegisterOperations[0]
//                         ?.paymentDateClient
//                     ).format("dddd DD [de] MMMM [del] YYYY")}
//                   </p>
//                 </div>
//               </div>
//             )}
//             {partial?.cashRegisterOperations[0] &&
//               partial?.paymentWay === "CASH" &&
//               partial?.cashRegisterOperations[0]
//                 ?.operationNumber && (
//                 <div className="flex flex-col w-full">
//                   <h3 className="text-sm font-semibold text-gray-600">
//                     Recibo de caja
//                   </h3>
//                   <div className="border border-gray-500 p-2 rounded-md">
//                     <p className="pl-1 text-sm text-gray-600">
//                       RC-
//                       {moment(
//                         partial?.cashRegisterOperations[0]
//                           ?.createdAt
//                       ).year()}
//                       /
//                       {
//                         partial?.cashRegisterOperations[0]
//                           ?.operationNumber
//                       }
//                     </p>
//                   </div>
//                 </div>
//               )}

//             {partial?.cashRegisterOperations[0] &&
//               partial?.cashRegisterOperations[0]?.madeBy && (
//                 <div className=" col-span-2">
//                   <p className="text-sm font-semibold mb-1">
//                     Cobrador/a:
//                   </p>
//                   <div className="border border-gray-300 rounded p-3">
//                     <p className="text-sm">
//                       {partial?.cashRegisterOperations[0]
//                         ?.madeBy?.displayName ?? ""}{" "}
//                       /{" "}
//                       {
//                         partial?.cashRegisterOperations[0]
//                           ?.madeBy?.username
//                       }
//                     </p>
//                   </div>
//                 </div>
//               )}

//             {partial?.observations && (
//               <div className=" col-span-2">
//                 <p className="text-sm font-semibold mb-1">
//                   Observaciones:
//                 </p>
//                 <div className="border border-gray-300 rounded p-3">
//                   <p className="text-sm">
//                     {partial?.observations}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {/* <div className="flex flex-col w-full">
//       <h3 className="text-sm font-semibold text-gray-600">
//         Método de pago
//       </h3>
//       <div className="border border-gray-500 p-2 rounded-md">
//         <p className="pl-1 text-sm text-gray-600">
//           {translatePaymetMethods(partial.paymentWay)}
//         </p>
//       </div>
//     </div> */}
//       </div>
//     </AccordionItem>
//   </Fragment>
// ))}

// {fields.map((field: any, idx) => (
//   <AccordionItem
//     title={`Pago # ${idx + paymentPrevius + 1} `}
//     className="mt-2 grid grid-cols-3"
//   >
//     <div
//       key={field.id}
//       className="inline-flex gap-2 w-full items-center mt-5"
//     >
//       <div className="grid grid-cols-2 gap-5 w-full">
//         <CurrencyAmountInput
//           label="Monto"
//           currencies={["Moneda"].concat(currenciesSelector)}
//           name={`registeredPayments.${idx}`}
//           control={control}
//           placeholder="$0.00"
//           rules={{
//             required:
//               "Escoja el monto y la moneda que desea transferir",
//             validate: {
//               amountGreaterThanZero: (value) =>
//                 value.amount !== 0 || "Monto no debe ser 0",
//               validCurrency: (value) =>
//                 value.codeCurrency !== "Moneda" ||
//                 "Escoja una moneda",
//             },
//           }}
//         />
//         <Select
//           className="py-2"
//           name={`registeredPayments.${idx}.paymentWay`}
//           data={paymentMethods}
//           label="Método de pago"
//           control={control}
//           rules={{ required: "* Requerido" }}
//           defaultValue={field.paymentWay}
//         />

//         <div
//           className={`${
//             watch(`registeredPayments.${idx}.paymentWay`) ===
//             "CASH"
//               ? "col-span-1"
//               : "col-span-2"
//           }`}
//         >
//           <DateInput
//             name={`registeredPayments.${idx}.paymentDateClient`}
//             control={control}
//             label="Fecha de pago "
//             untilToday={true}
//           />
//         </div>
//         {watch(`registeredPayments.${idx}.paymentWay`) ===
//           "CASH" && (
//           <div className="">
//             <InputPrefix
//               label="Registro de caja"
//               name={`registeredPayments.${idx}.operationNumber`}
//               prefix={`RC-${moment().year()}/`}
//               control={control}
//             />
//           </div>
//         )}
//         <div className=" col-span-2">
//           <AsyncComboBox
//             label="Cobrad@r "
//             dataQuery={{
//               url: "/security/users",
//               defaultParams: {
//                 isActive: true,
//               },
//             }}
//             normalizeData={{ id: "id", name: "username" }}
//             name={`registeredPayments.${idx}.managedById`}
//             control={control}
//           />
//         </div>
//         <div className=" col-span-2">
//           <TextArea
//             label="Observaciones"
//             name={`registeredPayments.${idx}.observations`}
//             control={control}
//           />
//         </div>
//       </div>
//       <div className="pb-20">
//         <Button
//           color="red-500"
//           textColor="red-500"
//           outline
//           icon={<TrashIcon className="h-5" />}
//           action={() => remove(idx)}
//         />
//       </div>
//     </div>
//   </AccordionItem>
// ))}
