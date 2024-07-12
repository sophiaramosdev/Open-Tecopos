import React, { useContext, useEffect } from "react";
import FileInput from "../../../components/forms/FileInput";
import Button from "../../../components/misc/Button";
import { AddSupplierCtx } from "./AddSupplierWizzard";
import useServer from "../../../api/useServerMain";
import { useDropzone, FileRejection } from "react-dropzone";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";


const SupplierImg = () => {

  const { control, beforeStep } = useContext(AddSupplierCtx);

  const { imgPreview, uploadImg, isFetching: fetchingImg } = useServer();
  const { setValue } = useForm();

  useEffect(() => {
    imgPreview.length !== 0 && setValue!("images", [imgPreview[0].id]);
  }, [imgPreview]);

  const { getRootProps, open, getInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    maxSize: 200000,
    onDropRejected: (e: FileRejection[]) =>
      e[0].errors[0].code === "file-too-large"
        ? toast.error("La imagen excede los 200kb")
        : toast.error("Error al cargar la imagen"),
    onDropAccepted: async (file: File[]) => {
      const data = new FormData();
      data.append("file", file[0]);
      uploadImg(data);
    },
    noClick:false,
    multiple: false,
  });

  return (
    <>
      <div className="h-96 border border-slate-300 rounded p-2 overflow-auto scrollbar-thin">
        <div className="w-full">
          <FileInput
            name="images"
            control={control}
            label="Imagen del proveedor"
            multiple
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 py-2">
        <Button
          color="slate-500"
          action={beforeStep}
          name="Atrás"
          full
          outline
          textColor="slate-600"
        />
       
        <Button name="Finalizar" color="indigo-600" type="submit" full />
        
      </div>
    </>
  );
};

export default SupplierImg;
