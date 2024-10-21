import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownWrapper: React.FC<{ markdown: string | string[] }> = ({ markdown }) => {
  return (
    <ReactMarkdown
      children={Array.isArray(markdown) ? markdown.join('\n') : markdown}
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
      ]}
    />
  );
};

export default MarkdownWrapper;
