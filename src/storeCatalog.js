// Food and treat cards use bundled, vibrant food imagery rather than unrelated animal portraits.
// Concept visuals: match real supplier imagery before production sales.
const FOOD_IMAGE_BY_PRODUCT = {
  3: "bird-food-grains",
  4: "fish-treats",
  8: "bird-food-grains",
  9: "dried-shrimp",
  10: "apple-slices",
  36: "dog-soft-chews",
  37: "cat-health-support",
  38: "cuttlebone",
  40: "small-pet-pellets",
};
const BUNDLED_FOOD_PHOTOS = {
  "cat-health-support": new URL("./assets/store-food/cat-health-support.jpg", import.meta.url).href,
  "dog-soft-chews": new URL("./assets/store-food/dog-soft-chews.jpg", import.meta.url).href,
  "fish-treats": new URL("./assets/store-food/fish-treats.jpg", import.meta.url).href,
  "dried-shrimp": new URL("./assets/store-food/dried-shrimp.jpg", import.meta.url).href,
  "bird-food-grains": new URL("./assets/store-food/bird-food-grains.jpg", import.meta.url).href,
  "small-pet-pellets": new URL("./assets/store-food/small-pet-pellets.jpg", import.meta.url).href,
  "cuttlebone": new URL("./assets/store-food/cuttlebone.jpg", import.meta.url).href,
  "apple-slices": new URL("./assets/store-food/apple-slices.jpg", import.meta.url).href,
};
const foodPhoto = (name) => BUNDLED_FOOD_PHOTOS[name];


// All 17 user-uploaded images, grouped by matching animal and food type.
// Advertisements may show different brands from the demo catalog; product data is unchanged.
const USER_UPLOADED_FOOD_GALLERY = {
  1: [
    new URL("./assets/store-food/user17-dog-food.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-dog-pedigree.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-puppy-food.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-dog-lamb-food.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-dog-royal-canin.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-generic-kibble-bowl.jpg", import.meta.url).href,
  ],
  2: [
    new URL("./assets/store-food/user17-cat-dry-food.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-packaging.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-food-packs.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-dry-kibble.jpg", import.meta.url).href,
  ],
  6: [
    new URL("./assets/store-food/user17-dog-training-treats.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-dog-snack-promo.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-dog-treat-box.jpg", import.meta.url).href,
  ],
  7: [
    new URL("./assets/store-food/user17-cat-raw-treats.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-wet-food.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-wet-tins.jpg", import.meta.url).href,
    new URL("./assets/store-food/user17-cat-wet-pouches.jpg", import.meta.url).href,
  ],
};

// Explicit locally bundled images for every non-food product; no random Unsplash portraits.
// These are concept/product-category visuals, not verified real supplier listings.
const PRODUCT_VISUALS = {
  5: new URL("./assets/store-products/timothy-hay-package.jpg", import.meta.url).href,
  11: new URL("./assets/store-products/dog-rope-tug.jpg", import.meta.url).href,
  12: new URL("./assets/store-products/cat-felt-mice.jpg", import.meta.url).href,
  13: new URL("./assets/store-products/bird-forage-bell.jpg", import.meta.url).href,
  14: new URL("./assets/store-products/fish-leaf-ring.jpg", import.meta.url).href,
  15: new URL("./assets/store-products/small-willow-tunnel.jpg", import.meta.url).href,
  16: new URL("./assets/store-products/dog-oatmeal-wash.jpg", import.meta.url).href,
  17: new URL("./assets/store-products/cat-waterless-foam.jpg", import.meta.url).href,
  18: new URL("./assets/store-products/bird-feather-mist.jpg", import.meta.url).href,
  19: new URL("./assets/store-products/fish-aqua-conditioner.jpg", import.meta.url).href,
  20: new URL("./assets/store-products/small-bristle-brush.jpg", import.meta.url).href,
  21: new URL("./assets/store-products/dog-webbing-lead.jpg", import.meta.url).href,
  22: new URL("./assets/store-products/cat-reflective-collar.jpg", import.meta.url).href,
  23: new URL("./assets/store-products/bird-wood-perch.jpg", import.meta.url).href,
  24: new URL("./assets/store-products/fish-thermometer.jpg", import.meta.url).href,
  25: new URL("./assets/store-products/small-bunny-harness.jpg", import.meta.url).href,
  26: new URL("./assets/store-products/dog-bolster-bed.jpg", import.meta.url).href,
  27: new URL("./assets/store-products/cat-window-hammock.jpg", import.meta.url).href,
  28: new URL("./assets/store-products/bird-fleece-pouch.jpg", import.meta.url).href,
  29: new URL("./assets/store-products/fish-betta-leaf.jpg", import.meta.url).href,
  30: new URL("./assets/store-products/small-corner-hideout.jpg", import.meta.url).href,
  31: new URL("./assets/store-products/dog-clicker.jpg", import.meta.url).href,
  32: new URL("./assets/store-products/cat-puzzle-slider.jpg", import.meta.url).href,
  33: new URL("./assets/store-products/bird-foraging-kit.jpg", import.meta.url).href,
  34: new URL("./assets/store-products/fish-sponge-filter.jpg", import.meta.url).href,
  35: new URL("./assets/store-products/small-target-reward.jpg", import.meta.url).href,
  39: new URL("./assets/store-products/fish-water-test.jpg", import.meta.url).href,
  41: new URL("./assets/store-products/cat-litter-scoop.jpg", import.meta.url).href,
  42: new URL("./assets/store-products/dog-airline-carrier.jpg", import.meta.url).href,
};

const productRows = [
  ["Paw Pantry Chicken & Oat Kibble", "GoodNest", "Food", "dog", "adult", 690, 4.8, 184, 18, ["Best seller"], 0, { variants: [{ id: "2kg", label: "2 kg", price: 690 }, { id: "6kg", label: "6 kg", price: 1690 }] }],
  ["Salmon Coat Care Cat Food", "Purrform", "Food", "cat", "adult", 540, 4.7, 126, 11, ["Best seller"], 12, { oldPrice: 620 }],
  ["Daily Seed Blend for Parakeets", "Finch & Feather", "Food", "bird", "all", 225, 4.6, 58, 23, ["New"], 20],
  ["Clearwater Tropical Flake Food", "AquaKind", "Food", "fish", "all", 145, 4.5, 76, 0, [], 27],
  ["Burrow Basics Timothy Hay", "Burrow & Bloom", "Food", "small", "adult", 285, 4.9, 92, 7, ["Best seller"], 33],
  ["Soft Training Bites, Chicken", "Tails & Trail", "Treats", "dog", "young", 175, 4.8, 81, 16, ["Best seller"], 1],
  ["Freeze-Dried Tuna Nibbles", "Purrform", "Treats", "cat", "all", 210, 4.7, 47, 8, ["New"], 13],
  ["Honey Millet Spray Treats", "Finch & Feather", "Treats", "bird", "all", 115, 4.6, 32, 19, [], 21],
  ["Shrimp & Spirulina Wafers", "AquaKind", "Treats", "fish", "adult", 130, 4.4, 40, 12, [], 28],
  ["Apple & Hay Nibbler Sticks", "Burrow & Bloom", "Treats", "small", "all", 95, 4.8, 51, 14, ["New"], 34],
  ["Rope Tug with Recycled Cotton", "Tails & Trail", "Toys", "dog", "adult", 260, 4.6, 113, 9, ["Best seller"], 2, { oldPrice: 310 }],
  ["Felt Mouse Trio", "Mossy Paws", "Toys", "cat", "young", 125, 4.8, 142, 21, ["Best seller"], 14],
  ["Forage Bell and Clacker", "Finch & Feather", "Toys", "bird", "all", 185, 4.5, 29, 13, [], 22],
  ["Floating Leaf Ring", "AquaKind", "Toys", "fish", "all", 90, 4.3, 22, 5, ["New"], 29],
  ["Willow Activity Tunnel", "Burrow & Bloom", "Toys", "small", "young", 320, 4.9, 64, 6, [], 35],
  ["Oatmeal Gentle Pet Wash", "Mossy Paws", "Grooming and care", "dog", "senior", 240, 4.7, 77, 10, ["New"], 3],
  ["Waterless Coat Foam", "Purrform", "Grooming and care", "cat", "senior", 195, 4.5, 38, 4, [], 15],
  ["Perch-Safe Feather Mist", "Finch & Feather", "Grooming and care", "bird", "adult", 165, 4.4, 25, 8, [], 23],
  ["Aqua Balance Conditioner", "AquaKind", "Grooming and care", "fish", "all", 205, 4.6, 61, 0, [], 30],
  ["Soft Bristle Small Pet Brush", "Burrow & Bloom", "Grooming and care", "small", "senior", 155, 4.7, 31, 2, ["New"], 36],
  ["Everyday Webbing Lead", "Tails & Trail", "Accessories", "dog", "adult", 390, 4.8, 105, 15, ["Best seller"], 4, { variants: [{ id: "s", label: "Small", price: 390 }, { id: "m", label: "Medium", price: 420 }, { id: "l", label: "Large", price: 450 }] }],
  ["Breakaway Reflective Collar", "Mossy Paws", "Accessories", "cat", "adult", 240, 4.7, 89, 17, ["New"], 16],
  ["Natural Wood Perch Set", "Finch & Feather", "Accessories", "bird", "adult", 280, 4.6, 36, 8, [], 24],
  ["Low-Profile Aquarium Thermometer", "AquaKind", "Accessories", "fish", "all", 125, 4.4, 53, 12, [], 31],
  ["Bunny-Safe Harness", "Burrow & Bloom", "Accessories", "small", "adult", 310, 4.5, 26, 3, ["New"], 37],
  ["Cloud Stitch Bolster Bed", "GoodNest", "Beds and sleep", "dog", "senior", 1250, 4.9, 144, 5, ["Best seller"], 5, { oldPrice: 1490 }],
  ["Window Hammock Lounger", "Mossy Paws", "Beds and sleep", "cat", "adult", 780, 4.8, 97, 6, [], 17],
  ["Fleece Nesting Pouch", "Finch & Feather", "Beds and sleep", "bird", "young", 210, 4.3, 19, 10, [], 25],
  ["Heated Betta Rest Leaf", "AquaKind", "Aquariums and habitats", "fish", "all", 175, 4.5, 42, 7, ["New"], 32],
  ["Clover Corner Hideout", "Burrow & Bloom", "Beds and sleep", "small", "adult", 355, 4.8, 48, 9, [], 38],
  ["Pocket Clicker and Wrist Loop", "Tails & Trail", "Training", "dog", "young", 145, 4.6, 67, 22, ["New"], 6],
  ["Treat Puzzle Slider", "Mossy Paws", "Training", "cat", "adult", 330, 4.7, 54, 5, [], 18],
  ["Foraging Paper Play Kit", "Finch & Feather", "Training", "bird", "adult", 190, 4.4, 21, 14, [], 26],
  ["QuietFlow Sponge Filter", "AquaKind", "Aquariums and habitats", "fish", "all", 460, 4.8, 88, 6, ["Best seller"], 39],
  ["Target Stick and Reward Pouch", "Burrow & Bloom", "Training", "small", "young", 205, 4.5, 18, 1, ["New"], 40],
  ["Joint Support Soft Chews", "GoodNest", "Health and supplements", "dog", "senior", 420, 4.7, 73, 13, [], 7],
  ["Daily Hairball Support Paste", "Purrform", "Health and supplements", "cat", "adult", 265, 4.6, 66, 18, [], 19],
  ["Calcium Mineral Block", "Finch & Feather", "Health and supplements", "bird", "all", 105, 4.5, 34, 11, ["New"], 41],
  ["Water Test Strip Kit", "AquaKind", "Health and supplements", "fish", "all", 235, 4.8, 91, 16, ["Best seller"], 42],
  ["Herbal Digestive Support", "Burrow & Bloom", "Health and supplements", "small", "senior", 250, 4.6, 27, 6, [], 43],
  ["Odor-Control Litter Scoop", "Mossy Paws", "Cleaning and litter", "cat", "all", 160, 4.7, 104, 3, ["Best seller"], 8],
  ["Padded Airline Carrier", "Tails & Trail", "Travel and carriers", "dog", "adult", 1480, 4.8, 58, 2, ["New"], 9],
];

const petLabels = { dog: "Dog", cat: "Cat", bird: "Bird", fish: "Fish", small: "Small pet" };
const petLabelsPlural = { dog: "dogs", cat: "cats", bird: "birds", fish: "fish", small: "small pets" };
const categoryDetails = {
  Food: "Nutritious everyday meals selected for different life stages.",
  Treats: "Reward-sized favorites for training and enrichment.",
  Toys: "Playful, durable pieces for curious pets.",
  "Grooming and care": "Gentle tools and care essentials for healthy coats.",
  Accessories: "Comfortable, practical everyday accessories.",
  "Beds and sleep": "Restful places for a softer, calmer nap.",
  Training: "Simple tools for focus, practice, and positive routines.",
  "Health and supplements": "Everyday wellness essentials to discuss with your vet.",
  "Cleaning and litter": "Useful supplies for a fresher, tidier home.",
  "Travel and carriers": "Comfort-first gear for journeys and visits.",
  "Aquariums and habitats": "Habitat equipment for safe, stable environments.",
};

export const storeProducts = productRows.map((row, index) => {
  const [name, brand, category, petType, ageGroup, price, rating, reviewsCount, stock, badges, imageIndex, options = {}] = row;
  const oldPrice = options.oldPrice;
  const productId = index + 1;
  const curatedFoodPhoto = FOOD_IMAGE_BY_PRODUCT[productId] ? foodPhoto(FOOD_IMAGE_BY_PRODUCT[productId]) : null;
  const uploadedGallery = USER_UPLOADED_FOOD_GALLERY[productId] || [];
  const preciseVisual = PRODUCT_VISUALS[productId] || null;
  const chosenImage = uploadedGallery[0] || preciseVisual || curatedFoodPhoto;
  if (!chosenImage) throw new Error(`Missing catalog image for product ${productId}: ${name}`);
  return {
    id: index + 1,
    name,
    brand,
    category,
    cat: category,
    petType,
    ageGroup,
    price,
    ...(oldPrice ? { oldPrice } : {}),
    rating,
    reviewsCount,
    stock,
    badges,
    description: `${categoryDetails[category]} Made for ${petLabelsPlural[petType]}, with thoughtfully selected materials and practical everyday use in mind.`,
    details: [categoryDetails[category], `Suitable for ${petLabelsPlural[petType]}`, `Recommended life stage: ${ageGroup}`, "Packed for convenient home storage"],
    ...(options.variants ? { variants: options.variants } : {}),
    images: uploadedGallery.length ? uploadedGallery : [chosenImage],
    image: chosenImage,
    createdAt: new Date(Date.UTC(2026, 8, Math.max(1, 30 - index))).toISOString(),
  };
});

const categories = [
  ["Food", "Utensils"], ["Treats", "Bone"], ["Toys", "ToyBrick"], ["Grooming and care", "Sparkles"], ["Accessories", "Tag"], ["Beds and sleep", "Bed"], ["Training", "Target"], ["Health and supplements", "HeartPulse"], ["Cleaning and litter", "SprayCan"], ["Travel and carriers", "BriefcaseBusiness"], ["Aquariums and habitats", "Waves"],
];
export const storeCategories = categories.map(([name, icon]) => ({ name, icon, image: storeProducts.find((product) => product.category === name)?.image || storeProducts[0].image }));

export const petShopTiles = [
  { name: "Dogs", value: "dog", image: storeProducts.find((product) => product.petType === "dog").image },
  { name: "Cats", value: "cat", image: storeProducts.find((product) => product.petType === "cat").image },
  { name: "Birds", value: "bird", image: storeProducts.find((product) => product.petType === "bird").image },
  { name: "Fish", value: "fish", image: storeProducts.find((product) => product.petType === "fish").image },
  { name: "Small pets", value: "small", image: storeProducts.find((product) => product.petType === "small").image },
];

export const products = storeProducts;
