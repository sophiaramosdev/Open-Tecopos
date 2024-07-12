import { ChangeEvent, useContext, useState } from "react";
import Button from "../../../../../components/misc/Button";
import { FaPaperclip } from "react-icons/fa6";
import useServer from "../../../../../api/useServerMain";
import ReceiptContext from '../ReceiptContext' 
import { DocumentInterface } from "../../../../../interfaces/ServerInterfaces";
import IconTypeFile from "../../../../../components/misc/IconTypeFile";
import { toast } from "react-toastify";

const UploadFile = ({ close }: { close: Function }) => {
  const { uploadDoc, progress } = useServer();
  const { appendDocument } = useContext(ReceiptContext);

  const [fileInput, setFileInput] = useState<File | null>(null);

  const size = fileInput ? fileInput.size / 1048576 : 0;
  const sizeFormated = size
    ? size / 1048576 < 1
      ? `${Math.ceil(size * 1024)}kB`
      : `${Math.ceil(size)}MB`
    : "";
  const fileType = fileInput?.name.split(".").reverse()[0];
  const allowedType = [
    "pdf",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "doc",
    "docx",
  ].includes(fileType ?? "");

  const submit = () => {
    if (size > 15) {
      toast.error("El tamaño del archivo excede el permitido");
    }
    if (
      !["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(
        fileType ?? ""
      )
    ) {
      toast.error("Formato de archivo no admitido");
    }
    const form: HTMLFormElement = document.querySelector("#fileform")!;
    const formData = new FormData(form);
    const callback = (values: DocumentInterface) => {
      appendDocument!(values);
      close();
    };
    uploadDoc(formData, callback);
  };

  const onChange = (e: ChangeEvent) => {
    e.preventDefault();
    const form: HTMLFormElement = document.querySelector("#fileform")!;
    const data = new FormData(form).get("file");
    if ((data as File)?.name) setFileInput(data as File);
  };

  return (
    <form id="fileform" className="space-y-2" action="">
      <h1 className="text-gray-600 font-semibold">Adjuntar documento</h1>
      <textarea
        className="focus:ring-slate-400 border-slate-300 focus:border-slate-600 text-slate-400
        block w-full rounded-md  pr-10 sm:text-sm placeholder:text-slate-400 scrollbar-thin"
        placeholder="Descripión del documento"
        name="description"
      />
      <div className="border border-gray-300 rounded-md py-2 px-5">
        <div className="gap-2 flex justify-between items-center h-8">
          {!!progress ? (
            <span
              className="block h-2 bg-slate-600 rounded-md"
              style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
            />
          ) : (
            <>
              <div className="inline-flex gap-2 items-center">
                {!fileInput ? (
                  <span className="text-gray-500">
                    Archivos admitidos: .xls .ppt .doc .pdf{" "}
                  </span>
                ) : (
                  <>
                    <IconTypeFile fileType={fileType} />
                    <span className="text-gray-500">{fileInput?.name}</span>
                    <span
                      className={
                        size > 15 || !allowedType
                          ? "text-red-600"
                          : "text-green-500"
                      }
                    >
                      {`(${
                        allowedType ? sizeFormated : "Formato no admitido"
                      })`}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center">
                <label
                  htmlFor="file"
                  className="bg-slate-50 border border-gray-300 shadow-md rounded-md py-1 px-2 active:shadow-none hover:cursor-pointer"
                >
                  Seleccionar archivo
                </label>
                <input
                  name="file"
                  type="file"
                  id="file"
                  className="sr-only"
                  onChange={onChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex justify-end py-2">
        <Button
          name="Adjuntar"
          color="slate-500"
          icon={<FaPaperclip />}
          action={submit}
        />
      </div>
    </form>
  );
};

export default UploadFile;
