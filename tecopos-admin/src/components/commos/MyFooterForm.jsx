import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MyFooterForm = ({ loading, btnText, searchIcon, customFunc }) => {
  return (
    <div className="flex justify-end p-3 bg-gray-50 text-center sm:px-6">
      <button
        type="submit"
        onClick={customFunc}
        disabled={loading}
        className="justify-center flex gap-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        {loading ? (
          <span className="flex items-center">
            <FontAwesomeIcon
              icon={searchIcon !== undefined ? searchIcon : faSpinner}
              className="h-5 w-5 animate-spin text-white group-hover:text-gray-400"
              aria-hidden="true"
            />
          </span>
        ) : (
          ""
        )}
        <p className="capitalize">{btnText}</p>
      </button>
    </div>
  );
};

export default MyFooterForm;
