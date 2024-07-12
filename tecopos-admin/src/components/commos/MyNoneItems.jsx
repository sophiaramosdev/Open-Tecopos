import { faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MyNoneItems = ({ title, subtitle }) => {
  return (
    <div className="flex w-full h-full justify-center items-center flex-col text-center p-8">
      <FontAwesomeIcon
        icon={faBoxOpen}
        className="h-16 w-16 text-gray-500 "
        aria-hidden="true"
      />
      <h3 className="text-sm font-medium text-gray-500">
        {title ? title : " No hay productos que mostrar"}
      </h3>
      <p className="text-sm text-gray-500">
        {subtitle ? subtitle : "Introduzca un criterio de búsqueda"}
      </p>
    </div>
  );
};

export default MyNoneItems;
