import {
  faChevronLeft,
  faChevronRight,
  faClock,
  faEnvelope,
  faMapMarkerAlt,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import APIServer from "../../api/APIServices";
import { Loading } from "../../components";
import { CardCategory } from "../../components/public/CardCategory";
import { CardProduct } from "../../components/public/CardProduct";
import ModalGallery from "../../components/public/ModalGallery";
import ModalProduct from "../../components/public/ModalProduct";
import ProductForCategory from "../../components/public/ProductForCategory";

export default function MyMenu() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [ofertadProducts, setOfertadProducts] = useState([]);
  const [saleCategorys, setSaleCategorys] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [seletedProduct, setSeletedProduct] = useState(null);
  const [indexGallery, setIndexGallery] = useState(0);
  const [showModalGallery, setShowModalGallery] = useState(false);



  useEffect(() => {
    (async () => {
      Promise.all([
        APIServer.get(`/public/business/${slug}`),
        APIServer.get(`/public/products/business/${slug}?suggested=true`),
        APIServer.get(`/public/products/business/${slug}?onSale=true`),
        APIServer.get(`/public/categories/${slug}`),
      ])
        .then((resp) => {
          setBusiness(resp[0].data);
          setSuggestedProducts(resp[1].data.products);
          setOfertadProducts(resp[2].data.products);
          setSaleCategorys(resp[3].data);
          setIsLoading(false);
        })
        .catch((error) => {
          const message = error.response.data.message;
          if (message) {
          } else {
            toast.error(
              "Ha ocurrido un error mientras se cargaban los detalles del negocio"
            );
          }
          setIsLoading(false);
        });
    })();
  }, []);

  const showProduct = (value) => {
    setSeletedProduct(value);
    setShowModal(true);
  };

  const showGallery = (value) => {
    setIndexGallery(value);
    setShowModalGallery(true);
  };

  const slideLeft = () => {
    let slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft - 500;
  };

  const slideRight = () => {
    let slider = document.getElementById("slider");
    slider.scrollLeft = slider.scrollLeft + 500;
  };

  const slideLeftSuggestedProducts = () => {
    let slider = document.getElementById("sliderSuggested");
    slider.scrollLeft = slider.scrollLeft - 500;
  };

  const slideRightSuggestedProducts = () => {
    let slider = document.getElementById("sliderSuggested");
    slider.scrollLeft = slider.scrollLeft + 500;
  };

  const slideLeftOfertedProducts = () => {
    let slider = document.getElementById("sliderOferted");
    slider.scrollLeft = slider.scrollLeft - 500;
  };

  const slideRightOfertedProducts = () => {
    let slider = document.getElementById("sliderOferted");
    slider.scrollLeft = slider.scrollLeft + 500;
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="bg-white">
      <main>
        {/* Suggested product section */}
        {suggestedProducts.length > 0 && (
          <section
            aria-labelledby="category-heading"
            className="pt-12  sm:pt-16 xl:mx-auto  xl:max-w-full xl:px-8"
          >
            <div className="px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 ">
              <h2
                id="category-heading"
                className="text-2xl font-bold tracking-tight text-slate-900"
              >
                Para tí
              </h2>
            </div>

            <div className="mt-4  ">
              <div className="-my-2">
                <div className="   sm:px-6 ">
                  <div className="relative flex items-center scrollbar-hide">
                    <FontAwesomeIcon
                      icon={faChevronLeft}
                      className="opacity-50 mx-2 cursor-pointer hover:opacity-100 "
                      onClick={slideLeftSuggestedProducts}
                      size={"2x"}
                    />

                    <div
                      id="sliderSuggested"
                      className="w-full  h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide mt-5  space-x-8 px-4 sm:px-6 lg:px-2 "
                    >
                      {suggestedProducts.map((item) => (
                        <CardProduct
                          product={item}
                          onClick={() => showProduct(item)}
                          priceSystemId={1}
                          cardWidth="w-48"
                        />
                      ))}
                    </div>

                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="opacity-50 mx-2 cursor-pointer hover:opacity-100"
                      onClick={slideRightSuggestedProducts}
                      size={"2x"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Oferted product section */}
        {ofertadProducts.length > 0 && (
          <section
            aria-labelledby="category-heading"
            className="pt-12 pb-20  sm:pt-16  xl:mx-auto xl:max-w-full xl:px-8"
          >
            <div className="px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 ">
              <h2
                id="category-heading"
                className="text-2xl font-bold tracking-tight text-slate-900"
              >
                Ofertas
              </h2>
            </div>

            <div className="mt-4  ">
              <div className="-my-2">
                <div className="   sm:px-6 ">
                  <div className="relative flex items-center scrollbar-hide">
                    <FontAwesomeIcon
                      icon={faChevronLeft}
                      className="opacity-50 mx-2 cursor-pointer hover:opacity-100 "
                      onClick={slideLeftOfertedProducts}
                      size={"2x"}
                    />

                    <div
                      id="sliderOferted"
                      className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide mt-5  space-x-8 px-4 sm:px-6 lg:px-2 "
                    >
                      {ofertadProducts.map((item) => (
                        <>
                          <CardProduct
                            product={item}
                            onClick={() => showProduct(item)}
                            priceSystemId={1}
                            cardWidth="w-48"
                          />
                        </>
                      ))}
                    </div>

                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="opacity-50 mx-2 cursor-pointer hover:opacity-100"
                      onClick={slideRightOfertedProducts}
                      size={"2x"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {saleCategorys.length > 0 && (
          <div className="sticky top-0 z-20 bg-white pb-5 ">
            <div className="sticky top-0  flex items-center scrollbar-hide">
              <FontAwesomeIcon
                icon={faChevronLeft}
                className="opacity-50 mx-2  cursor-pointer hover:opacity-100 "
                onClick={slideLeft}
                size={"2x"}
              />

              <div
                id="slider"
                className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide mt-5  space-x-8 px-4 sm:px-6 lg:px-2 "
              >
                {saleCategorys.map((item) => (
                  <CardCategory category={item} onClick={() => {}} />
                ))}
              </div>

              <FontAwesomeIcon
                icon={faChevronRight}
                className="opacity-50 mx-2 cursor-pointer hover:opacity-100"
                onClick={slideRight}
                size={"2x"}
              />
            </div>
          </div>
        )}

        <div className=" mx-auto max-w-2xl py-4 px-4 sm:py-6 sm:px-6 lg:max-w-7xl lg:px-8  ">
          {saleCategorys.map((item) => (
            <ProductForCategory category={item} slug={slug} />
          ))}
        </div>

        {/* Category section */}
        {/* <section
      aria-labelledby="category-heading"
      className="pb-16 mt-10 py-5   xl:mx-auto xl:max-w-full  xl:px-8"
    >
      <div className="px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 ">
        <h2

          className="text-2xl   font-bold tracking-tight text-slate-900"
        >
          Categorías
        </h2>

      </div>



      <div className=" mt-4 sticky top-0  ">
        <div className="-my-2 ">
          <div className="   sm:px-6 ">
            <div className="  flex items-center scrollbar-hide">

              <FontAwesomeIcon
                icon={faChevronLeft}
                className="opacity-50 mx-2  cursor-pointer hover:opacity-100 "
                onClick={slideLeft}
                size={"2x"} />

              <div
                id="slider"
                className="w-full h-full overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide mt-5  space-x-8 px-4 sm:px-6 lg:px-2 "
              >
                {saleCategorys.map((item) => (

                 <CardCategory
                  category={item}
                  onClick = {() => {}}
                  />

                ))}
              </div>

              <FontAwesomeIcon icon={faChevronRight}  className="opacity-50 mx-2 cursor-pointer hover:opacity-100"
                onClick={slideRight}
                size={"2x"} />
            </div>
          </div>
        </div>
      </div>
    </section> */}
      </main>

      {showModalGallery && (
        <ModalGallery
          images={business?.images}
          onClick={() => setShowModalGallery(false)}
          index={indexGallery}
        />
      )}
      {showModal && (
        <ModalProduct
          product={seletedProduct}
          onClick={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
