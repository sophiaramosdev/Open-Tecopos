import {
    BsFiletypeDoc,
    BsFiletypeDocx,
    BsFiletypePdf,
    BsFiletypePpt,
    BsFiletypePptx,
    BsFiletypeXls,
    BsFiletypeXlsx,
  } from "react-icons/bs";
  import { IoDocumentLockOutline } from "react-icons/io5";

export default function IconTypeFile({ fileType }: { fileType?: string }){
    switch (fileType) {
      case "pdf":
        return <BsFiletypePdf className="text-2xl text-gray-500" />;
      case "doc":
        return <BsFiletypeDoc className="text-2xl text-gray-500" />;
      case "docx":
        return <BsFiletypeDocx className="text-2xl text-gray-500" />;
      case "ppt":
        return <BsFiletypePpt className="text-2xl text-gray-500" />;
      case "pptx":
        return <BsFiletypePptx className="text-2xl text-gray-500" />;
      case "xls":
        return <BsFiletypeXls className="text-2xl text-gray-500" />;
      case "xlsx":
        return <BsFiletypeXlsx className="text-2xl text-gray-500" />;
      default:
        return <IoDocumentLockOutline className="text-2xl text-red-600" />;
    }
  };