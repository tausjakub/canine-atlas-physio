"""Convert MIT MusculoskeletalDog reference pose to indexed browser geometry.
Usage: python scripts/convert_model.py /path/to/MusculoskeletalDog-main
No geometric approximation; STL vertices are deduplicated, SKN bind weights applied.
"""
import sys, json, struct, re, shutil
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np

source=Path(sys.argv[1])/"musculoskeletal_dog"
out=Path(__file__).resolve().parents[1]/"public/models"
out.mkdir(parents=True,exist_ok=True)
root=ET.parse(source/"models/dog.xml").getroot()
bodies={}; geoms=[]
def walk(el,pos=np.zeros(3)):
    p=pos+np.fromstring(el.get('pos','0 0 0'),sep=' ')
    assert not any(el.get(k) for k in ['quat','euler','axisangle']), 'Unexpected body rotation'
    if el.get('name'): bodies[el.get('name')]=p
    for g in el.findall('geom'):
        if g.get('mesh'):
            assert not any(g.get(k) for k in ['quat','euler','axisangle'])
            geoms.append((g,p+np.fromstring(g.get('pos','0 0 0'),sep=' ')))
    for b in el.findall('body'): walk(b,p)
walk(root.find('worldbody'))
assets={m.get('name'):m for m in root.findall('asset/mesh')}
chunks=[]; parts=[]; offset=0
def add(name,system,v,f):
    global offset
    if re.search('eye|nose',name,re.I): system='surface'
    elif re.search('tendon|^m_dorsi_Fascia|aponeurosis|ligament|skutulum',name,re.I): system='connective'
    assert np.isfinite(v).all() and f.min()>=0 and f.max()<len(v)
    # MuJoCo Z-up -> Three Y-up, preserves handedness.
    v=np.stack([v[:,0],v[:,2],-v[:,1]],axis=1).astype('<f4')
    f=f.astype('<u4')
    a=v.tobytes(); b=f.tobytes()
    parts.append(dict(id=name,system=system,vertexOffset=offset,vertexCount=len(v),indexOffset=offset+len(a),indexCount=f.size,center=((v.min(0)+v.max(0))/2).tolist(),bounds=[v.min(0).tolist(),v.max(0).tolist()]))
    chunks.extend([a,b]);offset+=len(a)+len(b)
for g,pos in geoms:
    asset=assets[g.get('mesh')]
    data=(source/'models'/asset.get('file')).read_bytes()
    n=struct.unpack_from('<I',data,80)[0]
    assert len(data)==84+50*n
    dt=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attr','<u2')])
    vs=np.frombuffer(data,dt,n,84)['v'].reshape(-1,3)
    v,inv=np.unique(vs,axis=0,return_inverse=True)
    add(g.get('name'),'bone',v+pos,inv.reshape(-1,3))
for skin in root.findall('asset/skin'):
    data=(source/'models'/skin.get('file')).read_bytes()
    nv,nt,nf,nb=struct.unpack_from('<4i',data)
    v=np.frombuffer(data,'<f4',nv*3,16).reshape(-1,3).copy()
    off=16+nv*12+nt*8
    f=np.frombuffer(data,'<i4',nf*3,off).reshape(-1,3);off+=nf*12
    result=np.zeros_like(v); weights=np.zeros(nv)
    for _ in range(nb):
        body=data[off:off+40].split(b'\0')[0].decode();off+=40
        bp=np.frombuffer(data,'<f4',3,off);off+=12
        q=np.frombuffer(data,'<f4',4,off);off+=16
        count=struct.unpack_from('<i',data,off)[0];off+=4
        ids=np.frombuffer(data,'<i4',count,off);off+=count*4
        w=np.frombuffer(data,'<f4',count,off);off+=count*4
        # Source bind rotations are identities. Fail rather than silently misplace tissue.
        assert np.allclose(q,[1,0,0,0],atol=1e-5), q
        result[ids]+=(v[ids]-bp+bodies[body])*w[:,None]
        weights[ids]+=w
    assert off==len(data) and (weights>0).all()
    add(skin.get('name'),'surface' if skin.get('name')=='skin' else 'muscle',result/weights[:,None],f)
(out/'anatomy.bin').write_bytes(b''.join(chunks))
(out/'catalog.json').write_text(json.dumps({'parts':parts,'source':'MusculoskeletalDog','pose':'MJCF reference pose','bytes':offset},separators=(',',':')))
shutil.copy(source.parent/'LICENSE',out/'LICENSE-MODEL.txt')
print(json.dumps({'parts':len(parts),'systems':{s:sum(p['system']==s for p in parts) for s in ['bone','muscle','surface']},'bytes':offset,'triangles':sum(p['indexCount']//3 for p in parts)}))
