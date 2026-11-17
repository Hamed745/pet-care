// Resolve public, approved PetCare clinic map coordinates by ID only.
import { handle } from "../server/clinic-location.mjs";
export default async function clinicLocation(req, res) { return handle(req, res); }
