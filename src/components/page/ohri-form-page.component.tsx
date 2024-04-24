import React, { useMemo } from 'react';
import { Accordion, AccordionItem } from '@carbon/react';
import { Waypoint } from 'react-waypoint';
import { isTrue } from '../../utils/boolean-utils';
import OHRIFormSection from '../section/ohri-form-section.component';
import styles from './ohri-form-page.scss';
import { OHRIFormContext } from '../../ohri-form-context';

function OHRIFormPage({ page, onFieldChange, setSelectedPage, isFormExpanded }) {
  const trimmedLabel = useMemo(() => page.label.replace(/\s/g, ''), [page.label]);
  const { encounterContext } = React.useContext(OHRIFormContext);
  const visibleSections = page.sections.filter((section) => {
    const hasVisibleQuestions = section.questions.some((question) => !isTrue(question.isHidden));
    return !isTrue(section.isHidden) && hasVisibleQuestions;
  });

  return encounterContext.sessionMode == 'embedded-view' ? (
    <div>
      <div className={styles.pageHeader}>
        <p className={styles.pageTitle}>{page.label}</p>
      </div>
      {visibleSections.map((section) => (
        <div className={styles.embeddedFormSection}>
          <div className={styles.sectionHeader}>{section.label}</div>
          <OHRIFormSection
            fields={section.questions.filter((question) => !isTrue(question.isHidden))}
            onFieldChange={onFieldChange}
          />
        </div>
      ))}
    </div>
  ) : (
    <Waypoint onEnter={() => setSelectedPage(trimmedLabel)} topOffset="50%" bottomOffset="60%">
      <div id={trimmedLabel} className={styles.pageContent}>
        <div className={styles.pageHeader}>
          <p className={styles.pageTitle}>{page.label}</p>
        </div>
        <Accordion>
          {visibleSections.map((section) => (
            <AccordionItem
              title={section.label}
              open={isFormExpanded !== undefined ? isFormExpanded : isTrue(section.isExpanded)}
              className={styles.sectionContent}
              key={`section-${section.id}`}>
              <div className={styles.formSection}>
                <OHRIFormSection
                  fields={section.questions.filter((question) => !isTrue(question.isHidden))}
                  onFieldChange={onFieldChange}
                />
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Waypoint>
  );
}

export default OHRIFormPage;
