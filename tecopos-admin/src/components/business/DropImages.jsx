import { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlus, faCircleMinus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteImage,
  postOnDummyImage,
  selectBanner,
  selectLogo,
} from "../../store/imagesSlice";
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
export default function DropImages(props) {
  const { isLogo, isBanner, styleImage } = props;
  const Logo = useSelector(selectLogo);
  const Banner = useSelector(selectBanner);
  const dispatch = useDispatch();

  const onDropImages = useCallback(async (acceptedFile) => {
    const file = acceptedFile;
    if (file) {
      let formData = new FormData();
      file.map((item) => formData.append("file", item));
      isLogo && dispatch(postOnDummyImage({ data: formData, type: "logo" }));
      isBanner &&
        dispatch(postOnDummyImage({ data: formData, type: "banner" }));
    }
  }, []);
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 400000,
    noKeyboard: true,
    multiple: false,
    onDrop: onDropImages,
  });
  const handleDelete = (e) => {
    e.stopPropagation();
    isLogo && dispatch(deleteImage({ data: Logo.id, type: "logo" }));
    isBanner && dispatch(deleteImage({ data: Banner.id, type: "banner" }));
  };

  return (
    <div className="overflow-hidden bg-white rounded-md w-full h-full group">
      {isLogo && (
        <span
          className={`${
            Object.entries(Logo).length === 0
              ? "w-full h-full bg-secondary"
              : "w-0 h-0 group-hover:w-full group-hover:h-full bg-secondary/30"
          } overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full absolute hover:delay-150 duration-300 delay-0 flex justify-center gap-8 items-center  z-40`}
        >
          <i {...getRootProps()}>
            <FontAwesomeIcon
              className={`cursor-pointer  w-8 hover:text-primary/95 z-20 h-8 text-white`}
              icon={faCirclePlus}
            />
          </i>

          {Object.entries(Logo).length !== 0 && (
            <FontAwesomeIcon
              onClick={handleDelete}
              className="cursor-pointer mb-1  w-8 hover:text-primary/95 z-20 h-8 text-white"
              icon={faCircleMinus}
            />
          )}
        </span>
      )}
      {isBanner ? (
        <span
          className={`${
            Object.entries(Banner).length === 0
              ? "w-full h-full bg-secondary"
              : "w-0 h-0 group-hover:w-full group-hover:h-full bg-secondary/30"
          } overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md absolute hover:delay-150 duration-300 delay-0 flex justify-center gap-12 items-center  z-40`}
        >
          <i {...getRootProps()}>
            <FontAwesomeIcon
              className={`cursor-pointer w-8 hover:text-primary/95 z-20 h-8 text-white`}
              icon={faCirclePlus}
            />
          </i>

          {Object.entries(Banner).length !== 0 && (
            <FontAwesomeIcon
              onClick={handleDelete}
              className="cursor-pointer w-8 mb-1 hover:text-primary/95 z-20 h-8 text-white"
              icon={faCircleMinus}
            />
          )}
        </span>
      ) : (
        ""
      )}
      <input {...getInputProps()} />
      <img
        src={
          isBanner
            ? Banner.src === undefined || null
              ? ""
              : Banner.src
            : isLogo && (Logo.src === undefined || null)
            ? ""
            : Logo.src
        }
        alt=""
        className={`${styleImage} object-cover w-full h-full ${
          isBanner && "relative"
        }`}
      />
    </div>
  );
}
