// Minutes are explicit work credit, never elapsed calendar time.
export const PRICES = {Cheap:[9,1,'hour'],Everyday:[9,1,'hour'],Costly:[13,6,'hour'],Premium:[17,1,'day'],Expensive:[21,1,'week'],'Very Expensive':[24,2,'week'],Luxury:[29,1,'month'],'Super Luxury':[29,1,'month']};
const check = (ok, message) => { if (!ok) throw new Error(message); };
const text = (v, max=4000) => String(v ?? '').trim().slice(0,max);
export function workshopState(raw={}) { return structuredClone({schema:1,monthDays:30,projects:[],sessions:[],audit:[],processed:[],...raw}); }
export function minutes(value, unit, monthDays=30) {
  const n=Number(value)*({hour:60,day:1440,week:10080,month:1440*monthDays}[unit] ?? NaN);
  check(Number.isSafeInteger(n) && n>0, 'Enter positive work time, in whole minutes.'); return n;
}
export function defaultsFor(category, price, monthDays=30) {
  const row=PRICES[category]; check(row,'Choose a price category.');
  const multiplier=category==='Super Luxury'?Math.max(1,Math.ceil(Number(price)/10000)):1;
  check(Number.isFinite(multiplier),'Enter a valid item price.');
  return {dv:row[0],requiredMinutes:minutes(row[1]*multiplier,row[2],monthDays)};
}
export const currentAttempt = p => p.attempts.at(-1);
export function credited(s,p,a=currentAttempt(p)) { return s.sessions.filter(x=>!x.voided && x.credits.some(c=>c.projectId===p.id && c.attemptId===a.id)).reduce((n,x)=>n+x.minutes,0); }
export const capacity = ctx => ctx.access ? Math.min(3,1+Math.max(0,ctx.rank||0)) : 1;
export function applyWorkshop(raw,c,ctx,id,now=new Date().toISOString()) {
  const s=workshopState(raw); check(ctx.observer,'You need Observer access to this HQ.');
  check(typeof id==='string'&&id.length>0&&id.length<200,'Invalid request identifier.');
  if(s.processed.includes(id)) return s;
  let previous=c.projectId?structuredClone(s.projects.find(p=>p.id===c.projectId)??null):c.action==='settings'?{monthDays:s.monthDays}:null;
  const gm=()=>check(ctx.gm,'Only the GM can do this.');
  const reason=()=>{check(text(c.reason),'Enter a reason for this change.');return text(c.reason);};
  const tech=(uuid,kind)=>{const t=ctx.techs.find(t=>t.uuid===uuid);check(t && (ctx.gm||t.owned),'Choose a crew Tech you own.');check(t.expertise[kind]>0,'This Tech needs ranks in the corresponding Maker Expertise.');return t;};
  const project=()=>{const p=s.projects.find(p=>p.id===c.projectId);check(p,'Project no longer exists.');return p;};
  const attempt=(p)=>({id:id+'a'+(p.attempts.length+1),number:p.attempts.length+1,dv:p.dv,requiredMinutes:p.requiredMinutes,status:'active'});
  if(c.action==='settings') {gm();reason();check(Number.isInteger(c.monthDays)&&c.monthDays>=1&&c.monthDays<=365,'Month length must be 1–365 days.');s.monthDays=c.monthDays;}
  else if(c.action==='create'||c.action==='edit') {
    let p=c.action==='edit'?project():null;
    if(p) {if(!ctx.gm)tech(p.techUuid,p.kind);check(ctx.gm||(!p.approved && currentAttempt(p).status==='active'),'Only the GM can edit approved projects.');check(credited(s,p)===0 && currentAttempt(p).status==='active','Work has started: retain this attempt and use a new project for changed specifications.');}
    const kind=text(c.kind);check(['invention','fabrication','upgrade'].includes(kind),'Choose a project phase.');tech(c.techUuid,kind);
    const price=Number(c.price);check(Number.isFinite(price)&&price>=0,'Enter a non-negative item price.');
    const def=defaultsFor(c.category,price,s.monthDays);
    const dv=Number(c.dv||def.dv), requiredMinutes=Number(c.requiredMinutes||def.requiredMinutes);
    const override=dv!==def.dv||requiredMinutes!==def.requiredMinutes||(kind==='invention'&&Object.keys(PRICES).indexOf(c.category)<4);
    if(override) {gm();reason();}
    check(Number.isSafeInteger(dv)&&dv>0&&Number.isSafeInteger(requiredMinutes)&&requiredMinutes>0,'Enter a positive whole DV and work target.');
    const name=text(c.name,120);check(name,'Enter a project name.');
    if(c.parentId) {const parent=s.projects.find(x=>x.id===c.parentId);check(parent?.kind==='invention'&&currentAttempt(parent).status==='success'&&kind!=='invention','A prototype needs a successful invention blueprint.');}
    const components=(c.components??[]).map(x=>({name:text(x.name,120),cost:Number(x.cost)}));check(components.length<=50&&components.every(x=>x.name&&Number.isFinite(x.cost)&&x.cost>=0),'Enter valid component names and non-negative costs (up to 50).');
    const values={name,kind,techUuid:c.techUuid,category:c.category,price,dv,requiredMinutes,image:text(c.image,1000),rules:text(c.rules),features:text(c.features),skill:text(c.skill,120),components,parentId:c.parentId||'',approved:ctx.gm};
    check(values.skill,'Enter the relevant repair skill.');
    if(p) {if(ctx.gm)reason();Object.assign(p,values);Object.assign(currentAttempt(p),{dv,requiredMinutes});}
    else {p={id,attempts:[],...values};p.attempts.push(attempt(p));s.projects.push(p);}
  } else if(c.action==='approve') {gm();const p=project();tech(p.techUuid,p.kind);if(p.parentId)check(s.projects.some(x=>x.id===p.parentId&&currentAttempt(x).status==='success'),'Restore the source invention before approving its prototype.');p.approved=true;}
  else if(c.action==='session') {
    const ids=[c.primaryId,...(c.bonusIds??[])];check(new Set(ids).size===ids.length,'Select each project only once.');
    check(ids.length<=(c.inWorkshop?capacity(ctx):1),'Too many projects for the current Workshop rank/access.');
    if(c.inWorkshop)check(ctx.access,'HQ access is lost. Choose off-site work.');
    const n=minutes(c.quantity,c.unit,s.monthDays);const credits=ids.map((pid,i)=>{
      const p=s.projects.find(p=>p.id===pid);check(p,'Project no longer exists.');tech(p.techUuid,p.kind);
      check(p.techUuid===c.techUuid,'All projects in a session must belong to the selected Tech.');
      check(p.approved && currentAttempt(p).status==='active','Select approved, active projects.');
      check(n<=currentAttempt(p).requiredMinutes-credited(s,p),'Session exceeds remaining work. Split the session at the earliest project completion.');
      return {projectId:p.id,attemptId:currentAttempt(p).id,role:i?'bonus':'primary'};
    });
    check(text(c.date,120),'Enter an in-world date (a label, not a countdown).');
    s.sessions.push({id,techUuid:c.techUuid,minutes:n,quantity:Number(c.quantity),unit:c.unit,date:text(c.date,120),notes:text(c.notes),userId:ctx.userId,created:now,credits,inWorkshop:Boolean(c.inWorkshop),capacity: c.inWorkshop?capacity(ctx):1,voided:false});
  } else if(c.action==='resolve') {
    gm();const p=project(),a=currentAttempt(p);check(p.approved&&a.status==='active','This attempt is not awaiting an outcome.');
    const total=Number(c.total);check(Number.isFinite(total)&&text(c.total)!=='','Record the resolved Maker check total.');
    const success=total>a.dv;check(!c.override || ctx.gm,'GM override required.');if(c.override)reason();
    const outcome=c.override?c.outcome:(success?'success':'failed');check(['success','failed'].includes(outcome),'Choose an outcome.');
    check(credited(s,p)>=(outcome==='success'?a.requiredMinutes:Math.ceil(a.requiredMinutes/2)),'Record the required work first (full time for success, half time for failure).');
    Object.assign(a,{status:outcome,total,resolved:now,notes:text(c.reason),lostMinutes:outcome==='failed'?credited(s,p):0});
  } else if(c.action==='retry') {const p=project();tech(p.techUuid,p.kind);check(currentAttempt(p).status==='failed','Only failed attempts can be retried.');p.attempts.push(attempt(p));}
  else if(c.action==='reopen') {gm();reason();const p=project();check(!s.projects.some(x=>x.parentId===p.id),'Linked prototypes exist; keep their source blueprint intact.');check(currentAttempt(p).status!=='active','Attempt is already active.');currentAttempt(p).status='active';}
  else if(c.action==='void') {gm();reason();const session=s.sessions.find(x=>x.id===c.sessionId);check(session&&!session.voided,'Session is missing or already voided.');check(session.credits.every(x=>s.projects.find(p=>p.id===x.projectId)?.attempts.find(a=>a.id===x.attemptId)?.status==='active'),'Reopen affected resolved attempts before correcting their work.');session.voided=true;session.voidReason=text(c.reason);}
  else if(c.action==='link-item') {
    const p=project();check(p.kind!=='invention','Item slots belong to prototypes / fabrication and upgrade projects.');
    if(!ctx.gm)tech(p.techUuid,p.kind);
    check(!c.itemUuid||(ctx.item?.uuid===c.itemUuid&&ctx.item.allowed),'Drop an Item you can view.');
    p.itemUuid=c.itemUuid||'';
  }
  else if(c.action==='delete-project') {
    gm();reason();const p=project();
    previous={project:structuredClone(p),sessions:structuredClone(s.sessions.filter(x=>x.credits.some(c=>c.projectId===p.id))),children:structuredClone(s.projects.filter(x=>x.parentId===p.id))};
    s.projects=s.projects.filter(x=>x.id!==p.id);
    for(const x of s.sessions) {const removed=x.credits.filter(c=>c.projectId===p.id);if(removed.length){x.deletedProjects=[...(x.deletedProjects??[]),{id:p.id,name:p.name}];x.credits=x.credits.filter(c=>c.projectId!==p.id);}}
    for(const child of s.projects.filter(x=>x.parentId===p.id)){child.sourceBlueprint=p.name;child.parentId='';}
  }
  else if(c.action==='delete-session') {
    gm();reason();const session=s.sessions.find(x=>x.id===c.sessionId);check(session,'Work session no longer exists.');
    previous={session:structuredClone(session),projects:[]};
    if(!session.voided) for(const credit of session.credits) {
      const p=s.projects.find(x=>x.id===credit.projectId),a=p?.attempts.find(x=>x.id===credit.attemptId);if(!a)continue;
      previous.projects.push(structuredClone(p));
      // Historic failed attempts stay failed. Only the latest resolved attempt is reopened.
      if(a===currentAttempt(p)&&a.status!=='active') {
        a.status='active';delete a.resolved;delete a.total;delete a.lostMinutes;
        for(const child of s.projects.filter(x=>x.parentId===p.id)) {
          previous.projects.push(structuredClone(child));child.approved=false;
          const ca=currentAttempt(child);ca.status='active';delete ca.resolved;delete ca.total;delete ca.lostMinutes;
        }
      } else if(a.status==='failed') a.lostMinutes=Math.max(0,(a.lostMinutes??credited(s,p,a))-session.minutes);
    }
    s.sessions=s.sessions.filter(x=>x.id!==session.id);
  }
  else throw new Error('Unknown Workshop action.');
  // The complete command preserves old outcomes/specifications in the audit history.
  s.audit.push({id,date:now,userId:ctx.userId,action:c.action,command:structuredClone(c),before:previous});
  s.processed.push(id);return s;
}
