import {  useState } from "react";
import { useDropzone, DropEvent, FileRejection } from "react-dropzone";
import { toast } from "react-toastify";
import useServer from "../../api/useServerMain";
import { UseControllerProps } from "react-hook-form";
import { TbFileImport } from "react-icons/tb";
import { CiFileOn } from "react-icons/ci";
import {
  BsFiletypeDoc,
  BsFiletypeDocx,
  BsFiletypePdf,
  BsFiletypePpt,
  BsFiletypePptx,
  BsFiletypeXls,
  BsFiletypeXlsx,
} from "react-icons/bs";

interface DropInterface {
  className?: string;
  previewDefault?: string;
  setDisabled?: Function;
}

const GenericDocDrop = ({
  className,
  previewDefault,
  setDisabled,
  ...props
}: DropInterface & UseControllerProps) => {
  const { uploadDoc, progress } = useServer();
  const [ext, setExt] = useState<string>("");

  const { getRootProps, open } = useDropzone({
    accept: {
      "application/vnd": [
        ".pdf",
        ".ppt",
        ".pptx",
        ".xls",
        ".xlsx",
        ".doc",
        ".docx",
      ],
    },
    maxSize: 15728640,
    onDropRejected: (e: FileRejection[]) =>
      e[0].errors[0].code === "file-too-large"
        ? toast.error("El archivo excede los 15MB")
        : toast.error("Error al cargar la archivo"),
    onDropAccepted: async (file: File[], e: DropEvent) => {
      const fileName = file[0].name.split(".");
      const name = fileName[0];
      const extension = fileName[1];
      setExt(extension);
      const data = new FormData();
      data.append("file", file[0]);
      data.append("name", name);
      uploadDoc(data);
    },
    noKeyboard: false,
    multiple: false,
  });

  return (
    <div
      className={`${
        className
          ? className
          : "flex items-center justify-center border border-gray-300 p-2 rounded-lg h-full overflow-hidden"
      } relative group`}
    >
      {progress && (
        <span
          className="h-1 bg-slate-600 absolute top-0 left-0"
          style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
        />
      )}
      {!!previewDefault ? (
        <div className="flex flex-col items-center justify-center h-full w-full gap-5">
          <Icon
            fileType={ext ?? previewDefault?.split(".")[1]}
            className="text-8xl text-gray-400"
          />
          <a
            className="text-gray-400 cursor-pointer hover:scale-110 transition ease-in-out duration-300"
            href={previewDefault}
            target="_blank"
          >
            Ver documento
          </a>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center h-full w-full gap-5"
          {...getRootProps()}
        >
          <TbFileImport className="text-8xl text-gray-400" />
          <p className="text-gray-400">Adjuntar archivo</p>
          {!previewDefault && (
            <div
              className={`${
                className ? className : ""
              } hidden group-hover:flex justify-center absolute top-0 items-center bg-gray-400 opacity-80 w-full h-full cursor-pointer`}
            >
              <div className="flex flex-col text-sm text-gray-600 text-center items-center p-5">
                <div className="relative cursor-pointer rounded font-medium text-gray-50">
                  <p onTouchStartCapture={open}>Click para cargar archivo</p>
                </div>
                {/*<p className="text-gray-100">o arrastre uno</p>*/}
                <p className="text-sm text-gray-100 pt-5">
                  PPT, PDF, DOC, XLS hasta 15MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Icon = ({
  fileType,
  className,
}: {
  fileType: string;
  className: string;
}) => {
  switch (fileType) {
    case "pdf":
      return <BsFiletypePdf className={className} />;
    case "doc":
      return <BsFiletypeDoc className={className} />;
    case "docx":
      return <BsFiletypeDocx className={className} />;
    case "ppt":
      return <BsFiletypePpt className={className} />;
    case "pptx":
      return <BsFiletypePptx className={className} />;
    case "xls":
      return <BsFiletypeXls className={className} />;
    case "xlsx":
      return <BsFiletypeXlsx className={className} />;
    default:
      return <CiFileOn className={className} />;
  }
};

export default GenericDocDrop;
