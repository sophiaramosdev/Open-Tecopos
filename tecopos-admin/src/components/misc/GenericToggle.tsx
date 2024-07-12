import { Switch } from "@headlessui/react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface ToggleProps {
  title?: string;
  currentState: boolean;
  changeState: Function;
}

export default function GenericToggle({
  title,
  currentState,
  changeState,
}: ToggleProps) {
  return (
    <Switch.Group as="div" className="flex items-center py-2">
      <Switch
        checked={currentState}
        onChange={(value: boolean) => changeState(value)}
        className={classNames(
          currentState ? "bg-gray-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            currentState ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
      {title && (
        <Switch.Label as="span" className="ml-3">
          <span className="text-md font-medium text-gray-900">{title}</span>
        </Switch.Label>
      )}
    </Switch.Group>
  );
}
