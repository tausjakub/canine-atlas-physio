// Bilingual study cards for the dog organ layer (scripts/blender/organs.py).
// Descriptive anatomy only: no diagnostic claims or treatment guidance.
const p = (cs, en) => ({ cs, en });
const UMN = 'https://vanat.ahc.umn.edu/carnLabs/';
const BRAIN_DOI = 'https://doi.org/10.7298/4t8z-aw34';
const MRI = p(
  'Tvar z otevřeného MRI atlasu psího mozku (Johnson & Barry 2019, CC0) přizpůsobený velikosti lebeční dutiny tohoto modelu.',
  'Shape from the open canine brain MRI atlas (Johnson & Barry 2019, CC0), scaled to fit this model’s cranial cavity.',
);
const SCHEMA = p(
  'Schematický tvar umístěný podle učebnicové polohy v tělní dutině modelu; nejde o segmentaci z CT ani o přesnou velikost.',
  'Schematic shape placed at its textbook position in the model’s body cavity; not segmented from CT and not to exact size.',
);

function card(
  label,
  action,
  location,
  connections,
  nerve,
  recall,
  answer,
  opts = {},
) {
  return {
    label,
    action,
    study: {
      location,
      connections,
      nerve,
      difference: opts.mri ? MRI : SCHEMA,
      recall,
      answer,
      reference: opts.mri ? BRAIN_DOI : UMN,
      depth: 'deep',
    },
  };
}

const vagus = p(
  'Autonomní: n. vagus (parasympatikus) a sympatické nervy.',
  'Autonomic: vagus nerve (parasympathetic) and sympathetic nerves.',
);

const ovary = (side, sideEn) =>
  card(
    p(`Vaječník · ${side} · samice`, `Ovary · ${sideEn} · female`),
    p(
      'Tvoří vajíčka a pohlavní hormony (estrogeny, progesteron).',
      'Produces ova and sex hormones (oestrogens, progesterone).',
    ),
    p(
      'V dorzální části břišní dutiny kaudálně od ledviny téže strany, uložen v ovariální burze (často s tukem).',
      'In the dorsal abdomen caudal to the kidney of the same side, enclosed in the ovarian bursa (often fat-filled).',
    ),
    p(
      'Kraniálně zavěšen závěsným vazem (lig. suspensorium ovarii) ke stěně u ledviny; kaudálně navazuje vejcovod a děložní roh.',
      'Held cranially by the suspensory ligament near the kidney; the uterine tube and uterine horn continue caudally.',
    ),
    p(
      'Autonomní (sympatické) nervy podél ovariálních cév.',
      'Autonomic (sympathetic) nerves along the ovarian vessels.',
    ),
    p(
      'Kde leží vaječník vzhledem k ledvině?',
      'Where does the ovary lie relative to the kidney?',
    ),
    p(
      'Kaudálně od ledviny téže strany.',
      'Caudal to the kidney of the same side.',
    ),
  );

// Cerebral lobes as delineated in the Johnson & Barry atlas (frontal,
// sensorimotor, parietal, occipital, perisylvian/temporal).
const lobeInfo = {
  frontal: [
    p('Čelní lalok', 'Frontal lobe'),
    p(
      'Rostrální část koncového mozku; podílí se na chování, plánování a čichových asociacích.',
      'Rostral part of the cerebrum; involved in behaviour, planning and olfactory associations.',
    ),
    p(
      'Nejrostrálnější lalok hemisféry, kaudálně od čichového bulbu.',
      'The most rostral lobe of the hemisphere, caudal to the olfactory bulb.',
    ),
    p(
      'Který lalok leží hned za čichovým bulbem?',
      'Which lobe lies just caudal to the olfactory bulb?',
    ),
    p('Čelní lalok.', 'The frontal lobe.'),
  ],
  sensorimotor: [
    p('Senzomotorický lalok', 'Sensorimotor lobe'),
    p(
      'Kolem zkřížené brázdy (sulcus cruciatus): primární motorická a somatosenzorická kůra.',
      'Around the cruciate sulcus: primary motor and somatosensory cortex.',
    ),
    p(
      'Dorzálně mezi čelním a temenním lalokem.',
      'Dorsally between the frontal and parietal lobes.',
    ),
    p(
      'Kolem které brázdy leží u psa motorická kůra?',
      'Around which sulcus does the dog’s motor cortex lie?',
    ),
    p(
      'Kolem zkřížené brázdy (sulcus cruciatus).',
      'Around the cruciate sulcus.',
    ),
  ],
  parietal: [
    p('Temenní lalok', 'Parietal lobe'),
    p(
      'Zpracování a propojování smyslových informací, prostorová orientace.',
      'Processing and integration of sensory information, spatial orientation.',
    ),
    p(
      'Dorzálně ve střední části hemisféry, mezi senzomotorickým a týlním lalokem.',
      'Dorsally in the middle of the hemisphere, between the sensorimotor and occipital lobes.',
    ),
    p(
      'Mezi kterými laloky leží temenní lalok?',
      'Between which lobes does the parietal lobe lie?',
    ),
    p(
      'Mezi senzomotorickým a týlním.',
      'Between the sensorimotor and occipital lobes.',
    ),
  ],
  occipital: [
    p('Týlní lalok', 'Occipital lobe'),
    p(
      'Zraková kůra: zpracování zrakových podnětů.',
      'Visual cortex: processing of visual input.',
    ),
    p(
      'Kaudální pól hemisféry, nad mozečkem.',
      'Caudal pole of the hemisphere, above the cerebellum.',
    ),
    p('Který lalok zpracovává zrak?', 'Which lobe processes vision?'),
    p('Týlní lalok.', 'The occipital lobe.'),
  ],
  temporal: [
    p('Spánkový (perisylvický) lalok', 'Temporal (perisylvian) lobe'),
    p(
      'Sluchová kůra a asociační oblasti kolem sylviovy brázdy.',
      'Auditory cortex and association areas around the sylvian sulcus.',
    ),
    p(
      'Laterálně a ventrálně na hemisféře, kolem sylviovy brázdy.',
      'Lateral and ventral on the hemisphere, around the sylvian sulcus.',
    ),
    p('Kde leží sluchová kůra?', 'Where is the auditory cortex?'),
    p(
      'Ve spánkovém (perisylvickém) laloku.',
      'In the temporal (perisylvian) lobe.',
    ),
  ],
};
const lobe = (key, side, sideEn) => {
  const [label, action, location, recall, answer] = lobeInfo[key];
  return card(
    p(`${label.cs} · ${side}`, `${label.en} · ${sideEn}`),
    action,
    location,
    p(
      'Součást koncového mozku; hemisféry spojuje kalózní těleso (corpus callosum).',
      'Part of the cerebrum; the hemispheres are joined by the corpus callosum.',
    ),
    p(
      'Neuplatňuje se (sám je částí CNS).',
      'Not applicable (part of the CNS itself).',
    ),
    recall,
    answer,
    { mri: true },
  );
};

export const organStudy = {
  ...Object.fromEntries(
    Object.keys(lobeInfo).flatMap((k) => [
      [`brain_lobe_${k}_L`, lobe(k, 'vlevo', 'left')],
      [`brain_lobe_${k}_R`, lobe(k, 'vpravo', 'right')],
    ]),
  ),
  brain_cerebellum: card(
    p('Mozeček', 'Cerebellum'),
    p(
      'Koordinace pohybu, rovnováha a svalový tonus.',
      'Coordination of movement, balance and muscle tone.',
    ),
    p(
      'Kaudálně v lebeční dutině, dorzálně od mozkového kmene, pod týlní kostí.',
      'Caudal in the cranial cavity, dorsal to the brainstem, under the occipital bone.',
    ),
    p(
      'S kmenem jej spojují mozečkové stopky; rostrálně jej od koncového mozku dělí stan mozečku.',
      'Joined to the brainstem by the cerebellar peduncles; separated rostrally from the cerebrum by the tentorium cerebelli.',
    ),
    p(
      'Neuplatňuje se (sám je částí CNS).',
      'Not applicable (part of the CNS itself).',
    ),
    p(
      'Která struktura ladí koordinaci a rovnováhu?',
      'Which structure fine-tunes coordination and balance?',
    ),
    p('Mozeček.', 'The cerebellum.'),
    { mri: true },
  ),
  brain_stem: card(
    p('Mozkový kmen', 'Brainstem'),
    p(
      'Spojuje mozek s míchou; obsahuje centra dýchání a krevního oběhu a jádra hlavových nervů.',
      'Links the brain with the spinal cord; holds respiratory and cardiovascular centres and cranial nerve nuclei.',
    ),
    p(
      'Ventrálně pod mozečkem a koncovým mozkem, nad bází lebky.',
      'Ventral, under the cerebellum and cerebrum, above the base of the skull.',
    ),
    p(
      'Kaudálně přechází velkým týlním otvorem v míchu.',
      'Continues caudally through the foramen magnum into the spinal cord.',
    ),
    p(
      'Jádra hlavových nervů III-XII (XI má i míšní kořeny).',
      'Nuclei of cranial nerves III-XII (XI also has spinal roots).',
    ),
    p(
      'Kde mozek přechází v míchu?',
      'Where does the brain continue into the spinal cord?',
    ),
    p(
      'Mozkový kmen u velkého týlního otvoru.',
      'The brainstem at the foramen magnum.',
    ),
    { mri: true },
  ),
  brain_olfactory_bulbs: card(
    p('Čichové bulby', 'Olfactory bulbs'),
    p(
      'První zpracování čichových podnětů; u psa výrazně vyvinuté.',
      'First processing of smell; well developed in the dog.',
    ),
    p(
      'Rostrální pól mozku, uložené v čichové jámě (fossa ethmoidalis) u řešetové ploténky.',
      'Rostral pole of the brain, in the ethmoidal fossa against the cribriform plate.',
    ),
    p(
      'Přijímají čichová vlákna skrze řešetovou ploténku (lamina cribrosa) čichové kosti z nosní dutiny.',
      'Receive the olfactory fibres through the cribriform plate of the ethmoid bone from the nasal cavity.',
    ),
    p('N. olfactorius (I).', 'Olfactory nerve (I).'),
    p(
      'Který hlavový nerv končí v čichovém bulbu?',
      'Which cranial nerve ends in the olfactory bulb?',
    ),
    p('N. olfactorius (I).', 'The olfactory nerve (I).'),
    { mri: true },
  ),
  organ_spinal_cord: card(
    p('Mícha', 'Spinal cord'),
    p(
      'Vede signály mezi mozkem a tělem; obsahuje míšní reflexní oblouky.',
      'Carries signals between brain and body; contains spinal reflex arcs.',
    ),
    p(
      'V páteřním kanálu od velkého týlního otvoru zhruba po L6-L7 (u malých plemen o něco kaudálněji), kde končí míšním kuželem.',
      'In the vertebral canal from the foramen magnum to about L6-L7 (slightly further caudally in small breeds), where it ends as the conus medullaris.',
    ),
    p(
      'Vystupují z ní míšní nervy; krční a bederně-křížová (lumbosakrální) intumescence zásobují končetiny.',
      'Gives off the spinal nerves; cervical and lumbosacral enlargements supply the limbs.',
    ),
    p(
      'Sama je částí CNS; míšní nervy vystupují v každém segmentu.',
      'Part of the CNS itself; spinal nerves leave at every segment.',
    ),
    p(
      'Kde u psa zhruba končí mícha?',
      'Roughly where does the spinal cord end in the dog?',
    ),
    p('Kolem L6-L7 (míšní kužel).', 'Around L6-L7 (conus medullaris).'),
  ),
  organ_larynx: card(
    p('Hrtan', 'Larynx'),
    p(
      'Chrání dolní dýchací cesty při polykání a tvoří hlas.',
      'Protects the lower airway during swallowing and produces voice.',
    ),
    p(
      'Na přechodu hlavy a krku, kaudálně od jazylky, na které je zavěšen (m. thyrohyoideus).',
      'At the junction of head and neck, caudal to the hyoid apparatus, from which it is suspended (thyrohyoid).',
    ),
    p(
      'Rostrálně hltan, kaudálně průdušnice; zavěšen na jazylce.',
      'Pharynx rostrally, trachea caudally; suspended from the hyoid apparatus.',
    ),
    p(
      'N. laryngeus cranialis a recurrens (větve n. vagus).',
      'Cranial and recurrent laryngeal nerves (vagus branches).',
    ),
    p(
      'Který nerv inervuje většinu svalů hrtanu?',
      'Which nerve supplies most laryngeal muscles?',
    ),
    p(
      'N. laryngeus recurrens (z n. vagus).',
      'The recurrent laryngeal nerve (from the vagus).',
    ),
  ),
  organ_trachea: card(
    p('Průdušnice', 'Trachea'),
    p(
      'Vede vzduch z hrtanu do průdušek; chrupavčité prstence ji drží otevřenou.',
      'Conducts air from larynx to bronchi; cartilage rings keep it open.',
    ),
    p(
      'Ventrálně na krku pod krčními obratli, v hrudníku nad srdeční bází.',
      'Ventral neck under the cervical vertebrae; in the thorax above the heart base.',
    ),
    p(
      'Nad srdeční bází se větví na levou a pravou hlavní průdušku; dorzálně leží jícen.',
      'Divides above the heart base into left and right main bronchi; the oesophagus lies dorsal to it.',
    ),
    vagus,
    p(
      'Kde se průdušnice dělí na průdušky?',
      'Where does the trachea divide into bronchi?',
    ),
    p(
      'Nad srdeční bází (rozdvojení, bifurkace) zhruba ve 4.-5. mezižebří.',
      'Above the heart base (bifurcation, carina), at about the 4th-5th intercostal space.',
    ),
  ),
  organ_oesophagus: card(
    p('Jícen', 'Oesophagus'),
    p(
      'Posouvá polknutou potravu peristaltikou do žaludku.',
      'Moves swallowed food to the stomach by peristalsis.',
    ),
    p(
      'Na krku dorzálně od průdušnice, v kaudální části mírně vlevo; v hrudníku nad srdcem, bránicí prochází do břicha.',
      'In the neck dorsal to the trachea, deviating slightly to the left caudally; in the thorax above the heart, through the diaphragm into the abdomen.',
    ),
    p(
      'Navazuje na hltan a ústí do žaludku (kardie).',
      'Continues from the pharynx and opens into the stomach (cardia).',
    ),
    vagus,
    p(
      'Jakým otvorem prochází jícen do břicha?',
      'Through which opening does the oesophagus enter the abdomen?',
    ),
    p(
      'Jícnovým otvorem v bránici (hiatus oesophageus).',
      'The oesophageal hiatus of the diaphragm.',
    ),
  ),
  organ_thyroid: card(
    p('Štítná žláza', 'Thyroid gland'),
    p(
      'Endokrinní žláza; hormony řídí intenzitu metabolismu.',
      'Endocrine gland; its hormones set the metabolic rate.',
    ),
    p(
      'Dva laloky po stranách průdušnice těsně kaudálně od hrtanu, podél prvních zhruba 5 (až 8) prstenců; levý lalok začíná obvykle o něco kaudálněji než pravý.',
      'Two lobes on either side of the trachea just caudal to the larynx, along roughly the first 5 (up to 8) tracheal rings; the left lobe usually starts slightly further caudally than the right.',
    ),
    p(
      'Kaudálně od hrtanu, přiložená k průdušnici; dorzolaterálně probíhá a. carotis communis.',
      'Caudal to the larynx, applied to the trachea; the common carotid artery runs dorsolaterally.',
    ),
    p(
      'Autonomní nervy; hormonální řízení: hypofýza (TSH).',
      'Autonomic nerves; hormonal control: pituitary (TSH).',
    ),
    p('Kde leží laloky štítné žlázy?', 'Where do the thyroid lobes lie?'),
    p(
      'Po stranách průdušnice kaudálně od hrtanu.',
      'Beside the trachea, caudal to the larynx.',
    ),
  ),
  organ_heart: card(
    p('Srdce', 'Heart'),
    p(
      'Pumpuje krev do plicního a tělního oběhu.',
      'Pumps blood into the pulmonary and systemic circulations.',
    ),
    p(
      'Ve středním mezihrudí zhruba od 3. do 6. mezižebří, hrot směřuje ventrokaudálně a doleva (úder hrotu vlevo kolem 5. mezižebří).',
      'In the middle mediastinum, from about the 3rd to the 6th intercostal space; the apex points ventrocaudally and to the left (apex beat near the left 5th intercostal space).',
    ),
    p(
      'Z báze odstupuje aorta a plicní kmen; ze stran jej obklopují plíce.',
      'The aorta and pulmonary trunk leave its base; the lungs surround it laterally.',
    ),
    vagus,
    p(
      'V kterých mezižebřích leží srdce?',
      'Which intercostal spaces does the heart span?',
    ),
    p(
      'Přibližně 3. až 6. mezižebří.',
      'About the 3rd to the 6th intercostal space.',
    ),
  ),
  organ_aorta: card(
    p('Aorta', 'Aorta'),
    p(
      'Hlavní tepna tělního oběhu; rozvádí okysličenou krev z levé komory.',
      'Main artery of the systemic circulation; distributes oxygenated blood from the left ventricle.',
    ),
    p(
      'Oblouk nad srdeční bází, dále hrudní a břišní aorta pod těly obratlů.',
      'Arch above the heart base, then thoracic and abdominal aorta under the vertebral bodies.',
    ),
    p(
      'Aortálním otvorem bránice přechází do břicha; kaudálně se větví na kyčelní tepny (aa. iliacae).',
      'Passes the aortic hiatus of the diaphragm; divides caudally into the iliac arteries.',
    ),
    p(
      'Sympatické nervy cévní stěny.',
      'Sympathetic nerves of the vessel wall.',
    ),
    p(
      'Kde leží břišní aorta vůči páteři?',
      'Where does the abdominal aorta lie relative to the spine?',
    ),
    p(
      'Ventrálně od těl bederních obratlů, mírně vlevo.',
      'Ventral to the lumbar vertebral bodies, slightly to the left.',
    ),
  ),
  organ_caudal_vena_cava: card(
    p('Kaudální dutá žíla', 'Caudal vena cava'),
    p(
      'Vrací krev z kaudální části těla do pravé síně.',
      'Returns blood from the caudal body to the right atrium.',
    ),
    p(
      'V břiše vpravo od aorty pod páteří, v žlábku jater a otvorem pro dutou žílu v bránici do hrudníku.',
      'In the abdomen right of the aorta under the spine; through a groove in the liver and the caval foramen of the diaphragm into the thorax.',
    ),
    p('Ústí do pravé síně srdce.', 'Opens into the right atrium.'),
    p(
      'Sympatické nervy cévní stěny.',
      'Sympathetic nerves of the vessel wall.',
    ),
    p(
      'Na které straně aorty leží kaudální dutá žíla?',
      'On which side of the aorta is the caudal vena cava?',
    ),
    p('Vpravo.', 'On the right.'),
  ),
  organ_lung_L: card(
    p('Plíce · vlevo', 'Lung · left'),
    p(
      'Výměna plynů mezi vzduchem a krví.',
      'Gas exchange between air and blood.',
    ),
    p(
      'Levá polovina hrudní dutiny; kaudálně naléhá na bránici.',
      'Left half of the thoracic cavity; rests caudally on the diaphragm.',
    ),
    p(
      'Levá hlavní průduška a plicní cévy vstupují v plicní brance (hilus).',
      'Left main bronchus and pulmonary vessels enter at the hilus.',
    ),
    vagus,
    p(
      'Kolik laloků má levá plíce psa?',
      'How many lobes does the dog’s left lung have?',
    ),
    p(
      'Dva (kraniální a kaudální); kraniální lalok má dvě části.',
      'Two (cranial and caudal); the cranial lobe has two parts.',
    ),
  ),
  organ_lung_R: card(
    p('Plíce · vpravo', 'Lung · right'),
    p(
      'Výměna plynů mezi vzduchem a krví.',
      'Gas exchange between air and blood.',
    ),
    p(
      'Pravá polovina hrudní dutiny; kaudálně naléhá na bránici.',
      'Right half of the thoracic cavity; rests caudally on the diaphragm.',
    ),
    p(
      'Pravá hlavní průduška a plicní cévy vstupují v plicní brance (hilus).',
      'Right main bronchus and pulmonary vessels enter at the hilus.',
    ),
    vagus,
    p(
      'Kolik laloků má pravá plíce psa?',
      'How many lobes does the dog’s right lung have?',
    ),
    p(
      'Čtyři (kraniální, střední, kaudální a přídatný).',
      'Four (cranial, middle, caudal and accessory).',
    ),
  ),
  organ_liver: card(
    p('Játra', 'Liver'),
    p(
      'Metabolismus živin, tvorba žluči, zásobní a detoxikační funkce.',
      'Nutrient metabolism, bile production, storage and detoxification.',
    ),
    p(
      'Kraniálně v břišní dutině, přiléhají k bránici, z větší části pod žebry.',
      'Cranial abdomen, against the diaphragm, mostly under the ribs.',
    ),
    p(
      'Kaudálně žaludek a pravá ledvina; prochází jimi kaudální dutá žíla; žlučník leží mezi čtyřhranným a pravým mediálním lalokem.',
      'Stomach and right kidney caudally; the caudal vena cava passes through; gallbladder between the quadrate and right medial lobes.',
    ),
    vagus,
    p(
      'Ke kterému svalu játra kraniálně přiléhají?',
      'Which muscle does the liver lie against cranially?',
    ),
    p('K bránici.', 'The diaphragm.'),
  ),
  organ_gallbladder: card(
    p('Žlučník', 'Gallbladder'),
    p('Shromažďuje a zahušťuje žluč.', 'Stores and concentrates bile.'),
    p(
      'Mezi čtyřhranným a pravým mediálním lalokem jater.',
      'Between the quadrate and right medial lobes of the liver.',
    ),
    p(
      'Žlučovodem ústí do dvanáctníku.',
      'Drains via the bile duct into the duodenum.',
    ),
    vagus,
    p('Kam ústí žlučovod?', 'Where does the bile duct open?'),
    p('Do dvanáctníku.', 'Into the duodenum.'),
  ),
  organ_stomach: card(
    p('Žaludek', 'Stomach'),
    p('Uchovává a začíná trávit potravu.', 'Stores food and begins digestion.'),
    p(
      'Kraniálně v břiše převážně vlevo, kaudálně za játry.',
      'Cranial abdomen, mostly on the left, caudal to the liver.',
    ),
    p(
      'Kardií navazuje na jícen, pylorem vpravo přechází do dvanáctníku; podél velkého zakřivení slezina.',
      'Cardia joins the oesophagus; the pylorus on the right leads into the duodenum; the spleen follows the greater curvature.',
    ),
    vagus,
    p('Na které straně leží pylorus?', 'On which side is the pylorus?'),
    p('Vpravo.', 'On the right.'),
  ),
  organ_duodenum: card(
    p('Dvanáctník', 'Duodenum'),
    p(
      'První část tenkého střeva; přijímá žluč a pankreatickou šťávu.',
      'First part of the small intestine; receives bile and pancreatic juice.',
    ),
    p(
      'Od pyloru probíhá kaudálně po pravé straně břicha, v kaudálním ohybu se obrací a vrací doleva.',
      'Runs from the pylorus caudally along the right abdomen, turns at the caudal flexure and returns to the left.',
    ),
    p(
      'Pokračuje lačníkem; podél sestupné části leží pravý lalok slinivky.',
      'Continues as the jejunum; the right pancreatic lobe lies along the descending part.',
    ),
    vagus,
    p(
      'Které vývody ústí do dvanáctníku?',
      'Which ducts open into the duodenum?',
    ),
    p('Žlučovod a vývody slinivky.', 'The bile duct and the pancreatic ducts.'),
  ),
  organ_pancreas: card(
    p('Slinivka břišní', 'Pancreas'),
    p(
      'Trávicí enzymy do dvanáctníku a hormony (inzulin, glukagon) do krve.',
      'Digestive enzymes into the duodenum and hormones (insulin, glucagon) into the blood.',
    ),
    p(
      'Tvar písmene V: pravý lalok podél dvanáctníku, levý kaudálně od žaludku.',
      'V-shaped: right lobe along the duodenum, left lobe caudal to the stomach.',
    ),
    p('Vývody ústí do dvanáctníku.', 'Ducts open into the duodenum.'),
    vagus,
    p(
      'Podél kterého orgánu leží pravý lalok slinivky?',
      'Along which organ does the right pancreatic lobe lie?',
    ),
    p('Podél dvanáctníku.', 'Along the duodenum.'),
  ),
  organ_spleen: card(
    p('Slezina', 'Spleen'),
    p(
      'Filtruje krev, je zásobárnou krve a součástí imunitního systému.',
      'Filters blood, stores blood and is part of the immune system.',
    ),
    p(
      'Vlevo v břiše podél velkého zakřivení žaludku, u levé stěny.',
      'Left abdomen along the greater curvature of the stomach, against the left wall.',
    ),
    p(
      'Se žaludkem ji spojuje gastrolienální vaz.',
      'Joined to the stomach by the gastrosplenic ligament.',
    ),
    p('Sympatické nervy.', 'Sympathetic nerves.'),
    p(
      'Na které straně břicha leží slezina?',
      'On which side of the abdomen is the spleen?',
    ),
    p('Vlevo.', 'On the left.'),
  ),
  organ_small_intestine: card(
    p(
      'Tenké střevo (lačník a kyčelník)',
      'Small intestine (jejunum and ileum)',
    ),
    p('Trávení a vstřebávání živin.', 'Digestion and absorption of nutrients.'),
    p(
      'Kličky vyplňují střední a ventrální část břišní dutiny.',
      'Loops fill the middle and ventral abdominal cavity.',
    ),
    p(
      'Navazuje na dvanáctník, kyčelník ústí do tlustého střeva; zavěšeno na okruží.',
      'Continues from the duodenum; the ileum opens into the large intestine; suspended by the mesentery.',
    ),
    vagus,
    p('Na co je tenké střevo zavěšeno?', 'What suspends the small intestine?'),
    p('Na okruží (mezenterium).', 'The mesentery.'),
  ),
  organ_colon_rectum: card(
    p('Tlusté střevo a konečník', 'Colon and rectum'),
    p(
      'Vstřebává vodu a soli a formuje stolici.',
      'Absorbs water and salts and forms faeces.',
    ),
    p(
      'Vzestupný tračník vpravo, příčný kraniálně, sestupný vlevo; konečník v pánevní dutině.',
      'Ascending colon on the right, transverse cranially, descending on the left; rectum in the pelvic cavity.',
    ),
    p(
      'Začíná u ústí kyčelníku, kde z něj vybíhá slepé střevo; konečník končí řitním otvorem.',
      'Begins at the ileocolic junction, where the caecum branches off; the rectum ends at the anus.',
    ),
    p(
      'Autonomní: n. vagus a pánevní nervy.',
      'Autonomic: vagus and pelvic nerves.',
    ),
    p('Ve které dutině leží konečník?', 'In which cavity does the rectum lie?'),
    p('V pánevní dutině.', 'The pelvic cavity.'),
  ),
  organ_kidney_L: card(
    p('Ledvina · vlevo', 'Kidney · left'),
    p(
      'Filtruje krev a tvoří moč; řídí vodní a minerální rovnováhu.',
      'Filters blood and forms urine; regulates water and mineral balance.',
    ),
    p(
      'Retroperitoneálně pod bederními obratli zhruba L2-L4, kaudálněji než pravá.',
      'Retroperitoneal under the lumbar vertebrae at about L2-L4, more caudal than the right.',
    ),
    p(
      'Močovodem odvádí moč do močového měchýře; kraniomediálně nadledvina.',
      'The ureter carries urine to the bladder; the adrenal gland lies craniomedially.',
    ),
    p(
      'Sympatické nervy (ledvinná pleteň).',
      'Sympathetic nerves (renal plexus).',
    ),
    p(
      'Která ledvina psa leží kraniálněji?',
      'Which of the dog’s kidneys lies more cranially?',
    ),
    p('Pravá.', 'The right.'),
  ),
  organ_kidney_R: card(
    p('Ledvina · vpravo', 'Kidney · right'),
    p(
      'Filtruje krev a tvoří moč; řídí vodní a minerální rovnováhu.',
      'Filters blood and forms urine; regulates water and mineral balance.',
    ),
    p(
      'Retroperitoneálně zhruba pod T13-L2 (podle zdrojů až L1-L3), v ledvinové jamce ocasatého laloku jater.',
      'Retroperitoneal at about T13-L2 (some sources L1-L3), in the renal fossa of the caudate lobe of the liver.',
    ),
    p(
      'Močovodem odvádí moč do močového měchýře; kraniomediálně nadledvina.',
      'The ureter carries urine to the bladder; the adrenal gland lies craniomedially.',
    ),
    p(
      'Sympatické nervy (ledvinná pleteň).',
      'Sympathetic nerves (renal plexus).',
    ),
    p(
      'Se kterým orgánem se pravá ledvina kraniálně stýká?',
      'Which organ does the right kidney touch cranially?',
    ),
    p('S játry.', 'The liver.'),
  ),
  organ_adrenal_L: card(
    p('Nadledvina · vlevo', 'Adrenal gland · left'),
    p(
      'Endokrinní žláza: kortikosteroidy z kůry, adrenalin a noradrenalin z dřeně.',
      'Endocrine gland: corticosteroids from the cortex, adrenaline and noradrenaline from the medulla.',
    ),
    p(
      'Kraniomediálně od levé ledviny vedle aorty.',
      'Craniomedial to the left kidney, beside the aorta.',
    ),
    p(
      'Těsně u velkých cév a ledviny.',
      'Close to the great vessels and the kidney.',
    ),
    p('Sympatické nervy (dřeň).', 'Sympathetic nerves (medulla).'),
    p('Kde leží nadledviny?', 'Where are the adrenal glands?'),
    p('Kraniomediálně od ledvin.', 'Craniomedial to the kidneys.'),
  ),
  organ_adrenal_R: card(
    p('Nadledvina · vpravo', 'Adrenal gland · right'),
    p(
      'Endokrinní žláza: kortikosteroidy z kůry, adrenalin a noradrenalin z dřeně.',
      'Endocrine gland: corticosteroids from the cortex, adrenaline and noradrenaline from the medulla.',
    ),
    p(
      'Kraniomediálně od pravé ledviny u kaudální duté žíly.',
      'Craniomedial to the right kidney, against the caudal vena cava.',
    ),
    p(
      'Těsně u velkých cév a ledviny.',
      'Close to the great vessels and the kidney.',
    ),
    p('Sympatické nervy (dřeň).', 'Sympathetic nerves (medulla).'),
    p(
      'Ke které cévě přiléhá pravá nadledvina?',
      'Which vessel does the right adrenal lie against?',
    ),
    p('Ke kaudální duté žíle.', 'The caudal vena cava.'),
  ),
  organ_bladder: card(
    p('Močový měchýř', 'Urinary bladder'),
    p(
      'Shromažďuje moč a vyprazdňuje ji močovou trubicí.',
      'Stores urine and empties it through the urethra.',
    ),
    p(
      'U vchodu do pánve, ventrálně; při naplnění zasahuje do břišní dutiny.',
      'At the pelvic inlet, ventrally; extends into the abdomen when full.',
    ),
    p(
      'Přijímá oba močovody, krček přechází v močovou trubici.',
      'Receives both ureters; the neck continues as the urethra.',
    ),
    p(
      'Pánevní (parasympatické) a hypogastrické (sympatické) nervy; zevní svěrač močové trubice zásobuje somatický n. pudendus.',
      'Pelvic (parasympathetic) and hypogastric (sympathetic) nerves; the external urethral sphincter is supplied by the somatic pudendal nerve.',
    ),
    p(
      'Kam se posouvá měchýř při naplnění?',
      'Where does the bladder move when it fills?',
    ),
    p('Kraniálně do břišní dutiny.', 'Cranially into the abdominal cavity.'),
  ),
  organ_prostate: card(
    p('Předstojná žláza (prostata) · samec', 'Prostate gland · male'),
    p(
      'Přídatná pohlavní žláza samce; přispívá k ejakulátu.',
      'Accessory sex gland of the male; contributes to the ejaculate.',
    ),
    p(
      'Obklopuje počáteční (prostatickou) část močové trubice u krčku měchýře, u vchodu do pánve nebo těsně za ním.',
      'Surrounds the proximal (prostatic) urethra at the bladder neck, at or near the pelvic inlet.',
    ),
    p(
      'Kraniálně močový měchýř, dorzálně konečník.',
      'Bladder cranially, rectum dorsally.',
    ),
    p('Hypogastrické a pánevní nervy.', 'Hypogastric and pelvic nerves.'),
    p(
      'Kterou strukturu prostata obklopuje?',
      'Which structure does the prostate surround?',
    ),
    p('Močovou trubici.', 'The urethra.'),
  ),
  organ_tongue: card(
    p('Jazyk', 'Tongue'),
    p(
      'Příjem potravy a vody, tvorba a polykání sousta, odvod tepla při zrychleném dýchání a péče o srst.',
      'Prehension of food and water, forming and swallowing the bolus, heat loss during panting, and grooming.',
    ),
    p(
      'Na spodině dutiny ústní mezi těly dolní čelisti; kořen leží nad jazylkou, volný hrot za řezáky. Model ukazuje jazyk v otevřených ústech.',
      'On the floor of the mouth between the bodies of the mandible; the root lies over the hyoid apparatus and the free apex behind the incisors. The model shows it with the mouth open.',
    ),
    p(
      'Kořen je ukotven k jazylce (m. hyoglossus, m. styloglossus), tělo k dolní čelisti (m. genioglossus); spodní stranu připojuje uzdička jazyka. Kaudálně navazuje hltan.',
      'The root is anchored to the hyoid apparatus (hyoglossus, styloglossus) and the body to the mandible (genioglossus); the frenulum attaches its underside. The pharynx lies caudally.',
    ),
    p(
      'Motoricky n. hypoglossus (XII); citlivost rostrálních dvou třetin n. lingualis (V3), chuť chorda tympani (VII); kaudální třetina n. glossopharyngeus (IX).',
      'Motor: hypoglossal nerve (XII). Rostral two thirds: sensation by the lingual nerve (V3), taste by the chorda tympani (VII); caudal third: glossopharyngeal nerve (IX).',
    ),
    p('Který nerv řídí pohyby jazyka?', 'Which nerve moves the tongue?'),
    p('N. hypoglossus (XII).', 'The hypoglossal nerve (XII).'),
  ),
  organ_ovary_L: ovary('vlevo', 'left'),
  organ_ovary_R: ovary('vpravo', 'right'),
  organ_uterus: card(
    p('Děloha · samice', 'Uterus · female'),
    p(
      'Zde se během březosti vyvíjejí plody.',
      'Houses the developing fetuses during pregnancy.',
    ),
    p(
      'Dvourohá děloha: dva dlouhé rohy probíhají od vaječníků kaudálně a mediálně a spojují se v krátké tělo dorzálně od močového měchýře; krček (cervix) leží u vchodu do pánve.',
      'Bicornuate uterus: two long horns run caudally and medially from the ovaries and join in a short body dorsal to the bladder; the cervix lies near the pelvic inlet.',
    ),
    p(
      'Zavěšena na širokém děložním vazu; dorzálně tračník a konečník, ventrálně močový měchýř; přes krček navazuje pochva.',
      'Suspended by the broad ligament; colon and rectum dorsally, bladder ventrally; the vagina continues caudally from the cervix.',
    ),
    p(
      'Autonomní: hypogastrické (sympatické) a pánevní (parasympatické) nervy.',
      'Autonomic: hypogastric (sympathetic) and pelvic (parasympathetic) nerves.',
    ),
    p(
      'Jaký typ dělohy má fena a kočka?',
      'What type of uterus do the bitch and the queen have?',
    ),
    p(
      'Dvourohou (uterus bicornis) s krátkým tělem.',
      'Bicornuate, with a short body.',
    ),
  ),
  organ_vagina: card(
    p('Pochva · samice', 'Vagina · female'),
    p('Kopulační orgán a porodní cesta.', 'Copulatory organ and birth canal.'),
    p(
      'V pánevním kanálu mezi krčkem dělohy a předsíní pochvy, ventrálně od konečníku a dorzálně od močové trubice.',
      'In the pelvic canal from the cervix to the vestibule, ventral to the rectum and dorsal to the urethra.',
    ),
    p(
      'Kraniálně krček dělohy, kaudálně předsíň pochvy (vestibulum), do které ústí močová trubice.',
      'Cervix cranially; the vestibule caudally, where the urethra opens.',
    ),
    p(
      'Pánevní (autonomní) nervy a n. pudendus (somatický, kaudální část).',
      'Pelvic (autonomic) nerves and the pudendal nerve (somatic, caudal part).',
    ),
    p(
      'Co leží dorzálně od pochvy v pánevním kanálu?',
      'What lies dorsal to the vagina in the pelvic canal?',
    ),
    p('Konečník.', 'The rectum.'),
  ),
};

// Cat and rabbit: the dog layer retargeted to their proportions, with
// species-specific topography where the references differ from the dog.
const SPECIES = {
  cat: { cs: 'kočky', en: 'cat' },
  rabbit: { cs: 'králíka', en: 'rabbit' },
  ferret: { cs: 'fretky', en: 'ferret' },
  guinea_pig: { cs: 'morčete', en: 'guinea pig' },
};
// Ferret and guinea pig: dog-derived layout with generic wording where the dog
// values would mislead.
const generic = (sp) => ({
  organ_spinal_cord: {
    location: p(
      `V páteřním kanálu od velkého týlního otvoru; úroveň, kde mícha ${SPECIES[sp].cs} končí, se od psa liší (ověřte podle učebnice).`,
      `In the vertebral canal from the foramen magnum; the level where the ${SPECIES[sp].en}’s cord ends differs from the dog (check your textbook).`,
    ),
    answer: p(
      'Úroveň se liší od psa; ověřte podle učebnice.',
      'It differs from the dog; check your textbook.',
    ),
  },
  organ_uterus: {
    recall: p(
      `Jaký typ dělohy má samice ${SPECIES[sp].cs}?`,
      `What type of uterus does the female ${SPECIES[sp].en} have?`,
    ),
    answer: p('Dvourohou (uterus bicornis).', 'Bicornuate.'),
  },
});
const retargeted = (sp) =>
  p(
    `Schematický tvar převzatý z modelu psa a přenesený do proporcí ${SPECIES[sp].cs}; poloha vychází z rozvržení u psa, nejde o segmentaci ani přesnou velikost.`,
    `Schematic shape taken from the dog model and retargeted to the ${SPECIES[sp].en}’s proportions; placement follows the dog layout and is not segmented or to exact size.`,
  );
const brainNote = (sp) =>
  p(
    `Tvar psího mozku z MRI atlasu (Johnson & Barry 2019, CC0) přenesený do lebky ${SPECIES[sp].cs}; slouží k orientaci, nejde o mozek ${SPECIES[sp].cs}.`,
    `Dog brain shape from the MRI atlas (Johnson & Barry 2019, CC0) retargeted into the ${SPECIES[sp].en} skull for orientation; it is not a ${SPECIES[sp].en} brain.`,
  );

const overrides = {
  cat: {
    organ_kidney_R: {
      location: p(
        'Retroperitoneálně zhruba L1-L4 (podle zdrojů L1-L3); ledviny kočky leží kaudálněji a volněji než u psa a pravou od jater často odděluje tuk.',
        'Retroperitoneal at about L1-L4 (some sources L1-L3); cat kidneys lie more caudally and more loosely than the dog’s, and fat often separates the right one from the liver.',
      ),
    },
    organ_kidney_L: {
      location: p(
        'Retroperitoneálně zhruba L2-L5 (podle zdrojů L2-L4), kaudálněji než pravá; levá ledvina je pohyblivější.',
        'Retroperitoneal at about L2-L5 (some sources L2-L4), more caudal than the right; the left kidney is more mobile.',
      ),
    },
    organ_spinal_cord: {
      location: p(
        'V páteřním kanálu od velkého týlního otvoru; mícha kočky končí kaudálněji než u psa, přibližně v lumbosakrální oblasti.',
        'In the vertebral canal from the foramen magnum; the cat’s cord ends further caudally than the dog’s, around the lumbosacral region.',
      ),
      answer: p(
        'Přibližně v lumbosakrální oblasti, kaudálněji než u psa.',
        'Around the lumbosacral region, further caudally than in the dog.',
      ),
    },
    organ_heart: {
      location: p(
        'Ve středním mezihrudí, na rentgenu zhruba v rozsahu 4.-6. žebra; hrot směřuje ventrokaudálně a doleva.',
        'In the middle mediastinum, on radiographs at about ribs 4-6; the apex points ventrocaudally and to the left.',
      ),
      recall: p(
        'U kterých žeber leží srdce kočky?',
        'At which ribs does the cat’s heart lie?',
      ),
      answer: p('Přibližně u 4.-6. žebra.', 'About ribs 4-6.'),
    },
    organ_tongue: {
      location: p(
        'Na spodině dutiny ústní mezi těly dolní čelisti. Nitkovité papily nesou zrohovatělé, dozadu směřující ostny (drsný jazyk kočky).',
        'On the floor of the mouth between the bodies of the mandible. Filiform papillae carry keratinised, backward-pointing spines (the cat’s rough tongue).',
      ),
    },
    organ_bladder: {
      location: p(
        'V kaudální části břišní dutiny; u kočky leží měchýř obvykle celý v břišní dutině, před vchodem do pánve.',
        'In the caudal abdomen; in the cat the bladder usually lies wholly in the abdomen, cranial to the pelvic inlet.',
      ),
    },
  },
  rabbit: {
    organ_kidney_R: {
      location: p(
        'Retroperitoneálně zhruba T13-L2; poloha ledvin se mění s náplní žaludku.',
        'Retroperitoneal at about T13-L2; kidney position shifts with stomach fill.',
      ),
    },
    organ_kidney_L: {
      location: p(
        'Retroperitoneálně zhruba L2-L4, kaudálněji než pravá.',
        'Retroperitoneal at about L2-L4, more caudal than the right.',
      ),
    },
    organ_spinal_cord: {
      location: p(
        'V páteřním kanálu od velkého týlního otvoru; mícha králíka sahá daleko kaudálně a obvykle končí u S2 (rozmezí S1-S3).',
        'In the vertebral canal from the foramen magnum; the rabbit’s cord reaches far caudally and usually ends at S2 (range S1-S3).',
      ),
      answer: p('Obvykle u S2 (S1-S3).', 'Usually at S2 (S1-S3).'),
    },
    organ_heart: {
      location: p(
        'Ve středním mezihrudí, kraniálněji než u psa, zhruba od 2. do 5. mezižebří. U dospělého králíka přetrvává brzlík (thymus) kraniálně od srdce; v modelu není.',
        'In the middle mediastinum, more cranially than in the dog, at about the 2nd to the 5th intercostal space. The thymus persists cranial to the heart in adult rabbits; it is not modelled.',
      ),
      answer: p(
        'Přibližně 2. až 5. mezižebří.',
        'About the 2nd to the 5th intercostal space.',
      ),
    },
    organ_lung_L: {
      answer: p(
        'Dva (kraniální a kaudální; názvosloví se liší); kraniální laloky jsou malé.',
        'Two (cranial and caudal; naming varies); the cranial lobes are small.',
      ),
    },
    organ_lung_R: {
      answer: p(
        'Čtyři (kraniální, střední, kaudální a velmi malý přídatný).',
        'Four (cranial, middle, caudal and a very small accessory lobe).',
      ),
    },
    organ_tongue: {
      location: p(
        'Na spodině dutiny ústní mezi těly dolní čelisti; kaudálně se hřbet jazyka zvedá ve výrazný val (torus linguae).',
        'On the floor of the mouth between the bodies of the mandible; caudally the dorsum rises into a prominent torus linguae.',
      ),
    },
    organ_uterus: {
      location: p(
        'Dvojitá děloha (uterus duplex): dva zcela oddělené rohy, každý s vlastním krčkem, ústí samostatně do pochvy; tělo dělohy chybí.',
        'Duplex uterus: two completely separate horns, each with its own cervix, opening separately into the vagina; there is no uterine body.',
      ),
      recall: p(
        'Jaký typ dělohy má králík?',
        'What type of uterus does the rabbit have?',
      ),
      answer: p(
        'Dvojitou (uterus duplex) se dvěma krčky, bez těla dělohy.',
        'Duplex, with two cervices and no uterine body.',
      ),
    },
    organ_small_intestine: {
      connections: p(
        'Kyčelník ústí přes sacculus rotundus do slepého střeva.',
        'The ileum opens into the caecum via the sacculus rotundus.',
      ),
    },
  },
};

const rabbitCaecum = card(
  p('Slepé střevo', 'Caecum'),
  p(
    'Fermentační komora: mikrobiální trávení vlákniny a tvorba měkkých výkalů (cékotrofů), které králík znovu přijímá.',
    'Fermentation chamber: microbial digestion of fibre and formation of caecotrophs, which the rabbit re-ingests.',
  ),
  p(
    'Největší orgán břišní dutiny králíka: tenkostěnné, sakulované střevo uložené v ohybech ve ventrální části břicha, zakončené slepým červovitým výběžkem (appendix vermiformis).',
    'The largest organ in the rabbit abdomen: a thin-walled, sacculated gut folded through the ventral abdomen and ending in the blind vermiform appendix.',
  ),
  p(
    'Kyčelník do něj ústí přes sacculus rotundus; pokračuje tlusté střevo (colon).',
    'The ileum enters it via the sacculus rotundus; the colon continues from it.',
  ),
  vagus,
  p('Čím končí slepé střevo králíka?', 'How does the rabbit caecum end?'),
  p(
    'Červovitým výběžkem (appendix vermiformis) s lymfatickou tkání.',
    'In the vermiform appendix, rich in lymphoid tissue.',
  ),
);

/** Organ cards for the cat or rabbit pack, keyed by part id. */
export function organStudyFor(sp) {
  const swap = (b) =>
    b && {
      cs: b.cs.replace(/\bpsa\b/g, SPECIES[sp].cs),
      en: b.en
        .replace(/\bdog’s\b/g, `${SPECIES[sp].en}’s`)
        .replace(/\bthe dog\b/g, `the ${SPECIES[sp].en}`),
    };
  const all = {
    ...organStudy,
    ...(sp === 'rabbit' || sp === 'guinea_pig'
      ? { organ_caecum: rabbitCaecum }
      : {}),
  };
  return Object.fromEntries(
    Object.entries(all).map(([id, c]) => {
      const o = (overrides[sp] ?? generic(sp))[id] ?? {};
      const study = { ...c.study };
      for (const k of ['location', 'connections', 'recall', 'answer'])
        study[k] = o[k] ?? swap(c.study[k]);
      study.difference = id.startsWith('brain_')
        ? brainNote(sp)
        : retargeted(sp);
      // The guinea pig reuses the rabbit caecum card with its own name.
      const named = (b) =>
        sp === 'guinea_pig' && b
          ? {
              cs: b.cs
                .replace(/králíka/g, 'morčete')
                .replace(/králík/g, 'morče'),
              en: b.en.replace(/rabbit/g, 'guinea pig'),
            }
          : b;
      for (const k of Object.keys(study))
        if (study[k]?.cs) study[k] = named(study[k]);
      return [
        id,
        { ...c, label: named(c.label), action: named(swap(c.action)), study },
      ];
    }),
  );
}
