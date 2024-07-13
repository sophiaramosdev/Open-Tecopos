import {
	useForm,
	SubmitHandler,
	Control,
	UseFormTrigger,
	UseFormWatch,
	UseFormUnregister,
	useFieldArray,
	UseFieldArrayAppend,
	UseFieldArrayRemove,
	UseFieldArrayUpdate,
} from 'react-hook-form';
import { useState, createContext } from 'react';
import StepsComponent from '../../../components/misc/StepsComponent';
import EntityGeneralInfo from './EntityGeneralInfo';
import NewCardType from './NewCardType';
import CardTypes from './CardTypes';

const contextData: {
	next?: Function;
	back?: Function;
	control?: Control;
	trigger?: UseFormTrigger<Record<string, any>>;
	watch?: UseFormWatch<Record<string, any>>;
	getValues?: Function;
	setValue?: Function;
	isFetching?: boolean;
	setCurrentStep?: Function;
	unregister?: UseFormUnregister<Record<string, any>>;
	fields?: any;
	append?: UseFieldArrayAppend<any>;
	update?: UseFieldArrayUpdate<any>;
	remove?: UseFieldArrayRemove;
} = {};

interface propsDestructured {
	close: Function;
	crud: {
		addEntity: Function;
		isFetching: boolean;
	};
}

export const NewEntityContext = createContext(contextData);

const NewEntityModal = ({ close, crud }: propsDestructured) => {
	const {
		control,
		handleSubmit,
		trigger,
		getValues,
		setValue,
		watch,
		unregister,
	} = useForm({ mode: 'onChange' });
	const { fields, append, remove, update } = useFieldArray<any>({
		name: 'categories',
		control,
	});
	const { addEntity, isFetching } = crud;

	const [currentStep, setCurrentStep] = useState(0);

	const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
		const callback = () =>{
			data.categories.forEach((elem: any) => {
				Object.keys(elem).forEach((item: any) => {
					if (['cardImage', 'hasDiscount', 'hasPrice'].includes(item))
						delete elem[item];
				});
			});
			unregister(['business', 'owner', 'newCardType']);
			close();

		}		
		addEntity(data, callback);
	};

	const stepTitles = ['Información general', 'Tipos de Tarjetas'];

	return (
		<>
			<StepsComponent current={currentStep} titles={stepTitles} />
			<form onSubmit={handleSubmit(onSubmit)}>
				<NewEntityContext.Provider
					value={{
						control,
						trigger,
						getValues,
						setValue,
						isFetching,
						setCurrentStep,
						watch,
						unregister,
						fields,
						append,
						remove,
						update,
					}}
				>
					{currentStep === 0 && <EntityGeneralInfo />}
					{currentStep === 1 && !watch('newCardType') && <CardTypes />}
					{currentStep === 1 && watch('newCardType') && <NewCardType />}
				</NewEntityContext.Provider>
			</form>
		</>
	);
};

export default NewEntityModal;
