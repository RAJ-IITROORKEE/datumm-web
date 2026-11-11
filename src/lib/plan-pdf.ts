/** One A3–A1 page embeds the drawing raster at a readable label size. Plain byte arrays, so it runs on the server and in the browser. */
export function planPdf(jpeg:Uint8Array,width:number,height:number,svgWidth=width,svgHeight=height):Uint8Array{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2400||height>2400||jpeg.length>10_000_000)throw Error('Drawing exceeds PDF bounds.');
 const margin=36;
 if(!Number.isFinite(svgWidth)||!Number.isFinite(svgHeight)||svgWidth<=0||svgHeight<=0||svgWidth>24000||svgHeight>24000)throw Error('Invalid drawing extents.');
 const [pageW,pageH]=[[842,1191],[1191,1684],[1684,2384]].find(([w,h])=>Math.min((w-2*margin)/svgWidth,(h-2*margin)/svgHeight)*112.5>=7)??[1684,2384];
 const scale=Math.min((pageW-2*margin)/width,(pageH-2*margin)/height);
 const w=width*scale,h=height*scale,x=(pageW-w)/2,y=(pageH-h)/2;
 // Every string below is ASCII, so one byte per character.
 const ascii=(text:string)=>Uint8Array.from(text,char=>char.charCodeAt(0));
 const join=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;};
 const stream=ascii(`q ${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm /Drawing Do Q`);
 const objects=[ascii('<< /Type /Catalog /Pages 2 0 R >>'),ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Drawing 4 0 R >> >> /Contents 5 0 R >>`),
  join([ascii(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,ascii('\nendstream')]),
  join([ascii(`<< /Length ${stream.length} >>\nstream\n`),stream,ascii('\nendstream')])];
 const parts=[ascii('%PDF-1.4\n%DATUMM canonical drawing\n')],offsets=[0];let cursor=parts[0].length;
 objects.forEach((object,i)=>{offsets.push(cursor);const part=join([ascii(`${i+1} 0 obj\n`),object,ascii('\nendobj\n')]);parts.push(part);cursor+=part.length;});
 parts.push(ascii(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`));
 return join(parts);
}
