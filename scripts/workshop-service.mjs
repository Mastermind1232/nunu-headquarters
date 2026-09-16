import {ID,state} from './rules.mjs';
import {resolveLink} from './hq-assets.mjs';
import {roleTable} from './character-benefits.mjs';
import {applyWorkshop} from './workshop-rules.mjs';
const queues=new Map();
export const activeGM=()=>Array.from(game.users??[]).filter(u=>u.isGM&&u.active).sort((a,b)=>a.id.localeCompare(b.id))[0];
export async function workshopContext(hq,user=game.user) {
  const s=state(hq.getFlag(ID,'hq')),techs=[];
  for(const uuid of new Set(s.crewSlots.filter(x=>x&&x!==s.garageUuid))) {
    const actor=await resolveLink(uuid);if(actor?.type!=='character')continue;
    const roles=Array.from(actor.items.values()).filter(x=>x.type==='role'&&(roleTable(x)==='tech'||x.system.mainRoleAbility==='Maker')&&Number(x.system.rank)>0);
    if(!roles.length)continue;
    const expertise={upgrade:0,fabrication:0,invention:0};
    for(const role of roles) for(const [kind,index] of [['upgrade',1],['fabrication',2],['invention',3]]) {
      const abilities=role.system.abilities??[];
      const ability=abilities.find(x=>String(x.name).toLowerCase()===`${kind} expertise`)??abilities[index];
      expertise[kind]=Math.max(expertise[kind],Number(ability?.rank)||0);
    }
    techs.push({uuid,name:actor.name,owned:actor.testUserPermission(user,'OWNER'),expertise});
  }
  const latest=state(hq.getFlag(ID,'hq'));
  return {gm:user.isGM,userId:user.id,observer:user.isGM||Boolean(hq.testUserPermission?.(user,'OBSERVER')),techs:techs.filter(t=>latest.crewSlots.includes(t.uuid)&&t.uuid!==latest.garageUuid),access:latest.access,rank:latest.improvements.workshop};
}
export function executeWorkshop(hq,c,user,id) {
  const key=hq.uuid;
  const job=(queues.get(key)??Promise.resolve()).catch(()=>{}).then(async()=>{
    if(activeGM()?.id!==game.user.id)throw new Error('The active GM changed. Ask the current GM to check this request.');
    if(!hq.getFlag(ID,'hq'))throw new Error('This journal is not an HQ.');
    if(JSON.stringify(c).length>50000)throw new Error('Workshop request is too large.');
    const context=await workshopContext(hq,user);
    if(c.action==='link-item'&&c.itemUuid) {
      const item=await resolveLink(c.itemUuid);
      context.item={uuid:item?.uuid,allowed:item?.documentName==='Item'&&Boolean(item.testUserPermission(user,'OBSERVER'))};
    }
    const next=applyWorkshop(hq.getFlag(ID,'workshop')??{},c,context,id);
    if(activeGM()?.id!==game.user.id)throw new Error('The active GM changed before saving. Check the request with the current GM.');
    await hq.setFlag(ID,'workshop',next);
  });queues.set(key,job);return job;
}
export async function submitWorkshop(hq,command) {
  const gm=activeGM();if(!gm)throw new Error('An active GM is needed to save Workshop changes.');
  const requestId=foundry.utils.randomID();
  if(game.user.id===gm.id)return executeWorkshop(hq,command,game.user,`${game.user.id}:${requestId}`);
  await ChatMessage.create({content:'Workshop request submitted. The active GM will validate it and update this receipt.',whisper:[game.user.id,gm.id],flags:{[ID]:{workshopRequest:{hqUuid:hq.uuid,command,requestId}}}});
  ui.notifications.info('Workshop request sent. Check its chat receipt before submitting again.');
}
export function installWorkshopHooks() {
  Hooks.on('createChatMessage',async(message,options,userId)=>{
    const r=message.getFlag(ID,'workshopRequest');if(!r||activeGM()?.id!==game.user.id)return;
    const author=message.author??message.user;
    if(!author||author.id!==userId)return;
    let result;
    try {const hq=await fromUuid(r.hqUuid);if(!hq)throw new Error('HQ is missing.');await executeWorkshop(hq,r.command,author,`${author.id}:${r.requestId}`);result='Workshop request saved.';}
    catch(e){result=`Workshop request failed: ${e.message}`;}
    // Plain text only: request fields never become trusted chat HTML.
    await message.update({content:result.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
  });
}
