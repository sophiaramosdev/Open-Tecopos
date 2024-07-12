import { useState } from "react";
import { useDispatch } from "react-redux";

import APIServer from "../api/APIServices";
import { login } from "../store/userSessionSlice";
import { translateOptions } from "../utils/functions";
import { generateUrlParams } from "../utils/helpers";

export const useServer = ({ startLoading }) => {
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(startLoading);
  const [isFetching, setIsFetching] = useState(startLoading);
  const [error, setError] = useState();

  const [paginate, setPaginate] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  });


  const checkLogin = async () => {
    const session = localStorage.getItem("session");

    if (session !== null) {
      await APIServer.get("/security/user")
        .then(async (resp) => {
          if (!resp.data.isSuperAdmin) {
            await APIServer.get(`/administration/my-business/`).then(
              (resp2) => {
                dispatch(
                  login({
                    user: resp.data,
                    business: resp2.data,
                  })
                );
              }
            );
          } else {
            dispatch(login({ user: resp.data }));
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  };

  const [scores, setScores] = useState([]);
  const [mostSelled, setMostSelled] = useState([]);
  const [max, setMax] = useState(0);

  const initIndexPage = async () => {
    setIsLoading(true);

    await Promise.all([
      APIServer.get(`/report/incomes/last-7-days`),
      APIServer.get(`/report/selled-products/most-selled`),
    ])
      .then((resp) => {
        //Last 7 days
        let scoresTem = [];
        let maxime = 0;
        resp[0].data.forEach((item) => {
          scoresTem.push(item.totalIncome);
          if (item.totalIncome > maxime) {
            maxime = item.totalIncome * 1.3;
          }
        });
        setMax(maxime);
        setScores(scoresTem);

        //Most selled
        setMostSelled(resp[1].data);

        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se iniciaba la aplicación. Por favor, vuelva a interlo."
          );
        }
        setIsLoading(false);
      });
  };

  const initOrdersTabSection = async (economicCycleId) => {
    setIsLoading(true);

    await Promise.all([
      APIServer.get(`/administration/area?type=SALE`),
      APIServer.get(`/sales/order?economicCycleId=${economicCycleId}`),
    ])
      .then((resp) => {
        setAreas(resp[0].data.items);
        setOrders(resp[1].data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se iniciaba la aplicación. Por favor, vuelva a interlo."
          );
        }
        setIsLoading(false);
      });
  };

  const [supplies, setSupplies] = useState([]);
  const fetchSupplies = async (productId) => {
    setIsLoading(false);
    setIsFetching(true);
    await APIServer.get(`/administration/supplies/${productId}`)
      .then((resp) => {
        setSupplies(resp.data);
        setIsFetching(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los productos de la Ficha Técnica"
          );
        }
        setIsFetching(false);
      });
  };

  const manageManufacture = async (productId, body, onSuccess) => {
    setIsLoading(true);
    await APIServer.post(
      `/administration/manufacturer/manage/${productId}`,
      body
    )
      .then((resp) => {
        onSuccess && onSuccess(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se completaba la ficha de manufactura"
          );
        }
        setIsLoading(false);
      });
  };

  const [manufacture, setManufacture] = useState([]);
  const fetchManufacture = async (productId) => {
    setIsLoading(false);
    setIsFetching(true);

    await APIServer.get(`/administration/product/${productId}`)
      .then((resp) => {
        setManufacture(resp.data.listManufacturations);
        setIsFetching(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los productos de la Ficha Técnica"
          );
        }
        setIsFetching(false);
      });
  };

  const [product, setProduct] = useState({});
  const fetchProduct = async (productId) => {
    setIsLoading(false);
    setIsFetching(true);

    await APIServer.get(`/administration/product/${productId}`)
      .then((resp) => {
        setProduct(resp.data);
        setIsFetching(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan el producto");
        }
        setIsFetching(false);
      });
  };

  const updateProductLocally = (product) => {
    const nextProducts = products.map((item) => {
      if (item.id === product.id) {
        return product;
      }

      return item;
    });

    setProducts(nextProducts);
  };

  const updateStockProductLocally = (product) => {
    const nextProducts = products.map((item) => {
      if (item.product.id === product.id) {
        return {
          ...item,
          product,
        };
      }

      return item;
    });

    setProducts(nextProducts);
  };

  const deleteProductLocally = (product) => {
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
  };

  const newProductLocally = (product) => {
    setProducts((prev) => [product, ...prev]);
  };

  const [stockMovement, setStockMovement] = useState({});
  const fetchStockMovement = async (movementId) => {
    setIsLoading(false);
    setIsFetching(true);

    await APIServer.get(`/administration/movement/${movementId}`)
      .then((resp) => {
        setStockMovement(resp.data);
        setIsFetching(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los detalles de la operación"
          );
        }
        setIsFetching(false);
      });
  };

  const newStockMovement = async (type, body, onSuccess) => {
    setIsLoading(true);
    setIsFetching(false);
    await APIServer.post(`/administration/movement/${type}`, body)
      .then((resp) => {
        onSuccess && onSuccess();
        setIsLoading(false);
      })
      .catch((error) => {

        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se creaba una nueva operación"
          );
        }
        setIsLoading(false);
      });
  };

  const clearSearch = () => {
    setProducts([]);
  };

  const newProduct = async (body, callback) => {
    setIsLoading(true);
    setIsFetching(false);
    let message = "";
    let error = false;

    //Create product
    APIServer.post(`/administration/product`, body)
      .then(async (resp) => {
        message = "El producto fue creado satisfactoriamente.";
        setIsLoading(false);
        callback && callback(resp.data, error, message);
      })
      .catch((error) => {
        message = error.response.data.message;
        callback(null, error, message);
        setIsLoading(false);
      });
  };

  const deleteProduct = async (id, callback) => {
    setIsLoading(true);
    setIsFetching(false);

    //Delete product
    APIServer.deleteAPI(`/administration/product/${id}`)
      .then(async (resp) => {
        setIsLoading(false);
        callback && callback();
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se eliminba el producto. Por favor, vuelva a intentarlo."
          );
        }
        setIsLoading(false);
      });
  };

  const [categoryProduct, setCategoryProduct] = useState([]);
  const fetchCategoryProduct = async (options) => {
    setIsLoading(true);
    const params = options ? `&${translateOptions(options)}` : "";
    await APIServer.get(`/administration/productcategory?per_page=150${params}`)
      .then((resp) => {
        setCategoryProduct(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan las categorías de productos"
          );
        }
        setIsLoading(false);
      });
  };

  const [categorySales, setCategorySales] = useState([]);
  const fetchCategorySales = async (options) => {
    setIsLoading(true);

    const params = options ? `&${translateOptions(options)}` : "";
    await APIServer.get(`/administration/salescategory?per_page=150${params}`)
      .then((resp) => {
        setCategorySales(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan las categorías de ventas"
          );
        }
        setIsLoading(false);
      });
  };

  const [productAddons, setProductAddons] = useState([]);
  const fetchProductAddons = async () => {
    setIsLoading(true);
    await APIServer.get(
      `/administration/product?type=ADDON&fullAddons=true?per_page=150`
    )
      .then((resp) => {
        setProductAddons(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los productos tipo agrego"
          );
        }
        setIsLoading(false);
      });
  };

  //Get more products until end is reached
  const lastPage = (page, lastPage) => {
    page < lastPage ? setEndReached(false) : setEndReached(true);
  };

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const [cashOperation, setCashOperation] = useState([]);

  const findAllCashOperation = async (economicCycleId, filter) => {
    setIsLoading(true);

    await APIServer.get(`/sales/cash-operation${generateUrlParams({economicCycleId: economicCycleId,...filter})}`)
      .then((resp) => {
        setCashOperation(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        })
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan las operaciones de cajas"
          );
        }
        setIsLoading(false);
      });
  };

  const loadMoreCashOperation = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/sales/cash-operation?page=${page}${params}`)
      .then((resp) => {
        setCashOperation((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan las operaciones de cajas"
          );
        }
        setIsLoadingList(false);
      });
  };

  const [products, setProducts] = useState([]);
  const findAllProducts = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/product${params}`)
      .then((resp) => {
        setProducts(resp.data.items);
        lastPage(1, resp.data.totalPages);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los productos");
        }
        setIsLoading(false);
      });
  };

  const loadMoreProducts = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/administration/product?page=${page}${params}`)
      .then((resp) => {
        setProducts((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los productos");
        }
        setIsLoadingList(false);
      });
  };

  const findAllProductsOfArea = async (areaId, options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/product/area/${areaId}${params}`)
      .then((resp) => {
        setProducts(resp.data.items);
        lastPage(1, resp.data.totalPages);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los productos");
        }
        setIsLoading(false);
      });
  };

  const loadMoreProductsOfArea = async (areaId, options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(
      `/administration/product/area/${areaId}?page=${page}${params}`
    )
      .then((resp) => {
        setProducts((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los productos");
        }
        setIsLoadingList(false);
      });
  };

  const [areas, setAreas] = useState([]);
  const findAllAreas = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/area${params}`)
      .then((resp) => {
        setAreas(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las áreas");
        }
        setIsLoading(false);
      });
  };

  const [region, setRegion] = useState([]);
  const findAllRegion = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/client-shipping/region${params}`)
      .then((resp) => {
        setRegion(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las regiones");
        }
        setIsLoading(false);
      });
  };

  const loadMoreOrders = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/sales/order?page=${page}${params}`)
      .then((resp) => {
        setOrders((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las ordenes");
        }
        setIsLoadingList(false);
      });
  };

  const [orders, setOrders] = useState([]);
  const findAllOrders = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/sales/order${params}`)
      .then((resp) => {
        setOrders(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las órdenes");
        }
        setIsLoading(false);
      });
  };

  const [users, setUsers] = useState([]);
  const findAllUsers = async (businessId, options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/security/users${params}`)
      .then((resp) => {
        setUsers(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los usuarios");
        }
        setIsLoading(false);
      });
  };

  const loadMoreUsers = async (businessId, options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/security/users?page=${page}${params}`)
      .then((resp) => {
        setUsers((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los usuarios");
        }
        setIsLoadingList(false);
      });
  };

  const [clients, setClients] = useState([]);
  const findAllClients = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/client-shipping/client${params}`)
      .then((resp) => {
        setClients(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los clientes");
        }
        setIsLoading(false);
      });
  };

  const loadMoreClients = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/client-shipping/client?page=${page}${params}`)
      .then((resp) => {
        setClients((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los clientes");
        }
        setIsLoadingList(false);
      });
  };

  const [resouce, setResouce] = useState([]);
  const findAllResouce = async (areaId, options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/resource/${areaId}${params}`)
      .then((resp) => {
        setResouce(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los usuarios");
        }
        setIsLoading(false);
      });
  };

  const loadMoreResouce = async (areaId, options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(
      `/administration/resource/${areaId}?page=${page}${params}`
    )
      .then((resp) => {
        setResouce((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaban los usuarios");
        }
        setIsLoadingList(false);
      });
  };

  const [movements, setMovements] = useState([]);
  const findAllMovements = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/movement${params}`)
      .then((resp) => {
        setMovements(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los movimientos");
        }
        setIsLoading(false);
      });
  };

  const loadMoreMovents = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/administration/movement?page=${page}${params}`)
      .then((resp) => {
        setMovements((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan más movimientos");
        }
        setIsLoadingList(false);
      });
  };

  const [sales, setSales] = useState([]);
  const findAllSales = async (productId, options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/report/product/sales/${productId}${params}`)
      .then((resp) => {
        setSales(resp.data.items);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las ventas");
        }
        setIsLoading(false);
      });
  };

  const loadMoreSales = async (productId, page, options) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(
      `/report/product/sales/${productId}?page=${page}${params}`
    )
      .then((resp) => {
        setSales((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan las ventas");
        }
        setIsLoadingList(false);
      });
  };

  const manageSupplies = async (productId, body, onSuccess) => {
    setIsLoading(true);

    await APIServer.post(`/administration/supplies/manage/${productId}`, body)
      .then((resp) => {
        onSuccess && onSuccess(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {

          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se completaba la ficha técnica"
          );
        }
        setIsLoading(false);
      });
  };
  const manageCompounds = async (productId, body, onSuccess) => {
    setIsLoading(true);
    await APIServer.post(`/administration/combo/manage/${productId}`, body)
      .then((resp) => {
        onSuccess && onSuccess(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.data.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se completaba el combo");
        }
        setIsLoading(false);
      });
  };

  const [economicCycles, setEconomicCycles] = useState([]);
  const findAllEconimicCycles = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/economiccycle${params}`)
      .then((resp) => {
        setEconomicCycles(resp.data.items);
        lastPage(1, resp.data.totalPages);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los ciclos económicos"
          );
        }
        setIsLoading(false);
      });
  };

  const loadMoreEconomicCycle = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/administration/economiccycle?page=${page}${params}`)
      .then((resp) => {
        setEconomicCycles((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError(
            "Ha ocurrido un error mientras se cargan los ciclos económicos"
          );
        }
        setIsLoadingList(false);
      });
  };

  const [inventories, setInventories] = useState([]);
  const findAllInventories = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/administration/inventory${params}`)
      .then((resp) => {
        setInventories(resp.data.items);
        lastPage(1, resp.data.totalPages);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los inventarios");
        }
        setIsLoading(false);
      });
  };

  const loadMoreInventories = async (options, page) => {
    if (isLoadingList || endReached) return;
    setIsLoadingList(true);

    const params = options ? `&${translateOptions(options)}` : "";

    await APIServer.get(`/administration/inventory?page=${page}${params}`)
      .then((resp) => {
        setInventories((prev) => prev?.concat(resp.data.items));
        lastPage(page, resp.data.totalPages);
        setIsLoadingList(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargan los inventarios");
        }
        setIsLoadingList(false);
      });
  };

  const [reportData, setReportData] = useState(null)
  const getInventoryStatusReport = async (options) => {
    setIsLoading(true);

    const params = options ? `?${translateOptions(options)}` : "";

    await APIServer.get(`/report/stock/period-inventory${params}`)
      .then((resp) => {
        setReportData(resp.data);
        setIsLoading(false);
      })
      .catch((error) => {
        const message = error.response.message;
        if (message) {
          setError(message);
        } else {
          setError("Ha ocurrido un error mientras se cargaba el estado del inventario");
        }
        setIsLoading(false);
      });
  };

  return {
    isLoading,
    isFetching,
    error,
    paginate,

    //pages
    scores,
    mostSelled,
    max,
    initIndexPage,

    //Authentication
    checkLogin,

    //Products
    products,
    findAllProducts,
    isLoadingList,
    loadMoreProducts,
    endReached,

    //ProductsofArea
    findAllProductsOfArea,
    loadMoreProductsOfArea,

    //Product
    product,
    fetchProduct,
    newProduct,
    deleteProduct,
    clearSearch,
    updateProductLocally,
    deleteProductLocally,
    newProductLocally,
    updateStockProductLocally,

    //Region
    region,
    findAllRegion,

    //Areas
    areas,
    findAllAreas,

    //CashOperation
    cashOperation,
    findAllCashOperation,
    loadMoreCashOperation,

    //Orders
    orders,
    findAllOrders,
    loadMoreOrders,
    initOrdersTabSection,

    //Movements
    movements,
    findAllMovements,
    stockMovement,
    fetchStockMovement,
    loadMoreMovents,
    newStockMovement,

    // Compounds
    manageCompounds,

    //Supplies
    supplies,
    fetchSupplies,
    manageSupplies,

    //Category Product
    fetchCategoryProduct,
    categoryProduct,

    //Category Sales
    fetchCategorySales,
    categorySales,
    setCategorySales,

    //Product Addons
    fetchProductAddons,
    productAddons,

    //Manufactures
    manageManufacture,
    manufacture,
    fetchManufacture,

    //EconomicCycle
    economicCycles,
    findAllEconimicCycles,
    loadMoreEconomicCycle,

    //Inventories
    inventories,
    findAllInventories,
    loadMoreInventories,

    //Users
    users,
    findAllUsers,
    loadMoreUsers,

    //Clients
    clients,
    findAllClients,
    loadMoreClients,

    //Resouce
    resouce,
    findAllResouce,
    loadMoreResouce,

    //Sales
    sales,
    findAllSales,
    loadMoreSales,

    //Reports
    reportData,
    getInventoryStatusReport
  };
};
export default useServer;
