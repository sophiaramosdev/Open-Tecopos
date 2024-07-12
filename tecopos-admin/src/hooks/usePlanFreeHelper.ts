import { infoPages } from "../utils/dummy";
import { useParams } from "react-router-dom";

export interface AreaInfoInterface {
  image?: string | null;
  title?: string | null;
  text?: string | null;
}

const useHelper = () => {
  
  
  const getPlanFreeAreaType = (type?: string) => {
    let area: AreaInfoInterface;

    switch (type) {
      case "sales":
        area = {
          image: infoPages.puntosDeVenta.image,
          title: infoPages.puntosDeVenta.title,
          text: infoPages.puntosDeVenta.text,
        };
        break;

      case "manufacturer":
        area = {
          image: infoPages.procesados.image,
          title: infoPages.procesados.title,
          text: infoPages.procesados.text,
        };
        break;

      default:
        area = {
          image: infoPages.almacenes.image,
          title: infoPages.almacenes.title,
          text: infoPages.almacenes.text,
        };
        break;
    }

    return area;
  };

  return {
    getPlanFreeAreaType,
  };
};

export default useHelper;
