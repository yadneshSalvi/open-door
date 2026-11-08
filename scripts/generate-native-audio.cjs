// Original algorithmic cues; no recordings or third-party audio samples.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const engine=process.env.OPEN_DOOR_SFX_ENGINE||path.join(os.homedir(),'.codex/plugins/cache/ls-extensions/ls-clad/local/skills/build-sfx/tools');
const audio=require(engine);
// Canonical authoring assets. The editor owner imports these into Assets/GeneratedSFX at the source freeze.
const output=path.resolve(__dirname,'../lens-src/Audio');
fs.mkdirSync(output,{recursive:true});
const mono=buffer=>buffer instanceof Float32Array?buffer:Float32Array.from(buffer.left,(value,index)=>(value+buffer.right[index])*.5);
const cues={
  'turn-clear':()=>audio.sfx_presets.uiSuccess(),
  'contact-soft':()=>audio.sfx_presets.impact({material:'soft',size:.25}),
  'wheel-roll':()=>audio.granular.grainCloud({source:'pink',duration:1.6,grainSizeMs:14,density:110,panSpread:0,ampJitter:.2,filter:{type:'bp',freq:430,Q:.65}}),
};
const manifest=[];
for(const [name,render] of Object.entries(cues)){
  const buffer=mono(render());
  audio.fadeIn(buffer,.015);audio.fadeOut(buffer,.025);
  audio.mix_bus.masterChain(buffer,{normalize:'peak'});
  const target=path.join(output,name+'.wav');audio.WavBuilder.write(buffer,target);
  manifest.push({file:name+'.wav',sampleRate:audio.SAMPLE_RATE,channels:1,samples:buffer.length,durationSeconds:buffer.length/audio.SAMPLE_RATE,source:'Original algorithmic synthesis using CLAD build-sfx; no sample recordings'});
}
fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify({generator:'scripts/generate-native-audio.cjs',engine:'CLAD build-sfx (Apache-2.0)',cues:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest));
