
const formLocale = (language) => {
  switch (language) {
    case 'sw':
      return language.sw;
    case 'en':
      return language.en;
    case 'pt':
      return language.pt;
    default:
      return language.en;
  }
};

const translatedForm = (language) => {
  const inputForm = formLocale(language);
  return translateLabels(inputForm);
};

const translateLabels = (inputData) => {
  const translations = inputData.translations;

  const translateLabel = (label) => translations[label] || label;

  const translateQuestions = (questions) =>
    questions.map((question) => ({
      ...question,
      label: translateLabel(question.label),
    }));

  const translateSections = (sections) =>
    sections.map((section) => ({
      ...section,
      label: translateLabel(section.label),
      questions: translateQuestions(section.questions),
    }));

  const translatePages = (pages) =>
    pages.map((page) => ({
      ...page,
      label: translateLabel(page.label),
      sections: translateSections(page.sections),
    }));

  return {
    ...inputData,
    pages: translatePages(inputData.pages),
  };
};

export default translatedForm;
