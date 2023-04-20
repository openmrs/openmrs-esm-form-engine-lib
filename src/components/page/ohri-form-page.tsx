import React from 'react';
import styles from './_page.scss';
import OHRIFormSection from '../section/ohri-form-section.component';
import { Waypoint } from 'react-waypoint';
import { Accordion, AccordionItem } from '@carbon/react';
import { isTrue } from '../../utils/boolean-utils';

function OHRIFormPage({ page, onFieldChange, setSelectedPage, isCollapsed }) {
  let newLabel = page.label.replace(/\s/g, '');

  const handleEnter = elementID => {
    setSelectedPage(elementID);
  };

  const visibleSections = page.sections.filter(sec => !isTrue(sec.isHidden));
  const visibleSectionsJSX = visibleSections.map((sec, index) => {
    const hasHiddenQuestionsInSection = sec.questions.every(question => question.isHidden);
    return (
      !hasHiddenQuestionsInSection && (
        <AccordionItem title={sec.label} open={isCollapsed} className={styles.sectionContent} key={`section-${sec.id}`}>
          <div className={styles.formSection}>
            <OHRIFormSection fields={sec.questions} onFieldChange={onFieldChange} />
          </div>
        </AccordionItem>
      )
    );
  });

  return (
    <Waypoint onEnter={() => handleEnter(newLabel)} topOffset="50%" bottomOffset="60%">
      <div id={newLabel} className={styles.pageContent}>
        <div className={styles.pageHeader}>
          <p className={styles.pageTitle}>{page.label}</p>
        </div>
        <Accordion>{visibleSectionsJSX}</Accordion>
      </div>
    </Waypoint>
  );
}

export default OHRIFormPage;
