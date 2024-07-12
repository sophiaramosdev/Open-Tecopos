import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MyButton = ({
  customFunc,
  text,
  icon,
  ClassName,
  ClassColor,
  condition,
  hiddenOnCondition,
  loading,
  rightIcon,
}) => {
  return (
    <>
      {!hiddenOnCondition && (
        <button
          style={{ opacity: condition ? "50%" : "100%", color: "#fff" }}
          disabled={condition}
          type="button"
          className={`${ClassName} ${ClassColor} ${
            condition ? "" : `hover:${ClassColor}/90`
          } font-semibold rounded-md p-2 flex gap-2 items-center justify-center`}
          onClick={customFunc}
        >
          {loading ? (
            <span className="flex items-center">
              <FontAwesomeIcon
                icon={icon}
                className="h-5 w-5 animate-spin text-white"
                aria-hidden="true"
              />
            </span>
          ) : (
            ""
          )}
          <p className="capitalize">{text}</p>
          {rightIcon && (
            <FontAwesomeIcon icon={rightIcon} className="h-5 w-5 text-white" />
          )}
        </button>
      )}
    </>
  );
};

export default MyButton;
