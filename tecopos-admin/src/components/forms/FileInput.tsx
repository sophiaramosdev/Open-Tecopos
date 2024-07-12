import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import useServer from "../../api/useServerMain";
import { useController, UseControllerProps } from "react-hook-form";
import SpinnerLoading from "../misc/SpinnerLoading";


interface FileInput{
  label?:string
  defaultImg?:{id:number, src:string};
  multiple?:boolean;
  setLoading?:Function
}


const FileInput = (props:UseControllerProps & FileInput) => {
  const {uploadImg, imgPreview, isFetching} = useServer();
  const {label, defaultImg, multiple=false, setLoading} = props;
  const {field} = useController(props)

  const fieldValue = multiple ? (imgPreview[0]?.id ? [imgPreview[0]?.id] : defaultImg?.id ? [defaultImg] : field.value && field.value ) : (imgPreview[0]?.id ?? defaultImg?.id)


  useEffect(() => {
    field.onChange(fieldValue)
  }, [imgPreview])

  useEffect(() => {
    setLoading && setLoading(isFetching)
  }, [isFetching])
  
  const onDrop = (files: File[]) => {
    const data = new FormData()
    data.append("file",files[0]);
    uploadImg(data)
  };
  
  const { getRootProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    }, 
    maxSize: 200000,
    noKeyboard: false,
    multiple: false,   
  });


  return (
    <div className="sm:flex sm:flex-col sm:items-start sm:gap-4">
      <label
        htmlFor="cover-photo"
        className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
      >
        {label && label}
      </label>
      <div className="mt-2 sm:mt-0 w-full cursor-pointer" {...getRootProps()}>
        <div className="flex rounded-md border-2 border-dashed border-gray-300 p-2">
          <div className="inline-flex space-y-1 gap-5 items-center">
            {isFetching ? (
              <div className="h-40 w-40">
                <SpinnerLoading />
              </div>)
              :defaultImg || imgPreview.length !== 0 
              ? (
              <img
                className="h-40 w-40 object-fill rounded-md"
                src={imgPreview[0]?.src ?? defaultImg?.src ??""}
                alt="image"
              />
            ) : (
              <svg
                className="mx-auto h-40 w-40 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            <div className="flex flex-col text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded bg-white font-medium text-indigo-600 py-1   hover:text-indigo-500 "                
              >
                <p>Click para cargar archivo</p>                
              </label>
              <p className="p-1">o arrastre uno</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 200kB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileInput;
