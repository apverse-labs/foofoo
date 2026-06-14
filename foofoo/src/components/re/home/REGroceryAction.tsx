import React from 'react';
import REButton from '../foundation/REButton';

export interface REGroceryActionProps {
  inList?: boolean;
  onAdd: () => void;     // emits ADD_TO_GROCERY (+0.35)
}

/**
 * @summary Add-to-grocery action (strong cooking-intent signal).
 */
export default function REGroceryAction({ inList, onAdd }: REGroceryActionProps) {
  return (
    <REButton
      title={inList ? 'Added to grocery ✓' : 'Add to grocery'}
      variant={inList ? 'secondary' : 'ghost'}
      onPress={onAdd}
      accessibilityLabel={inList ? 'Added to grocery list' : 'Add ingredients to grocery list'}
    />
  );
}
