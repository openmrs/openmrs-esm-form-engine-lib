import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import styles from './markdown-wrapper.scss';

const components: Components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" />,
};

const MarkdownWrapper: React.FC<{ markdown: string }> = ({ markdown }) => {
  return (
    <div className={styles.markdownWrapper}>
      <ReactMarkdown
        children={markdown}
        unwrapDisallowed={true}
        allowedElements={[
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'p',
          'strong',
          'em',
          'code',
          'pre',
          'ul',
          'ol',
          'li',
          'a',
          'blockquote',
          'hr',
          'br',
        ]}
        components={components}
      />
    </div>
  );
};

export default MarkdownWrapper;
