# Founder Schema Annotations

Date: 2026-06-19
Branch: apverse-labs-RE
DB: foofoo-staging (kwypxyqxojauhiehuirz)
Purpose: Permanent reference capturing the content of 21 internal annotation
columns (across 8 RE tables) before they are renamed to a `_FounderInfoOnly`
suffix under SCHEMA-RE-021. These columns hold founder/design-intent notes
used to build and explain the RE, not data the app reads at runtime.

Note on format: several of these columns are templated (a small number of
distinct values repeated across many rows) rather than truly per-row unique.
Where that's the case, this doc collapses the presentation to the distinct
values plus a cross-reference, instead of dumping every row, so it stays
useful as a reference rather than a multi-thousand-line echo of the table.

---

## 1. re_cohorts (2,952 rows — templated, not per-row unique)

| Column | Distinct values | Content |
|---|---|---|
| `main_meal_vs_addon_rule` | 1 (constant) | "Weekly plan columns store main family meal classes only; dependent/lifecycle needs are in add-on columns and Household_Addon_Component_Plan." |
| `planning_confidence` | 1 (constant) | "safe prior; personalize with behavior after onboarding swipes" |
| `state_signature_notes` | 36 (one per state/UT) | Free-text state food signature, identical to `re_states.behavioral_notes` for the same state — see §3 for the full list rather than duplicating here. |
| `household_addon_logic` | 6 | See table below. |

`household_addon_logic` distinct values:
- `ADD_TODDLER_MILD_MINI_PLATE|ADD_DIABETIC_LOW_GI_SWAP|ADD_ELDERLY_SOFT_PROTEIN_SIDE as applicable`
- `Infant 0-6m: no solid meal; mother support class`
- `LD_CHILD_MILD_PLATE`
- `LD_ELDERLY_SOFT_DIGESTIVE`
- `LD_PREGNANCY_BALANCED`
- `No separate child/elder add-on`

---

## 2. re_main_cohorts.routing_notes (5 rows)

| main_cohort_id | main_cohort_label | routing_notes |
|---|---|---|
| MC1 | Just me / shared adult household | Then ask cooking system, diet/nonveg, health/fitness, origin-current city. |
| MC2 | Couple household | Then ask baby age if selected, food restrictions, nonveg frequency, cook availability, origin-current city. |
| MC3 | Family with children | Children-specific food becomes add-on component; main plan remains family meal. |
| MC4 | Joint / elders / care household | Elder/recovery food becomes add-on component unless the whole household follows it. |
| MC5 | Special goal or kitchen operating mode | This can be selected first or captured as overlay after MC1-MC4. Do not force user to browse all detailed personas. |

---

## 3. re_states — behavioral_notes + planning_note (36 rows)

`planning_note` is constant across all 36 rows: "State signature provides
main meal class pools. Member/lifecycle add-ons are handled separately in
Addon_Component_Class_Master."

`behavioral_notes` per state/UT (also mirrored in `re_cohorts.state_signature_notes`):

| state_id | state_ut | behavioral_notes |
|---|---|---|
| S01 | Andhra Pradesh | Rice, pappu, pulusu, idli/dosa, chicken/fish in many urban households. |
| S02 | Arunachal Pradesh | Rice, boiled greens, pork/chicken/fish in many communities; city access changes packaged snacks. |
| S03 | Assam | Rice, tenga fish, pork/chicken among communities, tea-time snacks. |
| S04 | Bihar | Rice-roti, sattu, litti, dal-bhat; fish/chicken/egg varies by community and city. |
| S05 | Chhattisgarh | Rice and dal-sabzi; local greens, chila, fara; nonveg moderate in urban families. |
| S06 | Goa | Rice, fish curry, xacuti/vindaloo community-specific; bread and cafe influence. |
| S07 | Gujarat | High vegetarian/Jain influence, thali, farsan, khichdi-kadhi; nonveg pockets exist but not default. |
| S08 | Haryana | Wheat, dairy, paratha, roti-sabzi; nonveg lower in household defaults but urban pockets exist. |
| S09 | Himachal Pradesh | Wheat-rice, rajma, madra, siddu; mutton/chicken in some weekend patterns. |
| S10 | Jharkhand | Rice, roti, saag, litti/sattu influence; chicken/fish/egg moderate. |
| S11 | Karnataka | Idli/dosa, rice-sambar, ragi/millet, coastal fish, chicken biryani in urban pattern. |
| S12 | Kerala | Rice, appam/puttu/idiyappam, coconut curries, fish and meat in many households. |
| S13 | Madhya Pradesh | Poha, roti-sabzi, dal-rice, dal-bafla weekend; nonveg pockets in cities. |
| S14 | Maharashtra | Poha, bhakri, varan-bhaat, pitla; coastal fish and urban mixed food culture. |
| S15 | Manipur | Rice, eromba, fish, pork/chicken in many households; fermented foods. |
| S16 | Meghalaya | Rice, pork/chicken/fish, boiled/stewed foods, momos/noodles urban. |
| S17 | Mizoram | Rice, bai, pork/chicken, bamboo shoot and boiled food patterns. |
| S18 | Nagaland | Rice, smoked pork, axone, bamboo shoot; nonveg regular in many communities. |
| S19 | Odisha | Rice, dalma, pakhala, fish, chenna sweets; fish common in coastal/city households. |
| S20 | Punjab | Wheat, dairy, paratha, rajma/chole; chicken/mutton present but not universal household default. |
| S21 | Rajasthan | Wheat/millet, dal-baati, gatte, ker-sangri; strong veg defaults, nonveg pockets. |
| S22 | Sikkim | Rice, thukpa, momos, mixed veg/meat; city Buddhist/Nepali/Tibetan influence. |
| S23 | Tamil Nadu | Idli/dosa, sambar/rasam rice, curd rice; chicken/fish/egg common depending household. |
| S24 | Telangana | Rice, pappu, dosa/idli, Hyderabadi biryani, chicken/mutton/egg in many urban households. |
| S25 | Tripura | Rice, fish, Bengali and Northeast overlap; nonveg high in many households. |
| S26 | Uttar Pradesh | Roti-sabzi, dal-rice, poori-kachori, chaat; nonveg pockets, especially cities/communities. |
| S27 | Uttarakhand | Wheat-rice, dal, pahadi grains, gahat, light dinners; chicken/mutton moderate. |
| S28 | West Bengal | Rice, dal, bhaja, fish, sweets; eggs/chicken common urban options. |
| S29 | Andaman & Nicobar Islands | Rice, seafood, pan-Indian migrant influences, coconut/coastal patterns. |
| S30 | Chandigarh | North Indian dairy-wheat urban pattern with high eating-out exposure. |
| S31 | Dadra & Nagar Haveli and Daman & Diu | Gujarati-Maharashtrian-coastal mix, veg plus fish in coastal communities. |
| S32 | Delhi | Pan-Indian metro; paratha, chole, rajma, delivery, tandoori/grill, health bowls. |
| S33 | Jammu & Kashmir | Rice/wheat, rajma, haak, rogan josh/yakhni in communities, cold-weather meals. |
| S34 | Ladakh | Barley/wheat, thukpa, momos, soups, mutton/chicken in cold climate. |
| S35 | Lakshadweep | Rice, coconut, tuna/fish, seafood; island-specific simple meals. |
| S36 | Puducherry | Tamil-French/coastal influence; rice, idli/dosa, fish/chicken, cafe influence. |

---

## 4. re_meal_classes — behavioral_meaning, example_dishes, db_use_note (130 rows)

`behavioral_meaning` follows a fixed template per row: "Behavioral class for
{class_name}; use as class-level preference, not single-dish preference." —
not reproduced per-row here since it's mechanically derived from `class_name`.

`db_use_note` has 3 distinct values across the 130 rows:
- "Primary meal class. Join to Class_Dish_Options for exhaustive dishes." (118 rows — standard meal classes)
- "Dependent/lifecycle-specific add-on only." (12 rows — infant/lactation-style classes embedded in this table)
- "Do not schedule this as a class. Resolve into concrete classes like LD_DAL_ROTI_SABZI + LD_RAJMA_CHOLE_LEGUME + DN_LIGHT_DAL_RICE." (1 row — composite/placeholder class)

`example_dishes` is genuinely per-row unique (curated dish examples per meal
class) — full list (130 rows, `meal_class_code` | `class_name` | `example_dishes`):

| meal_class_code | class_name | example_dishes |
|---|---|---|
| BF_BREAD_MODERN_FAST | Bread and modern fast breakfast | Vegetable sandwich; Toast butter jam; Peanut butter toast; Cornflakes milk; Cheese toast; Banana toast; Jam bread; Club sandwich |
| BF_CHILLA_PROTEIN | Protein chilla or puda breakfast | Besan chilla; Moong dal chilla; Oats chilla; Vegetable puda; Paneer chilla; Pesarattu; Sprout chilla; Jowar chilla |
| BF_DIABETIC_LOW_GI | Diabetic low-GI breakfast | Methi chilla; Oats upma; Ragi dosa; Vegetable dalia; Besan roti; Moong dal dosa; Sprouts poha; Paneer bhurji roti |
| BF_EGG_FAST | Egg quick breakfast | Masala omelette; Egg bhurji; Bread omelette; Boiled eggs; Egg paratha; Akuri; Egg dosa; Egg sandwich |
| BF_FASTING_PHALAHARI | Fasting breakfast | Sabudana khichdi; Rajgira chilla; Kuttu paratha; Fruit curd; Makhana; Samak rice upma; Singhara cheela; Peanut potato vrat bowl |
| BF_FERMENTED_CREPE_PAN | Fermented pan crepe breakfast | Plain dosa; Masala dosa; Set dosa; Neer dosa; Uttapam; Appam; Adai; Pesarattu |
| BF_FIELD_WORK_HEAVY | Field-work heavy breakfast | Paratha curd eggs; Poori sabzi; Idli vada sambar; Poha plus sprouts; Egg paratha; Chole kulcha; Dalia plus banana; Bhakri pitla breakfast |
| BF_FRIED_FESTIVE | Fried festive breakfast | Poori bhaji; Luchi aloor dom; Bedmi poori; Kachori sabzi; Chole bhature; Puri shrikhand; Mangalore buns; Sattu kachori |
| BF_INFANT_6M_SOFT | Infant 6m+ soft food add-on | Mashed dal rice; Suji kheer; Ragi porridge; Mashed banana; Apple puree; Soft khichdi; Mashed sweet potato; Rice kanji |
| BF_JAIN_BREAKFAST | Jain no-root breakfast | Jain poha; Dhokla no garlic; Thepla curd; Handvo no onion garlic; Fruit nuts; Moong dal chilla no onion; Jain upma; Fafda chutney no garlic |
| BF_KID_TIFFIN | Kid-friendly breakfast or tiffin | Mini idli; Paratha roll; Veg sandwich; Cheese dosa; Poha balls; Idli podi; Mini uttapam; Stuffed cheela roll |
| BF_LACTATION_MOTHER | Lactation or postpartum breakfast | Dalia with milk; Panjiri portion; Methi paratha; Ajwain paratha; Gond ladoo milk; Moong dal chilla; Ragi malt; Dry fruit milk |
| BF_MILLET_TRADITIONAL | Millet traditional breakfast | Ragi dosa; Ragi mudde sambar; Jowar bhakri; Bajra rotla; Kodo upma; Ragi malt; Thalipeeth; Bajra khichdi |
| BF_OATS_MUESLI_FIT | Oats, muesli and fitness bowl | Oats porridge; Overnight oats; Muesli curd bowl; Smoothie bowl; Ragi porridge; Quinoa poha; Oats idli; Millet flakes bowl |
| BF_OUTSIDE_CAFE_BRUNCH | Outside or cafe brunch | Pav bhaji brunch; Cafe dosa; Chole kulcha; Grilled sandwich; Paratha cafe platter; English breakfast veg; Egg brunch; Cafe poha |
| BF_PLAIN_FLATBREAD_SUBZI | Plain flatbread with sabzi or curd | Phulka with aloo sabzi; Roti bhaji; Methi thepla curd; Jowar bhakri chutney; Chapati upma; Parotta kurma; Tawa roti pickle; Bajra rotla curd |
| BF_POHA_CHIVDA_LIGHT | Flattened rice light breakfast | Kanda poha; Batata poha; Indori poha; Chuda matar; Chura dahi gur; Aval upma; Chirer pulao; Dadpe pohe |
| BF_REGIONAL_BIHAR_EAST | Bihar-East rustic breakfast | Litti chokha; Sattu paratha; Chura dahi gur; Ghugni chura; Dahi chuda; Sattu drink; Pitha; Chana ghugni |
| BF_REGIONAL_NORTHEAST | Northeast rice and local breakfast | Rice porridge; Sticky rice; Black rice kheer; Lai patta stir fry rice; Smoked meat rice; Rice pancake; Chak-hao pudding; Bamboo shoot rice |
| BF_REGIONAL_PUNJAB_HARYANA | Punjab-Haryana dairy heavy breakfast | Paratha curd; Makki roti white butter; Paneer bhurji roti; Lassi breakfast; Missi roti; Methi paratha; Dahi aloo paratha; Chole kulche |
| BF_RICE_LEFTOVER_BREAKFAST | Rice leftover breakfast | Lemon rice; Curd rice; Tamarind rice; Tomato rice; Pakhala morning; Phodnicha bhaat; Puliyogare; Coconut rice |
| BF_SKIP_MINIMAL | Skipped or minimal breakfast | Tea only; Coffee banana; Milk banana; Chaas fruit; Dry fruit handful; Protein curd bowl; Toast only; Fruit only |
| BF_SPROUTS_FRUIT_CURD | Sprouts, fruit and curd breakfast | Sprouts chaat; Fruit bowl; Fruit curd bowl; Dahi chana; Soaked nuts banana; Chana salad; Papaya curd; Apple peanut bowl |
| BF_STEAMED_FERMENTED_LIGHT | Steamed fermented light breakfast | Idli; Rava idli; Khaman dhokla; White dhokla; Idiyappam; Sannas; Pundi gatti; Kanchipuram idli |
| BF_STUFFED_FLATBREAD | Stuffed flatbread breakfast | Aloo paratha; Gobi paratha; Mooli paratha; Paneer paratha; Sattu paratha; Methi paratha; Pyaz paratha; Bathua paratha |
| BF_UPMA_DALIA_SEVAI | Upma, dalia and sevai breakfast | Rava upma; Vegetable upma; Dalia upma; Broken wheat porridge; Sevai upma; Lapsi; Ragi upma; Sooji vegetable porridge |
| DN_CHILD_FRIENDLY_DINNER | Child-friendly dinner | Mild pulao; Mini paratha curd; Dal rice ghee; Paneer roll; Soft dosa; Khichdi; Mild pasta; Curd rice |
| DN_CURD_RICE_LIGHT | Curd rice light dinner | Curd rice; Mosaranna; Dahi rice; Tempered curd rice; Curd rice pickle; Pomegranate curd rice; Millet curd rice; Bagala bath |
| DN_EARLY_ELDERLY_DINNER | Early elderly dinner | Soft khichdi; Thin dal rice; Dalia; Idli sambar soft; Lauki soup; Curd rice; Moong dal chilla soft; Vegetable stew |
| DN_FAMILY_COMFORT_MEAL | Family comfort dinner | Dal roti sabzi; Rajma rice; Sambar rice; Fish curry rice; Chicken curry roti; Paneer roti; Khichdi kadhi; Pulao raita |
| DN_FASTING_DINNER | Fasting dinner | Samak khichdi; Kuttu roti aloo; Sabudana khichdi; Fruit curd; Makhana curry; Rajgira paratha; Vrat kadhi; Sweet potato chaat |
| DN_GRILLED_TIKKA_BOWL | Grilled tikka bowl dinner | Paneer tikka bowl; Chicken tikka bowl; Fish tikka salad; Tofu tikka bowl; Soya tikka bowl; Egg salad bowl; Tandoori chicken salad; Paneer millet bowl |
| DN_KHICHDI_SOUP | Khichdi or soup dinner | Moong khichdi; Dalia soup; Vegetable soup; Palak soup dal; Rasam rice; Curd khichdi; Millet khichdi; Lauki soup |
| DN_LEFTOVER_THALI | Leftover thali dinner | Leftover dal roti; Sabzi roll dinner; Rice curd dinner; Dal paratha; Leftover pulao raita; Roti upma dinner; Khichdi from dal rice; Bhaji pav from sabzi |
| DN_LIGHT_DAL_RICE | Light dal rice dinner | Moong dal rice; Varan bhaat; Masoor dal rice; Dal soup rice; Dal palak rice; Dal khichdi; Dal chawal curd; Thin dal rice |
| DN_LIGHT_ROTI_SABZI | Light roti sabzi dinner | Roti bhindi; Roti lauki; Roti beans; Roti cabbage; Roti palak; Roti tinda; Roti turai; Roti mixed veg |
| DN_LOW_CARB_DINNER | Low-carb dinner | Paneer salad; Chicken soup salad; Tofu stir fry; Egg bhurji salad; Fish stew vegetables; Soya salad; Dal soup paneer; Sprouts paneer bowl |
| DN_MILLET_LIGHT_DINNER | Millet light dinner | Ragi mudde sambar; Bajra khichdi; Jowar roti sabzi; Millet upma; Ragi kanji; Bajra roti kadhi; Kodo khichdi; Ragi dosa dinner |
| DN_NONVEG_HOME_DINNER | Nonveg home dinner | Chicken curry roti; Fish curry rice; Egg curry rice; Chicken stew; Fish fry rice; Mutton curry dinner; Prawn curry rice; Keema roti |
| DN_ONE_POT_DINNER | One-pot dinner | Veg khichdi; Chicken pulao cooker; Egg rice; Sambar rice one-pot; Pulao raita; Dal dhokli; Tehri; Millet khichdi |
| DN_WEEKEND_INDULGENCE | Weekend indulgence dinner | Biryani dinner; Paneer butter masala naan; Butter chicken naan; Pav bhaji; Pizza night; Chole bhature dinner; Mutton curry dinner; Fish thali |
| LD_BENGALI_FISH_MEAL | Bengali fish meal | Rohu jhol; Katla kalia; Ilish bhapa; Chingri malai curry; Macher jhol; Doi maach; Pabda jhal; Fish fry dal bhaat |
| LD_BENGALI_VEG_DAL_BHAAT | Bengali veg dal bhaat | Moong dal bhaat; Shukto; Aloo posto; Chorchori; Lau ghonto; Begun bhaja dal; Dhokar dalna; Labra |
| LD_BIHAR_LITTI_SATTU | Bihar/Jharkhand litti-sattu meal | Litti chokha; Sattu paratha curd; Dal pitha; Chana ghugni rice; Aloo chokha roti; Bihari kadhi bari; Badi sabzi; Sattu roti platter |
| LD_CHICKEN_BIRYANI_PULAO | Chicken biryani or pulao | Chicken biryani; Hyderabadi chicken biryani; Kolkata chicken biryani; Chicken pulao; Ambur biryani; Thalassery chicken biryani; Lucknowi chicken biryani; Tehri chicken |
| LD_CHICKEN_DRY_FRY | Chicken dry or fry meal | Chicken fry; Chicken sukka; Chicken roast; Pepper chicken; Chicken 65; Tandoori chicken roti; Chicken tikka plate; Koliwada chicken |
| LD_CHICKEN_HOME_CURRY | Chicken home curry | Chicken curry rice; Chicken masala roti; Kosha chicken; Andhra chicken curry; Chettinad chicken; Kori gassi; Chicken korma home; Chicken stew |
| LD_CHILD_MILD_PLATE | Child mild plate | Dal rice ghee; Roti paneer bhurji; Mild pulao; Curd rice; Mini paratha curd; Soft khichdi; Mild pasta veg; Dahi aloo rice |
| LD_COCONUT_VEG_STEW | Coconut vegetable stew | Vegetable stew; Avial; Olan; Kootu curry; Coconut veg kurma; Kadala curry veg plate; Moilee veg; Tendli coconut curry |
| LD_COMMUNITY_RED_MEAT | Community-specific red meat | Beef curry community-specific; Pork curry community-specific; Buff fry community-specific; Pork vindaloo community-specific; Beef roast community-specific; Buff sukka community-specific; Meat stew community-specific; Dry meat chutney |
| LD_DAL_RICE_COMFORT | Dal rice comfort | Arhar dal rice; Moong dal rice; Masoor dal rice; Dal tadka rice; Dalma rice; Varan bhaat; Khichdi kadhi plate; Dal bhat |
| LD_DAL_ROTI_SABZI | Dal roti sabzi plate | Dal roti bhindi; Dal roti aloo gobi; Dal roti lauki; Dal roti beans; Dal roti cabbage; Dal roti methi aloo; Dal roti tindora; Dal roti palak |
| LD_EGG_CURRY_BHURJI | Egg curry or bhurji meal | Egg curry rice; Egg bhurji roti; Egg masala; Anda ghotala; Egg korma; Egg pepper fry; Egg tadka dal; Egg paratha meal |
| LD_EGG_RICE_MEAL | Egg rice meal | Egg fried rice; Egg pulao; Egg biryani; Anda rice; Egg tomato rice; Egg khichdi; Egg curry rice bowl; Egg noodles |
| LD_ELDERLY_SOFT_DIGESTIVE | Elderly soft digestive meal | Moong khichdi; Soft dalia; Lauki dal rice; Curd rice; Vegetable soup dal; Soft phulka dal; Palak dal rice; Idli sambar soft |
| LD_FASTING_MAIN | Fasting main meal | Sabudana khichdi; Kuttu puri aloo; Samak rice khichdi; Rajgira paratha; Makhana curry; Peanut potato curry; Singhara roti; Vrat kadhi |
| LD_FESTIVE_THALI | Festive thali | Puran poli thali; Onam sadya; North Indian thali; Bengali pujo bhog; Gujarati festival thali; Rajasthani thali; Eid biryani platter; Pongal festival meal |
| LD_FISH_CURRY_RICE | Fish curry rice | Fish curry rice; Meen curry rice; Machher jhol; Goan fish curry; Assamese tenga fish; Andhra fish pulusu; Konkani fish curry; Kerala fish curry |
| LD_FISH_FRY_MEAL | Fish fry meal | Pomfret fry; Surmai fry; Bangda fry; Rohu fry; Bombil fry; Nethili fry; Karimeen fry; Fish rawa fry |
| LD_GOAN_XACUTI_CURRY | Goan xacuti or curry meal | Goan fish curry; Chicken xacuti; Prawn balchao; Sorpotel community-specific; Pork vindaloo community-specific; Fish recheado; Crab xec xec; Ros omelette meal |
| LD_GOURD_PUMPKIN_LIGHT | Gourd and pumpkin light sabzi | Lauki chana dal; Kaddu sabzi; Parval curry; Snake gourd poriyal; Bottle gourd kofta light; Tori dal; Ash gourd curry; Kumro chokka |
| LD_GUJARATI_THALI | Gujarati thali | Dal dhokli; Gujarati dal rice; Undhiyu roti; Sev tameta; Kadhi khichdi; Methi thepla shaak; Ringan batata shaak; Handvo kadhi |
| LD_HIGH_PROTEIN_VEG_PLATE | High-protein vegetarian plate | Paneer dal roti; Soya chunk curry rice; Sprouts kadhi plate; Chana paneer salad; Tofu palak roti; Rajma paneer bowl; Moong chilla meal; Curd chana rice |
| LD_HIMALAYAN_THUKPA_MOMO | Himalayan thukpa or momo meal | Vegetable thukpa; Veg momos; Siddu dal; Tingmo curry; Thenthuk; Buckwheat roti curry; Chana madra rice; Gahat dal rice |
| LD_HOME_STYLE_KEEMA | Keema home meal | Mutton keema roti; Chicken keema rice; Egg keema; Keema pav; Keema matar; Soya keema veg; Keema paratha meal; Keema pulao |
| LD_INDO_CHINESE_MEAL | Indo-Chinese meal | Veg fried rice; Veg noodles; Gobi manchurian; Paneer chilli; Chicken fried rice; Chicken noodles; Schezwan rice; Hakka noodles |
| LD_JAIN_NO_ROOT_MAIN | Jain no-root main meal | Jain dal rice; Jain paneer curry; Jain moong sabzi; Raw banana shaak; Lauki no onion garlic; Jain kadhi; Jain pulao; Papad mangodi shaak |
| LD_KADHI_CURD_CURRY | Kadhi and curd curry | Punjabi kadhi; Gujarati kadhi; Rajasthani kadhi; Sindhi kadhi; Mor kuzhambu; Majjiga pulusu; Kadhi pakora; Dahi aloo curry |
| LD_KERALA_MEAT_STEW_ROAST | Kerala meat stew or roast | Chicken stew appam; Beef roast community-specific; Mutton stew; Erachi curry; Malabar chicken curry; Duck roast; Meat cutlet meal; Chicken varutharachathu |
| LD_LACTATION_POSTPARTUM | Lactation postpartum meal | Moong dal khichdi; Dalia with ghee; Ajwain paratha curd; Lauki dal rice; Ragi mudde sambar; Methi dal roti; Chicken soup if eaten; Soft paneer dal |
| LD_LEAFY_GREENS_SAAG | Leafy greens and saag | Palak sabzi; Methi aloo; Sarson ka saag; Lal saag; Amaranth stir fry; Spinach dal; Drumstick leaves poriyal; Gongura pachadi rice |
| LD_LEFTOVER_REUSE | Leftover reuse meal | Dal paratha; Fried rice from leftover rice; Roti upma; Sabzi sandwich; Dal dhokli quick; Khichdi tikki; Curd rice from rice; Chapati roll |
| LD_LIGHT_KHICHDI | Light khichdi meal | Moong dal khichdi; Masala khichdi; Vegetable khichdi; Bajra khichdi; Oats khichdi; Dal khichdi; Pongal; Soft daliya khichdi |
| LD_LOW_CARB_PROTEIN_PLATE | Low-carb protein plate | Paneer stir fry salad; Chicken salad bowl; Egg paneer plate; Tofu veg plate; Sprouts paneer salad; Fish tikka salad; Soya stir fry; Dal soup with salad |
| LD_MAHARASHTRIAN_PITLA_BHAKRI | Maharashtrian pitla bhakri | Pitla bhakri; Zunka bhakri; Varan bhaat; Matki usal; Bharli vangi; Pithla rice; Masale bhaat; Kanda batata rassa |
| LD_MILLET_ROTI_THALI | Millet roti thali | Jowar bhakri pitla; Bajra roti kadhi; Ragi mudde sambar; Bajra rotla ringan; Jowar roti zunka; Makki roti saag; Kodo millet khichdi; Ragi ball curry |
| LD_MIXED_VEG_DRY | Mixed vegetable dry sabzi | Mix veg sabzi; Avial dry; Kadai vegetable; Veg poriyal; Tawa sabzi; Vegetable jalfrezi; Undhiyu light; Kootu dry |
| LD_MODERN_SALAD_BOWL | Modern salad or bowl meal | Paneer salad bowl; Chana quinoa bowl; Millet salad; Burrito bowl veg; Curd rice bowl modern; Sprouts paneer bowl; Tofu salad; Rajma salad bowl |
| LD_MUSLIM_BIRYANI_KORMA | Muslim biryani or korma meal | Mutton biryani; Chicken biryani; Mutton korma; Nihari; Haleem; Kebabs with roti; Yakhni pulao; Keema roti |
| LD_MUTTON_SUNDAY_CURRY | Mutton Sunday curry | Mutton curry; Rogan josh; Mutton kosha; Laal maas; Mutton sukka; Mutton biryani; Mutton yakhni; Goat curry rice |
| LD_NONVEG_LIGHT_SOUP_STEW | Light non-veg soup or stew | Chicken soup; Fish stew; Chicken clear soup; Chicken dalia; Light fish curry rice; Chicken vegetable stew; Bone broth community-specific; Pepper chicken soup |
| LD_NORTHEAST_SMOKED_PORK_MEAT | Northeast smoked pork or meat | Smoked pork bamboo shoot; Pork axone; Eromba with fish; Chicken bamboo shoot; Pork rice meal; Smoked meat stew; Naga pork curry; Mizo bai with meat |
| LD_NORTHEAST_VEG_STEAMED | Northeast veg steamed rice meal | Rice with lai patta; Bamboo shoot veg curry; Iromba veg; Axone veg rice; Boiled greens rice; Chak-hao veg meal; Pumpkin leaves curry; Fermented soya veg meal |
| LD_ODIA_DALMA_PAKHALA | Odia dalma or pakhala meal | Dalma rice; Pakhala bhata; Santula; Aloo bharta pakhala; Badi chura; Besara curry; Saga bhaja; Kanika dalma |
| LD_ODIA_FISH_PAKHALA | Odia fish or pakhala meal | Machha besara; Fish pakhala; Rohu curry rice; Chingudi jhola; Fish fry pakhala; Crab curry rice; Fish dalma side; Dry fish chutney rice |
| LD_ONE_POT_PRESSURE | One-pot pressure cooker meal | Veg pulao cooker; Khichdi cooker; Chicken pulao cooker; Dal dhokli one-pot; Sambar rice one-pot; Tehri; Egg rice one-pot; Millet khichdi cooker |
| LD_OUTSIDE_DELIVERY_INDIAN | Outside or delivery Indian meal | Dal makhani naan; Paneer tikka masala; Butter chicken; Biryani delivery; Chole kulche; South Indian meals; Thali delivery; Rolls and wraps |
| LD_PANEER_HOME_DRY | Paneer home-style dry | Paneer bhurji; Paneer capsicum; Matar paneer dry; Paneer peas sabzi; Palak paneer light; Paneer paratha meal; Tofu bhurji; Paneer tikka roti |
| LD_PANEER_RICH_GRAVY | Paneer rich gravy | Paneer butter masala; Shahi paneer; Kadai paneer gravy; Matar paneer gravy; Paneer lababdar; Malai kofta; Paneer pasanda; Paneer makhani |
| LD_PASTA_PIZZA_MODERN | Pasta or pizza modern meal | White sauce pasta; Red sauce pasta; Veg pizza; Paneer pizza; Chicken pasta; Macaroni; Pesto pasta; Garlic bread meal |
| LD_PRAWN_CRAB_COASTAL | Prawn or crab coastal meal | Prawn curry; Prawn fry; Crab curry; Prawn pulao; Goan prawn curry; Chemmeen curry; Koliwada prawns; Crab masala rice |
| LD_PREGNANCY_BALANCED | Pregnancy balanced meal | Dal palak rice; Paneer roti sabzi; Egg curry rice if eaten; Khichdi curd; Chana salad roti; Fish curry rice if eaten; Dalia khichdi; Sprouts dal plate |
| LD_PUNJABI_RICH_VEG | Punjabi rich veg meal | Sarson saag makki roti; Chole kulche; Rajma chawal; Kadhi chawal; Paneer makhani; Dal makhani; Amritsari aloo kulcha; Maa chole di dal |
| LD_RAJASTHANI_DAL_BAATI | Rajasthani dal baati or gatte | Dal baati churma; Gatte ki sabzi; Ker sangri; Panchmel dal; Papad ki sabzi; Bajra roti lehsun chutney; Mangodi sabzi; Raabdi bajra |
| LD_RAJMA_CHOLE_LEGUME | Rajma, chole and legumes | Rajma rice; Chole rice; Kala chana curry; Lobia curry; Matki usal; Vatana usal; Ghugni; Chana masala roti |
| LD_RECOVERY_SOFT_PROTEIN | Recovery soft protein meal | Moong dal soup; Chicken soup if eaten; Soft paneer bhurji; Curd rice; Palak dal; Egg drop soup if eaten; Dalia khichdi; Fish stew if eaten |
| LD_RICE_PULAO_VEG | Vegetable pulao rice meal | Veg pulao; Peas pulao; Jeera rice dal; Ghee rice kurma; Tomato rice; Coconut rice; Vegetable tahiri; Peanut rice |
| LD_ROOT_TUBER_SABZI | Root and tuber sabzi | Aloo jeera; Arbi masala; Sweet potato sabzi; Suran curry; Aloo posto; Aloo capsicum; Kachaloo; Kappa puzhukku |
| LD_SEMI_GRAVY_VEG | Semi-gravy vegetable curry | Aloo matar; Dum aloo light; Baingan bharta; Baingan curry; Veg korma light; Veg kurma; Sev tamatar; Bagara baingan |
| LD_SIMPLE_GREEN_VEG_SABZI | Simple green vegetable sabzi | Bhindi sabzi; Lauki sabzi; Turai sabzi; Tinda sabzi; Beans poriyal; Cabbage sabzi; Kundru sabzi; Parwal sabzi; Gawar phali; Capsicum besan |
| LD_SOUTH_CURD_RICE | Curd rice light meal | Curd rice; Bagala bath; Mosaranna; Dahi chawal; Curd rice pickle; Pomegranate curd rice; Tempered curd rice; Thayir sadam |
| LD_SOUTH_SAMBAR_RASAM | Sambar rasam rice meal | Sambar rice; Rasam rice; Kootu rice; Poriyal sambar plate; Sambar sadam; Pappu charu rice; Paruppu rasam; Milagu rasam meal |
| LD_SOUTH_TAMARIND_LEMON_RICE | Tamarind or lemon rice meal | Lemon rice; Puliyodarai; Tamarind rice; Coconut rice; Tomato rice; Mango rice; Peanut rice; Pulihora |
| LD_SOY_TOFU_PROTEIN | Soy, tofu or chaap protein | Soya chaap curry; Tofu stir fry; Soya chunk pulao; Tofu bhurji; Soya keema; Soyabean curry; Tofu palak; Soya tikka roti |
| LD_SUNDAY_OUTSIDE_NONVEG | Sunday outside nonveg | Chicken biryani order; Tandoori chicken order; Mutton curry order; Fish thali outside; Kebab roll; Chicken fried rice; Seafood thali; Butter chicken naan |
| LD_TANDOORI_GRILL_NONVEG | Tandoori or grill nonveg | Tandoori chicken; Chicken tikka roti; Fish tikka; Grilled chicken salad; Tangdi kabab; Afghani chicken; Tandoori fish; Seekh kabab meal |
| LD_TEEN_HIGH_CALORIE | Teen or active high-calorie meal | Rajma rice extra curd; Paratha paneer; Chicken rice bowl; Pulao raita; Chole rice; Paneer roll meal; Egg curry rice; Dal rice ghee |
| LD_VEG_BIRYANI_SPECIAL | Veg biryani special | Veg biryani; Hyderabadi veg biryani; Kathal biryani; Paneer biryani; Mushroom biryani; Tehri; Kolkata veg biryani; Awadhi veg biryani |
| LD_WEEKEND_SPECIAL_REGIONAL | Weekend regional special | Dal bafla; Misal pav meal; Bisi bele bath; Hyderabadi bagara rice; Kashmiri dum aloo; Chaman qaliya; Bamboo shoot curry; Chak-hao meal |
| SN_BAKERY_CAFE | Bakery or cafe snack | Veg puff; Chicken puff; Muffin; Croissant; Garlic bread; Cafe sandwich; Bun maska; Tea cake |
| SN_CURD_CHAAS_LASSI | Curd, chaas or lassi snack | Chaas; Lassi; Sweet lassi; Masala buttermilk; Curd bowl; Dahi chana; Mattha; Solkadhi |
| SN_EGG_SNACK | Egg snack | Boiled egg; Egg toast; Egg roll mini; Masala omelette snack; Egg chaat; Deviled egg Indian; Egg bhurji pav; Egg sandwich |
| SN_FASTING_SNACK | Fasting snack | Makhana; Sabudana vada; Fruit curd; Peanut laddoo; Rajgira chikki; Sweet potato chaat; Banana chips vrat; Samak tikki |
| SN_FRIED_PAKORA_SAMOSA | Fried pakora or samosa snack | Samosa; Aloo pakora; Onion pakora; Mirchi bhajji; Bread pakora; Kachori snack; Vada pav; Banana chips |
| SN_FRUIT_CHAAT | Fruit chaat snack | Fruit chaat; Papaya bowl; Banana peanut; Apple slices; Guava chaat; Orange bowl; Pomegranate curd; Seasonal fruit plate |
| SN_HEALTHY_PROTEIN_SNACK | Healthy protein snack | Paneer cubes; Greek curd bowl; Sprouts chaat; Egg whites if eaten; Chana salad; Tofu cubes; Chicken salad mini; Roasted soy nuts |
| SN_KIDS_TIFFIN_SNACK | Kids tiffin snack | Mini sandwich; Paneer roll; Cheese toast; Dosa roll; Idli bites; Fruit curd; Poha cutlet; Corn chaat |
| SN_LATE_NIGHT_LIGHT | Late night light snack | Milk; Banana; Makhana; Curd; Toast; Fruit bowl; Herbal tea nuts; Small poha |
| SN_LEFTOVER_ROLL | Leftover roll or snack | Roti roll; Sabzi sandwich; Dal cheela leftover; Paratha wrap; Rice cutlet; Chapati chips; Bhaji pav from sabzi; Curd rice cup |
| SN_MILLET_HEALTH_SNACK | Millet health snack | Ragi malt; Jowar puffs; Bajra khakhra; Millet laddoo; Ragi dosa mini; Ragi crackers; Millet upma cup; Rajgira chikki |
| SN_MOMO_NOODLES_SNACK | Momo or noodles snack | Veg momos; Chicken momos; Hakka noodles snack; Maggi; Schezwan noodles; Thukpa cup; Momos soup; Chowmein |
| SN_NAMKEEN_CHIVDA | Namkeen or chivda snack | Poha chivda; Bhujia; Sev murmura; Mixture; Farsan; Roasted makhana namkeen; Peanut chivda; Khakhra bites |
| SN_NONVEG_SNACK | Nonveg snack | Chicken tikka; Fish fry snack; Chicken pakora; Chicken roll; Mutton cutlet; Prawn fry; Kebab snack; Chicken momos |
| SN_NORTHEAST_SNACK | Northeast snack | Momos; Chowmein; Rice cake; Pitha; Smoked meat snack; Black rice pudding; Bamboo shoot pickle rice; Singju |
| SN_OFFICE_PANTRY | Office pantry snack | Tea biscuit; Banana; Roasted chana; Peanuts; Makhana; Fruit bowl; Khakhra; Protein curd cup |
| SN_ROASTED_CHANA_NUTS | Roasted chana or nuts snack | Roasted chana; Peanuts; Makhana roasted; Chana jor; Dry fruit mix; Roasted soy nuts; Masala peanuts; Sprout bhel |
| SN_SOUTH_TIFFIN_SNACK | South tiffin snack | Medu vada; Mini idli; Upma snack; Bonda; Sundal; Paniyaram; Adai mini; Murukku |
| SN_STEAMED_SNACK | Steamed snack | Dhokla; Idli podi; Veg momos; Kozhukattai; Patra steamed; Khandvi; Pitha; Muthia |
| SN_STREET_CHAAT | Street chaat snack | Bhel puri; Pani puri; Sev puri; Aloo tikki chaat; Dahi puri; Papdi chaat; Dahi vada; Ragda pattice |
| SN_SWEET_REGIONAL | Regional sweet snack | Gulab jamun; Rasgulla; Payasam; Sheera; Shrikhand; Puran poli piece; Mysore pak; Modak |
| SN_TEA_BISCUIT_RUSK | Tea biscuit or rusk snack | Chai biscuit; Rusk chai; Marie biscuit; Khari biscuit; Toast chai; Mathri chai; Cream cracker; Bread butter chai |

---

## 5. re_personas — revealed_behavior_summary, recommended_onboarding_path,
   bf/ld/sn/dn_boost_classes (41 rows)

These 4 boost-class columns were already normalized into a junction table
under SCHEMA-RE-019 (`re_persona_boost_classes` or equivalent — see that
schema entry in `SYSTEM_STATE.md`); they are renamed here purely to flag them
as founder-info-only on the source columns, since RE-019 added a normalized
copy but did not remove the original wide columns. The content is per-persona
unique and reproduced below for the founder record.

| persona_id | persona_name | revealed_behavior_summary | recommended_onboarding_path |
|---|---|---|---|
| P01 | Solo student/hostel budget | budget, repeat tolerant; bread/poha breakfast; one-pot or outside dinner | MC1 > SC1A; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P02 | Solo young professional | weekday quick meals, office lunch, dinner light or delivery | MC1 > SC1B; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P03 | Working woman living alone | healthy intent but time-starved; predictable quick classes | MC1 > SC1C; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P04 | DINK couple no children | weekday quick; weekend experimental or outside | MC2 > SC2A; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P05 | Newly married mixed-state couple | alternates two home-state signatures; high discovery need | MC2 > SC2B; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P06 | Couple planning pregnancy | protein, iron, fruits, lower outside food | MC2 > SC2C; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P07 | Pregnant woman household | balanced mild meals, aversion-aware, iron/protein focus | MC2 > SC2D; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P08 | Couple with infant 0-6 months | adult meals quick; infant milk; mother supportive meals | MC2 > SC2E; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P09 | Couple with baby 6-18 months | adult meal plus soft baby add-on; low spice batch cook | MC2 > SC2F; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P10 | Nuclear family with toddler | mild, soft, routine, toddler spillover plate | MC3 > SC3A; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P11 | Nuclear family with school kids | tiffin plus adult dinner, mild but not baby food | MC3 > SC3B; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P12 | Family with teenagers | higher appetite, protein, less repeat tolerance | MC3 > SC3C; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P13 | Joint/multi-generation family | multi-dish meals, elderly and child needs, high coherence | MC4 > SC4A; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P14 | Elderly couple | early dinner, soft, low oil, stable routines | MC4 > SC4B; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P15 | Diabetic / low-GI household | low GI, portioned carbs, protein pairing | MC4 > SC4D; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P16 | Hypertension / heart conscious | low salt/oil, steamed/boiled, fewer fried snacks | MC4 > SC4E; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P17 | Weight loss / calorie conscious | salads, chilla, low-carb dinner, controlled indulgence | MC5 > SC5A; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P18 | Gym/high-protein nonveg or egg-friendly | eggs/chicken/fish/paneer, protein snacks | MC5 > SC5B; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P19 | Vegetarian protein seeker | paneer, soy, dal, sprouts; avoids empty carb plate | MC5 > SC5C; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P20 | Strict Jain household | no onion/garlic/root, hard filters needed | MC5 > SC5D; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P21 | Fasting/ritual observant household | day-specific vrat substitutions | MC5 > SC5E; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P22 | Cook-assisted household: skilled cook | can execute multi-dish regional and weekend specials | MC5 > SC5F; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P23 | Cook-assisted: needs constant instruction | simple repeatable classes, avoid complex regional until trained | MC5 > SC5G; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P24 | Working woman managing cook + office | cook-instruction plan, prep delegation, lunchbox predictability | MC5 > SC5H; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P25 | Maid-dependent minimal cooking / batch cook | batch dal/sabzi, one-pot, leftovers, avoid precision dishes | MC5 > SC5I; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P26 | Budget/value-conscious family | seasonal vegetables, dal, eggs if eaten, low delivery | MC3 > SC3E; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P27 | Premium experimental foodie | regional discovery, high weekend novelty, lower repeat tolerance | MC5 > SC5J; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P28 | Migrant in metro preserving home-state food | home-state staples mixed with current-city lifestyle | MC1 > SC1E; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P29 | Inter-state couple / mixed cuisine household | dual-state rotations across week, weekend swaps | MC2 > SC2G; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P30 | Regular non-veg household | nonveg 3-6 meals/week depending state; weekday egg/chicken, weekend special | MC5 > SC5K; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P31 | Eggitarian / low-meat household | eggs accepted, meat rare/outside, protein bridge | MC5 > SC5L; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P32 | Seafood/coastal non-veg household | fish rice and fish fry frequent; seafood weekend | MC5 > SC5M; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P33 | Mutton/Sunday special non-veg household | weekday veg/egg/chicken, Sunday mutton or biryani | MC5 > SC5N; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P34 | Vegetarian home, occasional outside non-veg | home remains veg; nonveg appears outside/delivery weekend | MC5 > SC5O; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P35 | Child picky eater household | child-safe defaults and adult vegetables hidden/rotated | MC3 > SC3D; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P36 | Recovery/senior digestive light household | soft protein, khichdi, soups, low spice, frequent small meals | MC4 > SC4C; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P37 | Flatmates shared kitchen | shared staples, split groceries, low repeat tolerance, one-pot | MC1 > SC1D; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P38 | Field-work heavy breakfast household | heavier breakfast, late lunch, robust dinner | MC5 > SC5P; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P39 | Desk-job sedentary household | light lunch/dinner, snack control, protein and greens | MC1 > SC1F; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P40 | Home-maker elaborate cooking family | more multi-dish meals and regional specials; weekday home food strong | MC3 > SC3F; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |
| P41 | Composite family: child + diabetic/elderly member | Family main meal is normal dal/roti/rice/sabzi; child/elder/diabetic needs are handled as add-on components and swaps, not as primary meal replacement. | MC4 > SC4F; ask overlays: diet/nonveg, cook system, health/lifecycle, origin-current city |

`bf_boost_classes` / `ld_boost_classes` / `sn_boost_classes` / `dn_boost_classes`
are pipe-delimited meal-class-code lists per persona (already captured in the
normalized junction table per RE-019) — not re-listed here to avoid
duplicating that data twice; see `re_persona_boost_classes` / RE-019 entry in
`SYSTEM_STATE.md` for the structured form.

---

## 6. re_routing_rules — shown_when, maps_to_fields (8 rows)

| rule_id | shown_when | maps_to_fields |
|---|---|---|
| R01 | Always | main_cohort_id |
| R02 | After main cohort | persona_id |
| R03 | If baby/infant/child/elder/pregnant/postpartum/recovery selected | addon_component_required, target_member_segment |
| R04 | If health selected OR family member has diabetes/BP/weight goal | health_scope, health_overlay_code |
| R05 | After household/care | cook_dependency |
| R06 | Always | diet_type, nonveg_mode |
| R07 | Always | origin_state, current_city_group |
| R08 | Optional after 3-5 swipes | accepted_class_codes |

---

## 7. re_addon_classes — example_dishes, planning_note (24 rows)

| addon_class_code | addon_class_name | example_dishes | planning_note |
|---|---|---|---|
| ADD_ALLERGY_SAFE_ALT | Allergy-safe alternate component | Nut-free chutney; Dairy-free curd alternative; Gluten-free roti; Egg-free protein side; Soy-free stir-fry; Shellfish-free seafood alt | Only after allergy capture; hard constraint overrides. |
| ADD_BP_LOW_SALT_CURD_SALAD | Low-salt curd/salad side | Unsalted curd; Kachumber no salt; Steamed veg; Lauki soup; Lemon herbs salad; Roasted chana small | Low salt/oil adjustment for target member. |
| ADD_CHILD_PROTEIN_SIDE | Child protein side | Paneer bhurji; Curd bowl; Boiled egg if eaten; Dal chilla mini; Cheese dosa; Peanut chutney if safe | Use only where child needs extra acceptable protein or is picky. |
| ADD_CHILD_TIFFIN_SIDE | Child tiffin side/snack | Mini idli; Paneer roll; Veg sandwich; Poha cutlet; Fruit curd; Dosa roll | Attach to family breakfast/snack; avoid turning whole family plan into child food. |
| ADD_COOK_INSTRUCTION_PREP_CARD | Cook instruction/prep card | Pre-chopped veg list; masala base; dal soak reminder; no-chilli child portion; low-salt elder portion; lunchbox packing | Operational add-on for households with cook needing assistance. |
| ADD_DIABETIC_FIBER_PROTEIN_SIDE | Diabetic fiber/protein side | Chana salad; Paneer cube side; Egg if eaten; Fish curry portion if eaten; Moong salad; Curd bowl | Attach to dal/roti/rice/sabzi meal; control rice/roti portion. |
| ADD_DIABETIC_LOW_GI_SWAP | Diabetic low-GI swap | Millet roti swap; Brown/red rice portion; Extra dal; Sprouts side; Salad before meal; Unsweetened curd | If only one member is diabetic, modify their plate; do not force family into diabetic main class. |
| ADD_ELDERLY_EARLY_LIGHT_DINNER | Early light dinner add-on | Thin dal rice; Soft khichdi; Lauki soup; Idli sambar soft; Dalia; Curd rice | Add early/soft dinner for elder while family dinner can be normal. |
| ADD_ELDERLY_SOFT_PROTEIN_SIDE | Elderly soft protein side | Moong dal soup; Soft paneer bhurji; Palak dal; Curd bowl; Egg drop soup if eaten; Fish stew if eaten | Soft add-on/side; not default whole-family khichdi. |
| ADD_FASTING_PHALAHARI_SIDE | Fasting phalahari side | Sabudana khichdi; Fruit curd; Sama khichdi; Peanut potato; Makhana kheer; Rajgira roti | Add only for fasting member/day; not daily family class. |
| ADD_GYM_EXTRA_PROTEIN | Gym extra protein add-on | Egg whites if eaten; Paneer bhurji; Greek-style curd; Chicken tikka if eaten; Soya chunks; Moong chilla | Protein add-on around normal meal timing. |
| ADD_INFANT_6M_DAL_KHICHDI | Soft dal-rice/khichdi add-on | Mashed dal rice; Soft moong khichdi; Dal water rice mash; Lauki dal mash; Curd rice mash | Cook unsalted/low-spice portion separately before tempering family food. |
| ADD_INFANT_6M_SOFT_PORRIDGE | Soft porridge/fruit mash add-on | Ragi porridge; Suji kheer; Rice kanji; Mashed banana; Apple puree; Mashed sweet potato | No solids before 6 months; after 6 months add small soft semi-solid portion alongside family meal prep. |
| ADD_JAIN_NO_ROOT_SAFE_SIDE | Jain no-root safe side | Jain dal; Cucumber curd; Sev tamatar no onion; Dudhi chana; Jain paneer; Moong khichdi | Use if one Jain member in mixed household; if whole household Jain, hard filter main plan. |
| ADD_LACTATION_GALACTAGOGUE_SNACK | Lactation/postpartum snack | Ajwain paratha piece; Methi laddoo small; Panjiri portion; Ragi malt; Gond laddoo milk; Moong chilla | Mother-specific snack; family meal remains normal. |
| ADD_PICKY_CHILD_BRIDGE_FOOD | Picky child bridge food | Curd rice; Mild pasta with vegetables; Paneer roll; Mini paratha curd; Sweet corn chaat; Soft dosa | Bridge food linked to accepted textures; expose small portion of family sabzi separately. |
| ADD_POSTPARTUM_DIGESTIVE_LIGHT | Postpartum digestive light component | Moong dal khichdi; Lauki dal; Ajwain paratha curd; Chicken soup if eaten; Dalia with ghee; Methi dal roti | Use regional postpartum rules; avoid spicy/oily family portions for mother if needed. |
| ADD_PREGNANCY_CALCIUM_PROTEIN_SIDE | Pregnancy calcium/protein add-on | Curd bowl; Paneer bhurji; Ragi malt; Milk/dry fruit small; Moong dal chilla; Sesame laddoo small | Add alongside normal family breakfast/snack. |
| ADD_PREGNANCY_IRON_FOLATE_SIDE | Pregnancy iron/folate side | Palak dal; Chana salad; Sprouts chaat; Beet-carrot kosambari; Egg curry if eaten; Fish curry if eaten | Use as side/component; do not double the entire household portion. |
| ADD_RECOVERY_SOUP_STEW_PROTEIN | Recovery soup/stew protein | Moong dal soup; Chicken soup if eaten; Fish stew if eaten; Dalia khichdi; Palak dal; Paneer soft scramble | Use for illness/recovery/surgery periods as temporary overlay. |
| ADD_TEEN_EXTRA_CARB_PROTEIN | Teen extra carb/protein add-on | Extra dal; Egg bhurji if eaten; Curd rice cup; Peanut chikki; Paneer sandwich; Chicken piece if eaten | Add to common meal without making all meals heavy for everyone. |
| ADD_TODDLER_MILD_MINI_PLATE | Toddler mild mini-plate | Dal rice ghee; Mini phulka curd; Soft vegetable khichdi; Paneer bhurji small; Mild pulao | Same ingredients as family meal; less chilli, softer texture, smaller portions. |
| ADD_WEIGHT_LOSS_VOLUME_PROTEIN | Weight-loss volume/protein add-on | Kachumber bowl; Sprouts salad; Curd bowl; Paneer/egg/chicken portion if eaten; Soup before dinner; Stir-fry veg | Adds satiety without replacing household meal. |
| ADD_WORKING_MANAGER_BATCH_SIDE | Batch-cook side component | Boiled dal base; Pre-cooked chole; Chopped bhindi; Roasted makhana; Curd set; Dough batch | Supports working women managing cook/office; not a meal class. |

---

## 8. re_city_migration_overlays — planning_rule, v3_usage_note (324 rows — templated)

`v3_usage_note` is constant across all 324 rows: "Apply after origin_state +
current_city_group. It modifies class weights, not hard filters; dependent
add-ons remain based on household composition."

`planning_rule` has only 9 distinct values, one per `destination_group_code`
(it repeats identically for each of the 36 origin states paired with that
destination group):

| destination_group_code | destination_group_name | planning_rule |
|---|---|---|
| AHMEDABAD_SURAT | Ahmedabad/Surat/Vadodara | Add Gujarati/Jain/veg snack-heavy pattern; nonveg not assumed unless explicit. |
| BENGALURU_HYD_CHENNAI | Bengaluru/Hyderabad/Chennai | Add idli/dosa, rice meals, biryani where nonveg, tech-city health/delivery. |
| DELHI_NCR | Delhi NCR/Gurugram/Noida | Add paratha/chole/rajma/tandoori/delivery and North-style office eating. |
| GOA_COASTAL | Goa/Kochi/Mangalore/coastal city | Add rice-fish/coastal coconut if nonveg; veg users get coconut stew/curd rice. |
| HOME_STATE_TIER1 | Home-state major city | Use state signature with more delivery/modern breakfast. |
| HOME_STATE_TIER2 | Home-state tier 2 city | Use state signature strongly; lower delivery and more home food. |
| KOLKATA_EAST | Kolkata/East metro | Add dal-bhaat-bhaja, fish if nonveg, sweets and chaats. |
| MUMBAI_PUNE | Mumbai/Pune/Thane/Navi Mumbai | Add poha, chaat/vada-pav, office lunch, health bowl; keep home-state dinner 3-4 days. |
| PAN_INDIA_PG_HOSTEL | PG/hostel/corporate relocation | Higher outside/one-pot/bread/noodles; ask kitchen access before recipes. |

---

## 9. re_nonveg_logic.planning_notes (36 rows, keyed by state_id)

This text is identical to `re_states.behavioral_notes` for the same
`state_id` (both describe the state's food/nonveg pattern) — see §3 for the
full per-state list rather than duplicating it a third time.

---

## Index of all renamed columns (SCHEMA-RE-021)

| # | Table | Column (old) | Column (new) |
|---|---|---|---|
| 1 | re_cohorts | state_signature_notes | state_signature_notes_FounderInfoOnly |
| 2 | re_cohorts | main_meal_vs_addon_rule | main_meal_vs_addon_rule_FounderInfoOnly |
| 3 | re_cohorts | planning_confidence | planning_confidence_FounderInfoOnly |
| 4 | re_cohorts | household_addon_logic | household_addon_logic_FounderInfoOnly |
| 5 | re_main_cohorts | routing_notes | routing_notes_FounderInfoOnly |
| 6 | re_states | behavioral_notes | behavioral_notes_FounderInfoOnly |
| 7 | re_states | planning_note | planning_note_FounderInfoOnly |
| 8 | re_meal_classes | behavioral_meaning | behavioral_meaning_FounderInfoOnly |
| 9 | re_meal_classes | example_dishes | example_dishes_FounderInfoOnly |
| 10 | re_meal_classes | db_use_note | db_use_note_FounderInfoOnly |
| 11 | re_personas | revealed_behavior_summary | revealed_behavior_summary_FounderInfoOnly |
| 12 | re_personas | recommended_onboarding_path | recommended_onboarding_path_FounderInfoOnly |
| 13 | re_personas | bf_boost_classes | bf_boost_classes_FounderInfoOnly |
| 14 | re_personas | ld_boost_classes | ld_boost_classes_FounderInfoOnly |
| 15 | re_personas | sn_boost_classes | sn_boost_classes_FounderInfoOnly |
| 16 | re_personas | dn_boost_classes | dn_boost_classes_FounderInfoOnly |
| 17 | re_addon_classes | example_dishes | example_dishes_FounderInfoOnly |
| 18 | re_addon_classes | planning_note | planning_note_FounderInfoOnly |
| 19 | re_city_migration_overlays | planning_rule | planning_rule_FounderInfoOnly |
| 20 | re_city_migration_overlays | v3_usage_note | v3_usage_note_FounderInfoOnly |
| 21 | re_nonveg_logic | planning_notes | planning_notes_FounderInfoOnly |

Note: per the Postgres identifier case-folding behavior documented during
SCHEMA-RE-020, the actual column names created by the rename migration will
be lowercase (`..._founderinfoonly`), not the literal mixed-case shown above.
This will be re-verified with `ILIKE` in Phase C, as was done for RE-020.

Note: `re_routing_rules.shown_when` and `re_routing_rules.maps_to_fields`
(captured in §6 above) were queried for Phase A completeness but are **not**
in the 21-column rename list for this migration — they are not part of the
SCHEMA-RE-021 rename scope as specified.
