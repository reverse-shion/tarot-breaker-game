/** Read-only Pages Free static deployment preflight, no uploads or mutations. */
import {execFileSync} from 'node:child_process';
import {lstatSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const MAX_FILES = 20000;
const MAX_BYTES = 25 * 1024 * 1024;

export function analyzeFiles(entries, {maxFiles=MAX_FILES,maxBytes=MAX_BYTES}={}) {
  const violations=[];
  const regular=entries.filter(x=>x.type === 'file');
  const nonRegular=entries.filter(x=>x.type !== 'file');
  if (regular.length > maxFiles) violations.push('FILE_COUNT_EXCEEDED');
  for (const x of regular) if (x.size > maxBytes)
    violations.push('TOO_LARGE: '+x.path+' ('+x.size+' bytes)');
  for (const x of nonRegular)
    violations.push('NOT_REGULAR_FILE: '+x.path);
  const totalBytes=regular.reduce((sum,x)=>sum+x.size,0);
  return {status:violations.length?'STOP':'PRECHECK_PASS',fileCount:regular.length,
    totalBytes,maxSingleBytes:regular.reduce((m,x)=>Math.max(m,x.size),0),
    maximumFiles:maxFiles,maximumSingleFileBytes:maxBytes,violations};
}

export function checkWorkingTree(root=process.cwd()) {
  const base=resolve(root);
  const output=execFileSync('git',['ls-files','-z'],{cwd:base,encoding:'buffer',maxBuffer:64*1024*1024});
  const names=output.toString('utf8').split('\0').filter(Boolean);
  const entries=names.map(path=>{
    const abs=join(base,path);
    if(!existsSync(abs)) return {path,type:'missing',size:0};
    const stat=lstatSync(abs);
    return {path,type:stat.isFile()?'file':'non-file',size:stat.size};
  });
  if(!entries.some(x=>x.path==='index.html'&&x.type==='file'))
    throw new Error('Missing root index.html');
  return analyzeFiles(entries);
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{
    const report=checkWorkingTree();
    console.log(JSON.stringify(report,null,2));
    if(report.status!=='PRECHECK_PASS') process.exitCode=1;
  }catch(error){ console.error('STOP: '+error.message);process.exitCode=1;}
}
