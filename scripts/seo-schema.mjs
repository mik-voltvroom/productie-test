/** Only traverse JSON-LD containers, never arbitrary nested Product/Offer fields. */
export function carEntities(value) {
  if (Array.isArray(value)) return value.flatMap(carEntities);
  if (!value || typeof value !== 'object') return [];
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  return [...(types.includes('Car') ? [value] : []), ...carEntities(value['@graph'])];
}
