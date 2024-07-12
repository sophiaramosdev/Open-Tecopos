import React, { useEffect, useState } from "react";
import APIServer from "../../api/APIServices";

import { CardProduct } from "./CardProduct";
import ModalProduct from "./ModalProduct";

export default function ProductForCategory({ category, slug }) {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [seletedProduct, setSeletedProduct] = useState(null);

  const showProduct = (value) => {
    setSeletedProduct(value);
    setShowModal(true);
  };

  useEffect(() => {
    APIServer.get(
      `/public/products/business/${slug}?salesCategoryId=${category.id}`
    )
      .then((resp) => {
        if (resp.data.products) {
          let store_sections = [];

          resp.data.products.forEach((item) => {
            //Find  if  category exist
            const found = store_sections.find(
              (section) => section.id === item.salesCategory.id
            );

            if (found) {
              store_sections = store_sections.map((item_data) => {
                if (item_data.id === item.salesCategory.id) {
                  return {
                    ...item_data,
                    data: [...item_data.data, item],
                  };
                }
                return item_data;
              });
            } else {
              store_sections.push({
                id: item.salesCategory.id,
                title: item.salesCategory.name,
                data: [item],
              });
            }
          });

          store_sections = store_sections.sort((a, b) => {
            return a.title.toUpperCase() > b.title.toUpperCase() ? 1 : -1;
          });

          setProducts(store_sections);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {products.map((item) => (
        <div key={item.id} className={"mt-8"}>
          <h5
            className="font-bold text-xl my-2 text-left text-slate-500"
            id={item.title}
          >
            {item.title}
          </h5>

          <div className="grid grid-cols-2 gap-y-3 gap-x-3 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 md:gap-y-6 md:gap-x-6   sm:gap-y-10 lg:grid-cols-4 lg:gap-y-6 lg:gap-x-6 xl:grid-cols-6 xl:gap-y-6 xl:gap-x-6">
            {item.data.map((product) => (
              <CardProduct
                product={product}
                onClick={() => showProduct(product)}
                priceSystemId={1}
                cardWidth={"w-full"}
              />
            ))}
          </div>
        </div>
      ))}

      {showModal && (
        <ModalProduct
          product={seletedProduct}
          onClick={() => setShowModal(false)}
        />
      )}
    </>
  );
}
