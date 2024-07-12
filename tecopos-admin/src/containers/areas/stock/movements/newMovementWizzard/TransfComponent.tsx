import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import Button from "../../../../../components/misc/Button";
import Modal from "../../../../../components/modals/GenericModal";
import TransformationModal from "./TransformationModal";
import TransformedList from "./TransformedList";
import { MovementsContext } from "./WizzardContainer";
import { useParams } from "react-router-dom";

const TransfComponent = () => {
  const {fields, setCurrentStep,reset, remove, setValue} = useContext(MovementsContext)
  const {stockId} = useParams();
  const [transformationModal, setTransformationModal] = useState(false);


  useEffect(() => {
    setValue!("stockAreaId", Number(stockId!));
  }, [])

  return (
    <>
      <div className="relative flex-col h-96 border border-slate-300 rounded overflow-auto scrollbar-thin">
        <div className="sticky top-0 bg-white w-full p-2">
          <Button
            color="indigo-600"
            icon={<PlusIcon className="h-6" />}
            name="Añadir operación de transformación"
            textColor="indigo-600"
            action={() => setTransformationModal(true)}
            full
            outline
          />
        </div>
        <div className="flex-col p-3">
          <TransformedList />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 py-3 ">
        <Button
          color="blue-700"
          name="Atrás"
          action={()=>{
            setCurrentStep!(0);
            reset!();
            remove!();
          }}
          textColor="blue-800"
          full
          outline
        />
        <Button
          color="indigo-700"
          name="Siguiente"
          full
          action={() =>
            fields!.length !== 0
              ? setCurrentStep!(2)
              : toast.warning(
                  "Inserte al menos una operación de transformación"
                )
          }
        />
      </div>

      {transformationModal && (
        <Modal
          state={transformationModal}
          close={setTransformationModal}
          size="m"
        >
          <TransformationModal close={() => setTransformationModal(false)} />
        </Modal>
      )}
    </>
  );
};

export default TransfComponent;
