import {
  useForm,
  useFieldArray,
  SubmitHandler,
  FormProvider,
} from "react-hook-form";
import Button from "../../components/misc/Button";
import { useAppSelector } from "../../store/hooks";
import MultipleDrop from "../../components/misc/Images/MultipleDrop";
import { cleanObj, formatCalendar } from "../../utils/helpers";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import useServerBusiness from "../../api/useServerBusiness";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import FacebookStyleImages from "../../components/misc/Images/FacebookStyleImages";
import GenericImageDrop from "../../components/misc/Images/GenericImageDrop";

const StoreGalery = () => {
  const { control, handleSubmit } = useForm();
  const { business } = useAppSelector((state) => state.init);
  const { editBusiness, isFetching } = useServerBusiness();

  const onSubmit: SubmitHandler<Record<string, string | boolean | number>> = (
    data
  ) => {
    editBusiness(cleanObj(data));
  };

  return (
    <div className="border border-slate-300 rounded-md p-3 relative bg-white">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex justify-end">
          <a
            className="flex justify-end items-center py-2 gap-2 text-slate-500"
            href={`https://tienda.tecopos.com/${business?.slug ?? ""}`}
            target="_blank"
          >
            Ir a la tienda
            <ArrowRightIcon className="h-4 text-slate-500" />
            <BuildingStorefrontIcon className="h-5 text-slate-500" />
          </a>
        </div>

        <div className="border border-gray-400 h-full w-full rounded-lg p-2 overflow-auto scrollbar-none">
          <GenericImageDrop
            name="bannerId"
            control={control}
            className="flex items-center justify-center border border-gray-400 rounded-lg h-64 cursor-pointer overflow-hidden"
            previewDefault={business?.banner?.src}
            previewHash={business?.banner?.blurHash}
          />

          <div className="relative -top-20 left-6">
            <GenericImageDrop
              name="logoId"
              control={control}
              className="h-40 w-40 border border-gray-400 rounded-full bg-gray-100 z-10 cursor-pointer overflow-hidden"
              previewDefault={business?.logo?.src}
              previewHash={business?.logo?.blurHash}
            />
          </div>

          <MultipleDrop
            className="border border-gray-400 border-dashed p-2 rounded"
            name="images"
            control={control}
            previewDefault={business?.images.map((item) => ({
              id: item.id,
              src: item.src,
              hash: item.blurHash,
            }))}
          />
        </div>
        <div className="flex py-2 justify-end">
          <Button
            type="submit"
            color="slate-500"
            name="Actualizar"
            disabled={isFetching}
            loading={isFetching}
          />
        </div>
      </form>
    </div>
  );
};

export default StoreGalery;
