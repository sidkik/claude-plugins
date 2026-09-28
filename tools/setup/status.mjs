#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const rendered = spawnSync(process.execPath,[path.join(root,'marketplace/sdlc-status/scripts/status.mjs'),client],{input,encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
if (rendered.stdout) process.stdout.write(rendered.stdout);
if (rendered.error || rendered.status !== 0) { process.stderr.write('SDLC status unavailable\n'); process.exitCode=1; }
