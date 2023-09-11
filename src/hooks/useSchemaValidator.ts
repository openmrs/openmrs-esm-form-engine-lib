import { useDatatype } from './useDatatype';
import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { ConceptTrue, ConceptFalse } from '../constants';
import { OHRIFormField, OHRIFormSchema } from '../api/types';

export function useSchemaValidator(schema: OHRIFormSchema, doValidate) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [questionFields, setQuestionFields] = useState<Array<OHRIFormField>>([]);
  const [answerFields, setAnswerFields] = useState([]);
  const [isValidating, setIsValidating] = useState(true);
  const [conceptSet, setConceptSet] = useState<Set<string>>(new Set());
  const [answerConceptSet, setAnswerConceptSet] = useState<Set<string>>(new Set());
  const { dataTypeToRenderingMap, conceptDataTypes } = useConfig();

  const findUnresolvedConcepts = (questionFields, filteredSetArray) => {
    const unresolvedConcepts = questionFields
      ?.filter(questionFieldsItem => {
        return filteredSetArray?.includes(questionFieldsItem.questionOptions.concept);
      })
      ?.map(item => {
        return {
          errorMessage: `❓ Field Concept "${item.questionOptions.concept}" not found`,
          field: item,
        };
      });

    setErrors(prevState => [...prevState, ...unresolvedConcepts]);
  };

  const unresolvedAnswers = (questionFields, filteredSetArray) => {
    const unresolvedConcepts = questionFields
      ?.filter(questionFieldsItem => {
        return filteredSetArray?.includes(questionFieldsItem.concept);
      })
      ?.map(item => {
        return {
          errorMessage: `Answer Concept "${item.concept}" not found`,
          field: item,
        };
      });

    setErrors(prevState => [...prevState, ...unresolvedConcepts]);
  };

  const dataTypeChecker = (responseObject, questionFields) => {
    questionFields
      ?.filter(item => item.questionOptions.concept === responseObject.uuid)
      .map(item => {
        responseObject.datatype.name === conceptDataTypes.Boolean &&
          item.questionOptions.answers.forEach(answer => {
            if (![ConceptTrue, ConceptFalse].includes(answer.concept)) {
              setErrors(prevErrors => [
                ...prevErrors,
                {
                  errorMessage: `❌ concept "${item.questionOptions.concept}" of type "boolean" has a non-boolean answer "${answer.label}"`,
                  field: item,
                },
              ]);
            }
          });

        responseObject.datatype.name === conceptDataTypes.Coded &&
          item.questionOptions.answers.forEach(answer => {
            if (!responseObject.answers?.some(answerObject => answerObject.uuid === answer.concept)) {
              setWarnings(prevWarnings => [
                ...prevWarnings,
                {
                  warningMessage: `⚠️ answer: "${answer.label}" - "${answer.concept}" does not exist in the response answers but exists in the form`,
                  field: item,
                },
              ]);
            }
          });

        dataTypeToRenderingMap.hasOwnProperty(responseObject?.datatype?.name) &&
          !dataTypeToRenderingMap[responseObject.datatype.name].includes(item.questionOptions.rendering) &&
          setErrors(prevErrors => [
            ...prevErrors,
            {
              errorMessage: `❌ ${item.questionOptions.concept}: datatype "${responseObject.datatype.display}" doesn't match control type "${item.questionOptions.rendering}"`,
              field: item,
            },
          ]);

        !dataTypeToRenderingMap.hasOwnProperty(responseObject.datatype.name) &&
          setErrors(prevErrors => [
            ...prevErrors,
            { errorMessage: `Untracked datatype "${responseObject.datatype.display}"`, field: item },
          ]);
      });
  };

  useMemo(() => {
    if (schema) {
      schema.pages?.forEach(page =>
        page.sections?.forEach(section =>
          section.questions?.forEach(question => {
            setQuestionFields(prevArray => [...prevArray, question]);
            const searchRef = question.questionOptions.concept
              ? question.questionOptions.concept
              : question.questionOptions.conceptMappings?.length
              ? question.questionOptions.conceptMappings
                  ?.map(mapping => {
                    return `${mapping.type}:${mapping.value}`;
                  })
                  .join(',')
              : '';
            if (searchRef) {
              setConceptSet(conceptSet => new Set(conceptSet).add(searchRef));
            } else {
              setErrors(prevErrors => [
                ...prevErrors,
                {
                  errorMessage: `❓ Question object has no UUID / Mappings`,
                  field: question,
                },
              ]);
            }

            const answers = question.questionOptions.answers;
            answers?.length &&
              answers.forEach(answer => {
                setAnswerFields(prevArray => [...prevArray, answer]);
                const searchRef = answer.concept
                  ? answer.concept
                  : answer.conceptMappings?.length
                  ? answer.conceptMappings
                      .map(mapping => {
                        return `${mapping.type}:${mapping.value}`;
                      })
                      .join(',')
                  : '';
                if (searchRef) {
                  setAnswerConceptSet(prevAnswerSet => new Set(prevAnswerSet).add(searchRef));
                } else {
                  setErrors(prevErrors => [
                    ...prevErrors,
                    { errorMessage: `❌ Answer object has no UUID / Mappings`, field: question },
                  ]);
                }
              });

            if (question.type === 'obsGroup') {
              question.questions.forEach(obsGrpQuestion => {
                setQuestionFields(prevArray => [...prevArray, obsGrpQuestion]);
                const searchRef = obsGrpQuestion.questionOptions.concept
                  ? obsGrpQuestion.questionOptions.concept
                  : obsGrpQuestion.questionOptions.conceptMappings?.length
                  ? obsGrpQuestion.questionOptions.conceptMappings
                      ?.map(mapping => {
                        return `${mapping.type}:${mapping.value}`;
                      })
                      .join(',')
                  : '';
                if (searchRef) {
                  setConceptSet(conceptSet => new Set(conceptSet).add(searchRef));
                } else {
                  setErrors(prevErrors => [
                    ...prevErrors,
                    { errorMessage: `❓ Question object has no UUID / Mappings`, field: obsGrpQuestion },
                  ]);
                }

                const answers = obsGrpQuestion.questionOptions.answers;
                answers?.length &&
                  answers.forEach(answer => {
                    setAnswerFields(prevArray => [...prevArray, answer]);
                    const searchRef = answer.concept
                      ? answer.concept
                      : answer.conceptMappings?.length
                      ? answer.conceptMappings
                          .map(mapping => {
                            return `${mapping.type}:${mapping.value}`;
                          })
                          .join(',')
                      : '';
                    if (searchRef) {
                      setAnswerConceptSet(prevAnswerSet => new Set(prevAnswerSet).add(searchRef));
                    } else {
                      setErrors(prevErrors => [
                        ...prevErrors,
                        { errorMessage: `❌ Answer object has no UUID / Mappings`, field: obsGrpQuestion },
                      ]);
                    }
                  });
              });
            }
          }),
        ),
      );
    }
  }, [schema]);

  const { concepts, filteredSet, isLoading } = useDatatype(conceptSet);
  const { concepts: answerConcepts, filteredSet: filteredSetAnswers, isLoading: isLoadingAnswers } = useDatatype(
    answerConceptSet,
  );

  useEffect(() => {
    if (concepts?.length) {
      findUnresolvedConcepts(questionFields, filteredSet);
      concepts?.forEach(concept => {
        dataTypeChecker(concept, questionFields);
      });
      setIsValidating(prevValue => !prevValue);
    }
  }, [concepts]);

  useEffect(() => {
    if (answerConcepts?.length) {
      unresolvedAnswers(answerFields, filteredSetAnswers);
    }
  }, [answerConcepts]);

  if (!doValidate) {
    return { errors: [], warnings: [], isValidating };
  }

  return { errors, warnings, isValidating };
}
