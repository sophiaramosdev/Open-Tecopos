import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { Disclosure } from "@headlessui/react";
import { useState } from "react";
interface AccordionItemProps {
  children: React.ReactNode;
  title: string;
  className?: string;
  open?: boolean;
}
const AccordionItem = ({
  children,
  title,
  className,
  open = false,
}: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <Disclosure defaultOpen={open}>
      {({ open }) => (
        <>
          <div className=" w-full">
            <Disclosure.Button className="flex w-full justify-between rounded-lg px-4 py-2 text-left text-sm font-medium  hover:bg-gray-200 focus:outline-none focus-visible:ring ">
              <span className="block text-sm font-medium text-gray-700">
                {title}
              </span>
              <ChevronUpIcon
                className={`${
                  open ? "rotate-180 transform" : ""
                } h-5 w-5 text-gray-500-500 duration-150`}
              />
            </Disclosure.Button>
            {/* <Transition
                show={open}
                enter="transition-opacity duration-75"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              > */}
            {/* <Disclosure.Panel className="px-4 pb-2 "> */}
            <div className={`${open ? "block" : "hidden"}`}>{children}</div>
            {/* </Disclosure.Panel> */}
            {/* </Transition> */}
          </div>
        </>
      )}
    </Disclosure>
  );
};

export default AccordionItem;
