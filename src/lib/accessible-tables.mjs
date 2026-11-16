/** Make Streamdown's existing table scroll area reachable from the keyboard. */
export function accessibleTables() {
  /** @param {import('hast').Root | import('hast').Element} node */
  function visit(node) {
    if (node.type === 'element' && node.tagName === 'table') {
      node.properties.tabIndex = 0;
      node.properties.ariaLabel ??= 'Table, scroll horizontally with arrow keys';
    }
    if ('children' in node) {
      for (const child of node.children) {
        if (child.type === 'element') visit(child);
      }
    }
  }
  return visit;
}
