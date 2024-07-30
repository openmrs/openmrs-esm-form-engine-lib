import { type FormField, type FormSchema } from '../../../types';

type FormState = {
  formFields: FormField[];
  invalidFields: FormField[];
  formJson: FormSchema;
};

type Action =
  | { type: 'SET_FORM_FIELDS'; value: FormField[] }
  | { type: 'ADD_FORM_FIELD'; value: FormField }
  | { type: 'UPDATE_FORM_FIELD'; value: FormField }
  | { type: 'REMOVE_FORM_FIELD'; value: string }
  | { type: 'SET_INVALID_FIELDS'; value: FormField[] }
  | { type: 'ADD_INVALID_FIELD'; value: FormField }
  | { type: 'REMOVE_INVALID_FIELD'; value: string }
  | { type: 'CLEAR_INVALID_FIELDS' }
  | { type: 'SET_FORM_JSON'; value: any };

const initialState: FormState = {
  formFields: [],
  invalidFields: [],
  formJson: null,
};

const formStateReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case 'SET_FORM_FIELDS':
      return { ...state, formFields: action.value };
    case 'ADD_FORM_FIELD':
      return { ...state, formFields: [...state.formFields, action.value] };
    case 'UPDATE_FORM_FIELD':
      return {
        ...state,
        formFields: state.formFields.map((field) => (field.id === action.value.id ? action.value : field)),
      };
    case 'REMOVE_FORM_FIELD':
      return { ...state, formFields: state.formFields.filter((field) => field.id !== action.value) };
    case 'SET_INVALID_FIELDS':
      return { ...state, invalidFields: action.value };
    case 'ADD_INVALID_FIELD':
      return { ...state, invalidFields: [...state.invalidFields, action.value] };
    case 'REMOVE_INVALID_FIELD':
      return { ...state, invalidFields: state.invalidFields.filter((field) => field.id !== action.value) };
    case 'CLEAR_INVALID_FIELDS':
      return { ...state, invalidFields: [] };
    case 'SET_FORM_JSON':
      return { ...state, formJson: action.value };
    default:
      return state;
  }
};

export { formStateReducer, initialState, FormState, Action };
