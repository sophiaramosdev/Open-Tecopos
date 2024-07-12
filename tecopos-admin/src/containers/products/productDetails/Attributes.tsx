import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import useServerProduct from "../../../api/useServerProducts";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { useAppSelector } from "../../../store/hooks";
import { DetailProductContext } from "../DetailProductContainer";
import { toast } from "react-toastify";
import {
  CheckIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import Modal from "../../../components/modals/GenericModal";
import { ProductAttributesInterface } from "../../../interfaces/ServerInterfaces";
import Button from "../../../components/misc/Button";
import Input from "../../../components/forms/Input";
import AlertContainer from "../../../components/misc/AlertContainer";
import EmptyList from "../../../components/misc/EmptyList";
import { ProductContext } from "../newProductModal/NewWizardContainer";

//Main Component +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const Attributes = () => {
  const { product_attributes } = useAppSelector((state) => state.nomenclator);
  const {
    getProductAttributes,
    addProductAttribute,
    editAttributeProduct,
    deleteAttributeProduct,
    productAttributes,
    isLoading,
    isFetching,
  } = useServerProduct();
  const { product } = useContext(DetailProductContext);
  const crud = {
    addProductAttribute,
    editAttributeProduct,
    deleteAttributeProduct,
    isFetching,
  };

  const [currentAttrId, setCurrentAttrId] = useState<number | null>(null);

  useEffect(() => {
    getProductAttributes(product?.id!);
  }, []);

  const currentAttr: ProductAttributesInterface | null = useMemo(() => {
    if (currentAttrId) {
      const elemInAllAttr = product_attributes.find(
        (itm) => itm.id === currentAttrId
      )!;
      const current = productAttributes.find(
        (itm) => itm.code === elemInAllAttr?.code
      );
      if (current) {
        return {
          attributeId: currentAttrId,
          code: current.code,
          name: current.name,
          values: current.values,
        };
      } else {
        if (productAttributes.length >= 3) {
          toast.error("No puede configurar más de tres atributos");
          return null;
        }
        return {
          attributeId: currentAttrId,
          code: elemInAllAttr?.code,
          name: elemInAllAttr?.name,
          values: [],
        };
      }
    } else {
      return null;
    }
  }, [currentAttrId, productAttributes]);

  //Function to manage onClick in row table ----------------------------------
  const rowAction = (id: number) => {
    setCurrentAttrId(id);
  };
  //---------------------------------------------------------------------------

  //Table data ------------------------------------------------------------
  const tableTitles = ["Nombre", "Valores"];
  const tableData: DataTableInterface[] = product_attributes
    .filter((elem) =>
      product?.variations.length !== 0
        ? !!productAttributes.find((val) => val.code === elem.code)
        : true
    )
    .map((elem) => ({
      rowId: elem.id,
      payload: {
        Nombre: (
          <div className="inline-flex gap-1 items-center">
            {!!productAttributes.find((val) => val.code === elem.code) ? (
              <CheckIcon className="h-4" />
            ) : (
              <div className="w-4"></div>
            )}
            {elem.name}
          </div>
        ),
        Valores:
          productAttributes
            .find((attr) => attr.code === elem.code)
            ?.values.map((val) => val.value)
            .join(", ") ?? "",
      },
    }));

  //---------------------------------------------------------------------------
  return (
    <div className="border border-slate-300 rounded-md p-5 h-[500px] overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        loading={isLoading}
        rowAction={rowAction}
      />

      {!!currentAttr && (
        <Modal state={!!currentAttr} close={() => setCurrentAttrId(null)}>
          <AttributesForm attr={currentAttr} crud={crud} close={() => setCurrentAttrId(null)} />
        </Modal>
      )}
    </div>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//Attr CRUD Component ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface AttrForm {
  attr: ProductAttributesInterface | null;
  crud: {
    addProductAttribute: Function;
    editAttributeProduct: Function;
    deleteAttributeProduct: Function;
    isFetching: boolean;
  };
  close:Function;
}

const AttributesForm = ({ attr, crud, close }: AttrForm) => {
  const { control, handleSubmit, formState } = useForm();
  const { fields, append, remove } = useFieldArray({ control, name: "values" });
  const { product } = useContext(DetailProductContext);
  const {
    addProductAttribute,
    editAttributeProduct,
    deleteAttributeProduct,
    isFetching,
  } = crud;

  const dirty = formState.isDirty && fields.length !== 0;

  const { updateAttributeState } = useContext(DetailProductContext);

  const [formView, setformView] = useState(false);
  const [editInput, setEditInput] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [deleteAttr, setDeleteAttr] = useState<{
    id: number;
    value: string;
  } | null>(null);

  const addSubmit: SubmitHandler<Record<string, string>> = (data) => {
    addProductAttribute(
      product?.id!,
      { attributeId: attr?.attributeId, ...data },
      () => {
        remove();
        setformView(false);
      },
      updateAttributeState!
    );
  };

  //Form view--------------------------------
  if (formView) {
    return (
      <form onSubmit={handleSubmit(addSubmit)}>
        <h5 className="font-semibold text-lg text-gray-500">{`Nuevos valores para ${attr?.name}`}</h5>
        <div className="h-80 overflow-auto scrollbar-thin py-3">
          {fields.map((item, idx) => (
            <div
              className="inline-flex gap-2 w-full items-center"
              key={item.id}
            >
              <Input
                name={`values.${idx}`}
                control={control}
                rules={{ required: "Indique un valor o elimine el campo" }}
              />

              <div className="mt-1">
                <Button
                  color="red-300"
                  textColor="red-500"
                  icon={<TrashIcon className="h-5" />}
                  action={() => remove(idx)}
                  outline
                />
              </div>
            </div>
          ))}
          <div className="pt-4">
            <Button
              color="gray-300"
              textColor="gray-500"
              icon={<PlusIcon className="h-5" />}
              action={() => append("")}
              outline
              full
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            name={`${dirty ? "Insertar" : "Atrás"}`}
            color="slate-600"
            type={`${dirty ? "submit" : "button"}`}
            action={
              !dirty
                ? () => {
                    remove();
                    setformView(false);
                  }
                : undefined
            }
            loading={isFetching}
            disabled={isFetching}
          />
        </div>
      </form>
    );
    //--------------------------------------------
  } else {
    //List view -----------------------------------
    return (
      <div className="h-96">
        <h5 className="font-semibold text-lg text-gray-500">{`Opciones para ${attr?.name}`}</h5>
        <div className="flex justify-end items-center">
          <Button
            color="gray-300"
            textColor="gray-500"
            icon={<PlusIcon className="h-5" />}
            action={() => setformView(true)}
            outline
          />
        </div>
        <div className="h-72 overflow-auto scrollbar-thin py-2">
          <div className="grid grid-cols-3 gap-2 py-5 ">
            {attr?.values.length === 0 ? (
              <div className="flex col-span-3 h-full justify-center items-center">
                <EmptyList
                  title={`"${attr.name}" no tiene valores configurados`}
                  subTitle="Comience añadiendo uno o varios"
                />
              </div>
            ) : (
              attr?.values.map((itm, idx) => (
                <span
                  key={idx}
                  className="py-1 px-2 bg-gray-100 rounded-full text-center relative border border-gray-200 shadow"
                >
                  <p
                    className="hover:cursor-pointer hover:underline"
                    onClick={() => setEditInput(itm)}
                  >
                    {itm.value}
                  </p>
                  <XMarkIcon
                    className="h-4 absolute right-2 top-2 hover:cursor-pointer"
                    onClick={() => setDeleteAttr(itm)}
                  />
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button color="slate-600" name="Aceptar" action={close}/>
        </div>

        {!!editInput && (
          <Modal state={!!editInput} close={() => setEditInput(null)}>
            <EditModal
              close={() => setEditInput(null)}
              item={editInput}
              edit={editAttributeProduct}
              fetching={isFetching}
            />
          </Modal>
        )}

        {!!deleteAttr && (
          <Modal state={!!deleteAttr} close={() => setDeleteAttr(null)}>
            <AlertContainer
              onCancel={() => setDeleteAttr(null)}
              onAction={() => {
                deleteAttributeProduct(
                  deleteAttr.id,
                  {
                    attributeId: attr?.attributeId,
                  },
                  () => setDeleteAttr(null),
                  updateAttributeState
                );
              }}
              title={`Eliminando ${deleteAttr.value}`}
              text="Seguro que desea continuar?"
              loading={isFetching}
            />
          </Modal>
        )}
      </div>
    );
    //-----------------------------------------------
  }
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//Edit Modal +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface EditAttr {
  item: {
    id: number;
    value: string;
  };
  edit: Function;
  close: Function;
  fetching: boolean;
}

const EditModal = ({ item, edit, close, fetching }: EditAttr) => {
  const { handleSubmit, control, formState } = useForm();
  const { updateAttributeState } = useContext(DetailProductContext);
  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    edit(item.id, data, close, updateAttributeState);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input name="value" control={control} defaultValue={item.value} />
      <div className="flex justify-end py-5">
        <Button
          name={formState.isDirty ? "Actualizar" : "Aceptar"}
          color="slate-600"
          type="submit"
          loading={fetching}
          disabled={fetching}
        />
      </div>
    </form>
  );
};

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default Attributes;
