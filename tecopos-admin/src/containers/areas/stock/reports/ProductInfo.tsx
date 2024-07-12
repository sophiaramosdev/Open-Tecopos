import {useEffect} from "react";
import useServerProduct from "../../../../api/useServerProducts";

interface UserInfoInterface {
    id?: number | null;
}

export default function ProductInfo({id}:UserInfoInterface) {
    const {getProduct, isLoading,product} = useServerProduct();
    useEffect(() => {
         getProduct(String(id))
    }, [])


    return <>

        </>
}
