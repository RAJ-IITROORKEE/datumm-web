import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as history from '../src/lib/sidebar-history.mjs';
const workflow = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/workflow-state.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:workflow});

test('loaded-record search has real distinct groups and omits unavailable project/navigation actions',()=>{
  const chats=[{id:'a',title:'Plan',projectId:'p'},{id:'a',title:'Plan',projectId:'p'},{id:'b',title:'Inbox task',projectId:'inbox'}];
  const projects=[{id:'p',title:'Clinic'},{id:'old',title:'Archived',archived_at:'today'},{id:'inbox',title:'Inbox',isDefault:true}];
  const navigation=[{id:'settings',title:'Settings'},{id:'unsupported',title:'Fake action',disabled:true}];
  assert.deepEqual(history.sidebarSearchResults(chats,projects,navigation,'clinic').map(row=>[row.kind,row.id]),[['chat','a'],['project','p']]);
  assert.deepEqual(history.sidebarSearchResults(chats,projects,navigation,'inbox').map(row=>[row.kind,row.id]),[['chat','b']]);
  assert.deepEqual(history.sidebarSearchResults(chats,projects,navigation,'archived'),[]);
  assert.deepEqual(history.sidebarSearchResults(chats,projects,navigation,'settings').map(row=>row.kind),['navigation']);
  assert.equal(history.sidebarSearchResults(chats,projects,navigation,'').length,4);
});

test('reserved search shortcut preserves editing, IME and higher-priority dialog ownership',()=>{
  const key={key:'K',ctrlKey:true};
  assert.equal(history.isSidebarSearchShortcut(key,false,false),true);
  assert.equal(history.isSidebarSearchShortcut({key:'k',metaKey:true},false,false),true);
  for(const override of [{isComposing:true},{keyCode:229},{defaultPrevented:true},{altKey:true},{ctrlKey:false},{key:'x'}])
    assert.equal(history.isSidebarSearchShortcut({...key,...override},false,false),false);
  assert.equal(history.isSidebarSearchShortcut(key,true,false),false);
  assert.equal(history.isSidebarSearchShortcut(key,false,true),false);
});

test('search selection wraps and never selects an absent result',()=>{
  assert.equal(history.nextSearchIndex(0,0,'ArrowDown'),-1);
  assert.equal(history.nextSearchIndex(0,3,'ArrowUp'),2);
  assert.equal(history.nextSearchIndex(-1,3,'ArrowUp'),2);
  assert.equal(history.nextSearchIndex(2,3,'ArrowDown'),0);
  assert.equal(history.nextSearchIndex(1,3,'Home'),0);
  assert.equal(history.nextSearchIndex(1,3,'End'),2);
});

function loadComponent(file,extra={},effects=false) {
  const slots=[];let cursor=0;
  const hooks={...React,useId:()=> 'search-test',useEffect(callback){if(effects)callback();},useRef(initial){const slot=cursor++;return slots[slot]??={current:initial};},
    useState(initial){const slot=cursor++;if(!(slot in slots))slots[slot]=initial;return [slots[slot],next=>{slots[slot]=typeof next==='function'?next(slots[slot]):next;}];}};
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,HTMLElement:extra.HTMLElement??class{},document:extra.document??{querySelector(){return null;},querySelectorAll(){return [];}},requestAnimationFrame:callback=>callback(),require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsxRuntime;
    if(name==='@/lib/sidebar-history.mjs')return history;
    if(name==='@/lib/utils')return {cn:(...values)=>values.filter(Boolean).join(' ')};
    if(name==='radix-ui')return {Dialog:{Content:'DialogContent'},DropdownMenu:new Proxy({},{get:(_,key)=>`Menu${key}`})};
    if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>String(key)})};
    if(['./sidebar-chats','./sidebar-account','./sidebar-rail'].includes(name))return loadComponent(`../src/components/workspace/${name.slice(2)}.tsx`,extra,effects).exports;
    if(name in extra)return extra[name];
    if(name==='@/lib/workflow-state')return workflow;
    return new Proxy({},{get:(_,key)=>String(key)});
  }});
  return {exports,render(name,props){cursor=0;return exports[name](name==='Sidebar'?{scope:{key:'account-task-a',accountKey:'account',epoch:1,taskId:'a',sourceKey:'source'},...props}:props);}};
}
function all(tree,predicate) {
  const found=[];
  function visit(node){if(!React.isValidElement(node))return;if(predicate(node))found.push(node);React.Children.forEach(node.props.children,visit);}
  visit(tree);return found;
}

test('actual search dialog Enter/IME/no-match and dismissal keep focus and activation separate',()=>{
  const component=loadComponent('../src/components/workspace/search-dialog.tsx');
  const activated=[],opened=[],queries=[];let focused=0;
  const props={open:true,query:'',onOpenChange:value=>opened.push(value),onQueryChange:value=>queries.push(value),
    chats:[{id:'a',title:'A'},{id:'b',title:'B'}],projects:[],navigation:[],loading:false,error:'',busy:false,
    opener:{current:{isConnected:true,getClientRects:()=>[{}],closest:()=>null,focus(){focused++;}}},onActivate:result=>activated.push(result.id)};
  let tree=component.render('SearchDialog',props);
  const press=(key,isComposing=false)=>all(tree,node=>node.type==='input')[0].props.onKeyDown({key,keyCode:0,nativeEvent:{isComposing},preventDefault(){}});
  press('ArrowDown');tree=component.render('SearchDialog',props);
  press('Enter',true);assert.deepEqual(opened,[]);
  press('Enter');assert.deepEqual(opened,[false]);assert.deepEqual(activated,[]);
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.deepEqual(activated,['b']);assert.equal(focused,0);
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.equal(focused,1,'Escape/outside dismissal returns the original visible opener');
  tree=component.render('SearchDialog',{...props,query:'missing'});
  press('Enter');assert.deepEqual(opened,[false],'No-match Enter does not activate anything');
  all(tree,node=>node.type==='IconButton'&&node.props.label==='Clear search')[0].props.onClick();
  assert.deepEqual(queries,['']);
});

test('search dismissal skips an absent or hidden opener and restores the visible web navigation trigger',()=>{
  const focused=[];
  const element=(name,visible=true,inert=false)=>({isConnected:true,getClientRects:()=>visible?[{}]:[],closest:()=>inert?{}:null,focus:()=>focused.push(name)});
  const hidden=element('hidden rail',false),inert=element('inert rail',true,true),web=element('Open workspace navigation');
  const component=loadComponent('../src/components/workspace/search-dialog.tsx',{document:{querySelectorAll:()=>[hidden,inert,web]}});
  const props={open:true,query:'',onOpenChange(){},onQueryChange(){},chats:[],projects:[],navigation:[],loading:false,error:'',busy:false,opener:{current:inert},onActivate(){}};
  const tree=component.render('SearchDialog',props);
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.deepEqual(focused,['Open workspace navigation']);
});

test('actual sidebar clears search on close, preserves unknown tasks and guards supported mutations',()=>{
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const queries=[];
  const props={runs:[{id:'pin',title:'Pinned',pinned_at:'today',projectId:'p',data:{}},{id:'orphan',title:'Unlisted',projectId:'unknown',data:{}}],
    projects:[{id:'p',title:'Clinic',revision:4}],orderedProjects:[{id:'p',title:'Clinic',revision:4}],collapsedProjects:['p'],
    runId:'orphan',mediaBusy:false,actionBusy:false,dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},
    search:'',setSearch:value=>queries.push(value),studioView:'workspace',historyView:'recent',desktopAvailable:false,
    workflowFilter:'',projectsSupported:true,chatMenuUnsupported:['rename','move'],unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:''};
  const tree=component.render('Sidebar',props);
  const search=all(tree,node=>node.type==='SearchDialog')[0];
  search.props.onOpenChange(false);assert.deepEqual(queries,['']);
  const rows=all(tree,node=>node.type==='ChatRow');
  assert.deepEqual(rows.map(row=>row.props.item.id),['pin','orphan']);
  assert.equal(rows.find(row=>row.props.item.id==='orphan').props.selected,true);
  assert.equal(rows[0].props.onRename,undefined);assert.equal(rows[0].props.onMove,undefined);
  const footer=all(tree,node=>typeof node.type==='function'&&node.type.name==='AccountFooter')[0];
  assert.match(JSON.stringify(footer.type(footer.props)),/Sign-in unavailable/,'Unconfigured auth does not call Clerk hooks');
});

test('actual project creation keeps the submitted title on conflict and submits only once while pending',async()=>{
  const component=loadComponent('../src/components/workspace/project-create.tsx');
  const submitted=[];let resolve;
  const props={disabled:false,onCreate:title=>{submitted.push(title);return new Promise(done=>{resolve=done;});}};
  let tree=component.render('ProjectCreate',props);
  tree.props.onClick();tree=component.render('ProjectCreate',props);
  tree.props.onChange({target:{value:'  東京 Clinic  '}});tree=component.render('ProjectCreate',props);
  const enter={key:'Enter',keyCode:0,nativeEvent:{isComposing:false},preventDefault(){}};
  tree.props.onKeyDown({...enter,nativeEvent:{isComposing:true}});assert.deepEqual(submitted,[]);
  tree.props.onKeyDown(enter);tree.props.onKeyDown(enter);
  assert.deepEqual(submitted,['東京 Clinic']);
  assert.equal(component.render('ProjectCreate',props).props.disabled,true);
  resolve(false);await new Promise(setImmediate);
  tree=component.render('ProjectCreate',props);
  assert.equal(tree.type,'input');assert.equal(tree.props.value,'東京 Clinic');
  tree.props.onKeyDown({...enter,key:'Escape'});
  assert.equal(component.render('ProjectCreate',props).type,'button');
});

test('actual inline rename retains conflicting values, preserves revision-bound callback and supports cancellation',async()=>{
  const component=loadComponent('../src/components/workspace/chat-row.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'}),hasPendingQuestion:()=>false}},true);
  const submitted=[];
  const props={item:{id:'task-a',title:'Old',status:'completed',taskVersion:8},selected:true,busy:false,unread:false,
    dialogTrigger:{current:null},onRename:async title=>{submitted.push([props.item.id,props.item.taskVersion,title]);return false;}};
  let tree=component.render('ChatRow',props);
  all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('Rename'))[0].props.onSelect();
  tree=component.render('ChatRow',props);
  all(tree,node=>node.type==='input')[0].props.onChange({target:{value:'Revised plan'}});
  tree=component.render('ChatRow',props);
  const enter={key:'Enter',keyCode:0,nativeEvent:{isComposing:false},preventDefault(){}};
  all(tree,node=>node.type==='input')[0].props.onKeyDown(enter);
  await new Promise(setImmediate);tree=component.render('ChatRow',props);
  assert.deepEqual(submitted,[['task-a',8,'Revised plan']]);
  assert.equal(all(tree,node=>node.type==='input')[0].props.value,'Revised plan');
  all(tree,node=>node.type==='input')[0].props.onKeyDown({...enter,key:'Escape'});
  tree=component.render('ChatRow',props);
  assert.equal(all(tree,node=>node.type==='input').length,0);
  assert.equal(submitted.length,1);
});

test('actual account footer follows current Clerk identity and preserves its existing actions',()=>{
  let user={fullName:'Ada Architect',imageUrl:'https://example.com/ada',primaryEmailAddress:{emailAddress:'ada@example.com'}};
  const signedOut=[],opened=[];
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@clerk/nextjs':{useUser:()=>({user}),useClerk:()=>({signOut:()=>signedOut.push(true)}),Show:'Show',SignInButton:'SignInButton'},'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})},'@/lib/prompt-queue.mjs':{clearQueueKeys:storages=>signedOut.push(`cleared ${storages.length}`)}});
  const props={runs:[],projects:[],orderedProjects:[],collapsedProjects:[],runId:'',mediaBusy:false,actionBusy:false,
    dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},search:'',studioView:'workspace',historyView:'recent',
    desktopAvailable:false,workflowFilter:'',projectsSupported:false,chatMenuUnsupported:[],unreadIds:new Set(),authConfigured:true,workspaceReady:true,serviceError:''};
  const tree=component.render('Sidebar',props);
  const footer=all(tree,node=>typeof node.type==='function'&&node.type.name==='AccountFooter')[0];
  const configured=footer.type({...footer.props,openActivity:()=>opened.push('activity'),openSchedules:()=>opened.push('schedules'),openSettings:()=>opened.push('settings'),openArchived:()=>opened.push('archive'),openConnections:()=>opened.push('connections'),confirmDeleteAll:()=>opened.push('delete')});
  const profile=all(configured,node=>typeof node.type==='function'&&node.type.name==='ProfileMenu')[0];
  let account=profile.type(profile.props);
  assert.equal(React.Children.only(all(account,node=>node.type==='MenuPortal')[0].props.children).type,'MenuContent','The installed menu Portal slots one content element; styles stay outside');
  assert.equal(all(account,node=>node.type==='ProfileIdentity')[0].props.name,'Ada Architect');
  assert.equal(all(account,node=>node.type==='ProfileIdentity')[0].props.email,'ada@example.com');
  assert.equal(all(account,node=>node.type==='Avatar')[0].props['aria-hidden'],'true');
  const items=all(account,node=>node.type==='MenuItem');items.forEach(item=>item.props.onSelect());
  assert.deepEqual(opened,['activity','schedules','settings','archive','connections','delete']);assert.deepEqual(signedOut,['cleared 2',true],'Queued prompts are cleared before sign-out');
  const trigger=all(account,node=>node.type==='button')[0];
  assert.equal(trigger.props['aria-label'],'Account settings for Ada Architect');
  assert.equal(all(trigger,node=>node.type==='Avatar').length,1,'The entire account row is the single menu trigger');
  user={fullName:'BIM Reviewer',imageUrl:'https://example.com/bim',primaryEmailAddress:{emailAddress:'reviewer@example.com'}};
  account=profile.type(profile.props);
  assert.equal(all(account,node=>node.type==='ProfileIdentity')[0].props.name,'BIM Reviewer');
});

test('actual sidebar mutation callbacks retain task/project revisions and drawer focus returns',()=>{
  const events=[],focused=[];
  const document={querySelectorAll:()=>[{getClientRects:()=>[],focus:()=>focused.push('hidden')},
    {getClientRects:()=>[{}],focus:()=>focused.push('navigation')}],querySelector:()=>null};
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{document,'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const item={id:'a',title:'Task',projectId:'p',taskVersion:12,data:{}};
  const props={runs:[item],projects:[{id:'p',title:'Clinic',revision:7}],orderedProjects:[{id:'p',title:'Clinic',revision:7}],collapsedProjects:[],
    runId:'a',mediaBusy:false,actionBusy:false,dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},search:'',
    studioView:'workspace',historyView:'recent',desktopAvailable:false,workflowFilter:'',projectsSupported:true,chatMenuUnsupported:[],
    unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:'',setLeft:value=>events.push(['left',value]),
    setRenameTitle:title=>events.push(['title',title]),setRenameTarget:target=>events.push(['project',target.revision]),
    updateHistory:(task,action)=>events.push([action,task.id,task.taskVersion]),renameChat:(task,title)=>events.push(['rename',task.taskVersion,title]),
    moveChat:(task,projectId)=>events.push(['move',task.taskVersion,projectId])};
  const tree=component.render('Sidebar',props);
  const row=all(tree,node=>node.type==='ChatRow')[0];
  row.props.onHistory('pin');row.props.onRename('Renamed');row.props.onMove(null);
  all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('Rename project'))[0].props.onSelect();
  all(tree,node=>node.type==='button'&&node.props['aria-label']==='Close task navigation')[0].props.onClick();
  assert.deepEqual(events,[['pin','a',12],['rename',12,'Renamed'],['move',12,null],['title','Clinic'],['project',7],['left',false]]);
  assert.deepEqual(focused,['navigation']);
});

test('reference sidebar arrangement keeps real workspace actions, project focus and honest unavailable state',()=>{
  const events=[];
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const props={runs:[],projects:[],orderedProjects:[],collapsedProjects:[],runId:'',mediaBusy:false,actionBusy:false,
    dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},search:'',studioView:'workspace',historyView:'recent',
    desktopAvailable:false,workflowFilter:'',projectsSupported:false,chatMenuUnsupported:[],unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:'',
    newTask:()=>events.push('new'),setDeviceDialog:value=>events.push(['connections',value]),openStudioView:view=>events.push(view),
    changeSettingsOpen:value=>events.push(['settings',value])};
  const tree=component.render('Sidebar',props);
  const nav=all(tree,node=>node.type==='nav'&&node.props['aria-label']==='Workspace views')[0];
  const buttons=all(nav,node=>node.type==='button');
  assert.equal(buttons.length,3);
  assert.deepEqual(buttons.map(button=>all(button,node=>['SquarePen','Folder','LayoutGrid'].includes(node.type))[0].type),['SquarePen','Folder','LayoutGrid']);
  buttons[0].props.onClick();buttons[2].props.onClick();
  const project=all(tree,node=>node.type==='section'&&node.props.id==='sidebar-projects')[0];
  project.props.ref.current={scrollIntoView:()=>events.push('scroll-projects'),focus:()=>events.push('focus-projects')};
  buttons[1].props.onClick();
  assert.match(JSON.stringify(project),/Projects are unavailable on this service/);
  const unknown=component.render('Sidebar',{...props,projectsUnknown:true});
  assert.match(JSON.stringify(all(unknown,node=>node.type==='section'&&node.props.id==='sidebar-projects')[0]),/Projects could not load\./);
  const footer=all(tree,node=>typeof node.type==='function'&&node.type.name==='AccountFooter')[0];
  footer.props.openActivity();footer.props.openSchedules();footer.props.openSettings();
  assert.deepEqual(events,['new',['connections',true],'scroll-projects','focus-projects','activity','schedules',['settings',true]]);
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='DATUMM workspace menu').length,0);
  assert.equal(all(tree,node=>node.type==='img'&&node.props.src==='/datumm-mark.png').length,1);
  const search=all(tree,node=>node.type==='SearchDialog')[0];
  for(const id of ['activity','schedules','settings'])assert.ok(search.props.navigation.some(item=>item.id===id));
  const collapsedProps={...props,left:false,toggleLeft:()=>events.push('expand')};
  const collapsed=component.render('Sidebar',collapsedProps),rail=all(collapsed,node=>node.type==='nav'&&node.props['aria-label']==='Collapsed navigation')[0];
  for(const label of ['Expand navigation','Search chats and projects','New chat','Projects','Connections'])assert.equal(all(rail,node=>node.type==='button'&&node.props['aria-label']===label).length,1,label);
  assert.equal(all(collapsed,node=>node.type==='aside'&&node.props.id==='workspace-sidebar').length,0,'The collapsed rail replaces the single expanded sidebar');
  assert.equal(all(rail,node=>typeof node.type==='function'&&node.type.name==='AccountFooter')[0].props.compact,true);
  all(rail,node=>node.type==='button'&&node.props['aria-label']==='Expand navigation')[0].props.onClick();assert.equal(events.at(-1),'expand');
  all(rail,node=>node.type==='button'&&node.props['aria-label']==='Search chats and projects')[0].props.onClick({currentTarget:{}});
  assert.equal(all(component.render('Sidebar',collapsedProps),node=>node.type==='SearchDialog')[0].props.open,true);
});

test('reference chat quick-pin uses the existing history action and pending guard',()=>{
  const actions=[];
  const component=loadComponent('../src/components/workspace/chat-row.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'}),hasPendingQuestion:()=>false}});
  const props={item:{id:'a',title:'Plan',status:'completed',pinned_at:'today'},selected:false,busy:false,unread:false,
    dialogTrigger:{current:null},onHistory:action=>actions.push(action)};
  let tree=component.render('ChatRow',props);
  const quick=all(tree,node=>node.type==='button'&&node.props['aria-label']==='Unpin Plan')[0];
  assert.equal(all(quick,node=>node.type==='Pin')[0].props.size,14);
  quick.props.onClick();assert.deepEqual(actions,['unpin']);
  tree=component.render('ChatRow',{...props,busy:true});
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='Unpin Plan')[0].props.disabled,true);
});

test('chat overlay actions remain separate single-click controls and preserve status and unread indicators',()=>{
  const actions=[],dialogTrigger={current:null};
  const component=loadComponent('../src/components/workspace/chat-row.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'in_progress'}),hasPendingQuestion:()=>true}});
  const props={item:{id:'exact-task',title:'A long task title',status:'running'},selected:true,busy:false,unread:true,
    dialogTrigger,onSelect:()=>actions.push('select'),onHistory:action=>actions.push(action)};
  const tree=component.render('ChatRow',props);
  const buttons=all(tree,node=>node.type==='button');
  const select=buttons.find(node=>node.props['aria-current']==='page');
  const menu=buttons.find(node=>node.props['aria-label']==='Options for A long task title');
  const pin=buttons.find(node=>node.props['aria-label']==='Pin A long task title');
  assert.ok(select&&menu&&pin);
  assert.equal(tree.props.onClick,undefined,'The row wrapper cannot turn an action click into task selection');
  assert.equal(all(select,node=>node.type==='span'&&node.props.children==='Working').length,1);
  const attention=loadComponent('../src/components/workspace/chat-row.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'needs_input',label:'Waiting for your input'}),hasPendingQuestion:()=>true}});
  const waiting=attention.render('ChatRow',{...props,item:{...props.item,status:'needs_input'}});
  assert.equal(all(waiting,node=>node.type==='span'&&node.props.children==='Needs attention').length,1);
  assert.equal(all(select,node=>node.props['aria-label']==='Unread result').length,1);
  pin.props.onClick(); assert.deepEqual(actions,['pin']);
  menu.props.onClick({currentTarget:'menu-opener'});
  assert.equal(dialogTrigger.current,'menu-opener');assert.deepEqual(actions,['pin']);
  select.props.onClick();assert.deepEqual(actions,['pin','select']);
});

test('sidebar places pinned, project and ungrouped chats in reference order',()=>{
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const runs=[{id:'pinned',title:'Pinned',projectId:'p',pinned_at:'today',data:{}},
    {id:'grouped',title:'Project chat',projectId:'p',data:{}},{id:'plain',title:'Chat',data:{}}];
  const project={id:'p',title:'Clinic',revision:7};
  const tree=component.render('Sidebar',{runs,projects:[project],orderedProjects:[project],collapsedProjects:[],
    runId:'',mediaBusy:false,actionBusy:false,dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},search:'',
    studioView:'workspace',historyView:'recent',desktopAvailable:false,workflowFilter:'',projectsSupported:true,chatMenuUnsupported:[],
    unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:''});
  const region=all(tree,node=>node.type==='div'&&node.props.role==='region')[0];
  const sections=React.Children.toArray(region.props.children).filter(node=>node?.type==='section');
  assert.deepEqual(sections.map(section=>all(section,node=>node.type==='ChatRow').map(row=>row.props.item.id)),[['pinned'],['grouped'],['plain']]);
  assert.ok(all(sections[0],node=>node.type==='h2'&&node.props.children==='Pinned').length);
  assert.ok(all(sections[1],node=>node.type==='h2'&&node.props.children==='Projects').length);
  assert.ok(all(sections[2],node=>node.type==='h2'&&node.props.children==='Chats').length);
  const toggle=all(sections[1],node=>node.type==='button'&&node.props['aria-expanded']===true)[0];
  assert.deepEqual(all(toggle,node=>['FolderOpen','ChevronDown'].includes(node.type)).map(node=>node.type),['FolderOpen','ChevronDown']);
});

test('project overview lists only loaded project chats and opens current records after closing',()=>{
  const component=loadComponent('../src/components/workspace/project-overview.tsx');
  const selected=[],opened=[],closed=[];let focused=0;
  const opener={current:{isConnected:true,getClientRects:()=>[{}],closest:()=>null,focus(){focused++;}}};
  const props={project:{id:'p',title:'Clinic'},chats:[{id:'a',projectId:'p',title:'Old'},{id:'b',projectId:'other',title:'Other'}],historyView:'recent',busy:false,opener,onClose:()=>closed.push(true),onSelect:chat=>selected.push(chat),onNewChat:id=>opened.push(id)};
  let tree=component.render('ProjectOverview',props);
  const buttons=all(all(tree,node=>node.props['aria-label']==='Project chats')[0],node=>node.type==='button');
  assert.deepEqual(buttons.map(node=>node.props.children),['Old']);
  buttons[0].props.onClick();
  tree=component.render('ProjectOverview',{...props,chats:[{id:'a',projectId:'p',title:'Updated'}]});
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.equal(selected[0].title,'Updated');assert.equal(focused,0);assert.equal(closed.length,1);
  tree=component.render('ProjectOverview',props);
  all(tree,node=>node.type==='Button')[0].props.onClick();
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.deepEqual(opened,['p']);
  tree=component.render('ProjectOverview',props);
  all(tree,node=>node.type==='DialogContent')[0].props.onCloseAutoFocus({preventDefault(){}});
  assert.equal(focused,1);
  tree=component.render('ProjectOverview',{...props,busy:true});
  assert.equal(all(all(tree,node=>node.props['aria-label']==='Project chats')[0],node=>node.type==='button')[0].props.disabled,true);
  assert.equal(all(tree,node=>node.type==='Button')[0].props.disabled,true);
});

test('project overview waits for its menu to release focus before opening',()=>{
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const project={id:'p',title:'Clinic'};
  const props={runs:[],projects:[project],orderedProjects:[project],collapsedProjects:[],runId:'',mediaBusy:false,actionBusy:false,
    dialogTrigger:{current:null},left:true,viewportReady:true,panelWidths:{left:272},search:'',studioView:'workspace',historyView:'recent',
    desktopAvailable:false,workflowFilter:'',projectsSupported:true,chatMenuUnsupported:[],unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:''};
  let tree=component.render('Sidebar',props);
  const menu=all(tree,node=>node.type==='MenuContent'&&typeof node.props.onCloseAutoFocus==='function')[0];
  all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('Open project'))[0].props.onSelect();
  tree=component.render('Sidebar',props);
  assert.equal(all(tree,node=>node.type==='ProjectOverview')[0].props.project,null);
  let prevented=false;menu.props.onCloseAutoFocus({preventDefault(){prevented=true;}});
  tree=component.render('Sidebar',props);
  assert.equal(prevented,true);assert.equal(all(tree,node=>node.type==='ProjectOverview')[0].props.project.id,'p');
});


test('chat Share menu waits for menu focus release and keeps the row task',()=>{
 const component=loadComponent('../src/components/workspace/chat-row.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'}),hasPendingQuestion:()=>false}});
 const opened=[];
 const tree=component.render('ChatRow',{item:{id:'b',title:'Other chat',status:'completed'},selected:false,busy:false,unread:false,dialogTrigger:{current:null},onShare:()=>opened.push('b')});
 const item=all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('Share'))[0];
 item.props.onSelect();assert.deepEqual(opened,[]);
 let prevented=false;
 all(tree,node=>node.type==='MenuContent')[0].props.onCloseAutoFocus({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.deepEqual(opened,['b']);
});

test('sidebar Share captures the menu task and rejects closed, changed-account and A-B-A owners',()=>{
 const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
 const scope={key:'account-task-a',accountKey:'account',epoch:1,taskId:'a',sourceKey:'source'};
 const props={scope,runs:[{id:'a',title:'Current task',data:{}},{id:'b',title:'Other task',data:{}}],projects:[],orderedProjects:[],collapsedProjects:[],runId:'a',mediaBusy:false,actionBusy:false,dialogTrigger:{current:{id:'menu-b'}},left:true,viewportReady:true,search:'',studioView:'workspace',historyView:'recent',desktopAvailable:false,workflowFilter:'',projectsSupported:false,chatMenuUnsupported:[],unreadIds:new Set(),authConfigured:true,workspaceReady:true,serviceError:''};
 let tree=component.render('Sidebar',props);
 const openOther=()=>all(tree,node=>node.type==='ChatRow'&&node.props.item.id==='b')[0].props.onShare();
 openOther();tree=component.render('Sidebar',props);
 let dialog=all(tree,node=>node.type==='ShareDialog')[0];
 assert.equal(dialog.props.taskId,'b');assert.equal(dialog.props.title,'Other task');assert.equal(dialog.props.opener.current.id,'menu-b');
 const first=dialog.key,obsolete=dialog;dialog.props.onClose();tree=component.render('Sidebar',props);
 assert.equal(all(tree,node=>node.type==='ShareDialog').length,0);
 openOther();tree=component.render('Sidebar',props);dialog=all(tree,node=>node.type==='ShareDialog')[0];assert.notEqual(dialog.key,first);
 obsolete.props.onClose();obsolete.props.onUnsupported();tree=component.render('Sidebar',props);assert.equal(all(tree,node=>node.type==='ShareDialog')[0].key,dialog.key);
 tree=component.render('Sidebar',{...props,scope:{...scope,key:'account-task-b',taskId:'b',epoch:2}});assert.equal(all(tree,node=>node.type==='ShareDialog').length,0);
 tree=component.render('Sidebar',{...props,scope:{...scope,epoch:3}});assert.equal(all(tree,node=>node.type==='ShareDialog').length,0);
 tree=component.render('Sidebar',{...props,scope:{...scope,key:'other-account-task-a',accountKey:'other-account',epoch:4}});assert.equal(all(tree,node=>node.type==='ShareDialog').length,0);
 for(const overrides of [{authConfigured:false},{workspaceReady:false},{desktopAvailable:true}]){
  tree=component.render('Sidebar',{...props,...overrides});
  assert.equal(all(tree,node=>node.type==='ChatRow')[0].props.onShare,undefined);
 }
});

test('project switcher filters loaded navigation only and scopes its selection to the account',()=>{
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const events=[];
  const projects=[{id:'p',title:'Clinic'},{id:'q',title:'Housing'}];
  const runs=[{id:'p-pin',title:'Clinic pinned',projectId:'p',pinned_at:'today',data:{}},
    {id:'p-chat',title:'Clinic chat',projectId:'p',data:{}},
    {id:'q-chat',title:'Housing chat',projectId:'q',data:{}},
    {id:'unknown',title:'Current unlisted task',projectId:'not-listed',data:{}},
    {id:'inbox-chat',title:'Inbox chat',projectId:'inbox',data:{}}];
  const props={scope:{key:'account-task',accountKey:'a',epoch:1,taskId:'unknown'},navigationRail:true,runs,projects,orderedProjects:projects,
    collapsedProjects:[],runId:'unknown',mediaBusy:false,actionBusy:false,dialogTrigger:{current:null},left:true,viewportReady:true,search:'',
    studioView:'workspace',historyView:'recent',desktopAvailable:false,workflowFilter:'',projectsSupported:true,chatMenuUnsupported:[],unreadIds:new Set(),
    authConfigured:false,workspaceReady:true,serviceError:'',defaultProject:{id:'inbox'},newTask:id=>events.push(['new',id]),selectRun:run=>events.push(['select',run.id])};
  let tree=component.render('Sidebar',props);
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='DATUMM workspace menu').length,0);
  assert.equal(all(tree,node=>typeof node.type==='function'&&node.type.name==='AccountFooter').length,0);
  assert.equal(all(tree,node=>node.type==='button'&&node.props.className==='sidebar-backdrop').length,0);
  const filter=id=>all(tree,node=>node.type==='MenuRadioGroup')[0].props.onValueChange(id);
  filter('p');tree=component.render('Sidebar',props);
  assert.deepEqual(all(tree,node=>node.type==='ChatRow').map(row=>row.props.item.id),['p-pin','p-chat']);
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='Filter projects: Clinic').length,1);
  assert.equal(all(tree,node=>node.type==='h2'&&node.props.children==='Chats').length,0);
  assert.deepEqual(events,[],'filtering keeps the open task and draft untouched');
  all(tree,node=>node.type==='button'&&node.props.className==='navRow')[0].props.onClick();
  assert.deepEqual(events,[['new','p']]);
  filter('');tree=component.render('Sidebar',props);
  assert.deepEqual(all(tree,node=>node.type==='ChatRow').map(row=>row.props.item.id),['p-pin','p-chat','q-chat','unknown','inbox-chat']);
  assert.equal(all(tree,node=>node.type==='ChatRow'&&node.props.item.id==='unknown')[0].props.selected,true);
  filter('q');tree=component.render('Sidebar',props);
  tree=component.render('Sidebar',{...props,scope:{...props.scope,accountKey:'b',epoch:2}});
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='Filter projects: All projects').length,1);
  tree=component.render('Sidebar',props);
  assert.equal(all(tree,node=>node.type==='button'&&node.props['aria-label']==='Filter projects: All projects').length,1,'A-B-A cannot restore an old account filter');
});

test('project switcher new-project waits for menu focus release and uses the existing creator',()=>{
  const component=loadComponent('../src/components/workspace/sidebar.tsx',{'@/lib/workflow-state':{workflowState:()=>({kind:'idle'})}});
  const events=[];
  const props={navigationRail:true,runs:[],projects:[],orderedProjects:[],collapsedProjects:[],runId:'',mediaBusy:false,actionBusy:false,
    dialogTrigger:{current:null},left:true,viewportReady:true,search:'',studioView:'workspace',historyView:'recent',desktopAvailable:false,
    workflowFilter:'',projectsSupported:true,chatMenuUnsupported:[],unreadIds:new Set(),authConfigured:false,workspaceReady:true,serviceError:''};
  let tree=component.render('Sidebar',props);
  const section=all(tree,node=>node.type==='section'&&node.props.id==='sidebar-projects')[0];
  section.props.ref.current={scrollIntoView:()=>events.push('scroll'),focus:()=>events.push('focus'),querySelector:()=>({click:()=>events.push('create')})};
  const content=all(tree,node=>node.type==='MenuContent'&&node.props.className.includes('projectSwitcherMenu'))[0];
  const item=all(content,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('New project'))[0];
  item.props.onSelect();assert.deepEqual(events,[]);
  content.props.onCloseAutoFocus({preventDefault(){events.push('release');}});
  assert.deepEqual(events,['release','scroll','focus','create']);
  assert.equal(all(tree,node=>node.type==='ProjectCreate').length,1);
  for(const overrides of [{workspaceReady:false},{chatMenuUnsupported:['projects']},{historyView:'archived'},{projectsSupported:false}]){
    tree=component.render('Sidebar',{...props,...overrides});
    assert.equal(all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('New project')).length,0);
  }
  tree=component.render('Sidebar',{...props,actionBusy:true});
  assert.equal(all(tree,node=>node.type==='MenuItem'&&JSON.stringify(node.props.children).includes('New project'))[0].props.disabled,true);
});
