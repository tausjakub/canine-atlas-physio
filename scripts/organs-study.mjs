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

const cerebrum = (side, sideEn) =>
  card(
    p(`Koncový mozek · ${side}`, `Cerebrum · ${sideEn}`),
    p(
      'Vědomé vnímání, plánování a řízení volního pohybu, učení a paměť.',
      'Conscious perception, planning and control of voluntary movement, learning and memory.',
    ),
    p(
      'Největší část mozku v lebeční dutině; obě hemisféry odděluje podélná štěrbina.',
      'Largest part of the brain in the cranial cavity; the hemispheres are separated by the longitudinal fissure.',
    ),
    p(
      'Kaudálně navazuje mozkový kmen, kaudodorzálně mozeček, rostrálně čichové bulby.',
      'Continues caudally into the brainstem, with the cerebellum caudodorsally and the olfactory bulbs rostrally.',
    ),
    p(
      'Neuplatňuje se (sám je částí CNS).',
      'Not applicable (part of the CNS itself).',
    ),
    p(
      'Která část mozku plánuje volní pohyb?',
      'Which part of the brain plans voluntary movement?',
    ),
    p('Koncový mozek (motorická kůra).', 'The cerebrum (motor cortex).'),
    { mri: true },
  );

export const organStudy = {
  brain_cerebrum_L: cerebrum('vlevo', 'left'),
  brain_cerebrum_R: cerebrum('vpravo', 'right'),
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
      'Ventrálně pod 1.-3. krčním obratlem, kaudálně od jazylky, mezi větvemi dolní čelisti.',
      'Ventral to about C1-C3, caudal to the hyoid, between the mandibular rami.',
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
      'Nad srdeční bází (rozdvojení, bifurkace) zhruba u 5. žebra.',
      'Above the heart base (bifurcation), about the level of the 5th rib.',
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
      'Dva laloky po stranách průdušnice kaudálně od hrtanu, zhruba u 5.-8. prstence.',
      'Two lobes on either side of the trachea, caudal to the larynx at about the 5th-8th tracheal rings.',
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
      'Ve středním mezihrudí zhruba mezi 3. a 6. žebrem, hrot směřuje ventrokaudálně a doleva.',
      'In the middle mediastinum, roughly between ribs 3 and 6; the apex points ventrocaudally and to the left.',
    ),
    p(
      'Z báze odstupuje aorta a plicní kmen; ze stran jej obklopují plíce.',
      'The aorta and pulmonary trunk leave its base; the lungs surround it laterally.',
    ),
    vagus,
    p(
      'Mezi kterými žebry leží srdce?',
      'Between which ribs does the heart lie?',
    ),
    p('Přibližně mezi 3. a 6. žebrem.', 'Roughly between ribs 3 and 6.'),
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
      'Retroperitoneálně pod posledním hrudním a prvním bederním obratlem, v jamce jater.',
      'Retroperitoneal under the last thoracic and first lumbar vertebrae, in the renal fossa of the liver.',
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
      'Obklopuje močovou trubici u krčku měchýře, u vchodu do pánve.',
      'Surrounds the urethra at the bladder neck, at the pelvic inlet.',
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
};
