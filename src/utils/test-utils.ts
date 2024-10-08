export async function findNumberInput(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('spinbutton', { name });
}

export async function findTextOrDateInput(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('textbox', { name });
}

export async function findRadioGroupInput(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('group', { name });
}

export async function findRadioGroupMember(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('radio', { name });
}

export async function findCheckboxGroup(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('group', { name: new RegExp(name, 'i') });
}

export async function findCheckboxSearchable(screen, nameSubstring: string): Promise<HTMLInputElement> {
  return await screen.findByRole('combobox', { name: new RegExp(nameSubstring, 'i') });
}

export async function findSelectInput(screen, name: string): Promise<HTMLInputElement> {
  return await screen.findByRole('combobox', { name });
}

export async function findAllRadioGroupInputs(screen, name: string): Promise<Array<HTMLInputElement>> {
  return await screen.queryAllByRole('group', { name });
}

export async function findAllRadioGroupMembers(screen, name: string): Promise<Array<HTMLInputElement>> {
  return await screen.queryAllByRole('radio', { name });
}

export async function findAllTextOrDateInputs(screen, name: string): Promise<Array<HTMLInputElement>> {
  return await screen.queryAllByRole('textbox', { name });
}

const fieldTypeToGetterMap = {
  text: findTextOrDateInput,
  date: findTextOrDateInput,
  number: findNumberInput,
  radio: findRadioGroupInput,
  'radio-group': findRadioGroupInput,
  'radio-item': findRadioGroupMember,
  textarea: findTextOrDateInput,
  checkbox: findCheckboxGroup,
  'checkbox-searchable': findCheckboxSearchable,
  select: findSelectInput,
};

export async function assertFormHasAllFields(screen, fields: Array<{ fieldName: string; fieldType: string }>) {
  const fieldsInDom = await Promise.all(
    fields.map(({ fieldName, fieldType }) => fieldTypeToGetterMap[fieldType](screen, fieldName)),
  );
  await Promise.all(fieldsInDom.map((field) => expect(field).toBeInTheDocument()));
}
