/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import Select from "../../../../components/forms/Select";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { padStart } from "lodash";
import Check from "../../../../components/forms/GenericCheck";
import { translateWeekDays } from "../../../../utils/translate";
import TimeInput from "../../../../components/forms/InputTimer";

const Availability = () => {
  const { handleSubmit, control, watch, setValue } = useForm();
  const [openingHours, setOpeningHours] = useState<any>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  const onSubmit: SubmitHandler<Record<string, boolean>> = (data) => {
  };
  useEffect(() => {
    const fetchData = async () => {
      const hours = Array.from({ length: 24 }, (_, index) => ({
        id: index,
        name: padStart(`${index}`, 2, "0") + ":00",
      }));
      const data: Array<SelectInterface> = hours.map((hour) => ({
        id: hour.id,
        name: hour.name,
      }));

      const selectedDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      selectedDays.forEach((day) => {
        setValue(`${day}.openingHour`, "");
        setValue(`${day}.closingHour`, "");
      });

      setHours(data);
    };

    fetchData();
  }, [setValue]);

  const [hours, setHours] = useState<Array<SelectInterface>>([]);

  useEffect(() => {
    Object.keys(openingHours).forEach((key) => {
      if (openingHours[key] === true) {
        setValue(`${key}.openingHour`, {
          id: null,
          name: "",
        });
        setValue(`${key}.closingHour`, "00:00");
      }
    });
  }, [openingHours]);

  const handleDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setValue(`${day}.openingHour`, "00:00");
      setValue(`${day}.closingHour`, "00:00");
      setOpeningHours({ ...openingHours, [day]: true });
    } else {
      setValue(`${day}.openingHour`, { id: null, name: "" });
      setValue(`${day}.closingHour`, { id: null, name: "" });
      setOpeningHours({ ...openingHours, [day]: false });
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="h-full bg-white rounded-md shadow-md border-gray-200 p-5"
      >
        <header>
          <h3 className="font-semibold">Disponibilidad General</h3>
          <span>Configure la disponibilidad que maneja su negocio.</span>
        </header>

        <div className="grid grid-cols-3 items-center">
          <h4 className="col-start-2 col-end-2 text-center">Abierto</h4>
          <h4 className="col-start-3 text-center">Cerrado</h4>
        </div>

        <div className="grid grid-cols-3 gap-y-5 gap-x-5 pl-5 w-full">
          <div className="flex flex-col gap-y-7">
            {/* Renderizar checkboxes para los días de la semana */}
            {[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((day) => (
              <Check
                key={day}
                value={""}
                label={translateWeekDays(
                  day.charAt(0).toUpperCase() + day.slice(1)
                )}
                onChange={(e) => handleDayChange(day, e.target.checked)}
              />
            ))}
          </div>

          <div className="max-w-[120px] mx-auto flex flex-col gap-y-2">
            {/* Selectores de horas de apertura */}
            {/* {[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((day, index) => (
              <Select
                key={index}
                name={`${day}.openingHour`}
                label=""
                control={control}
                data={hours}
                disabled={!openingHours[day]}
                
              />
            ))} */}
            <TimeInput control={control} name="" />
          </div>

          <div className="max-w-[120px] mx-auto flex flex-col gap-y-2">
            {/* Selectores de horas de cierre */}
            {[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((day, index) => (
              <Select
                key={index}
                name={`${day}.closingHour`}
                label=""
                control={control}
                data={hours.filter(
                  (hour) => Number(hour.id) > Number(watch(`${day}.openingHour`))
                )}
                disabled={!openingHours[day]}
              />
            ))}
          </div>
        </div>
      </form>
      <div className="flex justify-end gap-3 py-2 mt-3">
        <div className="w-72">
          <Button color="slate-700" action={onSubmit} name="Actualizar" full />
        </div>
      </div>
    </>
  );
};

export default Availability;
