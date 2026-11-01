// Serverless 2GIS Places details, using the existing secured server-side API key.
import { handle } from "../server/maps-api-vercel.mjs";

export default async function placeDetails(req, res) {
  return handle(req, res);
}
