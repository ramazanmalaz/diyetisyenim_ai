import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * AI yanıtlarını Markdown olarak render eder (başlık, liste, tablo, kalın vb.).
 * Sohbet balonu içinde okunaklı, sade stiller.
 */
const COMPONENTS: Components = {
  h1: ({ children }) => <p className="mt-2 mb-1 font-bold">{children}</p>,
  h2: ({ children }) => <p className="mt-2 mb-1 font-bold">{children}</p>,
  h3: ({ children }) => (
    <p className="mt-2 mb-0.5 font-semibold">{children}</p>
  ),
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-1.5 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-current/30 pl-3 opacity-90">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-current/20" />,
  code: ({ children }) => (
    <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-current/20 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-current/20 px-2 py-1 align-top">{children}</td>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  );
}
