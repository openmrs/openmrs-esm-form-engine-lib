import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComposedModal, ModalHeader, ModalBody, ModalFooter, Button } from '@carbon/react';

interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  showModal: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ onConfirm, onCancel, showModal }) => {
  const { t } = useTranslation();

  return (
    <ComposedModal open={showModal} onClose={onCancel} preventCloseOnClickOutside>
      <ModalHeader title={t('deleteQuestionConfirmation', 'Are you sure you want to delete this question?')} />
      <ModalBody>
        <p>{t('deleteQuestionExplainerText', 'This action cannot be undone.')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={onConfirm}>
          {t('deleteQuestion', 'Delete question')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default DeleteModal;
