import { openmrsFetch } from '@openmrs/esm-framework';

export const handleFormValidation = async (schema, configObject) => {
  const errorsArray = [];
  const warningsArray = [];

  if (schema) {
    const parsedForm = typeof schema == 'string' ? JSON.parse(schema) : schema;

    const asyncTasks = [];

    parsedForm.pages?.forEach(page =>
      page.sections?.forEach(section =>
        section.questions?.forEach(question => {
          asyncTasks.push(
            handleQuestionValidation(question, errorsArray, warningsArray, configObject),
            handleAnswerValidation(question, errorsArray),
          );
          question.type === 'obsGroup' &&
            question.questions?.forEach(obsGrpQuestion =>
              asyncTasks.push(
                handleQuestionValidation(obsGrpQuestion, errorsArray, configObject, warningsArray),
                handleAnswerValidation(question, errorsArray),
              ),
            );
        }),
      ),
    );
    await Promise.all(asyncTasks);

    return [errorsArray, warningsArray];
  }
};

const handleQuestionValidation = async (conceptObject, errorsArray, warningsArray, configObject) => {
  const conceptRepresentation =
    'custom:(uuid,display,datatype,answers,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

  const searchRef = conceptObject.questionOptions.concept
    ? conceptObject.questionOptions.concept
    : conceptObject.questionOptions.conceptMappings?.length
    ? conceptObject.questionOptions.conceptMappings
        ?.map(mapping => {
          return `${mapping.type}:${mapping.value}`;
        })
        .join(',')
    : '';

  if (searchRef) {
    try {
      const { data } = await openmrsFetch(`/ws/rest/v1/concept?references=${searchRef}&v=${conceptRepresentation}`);
      if (data.results.length) {
        const [resObject] = data.results;

        resObject.datatype.name === 'Boolean' &&
          conceptObject.questionOptions.answers.forEach(answer => {
            if (
              answer.concept !== 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3' &&
              answer.concept !== '488b58ff-64f5-4f8a-8979-fa79940b1594'
            ) {
              errorsArray.push({
                errorMessage: `❌ concept "${conceptObject.questionOptions.concept}" of type "boolean" has a non-boolean answer "${answer.label}"`,
                field: conceptObject,
              });
            }
          });

        resObject.datatype.name === 'Coded' &&
          conceptObject.questionOptions.answers.forEach(answer => {
            if (!resObject.answers.some(answerObject => answerObject.uuid === answer.concept)) {
              warningsArray.push({
                warningMessage: `⚠️ answer: "${answer.label}" - "${answer.concept}" does not exist in the response answers but exists in the form`,
                field: conceptObject,
              });
            }
          });

        dataTypeChecker(conceptObject, resObject, errorsArray, configObject);
      } else {
        errorsArray.push({
          errorMessage: `❓ Concept "${conceptObject.questionOptions.concept}" not found`,
          field: conceptObject,
        });
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    errorsArray.push({
      errorMessage: `❓ Question with no concept UUID / mappings: ${conceptObject.id}`,
      field: conceptObject,
    });
  }
};

const dataTypeChecker = (conceptObject, responseObject, array, dataTypeToRenderingMap) => {
  Object.prototype.hasOwnProperty.call(dataTypeToRenderingMap, responseObject.datatype.name) &&
    !dataTypeToRenderingMap[responseObject.datatype.name].includes(conceptObject.questionOptions.rendering) &&
    array.push({
      errorMessage: `❓ ${conceptObject.questionOptions.concept}: datatype "${responseObject.datatype.name}" doesn't match control type "${conceptObject.questionOptions.rendering}"`,
      field: conceptObject,
    });

  !Object.prototype.hasOwnProperty.call(dataTypeToRenderingMap, responseObject.datatype.name) &&
    array.push({
      errorMessage: `❓ Untracked datatype "${responseObject.datatype.name}"`,
      field: conceptObject,
    });
};

const handleAnswerValidation = (questionObject, array) => {
  const answerArray = questionObject.questionOptions.answers;
  const conceptRepresentation =
    'custom:(uuid,display,datatype,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

  answerArray?.length &&
    answerArray.forEach(answer => {
      const searchRef = answer.concept
        ? answer.concept
        : answer.conceptMappings?.length
        ? answer.conceptMappings
            .map(eachMapping => {
              return `${eachMapping.type}:${eachMapping.value}`;
            })
            .join(',')
        : '';

      openmrsFetch(`/ws/rest/v1/concept?references=${searchRef}&v=${conceptRepresentation}`).then(response => {
        if (!response.data.results.length) {
          array.push({
            errorMessage: `❌ answer "${answer.label}" backed by concept "${answer.concept}" not found`,
            field: questionObject,
          });
        }
      });
    });
};
