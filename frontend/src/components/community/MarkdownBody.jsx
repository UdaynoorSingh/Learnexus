import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark-dimmed.css';

const MarkdownBody = ({ children, className = '' }) => (
  <div className={`nexus-markdown ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: (props) => (
          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
        )
      }}
    >
      {children || ''}
    </ReactMarkdown>
  </div>
);

export default MarkdownBody;
