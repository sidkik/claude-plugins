// Fake codex-crew prerequisites with GNU-capable defaults. FAKE_<TOOL> overrides
// the reported version; a leading "!" prints the rest to stderr and exits 1.
import fs from 'node:fs';
import path from 'node:path';
const fake=`#!${process.execPath}
const name=require('path').basename(process.argv[1]),a=process.argv.slice(2),v=process.env['FAKE_'+name.toUpperCase()];
const versions={bash:'5.2',timeout:'timeout (GNU coreutils) 9.4',tail:'tail (GNU coreutils) 9.4',patch:'GNU patch 2.7.6',python3:'Python 3.11.9'};
if(v&&v.startsWith('!')){process.stderr.write(v.slice(1)+'\\n');process.exit(1)}
if(name==='bash'&&a[0]==='-c'){console.log(v||versions.bash);process.exit()}
if(name==='readlink'&&a[0]==='-f'){console.log('/');process.exit()}
if(a[0]==='--version'&&versions[name]){console.log(v||versions[name]);process.exit()}
process.exit(1)
`;
export const crewTools=['bash','timeout','tail','patch','readlink','python3'];
export function installCrewTools(bin){for(const name of crewTools){fs.writeFileSync(path.join(bin,name),fake);fs.chmodSync(path.join(bin,name),0o755)}}
