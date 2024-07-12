import { FaPen, FaRegFilePdf, FaPrint, FaReplyAll } from "react-icons/fa";
import { MdOutlinePayment } from "react-icons/md";
import { createContext, useContext, useEffect, useState } from "react";
import { RegisterDetailsContext } from "../RegisterDetailsContainer";
import { FaArrowsRotate, FaX } from "react-icons/fa6";
import moment from "moment";
import { parseISO } from "date-fns";
import { useAppSelector } from "../../../../../store/hooks";
import BillingReportPdf from "../../../../../reports/BillingReportPDF";
import {
  formatCalendar,
  formatCurrency,
  generatePdf,
  printPdf,
} from "../../../../../utils/helpers";
import { PrintTicket } from "../../../../../utils/PrintTicket";
import MultipleActBtn from "../../../../../components/misc/MultipleActBtn";
import OrderStatusBadge from "../../../../../components/misc/badges/OrderStatusBadge";
import {
  RegisterBillingInterface,
  SimplePrice,
} from "../../../../../interfaces/ServerInterfaces";
import Modal from "../../../../../components/misc/GenericModal";
import PaymentContainer2 from "../../../../billing/register/registerDetailsTabs/payment/PaymentContainerV2";

interface Props {}

const RegisterDetailsTab = ({}: Props) => {
  const { business } = useAppSelector((state: { init: any }) => state.init);
  const { rollSize } = useAppSelector((state) => state.session);
  // const {
  //   cancelOrder,
  //   reset,
  //   clearArrayOfProducts,
  //   setCurrentStep,
  //   isFetching,
  //   refundBillingOrder,
  //   openPayModal,
  //   setOpenPayModal,
  // } = useContext(RegisterContext);

  const {
    order,
    closeModalDetails,
    deletePartialPayment,
    updateAllOrdersState,
    updateSingleOrderState,
    isFetching,
    updateStatusPay,
  } = useContext(RegisterDetailsContext);

  const [editWizzard, setEditWizzard] = useState<{
    editMode: boolean;
    defaultValues: RegisterBillingInterface | null;
  }>({ editMode: false, defaultValues: null });
  const [cancelModal, setCancelModal] = useState(false);
  const [convertModal, setConvertModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  // actions
  const actions = [];

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
    }
  );

  const statusWithNotPay = ["CANCELLED", "REFUNDED", "BILLED"];
  if (!statusWithNotPay.includes(order?.status as string) && !order?.isPreReceipt) {
    actions.push({
      title: "Registro de pago",
      icon: <MdOutlinePayment className="text-xl text-gray-500" />,
      action: () => setPaymentModal(true),
    });
  }

  if (order?.status === "CANCELLED") {
    actions.length = 0;
  }

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

  const totalPay =
    order?.status === "BILLED" ? order?.currenciesPayment : [] || [];

  const amountReturn = order?.amountReturned;
  const houseCosted = order?.houseCosted;
  const [paymentModal, setPaymentModal] = useState(false);
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
          {order?.totalToPay && !houseCosted && (
            <article className="flex flex-col pt-3">
              <p className=" text-gray-600 font-semibold">Total a pagar:</p>
              {order?.totalToPay?.map((item) => {
                return (
                  <p className="text-sm text-gray-500 text-wrap break-words">
                    {formatCurrency(item.amount, item.codeCurrency)}
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
                    {formatCurrency(item?.amount, item.codeCurrency)}
                  </p>
                );
              })}
            </article>
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
        <Modal state={paymentModal} close={setPaymentModal} size="m">
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
              updateStateExternal: (value: boolean) => {
                updateStatusPay &&
                  updateStatusPay(
                    order?.selledProducts.map((item) => item.id),
                    value ? "PAYMENT_PENDING" : "BILLED"
                  );
              },
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default RegisterDetailsTab;

/*  */
