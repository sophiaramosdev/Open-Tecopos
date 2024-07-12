import Button from "../../../../../components/misc/Button";
import DateInput from "../../../../../components/forms/DateInput";
import TextArea from "../../../../../components/forms/TextArea";
import moment from "moment";
import { useForm } from "react-hook-form";
import { useCallback, useContext, useMemo, useState } from "react";
import { ReservationsContext } from "../../CalendarReservation";
import CheckboxInput from "../../../../../components/forms/CheckboxInput";
import { Event2 } from "../../../../../components/calendar/GenericCalendar";
import { ModalAlert } from "../../../../../components";
import Input from "../../../../../components/forms/Input";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "../../../../../store/hooks";
import { getDayName, getDayNumber } from "../../../../../utils/helpers";

interface Props {
  close?: Function;
  event?: Event2;
}
const BlockTimeFrom = ({ event, close }: Props) => {
  const { control, watch, setValue, handleSubmit } = useForm();
  const {
    newTimeBlock = () => {},
    isFetching,
    deletedTimeBlock,
    editTimeBlock = () => {},
    slotSelect,
  } = useContext(ReservationsContext);

  const [showDelete, setShowDelete] = useState(false);

  const startAt = watch("startAt") ?? event?.start ?? slotSelect;
  const endAt = watch("endAt") ?? event?.end;

  const differenceInHours = moment(endAt).diff(moment(startAt), "hours");
  const isMoreThan24Hours = differenceInHours > 23;

  const day = watch("24h") ?? (isMoreThan24Hours || false);

  const onSubmit = (data: any) => {
    data.startAt = moment(data.startAt).format("YYYY-MM-DD HH:mm:ss");
    data.endAt = moment(data.endAt).format("YYYY-MM-DD HH:mm:ss");
    if (event) {
      editTimeBlock(event.id, data, close);
    } else {
      newTimeBlock(data, close);
    }
  };

  const calculateEnd = useMemo(() => {
    if (day) {
      const end = moment(startAt).add(1, "day").format("LL") ?? "";
      setValue(
        "endAt",
        moment(startAt).add(1, "day").format("YYYY-MM-DD HH:mm:ss")
      );
      return end;
    }
  }, [startAt,day]);


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


  return (
    <>
      <form
        className="flex flex-col gap-y-5 px-5 "
        onSubmit={handleSubmit(onSubmit)}
      >
        <h3 className="font-semibold text-xl text-center">Tiempo de bloqueo</h3>
        <div className="flex justify-end">
          {event && (
            <Button
              icon={<TrashIcon className="w-7 text-red-500 cursor-pointer" />}
              color="gray-400"
              textColor="slate-600"
              action={() => setShowDelete(true)}
              outline
            />
          )}
        </div>
        <div className="flex  gap-x-5 w-full">
          <div className="mt-1 w-full">
            <DateInput
              control={control}
              name="startAt"
              label="Fecha inicio"
              includeTime={!day}
              rules={{ required: "Este campo es requerido" }}
              defaultValue={event?.start || slotSelect}
            />
          </div>
          {day ? (
            <>
              <Input
                control={control}
                name={``}
                label="Fecha fin"
                disabled={true}
                placeholder={calculateEnd ?? ""}
              />
            </>
          ) : (
            <>
              <div className="mt-1 w-full">
                <DateInput
                  control={control}
                  name="endAt"
                  label="Fecha fin"
                  disabled={!startAt}
                  includeTime={!day}
                  rules={{
                    required: "Este campo es requerido",
                    validate: (value) =>
                      moment(value).isSameOrAfter(startAt) ||
                      "La fecha de fin debe ser igual o posterior a la fecha de inicio",
                  }}
                  defaultValue={event?.end || calculateEnd}
                />
              </div>
            </>
          )}
        </div>

        <CheckboxInput
          control={control}
          name="24h"
          label="24 Horas"
          defaultValue={day}
        />

        <div className="flex gap-x-5"></div>

        <TextArea
          control={control}
          name="notes"
          label="Nota"
          defaultValue={event?.notes}
        />

        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end  mt-[50px] ">
          <div className="col-start-3">
            <Button
              name={`${event ? "Editar" : "Aceptar"}`}
              color="slate-700 "
              type="submit"
              full
              disabled={isFetching}
              loading={isFetching}
            />
          </div>
        </footer>
      </form>
      {showDelete && (
        <ModalAlert
          type="warning"
          title={`Eliminar bloque  `}
          text={`¿Esta seguro que desea eliminar este tiempo de bloque .`}
          onAccept={() => {
            deletedTimeBlock!(event?.id, close);
            close && close();
            setShowDelete(false);
          }}
          onClose={() => setShowDelete(false)}
          isLoading={isFetching}
        />
      )}
    </>
  );
};

export default BlockTimeFrom;
