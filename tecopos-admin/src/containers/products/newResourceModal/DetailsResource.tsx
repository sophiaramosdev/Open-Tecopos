import Input from "../../../components/forms/Input";
import { useContext, useEffect, useState } from "react";
import { ResourceContext } from "./NewWizardResource";
import TextArea from "../../../components/forms/TextArea";
import Toggle from "../../../components/forms/Toggle";
import Button from "../../../components/misc/Button";
import ComboBox from "../../../components/forms/Combobox";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../store/hooks";
import { TrashIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/misc/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";

const DetailsResource = () => {
  const {
    control,
    stepDown,
    stepUp,
    watch,
    mode,
    fetching,
    closeModal,
    data,
    unregister = () => {},
    secondAction = () => {},
  } = useContext(ResourceContext);

  const { business } = useAppSelector((state) => state.init);
  const reservationActive =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  const activeChildrens = watch("activeChildrens");
  const showAmountOfPeople =
    watch("showAmountOfPeople") ?? data?.numberClients ?? 0 > 0 ? true : false;
  const numberKids = watch("numberKids");

  const available = watch("available");
  const bookable = watch("bookable");

  useEffect(() => {
    if (!showAmountOfPeople) {
      unregister("activeChildrens");
    }
  }, [showAmountOfPeople]);

  const [deleteModal, setDeleteModal] = useState(false);

  const { areas } = useAppSelector((state) => state.nomenclator);
  const salesAreas: SelectInterface[] = areas
    .filter((area) => area.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));
  return (
    <>
      <div className="flex flex-col px-10 py-5 gap-y-3 border rounded-md mb-3">
        {mode === "edit" && (
          <div className="flex justify-end">
            <TrashIcon
              onClick={() => setDeleteModal(true)}
              className="text-red-400 w-7 text-end cursor-pointer"
            />
          </div>
        )}
        <Input
          control={control}
          name="code"
          label="Nombre"
          placeholder="Escriba..."
          defaultValue={mode === "edit" ? data?.code : null}
          rules={{
            required: "Este campo es requerido",
            // pattern: {
            //   value: /^(?![#$%^&!@])[A-Za-z0-9#$%^&!@* \t]*[A-Za-z0-9 \t]*$/,
            //   message: "El nombre no puede comenzar con un carácter especial."
            // },
          }}
        />

        <TextArea
          control={control}
          name="description"
          label="Descripción"
          defaultValue={mode === "edit" ? data?.description : null}
        />

        {mode === "new" && (
          <ComboBox
            data={salesAreas}
            name="areaId"
            label="Punto de venta (*)"
            control={control}
            //defaultValue={mode === "edit" ? data?.areaId : null}
            rules={{ required: "Este campo es requerido" }}
          />
        )}

        <div className=" flex justify-between">
          <Toggle
            control={control}
            name="isAvailable"
            title="Disponible"
            defaultValue={mode === "edit" ? data?.isAvailable : null}
          />
          {reservationActive && (
            <Toggle
              control={control}
              name="isReservable"
              title="Reservable"
              defaultValue={mode === "edit" ? data?.isReservable : null}
            />
          )}
        </div>

        {reservationActive && (
          <section>
            <Toggle
              control={control}
              name="showAmountOfPeople"
              title="Cantidad de personas"
              defaultValue={
                (mode === "edit" && data?.numberClients) || 0 > 0 ? true : null
              }
            />

            {showAmountOfPeople && (
              <div className=" grid grid-cols-3 justify-items-center items-center  ">
                {mode === "new" && (
                  <Input
                    control={control}
                    name="numberAdults"
                    label="Adultos"
                    placeholder="Escriba..."
                    disabled={!showAmountOfPeople}
                    rules={{
                      validate: {
                        required: (value) => {
                          if (showAmountOfPeople && !value) {
                            return "Este campo es requerido";
                          }
                          return true;
                        },
                      },
                    }}
                  />
                )}
                {mode === "edit" && (
                  <Input
                    control={control}
                    name="numberAdults"
                    label="Adultos"
                    placeholder="Escriba..."
                    disabled={!showAmountOfPeople && !data?.numberAdults}
                    defaultValue={data?.numberAdults}
                    rules={{
                      validate: {
                        required: (value) => {
                          if (showAmountOfPeople && !value) {
                            return "Este campo es requerido";
                          }
                          return true;
                        },
                      },
                    }}
                  />
                )}
                <div className="mt-4">
                  <Toggle
                    control={control}
                    name="activeChildrens"
                    title="Niños"
                    disabled={!showAmountOfPeople}
                    defaultValue={
                      (mode === "edit" && data?.numberKids) || 0 > 0
                        ? true
                        : null
                    }
                  />
                </div>
                {mode === "new" && activeChildrens && (
                  <Input
                    control={control}
                    name="numberKids"
                    label="Niños (0-12 años)"
                    type="number"
                    placeholder="Escriba..."
                    disabled={
                      (!activeChildrens && !showAmountOfPeople) ||
                      (showAmountOfPeople && !activeChildrens)
                    }
                    rules={{
                      validate: {
                        required: (value) => {
                          if (showAmountOfPeople && activeChildrens && !value) {
                            return "Este campo es requerido";
                          }
                          return true;
                        },
                      },
                    }}
                  />
                )}
                {mode === "edit" && activeChildrens && (
                  <Input
                    control={control}
                    name="numberKids"
                    label="Niños (0-12 años)"
                    type="number"
                    placeholder="Escriba..."
                    defaultValue={data?.numberKids ?? null}
                    disabled={
                      (!activeChildrens && !showAmountOfPeople) ||
                      (showAmountOfPeople &&
                        !activeChildrens &&
                        !data?.numberKids)
                    }
                    rules={{
                      validate: {
                        required: (value) => {
                          if (showAmountOfPeople && activeChildrens && !value) {
                            return "Este campo es requerido";
                          }
                          return true;
                        },
                      },
                    }}
                  />
                )}
              </div>
            )}
          </section>
        )}

        <Modal close={() => setDeleteModal(false)} state={deleteModal}>
          <AlertContainer
            title={`Eliminar Recurso: ${data?.code}`}
            onAction={() => secondAction(data?.id, closeModal)}
            onCancel={() => setDeleteModal(false)}
            text="Seguro que desea eliminar este recurso?"
            loading={fetching}
          />
        </Modal>
      </div>

      <div className="flex justify-end gap-3 py-2">
        <div className="w-72">
          <Button color="slate-700" type="submit" name="Siguiente" full />
        </div>
      </div>
    </>
  );
};

export default DetailsResource;
