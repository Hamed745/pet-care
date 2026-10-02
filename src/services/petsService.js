export async function getPets(currentPets) { return currentPets; }
export async function createPet(currentPets, data) { return [...currentPets, { ...data, id: Date.now(), vaccines: [], meds: [] }]; }
export async function updatePet(currentPets, id, data) { return currentPets.map((pet) => pet.id === id ? { ...pet, ...data } : pet); }
export async function deletePet(currentPets, id) { return currentPets.filter((pet) => pet.id !== id); }
export async function addVaccination(currentPets, id, vaccination) { return currentPets.map((pet) => pet.id === id ? { ...pet, vaccines: [...pet.vaccines, vaccination] } : pet); }
export async function deleteVaccination(currentPets, id, index) { return currentPets.map((pet) => pet.id === id ? { ...pet, vaccines: pet.vaccines.filter((_, itemIndex) => itemIndex !== index) } : pet); }
export async function addMedication(currentPets, id, medication) { return currentPets.map((pet) => pet.id === id ? { ...pet, meds: [...pet.meds, medication] } : pet); }
export async function deleteMedication(currentPets, id, index) { return currentPets.map((pet) => pet.id === id ? { ...pet, meds: pet.meds.filter((_, itemIndex) => itemIndex !== index) } : pet); }