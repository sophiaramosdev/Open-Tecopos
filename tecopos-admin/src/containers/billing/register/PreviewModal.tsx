import React, { useEffect } from "react";
import Modal from "../../../components/misc/GenericModal";
import { useServerBilling } from "../../../api/useServerBilling";
import { useAppSelector } from "../../../store/hooks";
import ImageComponent from "../../../components/misc/Images/Image";
import { format, parseISO } from "date-fns";
import Button from "../../../components/misc/Button";
import LoadingSpin from "../../../components/misc/LoadingSpin";

interface DetailsModalProps {
  state: boolean;
  close: Function;
  registerId: number | undefined;
}

export const DetailsRegisterModal = ({
  state,
  close,
  registerId,
}: DetailsModalProps) => {
  const { isLoading, getOrderBillingById, orderById } = useServerBilling();
  const { business, branches } = useAppSelector((store) => store.init);

  useEffect(() => {
    registerId && getOrderBillingById(registerId);
  }, [registerId]);

  const subcursal = branches?.find((item) => item.id === orderById?.businessId);
  return (
    <Modal state={state} close={close} size="m">
      {isLoading ? (
        <div className="grid border-2 p-6 border-solid gap-6 w-full items-center justify-center">
          <LoadingSpin color="black" />
        </div>
      ) : (
        <>
          <div className="grid border-2 p-6 border-solid gap-6">
            <div className="grid grid-cols-7">
              <div className="grid col-span-3 gap-6">
                <div className=" flex place-items-center overflow-hidden border-2 border-solid rounded-full w-24 h-24 ">
                  <ImageComponent
                    src={business?.logo?.src}
                    hash={business?.logo?.blurHash}
                  />
                </div>
                <div className="border-2 border-solid p-2 ">
                  <p>{business?.name}</p>
                  {subcursal && !subcursal?.isMain && <p>{subcursal?.name}</p>}
                  <p>{business?.address?.street_1}</p>
                  <p>{business?.address?.street_2}</p>
                  <p>{business?.address?.city}</p>
                  <p>{business?.address?.municipality?.name}</p>
                  <p>{business?.address?.province?.name}</p>
                  <p>{business?.address?.country?.name}</p>
                  <p>{business?.phones[0]?.number}</p>
                  <p>{business?.email}</p>
                </div>
              </div>

              <div></div>

              <div className="flex flex-col col-span-3 gap-6">
                <div className="flex place-items-center h-20">
                  {orderById?.status === "BILLED" ? (
                    <h1 className="text-4xl font-bold">FACTURA</h1>
                  ) : (
                    <h1 className="text-2xl font-bold">PRE-FACTURA</h1>
                  )}
                </div>

                <div className="border-2 p-2 border-solid h-full">
                  <p className="font-bold">Pre-facturada a:</p>
                  <p>
                    {orderById?.client?.firstName}
                    {orderById?.client?.lastName}
                  </p>
                  <p>{orderById?.client?.address?.locality}</p>
                  <p>{orderById?.client?.address?.street}</p>
                  <p>{orderById?.client?.address?.municipality?.name}</p>
                  <p>{orderById?.client?.address?.province?.name}</p>
                  <p>{orderById?.client?.address?.country?.name}</p>
                  <p>{orderById?.client?.phones[0]?.number}</p>s
                  <p>{orderById?.client?.email}</p>
                  {/* <p>{orderById?.client}</p>
                        <p>{orderById?.client}</p>
                        <p>{orderById?.client}</p> */}
                </div>
              </div>

              <div className="border-2 grid grid-cols-4 border-solid mt-3 gap-3 col-span-7 p-2 ">
                <div className="text-end col-span-1">
                  <p className="font-bold">Titulo:</p>
                  {/* <p> {orderById?.status === "BILLED"?( <span>No.Factura</span> ):( <span>No.Pre-Factura</span> ) } { orderById?. }</p> */}
                  <p className="font-bold">Moneda:</p>
                  <p className="font-bold">Emisión:</p>
                  <p className="font-bold">Vendedor:</p>
                  <p className="font-bold">Facturador:</p>
                </div>

                <div className="text-start col-span-1">
                  {orderById?.name ? <p>{orderById?.name}</p> : <br />}
                  {orderById?.prices[0] ? (
                    <p>{orderById.prices[0].codeCurrency}</p>
                  ) : (
                    <p> {orderById?.currenciesPayment[0]?.codeCurrency} </p>
                  )}
                  {orderById?.createdAt ? (
                    <p>
                      {format(parseISO(orderById?.createdAt), "yyyy/MM/dd")}
                    </p>
                  ) : (
                    <br />
                  )}
                  {orderById?.salesBy?.displayName ? (
                    <p>{orderById.salesBy.displayName}</p>
                  ) : (
                    <br />
                  )}
                  {orderById?.managedBy?.displayName ? (
                    <p>{orderById.managedBy.displayName}</p>
                  ) : (
                    <br />
                  )}
                </div>
                <div className="col-span-2"></div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              <div className="grid col-span-7 gap-2">
                <div className="border-2 border-solid grid grid-cols-5 place-items-center">
                  <p>Concepto</p>
                  <p>Precio base</p>
                  <p>Cantidad</p>
                  <p>UM</p>
                  <p>Subtotal</p>
                </div>

                {orderById?.selledProducts.map((product) => (
                  <div className="border-2 border-solid grid grid-cols-5 place-items-center">
                    <p>{product.name}</p>
                    <p>{product.priceUnitary.amount}</p>
                    <p>{product.quantity}</p>
                    <p>{product.measure}</p>
                    <p className="w-full text-end pr-1">
                      {product.priceTotal.amount}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 col-span-7 ">
                <div className="col-span-3">
                  {!orderById?.pickUpInStore ? (
                    <div className="border-2 border-solid p-2">
                      <p className="font-bold">Entregar a:</p>
                      <p>
                        {orderById?.shipping?.firstName}{" "}
                        {orderById?.shipping?.lastName}{" "}
                      </p>
                      <p>{orderById?.shipping?.street_1}</p>
                      <p>{orderById?.shipping?.street_2}</p>
                      <p>{orderById?.shipping?.city}</p>
                      <p>{orderById?.shipping?.municipality.name}</p>
                      <p>{orderById?.shipping?.province.name}</p>
                      <p>{orderById?.shipping?.country.name}</p>
                      <p>{orderById?.shipping?.phone}</p>
                      <p>{orderById?.shipping?.email}</p>
                    </div>
                  ) : (
                    <div className="border-2 border-solid p-2">
                      <p>Recogido en la tienda</p>
                    </div>
                  )}
                </div>

                <div></div>
                <div className=" flex flex-col p-2 col-span-3">
                  {orderById?.coupons && orderById?.coupons?.length > 0 && (
                    <div className="grid grid-cols-2 text-end">
                      <p>Cupón:</p>
                      <p>{orderById?.coupons[0]?.code}</p>
                    </div>
                  )}
                  {orderById && orderById?.discount > 0 && (
                    <div className="grid grid-cols-2 text-end">
                      <p>Descuento:</p>
                      <p>{orderById?.discount}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 text-end">
                    <p className="font-bold">Total:</p>
                    <p className="font-bold">
                      {orderById?.totalToPay[0]?.amount}
                    </p>
                  </div>
                  {orderById?.tipPrice && (
                    <div className="grid grid-cols-2 text-end">
                      <p>Comisión:</p>
                      <p>{orderById?.commission}</p>
                    </div>
                  )}
                  {orderById?.shippingPrice && (
                    <div className="grid grid-cols-2 text-end">
                      <p>Envío:</p>
                      <p>{orderById?.shippingPrice.amount}</p>
                    </div>
                  )}
                </div>
              </div>
              {orderById?.observations && (
                <div className="col-span-7 border-2 border-solid p-2">
                  <p className="font-semibold">Notas:</p>
                  <p>{orderById?.observations}</p>
                </div>
              )}
            </div>
          </div>
          <div className="grid justify-center pt-8">
            <Button color="slate-700" name="Aceptar" action={close} />
          </div>
        </>
      )}
    </Modal>
  );
};
