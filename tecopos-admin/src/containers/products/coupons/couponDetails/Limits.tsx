
import { useContext } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import { DetailCouponContext } from "./DetailsContainer";
import Toggle from "../../../../components/forms/Toggle";

interface PageProps {
    source: string | null
}


const Limits = ({ source }: PageProps) => {


    const { coupon, updateCoupon, updateState } =
        useContext(DetailCouponContext);
    const { control, handleSubmit } = useForm();


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
                                label="Límite de uso por cupón"
                                name="usageLimit"
                                control={control}
                                placeholder="0.00"
                                rules={{ required: "Este campo es requerido" }}
                                defaultValue={coupon?.usageLimit ? coupon.usageLimit : 0}
                            />
                        </div>
                        <div className="">
                            <Input
                                disabled={source === "modal" ? false : true}
                                label="Límite de uso por artículos"
                                name="limitUsageToXItems"
                                control={control}
                                placeholder="0.00"
                                rules={{ required: "Este campo es requerido" }}
                                defaultValue={coupon?.limitUsageToXItems ? coupon.limitUsageToXItems : 0}
                            />
                        </div>
                        <div className="">
                            <Input
                                disabled={source === "modal" ? false : true}
                                label="Límite de uso por usuarios"
                                name="usageLimitPerUser"
                                control={control}
                                placeholder="0.00"
                                rules={{ required: "Este campo es requerido" }}
                                defaultValue={coupon?.usageLimitPerUser ? coupon.usageLimitPerUser : 0}
                            />
                        </div>

                        <Toggle
                            name="excludeOnSaleProducts"
                            control={control}
                            defaultValue={coupon?.excludeOnSaleProducts}
                            title="Excluir productos en rebajas"
                            disabled={source === "modal" ? false : true}
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

export default Limits
