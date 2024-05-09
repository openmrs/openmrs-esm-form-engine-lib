import { formatDate, restBaseUrl } from '@openmrs/esm-framework';
import { type Attachment, type AttachmentResponse, type FormField, type OpenmrsObs, type RenderType } from '../types';
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
    // if (!obs.groupMembers || obs.groupMembers.length === 0) {
    //   flattenedList.push(obs);
    // } else {
    //   obs.groupMembers.forEach((groupMember) => {
    //     flatten(groupMember);
    //   });
    // }
  }
  obsList.forEach((obs) => {
    flatten(obs);
  });

  return flattenedList;
}

export function hasRendering(field: FormField, rendering: RenderType) {
  return field.questionOptions.rendering === rendering;
}

export function createAttachment(data: AttachmentResponse): Attachment {
  const attachmentUrl = `${restBaseUrl}/attachment`;
  return {
    id: data.uuid,
    src: `${window.openmrsBase}${attachmentUrl}/${data.uuid}/bytes`,
    title: data.comment,
    description: '',
    dateTime: formatDate(new Date(data.dateTime), {
      mode: 'wide',
    }),
    bytesMimeType: data.bytesMimeType,
    bytesContentFamily: data.bytesContentFamily,
  };
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
