import { Switch } from "@headlessui/react";
import React from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const MySwitch = ({
  label,
  onChange,
  value,
  utilityLabel,
  utilityContainer,
  utilityContainerGeneral,
  isDisabled,
  name,
  customFunc,
}) => {
  return (
    <div onClick={customFunc} className={utilityContainerGeneral}>
      {!!label && (
        <label className={`block ${utilityLabel}  text-slate-700`}>
          {label}
        </label>
      )}
      <div className={utilityContainer}>
        <Switch
          name={name}
          checked={value}
          onChange={onChange}
          disabled={isDisabled}
          className={classNames(
            value ? "bg-orange-500" : "bg-slate-200",
            "relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          )}
        >
          <span
            className={classNames(
              value ? "translate-x-5" : "translate-x-0",
              "pointer-events-none relative inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
          >
            <span
              className={classNames(
                value
                  ? "opacity-0 ease-out duration-100"
                  : "opacity-100 ease-in duration-200",
                "absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
              )}
              aria-hidden="true"
            >
              <svg
                className="h-3 w-3 text-slate-400"
                fill="none"
                viewBox="0 0 12 12"
              >
                <path
                  d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className={classNames(
                value
                  ? "opacity-100 ease-in duration-200"
                  : "opacity-0 ease-out duration-100",
                "absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
              )}
              aria-hidden="true"
            >
              <svg
                className="h-3 w-3 text-orange-600"
                fill="currentColor"
                viewBox="0 0 12 12"
              >
                <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
              </svg>
            </span>
          </span>
        </Switch>
      </div>
    </div>
  );
};
export default MySwitch;
