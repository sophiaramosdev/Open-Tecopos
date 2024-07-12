/* eslint-disable array-callback-return */
import { useRef, useState } from "react";

import {
  PaginateInterface,
  ProductInterface,
  StockAreaProducts,
  Movement,
  ProductSalesReport,
  FixedCost,
  SuppliesInterface,
  ProductDependencies,
  ProductAttributesInterface,
  ServerRespAttribute,
  ServerVariationInterface,
  SalesCategories,
  ServerAttributeInterface,
  ProductRecordsInterface,
  SupplierInterfaces,
  AvailableCurrency,
  CurrencyInterface,
  Resource,
} from "../interfaces/ServerInterfaces";

import query from "./APIServices";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toast } from "react-toastify";
import {
  exchangeCurrency,
  exportExcel,
  formatCurrency,
  formatDateForReports,
  generateUrlParams,
} from "../utils/helpers";

import {
  addSalesCategory as setSaleCategory,
  updateSalesCategory as updSalesCat,
  updateSalesCategoryAfterDelete,
  addProductCategory,
  updateProductCategory,
  updateProductCategoryAfterDelete,
} from "../store/slices/nomenclatorSlice";
import useServer from "./useServerMain";
import { translateMeasure, translateProductTypes } from "../utils/translate";
import { BasicType } from "../interfaces/InterfacesLocal";
import { getStatusOrderSpanish } from "../utils/functions";
import {
  codeGenerator,
  filtrarPropiedades,
  procesarPropiedades,
} from "../containers/analysis/SaleByOrdersTabs/Export";
import { PriceSystem } from "../interfaces/Interfaces";

const generateParams = (options: Record<string, string | number | null>) => {
  let list: string[] = [];
  for (const [key, value] of Object.entries(options)) {
    if (!value) continue;
    list.push(`${key}=${value}`);
  }
  if (list.length !== 0) {
    return list.join("&");
  } else {
    return "";
  }
};

export const useServerProduct = () => {
  const { business } = useAppSelector((state) => state.init);

  //Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outLoading, setOutLoading] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isFetchingB, setIsFetchingB] = useState<boolean>(false);

  //Paginate State
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);

  //Items States
  const [stockProducts, setStockProducts] = useState<StockAreaProducts[]>([]); //Products of current Area

  const [allProducts, setAllProducts] = useState<ProductInterface[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [allSalesCategories, setAllSalesCategories] = useState<
    SalesCategories[]
  >([]);
  const [product, setProduct] = useState<ProductInterface | null>(null);
  const [allOperations, setAllOperations] = useState<Movement[]>([]);
  const [productSalesReport, setProductSalesReport] = useState<
    ProductSalesReport[]
  >([]);
  const [dependencies, setDependencies] = useState<ProductDependencies[]>([]);

  const [productAttributes, setProductAttributes] = useState<
    ProductAttributesInterface[]
  >([]);
  const [productVariations, setProductVariations] = useState<
    ServerVariationInterface[]
  >([]);
  const [productRecords, setProductRecords] = useState<
    ProductRecordsInterface[] | null
  >(null);
  const [paginateRecords, setPaginateRecords] =
    useState<PaginateInterface | null>(null);

  const { manageErrors } = useServer();
  const dispatch = useAppDispatch();

  const managePaginate = (opp: "add" | "del") => {
    if (paginate !== null) {
      if (opp === "add") {
        if (paginate.totalItems / paginate.totalPages < 35) {
          setPaginate({ ...paginate, totalItems: paginate.totalItems + 1 });
          return false;
        } else {
          setPaginate({
            ...paginate,
            totalItems: paginate.totalItems + 1,
            totalPages: Math.ceil(paginate.totalItems / 35),
          });
          return true;
        }
      } else {
        if (paginate.totalItems / paginate.totalPages <= 35) {
          setPaginate({ ...paginate, totalItems: paginate.totalItems - 1 });
          return false;
        } else {
          setPaginate({
            ...paginate,
            totalPages: Math.ceil(paginate.totalItems / 35),
            totalItems: paginate.totalItems - 1,
          });
          return true;
        }
      }
    }
  };

  const updAllProdState = (
    opp: "del" | "add",
    { product, id }: { product?: ProductInterface; id?: number | null }
  ) => {
    if (opp === "add") {
      product &&
        (managePaginate("add")
          ? setAllProducts([
              product,
              ...allProducts.filter((item, idx) => idx !== 34),
            ])
          : setAllProducts([product, ...allProducts]));
    } else {
      id && setAllProducts(allProducts.filter((item) => item.id !== id));
      managePaginate("del");
    }
  };

  const updateStockProductLocally = (product: ProductInterface) => {
    const nextProducts = stockProducts.map((item) => {
      if (item.product.id === product.id) {
        return {
          ...item,
          product,
        };
      }
      return item;
    });

    setStockProducts(nextProducts);
  };

  const updateAllProductsLocally = (product: ProductInterface) => {
    const nextProducts = allProducts.map((item) => {
      if (item.id === product.id) {
        return product;
      }
      return item;
    });

    setAllProducts(nextProducts);
  };

  const addProduct = async (
    body: Record<string, string | number>,
    callback: (product?: ProductInterface) => void,
    returnValue?: boolean
  ) => {
    let data: Record<string, any> = {};
    if (body.prices) {
      data = { ...body, prices: [body.prices] };
    } else {
      data = body;
    }
    setIsFetching(true);
    await query
      .post("/administration/product", data)
      .then((resp) => {
        updAllProdState("add", { product: resp.data });
        if (returnValue) {
          callback(resp.data);
        } else {
          toast.success("Producto agregado con éxito");
          callback();
        }
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const associateResourcesWithProduct = async (
    id: number | string,
    data: Record<string, string | number>,
    callback: Function = () => {}
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/resource/productresource/${id}`, data)
      .then((resp) => {
        toast.success("Recurso agregado con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteProduct = async (id: number | null, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/product/${id}`, {})
      .then(() => {
        updAllProdState("del", { id });
        toast.success("Producto eliminado con éxito");
        callback();
      })
      .catch((e) => {
        manageErrors(e);
        callback();
      });
    setIsFetching(false);
  };

  const deleteResource = async (id: number | null, callback: Function) => {
    setIsLoading(true);
    await query
      .deleteAPI(`/administration/resource/${id}`, {})
      .then(() => {
        const deleted = allResources.filter((item) => item.id !== id);
        setAllResources(deleted);
        toast.success("Recurso eliminado con éxito");
        callback();
      })
      .catch((e) => {
        manageErrors(e);
        callback();
      });
    setIsLoading(false);
  };

  const updateResource = async (
    data: Record<string, string | number | boolean>,
    id: number,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/resource/${id}`, data)
      .then((resp) => {
        const updated = allResources.map((item) => {
          if (item.id === resp.data.id) {
            return resp.data;
          }
          return item;
        });
        setAllResources(updated);
        callback();
        toast.success("Recurso actualizado con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateProduct = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback?: Function
  ) => {
    setIsFetching(true);

    await query
      .patch(`/administration/product/${id}`, data)
      .then((resp) => {
        const updated = allProducts;
        updated.splice(
          allProducts.findIndex((item) => item.id === resp.data.id),
          1,
          resp.data
        );
        setAllProducts(updated);
        setProduct({ ...product, ...resp.data });
        callback && callback(resp.data);
        toast.success("Producto actualizado con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const newProduct = async (
    body: Record<string, string | number | boolean>,
    callback: any
  ) => {
    setIsLoading(true);
    //Create product
    query
      .post(`/administration/product`, body)
      .then(async (resp) => {
        setIsLoading(false);
        toast.success("Producto agregado con éxito");
        setAllProducts([resp.data, ...allProducts]);
        callback();
      })
      .catch((error) => manageErrors(error));
  };

  const newResource = async (
    body: Record<string, string | number | boolean>,
    areaId: number | string,
    callback: any
  ) => {
    setIsLoading(true);
    query
      .post(`/administration/resource/${areaId}`, body)
      .then(async (resp) => {
        setIsLoading(false);
        toast.success("Recurso agregado con éxito");
        setAllResources([resp.data, ...allResources]);
        callback();
      })
      .catch((error) => manageErrors(error));
  };

  const currentPriceSystem = useRef<PriceSystem | null>(null);

  const getAllProducts = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setOutLoading(true);
    const queries = [
      query.get(`/administration/product${generateUrlParams(filter)}`),
      query.get("/administration/active-economiccycle")
    ];

    await Promise.all(queries)
      .then((resp) => {
        setAllProducts(resp[0].data.items);
        setPaginate({
          totalItems: resp[0].data.totalItems,
          totalPages: resp[0].data.totalPages,
          currentPage: resp[0].data.currentPage,
        });
          currentPriceSystem.current = resp[1].data?.priceSystem;
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const getAllResources = async (
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/resource-business${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllResources(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getAllProductsForPage = async (
    page?: number | null,
    filter?: Record<string, string | number | null> | null
  ) => {
    const urlParams = filter ? generateParams(filter) : "";
    setIsLoading(true);
    await query
      .get(`/administration/product?page=${page ? page : 1}${urlParams}`)
      .then((resp) => {
        setAllProducts(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getProduct = async (id: string) => {
    setIsLoading(true);
    await query
      .get(`/administration/product/${id}`)
      .then(async (resp) => {
        let product: ProductInterface = resp.data;
        if (product.type === "VARIATION") {
          await query
            .get(`/administration/variation/attribute/${id}`)
            .then((attr) => (product = { ...product, attributes: attr.data }));
        }
        setProduct(product);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getProductsByType = async (
    type: string,
    filter?: Record<string, string>,
    page?: number
  ) => {
    setIsFetching(true);
    await query
      .get(
        `/administration/product?type=${type}${
          filter ? generateParams(filter) : ""
        }&${page ? page : "all_data=true"}`
      )
      .then((resp) => {
        setAllProducts(resp.data.items);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getQuickReportByArea = async (areaId: string) => {
    setIsLoading(true);
    await query
      .get(`/administration/stock/quick-report/${areaId}`)
      .then((resp) => /*setQuickProductReport(resp.data)*/ null)
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  //Sales Categories ----------------------------------------------------------------------------

  const getAllSalesCategories = async () => {
    setIsFetching(true);
    await query
      .get("/administration/salescategory")
      .then((resp) => {
        setAllSalesCategories(resp.data.items);
        dispatch(setSaleCategory(resp.data.items));
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const addSalesCategory = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/salescategory", data)
      .then((resp) => {
        dispatch(setSaleCategory(resp.data));
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const updateSalesCategory = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/salescategory/${id}`, data)
      .then((resp) => {
        dispatch(updSalesCat(resp.data));
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const deleteSalesCategory = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/salescategory/${id}`, {})
      .then(() => {
        dispatch(updateSalesCategoryAfterDelete(id));
        setIsFetching(false);
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  //Stock Categories----------------------------------------------------------------------------

  const addStockCategory = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/productcategory", data)
      .then((resp) => {
        dispatch(addProductCategory(resp.data));
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const updateStockCategory = async (
    id: number,
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/productcategory/${id}`, data)
      .then((resp) => {
        dispatch(updateProductCategory(resp.data));
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const deleteStockCategory = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/productcategory/${id}`, {})
      .then(() => {
        dispatch(updateProductCategoryAfterDelete(id));
        callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  //---------------------------------------------------------------------------------------------

  const manageSupplies = async (
    id: number,
    data: { products: { supplyProductId: number; quantity: number } },
    updStock?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/supplies/manage/${id}`, data)
      .then((resp) => {
        const nextProducts = [...allProducts];
        const idx = nextProducts.findIndex((item) => item.id === id);
        nextProducts.splice(idx, 1, resp.data);
        setAllProducts(nextProducts);
        setProduct({ ...product, ...resp.data });
        updStock && updStock(resp.data);
        toast.success("Ficha de costo actualizada");
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const manageCombos = async (
    id: number,
    data: {
      products: { composedId: number; quantity: number; variationId: number }[];
    }
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/combo/manage/${id}`, data)
      .then((resp) => {
        const nextProducts = allProducts;
        const idx = nextProducts.findIndex((item) => item.id === id);
        nextProducts.splice(idx, 1, resp.data);
        setAllProducts(nextProducts);
        setProduct({ ...product, ...resp.data });
        toast.success("Combo actualizado");
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const manageManufacturer = async (id: number, data: number[]) => {
    setIsFetching(true);
    await query
      .post(`/administration/manufacturer/manage/${id}`, {
        listManufacturer: data,
      })
      .then((resp) => {
        const nextProducts = allProducts;
        const idx = nextProducts.findIndex((item) => item.id === id);
        nextProducts.splice(idx, 1, resp.data);
        setAllProducts(nextProducts);
        setProduct({ ...product, ...resp.data });
        toast.success("Producto actualizado con éxito")
      })
      .catch((e) => {
        manageErrors(e);
      });
    setIsFetching(false);
  };

  const getOperations = async (
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/movement${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllOperations(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));

    setIsLoading(false);
  };

  const getProductSales = async (id?: number) => {
    setIsLoading(true);
    await query
      .get(`/report/product/sales/${id}`)
      .then((resp) => {
        setProductSalesReport(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const findAllOrdersWhereProduct = async (
    id: number,
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/sales/order/products/${id}${generateUrlParams({
          ...filter,
        })}`
      )
      .then((resp) => {
        setProductSalesReport(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  //--ATTRIBUTE VARIATIONS--------------------------------------

  const normalizeAttrInfo: (
    resp: ServerRespAttribute[]
  ) => ProductAttributesInterface[] = (data) => {
    const currentAttr: ProductAttributesInterface[] = [];
    data.forEach((elem) => {
      const current = currentAttr.find((itm) => itm.code === elem.code);
      if (current) {
        current.values.push({
          id: elem.id,
          value: elem.value,
        });
      } else {
        currentAttr.push({
          code: elem.code,
          name: elem.name,
          values: [{ id: elem.id, value: elem.value }],
        });
      }
    });
    return currentAttr;
  };

  const getProductAttributes = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/variation/attribute/${id}`)
      .then((resp) => {
        const response: ServerRespAttribute[] = resp.data;
        setProductAttributes(normalizeAttrInfo(response));
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addProductAttribute = async (
    productId: number,
    data: BasicType,
    callback: Function,
    updateProd?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/variation/attribute/${productId}`, data)
      .then((resp) => {
        const response: ServerRespAttribute[] = resp.data;
        const newValues = response.map((itm) => ({
          id: itm.id,
          value: itm.value,
        }));
        const newAttr = [...productAttributes];
        const idx = newAttr.findIndex((elem) => elem.code === response[0].code);
        if (idx !== -1) {
          newAttr.splice(idx, 1, {
            ...newAttr[idx],
            values: [...newAttr[idx].values, ...newValues],
          });
        }
        newAttr.push({
          code: response[0].code,
          name: response[0].name,
          values: response.map((itm) => ({ id: itm.id, value: itm.value })),
        });

        setProductAttributes(newAttr);
        callback();
        updateProd && updateProd(response);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editAttributeProduct = async (
    attrId: number,
    data: { value: string },
    callback: Function,
    updProd?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/variation/attribute/${attrId}`, data)
      .then((resp) => {
        const response: ServerRespAttribute = resp.data;
        const newProdAttr = [...productAttributes];
        const currentAttr = newProdAttr.find(
          (itm) => itm.code === response.code
        )!;
        const currentAttrValueIdx = currentAttr?.values.findIndex(
          (itm) => itm.id === response.id
        );
        currentAttr.values.splice(currentAttrValueIdx, 1, {
          id: response.id,
          value: response.value,
        });
        setProductAttributes(newProdAttr);
        callback();
        updProd && updProd(response);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteAttributeProduct = async (
    attrId: number,
    data: { attributeId: number },
    callback: Function,
    updateProd?: Function
  ) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/variation/attribute/${attrId}`, data)
      .then(() => {
        let newProdAttr = [...productAttributes];
        const deletedItem = newProdAttr.find(
          (itm) => !!itm.values.find((elem) => elem.id === attrId)
        )!;
        const idx = deletedItem.values.findIndex((itm) => itm.id === attrId)!;
        updateProd && updateProd(deletedItem.values[idx], true);
        deletedItem.values.splice(idx, 1);
        newProdAttr = newProdAttr.filter((item) => item.values.length !== 0);
        setProductAttributes(newProdAttr);
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateAttributeState = (
    attribute: ServerAttributeInterface | ServerAttributeInterface[],
    del: boolean = false
  ) => {
    if (Array.isArray(attribute)) {
      setProduct({
        ...product!,
        attributes: [...product!.attributes!, ...attribute],
      });
    } else {
      const index = product!.attributes!.findIndex(
        (item) => item.id === attribute.id
      );
      const newAttr = [...product!.attributes!];
      if (del) {
        newAttr.splice(index, 1);
      } else {
        newAttr.splice(index, 1, attribute);
      }
      setProduct({ ...product!, attributes: newAttr });
    }
  };

  //VARIATIONS ENDPOINTS
  const getVariation = async (id: number) => {
    setIsFetching(true);
    await query
      .get(`/administration/variation/product/${id}`)
      .then((resp) => setProductVariations(resp.data.variations))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const addVariation = async (
    id: number,
    data: Record<string, string>,
    closeModal: Function,
    updateState: Function,
    updateStockProduct?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/variation/product/${id}`, { attributes: data })
      .then((resp) => {
        updateState(resp.data);
        updateStockProduct &&
          updateStockProduct({
            ...product,
            variations: [...product!.variations!, resp.data],
          });
        toast.success("Variación agregada con éxito");
        closeModal();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateVariation = async (
    variationId: number,
    data: Record<string, any>,
    callback: (variation: ServerVariationInterface) => void
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/variation/product/${variationId}`, data)
      .then((resp) => {
        callback(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteVariationProduct = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/variation/product/${id}`, {})
      .then(() => {
        callback();
        toast.success("Variación eliminada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateVariationState = (
    variation: ServerVariationInterface,
    del: boolean = false
  ) => {
    const index = product!.variations!.findIndex(
      (item) => item.id === variation.id
    );
    if (index !== -1) {
      const newVariation = [...product!.variations!];
      if (del) {
        newVariation.splice(index, 1);
      } else {
        newVariation.splice(index, 1, variation);
      }

      setProduct({ ...product!, variations: newVariation });
    } else {
      setProduct({
        ...product!,
        variations: [...product!.variations!, variation],
      });
    }
  };

  //FixedCost---------------------------------------

  const addFixedCost = async (
    data: Record<string, string | number>,
    updateStateFunction: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/product-fixedcost`, data)
      .then((resp) => {
        updateStateFunction(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editFixedCost = async (
    costId: number,
    data: Record<string, string | number>,
    updateStateFunction: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/product-fixedcost/${costId}`, data)
      .then((resp) => updateStateFunction(resp.data, resp.data.id))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteFixedCost = async (
    costId: number,
    updateStateFunction: Function
  ) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/product-fixedcost/${costId}`, {})
      .then(() => updateStateFunction(costId))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateFixedCostState = (
    cost?: FixedCost,
    id?: number,
    updStock?: Function
  ) => {
    const updateProductArray = (prod: ProductInterface) => {
      if (updStock) {
        updStock(prod);
        return;
      }
      const newProdArray = [...allProducts];
      const indexProd = allProducts.findIndex((itm) => itm.id === prod.id);
      indexProd !== -1 && newProdArray.splice(indexProd, 1, { ...prod });
      setAllProducts(newProdArray);
    };
    if (product) {
      let newProduct = { ...product };
      if (!id && cost) {
        newProduct = { ...product, fixedCosts: [...product.fixedCosts, cost] };
      }
      if (id && !cost) {
        newProduct = {
          ...product,
          fixedCosts: product.fixedCosts.filter((item) => item.id !== id),
        };
      }
      if (id && cost) {
        const modified = product.fixedCosts;
        const index = modified.findIndex((item) => item.id === id);
        index !== -1 && modified.splice(index, 1, cost);
        newProduct = { ...product, fixedCosts: modified };
      }
      setProduct(newProduct);
      updateProductArray(newProduct);
    }
  };

  //--------------------------------------------------

  const exportProducts = async (
    filter: BasicType,
    filename: string,
    allSuppliers: SupplierInterfaces[],
    allCurrencies: CurrencyInterface[],
    titlesForExport: string[],
    callback?: Function
  ) => {
    setOutLoading(true);
    await query
      .get(
        `/administration/product${generateUrlParams({
          ...filter,
          all_data: true,
        })}`
      )

      .then((resp) => {
        const productCost = (
          avCost: number,
          supplies: SuppliesInterface[],
          fixedCost: FixedCost[],
          type?: string
        ) => {
          if (
            ["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(type ?? "") &&
            supplies.length !== 0
          ) {
            return (
              supplies.reduce(
                (total, value) =>
                  total + value.quantity * value.supply.averageCost,
                0
              ) + fixedCost.reduce((total, item) => total + item.costAmount, 0)
            );
          } else {
            return avCost;
          }
        };

        const Products: ProductInterface[] = resp.data.items;
        // const dataToExport: Record<string, string | number>[] = [];

        let data = Products.map((item) => {
          const salePrices =
            item.prices.length > 0
              ? item.prices
                  .map((item) => {
                    return formatCurrency(item.price, item.codeCurrency);
                  })
                  .join(`, `)
              : "";

          const mainPrice = item.prices.find((elem) => elem.isMain);

          const salesPrice = exchangeCurrency(
            {
              amount: product?.onSale
                ? product.onSaleType === "fixed"
                  ? product?.onSalePrice.amount
                  : (1 - product.onSaleDiscountAmount / 100) *
                    (mainPrice?.price ?? 0)
                : mainPrice?.price ?? 0,
              //
              codeCurrency:
                product?.onSalePrice?.codeCurrency ??
                mainPrice?.codeCurrency ??
                "",
            },
            business?.costCurrency ?? "CUP",
            allCurrencies as AvailableCurrency[]
          )!.amount;

          const gainNumber =
            //Precio de venta en monenda de costo
            salesPrice -
            //Costo
            productCost(
              item?.averageCost ?? 0,
              item?.supplies ?? [],
              item.fixedCosts ?? [],
              item?.type
            );

          const gain = formatCurrency(
            gainNumber,
            business?.costCurrency ?? "CUP"
          );

          let data = {
            Nombre: item?.name,
            "Categoría de almacén": item?.productCategory?.name! ?? "",
            "Categoría de venta": item?.salesCategory?.name! ?? "",
            Proveedor:
              allSuppliers.find((elem) => elem.id === item.supplierId)?.name ??
              "",
            "Precio de venta": salePrices,
            Ganancia:
              productCost(
                item?.averageCost ?? 0,
                item?.supplies ?? [],
                item.fixedCosts ?? [],
                item?.type
              ) > 0
                ? `${gain}`
                : "",
            // "Porciento de ganancia": `${percentage}%`,
            Disponibilidad: item.stockLimit
              ? `${item.totalQuantity} ${translateMeasure(item?.measure)}`
              : "Ilimitado",
            "Costo unitario": productCost(
              item?.averageCost ?? 0,
              item?.supplies ?? [],
              item.fixedCosts ?? [],
              item?.type
            ),
            Tipo: translateProductTypes(item.type),
          };

          return data;
        });
        if (data && Array.isArray(data) && titlesForExport)
          data = filtrarPropiedades(data, titlesForExport);

        let dataForExcel: any;
        let codeGeneratorValues: any;

        if (data && Array.isArray(data) && titlesForExport) {
          dataForExcel = procesarPropiedades(data);
          codeGeneratorValues = codeGenerator(dataForExcel);
        }

        const dataToExport: Record<string, string | number>[] =
          codeGeneratorValues ?? [];

        exportExcel(dataToExport, filename);

        // exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => {
        manageErrors(e);
      });
    setOutLoading(false);
  };

  const exportOrdersWhereProducts = async (
    id: number,
    filter: BasicType,
    filename: string,
    callback?: Function
  ) => {
    setOutLoading(true);
    await query
      .get(
        `/sales/order/products/${id}${generateUrlParams({
          ...filter,
          all_data: true,
        })}`
      )

      .then((resp) => {
        const Products: ProductSalesReport[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        Products.map((item) => {
          dataToExport.push({
            "Nombre de la orden": item.orderReceipt.name,
            "Fecha de creación": formatDateForReports(
              item.orderReceipt.createdAt
            ),
            Cantidad: item.quantity,
            "Precio unitario": item.priceUnitary.amount,
            Moneda: item.priceUnitary.codeCurrency,
            "Fecha de pago": formatDateForReports(item.orderReceipt.paidAt),
            Estado: getStatusOrderSpanish(item.orderReceipt.status),
            Cliente:
              (item.orderReceipt?.client?.firstName ?? "-") +
              " " +
              (item.orderReceipt?.client?.lastName ?? "-"),
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setOutLoading(false);
  };

  const exportProductForSale = async (
    filter: BasicType,
    filename: string,
    allCurrencies: CurrencyInterface[],
    callback?: Function
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/product${generateUrlParams({
          ...filter,
          all_data: true,
        })}`
      )
      .then((resp) => {
        const productCost = (
          avCost: number,
          supplies: SuppliesInterface[],
          fixedCost: FixedCost[],
          type?: string
        ) => {
          if (
            ["MANUFACTURED", "MENU", "STOCK", "ADDON"].includes(type ?? "") &&
            supplies.length !== 0
          ) {
            return (
              supplies.reduce(
                (total, value) =>
                  total + value.quantity * value.supply.averageCost,
                0
              ) + fixedCost.reduce((total, item) => total + item.costAmount, 0)
            );
          } else {
            return avCost;
          }
        };

        const Products: ProductInterface[] = resp.data.items;
        const dataToExport: Record<string, string | number>[] = [];

        Products.map((item) => {
          const mainPrice = item.prices.find((item) => item.isMain);

          const salesPrice = exchangeCurrency(
            {
              amount: product?.onSale
                ? product.onSaleType === "fixed"
                  ? product?.onSalePrice.amount
                  : (1 - product.onSaleDiscountAmount / 100) *
                    (mainPrice?.price ?? 0)
                : mainPrice?.price ?? 0,
              //
              codeCurrency:
                product?.onSalePrice?.codeCurrency ??
                mainPrice?.codeCurrency ??
                "",
            },
            business?.costCurrency ?? "CUP",
            allCurrencies as AvailableCurrency[]
          )!.amount;
          const gainNumber =
            //Precio de venta en monenda de costo
            salesPrice -
            //Costo
            productCost(
              item?.averageCost ?? 0,
              item?.supplies ?? [],
              item.fixedCosts ?? [],
              item?.type
            );

          const gain = formatCurrency(
            gainNumber,
            business?.costCurrency ?? "CUP"
          );

          const percentage =
            salesPrice > 0
              ? //Ganancia
                (
                  (gainNumber /
                    //Precio de Venta
                    (product?.prices.filter(
                      (price) =>
                        price.codeCurrency === business?.costCurrency ?? "CUP"
                    )[0]?.price ?? 1)) *
                  100
                ).toFixed(2)
              : -100;
          // ____________________________________________________________

          dataToExport.push({
            Nombre: item.name,
            Costo: item?.averageCost.toFixed(2) ?? 0,
            // Costo: formatCurrency(
            //   item?.averageCost ?? 0,
            //   business?.costCurrency ?? ""
            // ),
            "Moneda de Costo": business?.costCurrency ?? "CUP",
            "Precio de venta":
              item.prices.length > 0
                ? item.prices
                    .map((item) => {
                      return item.price.toFixed(2);
                      // return formatCurrency(item.price, item.codeCurrency);
                    })
                    .join(`, `)
                  : 0,
            "Moneda de Precio de venta": business?.costCurrency ?? "CUP",
            Ganancia:
              productCost(
                item?.averageCost ?? 0,
                item?.supplies ?? [],
                item.fixedCosts ?? [],
                item?.type
              ) > 0
                ? `${gain}`
                : "",
            "Porciento de ganancia": `${percentage}%`,
            Disponibilidad: item.stockLimit
              ? `${item.totalQuantity} ${translateMeasure(item?.measure)}`
              : "Ilimitado",

            Tipo: translateProductTypes(item.type),
          });
        });

        exportExcel(dataToExport, filename);
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getProductDependencies = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/dependencies/${id}`)
      .then((resp) => setDependencies(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getRecordsProduct = async (
    id: number,
    filter: Record<string, string | number | boolean | null>
  ) => {
    setIsFetchingB(true);
    await query
      .get(`/administration/product-records/${id}${generateUrlParams(filter)}`)
      .then((resp) => {
        setProductRecords(resp.data.items);
        setPaginateRecords({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((error) => manageErrors(error));
    setIsFetchingB(false);
  };

  return {
    isLoading,
    isFetching,
    outLoading,
    paginate,
    allProducts,
    stockProducts,
    product,
    allOperations,
    productSalesReport,
    getAllProductsForPage,
    getProduct,
    getAllProducts,
    updateStockProductLocally,
    getProductsByType,
    getQuickReportByArea,
    newProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    updateAllProductsLocally,
    updAllProdState,
    manageSupplies,
    manageCombos,
    getOperations,
    getProductSales,
    manageManufacturer,
    addSalesCategory,
    updateSalesCategory,
    deleteSalesCategory,
    getAllSalesCategories,
    allSalesCategories,

    addStockCategory,
    updateStockCategory,
    deleteStockCategory,
    updateVariationState,
    updateAttributeState,
    updateVariation,

    addProductAttribute,
    editAttributeProduct,
    deleteAttributeProduct,

    addFixedCost,
    editFixedCost,
    deleteFixedCost,
    updateFixedCostState,

    productVariations,
    getVariation,
    addVariation,
    deleteVariationProduct,
    getProductAttributes,
    productAttributes,

    exportProducts,
    exportProductForSale,
    dependencies,
    getProductDependencies,
    findAllOrdersWhereProduct,
    exportOrdersWhereProducts,

    getRecordsProduct,
    productRecords,
    paginateRecords,
    isFetchingB,

    //Recursos
    getAllResources,
    allResources,
    newResource,
    updateResource,
    deleteResource,
    associateResourcesWithProduct,

    priceSystem: currentPriceSystem?.current,
  };
};

export default useServerProduct;
