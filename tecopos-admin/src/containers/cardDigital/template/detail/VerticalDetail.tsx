import {
  GlobeAltIcon,
  PhoneArrowDownLeftIcon,
} from "@heroicons/react/24/solid";
import ImageComponent from "../../../../components/misc/Images/Image";
import { formatCurrency } from "../../../../utils/helpers";
import { Page } from "../../../../interfaces/Interfaces";

export const VerticalDetail = ({ page }: { page: Page }) => {
  let parsedStructure;

  try {
    parsedStructure = JSON.parse(page.meta);
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }

  const {
    imgProduct,
    //Colors
    color_product,
    applyColorFixed,
    color_fixed,
    bg,
    color_price,
    currentPrice,
    priceBeforeOnSale,
    onSale,
    color_text_1,
    color_text_2,
    color_text_3,
    //texts
    text_1,
    text_3,
    text_2,
  } = parsedStructure;
  return (
    <>
      <section
        className="relative h-full w-full border min-h-screen  object-contain rounded-md"
        style={{
          backgroundImage: applyColorFixed ? "" : `url(${bg})`,
          backgroundColor: applyColorFixed ? color_fixed : "",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <section className="h-full overflow-hidden  relative z-20  p-5">
          <section className="flex flex-col justify-between h-full w-full">
            <div className="">
              <header className=" flex flex-col justify-center items-center gap-y-3 my-6">
                <h3
                  className={`font-bold  text-5xl animate-fade-down animate-once`}
                  style={{ color: color_text_1 as string }}
                >
                  {text_1 as string}
                </h3>
              </header>

              <section
                className="flex justify-center items-center flex flex-col gap-y-2"
                style={{ color: color_product?.value as string }}
              >
                <h3 className="font-bold text-center text-2xl">
                  {"Producto" as string}
                </h3>
                <ImageComponent
                  className="h-40 w-40 border border-gray-400 rounded-full bg-gray-100 z-10 cursor-pointer overflow-hidden"
                  src={imgProduct as string}
                />
              </section>

              <section className="flex flex-col items-center justify-center mt-10">
                {onSale && (
                  <h5 className="font-semibold line-through text-xl ">
                    {formatCurrency(
                      //@ts-ignore
                      priceBeforeOnSale?.amount ?? 0,
                      //@ts-ignore
                      priceBeforeOnSale?.codeCurrency
                    )}
                  </h5>
                )}
                <h4
                  className="font-semibold text-3xl "
                  style={{ color: color_price }}
                >
                  {formatCurrency(
                    //@ts-ignore
                    currentPrice?.amount ?? 0,
                    //@ts-ignore
                    currentPrice?.codeCurrency
                  )}
                </h4>
              </section>
            </div>

            <footer className="flex gap-x-10 justify-between ">
              {text_2 && (
                <article className="flex gap-x-4 justify-center items-center">
                  <div className="bg-orange-500 rounded-full w-8 h-8 flex justify-center items-center">
                    <PhoneArrowDownLeftIcon className="text-white w-5 " />
                  </div>
                  <span className="text-black" style={{ color: color_text_2 }}>
                    {text_2}
                  </span>
                </article>
              )}

              {text_3 && (
                <article className="flex gap-x-4 justify-center items-center">
                  <div className="bg-orange-500 rounded-full w-8 h-8 flex justify-center items-center">
                    <GlobeAltIcon className="text-white w-5 " />
                  </div>
                  <span className="text-black" style={{ color: color_text_3 }}>
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
