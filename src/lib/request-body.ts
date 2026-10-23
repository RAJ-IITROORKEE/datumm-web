// Bound streamed/chunked input too; Content-Length alone is not a boundary.
export async function requestBody(request:Request):Promise<string|Response>{
 const reader=request.body?.getReader();
 if(!reader)return '';
 const chunks:Uint8Array[]=[];let bytes=0;
 while(true){
  const {done,value}=await reader.read();if(done)break;
  bytes+=value.byteLength;
  if(bytes>65536){await reader.cancel();return Response.json({detail:'Request body exceeds 64 KiB.'},{status:413});}
  chunks.push(value);
 }
 return Buffer.concat(chunks).toString('utf8');
}
