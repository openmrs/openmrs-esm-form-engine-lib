import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormSchema } from 'src/types';

interface PrintHeaderProps {
    formJson: FormSchema;
    sesssionDate: Date;
}

const PrintHeader = ({ formJson }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t(formJson.name)}</h1>
          <span>{t(formJson.description)}</span>
    </div>
  );
};

export default PrintHeader;
