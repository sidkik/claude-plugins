#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = process.argv[2];
if (!['claude','grok'].includes(client)) throw new Error('Expected claude or grok');
const input = fs.readFileSync(0);
const previousFile = path.join(root,'previous-status.json');
const previous = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile,'utf8'))[client] : null;
if (previous?.command) {
  const result = spawnSync('/bin/sh',['-c',previous.command],{input,encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
  if (result.stdout) process.stdout.write(result.stdout.endsWith('\n') ? result.stdout : result.stdout+'\n');
  if (result.error || result.status !== 0) process.stderr.write('Prior status command failed\n');
}
const nativeFile = path.join(root,'native-setup.json');
const installed = fs.existsSync(nativeFile) ? JSON.parse(fs.readFileSync(nativeFile,'utf8')).plugins?.[client] : null;
const native = installed?.['sdlc-status'];
const renderer = native ? path.join(native,'scripts/status.mjs') : path.join(root,'marketplace/sdlc-status/scripts/status.mjs');
let rendererInput=input;
if(client==='claude'&&installed?.['sdlc-process']){try{const payload=JSON.parse(input.toString()||'{}'),module=await import(pathToFileURL(path.join(installed['sdlc-process'],'scripts/observer-evidence.mjs')));const config=path.join(process.env.CLAUDE_CONFIG_DIR||path.join(process.env.HOME,'.claude'),'settings.json'),settings=fs.existsSync(config)?JSON.parse(fs.readFileSync(config,'utf8')):{};let effective=settings.agent,cwd=payload.workspace?.current_dir||payload.cwd;for(const name of ['settings.json','settings.local.json']){const local=cwd&&path.join(cwd,'.claude',name);if(local&&fs.existsSync(local)){const value=JSON.parse(fs.readFileSync(local,'utf8'));if(value.agent)effective=value.agent}}payload.observer=module.observerEvidence({configured:process.env.CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS==='1'&&effective==='sidkik-sdlc-observed-main',transcriptPath:payload.transcript_path,sessionId:payload.session_id,unavailableReason:effective&&effective!=='sidkik-sdlc-observed-main'?`custom-agent:${effective}`:undefined});rendererInput=Buffer.from(JSON.stringify(payload))}catch{}}
const rendered = spawnSync(process.execPath,[renderer,client],{input:rendererInput,encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
if (rendered.stdout) process.stdout.write(rendered.stdout);
if (rendered.error || rendered.status !== 0) { process.stderr.write('SDLC status unavailable\n'); process.exitCode=1; }
