import { useContext, useEffect, useMemo, useState } from "react";
import Button from "../../../components/misc/Button";
import Input from "../../../components/forms/Input";
import { Vertical } from "../template/form/Vertical";
import useServer, { ImageLoad } from "../../../api/useServerMain";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import useServerProduct from "../../../api/useServerProducts";
import Fetching from "../../../components/misc/Fetching";
import Select from "../../../components/forms/Select";
import { SelectInterface } from "../../../interfaces/InterfacesLocal";
import TabNav, { TabsAttr } from "../../../components/navigation/TabNav";
import InputColor from "../../../components/forms/InputColor";
import Toggle from "../../../components/forms/Toggle";
import { mathOperation } from "../../../utils/helpers";
import { UseControllerProps, useController, useForm } from "react-hook-form";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";
import { CartDigitalContext } from "../CartDigital";
import { Page } from "../../../interfaces/Interfaces";
import { ModalAlert } from "../../../components";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";

export default function NewPageTv({ defaultPage }: { defaultPage?: Page }) {
  const { watch, setValue, control, handleSubmit } = useForm();
  const { imgPreview, isFetching, uploadImg } = useServer();
  const {
    newPage,
    isFetching: isFetchingPage,
    selectTv,
    closeModal,
    updatePage,
    deletedPage,
  } = useContext(CartDigitalContext);
  const { getProduct, product, isLoading } = useServerProduct();
  const productId = watch!("productId") as string;
  const [showDeletPage, setShowDeletPage] = useState(false);
  useEffect(() => {
    if (productId) {
      getProduct(productId);
    }
    setValue!("price", null);
  }, [productId]);

  const { priceSelect, priceArray } = useMemo(() => {
    const priceSelect: SelectInterface[] = [];
    const priceArray: Array<{
      id: number;
      amount: number;
      codeCurrency: string;
      onSale: boolean;
      priceRef?: number;
    }> = [];

    if (product) {
      product.prices.forEach((price) => {
        let priceCurrent = price.price;

        if (product.onSale) {
          if (product.onSaleType === "percent") {
            const discount = 1 - product.onSaleDiscountAmount / 100;
            priceCurrent = mathOperation(
              price?.price,
              discount,
              "multiplication",
              2
            );
            priceArray.push({
              id: price.id,
              amount: priceCurrent,
              codeCurrency: price.codeCurrency,
              onSale: product.onSale,
              priceRef: price.id,
            });

            priceSelect.push({
              name: `${priceCurrent}/${price?.codeCurrency} ${
                product.onSale &&
                `- Oferta( ${price.price}/${price.codeCurrency} )`
              } `,
              id: price.priceSystemId,
            });
          }
        } else {
          priceSelect.push({
            name: `${priceCurrent}/${price?.codeCurrency} ${
              product.onSale
                ? `- Oferta( ${price.price}/${price.codeCurrency} )`
                : ""
            } `,
            id: price.priceSystemId,
          });
          priceArray.push({
            id: price.id,
            amount: priceCurrent,
            codeCurrency: price.codeCurrency,
            onSale: product.onSale,
          });
        }
      });

      // if (product?.onSale) {
      //   if (product.onSaleType === "fixed") {
      //     priceSelect.push({
      //       name: `${product?.onSalePrice?.amount}/${product?.onSalePrice?.codeCurrency} - Oferta`,
      //       id: priceSelect.length + 1,
      //     });

      //     priceArray.push({
      //       id: priceSelect?.length + 1,
      //       amount: product?.onSalePrice?.amount,
      //       codeCurrency: product?.onSalePrice?.codeCurrency,
      //       onSale: product?.onSale,
      //     });
      //   }
      // }
    }

    return { priceSelect, priceArray };
  }, [product]);

  const [currentTab, setCurrentTab] = useState("details");
  const tabs: TabsAttr[] = [
    {
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      name: "Colores",
      href: "colors",
      current: currentTab === "colors",
    },
    // {
    //   name: "Animaciones",
    //   href: "animations",
    //   current: currentTab === "animations",
    // },
  ];
  const [bgDefault, setBg] = useState<any>("");
  const applyColorFixed = watch!("applyColorFixed");
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const onSubmit = async (data: any) => {
    const metaDate = {
      //Product
      imgProduct: product?.images[0]?.src,
      //Colors
      color_product: data.color_product,
      applyColorFixed: data.applyColorFixed,
      color_fixed: data.color_fixed,
      color_price: data.color_price,
      bg: imgPreview[0]?.src ?? bgDefault,
      color_text_1: data.color_text_1,
      color_text_2: data.color_text_2,
      color_text_3: data.color_text_3,
      //Prices
      currentPrice: data.currentPrice,
      priceBeforeOnSale: data.priceBeforeOnSale,
      onSale: product?.onSale,
      priceId: data.price,
      //Texts
      text_1: data.text_1,
      text_2: data.text_2,
      text_3: data.text_3,
      //size
      size_text_1: data.size_text_1,
      size_text_2: data.size_text_2,
      size_text_3: data.size_text_3,

      //position
      position,

      //views
      show_text_product: data.show_text_product,
      show_price_product: data.show_price_product,
    };
    const formateDate: any = {
      name: product?.name,
      productId: data.productId,
      meta: JSON.stringify(metaDate),
      templateId: !defaultPage ? 1 : undefined,
    };
    if (defaultPage) {
      updatePage!(formateDate, defaultPage?.id, closeModal!);
    } else {
      newPage!(formateDate, selectTv?.id as number, closeModal!);
    }
  };

  //Edit data
  let parsedPage = {
    //colors
    color_text_1: null,
    color_text_2: null,
    color_text_3: null,
    color_product: null,
    applyColorFixed: null,
    color_fixed: null,
    bg: null,
    priceId: null,

    //text
    text_1: null,
    text_2: null,
    text_3: null,

    //size
    size_text_1: null,
    size_text_2: null,
    size_text_3: null,
    size_text_product: null,

    color_price: null,
    position: { top: 0, left: 0 },
    show_text_product: true,
    show_price_product: true,
  };

  try {
    if (defaultPage) {
      parsedPage = JSON.parse(defaultPage?.meta);
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
  const productDefault = defaultPage?.product;

  const {
    //Colors
    color_text_1,
    color_text_2,
    color_text_3,
    color_product,
    applyColorFixed: applyColorFixedDefault,
    color_fixed,
    bg,

    //size
    size_text_1,
    size_text_2,
    size_text_3,
    size_text_product,

    priceId,
    text_1: text_1_default,
    text_2: text_2_default,
    text_3: text_3_default,
    color_price,

    position: positionDefault,
    show_text_product: show_text_product_default,
    show_price_product,
  } = parsedPage;


  useEffect(() => {
    if (position) {
      //@ts-ignore
      setPosition(positionDefault ?? { top: 0, left: 0 });
    }
  }, []);
  const sizeText: SelectInterface[] = [
    { id: "text-2xl", name: "Pequeño" },
    { id: "text-4xl", name: "Mediano" },
    { id: "text-6xl", name: "Grande" },
  ];

  useEffect(() => {
    setBg(bg);
  }, [bg]);

  return (
    <>
      {isLoading && <Fetching />}
      {/* <TabNav tabs={tabs} action={setCurrentTab} /> */}
      <header className="flex justify-start mb-3 ml-5 ">
        {defaultPage && (
          <article className="flex justify-end mt-5">
            <Button
              name="Eliminar pagina"
              icon={<TrashIcon className="h-5" />}
              color="gray-400"
              textColor="gray-400"
              colorHover="red-400"
              action={() => setShowDeletPage(true)}
              outline
            />
          </article>
        )}
      </header>
      <form onSubmit={handleSubmit(onSubmit)}>
        <section className="w-full px-4  min-h-fit overflow-hidden scrollbar-thin scroll-auto flex flex-col justify-between">
          <div className="mx-auto w-full  grid grid-cols-2 gap-x-5">
            <section className="rounded-md overflow-hidden">
              <Vertical
                img={bg ?? imgPreview[0]?.src}
                product={product}
                prices={priceArray}
                from={{ watch, setValue }}
                position={position}
              />
            </section>

            {/* Detalles */}
            {
              <section
                className={`${currentTab !== "details" ? "hidden" : ""}`}
              >
                <section className="flex gap-y-2 flex-col">
                  {/* Text 1  */}
                  <article className=" grid grid-cols-3 gap-x-3">
                    <Input
                      name="text_1"
                      control={control}
                      label="Texto 1"
                      defaultValue={text_1_default}
                    />

                    <InputColor
                      name="color_text_1"
                      control={control}
                      label="Color texto 1"
                      defaultValue={color_text_1 ?? "#000"}
                    />

                    <Select
                      name="size_text_1"
                      control={control}
                      label="Tamaño texto 1"
                      data={sizeText}
                      defaultValue={size_text_1 ? size_text_1 : sizeText[2].id}
                    />
                  </article>

                  {/* Text 2 */}
                  <article className=" grid grid-cols-3 gap-x-3">
                    <Input
                      name="text_2"
                      control={control}
                      label="Texto 2"
                      defaultValue={text_2_default}
                    />
                    <InputColor
                      name="color_text_2"
                      control={control}
                      label="Color texto 2"
                      defaultValue={color_text_2 ?? "#000"}
                    />
                    <Select
                      name="size_text_2"
                      control={control}
                      label="Tamaño texto 2"
                      data={sizeText}
                      defaultValue={size_text_2}
                    />
                  </article>
                  {/* Text 3 */}
                  <article className=" grid grid-cols-3 gap-x-3">
                    <Input
                      name="text_3"
                      control={control}
                      label="Texto 3"
                      defaultValue={text_3_default}
                    />
                    <InputColor
                      name="color_text_3"
                      control={control}
                      label="Color texto 3"
                      defaultValue={color_text_3 ?? "#000"}
                    />
                    <Select
                      name="size_text_3"
                      control={control}
                      label="Tamaño texto 3"
                      data={sizeText}
                      defaultValue={size_text_3}
                    />
                  </article>

                  {/* Producto y precio */}
                  <div className="grid grid-cols-3 gap-x-3">
                    <AsyncComboBox
                      dataQuery={{
                        url: "/administration/product",
                        defaultParams: { allData: false },
                      }}
                      normalizeData={{
                        id: "id",
                        name: ["name"],
                      }}
                      label="Producto"
                      name={`productId`}
                      control={control}
                      rules={{
                        required: "Este campo es requerido",
                      }}
                      defaultValue={productDefault?.id}
                    />

                    <Select
                      name="price"
                      data={priceSelect}
                      control={control}
                      label="Precio"
                      defaultValue={priceId ?? priceSelect[0]?.id}
                    />

                    <Select
                      name="size_text_product"
                      control={control}
                      label="Tamaño texto producto"
                      data={sizeText}
                      defaultValue={
                        size_text_product ? size_text_product : sizeText[0].id
                      }
                    />
                  </div>

                  {/* Colores producto  */}
                  <article className="flex gap-x-3">
                    <InputColor
                      name="color_product"
                      control={control}
                      label="Color texto producto"
                      defaultValue={color_product ?? "#000"}
                    />
                    <InputColor
                      name="color_price"
                      control={control}
                      label="Color precio"
                      defaultValue={color_price ?? "#000"}
                    />
                  </article>

                  {/* Color fijo de fondo */}
                  <article className="flex gap-x-3 ">
                    <Toggle
                      control={control}
                      name="applyColorFixed"
                      title="Aplicar color fijo al fondo"
                      defaultValue={applyColorFixedDefault}
                    />
                    {applyColorFixed && (
                      //@ts-ignore
                      <InputColor
                        name="color_fixed"
                        control={control}
                        label="Color fijo de fondo"
                        defaultValue={color_fixed}
                      />
                    )}
                  </article>

                  <div className="flex gap-x-5 items-center">
                  <Toggle
                    name="show_text_product"
                    control={control}
                    title="Mostrar nombre del producto"
                    defaultValue={show_text_product_default}
                  />
                  <Toggle
                    name="show_price_product"
                    control={control}
                    title="Mostrar precio del producto"
                    defaultValue={show_price_product}
                  />
                  </div>
                  

                  <Position props={position} set={setPosition} />

                  {/* Fondo */}
                  <article>
                    <h3>Fondo</h3>
                    <ImageUploader
                      imgPreview={imgPreview}
                      isFetching={isFetching}
                      name="bg"
                      uploadImg={uploadImg}
                      control={control}
                      //@ts-ignore
                      defaultImg={bg ?? ""}
                    />
                  </article>
                </section>
              </section>
            }

            {
              <section
                className={`${
                  currentTab !== "colors" ? "hidden" : ""
                } flex flex-col gap-y-3`}
              ></section>
            }
          </div>

          <footer className="grid grid-cols-2 py-2 gap-2 ">
            <div></div>
            {!defaultPage ? (
              <Button name="Agregar" color="slate-600" type="submit" />
            ) : (
              <Button name="Actualizar" color="slate-600" type="submit" />
            )}
          </footer>
        </section>
      </form>

      {showDeletPage && (
        <ModalAlert
          type="warning"
          title={`Eliminar Pagina `}
          text={`¿Esta seguro de querer eliminar esta Pagina?`}
          onAccept={async () =>
            deletedPage!(defaultPage?.id as number, closeModal!)
          }
          onClose={() => setShowDeletPage(false)}
          isLoading={isFetching}
        />
      )}
    </>
  );
}

interface ImageUploaderProps {
  label?: string;
  defaultImg?: { id: number; src: string };
  multiple?: boolean;
  setLoading?: Function;
  isFetching: boolean;
  imgPreview: ImageLoad[];
  uploadImg: Function;
}

const ImageUploader = (props: UseControllerProps & ImageUploaderProps) => {
  const { uploadImg, imgPreview, isFetching } = props;
  const { label, defaultImg, multiple = false, setLoading } = props;
  const { field } = useController(props);

  const fieldValue = multiple
    ? imgPreview[0]?.id
      ? [imgPreview[0]?.id]
      : defaultImg?.id
      ? [defaultImg]
      : field.value && field.value
    : imgPreview[0]?.id ?? defaultImg?.id;

  useEffect(() => {
    field.onChange(fieldValue);
  }, [imgPreview]);

  useEffect(() => {
    setLoading && setLoading(isFetching);
  }, [isFetching]);

  const onDrop = (files: File[]) => {
    const data = new FormData();
    data.append("file", files[0]);
    uploadImg(data);
  };

  const { getRootProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    maxSize: 200000,
    noKeyboard: false,
    multiple: false,
  });
  console.log(defaultImg);
  return (
    <div className="sm:flex sm:flex-col sm:items-start sm:gap-4">
      <label
        htmlFor="cover-photo"
        className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
      >
        {label && label}
      </label>
      <div className="mt-2 sm:mt-0 w-full cursor-pointer" {...getRootProps()}>
        <div className="flex rounded-md border-2 border-dashed border-gray-300 p-2">
          <div className="inline-flex space-y-1 gap-5 items-center">
            {isFetching ? (
              <div className="h-40 w-40">
                <SpinnerLoading />
              </div>
            ) : defaultImg || imgPreview.length !== 0 ? (
              <img
                className="h-40 w-40 object-fill rounded-md"
                src={imgPreview[0]?.src ?? defaultImg ?? ""}
                alt="image"
              />
            ) : (
              <svg
                className="mx-auto h-40 w-40 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            <div className="flex flex-col text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded bg-white font-medium text-indigo-600 py-1   hover:text-indigo-500 "
              >
                <p>Click para cargar archivo</p>
              </label>
              <p className="p-1">o arrastre uno</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 200kB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Position {
  top: number;
  left: number;
}
const Position = ({ props, set }: { props: Position; set: Function }) => {
  const [position, setPosition] = useState<Position>(props);

  const moveImage = (direction: any) => {
    const moveAmount = 4;

    switch (direction) {
      case "up":
        set((prevPos: any) => ({
          ...prevPos,
          top: prevPos?.top - moveAmount,
        }));
        break;
      case "down":
        set((prevPos: any) => ({
          ...prevPos,
          top: prevPos?.top + moveAmount,
        }));
        break;
      case "left":
        set((prevPos: any) => ({
          ...prevPos,
          left: prevPos?.left - moveAmount,
        }));
        break;
      case "right":
        set((prevPos: any) => ({
          ...prevPos,
          left: prevPos?.left + moveAmount,
        }));
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="flex items-center font-bold space-x-2">
        <button
          className="bg-slate-500 text-white px-4 py-2 rounded"
          onClick={() => moveImage("up")}
          type="button"
        >
          ↑
        </button>
        <button
          className="bg-slate-500 text-white px-4 py-2 rounded"
          onClick={() => moveImage("left")}
          type="button"
        >
          ←
        </button>
        <button
          className="bg-slate-500 text-white px-4 py-2 rounded"
          onClick={() => moveImage("right")}
          type="button"
        >
          →
        </button>
        <button
          className="bg-slate-500 text-white px-4 py-2 rounded"
          onClick={() => moveImage("down")}
          type="button"
        >
          ↓
        </button>
      </div>
    </div>
  );
};
