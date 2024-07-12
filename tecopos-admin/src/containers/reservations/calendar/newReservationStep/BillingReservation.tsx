/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useMemo } from "react";
import { NewReservationContext } from "./NewReservation";
import Button from "../../../../components/misc/Button";
import { useAppSelector } from "../../../../store/hooks";
import { formatCurrency, formatDateR } from "../../../../utils/helpers";
import moment from "moment";
import GenericTable, {
  DataTableInterface,
} from "../../../../components/misc/GenericTable";
import useServerOnlineClients from "../../../../api/useServerOnlineClients";
import Fetching from "../../../../components/misc/Fetching";
import { ReservationPolicy } from "../../../../interfaces/ServerInterfaces";
import { translatePolicyFrequencyToSp } from "../../../config/GeneralAdjustment/resourcesTabs/DiscountPolicy";
import Check from "../../../../components/forms/GenericCheck";

const BillingReservation = () => {
  const {
    control,
    watch = () => {},
    setValue = () => {},
    setCurrentStep = () => {},
    isFetching,
    services = [],
  } = useContext(NewReservationContext);
  const { client, getClient, isLoading } = useServerOnlineClients();
  const { business } = useAppSelector((store) => store.init);

  useEffect(() => {
    getClient(watch("clientId"));
  }, []);

  const service = services[0];
  const policy = service?.reservationPolicies?.filter(
    (item) => item.type === "DISCOUNT" && item.isActive
  );

  const tableTitles = [];

  // if (services[0]?.hasDuration && services[0]?.duration) {
  //   const hasDuration = [
  //     "Servicio",
  //     "Recurso",
  //     "Fecha entrada",
  //     "Fecha salida",
  //     "Duración",
  //     "Total a pagar",
  //   ];
  //   tableTitles.push(...hasDuration);
  // } else {
  const hasReservable = [
    "Servicio",
    "Recurso",
    "Fecha entrada",
    "Fecha salida",
    "Adultos",
    "Niños",
    "Duración",
    "Importe diario",
    "Total a pagar",
  ];
  tableTitles.push(...hasReservable);
  //}

  //@ts-ignore
  const { totalToPay, totalWithoutDiscount, totalDiscounted, pp } =
    //@ts-ignore
    useMemo(() => {
      const totalToPay: { price: number; codeCurrency: string }[] = [];
      const totalWithoutDiscount: { price: number; codeCurrency: string }[] =
        [];
      const totalDiscounted: { price: number; codeCurrency: string }[] = [];
      let pp: any;
      services?.forEach((item, index) => {
        const startDate = formatDateR(
          watch(`reservationProducts[${index}].startDateAt`)
        );
        const endDate = formatDateR(
          watch(`reservationProducts[${index}].endDateAt`)
        );
        const durationInDays = moment(endDate, "DD/MM/YYYY").diff(
          moment(startDate, "DD/MM/YYYY"),
          "days"
        );
        const quantity = durationInDays === 0 ? 1 : durationInDays;
        const price = item?.prices.find((item) => item?.isMain);

        // Encontrar la política de descuento aplicable
        pp =
          findBestDiscountPolicy(
            policy,
            watch(`reservationProducts[${index}].startDateAt`)
          ) || null;

        if (pp) {
          setValue("discount", pp?.discount || 0);
          // Calcular el precio sin descuento
          const priceWithoutDiscount = (price?.price ?? 0) * quantity;
          totalWithoutDiscount.push({
            price: priceWithoutDiscount,
            codeCurrency: price?.codeCurrency ?? "",
          });

          // Calcular el precio descontado
          const discountedPrice =
            priceWithoutDiscount * (1 - pp.discount / 100);
          totalDiscounted.push({
            price: discountedPrice,
            codeCurrency: price?.codeCurrency ?? "",
          });

          // Calcular el total a pagar después de los descuentos
          totalToPay.push({
            price: discountedPrice,
            codeCurrency: price?.codeCurrency ?? "",
          });
        } else {
          // Si no hay política de descuento aplicable, calcular el precio sin descuento y el total a pagar igual al precio sin descuento
          const priceWithoutDiscount = (price?.price ?? 0) * quantity;

          let foundWithDiscount = totalWithoutDiscount.find(
            (item) => item.codeCurrency === price?.codeCurrency
          );

          if (foundWithDiscount) {
            foundWithDiscount.price += price?.price ?? 0;
          } else {
            totalWithoutDiscount.push({
              price: priceWithoutDiscount,
              codeCurrency: price?.codeCurrency ?? "",
            });
          }

          let foundToPay = totalToPay.find(
            (item) => item.codeCurrency === price?.codeCurrency
          );
          if (foundToPay) {
            foundToPay.price += price?.price ?? 0;
          } else {
            totalToPay.push({
              price: priceWithoutDiscount,
              codeCurrency: price?.codeCurrency ?? "",
            });
          }
        }
      });

      return { totalToPay, totalWithoutDiscount, totalDiscounted, pp };
    }, [services, policy]);

  //----------------------------------Table ---------------------------------------------//
  const tableData: DataTableInterface[] = [];
  services?.forEach((item, index) => {
    const price = item?.prices.find((item) => item?.isMain);

    //----------Date -->
    const startDate = formatDateR(
      watch(`reservationProducts[${index}].startDateAt`)
    );
    const endDate = formatDateR(
      watch(`reservationProducts[${index}].endDateAt`)
    );
    const durationInDays = moment(endDate, "DD/MM/YYYY").diff(
      moment(startDate, "DD/MM/YYYY"),
      "days"
    );

    const prefix = durationInDays === 1 ? "dia" : "días";
    //----------Date -->
    const resourceId = watch(`reservationProducts[${index}].resourceId`);
    const quantity = durationInDays === 0 ? 1 : durationInDays;
    setValue(`reservationProducts[${index}].quantity`, quantity);

    const dateStart = item.hasDuration
      ? formatDateR(watch(`reservationProducts[${index}].startDateAt`), true)
      : startDate;
    const dateExit = item.hasDuration
      ? formatDateR(watch(`reservationProducts[${index}].endDateAt`), true)
      : endDate;

    const numberAdults = watch(`reservationProducts[${index}].numberAdults`);
    const numberKids = watch(`reservationProducts[${index}].numberKids`);

    tableData.push({
      rowId: item?.id,
      payload: {
        Servicio: item?.name,
        Recurso: item?.resources?.find((item) => item.id === resourceId)?.code,
        "Fecha entrada": dateStart,
        "Fecha salida": dateExit,
        Adultos: numberAdults,
        Niños: numberKids,
        Duración: item.hasDuration
          ? item.duration
          : `${durationInDays} ${prefix}`,
        "Importe diario": formatCurrency(
          price?.price ?? 0,
          price?.codeCurrency
        ),
        "Total a pagar": formatCurrency(
          (price?.price || 0) * quantity,
          price?.codeCurrency
        ),
      },
    });
  });

  //----------------------------------Table ---------------------------------------------//
  if (isLoading)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <>
      <div className="h-[25rem] scroll-auto overflow-auto">
        <header className="flex justify-around mt-5 ">
          <span className="font-semibold">Negocio : {business?.name}</span>
          <span className="font-semibold">
            Fecha: {moment().format("dddd D [de] MMMM [del] YYYY")}
          </span>
        </header>

        <section className="my-5">
          <h3 className="mb-2 font-semibold">Datos del cliente</h3>

          <div className="border rounded-md grid grid-cols-2 justify-between p-5">
            <article className="flex flex-col gap-y-3">
              <span className="font-semibold ">
                Nombre: {client?.firstName} {client?.lastName}
              </span>
              {client?.phones[0]?.number && (
                <span className="font-semibold ">
                  Teléfono: {client?.phones[0]?.number}
                </span>
              )}
              {client?.address?.country?.name && (
                <span className="font-semibold ">
                  País: {client?.address?.country?.name}
                </span>
              )}
            </article>
            <article className="flex flex-col gap-y-3">
              {client?.ci && (
                <span className="font-semibold ">
                  {" "}
                  No. de identificación: {client?.ci}{" "}
                </span>
              )}
              {client?.email && (
                <span className="font-semibold ">
                  Correo electrónico: {client?.email}
                </span>
              )}
            </article>
          </div>
        </section>

        <section className="my-5">
          <h3 className="mb-2 font-semibold">Detalles de la reserva</h3>

          <div>
            <GenericTable tableData={tableData} tableTitles={tableTitles} />
          </div>
        </section>

        <section className="border rounded-md p-5">
          <h3 className="mb-2 font-semibold block text-lg">
            Información de pago{" "}
          </h3>

          <div className="flex  justify-between">
            <div>
              {pp && (
                <div className="flex flex-col">
                  {/* <Check label="Aplicar descuento" value={""} checked={true} /> */}
                  <span className="">Se ofrece un descuento del: </span>
                  <p className="mt-2">
                    <span className="font-semibold">{pp?.discount}%</span> para
                    reservas realizadas con al menos {pp?.quantity} o más{" "}
                    {translatePolicyFrequencyToSp(
                      pp?.frequency
                    ).toLocaleLowerCase()}{" "}
                    de antelación
                  </p>
                  <span>{pp?.description}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col  gap-y-5 justify-start items-center">
              <p className="flex flex-col items-center">
                Subtotal:{" "}
                {totalWithoutDiscount.map((item: any) => (
                  <p key={item.codeCurrency} className="text-green-500">
                    {/*Total a pagar */}
                    {formatCurrency(item?.price, item?.codeCurrency)}
                  </p>
                ))}{" "}
              </p>

              {pp && (
                <p className="flex flex-col items-center">
                  Descuento aplicado:{" "}
                  {totalDiscounted.map((item: any) => (
                    <p key={item.codeCurrency} className="text-red-500">
                      {/* Calcula el descuento aplicado */}
                      {formatCurrency(
                        item.price * (pp?.discount / 100),
                        item.codeCurrency
                      )}{" "}
                    </p>
                  ))}{" "}
                </p>
              )}
              {
                <p className="flex flex-col items-center">
                  Total a pagar:{" "}
                  {totalToPay.map((item: any) => (
                    <p key={item.codeCurrency} className="">
                      {/* Calcula el total a pagar */}
                      {formatCurrency(item?.price, item?.codeCurrency)}{" "}
                    </p>
                  ))}{" "}
                </p>
              }
            </div>
          </div>
        </section>

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  mt-[50px] ">
          <Button
            name="Atrás"
            color="white"
            textColor="blue-800"
            outline
            action={() => setCurrentStep((value: number) => value - 1)}
            full
          />
          <div className="col-start-3">
            <Button
              name="Finalizar"
              color="slate-700 "
              type="submit"
              full
              disabled={isFetching}
              loading={isFetching}
            />
          </div>
        </footer>
      </div>
    </>
  );
};

export default BillingReservation;

function findBestDiscountPolicy(
  policies: any,
  startDate: Date | string
): any | null {
  let bestPolicy: any | null = null;
  let bestMatchDays = Infinity;

  const daysBeforeStart = moment(startDate).diff(moment(), "days");

  policies?.forEach((policy: any) => {
    if (policy.isActive) {

      if (
        daysBeforeStart - policy?.durationInDays <= bestMatchDays &&
        policy?.durationInDays <= daysBeforeStart
      ) {
        bestPolicy = policy;
        bestMatchDays = daysBeforeStart - policy?.durationInDays;
      }
    }
  });
  return bestPolicy;
}
