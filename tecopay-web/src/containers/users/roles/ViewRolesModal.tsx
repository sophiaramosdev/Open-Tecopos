import useServerUser from '../../../api/userServerUsers';
import { type SubmitHandler, useForm } from 'react-hook-form';
import ComboBox from '../../../components/forms/Combobox';

import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { useEffect, useState } from 'react';
import Modal from '../../../components/misc/GenericModal';
import { deleteUndefinedAttr } from '../../../utils/helpers';
import Input from '../../../components/forms/Input';
import Select from '../../../components/forms/Select';
import Toggle from '../../../components/forms/Toggle';
import AsyncComboBox from '../../../components/forms/AsyncCombobox';
import Button from '../../../components/misc/Button';
import MultiSelect from '../../../components/forms/Multiselect';
import AsyncMultiSelect from '../../../components/forms/AsyncMultiselect';

import { Permissions } from '../../../utils/staticsData';

interface propsDestructured {
	close: Function;
	editRole?: Function;
	isLoading?: boolean;
	id: number | null;
	getRole: Function;
	roles: any;
	allRoles: any;
	nameRole: string;
	codeRole: string;
	descriptionRole: string;
	rolePermission: any;
}

const ViewRolesModal = ({
	close,
	id,
	getRole,
	isLoading,
	roles,
	allRoles,
	nameRole,
	codeRole,
	descriptionRole,
	rolePermission,
}: propsDestructured) => {
	const nombresPermisos = rolePermission.map((per: Permissions) => per.name);
	const nombresPermisosString = nombresPermisos.join(' . ');

	return (
		<main>
			<div className='flex flex-col gap-y-3, mt-8 '>
				<div className='divView'>
					<div className='divView1'>
						<h1>Nombre del rol: {nameRole}</h1>
					</div>
					<div className='divView2'>
						<h1>Descripción: {descriptionRole}</h1>
					</div>
					<div className='divView1'>
						<h1>Permisos:</h1>
						{rolePermission.map((p: Permissions) => (
							<h1 key={p.id}>{p.name}</h1>
						))}
					</div>
					<div className='divView2'>
						<h1>Código: {codeRole}</h1>
					</div>
				</div>
				{/*<div className='flex self-end, mt-8'>
					<Button
						name='Cancelar'
						color='slate-600'
						type='button'
						action={close}
						loading={isLoading}
					/>
				</div>*/}
			</div>
		</main>
	);
};

export default ViewRolesModal;
