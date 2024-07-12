import  { useContext } from "react";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import { DispatchContext } from "./DispatchWizard";


const NotesFinishStep = () => {
  const {control, setCurrentStep} = useContext(DispatchContext)


  return (
    <>
      <div className="flex h-96">
        <div className="w-full border border-slate-300 p-3 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
          <TextArea
            label="Agregue una nota"
            name="observations"
            control={control}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 py-2 gap-2">
      <Button name="Atrás" color="gray-900" action={() => setCurrentStep!(1)} textColor="slate-700" outline full/>
        <Button
          name="Finalizar"
          color="slate-600"
          type="submit"
          full

        />
      </div>
    </>
  );
};

export default NotesFinishStep;
