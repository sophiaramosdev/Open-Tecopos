import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faImages,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  deleteImage,
  selectBanner,
  selectImages,
  selectImagesHasError,
  selectImagesIsLoading,
  selectImagesType,
  selectLogo,
  updateFiles,
} from "../../store/imagesSlice";
import MyButton from "../commos/MyButton";
import MyFooterForm from "../commos/MyFooterForm";
import DropImages from "./DropImages";
import { useDropImage } from "../../hooks";

export default function BusinessGallery() {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectImagesIsLoading);
  const hasError = useSelector(selectImagesHasError);
  const type = useSelector(selectImagesType);
  const AllImages = useSelector(selectImages);
  const Logo = useSelector(selectLogo);
  const Banner = useSelector(selectBanner);
  const { getRootProps, getInputProps, toastOnError } = useDropImage({
    multiple: true,
    maxSize: 400,
    type: "gallery",
  });

  const onSubmit = async () => {
    let businessTemp = {
      images: [],
      bannerId: Banner.id === undefined ? null : Banner.id,
      logoId: Logo.id === undefined ? null : Logo.id,
    };
    AllImages?.map((item) => businessTemp.images.push(item.id));
    dispatch(updateFiles({ data: businessTemp, type: "gallery" }));
    !hasError && toast.success("La galería ha sido actualizada");
  };
  return (
    <main>
      {toastOnError()}
      <div className="sm:p-3 lg:p-8 flex-1">
        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="shadow sm:rounded-md sm:overflow-hidden">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6 ">
              <div>
                <div className="relative mb-6 w-full h-96">
                  <DropImages isBanner={true} />
                  <div
                    className="absolute bottom-0 translate-y-1/2 z-50 overflow-hidden flex 
                  justify-center items-center ml-5 rounded-full ring-1 ring-white h-32 lg:h-40 w-32 lg:w-40 bg-white"
                  >
                    <DropImages styleContainer={"flex "} isLogo={true} />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full group relative mt-5 px-4 sm:px-6 flex justify-end">
              <li
                className="absolute cursor-pointer w-[118px] h-full opacity-0 z-10 hover:z-0 top-0"
                {...getRootProps()}
              >
                <input {...getInputProps()} />
              </li>
              <MyButton
                loading={isLoading & (type === "postDummy")}
                icon={faSpinner}
                rightIcon={faImages}
                ClassColor="bg-primary/90"
                ClassName="px-4 bg-orange-400 group-hover:bg-primary"
                text="Agregar"
              />
            </div>
            <div className="p-4 sm:p-6 relative">
              <li
                className="absolute w-full opacity-0 z-10 hover:z-0 h-full top-0 left-0"
                {...getRootProps()}
              >
                <input {...getInputProps()} />
              </li>
              <section
                className={`
                ${!AllImages.length && "min-h-[150px]"}
                flex items-center justify-center`}
                aria-labelledby="gallery-heading"
              >
                {!AllImages.length && (
                  <div
                    className="flex absolute items-center justify-center cursor-pointer z-10 border-dashed border border-primary  rounded-lg  w-48 h-28"
                    {...getRootProps()}
                  >
                    <input {...getInputProps()} />
                    <FontAwesomeIcon
                      className="h-10 m-auto w-10 text-primary"
                      icon={faImages}
                    />
                  </div>
                )}

                <ul
                  className="grid justify-center w-full h-full grid-cols-2 gap-4 sm:grid-cols-3
                   sm:gap-6 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {AllImages?.map((file, index) => (
                    <li key={index} className="relative">
                      <div className="group relative block w-full aspect-w-16 aspect-h-12 rounded-lg  overflow-hidden">
                        <button className="group-hover:z-30 group-hover:delay-0 delay-150 -z-10 flex items-center justify-center">
                          <FontAwesomeIcon
                            onClick={() =>
                              dispatch(
                                deleteImage({ data: file.id, type: "gallery" })
                              )
                            }
                            className="m-auto w-8 hover:text-primary/95 group-hover:z-10 h-8 opacity-0 duration-150 group-hover:opacity-100 relative text-white"
                            icon={faTrash}
                          />
                          <span className="w-full h-full bg-secondary/50 absolute duration-150 -left-full group-hover:-left-1/2 top-0"></span>
                          <span className="w-full h-full bg-secondary/50 absolute duration-150 -right-full group-hover:-right-1/2 top-0"></span>
                        </button>
                        {file.src && (
                          <img
                            src={file.src}
                            alt={index}
                            className="object-cover pointer-events-none"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <MyFooterForm
              customFunc={onSubmit}
              loading={isLoading & (type === "updateImage")}
              btnText="actualizar"
            />
          </div>
        </div>
      </div>
      {/* {showModal && (
        <ImageDetails
          onClose={() => setShowModal(false)}
          setImagesUrl={setImagesUrl}
          setSelectedImages={setSelectedImages}
          selectImageIndex={selectImageIndex}
          selectedImages={selectedImages}
          imagesUrl={imagesUrl}
        />
      )} */}
    </main>
  );
}
