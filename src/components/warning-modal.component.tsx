import React from 'react';
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';

type Props = {
  onClose: () => void;
  onShowWarningModal: (showWarningModal: boolean) => void;
  t: (key: string, fallback: string) => string;
};

const WarningModal: React.FC<Props> = ({ onClose, onShowWarningModal, t }) => {
  return (
    <ComposedModal preventCloseOnClickOutside open={true} onClose={() => onShowWarningModal(false)}>
      <ModalHeader title={t('discardChanges', 'Discard changes?')}></ModalHeader>
      <ModalBody>
        <p>
          {t(
            'discardWarningText',
            'The changes you made to this form have not been saved. Are you sure you want to discard them?',
          )}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={() => onShowWarningModal(false)}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={onClose}>
          {t('confirm', 'Confirm')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default WarningModal;
