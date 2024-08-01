import { type FormField, type OpenmrsObs, type RenderType } from '../types';
import { isEmpty } from '../validators/form-validator';

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
