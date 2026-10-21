const summary = {
  mode: 'demo',
  message: 'VVOS gebruikt ingebouwde voorbeelddata. Voor Firestore-seeding moet een productie-safe seedadapter worden toegevoegd.',
  collections: ['vehicles', 'leads', 'deals', 'workOrders', 'warrantyClaims', 'invoices']
};
console.log(JSON.stringify(summary, null, 2));
