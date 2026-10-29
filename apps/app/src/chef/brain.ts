import { DISHES, dish, euro, kitchenLoad, promise, RESTAURANT, type Dish, type Order } from '@grill/shared';

import type { Diet } from '../state/demo';
import { fits } from '../menu-fit';

/**
 * Usta, the AI chef of the demo. It knows Grill-Point's whole menu (names, prices, what is in each dish, halal, spicy,
 * vegetarian, allergens), tonight's kitchen and the guest's diet, and answers in the guest's language. In this demo the
 * answers are worked out on the device from the menu; a live app would put a language model behind the same screen.
 */

export type Reply = { text: string; dishes?: string[]; chips?: string[] };

export type ChefContext = { diet: Diet; evening: Order[]; now: number; soldOut: Set<string> };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

const available = (ctx: ChefContext, list: Dish[]) => list.filter((d) => !ctx.soldOut.has(d.id) && fits(d, ctx.diet));

const pickIds = (ctx: ChefContext, ids: string[]) => available(ctx, ids.map((id) => dish(id))).map((d) => d.id);

/** What goes with a dish: a sauce, a side, or how to order it. Shown on every dish page. */
export function pairing(d: Dish): string {
  switch (d.id) {
    case 'kapsalon':
      return 'Neem hem met kipfilet en knoflooksaus: de favoriet van onze vaste gasten. Groot is genoeg voor twee kleine eters.';
    case 'mix-grill':
      return 'Voor twee personen komt Kerem hem aan tafel aansnijden. Lahmacun erbij als voorgerecht, knoflooksaus en sambal half-half.';
    case 'adana':
      return 'Adana is pittig gekruid. Een ayran zou passen, maar wij zeggen: een koude Fanta en een lahmacun naturel erbij.';
    case 'smash':
      return 'Dubbel geslagen, met krokante randjes. Neem hem als menu en kies Joppiesaus bij de friet.';
    case 'durum':
      return 'Kies döner of mix en zeg ja tegen de speciaal gebakken ui, paprika en champignons: € 1,50 extra en het verschil proef je.';
    case 'pizza-sucuk':
      return 'Sucuk is Turkse knoflookworst, licht pittig. Sambal erbij als je van vuur houdt.';
    case 'lahmacun':
    case 'lahmacun-doner':
    case 'lahmacun-kipdoner':
      return 'Knijp er citroen over, rol hem op met de salade en eet hem warm. Perfect als voorgerecht voor de grill.';
    case 'baklava':
      return 'Vier stukjes pistache-baklava: zoet genoeg om te delen na een Mix Grill.';
    default:
      break;
  }
  switch (d.cat) {
    case 'grill':
      return 'Van de houtskoolgrill: groot is een stevige maaltijd. Knoflooksaus of sambal erbij, of allebei.';
    case 'doner':
      return 'Knoflooksaus is de klassieker, sambal voor wie het pittig wil.';
    case 'pizza':
      return 'Een saus erbij voor de korst: knoflooksaus doet het altijd goed.';
    case 'burgers':
      return 'Als menu krijg je friet, saus en een drankje voor € 5 extra.';
    case 'snacks':
      return 'Lekker om te delen terwijl de grill bezig is.';
    case 'kids':
      return 'Met friet, saus en een drankje: alles voor een kleine eter.';
    case 'desserts':
      return 'Om af te sluiten, of om te delen.';
    default:
      return 'Past bij alles van het menu.';
  }
}

const EXPLAIN: [string[], string, string[]][] = [
  [['kapsalon'], 'Kapsalon is friet met vlees, gesmolten kaas, salade en saus in één bak. Bij ons kies je döner, kipdöner, shoarma, kipfilet of mix, klein of groot.', ['kapsalon']],
  [['adana'], 'Adana is gekruid lamsgehakt aan een platte spies, op houtskool gegrild. Pittig, sappig en rokerig.', ['adana', 'durum']],
  [['lahmacun'], 'Lahmacun is een dunne, krokante bodem met gekruid gehakt uit de oven. Je rolt hem op met salade en citroen.', ['lahmacun', 'lahmacun-doner']],
  [['sucuk', 'sujuk'], 'Sucuk is een Turkse knoflookworst, licht pittig en halal. Je vindt hem bij ons op de Pizza Sucuk.', ['pizza-sucuk']],
  [['pirzola'], 'Pirzola zijn lamskoteletten van de houtskoolgrill.', ['pirzola', 'mix-grill']],
  [['kofte', 'kofta'], 'Köfte zijn gekruide gehaktballetjes van de grill.', ['kofte']],
  [['durum', 'wrap'], 'Een dürüm is een zachte wrap gevuld met vlees en verse salade, opgerold.', ['durum']],
  [['sis', 'shish', 'şiş'], 'Kipfilet şiş is gemarineerde kipfilet aan de spies, van de houtskoolgrill.', ['kip-sis']],
];

/** The chef's answer to anything the guest asks. */
export function answer(question: string, ctx: ChefContext): Reply {
  const q = norm(question);
  const numbers = (q.match(/\d+([.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')));

  if (has(q, ['hallo', 'hoi', 'hey', 'hi ', 'hello', 'merhaba', 'selam', 'bonjour', 'hallo', 'ciao', 'salut', 'marhaba'])) {
    return { text: 'Hoi! Ik ben Usta, de AI-chef van Grill-Point. Vraag me wat je moet eten, wat iets is, of wat bij je dieet past.', chips: ['Wat raad je aan?', 'Iets pittigs', 'Vegetarisch', 'Met z’n vieren voor € 50'] };
  }

  for (const [words, text, dishes] of EXPLAIN) {
    if (has(q, words) && has(q, ['wat is', 'what is', 'nedir', 'qu’est', "qu'est", 'was ist', 'che cos', 'cosa', 'uitleg', 'explain', 'ما هو'])) return { text, dishes: pickIds(ctx, dishes) };
  }

  if (has(q, ['open', 'laat', 'hours', 'saat', 'acik', 'geopend', 'ouvert', 'geoffnet', 'aperto'])) {
    return { text: `We zijn elke dag open van 15:00 tot 00:00, aan de ${RESTAURANT.street} in Valkenswaard. Bestellen kan tot kort voor middernacht.` };
  }

  if (has(q, ['hoe lang', 'how long', 'bezorg', 'deliver', 'ne kadar', 'wachttijd', 'combien de temps', 'wie lange', 'quanto'])) {
    const p = promise(ctx.evening, ctx.now);
    const load = kitchenLoad(ctx.evening, ctx.now);
    return { text: `Op dit moment is het ${load > 0.66 ? 'druk' : load > 0.33 ? 'gezellig druk' : 'rustig'} in de keuken. Afhalen kan over ${p.ready} minuten, bezorgen duurt ongeveer ${p.door} minuten.` };
  }

  if (has(q, ['halal', 'helal'])) {
    return { text: 'Al ons vlees is halal, ook de salami, pepperoni, ham, frikandel en sucuk. Twijfel je over iets, vraag het aan de kassa.', dishes: pickIds(ctx, ['kapsalon', 'mix-grill', 'pizza-sucuk']) };
  }

  if (has(q, ['vega', 'vegetar', 'vejetaryen', 'zonder vlees', 'no meat', 'etsiz', 'sans viande', 'ohne fleisch', 'senza carne'])) {
    return { text: 'Zonder vlees raad ik de Pizza Vegetarisch aan, of een Margherita of Funghi. Pita gezond en friet zijn ook vegetarisch, en als toetje churros of poffertjes.', dishes: pickIds(ctx, ['pizza-vegetarisch', 'pizza-funghi', 'pita-gezond', 'churros']) };
  }

  if (has(q, ['pittig', 'spicy', 'aci', 'heet', 'hot', 'piquant', 'scharf', 'piccante', 'vuur'])) {
    return { text: 'Voor vuurliefhebbers: de Adana van de grill, Hotwings en de Pizza Sucuk. Sambal erbij als het nog heter mag.', dishes: pickIds(ctx, ['adana', 'hotwings', 'pizza-sucuk', 'pizza-pepperoni']), chips: ['Welke saus is het heetst?', 'Iets milds'] };
  }

  if (has(q, ['mild', 'niet pittig', 'not spicy', 'acisiz', 'doux', 'nicht scharf', 'non piccante'])) {
    return { text: 'Mild en lekker: kipfilet şiş, een kapsalon met kipfilet of een Classic Burger.', dishes: pickIds(ctx, ['kip-sis', 'kapsalon', 'classic']) };
  }

  if (has(q, ['kind', 'kids', 'child', 'cocuk', 'enfant', 'bambin'])) {
    return { text: 'Voor kinderen hebben we drie kindermenu’s met friet, saus en een drankje: frikandel, kipnuggets of chicken tenders.', dishes: pickIds(ctx, ['kids-nuggets', 'kids-tenders', 'kids-frikandel']) };
  }

  if (has(q, ['saus', 'sauce', 'sos', 'salsa'])) {
    return { text: 'Knoflooksaus is de klassieker bij döner en grill. Sambal is het heetst, Samoerai pittig en romig, Andalouse fris. Warme cheddarkaas is een aanrader bij de friet.', dishes: pickIds(ctx, ['saus-knoflooksaus', 'saus-sambal', 'saus-warme-cheddarkaas']) };
  }

  if (has(q, ['dessert', 'toetje', 'zoet', 'tatli', 'sweet', 'nagerecht', 'dolce', 'nachtisch'])) {
    return { text: 'Na de grill: baklava met pistache. Wil je iets warms, neem churros met Nutella of poffertjes.', dishes: pickIds(ctx, ['baklava', 'churros', 'poffertjes', 'cheesecake']) };
  }

  if (has(q, ['drink', 'drank', 'icecek', 'boisson', 'getrank', 'bevanda', 'fris'])) {
    return { text: 'We hebben fris, ijsthee, Fernandes, sappen en Red Bull. Bij pittig eten past een koude Fanta of Spa Rood.', dishes: pickIds(ctx, ['drank-fanta', 'drank-spa-rood', 'drank-fernandes-rood']) };
  }

  if (has(q, ['gluten', 'noten', 'nuts', 'fistik', 'lactose', 'melk', 'milk', 'sut', 'allerg', 'ei ', 'egg'])) {
    return { text: 'Stel je allergenen in onder Ik → Mijn dieet; dan laat ik alleen zien wat past. Elk gerecht toont ook een indicatie van de allergenen, maar vraag het in de keuken altijd na.', chips: ['Wat past bij mijn dieet?'] };
  }

  if (has(q, ['dieet', 'diet', 'past bij'])) {
    const ok = available(ctx, DISHES.filter((d) => d.cat !== 'drinks' && d.cat !== 'sauzen')).filter((d) => d.tags.includes('favoriet') || d.cat === 'grill');
    return { text: 'Dit past bij wat je in de app hebt ingesteld:', dishes: ok.slice(0, 4).map((d) => d.id) };
  }

  // Groups and budgets: "met z'n vieren voor 50 euro", "for 2 people", "3 kişi".
  const people = (() => {
    if (has(q, ['vieren', 'four', 'dort'])) return 4;
    if (has(q, ['drieen', 'three', 'uc kisi'])) return 3;
    if (has(q, ['tweeen', 'two', 'iki kisi', 'samen'])) return 2;
    const m = /(\d+)\s*(pers|people|kisi|man|gasten|personen|mensen)/.exec(q);
    return m ? Number(m[1]) : null;
  })();
  const budget = (() => {
    const m = /(?:€\s*|euro\s*)(\d+)|(\d+)\s*(?:euro|€|eur)/.exec(q);
    return m ? Number(m[1] ?? m[2]) : has(q, ['budget', 'goedkoop', 'cheap', 'ucuz']) ? numbers[0] ?? 10 : null;
  })();
  if (people || budget) {
    const n = people ?? 1;
    const plan: string[] = [];
    let total = 0;
    const take = (id: string) => {
      if (ctx.soldOut.has(id) || !fits(dish(id), ctx.diet)) return;
      plan.push(id);
      total += dish(id).price;
    };
    if (n >= 2) {
      take('mix-grill');
      if (n >= 3) take('kapsalon');
      if (n >= 4) take('pizza-sucuk');
      take('lahmacun');
      take('hotwings');
    } else if (budget && budget < 10) {
      take('broodje');
      take('drank-cola');
    } else {
      take('durum');
      take('friet');
      take('drank-fanta');
    }
    if (budget && total > budget) {
      while (plan.length > 1 && total > budget) total -= dish(plan.pop()!).price;
    }
    return {
      text: `Voor ${n === 1 ? 'jou alleen' : `${n} personen`}${budget ? ` met ${euro(budget)}` : ''} zou ik dit nemen, samen ${euro(total)}. Pas het aan in je mandje.`,
      dishes: plan,
      chips: ['Iets pittigs', 'Toetje erbij?'],
    };
  }

  if (has(q, ['chef', 'aan tafel', 'masa', 'table'])) {
    return { text: 'Zit je bij ons aan tafel? Scan de QR-code op de tafel en tik op "Chef aan tafel": Kerem komt langs, ook om de Mix Grill aan te snijden.', chips: ['Wat is een Mix Grill?'] };
  }

  if (has(q, ['populair', 'popular', 'meest', 'best', 'favoriet', 'populer', 'en cok', 'beliebt', 'popolare', 'aanrader', 'raad', 'recommend', 'oneri', 'ne yesem', 'honger', 'hungry', 'acim', 'faim', 'hunger', 'fame', 'wat moet', 'what should'])) {
    return {
      text: 'Onze gasten bestellen het vaakst de kapsalon met kipfilet en de smash burger. Heb je trek in de grill, neem dan een Adana of de Mix Grill om te delen.',
      dishes: pickIds(ctx, ['kapsalon', 'smash', 'adana', 'mix-grill']),
      chips: ['Wat is een kapsalon?', 'Iets pittigs', 'Met z’n tweeën voor € 40'],
    };
  }

  return {
    text: 'Goede vraag! Ik ken het hele menu van Grill-Point. Vraag me bijvoorbeeld wat je met z’n vieren voor € 50 kunt eten, wat er pittig is of wat een kapsalon is.',
    chips: ['Wat raad je aan?', 'Iets pittigs', 'Vegetarisch', 'Is het vlees halal?'],
  };
}

export const STARTERS = ['Wat raad je aan?', 'Met z’n vieren voor € 50', 'Iets pittigs', 'Is het vlees halal?', 'Wat is een kapsalon?', 'Welke saus past erbij?'];
