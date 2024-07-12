/* eslint-disable @typescript-eslint/no-unused-vars */
import Fetching from "../../../components/misc/Fetching";
import {
  formatCalendar,
  formatCurrency,
  formatDate,
} from "../../../utils/helpers";
import { useForm } from "react-hook-form";
import { useContext, useEffect, useState } from "react";
import { BasicType } from "../../../interfaces/InterfacesLocal";
import { useServerBilling } from "../../../api/useServerBilling";
import MultipleActBtn from "../../../components/misc/MultipleActBtn";
import { FaEdit, FaMoneyBillWave, FaReplyAll } from "react-icons/fa";
import TextArea from "../../../components/forms/TextArea";
import OrderStatusBadge from "../../../components/misc/badges/OrderStatusBadge";
import { translatePaymetMethods } from "../../../utils/translate";
import { PrepaidContext } from "./AllPrepaidList";
import Modal from "../../../components/misc/GenericModal";
import { EditPrepaidPayment } from "./newPrepaid/EditPrepeaidPayment";
import { padStart } from "lodash";
import moment from "moment";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { ModalAlert } from "../../../components";
import PrepaidStatusBadge from "../../../components/misc/badges/PrepaidStatusBadge";

interface DetailsPrepaidPaymentInterface {
  id: number | null;
  closeModal: Function;
  fetching: boolean;
}

const DetailsPrepaidPayment = ({
  id,
  fetching,
  closeModal,
}: DetailsPrepaidPaymentInterface) => {
  const { control } = useForm();

  //   const { costCurrency: mainCurrency } = useAppSelector(
  //     (state) => state.init.business!
  //   );
  const [showModal, setShowModal] = useState<boolean>(false);
  const [refundModal, setRefundModal] = useState(false);
  const {
    setPrepaidsList,
    prepaidsList,
    getPrepaidPaymentById,
    prepaidById,
    isFetching,
    refundPrepaidPayment,
  } = useContext(PrepaidContext);

  const [filter, setFilter] = useState<BasicType>({
    client: true,
    order: true,
  });
  useEffect(() => {
    //@ts-ignore
    id && getPrepaidPaymentById(id, filter);
    //@ts-ignore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const updateDoom = (id:any) => {

  //   const pay = prepaidsList.find((item : any) => item.id === id)

  //   pay.status = ""

  // };

  const actions = [
    {
      title: "Reembolsar",
      icon: <FaMoneyBillWave className="h-5 text-gray-500" />,
      action: () => {
        setRefundModal(true);
      },
    },
  ];

  if (prepaidById && prepaidById.status === "PAID") {
    actions.push({
      title: "Editar pago",
      icon: <FaEdit className="h-5 text-gray-500" />,
      action: () => {
        setShowModal(true);
      },
    });
  }

  if (isFetching)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <>
      {prepaidById && (
        <article>
          <header className="flex justify-between items-center">
            <h3 className="text-gray-700 font-semibold text-xl">
              Pago anticipado #{prepaidById?.paymentNumber}
            </h3>
            {prepaidById.status === "PAID" && (
              <MultipleActBtn btnName="Acciones" items={actions} />
            )}
          </header>

          <div className=" flex flex-col gap-y-2">
            <div className="mt-5 flex flex-col gap-2">
              <div className="inline-flex gap-2">
                <p className="text-gray-600 font-semibold">Fecha de pago:</p>
                <p className="text-gray-500">
                  {formatCalendar(prepaidById?.createdAt!)}
                </p>
              </div>

              <div className="inline-flex gap-5 items-center w-full">
                <p className="text-gray-600 font-semibold">Estado:</p>
                <PrepaidStatusBadge status={prepaidById?.status} />
              </div>
            </div>

            <div className="inline-flex gap-2">
              <p className="text-gray-600 font-semibold">Monto:</p>
              <p className="text-gray-500">
                {formatCurrency(prepaidById?.amount, prepaidById.codeCurrency)}
              </p>
              <p className="text-gray-500">
                {" "}
                {translatePaymetMethods(prepaidById.paymentWay)}
              </p>
            </div>

            <div className="inline-flex gap-2">
              <p className="text-gray-600 font-semibold">Cliente:</p>
              <p className="text-gray-500">
                {prepaidById?.client?.firstName || prepaidById?.client?.lastName
                  ? `${prepaidById?.client?.firstName ?? ""} ${
                      prepaidById?.client?.lastName ?? ""
                    }`
                  : prepaidById?.client?.email ?? ""}
              </p>
            </div>
            {prepaidById?.client?.codeClient && (
              <div className="inline-flex gap-2">
                <p className="text-gray-600 font-semibold">
                  Código de cliente:{" "}
                </p>
                <p className="text-gray-500">
                  C-{prepaidById?.client?.codeClient ?? ""}
                </p>
              </div>
            )}
            {prepaidById?.client?.contractNumber && (
              <div className="inline-flex gap-2">
                <p className="text-gray-600 font-semibold">No. contrato: </p>
                <p className="text-gray-500">
                  NC-{moment(prepaidById?.createdAt).year()}/
                  {prepaidById?.client?.contractNumber ?? ""}
                </p>
              </div>
            )}
            {/* <div className="inline-flex gap-2">
              <p className="text-gray-600 font-semibold">Pago del cliente:</p>
              <p className="text-gray-500 ">
                #{prepaidById?.paymentNumberClient}
              </p>
            </div> */}
            {prepaidById?.cashRegisterOperations.length !== 0 && (
              <>
                {prepaidById?.paymentWay === "CASH" &&
                  prepaidById?.cashRegisterOperations[0]?.operationNumber && (
                    <div className="inline-flex gap-2">
                      <p className="text-gray-600 font-semibold">RC: </p>
                      <p className="text-gray-500">
                        {moment(prepaidById?.createdAt).year()}/
                        {prepaidById?.cashRegisterOperations[0]?.operationNumber
                          ? prepaidById?.cashRegisterOperations[0]?.operationNumber
                              .toString()
                              .padStart(5, "0")
                          : ""}
                      </p>
                    </div>
                  )}
                {prepaidById?.cashRegisterOperations[0]?.paymentDateClient && (
                  <div className="inline-flex gap-2">
                    <p className="text-gray-600 font-semibold">
                      Fecha de pago del cliente:{" "}
                    </p>
                    <p className="text-gray-500">
                      {formatDate(
                        prepaidById?.cashRegisterOperations[0]
                          ?.paymentDateClient
                      )}
                    </p>
                  </div>
                )}
                {prepaidById?.cashRegisterOperations[0]?.madeBy && (
                  <div className="inline-flex gap-2">
                    <p className="text-gray-600 font-semibold">Cobrador/a: </p>
                    <p className="text-gray-500">
                      {prepaidById?.cashRegisterOperations[0]?.madeBy
                        .displayName ?? ""}
                      /
                      {prepaidById?.cashRegisterOperations[0]?.madeBy
                        .username ?? ""}
                    </p>
                  </div>
                )}
              </>
            )}
            {prepaidById.orderReceipt && (
              <div className="inline-flex gap-2">
                <p className="text-gray-600 font-semibold">
                  Utilizado en la factura:
                </p>
                <p className="text-gray-500">
                  #{prepaidById?.orderReceipt?.operationNumber}
                </p>
                <p className="text-gray-500">
                  {formatCalendar(prepaidById?.updatedAt)}
                </p>
              </div>
            )}

            {prepaidById?.description && (
              <div className="flex flex-col gap-x-2 pt-3">
                <p className=" font-semibold text-gray-600 mb-1">
                  Observaciones:
                </p>
                <p className="">{prepaidById.description}</p>
              </div>
            )}
          </div>
        </article>
      )}

      <Modal state={showModal} close={() => setShowModal(false)} size="m">
        <EditPrepaidPayment
          close={() => setShowModal(false)}
          closeModal={closeModal}
          id={id}
          defaultDate={prepaidById}
        />
      </Modal>

      {refundModal && (
        <ModalAlert
          type="warning"
          title={`¿Seguro que desea continuar?`}
          text={`Está a punto de reintegrar el pago anticipado`}
          onAccept={() => {
            refundPrepaidPayment &&
              refundPrepaidPayment(id, () => {
                setRefundModal(false);
                closeModal();
              });
          }}
          onClose={() => setRefundModal(false)}
          isLoading={isFetching}
        />
      )}
    </>
  );
};

export default DetailsPrepaidPayment;
