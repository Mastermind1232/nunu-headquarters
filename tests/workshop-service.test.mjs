import test from 'node:test';
import assert from 'node:assert/strict';
import {ID,state} from '../scripts/rules.mjs';
import {workshopContext,executeWorkshop,installWorkshopHooks} from '../scripts/workshop-service.mjs';
const gm={id:'gm',isGM:true,active:true},owner={id:'owner',isGM:false,active:true},outsider={id:'outsider',isGM:false};
let documents,doc,failWrite=false;
function fixture(){
 globalThis.game={user:gm,users:[gm,owner,outsider]};failWrite=false;
 const tech={uuid:'Actor.tech',name:'Tech',type:'character',testUserPermission:u=>u.id==='owner'||u.isGM,items:new Map([['role',{type:'role',name:'Tech',system:{rank:4,mainRoleAbility:'Maker',abilities:[{rank:0},{rank:1},{rank:2},{rank:3}]}}]])};
 const vehicle={...tech,uuid:'Actor.vehicle',type:'vehicle'};
 doc={uuid:'JournalEntry.hq',hq:state({crewSlots:[tech.uuid,vehicle.uuid,tech.uuid],garageUuid:vehicle.uuid}),workshop:undefined,testUserPermission:u=>u.id!=='outsider',getFlag(ns,key){return this[key];},async setFlag(ns,key,value){if(failWrite)throw new Error('Write failed');await new Promise(r=>setTimeout(r,5));this[key]=value;}};
 documents=new Map([[doc.uuid,doc],[tech.uuid,tech],[vehicle.uuid,vehicle]]);globalThis.fromUuid=async id=>documents.get(id);
 return {tech,vehicle};
}
const create={action:'create',name:'Test',techUuid:'Actor.tech',kind:'invention',category:'Expensive',price:500,skill:'Basic Tech'};
test('context resolves linked crew only, excludes garage, identifies real Maker ranks',async()=>{
 const {tech}=fixture();const ctx=await workshopContext(doc,owner);assert.equal(ctx.techs.length,1);assert.deepEqual(ctx.techs[0].expertise,{upgrade:1,fabrication:2,invention:3});assert.equal(ctx.techs[0].owned,true);
 assert.equal((await workshopContext(doc,outsider)).observer,false);tech.items.get('role').system.rank=0;assert.equal((await workshopContext(doc)).techs.length,0);
});
test('queued saves preserve concurrent projects and leave the existing HQ flag unchanged',async()=>{
 fixture();const before=structuredClone(doc.hq);await Promise.all([executeWorkshop(doc,create,owner,'a'),executeWorkshop(doc,{...create,name:'Second'},owner,'b')]);
 assert.equal(doc.workshop.projects.length,2);assert.deepEqual(doc.hq,before);assert.equal(doc.workshop.projects[0].approved,false);
 await executeWorkshop(doc,create,owner,'a');assert.equal(doc.workshop.projects.length,2);
});
test('write failure does not commit progress, retry can succeed; permissions and GM authority rechecked',async()=>{
 fixture();failWrite=true;await assert.rejects(executeWorkshop(doc,create,owner,'a'),/Write failed/);assert.equal(doc.workshop,undefined);
 failWrite=false;await executeWorkshop(doc,create,owner,'a');assert.equal(doc.workshop.projects.length,1);
 await assert.rejects(executeWorkshop(doc,create,outsider,'b'),/Observer/);game.user=owner;await assert.rejects(executeWorkshop(doc,create,owner,'c'),/active GM changed/);
});
test('request hook trusts server author, rejects impersonation and writes success/failure receipts',async()=>{
 fixture();const hooks={};globalThis.Hooks={on:(n,f)=>hooks[n]=f};installWorkshopHooks();let receipt;
 const msg={author:owner,getFlag:()=>({hqUuid:doc.uuid,command:create,requestId:'request'}),update:async x=>receipt=x.content};
 await hooks.createChatMessage(msg,{},'outsider');assert.equal(doc.workshop,undefined);
 await hooks.createChatMessage(msg,{},'owner');assert.equal(receipt,'Workshop request saved.');assert.equal(doc.workshop.projects.length,1);
 await hooks.createChatMessage(msg,{},'owner');assert.equal(doc.workshop.projects.length,1);
 msg.author=outsider;await hooks.createChatMessage(msg,{},'outsider');assert.match(receipt,/failed.*Observer/);
});
test('item links are validated on the GM against document type and requester access',async()=>{
 const {tech}=fixture();await executeWorkshop(doc,{...create,kind:'fabrication'},owner,'project');
 const item={uuid:'Actor.tech.Item.tool',name:'Tool',documentName:'Item',testUserPermission:u=>u.id==='owner'};documents.set(item.uuid,item);
 const command={action:'link-item',projectId:'project',itemUuid:item.uuid};
 await executeWorkshop(doc,command,owner,'link');assert.equal(doc.workshop.projects[0].itemUuid,item.uuid);
 await assert.rejects(executeWorkshop(doc,{...command,itemUuid:tech.uuid},owner,'actor'),/Item you can view/);
 item.testUserPermission=()=>false;await assert.rejects(executeWorkshop(doc,command,owner,'restricted'),/Item you can view/);
 documents.delete(item.uuid);await assert.rejects(executeWorkshop(doc,command,owner,'missing'),/Item you can view/);
 await executeWorkshop(doc,{...command,itemUuid:''},owner,'clear');assert.equal(doc.workshop.projects[0].itemUuid,'');
});
