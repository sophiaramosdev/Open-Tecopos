import {
  useForm,
  SubmitHandler,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import {
  Addon,
  Order,
  Product,
  ProductPrice,
} from "../../../interfaces/Interfaces";
import Input from "../../../components/forms/Input";
import Select from "../../../components/forms/Select";
import Button from "../../../components/misc/Button";
import { PencilIcon } from "@heroicons/react/24/outline";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { useEffect, useMemo, useState } from "react";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";
import { useAppSelector } from "../../../store/hooks";
import useServerOnlineClients from "../../../api/useServerOnlineClients";
import { translateMeasure } from "../../../utils/translate";
import { formatCurrency } from "../../../utils/helpers";
import useServerOrders from "../../../api/useServerOrders";
import Check from "../../../components/forms/GenericCheck";
import { toast } from "react-toastify";
import { ProductInterface } from "../../../interfaces/ServerInterfaces";
import { FaMoneyCheckDollar } from "react-icons/fa6";
import { format } from "date-fns";

interface OrderFormProps {
  action: Function;
  isFetching: boolean;
  initialValues?: Order | null;
  closeModal?: Function;
  ecoCycleId?: number;
}

interface SaleProduct extends ProductInterface {
  productId: number;
  quantityForSale: number;
  quantity: number;
  price: ProductPrice;
}

const OrderForm = ({
  action,
  isFetching,
  initialValues,
  closeModal,
  ecoCycleId,
}: OrderFormProps) => {
  const [addDiscount, setAddDiscount] = useState(false);
  const [addShipping, setAddDShipping] = useState(false);
  const [search, setSearch] = useState("");

  const { business, user } = useAppSelector((state) => state.init);
  const { areas: allAreas } = useAppSelector((state) => state.nomenclator);
  const { getAllClients, allClients } = useServerOnlineClients();
  const { saleProducts, getProductsByArea, isLoading } = useServerOrders();

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, dirtyFields },
    register,
    getFieldState,
    resetField,
  } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: { selledProducts: [] },
  });

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    
    let newOrder = {
      "areaSalesId": data.areaSalesId, 
      "closedDate": format(new Date(), 'yyyy-MM-dd HH:mm:ss'), 
      "createdAt": format(new Date(), 'yyyy-MM-dd HH:mm:ss'), 
      "currenciesPayment": [{
          "amount": 1000, 
          "codeCurrency": "CUP", 
          "paymentWay": "CASH"
          }], //unknown value
      "discount": data.discount?.amount ?? 0, 
      "houseCosted": false, //unknown value
      "managedById": user?.id, 
      "name": data.name, 
      "observations": "", //unknown value
      "prices": [{"codeCurrency": "CUP", "price": 300}], //unknown values
      "amountReturned": {"amount": 700, "codeCurrency": "CUP"},//unknown values
      "salesById": user?.id, 
      "selledProducts": data.selledProducts.map((product: SaleProduct) => ({
        "addons": [],
        "priceTotal": {
          "amount": product.price.price * product.quantityForSale,
          "codeCurrency": product.price.codeCurrency
        },
        "priceUnitary": {
          "amount": product.price.price,
          "codeCurrency": product.price.codeCurrency,
        },
        "productId": product.productId,
        "productionAreaId": null, //unknown values
        "quantity": product.quantityForSale,
      }) ), 
      "status": 'CREATED', 
      "tipPrice": null, //unknown values
      "updatedAt": format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  }
  
  // if (addShipping) newOrder["shippingPrice"] = data.shippingPrice;
  // action(newOrder);

    // let newOrder = {
    //   name: data.name,
    //   clientId: data.clientId,
    //   economicCycleId: ecoCycleId,
    //   //origin: 'pos',
    //   areaSalesId: data.areaSalesId,
    //   status: "CREATED",
    //   managedById: user?.id,
    //   salesById: user?.id,
    //   selledProducts: data.selledProducts.map((product: SaleProduct) => ({
    //     productId: product.productId,
    //     quantity: product.quantityForSale,
    //     //@ts-ignore
    //     variationId: product.variationId,
    //     //@ts-ignore
    //     variation: product.variation,
    //     priceUnitary: {
    //       amount: product.price.price,
    //       codeCurrency: product.price.codeCurrency,
    //     },
    //     priceTotal: {
    //       amount: product.price.price * product.quantityForSale,
    //       codeCurrency: product.price.codeCurrency,
    //     },
    //   })),
    //   discount: data.discount?.amount ?? 0,
    // };
    //@ts-ignore

  };

  useEffect(() => {
    getAllClients();
  }, []);

  const clients = useMemo(
    () =>
      allClients.map((client) => {
        return {
          id: client.id,
          name:
            client.firstName || client.lastName
              ? `${client.firstName}${
                  client.lastName ? " " + client.lastName : ""
                } ${client.email ? " (" + client.email + ")" : ""}`
              : client.email,
        };
      }),
    [allClients]
  );

  const areaSalesId = useWatch({ control, name: "areaSalesId" });
  useEffect(() => {
    if (areaSalesId) {
      getProductsByArea(areaSalesId, {
        all_data: true,
      });
      resetField("selledProducts");
    }
  }, [areaSalesId]);

  const areas = useMemo(
    () =>
      allAreas
        .filter((area) => area.type === "SALE")
        .map((area) => {
          return {
            id: area.id,
            name: area.name,
          };
        }),
    []
  );

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "selledProducts",
    rules: { required: "Este campo es requerido" },
  });

  //@ts-ignore
  const obtainingProductPrice = (product: Product | Addon) => {
    let price;
    if (product.onSalePrice) {
      price = {
        price: product.onSalePrice.amount,
        codeCurrency: product.onSalePrice.codeCurrency,
      };
      //@ts-ignore
    } else if (product.price) {
      //@ts-ignore
      price = {
        //@ts-ignore
        price: product.price.amount,
        //@ts-ignore
        codeCurrency: product.price.codeCurrency,
      };
    } else if (product.prices.length === 1) {
      price = product.prices[0];
    } else if (ecoCycleId) {
      const found = product.prices.find(
        (price: ProductPrice) => price.priceSystemId === ecoCycleId
      );
      if (found) {
        price = found;
      } else {
        price = product.prices.find((price: ProductPrice) => price.isMain);
      }
    } else {
      price = product.prices.find((price: ProductPrice) => price.isMain);
    }

    return price;
  };

  //@ts-ignore
  const availableProducts: SaleProduct[] = useMemo(() => {
    return saleProducts
      .filter((product) => product.quantity > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        measure: product.measure,
        quantity: product.quantity,
        price: obtainingProductPrice(product),
        quantityForSale: 0,
        //@ts-ignore
        variations: product.variations?.length
          ? //@ts-ignore
            product.variations
              .filter((variation: Product) => variation.quantity > 0)
              .map((variation: Product) => ({
                productId: variation.id,
                name: variation.name,
                measure: variation.measure,
                quantity: variation.quantity,
                price: obtainingProductPrice({
                  ...variation,
                  prices: product.prices,
                }),
                quantityForSale: 0,
                widthVariations: false,
              }))
          : [],
      }));
  }, [saleProducts]);

  const findProductIndex = (productId: number) =>
    //@ts-ignore
    fields.findIndex((product) => Number(product.productId) === productId);

  const Amount = ({
    productId,
    price,
    currency,
  }: {
    productId: number;
    price: number;
    currency: string;
  }) => {
    const selledProducts = useWatch({
      control,
      name: "selledProducts.quantityForSale",
      defaultValue: fields,
    });

    const importCalculated = formatCurrency(
      //@ts-ignore
      (selledProducts?.find(
        (product: SaleProduct) => product.productId === productId
      )?.quantityForSale || 0) * price,
      currency
    );

    return <span className='w-["25%"]'>{importCalculated}</span>;
  };

  const calcTotalAmount: (arr: [any]) => {
    totalValue: number;
    currency: string;
  } = (results) => {
    let totalValue = 0;
    let currency = business?.costCurrency ?? "CUP";

    for (const key in results) {
      for (const value in results[key]) {
        if (Array.isArray(results[key][value])) {
          totalValue += calcTotalAmount(results[key][value]).totalValue;
        } else if (value === "quantityForSale") {
          currency = results[key]["price"].codeCurrency;
          totalValue += results[key][value] * results[key]["price"].price;
        }
      }
    }

    return { totalValue, currency };
  };

  const TotalAmount = () => {
    const selectedProducts = useWatch({ control, name: "selledProducts" });
    const { totalValue, currency } = calcTotalAmount(selectedProducts);

    return (
      <div className='flex flex-row gap-4 justify-end pt-2 pr-10 flex-shrink-0 text-sm'>
        <span className=' text-gray-700 font-medium'>Subtotal:</span>
        <span className=' text-gray-500'>
          {formatCurrency(totalValue, currency)}
        </span>
      </div>
    );
  };

  const tableData: Array<DataTableInterface> = useMemo(() => {
    return availableProducts
      ?.filter((product: SaleProduct) =>
        search
          ? product.name.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .map((product: SaleProduct) => {
        const fieldIndex = findProductIndex(product.productId);
        return {
          payload: {
            Nombre: (
              <div
                className='flex flex-row gap-2 items-center w-["50%"]'
                key={`productName-${product.productId}`}>
                <Check
                  value={"checkProduct"}
                  key={"checkProduct-" + product.productId}
                  onChange={(e) => {
                    if (e.target.checked && fieldIndex == -1) {
                      append(product);
                    } else {
                      remove(fieldIndex);
                    }
                  }}
                  checked={fieldIndex !== -1}
                />
                <span>{product.name}</span>
              </div>
            ),
            Cantidad: (
              <div
                className='flex gap-2 items-center justify-center w-["25%"]'
                key={`productQuantity-${product.productId}`}>
                <input
                  id={"productQuantity-" + product.productId}
                  name='productQuantity'
                  disabled={fieldIndex == -1}
                  placeholder={`Disponible: ${product.quantity}`}
                  type='number'
                  value={
                    //@ts-ignore
                    fields[fieldIndex]?.quantityForSale || ""
                  }
                  onChange={(e) => {
                    if (Number(e.target.value) <= product.quantity) {
                      e.preventDefault();
                      update(fieldIndex, {
                        ...product,
                        quantityForSale: Number(e.target.value),
                      });
                    } else {
                      e.target.value = e.target.value.substring(
                        0,
                        e.target.value.length - 1
                      );
                      toast.warn(
                        `No puede exceder la cantidad disponible: ${product.quantity}`
                      );
                    }
                  }}
                  className='focus:ring-gray-400 focus:border-gray-600 block h-7 w-36 rounded-md sm:text-sm placeholder:text-slate-400'
                />
                {translateMeasure(product.measure)}
              </div>
            ),
            Importe: (
              <Amount
                key={`productImport-${product.productId}`}
                productId={product.productId}
                price={product.price.price}
                currency={product.price.codeCurrency}
              />
            ),
          },
        };
      });
  }, [availableProducts, search, Amount, fields]);

  const selledProductsState = getFieldState("selledProducts");

  return (
    <div className='space-y-8 divide-y divide-gray-300'>
      <div className='flex justify-between md:justify-center mb-4'>
        <h3 className='md:text-lg text-md font-medium leading-6 text-gray-900'>
          {initialValues ? `Editar ${initialValues.name}` : "Nueva Orden"}
        </h3>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='space-y-8 divide-y divide-gray-300'>
        <div className='space-y-1 sm:space-y-5'>
          <div className='pt-2'>
            <div className='flex flex-col'>
              {/*NAME */}
              <Input
                name='name'
                control={control}
                label={"Nombre"}
                placeholder='Nombre de la orden'
                //rules={{ required: 'Este campo es requerido' }}
              />
              {/*CLIENTE */}
              <Select
                name='clientId'
                control={control}
                label={"Cliente"}
                data={clients}
                //rules={{ required: 'Este campo es requerido' }}
              />
              {/*PUNTO DE VENTA */}
              <Select
                name='areaSalesId'
                control={control}
                label={"Punto de venta"}
                data={areas}
                rules={{ required: "Este campo es requerido" }}
              />
              {/* PRODUCTOS */}
              <div className='py-4 p-0'>
                <span className='flex flex-shrink-0 text-sm font-medium text-gray-700'>
                  Productos
                </span>
                <div
                  className={`${
                    selledProductsState.error
                      ? "border-red-300 text-red-900  focus:border-red-500 focus:ring-red-500"
                      : `focus:ring-gray-500 focus:border-gray-600 text-gray-500`
                  } border relative w-full cursor-pointer rounded-md bg-white shadow-sm sm:text-sm max-h-[296px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300`}>
                  <GenericTable
                    {...register("selledProducts", {
                      required: "Debe seleccionar al menos 1 producto",
                    })}
                    loading={isLoading}
                    tableData={tableData}
                    tableTitles={["Nombre", "Cantidad", "Importe"]}
                    searching={{
                      action: setSearch,
                      placeholder: "Buscar por nombre del producto",
                    }}
                  />
                </div>
                {/* @ts-ignore */}
                {selledProductsState.error?.root && (
                  <p className='absolute text-xs text-red-600'>
                    {selledProductsState.error.root.message}
                  </p>
                )}
                <TotalAmount />
              </div>
              {/* AGREGAR DESCUENTO */}
              <div className='flex items-center'>
                <div className='flex h-6 items-center'>
                  <input
                    id='addDiscount'
                    name='addDiscount'
                    type='checkbox'
                    checked={addDiscount}
                    onChange={() => setAddDiscount((prev) => !prev)}
                    className='h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-600'
                  />
                </div>
                <div className='ml-3 text-sm leading-6'>
                  <label htmlFor='addDiscount'>¿Agregar descuento?</label>
                </div>
              </div>
              <CurrencyAmountInput
                name='discount'
                control={control}
                label='Monto'
                currencies={
                  business?.availableCurrencies.map(
                    (currency) => currency.code
                  ) ?? []
                }
                defaultCurrency={business?.costCurrency ?? "CUP"}
                disabled={!addDiscount}
              />
              {/* AGREGAR ENVÍO */}
              <div className='flex items-center'>
                <div className='flex h-6 items-center'>
                  <input
                    id='addShipping'
                    aria-describedby='addShipping-description'
                    name='addShipping'
                    type='checkbox'
                    checked={addShipping}
                    onChange={() => setAddDShipping((prev) => !prev)}
                    className='h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-600'
                  />
                </div>
                <div className='ml-3 text-sm leading-6'>
                  <label htmlFor='addShipping'>¿Agregar envío?</label>
                </div>
              </div>
              <CurrencyAmountInput
                name='shippingPrice'
                control={control}
                label='Monto'
                currencies={
                  business?.availableCurrencies.map(
                    (currency) => currency.code
                  ) ?? []
                }
                defaultCurrency={business?.costCurrency ?? "CUP"}
                disabled={!addShipping}
              />
            </div>
          </div>
        </div>

        <div className='pt-5'>
          <div className='flex justify-end gap-3'>
            <Button
              color='gray-700'
              textColor='gray-700'
              action={() => {
                closeModal && closeModal(true);
              }}
              name='Cancelar'
              outline
            />

            <Button
              name={initialValues ? "Actualizar" : "Facturar"}
              color='primary'
              icon={
                initialValues ? (
                  <PencilIcon className='h-5' />
                ) : (
                  <FaMoneyCheckDollar className='h-5' />
                )
              }
              type='submit'
              disabled={
                isFetching ||
                isSubmitting ||
                Object.entries(dirtyFields).length === 0
              }
              loading={isFetching || isSubmitting}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
