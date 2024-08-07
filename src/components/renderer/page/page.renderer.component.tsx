import React, { useMemo } from 'react';
import { type FormPage } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { useTranslation } from 'react-i18next';
import { SectionRenderer } from '../section/section-renderer.component';
import { Waypoint } from 'react-waypoint';
import styles from './page.renderer.scss';
import { Accordion, AccordionItem } from '@carbon/react';
import { useFormFactory } from '../../../provider/form-factory-provider';

interface PageRendererProps {
  page: FormPage;
}

function PageRenderer({ page }: PageRendererProps) {
  const { t } = useTranslation();
  const pageId = useMemo(() => page.label.replace(/\s/g, ''), [page.label]);

  const { setCurrentPage } = useFormFactory();
  const visibleSections = page.sections.filter((section) => {
    const hasVisibleQuestions = section.questions.some((question) => !isTrue(question.isHidden));
    return !isTrue(section.isHidden) && hasVisibleQuestions;
  });
  return (
    <div>
      <Waypoint onEnter={() => setCurrentPage(pageId)} topOffset="50%" bottomOffset="60%">
        <div className={styles.pageContent}>
          <div className={styles.pageHeader}>
            <p className={styles.pageTitle}>{t(page.label)}</p>
          </div>
          <Accordion>
            {visibleSections.map((section) => (
              <AccordionItem
                title={t(section.label)}
                open={true}
                className={styles.sectionContainer}
                key={`section-${section.label}`}>
                <div className={styles.formSection}>
                  <SectionRenderer section={section} />
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Waypoint>
    </div>
  );
}

export default PageRenderer;
