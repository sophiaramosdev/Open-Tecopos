import { SubmitHandler, useForm } from "react-hook-form";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import Input from "../../../../../components/forms/Input";
import { useState, useContext } from "react";
import Modal from "../../../../../components/misc/GenericModal";
import { DispatchContext } from "../HistoricalDetails";
import useServerUsers from "../../../../../api/useServerUsers";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../../../../utils/helpers";
import GenericList from "../../../../../components/misc/GenericList";

const Details = (props: any) => {

  const { HistoricalDetailsData, setHistoricalDetailsData } = useContext(DispatchContext);

  const { DeleteHistoricalSalary, EditHistoricalSalaryReport, isFetching, isLoading } = useServerUsers()

  const { handleSubmit, control } = useForm();

  const navigate = useNavigate();

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    //Update
    const { name, observations } = data

    EditHistoricalSalaryReport(HistoricalDetailsData?.id!, data, () => setHistoricalDetailsData({
      ...HistoricalDetailsData,
      name,
      observations
    }))
  };

  const [warningModal, setwarningModal] = useState<{ state: boolean; helper: any }>({
    state: false,
    helper: null
  })

  const dataBody = {
    "Fecha inicio": (formatDate(HistoricalDetailsData?.startsAt!)),
    "Fecha fin": (formatDate(HistoricalDetailsData?.endsAt!)),
    "Fecha de creación": (HistoricalDetailsData?.generatedAt !== null ? formatDate(HistoricalDetailsData?.generatedAt!) : "-"),
    "Generado por": (HistoricalDetailsData?.generatedBy !== null ? (HistoricalDetailsData?.generatedBy.displayName! ?? "") : "-"),
  }

  return (
    <div className={props.show ? '' : 'hidden'}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <Input defaultValue={HistoricalDetailsData?.name! ?? ""} label="Nombre" name="name" rules={{ required: "Este campo es requerido" }} control={control} />
          </div>

          <div className="my-2 p-1">
            <GenericList
              body={dataBody}
            />

          </div>

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <TextArea defaultValue={HistoricalDetailsData?.observations! ?? ""} label="Observaciones" name="observations" control={control} />
          </div>
          <div className="px-4 py-3 bg-slate-50 text-right sm:px-6 flex justify-end items-center">
            <div className="mx-2">
              <Button
                color="slate-600"
                type="submit"
                name="Actualizar"
                loading={isFetching}
              />
            </div>
            <div className="mx-2">
              <Button
                color="red-600"
                type="button"
                name="Eliminar"
                action={() => setwarningModal({ state: true, helper: null })}
                loading={isLoading}
              />
            </div>

          </div>
        </div>

      </form>

      {
        warningModal.state && (
          <Modal state={warningModal.state} close={setwarningModal}>
            <p className="text-center text-red-600 font-semibold">¡Atención!</p>
            <p>¿Está seguro que desea eliminar el reporte {HistoricalDetailsData?.name ?? ""}?</p>
            <p className="flex w-full justify-center items-center">Esta acción es irreversible</p>

            <div className="flex w-full justify-between mt-4">
              <Button
                name="No"
                color="slate-600"
                type="button"
                action={() => {
                  setwarningModal({ state: false, helper: null })
                }}
              />
              <Button
                name="Sí, entiendo lo que hago"
                color="red-600"
                type="button"
                action={() => {
                  //Deleting Code
                  DeleteHistoricalSalary(HistoricalDetailsData?.id!, () => navigate("/salary/historical"))
                  setwarningModal({ state: false, helper: null })
                }}
                loading={isLoading}
              />
            </div>
          </Modal>
        )
      }
    </div>

  );
}

export default Details
