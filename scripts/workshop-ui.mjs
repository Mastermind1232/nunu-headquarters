import {ID} from './rules.mjs';
import {escapeHTML as e} from './custom-improvements.mjs';
import {PRICES,workshopState,currentAttempt,credited,capacity,minutes,defaultsFor} from './workshop-rules.mjs';
import {workshopContext,submitWorkshop} from './workshop-service.mjs';
import {resolveLink,openLink} from './hq-assets.mjs';
const duration=n=>`${Number((n/1440).toFixed(3))} days (${n/60} hours)`;
const field=(label,name,value='',type='text')=>`<label>${e(label)}<input name="${name}" type="${type}" ${type==='number'?'step="any"':''} value="${e(String(value))}"></label>`;
const area=(label,name,value='')=>`<label>${e(label)}<textarea name="${name}" rows="3">${e(value)}</textarea></label>`;
const options=(items,value)=>items.map(([id,name])=>`<option value="${e(id)}" ${id===value?'selected':''}>${e(name)}</option>`).join('');
const select=(label,name,items,value)=>`<label>${label}<select name="${name}">${options(items,value)}</select></label>`;
function prompt(title,content,read,render) {return new Promise(resolve=>new Dialog({title,content:`<form class="nplh-workshop-dialog">${content}</form>`,buttons:{save:{label:'Save',callback:html=>{try{resolve(read(html));}catch(err){ui.notifications.error(err.message);resolve(null);}}},cancel:{label:'Cancel',callback:()=>resolve(null)}},default:'save',close:()=>resolve(null),render},{width:600}).render(true));}
const val=(html,key)=>html.find(`[name="${key}"]`).val();
export async function workshopView(hq) {
  const s=workshopState(hq.getFlag(ID,'workshop')??{}),ctx=await workshopContext(hq);
  const view={gm:ctx.gm,hasTech:ctx.techs.length>0,capacity:capacity(ctx),monthDays:s.monthDays,canWork:ctx.gm||ctx.techs.some(t=>t.owned),
    projects:s.projects.map(p=>{const a=currentAttempt(p),done=credited(s,p),owned=ctx.gm||ctx.techs.some(t=>t.uuid===p.techUuid&&t.owned);
      return {...p,gm:ctx.gm,isPrototype:p.kind!=='invention',canLinkItem:owned&&p.kind!=='invention',tech:ctx.techs.find(t=>t.uuid===p.techUuid)?.name??'Former / missing crew Tech',status:a.status,dv:a.dv,target:duration(a.requiredMinutes),done:duration(done),percent:Math.min(100,Math.floor(done/a.requiredMinutes*100)),totalCost:p.components.reduce((n,c)=>n+c.cost,0),canEdit:ctx.gm||owned&&!p.approved,canRetry:owned&&a.status==='failed',canPrototype:owned&&p.kind==='invention'&&a.status==='success',canResolve:ctx.gm&&p.approved&&a.status==='active',canReopen:ctx.gm&&a.status!=='active',attempts:p.attempts.map(a=>({...a,work:duration(credited(s,p,a)),target:duration(a.requiredMinutes)}))};}),
    sessions:[...s.sessions].reverse().map(x=>({...x,time:duration(x.minutes),projects:[...x.credits.map(c=>`${s.projects.find(p=>p.id===c.projectId)?.name??'Missing'} (${c.role})`),...(x.deletedProjects??[]).map(p=>`${p.name} (deleted project)`)].join(', ')})),
    audit:[...s.audit].reverse().map(x=>({...x,reason:x.command?.reason??''}))};
  for(const p of view.projects.filter(p=>p.isPrototype&&p.itemUuid)) {
    const item=await resolveLink(p.itemUuid),allowed=item?.documentName==='Item'&&item.testUserPermission(game.user,'OBSERVER');
    p.linkedItem=allowed?{uuid:item.uuid,name:item.name,image:item.img||'icons/svg/item-bag.svg',available:true}:{name:item?'Restricted item':'Missing item',available:false};
  }
  view.folders=[{id:'inventions',name:'Inventions',projects:view.projects.filter(p=>!p.isPrototype)},{id:'prototypes',name:'Prototypes',projects:view.projects.filter(p=>p.isPrototype)}];
  return view;
}
async function projectDialog(hq,p,prototype=false) {
  const s=workshopState(hq.getFlag(ID,'workshop')??{}),ctx=await workshopContext(hq),choices=ctx.techs.filter(t=>ctx.gm||t.owned).map(t=>[t.uuid,t.name]);
  if(!choices.length)throw new Error('Add a Tech character you own to the HQ crew first.');
  const data=await prompt(prototype?'Create linked prototype':p?'Edit blueprint':'Propose Workshop project',
    field('Project / item name','name',prototype?`${p.name} — prototype`:p?.name)+select('Crew Tech','techUuid',choices,p?.techUuid)+
    select('Phase','kind',['invention','fabrication','upgrade'].map(x=>[x,x]),prototype?'fabrication':p?.kind??'invention')+
    select('Price category','category',Object.keys(PRICES).map(x=>[x,x]),p?.category??'Expensive')+field('Item price (eb)','price',p?.price??500,'number')+
    field('Relevant repair skill','skill',p?.skill??'Basic Tech')+field('Blueprint image path / URL','image',p?.image)+
    area('Components / materials — one per line: name | cost in eb','components',p?.components.map(c=>`${c.name} | ${c.cost}`).join('\n'))+
    area('Functions, rules and notes','rules',p?.rules)+area('Special features / bonuses','features',p?.features)+
    (ctx.gm?field('Override DV (blank = category default)','dv',!prototype?p?.dv:'','number')+field('Override required work in hours (blank = default)','hours',!prototype&&p?p.requiredMinutes/60:'','number')+field('Reason (required for overrides / editing)','reason'):'<p>GM approval is required before work can begin.</p>')+
    '<p class="workshop-estimate"></p><p>Invention normally starts at Expensive. Targets use 24 hours/day, 7 days/week and the configured month length. Material costs are recorded here; no money is automatically spent.</p>',html=>{
      const c=Object.fromEntries(['name','techUuid','kind','category','price','skill','image','rules','features','reason','dv'].map(k=>[k,val(html,k)]));
      c.components=String(val(html,'components')||'').split('\n').filter(x=>x.trim()).map(line=>{const i=line.lastIndexOf('|');if(i<0)throw new Error('Each component needs name | cost.');return {name:line.slice(0,i),cost:Number(line.slice(i+1))};});
      if(val(html,'hours'))c.requiredMinutes=minutes(val(html,'hours'),'hour');
      return {...c,action:p&&!prototype?'edit':'create',projectId:p?.id,parentId:prototype?p.id:p?.parentId??''};
    },html=>{
      const estimate=()=>{try {const d=defaultsFor(val(html,'category'),val(html,'price'),s.monthDays);html.find('.workshop-estimate').text(`Category default: DV ${d.dv}; ${duration(d.requiredMinutes)}. GM overrides take precedence.`);}catch{html.find('.workshop-estimate').text('Enter a valid category and price.');}};
      html.find('[name="category"]').on('change',()=>{const prices={Cheap:10,Everyday:20,Costly:50,Premium:100,Expensive:500,'Very Expensive':1000,Luxury:5000,'Super Luxury':10000};html.find('[name="price"]').val(prices[val(html,'category')]);estimate();});
      html.find('[name="price"]').on('input',estimate);estimate();
    });if(data)await submitWorkshop(hq,data);
}
async function sessionDialog(hq) {
  const s=workshopState(hq.getFlag(ID,'workshop')??{}),ctx=await workshopContext(hq),techs=ctx.techs.filter(t=>ctx.gm||t.owned);
  if(!techs.length)throw new Error('No owned crew Tech is available.');
  const data=await prompt('Record actual work session',select('Crew Tech','techUuid',techs.map(t=>[t.uuid,t.name]))+
    '<label><input type="checkbox" name="inWorkshop" checked> Work inside this HQ Workshop</label>'+
    `<p>HQ capacity: ${capacity(ctx)} total projects. Off-site work: one. Every selected project receives exactly the same time.</p>`+
    '<label>Primary project<select name="primaryId"></select></label><div class="workshop-bonus"></div>'+
    field('Time actually worked','quantity',1,'number')+select('Time unit','unit',['hour','day','week','month'].map(x=>[x,x]),'day')+
    field('In-world date / session label','date')+area('Work notes','notes'),html=>({action:'session',techUuid:val(html,'techUuid'),primaryId:val(html,'primaryId'),bonusIds:html.find('[name="bonus"]:checked').map((i,x)=>x.value).get(),quantity:val(html,'quantity'),unit:val(html,'unit'),date:val(html,'date'),notes:val(html,'notes'),inWorkshop:html.find('[name="inWorkshop"]').prop('checked')}),html=>{
      const refresh=()=>{const selected=techs.find(t=>t.uuid===val(html,'techUuid'));const projects=s.projects.filter(p=>p.techUuid===selected?.uuid&&selected.expertise[p.kind]>0&&p.approved&&currentAttempt(p).status==='active'&&credited(s,p)<currentAttempt(p).requiredMinutes);
        html.find('[name="primaryId"]').html(options(projects.map(p=>[p.id,`${p.name} — ${duration(currentAttempt(p).requiredMinutes-credited(s,p))} left`])));
        html.find('.workshop-bonus').html('<p>Optional bonus projects</p>'+projects.map(p=>`<label><input type="checkbox" name="bonus" value="${e(p.id)}"> ${e(p.name)}</label>`).join(''));sync();};
      const sync=()=>{const primary=val(html,'primaryId'),allowed=html.find('[name="inWorkshop"]').prop('checked')?capacity(ctx)-1:0;let selected=0;html.find('[name="bonus"]').each((i,x)=>{if(x.value===primary||!allowed)x.checked=false;if(x.checked&&++selected>allowed)x.checked=false;});const full=html.find('[name="bonus"]:checked').length>=allowed;html.find('[name="bonus"]').each((i,x)=>{x.disabled=x.value===primary||(!x.checked&&full);});};
      html.find('[name="techUuid"]').on('change',refresh);html.find('[name="primaryId"],[name="inWorkshop"]').on('change',sync);html.find('.workshop-bonus').on('change','[name="bonus"]',sync);refresh();
    });if(data)await submitWorkshop(hq,data);
}
export function bindWorkshop(sheet,html) {
  sheet._workshopFolders??={};
  html.find('[data-workshop-folder]').each((i,x)=>{x.open=sheet._workshopFolders[x.dataset.workshopFolder]??true;}).on('toggle',event=>{sheet._workshopFolders[event.currentTarget.dataset.workshopFolder]=event.currentTarget.open;});
  html.find('[data-workshop-drop]').on('dragover',event=>event.preventDefault()).on('drop',async event=>{
    event.preventDefault();event.stopPropagation();if(sheet._workshopBusy)return;sheet._workshopBusy=true;
    try {const data=TextEditor.getDragEventData(event.originalEvent??event);if(data.type!=='Item'||!data.uuid)throw new Error('Drag and drop an Item from an item list, character inventory or compendium.');await submitWorkshop(sheet.document,{action:'link-item',projectId:event.currentTarget.dataset.workshopDrop,itemUuid:data.uuid});sheet.render(false);}
    catch(err){ui.notifications.error(err.message);}finally{sheet._workshopBusy=false;}
  });
  html.find('[data-workshop]').on('click',async event=>{
    event.preventDefault();if(sheet._workshopBusy)return;sheet._workshopBusy=true;
    try {
      const {workshop:action,projectId,sessionId}=event.currentTarget.dataset,hq=sheet.document;
      const p=workshopState(hq.getFlag(ID,'workshop')??{}).projects.find(p=>p.id===projectId);
      if(action==='open-item') {const item=await resolveLink(p?.itemUuid);if(item?.documentName!=='Item'||!item.testUserPermission(game.user,'OBSERVER'))throw new Error('The linked item is missing or you no longer have access.');await openLink(item.uuid);}
      else if(action==='clear-item')await submitWorkshop(hq,{action:'link-item',projectId,itemUuid:''});
      else if(['create','edit','prototype'].includes(action))await projectDialog(hq,p,action==='prototype');
      else if(action==='session')await sessionDialog(hq);
      else if(action==='approve'||action==='retry')await submitWorkshop(hq,{action,projectId});
      else {
        let content=field('Reason / notes','reason');
        if(action==='delete-project') content=`<p>Delete <strong>${e(p.name)}</strong> and its attempts from the Workshop? Other projects retain their work. Linked prototypes remain with a source-name reference. The linked Foundry Item is not deleted. A deletion record stays in the audit.</p>`+content;
        if(action==='delete-session') content='<p>Delete this work session and remove its credit from all affected projects? Current resolved attempts will reopen, and dependent prototypes will need GM approval again. A deletion record stays in the audit.</p>'+content;
        if(action==='settings')content+=field('Days per crafting month','monthDays',workshopState(hq.getFlag(ID,'workshop')??{}).monthDays,'number');
        if(action==='resolve')content=`<p>Roll TECH + relevant repair skill + ${e(p.kind)} Expertise + 1d10 using RED critical rules. Enter the final total. Success must exceed DV ${currentAttempt(p).dv}. Failure requires half the target work; success requires the full target.</p>`+field('Resolved check total','total','','number')+'<label><input type="checkbox" name="override"> GM overrides rolled outcome (reason required)</label>'+select('Override outcome','outcome',[['success','Success'],['failed','Failed']])+content;
        const data=await prompt(`Workshop: ${action}`,content,h=>({action,projectId,sessionId,reason:val(h,'reason'),monthDays:Number(val(h,'monthDays')),total:val(h,'total'),override:h.find('[name="override"]').prop('checked'),outcome:val(h,'outcome')}));
        if(data)await submitWorkshop(hq,data);
      }
      sheet.render(false);
    }catch(err){ui.notifications.error(err.message);}finally{sheet._workshopBusy=false;}
  });
}
