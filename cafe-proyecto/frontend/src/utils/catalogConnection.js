export function checkCatalogConnection(djangoEnabled, djangoClient, expressClient) {
  const options = { timeout: 8000, params: { connectionCheck: Date.now() } };
  return djangoEnabled
    ? djangoClient.get('/django-api/products', options)
    : expressClient.head('/products', options);
}
