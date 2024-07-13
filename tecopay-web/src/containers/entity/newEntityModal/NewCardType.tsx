import { useContext, useEffect } from 'react';
import { NewEntityContext } from './NewEntityModal';
import Button from '../../../components/misc/Button';
import GenericImageDrop from '../../../components/Images/GenericImageDrop';
import Input from '../../../components/forms/Input';
import TextArea from '../../../components/forms/TextArea';
import Toggle from '../../../components/forms/Toggle';
import { SubmitHandler, useForm } from 'react-hook-form';

const NewCardType = () => {
	const { getValues, setValue, fields, append, update, unregister } =
		useContext(NewEntityContext);

	const {
		control: localControl,
		setValue: setLocalValue,
		getValues: getLocalValues,
		watch,
	} = useForm({ mode: 'onChange' });

	useEffect(() => {
		return () => {
			unregister!('currentType');
		};
	}, []);

	const { currentType } = getValues!();

	const hasDiscount =
		watch('hasDiscount') ?? fields[currentType]?.hasDiscount ?? false;
	const hasPrice = watch('hasPrice') ?? fields[currentType]?.hasPrice ?? false;

	const submit = () => {
		const data = getLocalValues();
		currentType || currentType === 0
			? update!(currentType, data)
			: append!(data);
		setValue!('newCardType', false);
	};

	return (
		<>
			<div className='h-full border border-slate-300 rounded p-5 flex flex-col gap-y-3'>
				<Input
					name='name'
					control={localControl}
					label='Nombre'
					rules={{ required: '* Campo requerido' }}
					defaultValue={fields[currentType]?.name}
				/>
				<TextArea
					name='description'
					control={localControl}
					label='Descripción'
					defaultValue={fields[currentType]?.description}
				/>
				<div className='grid grid-cols-5 mt-3 gap-5'>
					<div className='col-span-2 flex flex-col gap-2 h-full'>
						<h3 className='font-semibold text-gray-500 text-center'>
							Diseño de tarjeta
						</h3>
						<GenericImageDrop
							className='h-40 w-full border rounded-md border-gray-400 m-auto overflow-hidden'
							control={localControl}
							name='cardImageId'
							callback={(image) => setLocalValue('profileImage', image)}
							defaultValue={fields[currentType]?.cardImage?.id}
							previewDefault={fields[currentType]?.cardImage0?.url}
							previewHash={fields[currentType]?.cardImage?.hash}
						/>
					</div>
					<div className='col-span-3 grid h-full place-content-between '>
						<div className='grid grid-cols-2 gap-2 w-full items-end'>
							<Toggle
								title='¿Tiene descuento?'
								name='hasDiscount'
								control={localControl}
								defaultValue={hasDiscount}
							/>
							{!!hasDiscount && (
								<div className='relative'>
									<Input
										name='discount'
										type='number'
										control={localControl}
										label='Descuento'
										defaultValue={fields[currentType]?.discount}
									/>
									<span className='absolute top-[30px] right-2 font-bold text-gray-600 text-sm'>
										%
									</span>
								</div>
							)}
						</div>
						<div className='grid grid-cols-2 gap-2 w-full items-end'>
						<Toggle
								title='¿Tiene precio?'
								name='hasPrice'
								control={localControl}
								defaultValue={false}
							/>
							{!!hasPrice && (
								<div className='relative'>
									<Input
										name='price'
										control={localControl}
										label='Precio'
										type='number'
										defaultValue={fields[currentType]?.price}
									/>
									<span className='absolute top-[30px] right-2 font-semibold text-gray-600 text-sm'>
										Puntos
									</span>
								</div>
							)}
						</div>
						<Toggle
							title='Activa'
							name='isActive'
							control={localControl}
							defaultValue={false}
						/>
						<Toggle
							title='Básica'
							name='isBasic'
							control={localControl}
							defaultValue={fields[currentType]?.isBasic??fields.length === 0}
						/>
					</div>
				</div>
			</div>
			<div className='grid grid-cols-2 gap-3 py-2 mt-2 mx-2'>
				<Button
					color='indigo-600'
					name='Cancelar'
					full
					outline
					textColor='slate-600'
					action={() => setValue!('newCardType', false)}
				/>
				<Button
					color='indigo-700'
					full
					name={currentType || currentType === 0 ? 'Actualizar' : 'Agregar'}
					action={() => submit()}
				/>
			</div>
		</>
	);
};

export default NewCardType;
