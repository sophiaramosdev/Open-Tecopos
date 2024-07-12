/* eslint-disable react-hooks/exhaustive-deps */
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "../../../../components/misc/Button";
import DateInput from "../../../../components/forms/DateInput";
import { LockClosedIcon, PlusIcon } from "@heroicons/react/24/outline";
import TextArea from "../../../../components/forms/TextArea";
import Input from "../../../../components/forms/Input";
import moment, { Moment } from "moment";
import useServerProduct from "../../../../api/useServerProducts";
import Fetching from "../../../../components/misc/Fetching";
import { ReservationsContext } from "../CalendarReservation";
import { useForm } from "react-hook-form";
import { useAppSelector } from "../../../../store/hooks";
import { getDayName, getDayNumber } from "../../../../utils/helpers";

interface Props {
  close?: Function;
  context: React.Context<any>;
}

const DetailsReservationTab = ({ close ,context}: Props) => {
  const {
    getProduct,
    product,
    isLoading: isFetchingProduct,
  } = useServerProduct();

  const {
    selectEvent,
    reservation,
    isLoading,
    editReservation,
    isFetching,
    isAvailability,
    chekcAvailability,
    isChecking
  } = useContext(context);
  
  const { watch, setValue, control, handleSubmit,formState:{isSubmitting} } = useForm();
  const [isAvailabilityDate, setIsAvailabilityDate] = useState(false);

  const startDateAt =
    watch("reservationProducts.startDateAt") ?? reservation?.startDateAt;
  const endDateAt =
    watch("reservationProducts.endDateAt") ?? reservation?.endDateAt;

  const first = useRef(true);
  useEffect(() => {
    if (first.current) return;
    setIsAvailabilityDate(isAvailability ?? false);
  }, [isAvailability, startDateAt, endDateAt]);

  const numberKidsFrom =
    watch(`reservationProducts.numberKids`) ?? reservation?.numberKids ?? 0;
  const numberAdultsFrom =
    watch(`reservationProducts.numberAdults`) ?? reservation?.numberAdults ?? 0;

  const [numberAdults, setNumberAdults] = useState(numberAdultsFrom);
  const [numberKids, setNumberKids] = useState(numberKidsFrom);

  const addValue = (value: number = 0, name: string) => {
    setValue(name, value + 1);
    return value + 1;
  };
  const subValue = (value: number = 0, name: string) => {
    if (value <= 0) return 0;
    setValue(name, value - 1);
    return value - 1;
  };

  //---------------------Calcular en caso de duracion -----------------//
  const calculateEndDate = useMemo(() => {
    const duration = product?.duration;

    if (startDateAt && duration) {
      const durationArray = duration.split(":");
      const durationHours = parseInt(durationArray[0]);
      const durationMinutes = parseInt(durationArray[1]);
      const durationInMinutes = durationHours * 60 + durationMinutes;
      const endDate = moment(startDateAt).add(durationInMinutes, "minutes");
      setValue(
        `reservationProducts.endDateAt`,
        endDate.format("YYYY-MM-DD HH:mm:ss")
      );
      return endDate.format("DD MMMM YYYY - hh:mm A");
    } else {
      return null;
    }
  }, [watch(`reservationProducts.startDateAt`), product]);
  //---------------------Calcular en caso de duracion -----------------//
  //form
  const onSubmit = (data: any) => {
    //data.reservationProducts.endDateAt = moment(data.endDateAt).add(1,"day").format("YYYY-MM-DD HH:mm:ss");

    if (!product?.hasDuration) {
      data.reservationProducts.startDateAt = moment(
        data.reservationProducts.startDateAt
      )
        .add(1, "day")
        .format("YYYY-MM-DD");
      // data.reservationProducts.endDateAt = moment(
      //   data.reservationProducts.endDateAt
      // )
      //   .add(1, "day")
      //   .format("YYYY-MM-DD");

      // if (
      //   moment(data.reservationProducts.endDateAt).diff(
      //     moment(data.reservationProducts.startDateAt),
      //     "days"
      //   ) === 1
      // ) {
      //   data.reservationProducts.endDateAt = moment(
      //     data.reservationProducts.endDateAt
      //   )
      //     .subtract(1, "day")
      //     .format("YYYY-MM-DD");
      // }
    }
    editReservation &&
      editReservation(reservation?.orderReceiptId, data, close);
  };

  useEffect(() => {
    setValue("reservationProducts.productId", reservation?.productId);
    setValue("reservationProducts.id", reservation?.id);
  }, [reservation]);

  useEffect(() => {
    if (reservation?.productId) {
      getProduct(reservation?.productId.toString());
    }
  }, []);

  //--------------------------------Horario------------------------------------//

  const { business } = useAppSelector((store) => store.init);
  const schedule_business = business!.configurationsKey?.find(
    (configuration) => configuration.key === "schedule"
  )?.value!
    ? JSON.parse(
        business!.configurationsKey?.find(
          (configuration) => configuration.key === "schedule"
        )?.value!
      )
    : {};

  const { blocked, closeTimeAt, openTimeAt } = useMemo(() => {
    const startDateAt = watch(`reservationProducts[${0}].startDateAt`);
    const endDateAt = watch(`reservationProducts[${0}].endDateAt`);

    const blocked: number[] = [];
    for (const day in schedule_business) {
      if (!schedule_business[day].isActive) {
        blocked.push(getDayNumber(day));
      }
    }

    const selectedDay = getDayName(moment(startDateAt).get("day"));
    const selectedOpeningHours = schedule_business[selectedDay];
    const openingHours = selectedOpeningHours
      ? {
          openTimeAt: selectedOpeningHours.openTimeAt,
          closeTimeAt: selectedOpeningHours.closeTimeAt,
        }
      : { openTimeAt: ":", closeTimeAt: ":" };
    const { closeTimeAt, openTimeAt } = openingHours;

    return { blocked, closeTimeAt, openTimeAt };
  }, [watch(`reservationProducts[${0}].startDateAt`)]);

  const slotWithOpenTime = moment(reservation?.startDateAt).set({
    hour: moment(openTimeAt, "HH:mm").hour(),
    minute: moment(openTimeAt, "HH:mm").minute(),
    second: 0,
  });
  //--------------------------------Horario------------------------------------//

  const endInSomeDay =
    moment(startDateAt).diff(moment(endDateAt), "days") === 0
      ? moment(endDateAt).add(1, "day").format("DD/MM/YY")
      : moment(endDateAt).format("DD/MM/YY");

  if (isLoading || isFetchingProduct)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <>
      <form className="flex flex-col gap-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex-1 flex flex-col gap-y-2 mt-2">
          <h3 className="font-semibold">
            Servicio : <span className="font-normal">{reservation?.name}</span>
          </h3>
          {reservation?.resource && (
            <h3 className="block font-semibold">
              Recurso :{" "}
              <span className="font-normal">{reservation?.resource?.code}</span>
            </h3>
          )}
          <h3 className="font-semibold">
            Cliente :{" "}
            <span className="font-normal">
              {reservation?.orderReceipt.client.firstName}{" "}
              {reservation?.orderReceipt.client.lastName}
            </span>
          </h3>
        </div>
        <>
          <div>
            <div className="grid grid-cols-2 gap-x-5">
              <div className="mt-1">
                <DateInput
                  control={control}
                  name={`reservationProducts.startDateAt`}
                  label="Fecha inicio"
                  includeTime={product?.hasDuration}
                  rules={{
                    required: "Este campo es requerido",
                  }}
                  defaultValue={reservation?.startDateAt}
                  disabledDays={product?.hasDuration ? blocked : []}
                  minHour={parseInt(openTimeAt?.split(":")[0])}
                  maxHour={
                    parseInt(closeTimeAt?.split(":")[0]) -
                      //@ts-ignore
                      parseInt(product?.duration?.split(":")[0]) ?? 0
                  }
                />
              </div>

              {product?.hasDuration && product?.duration ? (
                <>
                  <div className="mb-3">
                    <label
                      className={`block text-sm font-medium  ${"text-gray-400"}`}
                    >
                      <span className="inline-flex items-center">
                        Fecha fin
                        {<LockClosedIcon className="px-2 h-4" />}
                      </span>
                    </label>
                    <div className="relative mt-1 rounded-md shadow-sm inline-flex items-center w-full">
                      <input
                        type="text"
                        className={`${"focus:ring-gray-400 focus:border-gray-600 "} block w-full rounded-md sm:text-sm placeholder:text-slate-400  ${"border-gray-300 text-gray-400"}`}
                        value={calculateEndDate ?? ""}
                        disabled={true}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-1">
                    <DateInput
                      control={control}
                      name={`reservationProducts.endDateAt`}
                      label="Fecha fin"
                      //defaultValue={moment(reservation?.endDateAt).add(1,"day").toISOString()}
                      defaultValue={moment
                        .utc(reservation?.endDateAt)
                        .format("YYYY-MM-DD")}
                      fromCustom={moment(startDateAt).add(1, "day").toString()}
                      rules={{
                        required: "Este campo es requerido",
                        validate: (value) =>
                          moment(value).isSameOrAfter(
                            watch(`reservationProducts.startDateAt`)
                          ) ||
                          "La fecha de fin debe ser igual o posterior a la fecha de inicio",
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {reservation?.resource &&
              !watch(`reservationProducts.resourceId`) && (
                <div className="flex flex-col gap-y-4 text-sm select-none mt-2">
                  <h3 className="font-semibold mt-2">Total de personas</h3>
                  <div className="flex gap-x-1 ">
                    <span>Adultos</span>
                    <div className="flex gap-x-1 items-center ml-[163px]">
                      <div className="w-7 text-lg text-center">
                        {numberAdults}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-x-7">
                    <span>Niños (De 0 a 12 años)</span>
                    <div className="flex items-center  gap-x-1 ml-12 ">
                      <div className="w-7 text-lg text-center  ">
                        {numberKids}
                      </div>
                    </div>

                    <div className="hidden">
                      <Input
                        name={`reservationProducts.numberAdults`}
                        control={control}
                      />
                      <Input
                        name={`reservationProducts.numberKids`}
                        control={control}
                      />
                    </div>
                  </div>
                </div>
              )}

            <TextArea
              control={control}
              name="observations"
              label="Nota"
              defaultValue={reservation?.observations}
            />
          </div>
        </>

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  mt-[50px] ">
          <div className="">
            <Button
              name="Verificar disponibilidad"
              color="white"
              textColor="blue-800"
              outline
              full
              loading={isChecking}
              disabled={isChecking}
              action={() => {
                first.current = false;
                chekcAvailability &&
                  chekcAvailability({
                    startAt: moment(startDateAt).format("YYYY-MM-DD HH:mm:ss"),
                    endAt: endDateAt,
                    productId: reservation?.productId,
                    resourceId: reservation?.resourceId,
                    update: reservation?.id,
                  });
              }}
            />
          </div>
          <div></div>
          <div className="col-start-3">
            <Button
              name="Actualizar"
              color="slate-700"
              type="submit"
              full
              loading={isFetching}
              disabled={isFetching}
            />
          </div>
        </footer>
      </form>
    </>
  );
};

export default DetailsReservationTab;
