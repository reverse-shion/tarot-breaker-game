#!/usr/bin/env python3
"""Read-only anatomical measurement and region evidence for Lumiere replacement.

Run: python /workspace/lumiere-evidence/architect/measure-final-landmarks.py
Requires Pillow and numpy. No repository files are written.
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--repository', default=str(Path(__file__).resolve().parents[2]))
parser.add_argument('--old', help='Optional directory containing baseline WebPs')
parser.add_argument('--output', default='/tmp/lumiere-anatomy-proof')
args = parser.parse_args()
repo, output = map(Path, (args.repository, args.output))
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((repo / 'assets/sprites/lumiere/lumiere_sprite_manifest.json').read_text())
baseline_temp = tempfile.TemporaryDirectory(prefix='lumiere-baseline-')
old = Path(args.old) if args.old else Path(baseline_temp.name)
if not args.old:
    for filename in manifest['files'].values():
        data = subprocess.check_output(['git', 'show', 'aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac:assets/sprites/lumiere/' + filename], cwd=repo)
        (old / filename).write_bytes(data)
rois = {
    'down': {'head': (520, 0, 730, 160), 'foot': (570, 1070, 660, 1200)},
    'up': {'head': (540, 0, 710, 160), 'foot': (580, 1070, 675, 1155)},
    'left': {'head': (410, 0, 600, 160), 'foot': (575, 1050, 655, 1160)},
    'right': {'head': (700, 0, 850, 160), 'foot': (560, 1080, 670, 1180)},
}
face_rois = {'down': (500, 230, 750, 345), 'left': (370, 240, 490, 370),
             'right': (770, 245, 920, 345)}
protected = {
    'down': [[475,200,265,500],[535,700,165,485],[180,175,900,310]],
    'up': [[545,75,170,1060],[180,175,900,315]],
    'left': [[290,215,290,210],[350,425,365,320],[553,930,117,225],[645,150,370,415]],
    'right': [[715,180,245,225],[660,405,250,325],[540,960,172,200],[205,120,445,315]],
}
node_source = 'const fs=require("fs"),vm=require("vm"),window={};vm.runInNewContext(fs.readFileSync(process.argv[1],"utf8"),{window});process.stdout.write(JSON.stringify(Object.fromEntries(["down","up","left","right"].map(d=>[d,window.TarotLumiereSway.getRegions(d)]))));'
regions = json.loads(subprocess.run(['node', '-e', node_source, str(repo/'lumiere-sway.js')],
                                    check=True, capture_output=True, text=True).stdout)

def measure(image, direction):
    a = np.asarray(image).astype(float)
    bounds = {}
    for name, (x0,y0,x1,y1) in rois[direction].items():
        mask = a[y0:y1,x0:x1,3] >= 200
        ys = np.where(mask.sum(axis=1) >= 4)[0] + y0
        bounds[name] = [int(ys.min()), int(ys.max())]
    crown, foot = bounds['head'][0], bounds['foot'][1]
    if direction == 'up':
        yy, xx = np.where(a[crown:crown+20,500:750,3] > 200)
        axis = {'method':'opaque crown-band centroid','x':float(xx.mean()+500),
                'y':float(yy.mean()+crown), 'pixels':len(xx)}
    else:
        x0,y0,x1,y1 = face_rois[direction]
        ranges = [(500,620),(620,750)] if direction == 'down' else [(x0,x1)]
        centroids = []
        for start,end in ranges:
            p = a[y0:y1,start:end]
            m=(p[:,:,2]>120)&(p[:,:,2]>p[:,:,0]+35)&(p[:,:,2]>p[:,:,1]+45)&(p[:,:,3]>200)
            if direction == 'right':
                m &= (p[:,:,0]>80)&(p[:,:,1]<110)
            yy,xx=np.where(m)
            centroids.append({'x':float(xx.mean()+start),'y':float(yy.mean()+y0),'pixels':len(xx)})
        axis={'method':'equal-weight midpoint of separate saturated iris centroids' if direction=='down' else 'saturated iris centroid',
              'x':sum(c['x'] for c in centroids)/len(centroids),
              'y':sum(c['y'] for c in centroids)/len(centroids),'iris_centroids':centroids}
    x0,_,x1,_ = rois[direction]['foot']
    yy,xx = np.where(a[foot-11:foot+1,x0:x1,3]>200)
    return {'crown_y':crown,'foot_y':foot,'anatomical_height':foot-crown,
            'axis_landmark':axis,'foot_tip_x':float(xx.mean()+x0),
            'rgba_sha256':hashlib.sha256(image.tobytes()).hexdigest()}

results=[]
contact=Image.new('RGB',(4*430,2*470),'#555555')
crops=[]
for column,direction in enumerate(['down','up','left','right']):
    filename=manifest['files'][direction]
    before=Image.open(old/filename).convert('RGBA')
    candidate=Image.open(repo/'assets/sprites/lumiere'/filename).convert('RGBA')
    baseline,current=measure(before,direction),measure(candidate,direction)
    pose=manifest['poses'][direction]
    k=63.984375/(pose['baseline_y']-pose['body_top'])
    residuals={
        'crown_y':(current['crown_y']-baseline['crown_y'])*k,
        'foot_y':(current['foot_y']-baseline['foot_y'])*k,
        'anatomical_height':(current['anatomical_height']-baseline['anatomical_height'])*k,
        'face_or_crown_axis_x':(current['axis_landmark']['x']-baseline['axis_landmark']['x'])*k,
        'face_or_crown_axis_y':(current['axis_landmark']['y']-baseline['axis_landmark']['y'])*k,
        'foot_tip_x':(current['foot_tip_x']-baseline['foot_tip_x'])*k,
    }
    overlap=[]
    region_metrics=[]
    aa=np.asarray(candidate)[:,:,3]
    overlay=Image.new('RGB',(1254,1254),'#555555');overlay.paste(candidate,(0,0),candidate)
    draw=ImageDraw.Draw(overlay)
    for index,(x,y,w,h,kind) in enumerate(regions[direction]):
        for px,py,pw,ph in protected[direction]:
            if not (x+w<=px or x>=px+pw or y+h<=py or y>=py+ph):
                overlap.append({'region':index,'protected':[px,py,pw,ph]})
        region_metrics.append({'index':index,'kind':kind,'rect':[x,y,w,h],
                               'foreground_alpha_gt32':int((aa[y:y+h,x:x+w]>32).sum())})
        color='#35ff99' if kind=='hair' else '#ffe24a'
        draw.rectangle((x,y,x+w-1,y+h-1),outline=color,width=3)
        draw.text((x+3,y+3),f'{index}: {kind}',fill=color)
        crop=overlay.crop((max(0,x-15),max(0,y-15),min(1254,x+w+15),min(1254,y+h+15)))
        crops.append((direction,index,kind,crop))
    overlay.save(output/f'candidate-regions-{direction}.png')
    for row,im in enumerate([before,candidate]):
        thumb=im.resize((430,430),Image.Resampling.LANCZOS)
        tile=Image.new('RGB',(430,470),'#555555'); tile.paste(thumb,(0,25),thumb)
        ImageDraw.Draw(tile).text((8,8),f'{direction}: '+('baseline' if row==0 else 'candidate'),fill='white')
        contact.paste(tile,(column*430,row*470))
    results.append({'direction':direction,'file':filename,'baseline':baseline,'candidate':current,
                    'runtime_reference_px_per_source_px':k,'residual_reference_px':residuals,
                    'baseline_anatomical_height_reference_px':baseline['anatomical_height']*k,
                    'candidate_anatomical_height_reference_px':current['anatomical_height']*k,
                    'sway_regions':region_metrics,'conservative_protected_rectangle_overlaps':overlap,
                    'automated_landmark_result':'PASS' if max(map(abs,residuals.values()))<1 and not overlap else 'STOP'})
contact.save(output/'final-anatomical-contact.png')
gallery=Image.new('RGB',(4*310,4*300),'#555555');gd=ImageDraw.Draw(gallery)
for n,(direction,index,kind,crop) in enumerate(crops):
    col,row=n%4,n//4
    crop.thumbnail((290,260),Image.Resampling.NEAREST)
    gallery.paste(crop,(col*310+10,row*300+25))
    gd.text((col*310+10,row*300+8),f'{direction} {index} {kind}',fill='white')
gallery.save(output/'final-region-crops.png')
report={'algorithm':'same anatomy-only ROI definitions, alpha>=200, minimum4 opaque pixels per row for crown/foot; same saturated iris masks; foot axis from final12 opaque rows. Threshold probes are not transparent bounds. Source coordinates and RGBA hashes retained.',
        'body_reference_px':63.984375,'rois':rois,'face_rois':face_rois,'results':results,
        'limitation':'Conservative rectangles plus semantic visual inspection support exclusion; these static measurements do not replace actual-motion pixel proof or device validation.'}
(output/'final-candidate-landmarks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([{'direction':r['direction'],'result':r['automated_landmark_result'],
                  'residual_reference_px':r['residual_reference_px'],
                  'body_height_reference_px':[r['baseline_anatomical_height_reference_px'],r['candidate_anatomical_height_reference_px']]} for r in results],indent=2))
