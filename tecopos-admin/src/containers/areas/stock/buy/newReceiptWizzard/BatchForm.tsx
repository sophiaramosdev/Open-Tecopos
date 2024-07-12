import { useContext, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAppSelector } from "../../../../../store/hooks";
import ReceiptContext from "../ReceiptContext";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import DateInput from "../../../../../components/forms/DateInput";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import { FaPlus } from "react-icons/fa";
import {
  ProductInterface,
  SupplierInterfaces,
} from "../../../../../interfaces/ServerInterfaces";
import ProductTypeBadge from "../../../../../components/misc/badges/ProductTypeBadge";
import Input from "../../../../../components/forms/BasicInput";
import Modal from "../../../../../components/misc/GenericModal";
import AlertContainer from "../../../../../components/misc/AlertContainer";
import { FaArrowRotateRight, FaRegTrashCan, FaTrash } from "react-icons/fa6";
import { PiCodeDuotone } from "react-icons/pi";
import moment from "moment";

interface BatchFormProps {
  product: ProductInterface;
  close: Function;
  idx?: number;
}

const BatchForm = ({ product, close, idx }: BatchFormProps) => {
  const { business } = useAppSelector((state) => state.init);
  const {
    control,
    getValues,
    watch,
    trigger,
    setValue,
    formState: { isDirty },
  } = useForm({
    mode: "onChange",
  });

  const {
    receipt,
    fieldsProducts: fields,
    appendProduct: append,
    removeProduct: remove,
    updateProduct: update,
    updateBatch,
    addBatch,
    deleteBatch,
    isFetching,
  } = useContext(ReceiptContext);

  const [suppliers, setSuppliers] = useState<SupplierInterfaces[]>([]);

  let initialData: any;

  if (idx !== undefined)
    initialData = fields?.find((_: any, index: number) => index === idx);

  const currentSupplier = useMemo(
    () =>
      suppliers.find(
        (item) => item.id === watch("supplierId") ?? initialData?.supplierId
      ) ?? initialData?.supplier,
    [watch("supplierId")]
  );

  const currencies: string[] = business!.availableCurrencies.map(
    (curr) => curr.code
  );
  const [del, setDel] = useState(false);

  const onSubmit = async () => {
    const isValid = await trigger();
    if (isValid) {
      let data = getValues();
      data.supplier = currentSupplier;
      data.productId = product.id;

      if (idx !== undefined) {
        if (!!updateBatch) {
          updateBatch(fields![idx].batchId, data, close);
        } else {
          update!(idx, { ...data, product });
          close();
        }
      } else {
        if (!!addBatch) {
          addBatch(receipt!.id, data, close);
        } else {
          append!({ ...data, product });
          close();
        }
      }
    }
  };

  const generateBatchSequence = () => {
    const formatedDate = moment().format("MMDDHHmm");
    const uniqueCode = `${product.name
      .slice(0, 2)
      .toUpperCase()}_${formatedDate}_${fields!.length + 1}`;
    setValue("uniqueCode", uniqueCode);
  };

  const delAction = () => {
    if (!!deleteBatch) {
      deleteBatch(fields![idx!].batchId, close);
    } else {
      remove!(idx);
      close();
    }
  };

  const inputDisabled = idx !== undefined && !!updateBatch;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 items-center">
        <div className="py-3 space-y-1">
          <ProductTypeBadge type={product?.type} />
          <h5 className="text-gray-500 font-semibold pl-2">{product?.name}</h5>
        </div>

        {idx !== undefined ? (
          <div className="flex justify-end">
            <Button
              color="red-500"
              textColor="red-500"
              action={() => setDel(true)}
              icon={<FaRegTrashCan />}
              outline
            />
          </div>
        ) : (
          <span />
        )}
        <Input
          name="quantity"
          label="Cantidad *"
          control={control}
          type="number"
          rules={{ required: "* Campo requerido" }}
          defaultValue={initialData?.entryQuantity}
        />
        <div className="inline-flex gap-2 items-end">
          <Input
            name="uniqueCode"
            label="Lote *"
            control={control}
            rules={{ required: "* Campo requerido" }}
            defaultValue={initialData?.uniqueCode}
            disabled={inputDisabled}
          />
          <div>
            <Button
              color="slate-500"
              textColor="slate-600"
              action={() => !inputDisabled && generateBatchSequence()}
              icon={<PiCodeDuotone className="text-lg" />}
              outline
            />
          </div>
        </div>

        <DateInput
          name="expirationAt"
          label="Fecha de expiración"
          control={control}
          defaultValue={initialData?.expirationAt}
        />
        <Input
          name="noPackages"
          label="Número de paquetes"
          control={control}
          type="number"
          defaultValue={initialData?.noPackages}
        />
        <CurrencyAmountInput
          name="cost"
          label="Precio de compra unitario"
          control={control}
          currencies={currencies}
          defaultCurrency={business?.costCurrency}
          byDefault={
            initialData?.registeredPrice

          }
        />
        <AsyncComboBox
          name="supplierId"
          label="Proveedor"
          dataQuery={{ url: "/administration/supplier?page=1" }}
          normalizeData={{ id: "id", name: ["name", "email"] }}
          control={control}
          defaultValue={initialData?.supplierId}
          defaultItem={
            initialData?.supplier
              ? { id: initialData.supplier.id, name: initialData.supplier.name }
              : undefined
          }
          callback={(data: SupplierInterfaces[]) => setSuppliers(data)}
          disabled={inputDisabled}
        />
        <div className="col-span-2 -mt-2 space-y-5">
          <TextArea
            name="observations"
            label="Observaciones"
            control={control}
            defaultValue={initialData?.observations}
          />
          <Button
            color="slate-600"
            full
            action={onSubmit}
            name={idx !== undefined ? "Actualizar" : "Añadir"}
            icon={idx !== undefined ? <FaArrowRotateRight /> : <FaPlus />}
            loading={isFetching && isDirty}
          />
        </div>
      </div>

      {del && (
        <Modal state={del} close={setDel}>
          <AlertContainer
            title={`Eliminar lote ${initialData?.uniqueCode}`}
            onCancel={setDel}
            text="¿Seguro que desea continuar?"
            onAction={delAction}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default BatchForm;
