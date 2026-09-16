import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWorkshop,workshopState,credited,currentAttempt,defaultsFor,minutes} from '../scripts/workshop-rules.mjs';
const gm={gm:true,observer:true,userId:'gm',access:true,rank:2,techs:[{uuid:'tech',owned:true,expertise:{invention:4,fabrication:3,upgrade:2}}]};
const player={...gm,gm:false,userId:'player'};
const create=(name='Blueprint',extra={})=>({action:'create',name,techUuid:'tech',kind:'invention',category:'Very Expensive',price:1000,skill:'Basic Tech',components:[{name:'Parts',cost:100}],...extra});
const work=(quantity,date,extra={})=>({action:'session',techUuid:'tech',primaryId:'p',bonusIds:[],quantity,unit:'day',date,inWorkshop:true,...extra});
const apply=(s,c,id,ctx=gm)=>applyWorkshop(s,c,ctx,id,'2026-09-11T12:00:00Z');
test('14 work days accumulate across arbitrary calendar gaps; completion is not a blueprint until check',()=>{
 let s=apply({},create(),'p');s=apply(s,work(7,'Jan 1'),'s1');s=apply(s,work(5,'Jan 20'),'s2');s=apply(s,work(2,'March 5'),'s3');
 assert.equal(credited(s,s.projects[0]),minutes(14,'day'));assert.equal(currentAttempt(s.projects[0]).status,'active');
 s=apply(s,{action:'resolve',projectId:'p',total:25},'roll');assert.equal(currentAttempt(s.projects[0]).status,'success');
 s=apply(s,create('Prototype',{kind:'fabrication',parentId:'p'}),'proto');assert.equal(credited(s,s.projects[1]),0);
 assert.deepEqual(workshopState(JSON.parse(JSON.stringify(s))).sessions,s.sessions);
});
test('pending invention cannot start work or spawn prototype',()=>{
 const s=apply({},create(),'p',player);assert.equal(s.projects[0].approved,false);
 assert.throws(()=>apply(s,work(1,'Day 1'),'s'),/approved/);
 assert.throws(()=>apply(s,create('Prototype',{kind:'fabrication',parentId:'p'}),'proto'),/successful invention/);
 assert.throws(()=>apply(s,{action:'approve',projectId:'p'},'approval',player),/Only the GM/);
});
test('normal Workshop credits two total, upgraded credits three equally; repeated request is idempotent',()=>{
 let s=apply({},create(),'p');s=apply(s,create('B'),'b');s=apply(s,create('C'),'c');
 assert.throws(()=>apply(s,work(1,'Day 1',{bonusIds:['b','c']}),'s',{...gm,rank:1}),/Too many/);
 s=apply(s,work(1,'Day 1',{bonusIds:['b','c']}),'s');assert.deepEqual(s.projects.map(p=>credited(s,p)),[1440,1440,1440]);
 assert.deepEqual(apply(s,work(1,'Day 1',{bonusIds:['b','c']}),'s'),s);
 assert.throws(()=>apply(s,work(1,'Day 1',{bonusIds:['p']}),'duplicate'),/only once/);
 assert.throws(()=>apply(s,work(1,'Day 1',{bonusIds:['b'],inWorkshop:false}),'offsite'),/Too many/);
 assert.throws(()=>apply(s,work(1,'Day 1'),'lost',{...gm,access:false}),/access is lost/);
 assert.throws(()=>apply(s,work(14,'Day 1'),'excess'),/remaining work/);
});
test('crew ownership and real specialty ranks are required',()=>{
 assert.throws(()=>apply({},create(),'p',{...player,techs:[]}),/crew Tech/);
 assert.throws(()=>apply({},create(),'p',{...player,techs:[{...gm.techs[0],owned:false}]}),/crew Tech/);
 assert.throws(()=>apply({},create(),'p',{...gm,techs:[{...gm.techs[0],expertise:{invention:0}}]}),/Expertise/);
 assert.throws(()=>apply({},create(),'p',{...gm,observer:false}),/Observer/);
});
test('failure consumes recorded half-time; retries start fresh and preserve failed work',()=>{
 let s=apply({},create(),'p');s=apply(s,work(7,'Day 7'),'s');s=apply(s,{action:'resolve',projectId:'p',total:24},'fail');
 assert.equal(currentAttempt(s.projects[0]).status,'failed');assert.equal(currentAttempt(s.projects[0]).lostMinutes,10080);
 s=apply(s,{action:'retry',projectId:'p'},'retry',player);assert.equal(credited(s,s.projects[0]),0);assert.equal(s.projects[0].attempts[0].status,'failed');
 assert.throws(()=>apply(s,{action:'resolve',projectId:'p',total:30},'early'),/required work/);
 assert.throws(()=>apply(s,{action:'resolve',projectId:'p',total:30},'player',player),/Only the GM/);
});
test('GM corrections retain ledger and require reopening resolved attempts',()=>{
 let s=apply({},create(),'p');s=apply(s,work(7,'Day 7'),'s');
 assert.throws(()=>apply(s,{action:'void',sessionId:'s'},'v'),/reason/);
 assert.throws(()=>apply(s,{action:'void',sessionId:'s',reason:'Wrong date'},'v',player),/Only the GM/);
 s=apply(s,{action:'resolve',projectId:'p',total:1},'f');
 assert.throws(()=>apply(s,{action:'void',sessionId:'s',reason:'Correction'},'v'),/Reopen/);
 s=apply(s,{action:'reopen',projectId:'p',reason:'Wrong roll'},'r');s=apply(s,{action:'void',sessionId:'s',reason:'Wrong duration'},'v');
 assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].voided,true);assert.equal(credited(s,s.projects[0]),0);assert.equal(s.audit.find(x=>x.id==='r').before.attempts[0].status,'failed');
});
test('price defaults, invention minimum and GM overrides; month edits do not rewrite targets',()=>{
 assert.deepEqual(defaultsFor('Costly',50),{dv:13,requiredMinutes:360});assert.equal(defaultsFor('Super Luxury',25000).requiredMinutes,129600);
 assert.throws(()=>apply({},create('Cheap invention',{category:'Cheap'}),'p',player),/Only the GM/);
 assert.throws(()=>apply({},create('Override',{dv:10}),'p'),/reason/);
 let s=apply({},create('Monthly',{category:'Luxury'}),'p');s=apply(s,{action:'settings',monthDays:20,reason:'Calendar'},'settings');
 assert.equal(currentAttempt(s.projects[0]).requiredMinutes,43200);s=apply(s,create('New month',{category:'Luxury'}),'new');assert.equal(currentAttempt(s.projects[1]).requiredMinutes,28800);
});
test('all credits are validated before mutation; cross-Tech banking is rejected',()=>{
 let s=apply({},create(),'p');const ctx={...gm,techs:[...gm.techs,{...gm.techs[0],uuid:'other'}]};s=apply(s,create('Other',{techUuid:'other'}),'other',ctx);const before=JSON.stringify(s);
 assert.throws(()=>apply(s,work(1,'Day 1',{bonusIds:['other']}),'s',ctx),/same|selected Tech/);assert.equal(JSON.stringify(s),before);
});
test('a player cannot take over another Tech proposal by editing its assigned character',()=>{
 const ctx={...player,techs:[...player.techs,{...player.techs[0],uuid:'other',owned:true}]};
 const s=apply({},create('Other proposal',{techUuid:'other'}),'other',ctx);
 const attacker={...player,techs:[...player.techs,{...player.techs[0],uuid:'other',owned:false}]};
 assert.throws(()=>apply(s,{...create('Stolen'),action:'edit',projectId:'other'},'steal',attacker),/crew Tech/);
});
test('linked source blueprints cannot be reopened and snapshots preserve GM specifications',()=>{
 let s=apply({},create(),'p');s=apply(s,{...create('Revised'),action:'edit',projectId:'p',reason:'GM balance',dv:23},'edit');
 assert.equal(s.audit.at(-1).before.dv,24);s=apply(s,work(14,'Done'),'s');s=apply(s,{action:'resolve',projectId:'p',total:24},'success');
 s=apply(s,create('Prototype',{kind:'fabrication',parentId:'p'}),'prototype');
 assert.throws(()=>apply(s,{action:'reopen',projectId:'p',reason:'Correction'},'reopen'),/Linked prototypes/);
});
test('GM project deletion preserves other project credit and a named source for prototypes',()=>{
 let s=apply({},create(),'p');s=apply(s,create('Other'),'other');s=apply(s,work(14,'Done',{bonusIds:['other']}),'work');s=apply(s,{action:'resolve',projectId:'p',total:25},'success');
 s=apply(s,create('Prototype',{kind:'fabrication',parentId:'p'}),'prototype');
 const command={action:'delete-project',projectId:'p',reason:'Remove old blueprint'};
 assert.throws(()=>apply(s,command,'delete',player),/Only the GM/);
 assert.throws(()=>apply(s,{...command,reason:''},'delete'),/reason/);
 const result=apply(s,command,'delete');assert.equal(result.projects.length,2);assert.equal(credited(result,result.projects[0]),20160);
 assert.equal(result.projects[1].parentId,'');assert.equal(result.projects[1].sourceBlueprint,'Blueprint');
 assert.equal(result.sessions[0].credits.length,1);assert.equal(result.sessions[0].deletedProjects[0].name,'Blueprint');
 assert.equal(result.audit.at(-1).before.project.id,'p');assert.equal(s.projects.length,3);
 assert.deepEqual(apply(result,command,'delete'),result);
});
test('deleting a shared session subtracts equal work and reopens resolved attempts and dependent prototypes',()=>{
 let s=apply({},create(),'p');s=apply(s,create('Other'),'other');s=apply(s,work(14,'Done',{bonusIds:['other']}),'work');s=apply(s,{action:'resolve',projectId:'p',total:25},'success');
 s=apply(s,create('Prototype',{kind:'fabrication',parentId:'p'}),'prototype');
 const command={action:'delete-session',sessionId:'work',reason:'Accidental work entry'};
 assert.throws(()=>apply(s,command,'delete',player),/Only the GM/);
 s=apply(s,command,'delete');assert.equal(s.sessions.length,0);assert.equal(credited(s,s.projects[0]),0);assert.equal(credited(s,s.projects[1]),0);
 assert.equal(currentAttempt(s.projects[0]).status,'active');assert.equal(s.projects[2].approved,false);
 assert.equal(s.audit.at(-1).before.session.minutes,20160);
 assert.throws(()=>apply(s,{action:'approve',projectId:'prototype'},'approval'),/Restore the source/);
});
test('deleting an already voided session leaves outcomes unchanged',()=>{
 let s=apply({},create(),'p');s=apply(s,work(1,'Wrong'),'wrong');s=apply(s,{action:'void',sessionId:'wrong',reason:'Mistake'},'void');
 s=apply(s,work(14,'Actual'),'actual');s=apply(s,{action:'resolve',projectId:'p',total:25},'success');
 s=apply(s,{action:'delete-session',sessionId:'wrong',reason:'Cleanup'},'delete');assert.equal(currentAttempt(s.projects[0]).status,'success');assert.equal(credited(s,s.projects[0]),20160);
});
test('prototype item links require an authorized owner and a verified Item; clear preserves the project',()=>{
 let s=apply({},create('Prototype',{kind:'fabrication'}),'p');const command={action:'link-item',projectId:'p',itemUuid:'Actor.tech.Item.tool'};
 assert.throws(()=>apply(s,command,'link',player),/Item you can view/);
 const ctx={...player,item:{uuid:command.itemUuid,allowed:true}};
 s=apply(s,command,'link',ctx);assert.equal(s.projects[0].itemUuid,command.itemUuid);
 assert.throws(()=>apply(s,{...command,itemUuid:'Item.other'},'bad',ctx),/Item you can view/);
 assert.throws(()=>apply(s,command,'not-owned',{...ctx,techs:[]}),/crew Tech/);
 s=apply(s,{...command,itemUuid:''},'clear',player);assert.equal(s.projects[0].itemUuid,'');assert.equal(s.projects.length,1);
 const invention=apply({},create(),'p');assert.throws(()=>apply(invention,command,'link',{...gm,item:ctx.item}),/slots belong/);
});
