import { useState } from "react";
import query from "./APIServices";
import {
  PaginateInterface,
  ProductionOrder,
  NewOrderInterface,
  ProductionOrderState,
  RecipeInterface,
  FixedCost,
} from "../interfaces/ServerInterfaces";
import { generateUrlParams } from "../utils/helpers";
import useServer from "./useServerMain";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";

const useServerOrderProd = () => {
  const [homeLoading, setHomeLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allOrders, setAllOrders] = useState<ProductionOrder[]>([]);
  const [order, setOrder] = useState<ProductionOrderState | null>(null);
  const [allRecipes, setAllRecipes] = useState<RecipeInterface[]>([]);
  const [recipe, setRecipe] = useState<RecipeInterface | null>(null);
  const { manageErrors } = useServer();

  //ORDERS ++++++++++++++++++++++++++++++++++++++++++++++++
  const getHomeData = async () => {
    setHomeLoading(true);
    await query
      .get("/administration/productionOrder?status=ACTIVE")
      .then((resp) => {
        setAllOrders(resp.data.items);
        resp.data.items.length !== 0 &&
          query
            .get(`/administration/productionOrder/${resp.data.items[0].id}`)
            .then((resp) => setOrder(resp.data));
      })
      .catch((e) => manageErrors(e));
    setHomeLoading(false);
  };

  const getAllOrders = async (filter?: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/administration/productionOrder${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllOrders(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addOrder = async (data: NewOrderInterface, closeModal: Function) => {
    setIsFetching(true);
    await query
      .post("/administration/productionOrder", data)
      .then((resp) => {
        setAllOrders([resp.data, ...allOrders]);
        closeModal();
        toast.success("Se ha creado correctamente la orden");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteOrder = async (id: number, closeModal: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/productionOrder/${id}`, {})
      .then(() => {
        toast.success("Se eliminado correctamente la orden");
        closeModal();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const updateOrder = async (
    id: number,
    data: Partial<ProductionOrder>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/productionOrder/${id}`, data)
      .then(() => {
        closeModal();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getOrder = async (id: number) => {
    setIsLoading(true);
    await Promise.all([
      query.get(`/administration/productionOrder/${id}`),
      query.get(`/administration/productionorder/${id}/fixedcost`),
    ])
      .then((resp) =>setOrder({...resp[0].data, fixedCosts:resp[1].data.items}))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const duplicateOrder = async (
    data: ProductionOrder,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/productionOrder/duplicate", data)
      .then((resp) => {
        closeModal();
        toast.success("Orden duplicada correctamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  //RECIPES+++++++++++++++++++++++++++++++++++++
  const getAllRecipes = async (
    filter?: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/recipe${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllRecipes(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addRecipe = async (data: { name: string }, closeModal: Function) => {
    setIsFetching(true);
    await query
      .post("/administration/recipe", data)
      .then((resp) => {
        setAllRecipes([resp.data, ...allRecipes]);
        closeModal();
        toast.success("Receta guardada con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getRecipe = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/recipe/${id}`)
      .then((resp) => setRecipe(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const editRecipe = async (id: number, data: { name: string }) => {
    setIsFetching(true);
    await query
      .patch(`/administration/recipe/${id}`, data)
      .then((resp) => {
        const newRecipes = [...allRecipes];
        const idx = newRecipes.findIndex((elem) => elem.id === id);
        if (idx !== -1) newRecipes.splice(idx, 1, resp.data);
        setAllRecipes(newRecipes);
        setRecipe(resp.data);
        toast.success("Cambios guardados con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const addRecipeProducts = async (
    id: number,
    data: Record<string, any>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/recipe/manageproducts/${id}`, data)
      .then((resp) => {
        const newRecipes = [...allRecipes];
        const idx = newRecipes.findIndex((elem) => elem.id === id);
        if (idx !== -1) newRecipes.splice(idx, 1, resp.data);
        setAllRecipes(newRecipes);
        callback && callback(resp.data);
        toast.success("Cambios guardados con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const setRecipeState = (recipe: RecipeInterface) => {
    setRecipe(recipe);
  };

  const deleteRecipe = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/recipe/${id}`, {})
      .then(() => {
        const newRecipes = allRecipes.filter((item) => item.id !== id);
        setAllRecipes(newRecipes);
        toast.success("Receta eliminada con éxito");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const setAssociatedProducts = async (
    id: number,
    data: Record<string, any>
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/recipe/associateproducts/${id}`, data)
      .then((resp) => {
        setRecipe(resp.data);
        toast.success("Actualización exitosa");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  //ORDER COSTS+++++++++++++++++++++++++
  const addFixedCost = async (
    orderId:number,
    data: Record<string, string | number>,
    updateStateFunction: Function
  ) => {
    setIsFetching(true);
    await query
      .post(`/administration/productionorder/${orderId}/fixedcost`, data)
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
      .patch(`/administration/productionOrder/fixedcost/${costId}`, data)
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
      .deleteAPI(`/administration/productionorder/fixedcost/${costId}`, {})
      .then(() => updateStateFunction(costId))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateFixedCostState = (    
    cost?: FixedCost,  
    id?:number
  ) => {
    const newFixCost = order!.fixedCosts;
    if(!!cost&&!id){
      newFixCost.push(cost);     
    }else if(!!cost&&!!id){
      const idx = newFixCost.findIndex(itm=>itm.id === id);
      newFixCost.splice(idx, 1, cost)
    }else{
      const idx = newFixCost.findIndex(itm=>itm.id === id);
      newFixCost.splice(idx, 1)
    }
    setOrder({...order!, fixedCosts:newFixCost})
   
  };

  return {
    homeLoading,
    isLoading,
    isFetching,
    paginate,
    allOrders,
    order,
    allRecipes,
    recipe,
    getAllOrders,
    getOrder,
    addOrder,
    updateOrder,
    deleteOrder,
    duplicateOrder,
    getHomeData,
    getAllRecipes,
    addRecipe,
    getRecipe,
    editRecipe,
    addRecipeProducts,
    setRecipeState,
    deleteRecipe,
    addAssociatedProducts: setAssociatedProducts,
    addFixedCost,
    editFixedCost,
    deleteFixedCost,
    updateFixedCostState
  };
};

export default useServerOrderProd;
