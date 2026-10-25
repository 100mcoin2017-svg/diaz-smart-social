import {Studio3D,STUDIOS,studioFor} from './studio-3d.js?v=robots7';
const $=s=>document.querySelector(s), data=window.AGENCY_PUBLIC, agents=data.agents;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const publicName=s=>s.replace(/ADN de Marca/gi,'Marca');
let viewer=null, roomFilter=null, selectedAgent=null, goal='contenido', demo=null, preparedBrief='';
const TRACK_EVENTS=new Set(['seccion_vista','scroll_50','scroll_90','tiempo_30s','tiempo_60s','clic_cta','demo_oficina_abierta','resumen_preparado','resumen_descargado','pelicula_inicio','servicio_tocado','momento_alcanzado','pelicula_completada','pelicula_repetida','pelicula_saltada','equipo_abierto']);
function track(evento,detalle={}){
 if(!TRACK_EVENTS.has(evento))return;
 const safe={};
 if(evento==='seccion_vista'&&/^(inicio|recibes|entrega|metodo|experiencia|nosotros|preguntas|contacto)$/.test(detalle.seccion))safe.seccion=detalle.seccion;
 if(evento==='clic_cta'&&['header','hero','cierre','pelicula'].includes(detalle.donde))safe.donde=detalle.donde;
 if(typeof detalle.servicio==='string'&&SERVICIOS.some(s=>s.id===detalle.servicio))safe.servicio=detalle.servicio;
 if(evento==='momento_alcanzado'&&Number.isInteger(detalle.momento)&&detalle.momento>=1&&detalle.momento<=5)safe.momento=detalle.momento;
 if(evento==='pelicula_inicio'&&['auto','click'].includes(detalle.origen))safe.origen=detalle.origen;
 if(evento==='servicio_tocado'&&Number.isFinite(detalle.tiempoPrimerToque))safe.tiempoPrimerToque=Math.max(0,Math.round(detalle.tiempoPrimerToque));
 const payload={event:evento,...safe};
 (window.dataLayer=window.dataLayer||[]).push(payload);
 window.dispatchEvent(new CustomEvent('dss:track',{detail:payload}));
 try{const url=new URL(data.metricsUrl);if(url.protocol==='https:'&&navigator.sendBeacon)navigator.sendBeacon(url.href,new Blob([JSON.stringify(payload)],{type:'application/json'}));}catch{}
}
const seenSections=new Set();
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting&&!seenSections.has(entry.target.id)){seenSections.add(entry.target.id);track('seccion_vista',{seccion:entry.target.id});observer.unobserve(entry.target);}});},{threshold:.15});document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));}
let scroll50=false,scroll90=false;
window.addEventListener('scroll',()=>{const total=document.documentElement.scrollHeight-innerHeight;if(total<=0)return;const fraction=scrollY/total;if(fraction>=.5&&!scroll50){scroll50=true;track('scroll_50');}if(fraction>=.9&&!scroll90){scroll90=true;track('scroll_90');}},{passive:true});
setTimeout(()=>track('tiempo_30s'),30000);setTimeout(()=>track('tiempo_60s'),60000);
const phone=/^\d{8,15}$/.test(data.whatsapp)?data.whatsapp:'';
document.querySelectorAll('.public-cta').forEach(link=>link.addEventListener('click',()=>track('clic_cta',{donde:link.dataset.cta})));
$('#priceOption').hidden=data.mostrarPrecio!==true;$('#trialOption').hidden=data.pruebaSemana!==true;
const deliveryTabs=['script','carousel','telegram'];
function deliveryTab(name){for(const id of deliveryTabs){const active=name===id;$('#'+id+'Tab').setAttribute('aria-selected',String(active));$('#'+id+'Tab').tabIndex=active?0:-1;$('#'+id+'Panel').hidden=!active;}}
deliveryTabs.forEach(id=>{$('#'+id+'Tab').onclick=()=>deliveryTab(id);});
$('.delivery-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=deliveryTabs.findIndex(id=>document.activeElement.id===id+'Tab');const next=e.key==='Home'?0:e.key==='End'?deliveryTabs.length-1:e.key==='ArrowRight'?(current+1)%deliveryTabs.length:(current+deliveryTabs.length-1)%deliveryTabs.length;deliveryTab(deliveryTabs[next]);$('#'+deliveryTabs[next]+'Tab').focus();});
document.addEventListener('click',e=>{const link=e.target.closest('[data-sample]');if(link&&deliveryTabs.includes(link.dataset.sample))deliveryTab(link.dataset.sample);});
const deliveryCases=['workshop','albany','lunaria'];
function deliveryCase(name){if(!deliveryCases.includes(name))return;document.querySelectorAll('[data-delivery-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.deliveryCase===name)));document.querySelectorAll('[data-delivery-case-copy]').forEach(block=>{block.hidden=block.dataset.deliveryCaseCopy!==name;});}
document.querySelectorAll('[data-delivery-case]').forEach(button=>{button.onclick=()=>deliveryCase(button.dataset.deliveryCase);});
let sceneOpened=false;const opened=()=>{if(!sceneOpened){sceneOpened=true;track('demo_oficina_abierta');}};
$('#scene').addEventListener('pointerdown',opened);$('#scene').addEventListener('keydown',opened);
const SERVICIOS=[
 {id:'contenido',etiqueta:'Contenido para redes',visible:true,salas:['strategy','creative'],momentos:['Llegas con tu idea y tu negocio.','Recepción anota qué quieres lograr.','Estrategia y creación preparan tu semana.','Una persona revisa todo antes de entregarlo.','Recibes guiones y carruseles listos.'],muestra:'contenido'},
 {id:'bot',etiqueta:'Bot de Telegram',visible:true,salas:['relations','tech','strategy'],momentos:['Llegas con las preguntas de tus clientes.','Recepción ordena qué debe entender el bot.','Atención y tecnología preparan el guion y las reglas.','Una persona revisa respuestas y derivaciones.','Recibes un bot con revisión humana para probar.'],muestra:'bot'},
 {id:'web',etiqueta:'Página web',visible:true,salas:['strategy','creative','tech'],momentos:['Llegas con tu negocio y lo que ofreces.','Recepción anota qué debe lograr tu página.','Estrategia, diseño y tecnología arman tu página.','Una persona revisa cada sección.','Recibes tu página lista para publicar.'],muestra:'web'},
 {id:'anuncios',etiqueta:'Anuncios en Meta y Google',visible:true,salas:['strategy','growth','creative'],momentos:['Llegas queriendo más mensajes de clientes.','Recepción anota tu meta y tu presupuesto.','Estrategia y publicidad preparan tu campaña.','Una persona revisa los anuncios antes de salir.','Recibes anuncios listos y un informe sencillo.'],muestra:'anuncios'},
 {id:'marca',etiqueta:'Identidad de marca',visible:true,salas:['strategy','creative'],momentos:['Llegas con un negocio sin imagen clara.','Recepción anota quién eres y a quién atiendes.','Estrategia y diseño definen tu estilo.','Una persona revisa que todo sea coherente.','Recibes tu guía de marca lista para usar.'],muestra:'marca'},
 {id:'video',etiqueta:'Video corto',visible:true,salas:['creative','strategy'],momentos:['Llegas con una idea para un video corto.','Recepción anota el tema y el mensaje.','Creatividad escribe el guion y las imágenes.','Una persona revisa y produce el video.','Recibes tu video listo para publicar.'],muestra:'video'},
 {id:'automatizacion',etiqueta:'Automatización de procesos',visible:true,salas:['strategy','tech','relations'],momentos:['Describes una tarea que se repite.','Recepción identifica dónde se pierde tiempo.','Tecnología diseña reglas, pasos y avisos.','Una persona revisa excepciones y permisos.','Recibes un flujo documentado para probar.'],muestra:'automatizacion'},
 {id:'estrategia',etiqueta:'Estrategia digital',visible:false,salas:['strategy','growth'],momentos:['Llegas sin saber por dónde empezar.','Recepción anota tu negocio y tu meta.','Estrategia ordena tus prioridades.','Una persona revisa el plan contigo.','Recibes un plan claro por pasos.'],muestra:'estrategia'}
];
const HANDOFF=Object.fromEntries(SERVICIOS.map(s=>[s.id,s.salas]));
const service=id=>SERVICIOS.find(s=>s.id===id);
const pageReadyAt=performance.now();
let filmState='IDLE',filmTimer=0,filmStarted=false,filmPause=false,filmStep=0,firstTouch=false,filmVisible=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function tab(name){
 for(const id of ['demo','team']){const active=id===name;$('#'+id+'Tab').setAttribute('aria-selected',String(active));$('#'+id+'Tab').tabIndex=active?0:-1;$('#'+id+'Panel').hidden=!active;}
}
$('#demoTab').onclick=()=>tab('demo');$('#teamTab').onclick=()=>tab('team');
document.querySelector('.explorer-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const id=e.key==='Home'?'demo':e.key==='End'?'team':$('#demoTab').getAttribute('aria-selected')==='true'?'team':'demo';tab(id);$('#'+id+'Tab').focus();}});
function filterTeam(){
 const q=normalize($('#teamSearch').value), list=$('#teamList');list.replaceChildren();
 const matches=agents.filter(a=>(!roomFilter||studioFor(a)===roomFilter)&&normalize(a.name+' '+a.role+' '+a.department).includes(q));
 matches.forEach(a=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.agent=a.id;b.style.setProperty('--agent-color',STUDIOS.find(r=>r.id===studioFor(a)).color);
 b.innerHTML='<span class="mini-avatar">IA</span><span><b></b><small></small></span><span class="arrow">↗</span>';b.querySelector('b').textContent=publicName(a.name);b.querySelector('small').textContent=a.department;b.onclick=()=>openAgent(a.id);li.append(b);list.append(li);});
 $('#teamEmpty').hidden=matches.length>0;
}
const OFFICE_AREA_INFO={
 strategy:'Define objetivos, prioridades y el rumbo de cada encargo.',
 creative:'Convierte las ideas en guiones, diseño y piezas de contenido.',
 growth:'Prepara campañas y analiza qué se puede mejorar.',
 relations:'Organiza la atención y el seguimiento de cada cliente.',
 tech:'Diseña herramientas y automatizaciones para sostener el trabajo.'
};
let officeShowAll=false,officeCurrentArea=null;
function renderOfficePanel(id=null){
 const selected=STUDIOS.find(r=>r.id===id)||null;
 if(id!==officeCurrentArea){officeShowAll=false;officeCurrentArea=id;}
 $('#officeAreaTitle').textContent=selected?selected.name:'Toda la oficina';
 $('#officeAreaDescription').textContent=selected?OFFICE_AREA_INFO[selected.id]:'Cinco áreas colaboran según tu objetivo.';
 document.querySelectorAll('#officeAreaButtons button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.area||'')===(selected?.id||''))));
 const pool=selected?agents.filter(a=>studioFor(a)===selected.id):agents;
 $('#officeAgentCount').textContent=`${pool.length} agentes de IA`;
 const previewLimit=matchMedia('(max-width:480px)').matches?2:3;
 const preview=officeShowAll?pool:selected?pool.slice(0,previewLimit):STUDIOS.slice(0,previewLimit).map(r=>agents.find(a=>studioFor(a)===r.id)).filter(Boolean);
 const list=$('#officeAgentPreview');list.replaceChildren();
 preview.forEach(a=>{const li=document.createElement('li'),button=document.createElement('button'),name=document.createElement('b'),role=document.createElement('small');button.type='button';button.style.setProperty('--agent-color',STUDIOS.find(r=>r.id===studioFor(a)).color);name.textContent=publicName(a.name);role.textContent=selected?a.department:STUDIOS.find(r=>r.id===studioFor(a)).short;button.append(name,role);button.onclick=()=>openAgent(a.id);li.append(button);list.append(li);});
 $('#officeAllAgents').textContent=officeShowAll?'Mostrar menos':`Ver los ${pool.length} agentes ↗`;
 $('#officeAllAgents').setAttribute('aria-expanded',String(officeShowAll));
}
function selectOfficeArea(id=null){
 stopTimer();filmState='DONE';
 document.querySelectorAll('#serviceButtons button,#extraServices button').forEach(b=>b.setAttribute('aria-pressed','false'));
 $('#activeExtra').replaceChildren();
 viewer?.setWorkRooms([]);viewer?.setStatuses({});viewer?.setRoomEmphasis(id?[id]:[]);viewer?.setRoute(id);
 if(id&&$('#scene').clientWidth>=700)viewer?.focusRoom(id);else viewer?.reset();
 renderOfficePanel(id);
}
STUDIOS.map(r=>({id:r.id,name:r.short,count:agents.filter(a=>studioFor(a)===r.id).length})).forEach(area=>{const button=document.createElement('button');button.type='button';button.dataset.area=area.id;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${area.name}, ${area.count} agentes`);button.textContent=area.name;button.onclick=()=>selectOfficeArea(officeCurrentArea===area.id?null:area.id);$('#officeAreaButtons').append(button);});
$('#officeAllAgents').onclick=()=>{officeShowAll=!officeShowAll;renderOfficePanel(officeCurrentArea);};
renderOfficePanel();
function room(id){if(id==='care'||id==='reception'){stage(id==='care'?0:1);return;}roomFilter=id;const r=STUDIOS.find(r=>r.id===id);$('#selectedRoom h3').textContent=r?r.name:'Personas al mando. IA especializada.';$('#selectedRoom p').textContent=r?`${agents.filter(a=>studioFor(a)===id).length} especialidades conectadas en esta área del estudio.`:'Selecciona una especialidad para conocer su función.';$('#clearRoom').hidden=!id;$('#teamSearch').value='';tab('team');filterTeam();viewer?.setRoute(id);
 renderOfficePanel(id);
 document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===id)));
}
$('#clearRoom').onclick=()=>room(null);$('#teamSearch').oninput=filterTeam;
STUDIOS.forEach(r=>{const b=document.createElement('button');b.type='button';b.dataset.room=r.id;b.setAttribute('aria-pressed','false');b.style.setProperty('--room-color',r.color);b.innerHTML='<i></i><span></span>';b.lastChild.textContent=r.short;b.onclick=()=>room(r.id);$('#roomShortcuts').append(b);});
function openAgent(id){const a=agents.find(a=>a.id===id);if(!a)return;selectedAgent=id;$('#agentTitle').textContent=publicName(a.name);$('#agentRole').textContent=a.role;$('#agentDuty').textContent=(window.AGENCY_DUTIES||{})[a.id]||'';$('#agentDepartment').textContent=a.department;$('#agentAvatar').style.setProperty('--agent-color',STUDIOS.find(r=>r.id===studioFor(a)).color);$('#agentActionStatus').textContent='';$('#agentDialog').showModal();}
$('#closeAgent').onclick=()=>$('#agentDialog').close();$('#agentDialog').addEventListener('click',e=>{if(e.target===$('#agentDialog')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
$('#inviteAgent').onclick=()=>{if(viewer){viewer.invite(selectedAgent);viewer.reset();$('#agentDialog').close();$('#sceneTip').textContent='El agente visita la cafetería y vuelve a su escritorio.';}else $('#agentActionStatus').textContent='La vista 3D no está disponible en este dispositivo. Puedes seguir explorando el directorio.';};

function pauseLabel(playing){$('#tourToggle').textContent=playing?'Ⅱ Pausar':'▷ Reanudar';$('#tourToggle').setAttribute('aria-pressed',String(playing));}
const FLOW=['Llega','Entrega la solicitud','Expertos','Revisión','Entrega'];
function focusJourney(id){if(!viewer)return;if($('#scene').clientWidth<700)viewer.reset();else{viewer.focusRoom(id);viewer.zoomBy(1/1.14);}}
function teamStage(index){const rooms=HANDOFF[goal];demo.team=Math.max(0,Math.min(rooms.length-1,index));const id=rooms[demo.team];$('#teamHandoff').textContent=`${demo.team+1} de ${rooms.length} · ${STUDIOS.find(r=>r.id===id).name}`;$('#teamPrevious').disabled=demo.team===0;$('#teamNext').disabled=demo.team===rooms.length-1;viewer?.setJourney(demo.team?rooms[demo.team-1]:'reception',id);focusJourney(id);viewer?.setWorkRooms([id]);viewer?.setRoomEmphasis([id]);viewer?.setStatuses(Object.fromEntries(agents.map(a=>[a.id,studioFor(a)===id?'dispatched':'idle'])));$('#sceneTip').textContent='Demostración → '+id;renderOfficePanel(id);}
function deliveryMarkup(s){
 if(s.muestra==='web')return '';
 const badge='<span class="delivery-badge">Ejemplo ilustrativo</span>';
 const body={
  contenido:'<p>Rubro: tu negocio · Tema: tu tema</p><p><b>Guion:</b> una pregunta real, una respuesta útil y un siguiente paso.</p><p><b>Carrusel:</b> una idea por lámina, revisada antes de publicar.</p><a href="#entrega" data-sample="script">Ver una muestra de contenido ↗</a>',
  bot:'<p><b>Telegram:</b> la persona cuenta qué necesita.</p><p><b>Bot:</b> hace preguntas para entender su objetivo y prepara el siguiente paso.</p><p><b>Equipo:</b> revisa la respuesta antes de enviarla.</p><a href="#entrega" data-sample="telegram">Ver guion del bot ↗</a>',
  anuncios:'<p><b>Anuncio A</b> · Conoce este servicio <span class="wire-button">Más información</span></p><p><b>Anuncio B</b> · Resuelve esta duda <span class="wire-button">Conversemos</span></p>',
  marca:'<p>Paleta: azul · blanco · acento claro</p><p>Tipografía: título con carácter · texto legible</p><p>Logotipo genérico: ◇ Marca</p>',
  video:'<p>1 · Gancho: una pregunta cercana.</p><p>2 · Desarrollo: explica una idea.</p><p>3 · Cierre: invita a conversar.</p>',
  automatizacion:'<p><b>Entrada:</b> se registra una nueva solicitud.</p><p><b>Regla:</b> se organiza según el tipo de necesidad.</p><p><b>Siguiente paso:</b> el equipo recibe un aviso y revisa qué hacer.</p><p>Flujo ilustrativo; no ejecuta una automatización real.</p>',
  estrategia:'<ol><li>Escuchar el negocio</li><li>Ordenar prioridades</li><li>Definir próximos pasos</li></ol>'
 };
 return badge+body[s.muestra];
}
function stage(index){const s=service(goal),i=Math.max(0,Math.min(4,index));demo={index:i,team:0};filmStep=i;viewer?.setWorkRooms([]);viewer?.setRoomEmphasis([]);viewer?.setStatuses({});$('#demoCounter').textContent=`PASO 0${i+1} / 05`;$('#demoStage').textContent=FLOW[i];$('#demoNarrative').textContent=s.momentos[i];$('#previousStage').disabled=i===0;$('#nextStage').textContent=i===4?'Volver al inicio ↺':'Siguiente →';$('#teamSequence').hidden=i!==2;$('#sampleOutput').hidden=true;$('#journeyStatus').textContent=`Paso ${i+1} de 5: ${s.momentos[i]}`;$('#fallbackText').textContent=`Plano 2D · ${FLOW[i]}: ${s.momentos[i]}`;$('#fallbackFlow').dataset.step=i;$('#filmAnnouncement').replaceChildren();const item=document.createElement('li');item.textContent=`${FLOW[i]}: ${s.momentos[i]}`;$('#filmAnnouncement').append(item);if(i===0||i===1||i===4)renderOfficePanel();if(i===3)renderOfficePanel('strategy');if(i===0){viewer?.setRoute('care');viewer?.reset();$('#sceneTip').textContent='El cliente llega con una necesidad';}if(i===1){viewer?.setJourney('care','reception');focusJourney('reception');$('#sceneTip').textContent='Solicitud → Recepción';}if(i===2)teamStage(0);if(i===3){viewer?.setRoomEmphasis(['strategy']);viewer?.setJourney(HANDOFF[goal].at(-1),'strategy');focusJourney('strategy');$('#sceneTip').textContent='Revisión humana';}if(i===4){viewer?.setJourney('strategy','care');focusJourney('care');$('#sceneTip').textContent='Entrega de muestra → cliente';}track('momento_alcanzado',{servicio:goal,momento:i+1});}
function stopTimer(){clearTimeout(filmTimer);filmTimer=0;}
function finishFilm(){stopTimer();filmState='DONE';viewer?.reset();const markup=deliveryMarkup(service(goal));$('#filmDelivery').innerHTML=markup;$('#filmDelivery').hidden=!markup;track('pelicula_completada',{servicio:goal});}
function advance(){if(filmState!=='PLAYING'||filmPause)return;if(filmStep<4){stage(filmStep+1);if(!filmPause)filmTimer=setTimeout(advance,2900);}else finishFilm();}
function startFilm(id,origin='click'){const s=service(id);if(!s||!s.visible)return;stopTimer();goal=id;filmStarted=true;$('#filmDelivery').hidden=true;document.querySelectorAll('[data-service]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.service===id)));const extra=$('#activeExtra');extra.replaceChildren();if(SERVICIOS.indexOf(s)>2){const b=document.createElement('button');b.type='button';b.dataset.service=id;b.setAttribute('aria-pressed','true');b.textContent=s.etiqueta;b.onclick=()=>touchService(id);extra.append(b);}$('#moreServices').open=false;if(reducedMotion.matches){filmState='DONE';stage(4);viewer?.reset();const list=document.createElement('ol');s.momentos.forEach(t=>{const li=document.createElement('li');li.textContent=t;list.append(li);});$('#filmDelivery').replaceChildren(list);$('#filmDelivery').insertAdjacentHTML('beforeend',deliveryMarkup(s));$('#filmDelivery').hidden=false;return;}filmState='PLAYING';stage(0);track('pelicula_inicio',{servicio:id,origen:origin});if(!filmPause)filmTimer=setTimeout(advance,2900);}
function touchService(id){track('servicio_tocado',{servicio:id,...(!firstTouch?{tiempoPrimerToque:performance.now()-pageReadyAt}:{})});firstTouch=true;startFilm(id);}
function serviceButton(s){const b=document.createElement('button');b.type='button';b.dataset.service=s.id;b.textContent=s.etiqueta;b.setAttribute('aria-pressed','false');b.onclick=()=>touchService(s.id);return b;}
SERVICIOS.filter(s=>s.visible).forEach((s,i)=>$(i<3?'#serviceButtons':'#extraServices').append(serviceButton(s)));$('#moreServices').hidden=!$('#extraServices').children.length;
document.querySelectorAll('[data-service-jump]').forEach(link=>link.addEventListener('click',()=>{initViewer();touchService(link.dataset.serviceJump);}));
$('#moreServices').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#moreServices').open=false;$('#moreServices summary').focus();}});

$('#openTeam').onclick=e=>{e.preventDefault();$('.explorer').classList.add('team-open');room(null);$('#teamSearch').focus();track('equipo_abierto');};
$('#previousStage').onclick=()=>stage(demo.index-1);$('#nextStage').onclick=()=>stage(demo.index===4?0:demo.index+1);$('#teamPrevious').onclick=()=>teamStage(demo.team-1);$('#teamNext').onclick=()=>teamStage(demo.team+1);$('#stopDemo').onclick=()=>startFilm(goal);

$('#copySample').onclick=async()=>{try{await navigator.clipboard.writeText($('#sampleText').textContent);$('#copyStatus').textContent='Ejemplo copiado.';}catch{const range=document.createRange();range.selectNodeContents($('#sampleText'));getSelection().removeAllRanges();getSelection().addRange(range);$('#copyStatus').textContent='Texto seleccionado; puedes copiarlo.';}};
$('#sceneHome').onclick=()=>viewer?.reset();$('#sceneTeam').onclick=()=>{room(null);$('.explorer').classList.add('team-open');$('#teamSearch').focus();track('equipo_abierto');};$('#sceneDemo').onclick=()=>startFilm(goal);
$('#zoomIn').onclick=()=>viewer?.zoomBy(1.2);$('#zoomOut').onclick=()=>viewer?.zoomBy(1/1.2);$('#zoomReset').onclick=()=>viewer?.reset();$('#tourToggle').onclick=()=>{filmPause=!filmPause;viewer?.setPaused(filmPause);if(filmPause)stopTimer();else if(filmState==='PLAYING')if(!filmPause)filmTimer=setTimeout(advance,2900);};
filterTeam();
function fallback(error){
 viewer?.dispose();viewer=null;window.agencyStudio=null;delete $('#scene').dataset.renderError;
 $('#scene').querySelector('.studio-webgl')?.remove();$('#scene').querySelectorAll('.studio-pin').forEach(p=>p.remove());
 $('#fallbackFlow').hidden=false;$('#tourToggle').disabled=true;$('#tourToggle').textContent='Plano 2D';$('#tourToggle').setAttribute('aria-pressed','false');
 ['zoomIn','zoomOut','zoomReset'].forEach(id=>{$('#'+id).disabled=true;$('#'+id).title='El plano de respaldo se ajusta a la pantalla';});console.warn(error.message);
}
function initViewer(){if(viewer||$('#scene').dataset.viewerAttempted)return;$('#scene').dataset.viewerAttempted='true';try{
 viewer=new Studio3D($('#scene'),{agents,onAgent:openAgent,onRoom:room,onPause:pauseLabel,vision:'tech',agentTooltip:true});
 viewer.canvas.setAttribute('aria-label','Oficina 3D interactiva. Arrastra para girar y usa la rueda o pellizca para acercar. Selecciona un área debajo del plano para conocer a sus agentes. Pulsa P para pausar o reanudar el movimiento.');
 viewer.setRoute('care');pauseLabel(viewer.playing);window.agencyStudio=viewer;
 viewer.canvas.addEventListener('webglcontextlost',()=>fallback(new Error('Se perdió el contexto WebGL.')),{once:true});
}catch(error){fallback(error);}}
const filmObserver=new IntersectionObserver(entries=>{filmVisible=entries[0].isIntersecting;if(filmVisible){initViewer();if(filmState==='PLAYING'&&!filmPause&&!filmTimer)filmTimer=setTimeout(advance,2900);}else if(filmState==='PLAYING')stopTimer();},{threshold:.12});
filmObserver.observe($('#experiencia'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTimer();else if(filmVisible&&filmState==='PLAYING'&&!filmPause&&!filmTimer)filmTimer=setTimeout(advance,2900);});

// Formulario local: preparar y descargar no equivale a enviar a la agencia.
const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)?data.email:'';
if(phone||email)$('#contactNote').textContent='Primero revisas tu resumen. Después decides si quieres compartirlo por el canal de contacto.';
$('#briefForm').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const fields=new FormData(form);preparedBrief=`RESUMEN INICIAL\n\nNegocio: ${String(fields.get('business')).trim()}\nObjetivo: ${fields.get('goal')}\nContexto: ${String(fields.get('context')).trim()}\n`;
 $('#briefActions').hidden=false;$('#formStatus').textContent='Tu resumen está preparado. Todavía no se ha enviado.';track('resumen_preparado');$('#briefActions').scrollIntoView({block:'nearest',behavior:'smooth'});
 if(phone||email){const a=$('#sendBrief');a.hidden=false;a.textContent=phone?'Continuar por WhatsApp ↗':'Continuar por correo ↗';a.href=phone?`https://wa.me/${phone}?text=${encodeURIComponent(preparedBrief)}`:`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Resumen inicial')}&body=${encodeURIComponent(preparedBrief)}`;}
});
$('#briefForm').addEventListener('input',()=>{preparedBrief='';$('#briefActions').hidden=true;$('#formStatus').textContent='';});
$('#downloadBrief').onclick=()=>{if(!preparedBrief)return;const blob=new Blob([preparedBrief],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='resumen-inicial.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#formStatus').textContent='Descarga preparada. El resumen no se ha enviado a la agencia.';track('resumen_descargado');};
$('#copyBrief').onclick=async()=>{if(!preparedBrief)return;try{await navigator.clipboard.writeText(preparedBrief);$('#formStatus').textContent='Resumen copiado. Puedes compartirlo por el canal que prefieras.';}catch{$('#formStatus').textContent='No fue posible copiar. Usa «Descargar resumen».';}};
