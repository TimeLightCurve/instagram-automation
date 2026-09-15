export async function GET() {
  return Response.json({
    status: 'ok',
    accountMode: 'personal',
    metaApi: 'not-configured',
    timestamp: new Date().toISOString(),
  });
}
