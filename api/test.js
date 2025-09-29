export default function handler(request, response) {
  response.status(200).json({
    name: "Vercel API Test",
    message: "API is working!",
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url
  });
}
