/**
 * Reorders a flat array into column-major order for grid display.
 *
 * @param {object[]} arr
 * @param {number} numCols
 * @returns {object[]}
 */
export function reorderForColumnSorting(arr, numCols) {
  const numRows = Math.ceil(arr.length / numCols);
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
 * @param {object} column
 * @param {object} group
 * @returns {void}
 */
function appendSkillGroupToColumn(column, group) {
  column.blocks.push({
    type: "groupHeader",
    group: group.group,
    label: group.label,
    ...(group.isSpecialTraining ? { isSpecialTraining: true } : {}),
  });

  const skillType = group.isSpecialTraining ? "training" : "typedSkill";
  for (const skill of group.skills) {
    column.blocks.push({ ...skill, type: skillType });
  }

  column.height += group.rowCount;
}

/**
 * @param {object[]} groups
 * @param {number} numCols
 * @returns {object[][]}
 */
function packSkillGroupsByColumn(groups, numCols) {
  const columns = Array.from({ length: numCols }, () => ({
    blocks: [],
    height: 0,
  }));

  if (groups.length === 0) {
    return columns.map((col) => col.blocks);
  }

  const totalHeight = groups.reduce((sum, group) => sum + group.rowCount, 0);
  const targetHeight = totalHeight / numCols;
  let colIndex = 0;

  for (const group of groups) {
    const col = columns[colIndex];

    if (
      colIndex < numCols - 1 &&
      col.blocks.length > 0 &&
      col.height + group.rowCount > targetHeight
    ) {
      colIndex += 1;
    }

    appendSkillGroupToColumn(columns[colIndex], group);
  }

  return columns.map((col) => col.blocks);
}

/**
 * @param {object[]} groups
 * @param {number} numCols
 * @returns {object[][]}
 */
function packSkillGroupsByRow(groups, numCols) {
  const columns = Array.from({ length: numCols }, () => ({
    blocks: [],
    height: 0,
  }));

  for (let i = 0; i < groups.length; i++) {
    appendSkillGroupToColumn(columns[i % numCols], groups[i]);
  }

  return columns.map((col) => col.blocks);
}

/**
 * Packs skill groups into columns without splitting a group across columns.
 *
 * @param {object[]} groups
 * @param {number} numCols
 * @param {boolean} sortByColumn
 * @returns {object[][]}
 */
export function packSkillGroupsIntoColumns(groups, numCols, sortByColumn) {
  if (sortByColumn) {
    return packSkillGroupsByColumn(groups, numCols);
  }
  return packSkillGroupsByRow(groups, numCols);
}
