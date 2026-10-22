import {Studio3D,STUDIOS,studioFor} from './studio-3d.js?v=cafe1';
const $=s=>document.querySelector(s), data=window.AGENCY_PUBLIC, agents=data.agents;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let viewer=null, roomFilter=null, selectedAgent=null, goal='growth', demo=null, preparedBrief='';
const DEMOS={
 growth:{title:'Una oferta que abre conversaciones',description:'Ejemplo para un estudio de interiores ficticio. La estrategia y el mensaje se adaptarían al negocio antes de usarse.',tag:'EJEMPLO / OFERTA + MENSAJE',text:'OBJETIVO\nAbrir conversaciones con personas que quieren renovar su sala.\n\nOFERTA DE ENTRADA\nUna revisión inicial del espacio a partir de una foto y tres prioridades.\n\nMENSAJE\n¿Tu sala ya no encaja con la forma en que la usas? Envíanos una foto y cuéntanos qué te gustaría cambiar. Te explicamos cómo sería una primera revisión y qué necesitaríamos para proponerte un plan.\n\nQUÉ MEDIR\nConsultas recibidas → conversaciones calificadas → propuestas aceptadas. Sin datos iniciales, aún no fijamos una meta numérica.',stages:[['strategy','Entender el negocio','Dirección ordena el objetivo, la oferta y el contexto del cliente.'],['growth','Diseñar el recorrido','Marketing propone el canal, el mensaje y cómo medir las consultas.'],['creative','Dar forma al mensaje','El equipo creativo prepara una pieza concreta para iniciar conversaciones.'],['relations','Preparar el siguiente paso','Ventas organiza la respuesta y la dirección humana revisa la propuesta.']]},
 content:{title:'Un carrusel con una idea clara',description:'Ejemplo editorial para la propia agencia. Muestra el contenido escrito; el diseño y la producción se revisan por separado.',tag:'EJEMPLO / GUION DE CARRUSEL',text:'IDEA\nPublicar con intención.\n\n01 · Publicar no es el objetivo.\n02 · Abrir una conversación, sí.\n03 · Empieza por una pregunta real.\n04 · Responde con algo útil.\n05 · Propón un siguiente paso sencillo.\n\nCIERRE\n¿Qué duda se repite entre tus clientes? Tu próximo contenido puede empezar ahí.\n\nDIRECCIÓN VISUAL\nUna frase por lámina. Azul profundo, tipografía clara y un solo elemento visual que acompañe la idea.',stages:[['strategy','Encontrar la idea','Estrategia elige una pregunta relevante para la audiencia.'],['creative','Escribir con intención','Copy y contenido convierten esa pregunta en una historia breve.'],['creative','Definir la pieza','Diseño y producción preparan la dirección visual y las instrucciones.'],['care','Revisar y ajustar','La revisión humana valida claridad, coherencia de marca y alcance.']]},
 automation:{title:'Una consulta, un recorrido claro',description:'Ejemplo de diseño de flujo. La implementación depende del canal, sus permisos y las integraciones disponibles.',tag:'EJEMPLO / FLUJO DE ATENCIÓN',text:'ENTRADA\nUna persona consulta por un servicio.\n\n1. IDENTIFICAR\nPreguntar qué necesita y ofrecer tres categorías claras.\n\n2. ORIENTAR\nResponder con información aprobada. Si falta un dato, pedirlo sin inventar.\n\n3. DERIVAR\nEnviar a una persona las solicitudes de presupuesto, las excepciones y las dudas que el sistema no puede resolver.\n\n4. MEDIR\nTiempo de atención, solicitudes resueltas y casos derivados.\n\nANTES DE ACTIVAR\nProbar consultas habituales, errores, consentimiento y la entrega al responsable humano.',stages:[['relations','Escuchar la consulta','El equipo de atención identifica las preguntas y las excepciones reales.'],['tech','Diseñar el flujo','Automatización conecta entradas, respuestas y derivaciones.'],['tech','Probar los casos difíciles','Tecnología revisa errores y el paso a una persona.'],['strategy','Definir la puesta en marcha','Dirección acuerda una fase inicial y qué se medirá.']]}
};

function tab(name){
 for(const id of ['demo','team']){const active=id===name;$('#'+id+'Tab').setAttribute('aria-selected',String(active));$('#'+id+'Tab').tabIndex=active?0:-1;$('#'+id+'Panel').hidden=!active;}
}
$('#demoTab').onclick=()=>tab('demo');$('#teamTab').onclick=()=>tab('team');
document.querySelector('.explorer-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const id=e.key==='Home'?'demo':e.key==='End'?'team':$('#demoTab').getAttribute('aria-selected')==='true'?'team':'demo';tab(id);$('#'+id+'Tab').focus();}});
function filterTeam(){
 const q=normalize($('#teamSearch').value), list=$('#teamList');list.replaceChildren();
 const matches=agents.filter(a=>(!roomFilter||studioFor(a)===roomFilter)&&normalize(a.name+' '+a.role+' '+a.department).includes(q));
 matches.forEach(a=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.agent=a.id;b.style.setProperty('--agent-color',STUDIOS.find(r=>r.id===studioFor(a)).color);
 b.innerHTML='<span class="mini-avatar">IA</span><span><b></b><small></small></span><span class="arrow">↗</span>';b.querySelector('b').textContent=a.name;b.querySelector('small').textContent=a.department;b.onclick=()=>openAgent(a.id);li.append(b);list.append(li);});
 $('#teamEmpty').hidden=matches.length>0;
}
function room(id){if(id==='care'||id==='reception'){stage(id==='care'?0:1);return;}roomFilter=id;const r=STUDIOS.find(r=>r.id===id);$('#selectedRoom h3').textContent=r?r.name:'Personas al mando. IA especializada.';$('#selectedRoom p').textContent=r?`${agents.filter(a=>studioFor(a)===id).length} roles de distintos departamentos, conectados en esta área del estudio.`:'Selecciona un rol para conocer su función.';$('#clearRoom').hidden=!id;$('#teamSearch').value='';tab('team');filterTeam();viewer?.setRoute(id);
 document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===id)));
}
$('#clearRoom').onclick=()=>room(null);$('#teamSearch').oninput=filterTeam;
STUDIOS.forEach(r=>{const b=document.createElement('button');b.type='button';b.dataset.room=r.id;b.setAttribute('aria-pressed','false');b.style.setProperty('--room-color',r.color);b.innerHTML='<i></i><span></span>';b.lastChild.textContent=r.short;b.onclick=()=>room(r.id);$('#roomShortcuts').append(b);});
function openAgent(id){const a=agents.find(a=>a.id===id);if(!a)return;selectedAgent=id;$('#agentTitle').textContent=a.name;$('#agentRole').textContent=a.role;$('#agentDuty').textContent=(window.AGENCY_DUTIES||{})[a.id]||'';$('#agentDepartment').textContent=a.department;$('#agentAvatar').style.setProperty('--agent-color',STUDIOS.find(r=>r.id===studioFor(a)).color);$('#agentActionStatus').textContent='';$('#agentDialog').showModal();}
$('#closeAgent').onclick=()=>$('#agentDialog').close();$('#agentDialog').addEventListener('click',e=>{if(e.target===$('#agentDialog')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
$('#inviteAgent').onclick=()=>{if(viewer){viewer.invite(selectedAgent);viewer.reset();$('#agentDialog').close();$('#sceneTip').textContent='El agente visita la cafetería y vuelve a su escritorio.';}else $('#agentActionStatus').textContent='La vista 3D no está disponible en este dispositivo. Puedes seguir explorando el directorio.';};

function pauseLabel(playing){$('#tourToggle').textContent=playing?'Ⅱ Pausar movimiento':'▷ Activar movimiento';$('#tourToggle').setAttribute('aria-pressed',String(playing));}
const FLOW=['Cliente · Cafetería','Recepción','Equipo','Revisión humana','Entrega · Cafetería'];
const HANDOFF={growth:['strategy','growth','creative','relations'],content:['strategy','creative'],automation:['relations','tech','strategy']};
const RECEPTION_COPY={growth:'Recepción aclara la oferta y a quién va dirigida. Si la necesidad es contactar prospectos, deriva al Setter; para preparar una campaña conecta estrategia, marketing y creatividad.',content:'Recepción concreta el público, el mensaje y la pieza que necesitas. Con ese brief conecta estrategia y creatividad, sin hacerte elegir entre cincuenta especialistas.',automation:'Recepción identifica qué proceso se repite, qué canal usas y dónde hace falta una persona. Después conecta atención y tecnología.'};
function focusJourney(id){if(!viewer)return;if($('#scene').clientWidth<700)viewer.reset();else viewer.focusRoom(id);}
function selectGoal(id){if(!DEMOS[id])return;goal=id;document.querySelectorAll('[data-goal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.goal===id)));stage(0);}
function teamStage(index){
 const rooms=HANDOFF[goal];demo.team=Math.max(0,Math.min(rooms.length-1,index));const id=rooms[demo.team],name=STUDIOS.find(r=>r.id===id).name;
 $('#teamHandoff').textContent=`${demo.team+1} de ${rooms.length} · ${name}`;
 $('#teamPrevious').disabled=demo.team===0;$('#teamNext').disabled=demo.team===rooms.length-1;
 viewer?.setJourney(demo.team?rooms[demo.team-1]:'reception',id);focusJourney(id);
 viewer?.setWorkRooms([id]);viewer?.setStatuses(Object.fromEntries(agents.map(a=>[a.id,studioFor(a)===id?'dispatched':'idle'])));
 viewer?.pins.forEach(p=>{const n=rooms.indexOf(p.room.id);p.button.lastChild.textContent=n<0?p.room.short:`${n+1} · ${p.room.short}`;});
 $('#sceneTip').textContent=`Encargo de muestra → ${name}`;
}
function stage(index){
 tab('demo');demo={index:Math.max(0,Math.min(4,index)),team:0};const i=demo.index;
 viewer?.setWorkRooms([]);viewer?.setStatuses({});viewer?.pins.forEach(p=>p.button.lastChild.textContent=p.room.short);
 const titles=['Todo empieza con una necesidad.','Aquí ocurre la magia.','El equipo convierte la idea en trabajo.','Tu criterio tiene la última palabra.','La entrega vuelve al cliente.'];
 const bodies=['El cliente está en la cafetería. Elige qué necesita y acompáñalo a Recepción.',RECEPTION_COPY[goal],'Cada área recibe el encargo y aporta su especialidad. El cliente puede volver a pasear por la cafetería mientras el equipo trabaja.','Dirección y producción humana revisan la propuesta, piden ajustes y aprueban antes de usarla. Esta demo no representa una aprobación real.','El cliente recibe el resultado en la cafetería. Abajo puedes leer y copiar un ejemplo; no se ha enviado ni publicado nada.'];
 $('#demoProgress').hidden=false;$('#demoCounter').textContent=`PASO 0${i+1} / 05`;$('#demoStage').textContent=titles[i];$('#demoNarrative').textContent=bodies[i];
 $('.goal-picker').hidden=i!==0;$('#previousStage').disabled=i===0;$('#nextStage').hidden=i===0;$('#nextStage').textContent=i===4?'Volver a la cafetería ↺':'Siguiente →';
 $('#teamSequence').hidden=i!==2;$('#sampleOutput').hidden=i!==4;$('#copyStatus').textContent='';
 $('#journeyStatus').textContent=`Paso ${i+1} de 5: ${FLOW[i]}. ${titles[i]}`;
 $('#fallbackText').textContent=`Plano 2D · Paso ${i+1}: ${FLOW[i]}. Usa los pasos para seguir el encargo.`;$('#fallbackFlow').dataset.step=i;
 if(i===0){viewer?.setRoute('care');viewer?.reset();$('#sceneTip').textContent='El cliente en la cafetería · elige una necesidad';}
 if(i===1){viewer?.setJourney('care','reception');focusJourney('reception');$('#sceneTip').textContent='Cafetería → Recepción · del problema al encargo';}
 if(i===2)teamStage(0);
 if(i===3){viewer?.setJourney(HANDOFF[goal].at(-1),'strategy');focusJourney('strategy');$('#sceneTip').textContent='Revisión humana · no publicación automática';}
 if(i===4){viewer?.setJourney('strategy','care');focusJourney('care');$('#sceneTip').textContent='Entrega de muestra → cliente en la cafetería';const d=DEMOS[goal];$('#sampleTitle').textContent=d.title;$('#sampleDescription').textContent=d.description;$('#sampleTag').textContent=d.tag;$('#sampleText').textContent=d.text;}
}
function startDemo(){stage(1);}
document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{selectGoal(b.dataset.goal);startDemo();});
$('#previousStage').onclick=()=>stage(demo.index-1);$('#nextStage').onclick=()=>stage(demo.index===4?0:demo.index+1);
$('#teamPrevious').onclick=()=>teamStage(demo.team-1);$('#teamNext').onclick=()=>teamStage(demo.team+1);
$('#stopDemo').onclick=()=>selectGoal(goal);
document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{selectGoal(b.dataset.preview);startDemo();$('#experiencia').scrollIntoView({behavior:'smooth'});});
$('#copySample').onclick=async()=>{try{await navigator.clipboard.writeText($('#sampleText').textContent);$('#copyStatus').textContent='Ejemplo copiado.';}catch{const range=document.createRange();range.selectNodeContents($('#sampleText'));getSelection().removeAllRanges();getSelection().addRange(range);$('#copyStatus').textContent='Texto seleccionado; puedes copiarlo.';}};
$('#sceneHome').onclick=()=>viewer?.reset();$('#sceneTeam').onclick=()=>{room(null);$('#teamSearch').focus();};$('#sceneDemo').onclick=()=>stage(demo?.index||0);
$('#zoomIn').onclick=()=>viewer?.zoomBy(1.2);$('#zoomOut').onclick=()=>viewer?.zoomBy(1/1.2);$('#zoomReset').onclick=()=>viewer?.reset();$('#tourToggle').onclick=()=>viewer?.setPaused(viewer.playing);
filterTeam();
try{
 viewer=new Studio3D($('#scene'),{agents,onAgent:openAgent,onRoom:room,onPause:pauseLabel});
 viewer.setRoute('care');pauseLabel(viewer.playing);window.agencyStudio=viewer;
}catch(error){
 $('#scene').querySelector('.studio-webgl')?.remove();$('#scene').querySelectorAll('.studio-pin').forEach(p=>p.remove());
 $('#fallbackFlow').hidden=false;$('#tourToggle').disabled=true;$('#tourToggle').textContent='Plano 2D';$('#tourToggle').setAttribute('aria-pressed','false');
 ['zoomIn','zoomOut','zoomReset'].forEach(id=>{$('#'+id).disabled=true;$('#'+id).title='El plano de respaldo se ajusta a la pantalla';});console.warn(error.message);
}
stage(0);

// Formulario local: preparar y descargar no equivale a enviar a la agencia.
const phone=/^\d{8,15}$/.test(data.whatsapp)?data.whatsapp:'';
const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)?data.email:'';
if(phone||email)$('#contactNote').textContent='Prepara tu brief y continúa por el canal de contacto. Tú revisas el mensaje y decides cuándo enviarlo.';
$('#briefForm').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const fields=new FormData(form);preparedBrief=`BRIEF INICIAL\n\nNegocio: ${String(fields.get('business')).trim()}\nObjetivo: ${fields.get('goal')}\nContexto: ${String(fields.get('context')).trim()}\n`;
 $('#briefActions').hidden=false;$('#formStatus').textContent='Tu brief está preparado. Todavía no se ha enviado.';$('#briefActions').scrollIntoView({block:'nearest',behavior:'smooth'});
 if(phone||email){const a=$('#sendBrief');a.hidden=false;a.textContent=phone?'Continuar por WhatsApp ↗':'Continuar por correo ↗';a.href=phone?`https://wa.me/${phone}?text=${encodeURIComponent(preparedBrief)}`:`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Brief inicial')}&body=${encodeURIComponent(preparedBrief)}`;}
});
$('#briefForm').addEventListener('input',()=>{preparedBrief='';$('#briefActions').hidden=true;$('#formStatus').textContent='';});
$('#downloadBrief').onclick=()=>{if(!preparedBrief)return;const blob=new Blob([preparedBrief],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='brief-inicial.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#formStatus').textContent='Descarga preparada. El brief no se ha enviado a la agencia.';};
$('#copyBrief').onclick=async()=>{if(!preparedBrief)return;try{await navigator.clipboard.writeText(preparedBrief);$('#formStatus').textContent='Brief copiado. Puedes compartirlo por el canal que prefieras.';}catch{$('#formStatus').textContent='No fue posible copiar. Usa «Descargar brief».';}};
