import { useState } from "react";
import StepsComponent from "../../../../../components/misc/StepsComponent";
import Button from "../../../../../components/misc/Button";
import { FaArrowLeft } from "react-icons/fa6";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import {
  useFieldArray,
  useForm,
} from "react-hook-form";
import ReceiptContext from '../ReceiptContext' 
import ProductSelector from "./ProductSelector";
import { toast } from "react-toastify";
import { cleanObj } from "../../../../../utils/helpers";
import OperationCosts from "./OperationCosts";
import DocumentsList from "./Documents";
import Details from "./GeneralDetails";

interface ReceiptWizardInterface {
  addReceipt: Function;
  isFetching: boolean;
  closeModal: Function;
}

const ReceiptWizardContainer = ({
  addReceipt,
  isFetching,
  closeModal,
}: ReceiptWizardInterface) => {
  const { control, getValues } = useForm();
  const {
    fields: fieldsProducts,
    append: appendProduct,
    remove: removeProduct,
    update: updateProduct,
  } = useFieldArray({
    name: "batches",
    control,
  });
  const {
    fields: fieldsOperations,
    append: appendOperation,
    remove: removeOperation,
    update: updateOperation,
  } = useFieldArray({
    name: "operationsCosts",
    control,
  });
  const {
    fields: fieldsDocuments,
    append: appendDocument,
    remove: removeDocument,
    // update: updateDocument,
  } = useFieldArray({
    name: "listDocuments",
    control,
  });

  //Manage steps ---------------------------------
  const titles = [
    "Seleccionar productos",
    "Costos de operaciones",
    "Anexos",
    "Detalles generales",
  ];
  const [current, setCurrent] = useState(0);

  const actionController = () => {
    switch (current) {
      case 0:
        if (fieldsProducts.length === 0) {
          toast.error("Debe añadir al menos un producto");
        } else {
          setCurrent(1);
        }
        break;
      case 3:
        onSubmit();
        break;
      default:
        setCurrent(current + 1);
        break;
    }
  };
  //---------------------------------------------------

  //Form management -----------------------------------

  const onSubmit = () => {
    let data = getValues();
    data.batches = data.batches.map((item: any) =>
      cleanObj(item, ["product", "supplier"])
    );
    data.listDocuments = data.listDocuments.map((doc: any) => doc.id);
    addReceipt(cleanObj(data), closeModal);
  };

  //-------------------------------------------------------

  return (
    <div className="mt-3">
      <StepsComponent titles={titles} current={current} />
      <div className="border border-slate-300 rounded-md p-2 h-[30rem]">
        <ReceiptContext.Provider
          value={{
            control,
            fieldsProducts,
            appendProduct,
            removeProduct,
            updateProduct,
            fieldsOperations,
            appendOperation,
            updateOperation,
            removeOperation,
            fieldsDocuments,
            appendDocument,
            removeDocument,
          }}
        >
          {current === 0 && <ProductSelector />}
          {current === 1 && <OperationCosts />}
          {current === 2 && <DocumentsList />}
          {current === 3 && <Details />}
        </ReceiptContext.Provider>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        {current !== 0 ? (
          <Button
            color="slate-600"
            name="Anterior"
            textColor="slate-600"
            icon={<FaArrowLeft />}
            action={() => setCurrent(current - 1)}
            disabled={isFetching}
            outline
          />
        ) : (
          <span />
        )}
        <Button
          color="slate-600"
          iconAfter={current !== 3 ? <FaArrowRight /> : <FaCheck />}
          name={current !== 3 ? "Siguiente" : "Completar"}
          action={actionController}
          loading={isFetching}
        />
      </div>
    </div>
  );
};

export default ReceiptWizardContainer;
