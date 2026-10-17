import { CollisionDetection, pointerWithin, rectIntersection } from '@dnd-kit/core';

export const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length === 0) {
    return rectIntersection(args);
  }

  // dnd-kit pointerWithin returns items in order of area / overlap
  // We'll take the first hit
  const firstCollision = pointerCollisions[0];
  const targetId = firstCollision.id;
  
  // Find the DOM node
  const targetElement = typeof targetId === 'string' ? document.getElementById(`sortable-item-${targetId}`) : null;

  if (targetElement && args.pointerCoordinates) {
    const rect = targetElement.getBoundingClientRect();
    const y = args.pointerCoordinates.y;
    const relativeY = y - rect.top;
    const percentage = relativeY / rect.height;

    const isFolder = targetElement.dataset.type === 'folder';
    const isEmpty = targetElement.dataset.empty === 'true';

    // Context Arbitration
    if (isFolder && percentage >= 0.2 && percentage <= 0.8) {
      if (isEmpty) {
        // Redirect the collision explicitly to the folder's internal placeholder
        return [{ id: `placeholder-${targetId}`, data: firstCollision.data }];
      }
      // If we fall here, it's a closed folder or open with hidden children.
      // We return a "nest" indicator by prefixing the id, or we just let it be targetId.
      // For now, we return the targetId, and action layer will handle if it's 20/60/20.
      // Actually, if we just return `nest-${targetId}`, we can parse it in DragEnd.
      return [{ id: `nest-${targetId}`, data: firstCollision.data }];
    }
  }

  return pointerCollisions;
};
