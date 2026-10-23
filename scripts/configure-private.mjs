import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {passwordVerifier} from '../security/gate.mjs';
let password=process.env.ATLAS_SETUP_PASSWORD;
if(!password){
 if(!process.stdin.isTTY)throw Error('Use an interactive terminal, or provide ATLAS_SETUP_PASSWORD to this process only.');
 process.stdout.write('Set the private atlas password (input hidden): ');
 const hidden=new Writable({write(_chunk,_encoding,callback){callback();}}),reader=createInterface({input:process.stdin,output:hidden,terminal:true});
 password=await new Promise(resolve=>reader.question('',answer=>{reader.close();resolve(answer);}));process.stdout.write('\n');
}
if(password.length<12||password.length>256)throw Error('Use a password of 12–256 characters.');
const verifier=await passwordVerifier(password),sessionSecret=randomBytes(32).toString('base64url');
await writeFile('.env.private.local',`ATLAS_PASSWORD_VERIFIER=${verifier}\nATLAS_SESSION_SECRET=${sessionSecret}\n`,{encoding:'utf8',mode:0o600,flag:process.argv.includes('--rotate')?'w':'wx'});
password='';delete process.env.ATLAS_SETUP_PASSWORD;
console.log('Created ignored .env.private.local with a salted verifier and a random session key. No plaintext password saved.');
