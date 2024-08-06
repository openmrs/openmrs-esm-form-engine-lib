// import { z, type ZodTypeAny } from 'zod';
// import { type FormFieldValidator, type FormField, type ValidationResult } from '../types';

// TODOs
// - add a reactive context to evaluate expressions
// - figure out how to track errors vs warnings with different severity levels
// (I will be managing validation manually for now until I figure out the above)
// export const createValidationSchema = (formFields: FormField[], validators: Record<string, FormFieldValidator>) => {
//   const schemaShape: Record<string, ZodTypeAny> = {};
//   formFields.forEach((field) => {
//     schemaShape[field.id] = zodFieldValidator(field, validators);
//   });
//   return z.object(schemaShape);
// };

// const zodFieldValidator = (field: FormField, validators: Record<string, FormFieldValidator>) => {
//   return z.any().refine((value) => {
//     const errorsAndWarnings: ValidationResult[] = [];
//     try {
//       field.validators.forEach((validatorConfig) => {
//         const errorsAndWarnings = validators[validatorConfig.type]?.validate?.(field, value, validatorConfig);
//         if (errorsAndWarnings?.length) {
//           errorsAndWarnings.forEach((errorOrWarning) => {
//             errorsAndWarnings.push(errorOrWarning);
//           });
//         }
//       });
//       return errorsAndWarnings.length === 0;
//     } catch (error) {
//       console.error(error);
//       return false;
//     }
//   });
// };
