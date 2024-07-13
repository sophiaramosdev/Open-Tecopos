import { useContext, useEffect } from 'react';
import Input from '../../../components/forms/Input';
import Button from '../../../components/misc/Button';
import { EditEntityContext } from './EditEntityModal';
import Toggle from '../../../components/forms/Toggle';
import { SubmitHandler, useForm } from 'react-hook-form';
import TextArea from '../../../components/forms/TextArea';
import GenericImageDrop from '../../../components/Images/GenericImageDrop';

const EditCardTypeForm = () => {
	const {
		currentType,
		entity,
		setCurrentType,
		updateCategory,
		isFetching,
		addCategory,
	} = useContext(EditEntityContext);

	const { control, watch, handleSubmit, unregister } = useForm({
		mode: 'onChange',
	});

	useEffect(() => {
		return () => {
			setCurrentType!(null);
		};
	}, []);

	const category =
		currentType !== -1 ? entity?.categories[currentType!] : undefined;

	const hasDiscount = watch('hasDiscount') ?? !!category?.discount ?? false;
	const hasPrice = watch('hasPrice') ?? !!category?.price ?? false;

	const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
		currentType === -1
			? addCategory!(data, () => setCurrentType!(null))
			: updateCategory!(category?.id, data, () => setCurrentType!(null));
		};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<div className='h-full border border-slate-300 rounded p-5 flex flex-col gap-y-3'>
				<Input
					name='name'
					control={control}
					label='Nombre'
					rules={{ required: '* Campo requerido' }}
					defaultValue={category?.name}
				/>
				<TextArea
					name='description'
					control={control}
					label='Descripción'
					defaultValue={category?.description}
				/>
				<div className='grid grid-cols-5 mt-3 gap-5'>
					<div className='col-span-2 flex flex-col gap-2 h-full'>
						<h3 className='font-semibold text-gray-500 text-center'>
							Diseño de tarjeta
						</h3>
						<GenericImageDrop
							className='h-40 w-full border rounded-md border-gray-400 m-auto overflow-hidden'
							control={control}
							name='cardImageId'
							defaultValue={category?.cardImage?.id}
							previewDefault={category?.cardImage?.url}
							previewHash={category?.cardImage?.hash}
						/>
					</div>
					<div className='col-span-3 grid h-full place-content-between '>
						<div className='grid grid-cols-2 gap-2 w-full items-end'>
							<Toggle
								title='¿Tiene descuento?'
								name='hasDiscount'
								control={control}
								defaultValue={hasDiscount}
							/>
							{!!hasDiscount && (
								<div className='relative'>
									<Input
										name='discount'
										type='number'
										control={control}
										label='Descuento'
										defaultValue={category?.discount}
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
								control={control}
								defaultValue={hasPrice}
							/>
							{!!hasPrice && (
								<div className='relative'>
									<Input
										name='price'
										control={control}
										label='Precio'
										type='number'
										defaultValue={category?.price}
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
							control={control}
							defaultValue={category?.isActive}
						/>
						<Toggle
							title='Básica'
							name='isBasic'
							control={control}
							defaultValue={category?.isBasic}
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
					action={() => setCurrentType!(null)}
				/>
				<Button
					color='indigo-700'
					full
					name={currentType || currentType === 0 ? 'Actualizar' : 'Agregar'}
					type='submit'
					loading={isFetching}
				/>
			</div>
		</form>
	);
};

export default EditCardTypeForm;
