import { join } from "path";
import type { IconPositions } from "contexts/session/types";

/**
 * Remove dead desktop slots left by deleted shortcuts, then close vertical
 * gaps for the single-column desktop layout. Keep multi-column/custom layouts.
 * This is called only once after the desktop directory and session load;
 * manual drag-and-drop remains free to place icons wherever the user wants.
 */
export const compactDesktopIconPositions = (
  directory: string,
  entries: string[],
  positions: IconPositions,
  rowsPerColumn: number
): IconPositions => {
  const paths = entries.map((entry) => join(directory, entry));
  const pathSet = new Set(paths);
  const prefix = `${directory}/`;
  const retained = Object.fromEntries(
    Object.entries(positions).filter(
      ([path]) => !path.startsWith(prefix) || pathSet.has(path)
    )
  ) as IconPositions;
  const positioned = paths.filter((path) => {
    const position = retained[path];

    return (
      position &&
      Number.isInteger(position.gridColumnStart) &&
      Number.isInteger(position.gridRowStart) &&
      position.gridColumnStart > 0 &&
      position.gridRowStart > 0
    );
  });

  // Auto-layout on fresh visits; don't overwrite intentional multi-column
  // arrangements saved by someone who has manually moved their icons.
  if (
    positioned.length === 0 ||
    positioned.some((path) => retained[path].gridColumnStart !== 1)
  ) {
    return retained;
  }

  const originalIndex = new Map(paths.map((path, index) => [path, index]));
  positioned.sort(
    (a, b) =>
      retained[a].gridRowStart - retained[b].gridRowStart ||
      (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0)
  );
  const positionedPaths = new Set(positioned);
  const ordered = [
    ...positioned,
    ...paths.filter((path) => !positionedPaths.has(path)),
  ];
  const maxRows = Math.max(1, Math.trunc(rowsPerColumn) || 1);

  for (const [index, path] of ordered.entries()) {
    const next = {
      gridColumnStart: Math.floor(index / maxRows) + 1,
      gridRowStart: (index % maxRows) + 1,
    };
    const previous = retained[path];

    if (
      previous?.gridColumnStart !== next.gridColumnStart ||
      previous?.gridRowStart !== next.gridRowStart
    ) {
      retained[path] = next;
    }
  }

  return retained;
};
