const imageIds = [
  "1543466835-00a7907e9de1", "1537151608828-ea2b11777ee8", "1552053831-71594a27632d", "1548199973-03cce0bbc87b", "1561037404-61cd46aa615b", "1583337130417-3346a1be7dee", "1517849845537-4d257902454a", "1530281700549-e82e7bf110d6", "1551717743-49959800b1f6", "1544568100-847a948585b9", "1587300003388-59208cc962cb", "1541599540903-216a46ca1dc0", "1514888286974-6c03e2ca1dba", "1573865526739-10659fec78a5", "1533738363-b7f9aef128ce", "1574158622682-e40e69881006", "1533743983669-94fa5c4338ec", "1526336024174-e58f5cdd8e13", "1592194996308-7b43878e84a6", "1513360371669-4adf3dd7dff8", "1552728089-57bdde30beb3", "1549608276-5786777e6587", "1444464666168-49d633b86797", "1591608971362-f08b2a75731a", "1518020382113-a7e8fc38eac9", "1487300001871-12053913095d", "1534567110243-8875d64ca8ff", "1524704654690-b56c05c78a00", "1535591273668-578e31182c4f", "1522069169874-c58ec4b76be5", "1546026423-cc4642628d2b", "1544551763-46a013bb70d5", "1559827260-dc66d52bef19", "1585110396000-c9ffd4e4b308", "1425082661705-1834bfd09dca", "1450778869180-41d0601e046e", "1495360010541-f48722b34f7d", "1535930749574-1399327ce78f", "1596854407944-bf87f6fdd49e", "1559214369-a6b1d7919865", "1623387641168-d9803ddd3f35", "1582798358481-d199fb7347bb", "1589924691995-400dc9ecc119", "1601758228041-f3b2795255f1", "1535294435445-d7249524ef2e", "1576201836106-db1758fd1c97", "1516734212186-a967f81ad0d7", "1518717758536-85ae29035b6d", "1558929996-da64ba858215", "1582794543139-8ac9cb0f7b11", "1555685812-4b943f1cb0eb",
];
const imageUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

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
  const imageA = imageIds[imageIndex];
  const imageB = imageIds[(imageIndex + 11) % imageIds.length];
  const oldPrice = options.oldPrice;
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
    images: [imageUrl(imageA), imageUrl(imageB)],
    image: imageUrl(imageA),
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
