import { OHRIFormSchema, ReferencedForm } from '../api/types';

function loadFormJson(formJson) {
  const formComponentRefs = getReferencedForms(formJson);
  const formComponents = getSubComponents(formJson);
}

// Get referenced forms
function getReferencedForms(formJson: OHRIFormSchema) {
  if (formJson.referencedForms) {
    return formJson.referencedForms.map((form) => {
      return {
        formName: form.formName,
        alias: form.alias,
      };
    });
  }
}

// Get sub components
function getSubComponents(formComponent) {
  if (formComponent.subComponents) {
    return formComponent.subComponents.map((subComponent) => {
      return {
        name: subComponent.name,
        type: subComponent.type,
      };
    });
  }
}

const refs = {
  pcr: 'component_preclinic-review',
  hosp: 'component_hospitalization',
  art: 'component_art',
};
