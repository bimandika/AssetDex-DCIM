export const handler = async (req: Request): Promise<Response> => {
  return new Response(JSON.stringify({ message: 'Test endpoint works!' }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
