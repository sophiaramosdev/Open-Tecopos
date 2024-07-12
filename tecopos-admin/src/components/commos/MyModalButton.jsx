import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MyModalButton = ({
  loading,
  disabled,
  className,
  onClick,
  text,
  type,
  icon,
}) => {
  return (
    <button
      type={type ? type : "button"}
      disabled={disabled}
      className={`${className} hover:opacity-90 inline-flex gap-2 justify-center rounded-md border
               px-4 py-2 text-base font-medium w-28
                focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
      onClick={onClick}
    >
      {loading && (
        <span className="flex items-center">
          <FontAwesomeIcon
            icon={icon}
            className="h-5 w-5 animate-spin text-white"
            aria-hidden="true"
          />
        </span>
      )}
      {text}
    </button>
  );
};

export default MyModalButton;
