
import { useContext, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import { useAppDispatch } from "../../../../store/hooks";
import Button from "../../../../components/misc/Button";
import { DetailCouponContext } from "./DetailsContainer";
import Toggle from "../../../../components/forms/Toggle";
import { ProductInterface } from "../../../../interfaces/ServerInterfaces";
import useServerProduct from "../../../../api/useServerProducts";
import { setAllowedProducts } from "../../../../store/couponRestrictions";
import MultiSelectProducts from "../../../../components/marketing/MultiSelectProducts";
import MultiSelectCategorys from "../../../../components/marketing/MultiSelectCategorys";

interface PageProps {
    source: string | null
}

const Restrictions = ({ source }: PageProps) => {

    const { isLoading } = useServerProduct();
    const { coupon, updateCoupon, updateState } =
        useContext(DetailCouponContext);
    const { control, handleSubmit } = useForm();

    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(setAllowedProducts(coupon?.allowedProducts));
    }, [])


    const onSubmit: SubmitHandler<Record<string, string | number | boolean>> = (
        data
    ) => {
        updateCoupon && updateCoupon(coupon?.id, data, updateState);
    };

    return (
        <div className="min-h-96">
            <div className="content-center">

                <div className="border border-gray-300 p-2 rounded col-span-3">
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-stretch h-full">

                        <div className="">
                            <Input
                                disabled={source === "modal" ? false : true}
                                label="Gasto mínimo"
                                name="minimumAmount"
                                control={control}
                                placeholder="0.00"
                                rules={{ required: "Este campo es requerido" }}
                                defaultValue={coupon?.minimumAmount ? coupon.minimumAmount : 0}
                            />
                        </div>
                        <div className="">
                            <Input
                                disabled={source === "modal" ? false : true}
                                label="Gasto máximo"
                                name="maximumAmount"
                                control={control}
                                placeholder="0.00"
                                rules={{ required: "Este campo es requerido" }}
                                defaultValue={coupon?.maximumAmount ? coupon.maximumAmount : 0}
                            />
                        </div>

                        <Toggle name="individualUse" control={control} defaultValue={coupon?.individualUse} title="Uso individual" disabled={source === "modal" ? false : true} />

                        <MultiSelectProducts
                            label="Productos"
                            name="allowedProducts"
                            control={control}
                            key={1}
                            byDefault={coupon?.allowedProducts}
                            loading={isLoading}
                        />

                        <MultiSelectProducts
                            label="Productos excluidos"
                            name="excludedProducts"
                            control={control}
                            key={2}
                            byDefault={coupon?.excludedProducts}
                            loading={isLoading}
                        />


                        <MultiSelectCategorys
                            label="Categorías"
                            name={"allowedSalesCategories"}
                            control={control}
                            key={3}
                            byDefault={coupon?.allowedSalesCategories}
                            loading={isLoading}
                        />

                        <MultiSelectCategorys
                            label="Categorías excluidas"
                            name={"excludedSalesCategories"}
                            control={control}
                            key={4}
                            byDefault={coupon?.excludedSalesCategories}
                            loading={isLoading}
                        />


                        {
                            source === 'modal' && (
                                <div className="flex justify-end pt-10 self-end">
                                    <Button name="Actualizar" color="slate-600" type="submit" />
                                </div>
                            )
                        }
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Restrictions
