import { useState } from "react";
import { useAppDispatch } from "../store/hooks";
import query from "./APIServices";
import {
  BusinessInterface,
  UserInterface,
} from "../interfaces/ServerInterfaces";
import useServer from "./useServerMain";
import { initSystem } from "../store/actions/globals";

const useInitialLoad = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dispatch = useAppDispatch();

  const { manageErrors } = useServer();

  const freePromise = async (
    business: BusinessInterface,
    user: UserInterface
  ) => {
    return await Promise.all([
      query.get("/administration/measures"), // Measures
      query.get("/administration/salescategory?all_data=true"), //Sales Categories
      query.get("/public/provinces?all_data=true"), //Provinces
      query.get("/public/municipalities?all_data=true"), //Municipality
      query.get("/administration/my-branches"), //Branches Data
      query.get("/administration/area?all_data=true"), //Areas
    ]).then((resp) => {
      return {
        business,
        user,
        measures: resp[0].data,
        salesCategories: resp[1].data.items,
        provinces: resp[2].data.items,
        municipality: resp[3].data.items,
        branches: resp[4].data,
        areas: resp[5].data.items,
      };
    });
  };

  const adminPromise = async (
    business: BusinessInterface,
    user: UserInterface
  ) => {
    return await Promise.all([
      query.get("/administration/my-branches"), //Branches Data
      query.get("/administration/area?all_data=true"), //Areas
      query.get("/administration/measures"), // Measures
      query.get("/administration/productcategory?all_data=true"), //Product Categories
      query.get("/administration/salescategory?all_data=true"), //Product Categories Sales
      query.get("/security/users?all_data=true"), //System Users
      query.get("/security/roles/admin"), //roles
      query.get("/administration/variation/attributes"), //Atributos de los productos variables
      query.get(`/administration/paymentways`), //paymentWays
      query.get(`/administration/humanresource/personcategory?all_data=true`), //personCategories
      query.get(`/administration/humanresource/personpost?all_data=true`), //personPosts
      query.get(`/administration/fixedcostcategory?all_data=true`), //FixedCost
    ]).then((resp) => ({
      business,
      user,
      branches: resp[0].data,
      areas: resp[1].data.items,
      measures: resp[2].data,
      productCategories: resp[3].data.items,
      salesCategories: resp[4].data.items,
      businessUsers: resp[5].data.items,
      roles: resp[6].data,
      product_attributes: resp[7].data,
      paymentWays:resp[8].data,
      personCategories:resp[9].data.items,
      personPosts:resp[10].data.items,
      fixedCostCategories: resp[11].data.items,
    }));
  };

  const commonPromise = async (
    business: BusinessInterface,
    user: UserInterface
  ) => {
    return await Promise.all([
      query.get("/administration/my-branches"), //Branches Data
      query.get("/administration/area?all_data=true"), //Areas
      query.get("/administration/measures"), // Measures
      query.get("/administration/productcategory?all_data=true"), //Product Categories
      query.get("/administration/salescategory?all_data=true"), //Product Categories Sales
      query.get("/administration/variation/attributes"), //Atributos de los productos variables
    ]).then((resp) => ({
      business,
      user,
      branches: resp[0].data,
      areas: resp[1].data.items,
      measures: resp[2].data,
      productCategories: resp[3].data.items,
      salesCategories: resp[4].data.items,
      product_attributes: resp[5].data,
    }));
  };

  const minimalPromise = async (
    business: BusinessInterface,
    user: UserInterface
  ) => {
    return await Promise.all([
      query.get("/public/provinces?all_data=true"), //Provinces
      query.get("/public/municipalities?all_data=true"), //Municipality
      query.get(`/administration/humanresource/personcategory?all_data=true`), //personCategories
      query.get(`/administration/humanresource/personpost?all_data=true`), //personPosts
      query.get("/administration/my-branches"), //Branches Data
      query.get("/administration/area?all_data=true"), //Areas
    ]).then((resp) => {
      return {
        business,
        user,
        provinces: resp[0].data.items,
        municipality: resp[1].data.items,
        personCategories: resp[2].data.items,
        personPosts: resp[3].data.items,
        branches: resp[4].data,
        areas: resp[5].data.items,
      };
    });
  };

  const initLoad = async () => {
    await Promise.all([
      query.get("/administration/my-business"), //Business Info
      query.get("/security/user"), //User data
    ])
      .then(async (resp) => {
        const business: BusinessInterface = resp[0].data;
        const user: UserInterface = resp[1].data;
        if (
          business.subscriptionPlan.code !== "FREE" &&
          user.roles.some((itm) =>
            ["GROUP_OWNER", "OWNER", "ADMIN"].includes(itm.code)
          )
        ) {
          await adminPromise(business, user).then((resp) =>
            dispatch(initSystem(resp))
          );
        } else if (
          business.subscriptionPlan.code !== "FREE" &&
          user.roles.some((itm) =>
            ["MANAGER_AREA", "PRODUCT_PROCESATOR", "MANAGER_SHIFT", "ANALYSIS_REPORT"].includes(
              itm.code
            )
          )
        ) {
          await commonPromise(business, user).then((resp) =>
            dispatch(initSystem(resp))
          );
        } else if (
          business.subscriptionPlan.code !== "FREE" &&
          user.roles.some((itm) =>
            ["MANAGER_HUMAN_RESOURCES"].includes(itm.code)
          )
        ) {
          await minimalPromise(business, user).then((resp) =>
            dispatch(initSystem(resp))
          );
        } else {
          await freePromise(business, user).then((resp) =>
            dispatch(initSystem(resp))
          );
        }
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  return {
    initLoad,
    isLoading,
  };
};

export default useInitialLoad;
