import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/solid";

export default function ErrorPage() {
  return (
    <>
      <div className="flex h-screen flex-col bg-white pt-16 pb-12">
        <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="flex flex-shrink-0 justify-center">
            <a href="/" className="inline-flex">
              <span className="sr-only">Your Company</span>
              <img className="h-20 w-auto" src="/logo512.png" alt="" />
            </a>
          </div>
          <div className="py-10">
            <div className="text-center">
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                ¡Ups, ha ocurrido un error!
              </h1>
              <p className="mt-2 text-base text-gray-500">
                Ha ocurrido un error inesperado. Por favor, contacte con su
                administrador.
              </p>
              <div className="mt-6 flex flex-col gap-y-2 justify-center">
                <a
                  href={window.location.href}
                  className="text-base font-medium text-orange-600 hover:text-orange-500"
                >
                  <span className="inline-flex gap-2 items-center">
                    Ir atrás
                    <ArrowUturnLeftIcon className="h-3 text-orange-600 font-semibold" />
                  </span>
                </a>
                <a
                  href="/"
                  className="text-base font-medium text-orange-600 hover:text-orange-500"
                >
                  <span className="inline-flex gap-2 items-center">
                    Volver inicio
                    <ArrowRightIcon className="h-3 text-orange-600 font-semibold" />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
