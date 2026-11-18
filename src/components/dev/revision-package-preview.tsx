'use client';

import {useState} from 'react';
import type {DrawingVersion} from '../plan-canvas';
import {RevisionPackageView} from '../review/revision-package-view';
import {changeLog,graphsByVersion,parsePackage} from '@/lib/revision-package.mjs';

// Synthetic plans only: three saved versions of one concept, as the package route would list them.
type Room={key:string;name:string;rect:[number,number,number,number]};
const room=(key:string,name:string,rect:Room['rect']):Room=>({key,name,rect});
const original=[
  room('living','Living',[0,0,600,400]),room('kitchen','Kitchen',[600,0,900,400]),
  room('bed2','Bedroom 2',[0,400,600,700]),room('bath','Bathroom',[600,400,900,700]),
];
const revised=[
  room('living','Living',[0,0,600,400]),room('kitchen','Kitchen',[600,0,900,400]),
  room('bed2','Bedroom 2',[0,400,700,700]),room('bath','Bathroom',[700,400,900,700]),
];
const shape=({name,rect:[x1,y1,x2,y2]}:Room)=>
  `<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#f4f1ea"`
  +` stroke="#222" stroke-width="6"/>`
  +`<text x="${(x1+x2)/2}" y="${(y1+y2)/2}" font-size="28"`
  +` text-anchor="middle" fill="#222">${name}</text>`;
const svg=(rooms:Room[])=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 940 740">'
  +`<rect x="-20" y="-20" width="940" height="740" fill="#fff"/>${rooms.map(shape).join('')}</svg>`;
const drawing=(version:number,rooms:Room[]):DrawingVersion=>({
  planId:'fixture-plan',version,fingerprint:`fixture-v${version}`,svg:svg(rooms),
  graph:{
    site:{widthMm:9000,depthMm:7000},wallThicknessMm:200,wallHeightMm:3000,walls:[],
    openings:[{key:'d1',wallKey:'w',kind:'door',offsetMm:300,widthMm:900,heightMm:2100,sillMm:0}],
    rooms:rooms.map(row=>({key:row.key,name:row.name,areaMm2:0,rect:row.rect})),
  },
});

const finding=(severity:string,message:string)=>
  ({code:'brief.area-band',category:'brief',severity,message,refs:{rooms:['bed2']}});
const checks=(status:string,rows:object[])=>
  ({schema:'datumm.findings.v1',ruleSet:'plan-rules@1',status,summary:{},findings:rows});
const version=(n:number,over:object={})=>({
  version:n,parentVersion:n===1?null:n-1,fingerprint:`fixture-v${n}`,
  createdAt:'2026-11-18T09:30:00Z',
  findings:checks('pass',[]),assumptions:[],edit:null,diff:null,...over,
});
const raw=(versions:{version:number}[])=>({
  schema:'datumm.revision-package.v1',planId:'fixture-plan',
  version:versions[versions.length-1].version,versions,
});
const quiet={addedRooms:[],removedRooms:[],siteChanged:false,openingCounts:{from:3,to:3}};

const scenarios={
  'three versions':raw([
    version(1,{
      findings:checks('fail',[finding('blocking','Bedroom 2 is narrower than the brief asks.')]),
      assumptions:['Walls are 200 mm thick.'],
    }),
    version(2,{
      edit:{changes:{rooms:[{key:'bed2',fields:['rect','area']}],walls:['wall-4'],openings:['d1']}},
      findings:checks('warn',[finding('advisory','The bathroom is small.')]),
    }),
    version(3,{
      edit:{changes:{rooms:[{key:'bath',fields:['name']}],walls:[],openings:[]}},
      assumptions:['Walls are 200 mm thick.','Doors open inwards.'],
    }),
  ]),
  'changes not recorded':raw([
    version(1),version(2),
    version(3,{diff:{...quiet,
      changedRooms:[{key:'bed2',from:{kind:'bedroom'},to:{kind:'bedroom'}}]}}),
  ]),
  'first version only':raw([version(1)]),
  'unreadable package':{schema:'datumm.revision-package.v2'},
};
type Scenario=keyof typeof scenarios;

export function RevisionPackagePreview(){
  const [scenario,setScenario]=useState<Scenario>('three versions');
  const [accepted,setAccepted]=useState<boolean|null>(true);
  const pkg=parsePackage(scenarios[scenario]);
  const first=drawing(1,original),last=drawing(pkg?.version??1,pkg&&pkg.version>1?revised:original);
  const bar={display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',padding:'8px 16px',
    borderBottom:'1px solid var(--separator)'} as const;
  return <div>
    <div style={bar}>
      <strong>Revision package fixture</strong>
      <span>Synthetic plans · the real page loads these through the service proxy</span>
      {(Object.keys(scenarios) as Scenario[]).map(key=>
        <button key={key} aria-pressed={scenario===key} onClick={()=>setScenario(key)}>
          {key}</button>)}
      <button aria-pressed={accepted===true} onClick={()=>setAccepted(true)}>accepted</button>
      <button aria-pressed={accepted===false} onClick={()=>setAccepted(false)}>not accepted</button>
      <button aria-pressed={accepted===null} onClick={()=>setAccepted(null)}>
        task unreadable</button>
    </div>
    {pkg
      ?<RevisionPackageView title="Fixture concept" pkg={pkg} first={first} last={last}
        accepted={accepted} dataHref="#" onPrint={()=>window.print()}
        log={changeLog(pkg,graphsByVersion(pkg,first.graph,last.graph))}/>
      :<p role="alert" style={{padding:24}}>
        This revision package is in a format this page does not recognise.
        The real page shows this with Try again.</p>}
  </div>;
}
