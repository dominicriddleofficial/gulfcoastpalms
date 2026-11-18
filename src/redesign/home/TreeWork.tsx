import { Link } from "react-router-dom";
import Sequence from "../components/Sequence";
import { treeRemovalNote, treeRemovalSequence } from "../data/treeRemoval";
import { QuoteLink } from "../lib/actions";

/** Tree work gets its own proof on the homepage: one removal, shown in order. */
export default function TreeWork() {
  return (
    <section className="rd-section rd-paper-2" aria-labelledby="rd-treework-title">
      <div className="rd-wrap">
        <Sequence
          id="rd-treework-title"
          heading="One tree removal, three frames"
          note={treeRemovalNote}
          frames={treeRemovalSequence}
          action={
            <>
              <QuoteLink placement="home_tree_frames" service="Tree Removal" className="rd-btn rd-btn--go">Get a tree removal quote</QuoteLink>
              <Link to="/services/tree-removal" className="rd-link">About tree removal</Link>
            </>
          }
        />
      </div>
    </section>
  );
}
