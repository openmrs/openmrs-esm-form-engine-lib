import { useEffect } from 'react';

// Sometimes you want to run parent effects before those of the children. E.g. when setting
// something up or binding document event listeners. By passing the effect to the first child it
// will run before any effects by later children.
// For details, see: https://github.com/facebook/react/issues/15281#issuecomment-781196823
export function InstantEffect({ effect }) {
  useEffect(() => effect?.(), [effect]);
  return null;
}
