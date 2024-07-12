import {
  formatCalendar,
  formatCurrency,
  generatePdf,
  printPdf,
} from "../../../../utils/helpers";
import { useAppSelector } from "../../../../store/hooks";
import {
  PriceInvoiceInterface,
  RegisterBillingInterface,
  SimplePrice,
} from "../../../../interfaces/ServerInterfaces";
import OrderStatusBadge from "../../../../components/misc/badges/OrderStatusBadge";
import MultipleActBtn from "../../../../components/misc/MultipleActBtn";
import { FaPen, FaRegFilePdf, FaPrint, FaReplyAll } from "react-icons/fa";
import { MdOutlinePayment } from "react-icons/md";
import { createContext, useContext, useEffect, useState } from "react";
import Modal from "../../../../components/misc/GenericModal";
import { RegisterDetailsContext } from "../RegisterDetailsContainer";
import { WizzardRegisterBilling } from "../registers/WizzardRegisterBilling";
import { ModalAlert } from "../../../../components";
import { ShippingPreBillingStep } from "./ShippingPreBillingStep";
import { RegisterContext } from "../AllRegistersList";
import { FaArrowsRotate, FaX } from "react-icons/fa6";
import moment from "moment";
import BillingReportPdf from "../../../../reports/BillingReportPDF";
import { parseISO } from "date-fns";
import PaymentContainer2 from "./payment/PaymentContainerV2";
import { PrintTicket } from "../../../../utils/PrintTicket";
import useServer from "../../../../api/useServerMain";
interface EditContextBillingInterface {
  defaultValues?: RegisterBillingInterface | null;
  editMode?: boolean | null;
  addedProductsArray?: Array<any>;
  deletedProductsArray?: Array<any>;
  addProductsToAddArray?: Function;
  delProductToAddArray?: Function;
  addProductsToDelArray?: Function;
  delProductToDelArray?: Function;
  setEditWizzard?: Function;
  setAddedProductsArray?: Function;
  setDeletedProductsArray?: Function;
}
export const EditContextBilling = createContext<
  Partial<EditContextBillingInterface>
>({});

interface Props {}

const RegisterDetailsTab = ({}: Props) => {
  const { business } = useAppSelector((state: { init: any }) => state.init);
  const { rollSize } = useAppSelector((state) => state.session);
  const {
    cancelOrder,
    reset,
    clearArrayOfProducts,
    setCurrentStep,
    isFetching,
    refundBillingOrder,
    openPayModal,
    setOpenPayModal,
  } = useContext(RegisterContext);

  //-----------Control open payment modal with register and billing --->
  const [paymentModal, setPaymentModal] = useState(false);
  const { calculatePaymentDiff } = useServer();

  useEffect(() => {
    if (openPayModal) {
      setPaymentModal!(true);
    }
  }, [openPayModal]);
  useEffect(() => {
    if (!paymentModal) {
      setOpenPayModal!(false);
    }
  }, [paymentModal]);
  //-----------Control open payment modal with register and billing --->
  const {
    order,
    closeModalDetails,
    deletePartialPayment,
    updateAllOrdersState,
    updateSingleOrderState,
  } = useContext(RegisterDetailsContext);

  const difference = calculatePaymentDiff(order?.totalToPay, [
    ...(order?.partialPayments ?? []),
  ]);

  const [editWizzard, setEditWizzard] = useState<{
    editMode: boolean;
    defaultValues: RegisterBillingInterface | null;
  }>({ editMode: false, defaultValues: null });
  const [cancelModal, setCancelModal] = useState(false);
  const [convertModal, setConvertModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  // EDIT MODE =================
  const [addedProductsArray, setAddedProductsArray] = useState<any>([]);
  const [deletedProductsArray, setDeletedProductsArray] = useState<any>([]);

  const addProductsToAddArray = (products: any) => {
    setAddedProductsArray([...addedProductsArray, products]);
  };

  const delProductToAddArray = (productId: any) => {
    setAddedProductsArray(
      addedProductsArray.filter(
        (item: any) => item.productId ?? item.product.id !== productId
      )
    );
  };

  const addProductsToDelArray = (products: any) => {
    setDeletedProductsArray([...deletedProductsArray, products]);
  };

  const delProductToDelArray = (productId: any) => {
    setDeletedProductsArray(
      deletedProductsArray.filter((product: any) => product.id !== productId)
    );
  };

  const contextEditValues = {
    defaultValues: editWizzard.defaultValues,
    editMode: editWizzard.editMode,
    addedProductsArray,
    deletedProductsArray,
    addProductsToAddArray,
    delProductToAddArray,
    addProductsToDelArray,
    delProductToDelArray,
    setEditWizzard,
    setDeletedProductsArray,
    setAddedProductsArray,
  };

  // actions
  const actions = [];

  if (!order?.isPreReceipt) {
    if (order?.status !== "REFUNDED") {
      actions.push({
        title: "Exportar albarán",
        icon: <FaRegFilePdf className="h-5 text-gray-500" />,
        action: () => {
          generatePdf(
            BillingReportPdf({ order, business, reportType: "delivery" }),
            "Albarán"
          );
        },
      });
    }
    actions.push(
      {
        title: "Exportar factura",
        icon: <FaRegFilePdf className="h-5 text-gray-500" />,
        action: () => {
          generatePdf(
            BillingReportPdf({ order, business, reportType: "billing" }),
            "Factura"
          );
        },
      },
      {
        title: "Imprimir factura",
        icon: <FaPrint className="h-5 text-gray-500" />,
        action: () => {
          printPdf(
            BillingReportPdf({ order, business, reportType: "billing" }),
            "Factura"
          );
        },
      },
      {
        title: "Imprimir ticket",
        icon: <FaPrint className="h-5 text-gray-500" />,
        action: () => {
          PrintTicket({ order, business, rollSize });
        },
      }
    );
  }

  if (order?.status === "BILLED") {
    actions.push({
      title: "Reembolsar",
      icon: <FaReplyAll className="text-gray-500 h-4" />,
      action: () => setRefundModal(true),
    });
    actions.push({
      title: "Cancelar",
      icon: <FaX className="text-gray-500 h-4" />,
      action: () => setCancelModal(true),
    });
  }

  if (order?.status !== "BILLED" && !order?.isPreReceipt) {
    if (order?.status !== "CANCELLED") {
      if (order?.status !== "REFUNDED") {
        actions.push({
          title: "Registro de pago",
          icon: <MdOutlinePayment className="text-xl text-gray-500" />,
          action: () => setPaymentModal(true),
        });
      }
    }
    if (
      order?.status === "PAYMENT_PENDING" ||
      order?.status === "OVERDUE" ||
      order?.status === "IN_PROCESS" ||
      order?.status === "CREATED"
    ) {
      actions.push({
        title: "Editar",
        icon: <FaPen className="text-gray-500 h-5" />,
        action: () => {
          setEditWizzard({ editMode: true, defaultValues: order! });
        },
      });
      actions.push({
        title: "Cancelar",
        icon: <FaX className="text-gray-500 h-4" />,
        action: () => setCancelModal(true),
      });
    }

    if (order?.status === "CANCELLED") {
      actions.splice(0);
      actions.push(
        {
          title: "Exportar albarán",
          icon: <FaRegFilePdf className="h-5 text-gray-500" />,
          action: () => {
            generatePdf(
              BillingReportPdf({ order, business, reportType: "delivery" }),
              "Albarán"
            );
          },
        },
        {
          title: "Exportar factura",
          icon: <FaRegFilePdf className="h-5 text-gray-500" />,
          action: () => {
            generatePdf(
              BillingReportPdf({ order, business, reportType: "billing" }),
              "Factura"
            );
          },
        },
        {
          title: "Imprimir factura",
          icon: <FaPrint className="h-5 text-gray-500" />,
          action: () => {
            printPdf(
              BillingReportPdf({ order, business, reportType: "billing" }),
              "Factura"
            );
          },
        }
      );
    }
  }

  const editPreBilling = ["CREATED", "PAYMENT_PENDING"];

  // PRE_BILLING
  if (order?.isPreReceipt) {
    if (editPreBilling.includes(order.status)) {
      actions.push(
        {
          title: "Exportar Pre-Factura",
          icon: <FaRegFilePdf className="h-5 text-gray-500" />,
          action: () => {
            // setExportPdfModal({ state: true, type: "Pre-Factura" });
            generatePdf(
              BillingReportPdf({ order, business, reportType: "prebilling" }),
              "Pre-Factura"
            );
          },
        },
        {
          title: "Imprimir Pre-Factura",
          icon: <FaPrint className="h-5 text-gray-500" />,
          action: () => {
            // setExportPdfModal({ state: true, type: "Pre-Factura" });
            printPdf(
              BillingReportPdf({ order, business, reportType: "prebilling" }),
              "Pre-Factura"
            );
          },
        },
        {
          title: "Editar",
          icon: <FaPen className="text-gray-500 h-5" />,
          action: () => {
            setEditWizzard({ editMode: true, defaultValues: order! });
          },
        }
      );
    }
    if (order.status !== "CANCELLED") {
      actions.push(
        {
          title: "Convertir a factura",
          icon: <FaArrowsRotate className="h-5 text-gray-500" />,
          action: () => setConvertModal(true),
        },
        {
          title: "Cancelar",
          icon: <FaX className="text-gray-500 h-4" />,
          action: () => setCancelModal(true),
        }
      );
    }
  }

  if (order?.status === "CANCELLED") {
    actions.length = 0;
    actions.push({
      title: "Exportar factura",
      icon: <FaRegFilePdf className="h-5 text-gray-500" />,
      action: () => {
        generatePdf(
          BillingReportPdf({ order, business, reportType: "billing" }),
          "Factura"
        );
      },
    });
  }

  const closeWizzardInEditModeModal = () => {
    setCurrentStep!(0);
    setEditWizzard({ editMode: false, defaultValues: null });
    //closeModalDetails!();
    clearArrayOfProducts!([]);
    reset!();
  };

  const totalPartialPay: SimplePrice[] = [];

  if (order?.status !== "BILLED") {
    if (order?.partialPayments && order?.partialPayments?.length > 0) {
      for (const item of order?.partialPayments) {
        const found = totalPartialPay.find(
          (data) => data.codeCurrency === item.codeCurrency
        );

        if (found) {
          found.amount += item.amount;
        } else {
          totalPartialPay.push({
            amount: item.amount,
            codeCurrency: item.codeCurrency,
          });
        }
      }
    }
  } else {
    totalPartialPay.push(...order.currenciesPayment);
  }

  const statusNotPay = ["CREATED", "PAYMENT_PENDING", "OVERDUE"];
  const totalToPay: any = statusNotPay.includes(order?.status || "")
    ? [...difference]
    : [...(order?.totalToPay || [])];

  const amountReturn = order?.amountReturned;
  const houseCosted = order?.houseCosted;

  const discount: PriceInvoiceInterface[] = [];
  if (order?.couponDiscountPrice || order?.discount !== 0) {
    if (order?.couponDiscountPrice) discount.push(order?.couponDiscountPrice);
    if (order?.discount !== 0) {
      order?.prices.forEach((item) => {
        const amount = (order.discount / 100) * item.price;
        const idx = discount.findIndex(
          (elem) => elem.codeCurrency === item.codeCurrency
        );
        if (idx !== -1) {
          discount.splice(idx, 1, {
            ...discount[idx],
            amount: discount[idx].amount + amount,
          });
        } else {
          discount.push({ amount: amount, codeCurrency: item.codeCurrency });
        }
      });
    }
  }

  const comission: PriceInvoiceInterface[] = [];
  if (order?.commission! > 0) {
    order?.prices.forEach((item) => {
      const amount = (order.commission / 100) * item.price;
      const idx = comission.findIndex(
        (elem) => elem.codeCurrency === item.codeCurrency
      );
      if (idx !== -1) {
        comission.splice(idx, 1, {
          ...comission[idx],
          amount: comission[idx]?.amount + amount,
        });
      } else {
        comission.push({ amount: amount, codeCurrency: item.codeCurrency });
      }
    });
  }

  return (
    <div className="px-3  overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 h-[26rem]">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-700 font-semibold text-xl">
          {order?.isPreReceipt
            ? ` 
            Pre-Factura No.${order?.preOperationNumber}/${parseISO(
                order?.createdAt!
              ).getFullYear()}`
            : `Factura No.${order?.operationNumber ?? ""}/${parseISO(
                order?.createdAt!
              ).getFullYear()}`}
        </h3>
        <div className="inline-flex items-center gap-2 relative">
          {actions.length > 0 && (
            <div className="fixed right-16 ">
              <MultipleActBtn btnName="Acciones" items={actions} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {!order?.isPreReceipt && order?.preOperationNumber && (
          <div className="inline-flex gap-2">
            <p className="text-gray-600 font-semibold">No. de prefactura:</p>
            <p className="text-gray-500">
              {moment(order?.createdAt).get("year")}/{order.preOperationNumber}
            </p>
          </div>
        )}
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Fecha de creación:</p>
          <p className="text-gray-500">{formatCalendar(order?.createdAt!)}</p>
        </div>
        {order?.paymentDeadlineAt && (
          <div className="inline-flex gap-2">
            <p className="text-gray-600 font-semibold">Fecha de vencimiento:</p>
            <p className="text-gray-500">
              {moment(order?.paymentDeadlineAt).format("YYYY-MM-DD")}
            </p>
          </div>
        )}
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Pagado:</p>
          <p className="text-gray-500">
            {order?.paidAt ? formatCalendar(order.paidAt) : "-"}
          </p>
        </div>
        <div className="inline-flex gap-5 items-center w-full">
          <p className="text-gray-600 font-semibold">Estado:</p>
          <OrderStatusBadge status={order?.status} />
        </div>
        <div className="inline-flex gap-2">
          <p className="text-gray-600 font-semibold">Cliente:</p>
          <p className="text-gray-500">
            {order?.client?.firstName || order?.client?.lastName
              ? `${order?.client?.firstName ?? ""} ${
                  order?.client?.lastName ?? ""
                }`
              : order?.client?.email ?? "Invitado"}
          </p>
        </div>
        {order?.client?.codeClient && (
          <div className="inline-flex gap-2">
            <p className="text-gray-600 font-semibold">Código de cliente: </p>
            <p className="text-gray-500">C-{order?.client?.codeClient ?? ""}</p>
          </div>
        )}
        {order?.client?.contractNumber && (
          <div className="inline-flex gap-2">
            <p className="text-gray-600 font-semibold">No. contrato: </p>
            <p className="text-gray-500">
              NC-{moment(order?.client.createdAt).year()}/
              {order?.client?.contractNumber ?? ""}
            </p>
          </div>
        )}
        {order?.managedBy && (
          <div className="inline-flex gap-2">
            <p className="text-gray-600 font-semibold">Comercial: </p>
            <p className="text-gray-500">
              {order?.managedBy?.username ?? ""}/
              {order?.managedBy?.displayName ?? ""}
            </p>
          </div>
        )}
      </div>

      {/*Cupones*/}
      {/* @ts-ignore */}
      {order?.coupons.length > 0 && (
        <div className="flex flex-row gap-1 mt-2">
          <h5 className="font-semibold text-md">Cupones:</h5>
          {/* @ts-ignone */}
          {order?.coupons
            .map((coupon) => {
              //@ts-ignore
              return coupon.code;
            })
            .join(", ")}
        </div>
      )}

      <footer className="">
        <article className="grid grid-cols-1">
          {totalToPay && !houseCosted && (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">Total a pagar:</p>
              {totalToPay?.map((item: SimplePrice) => {
                return (
                  <p className="text-sm text-gray-500 text-wrap break-words">
                    {formatCurrency(Math.abs(item.amount), item.codeCurrency)}
                  </p>
                );
              })}
            </article>
          )}

          {totalPartialPay.length > 0 && !houseCosted && (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">Total pagado:</p>
              {totalPartialPay.map((item) => {
                return (
                  <p className="text-sm text-gray-500 text-wrap break-words">
                    {formatCurrency(item.amount, item.codeCurrency)}
                  </p>
                );
              })}
            </article>
          )}

          {/* Descuentos */}
          {order?.discount && !houseCosted ? (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">
                Descuento:{" "}
                <p className="text-sm text-gray-500 text-wrap break-words">
                  {order.discount}%
                </p>
              </p>
              <span>
                {discount.map((item) => {
                  return (
                    <p className="text-sm text-gray-500 text-wrap break-words">
                      {formatCurrency(item.amount, item.codeCurrency)}
                    </p>
                  );
                })}
              </span>
            </article>
          ) : (
            ""
          )}
          {/* Comisiones */}
          {order?.commission && !houseCosted ? (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">
                Comisiones:{" "}
                <p className="text-sm text-gray-500 text-wrap break-words">
                  {order.commission}%
                </p>
              </p>
              {comission.map((item) => {
                return (
                  <p className="text-sm text-gray-500 text-wrap break-words">
                    {formatCurrency(item.amount, item.codeCurrency)}
                  </p>
                );
              })}
            </article>
          ) : (
            ""
          )}

          {amountReturn && !houseCosted && amountReturn?.amount > 0 && (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">Cambio:</p>
              <p className="text-sm text-gray-500 text-wrap break-words">
                {formatCurrency(amountReturn.amount, amountReturn.codeCurrency)}
              </p>
            </article>
          )}
        </article>

        <aside className="grid grid-cols-2">
          {order?.customerNote && (
            <div className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">
                Nota ofrecida por el cliente:
              </p>
              <div className=" p-2 ">
                <p className=" text-gray-500 text-wrap break-words">
                  {order?.customerNote}
                </p>
              </div>
            </div>
          )}
          {order?.observations && (
            <div className="flex flex-col pt-3">
              <p className="text-gray-600 text-sm mt-2 font-semibold">
                Observaciones:
              </p>
              <div className=" p-2 ">
                <p className=" text-gray-500 text-wrap break-words">
                  {order?.observations}
                </p>
              </div>
            </div>
          )}
        </aside>
      </footer>

      {paymentModal && (
        <Modal state={paymentModal} close={setPaymentModal} size="l">
          <PaymentContainer2
            closeModal={() => {
              setPaymentModal(false);
            }}
            dependencies={{
              isFetching,
              order,
              deletePartialPayment,
              updateAllOrdersState,
              updateSingleOrderState,
            }}
          />
        </Modal>
      )}
      {editWizzard.editMode && (
        <Modal
          state={editWizzard.editMode}
          close={() => closeWizzardInEditModeModal()}
          size="l"
        >
          <EditContextBilling.Provider value={contextEditValues}>
            <WizzardRegisterBilling
              close={() => closeWizzardInEditModeModal()}
              editMode={editWizzard.editMode}
              defaultValues={editWizzard.defaultValues}
            />
          </EditContextBilling.Provider>
        </Modal>
      )}
      {cancelModal && (
        <ModalAlert
          type="warning"
          title={`Cancelar ${order?.isPreReceipt ? "pre-factura" : "factura"} `}
          text={`¿Está seguro de querer cancelar esta ${
            order?.isPreReceipt ? "pre-factura" : "factura"
          }? Esta operación no se puede deshacer.`}
          onAccept={async () => {
            await cancelOrder!(order!.id);
            setCancelModal(false);
            closeModalDetails!();
          }}
          onClose={() => setCancelModal(false)}
          isLoading={isFetching}
        />
      )}
      {convertModal && (
        <Modal
          close={() => setConvertModal(false)}
          state={convertModal}
          size="l"
        >
          <ShippingPreBillingStep
            close={() => {
              setConvertModal(false);
            }}
          />
        </Modal>
      )}
      {refundModal && (
        <ModalAlert
          type="warning"
          title={`Reembolsar factura `}
          text={`¿Esta seguro de querer reembolsar esta factura en su totalidad?`}
          onAccept={async () => {
            await refundBillingOrder!(order!.id);
            await setCancelModal(false);
            closeModalDetails!();
          }}
          onClose={() => setRefundModal(false)}
          isLoading={isFetching}
        />
      )}
    </div>
  );
};

export default RegisterDetailsTab;

/*  */
