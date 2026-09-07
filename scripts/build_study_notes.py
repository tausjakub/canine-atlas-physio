"""Build an explicit, exhaustive catalogue-to-note mapping. No fallback profiles."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
sources={}
for num,label in {1:'Superficial thorax',2:'Extrinsic forelimb and ventral neck',3:'Shoulder and arm',4:'Forearm and forepaw',5:'Rump and thigh',6:'Deep hip and cranial crus',7:'Caudal crus and pelvic limb joints',8:'Hypaxial and abdominal muscles',9:'Epaxial muscles',13:'Brachial plexus',14:'Distal forelimb nerves',18:'Pelvis and pelvic diaphragm',21:'Pelvic limb nerves',22:'Superficial head',23:'Jaw and hyoid muscles',24:'Orbit and ear',25:'Head and neck nerves'}.items():
    sources[f'L{num:02}']={'title':f'University of Minnesota · {label}','url':f'https://vanat.ahc.umn.edu/carnLabs/Lab{num:02}/Lab{num:02}.html'}
sources.update({
 'MODEL':{'title':'MusculoskeletalDog · source labels and geometry','url':'https://github.com/vittorione94/MusculoskeletalDog'},
 'BONE':{'title':'Sheridan College · canine skeletal anatomy','url':'https://ltsa.sheridancollege.ca/apps/vettech/'},
 'CORD':{'title':'University of Minnesota · vertebrae and spinal segments','url':'https://vanat.ahc.umn.edu/neurolab/Lab2/L2data2B.html'},
 'TAIL':{'title':'Carnivoran sacrum · anatomical research','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC7704233/'},
 'DIR':{'title':'University of Minnesota · anatomical directions and actions','url':'https://vanat.ahc.umn.edu/anatDirections/Directions.html'},
 'PROX':{'title':'University of Minnesota · proximal forelimb dissection','url':'https://pressbooks.umn.edu/dogcatanatomylabguide/chapter/part-3-proximal-limb/'},
 'DIST':{'title':'University of Minnesota · distal forelimb dissection','url':'https://pressbooks.umn.edu/dogcatanatomylabguide/chapter/part-4-distal-thoracic-limb/'},
 'HIP':{'title':'University of Minnesota · proximal hindlimb dissection','url':'https://open.lib.umn.edu/dogcatanatomylabguide/chapter/part-2-proximal-pelvic-limb/'},
 'CRUS':{'title':'University of Minnesota · distal hindlimb dissection','url':'https://open.lib.umn.edu/dogcatanatomylabguide/chapter/part-3-distal-pelvic-limb/'},
 'AXIAL':{'title':'University of Minnesota · external thorax and epaxial muscles','url':'https://pressbooks.umn.edu/dogcatanatomylabguide/chapter/part-2-external-thorax/'},
 'CRI':{'title':'Canine Rehabilitation Institute · muscle chart','url':'https://ms-cri.files.svdcdn.com/production/downloads/CRI-Muscle-Chart-2025.wgsqmh6.pdf?dm=1740681680'},
})
fields=['title','overview','location','attachments','function','nerve','physio','recall','sources']
profiles={}
for path in sorted((ROOT/'scripts/notes').glob('*.txt')):
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):continue
        values=[v.strip() for v in line.split('|')]
        assert len(values)==10,(path.name,values[0],len(values))
        key=values.pop(0);assert key not in profiles,key
        p=dict(zip(fields,values));p['sources']=p['sources'].split(',')
        assert all(s in sources for s in p['sources']),(key,p['sources'])
        profiles[key]=p
catalog=json.loads((ROOT/'public/models/catalog.json').read_text())
mapping={}
def normal(name):
    return re.sub(r'[_.][LR](?=[\d_( .]|$).*$', '', name.removeprefix('m_')).rstrip('_')
def bone_key(name):
    if name=='Ribcage':return 'ribcage'
    if re.fullmatch(r'L_\d+',name):return 'lumbar'
    if re.fullmatch(r'C_\d+',name):return {'C_1':'atlas','C_2':'axis','C_6':'c6','C_7':'c7'}.get(name,'cervical')
    if re.fullmatch(r'Ca_\d+',name):return 'caudal'
    if name in ['Sacrum','Pelvis','MergedSkull','Jaw']:return {'Sacrum':'sacrum','Pelvis':'pelvis','MergedSkull':'skull','Jaw':'mandible'}[name]
    base=normal(name)
    if 'fabellae' in base:return 'fabella'
    if base=='Femoris':return 'femur'
    if base=='Patella':return 'patella'
    if base=='Fibula':return 'fibula'
    if base=='Tibia':return 'tibia'
    if base=='Scapula':return 'scapula'
    if base=='humerus':return 'humerus'
    if base=='Radius':return 'radius'
    if base=='Ulna':return 'ulna'
    if base=='Calcaneal_tuber':return 'calcaneus'
    if base=='Tibial_tarsal':return 'talus'
    if name.startswith('Tarsus_'):
        if 'central' in name:return 'central_tarsal'
        return 'tarsal_'+name.rsplit('_',1)[-1].lower()
    if base=='Carpal_accessory':return 'accessory_carpal'
    if base=='Carpal_ulnar':return 'ulnar_carpal'
    if base=='Carpal_Sesamoid':return 'carpal_sesamoid'
    if base=='Carpal':return 'radial_carpal'
    if base.startswith('Carpal_'):return 'carpal_'+base.rsplit('_',1)[-1].lower()
    if base.startswith('Os_metacarpale'):return 'metacarpal'
    if base=='Metatarsi':return 'metatarsal'
    if name.startswith('Phalanges_B'):return 'hind_digit_piece'
    if name.startswith('Phalanxpmxinutlis'):return 'proximal_phalanx'
    if name.startswith('Phalanx_media'):return 'middle_phalanx'
    if name.startswith('Phalanx_distalis'):return 'distal_phalanx'
    raise ValueError('Unmapped skeletal piece: '+name)
for part in catalog['parts']:
    name=part['id'];base=normal(name);warning='';model_note=''
    if part['system']=='bone':key=bone_key(name)
    else:
        key=base
        if key.lower()=='eye':key='eye'
        if key=='Nose':key='nose'
        if key=='tricepsbrachii_lateral':key='triceps_brachii_lateral'
        if key=='flexor_digitorum_superficialis':
            key+='_'+('hind' if part['center'][0]<0 else 'fore')
            model_note='Forelimb/hindlimb identity uses the piece location in this model; the original digital-flexor labels do not consistently specify the limb.'
        if key=='flexor_digitorum_profundus':
            key+='_'+('hind' if part['center'][0]<0 else 'fore')
            model_note='Forelimb/hindlimb identity is resolved from the model location. Parent-muscle notes apply to this piece; an individual head is not identified by its suffix.'
        if key.startswith('pectorales_superficiales_'):key='pectorales_superficiales'
        if key=='vastus_lat_ander_fascia_lata':key='vastus_lat';model_note='The source names this a vastus lateralis piece beneath fascia lata. It is treated as a muscle portion, not as fascia or another quadriceps head.'
    if key in ['Ligament','capsularis','Skutulum','tibialis_caudalis','carpal_sesamoid','radial_carpal','hind_digit_piece','metatarsal']:
        warning={'Ligament':'Unspecified ligament: exact anatomical identity is unresolved.',
        'capsularis':'Historical capsular-muscle label: hip-region interpretation, not a confirmed detailed segmentation.',
        'Skutulum':'Likely scutiform cartilage from the label and head location; the spelling is nonstandard.',
        'tibialis_caudalis':'Species-sensitive label: in dogs this is associated with the deep digital-flexor complex; do not use a feline description of a separate muscle.',
        'carpal_sesamoid':'Source does not identify the precise sesamoid or its tendon.',
        'radial_carpal':'Unnumbered carpal label; a specific radial/intermedioradial identity is not confirmed.',
        'hind_digit_piece':'Source numbering does not securely identify the digit or phalanx level.',
        'metatarsal':'Source suffixes 1–4 are mesh numbering; they are not verified canine digit numbers.'}[key]
    if re.search(r'\(2\)|\.001',name):model_note+=' An additional source piece is not necessarily a separate muscle, head or structure.'
    if name.startswith('C_'):model_note+=f' Source level: cervical vertebra {name[2:]}; vertebral levels are not nerve-root numbers.'
    if name.startswith('L_'):model_note+=f' Source level: lumbar vertebra {name[2:]}. '+('L7 meets the sacrum at the lumbosacral junction.' if name=='L_7' else 'Study this level in sequence with the adjoining vertebrae.')
    if name.startswith('Ca_'):model_note+=f' Source tail level: Ca{name[3:]}. Tail vertebral number and shape vary between dogs; this is one reference model.'
    if key in ['metacarpal','proximal_phalanx','middle_phalanx','distal_phalanx']:
        digit=re.search(r'(?:digiti_|metacarpale_)([IV]+)',name)
        if digit:model_note+=f' The source identifies digit {digit[1]}. Digit I is medial; digits II–V form the principal weight-bearing set.'
    if key=='sartorius':model_note+=' The source does not reliably distinguish the cranial and caudal parts. Their different stifle actions are described together.'
    if key in ['gluteus_superficialis_major','gluteus_profundus_minor']:model_note+=' Major/minor are source wording. The notes use canine superficial/deep gluteal terminology, not human gluteal nomenclature.'
    assert key in profiles,(name,key)
    side=re.search(r'[_.]([LR])(?=[\d_( .]|$)',name) if not re.fullmatch(r'[CL]_\d+',name) else None
    mapping[name]={'profile':key,'side':('Left' if side[1]=='L' else 'Right') if side else 'Midline / side not specified','modelNote':model_note.strip(),'warning':warning}
assert set(mapping)=={p['id'] for p in catalog['parts']}
unused=set(profiles)-{p['profile'] for p in mapping.values()}
assert not unused,('Unused profiles',unused)
data={'reviewed':'2026-09-07','sources':sources,'profiles':profiles,'parts':mapping}
(ROOT/'app/study-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Built {len(mapping)} mapped notes from {len(profiles)} distinct profiles; {sum(bool(p["warning"]) for p in mapping.values())} pieces have explicit identity qualifications.')
