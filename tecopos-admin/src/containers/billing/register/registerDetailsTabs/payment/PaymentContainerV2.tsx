/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  OrderInterface,
  PriceInvoiceInterface,
  SimplePrice,
} from "../../../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../../../store/hooks";
import Button from "../../../../../components/misc/Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  ApplyCouponBody,
  SelectInterface,
} from "../../../../../interfaces/InterfacesLocal";
import useServerEcoCycle from "../../../../../api/useServerEconomicCycle";
import {
  cleanObj,
  formatCurrency,
  printPdf,
  truncateValue,
} from "../../../../../utils/helpers";
import useServer from "../../../../../api/useServerMain";
import { translatePaymetMethods } from "../../../../../utils/translate";
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
import moment from "moment";
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
import BillingReportPdf from "../../../../../reports/BillingReportPDF";

export interface PrepaidReduced {
  paymentId: number;
  amount: number;
  codeCurrency: string;
  payment: number;
}
interface PaymentInterface {
  closeModal: Function;
  dependencies: {
    order: OrderInterface | undefined | null;
    updateSingleOrderState: Function | undefined;
    updateAllOrdersState: Function | undefined;
    deletePartialPayment: Function | undefined;
    isFetching: boolean | undefined;
    updateStateExternal?: Function;
  };
}

const PaymentContainer2 = ({ closeModal, dependencies }: PaymentInterface) => {
  const { control, getValues, trigger, watch, unregister, setValue } = useForm({
    mode: "onChange",
  });

  const { append, remove, fields } = useFieldArray<any>({
    name: "registeredPayments",
    control,
  });
  const { business } = useAppSelector((state) => state.init);
  //-------------Usando el contexto ------------------//
  // const {
  //   order,
  //   updateSingleOrderState,
  //   updateAllOrdersState,
  //   deletePartialPayment,
  //   isFetching: isFetchingDeleted,
  // } = useContext(RegisterDetailsContext);
  //-------------Usando el contexto ------------------//
  const {
    order,
    updateSingleOrderState,
    updateAllOrdersState,
    deletePartialPayment,
    isFetching: isFetchingDeleted,
    updateStateExternal,
  } = dependencies;

  const { registerOrderPayment, isFetching } = useServerEcoCycle();
  const { calculatePaymentDiff } = useServer();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const [addPay, setAddPay] = useState(false);
  const [selectPay, setSelectPay] = useState<any | null>(null);
  //Estados buttons
  const [shippingPriceShow, setShippingPriceShow] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [showCupon, setShowCupon] = useState(false);
  const [houseCosted, setHouseCosted] = useState(false);
  const [loadingHelper, setLoadingHelper] = useState(false);

  //Config Keys
  const allow_commission =
    business?.configurationsKey.find((item) => item.key === "allow_commission")
      ?.value === "true" ?? false;
  const allow_discounts =
    business?.configurationsKey.find((item) => item.key === "allow_discounts")
      ?.value === "true" ?? false;
  const show_coupons_in_tablet =
    business?.configurationsKey.find(
      (item) => item.key === "show_coupons_in_tablet"
    )?.value === "true" ?? false;

  const {
    applyCoupon,
    couponResult,
    isFetching: fetchingCoupon,
    nullCoupon,
  } = useServerOrders();

  useEffect(() => {
    if (houseCosted) {
      unregister(["commission", "discount", "coupon"]);
    }
    setValue("houseCosted", houseCosted);
  }, [houseCosted]);

  useEffect(() => {
    if (!shippingPriceShow) {
      unregister("shippingPrice");
    }
    if (!showDiscount) {
      unregister("discount");
    }
    if (!showCommission) {
      unregister("commission");
    }
    if (showCommission || showDiscount) {
      unregister("coupon");
    }
  }, [shippingPriceShow, showDiscount, showCommission]);

  //----------------------------------Loadings---------------------------------

  //Selectors ----------------------------------------------------------
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

  const areaSelect = watch("areaId") ?? order?.areaSales;

  const currentArea = areas.find((item) => item.id === areaSelect);

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm?.code) ?? [];

  const updateOrderState = (order: OrderInterface) => {
    updateSingleOrderState && updateSingleOrderState!(order);
    updateAllOrdersState && updateAllOrdersState!(order);
    remove();
    closeModal();
  };
  //Selectors ----------------------------------------------------------

  //Submit ----------------------------------------------------------------
  const submitAction = async (functionHelper?: any) => {
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

      if (currentArea && !currentArea.giveChangeWith) {
        data.amountReturned = [...difference][0];
      }
      functionHelper && setLoadingHelper(true);
      registerOrderPayment(order!.id, data, (resp: any) => {
        updateOrderState(resp);
        functionHelper && functionHelper();
        updateStateExternal && updateStateExternal(data.isPartialPay);
      });
    }
  };
  //----------------------------------------------------------------------

  //-----------------Helpers-------------------------------------------
  const paymentField =
    watch("registeredPayments")?.map((item: Record<string, any>) => ({
      amount: item?.amount ?? 0,
      codeCurrency: item?.codeCurrency,
    })) ?? [];

  const prepaidAmounts: PriceInvoiceInterface[] =
    watch("prepaidPayment")?.map((item: PrepaidReduced) => ({
      amount: item.amount,
      codeCurrency: item.codeCurrency,
    })) ?? [];
  //-----------------Helpers-------------------------------------------

  const acuPayment = useMemo(() => {
    let acuPayment: Array<SimplePrice> = [];

    paymentField.forEach((item: any) => {
      const found = acuPayment.find(
        (itm) => itm.codeCurrency === item.codeCurrency
      );

      if (found) {
        acuPayment = acuPayment.map((itm) => {
          if (itm.codeCurrency === item.codeCurrency) {
            return {
              ...itm,
              amount: mathOperation(itm.amount, item.amount, "addition", 2),
            };
          }

          return itm;
        });
      } else {
        acuPayment.push({
          amount: item.amount,
          codeCurrency: item.codeCurrency,
        });
      }
    });

    return acuPayment;
  }, [paymentField]);

  //------------------Calculo de la orden------------
  const {
    toReturn: totalWithDiscounts,
    discountedTotal,
    commissionTotal,
    orderModifiers,
    simplePrices,
    aux,
  } = useMemo(() => {
    const toReturn: PriceInvoiceInterface[] = [];
    const discountedTotal: PriceInvoiceInterface[] = [];
    const commissionTotal: PriceInvoiceInterface[] = [];

    const discount = watch("discount");
    const commission = watch("commission");
    const shippingPrice = watch("shippingPrice");

    let simplePrices: Array<SimplePrice> = [];
    let aux: Array<SimplePrice> = [];
    let totalPrices: Array<SimplePrice> = [];

    let orderModifiers: Array<{
      showName: string;
      amount: number;
      codeCurrency: string;
    }> = [];

    //@ts-ignore
    for (const selledProduct of order?.selledProducts || []) {
      const found = simplePrices.find(
        (item) => item.codeCurrency === selledProduct.priceUnitary.codeCurrency
      );

      let priceTotal = mathOperation(
        selledProduct.priceUnitary.amount,
        selledProduct.quantity,
        "multiplication",
        3
      );

      priceTotal = truncateValue(priceTotal, 2);
      if (found) {
        simplePrices = simplePrices.map((item) => {
          if (
            item?.codeCurrency === selledProduct?.priceUnitary?.codeCurrency
          ) {
            return {
              ...item,
              amount: mathOperation(item?.amount, priceTotal, "addition", 2),
            };
          }
          return item;
        });
        aux = aux.map((item) => {
          if (
            item?.codeCurrency === selledProduct?.priceUnitary?.codeCurrency
          ) {
            return {
              ...item,
              amount: mathOperation(item?.amount, priceTotal, "addition", 2),
            };
          }
          return item;
        });
      } else {
        simplePrices.push({
          amount: priceTotal,
          codeCurrency: selledProduct.priceUnitary?.codeCurrency,
        });
        aux.push({
          amount: priceTotal,
          codeCurrency: selledProduct.priceUnitary?.codeCurrency,
        });
      }
    }

    totalPrices = [...simplePrices];

    if (discount || commission) {
      //Total to discount and comision
      let discountOperation = 0;
      let commissionOperation = 0;

      // var helper
      let auxDiscount = 0;
      let auxCommission = 0;

      for (const price of totalPrices) {
        if (discount) {
          //calculate value before discount
          discountOperation = mathOperation(
            price.amount,
            (price.amount * discount) / 100,
            "subtraction",
            2
          );
          discountedTotal.push({
            amount: (price.amount * discount) / 100,
            codeCurrency: price.codeCurrency,
          });

          //calculate total to dicount
          auxDiscount = mathOperation(
            price.amount,
            discountOperation,
            "subtraction"
          );
        }
        if (commission) {
          //calculate value before commission
          commissionOperation = mathOperation(
            price.amount,
            (price.amount * commission) / 100,
            "addition",
            2
          );

          commissionTotal.push({
            amount: (price.amount * commission) / 100,
            codeCurrency: price.codeCurrency,
          });
          //calculate total to comission
          auxCommission = mathOperation(
            commissionOperation,
            price.amount,
            "subtraction",
            2
          );
        }

        // operation in total to pay
        if (auxCommission > 0) {
          price.amount = mathOperation(
            price.amount,
            auxCommission,
            "addition",
            2
          );
        }

        if (auxDiscount > 0) {
          price.amount = mathOperation(
            price.amount,
            auxDiscount,
            "subtraction",
            2
          );
        }
      }
    }

    //---> Processing modifiers
    const modifiersFromGrosSubtotal = currentArea?.modifiers?.filter(
      (item) => item.applyToGrossSales && item.active
    );

    for (const modifier of modifiersFromGrosSubtotal ?? []) {
      if (modifier.applyFixedAmount) {
        if (!modifier.fixedPrice) {
          continue;
        }

        let normalizedAmount = modifier.fixedPrice.amount;
        if (modifier.type === "discount") {
          normalizedAmount = normalizedAmount * -1;
        }

        const found = totalPrices.find(
          (item) => item.codeCurrency === modifier.fixedPrice.codeCurrency
        );

        if (found) {
          totalPrices = totalPrices.map((item) => {
            if (item.codeCurrency === modifier.fixedPrice.codeCurrency) {
              return {
                ...item,
                amount: mathOperation(
                  item.amount,
                  normalizedAmount,
                  "addition",
                  2
                ),
              };
            }

            return item;
          });
        } else {
          totalPrices.push({
            amount: normalizedAmount,
            codeCurrency: modifier.fixedPrice.codeCurrency,
          });
        }

        orderModifiers.push({
          showName: modifier.showName || modifier.name,
          amount: normalizedAmount,
          codeCurrency: modifier.fixedPrice.codeCurrency,
        });
      } else {
        for (const price of totalPrices) {
          let normalizedAmount = mathOperation(
            price.amount,
            modifier.amount / 100,
            "multiplication",
            2
          );
          if (modifier.type === "discount") {
            normalizedAmount = normalizedAmount * -1;
          }

          const found = totalPrices.find(
            (item) => item.codeCurrency === price.codeCurrency
          );

          if (found) {
            totalPrices = totalPrices.map((item) => {
              if (item.codeCurrency === price.codeCurrency) {
                return {
                  ...item,
                  amount: mathOperation(
                    item.amount,
                    normalizedAmount,
                    "addition",
                    2
                  ),
                };
              }

              return item;
            });
          } else {
            totalPrices.push({
              amount: normalizedAmount,
              codeCurrency: price.codeCurrency,
            });
          }

          orderModifiers.push({
            showName: modifier.showName || modifier.name,
            amount: normalizedAmount,
            codeCurrency: price.codeCurrency,
          });
        }
      }
    }

    //Rest of modifiers by order
    const otherModifiers =
      currentArea?.modifiers
        ?.filter((item) => item.applyAcumulative && item.active)
        .sort((item) => (item.index > item.index ? 1 : -1)) ?? [];

    //@ts-ignore
    for (const modifier of otherModifiers) {
      if (modifier.applyFixedAmount) {
        if (!modifier.fixedPrice) {
          continue;
        }

        let normalizedAmount = modifier.fixedPrice.amount;
        if (modifier.type === "discount") {
          normalizedAmount = normalizedAmount * -1;
        }

        const found = totalPrices.find(
          (item) => item.codeCurrency === modifier.fixedPrice.codeCurrency
        );

        if (found) {
          totalPrices = totalPrices.map((item) => {
            if (item.codeCurrency === modifier.fixedPrice.codeCurrency) {
              return {
                ...item,
                amount: mathOperation(
                  item.amount,
                  normalizedAmount,
                  "addition",
                  2
                ),
              };
            }

            return item;
          });
        } else {
          totalPrices.push({
            amount: normalizedAmount,
            codeCurrency: modifier.fixedPrice.codeCurrency,
          });
        }

        orderModifiers.push({
          showName: modifier.showName || modifier.name,
          amount: normalizedAmount,
          codeCurrency: modifier.fixedPrice.codeCurrency,
        });
      } else {
        for (const price of totalPrices) {
          let normalizedAmount = mathOperation(
            price.amount,
            modifier.amount / 100,
            "multiplication",
            2
          );
          if (modifier.type === "discount") {
            normalizedAmount = normalizedAmount * -1;
          }

          price.amount = mathOperation(
            price.amount,
            normalizedAmount,
            "addition",
            2
          );

          orderModifiers.push({
            showName: modifier.showName || modifier.name,
            amount: normalizedAmount,
            codeCurrency: price.codeCurrency,
          });
        }
      }
    }

    //5. Adding shipping
    if (shippingPrice) {
      const found = totalPrices?.find(
        (item) => item.codeCurrency === shippingPrice?.codeCurrency
      );

      if (found) {
        totalPrices = totalPrices.map((item) => {
          if (item?.codeCurrency === shippingPrice?.codeCurrency) {
            return {
              ...item,
              amount: mathOperation(
                item?.amount,
                shippingPrice?.amount,
                "addition",
                2
              ),
            };
          }

          return item;
        });
      } else {
        totalPrices.push({
          amount: shippingPrice.amount,
          codeCurrency: shippingPrice.codeCurrency,
        });
      }
    }

    //Registering totals to pay
    let bulkTotal = [];
    for (const price of totalPrices) {
      if (!houseCosted) {
        toReturn.push({
          amount: price.amount,
          codeCurrency: price.codeCurrency,
        });
      }
    }
    return {
      toReturn,
      simplePrices,
      aux,
      discountedTotal,
      commissionTotal,
      orderModifiers,
    };
  }, [
    watch("commission"),
    watch("discount"),
    watch("coupon"),
    watch("shippingPrice"),
    currentArea,
    houseCosted,
  ]);
  //------------------Calculo de la orden------------

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

  //------------------------Table --------------------------//
  const tableTitle = ["No.", "Fecha", "Monto", "Método"];
  const tableData: DataTableInterface[] = [];
  const [extraTable, setExtraTable] = useState<DataTableInterface[]>([]);

  order?.partialPayments?.forEach((item, idx) => {
    tableData.push({
      rowId: idx, //item?.id || ,
      payload: {
        "No.": idx + 1,
        //@ts-ignore
        Fecha: moment(item?.createdAt).format("DD/MM"),
        Monto: formatCurrency(item?.amount, item?.codeCurrency),
        Método: translatePaymetMethods(item?.paymentWay),
        amount: item.amount,
        codeCurrency: item.codeCurrency,
        paymentWay: item.paymentWay,
        observations: item.observations,
        id: item.id,
      },
    });
  });

  const addPayToTable = (data: any) => {
    const pay = data;

    setValue("registeredPayments", [...watch("registeredPayments"), pay]);
    const lent = watch("registeredPayments").length;
    setExtraTable([
      ...extraTable,
      {
        rowId: [...tableData, ...extraTable].length + 1,
        payload: {
          "No.": (order?.partialPayments?.length || 0) + extraTable.length + 1,
          Fecha: moment().format("DD/MM"),
          Monto: formatCurrency(pay?.amount, pay?.codeCurrency),
          Método: translatePaymetMethods(pay?.paymentWay),
          amount: pay?.amount,
          codeCurrency: pay?.codeCurrency,
          paymentWay: pay?.paymentWay,
          observations: pay?.observations,
          madeById: pay?.madeById,
          operationNumber: pay?.operationNumber,
          registeredPaymentsNumber:
            lent === 1 ? 0 : watch("registeredPayments").length - 1,
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
      const update2 = update.map((item) => {
        const numberItem = (item?.payload["No."] || 0) as number;

        const newNumber = numberItem > 1 ? numberItem - 1 : numberItem;
        return {
          ...item,
          payload: {
            ...item.payload,
            "No.": newNumber,
            registeredPaymentsNumber: newNumber - 1,
          },
        };
      });

      setExtraTable(update2);
      const pays = [...watch("registeredPayments")] ?? [];

      //:Todo Temporal
      const idx = currentPay?.payload.registeredPaymentsNumber;

      pays.splice(
        //@ts-ignore
        idx,
        1
      );

      if (pays.length === 0) {
        setValue("registeredPayments", []);
      } else {
        setValue("registeredPayments", [...pays]);
      }
    }
  };
  //------------------------Table --------------------------//
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

  const conditionalWithPay =
    fields.length === 0 &&
    prepaidAmounts.length === 0 &&
    negativeDiff &&
    !houseCosted;

  const printOrder = () => {
    printPdf(
      BillingReportPdf({
        order,
        business,
        reportType: "billing",
      }),
      "Factura"
    );
  };

  if (isFetchingDeleted) {
    return (
      <div className="h-[610px]">
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
            {currentArea?.giveChangeWith && (
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
                defaultValue={order?.areaSales?.id}
              />
            </div>
          </header>
          <section>
            <div className="flex w-full gap-x-3 mt-4">
              <InlineRadio
                name="view"
                data={RadioValues}
                control={control}
                defaultValue={RadioValues[0]?.value}
              />
            </div>
          </section>

          {/* Formulario de pago */}
          {view === "cash" && (
            <section className="grid grid-cols-2  border border-gray-400 rounded-md">
              {/*Col 1 */}
              <article className="min-h-[400px]  flex flex-col justify-between gap-y-2 p-2 pt-1  overflow-scroll scrollbar-none scrollbar-thumb-slate-100  border-r-2 ">
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
                  <article className=" ">
                    {!addPay && (
                      <>
                        <GenericTable
                          tableData={[...tableData, ...extraTable]}
                          tableTitles={tableTitle}
                          rowAction={rowActions}
                        />
                      </>
                    )}
                    {addPay && (
                      <AddPay
                        close={() => setAddPay(false)}
                        action={addPayToTable}
                        defaultPaymentMethod={currentArea?.defaultPaymentMethod}
                        defaultPaymentCurrency={
                          currentArea?.defaultPaymentCurrency
                        }
                      />
                    )}
                  </article>
                  {/*Pagos parciales */}

                  {/*Pagos parciales */}
                  {/**Pagos actuales */}
                </section>

                {/**Resume ----Toggle---------- */}
                <footer className="my-1 border-t border-gray-400   grid grid-cols-1  gap-x-8">
                  {/* Col 1 */}
                  <div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1  col-span-full  my-2">
                      {order?.shipping && !houseCosted && (
                        <div className="w-fit">
                          <Button
                            color={`${shippingPriceShow ? "black" : ""}`}
                            outline={false}
                            textColor={`${
                              shippingPriceShow ? "white" : "black"
                            }`}
                            name="Envío"
                            action={() =>
                              setShippingPriceShow(!shippingPriceShow)
                            }
                          />
                        </div>
                      )}
                      {!houseCosted && (
                        <>
                          {" "}
                          {/**Discount */}
                          {allow_discounts && (
                            <div className="flex flex-col gap-y-3">
                              <Button
                                color={`${showDiscount ? "black" : ""}`}
                                outline={false}
                                textColor={`${
                                  showDiscount ? "white" : "black"
                                }`}
                                name="Descuento"
                                action={() => setShowDiscount(!showDiscount)}
                              />
                            </div>
                          )}
                          {/**Commission */}
                          {allow_commission && (
                            <div className="flex flex-col gap-y-3">
                              <Button
                                color={`${showCommission ? "black" : "gray"}`}
                                outline={false}
                                textColor={`${
                                  showCommission ? "white" : "black"
                                }`}
                                name="Comisión"
                                action={() =>
                                  setShowCommission(!showCommission)
                                }
                              />
                            </div>
                          )}
                          {show_coupons_in_tablet && (
                            <div>
                              {/* Cupon */}
                              <Button
                                color={`${showCupon ? "black" : "gray"}`}
                                textColor={`${showCupon ? "white" : "black"}`}
                                name="Cupón"
                                action={() => setShowCupon(!showCupon)}
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="">
                        <Button
                          color={`${houseCosted ? "black" : ""}`}
                          outline={false}
                          textColor={`${houseCosted ? "white" : "black"}`}
                          name="Consumo casa"
                          action={() => setHouseCosted(!houseCosted)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-x-2 gap-y-3 "></div>
                    {!houseCosted && (
                      <div>
                        {showDiscount && (
                          <div className="col-span-full">
                            <Input
                              name="discount"
                              label="Descuento %"
                              control={control}
                              type="number"
                              rules={{
                                min: 0,
                                max: 100,
                              }}
                            />
                          </div>
                        )}
                        {showCommission && (
                          <div className="col-span-full">
                            <Input
                              name="commission"
                              label="Comisión %"
                              control={control}
                              type="number"
                              rules={{
                                min: 0,
                                max: 100,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      {/** Apply Coupon */}
                      {!houseCosted &&
                        !showCommission &&
                        !showDiscount &&
                        showCupon && (
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
                    {order?.shipping && shippingPriceShow && !houseCosted && (
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
                  !houseCosted ? "10" : "2"
                } mt-3`}
              >
                <aside className="flex flex-col gap-y-3">
                  {/**Subtotal */}
                  <div className="flex justify-between gap-5">
                    <h3 className="text-gray-700 font-semibold text-start">
                      Subtotal:
                    </h3>{" "}
                    <span className="flex flex-col">
                      {aux.reduce((total, itm) => total + itm.amount, 0) !==
                      0 ? (
                        aux.map((itm, idx) => (
                          <p className="text-md text-center" key={idx}>
                            {formatCurrency(itm.amount, itm.codeCurrency)}
                          </p>
                        ))
                      ) : (
                        <p className="text-md text-center">0,00</p>
                      )}
                    </span>
                  </div>
                  {/* modificadores */}
                  <div className="">
                    {
                      //@ts-ignore
                      currentArea?.id === order?.areaSales ? (
                        <span className="flex flex-col">
                          {order?.orderModifiers.reduce(
                            (total, itm) => total + itm.amount,
                            0
                          ) !== 0 &&
                            order?.orderModifiers.map((itm, idx) => (
                              <div className="flex justify-between gap-5 w-full">
                                <h3 className="text-gray-700 font-semibold text-center">
                                  {itm.showName}:
                                </h3>{" "}
                                <p className="text-md text-center" key={idx}>
                                  {formatCurrency(
                                    itm?.amount,
                                    itm?.codeCurrency
                                  )}
                                </p>
                              </div>
                            ))}
                        </span>
                      ) : (
                        <span className="flex flex-col">
                          {orderModifiers.reduce(
                            (total, itm) => total + itm.amount,
                            0
                          ) !== 0 &&
                            orderModifiers.map((itm, idx) => (
                              <div className="flex justify-between gap-5 w-full">
                                <h3 className="text-gray-700 font-semibold text-center">
                                  {itm.showName}:
                                </h3>{" "}
                                <p className="text-md text-center" key={idx}>
                                  {formatCurrency(
                                    itm?.amount,
                                    itm?.codeCurrency
                                  )}
                                </p>
                              </div>
                            ))}
                        </span>
                      )
                    }
                  </div>
                  {/* Cupones */}
                  {couponDiscounts.length !== 0 && !houseCosted && (
                    <div className="flex justify-between  gap-5">
                      <p className="text-gray-700 font-semibold text-start">
                        Descuento del cupón:
                      </p>{" "}
                      <span className="flex flex-col">
                        {couponDiscounts.length !== 0 && !houseCosted ? (
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
                    !houseCosted && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Descuento aplicado:
                        </p>{" "}
                        <span className="flex flex-col">
                          {discountedTotal.length !== 0 && !houseCosted ? (
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
                    !houseCosted && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Comisión aplicada:
                        </p>{" "}
                        <span className="flex flex-col">
                          {commissionTotal.length !== 0 && !houseCosted ? (
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
                        ) !== 0 && !houseCosted ? (
                          //@ts-ignore
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

                    {totalPayRegister.length !== 0 && !houseCosted && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold text-start">
                          Total Pagado:
                        </p>
                        <span className="flex flex-col">
                          {totalPayRegister.length !== 0 && !houseCosted ? (
                            totalPayRegister.map((itm: any, idx: any) => (
                              <p
                                className={`text-md  ${
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
                            <p className="text-md ">0,00</p>
                          )}
                        </span>
                      </div>
                    )}

                    {/**Acumulado de pago  */}
                    {acuPayment?.length > 0 && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold ">
                          Acumulado de pago:
                        </p>{" "}
                        <span className="flex flex-col">
                          {acuPayment.length !== 0 && !houseCosted ? (
                            acuPayment.map((itm: any, idx: number) => (
                              <p
                                className={`text-md text-center ${
                                  itm.amount >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                key={idx}
                              >
                                {formatCurrency(itm?.amount, itm?.codeCurrency)}
                              </p>
                            ))
                          ) : (
                            <p className="text-md ">0,00</p>
                          )}
                        </span>
                      </div>
                    )}
                    {/**Cambio */}
                    {!currentArea?.giveChangeWith && (
                      <div className="flex justify-between  gap-5">
                        <p className="text-gray-700 font-semibold ">Cambio:</p>{" "}
                        <span className="flex flex-col">
                          {difference.length !== 0 && !houseCosted ? (
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
                            <p className="text-md ">0,00</p>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <footer className="grid grid-cols-2 gap-3  pt-2  my-3 border-t-2 col-span-full w-full ">
                    <Button
                      name={`${
                        negativeDiff ? "Imprimir" : "Facturar e imprimir"
                      }`}
                      color="slate-600"
                      textColor="slate-600"
                      //action={() => closeModal()}
                      action={() => {
                        negativeDiff ? printOrder() : submitAction(printOrder);
                      }}
                      outline
                      full
                      loading={isFetching && !negativeDiff && loadingHelper}
                      disabled={isFetching}
                    />

                    <Button
                      name={`${
                        negativeDiff ? "Registrar pago parcial" : "Facturar"
                      }`}
                      color="indigo-600"
                      action={() => submitAction()}
                      loading={isFetching && !loadingHelper}
                      disabled={isFetching || conditionalWithPay}
                    />
                  </footer>
                </div>
              </article>
            </section>
          )}

          {view === "prepaid" && <PrepaidList control={control} />}
        </div>
      </div>

      <div className="inline-flex justify-between w-full mt-5"></div>

      {/* {addPay && (
        <Modal state={addPay} close={setAddPay} size="m">
          <AddPay close={() => setAddPay(false)} action={addPayToTable} />
        </Modal>
      )} */}
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

export default PaymentContainer2;
