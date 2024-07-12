import { useContext } from "react";
import ReceiptContext from '../ReceiptContext' 
import { useForm } from "react-hook-form";
import UploadFile from "./UploadFile";

interface DocumentFormProps {
  id: number | null;
  close: Function;
}

const DocumentForm = ({ id, close }: DocumentFormProps) => {
  const { fieldsDocuments, removeDocument, appendDocument } =
    useContext(ReceiptContext);

  const { control } = useForm();

  return (
    <div>
      <UploadFile close={()=>null} />
    </div>
  );
};

export default DocumentForm;
