/* eslint-disable react-hooks/exhaustive-deps */
import { SubmitHandler, useForm } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import TimeInput from "../../../../components/forms/InputTimer";
import { translateWeekDays } from "../../../../utils/translate";
import CheckboxInput from "../../../../components/forms/CheckboxInput";
import useServerBusiness from "../../../../api/useServerBusiness";
import { useAppSelector } from "../../../../store/hooks";
import { useMemo } from "react";

const AvaliabilityV2 = () => {
  const { handleSubmit, control, watch } = useForm();

  const { updateConfigs, isFetching } = useServerBusiness();
  // const days = [
  //   "Lunes",
  //   "Martes",
  //   "Miércoles",
  //   "Jueves",
  //   "Viernes",
  //   "Sábado",
  //   "Domingo",
  // ];

  const { business } = useAppSelector((state) => state.init);
  // const schedule = JSON.parse(
  //   business!.configurationsKey.find((item) => item.key === "schedule")
  //     ?.value ?? ""
  // );
  const scheduleString =
    business!.configurationsKey.find((item) => item.key === "schedule")
      ?.value ?? "";

  let schedule: any;

  try {
    schedule = JSON.parse(scheduleString);
  } catch (error) {
    console.error("Error al parsear el JSON:", error);
    schedule = {};
  }

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Temp valdiation 
  const schedule_business = useMemo(() => {
    let schedule_business: any = {};
    const keysArray = Object.keys(schedule);
    const fieldInput: any = days.map((item) => watch(`${item}`))

    for (let i = 0; i < keysArray.length; i++) {
      const key = keysArray[i];
      const value = fieldInput[i] ?? schedule[key];
      if (value.isActive) {
        schedule_business[key] = value;
      }
    }
    return schedule_business;
  }, [schedule, [...days.map((item) => watch(`${item}`))]]);

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    //@ts-ignore
    updateConfigs({ schedule: JSON.stringify(data) });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="h-full bg-white rounded-md shadow-md  border-gray-200 p-5"
      >
        <header>
          <h3 className="font-semibold">Disponibilidad General</h3>
          <span>Configure la disponibilidad que maneja su negocio.</span>
        </header>

        <div className="grid grid-cols-3 items-center">
          <h4 className="col-start-2 col-end-2 text-center">Abierto</h4>
          <h4 className="col-start-3 text-center">Cerrado</h4>
        </div>

        <div className=" w-full">
          {days.map((day, index) => (
            <div key={index} className="grid grid-cols-3 gap-y-5">
              <div className="my-4">
                <CheckboxInput
                  label={translateWeekDays(
                    day.charAt(0).toUpperCase() + day.slice(1)
                  )}
                  name={`${day}.isActive`}
                  control={control}
                  defaultValue={schedule[day]?.isActive}
                />
              </div>
              <div className="mx-5 my-2">
                <TimeInput
                  name={`${day}.openTimeAt`}
                  control={control}
                  defaultValue={schedule[day]?.openTimeAt}
                  disabled={!schedule_business[day]?.isActive}
                  rules={{
                    validate: (value) => {
                      if (watch(`${day}.isActive`) && !value) {
                        return "Este campo es requerido";
                      } else {
                        return true;
                      }
                    },
                  }}
                />
              </div>

              <div className="mx-5 my-2">
                <TimeInput
                  name={`${day}.closeTimeAt`}
                  control={control}
                  defaultValue={schedule[day]?.closeTimeAt}
                  minTime={watch(`${day}.openTimeAt`)}
                  // disabled={
                  //   !watch(`${day}.isActive`) ||
                  //   !schedule_business[day]?.isActive
                  // }
                  disabled={!schedule_business[day]?.isActive}
                  rules={{
                    validate: (value) => {
                      if (watch(`${day}.isActive`) && !value) {
                        return "Este campo es requerido";
                      } else {
                        return true;
                      }
                    },
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 py-5 mt-3">
          <Button
            color="slate-700"
            name="Actualizar"
            type="submit"
            disabled={isFetching}
            loading={isFetching}
          />
        </div>
      </form>
    </>
  );
};

export default AvaliabilityV2;
