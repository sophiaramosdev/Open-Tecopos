import React, { useContext } from "react";
import Button from "../../../components/misc/Button";
import MultipleDrop from "../../../components/misc/Images/MultipleDrop";
import { useForm } from "react-hook-form";

const ImagesResoursetab = () => {
    const {control} = useForm()

  return (
    <>
      <form className="h-96 border border-slate-300 rounded p-2 overflow-auto scrollbar-thin">
        <div className="w-full">
          <MultipleDrop name="images" control={control} />
        </div>
      </form>
      <div className="grid grid-cols-2 gap-3 py-2">
       
       <div className="flex justify-end col-start-2">
        <Button color="slate-700" type="submit" name="Actualizar" full  />
       </div>
      </div>
    </>
  );
};

export default ImagesResoursetab;