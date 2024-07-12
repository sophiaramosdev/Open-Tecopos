/* eslint-disable react-hooks/exhaustive-deps */
import AsyncComboBox from "../../../../components/forms/AsyncCombobox";
import {
  useContext,
  useMemo,
  useState,
} from "react";
import { NewReservationContext } from "./NewReservation";
import Button from "../../../../components/misc/Button";
import DateInput from "../../../../components/forms/DateInput";
import {
  MinusCircleIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import TextArea from "../../../../components/forms/TextArea";
import Input from "../../../../components/forms/Input";
import moment from "moment";
import Fetching from "../../../../components/misc/Fetching";
import { useAppSelector } from "../../../../store/hooks";
import { toast } from "react-toastify";
import { ReservationsContext } from "../allReservations/AllReservations";

const DetailsReservation = () => {
  const {
    control,
    watch = () => {},
    setValue = () => {},
    setCurrentStep = () => {},
    fields,
    allProducts = [],
    isFetchingProduct,
    setShowNewClient = () => {},
  } = useContext(NewReservationContext);

  const { slotSelect, isChecking } = useContext(ReservationsContext);
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


  const numberKidsFrom = watch(`reservationProducts[${0}].numberKids`) ?? 0;
  const numberAdultsFrom = watch(`reservationProducts[${0}].numberAdults`) ?? 0;

  const [numberAdults, setNumberAdults] = useState(numberAdultsFrom);
  const [numberKids, setNumberKids] = useState(numberKidsFrom);

  const resourceId = watch(`reservationProducts[${0}].resourceId`);

  const resource =
    allProducts[0]?.resources?.find((item) => item.id === resourceId) ??
    undefined;

  //------------------------------------------------------------------

  const addValue = (value: number = 0, name: string) => {
    setValue(name, value + 1);
    return value + 1;
  };
  const subValue = (value: number = 0, name: string) => {
    if (value <= 0) return 0;
    setValue(name, value - 1);
    return value - 1;
  };
  //------------------------------------------------------------------
  const { blocked, closeTimeAt, openTimeAt } = useMemo(() => {
    const startDateAt = watch(`reservationProducts[${0}].startDateAt`);

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

  const slotWithOpenTime = moment(slotSelect ?? new Date()).set({
    hour: moment(openTimeAt, "HH:mm").hour(),
    minute: moment(openTimeAt, "HH:mm").minute(),
    second: 0,
  });

  const startDateAt =
    watch(`reservationProducts[${0}].startDateAt`) ?? slotWithOpenTime;
  const endDateAt = watch(`reservationProducts[${0}].endDateAt`);

  const calculateEndDate = useMemo(() => {
    const startDateAtB =
      watch(`reservationProducts[${0}].startDateAt`) ?? startDateAt;
    const duration = allProducts[0]?.duration;

    if (startDateAtB && duration) {
      const durationArray = duration.split(":");
      const durationHours = parseInt(durationArray[0]);
      const durationMinutes = parseInt(durationArray[1]);
      const durationInMinutes = durationHours * 60 + durationMinutes;
      const endDate = moment(startDateAtB).add(durationInMinutes, "minutes");
      setValue(
        `reservationProducts[${0}].endDateAt`,
        endDate.format("YYYY-MM-DD HH:mm:ss")
      );
      setValue(
        `reservationProducts[${0}].endDateAt2`,
        endDate.format("DD MMMM YYYY - hh:mm A")
      );
      setValue(
        `reservationProducts[${0}].startDateAt`,
        moment(startDateAtB).format("YYYY-MM-DD HH:mm:ss")
      );
      return endDate.format("DD MMMM YYYY - hh:mm A");
    } else {
      return null;
    }
  }, [watch(`reservationProducts[${0}].startDateAt`)]);

  
  const validateRecoursePerson =
    (resource?.numberAdults || 0) > 0 || (resource?.numberKids || 0) > 0;

  if (isFetchingProduct)
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );

  return (
    <>
      <div className="flex flex-col justify-between gap-y-5 mt-4 min-h-[25rem]">
        <div>
          {fields?.map((field: any, idx) => (
            <div key={idx}>
              <>
                <div className="grid grid-cols-2 gap-x-5">
                  <div className="mt-1">
                    <DateInput
                      control={control}
                      name={`reservationProducts[${idx}].startDateAt`}
                      label="Fecha inicio"
                      // fromCustom={moment(slotSelect)
                      //   .add(openTimeAt, "h")
                      //   .toISOString()}
                      includeTime={allProducts[idx]?.hasDuration}
                      rules={{
                        required: "Este campo es requerido",
                      }}
                      defaultValue={
                        allProducts[idx]?.hasDuration
                          ? slotWithOpenTime
                          : slotSelect
                      }
                      disabledDays={
                        allProducts[idx]?.hasDuration ? blocked : []
                      }
                      minHour={parseInt(openTimeAt?.split(":")[0])}
                      maxHour={
                        parseInt(closeTimeAt?.split(":")[0]) -
                        parseInt(allProducts[idx]?.duration?.split(":")[0])
                      }
                    />
                  </div>

                  {allProducts[idx]?.hasDuration &&
                  allProducts[idx]?.duration ? (
                    <>
                      <div className="mb-3">
                        {/* <Input
                          control={control}
                          name={`reservationProducts[${idx}].endDateAt`}
                          label="Fecha fin"
                          disabled={true}
                          placeholder={calculateEndDate ?? ""}
                          //defaultValue={calculateEndDate}
                          rules={{
                            required: "Este campo es requerido",
                            validate: (value) =>
                              moment(value).isSameOrAfter(
                                watch(`reservationProducts[${idx}].startDateAt`)
                              ) ||
                              "La fecha de fin debe ser igual o posterior a la fecha de inicio",
                          }}
                        /> */}
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
                          name={`reservationProducts[${idx}].endDateAt`}
                          label="Fecha fin"
                          // disabled={!startDateAt}
                          fromCustom={moment(startDateAt)
                            .add(1, "day")
                            .toString()}
                          rules={{
                            required: "Este campo es requerido",
                            validate: (value) =>
                              moment(value).isSameOrAfter(
                                watch(`reservationProducts[${idx}].startDateAt`)
                              ) ||
                              "La fecha de fin debe ser igual o posterior a la fecha de inicio",
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-x-3 items-center mt-4">
                  <div className=" flex-1">
                    <AsyncComboBox
                      dataQuery={{
                        url: "/customer",
                        defaultParams: { all_data: false },
                      }}
                      normalizeData={{
                        id: "id",
                        name: ["firstName", "lastName"],
                        format: "firstName lastName",
                      }}
                      label="Cliente "
                      name="clientId"
                      control={control}
                      rules={{ required: "Este campo es requerido" }}
                    />
                  </div>

                  <div className="mt-5">
                    <Button
                      icon={<PlusIcon className="h-5" />}
                      color="gray-400"
                      textColor="slate-600"
                      action={() => setShowNewClient(true)}
                      outline
                    />
                    
                  </div>
                </div>

                {/* Total de personas asociadas al recurso  */}
                {watch(`reservationProducts[${idx}].resourceId`) &&
                  validateRecoursePerson &&
                  //@ts-ignore
                  resource && (
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
                                  subValue(
                                    numberAdults,
                                    `reservationProducts[${idx}].numberAdults`
                                  )
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
                                  addValue(
                                    numberAdults,
                                    `reservationProducts[${idx}].numberAdults`
                                  )
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
                                setNumberAdults(
                                  subValue(
                                    numberKids,
                                    `reservationProducts[${idx}].numberKids`
                                  )
                                )
                              }
                            />
                            <div className="w-7 text-lg text-center  ">
                              {numberKids}
                            </div>
                            <PlusCircleIcon
                              className="w-7 cursor-pointer text-black/70"
                              onClick={() => {
                                //@ts-ignore
                                if (
                                  resource &&
                                  numberKids >= resource?.numberKids
                                )
                                  return;
                                setNumberKids(
                                  addValue(
                                    numberKids,
                                    `reservationProducts[${idx}].numberKids`
                                  )
                                );
                              }}
                            />
                          </div>

                          <div className="hidden">
                            <Input
                              name={`reservationProducts[${idx}].numberAdults`}
                              control={control}
                            />
                            <Input
                              name={`reservationProducts[${idx}].numberKids`}
                              control={control}
                            />
                          </div>
                        </article>
                      )}
                    </div>
                  )}

                <TextArea control={control} name="notes" label="Nota" />
              </>
            </div>
          ))}
        </div>

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  mt-[50px] ">
          <Button
            name="Atrás"
            color="white"
            textColor="blue-800"
            outline
            action={() => {
              setCurrentStep((value: number) => value - 1);
            }}
            full
          />

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
             
            }}
          />
          {<Button name="Siguiente" color="slate-700" type="submit" full />}
        </footer>
      </div>
    </>
  );
};

export default DetailsReservation;


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
