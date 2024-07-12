import { HomeIcon } from '@heroicons/react/20/solid'
import { Link } from 'react-router-dom';

type NavAttr = {

    name: string,
    href: string
    current: boolean
};

export interface ArrayNavBarPages {
    routesArray: NavAttr[]
}

export const FullWithBar = (

        { routesArray }: ArrayNavBarPages
    
    ) => {

        return (
            <nav className="flex border-b border-gray-200 max-w-full"  aria-label="Breadcrumb">
            <ol role="list" className="w-max flex max-w-screen-xl space-x-4 px-4 sm:px-6 lg:px-8">
                <li className="flex">
                <div className="flex items-center">
                    <Link to="/" className="text-gray-400 hover:text-gray-500">
                        <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <span className="sr-only">Home</span>
                    </Link>
                </div>
                </li>
                {routesArray.map((page) => (
                <li key={page.name} className="flex">
                    <div className="flex items-center">
                    <svg
                        className="h-full w-6 flex-shrink-0 text-gray-200"
                        viewBox="0 0 24 44"
                        preserveAspectRatio="none"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
                    </svg>
                    <Link
                        to={page.href}
                        className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                        aria-current={page.current ? 'page' : undefined}
                    >
                        {page.name}
                    </Link>
                    </div>
                </li>
                ))}
            </ol>
            </nav>
        )
}