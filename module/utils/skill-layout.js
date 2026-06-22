const AGENT_SKILL_COLUMNS = 3;

/**
 * Reorders a flat array into column-major order for grid display.
 *
 * @param {object[]} arr
 * @param {number} numCols
 * @returns {object[]}
 */
export function reorderForColumnSorting(arr, numCols) {
  const reordered = new Array(arr.length);

  const baseRowCount = Math.floor(arr.length / numCols);
  const extraColumns = arr.length % numCols;

  const colHeights = new Array(numCols).fill(baseRowCount);
  for (let i = 0; i < extraColumns; i++) {
    colHeights[i] += 1;
  }

  let index = 0;

  for (let col = 0; col < numCols; col++) {
    const rowCount = colHeights[col];

    for (let row = 0; row < rowCount; row++) {
      const newIndex = numCols * row + col;

      if (newIndex < arr.length) {
        reordered[newIndex] = arr[index];
        index += 1;
      }
    }
  }

  return reordered;
}

/**
 * Column-major packing (matches legacy reorderForColumnSorting + 3-column grid).
 *
 * @template T
 * @param {T[]} items
 * @param {number} numCols
 * @returns {T[][]}
 */
function packItemsColumnMajor(items, numCols) {
  const reordered = reorderForColumnSorting([...items], numCols);
  const columns = Array.from(
    { length: numCols },
    () => /** @type {T[]} */ ([]),
  );

  for (let col = 0; col < numCols; col++) {
    for (let row = 0; row * numCols + col < reordered.length; row++) {
      const item = reordered[row * numCols + col];
      if (item !== undefined) {
        columns[col].push(item);
      }
    }
  }

  return columns;
}

/**
 * Row-major packing: alphabetical left-to-right, top-to-bottom across columns.
 *
 * @template T
 * @param {T[]} items
 * @param {number} numCols
 * @returns {T[][]}
 */
function packItemsRowMajor(items, numCols) {
  const columns = Array.from(
    { length: numCols },
    () => /** @type {T[]} */ ([]),
  );

  for (let i = 0; i < items.length; i++) {
    columns[i % numCols].push(items[i]);
  }

  return columns;
}

/**
 * Packs items into column arrays for vertical stacking (top-to-bottom per column).
 *
 * @template T
 * @param {T[]} items
 * @param {number} numCols
 * @param {{ sortByColumn?: boolean }} [options]
 * @returns {T[][]}
 */
export function packItemsIntoWeightedColumns(
  items,
  numCols,
  { sortByColumn = false } = {},
) {
  if (numCols <= 1) return [items];

  if (items.length === 0) {
    return Array.from({ length: numCols }, () => /** @type {T[]} */ ([]));
  }

  if (sortByColumn) {
    return packItemsColumnMajor(items, numCols);
  }

  return packItemsRowMajor(items, numCols);
}

/**
 * Packs agent skills into sheet columns.
 *
 * @param {object[]} sortedSkills
 * @param {boolean} sortByColumn
 * @param {number} [numCols]
 * @returns {object[][]}
 */
export function prepareAgentSkillColumns(
  sortedSkills,
  sortByColumn,
  numCols = AGENT_SKILL_COLUMNS,
) {
  return packItemsIntoWeightedColumns(sortedSkills, numCols, { sortByColumn });
}

/**
 * Splits a flat list into column arrays for vertical stacking (top-to-bottom per column).
 *
 * @template T
 * @param {T[]} arr
 * @param {number} numCols
 * @returns {T[][]}
 */
export function splitIntoColumns(arr, numCols) {
  if (numCols <= 1) return [arr];
  const columns = Array.from(
    { length: numCols },
    () => /** @type {T[]} */ ([]),
  );
  const perCol = Math.ceil(arr.length / numCols);
  for (let col = 0; col < numCols; col++) {
    columns[col] = arr.slice(col * perCol, (col + 1) * perCol);
  }
  return columns;
}
