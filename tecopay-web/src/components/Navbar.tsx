import { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';

import { IoCloudOfflineOutline, IoLogoWebComponent } from 'react-icons/io5';
import { useAppSelector } from '../store/hooks';
import useServerMain from '../api/useServer';
import LoadingSpin from './misc/LoadingSpin';
import Modal from './modals/GenericModal';
import PasswordModal from './app/PasswordModal';
import UserModal from './app/UserModal';
import Logo from '../assets/png/logo-tecopay.png';
import { ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/solid';

const Navbar = () => {
	const { logOut, isFetching } = useServerMain();
	const {user} = useAppSelector(state=>state.init)


	//--------------------------------------------------------------------------------
	//Licence alert ---------------------------------------------------------
	let difference: number | undefined;
	//------------------------------------------------------------------------
	return (
		<>
			<div
				className={`fixed w-full top-0 z-40 flex h-16 flex-shrink-0 bg-${
					difference && difference >= 0 ? 'red' : 'gray'
				}-50 shadow`}
			>
				<div className='flex flex-1 justify-between items-center gap-10'>
					<div className='flex'>
						<div className='w-16 h-16 self-center mt-3'>
							<img className='' src={Logo} alt='Logo de Tecopay' />
						</div>
						<h4 className=' flex items-center font-semibold'>Tecopay</h4>
					</div>

					{!navigator.onLine && (
						<div className='flex flex-grow justify-center items-center gap-2 '>
							<IoCloudOfflineOutline className='text-red-500 font-semibold' />
							<h5 className='text-red-500 font-semibold'>Sin conexión</h5>
						</div>
					)}

					<div className='inline-flex gap-5'>
						<div className='mr-6 flex items-center md:ml-6 flex-shrink-0'>
							{/* Profile dropdown */}
							<Menu as='div' className='relative ml-3'>
								<div>
									<Menu.Button className='flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'>
										<span className='sr-only'>Open user menu</span>
										<img
											className='h-8 w-8 rounded-full'
											src={
												user?.avatar?.url ??
												require('../assets/user-default.jpg')
											}
											alt=''
										/>
									</Menu.Button>
								</div>
								<Transition
									as={Fragment}
									enter='transition ease-out duration-100'
									enterFrom='transform opacity-0 scale-95'
									enterTo='transform opacity-100 scale-100'
									leave='transition ease-in duration-75'
									leaveFrom='transform opacity-100 scale-100'
									leaveTo='transform opacity-0 scale-95'
								>
									<Menu.Items className='absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
										<Menu.Item>
											<div>
												<div className='relative flex items-center rounded-lg bg-white px-2 py-2 gap-2'>
													<div className='flex-shrink-0'>
														<img
															className='h-12 w-12 rounded-full'
															src={
																user?.avatar?.url ??
																require('../assets/user-default.jpg')
															}
															alt=''
														/>
													</div>
													<div className='min-w-0 flex-1'>
														<a href='#' className='focus:outline-none'>
															<span
																className='absolute inset-0'
																aria-hidden='true'
															/>
															<p className='text-sm font-medium text-gray-900'>
																{user?.fullName}
															</p>
															<p className='text-xs text-gray-500 flex flex-col'>
																{user?.roles?.map((item, idx) => (
																	<span key={idx}>{`${item.role.name} --> ${item.issueEntity.name}`}</span>
																))}
															</p>
														</a>
													</div>
												</div>
												<button
													className='flex justify-center items-center w-full px-4 py-2 text-sm text-gray-700 shadow-inner gap-1 font-medium'
													onClick={(e) => {
														e.preventDefault();
														logOut();
													}}
												>
													{isFetching ? (
														<LoadingSpin color='gray-800' />
													) : (
														<ArrowRightEndOnRectangleIcon className='h-5' />
													)}
													Salir
												</button>
											</div>
										</Menu.Item>
									</Menu.Items>
								</Transition>
							</Menu>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Navbar;
