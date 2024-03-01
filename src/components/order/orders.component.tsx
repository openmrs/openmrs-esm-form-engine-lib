import React, { useContext, useEffect, useState } from 'react';
import { OHRIFormFieldProps } from '../../api/types';
import { OHRIFormContext } from '../../ohri-form-context';
import { getFieldControlWithFallback, isUnspecifiedSupported } from '../section/helpers';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { useField } from 'formik';
import styles from './ohri-orders.scss';

export interface OrdersProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIOrders: React.FC<OrdersProps> = ({ question, onChange, deleteControl }) => {
  const [ordersControlMap, setOrdersControlMap] = useState([]);
  const { formFieldHandlers } = useContext(OHRIFormContext);

  useEffect(() => {
    if (question.questions) {
      Promise.all(
        question.questions.map((field) => {
          return getFieldControlWithFallback(field)?.then((result) => ({ field, control: result }));
        }),
      ).then((results) => {
        setOrdersControlMap(results);
      });
    }
  }, [question.questions]);

  // get order content
  const groupContent = ordersControlMap
    .filter((orderMapItem) => !!orderMapItem && !orderMapItem.field.isHidden)
    .map((orderMapItem, index) => {
      const { control, field } = orderMapItem;
      if (control) {
        const questionFragment = React.createElement(control, {
          question: field,
          onChange: onChange,
          key: index,
          handler: formFieldHandlers[field.type],
          useField,
        });
        return <div className={`${styles.flexColumn} ${styles.ordersColumn} `}>{questionFragment}</div>;
      }
    });
  if (groupContent && deleteControl) {
    groupContent.push(deleteControl);
  }
  // return component
  return <div className={styles.flexRow}>{groupContent}</div>;
};
