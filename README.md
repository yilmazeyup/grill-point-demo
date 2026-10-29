# Grill-Point — demo

A guest app and a kitchen screen for **Grill-Point**, the döner, grill and pizza restaurant at Willibrorduslaan 47 in
Valkenswaard. This is a demo with test data only: a fictional team, fictional guests, and no real orders or payments.

- Start page: `/` (the app in a phone and the kitchen screen side by side, sixteen features to click through)
- Guest app: `/app/`
- Kitchen screen: `/admin/` (`?at=2026-10-29T19:00` sets the kitchen clock)

## What's in it

**Guest app:** the whole menu with the restaurant's own names, descriptions, options and prices; delivery or pickup,
a tip of 10, 15 or 20 %, iDEAL | Wero or cash, and the savings programme, as on grill-point.nl. On top of that:

1. **Grill-Cam**: after ordering, the guest watches their own food being made, live from the camera above the station
   that is cooking it (see "Cameras" below). Where no camera hangs yet, a 3D kitchen stands in (döner spits, charcoal
   grill, plancha, pizza oven) with the guest's name over their item and their ticket on the rail; it browns as the
   minutes pass. The guest can switch between the camera and the 3D kitchen.
2. **AI chef Usta**: answers questions about the menu (what to eat with four people for € 50, what sucuk is, halal,
   spicy, allergens, sauces) in the guest's language, with dish cards that go straight into the basket.
3. **Chef at the table**: one tap and Kerem comes to the table, also to carve the Mix Grill; plus waiter, sauce, water
   and the bill. The call shows up on the kitchen screen and is answered from there.
4. **Ordering together at the table**: scan the QR code on the table (`/app/tafel?nr=4`), everyone orders from their own
   phone on one shared ticket, then sends it to the kitchen.
5. **The burger in 3D**, taken apart layer by layer with each ingredient named.
6. **"Vuur aan bij aankomst"**: for pickup, the kitchen puts the order on the grill only when the guest is close.
7. **The courier in 3D** riding through a block model of Valkenswaard to the guest's area.
8. **Booking a table in 3D**: pick your table inside behind the glass or on the terrace.
9. **Draai de spies**: a köfte skewer spins on the table and points at whoever pays.
10. **Deel je bord**: a 1080 × 1920 Instagram story made from the order, in Grill-Point's look (Grill-Point has a small
    Instagram; every guest who shares becomes its advertising), and a link to review on Google.
11. **Vuurpunten**: the savings programme as a flame that grows, with levels, rewards and the birthday gift.
12. **Vers van het vuur**: live kitchen moments (a fresh döner on the spit, lahmacun from the oven).
13. **Honest delivery times** from the tickets on the grill right now, and the quietest moment of the evening.
14. **My diet**: halal, vegetarian, not spicy, allergens; the menu and the AI chef follow it.
15. **Sold out, live**: one tap on the kitchen screen and the app shows it at once.
16. **Sunset look**: cream by day, charcoal and ember after sunset in Valkenswaard (computed for its latitude), with a
    circular wipe between the two; seven languages.

**Kitchen screen ("Het Vuur"):** the corner shop in 3D, cut open like a doll's house: the sign, the terrace with its
red chairs, the tables inside, the counter, the pizza oven, two döner spits, the charcoal grill, plancha and fryers, the
team at their stations, tickets over the station that is cooking them, beacons over tables that call, and the three
couriers riding off and back. One order board for every channel (the app, grill-point.nl, Thuisbezorgd, the phone,
the tables), the kitchen load and the times the app promises, tables and calls, couriers on a map, a menu manager with
sold-out switches, tonight's numbers, a prep list for tomorrow (a demo forecast) and a social studio. What the guest
does in the app shows up here at once, and the other way round.

## Cameras

Each station of the line can have a live camera: `grill`, `spit` (döner), `oven`, `plancha` and `pass`. The app shows a
station's feed to the guest whose order is cooking there, and the 3D kitchen where there is none. A feed is a link the
browser can play, over https (the site is https, so http feeds are blocked):

- an HLS stream (`.m3u8`), from a camera cloud or from a small gateway in the shop (go2rtc, MediaMTX) that turns the
  camera's RTSP stream into HLS; played with hls.js, or natively on iPhone;
- an MJPEG stream, which many IP cameras offer;
- a YouTube Live link (an unlisted stream works), shown muted without controls;
- a video file or any page made to be embedded.

Fill the links in `apps/app/public/cameras.json` (published as `/app/cameras.json`) to make them hold for every guest.
The kitchen screen's **Camera's** tab shows each station with a preview; a link typed there holds on that device only,
for trying it out. For the demo, the same tab can use the computer's or phone's own camera for one station: the app,
open in the same browser (side by side on the start page), receives it over WebRTC.

## Real and demo

Real (October 2026): the menu, descriptions, options and prices (grill-point.nl, with the board prices from the printed
menu on the restaurant's Instagram where the site gives only a starting price), the address, every day 15:00 to 00:00,
phone, e-mail, Instagram, the Google score (4.7 from 38 reviews), iDEAL | Wero or cash, tips of 10/15/20 %, and the
savings programme (welcome discount, points, VIP invitations, birthday gift). Demo: the team (Kerem, Mert, Ayla, Sevda,
Joep, Bilal, Mats), every guest and order, the points, levels and rewards, the AI chef's answers (worked out on the
device from the menu), the 3D kitchen and the block map of Valkenswaard. Dish photos are stock photos from Pexels
(`apps/app/assets/photos/CREDITS.md`); the storefront and the menu board are from Grill-Point's own Instagram
(`apps/app/assets/grillpoint/CREDITS.md`). Allergens per dish are an indication. There are no made-up reviews.

## Languages

Dutch is the default. The app, the kitchen screen and the start page also come in English, Türkçe, العربية (right to
left), Français, Deutsch and Italiano: Ik → Taal in the app, the header select in the kitchen screen and on the start
page, or `?lang=en|tr|ar|fr|de|it`. The choice is remembered on the device. The code writes Dutch; the dictionaries in
`packages/shared/src/i18n/` map that Dutch to each language, with `{placeholders}`. After changing text, run
`node scripts/i18n-extract.mjs` to list every Dutch text in `_i18n/source.json`.

## Structure

```
apps/app/          the guest app (Expo SDK 58, Expo Router), exported for the web; 3D in src/three (three.js)
apps/admin/        the kitchen screen (Vite, React, three.js)
packages/shared/   the restaurant's facts and menu, the team, the demo evening, the clock and sun, the app-to-screen link
site/              the start page
scripts/           build and serve the site as GitHub Pages does; photos.ts and the i18n extraction
```

The kitchen clock is Valkenswaard time while Grill-Point is open; at night and in the morning both screens replay the
evening rush (17:30–21:30) of the evening before. In the app's own orders a minute in the kitchen takes twenty seconds,
so an order goes from the grill to the door while you watch.

## Run

```bash
npm install
npm run web
```

The app opens on http://localhost:8096. The kitchen screen has its own install:

```bash
npm --prefix apps/admin install
npm run admin
```

It opens on http://localhost:5188. `npm run typecheck` checks both. `npm run site` builds the whole demo into `_site/`
and `npm run site:serve` serves it on http://localhost:8106/grill-point-demo/, where the app and the kitchen screen share
one origin and talk to each other live.
