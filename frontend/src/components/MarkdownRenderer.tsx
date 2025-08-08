import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  searchTerm?: string;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '', 
  searchTerm = '' 
}) => {
  // Highlight search terms in markdown content
  const highlightContent = (text: string, term: string): string => {
    if (!term.trim()) return text;
    
    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    
    // Apply highlighting while preserving markdown syntax
    return text.replace(regex, '**===$1===**');
  };

  // Post-process highlighted content to convert custom markers to HTML
  const processHighlights = (element: React.ReactElement): React.ReactElement => {
    if (typeof element === 'string') {
      // Convert our custom highlight markers to actual highlight spans
      const parts = element.split(/\*\*===(.+?)===\*\*/g);
      if (parts.length > 1) {
        return React.createElement(
          React.Fragment,
          {},
          ...parts.map((part, index) => 
            index % 2 === 1 
              ? React.createElement('mark', { key: index, className: 'search-highlight' }, part)
              : part
          )
        );
      }
    }
    
    if (React.isValidElement(element) && element.props.children) {
      const newChildren = React.Children.map(element.props.children, processHighlights);
      return React.cloneElement(element, {}, ...newChildren);
    }
    
    return element;
  };

  const processedContent = searchTerm ? highlightContent(content, searchTerm) : content;

  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block component with syntax highlighting
          code: ({ node, inline, className, children, ...props }: CodeProps) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  className="code-block"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            
            return (
              <code className={`inline-code ${className || ''}`} {...props}>
                {children}
              </code>
            );
          },
          
          // Custom link component - opens in new tab with security
          a: ({ node, href, children, ...props }) => {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="markdown-link"
                {...props}
              >
                {children}
              </a>
            );
          },
          
          // Custom heading components with proper styling
          h1: ({ node, children, ...props }) => (
            <h1 className="markdown-h1" {...props}>{children}</h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className="markdown-h2" {...props}>{children}</h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className="markdown-h3" {...props}>{children}</h3>
          ),
          h4: ({ node, children, ...props }) => (
            <h4 className="markdown-h4" {...props}>{children}</h4>
          ),
          h5: ({ node, children, ...props }) => (
            <h5 className="markdown-h5" {...props}>{children}</h5>
          ),
          h6: ({ node, children, ...props }) => (
            <h6 className="markdown-h6" {...props}>{children}</h6>
          ),
          
          // Custom list components
          ul: ({ node, children, ...props }) => (
            <ul className="markdown-ul" {...props}>{children}</ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="markdown-ol" {...props}>{children}</ol>
          ),
          li: ({ node, children, ...props }) => (
            <li className="markdown-li" {...props}>{children}</li>
          ),
          
          // Custom paragraph component
          p: ({ node, children, ...props }) => (
            <p className="markdown-p" {...props}>{children}</p>
          ),
          
          // Custom blockquote component
          blockquote: ({ node, children, ...props }) => (
            <blockquote className="markdown-blockquote" {...props}>{children}</blockquote>
          ),
          
          // Custom table components
          table: ({ node, children, ...props }) => (
            <div className="markdown-table-container">
              <table className="markdown-table" {...props}>{children}</table>
            </div>
          ),
          th: ({ node, children, ...props }) => (
            <th className="markdown-th" {...props}>{children}</th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="markdown-td" {...props}>{children}</td>
          ),
          
          // Custom horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="markdown-hr" {...props} />
          ),
          
          // Custom emphasis and strong
          em: ({ node, children, ...props }) => (
            <em className="markdown-em" {...props}>{children}</em>
          ),
          strong: ({ node, children, ...props }) => (
            <strong className="markdown-strong" {...props}>{children}</strong>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;