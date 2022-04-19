import React from 'react';
import styles from './_page.scss';
import OHRIFormSection from '../section/ohri-form-section.component';
import { Waypoint } from 'react-waypoint';
import { Accordion, AccordionItem } from 'carbon-components-react';

function OHRIFormPage({ page, onFieldChange, setSelectedPage, isCollapsed }) {
  let newLabel = page.label.replace(/\s/g, '');

  const handleEnter = elementID => {
    setSelectedPage(elementID);
  };

  return (
    <Waypoint onEnter={() => handleEnter(newLabel)} topOffset="50%" bottomOffset="60%">
      <div id={newLabel} className={styles.pageContent}>
        <div style={{}} className={styles.pageHeader}>
          <p className={styles.pageTitle}>{page.label}</p>
        </div>
        <Accordion>
          {/* <p className={styles.required}>All fields are required unless marked optional</p> */}
          {page.sections.map((sec, index) => {
            return (
              <AccordionItem title={sec.label} open={isCollapsed} className={styles.sectionContent} key={index}>
                <div className={styles.formSection} key={index}>
                  <OHRIFormSection
                    fields={sec.questions}
                    showTitle={page.sections.length > 1}
                    onFieldChange={onFieldChange}
                    sectionTitle={sec.label}
                    key={index}
                  />
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </Waypoint>
  );
}

export default OHRIFormPage;
