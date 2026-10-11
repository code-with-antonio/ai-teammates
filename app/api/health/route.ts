// Railway's healthcheck: a deployment only takes traffic once this answers 200.
// It says the server is up, not that the database or any other service is.
export function GET() {
  return Response.json({ status: "ok" })
}
