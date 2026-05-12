import { useMemo, useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Wrench, Search } from "lucide-react";

// Vite raw import — bundles markdown at build time.
const workflowModules = import.meta.glob("/docs/platform/workflows/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const runbookModules = import.meta.glob("/docs/platform/runbooks/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type Doc = {
  id: string;
  title: string;
  category: "workflow" | "runbook";
  body: string;
};

function buildDocs(
  modules: Record<string, string>,
  category: Doc["category"],
): Doc[] {
  return Object.entries(modules)
    .map(([path, body]) => {
      const filename = path.split("/").pop() ?? path;
      const id = filename.replace(/\.md$/, "");
      const titleMatch = body.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : id;
      return { id, title, category, body };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export default function PlatformDocs() {
  const docs = useMemo<Doc[]>(
    () => [
      ...buildDocs(workflowModules, "workflow"),
      ...buildDocs(runbookModules, "runbook"),
    ],
    [],
  );
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(docs[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q),
    );
  }, [docs, query]);

  const active = docs.find((d) => d.id === activeId) ?? filtered[0];

  const workflows = filtered.filter((d) => d.category === "workflow");
  const runbooks = filtered.filter((d) => d.category === "runbook");

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <header>
          <h1
            className="font-display font-bold"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            Internal Documentation
          </h1>
          <p
            className="font-body mt-1"
            style={{ fontSize: "13px", color: "hsl(220 8% 50%)" }}
          >
            Platform workflows and production runbooks
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar */}
          <aside
            className="rounded-2xl p-3 space-y-3 self-start"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
            }}
          >
            <div
              className="flex items-center gap-2 rounded-lg px-2.5 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
              }}
            >
              <Search className="w-3.5 h-3.5 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs"
                className="bg-transparent border-0 outline-none w-full font-body text-sm text-white placeholder:text-white/30"
              />
            </div>

            <DocGroup
              icon={BookOpen}
              label="Workflows"
              docs={workflows}
              activeId={activeId}
              onPick={setActiveId}
            />
            <DocGroup
              icon={Wrench}
              label="Runbooks"
              docs={runbooks}
              activeId={activeId}
              onPick={setActiveId}
            />
          </aside>

          {/* Reader */}
          <article
            className="rounded-2xl p-5 md:p-7 min-h-[60vh]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
            }}
          >
            {active ? (
              <div className="docs-prose font-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {active.body}
                </ReactMarkdown>
              </div>
            ) : (
              <p
                className="font-body"
                style={{ fontSize: "13px", color: "hsl(220 8% 50%)" }}
              >
                No matching documents.
              </p>
            )}
          </article>
        </div>
      </div>
    </PlatformLayout>
  );
}

function DocGroup({
  icon: Icon,
  label,
  docs,
  activeId,
  onPick,
}: {
  icon: typeof BookOpen;
  label: string;
  docs: Doc[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  if (docs.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center gap-2 px-2 pt-1 font-body uppercase"
        style={{
          fontSize: "10px",
          letterSpacing: "0.14em",
          color: "hsl(220 8% 50%)",
        }}
      >
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <ul className="space-y-0.5">
        {docs.map((d) => {
          const active = d.id === activeId;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onPick(d.id)}
                className="w-full text-left rounded-lg px-2.5 py-1.5 font-body transition-colors"
                style={{
                  fontSize: "12.5px",
                  background: active
                    ? "rgba(var(--biz-accent-rgb),0.16)"
                    : "transparent",
                  color: active ? "#fff" : "hsl(220 8% 70%)",
                  border: active
                    ? "1px solid rgba(var(--biz-accent-rgb),0.24)"
                    : "1px solid transparent",
                }}
              >
                {d.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}