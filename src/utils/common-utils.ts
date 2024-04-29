import { formatDate, restBaseUrl } from '@openmrs/esm-framework';
import { type Attachment, type AttachmentResponse, type FormField, type OpenmrsObs, type RenderType } from '../types';

export function flattenObsList(obsList: OpenmrsObs[]): OpenmrsObs[] {
  const flattenedList: OpenmrsObs[] = [];

  function flatten(obs: OpenmrsObs): void {
    if (!obs.groupMembers || obs.groupMembers.length === 0) {
      flattenedList.push(obs);
    } else {
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
