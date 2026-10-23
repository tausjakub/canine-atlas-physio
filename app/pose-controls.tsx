import type {Language} from './i18n';
import {dogPoses,type DogPose} from './poses';
export default function PoseControls({pose,onChange,language,animal='dog'}:{pose:DogPose;onChange:(pose:DogPose)=>void;language:Language;animal?:'dog'|'cat'|'rabbit'}){
 const cs=language==='cs';
 const names=cs?{standing:'Stoj',sitting:'Sed',lying:'Leh'}:{standing:'Stand',sitting:'Sit',lying:'Lie down'};
 return <section className="pose-controls" aria-label={animal==='dog'?(cs?'Základní polohy psa':'Basic dog poses'):(cs?'Schematické polohy':'Schematic poses')}><h2>{animal==='dog'?(cs?'Polohy psa':'Dog poses'):(cs?'Polohy modelu':'Model poses')}</h2><div role="group" aria-label={cs?'Vybrat polohu':'Choose a pose'}>{dogPoses.map(p=><button key={p} aria-pressed={pose===p} onClick={()=>onChange(p)}>{names[p]}</button>)}</div><p>{pose==='standing'?(cs?'Původní model · všechny anatomické vrstvy.':'Original model · all anatomy layers.'):(cs?'Schematická poloha všech vrstev. Deformace měkkých tkání je přibližná, nikoli měření kloubních úhlů či napětí tkání.':'Schematic pose for all layers. Soft-tissue deformation is approximate, not a measurement of joint angles or tissue strain.')}</p></section>;
}
