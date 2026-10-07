export async function getPets(currentPets) { return currentPets; }
export async function createPet(currentPets, data) { return [...currentPets, { ...data, id: Date.now(), vaccines: [], meds: [] }]; }
export async function updatePet(currentPets, id, data) { return currentPets.map((pet) => pet.id === id ? { ...pet, ...data } : pet); }
export async function deletePet(currentPets, id) { return currentPets.filter((pet) => pet.id !== id); }
const createVaccinationId = () => `vaccine-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
export async function addVaccination(currentPets, petId, vaccination) {
  const record = { ...vaccination, id: vaccination.id || createVaccinationId(), petId };
  return currentPets.map((pet) => String(pet.id) === String(petId) ? { ...pet, vaccines: [...(pet.vaccines || []), record] } : pet);
}
export async function updateVaccination(currentPets, petId, vaccineId, changes) {
  return currentPets.map((pet) => String(pet.id) === String(petId) ? {
    ...pet,
    vaccines: (pet.vaccines || []).map((vaccine) =>
      vaccine.id === vaccineId && String(vaccine.petId) === String(petId)
        ? { ...vaccine, ...changes, id: vaccine.id, petId: pet.id }
        : vaccine),
  } : pet);
}
export async function deleteVaccination(currentPets, petId, vaccineId) {
  return currentPets.map((pet) => String(pet.id) === String(petId) ? {
    ...pet,
    vaccines: (pet.vaccines || []).filter((vaccine) =>
      !(vaccine.id === vaccineId && String(vaccine.petId) === String(petId))),
  } : pet);
}
export async function addMedication(currentPets, id, medication) { return currentPets.map((pet) => pet.id === id ? { ...pet, meds: [...pet.meds, medication] } : pet); }
export async function deleteMedication(currentPets, id, index) { return currentPets.map((pet) => pet.id === id ? { ...pet, meds: pet.meds.filter((_, itemIndex) => itemIndex !== index) } : pet); }
export async function addMedicalVisit(currentPets, id, visit) { return currentPets.map((pet) => pet.id === id ? { ...pet, medicalVisits: [...(pet.medicalVisits || []), { ...visit, id: visit.id || `visit-${Date.now()}` }] } : pet); }
export async function deleteMedicalVisit(currentPets, id, visitId) { return currentPets.map((pet) => pet.id === id ? { ...pet, medicalVisits: (pet.medicalVisits || []).filter((visit) => visit.id !== visitId) } : pet); }