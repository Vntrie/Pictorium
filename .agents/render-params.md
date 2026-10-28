# FlameForge - Render Parameters (Client â†” Server)

> **Source of truth.** This file is the canonical map of every visual render parameter
> in FlameForge. The client preview is a single `<img src={previewUrl}>` that loads
> `/api/poster/{type}/{id}` â€” the same endpoint used by Stremio. There is no
> duplication: preview = final poster. When this file and the code disagree on
> current behavior, **CODE WINS** â€” update this file. Vale solo per la
> descrizione fattuale del comportamento attuale rispetto a documentazione
> obsoleta: mai su requisiti utente, contratti pubblici o policy di sicurezza.

Quando modifichi un parametro di resa visiva, ispeziona l'implementazione
condivisa e i consumer interessati (URL client e lato server) e aggiorna solo
quelli toccati â€” mai edit speculari forzati su entrambi i lati per cambi
solo-server al renderer condiviso. Lo skill `poster-sync` guida il workflow.

## Livelli di design: Contenuto vs Chrome

Due livelli, mai mescolati:

- **Badge di Contenuto** (genere, ranking, extra): espressivi, stilabili dall'utente
  (`shadow`/`pill`/`bar`/`colored`/`bordo`/`vetro`/`minimal` in basso;
  `default`/`pill`/`colored`/`bordo`/`vetro`/`netflix` in alto).
- **Chrome di Sistema** (qualitÃ  streaming, network logo, rating separati/multi):
  marchi tecnici fissi in pill satinata (come Dolby/IMAX sul poster), mai stilabili.
  Restano coerenti per **griglia** (stessa linea top, stessi margini), non per materiale.

## Griglia superiore (top line ~27-28px, portrait @380Ã—570, scala 100%)

Le misure contano sui **box visibili**, mai sui bitmap (che includono il padding
ombra trasparente `TOP_SHADOW_PAD=14`):

- Network: bitmap == box, `top = netPadY(18) + SHIFT(10)` â†’ box a **28**.
- QualitÃ : bitmap `top = netBaseTop(18) - 10 + 5 = 13`, box a **27** (+14 pad).
- Ranking pill: bitmap `top = toy + pillTopGap(10)`, box a **24** (+14 pad).
- Ranking default: placca a filo, box a **0** (tab ancorato al bordo, pattern a sÃ©).
- Margini X a box: network `18` a sinistra, qualitÃ  `18` a destra (`netPadX`
  entrambi i lati, pad-aware in scala â€” niente numeri magici).
- Colonna separati: ancorata al **fondo box** qualitÃ  (pad inferiore sottratto
  in scala) + gap ottico **6px**; senza qualitÃ  parte da `netBaseTop - 10`.

## Badge Genere/Rating (GenreRatingBadges)

**Componenti configurabili** (`bg`/`by`/`br`): genere, anno e voto si attivano **indipendentemente**. Default tutti ON â†’ `Dramma â€¢ â˜… 8.2 â€¢ 2024` (la resa centra la riga in entrambi i renderer; non Ã¨ byte-identica al passato: il vecchio flusso con `dx` decentrava la riga di ~13-18px in Blink tagliando la prima lettera). Il badge si mostra se almeno un componente abilitato ha un valore disponibile (`hasGenreBadge = badgesEnabled && ((genre && bg) || (rating > 0 && br) || (year && by))`). Lato SVG i segmenti sono condizionali in `badge-svg-shared.ts:buildGenreTextFlow` â€” ogni segmento visibile ha il suo `<text>` ad ancora centrale posizionato dalle stime (niente `dx`/`dy`: Blink li include nella misura dell'ancoraggio mentre resvg li esclude e ignora `textLength` sui flussi multi-tspan, vedi sotto) e la stella Ã¨ un path posizionato, mai un glifo Noto in un tspan. La riga resta centrata in entrambi i renderer per costruzione. In landscape i badge si rendono con `pw = 500` (`badgePw` in `poster-service.ts`: stessi pixel assoluti del portrait); il badge superiore centrale (rank/extra, non nastro) Ã¨ al 120% (`topBadgePw`); posizioni, overflow-protection e chiavi cache restano sul canvas vero (`LAND_W/H`). Le barre genere in landscape non esistono (lo stile `bar` degrada a `shadow` come il ranking); la `bottom-bar` dei separati Ã¨ disattivata in landscape (normalizzata a `bottom-pills` DOPO cascata via `getSeparateRatingsStyleForShape`, raw salvati intatti) e le pills landscape sono ancorate a DESTRA con la geometria base del badge genere (`landscapeRightAnchorLeft`, extra 0 opticalShift 0: margine pieno senza +40 genere, niente `gox`/`goy`). Il logo in landscape Ã¨ contenuto a max 40% larghezza e 24% altezza (`LANDSCAPE_LOGO_*` in `logo-layout.ts`, stessi di `context.tsx` e `poster-fit-score.ts`) col fondo a ~10px dal bordo, in linea col badge genere (`LANDSCAPE_LOGO_BOTTOM_MARGIN_PCT`/`TOP_OFFSET`). Il gradiente di default in landscape Ã¨ 20% invece di 30% (solo quando non esplicitato).

| Parametro | Server (`svg-badge.ts:renderGenreBadge`) |
|---|---|
| Font size | `finalFs = 28.6 * pw / 380` (base; pill/colored NON ridimensionano il font, solo la cornice) |
| Gap genereâ†’bullet | `round(fs / 3)` |
| Gap stellaâ†’voto | `round(fs / 6)` |
| Padding orizzontale | `genreBadgeSafePad(finalFontSize) = round(finalFontSize * 1.15)` dentro SVG; scatola genere pill/colored `padX = round(fs * 0.55)` (`GENRE_PILL_PAD_X_FACTOR`, solo cornice â€” font invariato); altri container `round(fs * 0.75)` (`BADGE_BOX_PAD_X_FACTOR`) |
| Larghezza bullet | `bulletW = round(finalFontSize * 0.35)` |
| Larghezza stella | `starW = round(finalFontSize * 0.92)` |
| Altezza badge | `svgH = badgeBoxHeight(fs) = fs + round(fs * 0.40) * 2` (~`1.8 * fs` unificato per tutti i container); scatola genere pill/colored `fs + round(fs * 0.30) * 2` (`GENRE_PILL_PAD_Y_FACTOR`, solo cornice) |
| Colori testo | `#e5e7eb` |
| Text shadow | `"0 4px 6px rgba(0,0,0,0.5)"` |
| Overflow protection | `totalW + safePad*2 > min(pw - 20, round(pw * 0.84))`, usa `genreBadgeDims()`. Per pill usa `genrePillMaxW(pw)` su `textContentW + padX*2 + safePad*2` (`padX = round(fs * 0.55)`, nessuna ombra esterna; loop max 3 iterazioni con margine 4px) |
| Misura testo | `estimateTextWidth()` per-glyph in `badge-svg-shared.ts`; ogni segmento Ã¨ un `<text>` a tspan singola vincolato con il proprio `textLength` + `lengthAdjust="spacingAndGlyphs"` (onorato sia in Blink che in resvg, a differenza del vecchio `textLength` sull'intera riga multi-tspan che resvg ignorava) |
| Allineamento verticale | Un `<text>` per segmento con `text-anchor="middle"` sulla sua stima (niente `dx` di separazione, niente `adjustedX`), stessa `y` e `dominant-baseline="central"` per tutti; stella come path SVG posizionato (stesso ingombro del glifo â˜…) |
| Font badge (`bfont`) | `fontFamilyFor(testo, font)` in `badge-svg-shared.ts`: "inter" â†’ Inter, "barlow-condensed" â†’ Barlow Condensed, "oswald" â†’ Oswald; ebraico/arabo â†’ sempre Rubik (nessuno dei tre ha quei glifi). `estimateTextWidth(testo, fs, font)` scala la stima Inter di 0.73 (Barlow) / 0.80 (Oswald), rapporti misurati con resvg su 10 stringhe Ã— pesi 600/700/900; nessuna scala sul testo Rubik. La â˜… del voto Ã¨ sempre un path SVG 5 punte (`starPath`, stessa tinta oro o `starFill`) in uno slot dedicato posizionato dalle stime (coi font non-Inter evita anche il fallback resvg che duplicava il glifo precedente e allargava ~+40% quando una tspan â˜… Noto seguiva contenuto non-Inter nello stesso `<text>`). |
| Chiavi cache | `badgeFont` entra in tutte le chiavi badge (`genre`/`rank`/`quality`/`comingsoon`/`separate`); `bfont` Ã¨ in `POSTER_CACHE_ALLOWLIST` e fail-closed in `normalizePosterCacheParams` (invalido = assente = Inter). |
| Stili badge (`badgeStyle`) | `shadow` â€” textShadow; `minimal` â€” separatore pipe `|` + textShadow discreto (1px); `pill` â€” gradiente satinato `satinPillStops(bottomLight)` + stroke adattivo 1.5px (`bottomLight ? black 0.12 : white 0.22`, come quality/bar) + testo ad alto contrasto (`bottomLight ? 0.95 white : 0.88 black`) + ombra 3D singola + padding simmetrico 14; `bar` â€” gradiente satinato `satinPillStops(bottomLight)` full-width (polaritÃ  del fondo) + bordo profilo 1.5px adattivo + testo ad alto contrasto (`bottomLight ? 0.95 white : 0.88 black`), nessuna ombra esterna; `colored` â€” bg tinta di scena same-hue (bottom per genere, top per ranking; `ac=` vince) normalizzata ad automatic lightness fissa HSL 5/12 (100/240 dialogo Windows: hue/saturazione intatte, solo L; `ac=` manuale byte-identico, blur/tinta naturali invariati) + testo adattivo (pill piatta, niente satinatura); `bordo` â€” rect arrotondato con bordo 2px + stroke calibrato + bg protettivo (`bottomLight ? white 0.55 : black 0.32`: milky su fondi chiari, smoky su fondi scuri) + testo adattivo (`bottomLight ? dark : #e5e7eb`, come vetro); `vetro` â€” vetro liquido iOS (gradiente multi-stop + bordo 1.5px, stesso box model e dimensioni identiche al bordo: padding e rect coincidenti; sheen superiore invariato, centro protettivo `light ? white 0.55 : black 0.22` con base `light ? white 0.38 : black 0.45`) + testo adattivo come bordo |
| Sfondo pill/bar | bar (`buildGenreBarSvg`) = gradiente satinato `satinPillStops(bottomLight)` full-width + bordo profilo 1.5px adattivo + ombra 3D singola (code tagliate = bordo poster, invisibili); pill genere = gradiente satinato `satinPillStops(bottomLight)` (polaritÃ  del fondo, non del top) + ombra 3D singola + padding simmetrico 14 (colored inclusa: tinta piatta + ombra); pill ranking/extra = `satinPillStops(topLight)` |
| Posizione Y unificata | Box model normalizzato: zero salti di baseline tra stili (`genreStyleShiftY` rimosso); altezza uniforme `badgeBoxHeight(fs)`; la riga multi-rating segue sopra il badge |
| Testo pill/bar | bar = ad alto contrasto `bottomLight ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)"` (su fondi chiari la barra diventa grafite scura, come la pill); pill genere/ranking/extra = ad alto contrasto (`bottomLight`/`topLight ? 0.95 white : 0.88 black`, come quality); nastro Netflix e riga multi-rating restano `0.80` (hanno textShadow dedicato); pill colored resta tinta piatta + `textColorForBg` (preferenza visiva bianco mentre il contrasto effettivo resta â‰¥2:1, non soglia WCAG â€” es. `#E67E22` bianco 2.9 vs nero 5.9 â†’ bianco; fondi troppo chiari/gialli restano neri) |
| Stella voto | gradiente oro verticale `#FCD34D â†’ #F59E0B` (`linearGradient#starg`) sul `tspan` stella; bullet `â€¢` a opacitÃ  0.45 (solo ingombro visivo, metriche invariate); stile `colored` su accent caldo (`isWarmGoldAccent`: hue 20-70, sat > 0.35): stella piatta in colore testo (l'oro annegherebbe) |
| Bordo bar | profilo 1.5px adattivo (`bottomLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"`), come quality-badge; la vecchia `line` 1px `rgba(0,0,0,0.10)` Ã¨ rimossa |
| Box Model Unificato | Altezza scatola `badgeBoxHeight(fs) = fs + round(fs * 0.40) * 2` (`1.8 * fs`), padding X `round(fs * 0.75)`, ombra uniforme `badgeShadowBox(h)` (`blur = max(round(h * 0.20), 4), off = max(round(h * 0.10), 2)`) condiviso da tutti i badge centrati |

## Accento automatico adattivo (genere/rank/extra `colored`)

L'accento AUTOMATICO estratto (tinta di scena same-hue) si adatta alla banda
locale del badge invece di restare alla lightness fissa 5/12: hue/saturazione
intatti, L in [0.24, 0.60] (`solveAdaptiveAccent` in `accent-color.ts`), testo
renderer 4.5:1 prima prioritÃ  (`textColorForBg`), separazione fondo 3:1 seconda;
se 4.5 Ã¨ irraggiungibile nei bound, vince il best-contrast documentato
(`feasibleText=false`, nessuna garanzia pretesa). Genere = banda bottom,
rank/extra = banda top. Approssimazione a DUE BANDE, mai pixel-exact per badge:
media striscia 8% sul canvas effettivo (portrait `STD_WxSTD_H`, landscape
`LAND_WxLAND_H` â€” il service campiona il buffer giÃ  fittato dalla route) +
velo nero analitico (top: alpha `0.75Â·topShade/100`, nullo con `tsh=0`; bottom: `blurDarkness`
solo a blur attivo) misurato in luminanza WCAG lineare sui canali velati, non
sulla media Rec.709 non-lineare. Vignetta/pre-release/scrim laterali non
modellati (stima conservativa); offset espliciti possono portare il badge fuori
banda (vale l'anchor-nearest). `ac=` manuale resta byte-identico (bypass);
fallback genere/grigio senza estrazione e tinta senza banda restano alla
normalizzazione legacy 5/12 byte-identica (tutto `GENRE_FALLBACK`, Comedy
inclusa); palette fisse provider-glass/neutral mai adattive; Fresh/Card hanno
aspetto fisso (solo un extra `colored` automatico riusato dentro Fresh/Card si
adatta via path condiviso). Il picker auto in UI (`BadgeControls`) mostra la
shade EFFETTIVA dipinta (header `X-FlameForge-Accent` della stessa risposta
immagine caricata via XHR blob da `usePosterPreview`, hook
`useEffectiveAccent`, display-only: mai dentro `isManualAccent`/`ac=`/mapping;
la base legacy `autoAccentColor` da `useRootColors` resta solo identitÃ 
canonica per il confronto manuale): nessuna fetch JSON dedicata nel flusso
normale, nessuna dipendenza da finestre TTL (`?accentmeta=1` resta solo
diagnostica read-only, mai necessaria al picker; record vecchi senza header =
unknown onesto): default picker = banda bottom/genere (la
card del picker), top/rank solo quando Ã¨ l'unico a dipingere, con entrambe le
zone etichettate (`ui.accentAutoTop/Bottom`, anche se uguali) e provenienza
`manual` etichettata senza riscrivere il canonico; stili che non dipingono /
loading / unknown = caption onesta (`ui.accentAutoNone/Detecting/Unavailable`,
picker disabilitato su placeholder) con percorso manuale sempre disponibile
(`ui.chooseManualColor`, scrive il canonico solo su scelta esplicita).
Sotto il picker la caption `ui.accentAutoHint` lo chiarisce. Blur sempre sulla
tinta naturale, mai sull'adattato. CPU bound: max 2 crop cachati
(`poster-extract` 24h) + max 2x~38 valutazioni solver, nessun fetch/decode in piÃ¹.
Estrazione e bande solo per gli stili che dipingono l'accento (genere `colored`,
top `colored`/`corner`/extra-`number`/`default` con accentFill; `follow-rank`
segue il fallback `rs` del renderer): gli altri stili e le bande manuali `ac=`
non decodificano nulla e tengono il valore legacy stabile in chiave cache.

## Badge Ranking/Extra

| Parametro | Server (`svg-badge.ts:renderRankingBadge/renderExtraBadge`) |
|---|---|
| Font size base | `30 * pw / 380` (rank), `Ã—0.9` per extra; nastro Netflix a base `24 * 1.15 * 1.10` (+10% rispetto al default precedente) |
| Dicitura nastro | I nastri di classifica mostrano `TOP`, numero e sottotitolo periodo (`ribbonLabel`: "Oggi" localizzato, per film/serie come per anime; override custom esplicito vince sulle rank-key); altezza `w Ã— 1.65`, testi centrati (`TOP` a `0.30h` senza sub, `0.20h` con sub, numero a `0.60h`). Senza `ribbonLabel` il sottotitolo resta nascosto. |
| Padding X | `px = round(finalFontSize * 0.75)` (unificato con genre badges) |
| Altezza scatola | `boxH = badgeBoxHeight(fs) = fs + round(fs * 0.40) * 2` (unificato con genre badges) |
| Border radius | `r = round(finalFontSize * 0.45)` per default (`RANKING_DEFAULT_RADIUS_FACTOR`: squadrata ma non a spigolo), `boxH / 2` per pill (lo stile `bar` del ranking Ã¨ rimosso: `?rs=bar` degrada a default) |
| Ombra | `default`/extra-default: ombra 3D singola stile nastro (`dx=3, dy=3, blur 3.5, 0.65`, solo contenitore) + padding `TOP_SHADOW_PAD=14` su lati/basso (in alto la placca resta a filo, altrimenti sembra staccata); `pill` ranking-extra: stesso filtro ma padding simmetrico 14 anche sopra (`boxH + 28`, `oy = PAD`) perchÃ© la pill Ã¨ staccata di `pillTopGap` dal top â€” prima l'ombra superiore era tagliata; `badgeShadowBox` resta per stime overflow â€” `blur = max(round(boxH * 0.20), 4)`, `off = max(round(boxH * 0.10), 2)` dove ancora usato |
| Sfondo | `default`/extra-default/`pill` â€” gradiente satinato `satinPillStops(topLight)` + bordo sagomato polarizzato 1.5px (`topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"`) + ombra 3D singola sul contenitore, canvas = box + padding ombra (`totalW + 28 Ã— boxH + 14`, filo in alto; `pill` invece `boxH + 28`, simmetrico); `netflix` â€” nastro satinato con stroke polarizzato come quality (`topLight ? black 0.12 : white 0.22`) e ombra 3D propria, testo `0.80` (ha textShadow dedicato); `colored` â€” tinta accent piatta + `textColorForBg` (lo stile `bar` del ranking Ã¨ rimosso) |
| Testo | `topLight ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)"` (default/pill, come badge qualitÃ ); `colored` = `textColorForBg` (preferenza visiva bianco se contrasto effettivo â‰¥2:1, non soglia WCAG; non Ã¨ una pretesa di contrasto massimo â€” su fondi chiari vince il nero); `vetro`/`bordo` traslucidi: adattivo inverso (`topLight ? dark : #e5e7eb`, come qualitÃ /netflix ma sul vetro) |
| Stabilizzazione testo | `textLength` + `lengthAdjust="spacingAndGlyphs"` sul `<text>` per evitare differenze metriche tra Windows/local e Linux/HF |
| Overflow protection | Stessa formula con `pw - 20`, fattori `3.55` (ranking, include shadow) e `3.2` (extra); extra compatti cappati al 65% di `pw` (solo label oltre il cap si rimpiccioliscono) |
| Posizione | Composito a `top: 0, left: round((pw - w) / 2)` (default/pill/colored); `corner` a `left: netPadX + tox`, `top: pillTopGap + toy` (alto-sx, rank ed extra: stesso anchor, il logo network in collisione impila sotto via `stackNetworkBelowCornerRank`); nastro Netflix a `left: 0` (Nuvio) o `left: STD_W - w` specchiato (Stremio, `side=right`); logo network segue a destra del nastro (`w + 10`) o a sinistra (`STD_W - w - 10 - logoW`) |
| Scala badge superiore (`topBadgeScale` classifica, `extraBadgeScale` extra-dopo-fallback) | Resize bitmap dopo il render (tutti gli stili; la **barra genere** scala nativa via font per restare full-width), prima di `fitBadgeToCanvas`; `%` 10..200, default 100; entra nella `rankBadgeKey` (valore effettivo per kind) |
| Geometria staccata (`isDetached`) | Solo stili centrati (default/extra; il nastro resta ancorato) con `toy !== 0`: tutti e 4 gli angoli raccordati (`rx = r`) invece del tetto dritto; stesso box di render; entra nella `rankBadgeKey` come `detached` (bitmap diverso) |
| Offset badge superiore (`topBadgeOffsetX/Y` classifica, `extraBadgeOffsetX/Y` extra-dopo-fallback) | Solo stili centrati: `left = center + tox`, `top = 0 + toy` (px, default 0) + `pillTopGap` per la pill (`+10` fisso dal bordo alto); il nastro resta ancorato; la matematica overlap usa `finalRankTop + h` |
| Posizione badge qualitÃ  | Angolo in alto a destra, margini a box: box destro a `netPadX` dal bordo (`left = CW - netPadX - boxW - pad`, pad in scala), `top = padY - 10 + 5` (bitmap; box a +14 pad); con nastro Netflix a destra (Stremio) va a **sinistra** con box sinistro a `netPadX` (`left = netPadX - pad`) per non restargli accanto, impilato sotto il logo network se occupa il top-left (`top = netBottom + gap`, senza shift) |
| Sfondo badge qualitÃ  | Gradiente satinato traslucido a polaritÃ  pill (`satinPillStops(topLight)`); altezza unificata `badgeBoxHeight(fs)`; bordo `topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"` 1.5px; ombra 3D singola + padding simmetrico 14; testo invariato (`topLight ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)"`) + crenatura `letter-spacing="0.06em"` (marchio tecnico; `textLength` pinnato su stima+tracking); font base `17 * pw / 380` (era `14`). Tag tier `standard` (`buildQualityTierBadgeSvg` in `badge-svg-shared.ts` via `renderQualityTierBadge`, SOLO qualitÃ  â€” la pill etÃ  resta sulla pill neutra storica byte-identica): padding X `1.0 Ã— fs` (piÃ¹ largo, era `0.75 Ã— fs`) e raggio contenuto `0.32 Ã— boxH` (meno tondo, era mezza altezza); stessa altezza/satinatura/bordo/ombra/testo/crenatura della neutra (ancoraggi, scale e offset invariati; niente clipping: scatola solo allargata). Tutti i tier condividono la scatola; `mono`/`color` (asset icona) e `knockout` invariati. Marchi formato A/V (`renderQualityIconBadge`, unico set per tutti gli stili): glifi nudi senza contenitore â€” `hdr`/`hdr10-plus` senza cornice, viewBox ritagliata all'inchiostro + padding ottico uniforme (frazione d'inchiostro verticale ~0.74 come i singoli Dolby, misurata via resvg); `dv`/`atmos` (giÃ  nudi, ~0.74) invariati; etichetta generica `HDR` preservata (mai `HDR10`); `combo` (lockup due righe storico) e `imax` (pinnato dal test raw-coords) invariati. PrioritÃ  solo-render: se l'effettivo include sia `hdr` che `hdr10plus`, il gruppo disegna solo HDR10+ (dopo la selezione utente/default/mapping â€” DB, provenance, raw salvati e chiavi cache invariati; `hdr`-solo invariato). Stile `knockout` (`qbs`, SOLO qualitÃ  â€” l'etÃ  `knockout` usa il builder dedicato SOLO etÃ  `buildAgeKnockoutSvg`, mai questo; come `mono`/`color` in preview esplicito e Stremio solo-non-standard): targhetta bianca opaca con glifi ritagliati via mask (stesso box esterno della pill, `rx = 0.30 * boxH`, niente stroke/gradiente; glifi mask a `~1.35x fs` con `textLength` pinnato sulla stima oversize e margini anti-clipping); con Dolby (verificato `localSpec`, combo `dv+atmos` o singolo) e altri formati impilati sotto il tier in colonna verticale come gli altri stili (Dolby resta bianco anche su top chiari); senza Dolby resta il tier knockout (mai fallback a standard) |

## Badge contenuto: vera storia / libro / prossimo episodio / soli N episodi

Quattro badge automatici opt-out via bucket `sash` (nessun nuovo parametro
URL, nessun nuovo contratto): riusano i fetch esistenti
(`next_episode_to_air`/`number_of_episodes` dai details, keyword dal fetch
keyword giÃ  usato per i sottogeneri) e il renderer unico esistente.
Selezione manuale dagli stessi meccanismi (dropdown `BadgeControls` =
`getAllBadgeOptions`, override custom salvato vince sempre).

| Badge | Regola server (`poster-badge.ts`) | PrioritÃ  |
|---|---|---|
| `badge.trueStory` ("Based on a true story") | `getTrueStoryLabel`: match ESATTO su keyword TMDB normalizzata (lowercase+trim) in {`based on true story`, `based on a true story`} â€” mai sottostringhe nÃ© testo del titolo; film e serie | Extra, dopo il sottogenere e prima del libro (ordine deterministico documentato, sotto novitÃ /rank/premi) |
| `badge.basedOnBook` ("Based on a book") | `getBasedOnBookLabel`: match esatto in {`based on novel or book`, `based on novel`, `based on book`, `based on young adult novel`} â€” `based on comic book` resta fuori; film e serie; con storia vera valgono entrambe, auto = storia vera | Extra, dopo la storia vera (stesso bucket, mai sopra) |
| `badge.nextEpisode` ("Nuovo episodio Â· {data}") | `getNextEpisodeLabel`: SOLO serie TV, `air_date` futura di 1..14 giorni DI CALENDARIO (diff UTC DST-safe, oggi/passato/>14/assente/invalido esclusi; film mai); data formattata come l'upcoming (`df`/locale) | Bucket `new`, subito dopo la nuova stagione e sopra i premi (stesso ordine del fork); MAI congelato nel mapping (`resolveSavedBadgeExtra` lo esclude come upcoming/nuova stagione) + TTL effimero 120s quando mostrato, cosÃ¬ la data non resta stantia oltre la messa in onda |
| `badge.onlyEpisodes` ("Solo {n} episodi") | `getFewEpisodesLabel`: SOLO tipo miniserie (`isMiniseriesType`, mai una serie ordinaria breve) con conteggio intero noto 1..8; fuori bound = Miniserie semplice invariata | Arricchisce la Miniserie in coda all'extra (stesso slot, non un nuovo bucket); congelabile come la Miniserie (formato permanente) |

Liste keyword e idee riusate dal fork kesemb2/FlameForge-HE al commit
pinnato documentato in NOTICE (solo `s_truestory`/`s_book`, `fewEpisodes`,
`getNextEpisodeLabel` + inserimento dopo la nuova stagione; niente rotazione
giornaliera nÃ© altre tag del fork). Finestra calendario DST-safe,
chiavi i18n 18 lingue, lifetime effimero e wiring editor sono integrazione
originale.

## Pill Network Logo

| Parametro | Server (`network-svgs.ts:loadNetworkPng` & `poster-service.ts`) |
|---|---|
| Sfondo | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Bordo | `topLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.20)"` stroke-width 1px |
| Padding | `px = round(fs * 0.65)`, `pt = pb = round(fs * 0.32)` dove `fs = round(max(18 * pw / 380, 12))` |
| Raggio | `r = round(pillH * 0.35)` (squircle, identico al badge qualitÃ ) |
| Posizione | default in alto a sinistra (`top = round(18 * STD_H / 570) + 10`, `left = round(18 * STD_W / 380)`, resta a sinistra anche con `side="right"`); centrato sopra il logo film (`top = logoTop - h - gap + 10`) con logo film + badge alto (nastro Netflix, badge centrale rank/extra, o Coming Soon); senza logo film e con nastro: a fianco del nastro (`w + 10`). Vista Stremio: specchia a destra con angolo destro occupato (nastro rank / Coming Soon). Solo landscape col logo film: mai sopra il logo (zona bassa) â€” sempre in alto (a fianco del nastro se occupa l'angolo sinistro, sotto il Coming Soon, altrimenti top-left con shrink vs badge centrale). ECCEZIONE stile `corner` (rank o extra) col logo film: di default sopra il logo titolo come in portrait (`cornerNetworkAboveTitle` in `poster-service.ts`: `logoTop - h - gap - NETWORK_LOGO_SHIFT_Y`, centrato sul box del logo titolo in tutti i layout â€” centrato, Cinematic Left e titoli spostati; gap visivo = `gap`, scale/offset `netscale`/`nox`/`noy` invariati, dopo shrink ricalcolato sulle dimensioni finali); senza spazio sopra il titolo o con collisione irrisolta alla shrink minima â†’ top-left storico; `netPos=top` esplicito e gli altri stili restano invariati, Coming Soon/nastri invariati. Se si sovrappone al badge centrale, rimpicciolisce fino a 0.55x |
| Scala (`netscale`) | Resize bitmap dopo il fetch, prima del fit; `%` 10..200, default 100 |
| Offset (`nox`/`noy`) | `top += noy`, `left += nox` (px, default 0) dopo il posizionamento automatico |
| Logo interno | `topLight ? rgba(255,255,255,0.85) : rgba(18,18,22,0.88)` (eccetto Marvel a colori brand) |
| Ombra | Nessuna ombra esterna (pill piatta, contrasto garantito dallo sfondo della pill) |

## Riga multi-rating (Custom Rating Provider)

Solo quando il provider Ã¨ abilitato server-side (`FLAMEFORGE_CUSTOM_RATING_*`) ed esistono item: a provider OFF nessun pixel cambia (snapshot fermi, niente bump di `RENDER_VERSION`).

| Parametro | Server (`multi-rating-renderer.ts:renderMultiRatings`) |
|---|---|
| Font size | `20` fissa (non scala con `pw`) |
| Pill | `h = 38`, `rx = 19`, padding X totale `28`, gap `8` |
| Cap display | `MAX_CUSTOM_RATINGS = 5` (i dati restano completi, la riga mostra le prime 5) |
| Colori | convenzione ranking-badge: `topLight ? rgba(0,0,0,0.80) : rgba(255,255,255,0.80)` bg; testo `topLight ? rgba(255,255,255,0.80) : rgba(0,0,0,0.80)` |
| Testo | `fontFamilyFor(label)` per-pill (ebraico/arabo â†’ Rubik) + `textLength`/`lengthAdjust="spacingAndGlyphs"` come gli altri badge; `dominant-baseline="central"`, nome troncato a 80 char, `escSvg` |
| Font embedded | Nessun `@font-face` negli SVG: i font si risolvono dal fontdb resvg via `FONT_FILES` (`fonts.ts`: Inter 400/700/900 + Noto Symbols + Rubik 400/700/900) |
| Fit | `w = min(maxWidth, width)` con `maxWidth = STD_W - 40`, `h` in scala proporzionale |
| Posizione | centrata, `top = legacyTop - h - 10` sopra il badge genere (o `STD_H - 20` senza badge) â€” `poster-service.ts` |

## Colonna rating separati (Separate Ratings)

Opt-in (`sep=1`, default OFF): sostituisce la media â˜… nel badge con una colonna a destra di pill verticali (logo provider sopra, punteggio sotto). A OFF zero pixel cambiano.

| Parametro | Server (`separate-rating-renderer.ts:renderSeparateRatingStack` + `poster-service.ts`) |
|---|---|
| Font size | `round(max(14 * pw / 380, 11))` (piÃ¹ piccolo del quality-badge: pill compatte moderne) |
| Scala rating separati (`separateBadgeScale` / `sepscale`) | Nativa via font: `fs = round(base * scala / 100)` (a 100 percorso identico allo storico â€” esplicito 100 resta byte-identico); padding/gap/loghi derivano da `fs` â†’ tutto scala proporzionalmente; `%` 10..200, default unico 130 per `column`/`bottom-bar`/`bottom-pills` (`getSeparateBadgeDefaultScale`; esplicito query/mapping/token/default, incluso 100, vince sempre); entra nella `separate` badge key; in `compactTuning` omessa e coperta da `dv`. UI solo relativa (`separateBadgeScaleToUI`/`uiToSeparateBadgeScale` in `badge-styles.ts`: raw 130 â†” 100, range 8..154, raw persistiti mai migrati) |
| Stack | UN solo bitmap: pill verticali `logoH = round(fs * 0.95)`, `h = pt + logoH + gap + fs + pt` (`px = round(fs*0.6)`, `pt = max(2, round(fs*0.22))`, `gap = max(2, round(fs*0.18))`), gap stack `SEPARATE_STACK_GAP = 5`; larghezza uniforme `colW = max(contenuti) + px*2` (colonna dritta); `rx = round(maxH * 0.32)` condiviso; contenimento sopra il badge genere (o dentro il canvas senza genere): shrink proporzionale SOLO sull'overflow reale, misurato sul placement finale voluto (`stackTop + sepOY`, clamp dentro il canvas) contro il bordo genere con gap 6px â€” mai per conteggio (gruppi 1-5 che entrano restano byte-identici), a qualsiasi scala, mai enlarge |
| Cap display | max 5 (`pickSeparateRatings` in `ratings.ts`: ordine selezione `rsrc`, skip miss/0; vuoto â†’ fallback media) |
| Formati | decimale 1 cifra (`7.3`); famiglia percent (`tomatoes`, `popcorntime`) come `88%` (`formatSeparateValue`) |
| Colori | convenzione quality-badge: `topLight ? dark pill : light pill`, bordo 1.5px adattivo, ombra dedicata ridotta (`seps`: dx=2, dy=2, blur 2, 0.55 â€” la 3D standard sbordava nel gap 5px sembrando squadrata) |
| Loghi | `public/rating/*.svg` a colori brand originali (mai ricolorati), embed `<image data:...>` come le pill network; asset mancante â†’ pill skippata (mai 500) |
| Posizione | bordo destro allineato al badge qualitÃ  (`right = qualityRight`), `top = qualityBoxBottom + 6` + 5 portrait (`PORTRAIT_SEPARATE_SHIFT_Y`, solo formato poster; pad inferiore sottratto in scala, gap ottico 6px); senza qualitÃ  parte dal top (`netBaseTop - 10` + 5 portrait, "sale"); con nastro a destra segue a sinistra (stesso branch `isRightRibbonCorner`); in landscape segue il badge qualitÃ  come in portrait senza +5 |
| Offset gruppo (`separateBadgeOffsetX/Y` / `sepox`/`sepoy`) | intero gruppo (colonna o riga, mai singoli provider): `left += ox`, `top += oy` (positivo Y = giÃ¹, come gli altri offset) con clamp dentro il canvas; `bottom-bar` portrait full-width: X ignorata esplicitamente (solo Y); in landscape la barra Ã¨ pills (X attiva); catena `query > mapping effettivo per formato > config token > defaults effettivi > 0`, clamp `Â±2000`, step 5 in presets; bitmap badge invariati (solo placement, chiavi `separate` invariate; chiave poster/`dv` li includono). UI: slider X/Y in Trasforma per-titolo/default/Orizzontale (stesso range/bounds degli altri offset); X disabilitata con hint in `bottom-bar` portrait |
| PrioritÃ  | mai col custom provider: se la riga custom Ã¨ renderizzata, lo stack si nasconde |
| Sostituzione | con stack attivo (`useSeparate`) il badge genere nasconde il segmento â˜… (`badgeRating` effettivo = false) |
| Stile layout (`separateRatingsStyle` / `sepstyle`) | enum `column` (default storico), `bottom-bar` (solo portrait), `bottom-pills`, `bottom-mono` (icone tonde + voti monocolore, senza contenitore), `bottom-color` (icone tonde brand + voti, senza contenitore); catena query > mapping effettivo per formato > config token > defaults effettivi > `column` (garbage â†’ `column`); landscape: solo `bottom-bar` â†’ `bottom-pills` DOPO cascata (`getSeparateRatingsStyleForShape` in `badge-styles.ts`, riusato da config/service/preview/UI â€” raw salvati intatti, portrait invariato; `bottom-mono`/`bottom-color` passano invariati in entrambi i formati); emesso esplicito solo quando bottom negli URL Stremio (come `bs`/`rs`, mai in `dv`), sempre esplicito in preview (`column` incluso, WYSIWYG); in allowlist cache key + hardening enum |
| Bottom attivo | `badgesEnabled && badgeRating && sep && stile bottom` (centralizzato in `resolveSeparateDisplayState`, INDIPENDENTE dai valori: con voti assenti nasconde comunque genere+anno+voto, senza inventare valori); la soppressione Ã¨ EFFETTIVA solo a render â€” `bg`/`by`/`br` salvati non mutati (tornando a `column` si ripristinano); in bottom la riga custom provider Ã¨ esclusa (`suppressCustomRow`, mai duplicata; il custom conserva la prioritÃ  storica sulla colonna, invariata). UI: selettore `sepstyle` (Colonna/Barra/Pill/Monocolore/Icone colorate) visibile con rating separati ON â€” in landscape la Barra Ã¨ disabilitata (visibile, mai selezionata, hint `ui.separateRatingsBarLandscapeHint`; selezione mostrata sullo stile normalizzato via `getSeparateRatingsStyleForShape`) e il raw salvato resta (in portrait torna); in bottom i toggle genere/anno sono disabilitati (visivo + aria, callback inattiva) ma i valori restano conservati â€” stesso comportamento nei default globali. Lo stile Ã¨ condiviso tra formati in UI (niente selettore Orizzontale dedicato), ma un eventuale override `landscape` giÃ  salvato nei dati si rispetta in load/save (mapping effettivo, profilo preservato, stash cambio formato) |
| Riga bottom (`renderSeparateRatingsBottom` + `poster-service.ts`) | UN solo bitmap: logo provider + valore inline (logo a sinistra, valore a destra, `textLength` stabilizzato); `bottom-bar` = fascia satinata adattiva `satinPillStops(bottomLight)` full-width a filo in basso (SOLO portrait â€” in landscape normalizzata a pills a monte, mai renderizzata); `bottom-pills` = 1-5 pill adattive `rx = h/2` con bordo 1.5px + ombra `seps`, in portrait riga centrata con margine `round(20 * CH / 570)` dal bordo + 5 Y portrait solo pills (`PORTRAIT_SEPARATE_SHIFT_Y`; bar full-width a filo esclusa: il +5 sarebbe annullato dal clamp), in landscape ancorate a DESTRA con la geometria base genere (`landscapeRightAnchorLeft` extra 0 opticalShift 0: margine pieno `18*CW/380` senza il +40 ottico del genere, base landscape âˆ’20 X / âˆ’10 Y via `LANDSCAPE_BOTTOM_PILLS_SHIFT_*`, slider `sepox`/`sepoy` neutri 0 e additivi dopo); `bottom-mono`/`bottom-color` = icone tonde + voto senza pillola/barra nÃ© contenitore (stessa geometria pills: centrata in portrait, destra in landscape con stessa base âˆ’20 X / âˆ’10 Y, stessi slider e collisioni logo; `loadRoundRatingLogo` in `separate-rating-renderer.ts`: piastra tonda, mono = grigio `208` su fondo scuro / `32` su chiaro con voto monocolore â€” bianchi oltre 230 preservati come controforme â€” color = piastra brand originale (`imdb` gialla `#f6c700` senza rettangolo, `tomatoes` natural senza piastra, resto `#032541`) + voto chiaro su scuro); materiale/testo/bordo seguono `bottomLight` come il badge genere (fondo chiaro â†’ pill scura + testo chiaro, fondo scuro â†’ pill chiara + testo scuro) â€” loghi brand invariati; reservation logo titolo = geometria colonna equivalente (`logoBadgeVisibility`, solo reservation); base font `round(max(15 * pw / 380, 11))` (`23` per i bare, `15` per bar/pills), scala % 10..200 nativa come la colonna; fit sul font (loop max 4 fino a `max(8, 55% base)` con rebuild coerente) + shrink bitmap proporzionale di sicurezza â€” mai clipping; vuota â†’ null (mai placeholder) |
| Cache | chiave stack `badge:separate:<src+val,...>:<CW>:<topLight>` (un composite); chiave bottom `badge:separate-bottom:<stile>:<src+val,...>:<CW>:<bottomLight>:<scala>:<w>` (il segmento `<stile>` distingue anche `bottom-mono`/`bottom-color`: mai collisioni tra stili); flag `sep` nella cache key poster; valori sep nell'etag dei poster dinamici |

## Gradiente fondo poster

| Parametro | Server (`badges.ts:bottomGradientSVG`) |
|---|---|
| Altezza | `gh = max(round(ph * pct / 100), 100)` |
| Colore | `color` + `opacity` |
| Direzione | `y1 = dir === "up" ? "0" : "1"`, `y2 = dir === "up" ? "1" : "0"` |
| Posizione | `top = dir === "up" ? ph - gh : 0` |
| Fade | `0% trasp â†’ svgFadeEnd% trasp â†’ svgSolidPct% opaco â†’ 100% opaco` |
| Posizione badge genere | `badgeY = ph - h - round(20 * ph / 570)` |

> **Preset sfumatura (Naturale/Colore/Nero + 3 custom, solo client):** scorciatoie in
> `TransformControls.tsx` (per-titolo) e `SettingsPanel.tsx` (default globali)
> che scrivono i 5 slider esistenti (`gradHeight`/`blur`/`bf`/`bd`/`tint`) â€”
> nessun nuovo parametro URL, nessuna chiave cache. Riga condivisa
> `GradientPresetRow.tsx` (3 built-in + fino a 3 personali = 6 totali). Logica in
> `src/lib/gradient-presets.ts` (`GRADIENT_PRESET_COLOR`,
> `NATURAL_GRADIENT_DEFAULTS`, `adjustGradientForPosterChange`,
> `defaultHeightForPoster`/`defaultFadeForPoster`, store custom con
> `sanitizeCustomPresets`/`addCustomGradientPreset`/`deleteCustomGradientPreset`
> in localStorage per namespace). I custom fotografano gli slider correnti e non
> viaggiano mai al server. Il cambio artwork ricalibra
> altezza/fade solo da stato pristine (preset e tweak manuali sopravvivono);
> i default personalizzati restano assoluti (niente auto-calibrazione per tipo
> poster clean vs non-clean).
>
> **Sfumatura per formato (Verticale/Orizzontale):** i flat sono il profilo
> portrait. Il profilo landscape vive in due posti: `landscapeBlur` per-titolo
> (`PosterEditorContext`, init da `mapping.landscape` > default globali
> Orizzontale > default di formato) e `ServerDefaults.landscape` per i default
> globali (tab Impostazioni Â· Trasforma con sotto-tab Verticale/Orizzontale:
> sfumatura completa â€” altezza/intensitÃ /fade/darkness/tinta/ombra â€” + logo
> (scala null = auto-fit, offset null = 0) + scale/offset badge + stili/toggle
> per-titolo del profilo `landscape` (badge, classifica, qualitÃ /formati/etÃ ,
> network â€” vedi "Badge per-titolo per formato" sotto); restano condivisi solo
> i controlli global-only (sash/qualitÃ -minima/lato-nastro, senza campo
> per-titolo). Risoluzione server:
> query > mapping(.landscape) > config > defaults(.landscape) > default di
> formato (`effectiveDefaultsForShape` in `server-defaults.ts`, usato da
> `poster-config` e `stremio-poster-url`). L'editor segue gli stessi fallback:
> all'ingresso in landscape senza stash/profilo salvato gli slider badge
> partono dai default Orizzontale (`EditView`), all'apertura con default
> Orizzontale idem (`context`), e i cambi ai default a poster aperto si
> propagano live (solo senza mapping salvato, mai freeze involontario).
> La preview in landscape usa il profilo, il save per-titolo lo scrive in
> `mapping.landscape` (solo se toccato o save in landscape, mai freeze
> involontario al save portrait). Lo stash al cambio formato non copre le
> chiavi sfumatura. La sezione Trasforma per-titolo Ã¨ singola e segue il
> formato in editing (stessa riga preset condivisa).
>
> **Badge per formato (Verticale/Orizzontale):** unico selettore `editTargetShape`
> (`SettingsPanel`, `data-testid="format-target-selector"`, prima dei controlli
> nelle tab visive, stato condiviso Badge/Trasforma): sceglie solo il target di
> modifica â€” anteprima e default Badge seguono il formato in modifica, il formato
> di consegna (`defaultPosterShape`, Stremio) non cambia mai; fonti dati, regione,
> formato data e API restano condivisi. La tab Badge lega i campi via
> `useShapeBadgeDefaults` (`BadgeDefaultsSection`, `BADGE_VISUAL_LAND_KEYS`):
> portrait = flat condivisi, landscape = profilo `landscape` (`land ?? flat`,
> `null` = eredita â€” tranne scala/offset logo dove `null` resta auto/zero da
> contratto storico). Il profilo server `landscape` (`server-defaults.ts`,
> `effectiveDefaultsForShape`) copre anche gli stili (`badgeStyle`,
> `rankingBadgeStyle`, `extraBadgeStyle`, `badgeFont`, `qualityBadgeStyle`,
> `videoFormats`), i toggle (`globalBadges`/`rankingBadges`/`badgeGenre`/
> `badgeYear`/`badgeRating`/`badgeQuality`/`customRatings`/`separateRatings`/
> `networkLogo`/`networkLogoPosition`/`preRelease`/`ribbonSide`/`ribbonEnabled`),
> `sashOrder` e `minQuality`; restano sempre condivisi fonti voto, fonte Top 20,
> regione, formato data, API/cataloghi, fit logo e rotazioni. Risoluzione server:
> query > mapping(.landscape) > config token > defaults(.landscape) > default di
> formato. `xbs` Ã¨ solo-extra: assente ovunque = legacy `rs` (numeri/nastri
> degradano a pill angolo/piastra come oggi, mai migrazione in lettura), invalido
> = assente, il rank usa sempre `rs`. `RankingAppearanceSelector` (default e
> per-titolo): Nastro = `netflix`+ribbon, Numero = `number`+ribbon, Badge =
> `pill`+ribbon; le varianti `colored`/`standard` spengono il nastro (col nastro
> il renderer mostrerebbe il nastro, non il badge), `default` legacy Ã¨ pura
> lettura (`resolveRankingAppearance`/`resolveRankVariant`, mai scritture). La
> riga posizione (Sinistra/Destra) vive solo nei default: nel per-titolo
> (`BadgeControls`) Ã¨ omessa â€” un'anteprima non persistibile al save. Card
> default: Classifica (master `topBadge` + bucket rank chirurgico su `sashOrder`
> + singola appearance, mai secondo switch nastro), Info (genere/anno + stile
> extra indipendente + categorie + Coming Soon), Valutazioni
> (fonti/separati/custom), QualitÃ  (tier/formati/icone/network), Avanzate
> (prioritÃ  `sashOrder`, reset del solo profilo).
>
> **Badge per-titolo per formato (Verticale/Orizzontale):** gli stessi stili e
> toggle dei default vivono anche nel profilo per-titolo `mapping.landscape`
> (`LandscapeSettings`: `showBadges`/`rankingBadges`/`badgeGenre`/`badgeYear`/
> `badgeRating`/`badgeQuality`/`ageBadge`/`ageCountry`/`ageBadgeStyle`/
> `customRatings`/`separateRatings` + `badgeStyle`/
> `rankingBadgeStyle`/`extraBadgeStyle`/`badgeFont`/`qualityBadgeStyle`/
> `videoFormats` + `networkLogo`/`networkLogoPosition`/`ribbonEnabled` +
> `customBadge`/`accentColor` (piÃ¹ i campi ritirati inerti
> `badgePresetId`/`badgePresetRev`, mai resi); chiavi
> assenti = eredita il flat, mai migrazione in lettura â€” con semantica
> explicit-null-shadows per i quattro visuali un tempo condivisi: chiave
> PRESENTE nel profilo (inclusa `null`, per customBadge anche `""`) vince sul
> flat per la forma landscape (`null`/`""` nel profilo = la forma landscape
> rende automatico, mai resurrect del flat). Solo i manuali persistono
> per l'accento (auto mai congelato). Risoluzione
> server identica ai default: query > mapping effettivo per formato
> (`effectiveMappingForShape` in `types.ts`, riusato da `poster-config`,
> route pre-gate e `stremio-poster-url`) > config token > defaults effettivi
> per forma > default di formato; `xbs` segue le stesse regole own-rank dei
> default (`follow-rank` ombreggia il flat, legacy `null`/assente eredita).
> Restano condivisi per-titolo: fonti voto (`ratingSources`,
> intenzionalmente condiviso per disegno server), metadati/base/rotazioni; e i
> global-only senza campo
> per-titolo (sash/qualitÃ -minima/lato-nastro) seguono i default effettivi
> per forma. L'etÃ  Ã¨ per-titolo dal mapping effettivo (`ageBadge`/`ageCountry`/
> `ageBadgeStyle`, flat + profilo `landscape`, stessa regola degli altri
> toggle/stili: assente/null = eredita, `false` esplicito vince sul default
> ON). Editor: stato unico per formato in editing con stash al cambio
> (`EditView`, come il tuning) e init dal mapping effettivo (`context`); il
> save scrive il flat in portrait (preservando il profilo + backfill dei
> pre-edit cambiati via `snapshotMissingMappingLandscape`) e il profilo in
> landscape (preservando il flat verbatim; accent solo-manuale; campi Lab
> ritirati preservati verbatim, mai resi); "salva solo poster" azzera le custom come
> prima. Nessun nuovo parametro URL/chiave cache (`extra`/`ac`
> esistenti veicolano i valori effettivi di forma).
>
> **Boundary di salvataggio (l'indipendenza Ã¨ reale solo se il save preserva
> l'altro formato â€” il POST `/api/mappings` Ã¨ full-replace, la risoluzione
> per-formato da sola non basta).** Regole (`usePosterSave`, puri in
> `visual-presets.ts`): save landscape = flat portrait preservato VERBATIM
> dal salvato (concreto resta, `null` resta `null`, assente resta assente â€”
> mai il live landscape; mapping nuovo = assente/eredita, mai clone del
> landscape); save portrait = backfill nel profilo del PRE-EDIT effettivo
> per le sole chiavi che l'edit muove (profilo sparse altrimenti): flat
> concreto = verbatim, flat inherit-`null`/assente = chain-effective
> (`mappingShapeChainEffective`: profilo default Orizzontale > default flat >
> factory storica fail-closed â€” mai il live editato, mai guess ciechi sotto
> default non-canonici; senza provenance resta il fallback legacy
> factory/skip, mai il live). Entrambi i formati editati prima di un singolo
> save = stash dell'altro formato (`otherShapeStash`: il
> portrait vince per i flat nel save landscape, il landscape vince per il
> profilo nel save portrait; tutte le 24 chiavi per-titolo â€” tuning/logo/sfumatura
> sulle regole esistenti). Lo stash dell'altro formato Ã¨ condiviso per-titolo
> in `PosterEditorContext` (vedi `src/lib/shape-draft.ts`: un solo owner alla
> volta, chiave `userId:media_type:id` â€” un nuovo titolo, anche non salvato ma
> con identitÃ  reale, non legge mai lo stash del precedente; key mismatch =
> null): EditView vi specchia lo stash allo switch di formato e lo dichiara
> sul titolo aperto; il Save manuale passa il proprio stash esplicito (vince),
> TUTTI gli altri full-save (`saveConfig` senza stash esplicito e gli autosave
> di esclusione poster/backdrop via `useSharedShapeStash`) risolvono lo shared
> sullo stesso boundary â€” mai caduta al mapping salvato per lo staged. Il
> cover-only non viaggia mai sullo stash (clear intenzionale, contratto
> invariato). Stash verbatim (false/0/[]/`follow-rank` preservati, mai
> filtrati); la provenance logo-scale del ripristino allo switch resta locale
> in EditView (il save consuma i draft verbatim come il path esplicito).
> Resta condiviso per disegno server solo `ratingSources` (fonti voto, senza
> chiave profilo). Azzeramento portrait (accento automatico esplicito):
> l'apertura ripristina il manuale salvato nel live e lo stash portrait
> dichiara la chiave PRESENTE (`null` = auto esplicito, mai inherit
> intoccato), quindi il save landscape azzera il flat (drop = auto, stesso
> contratto del save portrait dove `undefined` = drop = auto); senza visita
> portrait (chiave assente) il save landscape preserva il salvato verbatim.
> Il ricalcolo auto (`useRootColors`) riempie solo il canale auto e non
> clobbera mai un manuale esplicito (ripristinato all'apertura o dallo stash
> al cambio formato). L'accento automatico esplicito in landscape si scrive
> `null` di profilo (ombreggia il flat, mai resurrect).
>
> **Nastro Standard vs Colorato (U1):** stessa geometria nastro Netflix
> (`buildNetflixRankBadgeSVG`); Standard (`rs=netflix`) = satinato
> `satinPillStops(topLight)` + testo `0.80`, Colorato (`rs=colored`+ribbon) =
> tinta accent piatta + `textColorForBg` (stesso criterio dei badge colored).
> Legacy `netflix-color`/`default`+ribbon leggono Standard senza migrare il
> valore salvato (`resolveRibbonVariant`/`ribbonVariantValue`, mai scritture);
> `colored` come Badge spegne il nastro (`rankVariantValue`), come Nastro lo
> accende. Stesso accent â†’ PNG diversi tra Standard e Colorato.
>
> **Preview contestuale default (U2):** `previewFamily` (`auto`/`rank`/`info`/`extra`/â€¦)
> + `previewExtra` (campione `__badge.*` risolto server-side) viaggiano solo
> nella preview default (`buildDefaultsPreviewUrl`, stesso endpoint poster,
> nessun renderer duplicato) e non si salvano mai. `auto` rende la prioritÃ 
> effettiva salvata per forma (`sash`, `rank` incluso quando abilitato);
> `rank` restringe a `rank` (vuoto se rank spento, mai fallback info);
> `info` forza il primo campione info abilitato con `xbs` proprio (niente
> campione a categorie spente); `extra` (solo dalla card stile extra) forza il
> campione `extra` quando il bucket Ã¨ consentito, altrimenti il primo info
> abilitato â€” mai un fantasma a categorie spente. `genre` (stile genere/font)
> forza un campione preview-only con `layout=standard`: Fresh/Card hanno
> aspetto fisso e nascondono il badge genere per contratto renderer (mai
> restyle), cosÃ¬ `bs`/`bfont` restano visibili senza toccare lo staged/salvato.
> Le card segnalano la family su focus/pointer
> (mai hover, nessun move focus); Auto ripristina sash effettivo e rimuove
> `extra` forzato. `rank`/`auto` mostrano sempre il layout configurato
> (Fresh incluso); il ritorno a `rank`/`auto` ripristina Fresh.

## Parametri URL (query string)

| Parametro | Inviato da client (`context.tsx`) | Letto da server (`route.ts`) |
|---|---|---|
| `badges` | `globalBadges ? null : "0"` | `qBadges !== "0"` â€” master del SOLO gruppo basso genere/rating (`hasGenreBadge`, custom/separate rows, etÃ ): `badges=0` NON spegne la placca superiore (rank/extra restano se `ranking=1`, per disegno utente) |
| `ranking` | `rankingBadges ? null : "0"` | `qRanking !== "0"` â€” master della SOLA placca superiore (rank/extra, sash inclusa): `ranking=0` la spegne sempre, anche con `badges=1`; `badges=0` non la tocca |
| `bg` | `badgeGenre === false ? "0" : null` | `qBg !== null ? qBg !== "0"` â€” nasconde il GENERE nel badge genere/rating |
| `by` | `badgeYear === false ? "0" : null` | `qBy !== null ? qBy !== "0"` â€” nasconde l'ANNO nel badge genere/rating |
| `br` | `badgeRating === false ? "0" : null` | `qBr !== null ? qBr !== "0"` â€” nasconde il VOTO nel badge genere/rating |
| `cr` | sempre esplicito in preview (`cr=0/1`, WYSIWYG); solo-OFF in pattern/Stremio | `qCr` â€” display riga rating custom: `query > mapping.customRatings > config > defaults > true`, AND con env `FLAMEFORGE_CUSTOM_RATING_ENABLED` |
| `rsrc` | `ratingSources` per-titolo (preview); per-titolo salvato o default globale (Stremio) | fonti voto medio â˜…: `query > mapping.ratingSources > config token > server defaults (RATING_SOURCES) > imdb+tmdb` â€” parser unico `resolveRatingSources` (whitelist `SUPPORTED_RATING_SOURCES`). La selezione guida anche il routing provider (`requestedSources` in `ratings.ts`): imdb-only/imdb+tmdb = Cinemeta primario + fallback MDBList; tmdb-only con voto diretto genuino = zero upstream; simkl/anilist/kitsu da soli = solo direct provider (mai MDBList, MAL resta MDBList); il voto TMDB diretto genuino vince su MDBList anche sulle cache hit |
| `sep` | `separateRatings` per-titolo (preview, sempre esplicito `sep=0/1`); solo-ON in pattern/Stremio | colonna separati: `query > mapping.separateRatings > config token > server defaults (FLAMEFORGE_SEPARATE_RATINGS) > false`, AND con portrait + `badgeRating` + â‰¥1 valore (altrimenti fallback media) |
| `sepscale` | scala colonna separati per-titolo (preview sempre esplicita, default 130); solo valore in pattern/Stremio non-compact (in compact coperta da `dv`) | scala `%` 10..200 (default unico 130 per tutti gli stili): `query > mapping(.landscape) > config token > server defaults(.landscape, `FLAMEFORGE_SEPARATE_BADGE_SCALE`) > 130` |
| `sepstyle` | layout separati per-titolo (preview sempre esplicita, default `column`); solo valore bottom in pattern/Stremio non-compact (mai in `dv`: enum a bassa cardinalitÃ  come `bs`/`rs`, resta esplicita anche in compact) | layout `column`/`bottom-bar`/`bottom-pills`/`bottom-mono`/`bottom-color` (default `column` = resa storica): `query > mapping(.landscape) > config token > server defaults(.landscape) > column` (nessuna env dedicata); query presente ma invalida/vuota â†’ `column` esplicito, mai eredita mapping (chiave cache distinta dall'assenza); `bottom-bar` + landscape â†’ `bottom-pills` DOPO cascata (raw intatti) |
| `gradHeight` | `gradientHeight` | `qGradHeight` â€” alimenta l'altezza del gradiente/sfocatura (blurHeight): query > mapping > config token > server defaults > default di formato (30 portrait, 20 landscape; mapping non-clean senza valore congelato: 20). Post-selezione solo Stremio unmapped: se il poster finale ha testo incorporato, i default globali non vincono sul profilo non-clean (20/80, come il client) |
| `bf` | `blurFade` (slider editor 0..100 + double-click reset 50, 70 in landscape) | punto di attacco transizione 0..100 (default 50 portrait, 70 landscape, 80 profilo non-clean senza valori congelati): query > mapping > config token > server defaults > 50 (70 landscape, 80 non-clean). Emessa sempre esplicita in preview e Stremio. Curva ease-out continua `u = 1-(1-t)^Î³` (Î³ = 1 + (1-bf/100)Â·2.5; default 50 â†’ Î³=2.25): tocca 1 solo all'ultima riga, NESSUN plateau (il vecchio `min(t/fadeStop,1)` appiattiva il fondo e piega lo shade) |
| `tint` | `tintStrength` (slider editor 0..100 + default globale, double-click reset 20) | `qTint` â€” intensitÃ  tinta di scena 0..100 (default 20): query > mapping (`tintStrength`) > config token > server defaults (`FLAMEFORGE_TINT_STRENGTH`) > 20. Emessa sempre esplicita in preview e Stremio. Nessun profilo landscape dedicato (vale per entrambi i canvas) |
| `ts` | `topShade` (slider editor 0..100 + default globale `defaultTopShade`, double-click reset 50) | `qTs` â€” ombra lineare superiore 0..100 (default 50): query > mapping (`topShade`) > config token > server defaults (`FLAMEFORGE_TOP_SHADE`) > 50. Solo flat (vale per entrambi i canvas, come la tinta). Preview sempre esplicita (`ts=0/..`); Stremio solo quando â‰  50 (URL esistenti invariati). Sotto compactTuning la risolve il server dal mapping |
| `tsh` | `topShadeHeight` (slider editor 0..100 + default globale `defaultTopShadeHeight`, double-click reset 25) | `qTsh` â€” altezza ombra superiore in % del canvas 0..100 (default 25 = look storico): query > mapping (`topShadeHeight`, profilo `landscape` sopra il flat per la forma orizzontale, assente = segue il flat) > config token > server defaults (`FLAMEFORGE_TOP_SHADE_HEIGHT`, profilo `landscape` sopra per la forma orizzontale) > 25. 0 = ombra disattivata qualunque sia `ts` (il renderer salta il composite come con forza 0). Preview sempre esplicita (`tsh=0/..`); Stremio solo quando â‰  25 (URL esistenti invariati, stessa regola di `ts`). Sotto compactTuning entra in `dv` e la risolve il server dal mapping |
| `dv` | mai dallo stato (firmata dal builder) | hash FNV-1a (8 hex) del tuning omesso negli URL compatti â€” emessa solo con `compactTuning`, mai letta dal render: invalida browser/edge/Stremio a ogni cambio default senza cambiare un pixel. Il proxy addon emette la stessa chiave ma con copertura totale dei defaults (`proxyDefaultsSignature` in `addon-proxy.ts`: stili/toggle inclusi â€” i param espliciti clobberebbero i mapping, vedi catena query > mapping) |
| `tl` | `topLight ? "1" : "0"` (sempre, anche per genre badges) | `qTopLight` â€” override se presente |
| `bl` | `bottomEdgeColor` via `useRootColors` (solo a calcolo completato, come `tl`) | `qBottomLight` â€” override se presente, altrimenti calcolo server sulla striscia inferiore corretto per la banda blur (`computeBottomLight`) |
| `qmin` | â€” (solo default globale, nessun per-titolo in Fase 1) | `q.get("qmin")` > server defaults (`FLAMEFORGE_QUALITY_MIN`) > `"SD"` â€” tier sotto soglia = niente badge; emesso negli URL Stremio solo quando â‰  `SD` |
| `sash` | â€” (solo default globale via 5 toggle Impostazioni, nessun per-titolo in Fase 4) | `q.get("sash")` > server defaults (`FLAMEFORGE_SASH_ORDER`) > ordine standard (`upcoming,rank,new,award,extra`) â€” sottoinsieme ordinato, non listati = spenti, `sash=` vuoto = tutto spento, garbage = default; emesso negli URL Stremio solo quando â‰  default |
| `dct` | default globale `defaultDisabledContentTags` (tab Impostazioni Â· Tag e Network, nessun per-titolo, nessun profilo landscape, nessuna recipe preset); preview/default-preview SEMPRE esplicite (`dct=` vuoto a staged vuoto, WYSIWYG) | tag badge automatici disabilitati space-wide (ID canonici, vedi `content-tags.ts`): filtrano PRIMA della selezione prioritÃ  (il disabilitato cede al successivo abilitato nel bucket, poi ai bucket successivi; con piÃ¹ match sottogenere canonici il primo disabilitato cede al successivo ABILITATO prima di trueStory/libro; manuali `queryExtra`/custom restano autoritativi e il dropdown resta non filtrato). Catena: query `dct` (csv allowlist, presente-ma-vuoto/garbage = `[]` esplicito che vince su config/defaults) > config token > server defaults (flat condivisi) > `[]` (storico). Emesso negli URL Stremio solo quando non-vuoto (URL legacy invariati); esplicito anche in compact (bassa cardinalitÃ , mai in `dv`); in chiave cache canonical sorted con distinzione presente/assente (`dct=` esplicito â‰  assenza che puÃ² ereditare, come `sepstyle`/`layout`; `normalizePosterCacheParams`) |
| `dnet` | default globale `defaultDisabledNetworks` (stesso tab/contratto di `dct`: 24 mark featured con righe individuali (`FEATURED_NETWORK_IDS`) + gruppo condiviso `Altri loghi` (ogni altro mark locale + sentinel `__tmdb_fallback`, toggle con logo TMDB ufficiale, default ON = storico; nessuna icona per le righe tag, thumbnail SVG locali contain/lazy/alt-vuota solo righe featured) | mark network disabilitati space-wide (ID canonici, vedi `network-keys.ts`, stesso matcher `getNetworkKey` del renderer): skippati prima dei path locale E fallback TMDB (mai resurrect), su tutti i layout (Standard/Fresh/Card). Il sentinel `__tmdb_fallback` (mai chiave SVG canonica, mai in `NETWORK_IDS`/display, bound 75 = 74 + sentinel) con gruppo OFF disabilita TUTTI i mark locali non-featured prima del load E l'intero secondo passaggio TMDB PRIMA di qualsiasi fetch; i featured restano governati solo dal proprio toggle (enable/disable-all muove solo `FEATURED_NETWORK_IDS`, l'Altri resta indipendente). Accensione esplicita del gruppo = bulk intent: azzera sentinel + ID nascosti stored; ID nascosti stored altrimenti preservati verbatim e onorati (gruppo misto dichiarato onesto in UI). Catena/emissione/chiave come `dct` sopra (presente-ma-vuoto/garbage = `[]` esplicito, `dnet=` â‰  assenza) |
| `df` | default globale `defaultDateFormat` (tendina Impostazioni: `locale`/`dmy`/`mdy`/`iso`); preview sempre esplicita (`df=locale/â€¦`, WYSIWYG) | formato data badge "in uscita": query > server defaults (`dateFormat`) > `locale` (fail-closed: ignoti = `locale`); emesso negli URL Stremio solo quando â‰  `locale` (URL esistenti invariati) |
| `age` | default globale `defaultAgeBadge` (toggle Impostazioni Â· Badge, default OFF) + per-titolo editor (`BadgeControls` famiglia QualitÃ , indipendente per formato); preview sempre esplicita (`age=0/1`, WYSIWYG) | badge testuale di classificazione per etÃ : pill neutra tra tier qualitÃ  e formati A/V top-right (sotto il 4K, sopra DV/Atmos, stessi offset/scale/cap; rende anche senza 4K). Catena con per-titolo: query > mapping effettivo per formato > config token > server defaults effettivi per forma (`FLAMEFORGE_AGE_BADGE`) > false. Spento = zero fetch TMDB extra e resa storica invariata; richiede il master `badgesEnabled` (lo spegne tutto). Emesso negli URL Stremio solo quando ON (+ `age=0` esplicito con `config`) |
| `agecountry` | default globale `defaultAgeCountry` (tendina Impostazioni Â· Badge, default `IT`, mai auto-cambiata con lingua/regione) + per-titolo editor (stessa tendina, indipendente per formato); preview sempre esplicita (`agecountry=IT/â€¦`, WYSIWYG) | paese della classificazione etÃ  (ISO-2 maiuscolo, `GLOBAL` escluso): query > mapping effettivo per formato > config token > server defaults effettivi per forma (`FLAMEFORGE_AGE_COUNTRY`) > `IT` (fail-closed per livello: garbage/`GLOBAL`/non ISO-2 cade sul livello successivo; etichetta originale del paese senza conversioni nÃ© fallback cross-country, dati assenti = badge nascosto). Emesso negli URL Stremio solo col badge attivo |
| `agebs` | default globale stile pill etÃ  (selettore Impostazioni Â· Badge, default `standard` = resa storica; `knockout` = tag bianco con lettere ritagliate trasparenti (cut-out genuino via mask, builder dedicato SOLO etÃ  `buildAgeKnockoutSvg`/`renderAgeKnockoutBadge` â€” mai il builder condiviso della qualitÃ  knockout, che resta byte-identico)) + per-titolo editor (stesso selettore, indipendente per formato); preview sempre esplicita (`agebs=standard/knockout`, WYSIWYG) | stile della pill etÃ  nell'ordine fisso qualitÃ  â†’ etÃ  â†’ formati A/V top-right (tra tier 4K e icone Dolby/HDR, stessi offset/scale/cap; rende anche senza 4K). Glifi mask alla base normale (niente oversize 1.35x della qualitÃ ), padding X `1.0 Ã— fs`, raggio `0.30 Ã— boxH`, `letter-spacing 0.06em` con `textLength` pinnato, font (`bfont`) ed escaping invariati; lettere trasparenti per disegno (tradeoff accettato sui fondali chiari, mai testo opaco nÃ© fallback di contrasto); enum/URL/persistenza invariati (identificativo legacy `knockout` conservato). Catena con per-titolo: query > mapping effettivo per formato > config token > server defaults effettivi per forma > `standard` (query presente-ma-invalida = `standard` esplicito, fail-closed come `bfont`). In allowlist cache key (`agebs` invalido â†’ `standard`, mai delete: l'assenza puÃ² ereditare knockout) |
| `pre` | `preRelease` editor live per-titolo (preview titolo) + default globale `defaultPreRelease` (toggle Impostazioni Â· Badge, default OFF, per-shape `land ?? flat` in landscape); preview titolo/defaults SEMPRE esplicita (`pre=0/1`, WYSIWYG â€” come `ribbon`/`cr`/`sep`: senza, un default salvato ON scavalcerebbe lo staged OFF e la preview mostrerebbe il nastro a effetto spento) | `qPre` â€” effetto pre-digitale: velo scuro (sotto logo e badge, che restano luminosi) + nastro angolare rosso "coming soon!" in alto (a sinistra; a destra con side="right") sui film senza disponibilitÃ  digitale/streaming (JW offerte non-CINEMA > TMDB type 4). Catena: query > config token > server defaults (`FLAMEFORGE_PRE_RELEASE`, effettivi per forma) > false. Emesso negli URL Stremio solo quando ON (+ `pre=0/1` esplicito con `config`, come `badges`/`ranking`/`age`) |
| `hideLogo` | mai dal client (solo banner Stremio) | solo query `hideLogo=1`: salta il composite logo film (fetch tenuto per i colori accent). Vale per entrambi i canvas: il landscape cuoce il logo come il portrait (vincoli 16:9), solo il banner pulito lo nasconde. Col banner (landscape) il badge genere va in basso a DESTRA (ancoraggio destro, niente shift landscape) e il network segue i rami "senza logo" (top-left / a fianco del nastro) |
| `rd`/`fad` | date complete `release_date`/`first_air_date` (solo se valide `YYYY-MM-DD`) | ramo query: date a piena precisione per rilevamento pre-digitale (fallback `year` â†’ `${y}-01-01`) |
| `title` | `selected.title \|\| selected.name` (preview) / `mapping?.title` (Stremio) | titolo per il match JustWatch (`preTitle`: mapping > query > session > `genreName`) â€” senza, la ricerca usa `genreName` e il match per tmdbId fallisce (rilevamento pre-digitale + qualitÃ  degradati) |

> `gradColor`, `gradOpacity`, `gradFade`, `gradDir` sono **parametri morti**: non vengono piÃ¹ letti dal server (il gradiente usa il colore accent + `gradHeight`). `bottomGradientSVG` in `badges.ts` non Ã¨ piÃ¹ chiamato dal compositore poster. Non reintrodurli.
| `rank` | `badge.rank` (se rankingBadges attivi) | `qRank` â€” override del ranking |
| `animerank` | rank anime del titolo selezionato (da `mdblistAnimeList`, solo preview WYSIWYG) | `qAnimeRank` â€” override del rank anime (`media_type=tv`); senza, il server lo calcola da `fetchMDBList` con la chiave della richiesta o il fallback d'istanza (`FLAMEFORGE_MDBLIST_KEY`). Con `rk=` valido omesso in preview (vince `rk=`, come Stremio che non lo emette mai per queste liste) |
| `rk` | parametro diagnostico/manuale (nessuna emissione automatica da cataloghi/card: i badge automatici risolvono live) | intero 0..100 (`0` = unranked esplicito, invalido/assente = legacy). Precedenza finale: `rank=` esplicito > `rk=` > rank live da fonte selezionata. `rk=` valido salta entrambi i fetch trend/anime e sopprime l'anime win; entra nella chiave cache/ETag (stesso titolo rank N vs M = byte distinti); con `ranking=0` mai emesso/mai numero automatico |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` â€” override label ranking |
| `extra` | `badge.label` (se extra) o `customBadge` | `queryExtra` â€” forza badge extra |
| `bs` | `badgeStyle` | `qBs` â€” "shadow"/"pill"/"bar"/"colored"/"bordo"/"vetro"/"minimal" (catena query > mapping effettivo per formato > config > defaults effettivi per forma; il default landscape sceglie lo stile orizzontale) |
| `bfont` | `badgeFont` | `q.get("bfont")` â€” "inter"/"barlow-condensed"/"oswald" (default "inter" = resa storica; assente o non valido â†’ Inter). Catena query > mapping effettivo per formato > config > defaults effettivi per forma. |
| `rs` | `rankingBadgeStyle` | `qRs` â€” "default"/"colored"/"pill"/"bordo"/"vetro"/"netflix"/"corner"/"number" ("bar" rimosso: degrada a "default"; "corner" = pill piatta tinta accent ancorata alto-sx; "number" = solo cifre Inter Bold con gradiente biancoâ†’argento e ombra morbida, senza piastra/nastro/`#`/label, ancorato alto-sx come `corner` ma specchiato a dx con `side=right`; collisioni network/qualitÃ /Coming Soon condivise col `corner`; i rank `number` rendono su una baseline X di stile `NUMBER_BADGE_BASE_OFFSET_X=-20` canvas px â€” vedi `tox`) |
| `xbs` | `extraBadgeStyle` (per-titolo o default; assente = legacy `rs`) | `qXbs` â€” "default"/"pill"/"colored"/"bordo"/"vetro"/"corner" (solo extra; assente ovunque = legacy `rs`; invalido = assente; rank usa sempre `rs`). Sentinel esplicito `follow-rank` (query/mapping/token/profilo, entrambi i formati) = own-rank del formato effettivo (renderer: `null` via fallback `rs`, nastri/numeri inclusi; query vince su mapping/token/profilo). Legacy `null`/assente/invalido = eredita il livello successivo (mai shadow, URL legacy byte-identici; il per-titolo segue il profilo `landscape` con fallback al flat) |
| `tscale`/`tox`/`toy` | `topBadgeScale`/`topBadgeOffsetX`/`topBadgeOffsetY` (badge CLASSIFICA superiore) | scala `%` 10..200 (default 100, tutti gli stili) + offset px (default 0, solo centrati). Semantica `tox` = baseline di stile + aggiustamento utente: per un rank `number` (`topBadge.type=rank`, stile effettivo `number`) la X effettiva Ã¨ `tox + NUMBER_BADGE_BASE_OFFSET_X(-20)` (stesso su sx/dx e portrait/landscape; gli slider UI mostrano l'effettivo e convertono l'edit in aggiustamento, i raw salvati non migrano mai); extra in fallback legacy `rs=number` e tutti gli altri stili restano sulla baseline storica (X effettiva = `tox`). URL preview/Stremio emettono sempre il `tox` raw (mai doppio conteggio: la baseline si applica una sola volta al render) |
| `exscale`/`exox`/`exoy` | `extraBadgeScale`/`extraBadgeOffsetX`/`extraBadgeOffsetY` (badge EXTRA superiore) | opt-in, stessi bound classifica; assente (o query invalida) = fallback legacy sul tuning classifica (URL invariati). Catena: query > mapping per-shape > config token > defaults per-shape > legacy. Il render seleziona il tuning per kind del topBadge effettivo (rank â†’ classifica, extra â†’ extra-dopo-fallback): nastro sempre classifica, `number` mai -20 su extra. Emissione esplicita solo se definito; in compact entra in `dv` solo in quel caso (altrimenti firma storica invariata). Regola indipendenza (implementata in `extra-materialize.ts`, applicata da setter classifica + `applyVisualPreset`): il primo edit classifica materializza l'extra precedente indipendente (tutti gli assi ancora in follow) PRIMA di cambiare il rank; l'edit extra non tocca mai la classifica. Reset extra = torna a null (segui) |
| `gscale` | `genreBadgeScale` (badge genere/rating in basso) | scala `%` 10..200 (default 100 su base 28.6px nativa; la **barra** scala nativa via font per restare full-width) |
| `gox`/`goy` | `genreBadgeOffsetX`/`genreBadgeOffsetY` | offset px (default 0, solo stili non-bar) |
| `qscale` | `qualityBadgeScale` (badge qualitÃ  streaming) | scala `%` 10..200 (default 100 su base 17px nativa) |
| `qox`/`qoy` | `qualityBadgeOffsetX`/`qualityBadgeOffsetY` | offset px (default portrait -10/+15, landscape 0/0; espliciti incl. 0 vincono) |
| `sepox`/`sepoy` | `separateBadgeOffsetX`/`separateBadgeOffsetY` (gruppo separati) | offset px (default 0; colonna/pills entrambi gli assi, `bottom-bar` portrait solo Y â€” X ignorata, mai nuovo renderer) |
| `netscale` | `networkLogoScale` (logo network) | scala `%` 10..200 (default 100) |
| `netPos` | `networkLogoPosition` (sempre esplicito in preview: `auto`/`top`; Stremio solo in modo `top`) | `auto` = specchio dinamico; `top` = sempre all'angolo superiore, lato del nastro effettivo (destra solo con nastro rank/preset o Coming Soon a destra, sinistra con tutti gli altri badge o senza â€” anche in vista Stremio; stacking Coming Soon del lato + shift nastro stesso lato + shrink vs centrale; qualitÃ  trasloca a sinistra quando il network finisce a destra). Catena: query > mapping (`networkLogoPosition`) > config token > server defaults > `auto` |
| `nox`/`noy` | `networkLogoOffsetX`/`networkLogoOffsetY` | offset px (default 0) |
| `side` | `ribbonSide === "right" ? "right" : null` (modalitÃ  Stremio; default Nuvio = sinistra) | `qSide` â€” "right" sposta nastro Netflix (specchiato) + logo network + nastro Coming Soon a destra |
| `shape` | `posterShape` (sempre esplicito in preview: `poster`/`landscape`; default globale `defaultPosterShape`, per-titolo dal mapping) | catena `shape` > mapping (`posterShape`) > config token > server defaults (`FLAMEFORGE_POSTER_SHAPE`) > `"poster"` â€” solo `landscape` attiva il canvas 16:9 (`LAND_W=768/LAND_H=432`, base = backdrop TMDB via `posterUrlOriginal`, oppure base custom da `customBackdropUrl` â€” indipendente dal portrait `customPosterUrl` â€” via query `backdrop=` allowlisted come `poster=` (bound 2048, stesso flusso validato, fallback TMDB in parallelo, mai 500) o salvato; Stremio usa sempre il mapping, mai `backdrop=`); emesso negli URL Stremio solo quando landscape (il portrait resta omesso per non invalidare la cache) |
| `align` | `logoAlign` per-shape (sempre esplicito in preview landscape; mai in portrait) | `left`/`center` esplicito > override profilo Orizzontale (concreto vince, `null`/assente = segue il flat) > flat `sd.logoAlign` > default di formato (landscape `left`, poster `center`) â€” i portrait sono sempre centrati, nessun globale li sposta mai; in portrait l'opzione Sinistra Ã¨ un no-op dimostrato (disabilitata in UI) |
| `ac` | `accentColor` SOLO se manuale (`isManualAccent`: diverso da `autoAccentColor` auto-rilevato via `useRootColors`, come il server) â€” mai l'auto, mai nel mapping salvato | `qAc` â€” override colore accent (vince su tutto: badge colored, blur tint, scrim) |
| `badgePreset`/`prv`/`pt`/`bp`/`bpf`/`bpt` | â€” (rimossi: custom Badge Lab ritirato) | Parametri ritirati, inerti: non entrano in allowlist/cache key (`POSTER_CACHE_ALLOWLIST`), l'hardening li cancella e la route li ignora â€” vecchi URL e binding salvati (`mapping.badgePresetId`/`badgePresetRev`/`badgePresets`/`badgePresetFollows`, `ServerDefaults.badgePresets`, token `config`) collassano sul render nativo senza cambiare un pixel nÃ© bustare la cache. I campi persistiti restano validati e archiviati verbatim (mai cancellati dallo storage), ma non influenzano piÃ¹ chiavi o byte. |
| `live` | mai dallo stato editor (solo template "Segui il mio spazio": `followSpace` in `buildUrlPattern`, o `live: true` esplicito nel builder) | `live=1` â€” politica di rivalidazione (non forza il render): header `public, no-cache, max-age=0, must-revalidate` senza SWR su 200 e 304 + mai immutable; i parametri assenti seguono lo spazio (`badges`/`ranking`/`be` compresi, vedi sotto) |
| `tvdb_key` | mai dal client (solo manuale; Stremio usa il fallback d'istanza) | chiave TVDB per il rescue poster B1: solo ramo non-mappato, solo senza clean TMDB + con logo + solo portrait. Solo il textless (`includesText === false`) salva il logo; con testo il logo si azzera (no doppio logo). La chiave non entra mai nella cache key (segreto); il flag server-side `tvdb=1` separa le entry con rescue attivo |
| `theme` | contesto effimero lista di origine (`seasonalTheme` in `PosterState`, da `navigateToPoster(item, src, listName, seasonalKeywords)` â€” le keyword custom utente estendono lo stesso match nomi-lista; Stremio dal nome catalogo effettivo via `resolveCatalogSeasonalTheme` in `catalog-handler.ts`) sotto la scelta per-titolo editor (`seasonalThemeChoice` in `PosterState`, selettore `BadgeControls` â†’ `mapping.seasonalTheme`, vince sul contesto via `resolveEffectiveSeasonalTheme`) | SOLO query `theme=<tema canonico>` (`halloween`/`christmas`, nient'altro Ã¨ valido; Natale riconosciuto in tutte le lingue UI + keyword custom bounded per spazio â€” vedi leaf `seasonal-theme.ts`; nomi misti â†’ `halloween`) su entrambi i canvas col proprio asset (`resolveSeasonalTheme` in `poster-config.ts` + override mapping via `resolveEffectiveSeasonalTheme` (non-preview: scelta esplicita vince, `none` sopprime, assente = Automatica segue la lista; preview effettiva autorizzata: vince il `theme=` staged e il mapping salvato Ã¨ ignorato â€” mai resurrect); con valori invalidi/assenti = unframed, stessa chiave dell'assenza). Catena mapping SOLO per-titolo (`mapping.seasonalTheme` flat condiviso, mai config/defaults; nessun profilo landscape). In allowlist cache key + `stremio-poster-params.ts` (esplicito anche in compact, mai in `dv`); il catalogo aggiunge `:th<tema>` alla chiave. Nel service la cornice sta SOPRA lo sfondo/trattamento (backdrop, vignetta, velo, ombra, blur) ma SOTTO TUTTO il chrome â€” logo e badge inclusi (rank/extra, Coming Soon, network, qualitÃ , genere, separati, etÃ ) + overlay Fresh/Card â€” per richiesta utente esplicita, in ogni layout (standard/Fresh/Card) e forma (portrait/landscape; solo il banner pulito shape=landscape + hideLogo resta senza cornice); il `/meta` generico senza `theme=` resta byte-identico (il `theme=` esplicito vale solo come contesto effimero lista/test Stremio, su entrambi i canvas, con `:th<tema>` in chiave cache meta). Asset CANONICI `public/seasonal-frames/halloween.svg` + `public/seasonal-frames/christmas.svg` (portrait 500Ã—750) + `public/seasonal-frames/halloween landscape.svg` + `public/seasonal-frames/christmas landscape.svg` (landscape 768Ã—432, mappa esplicita `seasonalFrameAssetPath`, mai stirati) (in `RENDER_FILES`, byte-identici all'arte utente); il prototipo offline `design/seasonal-frames/` resta storia nel branch di feature e non Ã¨ spedito (nessuna copia sincronizzata da mantenere) |

> Retired: custom Badge Lab (libreria preset per family, editor `/lab/badges`,
> pagina `/presets`, API `/api/presets/*`, binding `badgePreset`/`prv`/`bp`/`bpf`/`bpt`
> e campi persistiti `badgePresetId`/`badgePresetRev`/`badgePresets`/`badgePresetFollows`).
> Rimosso su approvazione esplicita: i preset custom/house non rendono piu' e non
> alterano chiavi/cache; i badge nativi delle 9 famiglie restano invariati e i preset
> visivi generali (ready/personali, `PresetsPanel`) non sono toccati. I campi persistiti
> restano validati e archiviati verbatim (mai cancellati dallo storage) ma sono inerti
> al render. Dettagli e file coinvolti nel report di rimozione; la cronologia resta in git.
>
> Fonte ranking Top 20 (nessun parametro URL dedicato): la selezione
> (`rankingSourceMovie`/`rankingSourceSeries`, `""` = JustWatch) vive nei
> server defaults / config token e si risolve server-side da `u=`/`config=`
> come gli altri default â€” mai nelle query dei poster (le chiavi restano
> server-side). Con fonte custom il rank alimenta il canale `trendRank`
> (label Film/Serie, niente label JustWatch/anime); fuori Top 20 o in errore
> nessun badge. La preview ricarica via nonce post-save (`rankSourceNonce` in
> `usePosterPreview`, risposte preview no-store), mai con URL diverse: client
> e Stremio vedono lo stesso render.

> URL Stremio (cataloghi/meta): `buildStremioPosterUrl()` emette gli stessi parametri ma dal **mapping salvato con fallback ai default** (`mapping?.X ?? defaults.X`) per `badges`/`ranking`/`bs`/`rs`/`be`/`extra`/toggle/enum â€” emissione sempre esplicita. Il tuning numerico ad alta cardinalitÃ  (`gradHeight`/`blur`/`tint`/`bf`/`bd` + 14 scale/offset `tscale`/`tox`/`toy`/`gscale`/`gox`/`goy`/`qscale`/`qox`/`qoy`/`sepscale`/`sepox`/`sepoy`/`netscale`/`nox`/`noy`) Ã¨ omesso senza `config` (`compactTuning`): il server lo risolve da mapping > defaults dello spazio (stesso render, chiave convergente). `extra` Ã¨ emesso solo per customBadge **non** rank-key (`isRankKey`): le rank-key viaggiano via rank live + fallback `mapping.badgeRank`/`trendRank`/`animeRank` su fetch fallito (mai su miss genuina: un titolo uscito dalla chart non resuscita il rank stantio), altrimenti `queryExtra` duplicherebbe il badge (vince sul calcolato).
>
> Template AIO/Custom "Segui il mio spazio" (`followSpace` in `buildUrlPattern`, `linkMode` in `context.tsx`/`InstallModal.tsx`): omette TUTTI i visuali (toggle, stili, tuning, lingua, shape fisso) ed emette solo `u` + `live=1` + `rv` (+ chiavi per policy, + `shape={shape}` nella variante Nuvio). Il server risolve gli assenti da query > mapping > config > spazio > default; con `live=1` anche `badges`/`ranking`/`be` assenti seguono lo spazio (fuori dal live, l'assenza resta default ON come prima). Header live su 200 e 304, ETag + 304 conservati, cache interna riusata.
>
> Validatori e policy HTTP (audit freschezza): l'ETag Ã¨ l'hash SHA-256 del buffer finale effettivo (rank live, rating, qualitÃ , premi e ogni dipendenza dinamica cambiano i byte â†’ cambia l'ETag; suffisso `:cr` per i custom rating). Il confronto condizionale usa sempre l'ETag della rappresentazione richiesta (canonico/variante/AVIF, mai incrociati). Copia fresca + ETag uguale â†’ 304 senza rendering; copia scaduta + condizionale (o `live=1`) â†’ rivalidazione completa e 304 solo a contenuto invariato, mai 304 sulla copia scaduta; solo le non-condizionali fuori dal live conservano lo SWR. Niente immutable annuale nemmeno con mapping+rv+mv (i dati live non sono coperti dal versionamento): header finiti (24h mappati con SWR, ~6h dinamici, 120s effimeri anche mappati, no-cache sul live). Un TTL esplicito memorizzato (effimero) restringe sempre la policy, mai allargarla.

> Hardening anti cache-busting (v1.23.0, `poster-params-hardening.ts`, `FLAMEFORGE_POSTER_PARAMS=presets`, auto-on su `PUBLIC_INSTANCE=1`/`HOSTED_BY=elfhosted`/`MULTI_USER=1`): cache key con allowlist rigida (`POSTER_CACHE_ALLOWLIST`, junk `?x=` collassa, repeat deduplicati al primo valore); non-preview con presets â†’ numerici quantizzati (step 5/10/5px), `ac` solo palette `GENRE_FALLBACK`, `extra`/`label` solo da mapping curato (canonicalizzati, mai free-text), override `poster`/`logo`/`backdrop` ignorati su pubbliche anonime. Preview (`preview=1`) live per spazi utente e sessioni sbloccate; sulle istanze pubbliche le preview anonime sono declassate a normale (auto-on, override `FLAMEFORGE_PREVIEW_AUTH=1/0`). Valori salvati mai toccati.

> Formato Stremio: se il default globale Ã¨ `landscape`, cataloghi e meta FlameForge emettono `posterShape: landscape` e un URL `shape=landscape` anche per i mapping salvati `poster`. Con default `poster`, il formato per-titolo continua a prevalere. Il mapping salvato non viene modificato.
>
> Demo samples (solo preview default Impostazioni, `demo-samples.ts`): `buildDefaultsPreviewUrl` emette sempre `demosamples=1`; la route lo accetta solo con preview effettiva post-downgrade (`preview=1` + flag `1`, fail-closed; declassata â†’ flag rimosso dalla chiave). Dataset sintetico fisso, zero fetch/chiavi: rank 11, tier `4K` (passa sempre `qmin`), network Netflix (SVG giÃ  bundlato, fallback nel service DOPO i candidati reali in ordine invariato), voti per le sole fonti `rsrc` richieste con merge gap-only (reali intatti, media regola imdb+tmdb), genere/anno fallback solo se assenti (date passate fisse). I toggle/stili restano l'unico gate di rendering (`ranking=0` â†’ niente rank, `formats=none` invariato, niente premi/upcoming/Top250/Coming Soon campionati); `queryExtra` segue l'API reale. In chiave cache via allowlist (campione/genuino separati); le preview non si scrivono mai. Mai in `buildPreviewUrl` editor nÃ© negli URL Stremio. UI: avviso `ui.defaultsPreviewSamplesNotice`.

## Bordo poster

| Parametro | Client (`EditView.tsx`) | Server (`route.ts`) |
|---|---|---|
| Bordo | `3px solid rgba(255,255,255,0.80)` | Rimosso (solo client) |
| Overlay | `absolute inset-0 pointer-events-none` (sopra ogni contenuto) | â€” |

## Logo clean poster

| Parametro | Client | Server |
|---|---|---|
| Dimensione logo | `computeLogoOffsetBounds()` usa `computeLogoBox()` | `computeLogoLayout()` usa `computeLogoBox()` |
| Scala | `logoScale` come percentuale della larghezza poster, max larghezza poster. Limiti UI (c1): per-titolo Fresh 10..200 (`FRESH_TITLE_LOGO_MAX_SCALE`), per-titolo Standard 10..100 invariato (`STANDARD_TITLE_LOGO_MAX_SCALE`), default globali/di formato 10..200; server clamp 10..200 ovunque (`poster-config.ts`), validazione mapping 10..200 (`validation.ts`), query hardening invariato (step 10 in presets, preview sempre esente) | Stessa logica |
| Scala auto | `logoDefaultScale` (logo-selection.ts) | `defScale` in poster-service.ts + `defaultLogoScale` in poster-auto-fit.ts (stessa formula, Golden Rule) â€” curva `round(37.5 Ã— aspect^(2/3))` cap 75 (2:1 â†’ 60, 2.5:1 â†’ 69, 3:1+ al cap; quadrati invariati a 38). ECCEZIONE Fresh EFFETTIVO (task8a+c1): scala auto/null con Fresh effettivo (layout fresh E (scope `all` O numerale valido 1..100 mostrato, giÃ  `rankingEnabled`-gated) â€” mai layout selezionato da solo, mai appartenenza catalogo) = 100 (`FRESH_TITLE_LOGO_DEFAULT_SCALE`, via `logoEffectiveAutoScale` + sentinel auto `scale=0`/null, mai 100 baked) â€” espliciti (anche 75/100/150/200) e fallback Standard (fresh+ranked senza rank valido, rank ignoto/pending, ranking spento) restano sulla curva |
| Cap altezza | Solo canvas poster (`posterH`) | Solo canvas poster (`STD_H`) |
| Cap portrait | `maxHeightPct: PORTRAIT_LOGO_MAX_HEIGHT_PCT (25)` â€” solo altezza, larghezza libera | Stesso cap (via `computeLogoLayout` in portrait; `poster-fit-score` usa gli stessi override) |
| Sorgente logo | â€” | `fetchLogoImg`: raster a `w500` al primo tentativo (single fetch, niente `original`/`w780` â€” `w780` non Ã¨ una taglia logo documentata); SVG vettoriali a `original` (semantica vettoriale), URL assoluti invariati. Cap anti-OOM 10MB, abort/timeout/404 rilanciano senza retry. Poster/backdrop restano `w500` |
| Margine inferiore | `bottomMarginPct: 12` con badge genere, `10` storico senza (mirror in `context.tsx` per i bound slider) | `bottomMarginPct: hasGenreBadge ? 12 : undefined` (default 10) â€” solleva il logo sopra il badge basso |
| Calibrazione Y portrait | `topOffset: PORTRAIT_LOGO_TOP_OFFSET (10)` â€” logo 10px piÃ¹ in basso (mirror in `context.tsx` per i bound slider, `poster-fit-score.ts` per l'auto-fit; landscape escluso: non baked-in) | Stesso offset (ramo portrait, giÃ  solo-portrait) |
| Calibrazione invisibile landscape | slider sempre a 0 (nessun default visibile) | `LANDSCAPE_LOGO_SHIFT_X/Y (+10/-10)` sommati in `poster-service.ts` agli offset risolti (`ox`/`oy` > mapping > default globali), come `PORTRAIT_LOGO_TOP_OFFSET` in portrait |
| Logo manuale su portrait non-clean | ammesso: tiles sempre abilitate, preview emette `logo` anche non-clean, mapping/route lo persistono e rendono | default nessun auto (auto solo da clean o landscape); `logoDisabled` sempre onorato; `?logo=` esplicita vince |

## Layout copertina Fresh (`layout`)

Opt-in grafico (`standard` = resa storica, default; `fresh` = numerale classifica in vetro + colonna meta a posizioni fisse, stesso renderer unico). Parametro `layout` in query; per-titolo nel mapping (flat + profilo `landscape`); nei default globali (flat + profilo Orizzontale) e nel config token. Nessun nuovo campo oltre `posterLayout`/`landscape.posterLayout`.

> **Preset pronto Fresh (galleria Preset, solo ranked):** settimo tile (`FRESH_VISUAL_DEFAULTS` in `default-visual-presets.ts`, fedele all'export readonly `C:\Users\lucaf\Desktop\fresh.json` + `fresh`/`ranked` espliciti su entrambi i formati, etÃ  OFF/IT/standard canonica) â€” portrait `netflix`+nastro/minimal/knockout/grade 35, landscape `number`/`color`/`follow-rank`/grade 50. La galleria `PresetsPanel` lo applica con `withReadyPresetLayoutFresh` (stesso freeze dell'altro formato dello Standard, mai reset d'ingresso Fresh che distruggerebbe le posizioni 0/null esplicite); i 6 esistenti restano Standard, i personali applicano verbatim.

| Aspetto | Regola |
|---|---|
| Precedenza server (`resolvePosterLayout` in `poster-config.ts`) | query `layout` > mapping effettivo per formato (`mapping.landscape` vince sul flat) > config token > default effettivi per formato (`effectiveDefaultsForShape`) > `standard`. Query presente ma invalida/vuota = `standard` esplicito, mai eredita (chiave cache distinta dall'assenza) |
| Editor | selettore per-titolo (`BadgeControls`, mai tocca badge/logo/transform) + default per formato (`BadgeDefaultsSection`: Verticale = flat, Orizzontale = solo profilo). All'apertura: mapping effettivo > default effettivo di formato (`poster-layout-resolve.ts`, stessa regola del server). Propagazione live dei default solo senza mapping salvato; in landscape il flat non clobbera mai il profilo esplicito (`land ?? flat`). Stash per-titolo al cambio formato (`EditView`): ogni formato ricorda la propria scelta |
| Template senza titolo | layout effettivo del formato di consegna (`land ?? flat` su `defaultPosterShape`). Limite noto Nuvio: `shape={shape}` cuoce un solo valore (quello del formato di consegna) â€” una coppia divergente (verticale standard / orizzontale fresh) non congela entrambi in un unico parametro; per consegne divergenti servono template fissi per formato o Segui-spazio (live) |
| Cosa non si applica in Fresh | stili badge di numerale/righe meta/provider (le pill/nastri/placche Standard non esistono in Fresh; i valori restano conservati e si riapplicano tornando a Standard). Le DIMENSIONI/POSIZIONI invece si applicano (vedi riga sotto). Restano attivi: pill qualitÃ , nastro Coming Soon, badge extra superiore, sfocatura/ombre/tinta, controlli logo (scala sempre, offset una sola volta sull'anchor Fresh) |
| Scala titolo Fresh (task8a+c1) | default EFFETTIVO 100 (`FRESH_TITLE_LOGO_DEFAULT_SCALE`): auto/null con Fresh EFFETTIVO rende come esplicito 100 (stesso percorso senza cap Standard + title cap fresh ingrandito della stessa %, byte-identici â€” nessuna doppia scala; il render cap lascia crescere davvero 100â†’150â†’200, solo la sicurezza canvas vincola). Espliciti 20/50/75/100/150/200 onorati ovunque (mai sovrascritti); Standard selezionato o fallback Standard (fresh+ranked senza rank valido/ignoto/pending, ranking spento) = curva aspect storica. Limiti UI (correzione utente "margine fino 150/200"): per-titolo Fresh 10..200 (slider + digitato, entrambi i formati), per-titolo Standard 10..100 invariato, default globali/di formato 10..200 (espliciti, servono al default Fresh). Editor: auto con sentinel (preview `scale=0`, save null) â€” mai 100 baked; rank-arrival/change, ranking on/off, scope rankedâ†”all e reset/switch layout riallineano i SOLI auto (100 vs aspect) senza toccare gli espliciti; un 100 automatico non diventa mai un 100 esplicito Standard (provenance `logoScaleExplicit`); con Fresh selezionato ma fallback Standard il controllo 200 resta disponibile come preferenza ma non muove lo Standard finchÃ© resta auto (solo un adjust esplicito lo cambia). I salvati espliciti (anche 75) non vengono mai clobberati; tornando a Standard gli altri visuali restano intatti |
| Titolo centrato portrait classificato (task8a2) | SOLO portrait Fresh CON rank valido mostrato: titolo centrato (`x = round((CW âˆ’ w) / 2)`, stessa baseline di fondo `CH âˆ’ h âˆ’ titleBottom`, margine basso invariato) con slot proprio (`rankedTitleMaxW = CW âˆ’ 2 Ã— round(CW Ã— 0.055)`, margini ~5.5%/lato â‰ˆ 28px @500w come la reference; cap altezza 25% CH â€” i wordmark larghi legano in larghezza, i marchi alti/quadrati restano nella fascia bassa senza mangiare la colonna meta). Cap separato dal `titleMaxW` comune: portrait senza rank, landscape Fresh e Standard restano byte-identici. 100 = base del controllo scala (mai 100% del canvas); 150/200 ingrandiscono i cap della stessa % fino al SOLO limite genuino del canvas (a 150 il titolo tocca giÃ  il bordo, il 200 non cresce oltre â€” ammesso esplicitamente). `ox`/`oy` UNA sola volta sull'anchor centrato; logo mancante/nascosto invariato; nessun nuovo parametro, nessun renderer client separato (la preview usa lo stesso endpoint) |
| Titolo landscape Fresh ridimensionato (task9) | Landscape Fresh CON o SENZA rank (stesso slot, composizione invariata): titolo in basso a DESTRA (`x = CW âˆ’ w âˆ’ titleRight`, baseline `CH âˆ’ h âˆ’ titleBottom`, `ox`/`oy` UNA sola volta) con slot base = bound storici logo landscape (`landscapeTitleMaxW = round(CW Ã— 0.40)`, `landscapeTitleMaxH = round(CH Ã— 0.24)` â€” come `LANDSCAPE_LOGO_MAX_*_PCT` in `logo-layout.ts`; prima il 100 cadeva nello slot intero a destra colonna ~0.63 CW senza cap altezza: wordmark 487Ã—162, marchio quadrato 400Ã—400 raw). 100 = base del controllo scala (mai 100% del canvas); 150/200 ingrandiscono TUTTI E DUE i cap della stessa % fino al SOLO limite genuino del canvas (mai cap statico che cancella la scala). Portrait classificato centrato (task8a2), portrait senza rank e Standard byte-identici (slot loro intoccati) |
| Numerale portrait Fresh alzato di 90px (task10) | SOLO portrait Fresh CON rank valido mostrato: l'anchor numerale scende di calibrazione default `FRESH_PORTRAIT_RANK_Y_SHIFT = -90`px canvas logici PRIMA dello `toy` utente (`numeralTop` 120 â†’ 30 @500Ã—750, share CH 0.16 â†’ 0.04; landscape 0, invariato). La colonna meta classificata segue il numerale per catena esistente (`metaTop` dal box trasformato â†’ sale di 90 anch'essa, piÃ¹ i propri `goy` indipendenti); il provider sotto-meta e la banda blur sinistra seguono la nuova inchiostro reale (stessi pixel di banda, solo campionamento spostato). `toy` salvato mai resettato (termine baseline separato: neutro `toy=0` = nuovo default, offset utente invariati relativi). Font/scala invariati (stesso `fontSize`/`capH`, niente refactor tipografico â€” quello Ã¨ task11). Senza rank (`all` non classificato, fallback Standard) e Standard = byte-identici (fallback `metaTop` = `numeralTop` storico, mai shiftato) |
| Numerale Fresh alto/stretto (task12 + correzione c2 rank-aware dal 10 in poi) | SOLO Fresh CON rank valido mostrato (entrambi i formati): i glifi del numerale sono condensati anisotropicamente PER FORMA+RANK â€” SOLO il portrait dal 10 in poi si restringe ancora (`FRESH_NUMERAL_CONDENSE_X_PORTRAIT = 0.42` per rank portrait 10..100 = 70% della larghezza corrente 0.6 per richiesta utente "schiacciamoli ancora, troppo grandi 2 cifre" / "ok proviamo" / "solo verticale landscape va bene", con vincolo finale "si schiacciano solo dal 10 in poi": le cifre singole portrait 1..9 restano al baseline task12 `FRESH_NUMERAL_CONDENSE_X_PORTRAIT_SINGLE = 0.6`, NON si assottigliano; `FRESH_NUMERAL_CONDENSE_X_LANDSCAPE = 0.6` landscape invariato byte-identico per OGNI rank; globale `FRESH_NUMERAL_CONDENSE_X = 0.6` resta default di fallback) DIRETTAMENTE sulla sorgente SVG condivisa (`freshNumeralSvg`, `transform="scale(<cx> 1)"` con origine x pre-compensata `rim/<cx>`, fattore portato dal box `condenseX` scelto da `freshGeometry` per forma+rank DOPO la validazione del rank â€” mai per rank assente/non-valido, che non disegna nulla) â€” mask di riempimento, anello del bordo (silhouette unita, nessun seam) e reference condividono gli stessi glifi, mai post-scale del bitmap glassato (la ROI artwork campiona l'inchiostro finale trasformato; `tscale` 10..200 moltiplica una sola volta la geometria stilizzata, `tox`/`toy` una sola volta). `estW` = stima raw Ã— fattore di forma (contratto di misura normalizzato: inchiostro e stima scalano insieme, il tetto reale/stima resta ~1.14 < 1.2). Contratto altezze (da task11, qui portato a regime e BLOCCATO in c2: il fattore restringe solo la larghezza): UNA sola altezza per TUTTI gli rank 1..100 su entrambi i formati â€” il reference condensato a singola cifra non lega piÃ¹ contro la colonna meta (fit solo guardia che non ingrandisce mai), quindi portrait = share 0.33 CH (@500Ã—750: font 340, capH 248, inchiostro ~0.33 CH come la reference rank-10; baseline top 30 task10 invariata, `metaTop` 300 per catena esistente), landscape = altezza storica invariata (font 296, capH 216 â‰ˆ 0.50 CH, solo piÃ¹ stretto); anche il 100 ci sta condensato (eccezione 3 cifre solo sicurezza canvas). Tracking proporzionale (`-0.03em` Ã— condensazione, nessun seam), inchiostro reale: due cifre portrait W/capH < 0.8 (prima ~1.5 a 0.6, ~1.04 a 0.6 per il 20). Banda blur sinistra segue l'inchiostro CONDENSATO (stessa origine `box.left âˆ’ rim`, misura reale â€” si restringe da sola). Senza rank e Standard = byte-identici; in c2 si muovono SOLO i golden portrait classificati dal 10 in poi (i singoli 1..9 tornano byte-identici al pre-c1; re-pinned con contact sheet portrait 1..20 + full 9/10/20 e confronto 10 landscape in temp `task12-c2/`), landscape classificato byte-identico verificato |
| Banda blur sinistra classificata (task8b) | SOLO Fresh CON rank valido mostrato (entrambi i formati): fascia verticale full-height da `x = 0` a `inkRight + 16px` (`FRESH_LEFT_BLUR_FEATHER`), dove `inkRight` Ã¨ il VERO bordo inchiostro del numerale trasformato (scan alfa `measureNumeralInk`, stessa origine `box.left âˆ’ rim` del vetro â€” mai `estW`/`zoneW`; segue X/scala del numerale via `tscale`/`tox`/`toy`). Singolo blur sigma 9 (`FRESH_LEFT_BLUR_SIGMA`, stesso del vetro per coerenza tinta) + loop raw RGBA con alfa smoothstep (opaco a sinistra, esattamente 0 all'ultima colonna, dither Bayer deterministico come `blur.ts` â€” un solo encode PNG, nessun roundtrip). Composita SOTTO lo shade (lo shade scurisce la banda come l'artwork nitido: luminanza invariata, solo dettaglio ammorbidito), prima del numerale/meta/titolo e del chrome conservato (qualitÃ /nastri/extra intoccati). Numerale fuori canvas = nessuna banda (skip, mai throw/ROI invalide/intero canvas a sorpresa); senza numerale (unranked `all`, fallback Standard) e Standard = byte-identici. Il vetro continua a campionare il `posterBuf` originale (nessun re-campionamento/costo extra). Y full-height per decisione minima esplicita (la reference utente vincola solo la fine orizzontale) |
| Transform effettivi in Fresh (nessun nuovo parametro/URL) | numerale classifica = `tscale`/`tox`/`toy` (tuning classifica effettivo per formato, giÃ  risolto a monte): scala+offset plasmano la GEOMETRIA (`freshGeometry`) PRIMA del campionamento artwork del vetro â€” il layer nasce giÃ  trasformato, mai post-resize; nessuna baseline `NUMBER_BADGE_BASE_OFFSET_X` Standard (anchor Fresh proprio: `padX`/`numeralTop`). Colonna meta = `gscale`/`gox`/`goy`: la scala dimensiona i font di colonna, gli offset spostano il blocco; posizionamento indipendente dal numerale ma catena di default automatica (il `metaTop` classificato deriva dal numerale trasformato). Provider = `netscale` NEL bitmap (giÃ  scalato dal renderer unico, mai riapplicato: niente doppia scala) + `nox`/`noy` relativi alla baseline sopra/sotto-meta + contratto `follow=false` + coordinate fisse (verbatim, come lo Standard). Logo titolo = `logoScale` NEL bitmap (giÃ  dimensionato dal renderer unico) + `ox`/`oy` UNA sola volta sull'anchor Fresh (in basso CENTRATO nel portrait classificato â€” task8a2 â€”, in basso a destra nel landscape classificato e in ogni composizione senza rank; l'anchor Standard Ã¨ scartato coi suoi offset: niente doppio offset). Neutrali (100/0/follow) = baseline storica byte-identica (golden classificati invariati) ECCETTO il titolo portrait classificato task8a2 e la banda blur sinistra classificata task8b (cambi intenzionali); ogni layer Ã¨ clampato dentro il canvas anche agli estremi (10..200%, Â±2000px; oltre-canvas si clippa come i badge Standard, mai throw/ROI invalide) |
| Senza rank in Fresh | assente/disabilitato/non-valido (mai numerale valido 1..100) = niente colonna sinistra: il blocco meta va in basso a destra vicino al logo titolo (a fianco, bordo destro = sinistra logo âˆ’ 16px, stessa baseline di fondo; senza logo allineato al margine canvas), network SOPRA IL BLOCCO META (centrato sul blocco meta, gap di colonna `round(metaGap*0.8)` â€” reversione esplicita utente, NON sopra il titolo). Senza righe meta il network ripiega sopra il logo titolo (gap standard `round(6*CH/570)`, centrato sul box titolo); senza logo nÃ© meta Ã¨ ancorato in basso al bordo blocco. Logo titolo invariato (stesso anchor/dimensioni + i suoi offset). Con rank la colonna sinistra resta byte-identica |
| Cache/URL | `layout` in allowlist; assente â‰  `standard` esplicito (l'assenza puÃ² ereditare fresh, lo standard esplicito lo sovrascrive â€” anche in `compactTuning`, mai dentro `dv`). Stremio: `standard` esplicito viaggia sempre quando impostato, l'assenza resta senza parametro (URL legacy invariati) |
| Scope Fresh (`freshScope`: `all`/`ranked`) | `ranked` = default condiviso (correzione utente "metti di default solo rank"): Fresh solo per i titoli con rank VALIDO MOSTRATO (intero 1..100, giÃ  `rankingEnabled`-gated â€” non l'appartenenza al catalogo, non il testo custom, non i flag catalogo; la sola disponibilitÃ  dati non scavalca mai `rankingEnabled`); `all` = override esplicito (Fresh per tutti i titoli, anche senza rank). I mapping salvati espliciti restano intatti (`all` salvato = `all`, `ranked` salvato = `ranked`); solo l'assenza legacy segue il nuovo default `ranked` (scelta deliberata utente). Precedenza server (`resolvePosterFreshScope` in `poster-config.ts`): query `freshScope` > mapping effettivo per formato > config token > default effettivi per formato > `ranked` (query presente ma invalida/vuota = `ranked` esplicito fail-closed, mai eredita). Layout EFFETTIVO (`isEffectiveFreshLayout` in `fresh-layout.ts`, stesso helper `isFreshRank` del numerale â€” nessuna doppia derivazione): Fresh solo se layout fresh E (scope `all` esplicito O rank valido mostrato) â€” assente/invalido = `ranked`; deciso nel service DOPO la selezione del `topBadge` (rank da queryExtra > computato > Coming Soon; la soppressione network tocca solo l'extra, mai il rank) e PRIMA di ogni ramo soppresso â€” senza rank valido il percorso Ã¨ Standard byte-identico (stesse impostazioni), con rank valido Ã¨ Fresh identico alla modalitÃ  all. NÃ© secondo fetch del rank (riusa `finalRank`/`animeRankResult` giÃ  risolti), nÃ© nuove cache/timeout. Campi: `posterFreshScope` in mapping (flat + `landscape`), default globali (flat + profilo Orizzontale), config token; query `all` esplicita scavalca sempre un ranked ereditato (stesso contratto di `layout=standard`), l'assenza resta assente (nessun campo nuovo negli URL legacy). Editor: tendina visibile SOLO con Fresh selezionato (`PosterFreshScopeSelector`, per-titolo in `BadgeControls` + default per formato in `BadgeDefaultsSection` via `useShapeDefaults`, stash per formato in `EditView`); la preferenza resta anche con Standard (tornando a Fresh si ritrova, mai mutati i rendering control salvati). Template: scope effettivo del formato di consegna (`land ?? flat`), stessa regola del layout â€” incluso il limite noto Nuvio (`shape={shape}` cuoce un solo scope: consegne divergenti per formato richiedono template fissi o Segui-spazio) |

## Layout copertina Card (`provider-glass`/`nuvio`/`stremio`, UI P6)

Stessa catena di persistenza del Fresh (query `layout` > mapping effettivo per formato > config token > default effettivi per formato > `standard`; scope `posterFreshScope` condiviso sullo stesso valore salvato), ma gate di eleggibilitÃ  separato (`isEffectiveCardLayout`: rank mostrato 1..20, MAI esteso a 100 â€” il gate Fresh resta intoccato) e geometria fissa nel compositor condiviso (`card-layout.ts`).

| Aspetto | Regola |
|---|---|
| Selettore UI (`PosterLayoutSelector`) | 5 scelte come radiogroup controllato (Standard, Fresh, Provider Glass, Nuvio, Stremio) con miniature CSS illustrative (storico Standard, full-bleed Fresh, rank+card per le 3 Card â€” nessun secondo renderer, mai la logica poster reale), griglia responsive `poster-layout-grid` (`grid-cols-2` sullo stretto, mai 5 label lunghe su una riga). Valori `standard` fail-closed, selezioni salvate preservate |
| Scope condiviso (`PosterFreshScopeSelector`) | visibile con Fresh E con Card (nascosto con Standard, valore conservato). Stesso valore `posterFreshScope` salvato per-formato; testi Fresh invariati, per Card wording generico (`ui.posterLayoutScope` + `ui.posterLayoutScopeHint`, rank 1..20 vs 1..100 Fresh â€” MAI etichettato come Fresh). Per-titolo in `BadgeControls` + default per formato in `BadgeDefaultsSection` (flat Verticale / profilo Orizzontale, come Fresh) |
| Hint attiva Card (`ui.posterLayoutCardHint`) | posizioni fisse rank/provider/meta/titolo + fallback Standard senza rank 1..20; mostrata nella card layout e su ogni gruppo Trasforma disabilitato |
| Trasforma per-titolo (`TransformControls`) | su Card disabilitati (fieldset + hint, valori MAI riscritti): scala/offset classifica, offset X/Y genere, offset X/Y titolo, follow+offset network. Restano attivi: scala titolo/network (P14: ridimensionano gli SLOT Card con UN solo fit del buffer originale â€” titolo bottom-center su inchiostro reale, mai whitespace-as-logo), scala genere (P15: dimensiona il badge standard principale nella banda sotto-card), extra, qualitÃ , separati, blur/tinta/ombre. La matematica auto aspect Standard NON decide la misura Card: lo slot base Ã¨ giÃ  grande e l'auto titolo vale 100 neutro (come Fresh, byte-identico a esplicito 100) |
| Titolo/provider Card grandi (P14) | slot titolo bottom-CENTER dentro la card: 75% larghezza card (70-80% richiesti, aspect intatta), altezza legata alla fascia bassa (portrait 20% altezza card, landscape 40% â€” stessa resa assoluta sulla card 16:9 bassa); scala titolo (`scale`, null = 100 neutro) ridimensiona lo slot, UN solo fit shrink-only del buffer ORIGINALE (mai il bitmap Standard pre-ridotto), trim del padding trasparente + centratura sull'inchiostro misurato con padding basso reale. Slot provider allargato alla griglia sinistra (portrait 196Ã—120, landscape 260Ã—100, `pRight <= card.x` a livello slot; dal P17 il piazzamento puÃ² superarlo SOLO nella fascia sotto-card, mai dentro l'arte); `netscale` (valori salvati preservati) ingrandisce lo slot, UN solo fit con upscale limitato allo slot; la banda meta parte a destra del mark reale (mai overlap). NESSUN nuovo parametro: `scale`/`netscale` esistenti in preview/Stremio invariati |
| Persistenza | NESSUN nuovo campo: `posterLayout`/`posterFreshScope` esistenti (flat + `landscape`) coprono giÃ  le Card per-titolo, default, token e stash cambio-formato (`EditView` generico). Preview/default-preview/Stremio emettono gli ID correnti intatti (contratto P1, testato) |
| Chiavi i18n | `ui.posterLayoutProviderGlass`/`ui.posterLayoutNuvio`/`ui.posterLayoutStremio` (nomi propri identici in tutte le lingue) + `ui.posterLayoutScope`/`ui.posterLayoutScopeHint`/`ui.posterLayoutCardHint` (localizzate, 18 dizionari) |
| Voto Card aggregato (P8) + badge standard (P15) | Media aritmetica pari dei provider selezionati disponibili normalizzati a /10 (`aggregateCardRating` in `card-layout.ts`: separati e media ordinaria giÃ  /10 dal fetch MDBList, custom `percent` 0-100 â†’ /10, scale ignote fail-closed, duplicati contati una volta, cap 5 condiviso, zero/non-finiti esclusi, nessun arrotondamento intermedio â€” solo il display a 1 decimale). P15: l'aggregato alimenta il renderer standard esistente (`renderGenreBadge` via `renderCardMainBadge` nel service â€” MAI un secondo renderer genere/stelle/anno Card) con toggle genere/anno raw pre-soppressione (badge combinato + separati, esplicito utente; deviazione dalla soppressione bottom standard giustificata: banda sotto-card e riga a filo non collidono) e stile/font/colori/scala standard; arriva al compositore come bitmap giÃ  resa nello slot overlay condiviso (contain centrato nella banda, mai clip/collisioni, colonna brand P14 e titolo intatti). Gli helper custom restano come fallback + superficie unit, il service non li alimenta piÃ¹. Separati opzionali con renderer esistenti (colonna laterale / riga bottom / riga custom, max 5, icone/fonti/ordine invariati, prioritÃ  custom storica, mai due stack) |
| Numerale Card alto/stretto (P9) | OGNI rank 1..20 tiene misura/anchor/baseline verbatim del reference (`sizeSingle`/`sizeDouble`, `xSingle`/`xDouble`, `centerY + size*0.34 + drop` â€” overlap parziale dietro la card Ã¨ il design `cover.js`, vedi rank 2/4/1 negli esempi). Le doppie cifre (10..20) condensano SOLO in larghezza (`CARD_NUMERAL_CONDENSE_X = 0.6`, stesso pattern `scale(<cx> 1)` del numerale Fresh, senza toccare Fresh): mai shrink uniforme (il vecchio gutter-fit rimpiccioliva le doppie portrait 168px â†’ ~91px). Outline uniforme via anello morfologico (dilatazione post-trasformata â€” `vector-effect="non-scaling-stroke"` Ã¨ ignorato da resvg, misurato byte-identico); glow/ombre verbatim per-skin. Misura su inchiostro reale: shift misurato (mai shrink), prima cifra interamente prima della card, seconda a maggioranza visibile, struttura a due masse sulla mask senza ombre (il glow fonde le giunzioni strette). Nessun nuovo parametro/campo/rank oltre 20 |
| Numerale Card LARGE + fix 4 (P16, correzione ciclo 1) | GRANDEZZA: rank 2..20 scalano Ã—`CARD_NUMERAL_ENLARGE` = 1.18 (punto medio della fascia utente 15-20%, misurato su inchiostro reale entrambi i formati) con stroke proporzionale; rank 1 RESTA verbatim pre-P16 (size/stroke/anchor originali, baseline con la sua misura â€” "1 andava bene come prima", utente). Anchor/tracking/baseline/condensazione base invariati, occlusione SOLO naturale per ordine layer (numerale prima della card, mai crop del viewport, MAI shift forzato per indurre tuck â€” "NON obbligatoriamente sotto il poster"). OUTLINE UNICO singoli+doppie: le singole non sono piÃ¹ `<text>` stroked â€” resvg strokeggia ogni sottopercorso del font separatamente e i contorni del "4" Inter si sovrappongono dentro il glifo, dipingendo segmenti interni spuri (causa misurata: rogue px su old senza filtri, zero sul ring; i counter legittimi restano vuoti). L'anello deriva dalla silhouette UNITA (stessa pipeline delle doppie, hue/gradienti/glow per-skin invariati, counter 6/8/9/0 mai riempiti). CONDENSA ADATTIVA: se a 0.6 la seconda cifra resta <50% visibile (portrait "20" ingrandito, giÃ  marginale in P9), retry a 0.55/0.5/0.45 STESSA altezza finchÃ© le due masse + prima-prima-card + seconda-maggioranza passano (primo step valido vince, oltre = omesso). Fit misurato su singole (core dentro il canvas) come sulle doppie. Nessun nuovo parametro/campo/rank oltre 20 |
| Provider dentro la cornice (P17, contour BLOCCATO) | PROVIDER (consegnato): il mark scivola leggermente verso il centro (`placeCardProviderMark`: origine a `cardProviderMinLeft` = rima interna cornice + margine proporzionale `max(6, CW/125)`, taglia P14/`netscale` intatte, sotto il rank) e puÃ² superare `card.x` SOLO nella fascia strettamente sotto-card (mai dentro l'arte; se i due vincoli sono incompatibili a taglia piena â€” landscape 150%+ â€” vince l'arte senza shrink). Banda meta sempre dopo il mark reale + gap; posizione mai dipendente dal badge (niente salti). CONTOUR (non consegnato, bloccato con evidenze): il ripristino del pieno `stroke-width` via anello simmetrico (`dilate`Â±`erode`) Ã¨ stato prototipato e MISURATO (spessore steli piatti = vecchio totale su 1/4/7/11/20 entrambi i formati) ma rompe 5 garanzie esistenti â€” rogue interni sul diagonale del 4 per inflazione del kernel quadrato (~Ã—1.4), fori piccoli parzialmente riempiti dal `dilate`, ombra piÃ¹ forte che riempie la valle tra cifre e il counter dello 0 (PNG diagnostici + log in temp `p17/`); l'unione a due bande risolve i fori ma non diagonale/valle/ombra. Nessun test indebolito: l'anello P16 resta, il task contour va rideciso (tolleranza diagonale o peso ridotto esplicito). Nessun nuovo parametro/campo |
| Tinta fissa provider-glass (palette brand, mai pixel) | SOLO cornice/sfondo vetro `provider-glass` (atmosfera + body + sheen/rim via `brandTintPalette`): tinta da palette FISSA 8 provider per identitÃ  brand giÃ  risolta (`provider-brand-palette.ts`, chiave canonica `networkKey` del resolver esistente â€” stessi alias/prioritÃ  del logo disegnato: NOW/Sky â†’ `sky`, HBO/Max â†’ `hbo`, Prime/Amazon â†’ `prime`; NESSUN nuovo matcher, NESSUN campionamento pixel da logo/artwork, NESSUN fetch in piÃ¹). Palette approvata: Netflix `#E50914`, Prime Video `#00A8E1`, Disney+ `#176BCA`, HBO/Max `#7138E8`, Apple TV `#A8ADB5`, Paramount+ `#0064FF`, Crunchyroll `#F47521`, NOW `#00D98B`; provider non listati/assenti (inclusi i fallback TMDB per network ignoti, a prescindere dai loro pixel) = neutro `#707780` dal ramo dedicato (`resolveProviderGlassSkinAccent`, MAI il generico `#555555` che resta per Nuvio/gli altri percorsi). Precedenza: `ac=`/mapping manuale valido vince sempre (contratto pubblico invariato); manuale invalido = ignorato (lookup brand, poi neutro). Il numerale resta cristallo neutro (`cardNumeralMaterial` ignora l'accent per `provider-glass` â€” la palette non ricolora mai i numeri). Nuvio (nero pieno) e Stremio (viola fisso) byte-identici; Fresh/Standard invariati. Nessun nuovo parametro query/config/store |

## Preset personali: indipendenza del look salvato

Ogni preset personale possiede l'intera ricetta visiva del formato in editing (mai il look precedente): badge/classifica/gradienti/trasformazioni + presentazione ranking (`posterLayout`/`posterFreshScope`) + stile extra standalone (`extraBadgeStyle`) + classificazione (`ageBadge`/`ageCountry`/`ageBadgeStyle`). Chiavi opzionali con nomi/enum del backend (validazione only): gli snapshot legacy senza chiavi restano validi e risolvono i canonici di fabbrica (standard/ranked/extra-null-segui-own-rank/off/IT/standard â€” stessa fonte di `useDefaults`), mai il live precedente nÃ© euristiche sul nome; i valori espliciti (inclusi i `null` canonici) sono onorati verbatim. Snapshot mai riscritti su render/apertura: normalizzazione pura ai bordi capture/apply/thumb/import (`normalizePersonalPreset` + `PERSONAL_FLAT_TO_LANDSCAPE` in `visual-presets.ts`; il contratto ready/per-titolo con la mappa `PRESET_FLAT_TO_LANDSCAPE` congelata resta byte-identico). Fuori dal perimetro (preservati verbatim come i ready): `ratingSources` (senza chiave profilo), `logoAlign` + fit flag (toggle globali), `posterShape` (delivery), credenziali/config provider/cataloghi/regione/userid (mai contenuto preset). Contratto sessione invariato: lo staged normalizza `freshScope "all"` â†’ `"ranked"` per ogni seed (ranked-only), quindi i personali salvati portano `ranked` come qualsiasi altro edit.

## Files coinvolti

- `src/components/EditView.tsx` â€” preview WYSIWYG (singolo `<img src={previewUrl}>`)
- `src/lib/context.tsx` â€” stato, URL builder, localStorage
- `src/lib/poster-url.ts` â€” `buildPreviewUrl()`, `buildUrlPattern()` (parametri client â†’ URL server)
- `src/lib/badges.ts` â€” server-side SVG (bottomGradientSVG morto; `cinematicVignetteSVG` + `topShadeSVG` per l'ombra superiore `ts`/`tsh`)
- `src/lib/svg-badge.ts` â€” server-side SVG raw badges (renderGenreBadge, renderRankingBadge, renderExtraBadge) + Resvg rendering (font risolti via `FONT_FILES`, nessun embedding negli SVG; vale anche per la riga multi-rating)
- `src/lib/multi-rating-renderer.ts` â€” riga pill custom rating (`renderMultiRatings`, `MAX_CUSTOM_RATINGS`)
- `src/lib/separate-rating-renderer.ts` â€” stack colonna separati (`renderSeparateRatingStack`, bitmap unico a larghezza uniforme, logo sopra/punteggio sotto)
- `src/lib/custom-rating/` â€” provider server-side (`fetchCustomRatings`, `resolveCustomRatingConfig`, `formatRating`)
- `src/lib/ratings.ts` â€” aggregatore voti (`fetchAggregatedRating`: routing per selezione â€” Cinemeta primario + join diretto senza fonti MDBList-exclusive, MDBList solo per gli irrisolti; cache solo base provider mai voto diretto; negativa con fallback nativo; budget 60/40 senza floor, `resolveRatingSources`, `pickSeparateRatings`/`formatSeparateValue`)
- `src/lib/cinemeta.ts` â€” voto IMDb gratis senza chiave (meta movie/series + fallback tipo, miss su meta vuoto; primario imdb-family quando richiesto; waiter coalesced abort-safe via `raceWithAbort`)
- `src/lib/simkl.ts` â€” voto Simkl diretto (BYOK, redirect 301 + details; solo se `simkl` in `rsrc`)
- `src/lib/anime-ratings.ts` â€” voti anime diretti (AniZip mapping tmdbâ†’imdb con fallback + AniList GraphQL + Kitsu REST; solo se `anilist`/`kitsu` in `rsrc`). `anilist`/`kitsu`/`simkl` NON arrivano da MDBList: il parse resta per compatibilitÃ 
- `src/lib/badge-priority.ts` â€” logica prioritÃ  badge (condivisa)
- `src/lib/badge-labels.ts` â€” label pure client-safe (match studio/network, label premi/nomination, QID regex; foglia senza import server, in RENDER_FILES)
- `src/lib/award-ids.ts` â€” liste ID premi curate (Oscar/Globe/Emmy/Cannes/Venezia, namespace film/serie separati, update annuale; in RENDER_FILES)
- `src/lib/logo-layout.ts` â€” geometria condivisa logo preview/server
- `src/lib/gradient-presets.ts` â€” preset sfumatura Naturale/Colore/Nero (solo client) + regola pristine al cambio artwork
- `src/app/api/poster/[type]/[id]/route.ts` â€” composizione poster finale (preview + Stremio usano la stessa route)
- `src/lib/poster-params-hardening.ts` â€” allowlist cache key, quantizzazione presets, palette `ac`, canonicalizzazione `extra`, strip override keyless (in RENDER_FILES)
- `src/lib/stremio-poster-params.ts` â€” `compactTuning`: omette il tuning numerico senza `config` (in RENDER_FILES)
- `e2e/FlameForge-visual.spec.ts` â€” test di regressione visiva (screenshot) per poster e interfaccia
- `e2e/FlameForge-smoke.spec.ts` â€” smoke test funzionali

> Dopo ogni modifica ai parametri di resa visiva in QUALSIASI file qui elencato, segui il workflow in `visual-testing.md`.

