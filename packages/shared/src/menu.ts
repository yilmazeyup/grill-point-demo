/**
 * Grill-Point's menu with its own names, descriptions and prices: grill-point.nl (Foodticket) and, where the site gives
 * only a starting price, the printed menu board on the restaurant's Instagram (July 2026). The kitchen stations, cook
 * times and allergen hints are the demo's.
 */

export type CategoryId = 'grill' | 'doner' | 'kapsalon' | 'burgers' | 'pizza' | 'snacks' | 'kids' | 'desserts' | 'drinks' | 'sauzen';

/** Where a dish is made: the Grill-Cam follows an order from station to station. */
export type Station = 'grill' | 'spit' | 'oven' | 'plancha' | 'fryer' | 'pass' | 'cold';

export type Tag = 'halal' | 'pittig' | 'vega' | 'kids' | 'delen' | 'favoriet' | 'nieuw';

export type Allergen = 'gluten' | 'melk' | 'ei' | 'sesam' | 'noten' | 'vis' | 'mosterd' | 'selderij' | 'soja';

export type Choice = { id: string; label: string; /** Added to the dish's price. */ extra?: number };

export type OptionGroup = {
  id: string;
  label: string;
  /** 'one' picks exactly one (the first is the default); 'many' picks any number. */
  pick: 'one' | 'many';
  choices: Choice[];
};

export type Dish = {
  id: string;
  cat: CategoryId;
  name: string;
  /** Turkish name, for the AI chef and the guests who look for it. */
  tr?: string;
  desc?: string;
  /** The price of the smallest or plainest version. */
  price: number;
  photo: string;
  tags: Tag[];
  options?: OptionGroup[];
  station: Station;
  /** Minutes on the fire for one portion. */
  cook: number;
  allergens: Allergen[];
};

export const CATEGORIES: { id: CategoryId; name: string; short: string; line: string }[] = [
  { id: 'grill', name: 'Van de grill', short: 'Grill', line: 'Op houtskool, klein of groot' },
  { id: 'doner', name: 'Döner & wraps', short: 'Döner', line: 'Broodje, dürüm, lahmacun en pita' },
  { id: 'kapsalon', name: 'Kapsalon & schotels', short: 'Kapsalon', line: 'Friet, vlees, kaas en salade' },
  { id: 'burgers', name: 'Burgers', short: 'Burgers', line: 'Los of als menu met friet en drank' },
  { id: 'pizza', name: 'Pizza', short: 'Pizza', line: 'Twaalf pizza’s, vlees halal' },
  { id: 'snacks', name: 'Snacks', short: 'Snacks', line: 'Hotwings, tenders, nuggets en friet' },
  { id: 'kids', name: 'Kindermenu', short: 'Kids', line: 'Met friet, saus en drank' },
  { id: 'desserts', name: 'Desserts', short: 'Zoet', line: 'Baklava, churros en meer' },
  { id: 'drinks', name: 'Dranken', short: 'Drinken', line: 'Fris, sap en energie' },
  { id: 'sauzen', name: 'Sauzen', short: 'Sauzen', line: 'Voor erbij' },
];

const SAUCE_CHOICES: Choice[] = [
  { id: 'geen', label: 'Geen saus' },
  { id: 'knoflook', label: 'Knoflooksaus' },
  { id: 'sambal', label: 'Sambal' },
  { id: 'samoerai', label: 'Samoeraisaus' },
  { id: 'cocktail', label: 'Cocktailsaus' },
  { id: 'andalouse', label: 'Andalouse' },
  { id: 'joppie', label: 'Joppiesaus' },
  { id: 'curry', label: 'Curry' },
  { id: 'sweetchili', label: 'Sweet Chili' },
  { id: 'mayo', label: 'Mayonaise' },
  { id: 'ketchup', label: 'Ketchup' },
];

const sauce = (label = 'Saus'): OptionGroup => ({ id: 'saus', label, pick: 'one', choices: SAUCE_CHOICES });

const SALAD: OptionGroup = {
  id: 'salade',
  label: 'Salade',
  pick: 'many',
  choices: [
    { id: 'zonder-salade', label: 'Zonder salade' },
    { id: 'zonder-tomaat', label: 'Zonder tomaat' },
    { id: 'zonder-komkommer', label: 'Zonder komkommer' },
    { id: 'zonder-ui', label: 'Zonder ui' },
    { id: 'zonder-sla', label: 'Zonder sla' },
  ],
};

/** "Speciaal gebakken ui, paprika en champignons + 1,50", from the menu board. */
const SPECIAL: OptionGroup = { id: 'extra', label: 'Extra', pick: 'many', choices: [{ id: 'gebakken', label: 'Speciaal gebakken ui, paprika en champignons', extra: 1.5 }] };

const SIZE = (big: number, labels: [string, string] = ['Klein', 'Groot']): OptionGroup => ({
  id: 'maat',
  label: 'Portie',
  pick: 'one',
  choices: [
    { id: 'klein', label: labels[0] },
    { id: 'groot', label: labels[1], extra: big },
  ],
});

const COUNT = (counts: number[], prices: number[]): OptionGroup => ({
  id: 'stuks',
  label: 'Aantal',
  pick: 'one',
  choices: counts.map((n, i) => ({ id: `${n}`, label: `${n} stuks`, extra: i ? +(prices[i] - prices[0]).toFixed(2) : undefined })),
});

const DRINK_CHOICES: Choice[] = [
  { id: 'cola', label: 'Cola' },
  { id: 'cola-zero', label: 'Cola Zero' },
  { id: 'fanta', label: 'Fanta' },
  { id: 'sprite', label: 'Sprite' },
  { id: 'ice-tea', label: 'Ice Tea Peach' },
  { id: 'spa-blauw', label: 'Spa Blauw' },
  { id: 'capri-sun', label: 'Capri-Sun' },
];

const MENU_DEAL: OptionGroup = {
  id: 'vorm',
  label: 'Los of menu',
  pick: 'one',
  choices: [
    { id: 'los', label: 'Los' },
    { id: 'menu', label: 'Menu met friet, saus en drank', extra: 5 },
  ],
};

const meat = (prices: Partial<Record<'doner' | 'kipdoner' | 'shoarma' | 'kipfilet' | 'kofte' | 'adana' | 'mix' | 'geen', number>>): OptionGroup => {
  const labels = { doner: 'Döner', kipdoner: 'Kipdöner', shoarma: 'Shoarma', kipfilet: 'Kipfilet', kofte: 'Köfte', adana: 'Adana', mix: 'Mix (döner/kipdöner)', geen: 'Geen vlees' };
  const entries = Object.entries(prices) as [keyof typeof labels, number][];
  const base = entries[0][1];
  return { id: 'vlees', label: 'Vlees', pick: 'one', choices: entries.map(([id, p]) => ({ id, label: labels[id], extra: p > base ? p - base : undefined })) };
};

const BREAD: Allergen[] = ['gluten', 'sesam'];

export const DISHES: Dish[] = [
  // ------------------------------------------------------------------------------------------------- grill
  { id: 'mix-grill', cat: 'grill', name: 'Mix Grill', tr: 'Karışık ızgara', desc: 'Adana, köfte, kippenvleugels, kipfilet şiş en pirzola.', price: 35, photo: 'mix-grill', tags: ['halal', 'delen', 'favoriet'], options: [SIZE(30, ['1 persoon', '2 personen']), sauce('Saus erbij')], station: 'grill', cook: 18, allergens: ['gluten', 'melk'] },
  { id: 'adana', cat: 'grill', name: 'Adana', tr: 'Adana kebap', desc: 'Pittig gekruid lamsgehakt aan de spies, van de houtskoolgrill.', price: 16, photo: 'adana', tags: ['halal', 'pittig'], options: [SIZE(4), sauce('Saus erbij')], station: 'grill', cook: 12, allergens: ['gluten'] },
  { id: 'kofte', cat: 'grill', name: 'Köfte', tr: 'Izgara köfte', desc: 'Gekruide gehaktballetjes van de grill.', price: 15, photo: 'kofte', tags: ['halal'], options: [SIZE(4), sauce('Saus erbij')], station: 'grill', cook: 11, allergens: ['gluten', 'ei'] },
  { id: 'kip-sis', cat: 'grill', name: 'Kipfilet şiş', tr: 'Tavuk şiş', desc: 'Gemarineerde kipfilet aan de spies.', price: 16, photo: 'kip-sis', tags: ['halal'], options: [SIZE(4), sauce('Saus erbij')], station: 'grill', cook: 12, allergens: ['melk'] },
  { id: 'kippenvleugels', cat: 'grill', name: 'Kippenvleugels', tr: 'Kanat', desc: 'Kippenvleugels van de houtskoolgrill.', price: 15, photo: 'kippenvleugels', tags: ['halal'], options: [SIZE(4), sauce('Saus erbij')], station: 'grill', cook: 14, allergens: [] },
  { id: 'pirzola', cat: 'grill', name: 'Pirzola', tr: 'Kuzu pirzola', desc: 'Lamskoteletten van de grill.', price: 20, photo: 'pirzola', tags: ['halal'], options: [SIZE(4), sauce('Saus erbij')], station: 'grill', cook: 13, allergens: [] },

  // ------------------------------------------------------------------------------------------------- döner & wraps
  { id: 'broodje', cat: 'doner', name: 'Broodje', tr: 'Ekmek arası', desc: 'Turks brood gevuld met vlees naar keuze en verse salade van sla, ui, tomaat en komkommer.', price: 7, photo: 'broodje-doner', tags: ['halal', 'favoriet'], options: [meat({ doner: 7, kipdoner: 7, shoarma: 8, kipfilet: 8, kofte: 10, mix: 7, geen: 7 }), sauce(), SALAD, SPECIAL], station: 'spit', cook: 4, allergens: BREAD },
  { id: 'durum', cat: 'doner', name: 'Dürüm', tr: 'Dürüm', desc: 'Zachte wrap gevuld met vlees naar keuze en verse salade van sla, ui, tomaat en komkommer.', price: 8, photo: 'durum', tags: ['halal', 'favoriet'], options: [meat({ doner: 8, kipdoner: 8, shoarma: 9, kipfilet: 9, adana: 11, mix: 8, geen: 8 }), sauce(), SALAD, SPECIAL], station: 'spit', cook: 4, allergens: ['gluten'] },
  { id: 'lahmacun', cat: 'doner', name: 'Lahmacun naturel', tr: 'Lahmacun', desc: 'Krokante lahmacun, rijkelijk gevuld met verse sla, ui, tomaat en komkommer.', price: 5, photo: 'lahmacun', tags: ['halal'], options: [SALAD], station: 'oven', cook: 5, allergens: ['gluten'] },
  { id: 'lahmacun-doner', cat: 'doner', name: 'Lahmacun met döner', tr: 'Dönerli lahmacun', desc: 'Krokante lahmacun gevuld met döner, verse sla, ui, tomaat en komkommer.', price: 9, photo: 'lahmacun', tags: ['halal'], options: [SALAD], station: 'oven', cook: 6, allergens: ['gluten'] },
  { id: 'lahmacun-kipdoner', cat: 'doner', name: 'Lahmacun met kipdöner', tr: 'Tavuk dönerli lahmacun', desc: 'Krokante lahmacun gevuld met kipdöner, verse sla, ui, tomaat en komkommer.', price: 9, photo: 'lahmacun', tags: ['halal'], options: [SALAD], station: 'oven', cook: 6, allergens: ['gluten'] },
  { id: 'pita-kaas', cat: 'doner', name: 'Pita kaas', desc: 'Pita met gesmolten kaas.', price: 3.99, photo: 'pita', tags: ['vega'], station: 'oven', cook: 4, allergens: ['gluten', 'melk'] },
  { id: 'pita-gezond', cat: 'doner', name: 'Pita gezond', desc: 'Pita met gesmolten kaas, sla, ui, tomaat en komkommer.', price: 4.99, photo: 'pita', tags: ['vega'], station: 'oven', cook: 4, allergens: ['gluten', 'melk'] },
  { id: 'pita-ananas', cat: 'doner', name: 'Pita kaas & ananas', desc: 'Pita met gesmolten kaas en ananas.', price: 4.99, photo: 'pita', tags: ['vega'], station: 'oven', cook: 4, allergens: ['gluten', 'melk'] },
  { id: 'pita-doner', cat: 'doner', name: 'Pita kaas & döner', desc: 'Pita met gesmolten kaas en döner.', price: 6.5, photo: 'pita', tags: ['halal'], station: 'spit', cook: 4, allergens: ['gluten', 'melk'] },
  { id: 'pita-kipdoner', cat: 'doner', name: 'Pita kaas & kipdöner', desc: 'Pita met gesmolten kaas en kipdöner.', price: 6.5, photo: 'pita', tags: ['halal'], station: 'spit', cook: 4, allergens: ['gluten', 'melk'] },

  // ------------------------------------------------------------------------------------------------- kapsalon & schotels
  { id: 'kapsalon', cat: 'kapsalon', name: 'Kapsalon', desc: 'Krokante friet met vlees naar keuze en gesmolten kaas. Verse salade met sla, ui, tomaat en komkommer en saus naar keuze.', price: 13, photo: 'kapsalon', tags: ['halal', 'favoriet'], options: [meat({ doner: 13, kipdoner: 13, shoarma: 14, kipfilet: 14, mix: 15 }), SIZE(3), sauce(), SALAD], station: 'spit', cook: 7, allergens: ['melk'] },
  { id: 'schotel', cat: 'kapsalon', name: 'Schotel', tr: 'Porsiyon', desc: 'Vlees naar keuze met friet en verse salade.', price: 13, photo: 'schotel', tags: ['halal'], options: [meat({ doner: 13, kipdoner: 13, shoarma: 14, kipfilet: 14, mix: 15 }), SIZE(3), sauce(), SALAD], station: 'spit', cook: 6, allergens: [] },

  // ------------------------------------------------------------------------------------------------- burgers
  { id: 'smash', cat: 'burgers', name: 'Smash Burger', desc: 'Dubbele smashed rundvleesburger op een zacht burgerbroodje met gesmolten cheddar, verse sla, augurk, gekaramelliseerde ui en burgersaus.', price: 9, photo: 'burger-smash', tags: ['halal', 'favoriet'], options: [MENU_DEAL, sauce('Saus bij de friet')], station: 'plancha', cook: 7, allergens: ['gluten', 'melk', 'ei', 'mosterd', 'sesam'] },
  { id: 'classic', cat: 'burgers', name: 'Classic Burger', desc: 'Sappige rundvleesburger op een zacht burgerbroodje met gesmolten cheddar, verse sla, augurk, gekaramelliseerde ui en burgersaus.', price: 8, photo: 'burger-classic', tags: ['halal'], options: [MENU_DEAL, sauce('Saus bij de friet')], station: 'plancha', cook: 7, allergens: ['gluten', 'melk', 'ei', 'mosterd', 'sesam'] },
  { id: 'chicken', cat: 'burgers', name: 'Chicken Burger', desc: 'Krokante kipburger op een zacht burgerbroodje met verse sla, tomaat, ui, augurk en burgersaus.', price: 10, photo: 'burger-chicken', tags: ['halal'], options: [MENU_DEAL, sauce('Saus bij de friet')], station: 'fryer', cook: 8, allergens: ['gluten', 'ei', 'mosterd', 'sesam'] },

  // ------------------------------------------------------------------------------------------------- pizza
  { id: 'pizza-margherita', cat: 'pizza', name: 'Pizza Margherita', desc: 'Pizza met tomatensaus, mozzarella en oregano.', price: 8, photo: 'pizza-margherita', tags: ['vega'], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk'] },
  { id: 'pizza-funghi', cat: 'pizza', name: 'Pizza Funghi', desc: 'Pizza met tomatensaus, mozzarella en champignons.', price: 9, photo: 'pizza-funghi', tags: ['vega'], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk'] },
  { id: 'pizza-vegetarisch', cat: 'pizza', name: 'Pizza Vegetarisch', desc: 'Pizza met tomatensaus, mozzarella, paprika, champignons, ui en olijven.', price: 11, photo: 'pizza-vegetarisch', tags: ['vega'], options: [sauce('Saus erbij')], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },
  { id: 'pizza-salami', cat: 'pizza', name: 'Pizza Salami', desc: 'Pizza met tomatensaus, mozzarella en halal salami.', price: 10, photo: 'pizza-salami', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk'] },
  { id: 'pizza-pepperoni', cat: 'pizza', name: 'Pizza Pepperoni', desc: 'Pizza met tomatensaus, mozzarella en halal pepperoni.', price: 10, photo: 'pizza-pepperoni', tags: ['halal', 'pittig'], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk'] },
  { id: 'pizza-tonno', cat: 'pizza', name: 'Pizza Tonno', desc: 'Pizza met tomatensaus, mozzarella, tonijn en ui.', price: 11, photo: 'pizza-tonno', tags: [], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk', 'vis'] },
  { id: 'pizza-hawaii', cat: 'pizza', name: 'Pizza Hawaii', desc: 'Pizza met tomatensaus, mozzarella, halal ham en ananas.', price: 11, photo: 'pizza-hawaii', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 8, allergens: ['gluten', 'melk'] },
  { id: 'pizza-doner', cat: 'pizza', name: 'Pizza Döner', desc: 'Pizza met tomatensaus, mozzarella en döner.', price: 12, photo: 'pizza-doner', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },
  { id: 'pizza-kipdoner', cat: 'pizza', name: 'Pizza Kipdöner', desc: 'Pizza met tomatensaus, mozzarella en kipdöner.', price: 12, photo: 'pizza-doner', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },
  { id: 'pizza-shoarma', cat: 'pizza', name: 'Pizza Shoarma', desc: 'Pizza met tomatensaus, mozzarella en shoarma.', price: 13, photo: 'pizza-doner', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },
  { id: 'pizza-kipfilet', cat: 'pizza', name: 'Pizza Kipfilet', desc: 'Pizza met tomatensaus, mozzarella en gekruide kipfilet.', price: 13, photo: 'pizza-doner', tags: ['halal'], options: [sauce('Saus erbij')], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },
  { id: 'pizza-sucuk', cat: 'pizza', name: 'Pizza Sucuk', desc: 'Pizza met tomatensaus, mozzarella en kruidige Turkse sucuk (halal).', price: 15, photo: 'pizza-sucuk', tags: ['halal', 'pittig', 'nieuw'], station: 'oven', cook: 9, allergens: ['gluten', 'melk'] },

  // ------------------------------------------------------------------------------------------------- snacks
  { id: 'hotwings', cat: 'snacks', name: 'Hotwings', desc: 'Krokante, gekruide kippenvleugels met een licht pittige smaak.', price: 6, photo: 'hotwings', tags: ['halal', 'pittig', 'delen'], options: [COUNT([6, 12, 20], [6, 11, 17])], station: 'fryer', cook: 8, allergens: ['gluten'] },
  { id: 'tenders', cat: 'snacks', name: 'Chicken Tenders', desc: 'Malse kipfilethaasjes in een krokant gekruid jasje.', price: 7, photo: 'chicken-tenders', tags: ['halal'], options: [COUNT([4, 8, 12], [7, 11, 14])], station: 'fryer', cook: 6, allergens: ['gluten', 'ei'] },
  { id: 'nuggets', cat: 'snacks', name: 'Kipnuggets', desc: 'Krokante kipnuggets met een zachte, malse kipvulling.', price: 3.5, photo: 'kipnuggets', tags: ['halal'], options: [COUNT([6, 12, 20], [3.5, 6.5, 10])], station: 'fryer', cook: 5, allergens: ['gluten'] },
  { id: 'frikandel', cat: 'snacks', name: 'Frikandel', desc: 'Krokant gebakken halal frikandel, lekker als snack of bij de friet.', price: 2.5, photo: 'frikandel', tags: ['halal'], station: 'fryer', cook: 4, allergens: ['gluten', 'selderij'] },
  { id: 'friet', cat: 'snacks', name: 'Friet', desc: 'Krokante friet.', price: 4, photo: 'friet', tags: ['vega'], options: [sauce()], station: 'fryer', cook: 4, allergens: [] },

  // ------------------------------------------------------------------------------------------------- kids
  { id: 'kids-frikandel', cat: 'kids', name: 'Kindermenu frikandel', desc: 'Friet, saus en drank inbegrepen.', price: 8.5, photo: 'kindermenu', tags: ['kids', 'halal'], options: [sauce(), { id: 'drank', label: 'Drankje', pick: 'one', choices: DRINK_CHOICES }], station: 'fryer', cook: 5, allergens: ['gluten', 'selderij'] },
  { id: 'kids-nuggets', cat: 'kids', name: 'Kindermenu kipnuggets 6 st', desc: 'Friet, saus en drank inbegrepen.', price: 8.5, photo: 'kindermenu', tags: ['kids', 'halal'], options: [sauce(), { id: 'drank', label: 'Drankje', pick: 'one', choices: DRINK_CHOICES }], station: 'fryer', cook: 5, allergens: ['gluten'] },
  { id: 'kids-tenders', cat: 'kids', name: 'Kindermenu chicken tenders 4 st', desc: 'Friet, saus en drank inbegrepen.', price: 9.5, photo: 'kindermenu', tags: ['kids', 'halal'], options: [sauce(), { id: 'drank', label: 'Drankje', pick: 'one', choices: DRINK_CHOICES }], station: 'fryer', cook: 6, allergens: ['gluten', 'ei'] },

  // ------------------------------------------------------------------------------------------------- desserts
  { id: 'baklava', cat: 'desserts', name: 'Baklava', tr: 'Fıstıklı baklava', desc: '4 stuks verse baklava met pistache.', price: 6, photo: 'baklava', tags: ['favoriet'], station: 'cold', cook: 1, allergens: ['gluten', 'noten', 'melk'] },
  { id: 'churros', cat: 'desserts', name: 'Churros', desc: '8 stuks churros met Nutella en poedersuiker.', price: 6, photo: 'churros', tags: ['vega', 'delen'], station: 'fryer', cook: 4, allergens: ['gluten', 'melk', 'noten'] },
  { id: 'poffertjes', cat: 'desserts', name: 'Poffertjes', desc: '12 stuks warme poffertjes.', price: 5.95, photo: 'poffertjes', tags: ['vega'], station: 'plancha', cook: 4, allergens: ['gluten', 'melk', 'ei'] },
  { id: 'cheesecake', cat: 'desserts', name: 'Cheesecake Red Velvet', desc: 'Rebellious Red Velvet.', price: 6, photo: 'cheesecake', tags: ['vega'], station: 'cold', cook: 1, allergens: ['gluten', 'melk', 'ei'] },
];

/** The drinks list as on the site; one photo for all of them. */
const DRINKS: [string, number][] = [
  ['Cola', 2.5], ['Cola Zero', 2.5], ['Fanta', 2.5], ['Fanta Cassis', 2.5], ['Dr Pepper', 2.5], ['Sprite', 2.5], ['Poms', 2.5],
  ['Hawaii', 2.5], ['Spa Blauw', 2], ['Spa Rood', 2], ['Ice Tea Green', 2.5], ['Ice Tea Peach', 2.5], ['Ice Tea Lemon', 2.5],
  ['Ice Tea Sparkling', 2.5], ['Fernandes Rood', 2.5], ['Fernandes Blauw', 2.5], ['Fernandes Geel', 2.5], ['Fernandes Groen', 2.5],
  ['Fernandes Oranje', 2.5], ['AA', 2.5], ['Red Bull', 3], ['Red Bull Sugar Free', 3], ['Fristi', 2.5], ['Chocomel', 2.5],
  ['Capri-Sun', 2], ['Appelsap', 2.5], ['Sinaasappelsap', 2.5],
];

const SAUCES: [string, number][] = [
  ['Knoflooksaus', 1], ['Sambal', 1], ['Cocktailsaus', 1], ['Andalouse', 1], ['Warme cheddarkaas', 1], ['Joppiesaus', 1],
  ['Sweet Chili', 1], ['Curry', 1], ['Mayonaise', 0.5], ['Ketchup', 0.5],
];

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

for (const [name, price] of DRINKS) {
  DISHES.push({ id: `drank-${slug(name)}`, cat: 'drinks', name, price, photo: 'frisdrank', tags: [], station: 'cold', cook: 0, allergens: name === 'Fristi' || name === 'Chocomel' ? ['melk'] : [] });
}
for (const [name, price] of SAUCES) {
  DISHES.push({ id: `saus-${slug(name)}`, cat: 'sauzen', name, price, photo: 'sauzen', tags: [], station: 'cold', cook: 0, allergens: /cheddar/i.test(name) ? ['melk'] : ['ei', 'mosterd'] });
}

const BY_ID = new Map(DISHES.map((d) => [d.id, d]));

export const dish = (id: string): Dish => {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown dish ${id}`);
  return found;
};

export const findDish = (id: string): Dish | undefined => BY_ID.get(id);

export const dishesIn = (cat: CategoryId) => DISHES.filter((d) => d.cat === cat);

/** Picked options: group id → choice ids. */
export type Picks = Record<string, string[]>;

export const defaultPicks = (d: Dish): Picks =>
  Object.fromEntries((d.options ?? []).filter((g) => g.pick === 'one').map((g) => [g.id, [g.choices[0].id]]));

export function unitPrice(d: Dish, picks: Picks = {}): number {
  let total = d.price;
  for (const g of d.options ?? []) {
    for (const id of picks[g.id] ?? []) total += g.choices.find((c) => c.id === id)?.extra ?? 0;
  }
  return Math.round(total * 100) / 100;
}

/** "Döner · Groot · Knoflooksaus": what was picked, without the defaults that say nothing. */
export function picksLabel(d: Dish, picks: Picks = {}): string {
  const out: string[] = [];
  for (const g of d.options ?? []) {
    for (const id of picks[g.id] ?? []) {
      const c = g.choices.find((x) => x.id === id);
      if (!c || c.id === 'geen' || c.id === 'los' || (g.id === 'maat' && c.id === 'klein')) continue;
      out.push(c.label);
    }
  }
  return out.join(' · ');
}

export type Line = { key: string; dish: string; picks: Picks; qty: number; /** Who at the table added it. */ by?: string };

export const lineKey = (dishId: string, picks: Picks) =>
  `${dishId}|${Object.keys(picks)
    .sort()
    .map((k) => `${k}:${[...picks[k]].sort().join('+')}`)
    .join(',')}`;

export const lineTotal = (l: Line) => unitPrice(dish(l.dish), l.picks) * l.qty;

export const linesTotal = (lines: Line[]) => Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;

/** The slowest station's time: what the kitchen needs for the whole order. */
export const cookTime = (lines: Line[]) => Math.max(4, ...lines.map((l) => dish(l.dish).cook + Math.max(0, l.qty - 1)));

export const ALLERGEN_NAMES: Record<Allergen, string> = {
  gluten: 'Gluten',
  melk: 'Melk',
  ei: 'Ei',
  sesam: 'Sesam',
  noten: 'Noten',
  vis: 'Vis',
  mosterd: 'Mosterd',
  selderij: 'Selderij',
  soja: 'Soja',
};

export const TAG_NAMES: Record<Tag, string> = {
  halal: 'Halal',
  pittig: 'Pittig',
  vega: 'Vegetarisch',
  kids: 'Kids',
  delen: 'Om te delen',
  favoriet: 'Favoriet',
  nieuw: 'Nieuw',
};

export const STATION_NAMES: Record<Station, string> = {
  grill: 'Houtskoolgrill',
  spit: 'Dönerspit',
  oven: 'Pizzaoven',
  plancha: 'Bakplaat',
  fryer: 'Friteuse',
  pass: 'Uitgifte',
  cold: 'Koeling',
};
