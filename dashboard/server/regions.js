const OREGON_REGIONS = [
  {
    id: 'north-coast',
    name: 'North Coast',
    description: 'Astoria to Lincoln City. Sitka spruce and western hemlock forests drenched by Pacific storms.',
    nearestTowns: ['Astoria', 'Seaside', 'Tillamook', 'Lincoln City'],
    forests: ['Tillamook State Forest', 'Siuslaw National Forest (north)'],
    elevation: { min: 0, max: 500, typical: 150 },
    forestTypes: ['sitka_spruce', 'western_hemlock', 'douglas_fir'],
    soilTypes: ['clay', 'loam', 'sandy_loam'],
    annualPrecipitation: 2000,
    monthlyPrecip: [250, 200, 210, 140, 90, 60, 25, 30, 75, 170, 270, 280],
    monthlyTemp: [6, 7, 8, 10, 12, 14, 16, 16, 15, 11, 8, 6],
    canopyDensity: 0.85,
    polygon: [
      [-124.1, 46.25], [-123.65, 46.25], [-123.55, 45.85],
      [-123.6, 45.35], [-123.7, 44.9], [-124.05, 44.9],
      [-124.15, 45.4], [-124.1, 46.0]
    ]
  },
  {
    id: 'south-coast',
    name: 'South Coast',
    description: 'Florence to Brookings. Lush coastal forests with year-round moisture and mild temperatures.',
    nearestTowns: ['Florence', 'Coos Bay', 'Gold Beach', 'Brookings'],
    forests: ['Siuslaw National Forest (south)', 'Siskiyou National Forest'],
    elevation: { min: 0, max: 600, typical: 200 },
    forestTypes: ['sitka_spruce', 'western_hemlock', 'douglas_fir', 'tanoak'],
    soilTypes: ['clay', 'loam', 'serpentine'],
    annualPrecipitation: 1800,
    monthlyPrecip: [220, 180, 190, 120, 80, 40, 15, 20, 55, 150, 240, 250],
    monthlyTemp: [7, 8, 9, 11, 13, 15, 17, 17, 16, 12, 9, 7],
    canopyDensity: 0.80,
    polygon: [
      [-124.2, 44.9], [-123.75, 44.9], [-123.7, 44.2],
      [-123.8, 43.5], [-124.0, 42.85], [-124.2, 42.0],
      [-124.5, 42.0], [-124.5, 43.0], [-124.4, 44.0]
    ]
  },
  {
    id: 'coast-range',
    name: 'Coast Range Interior',
    description: 'Dense Douglas fir forests between the coast and Willamette Valley. Prime chanterelle territory.',
    nearestTowns: ['Forest Grove', 'Dallas', 'Philomath', 'Cottage Grove'],
    forests: ['Tillamook State Forest', 'Siuslaw NF', 'Elliott State Forest'],
    elevation: { min: 200, max: 1000, typical: 500 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'bigleaf_maple'],
    soilTypes: ['clay', 'loam', 'well_drained'],
    annualPrecipitation: 2200,
    monthlyPrecip: [280, 230, 240, 160, 100, 55, 20, 25, 70, 190, 300, 310],
    monthlyTemp: [4, 5, 7, 9, 12, 15, 18, 18, 15, 10, 6, 4],
    canopyDensity: 0.90,
    polygon: [
      [-123.65, 46.0], [-123.2, 46.0], [-123.1, 45.5],
      [-123.0, 44.9], [-123.2, 44.2], [-123.5, 43.5],
      [-123.7, 43.5], [-123.7, 44.2], [-123.6, 44.9],
      [-123.55, 45.5]
    ]
  },
  {
    id: 'willamette-valley',
    name: 'Willamette Valley',
    description: 'Oregon\'s heartland. Mixed forests on valley edges, urban parks, and riparian corridors. Disturbed soils great for shaggy manes.',
    nearestTowns: ['Portland', 'Salem', 'Eugene', 'Corvallis'],
    forests: ['Forest Park', 'Silver Falls SP', 'McDonald-Dunn Forest', 'urban parks'],
    elevation: { min: 15, max: 300, typical: 80 },
    forestTypes: ['oregon_oak', 'douglas_fir', 'bigleaf_maple', 'red_alder', 'ash'],
    soilTypes: ['clay', 'alluvial', 'silty_loam'],
    annualPrecipitation: 1100,
    monthlyPrecip: [150, 110, 115, 75, 55, 35, 10, 15, 40, 90, 160, 170],
    monthlyTemp: [4, 6, 8, 11, 14, 17, 20, 20, 17, 12, 7, 4],
    canopyDensity: 0.45,
    polygon: [
      [-123.2, 45.7], [-122.5, 45.7], [-122.4, 45.3],
      [-122.5, 44.8], [-122.7, 44.0], [-123.0, 43.7],
      [-123.2, 43.7], [-123.15, 44.2], [-123.05, 44.9],
      [-123.1, 45.3]
    ]
  },
  {
    id: 'mt-hood',
    name: 'Mt. Hood Corridor',
    description: 'Volcanic slopes with old-growth Douglas fir and hemlock transitioning to subalpine. Legendary mushroom country.',
    nearestTowns: ['Sandy', 'Government Camp', 'Welches', 'Zigzag'],
    forests: ['Mt. Hood National Forest'],
    elevation: { min: 300, max: 2000, typical: 900 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'noble_fir', 'pacific_silver_fir', 'mountain_hemlock'],
    soilTypes: ['volcanic', 'sandy_loam', 'pumice'],
    annualPrecipitation: 2500,
    monthlyPrecip: [300, 250, 260, 180, 120, 70, 30, 35, 90, 210, 330, 340],
    monthlyTemp: [0, 1, 3, 6, 9, 13, 17, 17, 13, 7, 3, 0],
    canopyDensity: 0.80,
    polygon: [
      [-122.3, 45.55], [-121.5, 45.55], [-121.4, 45.3],
      [-121.5, 45.05], [-121.7, 44.85], [-122.2, 44.85],
      [-122.45, 45.1], [-122.4, 45.35]
    ]
  },
  {
    id: 'central-cascades',
    name: 'Central Cascades',
    description: 'Willamette and Deschutes NF. Massive old-growth Douglas fir stands with thick moss carpet. The chanterelle motherload.',
    nearestTowns: ['Oakridge', 'Detroit', 'McKenzie Bridge', 'Blue River'],
    forests: ['Willamette National Forest', 'Umpqua National Forest (north)'],
    elevation: { min: 400, max: 2500, typical: 1000 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'noble_fir'],
    soilTypes: ['volcanic', 'clay_loam', 'well_drained'],
    annualPrecipitation: 2200,
    monthlyPrecip: [270, 220, 230, 160, 110, 60, 20, 25, 70, 180, 290, 300],
    monthlyTemp: [1, 2, 4, 7, 10, 14, 18, 18, 14, 8, 3, 1],
    canopyDensity: 0.85,
    polygon: [
      [-122.5, 44.85], [-121.7, 44.85], [-121.5, 44.5],
      [-121.5, 43.8], [-121.7, 43.4], [-122.3, 43.4],
      [-122.6, 43.8], [-122.7, 44.3]
    ]
  },
  {
    id: 'southern-cascades',
    name: 'Southern Cascades',
    description: 'Crater Lake region. Mixed conifer with Shasta red fir. Drier than north, but excellent for fall boletes and matsutake.',
    nearestTowns: ['Klamath Falls', 'Chemult', 'Prospect', 'Union Creek'],
    forests: ['Rogue River–Siskiyou NF', 'Fremont-Winema NF', 'Crater Lake NP'],
    elevation: { min: 600, max: 2700, typical: 1400 },
    forestTypes: ['douglas_fir', 'white_fir', 'shasta_red_fir', 'lodgepole_pine', 'mountain_hemlock'],
    soilTypes: ['volcanic', 'pumice', 'sandy'],
    annualPrecipitation: 1200,
    monthlyPrecip: [150, 120, 130, 80, 55, 25, 10, 12, 35, 90, 160, 170],
    monthlyTemp: [-1, 0, 3, 5, 9, 13, 17, 17, 13, 7, 2, -1],
    canopyDensity: 0.65,
    polygon: [
      [-122.3, 43.4], [-121.5, 43.4], [-121.3, 43.0],
      [-121.2, 42.6], [-121.3, 42.0], [-122.0, 42.0],
      [-122.5, 42.5], [-122.5, 43.0]
    ]
  },
  {
    id: 'central-oregon',
    name: 'Central Oregon',
    description: 'Deschutes NF east of the Cascades. Pumice soils and pine forests — prime matsutake habitat.',
    nearestTowns: ['Bend', 'Sisters', 'La Pine', 'Sunriver'],
    forests: ['Deschutes National Forest', 'Ochoco National Forest'],
    elevation: { min: 900, max: 2200, typical: 1300 },
    forestTypes: ['ponderosa_pine', 'lodgepole_pine', 'white_fir', 'mountain_hemlock'],
    soilTypes: ['pumice', 'volcanic', 'sandy'],
    annualPrecipitation: 500,
    monthlyPrecip: [55, 40, 40, 25, 30, 18, 8, 10, 15, 30, 55, 60],
    monthlyTemp: [-2, 0, 3, 6, 10, 14, 19, 19, 14, 8, 2, -2],
    canopyDensity: 0.50,
    polygon: [
      [-121.5, 44.5], [-120.8, 44.5], [-120.5, 44.1],
      [-120.5, 43.5], [-120.8, 43.0], [-121.3, 43.0],
      [-121.5, 43.4], [-121.5, 43.8]
    ]
  },
  {
    id: 'columbia-gorge',
    name: 'Columbia River Gorge',
    description: 'Dramatic transition from wet west to dry east. Hardwood-rich forests in the moist western end, excellent for wood-decay species.',
    nearestTowns: ['Hood River', 'Cascade Locks', 'The Dalles'],
    forests: ['Columbia River Gorge NSA', 'Mt. Hood NF (north)'],
    elevation: { min: 20, max: 1200, typical: 400 },
    forestTypes: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'oregon_oak', 'grand_fir'],
    soilTypes: ['basalt', 'loam', 'well_drained'],
    annualPrecipitation: 1900,
    monthlyPrecip: [240, 190, 200, 130, 85, 50, 20, 25, 60, 160, 260, 270],
    monthlyTemp: [2, 4, 7, 10, 13, 17, 20, 20, 17, 11, 5, 2],
    canopyDensity: 0.70,
    polygon: [
      [-122.5, 45.8], [-121.2, 45.8], [-121.2, 45.55],
      [-121.5, 45.55], [-122.3, 45.55], [-122.5, 45.55]
    ]
  },
  {
    id: 'rogue-valley',
    name: 'Rogue Valley & Siskiyous',
    description: 'Southern Oregon\'s diverse forests. Oak woodlands, mixed conifer, and the botanically rich Siskiyou Mountains.',
    nearestTowns: ['Ashland', 'Medford', 'Grants Pass', 'Jacksonville'],
    forests: ['Rogue River–Siskiyou NF', 'Applegate Valley'],
    elevation: { min: 300, max: 2000, typical: 700 },
    forestTypes: ['oregon_oak', 'douglas_fir', 'tanoak', 'madrone', 'white_fir', 'ponderosa_pine'],
    soilTypes: ['clay', 'serpentine', 'granitic', 'loam'],
    annualPrecipitation: 800,
    monthlyPrecip: [100, 80, 85, 50, 35, 18, 5, 8, 20, 60, 110, 120],
    monthlyTemp: [3, 5, 8, 11, 14, 19, 23, 22, 18, 12, 6, 3],
    canopyDensity: 0.55,
    polygon: [
      [-123.5, 43.0], [-122.5, 43.0], [-122.0, 42.5],
      [-122.0, 42.0], [-123.5, 42.0], [-123.8, 42.5]
    ]
  },
  {
    id: 'blue-mountains',
    name: 'Blue Mountains & NE Oregon',
    description: 'Remote eastern Oregon forests. Ponderosa pine and grand fir. Legendary spring morel country, especially after wildfires.',
    nearestTowns: ['La Grande', 'Baker City', 'John Day', 'Pendleton'],
    forests: ['Wallowa-Whitman NF', 'Umatilla NF', 'Malheur NF'],
    elevation: { min: 800, max: 2800, typical: 1500 },
    forestTypes: ['ponderosa_pine', 'grand_fir', 'douglas_fir', 'lodgepole_pine', 'engelmann_spruce'],
    soilTypes: ['volcanic', 'basalt', 'granitic', 'loam'],
    annualPrecipitation: 600,
    monthlyPrecip: [65, 50, 55, 35, 40, 30, 12, 15, 20, 40, 65, 70],
    monthlyTemp: [-4, -2, 2, 6, 10, 14, 19, 19, 14, 7, 1, -4],
    canopyDensity: 0.45,
    polygon: [
      [-120.5, 45.5], [-117.5, 45.5], [-117.0, 45.0],
      [-117.5, 44.0], [-118.5, 43.8], [-120.0, 43.8],
      [-120.5, 44.2]
    ]
  }
];

const SPECIES_ECOLOGY = {
  'pacific-golden-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar'],
    elevationRange: { min: 100, max: 1200 },
    optimalPrecipMonth: 150,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['clay_loam', 'well_drained', 'loam', 'clay'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'Look in mossy old-growth Douglas fir stands. Check south-facing slopes first — they warm faster. Golden caps hide in sword fern and duff. Return to productive patches — mycelium fruits in the same spots year after year.',
    accessTip: 'National Forest roads are your best access. Look for stands with 60+ year old Douglas fir with good moss cover.'
  },
  'white-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 4, max: 15, optimal: 10 },
    soilPreference: ['clay', 'loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 60 },
    tips: 'Found in older, wetter forests than golden chanterelles. Often in deep moss near the base of large hemlocks. Pale color makes them hard to spot — look for subtle bumps in the moss.',
    accessTip: 'Old-growth stands in the Coast Range and western Cascades are prime habitat.'
  },
  'yellowfoot-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 200,
    tempRange: { min: 2, max: 12, optimal: 7 },
    soilPreference: ['clay', 'loam', 'organic'],
    fruiting: { daysAfterRain: 10, minRainMm: 40 },
    tips: 'The winter chanterelle — fruits late fall through winter in huge troops. Look on rotting wood and deeply mossy areas. Often hundreds in one patch. Excellent dried for later use.',
    accessTip: 'Low-elevation coastal and Coast Range forests. Check where water pools and moss is thickest.'
  },
  'king-bolete': {
    preferredForests: ['douglas_fir', 'noble_fir', 'mountain_hemlock', 'spruce'],
    elevationRange: { min: 500, max: 2000 },
    optimalPrecipMonth: 100,
    tempRange: { min: 5, max: 18, optimal: 13 },
    soilPreference: ['volcanic', 'sandy_loam', 'well_drained'],
    fruiting: { daysAfterRain: 10, minRainMm: 30 },
    tips: 'Found at mid to high elevations in mixed conifer. Look along forest edges and clearings. Often near huckleberry patches. Check under noble fir at 3000-5000 ft in the Cascades.',
    accessTip: 'Cascade passes and high-elevation forest roads (FS roads). Santiam Pass, McKenzie Pass, and Mt. Hood areas.'
  },
  'admirable-bolete': {
    preferredForests: ['western_hemlock', 'douglas_fir'],
    elevationRange: { min: 100, max: 1200 },
    optimalPrecipMonth: 120,
    tempRange: { min: 8, max: 18, optimal: 13 },
    soilPreference: ['organic', 'loam'],
    fruiting: { daysAfterRain: 12, minRainMm: 30 },
    tips: 'Unique — grows directly on decaying hemlock logs and stumps, not soil. Dark velvety cap is distinctive. Look for large old hemlock snags and fallen logs.',
    accessTip: 'Old-growth hemlock forests in the Coast Range and western Cascades.'
  },
  'black-morel': {
    preferredForests: ['douglas_fir', 'grand_fir', 'ponderosa_pine', 'lodgepole_pine'],
    elevationRange: { min: 500, max: 2500 },
    optimalPrecipMonth: 60,
    tempRange: { min: 5, max: 20, optimal: 13 },
    soilPreference: ['volcanic', 'sandy', 'disturbed', 'burned'],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'THE spring mushroom. Post-fire morels appear in massive quantities the spring after a wildfire (1-2 year window). Natural morels fruit along river bottoms, old orchards, and disturbed ground. South-facing slopes produce first.',
    accessTip: 'Check previous year\'s burn scars — USFS publishes fire maps. Also: river bottoms in the Cascades and Blue Mountains. Snow level determines timing: lower = earlier.'
  },
  'chicken-of-the-woods': {
    preferredForests: ['oregon_oak', 'douglas_fir', 'bigleaf_maple', 'red_alder'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 50,
    tempRange: { min: 10, max: 25, optimal: 18 },
    soilPreference: [],
    fruiting: { daysAfterRain: 7, minRainMm: 15 },
    tips: 'Grows on dead or dying hardwoods and some conifers. Bright orange shelves impossible to miss. Harvest young, tender edges only — older growth is tough. Often returns to the same tree for years.',
    accessTip: 'Urban parks, oak groves, and hardwood areas in the Willamette Valley and Gorge.'
  },
  'hen-of-the-woods': {
    preferredForests: ['oregon_oak', 'bigleaf_maple', 'tanoak'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 60,
    tempRange: { min: 8, max: 20, optimal: 14 },
    soilPreference: ['clay', 'loam'],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Look at the base of large oaks. Can grow enormous — 20+ lbs. Gray-brown overlapping caps blend with bark and leaf litter. Check the same trees annually.',
    accessTip: 'Oak groves in the Willamette Valley and Rogue Valley. Applegate Valley oaks are productive.'
  },
  'lions-mane': {
    preferredForests: ['bigleaf_maple', 'red_alder', 'oregon_oak', 'tanoak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 80,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: [],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Grows on dead or wounded hardwoods. Cascading white spines are unmistakable. Often high up on standing dead trees — look UP. May fruit multiple times per season from the same wound.',
    accessTip: 'Hardwood-rich areas: Columbia Gorge, Willamette Valley riparian corridors, Coast Range maple groves.'
  },
  'coral-tooth': {
    preferredForests: ['bigleaf_maple', 'red_alder', 'tanoak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 80,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: [],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Similar to Lion\'s Mane but branching like coral. Found on fallen hardwood logs. Beautiful white specimen.',
    accessTip: 'Dead logs in hardwood forests in the Gorge and valley margins.'
  },
  'western-matsutake': {
    preferredForests: ['lodgepole_pine', 'ponderosa_pine', 'mountain_hemlock', 'shore_pine'],
    elevationRange: { min: 800, max: 2000 },
    optimalPrecipMonth: 50,
    tempRange: { min: 2, max: 14, optimal: 8 },
    soilPreference: ['pumice', 'sandy', 'volcanic'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Oregon\'s most valuable wild mushroom. Fruits in pumice soils under shore pine and lodgepole. Look for "mushrumps" — subtle bumps in the duff. Spicy cinnamon-like aroma when fresh. Often near Rhododendron and beargrass.',
    accessTip: 'Central Oregon east of the Cascades — Chemult, Crescent Lake, and Deschutes NF pumice flats. Also good along the coast in shore pine forests.'
  },
  'lobster-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 80,
    tempRange: { min: 10, max: 20, optimal: 15 },
    soilPreference: ['clay', 'loam'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Not a mushroom itself — it\'s a parasite that colonizes Russula and Lactarius. Bright orange-red and hard to miss. Check areas where Russula species are abundant. Firm, dense, and delicious.',
    accessTip: 'Coast Range and western Cascades in mixed conifer stands where Russula are common.'
  },
  'hedgehog-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 150,
    tempRange: { min: 3, max: 15, optimal: 10 },
    soilPreference: ['clay', 'loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'Often found alongside chanterelles. Identified by tooth-like spines under the cap instead of gills. Pale orange-cream color. Very mild, sweet flavor — a beginner-friendly species.',
    accessTip: 'Same spots as chanterelles — Coast Range and Cascade old-growth Douglas fir.'
  },
  'oyster-mushroom': {
    preferredForests: ['red_alder', 'bigleaf_maple', 'cottonwood', 'oregon_oak'],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 100,
    tempRange: { min: 0, max: 15, optimal: 8 },
    soilPreference: [],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'One of few mushrooms that fruits in cold/wet winter conditions. Found on dead and dying hardwoods, especially alder. Fan-shaped clusters. Mild anise-like aroma. Can fruit year-round in mild coastal climates.',
    accessTip: 'Riparian corridors with alder. Willamette Valley streams, coastal creeks. Also urban parks with dying hardwoods.'
  },
  'cauliflower-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock'],
    elevationRange: { min: 200, max: 1200 },
    optimalPrecipMonth: 80,
    tempRange: { min: 8, max: 18, optimal: 14 },
    soilPreference: ['loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Massive ruffled fungus growing at the base of Douglas fir. Can reach 30+ lbs. Pale cream to yellow. Noodle-like texture. One specimen can feed a family for a week.',
    accessTip: 'Base of large Douglas fir in mid-elevation Cascade and Coast Range forests.'
  },
  'black-trumpet': {
    preferredForests: ['oregon_oak', 'tanoak', 'bigleaf_maple', 'douglas_fir'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 2, max: 12, optimal: 7 },
    soilPreference: ['clay', 'loam', 'mossy'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'The "black gold" of winter foraging. Nearly invisible against dark forest floor — look for patches of dark funnels in mossy areas near oaks. Deeply aromatic, almost truffle-like when dried.',
    accessTip: 'Oak-associated areas in the southern Willamette Valley and Rogue Valley. Also tanoak forests on the south coast.'
  },
  'shaggy-mane': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 60,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['disturbed', 'clay', 'compacted', 'gravel'],
    fruiting: { daysAfterRain: 5, minRainMm: 15 },
    tips: 'Grows in disturbed ground — lawns, gravel shoulders, construction sites, paths. Distinctive tall white cylinders with shaggy scales. Must eat within hours of picking as they auto-digest (deliquesce) into black ink.',
    accessTip: 'Urban areas, roadsides, park lawns, gravel patches. Look after fall rains in the Willamette Valley.'
  },
  'giant-puffball': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 50,
    tempRange: { min: 10, max: 22, optimal: 16 },
    soilPreference: ['loam', 'alluvial', 'rich'],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'Unmistakable white spheres in open areas. Cut open to verify — flesh must be pure white throughout. Any yellow or brown means too old. Great sliced thick and pan-fried.',
    accessTip: 'Open meadows, pastures, and park edges in the Willamette Valley.'
  },
  'oregon-black-truffle': {
    preferredForests: ['douglas_fir'],
    elevationRange: { min: 100, max: 800 },
    optimalPrecipMonth: 200,
    tempRange: { min: 2, max: 10, optimal: 5 },
    soilPreference: ['loam', 'well_drained', 'sandy_loam'],
    fruiting: { daysAfterRain: 21, minRainMm: 80 },
    tips: 'Fruits underground near Douglas fir roots in winter. Intensely aromatic — pineapple, chocolate, garlic notes. Requires raking through duff and topsoil. Train a dog for best results.',
    accessTip: 'Young Douglas fir plantations (15-40 years) in the Coast Range and western Cascades foothills.'
  },
  'oregon-white-truffle': {
    preferredForests: ['douglas_fir'],
    elevationRange: { min: 100, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 3, max: 12, optimal: 7 },
    soilPreference: ['loam', 'well_drained', 'sandy_loam'],
    fruiting: { daysAfterRain: 21, minRainMm: 60 },
    tips: 'Fall-fruiting truffle found underground near Douglas fir. Garlicky, herbaceous aroma. Look where squirrels have been digging — they eat truffles. Second-growth fir stands (20-50 years) are ideal.',
    accessTip: 'Douglas fir plantations in the Coast Range foothills and Willamette Valley margins.'
  },

  // ═══════════ BERRIES ═══════════
  'huckleberry': {
    preferredForests: ['mountain_hemlock', 'noble_fir', 'pacific_silver_fir', 'douglas_fir'],
    elevationRange: { min: 900, max: 1800 },
    optimalPrecipMonth: 60, tempRange: { min: 5, max: 22, optimal: 16 },
    soilPreference: ['volcanic', 'sandy_loam', 'acidic'],
    tips: 'Higher-elevation berry — look on open ridges, burns, and meadow edges at 3000-6000ft. Ripe when deep purple-black and easily detached.',
    accessTip: 'Cascade passes, Mt. Hood, Santiam Pass. Forest roads at 4000ft+ with recent burns.'
  },
  'salal': {
    preferredForests: ['sitka_spruce', 'western_hemlock', 'douglas_fir', 'shore_pine'],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 50, tempRange: { min: 8, max: 25, optimal: 18 },
    soilPreference: ['sandy', 'loam', 'acidic'],
    tips: 'Ubiquitous coastal understory shrub. Berries are mealy but sweet, best in jams/syrups. Available everywhere near the coast.',
    accessTip: 'Any coastal trail or forest — cannot be missed.'
  },
  'thimbleberry': {
    preferredForests: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'western_red_cedar'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 40, tempRange: { min: 12, max: 28, optimal: 20 },
    soilPreference: ['loam', 'rich', 'moist'],
    tips: 'Forest edge berry. Very fragile — eat on the trail, does not transport. Look for large maple-like leaves (no thorns).',
    accessTip: 'Forest edges and road cuts throughout the Coast Range and Cascades.'
  },
  'salmonberry': {
    preferredForests: ['red_alder', 'bigleaf_maple', 'sitka_spruce', 'western_red_cedar'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 60, tempRange: { min: 10, max: 22, optimal: 16 },
    soilPreference: ['moist', 'alluvial', 'rich'],
    tips: 'One of the first berries of the season. Found along streams. Orange or red berries. Flavor varies — pick the sweetest.',
    accessTip: 'Streambanks and moist areas along coast and Coast Range trails.'
  },
  'oregon-grape': {
    preferredForests: ['douglas_fir', 'oregon_oak', 'ponderosa_pine', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 30, tempRange: { min: 8, max: 28, optimal: 18 },
    soilPreference: ['rocky', 'loam', 'well_drained'],
    tips: 'Holly-like leaves, dusty blue berries in clusters. Very tart — makes excellent jelly with sugar.',
    accessTip: 'Forest understory everywhere. State flower — very common.'
  },
  'trailing-blackberry': {
    preferredForests: ['douglas_fir', 'red_alder', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 30, tempRange: { min: 12, max: 28, optimal: 20 },
    soilPreference: ['loam', 'sandy', 'well_drained'],
    tips: 'Native PNW blackberry. Low trailing vine, smaller berries than Himalayan. FAR superior flavor.',
    accessTip: 'Forest edges and clearings. Distinguish from invasive Himalayan by smaller size and trailing habit.'
  },
  'evergreen-huckleberry': {
    preferredForests: ['sitka_spruce', 'western_hemlock', 'shore_pine', 'douglas_fir'],
    elevationRange: { min: 0, max: 500 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 20, optimal: 14 },
    soilPreference: ['acidic', 'sandy', 'loam'],
    tips: 'Coastal low-elevation huckleberry. Small glossy evergreen leaves. Available later than mountain huckleberry.',
    accessTip: 'Coastal forests and edges, especially Tillamook and Siuslaw NF.'
  },
  'red-huckleberry': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 50, tempRange: { min: 8, max: 24, optimal: 16 },
    soilPreference: ['organic', 'acidic', 'rotting_wood'],
    tips: 'Grows on nurse logs/stumps. Bright translucent red berries. Green angular stems. Tangy flavor.',
    accessTip: 'Old-growth forests with large nurse logs. Coast Range and western Cascades.'
  },
  'blue-elderberry': {
    preferredForests: ['red_alder', 'bigleaf_maple', 'oregon_oak', 'cottonwood'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 30, tempRange: { min: 12, max: 30, optimal: 22 },
    soilPreference: ['alluvial', 'rich', 'moist'],
    tips: 'MUST be cooked — raw elderberries are toxic. Flat-topped blue-black clusters. Makes syrup, wine, cordial.',
    accessTip: 'Streambanks and forest edges in the Willamette Valley and Rogue Valley.'
  },

  // ═══════════ PLANTS ═══════════
  'stinging-nettle': {
    preferredForests: ['red_alder', 'bigleaf_maple', 'cottonwood', 'douglas_fir'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 20, optimal: 12 },
    soilPreference: ['rich', 'alluvial', 'moist', 'nitrogen_rich'],
    tips: 'Harvest with gloves in early spring when tops are tender. Cook neutralizes sting. Incredibly nutritious — more protein than spinach.',
    accessTip: 'Streambanks, moist forest edges, anywhere with rich disturbed soil.'
  },
  'miners-lettuce': {
    preferredForests: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'oregon_oak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 60, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['loam', 'moist', 'shady'],
    tips: 'Unmistakable round leaf with stem through center. Mild lettuce flavor. Eat raw in salads. Best in early spring before it bolts.',
    accessTip: 'Moist shady areas in low-elevation forests, gardens, and woodland edges.'
  },
  'wood-sorrel': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'sitka_spruce'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 22, optimal: 14 },
    soilPreference: ['organic', 'moist', 'acidic'],
    tips: 'Clover-like with lemony tang. Eat sparingly — contains oxalic acid. Perfect trailside nibble.',
    accessTip: 'Carpets the floor of old-growth coniferous forests. Everywhere in moist PNW forests.'
  },
  'cattail': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 40, tempRange: { min: 5, max: 28, optimal: 18 },
    soilPreference: ['wetland', 'alluvial', 'mucky'],
    tips: '"Supermarket of the swamp." Spring shoots, pollen in June, root starch year-round. Multiple edible parts.',
    accessTip: 'Marshes, pond edges, ditches. Willamette Valley and coastal wetlands.'
  },
  'dandelion': {
    preferredForests: [],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 30, tempRange: { min: 5, max: 25, optimal: 15 },
    soilPreference: ['any', 'disturbed', 'lawn'],
    tips: 'Entire plant edible. Young leaves in salads, flowers for wine/fritters, roots for tea/coffee substitute.',
    accessTip: 'Everywhere — lawns, fields, gardens. Avoid sprayed areas.'
  },
  'chickweed': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 40, tempRange: { min: 2, max: 18, optimal: 10 },
    soilPreference: ['moist', 'rich', 'disturbed'],
    tips: 'Mild lettuce-like flavor. Available almost year-round. Look for the single line of hair on the stem.',
    accessTip: 'Gardens, moist disturbed areas. One of the earliest spring greens.'
  },
  'lambsquarters': {
    preferredForests: [],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 25, tempRange: { min: 10, max: 30, optimal: 20 },
    soilPreference: ['rich', 'disturbed', 'garden'],
    tips: 'Wild spinach relative. Diamond-shaped leaves with white powdery coating. Cook like spinach.',
    accessTip: 'Gardens, farms, disturbed soils. Common summer "weed."'
  },
  'bracken-fern': {
    preferredForests: ['douglas_fir', 'ponderosa_pine', 'red_alder'],
    elevationRange: { min: 0, max: 1500 },
    optimalPrecipMonth: 50, tempRange: { min: 8, max: 22, optimal: 14 },
    soilPreference: ['acidic', 'sandy', 'well_drained'],
    tips: 'Fiddleheads only — tightly curled young fronds in spring. Must blanch before cooking.',
    accessTip: 'Open forests, clearings, burns. Very common fern.'
  },

  // ═══════════ FLOWERS ═══════════
  'fireweed': {
    preferredForests: ['lodgepole_pine', 'douglas_fir'],
    elevationRange: { min: 0, max: 2000 },
    optimalPrecipMonth: 30, tempRange: { min: 10, max: 28, optimal: 18 },
    soilPreference: ['disturbed', 'burned', 'sandy'],
    tips: 'Young shoots like asparagus in spring. Flowers for jelly/tea in summer. Colonizes burns.',
    accessTip: 'Burns, clearings, roadsides. Spectacular pink displays in summer.'
  },
  'red-clover': {
    preferredForests: [],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 30, tempRange: { min: 8, max: 25, optimal: 16 },
    soilPreference: ['loam', 'lawn', 'meadow'],
    tips: 'Flower heads edible raw or dried for tea. Very common lawn flower.',
    accessTip: 'Lawns, fields, meadows everywhere.'
  },
  'nootka-rose': {
    preferredForests: ['douglas_fir', 'red_alder', 'bigleaf_maple', 'oregon_oak'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 30, tempRange: { min: 5, max: 25, optimal: 15 },
    soilPreference: ['loam', 'well_drained'],
    tips: 'Petals for salads/tea in spring. Rose hips in fall — extremely high vitamin C. Make syrup or jelly.',
    accessTip: 'Forest edges, streambanks. Common native rose.'
  },

  // ═══════════ SEAWEED ═══════════
  'bull-kelp': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['rocky_coast', 'subtidal'],
    tips: 'Harvest fresh from stipe. Makes pickles, relish, chips. Rich in iodine and umami.',
    accessTip: 'Rocky Oregon coastline. Also washes ashore after storms.'
  },
  'sea-lettuce': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 20, optimal: 12 },
    soilPreference: ['intertidal', 'rocky'],
    tips: 'Bright green sheets in tide pools. Eat raw or dry for seasoning flakes.',
    accessTip: 'Intertidal rocks along Oregon coast. Best at low tide.'
  },
  'dulse': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['subtidal', 'rocky'],
    tips: 'Red-purple fronds. Fry until crispy for bacon-like flavor. Incredible umami.',
    accessTip: 'Lower intertidal zone on rocky coast. Best at very low tides.'
  },

  // ═══════════ FISH / MARINE ═══════════
  'chinook-salmon': {
    preferredForests: [],
    elevationRange: { min: 0, max: 500 },
    optimalPrecipMonth: 60, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['river', 'stream'],
    tips: 'Oregon\'s king salmon. Multiple runs — spring Chinook (May-Jun) and fall Chinook (Sep-Oct). Check ODFW regulations.',
    accessTip: 'Columbia, Willamette, Rogue, Umpqua rivers. Bank fishing and boat fishing.'
  },
  'steelhead': {
    preferredForests: [],
    elevationRange: { min: 0, max: 500 },
    optimalPrecipMonth: 80, tempRange: { min: 2, max: 14, optimal: 8 },
    soilPreference: ['river', 'stream'],
    tips: 'Winter steelhead (Dec-Mar) and summer steelhead (Jun-Sep). Check ODFW regulations for open rivers.',
    accessTip: 'Coastal rivers and Cascade streams. Clackamas, Sandy, Wilson, Nestucca rivers.'
  },
  'dungeness-crab': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['bay', 'estuary', 'ocean'],
    tips: 'Commercial season opens December. Recreational crabbing in bays year-round. Use crab rings or pots with chicken/fish bait.',
    accessTip: 'Tillamook Bay, Yaquina Bay, Coos Bay. Also jetty and pier crabbing.'
  },
  'razor-clam': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['sandy_beach', 'ocean'],
    tips: 'Dig during minus tides. Look for "shows" (dimples in wet sand). Dig fast — they\'re quick. Check ODFW for open digs.',
    accessTip: 'Clatsop Beach, Long Beach, Winchester Bay. Requires shellfish license.'
  },

  // ═══════════ NUTS ═══════════
  'beaked-hazelnut': {
    preferredForests: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'oregon_oak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 30, tempRange: { min: 10, max: 28, optimal: 18 },
    soilPreference: ['loam', 'well_drained'],
    tips: 'Native hazelnut in beaked husks. Smaller than commercial but great flavor. Harvest in fall before squirrels get them.',
    accessTip: 'Forest edges and streambanks. Willamette Valley and Coast Range foothills.'
  },
  'meadow-mushroom': {
    preferredForests: [],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 60, tempRange: { min: 8, max: 20, optimal: 14 },
    soilPreference: ['grass', 'pasture', 'lawn'],
    tips: 'Grows in grass ONLY — never in forests. Pink gills aging to chocolate-brown. ALWAYS check for volva to rule out Amanita.',
    accessTip: 'Pastures, horse fields, lawns after fall rains. Willamette Valley.'
  },
  'blewit': {
    preferredForests: ['bigleaf_maple', 'oregon_oak', 'red_alder'],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 100, tempRange: { min: 3, max: 14, optimal: 8 },
    soilPreference: ['leaf_litter', 'compost', 'organic'],
    tips: 'Late fall mushroom in deep leaf litter. Violet-purple all over when young. ALWAYS check spore print (pale pink, not rusty).',
    accessTip: 'Under deciduous trees with deep leaf litter. Gardens and compost piles.'
  },
  'cascade-chanterelle': {
    preferredForests: ['douglas_fir', 'noble_fir', 'mountain_hemlock', 'engelmann_spruce'],
    elevationRange: { min: 500, max: 1500 },
    optimalPrecipMonth: 150, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['volcanic', 'loam', 'well_drained'],
    tips: 'Cascade-endemic chanterelle. Similar to golden chanterelle but found at higher elevations in the Cascades.',
    accessTip: 'Mid-elevation Cascade forests. Willamette NF, Mt. Hood NF.'
  },
  'common-puffball': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 60, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['organic', 'loam', 'forest_floor'],
    tips: 'Small round puffballs on forest floor. ALWAYS slice in half — must be pure white inside with no mushroom outline.',
    accessTip: 'Trail edges and forest floor throughout PNW forests.'
  },
  'conifer-chicken': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 50, tempRange: { min: 10, max: 25, optimal: 18 },
    soilPreference: [],
    tips: 'Bright orange shelves on conifer wood. Some people react — try small amount first. Harvest young tender edges.',
    accessTip: 'Dead and dying conifers in any PNW forest.'
  },
  'honey-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'red_alder', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['organic', 'loam'],
    tips: 'Dense clusters at tree bases in fall. MUST cook thoroughly. Check spore print (white, NOT rusty brown).',
    accessTip: 'Base of trees throughout PNW forests. Very common.'
  },
  'painted-suillus': {
    preferredForests: ['douglas_fir'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['loam', 'well_drained'],
    tips: 'Always under Douglas fir — obligate mycorrhizal partner. Remove slimy cap skin before cooking.',
    accessTip: 'Any Douglas fir forest in the PNW.'
  },
  'saskatoon-berry': {
    preferredForests: ['douglas_fir', 'ponderosa_pine', 'oregon_oak'],
    elevationRange: { min: 100, max: 1500 },
    optimalPrecipMonth: 30, tempRange: { min: 10, max: 28, optimal: 20 },
    soilPreference: ['well_drained', 'rocky', 'loam'],
    tips: 'Similar to blueberries. Ripe when dark purple and easily detached. Crown on bottom of berry. Excellent fresh or dried.',
    accessTip: 'Forest edges and open slopes. Eastern Cascades and Rogue Valley.'
  },
  'black-cap-raspberry': {
    preferredForests: ['douglas_fir', 'red_alder', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 30, tempRange: { min: 14, max: 30, optimal: 22 },
    soilPreference: ['well_drained', 'sandy', 'loam'],
    tips: 'Native black raspberry. Berries pull off leaving hollow cup (unlike blackberry). Intensely flavored.',
    accessTip: 'Forest edges, clearings, roadsides. Willamette Valley and Coast Range.'
  },
  'cascade-blueberry': {
    preferredForests: ['mountain_hemlock', 'pacific_silver_fir', 'noble_fir'],
    elevationRange: { min: 1200, max: 2000 },
    optimalPrecipMonth: 40, tempRange: { min: 8, max: 22, optimal: 16 },
    soilPreference: ['volcanic', 'acidic', 'sandy'],
    tips: 'Alpine blueberry. Small but incredibly sweet. Found above timberline in mountain meadows.',
    accessTip: 'Subalpine meadows at 4000-6000ft. Mt. Hood, Mt. Jefferson, Three Sisters areas.'
  },
  'wild-gooseberry': {
    preferredForests: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'western_red_cedar'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 50, tempRange: { min: 10, max: 24, optimal: 16 },
    soilPreference: ['moist', 'loam', 'organic'],
    tips: 'Thorny shrub with tart translucent berries. Great for pies and jams.',
    accessTip: 'Forest understory and streambanks.'
  },
  'kinnikinnick': {
    preferredForests: ['ponderosa_pine', 'lodgepole_pine', 'shore_pine', 'douglas_fir'],
    elevationRange: { min: 0, max: 1500 },
    optimalPrecipMonth: 20, tempRange: { min: 5, max: 25, optimal: 15 },
    soilPreference: ['sandy', 'rocky', 'acidic'],
    tips: 'Low mat-forming groundcover. Red berries are bland raw but can be cooked into sauce.',
    accessTip: 'Sandy/rocky areas. Coastal dunes, open pine forests, rocky outcrops.'
  },
  'black-hawthorn': {
    preferredForests: ['oregon_oak', 'douglas_fir', 'red_alder', 'bigleaf_maple'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 30, tempRange: { min: 10, max: 28, optimal: 18 },
    soilPreference: ['loam', 'moist', 'alluvial'],
    tips: 'Small dark berries (haws) rich in pectin. Excellent for jelly.',
    accessTip: 'Streambanks and forest edges.'
  },
  'nodding-onion': {
    preferredForests: ['ponderosa_pine', 'oregon_oak', 'douglas_fir'],
    elevationRange: { min: 100, max: 1500 },
    optimalPrecipMonth: 25, tempRange: { min: 8, max: 28, optimal: 18 },
    soilPreference: ['rocky', 'well_drained', 'meadow'],
    tips: 'ALWAYS smell — must smell like onion. Death camas looks similar but has NO onion smell. Bulbs, leaves, flowers all edible.',
    accessTip: 'Rocky meadows and open slopes. Eastern Cascades, Rogue Valley.'
  },
  'curled-dock': {
    preferredForests: [],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 30, tempRange: { min: 5, max: 25, optimal: 14 },
    soilPreference: ['any', 'disturbed', 'rich'],
    tips: 'Lemony young leaves in spring for salads. Seeds can be ground into flour. Very common weed.',
    accessTip: 'Everywhere — fields, roadsides, disturbed areas.'
  },
  'plantain': {
    preferredForests: [],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 30, tempRange: { min: 5, max: 25, optimal: 15 },
    soilPreference: ['compacted', 'disturbed', 'lawn', 'path'],
    tips: 'Young leaves for salads. Also a famous wound herb — chew leaf and apply to stings/cuts.',
    accessTip: 'Paths, lawns, disturbed compacted soils. Impossible to miss.'
  },
  'violet': {
    preferredForests: ['douglas_fir', 'bigleaf_maple', 'red_alder'],
    elevationRange: { min: 0, max: 1200 },
    optimalPrecipMonth: 50, tempRange: { min: 5, max: 20, optimal: 12 },
    soilPreference: ['moist', 'organic', 'loam'],
    tips: 'Flowers for salads, candied garnish, or violet syrup. Leaves for tea. All parts edible.',
    accessTip: 'Forest edges, meadows, and open woodlands.'
  },
  'rockweed': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['intertidal', 'rocky'],
    tips: 'Traditional seaweed for steaming seafood (clambake). Also dried for seasoning.',
    accessTip: 'Mid-intertidal rocks along the Oregon coast.'
  },
  'coho-salmon': {
    preferredForests: [],
    elevationRange: { min: 0, max: 300 },
    optimalPrecipMonth: 80, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['river', 'stream'],
    tips: 'Fall silver salmon. Check ODFW for open rivers and hatchery vs wild regulations.',
    accessTip: 'Coastal rivers: Clackamas, Sandy, Wilson, Nestucca, Coos. Also Columbia tributaries.'
  },
  'sockeye-salmon': {
    preferredForests: [],
    elevationRange: { min: 0, max: 500 },
    optimalPrecipMonth: 40, tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['river', 'lake'],
    tips: 'Limited runs in Oregon. Reddest flesh of any salmon. Check ODFW — runs vary greatly by year.',
    accessTip: 'Very limited Oregon runs. Some years available on upper Columbia.'
  },
  'geoduck': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['sandy_mud', 'bay', 'subtidal'],
    tips: 'Enormous clam. Requires very low tides. Siphon extends 3 feet. Sweet, crunchy sashimi.',
    accessTip: 'Sandy bays at extreme low tides. Coos Bay, Tillamook Bay.'
  },
  'california-mussel': {
    preferredForests: [],
    elevationRange: { min: 0, max: 0 },
    optimalPrecipMonth: 0, tempRange: { min: 5, max: 16, optimal: 10 },
    soilPreference: ['rocky_coast', 'surf_zone'],
    tips: 'Harvest in winter (R months rule). ALWAYS check ODFW for red tide/biotoxin closures. Rich briny flavor.',
    accessTip: 'Wave-exposed rocky headlands along Oregon coast. Cape Perpetua, Otter Rock.'
  }
};

export { OREGON_REGIONS, SPECIES_ECOLOGY };
