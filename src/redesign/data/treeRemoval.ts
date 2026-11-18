/**
 * The one tree-removal job on file: three frames from the business's own job video
 * (src/assets/facebook/README.md). Captions say only what each frame shows.
 */
import type { SequenceFrame } from "../components/Sequence";
import standing from "@/assets/facebook/tree-removal-1.jpg?w=360;540;720&format=avif;webp;jpg&as=picture";
import goingOver from "@/assets/facebook/tree-removal-2.jpg?w=360;540;720&format=avif;webp;jpg&as=picture";
import down from "@/assets/facebook/tree-removal-3.jpg?w=360;540;720&format=avif;webp;jpg&as=picture";

export const treeRemovalShots = {
  standing: {
    photo: standing,
    alt: "A worker in a helmet with a chainsaw at the base of a tall leaning tree, close beside a multi-story building",
    caption: "A tall leaning tree, close to the building. The sawyer starts at the base.",
  },
  goingOver: {
    photo: goingOver,
    alt: "The tree starting to fall away from the building as the worker steps back from the cut",
    caption: "The tree goes over, away from the building.",
  },
  down: {
    photo: down,
    alt: "The tree on the ground, pointing away from the building, with the worker standing at the stump",
    caption: "Down, with the trunk clear of the wall.",
  },
} satisfies Record<string, SequenceFrame>;

export const treeRemovalSequence: SequenceFrame[] = [treeRemovalShots.standing, treeRemovalShots.goingOver, treeRemovalShots.down];

export const treeRemovalNote = "Frames from our own video of a removal beside a building.";
