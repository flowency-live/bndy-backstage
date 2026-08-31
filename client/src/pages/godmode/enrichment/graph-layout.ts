import type { BacklineGraphNode } from '@/lib/services/backline-service';

export type PositionedGraphNode = BacklineGraphNode & { x: number; y: number };

export function positionNeighborhood(
  nodes: BacklineGraphNode[],
  centerRef: string,
  width = 1000,
  height = 620,
): PositionedGraphNode[] {
  const center = nodes.find((node) => node.ref === centerRef);
  const neighbours = nodes.filter((node) => node.ref !== centerRef);
  const result: PositionedGraphNode[] = [];
  if (center) result.push({ ...center, x: width / 2, y: height / 2 });
  if (!neighbours.length) return result;

  const radiusX = Math.min(width * 0.39, 390);
  const radiusY = Math.min(height * 0.37, 230);
  neighbours.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / neighbours.length - Math.PI / 2;
    result.push({
      ...node,
      x: width / 2 + Math.cos(angle) * radiusX,
      y: height / 2 + Math.sin(angle) * radiusY,
    });
  });
  return result;
}

