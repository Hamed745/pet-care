export const NEARBY_CATEGORIES = {
  emergency: { label: "Emergency Vets", ruLabel: "Публичные услуги", description: "Find real veterinary clinics and emergency services near your location. Confirm emergency availability by contacting the clinic.", isEmergency: true },
  veterinary: { label: "Veterinary Clinics", ruLabel: "Наши услуги", description: "Veterinary clinics and service providers will be available here soon." },
  hotels: { label: "Pet Hotels", description: "Find boarding and pet hotels for stays away from home." },
  daycare: { label: "Pet Day Care", description: "Find temporary pet care and boarding services; availability must be confirmed directly." },
  grooming: { label: "Grooming", ruLabel: "Груминг", description: "Find real dog and cat grooming salons listed on 2GIS. Contact the salon to confirm services and availability.", ruDescription: "Груминг-салоны для собак и кошек по данным 2ГИС. Уточняйте услуги и доступность напрямую." },
  "pet-sitting": { label: "Pet Sitting", ruLabel: "Зооняня", description: "Find listed pet-sitting and animal-care businesses. Individual in-home sitters may not appear on 2GIS; confirm the service directly.", ruDescription: "Найдите услуги зооняни и присмотра за питомцами. Частные ситтеры могут отсутствовать в 2ГИС; уточняйте условия напрямую." },
};

// City centers are navigation defaults only — NEVER provider data.
export const RUSSIAN_CITY_CENTERS = {
  moscow: { label: "Moscow", lon: 37.6176, lat: 55.7558 },
  krasnoyarsk: { label: "Krasnoyarsk / Красноярск", lon: 92.8526, lat: 56.0101 },
  saint_petersburg: { label: "Saint Petersburg", lon: 30.3158, lat: 59.9343 },
  kazan: { label: "Kazan", lon: 49.1221, lat: 55.7961 },
  novosibirsk: { label: "Novosibirsk", lon: 82.9204, lat: 55.0302 },
  yekaterinburg: { label: "Yekaterinburg", lon: 60.5975, lat: 56.8389 },
};
