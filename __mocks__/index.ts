// Form mocks
export * from './forms';

// Patient mocks
export { mockPatient } from './patient.mock';

// Session mocks
export { mockSessionDataResponse } from './session.mock';
export { mockVisit } from './visit.mock';

// Form schemas
export { default as ageValidationForm } from './forms/rfe-forms/age-validation-form.json';
export { default as bmiForAgeScoreTestSchema } from './forms/rfe-forms/zscore-bmi-for-age-form.json';
export { default as bmiForm } from './forms/rfe-forms/bmi-test-form.json';
export { default as bsaForm } from './forms/rfe-forms/bsa-test-form.json';
export { default as conditionalAnsweredForm } from './forms/rfe-forms/conditional-answered-form.json';
export { default as conditionalRequiredTestForm } from './forms/rfe-forms/conditional-required-form.json';
export { default as defaultValuesForm } from './forms/rfe-forms/default-values-form.json';
export { default as demoHtsForm } from './forms/rfe-forms/demo-hts-form.json';
export { default as demoHtsOpenmrsForm } from './forms/afe-forms/demo-hts-form.json';
export { default as diagnosisForm } from './forms/rfe-forms/diagnosis-test-form.json';
export { default as eddForm } from './forms/rfe-forms/edd-test-form.json';
export { default as externalDataSourceForm } from './forms/rfe-forms/external-data-source-form.json';
export { default as filterAnswerOptionsTestForm } from './forms/rfe-forms/filter-answer-options-test-form.json';
export { default as heightForAgeZscoreTestSchema } from './forms/rfe-forms/zscore-height-for-age-form.json';
export { default as hidePagesAndSectionsForm } from './forms/rfe-forms/hide-pages-and-sections-form.json';
export { default as historicalExpressionsForm } from './forms/rfe-forms/historical-expressions-form.json';
export { default as htsPocForm } from './forms/rfe-forms/demo-hts-form.json';
export { default as jsExpressionValidationForm } from './forms/rfe-forms/js-expression-validation-form.json';
export { default as labourAndDeliveryTestForm } from './forms/rfe-forms/labour-and-delivery-test-form.json';
export { default as mockConceptsForm } from './forms/rfe-forms/sample-fields.json';
export { default as mockHxpEncounter } from './forms/rfe-forms/mock-historical-visits-encounter.json';
export { default as mockSaveEncounter } from './forms/rfe-forms/mock-save-encounter.json';
export { default as monthsOnArtForm } from './forms/rfe-forms/months-on-art-form.json';
export { default as multiSelectFormSchema } from './forms/rfe-forms/multi-select-form.json';
export { default as nextVisitForm } from './forms/rfe-forms/next-visit-test-form.json';
export { default as obsGroupTestForm } from './forms/rfe-forms/obs-group-test-form.json';
export { default as postSubmissionTestForm } from './forms/rfe-forms/post-submission-test-form.json';
export { default as radioButtonFormSchema } from './forms/rfe-forms/radio-button-form.json';
export { default as readOnlyValidationForm } from './forms/rfe-forms/read-only-validation-form.json';
export { default as referenceByMappingForm } from './forms/rfe-forms/reference-by-mapping-form.json';
export { default as requiredTestForm } from './forms/rfe-forms/required-form.json';
export { default as sampleFieldsForm } from './forms/rfe-forms/sample-fields.json';
export { default as testEnrolmentForm } from './forms/rfe-forms/test-enrolment-form.json';
export { default as testForm } from './forms/afe-forms/test-schema-transformer-form.json';
export { default as testOrdersForm } from './forms/afe-forms/test-orders.json';
export { default as uiSelectExtForm } from './forms/rfe-forms/sample-ui-select-ext.json';
export { default as viralLoadStatusForm } from './forms/rfe-forms/viral-load-status-form.json';
export { default as weightForHeightZscoreTestSchema } from './forms/rfe-forms/zscore-weight-height-form.json';

// Form components
export { default as artComponentBody } from './forms/rfe-forms/component-art.json';
export { default as artComponentSkeleton } from './forms/afe-forms/component-art.json';
export { default as formComponentBody } from './forms/rfe-forms/form-component.json';
export { default as formComponentSkeleton } from './forms/afe-forms/form-component.json';
export { default as miniFormBody } from './forms/rfe-forms/mini-form.json';
export { default as miniFormSkeleton } from './forms/afe-forms/mini-form.json';
export { default as nestedForm1Body } from './forms/rfe-forms/nested-form1.json';
export { default as nestedForm1Skeleton } from './forms/afe-forms/nested-form1.json';
export { default as nestedForm2Body } from './forms/rfe-forms/nested-form2.json';
export { default as nestedForm2Skeleton } from './forms/afe-forms/nested-form2.json';
export { default as preclinicReviewComponentBody } from './forms/rfe-forms/component-preclinic-review.json';
export { default as preclinicReviewComponentSkeleton } from './forms/afe-forms/component-preclinic-review.json';

// Concepts
export { default as mockConcepts } from './concepts.mock.json';

export { obsList } from './forms/rfe-forms/obs-list-data';
export {
  testSchemaV2,
  htsRetrospectiveResultingSchemaV2,
  htsHivtestResultingSchemaV2,
  htsWildcardResultingSchemaV2,
} from './forms/rfe-forms/forms-loader.test.schema';

export const formMocks = {
  rfe: {
    ageValidation: require('./forms/rfe-forms/age-validation-form.json'),
    bmiForAge: require('./forms/rfe-forms/zscore-bmi-for-age-form.json'),
    // ... other RFE forms
  },
  afe: {
    // ... AFE forms
  },
} as const;
