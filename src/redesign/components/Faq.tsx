/**
 * Questions and answers as native open/close rows: they work before any JavaScript
 * loads and the answers stay in the page for search engines.
 *
 * With `limit`, the first few show and the rest sit behind one "show all" button.
 */
import { useState } from "react";
import { PlusIcon } from "../lib/icons";

interface FaqProps {
  items: { q: string; a: string }[];
  limit?: number;
}

export default function Faq({ items, limit }: FaqProps) {
  const [all, setAll] = useState(false);
  const cut = limit && !all ? limit : items.length;
  return (
    <div>
      <div className="rd-faq">
        {items.map((item, i) => (
          <details key={item.q} hidden={i >= cut}>
            <summary>
              <span>{item.q}</span>
              <PlusIcon size={20} />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      {limit && items.length > limit && !all && (
        <button type="button" className="rd-btn rd-btn--line rd-faq__more" onClick={() => setAll(true)}>
          Show all {items.length} questions
        </button>
      )}
    </div>
  );
}
