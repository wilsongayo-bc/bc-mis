import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface FrontMatter {
  title?: string;
  description?: string;
  roles?: string[];
  category?: string;
  order?: number;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  // Parse frontmatter and content
  const parseFrontMatter = (markdown: string): { frontMatter: FrontMatter; content: string } => {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);

    if (!match) {
      return { frontMatter: {}, content: markdown };
    }

    const frontMatterText = match[1];
    const contentText = match[2];

    // Simple YAML parser for frontmatter
    const frontMatter: FrontMatter = {};
    frontMatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');

        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          const arrayContent = value.slice(1, -1);
          if (key === 'roles') {
            (frontMatter as { roles: string[] }).roles = arrayContent
              .split(',')
              .map(item => item.trim().replace(/^["']|["']$/g, ''));
          }
        } else if (key === 'order') {
          frontMatter[key] = parseInt(value);
        } else if (key === 'title' || key === 'description' || key === 'category' || key === 'author') {
          // Store these keys directly without modification
          (frontMatter as Record<string, string>)[key] = value;
        } else {
          (frontMatter as Record<string, string>)[key] = value;
        }
      }
    });

    return { frontMatter, content: contentText };
  };

  const { frontMatter, content: markdownContent } = parseFrontMatter(content);

  // Simple markdown parser
  const parseMarkdown = (text: string): string => {
    let html = text;

    // Headers (process from most specific to least specific)
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-gray-900 dark:text-white mt-5 mb-2">$1</h4>');
    // Headers with ### (h3)
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 flex items-center"><span class="w-1 h-6 bg-blue-500 mr-3 rounded"></span>$1</h3>');
    // Headers with ## (h2)
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">$1</h2>');
    // Headers with # (h1)
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-6">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white"><em class="italic">$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>');

    // Code blocks
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```/g, '').trim();
      return `<pre class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-gray-800 dark:text-gray-100">${code}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1 rounded text-sm font-mono border border-gray-200 dark:border-gray-700">$1</code>');

    // Lists
    html = html.replace(/^\s*\* (.*$)/gim, '<li class="ml-4 mb-2 text-gray-900 dark:text-white">• $1</li>');
    html = html.replace(/^\s*- (.*$)/gim, '<li class="ml-4 mb-2 text-gray-900 dark:text-white">• $1</li>');
    html = html.replace(/^\s*\d+\. (.*$)/gim, '<li class="ml-4 mb-2 text-gray-900 dark:text-white list-decimal">$1</li>');

    // Wrap consecutive list items
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul class="my-4 space-y-1">$&</ul>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium">$1</a>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white italic">$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="my-8 border-gray-300 dark:border-gray-700">');

    // Paragraphs - ensure all text content has dark mode support
    html = html.replace(/\n\n/g, '</p><p class="mb-4 text-gray-900 dark:text-white leading-relaxed">');
    html = '<p class="mb-4 text-gray-900 dark:text-white leading-relaxed">' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p[^>]*><\/p>/g, '');

    // Handle special callout boxes
    html = html.replace(/\*\*Problem\*\*: (.*?)(?=\*\*Solutions\*\*|$)/gs, (match, problem) => {
      return `<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-semibold text-red-800 dark:text-red-200">Problem</h4>
            <div class="mt-1 text-sm text-red-700 dark:text-red-200">${problem.replace(/\*\*Problem\*\*:\s*/, '').trim()}</div>
          </div>
        </div>
      </div>`;
    });

    html = html.replace(/\*\*Solutions\*\*:\s*([\s\S]*?)(?=\*\*Problem\*\*|###|##|$)/g, (match, solutions) => {
      return `<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 my-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-semibold text-green-800 dark:text-green-200">Solutions</h4>
            <div class="mt-1 text-sm text-green-700 dark:text-green-200">${solutions.trim()}</div>
          </div>
        </div>
      </div>`;
    });

    // Handle emoji headers - using Unicode property escapes for better emoji support
    html = html.replace(/<h([1-6])[^>]*>([^<]*?)(\p{Emoji})\s*([^<]*?)<\/h\1>/gu,
      '<h$1 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center"><span class="mr-3 text-2xl">$3</span>$2$4</h$1>');

    return html;
  };



  const parsedHtml = parseMarkdown(markdownContent);

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {frontMatter.title && (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {frontMatter.title}
          </h1>
          {frontMatter.description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {frontMatter.description}
            </p>
          )}
        </div>
      )}

      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
    </div>
  );
};
