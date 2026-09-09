// Build-time prefix; empty for local/Sites hosting, repository path for Pages.
export function sitePath(path:string){
 const base=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\/$/,'');
 return base+'/'+path.replace(/^\//,'');
}
