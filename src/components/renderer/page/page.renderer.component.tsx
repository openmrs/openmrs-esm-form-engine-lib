import React, { useEffect, useMemo, useState } from 'react';
import { type FormSection, type FormPage } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { useTranslation } from 'react-i18next';
import { SectionRenderer } from '../section/section-renderer.component';
import { Waypoint } from 'react-waypoint';
import styles from './page.renderer.scss';
import { Accordion, AccordionItem } from '@carbon/react';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { ChevronDownIcon, ChevronUpIcon } from '@openmrs/esm-framework';
import classNames from 'classnames';

interface PageRendererProps {
  page: FormPage;
  isFormExpanded: boolean;
}

interface CollapsibleSectionContainerProps {
  section: FormSection;
  sectionIndex: number;
  visibleSections: FormSection[];
  isFormExpanded: boolean;
}

function PageRenderer({ page, isFormExpanded }: PageRendererProps) {
  const { t } = useTranslation();
  const pageId = useMemo(() => page.label.replace(/\s/g, ''), [page.label]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { setCurrentPage } = useFormFactory();
  const visibleSections = useMemo(
    () =>
      page.sections.filter((section) => {
        const hasVisibleQuestions = section.questions.some((question) => !isTrue(question.isHidden));
        return !isTrue(section.isHidden) && hasVisibleQuestions;
      }),
    [page.sections],
  );

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  useEffect(() => {
    setIsCollapsed(!isFormExpanded);
  }, [isFormExpanded]);

  return (
    <div>
      <Waypoint onEnter={() => setCurrentPage(pageId)} topOffset="50%" bottomOffset="60%">
        <div className={styles.pageContent}>
          <div className={styles.pageHeader} onClick={toggleCollapse}>
            <p className={styles.pageTitle}>
              {t(page.label)}
              <span className={styles.collapseIconWrapper}>
                {isCollapsed ? (
                  <ChevronDownIcon className={styles.collapseIcon} aria-label="Expand" />
                ) : (
                  <ChevronUpIcon className={styles.collapseIcon} aria-label="Collapse" />
                )}
              </span>
            </p>
          </div>
          <div
            className={classNames({
              [styles.hiddenAccordion]: isCollapsed,
              [styles.accordionContainer]: !isCollapsed,
            })}>
            <Accordion>
              {visibleSections.map((section, index) => (
                <CollapsibleSectionContainer
                  key={`section-${section.label}`}
                  section={section}
                  sectionIndex={index}
                  visibleSections={visibleSections}
                  isFormExpanded={isFormExpanded}
                />
              ))}
            </Accordion>
          </div>
        </div>
      </Waypoint>
    </div>
  );
}

function CollapsibleSectionContainer({
  section,
  sectionIndex,
  visibleSections,
  isFormExpanded,
}: CollapsibleSectionContainerProps) {
  const { t } = useTranslation();
  const [isSectionOpen, setIsSectionOpen] = useState(isFormExpanded);

  useEffect(() => {
    setIsSectionOpen(isFormExpanded);
  }, [isFormExpanded]);

  return (
    <AccordionItem
      title={t(section.label)}
      open={isSectionOpen}
      className={classNames(styles.sectionContainer, {
        [styles.firstSection]: sectionIndex === 0,
        [styles.lastSection]: sectionIndex === visibleSections.length - 1,
      })}>
      <div className={styles.formSection}>
        <SectionRenderer section={section} />
      </div>
    </AccordionItem>
  );
}

export default PageRenderer;
