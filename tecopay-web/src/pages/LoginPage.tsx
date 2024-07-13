import useServerMain from '../api/useServer';
import { useForm, SubmitHandler } from 'react-hook-form';
import Logo from '../assets/png/logo-tecopay.png';
import Input from '../components/forms/Input';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';

export default function Login() {
	const { control, handleSubmit } = useForm();

	const {logIn, isFetching} = useServerMain();

	const onSubmit: SubmitHandler<Record<string, string>> = (values) => {
		logIn(values);
	};
	const [showPsw, setShowPsw] = useState(false);
	return (
		<>
			<div className='flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8'>
				<div className='w-full max-w-md'>
					<div>
						<div className='flex justify-center'>
							<div className=' relative bottom-7'>
								<img
									width={'100px'}
									height={'100px'}
									className=''
									src={Logo}
									alt='Logo de Tecopay'
								/>
							</div>
						</div>

						<h2 className='mt-4 text-center text-3xl font-bold tracking-tight text-gray-900'>
							Bienvenido
						</h2>
						<h3 className='mt-2 text-center text-lg font-bold tracking-tight text-gray-600'>
							Introduzca sus credenciales de Acceso
						</h3>
					</div>

					<form className='mt-8 space-y-6' onSubmit={handleSubmit(onSubmit)}>
						<div className='-space-y-px gap-1 flex flex-col rounded-md shadow-sm py-2'>
							<Input
								label='Correo'
								name='email'
								control={control}
								inputClass='border border-gray-500 rounded-md text-center w-full placeholder:text-center focus:ring-tecopay-600 focus:border-tecopay-600'
								placeholder='Nombre de usuario'
							/>
							<div className='relative'>
								{showPsw == false ? (
									<EyeSlashIcon
										className='h-5 text-gray-500 absolute top-[34px] right-2 z-10 hover:text-gray-600 hover:cursor-pointer'
										onClick={() => setShowPsw(!showPsw)}
									/>
								) : (
									<EyeIcon
										className='h-5 text-gray-500 absolute top-[34px] right-2 z-10 hover:text-gray-600 hover:cursor-pointer'
										onClick={() => setShowPsw(!showPsw)}
									/>
								)}

								<Input
									label='Contraseña'
									name='password'
									control={control}
									inputClass='border border-gray-500 rounded-md text-center w-full placeholder:text-center focus:ring-tecopay-600 focus:border-tecopay-600'
									type={showPsw ? 'text' : 'password'}
									placeholder={showPsw ? '' : '******'}
								/>
							</div>
						</div>

						{/*<div className='flex items-center justify-center'>
							<div className='text-sm'>
								<a
									href='#'
									className='font-medium text-black hover:text-tecopay-400'
								>
									¿Olvidó su contraseña?
								</a>
							</div>
								</div>*/}

						<div>
							<button
								type='submit'
								className='group relative flex w-full justify-center rounded-md border border-transparent  py-2 px-4 text-sm font-medium bg-tecopay-600 text-white hover:bg-tecopay-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-tecopay-500'
								disabled={isFetching}
							>
								{isFetching && (
									<svg
										className='absolute left-3 animate-spin h-5 w-5 text-white'
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'
									>
										<circle
											className='opacity-25'
											cx='12'
											cy='12'
											r='10'
											stroke='currentColor'
											strokeWidth='4'
										></circle>
										<path
											className='opacity-75'
											fill='currentColor'
											d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
										></path>
									</svg>
								)}

								{isFetching ? 'Accediendo...' : 'Acceder'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}
