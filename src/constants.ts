export const ConceptTrue = 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3';
export const ConceptFalse = '488b58ff-64f5-4f8a-8979-fa79940b1594';
export const UnspecifiedValue = 'VALUE_UNSPECIFIED';
export const encounterRepresentation =
  'custom:(uuid,encounterDatetime,encounterType:(uuid,name,description),location:(uuid,name),' +
  'patient:(uuid,display),encounterProviders:(uuid,provider:(uuid,name),encounterRole:(uuid,name)),' +
  'orders:(uuid,display,concept:(uuid,display),voided),' +
  'obs:(uuid,obsDatetime,comment,voided,groupMembers,formFieldNamespace,formFieldPath,concept:(uuid,name:(uuid,name)),value:(uuid,name:(uuid,name),' +
  'names:(uuid,conceptNameType,name))))';
export const FormsStore = 'forms-engine-store';
export const PatientChartWorkspaceHeaderSlot = 'patient-chart-workspace-header-slot';
export const codedTypes = ['radio', 'checkbox', 'select', 'content-switcher'];
export const NullSelectOption = 'OPTION_NULL';
