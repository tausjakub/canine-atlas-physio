// Bilingual study cards for the clinical-anatomy layer (scripts/blender/clinical.py):
// palpable landmarks, rib numbers, auscultation areas, superficial lymph nodes,
// superficial vessels, limb nerves and spinal cord segment regions.
// Descriptive topography only: no procedures, interpretation or diagnosis.
const p = (cs, en) => ({ cs, en });
const UMN = 'https://vanat.ahc.umn.edu/carnLabs/';
const SCHEMA = p(
  'Schematická značka umístěná podle kostí, svalů a kůže modelu; poloha je přibližná a slouží k orientaci.',
  'Schematic marker placed from the model’s bones, muscles and skin; the position is approximate and meant for orientation.',
);
const sides = [
  ['L', 'vlevo', 'left'],
  ['R', 'vpravo', 'right'],
];

function card(label, action, location, connections, nerve, recall, answer) {
  return {
    label,
    action,
    study: {
      location,
      connections,
      nerve,
      difference: SCHEMA,
      recall,
      answer,
      reference: UMN,
      depth: 'superficial',
    },
  };
}
// [cs label, en label] + text pairs; expands to _L and _R cards.
function bilateral(id, label, ...rest) {
  return Object.fromEntries(
    sides.map(([tag, cs, en]) => [
      `${id}_${tag}`,
      card(p(`${label.cs} · ${cs}`, `${label.en} · ${en}`), ...rest),
    ]),
  );
}
const palp = p(
  'Hmatný kostní bod pro orientaci při vyšetření pohmatem a pro popis polohy okolních struktur.',
  'Palpable bony point for orientation during palpation and for describing the position of nearby structures.',
);
const lymph = p(
  'Mízní uzlina: filtruje mízu z oblasti, kterou drénuje; povrchové uzliny mohou být hmatné.',
  'Lymph node: filters lymph from the area it drains; superficial nodes may be palpable.',
);
const noNerve = null;

const landmarks = {
  ...bilateral(
    'lm_scapular_spine',
    p('Hřeben lopatky', 'Spine of the scapula'),
    palp,
    p(
      'Laterální plocha lopatky; dělí ji na jámu nadhřebenovou a podhřebenovou.',
      'Lateral surface of the scapula; divides it into the supraspinous and infraspinous fossae.',
    ),
    p(
      'Odstupuje z něj m. deltoideus; kraniálně leží m. supraspinatus, kaudálně m. infraspinatus.',
      'Origin of the deltoideus; the supraspinatus lies cranial and the infraspinatus caudal to it.',
    ),
    noNerve,
    p(
      'Které svaly vyplňují jámy po obou stranách hřebene lopatky?',
      'Which muscles fill the fossae on either side of the scapular spine?',
    ),
    p(
      'M. supraspinatus a m. infraspinatus.',
      'Supraspinatus and infraspinatus.',
    ),
  ),
  ...bilateral(
    'lm_acromion',
    p('Akromion', 'Acromion'),
    palp,
    p(
      'Distální konec hřebene lopatky nad ramenním kloubem.',
      'Distal end of the scapular spine, above the shoulder joint.',
    ),
    p(
      'Odstupuje z něj nadpažková část m. deltoideus.',
      'Origin of the acromial part of the deltoideus.',
    ),
    noNerve,
    p(
      'Kde končí hřeben lopatky distálně?',
      'Where does the scapular spine end distally?',
    ),
    p(
      'Akromionem nad ramenním kloubem.',
      'At the acromion, above the shoulder joint.',
    ),
  ),
  ...bilateral(
    'lm_greater_tubercle',
    p('Velký hrbol pažní kosti', 'Greater tubercle of the humerus'),
    palp,
    p(
      'Kraniolaterálně na proximálním konci pažní kosti; tvoří „hrot ramene“.',
      'Craniolateral on the proximal humerus; forms the point of the shoulder.',
    ),
    p(
      'Upíná se na něj m. supraspinatus; kaudálně navazuje m. infraspinatus.',
      'Insertion of the supraspinatus; the infraspinatus inserts just caudally.',
    ),
    noNerve,
    p(
      'Který sval z nadhřebenové jámy se upíná na velký hrbol?',
      'Which muscle from the supraspinous fossa inserts on the greater tubercle?',
    ),
    p('M. supraspinatus.', 'The supraspinatus.'),
  ),
  ...bilateral(
    'lm_lateral_epicondyle',
    p('Laterální epikondyl pažní kosti', 'Lateral epicondyle of the humerus'),
    palp,
    p(
      'Laterálně na distálním konci pažní kosti, u loketního kloubu.',
      'Lateral on the distal humerus, at the elbow.',
    ),
    p(
      'Odstupují z něj extenzory karpu a prstů; je úponem laterálního kolaterálního vazu lokte.',
      'Origin of the carpal and digital extensors; attachment of the lateral collateral ligament of the elbow.',
    ),
    noNerve,
    p(
      'Které svaly odstupují z laterálního epikondylu?',
      'Which muscles arise from the lateral epicondyle?',
    ),
    p('Extenzory karpu a prstů.', 'The carpal and digital extensors.'),
  ),
  ...bilateral(
    'lm_olecranon',
    p('Olekranon', 'Olecranon'),
    palp,
    p(
      'Kaudální výběžek proximálního konce loketní kosti; hrot lokte.',
      'Caudal process of the proximal ulna; the point of the elbow.',
    ),
    p(
      'Upíná se na něj m. triceps brachii.',
      'Insertion of the triceps brachii.',
    ),
    noNerve,
    p(
      'Který hlavní sval se upíná na olekranon?',
      'Which main muscle inserts on the olecranon?',
    ),
    p('M. triceps brachii.', 'The triceps brachii.'),
  ),
  ...bilateral(
    'lm_accessory_carpal',
    p('Přídatná kost zápěstní', 'Accessory carpal bone'),
    palp,
    p(
      'Palmárně a laterálně na zápěstí; nejvýraznější hmatný bod karpu.',
      'Palmar and lateral on the carpus; its most prominent palpable point.',
    ),
    p(
      'Upíná se na ni m. flexor carpi ulnaris.',
      'Insertion of the flexor carpi ulnaris.',
    ),
    noNerve,
    p(
      'Který ohybač zápěstí se upíná na přídatnou kost zápěstní?',
      'Which carpal flexor inserts on the accessory carpal bone?',
    ),
    p('M. flexor carpi ulnaris.', 'The flexor carpi ulnaris.'),
  ),
  ...bilateral(
    'lm_iliac_crest',
    p('Hřeben kyčelní kosti', 'Iliac crest'),
    palp,
    p(
      'Kraniodorzální okraj křídla kyčelní kosti po stranách bederní páteře.',
      'Craniodorsal border of the iliac wing beside the lumbar spine.',
    ),
    p(
      'Odstupuje z něj m. gluteus medius a připojují se svaly břišní stěny.',
      'Attachment of abdominal wall muscles and the gluteus medius.',
    ),
    noNerve,
    p(
      'Který hýžďový sval odstupuje z křídla kyčelní kosti?',
      'Which gluteal muscle arises from the iliac wing?',
    ),
    p('M. gluteus medius.', 'The gluteus medius.'),
  ),
  ...bilateral(
    'lm_tuber_coxae',
    p('Kyčelní hrbol (tuber coxae)', 'Tuber coxae'),
    palp,
    p(
      'Kranioventrální roh křídla kyčelní kosti.',
      'Cranioventral angle of the iliac wing.',
    ),
    p(
      'Odstupuje z něj m. sartorius a m. tensor fasciae latae.',
      'Origin of the sartorius and tensor fasciae latae.',
    ),
    noNerve,
    p(
      'Které svaly odstupují z tuber coxae?',
      'Which muscles arise from the tuber coxae?',
    ),
    p(
      'M. tensor fasciae latae (a m. sartorius).',
      'The tensor fasciae latae (and sartorius).',
    ),
  ),
  ...bilateral(
    'lm_tuber_ischiadicum',
    p('Sedací hrbol (tuber ischiadicum)', 'Ischiatic tuberosity'),
    palp,
    p(
      'Kaudolaterální konec sedací kosti po stranách kořene ocasu.',
      'Caudolateral end of the ischium beside the tail base.',
    ),
    p(
      'Odstupují z něj hamstringy: m. biceps femoris, m. semitendinosus, m. semimembranosus.',
      'Origin of the hamstrings: biceps femoris, semitendinosus, semimembranosus.',
    ),
    noNerve,
    p(
      'Které svaly odstupují ze sedacího hrbolu?',
      'Which muscles arise from the ischiatic tuberosity?',
    ),
    p('Hamstringy.', 'The hamstrings.'),
  ),
  ...bilateral(
    'lm_greater_trochanter',
    p('Velký chocholík stehenní kosti', 'Greater trochanter of the femur'),
    palp,
    p(
      'Laterálně na proximálním konci stehenní kosti, nad kyčelním kloubem.',
      'Lateral on the proximal femur, above the hip joint.',
    ),
    p(
      'Upínají se na něj m. gluteus medius a m. gluteus profundus.',
      'Insertion of the gluteus medius and gluteus profundus.',
    ),
    noNerve,
    p(
      'S kterými dvěma body tvoří velký chocholík trojúhelník kyčle?',
      'With which two points does the greater trochanter form the hip triangle?',
    ),
    p(
      'S tuber coxae a sedacím hrbolem.',
      'The tuber coxae and the ischiatic tuberosity.',
    ),
  ),
  ...bilateral(
    'lm_patella',
    p('Čéška', 'Patella'),
    palp,
    p(
      'Kraniálně na kolenním kloubu, v šlaše m. quadriceps femoris.',
      'Cranial on the stifle, within the quadriceps tendon.',
    ),
    p(
      'Pokračuje přímým vazem čéšky k drsnatině holenní kosti.',
      'Continues as the patellar ligament to the tibial tuberosity.',
    ),
    noNerve,
    p(
      'Kam se upíná přímý vaz čéšky?',
      'Where does the patellar ligament insert?',
    ),
    p('Na drsnatinu holenní kosti.', 'On the tibial tuberosity.'),
  ),
  ...bilateral(
    'lm_tibial_tuberosity',
    p('Drsnatina holenní kosti', 'Tibial tuberosity'),
    palp,
    p(
      'Kraniálně na proximálním konci holenní kosti.',
      'Cranial on the proximal tibia.',
    ),
    p('Úpon přímého vazu čéšky.', 'Insertion of the patellar ligament.'),
    noNerve,
    p(
      'Která struktura se upíná na drsnatinu holenní kosti?',
      'What inserts on the tibial tuberosity?',
    ),
    p('Přímý vaz čéšky.', 'The patellar ligament.'),
  ),
  ...bilateral(
    'lm_lateral_malleolus',
    p('Laterální kotník', 'Lateral malleolus'),
    palp,
    p(
      'Distální konec lýtkové kosti laterálně na hlezně.',
      'Distal end of the fibula, lateral on the tarsus.',
    ),
    p(
      'Úpon laterálního kolaterálního vazu hlezna.',
      'Attachment of the lateral collateral ligament of the tarsus.',
    ),
    noNerve,
    p(
      'Kterou kostí je tvořen laterální kotník?',
      'Which bone forms the lateral malleolus?',
    ),
    p('Lýtkovou kostí (fibula).', 'The fibula.'),
  ),
  ...bilateral(
    'lm_calcaneal_tuber',
    p('Patní hrbol', 'Calcaneal tuber'),
    palp,
    p(
      'Proximální výběžek patní kosti; hrot hlezna.',
      'Proximal process of the calcaneus; the point of the hock.',
    ),
    p(
      'Úpon společné patní (Achillovy) šlachy.',
      'Insertion of the common calcanean (Achilles) tendon.',
    ),
    noNerve,
    p(
      'Která šlacha se upíná na patní hrbol?',
      'Which tendon inserts on the calcaneal tuber?',
    ),
    p('Společná patní šlacha.', 'The common calcanean tendon.'),
  ),
  ...bilateral(
    'lm_atlas_wing',
    p('Křídlo nosiče (atlasu)', 'Wing of the atlas'),
    palp,
    p(
      'Laterální výběžek prvního krčního obratle kaudálně od lebky.',
      'Lateral process of the first cervical vertebra, just caudal to the skull.',
    ),
    p(
      'Upínají se na něj krátké šíjové svaly (m. obliquus capitis).',
      'Attachment of the short nuchal muscles (obliquus capitis).',
    ),
    noNerve,
    p('Který obratel nese křídla?', 'Which vertebra bears the wings?'),
    p('Nosič (atlas, C1).', 'The atlas (C1).'),
  ),
  ...bilateral(
    'lm_rib_numbers',
    p('Čísla žeber', 'Rib numbers'),
    p(
      'Orientace na hrudníku: mezižebří n leží mezi žebry n a n+1; při orientaci na těle se žebra počítají od posledního (13.) žebra kraniálně.',
      'Orientation on the thorax: intercostal space n lies between ribs n and n+1; on the animal, ribs are counted cranially from the last (13th) rib.',
    ),
    p(
      'Značka na nejlaterálnějším bodě každého žebra; mezižebří n leží mezi žebry n a n+1.',
      'Marker on the most lateral point of each rib; intercostal space n lies between ribs n and n+1.',
    ),
    p(
      'Pes má 13 párů žeber; 9 je sternálních, 4 asternální.',
      'The dog has 13 pairs of ribs: 9 sternal and 4 asternal.',
    ),
    p(
      'Mezižeberní nervy (ventrální větve hrudních míšních nervů).',
      'Intercostal nerves (ventral branches of the thoracic spinal nerves).',
    ),
    p('Kolik párů žeber má pes?', 'How many pairs of ribs does the dog have?'),
    p('13.', '13.'),
  ),
};

const ausc = (name, en, side, space, cs, enText) =>
  card(
    p(`Poslechové místo · ${name}`, `Auscultation area · ${en}`),
    p(
      'Místo, kde je zvuk dané chlopně na hrudní stěně nejlépe slyšitelný (punctum maximum).',
      'Point on the chest wall where the sound of this valve is heard best (punctum maximum).',
    ),
    p(cs, enText),
    p(
      `Přibližně ${side.cs} ${space === 5 ? 'v' : 've'} ${space}. mezižebří; poloha se mezi jedinci a plemeny liší.`,
      `About the ${side.en} ${space}${space === 3 ? 'rd' : 'th'} intercostal space; position varies between individuals and breeds.`,
    ),
    p(
      'N. vagus a sympatikus (srdce).',
      'Vagus and sympathetic nerves (heart).',
    ),
    p(
      `Ve kterém mezižebří je poslechové místo chlopně ${name}?`,
      `Which intercostal space is the ${en} area in?`,
    ),
    p(
      `${side.cs === 'vlevo' ? 'Levé' : 'Pravé'} ${space}. mezižebří.`,
      `The ${side.en} ${space}${space === 3 ? 'rd' : 'th'}.`,
    ),
  );
const left = { cs: 'vlevo', en: 'left' },
  right = { cs: 'vpravo', en: 'right' };
const auscultation = {
  ausc_pulmonic: ausc(
    'pulmonální',
    'pulmonic',
    left,
    3,
    'Vlevo nízko u okraje hrudní kosti.',
    'Left side, low near the sternal border.',
  ),
  ausc_aortic: ausc(
    'aortální',
    'aortic',
    left,
    4,
    'Vlevo, dorzálněji než pulmonální místo, přibližně v úrovni ramenního kloubu.',
    'Left side, more dorsal than the pulmonic area, about at the level of the shoulder joint.',
  ),
  ausc_mitral: ausc(
    'mitrální',
    'mitral',
    left,
    5,
    'Vlevo u kostochondrálních spojení (oblast úderu hrotu).',
    'Left side at the costochondral junctions (apex beat area).',
  ),
  ausc_tricuspid: ausc(
    'trikuspidální',
    'tricuspid',
    right,
    4,
    'Vpravo u kostochondrálních spojení.',
    'Right side at the costochondral junctions.',
  ),
};

const nodes = {
  ...bilateral(
    'ln_mandibular',
    p('Podčelistní mízní uzliny', 'Mandibular lymph nodes'),
    lymph,
    p(
      'Ventrálně u úhlu dolní čelisti; několik uzlin (obvykle 2-5).',
      'Ventral to the angle of the mandible; several nodes (usually 2-5).',
    ),
    p(
      'Sbírají mízu z rostrální části hlavy (ústní dutina, pysky, nos, kůže obličeje); leží před podčelistní slinnou žlázou.',
      'Drain the rostral head (oral cavity, lips, nose, facial skin); lie rostral to the mandibular salivary gland.',
    ),
    noNerve,
    p(
      'Která žláza leží kaudálně od podčelistních uzlin?',
      'Which gland lies caudal to the mandibular nodes?',
    ),
    p('Podčelistní slinná žláza.', 'The mandibular salivary gland.'),
  ),
  ...bilateral(
    'ln_superficial_cervical',
    p(
      'Povrchová krční (předlopatková) uzlina',
      'Superficial cervical (prescapular) lymph node',
    ),
    lymph,
    p(
      'Kraniálně od ramenního kloubu a lopatky, pod m. omotransversarius.',
      'Cranial to the shoulder joint and scapula, deep to the omotransversarius.',
    ),
    p(
      'Sbírá mízu z krku, hrudní končetiny a části hrudní stěny.',
      'Drains the neck, thoracic limb and part of the chest wall.',
    ),
    noNerve,
    p('Kde leží předlopatková uzlina?', 'Where does the prescapular node lie?'),
    p('Kraniálně od ramenního kloubu.', 'Cranial to the shoulder joint.'),
  ),
  ...bilateral(
    'ln_axillary',
    p('Podpažní mízní uzlina', 'Axillary lymph node'),
    lymph,
    p(
      'Mediálně od hrudní končetiny v podpaží, na hrudní stěně.',
      'Medial to the thoracic limb in the axilla, on the chest wall.',
    ),
    p(
      'Sbírá mízu z hrudní končetiny a hrudní stěny (včetně kraniálních mléčných žláz).',
      'Drains the thoracic limb and chest wall (including the cranial mammary glands).',
    ),
    noNerve,
    p(
      'Na které straně končetiny leží podpažní uzlina?',
      'On which side of the limb is the axillary node?',
    ),
    p('Mediálně, v podpaží.', 'Medially, in the axilla.'),
  ),
  ...bilateral(
    'ln_superficial_inguinal',
    p('Povrchové tříselné mízní uzliny', 'Superficial inguinal lymph nodes'),
    lymph,
    p(
      'V tříslu mezi břišní stěnou a stehnem.',
      'In the groin between the abdominal wall and the thigh.',
    ),
    p(
      'Sbírají mízu z kaudální břišní stěny, zevních pohlavních orgánů a kaudálních mléčných žláz.',
      'Drain the caudal abdominal wall, external genitalia and caudal mammary glands.',
    ),
    noNerve,
    p(
      'Odkud sbírají mízu tříselné uzliny?',
      'What do the superficial inguinal nodes drain?',
    ),
    p(
      'Kaudální břišní stěnu, zevní genitál a kaudální mléčné žlázy.',
      'Caudal abdominal wall, external genitalia, caudal mammary glands.',
    ),
  ),
  ...bilateral(
    'ln_popliteal',
    p('Podkolenní mízní uzlina', 'Popliteal lymph node'),
    lymph,
    p(
      'Kaudálně od kolenního kloubu v tukové tkáni mezi m. biceps femoris a m. semitendinosus.',
      'Caudal to the stifle, in fat between the biceps femoris and semitendinosus.',
    ),
    p(
      'Sbírá mízu z distální části pánevní končetiny.',
      'Drains the distal pelvic limb.',
    ),
    noNerve,
    p(
      'Mezi kterými svaly nahmatáte podkolenní uzlinu?',
      'Between which muscles is the popliteal node palpated?',
    ),
    p(
      'M. biceps femoris a m. semitendinosus.',
      'Biceps femoris and semitendinosus.',
    ),
  ),
};

const vessels = {
  ...bilateral(
    'v_external_jugular',
    p('Zevní jugulární žíla', 'External jugular vein'),
    p(
      'Odvádí krev z hlavy a krku přes v. brachiocephalica do přední duté žíly.',
      'Drains the head and neck via the brachiocephalic vein into the cranial vena cava.',
    ),
    p(
      'V jugulárním žlábku na ventrolaterální straně krku.',
      'In the jugular groove on the ventrolateral neck.',
    ),
    p(
      'Vzniká spojením linguofaciální a maxilární žíly; přijímá v. cephalica (přes v. omobrachialis).',
      'Formed by the linguofacial and maxillary veins; receives the cephalic vein (via the omobrachial vein).',
    ),
    noNerve,
    p(
      'Ve kterém žlábku leží zevní jugulární žíla?',
      'In which groove does the external jugular vein lie?',
    ),
    p('V jugulárním žlábku.', 'The jugular groove.'),
  ),
  ...bilateral(
    'v_cephalic',
    p('Hlavová žíla (v. cephalica)', 'Cephalic vein'),
    p(
      'Povrchová žíla hrudní končetiny.',
      'Superficial vein of the thoracic limb.',
    ),
    p(
      'Na kraniální (dorzální) ploše předloktí, pokračuje laterálně na paži.',
      'On the cranial (dorsal) surface of the forearm, continuing laterally up the arm.',
    ),
    p(
      'Ústí do zevní jugulární žíly (přes v. omobrachialis).',
      'Drains into the external jugular vein (via the omobrachial vein).',
    ),
    noNerve,
    p(
      'Na které ploše předloktí leží v. cephalica?',
      'On which surface of the forearm does the cephalic vein run?',
    ),
    p('Na kraniální (dorzální).', 'The cranial (dorsal) surface.'),
  ),
  ...bilateral(
    'v_lateral_saphenous',
    p('Laterální skrytá žíla (v. saphena lateralis)', 'Lateral saphenous vein'),
    p(
      'Povrchová žíla pánevní končetiny.',
      'Superficial vein of the pelvic limb.',
    ),
    p(
      'Šikmo přes laterální plochu distální části bérce, nad hleznem.',
      'Obliquely across the lateral distal crus, just proximal to the hock.',
    ),
    p(
      'Ústí do v. femoralis caudalis (přes kaudální stehno).',
      'Drains into the caudal femoral vein via the caudal thigh.',
    ),
    noNerve,
    p(
      'Kde leží laterální skrytá žíla?',
      'Where does the lateral saphenous vein run?',
    ),
    p(
      'Laterálně na distálním bérci nad hleznem.',
      'Laterally on the distal crus above the hock.',
    ),
  ),
  ...bilateral(
    'v_femoral_artery',
    p('Stehenní tepna (a. femoralis)', 'Femoral artery'),
    p(
      'Hlavní tepna pánevní končetiny; je přístupná pohmatem na mediální straně stehna.',
      'Main artery of the pelvic limb; accessible to palpation on the medial thigh.',
    ),
    p(
      'Mediálně na stehně ve stehenním trojúhelníku.',
      'Medial thigh, in the femoral triangle.',
    ),
    p(
      'Pokračování a. iliaca externa; dále jako a. poplitea.',
      'Continuation of the external iliac artery; continues as the popliteal artery.',
    ),
    noNerve,
    p(
      'Kde na stehně leží a. femoralis?',
      'Where does the femoral artery lie on the thigh?',
    ),
    p(
      'Mediálně na stehně ve stehenním trojúhelníku.',
      'Medially, in the femoral triangle.',
    ),
  ),
};

const nerve = (id, label, action, location, muscles, segs, recall, answer) =>
  bilateral(id, label, action, location, muscles, segs, recall, answer);
const nerves = {
  ...nerve(
    'n_radial',
    p('N. radialis', 'Radial nerve'),
    p(
      'Inervuje extenzory lokte, karpu a prstů a kůži dorzální plochy předloktí a tlapy.',
      'Supplies the extensors of the elbow, carpus and digits and the skin of the dorsal forearm and paw.',
    ),
    p(
      'Z podpaží kaudálně kolem pažní kosti, laterálně k lokti a dál kraniolaterálně po předloktí.',
      'From the axilla caudally around the humerus, laterally to the elbow and on along the craniolateral forearm.',
    ),
    p(
      'M. triceps brachii, m. extensor carpi radialis, extenzory prstů.',
      'Triceps brachii, extensor carpi radialis, digital extensors.',
    ),
    p('Brachiální plexus, segmenty C7-T2.', 'Brachial plexus, segments C7-T2.'),
    p(
      'Který nerv inervuje m. triceps brachii?',
      'Which nerve supplies the triceps brachii?',
    ),
    p('N. radialis.', 'The radial nerve.'),
  ),
  ...nerve(
    'n_median',
    p('N. medianus', 'Median nerve'),
    p(
      'Inervuje flexory karpu a prstů (s n. ulnaris) a přivraceče (pronátory).',
      'Supplies the carpal and digital flexors (with the ulnar nerve) and the pronators.',
    ),
    p(
      'Mediálně na paži, kraniomediálně přes loket a mediálně po předloktí.',
      'Medial arm, craniomedial across the elbow and down the medial forearm.',
    ),
    p(
      'M. flexor carpi radialis, m. pronator teres, část hlubokého flexoru prstů.',
      'Flexor carpi radialis, pronator teres, part of the deep digital flexor.',
    ),
    p('Brachiální plexus, segmenty C8-T2.', 'Brachial plexus, segments C8-T2.'),
    p(
      'Na které straně lokte prochází n. medianus?',
      'On which side of the elbow does the median nerve pass?',
    ),
    p('Kraniomediálně.', 'Craniomedially.'),
  ),
  ...nerve(
    'n_ulnar',
    p('N. ulnaris', 'Ulnar nerve'),
    p(
      'Inervuje flexory karpu a prstů a kůži kaudální plochy předloktí.',
      'Supplies carpal and digital flexors and the skin of the caudal forearm.',
    ),
    p(
      'Mediálně na paži, kaudálně za mediálním epikondylem, po kaudální ploše předloktí.',
      'Medial arm, caudal to the medial epicondyle, down the caudal forearm.',
    ),
    p(
      'M. flexor carpi ulnaris, část hlubokého flexoru prstů.',
      'Flexor carpi ulnaris, part of the deep digital flexor.',
    ),
    p('Brachiální plexus, segmenty C8-T2.', 'Brachial plexus, segments C8-T2.'),
    p(
      'Za kterým kostním útvarem prochází n. ulnaris u lokte?',
      'Behind which bony prominence does the ulnar nerve pass at the elbow?',
    ),
    p(
      'Za mediálním epikondylem pažní kosti.',
      'Behind the medial epicondyle of the humerus.',
    ),
  ),
  ...nerve(
    'n_musculocutaneous',
    p('N. musculocutaneus', 'Musculocutaneous nerve'),
    p(
      'Inervuje flexory lokte a m. coracobrachialis.',
      'Supplies the elbow flexors and the coracobrachialis.',
    ),
    p('Kraniomediálně na paži k lokti.', 'Craniomedial arm to the elbow.'),
    p(
      'M. biceps brachii, m. brachialis, m. coracobrachialis.',
      'Biceps brachii, brachialis, coracobrachialis.',
    ),
    p('Brachiální plexus, segmenty C6-C8.', 'Brachial plexus, segments C6-C8.'),
    p(
      'Který nerv inervuje m. biceps brachii?',
      'Which nerve supplies the biceps brachii?',
    ),
    p('N. musculocutaneus.', 'The musculocutaneous nerve.'),
  ),
  ...nerve(
    'n_femoral',
    p('N. femoralis', 'Femoral nerve'),
    p(
      'Inervuje m. quadriceps femoris (extenze kolene) a m. iliopsoas.',
      'Supplies the quadriceps femoris (stifle extension) and iliopsoas.',
    ),
    p(
      'Z bederní oblasti přes m. iliopsoas do stehenního trojúhelníku a do m. quadriceps.',
      'From the lumbar region through the iliopsoas into the femoral triangle and the quadriceps.',
    ),
    p(
      'M. quadriceps femoris, m. sartorius, m. iliopsoas; kožní větev n. saphenus.',
      'Quadriceps femoris, sartorius, iliopsoas; cutaneous branch: saphenous nerve.',
    ),
    p('Bederní plexus, segmenty L4-L6.', 'Lumbar plexus, segments L4-L6.'),
    p(
      'Který nerv inervuje m. quadriceps femoris?',
      'Which nerve supplies the quadriceps femoris?',
    ),
    p('N. femoralis.', 'The femoral nerve.'),
  ),
  ...nerve(
    'n_sciatic',
    p('N. ischiadicus', 'Sciatic nerve'),
    p(
      'Inervuje hamstringy a přes své větve svaly bérce a tlapy.',
      'Supplies the hamstrings and, through its branches, the muscles of the crus and paw.',
    ),
    p(
      'Přes velký sedací zářez, kaudálně od kyčelního kloubu mezi velkým chocholíkem a sedacím hrbolem, po kaudální ploše stehna.',
      'Over the greater ischiatic notch, caudal to the hip between the greater trochanter and ischiatic tuberosity, down the caudal thigh.',
    ),
    p(
      'M. biceps femoris, m. semitendinosus, m. semimembranosus.',
      'Biceps femoris, semitendinosus, semimembranosus.',
    ),
    p(
      'Lumbosakrální plexus, segmenty L6-S1 (S2).',
      'Lumbosacral plexus, segments L6-S1 (S2).',
    ),
    p(
      'Mezi kterými dvěma kostními body prochází n. ischiadicus u kyčle?',
      'Between which two bony points does the sciatic nerve pass at the hip?',
    ),
    p(
      'Mezi velkým chocholíkem a sedacím hrbolem.',
      'Between the greater trochanter and the ischiatic tuberosity.',
    ),
  ),
  ...nerve(
    'n_tibial',
    p('N. tibialis', 'Tibial nerve'),
    p(
      'Inervuje extenzory hlezna a flexory prstů.',
      'Supplies the hock extensors and digital flexors.',
    ),
    p(
      'Větev n. ischiadicus; mezi hlavami m. gastrocnemius kaudálně po bérci k hleznu.',
      'Branch of the sciatic; between the heads of the gastrocnemius down the caudal crus to the hock.',
    ),
    p(
      'M. gastrocnemius, m. flexor digitorum superficialis a profundus.',
      'Gastrocnemius, superficial and deep digital flexors.',
    ),
    p(
      'Segmenty L7-S1 (přes n. ischiadicus).',
      'Segments L7-S1 (via the sciatic).',
    ),
    p(
      'Který nerv inervuje m. gastrocnemius?',
      'Which nerve supplies the gastrocnemius?',
    ),
    p('N. tibialis.', 'The tibial nerve.'),
  ),
  ...nerve(
    'n_common_peroneal',
    p('N. fibularis (peroneus) communis', 'Common peroneal (fibular) nerve'),
    p(
      'Inervuje flexory hlezna a extenzory prstů.',
      'Supplies the hock flexors and digital extensors.',
    ),
    p(
      'Větev n. ischiadicus; laterálně přes hlavici lýtkové kosti, kde je povrchově, a kraniolaterálně po bérci.',
      'Branch of the sciatic; laterally over the fibular head, where it is superficial, then craniolateral down the crus.',
    ),
    p(
      'M. tibialis cranialis, m. extensor digitalis longus, mm. fibulares.',
      'Cranial tibial, long digital extensor, fibularis muscles.',
    ),
    p(
      'Segmenty L6-L7 (přes n. ischiadicus).',
      'Segments L6-L7 (via the sciatic).',
    ),
    p(
      'Přes kterou kostní strukturu probíhá n. fibularis povrchově?',
      'Over which bony structure does the common peroneal nerve run superficially?',
    ),
    p('Přes hlavici lýtkové kosti.', 'Over the head of the fibula.'),
  ),
};

const cord = (label, location, connections, recall, answer) =>
  card(
    label,
    p(
      'Funkční oblast míchy: segmenty, které společně zásobují stejnou část těla.',
      'Functional region of the spinal cord: segments that together supply one part of the body.',
    ),
    location,
    connections,
    p('Sama je částí CNS.', 'Part of the CNS itself.'),
    recall,
    answer,
  );
const cordRegions = {
  cord_C1_C5: cord(
    p('Mícha · segmenty C1-C5', 'Spinal cord · segments C1-C5'),
    p(
      'Krční mícha zhruba v obratlích C1-C4.',
      'Cervical cord, roughly within vertebrae C1-C4.',
    ),
    p(
      'Kraniální krční segmenty; vedou dráhy ke všem čtyřem končetinám.',
      'Cranial cervical segments; carry the tracts to and from all four limbs.',
    ),
    p(
      'Ve kterých obratlích zhruba leží segmenty C1-C5?',
      'Within which vertebrae do segments C1-C5 lie?',
    ),
    p('Zhruba C1-C4.', 'Roughly C1-C4.'),
  ),
  cord_C6_T2: cord(
    p(
      'Mícha · segmenty C6-T2 (krční intumescence)',
      'Spinal cord · segments C6-T2 (cervical enlargement)',
    ),
    p(
      'Krční intumescence zhruba v obratlích C5-T1.',
      'Cervical enlargement, roughly within vertebrae C5-T1.',
    ),
    p(
      'Dává vznik brachiálnímu plexu pro hrudní končetinu.',
      'Gives rise to the brachial plexus for the thoracic limb.',
    ),
    p(
      'Který plexus vychází ze segmentů C6-T2?',
      'Which plexus arises from segments C6-T2?',
    ),
    p('Brachiální plexus.', 'The brachial plexus.'),
  ),
  cord_T3_L3: cord(
    p('Mícha · segmenty T3-L3', 'Spinal cord · segments T3-L3'),
    p(
      'Hrudní a kraniální bederní mícha zhruba v obratlích T2-L3.',
      'Thoracic and cranial lumbar cord, roughly within vertebrae T2-L3.',
    ),
    p(
      'Zásobuje trup; procházejí jí dráhy k pánevním končetinám.',
      'Supplies the trunk; carries the tracts to and from the pelvic limbs.',
    ),
    p(
      'Které končetiny zásobují dráhy procházející segmenty T3-L3?',
      'Which limbs do the tracts passing through T3-L3 serve?',
    ),
    p('Pánevní končetiny.', 'The pelvic limbs.'),
  ),
  cord_L4_S3: cord(
    p(
      'Mícha · segmenty L4-S3 (bederní intumescence)',
      'Spinal cord · segments L4-S3 (lumbar enlargement)',
    ),
    p(
      'Bederní intumescence zhruba v obratlích L3-L5 (segmenty leží kraniálněji než stejnojmenné obratle).',
      'Lumbar enlargement, roughly within vertebrae L3-L5 (segments lie cranial to the vertebrae of the same name).',
    ),
    p(
      'Dává vznik lumbosakrálnímu plexu (n. femoralis, n. ischiadicus) a pánevním nervům.',
      'Gives rise to the lumbosacral plexus (femoral, sciatic nerves) and the pelvic nerves.',
    ),
    p(
      'Leží segmenty L4-S3 ve stejnojmenných obratlích?',
      'Do the segments L4-S3 lie within the vertebrae of the same name?',
    ),
    p(
      'Ne, leží kraniálněji, zhruba v obratlích L3-L5.',
      'No, they lie further cranially, roughly within L3-L5.',
    ),
  ),
  cord_caudal: cord(
    p(
      'Mícha · kaudální segmenty a cauda equina',
      'Spinal cord · caudal segments and cauda equina',
    ),
    p(
      'Konec míchy kolem L6-L7 a svazek nervových kořenů (cauda equina) probíhající dál páteřním kanálem do křížové kosti.',
      'End of the cord around L6-L7 and the bundle of nerve roots (cauda equina) running on through the vertebral canal into the sacrum.',
    ),
    p(
      'Kořeny sakrálních a kaudálních nervů pro ocas, perineum a pánevní orgány.',
      'Roots of the sacral and caudal nerves for the tail, perineum and pelvic organs.',
    ),
    p('Co tvoří cauda equina?', 'What makes up the cauda equina?'),
    p(
      'Kořeny posledních bederních, křížových a kaudálních míšních nervů v páteřním kanálu za koncem míchy.',
      'The roots of the last lumbar, sacral and caudal spinal nerves within the vertebral canal beyond the end of the cord.',
    ),
  ),
};

export const clinicalStudy = {
  ...landmarks,
  ...auscultation,
  ...nodes,
  ...vessels,
  ...nerves,
  ...cordRegions,
};

const SPECIES = { cat: ['kočky', 'cat'], rabbit: ['králíka', 'rabbit'] };
/** Cards for the cat or rabbit pack: the dog layer retargeted, flagged as such. */
export function clinicalStudyFor(sp) {
  const [cs, en] = SPECIES[sp];
  const note = p(
    `Značka převzatá z modelu psa a přenesená do proporcí ${cs}; polohy, úrovně segmentů a počty (např. žeber) vycházejí z psa a u ${cs} se mohou lišit.`,
    `Marker taken from the dog model and retargeted to the ${en}’s proportions; positions, segment levels and counts (such as ribs) follow the dog and may differ in the ${en}.`,
  );
  return Object.fromEntries(
    Object.entries(clinicalStudy).map(([id, c]) => [
      id,
      { ...c, study: { ...c.study, difference: note } },
    ]),
  );
}
