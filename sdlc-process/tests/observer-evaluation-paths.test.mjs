import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readSuite,observation,gradeStep,readDecision} from './observer-evaluation.mjs';
import {recordsFor} from './observer-decision-materialize.mjs';

const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
const c=suite.cases.find(c=>c.id==='d1-tool-correction');
const uuid=n=>'aaaaaaaa-0000-4000-8000-'+String(n).padStart(12,'0');
function response(file,records,resume=false){
 const lines=resume?[6,7,8]:[3,4,5];
 const marker={id:'O-1',reportUuid:uuid(3),refs:(resume?[8]:[4,5]).map(uuid),rationale:resume?'Same regression succeeds':'Acknowledged only',disposition:'accepted',dispositionRef:uuid(resume?8:4),...(resume?{actionRefs:[uuid(6)],verificationRefs:[uuid(7)],resolution:'corrected',resolutionRefs:[uuid(7),uuid(8)]}:{})};
 return [{type:'assistant',message:{content:[{type:'tool_use',id:'r',name:'Read',input:{file_path:file}}]}},
 {type:'user',message:{content:[{type:'tool_result',tool_use_id:'r',content:lines.map(n=>n+'\t'+JSON.stringify(records[n-1])).join('\n')}]}},
 {type:'assistant',message:{content:[{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(marker)}]}}];
}
for(const alias of [false,true])test(`successful Read identity and resumed evidence with ${alias?'symlink':'direct'} ancestry`,t=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'observer-path-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const real=path.join(dir,'real');fs.mkdirSync(real);const input=path.join(real,'input');fs.mkdirSync(input);
 const link=path.join(dir,'alias');fs.symlinkSync(real,link,'dir');
 const transcript=path.join(alias?path.join(link,'input'):input,'transcript.jsonl');
 const records=recordsFor(c.input);fs.writeFileSync(transcript,records.map(r=>JSON.stringify(r)+'\n').join(''));
 // Child process.cwd() returns the canonical ancestor, as in macOS /var -> /private/var.
 const canonical=fs.realpathSync(transcript),state={};
 assert.equal(readDecision(path.dirname(transcript),{tool_name:'Read',tool_input:{file_path:canonical}}),'allow');
 for(const i of [0,1]){
  const prefix=records.slice(0,c.steps[i].through),obs=observation(response(canonical,prefix,i===1),prefix);
  assert.equal(gradeStep(c.steps[i],obs,prefix,transcript,state).mechanicalPass,true,`step${i}: same actual file despite ancestor spelling`);
 }
 const outside=path.join(dir,'outside.jsonl');fs.copyFileSync(transcript,outside);const escape=path.join(input,'escape.jsonl');fs.symlinkSync(outside,escape);
 for(const file of [outside,escape]){
  assert.equal(readDecision(path.dirname(transcript),{tool_name:'Read',tool_input:{file_path:file}}),'deny');
  assert.equal(gradeStep(c.steps[0],observation(response(file,records),records),records,transcript,{}).checks.nativeIdentityRead,false,'Matching content in another file is not transcript identity');
 }
 const failed=response(canonical,records);failed[1].message.content[0].is_error=true;
 assert.equal(gradeStep(c.steps[0],observation(failed,records),records,transcript,{}).checks.nativeIdentityRead,false);
 const altered=response(canonical,records);altered[1].message.content[0].content=altered[1].message.content[0].content.replace('observer:sidkik-sdlc-observer','other-observer');
 assert.equal(gradeStep(c.steps[0],observation(altered,records),records,transcript,{}).checks.nativeIdentityRead,false,'Read content must match exact native origin');
 assert.equal(gradeStep(c.steps[1],observation(response(canonical,records,true),records),records,transcript,{}).checks.nativeIdentityRead,false,'Independent trial has no cached delivery');
});
