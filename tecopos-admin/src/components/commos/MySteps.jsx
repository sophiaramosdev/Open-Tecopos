import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { selectModalStates } from "../../store/modalProductSlice";

export default function MySteps({ classNameBody, formSteps }) {

  const steps = formSteps;
  
  return (
    <nav aria-label="Progress" className={`${classNameBody}`}>
      <ol
        className={`divide-gray-300 rounded-md border border-gray-300 flex flex-wrap ${
          steps.length > 3 && "divide-y md:divide-y-0"
        }`}
      >
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className={`${
              steps.length > 3 && "last:w-full md:last:w-auto"
            } relative md:flex `}
          >
            {step.status === "complete" ? (
              <a href={step.href} className="group flex w-full items-center">
                <span className="flex items-center p-2 text-sm font-medium">
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center
                 rounded-full bg-primary group-hover:bg-primary"
                  >
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mx-2 text-sm font-medium text-gray-900">
                    {step.name}
                  </span>
                </span>
              </a>
            ) : step.status === "current" ? (
              <a
                href={step.href}
                className="flex items-center p-2 text-sm font-medium"
                aria-current="step"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary">
                  <span className="text-primary">{stepIdx + 1}</span>
                </span>
                <span className="mx-2 text-sm font-medium text-primary">
                  {step.name}
                </span>
              </a>
            ) : (
              <a href={step.href} className="group flex items-center">
                <span className="flex items-center p-2 text-sm font-medium">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-gray-400">
                    <span className="text-gray-500 group-hover:text-gray-900">
                      {stepIdx + 1}
                    </span>
                  </span>
                  <span className="mx-2 text-sm font-medium text-gray-500 group-hover:text-gray-900">
                    {step.name}
                  </span>
                </span>
              </a>
            )}

            {stepIdx !== steps.length - 1 ? (
              <>
                {/* Arrow separator for lg screens and up */}
                <div
                  className="absolute top-0 right-0 h-full w-5 block"
                  aria-hidden="true"
                >
                  <svg
                    className="h-full w-full text-gray-300"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 -2L20 40L0 82"
                      vectorEffect="non-scaling-stroke"
                      stroke="currentcolor"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
