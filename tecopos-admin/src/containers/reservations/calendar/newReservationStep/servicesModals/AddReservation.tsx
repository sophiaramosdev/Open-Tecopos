/* eslint-disable react-hooks/exhaustive-deps */
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MinusCircleIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useAppSelector } from "../../../../../store/hooks";
import moment, { Moment } from "moment";
import Fetching from "../../../../../components/misc/Fetching";
import DateInput from "../../../../../components/forms/DateInput";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import TextArea from "../../../../../components/forms/TextArea";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import { NewReservationContext } from "../NewReservation";
import useServerProduct from "../../../../../api/useServerProducts";
import { useForm } from "react-hook-form";
import { Product } from "../../../../../interfaces/Interfaces";
import Select from "../../../../../components/forms/Select";
import { ReservationsContext } from "../../CalendarReservation";
import { ReservationsContext as ReservationsContextAll } from "../../allReservations/AllReservations";

interface Schedule {
  isActive: boolean;
  openTimeAt: string;
  closeTimeAt: string;
}
interface Props {
  close: Function;
  defaultData: any;
}
const AddReservation = ({ close, defaultData }: Props) => {
  //------------------States-------------------------------------- --->
  const { chekcAvailability, append, setServices, allProducts, isChecking } =
    useContext(NewReservationContext);
  const { control, watch, reset, setValue, handleSubmit, trigger } = useForm({
    mode: "onChange",
  });
  //const { getProduct, product, isLoading: loadingProduct } = useServerProduct();
  const { slotSelect } = useContext(ReservationsContext);

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

  const numberKidsFrom = watch(`numberKids`) ?? 0;
  const numberAdultsFrom = watch(`numberAdults`) ?? 0;
  const [numberAdults, setNumberAdults] = useState(numberAdultsFrom);
  const [numberKids, setNumberKids] = useState(numberKidsFrom);

  const productId = watch("productId");
  const resourceId = watch(`resourceId`);

  useEffect(() => {
    setNumberAdults(0);
    setNumberKids(0);
    setValue!("numberKids", null);
    setValue!("numberAdults", null);
  }, [resourceId, productId]);

  useEffect(() => {
    setValue("endDateAt", null);
  }, [productId]);

  const [isAvailabilityDate, setIsAvailabilityDate] = useState(false);

  //------------------States-------------------------------------- --->

  //------------------Control person ------------------------ --->
  const addValue = (value: number = 0, name: string) => {
    setValue(name, value + 1);
    return value + 1;
  };
  const subValue = (value: number = 0, name: string) => {
    if (value <= 0) return 0;
    setValue(name, value - 1);
    return value - 1;
  };
  //------------------Control person ------------------------ --->

  // -----------------Control horario ---------------------- --->
  const { blocked, closeTimeAt, openTimeAt } = useMemo(() => {
    const startDateAt = watch(`startDateAt`);
    const endDateAt = watch(`endDateAt`);

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
  }, [watch(`startDateAt`)]);

  const chekInRage = (open: string, close: string, hour: string) => {
    const openAt = Number(open.split(":")[0]);
    const closeAt = Number(close.split(":")[0]);
    const hourAt = moment(hour).get("hour");

    if (hourAt > openAt && hourAt < closeAt) {
      return true;
    } else {
      return false;
    }
  };

  const isWithRange = chekInRage(openTimeAt, closeTimeAt, slotSelect ?? "");
  const slotWithOpenTime = !isWithRange
    ? moment(slotSelect ?? new Date()).set({
        hour: moment(openTimeAt, "HH:mm").hour(),
        minute: moment(openTimeAt, "HH:mm").minute(),
        second: 0,
      })
    : moment(slotSelect ?? new Date());
  // -----------------Control horario ---------------------- --->

  const startDateAt = watch(`startDateAt`) ?? slotWithOpenTime;
  const endDateAt = watch(`endDateAt`);

  //---------------------Product ---------------------------- --->
  const areaId = watch("areaSalesId");
  // useEffect(() => {
  //   productId && getProduct(productId);
  // }, [productId]);

  const product = useMemo(() => {
    const idSelect = watch("productId");

    const productSelect = allProducts?.find((item) => item.id === idSelect);
    return productSelect;
  }, [allProducts, productId]);

  const { resources, resource } = useMemo(() => {
    const resources = [...(product?.resources || [])];

    const resource =
      product?.resources?.find((item) => item.id === resourceId) ?? undefined;

    return { resources, resource };
  }, [product, resourceId]);

  const validateRecoursePerson =
    (resource?.numberAdults || 0) > 0 || (resource?.numberKids || 0) > 0;
  //---------------------Product ---------------------------- --->

  //-------------------- Control endDate in case product duration --->
  const calculateEndDate = useMemo(() => {
    const startDateAtB = watch(`startDateAt`) ?? startDateAt;
    const duration = product?.duration;

    if (startDateAtB && duration) {
      const durationArray = duration.split(":");
      const durationHours = parseInt(durationArray[0]);
      const durationMinutes = parseInt(durationArray[1]);
      const durationInMinutes = durationHours * 60 + durationMinutes;
      const endDate = moment(startDateAtB).add(durationInMinutes, "minutes");
      setValue(`endDateAt`, endDate.format("YYYY-MM-DD HH:mm:ss"));
      setValue(`endDateAt2`, endDate.format("DD MMMM YYYY - hh:mm A"));
      setValue(
        `startDateAt`,
        moment(startDateAtB).format("YYYY-MM-DD HH:mm:ss")
      );
      return endDate.format("DD MMMM YYYY - hh:mm A");
    } else {
      return null;
    }
  }, [watch(`startDateAt`)]);
  //-------------------- Control endDate in case product duration --->

  useEffect(() => {
    setIsAvailabilityDate(false);
  }, [startDateAt, endDateAt]);

  const onsubmit = async () => {
    const data = watch();
    append!({
      name: product?.name,
      resource: resource?.code,
      ...data,
    });
    close();
    reset();
    setServices!((value: Product[]) => [...value, product]);
  };

  const getCol = () => {
    if (product && product?.resources?.length !== 0) {
      return 2;
    }
    return 1;
  };

  return (
    <>
      {/* {loadingProduct && <Fetching />} */}
      <form
        className="flex flex-col justify-between gap-y-5 mt-4 min-h-[25rem]"
        onSubmit={handleSubmit(onsubmit)}
      >
        <div className="flex flex-col gap-y-2">
          <>
            <article className={`grid grid-cols-${getCol()} gap-x-2`}>
              <Select
                name="productId"
                //@ts-ignore
                data={allProducts?.map((item) => {
                  return {
                    id: item.id,
                    name: item.name,
                  };
                })}
                control={control}
                label="Servicio"
                rules={{
                  required: "Este campo es requerido",
                }}
              />

              {resources && resources?.length !== 0 && (
                <Select
                  name="resourceId"
                  //@ts-ignore
                  data={resources?.map((item) => {
                    return {
                      id: item.id,
                      name: item.code,
                    };
                  })}
                  label="Recurso"
                  control={control}
                  rules={{
                    required: "Este campo es requerido",
                  }}
                />
              )}
            </article>

            {product && (
              <div className="grid grid-cols-2 gap-x-5">
                <div className="mt-1">
                  <DateInput
                    control={control}
                    name={`startDateAt`}
                    label="Fecha inicio"
                    // fromCustom={moment(slotSelect)
                    //   .add(openTimeAt, "h")
                    //   .toISOString()}
                    includeTime={product?.hasDuration}
                    rules={{
                      required: "Este campo es requerido",
                    }}
                    defaultValue={
                      product?.hasDuration ? slotWithOpenTime : slotSelect
                    }
                    disabledDays={product?.hasDuration ? blocked : []}
                    minHour={parseInt(openTimeAt?.split(":")[0])}
                    maxHour={
                      parseInt(closeTimeAt?.split(":")[0]) -
                      //@ts-ignore
                      parseInt(product?.duration?.split(":")[0])
                    }
                  />
                </div>

                {product?.hasDuration && product?.duration ? (
                  <>
                    <div className="mb-3">
                      <div className={`w-full mt-2 ml-3`}>
                        <label
                          className={`block text-sm font-medium  ${"text-gray-400"}`}
                        >
                          <span className="inline-flex items-center">
                            Fecha fin
                          </span>
                        </label>
                        <span className="block w-full rounded-md sm:text-sm placeholder:text-slate-400 border-gray-300 text-gray-400">
                          {calculateEndDate}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-1">
                      <DateInput
                        control={control}
                        name={`endDateAt`}
                        label="Fecha fin"
                        // disabled={!startDateAt}
                        fromCustom={moment(startDateAt)
                          .add(1, "day")
                          .toString()}
                        rules={{
                          required: "Este campo es requerido",
                          validate: (value) =>
                            moment(value).isSameOrAfter(watch(`startDateAt`)) ||
                            "La fecha de fin debe ser igual o posterior a la fecha de inicio",
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Total de personas asociad al recurso  */}
            {watch(`resourceId`) && validateRecoursePerson && resource && (
              <div className="flex flex-col mt-4 gap-y-4 text-sm select-none mb-2">
                <h3 className="font-semibold">Total de personas</h3>

                {(resource?.numberAdults || 0) > 0 && (
                  <article className="flex gap-x-1 ">
                    <span>Adultos</span>
                    <div className="flex gap-x-1 items-center ml-[164px]">
                      <MinusCircleIcon
                        className="w-7 cursor-pointer text-black/70"
                        onClick={() => {
                          setNumberAdults(
                            subValue(numberAdults, `numberAdults`)
                          );
                        }}
                      />
                      <div className="w-7 text-lg text-center">
                        {numberAdults}
                      </div>
                      <PlusCircleIcon
                        className="w-7 cursor-pointer text-black/70"
                        onClick={() => {
                          //@ts-ignore
                          if (
                            resource &&
                            numberAdults >= resource?.numberAdults
                          )
                            return;
                          setNumberAdults(
                            addValue(numberAdults, `numberAdults`)
                          );
                        }}
                      />
                    </div>
                  </article>
                )}

                {(resource?.numberKids || 0) > 0 && (
                  <article className="flex gap-x-7">
                    <span>Niños (De 0 a 12 años)</span>
                    <div className="flex items-center  gap-x-1 ml-12 ">
                      <MinusCircleIcon
                        className="w-7 cursor-pointer text-black/70 "
                        onClick={() =>
                          setNumberKids(subValue(numberKids, `numberKids`))
                        }
                      />
                      <div className="w-7 text-lg text-center  ">
                        {numberKids}
                      </div>
                      <PlusCircleIcon
                        className="w-7 cursor-pointer text-black/70"
                        onClick={() => {
                          //@ts-ignore
                          if (resource && numberKids >= resource?.numberKids)
                            return;
                          setNumberKids(addValue(numberKids, `numberKids`));
                        }}
                      />
                    </div>

                    <div className="hidden">
                      <Input name={`numberAdults`} control={control} />
                      <Input name={`numberKids`} control={control} />
                    </div>
                  </article>
                )}
              </div>
            )}

            <TextArea control={control} name="observations" label="Nota" />
          </>
        </div>

        <footer className="grid grid-cols-2 gap-x-5 items-end justify-end  mt-[50px] ">
          <Button
            name="Verificar disponibilidad"
            color="white"
            textColor="blue-800"
            outline
            loading={isChecking}
            disabled={isChecking}
            action={async () => {
              if (!endDateAt) {
                return toast.warn("Seleccione la fecha fin");
              }
              const res =
                chekcAvailability &&
                (await chekcAvailability({
                  startAt: moment(startDateAt).format("YYYY-MM-DD HH:mm:ss"),
                  endAt: endDateAt,
                  productId: watch(`productId`),
                  resourceId: watch(`resourceId`),
                }));

              setIsAvailabilityDate(res ?? false);
            }}
          />
          {
            <Button
              name="Agregar"
              color="slate-700"
              full
              type="submit"
              // action={onsubmit}
            />
          }
        </footer>
      </form>
    </>
  );
};

export default AddReservation;

const isWithinBusinessHours = (
  dateTime: string | Moment,
  businessHours: any
) => {
  const day = moment(dateTime).format("dddd");
  const time = moment(dateTime).format("HH:mm");

  const openTime = moment(businessHours[day]?.openTimeAt, "HH:mm");
  const closeTime = moment(businessHours[day]?.closeTimeAt, "HH:mm");

  return (
    moment(dateTime).isBetween(openTime, closeTime) ||
    moment(dateTime).isSame(openTime) ||
    moment(dateTime).isSame(closeTime)
  );
};

const validateSelectedDates = (
  startDate: string,
  endDate: string,
  businessHours: any
) => {
  const startDateTime = moment(startDate);
  const endDateTime = moment(endDate);

  if (
    !isWithinBusinessHours(startDateTime, businessHours) ||
    !isWithinBusinessHours(endDateTime, businessHours)
  ) {
    return "Las fechas seleccionadas no están dentro del horario de negocio.";
  }

  if (endDateTime.isBefore(startDateTime)) {
    return "La fecha de fin debe ser posterior a la fecha de inicio.";
  }

  return true;
};

const getDayName = (dayNumber: number): string => {
  switch (dayNumber) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    default:
      return "";
  }
};

const getDayNumber = (dayName: string): number => {
  switch (dayName.toLowerCase()) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    default:
      return -1;
  }
};
