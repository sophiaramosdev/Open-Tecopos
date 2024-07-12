import { useContext, useState } from "react";
import ReceiptContext from '../ReceiptContext' 
import GenericTable, {
  DataTableInterface,
} from "../../../../../components/misc/GenericTable";
import Modal from "../../../../../components/misc/GenericModal";
import Button from "../../../../../components/misc/Button";
import { FaPlus } from "react-icons/fa";
import IconTypeFile from "../../../../../components/misc/IconTypeFile";
import { FaEye, FaRegTrashCan } from "react-icons/fa6";
import AlertContainer from "../../../../../components/misc/AlertContainer";
import UploadFile from "./UploadFile";

const DocumentsList = () => {
  const { fieldsDocuments, removeDocument } = useContext(ReceiptContext);
  const [documentsForm, setDocumentsForm] = useState(false);
  const [delDoc, setDelDoc] = useState<number | null>(null);

  //Manage Table -----------------------------------------------------
  const tableTitles = ["Nombre", "Descripción", ""];
  const tableData: DataTableInterface[] = [];
  fieldsDocuments!.forEach((item: any, idx: number) => {
    const fileType = item?.title?.split(".").reverse()[0];
    tableData.push({
      rowId: idx,
      payload: {
        Nombre: (
          <div className="inline-flex items-center justify-center gap-2">
            <IconTypeFile fileType={fileType} />
            {item?.title}
          </div>
        ),
        Descripción: item?.description,
        "": (
          <div className="inline-flex gap-2 justify-end w-full">
            <Button
              color="slate-500"
              icon={<FaEye />}
              textColor="slate-500"
              action={() => window.open(item.src)}
              outline
            />
            <Button
              color="red-500"
              icon={<FaRegTrashCan />}
              textColor="red-600"
              action={() => setDelDoc(idx)}
              outline
            />
          </div>
        ),
      },
    });
  });

  //----------------------------------------------------
  return (
    <div className="p-3 h-full overflow-auto scrollbar-none">
      <div className="flex justify-end pb-5">
        <Button
          color="slate-400"
          textColor="slate-500"
          icon={<FaPlus />}
          name="Adjuntar documento"
          action={() => setDocumentsForm(true)}
          outline
        />
      </div>
      <GenericTable tableTitles={tableTitles} tableData={tableData} />
      {documentsForm !== null && (
        <Modal state={documentsForm} close={setDocumentsForm} size="m">
          <UploadFile close={() => setDocumentsForm(false)} />
        </Modal>
      )}
      {delDoc !== null && (
        <Modal state={delDoc !== null} close={() => setDelDoc(null)}>
          <AlertContainer
            onAction={() => {
              removeDocument!(delDoc);
              setDelDoc(null);
            }}
            onCancel={() => setDelDoc(null)}
            title="Eliminar documento"
            text="¿Seguro que desea continuar?"
          />
        </Modal>
      )}
    </div>
  );
};

export default DocumentsList;
