import React, { useContext } from 'react'
import { RegisterDetailsContext } from '../RegisterDetailsContainer'

export const ShippingAndBillingTabOverdue = () => {
  const { order } = useContext(RegisterDetailsContext)


  return (
    <div className='overflow-y-auto h-[26rem] px-3'>
        {/*Envío y facturación*/}
        <div className="m-auto grid grid-cols-2 gap-10 py-5">
        {/*Envío*/}
        <div className="flex flex-col gap-1">
          <h5 className="text-gray-600 font-semibold text-lg">Envío:</h5>
          {Object.values(order?.shipping ?? {}).filter((itm) => !!itm)
            .length === 0 ? (
            <p className="text-2xl">-</p>
          ) : (
            <>
              {(order?.shipping?.firstName || order?.shipping?.lastName) && (
                <p className="text-sm text-gray-600">{`${
                  order?.shipping?.firstName ?? ""
                } ${order?.shipping?.lastName ?? ""}`}</p>
              )}
              {(order?.shipping?.street_1 || order?.shipping?.street_2) && (
                <p className="text-sm text-gray-600">{`${
                  order?.shipping?.street_1 ?? ""
                } ${order?.shipping?.street_2 ?? ""}`}</p>
              )}
              {order?.shipping?.city && (
                <p className="text-sm text-gray-600">{order?.shipping?.city}</p>
              )}
              {order?.shipping?.municipality && (
                <p className="text-sm text-gray-600">
                  {order?.shipping?.municipality?.name}
                </p>
              )}
              {order?.shipping?.province && (
                <p className="text-sm text-gray-600">
                  {order?.shipping?.province?.name}
                </p>
              )}
              {order?.shipping?.country && (
                <p className="text-sm text-gray-600">
                  {order?.shipping?.country?.name ?? ""}
                </p>
              )}
              {order?.shipping?.email && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">
                    Dirección de correo electrónico:
                  </p>
                  <a
                    href={"mail:" + order?.shipping?.email}
                    className="text-sm underline text-blue-900"
                  >
                    {order?.shipping?.email}
                  </a>
                </div>
              )}
              {order?.shipping?.phone && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">Teléfono:</p>
                  <a
                    href={"tel:" + order.shipping?.phone}
                    className="text-sm underline text-blue-900"
                  >
                    {order.shipping?.phone}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/*Facturación*/}
        <div className="flex flex-col gap-1">
          <h5 className="text-gray-600 font-semibold text-lg">Facturación:</h5>
          {Object.values(order?.billing ?? {}).filter((itm) => !!itm).length ===
          0 ? (
            <p className="text-2xl">-</p>
          ) : (
            <>
              {(order?.billing?.firstName || order?.billing?.lastName) && (
                <p className="text-sm text-gray-500">{`${
                  order?.billing?.firstName ?? ""
                } ${order?.billing?.lastName ?? ""}`}</p>
              )}
              {(order?.billing?.street_1 || order?.billing?.street_2) && (
                <p className="text-sm text-gray-500">{`${
                  order?.billing?.street_1 ?? ""
                } ${order?.billing?.street_2 ?? ""}`}</p>
              )}
              {order?.billing?.city && (
                <p className="text-sm text-gray-500">{order?.billing?.city}</p>
              )}
              {order?.billing?.municipality && (
                <p className="text-sm text-gray-500">
                  {order?.billing?.municipality?.name}
                </p>
              )}
              {order?.billing?.province && (
                <p className="text-sm text-gray-500">
                  {order?.billing?.province?.name}
                </p>
              )}
              {order?.billing?.country && (
                <p className="text-sm text-gray-500">
                  {order?.billing?.country?.name ?? ""}
                </p>
              )}
              {order?.billing?.email && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">
                    Dirección de correo electrónico:
                  </p>
                  <a
                    href={"mail:" + order?.billing?.email}
                    className="text-sm underline text-blue-900"
                  >
                    {order.billing?.email}
                  </a>
                </div>
              )}
              {order?.billing?.phone && (
                <div className="flex flex-col pt-3">
                  <p className="text-sm font-semibold">Teléfono:</p>
                  <a
                    href={"tel:" + order.billing?.phone}
                    className="text-sm underline text-blue-900"
                  >
                    {order.billing?.phone}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
