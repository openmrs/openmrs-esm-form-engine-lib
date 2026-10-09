import { type FormSchema, type FormField, type OpenmrsObs, type RenderType } from '../types';
import { isEmpty } from '../validators/form-validator';
import { formatDate, parseDate, type FormatDateOptions, type Visit } from '@openmrs/esm-framework';

export function flattenObsList(obsList: OpenmrsObs[]): OpenmrsObs[] {
  const flattenedList: OpenmrsObs[] = [];

  function flatten(obs: OpenmrsObs): void {
    flattenedList.push(obs);
    if (obs.groupMembers?.length) {
      obs.groupMembers.forEach((groupMember) => {
        flatten(groupMember);
      });
    }
  }
  obsList.forEach((obs) => {
    flatten(obs);
  });

  return flattenedList;
}

export function hasRendering(field: FormField, rendering: RenderType) {
  return field.questionOptions.rendering === rendering;
}

export function clearSubmission(field: FormField) {
  if (!field.meta?.submission) {
    field.meta = { ...(field.meta || {}), submission: {} };
  }
  field.meta.submission = {
    ...field.meta.submission,
    voidedValue: null,
    newValue: null,
  };
}

export function gracefullySetSubmission(field: FormField, newValue: any, voidedValue: any) {
  if (!field.meta?.submission) {
    field.meta = { ...(field.meta || {}), submission: {} };
  }
  if (!isEmpty(newValue)) {
    field.meta.submission.newValue = newValue;
  }
  if (!isEmpty(voidedValue)) {
    field.meta.submission.voidedValue = voidedValue;
  }
  return field.meta.submission.newValue;
}

export function hasSubmission(field: FormField) {
  return !!field.meta.submission?.newValue || !!field.meta.submission?.voidedValue;
}

export function isViewMode(sessionMode: string) {
  return sessionMode === 'view' || sessionMode === 'embedded-view';
}

export function parseToLocalDateTime(dateString: string): Date {
  // The engine submits obs dates as timezone-free wall-clock values, so the offset the
  // server returns describes its own clock rather than the value. Drop it and read the
  // wall clock as written.
  const wallClock = dateString.trim().replace(' ', 'T').replace(/([Zz]|[+-]\d{2}:?\d{2})$/, '');
  return parseDate(wallClock);
}

/**
 * Returns `date` if it falls within the visit's start/stop window, otherwise the
 * visit's start datetime. This keeps default encounter datetimes valid when filling
 * forms against a past (stopped) visit via retrospective data entry; the backend
 * rejects encounters dated outside the visit window.
 */
export function getDateWithinVisitWindow(date: Date, visit?: Visit): Date {
  if (!visit) {
    return date;
  }
  const visitStart = visit.startDatetime ? new Date(visit.startDatetime) : null;
  const visitStop = visit.stopDatetime ? new Date(visit.stopDatetime) : null;
  if ((visitStart && date < visitStart) || (visitStop && date > visitStop)) {
    return visitStart ?? visitStop;
  }
  return date;
}

export function formatDateAsDisplayString(field: FormField, date: Date) {
  const options: Partial<FormatDateOptions> = { noToday: true };
  if (field.datePickerFormat === 'calendar') {
    options.time = false;
  } else {
    options.time = true;
  }
  return formatDate(date, options);
}

/**
 * Creates a new copy of `formJson` with updated references at the page and section levels.
 * This ensures React re-renders properly by providing new references for nested arrays.
 */
export function updateFormSectionReferences(formJson: FormSchema) {
  formJson.pages = formJson.pages.map((page) => {
    page.sections = Array.from(page.sections);
    return page;
  });
  return { ...formJson };
}

/**
 * Converts a px value to a rem value
 * @param px - The px value to convert
 * @param fontSize - The font size to use for the conversion
 * @returns The rem value
 */
export function pxToRem(px: number, fontSize: number = 16) {
  return px / fontSize;
}
