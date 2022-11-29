import * as semver from 'semver';
import { OHRIFormField } from '../api/types';

let baseRegistry = {};
export interface FormJsonFile {
  version: string;
  semanticVersion?: string;
  json: any;
}

/**
 * This is a form behaviour property applied on `page` or `section` or `question`
 */
interface BehaviourProperty {
  name: string;
  type: 'field' | 'section' | 'page' | 'all';
  value: string;
}

/**
 * Convinience function for loading form(s) associated to a given package or form version.
 *
 * @param packageName The package associated with the form
 * @param formNamespace The form namespace
 * @param version The form version
 * @param isStrict If `true`, throws error if specified form version wasn't found
 * @param formsRegistry Form registry. (This was added for testing purposes)
 * @returns The form json
 */
export function getForm(
  packageName: string,
  formNamespace: string,
  version?: string,
  isStrict?: boolean,
  formsRegistry?: any,
) {
  const forms = lookupForms(packageName, formNamespace, formsRegistry);
  let form = null;
  if (version) {
    form = getFormByVersion(forms, version, isStrict);
  }
  if (!form) {
    form = getLatestFormVersion(forms);
  }
  return loadSubforms(form.json);
}

export function loadSubforms(parentForm) {
  parentForm.pages = parentForm.pages || [];
  parentForm.pages.forEach(page => {
    if (page.isSubform && page.subform?.name && page.subform.package) {
      try {
        const subform = getForm(page.subform.package, page.subform.name);
        if (!subform) {
          console.error(`Form with name "${page.subform.package}/${page.subform.name}" was not found in registry.`);
        }
        page.subform.form = subform;
      } catch (error) {
        console.error(error);
      }
    }
  });
  return parentForm;
}

export function getLatestFormVersion(forms: FormJsonFile[]) {
  if (forms.length == 1) {
    return forms[0];
  }
  const candidates = forms.map(f => f.semanticVersion);
  const latest = candidates.sort(formsVersionComparator)[candidates.length - 1];
  return forms.find(f => f.semanticVersion == latest);
}

export function getFormByVersion(forms: FormJsonFile[], requiredVersion: string, isStrict?: boolean) {
  for (let form of forms) {
    if (semver.satisfies(form.semanticVersion, requiredVersion)) {
      return form;
    }
  }
  if (isStrict) {
    throw new Error(`Couldn't find form with version: ${requiredVersion}`);
  } else {
    return null;
  }
}

export function lookupForms(packageName, formNamespace, formsRegistry) {
  const pkg = formsRegistry ? formsRegistry[packageName] : baseRegistry[packageName];
  if (!pkg) {
    throw Error(`Package with name ${packageName} was not found in registry`);
  }
  if (!pkg[formNamespace]) {
    throw new Error(`Form namespace '${formNamespace}' was not found in forms registry`);
  }
  return Object.keys(pkg[formNamespace]).map(formVersion => {
    return {
      version: formVersion,
      semanticVersion: semver.coerce(formVersion).version,
      json: pkg[formNamespace][formVersion],
    };
  });
}

/**
 * Function parses JSON form input and filters validation behaviours according to a given intent
 *
 * @param {string} intent The specified intent
 * @param {object} originalJson The original JSON form schema object
 * @param parentOverrides An array of behaviour overrides from parent form to be applied to a subform
 * @returns {object} The form json
 */
export function applyFormIntent(intent, originalJson, parentOverrides?: Array<BehaviourProperty>) {
  // Deep-copy original JSON
  const jsonBuffer = JSON.parse(JSON.stringify(originalJson));
  // Set the default page based on the current intent
  jsonBuffer.defaultPage = jsonBuffer.availableIntents?.find(
    candidate => candidate.intent === (intent?.intent || intent),
  )?.defaultPage;

  // filter form-level markdown behaviour
  if (jsonBuffer.markdown) {
    updateMarkdownRequiredBehaviour(jsonBuffer.markdown, intent);
  }

  // Before starting traversal, ensure nodes exist, at least as empty-arrays
  jsonBuffer.pages = jsonBuffer.pages || [];

  // Traverse the property tree with items of interest for validation
  jsonBuffer.pages.forEach(page => {
    if (page.isSubform && page.subform?.form) {
      const behaviourOverrides = [];
      const targetBehaviour = page.subform.behaviours?.find(behaviour => behaviour.intent == intent?.intent || intent);
      if (targetBehaviour?.readonly !== undefined || targetBehaviour?.readonly != null) {
        behaviourOverrides.push({ name: 'readonly', type: 'field', value: targetBehaviour?.readonly });
      }

      page.subform.form = applyFormIntent(
        targetBehaviour?.subform_intent || '*',
        page.subform?.form,
        behaviourOverrides,
      );
    }
    // TODO: Apply parentOverrides to pages if applicable
    const pageBehaviour = page.behaviours?.find(behaviour => behaviour.intent === (intent?.intent || intent));
    if (pageBehaviour) {
      page.hide = pageBehaviour?.hide;
      page.readonly = pageBehaviour?.readonly;
    } else {
      const fallBackBehaviour = page.behaviours?.find(behaviour => behaviour.intent === '*');
      page.hide = fallBackBehaviour?.hide;
      page.readonly = fallBackBehaviour?.readonly;
    }

    // filter page-level markdown behaviour
    if (page.markdown) {
      updateMarkdownRequiredBehaviour(page.markdown, intent);
    }
    // Before starting traversal, ensure nodes exist, at least as empty-arrays
    page.sections = page.sections || [];

    page.sections.forEach(section => {
      // TODO: Apply parentOverrides to sections if applicable
      const secBehaviour = section.behaviours?.find(behaviour => behaviour.intent === intent?.intent || intent);
      if (secBehaviour) {
        section.hide = secBehaviour?.hide;
      } else {
        const fallBackBehaviour = section.behaviours?.find(behaviour => behaviour.intent === '*');
        section.hide = fallBackBehaviour?.hide;
      }

      // filter section-level markdown behaviour
      if (section.markdown) {
        updateMarkdownRequiredBehaviour(section.markdown, intent);
      }

      // Before starting traversal, ensure nodes exist, at least as empty-arrays
      section.questions = section.questions || [];

      section.questions.forEach((question: OHRIFormField) => {
        if (question['behaviours']) {
          updateQuestionRequiredBehaviour(question, intent?.intent || intent);
          parentOverrides
            ?.filter(override => override.type == 'all' || override.type == 'field')
            ?.forEach(override => {
              question[override.name] = override.value;
            });
        }

        if (question.questions && question.questions.length) {
          question.questions.forEach(childQuestion => {
            updateQuestionRequiredBehaviour(childQuestion, intent?.intent || intent);

            parentOverrides
              ?.filter(override => override.type == 'all' || override.type == 'field')
              ?.forEach(override => {
                childQuestion[override.name] = override.value;
              });
          });
        }
      });
    });
  });
  return jsonBuffer;
}

// Helpers

function updateQuestionRequiredBehaviour(question, intent: string) {
  const requiredIntentBehaviour = question.behaviours?.find(behaviour => behaviour.intent === intent);

  const defaultIntentBehaviour = question.behaviours?.find(bevahiour => bevahiour.intent === '*');
  // If both required and default intents exist, combine them and update to question
  if (requiredIntentBehaviour || defaultIntentBehaviour) {
    // Remove the intent name props from each object
    delete requiredIntentBehaviour?.intent;
    delete defaultIntentBehaviour?.intent;

    // Combine required and default intents following the rules:
    // 1. The default intent is applied to all other intents
    // 2. Intent-specific behaviour overrides default behaviour
    const combinedBehaviours = Object.assign(defaultIntentBehaviour || {}, requiredIntentBehaviour || {});
    const defaultValue = combinedBehaviours.defaultValue;
    if (defaultValue != undefined) {
      // add the default value under the question options
      question.questionOptions.defaultValue = defaultValue;
      // delete it so that it's not added at the root level of the question
      delete combinedBehaviours.defaultValue;
    }
    // Add the combinedBehaviours data to initial question
    question = Object.assign(question, combinedBehaviours);
    // Remove behaviours list
    delete question.behaviours;
  }
}

function updateMarkdownRequiredBehaviour(markdown, intent) {
  const requiredIntentBehaviour = markdown.behaviours?.find(behaviour => behaviour.intent === intent);
  const defaultIntentBehaviour = markdown.behaviours?.find(behaviour => behaviour.intent === '*');

  if (requiredIntentBehaviour && defaultIntentBehaviour) {
    delete requiredIntentBehaviour.intent;
    delete defaultIntentBehaviour.intent;
    const combinedBehaviours = Object.assign(defaultIntentBehaviour, requiredIntentBehaviour);

    markdown = Object.assign(markdown, combinedBehaviours);
    delete markdown.behaviours;
  } else if (!requiredIntentBehaviour && defaultIntentBehaviour) {
    delete defaultIntentBehaviour.intent;

    markdown = Object.assign(markdown, defaultIntentBehaviour);
    delete markdown.behaviours;
  }
}

export function updateExcludeIntentBehaviour(excludedIntents: Array<string>, originalJson) {
  originalJson.availableIntents = originalJson.availableIntents.filter(
    intent => !excludedIntents.includes(intent?.intent || intent),
  );
  return originalJson;
}

export function addToBaseFormsRegistry(customRegistry: Record<string, any>) {
  baseRegistry = { ...baseRegistry, ...customRegistry };
}

function isPositiveInteger(x) {
  return /^\d+$/.test(x);
}

function formsVersionComparator(v1, v2) {
  var v1parts = v1.split('.');
  var v2parts = v2.split('.');
  // First, validate both numbers are true version numbers
  function validateParts(parts) {
    for (var i = 0; i < parts.length; ++i) {
      if (!isPositiveInteger(parts[i])) {
        return false;
      }
    }
    return true;
  }
  if (!validateParts(v1parts) || !validateParts(v2parts)) {
    return NaN;
  }
  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length === i) {
      return 1;
    }
    if (v1parts[i] === v2parts[i]) {
      continue;
    }
    if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    return -1;
  }
  if (v1parts.length != v2parts.length) {
    return -1;
  }
  return 0;
}
