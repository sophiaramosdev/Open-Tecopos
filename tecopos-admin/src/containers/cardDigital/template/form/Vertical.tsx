import {
  GlobeAltIcon,
  PhoneArrowDownLeftIcon,
} from "@heroicons/react/24/solid";
import { useContext, useEffect, useMemo } from "react";
import { NewTvContext } from "../../NewTv";
import ImageComponent from "../../../../components/misc/Images/Image";
//@ts-ignore
import img2 from "../../../../../assets/template.jpg";
import { ProductInterface } from "../../../../interfaces/ServerInterfaces";
import { formatCurrency } from "../../../../utils/helpers";
import { SetFieldValue, WatchObserver } from "react-hook-form";
interface Props {
  img?: string | null;
  product?: ProductInterface | null;
  prices: Array<{
    id: number;
    amount: number;
    codeCurrency: string;
    onSale: boolean;
    priceRef?: number;
  }>;
  from: {
    watch: any;
    setValue: any;
  };
  position: Position;
}
interface Position {
  top: number;
  left: number;
}

export const Vertical = ({ img, product, prices, from, position }: Props) => {
  const { watch, setValue } = from;

  const price = watch!("price");
  const { currentPrice, priceBeforeOnSale } = useMemo(() => {
    const currentPrice = product?.prices.find((item) => item.priceSystemId === price);
    // const priceBeforeOnSale = product?.prices.find(
    //   (item) => item.id === currentPrice?.priceRef
    // );
    const priceBeforeOnSale = undefined;
    setValue("currentPrice", currentPrice);
    setValue("priceBeforeOnSale", priceBeforeOnSale);
    return { currentPrice, priceBeforeOnSale };
  }, [price]);

  //Colors
  const color_text_1 = watch!("color_text_1") ?? "#000";
  const color_text_2 = watch!("color_text_2") ?? "#000";
  const color_text_3 = watch!("color_text_3") ?? "#000";
  const color_product = watch!("color_product") ?? "#000";
  const applyColorFixed = watch!("applyColorFixed");
  const color_fixed = watch!("color_fixed") as string;
  const color_price = watch!("color_price") ?? "#000";

  //Texts
  const text_1 = watch("text_1") ?? "Texto 1";
  const text_2 = watch("text_2") ?? "Texto 2";
  const text_3 = watch("text_3") ?? "Texto 3";

  //Size
  const size_text_1 = watch("size_text_1") ?? "6xl";
  const size_text_product = watch("size_text_product") ?? "4xl";
  const size_text_2 = watch("size_text_2") ?? "xl";
  const size_text_3 = watch("size_text_3") ?? "xl";

  //views
  const show_text_product = watch("show_text_product") ?? true;
  const show_price_product = watch("show_price_product") ?? true;
  return (
    <>
      <section
        className="relative  border min-h-screen  object-contain rounded-md"
        style={{
          backgroundImage: applyColorFixed ? "" : `url(${img})`,
          backgroundColor: applyColorFixed ? color_fixed : "",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <section className="h-full overflow-hidden  relative z-20  p-5">
          <section className="flex flex-col justify-between h-full w-full min-h-screen">
            <div className="">
              <header className=" flex flex-col justify-center items-center gap-y-3 my-6">
                <h3
                  className={`font-bold ${size_text_1} animate-fade-down animate-once`}
                  style={{ color: color_text_1 as string }}
                >
                  {text_1}
                </h3>
              </header>

              <article
                style={{
                  //top: `${position.top}%`,
                  // left: `${position.left}%`,
                  transform: `translateY(${position?.top}%) translateX(${position?.left}%)`,
                  position: "absolute",
                  zIndex: 50,
                }}
                className="flex  flex-col justify-center items-center w-full "
              >
                {show_text_product && (
                  <h3
                    className={`font-bold text-center ${size_text_product}`}
                    style={{ color: color_product as string }}
                  >
                    {product?.name}
                  </h3>
                )}
                <section
                  className={`flex justify-center items-center  flex-col gap-y-2 relative  min-h-[10rem] min-w-[10rem]`}
                >
                  <picture
                  // style={{ top: `${position.top}%`, left: `${position.left}%`, position:"relative" }}
                  // style={{
                  //   //top: `${position.top}%`,
                  //   // left: `${position.left}%`,
                  //   transform: `translateY(${position?.top}%) translateX(${position?.left}%)`,
                  //   position: "absolute",
                  //   zIndex: 50,
                  // }}
                  >
                    <ImageComponent
                      className={` min-h-[10rem] min-w-[10rem] h-40 w-40  z-10 cursor-pointer ${
                        applyColorFixed ? `bg-[${color_fixed}]` : ""
                      }  bg-transparent`}
                      src={product?.images[0]?.src as string}
                    />
                  </picture>
                </section>

                {show_price_product && (
                  <section className="flex flex-col items-center justify-center mt-10">
                    {/* {currentPrice?.onSale && (
                  <h5
                    className="font-semibold line-through text-xl "
                    style={{ color: color_price }}
                  >
                    {formatCurrency(
                      priceBeforeOnSale?.price ?? 0,
                      priceBeforeOnSale?.codeCurrency
                    )}
                  </h5>
                )} */}
                    <h4
                      className="font-semibold text-3xl "
                      style={{ color: color_price }}
                    >
                      {formatCurrency(
                        currentPrice?.price ?? 0,
                        currentPrice?.codeCurrency
                      )}
                    </h4>
                  </section>
                )}
              </article>
            </div>

            <footer className="flex gap-x-10 justify-between ">
              {text_2 && (
                <article className="flex gap-x-4 justify-center items-center">
                  <div className="bg-orange-500 rounded-full w-8 h-8 flex justify-center items-center">
                    <PhoneArrowDownLeftIcon className="text-white w-5 " />
                  </div>
                  <span
                    className={`text-black ${size_text_2} `}
                    style={{ color: color_text_2 }}
                  >
                    {text_2}
                  </span>
                </article>
              )}

              {text_3 && (
                <article className="flex gap-x-4 justify-center items-center">
                  <div className="bg-orange-500 rounded-full w-8 h-8 flex justify-center items-center">
                    <GlobeAltIcon className="text-white w-5 " />
                  </div>
                  <span
                    className={`text-black ${size_text_3} `}
                    style={{ color: color_text_3 }}
                  >
                    {text_3}
                  </span>
                </article>
              )}
            </footer>
          </section>
        </section>
      </section>
    </>
  );
};
