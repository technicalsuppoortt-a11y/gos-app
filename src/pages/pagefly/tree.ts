import type { Device, PFNode, PFType, ResponsiveStyle, StyleMap } from './types';

export const uid = (prefix = 'pf') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Container types and which children they can hold. */
const SPECIFIC_CHILD: Partial<Record<PFType, PFType>> = { row: 'column', tabs: 'tab', accordion: 'accordion-item', slideshow: 'slide' };
const NEEDS_PARENT: Partial<Record<PFType, PFType>> = { column: 'row', tab: 'tabs', 'accordion-item': 'accordion', slide: 'slideshow' };
export const CONTAINER_TYPES: PFType[] = ['section', 'row', 'column', 'block', 'tabs', 'tab', 'accordion', 'accordion-item', 'popup', 'slideshow', 'slide', 'mc-form'];

export const isContainer = (type: PFType) => CONTAINER_TYPES.includes(type);

export function canContain(parent: PFType | null, child: PFType): boolean {
  if (parent === null) return child === 'section';
  if (!isContainer(parent)) return false;
  const specific = SPECIFIC_CHILD[parent];
  if (specific) return child === specific;
  const required = NEEDS_PARENT[child];
  if (required) return false;
  return true;
}

export function findNode(nodes: PFNode[], id: string | null): PFNode | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) { const found = findNode(node.children, id); if (found) return found; }
  }
  return undefined;
}

export function findParent(nodes: PFNode[], id: string, parent: PFNode | null = null): { parent: PFNode | null; index: number } | undefined {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node.id === id) return { parent, index };
    if (node.children) { const found = findParent(node.children, id, node); if (found) return found; }
  }
  return undefined;
}

export function getPath(nodes: PFNode[], id: string | null): PFNode[] {
  if (!id) return [];
  for (const node of nodes) {
    if (node.id === id) return [node];
    if (node.children) { const sub = getPath(node.children, id); if (sub.length) return [node, ...sub]; }
  }
  return [];
}

export function updateNode(nodes: PFNode[], id: string, change: (node: PFNode) => PFNode): PFNode[] {
  return nodes.map(node => node.id === id ? change(node) : node.children ? { ...node, children: updateNode(node.children, id, change) } : node);
}

export function removeNode(nodes: PFNode[], id: string): PFNode[] {
  return nodes.filter(node => node.id !== id).map(node => node.children ? { ...node, children: removeNode(node.children, id) } : node);
}

export function insertNode(nodes: PFNode[], parentId: string | null, index: number, node: PFNode): PFNode[] {
  const parent = parentId === null ? null : findNode(nodes, parentId);
  if ((parentId !== null && !parent) || !canContain(parent?.type ?? null, node.type)) return nodes;
  if (parentId === null) { const next = [...nodes]; next.splice(Math.max(0, Math.min(index, next.length)), 0, node); return next; }
  return updateNode(nodes, parentId, parent => { const children = [...(parent.children ?? [])]; children.splice(Math.max(0, Math.min(index, children.length)), 0, node); return { ...parent, children }; });
}

export function containsNode(node: PFNode, id: string): boolean {
  return Boolean(node.children?.some(child => child.id === id || containsNode(child, id)));
}

export function moveNode(nodes: PFNode[], id: string, parentId: string | null, index: number): PFNode[] {
  const node = findNode(nodes, id);
  if (!node || id === parentId || (parentId && containsNode(node, parentId))) return nodes;
  const parent = parentId === null ? null : findNode(nodes, parentId);
  if ((parentId !== null && !parent) || !canContain(parent?.type ?? null, node.type)) return nodes;
  const origin = findParent(nodes, id);
  let target = index;
  if (origin && (origin.parent?.id ?? null) === parentId && origin.index < index) target -= 1;
  return insertNode(removeNode(nodes, id), parentId, target, node);
}

export function cloneWithNewIds(node: PFNode): PFNode {
  return { ...structuredClone(node), id: uid(node.type), children: node.children?.map(cloneWithNewIds) };
}

export function duplicateNode(nodes: PFNode[], id: string): { nodes: PFNode[]; newId: string | null } {
  const node = findNode(nodes, id), origin = findParent(nodes, id);
  if (!node || !origin) return { nodes, newId: null };
  const copy = cloneWithNewIds(node);
  return { nodes: insertNode(nodes, origin.parent?.id ?? null, origin.index + 1, copy), newId: copy.id };
}

export function countNodes(nodes: PFNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children ?? []), 0);
}

const CASCADE: Device[] = ['desktop', 'laptop', 'tablet', 'mobile'];
/** Desktop styles cascade down to smaller devices; each device can override. */
export function effectiveStyle(style: ResponsiveStyle, device: Device): StyleMap {
  const result: StyleMap = {};
  for (const step of CASCADE) {
    Object.assign(result, style[step] ?? {});
    if (step === device) break;
  }
  return result;
}

/** Find the nearest valid placement for a new element of `type` relative to the current selection. */
export function placementFor(nodes: PFNode[], selectedId: string | null, type: PFType): { parentId: string | null; index: number } | null {
  if (selectedId) {
    const selected = findNode(nodes, selectedId);
    if (selected && canContain(selected.type, type)) return { parentId: selected.id, index: selected.children?.length ?? 0 };
    const path = getPath(nodes, selectedId);
    for (let i = path.length - 1; i >= 0; i--) {
      const current = path[i], parent = path[i - 1] ?? null;
      if (canContain(parent?.type ?? null, type)) {
        const siblings = parent ? parent.children ?? [] : nodes;
        return { parentId: parent?.id ?? null, index: siblings.findIndex(item => item.id === current.id) + 1 };
      }
      if (canContain(current.type, type)) return { parentId: current.id, index: current.children?.length ?? 0 };
    }
  }
  if (canContain(null, type)) return { parentId: null, index: nodes.length };
  return null;
}

export function walk(nodes: PFNode[], visit: (node: PFNode) => void) {
  for (const node of nodes) { visit(node); if (node.children) walk(node.children, visit); }
}
