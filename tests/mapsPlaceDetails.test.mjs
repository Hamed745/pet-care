import test from "node:test";
import assert from "node:assert/strict";
import { safeHttpUrl, normalizePlaceDetails } from "../server/maps-place-details.mjs";

test("only safe external website URLs are linked", () => {
  assert.equal(safeHttpUrl("https://clinic.example/vet"), "https://clinic.example/vet");
  assert.equal(safeHttpUrl("clinic.example"), "https://clinic.example/");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,evil"), null);
  assert.equal(safeHttpUrl("https://user:pass@clinic.example/"), null);
  assert.equal(safeHttpUrl("http://localhost:3000"), null);
  assert.equal(safeHttpUrl("https://127.0.0.1"), null);
});

test("normalized provider card exposes real phone, site and socials only", () => {
  const details = normalizePlaceDetails({
    id: "70000001012345678",
    type: "branch",
    name: "Veterinary center",
    full_address_name: "Street 11, City",
    point: { lon: 92.3, lat: 56.4 },
    schedule: { is_24x7: true },
    contact_groups: [{
      contacts: [
        { type: "phone", text: "+7 (391) 222-33-44", value: "+73912223344" },
        { type: "website", url: "https://vet.example/appointments" },
        { type: "website", url: "https://t.me/vetclinic" },
        { type: "website", url: "https://wa.me/73912223344" },
        { type: "email", value: "vet@example.org" },
        { type: "website", url: "javascript:alert(1)" },
      ],
    }],
  });
  assert.equal(details.phones.length, 1);
  assert.equal(details.phones[0].url, "tel:+73912223344");
  assert.equal(details.websites[0].url, "https://vet.example/appointments");
  assert.deepEqual(details.socials.map((x) => x.label).sort(), ["Telegram", "WhatsApp"]);
  assert.equal(details.emails.length, 1);
  assert.equal(details.is24x7, true);
  assert.equal(details.bookingUrl, null, "a generic website must never be declared a confirmed booking link");
  assert.equal(details.mapUrl, "https://2gis.ru/firm/70000001012345678");
});

test("provider without licensed contacts still has safe map and address details", () => {
  const details = normalizePlaceDetails({
    id: "70000001012345678", type: "branch", name: "Hotel for pets",
    address_name: "Street 6",
  }, { contactsRequested: false });
  assert.equal(details.contactsAvailable, false);
  assert.equal(details.contactsRequested, false);
  assert.deepEqual(details.phones, []);
  assert.deepEqual(details.websites, []);
  assert.deepEqual(details.socials, []);
  assert.equal(details.address, "Street 6");
  assert.equal(details.bookingUrl, null);
});

test("invalid records are not turned into fictional providers", () => {
  assert.equal(normalizePlaceDetails(null), null);
  assert.equal(normalizePlaceDetails({ id: "12", name: "No type" }), null);
  assert.equal(normalizePlaceDetails({ id: "12", name: "street", type: "building" }), null);
});
