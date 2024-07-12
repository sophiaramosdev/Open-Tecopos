import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../interfaces/InterfacesLocal";
import Button from "../../components/misc/Button";
import useServerUsers from "../../api/useServerUsers";
import TextArea from "../../components/forms/TextArea";
import { ChevronRight } from 'heroicons-react';
import useServer from "../../api/useServerMain";
import { toast } from "react-toastify";

import Dropzone, { FileRejection } from 'react-dropzone'

import { JSXElementConstructor, ReactElement, ReactFragment, ReactPortal, useEffect, useState } from "react";


const NewPersonRecordModal = ({ close, personId }: { close: Function, personId: number }) => {

    const { docPreview, uploadDoc, isFetching } = useServer();

    const [acceptedFiles, setAcceptedFiles] = useState<any>([])


    const { registerPersonRecord, isLoading } = useServerUsers()


    const { control, handleSubmit } = useForm();
    const [observ, setObservations] = useState<string>("");

    const onSubmit: SubmitHandler<BasicType> = (data) => {

        const { observations } = data

        setObservations(observations as string)

        if (acceptedFiles.length > 0) {
            const dataFile = new FormData();
            dataFile.append("file", acceptedFiles[0]);

            uploadDoc(dataFile)
        } else {
            // @ts-ignore
            registerPersonRecord({
                observations: observations as string ?? "",
            }, personId!, close!)
        }
    };

    useEffect(() => {

        if (!!docPreview) {
            // @ts-ignore
            registerPersonRecord({
                observations: observ as string ?? "",
                // @ts-ignore
                documentId: docPreview[0]?.id ?? 0
            }, personId!, close!)
        }

    }, [docPreview])


    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-100 pr-5 pl-2">

                <div className="py-2 w-full">
                    <TextArea
                        name="observations"
                        control={control}
                        label="Observaciones"
                        rules={{ required: "Este campo es requerido" }}
                    />
                </div>

                <Dropzone
                    maxSize={200000}
                    onDropAccepted={acceptedFiles => {
                        setAcceptedFiles(acceptedFiles)
                    }}
                    onDropRejected={(e: FileRejection[]) => {
                        e[0].errors[0].code === "file-too-large"
                            ? toast.error("El documento excede los 200kb")
                            : toast.error("Error al cargar el documento")
                    }}>
                    {({ getRootProps, getInputProps }) => (
                        <section>
                            <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <Button
                                    name="Seleccionar Archivos"
                                    color="slate-600"
                                    type="button"
                                />
                            </div>
                        </section>
                    )}
                </Dropzone>

                {
                    acceptedFiles?.map((files: { path: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | ReactFragment | ReactPortal | null | undefined; }) => (
                        <div className="flex justify-start\ items-center">
                            <ChevronRight className='h-5' />
                            <p className="my-2 font-medium text-slate-500"> {files?.path}</p>
                        </div>
                    ))
                }




            </div>
            <div className="flex justify-end mt-5">
                <Button
                    name="Insertar"
                    color="slate-600"
                    type="submit"
                    loading={isLoading || isFetching}
                    disabled={isLoading || isFetching}
                />
            </div>
        </form>
    )
}
export default NewPersonRecordModal
