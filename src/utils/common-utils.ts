import { OHRIFormField, OpenmrsObs, RenderType, AttachmentResponse, Attachment } from '../api/types';
import { formatDate } from '@openmrs/esm-framework';

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

export function hasRendering(field: OHRIFormField, rendering: RenderType) {
  return field.questionOptions.rendering === rendering;
}

export function createGalleryEntry(data: AttachmentResponse): Attachment {
  const attachmentUrl = '/ws/rest/v1/attachment';
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
