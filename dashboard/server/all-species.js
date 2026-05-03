const CATEGORIES = {
  fungi: { label: 'Fungi', emoji: '🍄', color: '#F59E0B' },
  berry: { label: 'Berries', emoji: '🫐', color: '#8B5CF6' },
  plant: { label: 'Greens & Plants', emoji: '🌿', color: '#22C55E' },
  flower: { label: 'Edible Flowers', emoji: '🌸', color: '#EC4899' },
  marine: { label: 'Marine & Shellfish', emoji: '🦀', color: '#06B6D4' },
  fish: { label: 'Fish', emoji: '🐟', color: '#3B82F6' },
  nut: { label: 'Nuts & Seeds', emoji: '🌰', color: '#A16207' },
  seaweed: { label: 'Seaweed & Algae', emoji: '🌊', color: '#0D9488' }
};

/*
  Forager Score: 1-5 per factor, overall = weighted average scaled to 100
    identification: How easy to ID correctly (5=unmistakable, 1=expert only)
    abundance: How common in PNW (5=everywhere, 1=rare)
    culinaryValue: Taste/culinary potential (5=exceptional, 1=barely edible)
    safetyRisk: Risk of dangerous lookalikes (1=very safe, 5=deadly lookalikes)
    seasonLength: Duration of harvest window (5=year-round, 1=days)
    preservation: Dries/freezes/stores well (5=excellent, 1=must eat fresh)
*/
function computeOverall(s) {
  const { identification = 3, abundance = 3, culinaryValue = 3, safetyRisk = 3, seasonLength = 3, preservation = 3 } = s;
  const safetyInverted = 6 - safetyRisk;
  return Math.round(
    (identification * 0.20 + abundance * 0.15 + culinaryValue * 0.25 +
     safetyInverted * 0.20 + seasonLength * 0.10 + preservation * 0.10) * 20
  );
}

const ALL_SPECIES = [
  // ═══════════════════════ FUNGI ═══════════════════════
  {
    id: 'pacific-golden-chanterelle', taxonId: 120443, category: 'fungi',
    scientificName: 'Cantharellus formosus', commonName: 'Pacific Golden Chanterelle',
    description: 'The iconic golden chanterelle of the PNW. Fruity aroma, peppery taste. Found under Douglas fir and western hemlock.',
    season: { start: 9, end: 12, peak: [10, 11] }, emoji: '🍄', color: '#F59E0B',
    habitat: 'Coniferous forests, especially Douglas fir', edibility: 'Choice edible',
    idTips: 'Golden-orange cap with false gills (ridges, not blades). Fruity apricot scent. Solid flesh — never hollow.',
    lookalikes: [{ name: 'Jack-o-lantern (Omphalotus olearius)', danger: 'toxic', tip: 'Jack-o-lanterns have true gills, grow in clusters on wood, and glow in the dark' }],
    foragerScore: { identification: 4, abundance: 5, culinaryValue: 5, safetyRisk: 2, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'white-chanterelle', taxonId: 54132, category: 'fungi',
    scientificName: 'Cantharellus subalbidus', commonName: 'White Chanterelle',
    description: 'Pale to white chanterelle exclusive to the PNW. Delicate flavor and meaty texture.',
    season: { start: 9, end: 12, peak: [10, 11] }, emoji: '🤍', color: '#F5F5DC',
    habitat: 'Coniferous forests, old-growth preferred', edibility: 'Choice edible',
    idTips: 'White to pale cream cap with false gills. Bruises orange-brown. Fruity scent like golden chanterelle.',
    lookalikes: [{ name: 'Destroying Angel (Amanita ocreata)', danger: 'deadly', tip: 'Amanita has TRUE gills, a ring on the stem, and a volva (cup) at the base' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 3, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'yellowfoot-chanterelle', taxonId: 350511, category: 'fungi',
    scientificName: 'Craterellus tubaeformis', commonName: 'Yellowfoot Chanterelle',
    description: 'Small but abundant winter chanterelle. Found in huge troops among mossy conifer forests.',
    season: { start: 10, end: 2, peak: [11, 12] }, emoji: '💛', color: '#CA8A04',
    habitat: 'Mossy coniferous forests, rotting wood', edibility: 'Good edible',
    idTips: 'Small brown cap, yellow stem, forked ridges underneath. Grows in large troops on mossy ground.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 5, culinaryValue: 4, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },
  {
    id: 'king-bolete', taxonId: 48701, category: 'fungi',
    scientificName: 'Boletus edulis', commonName: 'King Bolete (Porcini)',
    description: 'The king of edible mushrooms. Rich, nutty flavor. Found in coniferous and deciduous forests.',
    season: { start: 8, end: 11, peak: [9, 10] }, emoji: '👑', color: '#8B4513',
    habitat: 'Coniferous and mixed forests', edibility: 'Choice edible',
    idTips: 'Brown cap, thick white stem with net-like pattern. Pores underneath (not gills). White flesh that does NOT change color when cut.',
    lookalikes: [{ name: 'Bitter Bolete (Tylopilus felleus)', danger: 'inedible', tip: 'Bitter bolete has pink pores and extremely bitter taste. Always taste-test a tiny piece.' }],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 5 }
  },
  {
    id: 'black-morel', taxonId: 1467061, category: 'fungi',
    scientificName: 'Morchella elata', commonName: 'Black Morel',
    description: 'Highly prized spring mushroom. Found in burn sites, disturbed soils, and old orchards.',
    season: { start: 3, end: 6, peak: [4, 5] }, emoji: '🔥', color: '#3D2B1F',
    habitat: 'Burn sites, disturbed soils, river bottoms', edibility: 'Choice edible (must cook)',
    idTips: 'Honeycomb-patterned cap attached at the base. Completely hollow inside from cap to stem. Dark ridges with lighter pits.',
    lookalikes: [{ name: 'False Morel (Gyromitra esculenta)', danger: 'toxic/deadly', tip: 'False morels have brain-like wrinkled (not pitted) caps and are NOT hollow inside. Potentially lethal.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 3, seasonLength: 2, preservation: 5 }
  },
  {
    id: 'chicken-of-the-woods', taxonId: 53713, category: 'fungi',
    scientificName: 'Laetiporus sulphureus', commonName: 'Chicken of the Woods',
    description: 'Bright orange and yellow shelf fungus. Meaty texture substitutes for chicken.',
    season: { start: 5, end: 11, peak: [8, 9, 10] }, emoji: '🐔', color: '#FF6B00',
    habitat: 'Dead or living hardwoods and conifers', edibility: 'Good edible (young specimens)',
    idTips: 'Impossible to miss: bright orange shelves with yellow edges. No gills — porous underside. Grows on wood.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 2, culinaryValue: 4, safetyRisk: 1, seasonLength: 4, preservation: 3 }
  },
  {
    id: 'lions-mane', taxonId: 49158, category: 'fungi',
    scientificName: 'Hericium erinaceus', commonName: "Lion's Mane",
    description: 'Cascading white spines. Seafood-like flavor. Studied for neuroprotective properties.',
    season: { start: 8, end: 11, peak: [9, 10] }, emoji: '🦁', color: '#FAFAFA',
    habitat: 'Dead or wounded hardwoods, especially oak and maple', edibility: 'Choice edible',
    idTips: 'White cascading icicle-like spines in a single clump on hardwood. Unmistakable. No dangerous lookalikes.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 2, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 3 }
  },
  {
    id: 'western-matsutake', taxonId: 521711, category: 'fungi',
    scientificName: 'Tricholoma murrillianum', commonName: 'Western Matsutake',
    description: 'Intensely aromatic mushroom prized in Japanese cuisine. Spicy-cinnamon scent.',
    season: { start: 9, end: 12, peak: [10, 11] }, emoji: '🌲', color: '#D2B48C',
    habitat: 'Coniferous forests, sandy or pumice soils', edibility: 'Choice edible',
    idTips: 'White with brown streaks, thick partial veil, spicy cinnamon aroma. Grows in pumice/sandy soil under conifers.',
    lookalikes: [{ name: "Smith's Amanita (Amanita smithiana)", danger: 'toxic', tip: 'Amanita has a volva at the base and lacks the strong cinnamon scent. Always check for volva.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 3, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'lobster-mushroom', taxonId: 48215, category: 'fungi',
    scientificName: 'Hypomyces lactifluorum', commonName: 'Lobster Mushroom',
    description: 'Parasitic fungus that transforms Russula into firm, red-orange, seafood-flavored delicacies.',
    season: { start: 8, end: 10, peak: [9] }, emoji: '🦞', color: '#DC2626',
    habitat: 'Coniferous and mixed forests', edibility: 'Choice edible',
    idTips: 'Bright red-orange exterior, white interior. Very firm and dense. Original mushroom shape distorted.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 3, culinaryValue: 4, safetyRisk: 1, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'oyster-mushroom', taxonId: 48494, category: 'fungi',
    scientificName: 'Pleurotus ostreatus', commonName: 'Oyster Mushroom',
    description: 'Found year-round on dead hardwoods. Fan-shaped clusters. Mild anise-like aroma.',
    season: { start: 10, end: 4, peak: [11, 12, 1] }, emoji: '🦪', color: '#9CA3AF',
    habitat: 'Dead or dying hardwoods, especially alder', edibility: 'Good edible',
    idTips: 'Fan/shelf-shaped, grows in overlapping clusters on wood. White spore print. Decurrent gills running down the short stem.',
    lookalikes: [{ name: 'Angel Wings (Pleurocybella porrigens)', danger: 'potentially toxic', tip: 'Angel wings are pure white, thinner, and grow on conifer wood (not hardwood)' }],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 4, safetyRisk: 2, seasonLength: 5, preservation: 4 }
  },
  {
    id: 'shaggy-mane', taxonId: 47392, category: 'fungi',
    scientificName: 'Coprinus comatus', commonName: 'Shaggy Mane',
    description: 'Distinctive shaggy scales. Auto-digests rapidly. Must eat within hours of picking.',
    season: { start: 9, end: 11, peak: [10] }, emoji: '🧶', color: '#E5E7EB',
    habitat: 'Disturbed soils, lawns, roadsides, gravel', edibility: 'Good edible (eat immediately)',
    idTips: 'Tall white cylinder with shaggy upturned scales. Turns to black ink from bottom up. No other mushroom looks like this.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 1 }
  },

  // ═══════════════════════ BERRIES ═══════════════════════
  {
    id: 'huckleberry', taxonId: 48347, category: 'berry',
    scientificName: 'Vaccinium membranaceum', commonName: 'Thinleaf Huckleberry',
    description: "Oregon's most prized wild berry. Sweet-tart flavor with intense depth. Cannot be commercially cultivated, making wild-foraged berries precious.",
    season: { start: 7, end: 9, peak: [8] }, emoji: '🫐', color: '#6D28D9',
    habitat: 'Mountain forests, 3000-6000ft elevation, open ridges and burns', edibility: 'Choice edible',
    idTips: 'Small shrub with oval leaves. Berries dark purple-black, single (not clustered). Sweet-tart taste. Grows at higher elevations.',
    lookalikes: [{ name: 'Baneberry (Actaea rubra)', danger: 'toxic', tip: 'Baneberry has red OR white berries in clusters, different leaf shape, and is a larger plant' }],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },
  {
    id: 'salal', taxonId: 48441, category: 'berry',
    scientificName: 'Gaultheria shallon', commonName: 'Salal',
    description: 'Ubiquitous PNW shrub with dark purple berries. Mildly sweet, somewhat mealy. Important traditional food of coastal peoples.',
    season: { start: 7, end: 10, peak: [8, 9] }, emoji: '🫐', color: '#4C1D95',
    habitat: 'Coastal and low-elevation forests, understory', edibility: 'Good edible',
    idTips: 'Leathery oval leaves, pink bell-shaped flowers. Dark purple-blue berries in clusters. Extremely common understory plant.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'thimbleberry', taxonId: 51646, category: 'berry',
    scientificName: 'Rubus parviflorus', commonName: 'Thimbleberry',
    description: 'Delicate red raspberry-like fruit that falls apart in your hand. Incredible fresh flavor but impossible to transport.',
    season: { start: 6, end: 8, peak: [7] }, emoji: '🔴', color: '#DC2626',
    habitat: 'Forest edges, roadsides, clearings in moist areas', edibility: 'Choice edible',
    idTips: 'Large maple-shaped leaves (no thorns unlike other Rubus). White papery flowers. Flat red berries shaped like a thimble.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 1 }
  },
  {
    id: 'salmonberry', taxonId: 47543, category: 'berry',
    scientificName: 'Rubus spectabilis', commonName: 'Salmonberry',
    description: 'Bright salmon-orange to ruby red berries. Juicy and mild. One of the first berries of the season. Named for being eaten with salmon.',
    season: { start: 5, end: 7, peak: [6] }, emoji: '🍊', color: '#F97316',
    habitat: 'Streambanks, moist forests, road cuts', edibility: 'Good edible',
    idTips: 'Thorny shrub with raspberry-like trifoliate leaves. Large pink flowers in spring. Berries orange or red, shaped like a raspberry.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 2 }
  },
  {
    id: 'oregon-grape', taxonId: 126887, category: 'berry',
    scientificName: 'Berberis aquifolium', commonName: 'Oregon Grape',
    description: "Oregon's state flower. Tart blue berries high in vitamin C. Holly-like leaves. Makes excellent jelly.",
    season: { start: 7, end: 9, peak: [8] }, emoji: '🍇', color: '#4338CA',
    habitat: 'Forest understory, open woods, rocky areas', edibility: 'Good edible (tart)',
    idTips: 'Holly-like compound leaves, yellow flowers in spring. Clusters of dusty blue berries. Inner bark/wood is bright yellow.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'trailing-blackberry', taxonId: 53445, category: 'berry',
    scientificName: 'Rubus ursinus', commonName: 'Trailing Blackberry (Native)',
    description: "Oregon's native blackberry. Smaller than invasive Himalayan but FAR superior in flavor. Intensely sweet and aromatic.",
    season: { start: 6, end: 8, peak: [7] }, emoji: '⚫', color: '#1E1B4B',
    habitat: 'Forest edges, clearings, roadsides', edibility: 'Choice edible',
    idTips: 'Low trailing vine (not upright). Smaller berries and leaves than Himalayan blackberry. Male and female plants separate.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'evergreen-huckleberry', taxonId: 48349, category: 'berry',
    scientificName: 'Vaccinium ovatum', commonName: 'Evergreen Huckleberry',
    description: 'Coastal huckleberry with glossy evergreen leaves. Small, sweet-tart berries. Available later in the season than mountain huckleberries.',
    season: { start: 8, end: 11, peak: [9, 10] }, emoji: '🫐', color: '#312E81',
    habitat: 'Coastal forests and edges, low elevations', edibility: 'Choice edible',
    idTips: 'Evergreen shrub with small glossy oval leaves. Tiny dark berries. Found near the coast at lower elevations than mountain huckleberry.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 5 }
  },
  {
    id: 'red-huckleberry', taxonId: 48354, category: 'berry',
    scientificName: 'Vaccinium parvifolium', commonName: 'Red Huckleberry',
    description: 'Bright translucent red berries with a tangy kick. Grows on rotting stumps and logs. Striking green-stemmed shrub.',
    season: { start: 6, end: 9, peak: [7, 8] }, emoji: '🔴', color: '#EF4444',
    habitat: 'Rotting stumps and logs in coniferous forests', edibility: 'Good edible',
    idTips: 'Green angular stems, tiny oval leaves. Bright translucent red berries. Almost always growing on rotting nurse logs.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 4, safetyRisk: 1, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'blue-elderberry', taxonId: 143799, category: 'berry',
    scientificName: 'Sambucus cerulea', commonName: 'Blue Elderberry',
    description: 'Flat clusters of tiny blue-black berries coated in white bloom. Excellent for syrups, wine, and medicine. MUST be cooked.',
    season: { start: 8, end: 10, peak: [9] }, emoji: '💜', color: '#7C3AED',
    habitat: 'Streambanks, forest edges, disturbed areas', edibility: 'Good edible (must cook)',
    idTips: 'Large shrub/small tree. Compound leaves with 5-7 leaflets. Flat-topped flower clusters (spring) then blue-black berry clusters.',
    lookalikes: [{ name: 'Red Elderberry (Sambucus racemosa)', danger: 'toxic raw', tip: 'Red elderberry has DOME-shaped (not flat) clusters and RED berries. All raw elderberries are toxic.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 4, safetyRisk: 3, seasonLength: 2, preservation: 5 }
  },

  // ═══════════════════════ GREENS & PLANTS ═══════════════════════
  {
    id: 'stinging-nettle', taxonId: 51884, category: 'plant',
    scientificName: 'Urtica dioica', commonName: 'Stinging Nettle',
    description: 'The most nutritious wild green in the PNW. Rich in iron, vitamins, and protein. Stinging hairs neutralized by cooking. Spinach-like flavor.',
    season: { start: 3, end: 6, peak: [4, 5] }, emoji: '🌿', color: '#16A34A',
    habitat: 'Streambanks, moist forests, disturbed rich soils', edibility: 'Choice edible (cook first)',
    idTips: 'Opposite serrated leaves covered in stinging hairs. Square stem. You will KNOW if you touch it. Harvest tops with gloves in spring.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },
  {
    id: 'miners-lettuce', taxonId: 52994, category: 'plant',
    scientificName: 'Claytonia perfoliata', commonName: "Miner's Lettuce",
    description: 'Delicate round leaves with the stem growing through the center. Mild lettuce flavor. Gold Rush miners ate it to prevent scurvy.',
    season: { start: 2, end: 5, peak: [3, 4] }, emoji: '🥬', color: '#4ADE80',
    habitat: 'Moist shady areas, forest edges, gardens', edibility: 'Choice edible (raw or cooked)',
    idTips: 'Unmistakable: circular leaf with stem poking through the center (like a parasol). Small white/pink flowers on top.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 4, safetyRisk: 1, seasonLength: 3, preservation: 1 }
  },
  {
    id: 'wood-sorrel', taxonId: 47757, category: 'plant',
    scientificName: 'Oxalis oregana', commonName: 'Oregon Wood Sorrel',
    description: 'Clover-like forest floor plant with a bright lemony flavor. Covers the ground in old-growth forests. A perfect trailside snack.',
    season: { start: 3, end: 10, peak: [5, 6, 7] }, emoji: '☘️', color: '#22C55E',
    habitat: 'Forest floor in moist coniferous forests', edibility: 'Good edible (small quantities)',
    idTips: 'Three heart-shaped leaflets (like clover but with a notch). White or pink flowers. Sour/lemony taste. Carpets forest floors.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 5, preservation: 1 }
  },
  {
    id: 'cattail', taxonId: 48685, category: 'plant',
    scientificName: 'Typha latifolia', commonName: 'Broadleaf Cattail',
    description: 'The "supermarket of the swamp" — nearly every part is edible in some season. Roots, shoots, pollen, and immature flower heads.',
    season: { start: 3, end: 10, peak: [5, 6] }, emoji: '🌾', color: '#854D0E',
    habitat: 'Marshes, pond edges, ditches, wetlands', edibility: 'Good edible (multiple parts)',
    idTips: 'Unmistakable: tall grass-like leaves, brown cigar-shaped seed head. Grows in standing water or very wet soil.',
    lookalikes: [{ name: 'Iris (Iris pseudacorus)', danger: 'toxic', tip: 'Yellow flag iris has similar leaves but fan-shaped arrangement and yellow flowers. Never eat iris rhizomes.' }],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 3, safetyRisk: 2, seasonLength: 5, preservation: 3 }
  },
  {
    id: 'dandelion', taxonId: 47602, category: 'plant',
    scientificName: 'Taraxacum officinale', commonName: 'Common Dandelion',
    description: 'Ubiquitous "weed" that is entirely edible — leaves, flowers, and roots. Nutritious bitter greens. Makes wine, coffee substitute, and more.',
    season: { start: 3, end: 11, peak: [4, 5] }, emoji: '🌼', color: '#EAB308',
    habitat: 'Lawns, fields, roadsides, disturbed areas', edibility: 'Good edible (all parts)',
    idTips: 'Rosette of jagged toothed leaves ("dent de lion"). Hollow stem with milky sap. Single yellow flower per stem. Puffball seed head.',
    lookalikes: [{ name: "Cat's Ear (Hypochaeris radicata)", danger: 'safe', tip: "Cat's ear is also edible, so misidentification is not dangerous. Has hairy leaves and branching stems." }],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 5, preservation: 4 }
  },
  {
    id: 'chickweed', taxonId: 53298, category: 'plant',
    scientificName: 'Stellaria media', commonName: 'Common Chickweed',
    description: 'Tender mild green available almost year-round. One of the first spring greens. Mild, lettuce-like flavor excellent in salads.',
    season: { start: 2, end: 11, peak: [3, 4, 5] }, emoji: '🌱', color: '#86EFAC',
    habitat: 'Gardens, moist disturbed areas, lawns', edibility: 'Good edible (raw or cooked)',
    idTips: 'Low sprawling plant with small oval opposite leaves. Tiny white flowers with deeply split petals (look like 10 but are 5). Single line of hair on stem that alternates sides.',
    lookalikes: [{ name: 'Scarlet Pimpernel (Anagallis arvensis)', danger: 'toxic', tip: 'Scarlet pimpernel has orange/red flowers and lacks the line of hair on the stem' }],
    foragerScore: { identification: 4, abundance: 5, culinaryValue: 3, safetyRisk: 2, seasonLength: 5, preservation: 1 }
  },
  {
    id: 'lambsquarters', taxonId: 58127, category: 'plant',
    scientificName: 'Chenopodium album', commonName: "Lamb's Quarters",
    description: 'Wild spinach relative. One of the most nutritious wild greens — higher in protein, calcium, and iron than spinach. Mild pleasant flavor.',
    season: { start: 4, end: 10, peak: [5, 6, 7] }, emoji: '🥬', color: '#15803D',
    habitat: 'Gardens, farms, disturbed soils, roadsides', edibility: 'Choice edible',
    idTips: 'Diamond-shaped leaves with whitish powdery coating (especially young leaves). Tiny green flowers in dense clusters at branch tips.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 5, culinaryValue: 4, safetyRisk: 1, seasonLength: 4, preservation: 4 }
  },
  {
    id: 'bracken-fern', taxonId: 52681, category: 'plant',
    scientificName: 'Pteridium aquilinum', commonName: 'Bracken Fern Fiddleheads',
    description: 'Young fiddleheads harvested in spring before they unfurl. Traditionally eaten by indigenous peoples. Prepare properly — blanch before cooking.',
    season: { start: 4, end: 5, peak: [4] }, emoji: '🌿', color: '#166534',
    habitat: 'Open forests, clearings, burns, disturbed areas', edibility: 'Edible (with caution — must cook)',
    idTips: 'Tightly curled fiddlehead covered in silvery-brown fuzz. Three-branched frond shape when mature. Very common fern.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 5, culinaryValue: 2, safetyRisk: 3, seasonLength: 1, preservation: 2 }
  },

  // ═══════════════════════ EDIBLE FLOWERS ═══════════════════════
  {
    id: 'fireweed', taxonId: 564969, category: 'flower',
    scientificName: 'Chamaenerion angustifolium', commonName: 'Fireweed',
    description: 'Spectacular pink spikes colonizing burns and clearings. Young shoots taste like asparagus. Flowers make excellent jelly. Leaves for tea.',
    season: { start: 6, end: 9, peak: [7, 8] }, emoji: '🌸', color: '#EC4899',
    habitat: 'Burns, clearings, roadsides, logged areas', edibility: 'Good edible (shoots, flowers, leaves)',
    idTips: 'Tall plant with lance-shaped leaves. Brilliant pink-magenta flowers in long terminal spike. Seed pods release cottony fluff.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 3, safetyRisk: 1, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'red-clover', taxonId: 51875, category: 'flower',
    scientificName: 'Trifolium pratense', commonName: 'Red Clover',
    description: 'Common lawn flower with sweet, mild flavor. Flower heads are edible raw or dried for tea. Highly nutritious.',
    season: { start: 5, end: 10, peak: [6, 7] }, emoji: '🌺', color: '#BE185D',
    habitat: 'Lawns, fields, roadsides, meadows', edibility: 'Good edible (flowers and leaves)',
    idTips: 'Three leaflets with pale V-shaped markings. Round pink-purple flower heads. Very common in lawns and fields.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 2, safetyRisk: 1, seasonLength: 4, preservation: 4 }
  },
  {
    id: 'nootka-rose', taxonId: 78883, category: 'flower',
    scientificName: 'Rosa nutkana', commonName: 'Nootka Rose',
    description: 'Native wild rose. Petals for tea and salads. Rose hips (fall) are extremely high in vitamin C — make syrup, tea, or jelly.',
    season: { start: 5, end: 11, peak: [6, 9, 10] }, emoji: '🌹', color: '#F43F5E',
    habitat: 'Forest edges, streambanks, open areas', edibility: 'Good edible (petals and hips)',
    idTips: 'Pink 5-petaled flowers with many yellow stamens. Thorny stems. Red-orange rose hips in fall (round, ~1cm).',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },

  // ═══════════════════════ SEAWEED ═══════════════════════
  {
    id: 'bull-kelp', taxonId: 120499, category: 'seaweed',
    scientificName: 'Nereocystis luetkeana', commonName: 'Bull Kelp',
    description: 'Massive kelp with a hollow bulb float and long stipe. Makes excellent pickles, relish, and chips. Rich in minerals and umami.',
    season: { start: 5, end: 10, peak: [7, 8] }, emoji: '🌊', color: '#0D9488',
    habitat: 'Rocky coastline, washes ashore after storms', edibility: 'Good edible',
    idTips: 'Huge — up to 36m long. Long hollow whip-like stipe with a bulbous float and blade-like fronds. Often found washed up on beaches.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },
  {
    id: 'sea-lettuce', taxonId: 67423, category: 'seaweed',
    scientificName: 'Ulva lactuca', commonName: 'Sea Lettuce',
    description: 'Bright green sheet-like seaweed. Mild ocean flavor. Eat raw in salads or dry as seasoning flakes. High in iron and protein.',
    season: { start: 4, end: 10, peak: [6, 7, 8] }, emoji: '🥬', color: '#10B981',
    habitat: 'Intertidal rocks, tide pools, bays', edibility: 'Good edible (raw or dried)',
    idTips: 'Bright green, translucent, lettuce-like sheets attached to rocks in tide pools. Ruffled edges. Very common.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },
  {
    id: 'dulse', taxonId: 182991, category: 'seaweed',
    scientificName: 'Palmaria palmata', commonName: 'Dulse',
    description: 'Red-purple seaweed with a savory, bacon-like flavor when fried. Incredible umami. Traditional food in coastal cultures worldwide.',
    season: { start: 5, end: 10, peak: [7, 8] }, emoji: '🟤', color: '#9F1239',
    habitat: 'Lower intertidal rocks, subtidal attached to other algae', edibility: 'Choice edible',
    idTips: 'Flat, dark red-purple fronds, hand-shaped with broad lobes. Leathery texture. Attached to rocks or other seaweed below tide line.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },

  // ═══════════════════════ FISH & SHELLFISH ═══════════════════════
  {
    id: 'chinook-salmon', taxonId: 54191, category: 'fish',
    scientificName: 'Oncorhynchus tshawytscha', commonName: 'Chinook Salmon (King)',
    description: "The king of Pacific salmon. Oregon's most prized sport fish. Rich, buttery flesh with high oil content. Multiple runs throughout the year.",
    season: { start: 3, end: 11, peak: [5, 6, 9] }, emoji: '🐟', color: '#3B82F6',
    habitat: 'Rivers, streams, ocean. Major runs on Columbia, Willamette, Rogue, Umpqua', edibility: 'Choice edible',
    idTips: 'Largest Pacific salmon (up to 50+ lbs). Black mouth interior (black gums). Spots on both tail lobes. Silver in ocean, dark in rivers.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 2, culinaryValue: 5, safetyRisk: 1, seasonLength: 4, preservation: 5 }
  },
  {
    id: 'steelhead', taxonId: 47516, category: 'fish',
    scientificName: 'Oncorhynchus mykiss', commonName: 'Steelhead Trout',
    description: 'Sea-run rainbow trout. One of the most exciting game fish in the PNW. Pink, delicate flesh. Winter and summer runs.',
    season: { start: 11, end: 4, peak: [12, 1, 2] }, emoji: '🐟', color: '#6366F1',
    habitat: 'Rivers and streams with ocean access. Coastal and Cascade rivers', edibility: 'Choice edible',
    idTips: 'Silver with pink stripe. Smaller than Chinook (5-20 lbs typically). Spots mainly on upper body and dorsal fin. Small head relative to body.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 2, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 5 }
  },
  {
    id: 'dungeness-crab', taxonId: 63697, category: 'marine',
    scientificName: 'Metacarcinus magister', commonName: 'Dungeness Crab',
    description: "The PNW's iconic shellfish. Sweet, tender meat. Commercial and recreational crabbing is a beloved Oregon tradition.",
    season: { start: 12, end: 8, peak: [12, 1, 2] }, emoji: '🦀', color: '#EA580C',
    habitat: 'Bays, estuaries, and nearshore ocean. Major areas: Tillamook, Newport, Coos Bay', edibility: 'Choice edible',
    idTips: 'Wide fan-shaped shell up to 10". Purple-brown on top, white/cream below. 5 teeth on each side of shell anterior edge.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 4, preservation: 4 }
  },
  {
    id: 'razor-clam', taxonId: 117615, category: 'marine',
    scientificName: 'Siliqua patula', commonName: 'Pacific Razor Clam',
    description: 'Fast-digging clam found on sandy ocean beaches. Sweet, tender meat. Recreational digging is a cherished Oregon coast tradition.',
    season: { start: 10, end: 5, peak: [11, 12, 1, 3] }, emoji: '🐚', color: '#78716C',
    habitat: 'Sandy ocean beaches. Key areas: Clatsop Beach, Seaside, Winchester Bay', edibility: 'Choice edible',
    idTips: 'Long narrow oval shell (up to 6"). Smooth, shiny, olive to brown. Look for "shows" — small dimples in wet sand during minus tides.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 4 }
  },

  // ═══════════════════════ NUTS ═══════════════════════
  {
    id: 'beaked-hazelnut', taxonId: 53374, category: 'nut',
    scientificName: 'Corylus cornuta', commonName: 'Beaked Hazelnut (Wild Filbert)',
    description: "Oregon's native hazelnut. Smaller than commercial varieties but excellent nutty flavor. Husks form a long beak over the nut.",
    season: { start: 8, end: 10, peak: [9] }, emoji: '🌰', color: '#92400E',
    habitat: 'Forest edges, streambanks, open woodlands', edibility: 'Choice edible',
    idTips: 'Shrub with double-toothed round leaves. Nuts enclosed in long beaked husks (like a green tube). Catkins in early spring.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 4, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },

  // ═══════════════════════ ADDITIONAL FUNGI ═══════════════════════
  {
    id: 'meadow-mushroom', taxonId: 143563, category: 'fungi',
    scientificName: 'Agaricus campestris', commonName: 'Meadow Mushroom',
    description: 'The wild ancestor of the grocery-store button mushroom. Found in pastures and lawns after rain. Excellent mild flavor.',
    season: { start: 9, end: 11, peak: [10] }, emoji: '🍄', color: '#D4D4D4',
    habitat: 'Pastures, lawns, meadows — never in forests', edibility: 'Choice edible',
    idTips: 'White cap, pink gills aging to brown, ring on stem, NO volva at base. Grows in grass, not wood. Smells pleasant.',
    lookalikes: [{ name: 'Destroying Angel (Amanita ocreata)', danger: 'deadly', tip: 'Amanita has WHITE gills, a volva (cup) at base, and grows near trees. ALWAYS check for volva.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 4, safetyRisk: 4, seasonLength: 2, preservation: 3 }
  },
  {
    id: 'blewit', taxonId: 1525548, category: 'fungi',
    scientificName: 'Collybia nuda', commonName: 'Blewit',
    description: 'Beautiful violet-purple mushroom found in leaf litter in fall. Nutty, mild flavor. Must cook thoroughly.',
    season: { start: 10, end: 12, peak: [11] }, emoji: '💜', color: '#8B5CF6',
    habitat: 'Leaf litter, compost, garden edges', edibility: 'Good edible (must cook)',
    idTips: 'Purple-lilac cap, stem, and gills when young, fading brownish. Spore print pale pink. Found in leaf piles.',
    lookalikes: [{ name: 'Cortinarius species', danger: 'toxic/deadly', tip: 'Cortinarius has rusty-brown spore print and cobwebby veil. ALWAYS check spore print.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 4, safetyRisk: 3, seasonLength: 2, preservation: 3 }
  },
  {
    id: 'cascade-chanterelle', taxonId: 427379, category: 'fungi',
    scientificName: 'Cantharellus cascadensis', commonName: 'Cascade Chanterelle',
    description: 'A recently described chanterelle species endemic to the Cascade Range. Similar to golden chanterelle but with distinct DNA.',
    season: { start: 9, end: 12, peak: [10, 11] }, emoji: '🍄', color: '#D97706',
    habitat: 'Cascade Range coniferous forests, especially with spruce', edibility: 'Choice edible',
    idTips: 'Similar to Pacific Golden Chanterelle. Found specifically in the Cascades. False gills, fruity scent.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 2, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'common-puffball', taxonId: 48443, category: 'fungi',
    scientificName: 'Lycoperdon perlatum', commonName: 'Common Puffball',
    description: 'Small, round, studded with tiny spines. Edible when flesh is pure white inside. Found everywhere in forests.',
    season: { start: 8, end: 11, peak: [9, 10] }, emoji: '⚪', color: '#E5E7EB',
    habitat: 'Forest floor, trail edges, rotting wood', edibility: 'Good edible (when white inside)',
    idTips: 'Round, 2-5cm, covered in tiny spines/warts. CUT IN HALF — interior must be pure white, no outline of a mushroom shape.',
    lookalikes: [{ name: 'Young Amanita (egg stage)', danger: 'deadly', tip: 'Slice in half — if you see the outline of a mushroom forming inside, it is a deadly Amanita egg, NOT a puffball.' }],
    foragerScore: { identification: 4, abundance: 5, culinaryValue: 2, safetyRisk: 3, seasonLength: 3, preservation: 2 }
  },
  {
    id: 'conifer-chicken', taxonId: 118057, category: 'fungi',
    scientificName: 'Laetiporus conifericola', commonName: 'Conifer Chicken of the Woods',
    description: 'The PNW version of chicken of the woods that grows specifically on conifers. Some people have GI sensitivity — try small amounts first.',
    season: { start: 5, end: 11, peak: [8, 9, 10] }, emoji: '🐔', color: '#EA580C',
    habitat: 'Dead or living conifers — Douglas fir, hemlock, spruce', edibility: 'Good edible (caution on conifers)',
    idTips: 'Bright orange shelves with yellow edges on conifer wood. Some people react to the conifer version — try a small amount first.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 3, culinaryValue: 3, safetyRisk: 2, seasonLength: 4, preservation: 3 }
  },
  {
    id: 'honey-mushroom', taxonId: 192381, category: 'fungi',
    scientificName: 'Armillaria ostoyae', commonName: 'Honey Mushroom',
    description: 'One of the largest organisms on earth — a single specimen in Oregon covers 2,385 acres. Dense clusters at tree bases. Must cook well.',
    season: { start: 9, end: 11, peak: [10] }, emoji: '🍯', color: '#D97706',
    habitat: 'Base of trees and stumps, both living and dead', edibility: 'Good edible (must cook thoroughly)',
    idTips: 'Honey-brown cap, white spore print, ring on stem, grows in dense clusters at tree bases. Black "bootlace" rhizomorphs under bark.',
    lookalikes: [{ name: 'Galerina marginata', danger: 'deadly', tip: 'Galerina has rust-brown spore print and grows on wood in small groups. ALWAYS check spore print.' }],
    foragerScore: { identification: 3, abundance: 4, culinaryValue: 3, safetyRisk: 4, seasonLength: 2, preservation: 3 }
  },
  {
    id: 'painted-suillus', taxonId: 118159, category: 'fungi',
    scientificName: 'Suillus lakei', commonName: 'Western Painted Suillus',
    description: 'Colorful bolete found under Douglas fir. Red-brown scales on a yellow cap. Slimy when wet. Remove cap skin before cooking.',
    season: { start: 9, end: 11, peak: [10] }, emoji: '🎨', color: '#B45309',
    habitat: 'Under Douglas fir specifically — mycorrhizal partner', edibility: 'Good edible',
    idTips: 'Red-brown scaly cap, yellow pores underneath, slimy. Ring on stem. Always under Douglas fir.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 3 }
  },

  // ═══════════════════════ ADDITIONAL BERRIES ═══════════════════════
  {
    id: 'saskatoon-berry', taxonId: 75415, category: 'berry',
    scientificName: 'Amelanchier alnifolia', commonName: 'Saskatoon (Serviceberry)',
    description: 'Sweet purple berries similar to blueberries. One of the most important traditional food plants of Pacific Northwest peoples.',
    season: { start: 6, end: 8, peak: [7] }, emoji: '🫐', color: '#6D28D9',
    habitat: 'Forest edges, open slopes, streambanks', edibility: 'Choice edible',
    idTips: 'Shrub/small tree with round leaves. White 5-petaled flowers in spring. Dark purple berry clusters with prominent crown on bottom.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },
  {
    id: 'black-cap-raspberry', taxonId: 63960, category: 'berry',
    scientificName: 'Rubus leucodermis', commonName: 'Black Cap Raspberry',
    description: "PNW native black raspberry. Sweet-tart flavor, intensely aromatic. The berries detach cleanly from the white core like a cup.",
    season: { start: 6, end: 8, peak: [7] }, emoji: '⚫', color: '#1E1B4B',
    habitat: 'Forest edges, clearings, burns, roadsides', edibility: 'Choice edible',
    idTips: 'Canes with whitish bloom and hooked thorns. Berries dark purple-black, pull off leaving white core. Trifoliate leaves, white undersides.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'cascade-blueberry', taxonId: 48348, category: 'berry',
    scientificName: 'Vaccinium deliciosum', commonName: 'Cascade Blueberry',
    description: 'The finest wild blueberry in the PNW. Sweet, complex flavor. Found in subalpine meadows — worth the hike.',
    season: { start: 7, end: 9, peak: [8] }, emoji: '🫐', color: '#4338CA',
    habitat: 'Subalpine meadows, 4000-6000ft, open ridges', edibility: 'Choice edible',
    idTips: 'Low shrub in alpine meadows. Round blue berries with bloom. Tiny oval leaves turning red in fall. Found above timberline.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },
  {
    id: 'wild-gooseberry', taxonId: 53448, category: 'berry',
    scientificName: 'Ribes divaricatum', commonName: 'Wild Gooseberry',
    description: 'Tart, translucent berries on a thorny shrub. Excellent for jams, pies, and sauces. Found throughout PNW forests.',
    season: { start: 6, end: 8, peak: [7] }, emoji: '🟢', color: '#65A30D',
    habitat: 'Forest understory, streambanks, moist woods', edibility: 'Good edible (tart)',
    idTips: 'Thorny shrub with maple-like lobed leaves. Small bell-shaped flowers. Translucent green-purple berries with stripes.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 4 }
  },
  {
    id: 'kinnikinnick', taxonId: 68049, category: 'berry',
    scientificName: 'Arctostaphylos uva-ursi', commonName: 'Kinnikinnick (Bearberry)',
    description: 'Low-growing groundcover with mealy red berries. Bland raw but important traditional food when cooked. Widespread.',
    season: { start: 8, end: 11, peak: [9, 10] }, emoji: '🔴', color: '#DC2626',
    habitat: 'Sandy, rocky areas, open conifer forests, coastal dunes', edibility: 'Edible (bland — best cooked)',
    idTips: 'Low mat-forming evergreen shrub. Small leathery oval leaves. Pink bell flowers. Bright red round berries.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 1, safetyRisk: 1, seasonLength: 3, preservation: 3 }
  },
  {
    id: 'black-hawthorn', taxonId: 76469, category: 'berry',
    scientificName: 'Crataegus douglasii', commonName: 'Black Hawthorn',
    description: 'Small tree with dark purple-black berries (haws) in fall. Makes excellent jelly and is rich in pectin. Thorny branches.',
    season: { start: 8, end: 10, peak: [9] }, emoji: '🫐', color: '#4C1D95',
    habitat: 'Streambanks, forest edges, open woodlands', edibility: 'Good edible',
    idTips: 'Small thorny tree. Clusters of white flowers in spring. Small dark berries in clusters. Lobed leaves.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 3, culinaryValue: 3, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },

  // ═══════════════════════ ADDITIONAL PLANTS ═══════════════════════
  {
    id: 'nodding-onion', taxonId: 116364, category: 'plant',
    scientificName: 'Allium cernuum', commonName: 'Nodding Wild Onion',
    description: 'Native wild onion with a distinctive nodding flower head. Mild onion/garlic flavor. Bulbs, leaves, and flowers are all edible.',
    season: { start: 4, end: 9, peak: [5, 6] }, emoji: '🧅', color: '#A855F7',
    habitat: 'Rocky slopes, meadows, open forests', edibility: 'Good edible (all parts)',
    idTips: 'Grass-like leaves, distinctive drooping pink-purple flower cluster. Smells like onion when crushed. Bulb at base.',
    lookalikes: [{ name: 'Death Camas (Zigadenus)', danger: 'deadly', tip: 'Death camas has NO onion smell. ALWAYS crush and smell — if no onion scent, do NOT eat.' }],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 4, safetyRisk: 4, seasonLength: 3, preservation: 4 }
  },
  {
    id: 'curled-dock', taxonId: 53197, category: 'plant',
    scientificName: 'Rumex crispus', commonName: 'Curled Dock',
    description: 'Ubiquitous wayside plant with lemony leaves. Young leaves for salads, older leaves cooked. Seeds can be ground for flour.',
    season: { start: 3, end: 10, peak: [4, 5] }, emoji: '🌿', color: '#059669',
    habitat: 'Disturbed soils, fields, roadsides, gardens', edibility: 'Good edible (young leaves)',
    idTips: 'Wavy/curled leaf edges (hence the name). Tall spike of green/reddish seeds in summer. Large taproot.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 2, safetyRisk: 1, seasonLength: 4, preservation: 3 }
  },
  {
    id: 'plantain', taxonId: 58961, category: 'plant',
    scientificName: 'Plantago major', commonName: 'Common Plantain',
    description: 'The "band-aid plant." Young leaves edible in salads or cooked. Seeds used as psyllium-like fiber. Also a valuable wound herb.',
    season: { start: 3, end: 10, peak: [4, 5, 6] }, emoji: '🌿', color: '#15803D',
    habitat: 'Lawns, paths, compacted soils, disturbed areas', edibility: 'Good edible (young leaves)',
    idTips: 'Rosette of broad oval leaves with parallel veins. Flower spike like a rat tail. Very common in paths and lawns.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 2, safetyRisk: 1, seasonLength: 5, preservation: 3 }
  },

  // ═══════════════════════ ADDITIONAL FLOWERS ═══════════════════════
  {
    id: 'violet', taxonId: 53328, category: 'flower',
    scientificName: 'Viola adunca', commonName: 'Early Blue Violet',
    description: 'Delicate purple flowers that are entirely edible. Flowers for salads, candied decorations, and violet syrup. Leaves for tea.',
    season: { start: 3, end: 6, peak: [4, 5] }, emoji: '💜', color: '#7C3AED',
    habitat: 'Forest edges, meadows, open woodlands', edibility: 'Good edible (flowers and leaves)',
    idTips: 'Small purple flowers with 5 petals, lower petal with dark lines (nectar guides). Heart-shaped leaves.',
    lookalikes: [],
    foragerScore: { identification: 4, abundance: 4, culinaryValue: 3, safetyRisk: 1, seasonLength: 3, preservation: 3 }
  },

  // ═══════════════════════ ADDITIONAL SEAWEED ═══════════════════════
  {
    id: 'rockweed', taxonId: 69155, category: 'seaweed',
    scientificName: 'Fucus distichus', commonName: 'Rockweed',
    description: 'Olive-brown forked seaweed common in the intertidal zone. Used to steam seafood (traditional clambake). Also edible dried.',
    season: { start: 4, end: 10, peak: [6, 7, 8] }, emoji: '🌊', color: '#713F12',
    habitat: 'Mid-intertidal rocks along the coast', edibility: 'Edible (primarily for cooking)',
    idTips: 'Olive-brown, flat forked fronds with air bladders at tips. Attached to rocks in the intertidal zone. Very common.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 5, culinaryValue: 2, safetyRisk: 1, seasonLength: 4, preservation: 4 }
  },

  // ═══════════════════════ ADDITIONAL FISH ═══════════════════════
  {
    id: 'coho-salmon', taxonId: 53692, category: 'fish',
    scientificName: 'Oncorhynchus kisutch', commonName: 'Coho Salmon (Silver)',
    description: "Silver salmon — Oregon's favorite fall fishing target. Smaller than Chinook but excellent flavor. Aggressive fighters on the line.",
    season: { start: 8, end: 12, peak: [9, 10, 11] }, emoji: '🐟', color: '#60A5FA',
    habitat: 'Coastal rivers and streams. Clackamas, Sandy, Wilson, Nestucca, Coos rivers', edibility: 'Choice edible',
    idTips: 'Medium-sized salmon (8-12 lbs). Silver sides, small spots on upper tail lobe only. White gumline. Turns red in freshwater.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 5, safetyRisk: 1, seasonLength: 3, preservation: 5 }
  },
  {
    id: 'sockeye-salmon', taxonId: 69922, category: 'fish',
    scientificName: 'Oncorhynchus nerka', commonName: 'Sockeye Salmon (Red)',
    description: 'The reddest-fleshed salmon with firm, rich flavor. Limited runs in Oregon but prized. Turns brilliant red when spawning.',
    season: { start: 6, end: 9, peak: [7, 8] }, emoji: '🐟', color: '#EF4444',
    habitat: 'Select rivers with lake access. Limited Oregon runs — check ODFW', edibility: 'Choice edible',
    idTips: 'Slim, streamlined body. No spots on back or tail. Turns bright red with green head during spawning.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 1, culinaryValue: 5, safetyRisk: 1, seasonLength: 2, preservation: 5 }
  },

  // ═══════════════════════ ADDITIONAL MARINE ═══════════════════════
  {
    id: 'geoduck', taxonId: 117618, category: 'marine',
    scientificName: 'Panopea generosa', commonName: 'Pacific Geoduck',
    description: "The world's largest burrowing clam. Incredibly long siphon. Sweet, crunchy meat prized in sushi (mirugai). Lives 100+ years.",
    season: { start: 1, end: 12, peak: [4, 5, 6] }, emoji: '🐚', color: '#A3A3A3',
    habitat: 'Sandy/muddy bays, subtidal to low intertidal. Requires very low tides.', edibility: 'Choice edible',
    idTips: 'Enormous siphon sticking out of sand (up to 3 feet). Shell is small relative to body. Dig DEEP.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 2, culinaryValue: 5, safetyRisk: 1, seasonLength: 5, preservation: 3 }
  },
  {
    id: 'california-mussel', taxonId: 62806, category: 'marine',
    scientificName: 'Mytilus californianus', commonName: 'California Mussel',
    description: 'Large mussels attached to wave-battered rocks. Rich, briny flavor. Check ODFW for red tide/quarantine closures before harvesting.',
    season: { start: 11, end: 4, peak: [12, 1, 2] }, emoji: '🦪', color: '#1E3A5F',
    habitat: 'Exposed rocky coastline in the surf zone', edibility: 'Good edible (check quarantine status)',
    idTips: 'Large (up to 10"), blue-black shells attached to rocks by byssal threads. Found in the wave-splash zone.',
    lookalikes: [],
    foragerScore: { identification: 5, abundance: 4, culinaryValue: 4, safetyRisk: 3, seasonLength: 3, preservation: 3 }
  }
];

ALL_SPECIES.forEach(s => {
  if (s.foragerScore) {
    s.foragerScore.overall = computeOverall(s.foragerScore);
  }
});

export { ALL_SPECIES, CATEGORIES };
