// Serverless 2GIS API route. Reuses the existing PetCare search logic.
import { handle } from "../server/maps-api-vercel.mjs";

export default async function reverse_city(req, res) {
  return handle(req, res);
}
