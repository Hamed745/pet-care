"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { registerOwnerPetRoutes, validatePet } = require("../ownerPets.cjs");

function fixture() {
  const routes = new Map();
  const all = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const db = {
    collection: (collection) => {
      assert.equal(collection, "users");
      return {
        doc: (uid) => ({
          collection: (subcollection) => {
            assert.equal(subcollection, "pets");
            const prefix = `${uid}/`;
            const doc = (id) => {
              const key = prefix + id;
              return {
                get: async () => ({
                  exists: all.has(key),
                  data: () => all.get(key),
                }),
                create: async (value) => {
                  if (all.has(key)) { const error = new Error("Already exists"); error.code = 6; throw error; }
                  all.set(key, value);
                },
                set: async (value) => all.set(key, { ...all.get(key), ...value }),
                delete: async () => all.delete(key),
              };
            };
            return {
              doc,
              limit: () => ({
                get: async () => ({
                  docs: [...all.entries()].filter(([key]) => key.startsWith(prefix))
                    .map(([, value]) => ({ data: () => value })),
                }),
              }),
            };
          },
        }),
      };
    },
  };
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  registerOwnerPetRoutes({
    app, db, signedInRoute: (handler) => [handler], HttpError,
    FieldValue: { serverTimestamp: () => "SERVER_TIME" },
  });
  const run = async (method, path, uid, pet, petId) => {
    const handler = routes.get(`${method} ${path}`);
    assert.ok(handler, `Missing route ${method} ${path}`);
    const result = {};
    const res = {
      status(code) { result.status = code; return res; },
      json(json) { result.data = json; return res; },
    };
    await handler({ authUser: { uid }, body: pet === undefined ? {} : { pet }, params: { petId } }, res);
    return result;
  };
  return { run, all };
}

const sample = { id: 1234, name: "Milo", type: "Cat", age: 2, vaccines: [{ name: "Rabies", date: "2026-06-01" }] };

test("each Firebase user sees only pets under their own Firestore namespace", async () => {
  const { run } = fixture();
  await run("POST", "/api/me/pets", "owner-a", { ...sample, ownerUid: "owner-b" });
  const a = await run("GET", "/api/me/pets", "owner-a");
  const b = await run("GET", "/api/me/pets", "owner-b");
  assert.equal(a.data.pets.length, 1);
  assert.equal(a.data.pets[0].ownerUid, "owner-a");
  assert.equal(b.data.pets.length, 0);
  await assert.rejects(() => run("PUT", "/api/me/pets/:petId", "owner-b", { name: "Hacked" }, "1234"), { status: 404 });
  await assert.rejects(() => run("DELETE", "/api/me/pets/:petId", "owner-b", undefined, "1234"), { status: 404 });
  assert.equal((await run("GET", "/api/me/pets", "owner-a")).data.pets[0].name, "Milo");
});

test("full medical record survives edits, with ownerUid always server-owned", async () => {
  const { run } = fixture();
  await run("POST", "/api/me/pets", "owner-a", sample);
  const updated = await run("PUT", "/api/me/pets/:petId", "owner-a", {
    name: "Milo II", ownerUid: "owner-b",
    medicalVisits: [{ date: "2026-10-01", provider: "Vet clinic", diagnosis: "Routine check" }],
    meds: [{ name: "Medication", dose: "1", time: "09:00", end: "2026-12-01" }],
  }, "1234");
  assert.equal(updated.data.pet.ownerUid, "owner-a");
  assert.equal(updated.data.pet.medicalVisits[0].provider, "Vet clinic");
  assert.equal(updated.data.pet.meds[0].time, "09:00");
  const read = await run("GET", "/api/me/pets", "owner-a");
  assert.equal(read.data.pets[0].vaccines[0].name, "Rabies");
  assert.equal(read.data.pets[0].name, "Milo II");
});

test("pet creation is idempotent, deletion works, and bad IDs and input are rejected", async () => {
  const { run } = fixture();
  await run("POST", "/api/me/pets", "owner-a", sample);
  const duplicate = await run("POST", "/api/me/pets", "owner-a", { ...sample, name: "Fake overwrite" });
  assert.equal(duplicate.data.pet.name, "Milo");
  await assert.rejects(() => run("PUT", "/api/me/pets/:petId", "owner-a", {}, "../other"), { status: 400 });
  await run("DELETE", "/api/me/pets/:petId", "owner-a", undefined, "1234");
  assert.equal((await run("GET", "/api/me/pets", "owner-a")).data.pets.length, 0);
  assert.throws(() => validatePet({ ...sample, type: "Invalid" }, "1234", "owner-a"), /Invalid pet type/);
});
