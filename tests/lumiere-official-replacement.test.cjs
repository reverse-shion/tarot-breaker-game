const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = 'assets/sprites/lumiere/';
const evidence = 'docs/lumiere-sprite-replacement-20261010/';
const read = file => fs.readFileSync(path.join(root, file));
const json = file => JSON.parse(read(file));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expected = {
 down:['lumiere_idle.webp','925cf3a297874b15384fec86a2bdc8c38c536318','99579abeca9a2673b5785902f6fea27985d7b8e9','9e623cbc2f04d0966f30aec7c0cce84b7a0b359733a547479fc792ef8dadf724','6bd7f477eeb1af929d01cc83b53f82ac8611d9fb402b4b7b70253d9ee213ac46','62534dff2c3dac7942bfb6b4ffb9628e9bba3bb27f932dc4de4b5fa5c161dd03'],
 up:['lumiere_hover-back.webp','f980b92706da9361f25e0195083f768b941ffcb8','d052a34cab6179e5dbb9dd5273cb5dc0190d0395','a3c759f7cee915425bb398439da42907952f23f859355520be31af3364c0b63e','fe4d22c5e72ea1b8bbb09b29dd48bde82bf1c244574e1893056025ef43648602','1cb5da12bc0454bf5afe0f449b8187815e2bf18ad8f5011d1049cb04b9c778b2'],
 left:['lumiere_hover_left.webp','ab3fc22d8128ff28432871f3a2fa00887bb88e21','378a91e0dbaa10b5226442f78fee0c0d6ead2b1c','cdd005299ba5a1de294d56622cac681af99eed5aaea773716bce204ac3cb4357','d7dae3d676287aba1d4a62a93e33efef33be2873e683907fc01538739c806dae','14cad483af3bd09b91d8c04687817fe32ff8555ffb22c18358b2deb203916c2a'],
 right:['lumiere_hover_right.webp','559eba6d64b0fffb3cb0d7e28938bf0f62389ee3','7e83bd65bdb13405d0ba226db9a92a05ecc3a41d','201d5656b2cdaa011bbfa4fa43782a269864374d3a8d85c600a0bd25ee356931','50ba44cd184520343586058abf5e4df5ab9d52973332eb1a2c7cb978ab5542bd','7c156c13a5d97dc43460aaba4a8e38d1963c6eabd4d6d90e106809a37a1524b3'],
};

test('official Lumiere replacement keeps historical anchors, render and directional mapping',()=>{
 const current=json(base+'lumiere_sprite_manifest.json');
 const historical=json('tests/fixtures/lumiere-preview-manifest-9e8a85d.json');
 assert.deepEqual(current.files,historical.files);
 assert.deepEqual(current.render,historical.render);
 assert.equal(current.render.draw_cell_height*current.render.reference_body_height/current.render.reference_cell_height,63.984375);
 for(const dir of Object.keys(expected))for(const key of ['width','height','body_top','baseline_y','center_x','actual_direction'])
  assert.equal(current.poses[dir][key],historical.poses[dir][key],dir+' '+key);
 for(const key of ['format','layout','movement_type','phase','localized_sway'])assert.equal(current[key],historical[key]);
});

test('official Lumiere source and deployed hashes are independently pinned and distinct',()=>{
 const manifest=json(base+'lumiere_sprite_manifest.json');
 const records=json(evidence+'registration.json');
 assert.equal(records.length,4);
 for(const [dir,[file,commit,blob,sourceSha,outputSha,rgbaSha]] of Object.entries(expected)){
  const pose=manifest.poses[dir],provenance=manifest.provenance.sources[dir],r=records.find(v=>v.direction===dir);
  assert.equal(provenance.source_commit,commit);assert.equal(provenance.source_blob_sha,blob);
  assert.equal(pose.source_sha256,sourceSha);assert.equal(pose.sha256,outputSha);assert.equal(pose.decoded_rgba_sha256,rgbaSha);
  assert.equal(digest(read(base+file)),outputSha);
  assert.notEqual(pose.sha256,pose.source_sha256);
  assert.equal(r.source_commit,commit);assert.equal(r.source_blob_sha,blob);
  assert.equal(r.source_sha256,sourceSha);assert.equal(r.sha256,outputSha);assert.equal(r.decoded_rgba_sha256,rgbaSha);
  assert.equal(r.webp_roundtrip_rgba_identical,true);
 }
});

test('official replacement contains true 1254-square lossless alpha WebPs',()=>{
 for(const [file] of Object.values(expected)){
  const b=read(base+file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.equal(b.readUInt32LE(4)+8,b.length);
  let lossless=0;
  for(let offset=12;offset+8<=b.length;){
   const size=b.readUInt32LE(offset+4),end=offset+8+size;
   assert(end<=b.length);
   const type=b.toString('ascii',offset,offset+4);
   assert.notEqual(type,'VP8 ','lossy payload forbidden');
   if(type==='VP8L'){
    lossless++;assert.equal(b[offset+8],0x2f);
    const bits=b.readUInt32LE(offset+9);
    assert.equal(1+(bits&0x3fff),1254);assert.equal(1+((bits>>>14)&0x3fff),1254);
    assert(bits&0x10000000,'alpha channel must exist');
   }
   offset=end+size%2;
  }
  assert.equal(lossless,1);
 }
});

test('official replacement anatomy and pixel evidence belong to these exact deployed assets',()=>{
 const manifest=json(base+'lumiere_sprite_manifest.json');
 const anatomy=json(evidence+'final-candidate-landmarks.json').results;
 const pixels=json(evidence+'sway-pixel-proof/metrics.json');
 assert.equal(pixels.moduleSha256,digest(read('lumiere-sway.js')));
 assert.equal(anatomy.length,4);assert.equal(pixels.directions.length,4);
 for(const direction of Object.keys(expected)){
  const a=anatomy.find(v=>v.direction===direction),p=pixels.directions.find(v=>v.direction===direction);
  assert.equal(a.candidate.rgba_sha256,manifest.poses[direction].decoded_rgba_sha256);
  assert.equal(a.baseline.crown_y,a.candidate.crown_y);assert.equal(a.baseline.foot_y,a.candidate.foot_y);
  assert.equal(a.baseline.anatomical_height,a.candidate.anatomical_height);
  for(const value of Object.values(a.residual_reference_px))assert(Math.abs(value)<1);
  assert.equal(p.originalAssetSha256,manifest.poses[direction].sha256);
  assert.equal(p.zeroMotionIdentical,true);assert.equal(p.perFrameAllocations,0);
  assert.equal(p.perFrameReadbacks,0);assert.equal(p.perFramePixelWrites,0);
  assert.equal(p.samples.length,34);
  for(const sample of p.samples){assert.equal(sample.outside,0);assert.equal(sample.border,0);assert(sample.inside>0);}
 }
});
