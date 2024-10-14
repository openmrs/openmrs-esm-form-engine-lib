import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const MarkdownWrapper: React.FC<{ markdown: string | string[] }> = ({ markdown }) => {
  return (
    <ReactMarkdown
      children={Array.isArray(markdown) ? markdown.join('\n') : markdown}
      unwrapDisallowed={true}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
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
        'ul',
        'ol',
        'li',
        'input',
        'sup',
        'sub',
        'del',
      ]}
    />
  );
};

export default MarkdownWrapper;
