import { useContext, useState, useEffect, useMemo } from "react";
import { DetailProductContext } from "../DetailProductContainer";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { formatCurrency } from "../../../utils/helpers";
import ImageComponent from "../../../components/misc/Images/Image";
import { ServerVariationInterface } from "../../../interfaces/ServerInterfaces";
import Modal from "../../../components/modals/GenericModal";
import Button from "../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import useServerProduct from "../../../api/useServerProducts";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import InlineRadio from "../../../components/forms/InlineRadio";
import { toast } from "react-toastify";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import { useAppSelector } from "../../../store/hooks";
import TextArea from "../../../components/forms/TextArea";
import AlertContainer from "../../../components/misc/AlertContainer";
import Toggle from "../../../components/forms/Toggle";

//MAIN COMPONENT ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const Variations = () => {
  const { product } = useContext(DetailProductContext);
  const [detailModalData, setDetailModalData] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);

  //Table data -------------------------------------------------------------------------------
  const tableTitles = ["Variación", "Precio", "Descripción"];
  const tableData: DataTableInterface[] =
    product?.variations.map((item) => ({
      rowId: item.id,
      payload: {
        Variación: (
          <div className="inline-flex gap-2 items-center">
            <ImageComponent
              hash={item.image?.blurHash}
              src={item.image?.src}
              className="h-8 w-8 rounded-full overflow-hidden"
            />
            <p>{item.name}</p>
          </div>
        ),
        Precio: item?.price
          ? formatCurrency(item.price.amount, item.price.codeCurrency)
          : "-",
        Descripción: item?.description ?? "-",
      },
    })) ?? [];

  const currentVariation: ServerVariationInterface | null = useMemo(() => {
    const current = product?.variations.find(
      (itm) => itm.id === detailModalData
    );
    if (current) {
      return current;
    } else {
      return null;
    }
  }, [product?.variations, detailModalData]);

  const rowAction = (id: number) => {
    setDetailModalData(id);
  };

  const actions: BtnActions[] = [
    {
      title: "Nueva variación",
      action: () => setAddModal(true),
      icon: <PlusIcon className="h-5" />,
    },
  ];

  //-------------------------------------------------------------------------------------------------

  return (
    <div className="border border-slate-300 rounded-md p-5 h-[500px] overflow-scroll scrollbar-thin scrollbar-thumb-slate-200 pr-2">
      <GenericTable
        tableTitles={tableTitles}
        tableData={tableData}
        rowAction={rowAction}
        actions={actions}
      />
      {!!currentVariation && (
        <Modal
          state={!!detailModalData}
          close={() => setDetailModalData(null)}
          size="m"
        >
          <VariationDetail
            variation={currentVariation}
            close={() => setDetailModalData(null)}
          />
        </Modal>
      )}
      {addModal && (
        <Modal state={addModal} close={setAddModal} size="m">
          <AddVariation close={() => setAddModal(false)} />
        </Modal>
      )}
    </div>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//DETAILS COMPONENT ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface DetailVariation {
  variation: ServerVariationInterface;
  close: Function;
}

const VariationDetail = ({ variation, close }: DetailVariation) => {
  const { handleSubmit, control, formState, watch, unregister } = useForm();
  const { updateVariation, isFetching } = useServerProduct();
  const { deleteVariationProduct, isFetching: fetchingDelete } =
    useServerProduct();
  const { business } = useAppSelector((state) => state.init);
  const { product, updateVariationState, updateStockProductState } =
    useContext(DetailProductContext);
  const [imageModal, setImageModal] = useState(false);

  const currenciesSelector =
    business?.availableCurrencies.map((itm) => itm.code) ?? [];

  const [deleteAlert, setDeleteAlert] = useState(false);

  const addCallback = (variation: ServerVariationInterface) => {
    updateVariationState!(variation);
    close();
  };

  const enablePrice = watch("enablePrice");

  useEffect(() => {
    if (!enablePrice) unregister("price");
  }, [enablePrice]);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    formState.isDirty
      ? updateVariation(variation.id, data, addCallback)
      : close();
  };

  const deleteCallback = () => {
    updateVariationState && updateVariationState(variation, true);
    updateStockProductState &&
      updateStockProductState({
        ...product!,
        variation: product!.variations.filter((itm) => itm.id !== variation.id),
      });
    close();
  };

  return (
    <div className="">
      <div className="absolute top-5">
        <Button
          color="red-500"
          textColor="red-500"
          action={() => setDeleteAlert(true)}
          outline
          icon={<TrashIcon className="h-5" />}
        />
      </div>
      <h5 className="text-lg mt-5">{variation.name}</h5>
      <div className="h-full grid grid-cols-10 gap-2 pt-2">
        <div className=" relative border col-span-4 border-gray-300 rounded-md p-1 group h-full">
          <ImageComponent
            className="h-full w-full"
            hash={variation?.image?.blurHash}
            src={variation?.image?.src}
          />
          <div className="hidden group-hover:flex items-center justify-center absolute bg-gray-500 h-full w-full top-0 left-0 opacity-60">
            <p
              className="text-white hover:text-lg cursor-pointer font-normal underline"
              onClick={() => setImageModal(true)}
            >
              Cambiar imagen
            </p>
          </div>
        </div>
        <div className="col-span-6 border border-gray-300 rounded-md p-3">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <Toggle
              name="enablePrice"
              control={control}
              title="Habilitar precio"
              defaultValue={!!variation.price}
            />
            <div className="flex flex-col h-full">
              {(watch("enablePrice") ?? !!variation.price) && (
                <CurrencyAmountInput
                  currencies={currenciesSelector}
                  label="Precio"
                  name="price"
                  control={control}
                  defaultValue={variation.price}
                />
              )}
              <TextArea
                label="Descripción"
                name="description"
                control={control}
                defaultValue={variation.description}
              />
            </div>
            <div className="flex p-3 justify-end">
              <Button
                color="slate-600"
                name={formState.isDirty ? "Actualizar" : "Aceptar"}
                type="submit"
                loading={isFetching}
              />
            </div>
          </form>
        </div>
      </div>
      {imageModal && (
        <Modal state={imageModal} close={setImageModal} size="m">
          <ChangeImage
            variation={variation}
            close={() => setImageModal(false)}
          />
        </Modal>
      )}

      {deleteAlert && (
        <Modal state={deleteAlert} close={setDeleteAlert}>
          <AlertContainer
            onAction={() =>
              deleteVariationProduct(variation.id, deleteCallback)
            }
            onCancel={() => setDeleteAlert(false)}
            title={`Eliminar variación "${product
              ?.attributes!.map((itm) => itm.value)
              .join(", ")}"`}
            text="Seguro desea continuar?"
            loading={fetchingDelete}
          />
        </Modal>
      )}
    </div>
  );
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//CHANGE IMAGE++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface Image {
  variation: ServerVariationInterface;
  close: Function;
}
const ChangeImage = ({ variation, close }: Image) => {
  const { product, updateVariationState, updateStockProductState } =
    useContext(DetailProductContext);
  const { updateVariation, isFetching } = useServerProduct();
  const availablesImages = product?.images;
  const { handleSubmit, setValue, watch } = useForm();

  const updateCallback = (variation: ServerVariationInterface) => {
    const newVariations = product!.variations.filter(
      (itm) => itm.id !== variation.id
    );
    updateStockProductState &&
      updateStockProductState({
        ...product!,
        variations: [...newVariations, variation],
      });
    updateVariationState!(variation);
    close();
  };

  useEffect(() => {
    if (!!variation?.image) setValue("imageId", variation.image.id);
  }, [variation?.image]);

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    updateVariation(variation.id, data, updateCallback);
  };

  const imageId = watch("imageId");

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="inline-flex w-full justify-between items-center py-3">
          <h5 className="text-gray-600 text-lg">
            Seleccione la imagen deseada
          </h5>
          {imageId && (
            <Button
              color="red-500"
              textColor="red-500"
              outline
              name="Eliminar selección"
              icon={<TrashIcon className="h-5 text-red-500" />}
              action={() => setValue("imageId", null)}
            />
          )}
        </div>

        <div className="absolute right-10 top-5"></div>
        <div className="flex flex-wrap gap-3 justify-center pt-3">
          {availablesImages?.map((item, idx) => (
            <div key={idx} className="relative w-40 h-40">
              <input
                className="h-full w-full bg-transparent border-none checked:bg-none checked:text-transparent checked:ring-2 active:ring-2 active:ring-slate-500 checked:ring-slate-500 rounded-sm"
                type="radio"
                value={item.id}
                onChange={(e) => setValue("imageId", item.id)}
                checked={imageId === item.id}
              />
              <ImageComponent
                hash={item?.blurHash}
                src={item?.src}
                className="absolute -z-10 top-0 left-0 h-full w-full"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end py-5">
          <Button
            name="Actualizar"
            color="slate-600"
            type="submit"
            loading={isFetching}
          />
        </div>
      </form>
    </div>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//ADD COMPONENT++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface AddInterface {
  close: Function;
}

const AddVariation = ({ close }: AddInterface) => {
  const {
    getProductAttributes,
    addVariation,
    productAttributes,
    isLoading,
    isFetching,
  } = useServerProduct();
  const { product, updateVariationState, updateStockProductState } =
    useContext(DetailProductContext);
  const { handleSubmit, control } = useForm();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    if (Object.values(data).some((item) => !item)) {
      toast.warn("Debe asignarle un valor a todos los atributos");
    } else {
      addVariation &&
        addVariation(
          product!.id,
          data,
          close,
          updateVariationState!,
          updateStockProductState
        );
    }
  };

  useEffect(() => {
    getProductAttributes(product?.id!);
  }, []);

  if (isLoading)
    return (
      <SpinnerLoading className="h-48 flex flex-col items-center justify-center" />
    );

  return (
    <div>
      <h5 className="text-lg font-semibold text-gray-500">Nueva variación</h5>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={`grid grid-cols-2 gap-3 pt-3`}>
          {productAttributes.map((item) => (
            <div
              key={item.code}
              className="flex flex-col gap-y-2 items-center border border-gray-300 rounded-md p-5"
            >
              <h5 className="text-md font-semibold text-gray-500">
                {item.name}
              </h5>
              <div className="flex">
                <InlineRadio
                  data={item.values.map((val) => ({
                    label: val.value,
                    value: val.value,
                  }))}
                  name={item.code}
                  control={control}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex pt-3 justify-end">
          <Button
            type="submit"
            color="slate-600"
            name="Insertar"
            loading={isFetching}
          />
        </div>
      </form>
    </div>
  );
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export default Variations;
