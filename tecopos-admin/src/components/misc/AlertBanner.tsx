import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'

export default function AlertBanner() {
  return (
    <div className="border-l-4 border-red-400 bg-red-50 p-4 flex flex-grow w-full rounded-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            You have no credits left.

          </p>
        </div>
      </div>
    </div>
  )
}
