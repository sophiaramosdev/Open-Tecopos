import { useContext, useEffect } from "react";
import useServerProduct from "../../../api/useServerProducts";
import { DetailProductContext } from "../DetailProductContainer";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import ImageComponent from "../../../components/misc/Images/Image";
import { translateMeasure } from "../../../utils/translate";
import ProductTypeBadge from "../../../components/misc/badges/ProductTypeBadge";

const Dependencies = () => {
  const { product } = useContext(DetailProductContext);
  const { getProductDependencies, dependencies, isLoading } =
    useServerProduct();
  useEffect(() => {
    product?.id && getProductDependencies(product.id);
  }, []);


  //Data for table -------------------------------------------------------------
  const tableTitles = ["Producto", "Tipo", "Cantidad", "Unidad de medida"];
  const tableData: DataTableInterface[] =
    dependencies.map((item) => ({
      rowId: item.id,
      payload: {
        Producto: (
          <div className="inline-flex items-center gap-2">
            <ImageComponent
              className="h-10 w-10 rounded-full"
              src={item?.images[0]?.src}
              hash={item?.images[0]?.blurHash}
            />
            <p>{item.name}</p>
          </div>
        ),
        Tipo: <ProductTypeBadge type={item.type} />,
        Cantidad: item.quantity,
        "Unidad de medida": translateMeasure(item.measure),
      },
    })) ?? [];

  //-----------------------------------------------------------------------------
  return (
    <div className="border border-slate-300 rounded-md h-[34rem] p-5 overflow-auto scrollbar-thin pr-5 scrollbar-thumb-slate-300">
      <GenericTable tableTitles={tableTitles} tableData={tableData} loading={isLoading}/>
    </div>
  );
};

export default Dependencies;
