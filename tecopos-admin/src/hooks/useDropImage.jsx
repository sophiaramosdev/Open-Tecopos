import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  postOnDummyImage,
  selectImagesHasError,
  setOnError,
} from "../store/imagesSlice";
import { imageAcepted } from "../utils/dummy";

const useDropImage = ({ multiple, maxSize, type }) => {
  const dispatch = useDispatch();
  const hasError = useSelector(selectImagesHasError);
  const onDrop = useCallback((acceptedFile) => {
    const file = acceptedFile;
    if (file) {
      const data = new FormData();
      file.map((item) => data.append("file", item));
      dispatch(postOnDummyImage({ data, type }));
    } else {
      toast.info(
        `El tamaño de la imagen debe ser menor a los ${maxSize}KB`,
        3000
      );
    }
  }, []);
  const { getRootProps, getInputProps } = useDropzone({
    imageAcepted,
    maxSize: maxSize * 1000,
    noKeyboard: true,
    multiple: multiple,
    onDrop: onDrop,
  });
  useEffect(() => {
    dispatch(setOnError());
  }, [hasError]);
  const toastOnError = () => {
    switch (type) {
      case "getImages":
        return hasError ? toast.error("Error al cargar la galería") : "";
      case "postDummy":
      case "productImage":
      case "gallery":
        return hasError ? toast.error("Una imagen no es aceptada") : "";
      default:
        return "";
    }
  };
  return { getRootProps, getInputProps, toastOnError };
};

export default useDropImage;
