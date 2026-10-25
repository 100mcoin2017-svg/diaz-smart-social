import * as THREE from './vendor/three.module.js';

export const STUDIOS=[
  {id:'strategy',name:'Dirección y estrategia',short:'Estrategia',color:'#bca4fc',x:.4,z:.4,w:7.1,d:6.2,door:[4,6.6],icon:'◎'},
  {id:'creative',name:'Estudio creativo',short:'Creatividad',color:'#ed65b8',x:8,z:.4,w:7,d:6.2,door:[11.5,6.6],icon:'✦'},
  {id:'growth',name:'Marketing y crecimiento',short:'Marketing',color:'#efc65e',x:15.5,z:.4,w:8.1,d:6.2,door:[19.5,6.6],icon:'↗'},
  {id:'relations',name:'Cuentas y Atención al Cliente',short:'Cuentas',color:'#59b2ef',x:.4,z:9.4,w:6.7,d:7.7,door:[7.1,13.5],icon:'◉'},
  {id:'tech',name:'Tecnología y automatización',short:'Tecnología',color:'#77a0ff',x:17,z:9.4,w:6.6,d:7.7,door:[17,13.5],icon:'⌘'}
];
// Zonas de encuentro, nunca departamentos ni destinos del roster.
export const PARK={id:'care',name:'Cafetería',short:'Cafetería · clientes',color:'#54c9ef',x:8,z:9.2,w:8,d:7.2,door:[12,15.8],icon:'☕'};
export const RECEPTION={id:'reception',name:'Recepción',short:'Recepción',color:'#a1ddff',x:5.5,z:17.3,w:1.8,d:1,door:[6.4,18],icon:'↗',logo:'./logo-dna-icono.svg?v=1'};
export function studioFor(a){
  const d=a.department||a.dept||'';
  if(/Dirección|Investigación/.test(d)) return 'strategy';
  if(/Creatividad|Diseño|Instagram|TikTok|YouTube/.test(d)) return 'creative';
  if(/Rendimiento|Publicidad/.test(d)) return 'growth';
  if(/Datos|Programación|Ciberseguridad/.test(d)) return 'tech';
  if(/Cuentas|Negocio|WhatsApp|Telegram|Coach/.test(d)) return 'relations';
  return 'strategy';
}
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const length=pts=>pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);
function pointAt(pts,d){for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l&&l) return [a[0]+(b[0]-a[0])*d/l,a[1]+(b[1]-a[1])*d/l];d-=l;}return pts.at(-1);}

export class Studio3D {
  constructor(host,{agents=[],onAgent=()=>{},onRoom=()=>{},onPause=()=>{},onFrame=()=>{},vision='classic',agentTooltip=false}={}){
    this.host=host;this.onAgent=onAgent;this.onRoom=onRoom;this.onPause=onPause;this.onFrame=onFrame;this.techVision=vision==='tech';
    this.actors=[];this.rooms=STUDIOS.map(r=>({...r,agents:[]}));this.elapsed=0;this.last=0;this.nextWalk=0;this.cursor=0;
    this.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.visible=true;this.zoom=1;this.pan={x:0,z:0};this.routeKey=null;this.selected=null;this.disposed=false;this.needsRender=true;this.workKey='';
    this.scene=new THREE.Scene();this.scene.background=null;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=this.techVision?1.08:.95;
    this.canvas=this.renderer.domElement;this.canvas.className='studio-webgl';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Oficina 3D. Arrastra para girar; usa más y menos para ampliar, flechas para desplazar y Escape para volver. También puedes elegir agentes en el directorio.');host.prepend(this.canvas);
    this.raycaster=new THREE.Raycaster();this.agentHoverEnabled=agentTooltip===true&&matchMedia('(hover: hover) and (pointer: fine)').matches;this.hoveredAgent=null;this.hoverChecked=0;
    if(this.agentHoverEnabled){this.agentTooltip=document.createElement('div');this.agentTooltip.className='studio-agent-tooltip';this.agentTooltip.hidden=true;this.agentTooltip.setAttribute('aria-hidden','true');this.agentTooltip.innerHTML='<strong></strong>';host.append(this.agentTooltip);}
    this.camera=this.techVision?new THREE.PerspectiveCamera(34,1,.1,150):new THREE.OrthographicCamera(-20,20,15,-15,.1,150);this.angle=this.techVision ? .69 : .75;
    this.scene.add(new THREE.HemisphereLight(this.techVision?0x90d7ff:0xc5e5ff,this.techVision?0x06111f:0x243047,this.techVision?1.22:1.5));
    const sun=new THREE.DirectionalLight(this.techVision?0xc8eaff:0xe6efff,this.techVision?2.8:3.4);sun.position.set(5,28,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.bias=-.0006;sun.shadow.normalBias=.035;this.scene.add(sun);sun.target.position.set(12,0,9);this.scene.add(sun.target);
    const fill=new THREE.DirectionalLight(this.techVision?0x168cff:0x72bbff,this.techVision?1.15:.7);fill.position.set(25,12,24);this.scene.add(fill);
    this.materials={};this.geometry=new THREE.BoxGeometry(1,1,1);this.pickables=[];this.pins=[];this.roomVisuals=new Map();
    if(this.techVision)host.classList.add('tech-vision');
    this.buildArchitecture();this.batchBoxes(this.scene);this.buildVisitors();this.setAgents(agents);this.bind();this.resize();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.last=0;this.needsRender=true;});this.intersection.observe(host);
    this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
  }
  material(color,extra={}){const key=color+JSON.stringify(extra);return this.materials[key]||(this.materials[key]=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.08,...extra}));}
  box(x,y,z,w,h,d,color,extra={},parent=this.scene){const m=new THREE.Mesh(this.geometry,this.material(color,extra));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=!extra.transparent;m.receiveShadow=true;parent.add(m);return m;}
  cylinder(x,y,z,rt,rb,h,color,parent=this.scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,14),this.material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  tube(points,radius,color,parent=this.scene,glow=false){const line=new THREE.CurvePath();for(let i=1;i<points.length;i++)line.add(new THREE.LineCurve3(v(...points[i-1]),v(...points[i])));const m=new THREE.Mesh(new THREE.TubeGeometry(line,Math.max(4,points.length*4),radius,5,false),glow?new THREE.MeshBasicMaterial({color,toneMapped:false}):this.material(color));parent.add(m);return m;}
  glass(x,y,z,w,h,d){const pane=this.box(x,y,z,w,h,d,'#9cbed7',{transparent:true,opacity:.19,roughness:.12,metalness:.2,depthWrite:false});pane.castShadow=false;return pane;}
  batchBoxes(parent){
    const groups=new Map();parent.children.slice().forEach(m=>{if(!m.isMesh||m.geometry!==this.geometry||!m.visible||this.pickables.includes(m)||m.material.transparent)return;const key=m.material.uuid+':'+m.castShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
    groups.forEach(meshes=>{if(meshes.length<2)return;const batch=new THREE.InstancedMesh(this.geometry,meshes[0].material,meshes.length);batch.castShadow=meshes[0].castShadow;batch.receiveShadow=true;meshes.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);parent.remove(m);});batch.computeBoundingSphere();parent.add(batch);});
  }
  buildArchitecture(){
    const tech=this.techVision;
    this.box(12,-.35,9,24.8,.65,18.8,tech?'#030d1b':'#273b53',tech?{roughness:.72,metalness:.24}:{});
    this.box(12,-.01,9,24.4,.12,18.4,tech?'#0b2439':'#687c90',{roughness:tech ? .46 : .88,metalness:tech ? .2 : .08});
    // Juntas sutiles del pavimento; el edificio se representa a escala constante.
    for(let x=0;x<=24;x+=1.5)this.box(x,.057,9,.012,.005,18,tech?'#125173':'#536b82',tech?{emissive:'#0b4262',emissiveIntensity:.48}:{});
    for(let z=0;z<=18;z+=1.5)this.box(12,.057,z,24,.005,.012,tech?'#125173':'#536b82',tech?{emissive:'#0b4262',emissiveIntensity:.48}:{});
    const wall=tech?'#0b2137':'#35485f',trim=tech?'#4784a7':'#6d8098';
    this.rooms.filter(r=>r.id!=='care').forEach(r=>{
      const {x,z,w,d}=r,cx=x+w/2,cz=z+d/2;
      const floor=this.box(cx,.09,cz,w,.07,d,tech?'#113a55':r.id==='creative'?'#8b796d':'#7e8b98',{roughness:tech ? .44 : .8,metalness:tech ? .16 : .08});floor.material=floor.material.clone();floor.userData.room=r.id;this.pickables.push(floor);
      if(r.id==='creative'&&!tech)for(let k=z+.5;k<z+d;k+=.5)this.box(cx,.13,k,w,.004,.008,'#7b716c');
      this.box(cx,1.52,z+.1,Math.min(w-1.2,3.3),.66,.04,tech?'#061727':'#18314d',tech?{emissive:'#072b46',emissiveIntensity:.55}:{});
      this.box(cx,1.52,z+.13,1.8,.025,.02,r.color,{emissive:r.color,emissiveIntensity:tech?1.8:.5});
      this.box(cx,1.23,z,w,.16+2.2,.16,wall);this.box(x,1.23,cz,.16,2.36,d,wall);
      // El borde posterior alto y los frentes de cristal dejan ver el interior.
      this.box(cx,2.43,z,w+.1,.06,.21,trim);this.box(x,2.43,cz,.21,.06,d,trim);
      this.tube([[x+.15,.18,z+.14],[x+w-.14,.18,z+.14]],.022,'#84c7ff',this.scene,true);
      if(r.id==='relations'||r.id==='tech'){
        const side=r.id==='relations'?x+w:x;
        // Puerta lateral hacia la cafetería; dividir el lateral evita atravesar vidrio.
        if(r.id==='tech'){
          const leftWall=this.scene.children.filter(m=>m.isMesh&&m.position.x===x&&m.position.y===1.23&&m.position.z===cz).at(-1);if(leftWall){leftWall.visible=false;}
        }
        for(let p=z;p<z+d;p+=1.05){if(Math.abs(p-r.door[1])<1.1)continue;this.glass(side,1.1,p+.45,.04,2,.9);this.box(side,1.1,p,.045,2.1,.045,trim);}
        this.glass(cx,.62,z+d,w,1.05,.04);this.box(cx,1.18,z+d,w,.05,.06,trim);
        this.tube([[x+.2,.12,z+d+.06],[x+w-.15,.12,z+d+.06]],.026,r.color,this.scene,true);
      }else{
        const door=r.door[0];
        for(let p=x;p<x+w;p+=1.05){if(Math.abs(p+.48-door)<.95)continue;this.glass(p+.48,1.12,z+d,.96,2,.04);this.box(p,1.1,z+d,.045,2.1,.045,trim);}
        this.tube([[x+.15,.12,z+d+.05],[door-.7,.12,z+d+.05]],.028,r.color,this.scene,true);
        this.tube([[door+.7,.12,z+d+.05],[x+w-.15,.12,z+d+.05]],.028,r.color,this.scene,true);
      }
      const lamp=new THREE.PointLight(r.color,tech?7.4:5.5,tech?8:7,2);lamp.position.set(cx,2.4,cz);this.scene.add(lamp);this.roomVisuals.set(r.id,{floor,lamp,color:floor.material.color.clone()});
      this.pin(r);
    });
    // Cafetería: zona de clientes; conserva el ID care, ajeno al roster.
    this.box(12,.13,12.1,8.7,.12,7.9,tech?'#123d59':'#7f9db5',{roughness:tech ? .36 : .5,metalness:tech ? .2 : .08});
    this.cafeGroup=new THREE.Group();this.cafeGroup.name='cafeteria';this.scene.add(this.cafeGroup);
    const cafe=this.cafeGroup;
    this.box(12,.7,9.8,5.6,1,.9,'#274b68',{},cafe);
    this.box(12,1.24,9.8,5.8,.12,1.05,'#b4a08d',{},cafe);
    this.box(12,.35,10.26,5.3,.045,.025,'#8bd7ff',{emissive:'#58bfff',emissiveIntensity:1},cafe);
    // Máquina espresso, bandeja y tazas; no es otro conjunto de escritorios.
    this.box(11.8,1.63,9.7,1.15,.66,.48,'#bccbd6',{},cafe);
    this.box(11.8,1.59,9.95,.94,.35,.025,'#18344c',{},cafe);
    this.box(11.8,1.34,10.03,1.15,.06,.4,'#57718a',{},cafe);
    const cup=(x,y,z)=>{this.cylinder(x,y-.07,z,.14,.14,.025,'#dee8ec',cafe);this.cylinder(x,y,z,.075,.055,.12,'#f1ede5',cafe);this.cylinder(x,y+.062,z,.06,.06,.005,'#49362b',cafe);};
    cup(11.55,1.43,10.02);cup(12,1.43,10.02);cup(13.65,1.38,9.9);
    this.box(10.15,1.34,9.9,.8,.07,.5,'#d2c3ac',{},cafe);
    [9.95,10.2,10.4].forEach(x=>this.cylinder(x,1.42,9.9,.1,.11,.1,'#d6a468',cafe));
    const sign=document.createElement('canvas');sign.width=512;sign.height=128;
    const ctx=sign.getContext('2d');ctx.fillStyle='#18344c';ctx.fillRect(0,0,512,128);ctx.fillStyle='#d4efff';ctx.textAlign='center';ctx.font='600 45px system-ui';ctx.fillText('CAFETERÍA',256,65);ctx.font='20px system-ui';ctx.fillText('CAFÉ  ·  ENCUENTROS',256,105);
    const texture=new THREE.CanvasTexture(sign);texture.colorSpace=THREE.SRGBColorSpace;
    const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.85),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));signMesh.position.set(12,2.35,9.4);cafe.add(signMesh);
    [10.5,13.5].forEach(x=>{
      this.cylinder(x,.69,12.9,.06,.12,1,'#3f5870',cafe);
      this.cylinder(x,1.2,12.9,.65,.65,.12,'#baa68d',cafe);
      cup(x-.2,1.34,12.9);cup(x+.25,1.34,12.9);
      [-1,1].forEach(side=>{const z=12.9+side*.95;this.box(x,.55,z,.55,.13,.5,'#88b7ce',{},cafe);this.box(x,.86,z+side*.2,.55,.55,.09,'#416b87',{},cafe);[-.18,.18].forEach(dx=>this.box(x+dx,.31,z,.05,.4,.36,'#3f5870',{},cafe));});
    });
    this.batchBoxes(cafe);
    this.pin(PARK);this.pin(RECEPTION);
    if(tech)this.buildTechVision();
    this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);
    this.workGroup=new THREE.Group();this.scene.add(this.workGroup);
    this.agentFlowGroup=new THREE.Group();this.scene.add(this.agentFlowGroup);this.agentFlows=[];this.agentFlowKey='';
    // Vegetación baja en el perímetro, sin bloquear pasillos ni puestos.
    const foliage=new THREE.SphereGeometry(.28,7,5);
    [[.5,18],[2,18],[3.5,18],[21,18],[22.5,18],[24,18]].forEach(([x,z])=>{
      this.cylinder(x,.28,z,.28,.23,.5,'#344c60');
      for(let k=0;k<3;k++){const leaf=new THREE.Mesh(foliage,this.material('#496c69'));leaf.position.set(x+(k-1)*.12,.65+k*.1,z);leaf.scale.set(1,1.3,1);leaf.castShadow=true;this.scene.add(leaf);}
    });
    // Entrada reconocible, orientada hacia el pasillo.
    this.box(6.4,.09,17.9,1.5,.07,.75,'#6fc7ff',{emissive:'#188bdf',emissiveIntensity:.7});
    this.box(6.4,.55,17.55,1.5,.9,.4,'#759eb8');
    this.box(6.4,1.03,17.55,1.65,.07,.55,'#d4e7f2');
  }
  buildTechVision(){
    this.techGroup=new THREE.Group();this.techGroup.name='public-tech-vision';this.scene.add(this.techGroup);this.techRooms=new Map();this.techActiveRooms=new Set();this.techPackets=[];
    const hub=[12,.2,8],hubMaterial=new THREE.MeshBasicMaterial({color:'#4fc8ff',transparent:true,opacity:.72,toneMapped:false,blending:THREE.AdditiveBlending,depthWrite:false});
    this.techHub=[];
    [.58,.88,1.2].forEach((radius,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,5,42),hubMaterial.clone());ring.rotation.x=Math.PI/2;ring.position.set(...hub);ring.material.opacity=.72-i*.16;this.techGroup.add(ring);this.techHub.push(ring);});
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.18,1),new THREE.MeshBasicMaterial({color:'#d9f6ff',toneMapped:false}));core.position.set(12,.45,8);this.techGroup.add(core);this.techCore=core;
    this.rooms.forEach((room,index)=>{
      const cx=room.x+room.w/2,cz=room.z+room.d/2;
      const dataPath=[[12,8],[cx,8],[cx,cz]],link=this.tube(dataPath.map(([x,z])=>[x,.16,z]),.025,room.color,this.techGroup,true);link.material.transparent=true;link.material.opacity=.48;link.material.blending=THREE.AdditiveBlending;link.material.depthWrite=false;
      const packet=new THREE.Mesh(new THREE.OctahedronGeometry(.095),new THREE.MeshBasicMaterial({color:room.color,toneMapped:false,blending:THREE.AdditiveBlending}));this.techGroup.add(packet);this.techPackets.push({id:room.id,path:dataPath,length:length(dataPath),packet,offset:index*.9});
      const halo=new THREE.Mesh(new THREE.RingGeometry(.42,.5,36),new THREE.MeshBasicMaterial({color:room.color,transparent:true,opacity:.55,toneMapped:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.set(cx,.19,cz);this.techGroup.add(halo);
      const node=new THREE.Mesh(new THREE.IcosahedronGeometry(.1,1),new THREE.MeshBasicMaterial({color:room.color,toneMapped:false}));node.position.set(cx,.34,cz);this.techGroup.add(node);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.16,1.7,16,1,true),new THREE.MeshBasicMaterial({color:room.color,transparent:true,opacity:.1,toneMapped:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.set(cx,1.06,cz);this.techGroup.add(beam);
      const panel=document.createElement('canvas');panel.width=512;panel.height=144;const context=panel.getContext('2d');
      const gradient=context.createLinearGradient(0,0,512,144);gradient.addColorStop(0,'rgba(4,18,34,.96)');gradient.addColorStop(1,'rgba(8,44,70,.9)');context.fillStyle=gradient;context.fillRect(0,0,512,144);context.strokeStyle=room.color;context.lineWidth=4;context.strokeRect(4,4,504,136);context.fillStyle=room.color;context.fillRect(24,23,54,4);context.fillStyle='#e7f7ff';context.font='700 32px system-ui';context.fillText(room.short.toUpperCase(),24,74);context.fillStyle='#82d8ff';context.font='500 18px system-ui';context.fillText('SISTEMA CONECTADO  •  EN LÍNEA',24,111);
      const texture=new THREE.CanvasTexture(panel);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;
      const display=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(3.6,room.w-1.35),1),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:true,opacity:.9,side:THREE.DoubleSide}));display.position.set(cx,1.75,room.z+.22);this.techGroup.add(display);
      this.techRooms.set(room.id,{halo,node,beam,display,index,displayY:display.position.y});
    });
    [[.25,.16,.25],[23.75,.16,.25],[.25,.16,17.75],[23.75,.16,17.75]].forEach(([x,y,z])=>{const marker=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.34,12),new THREE.MeshBasicMaterial({color:'#53cfff',toneMapped:false}));marker.position.set(x,y,z);this.techGroup.add(marker);});
    this.updateTechVision();
  }
  updateTechVision(){
    if(!this.techVision||!this.techHub)return;
    const time=this.elapsed,pulse=.5+.5*Math.sin(time*2.1);this.techHub.forEach((ring,i)=>{ring.rotation.z=time*(i%2?-.18:.14);const scale=1+pulse*(.025+i*.012);ring.scale.setScalar(scale);});
    this.techCore.rotation.x=time*.35;this.techCore.rotation.y=time*.55;this.techRooms.forEach(({halo,node,beam,display,index,displayY},id)=>{const wave=.5+.5*Math.sin(time*2+index*.85),focused=!this.techActiveRooms.size||this.techActiveRooms.has(id),boost=focused?1:.28;halo.rotation.z=time*(index%2?-.12:.12);halo.material.opacity=(.36+wave*.25)*boost;halo.scale.setScalar(focused&&this.techActiveRooms.size?1.35:1);node.scale.setScalar((.86+wave*.24)*(focused?1:.72));beam.material.opacity=(.055+wave*.07)*boost;display.material.opacity=focused?.94:.34;display.position.y=displayY+(focused?Math.sin(time*1.45+index)*.045:0);display.scale.setScalar(focused&&this.techActiveRooms.size?1.06:1);});
    this.techPackets.forEach(({id,path,length:distance,packet,offset})=>{const focused=!this.techActiveRooms.size||this.techActiveRooms.has(id),position=pointAt(path,(time*1.4+offset)%distance);packet.position.set(position[0],.34,position[1]);packet.visible=focused;packet.rotation.x=time*1.3;packet.rotation.y=time*1.8;});
  }
  buildVisitors(){
    this.visitorGroup=new THREE.Group();this.scene.add(this.visitorGroup);this.visitors=[];
    // Circuito libre alrededor de barra, mesas y sillas; llegada por el borde sur.
    this.visitorPath=[[9,11.2],[15.4,11.2],[15.4,15.1],[9,15.1],[9,11.2]];
    this.visitorPathLength=length(this.visitorPath);
    const torsoGeometry=new THREE.CapsuleGeometry(.14,.29,3,7),headGeometry=new THREE.SphereGeometry(.12,10,8);
    for(let i=0;i<5;i++){
      const group=new THREE.Group(),limbs=[],color=['#e6bc87','#d6a2b5','#b7c9dd','#e7ce9c','#90c7be'][i];
      const torso=new THREE.Mesh(torsoGeometry,this.material(color));torso.position.y=.88;group.add(torso);
      const head=new THREE.Mesh(headGeometry,this.material(['#e9be9d','#b98769','#795548'][i%3]));head.position.y=1.22;group.add(head);
      for(const [x,y,h,w,c] of [[-.09,.5,.42,.075,'#33465c'],[.09,.5,.42,.075,'#33465c'],[-.22,.97,.35,.06,color],[.22,.97,.35,.06,color]]){const pivot=new THREE.Group();pivot.position.set(x,y,0);this.box(0,-h/2,0,w,h,w,c,{},pivot);group.add(pivot);limbs.push(pivot);}
      this.box(.11,.95,.145,.08,.1,.015,'#f5d49c',{},group);
      group.traverse(o=>{if(o.isMesh)o.castShadow=true;});this.visitorGroup.add(group);
      this.visitors.push({id:'demo-visitor-'+(i+1),group,limbs,offset:i*this.visitorPathLength/5});
    }
    this.updateVisitors();
  }
  updateVisitors(){
    this.visitors.forEach(visitor=>{const d=(this.elapsed*.65+visitor.offset)%this.visitorPathLength,p=pointAt(this.visitorPath,d),next=pointAt(this.visitorPath,(d+.04)%this.visitorPathLength);visitor.group.position.set(p[0],.13,p[1]);visitor.group.rotation.y=Math.atan2(next[0]-p[0],next[1]-p[1]);visitor.limbs.forEach((limb,i)=>{limb.rotation.x=Math.sin(this.elapsed*6+visitor.offset+(i%2)*Math.PI)*.32;});});
  }
  pin(room){
    const button=document.createElement('button');button.type='button';button.className='studio-pin';button.style.setProperty('--pin',room.color);
    button.setAttribute('aria-label','Explorar '+room.name);button.innerHTML='<span></span><small></small>';if(room.logo){const img=new Image();img.src=room.logo;img.alt='';img.style.cssText='width:72%;height:72%;object-fit:contain';button.firstChild.append(img);}else button.firstChild.textContent=room.icon;button.lastChild.textContent=room.short;
    button.addEventListener('click',e=>{e.stopPropagation();this.onRoom(room.id);});this.host.append(button);
    this.pins.push({room,button,anchor:v(room.x+room.w/2,3.5,room.z+room.d*.55)});
  }
  desk(x,z,parent){
    const tech=this.techVision;
    this.box(x,.76,z,1.0,.08,.62,tech?'#12354e':'#b4a08d',{roughness:tech?.28:.38,metalness:tech?.3:.08},parent);
    [-.4,.4].forEach(dx=>this.box(x+dx,.38,z,.045,.72,.46,tech?'#254962':'#4d6278',{},parent));
    this.box(x,1.1,z-.13,.55,.36,.04,tech?'#020b15':'#25374b',{},parent);
    this.box(x,1.1,z-.103,.49,.29,.01,tech?'#53d6ff':'#7dccfa',{emissive:tech?'#1bbcff':'#509ad4',emissiveIntensity:tech?1.65:.45},parent);
    this.box(x,.82,z+.13,.34,.02,.13,tech?'#477994':'#a8bbc9',{},parent);
    this.box(x,.48,z+.52,.43,.12,.43,tech?'#1a3c54':'#d9dfe1',{},parent);this.box(x,.76,z+.72,.43,.55,.09,tech?'#28506a':'#becad3',{},parent);
    this.cylinder(x,.23,z+.52,.04,.04,.4,tech?'#173449':'#466079',parent);
  }
  robotAgent(group,accent,index,limbs){
    if(!this.robotGeometries)this.robotGeometries={
      head:new THREE.SphereGeometry(.14,12,10),
      torso:new THREE.CapsuleGeometry(.145,.25,4,9),
      pelvis:new THREE.SphereGeometry(.13,10,8),
      joint:new THREE.SphereGeometry(.055,8,6),
      upper:new THREE.CapsuleGeometry(.043,.17,3,7),
      lower:new THREE.CapsuleGeometry(.038,.16,3,7),
      hand:new THREE.SphereGeometry(.047,8,6),
      core:new THREE.IcosahedronGeometry(.055,1)
    };
    const geometry=this.robotGeometries,silver=this.material('#eef6f7',{roughness:.16,metalness:.78}),dark=this.material('#080b10',{roughness:.26,metalness:.8}),warm=this.material('#ff9b42',{roughness:.14,metalness:.42,emissive:'#ff650d',emissiveIntensity:2.35}),specialty=this.material(accent,{roughness:.2,metalness:.55,emissive:accent,emissiveIntensity:.7});
    const add=(shape,material,x,y,z,scale=[1,1,1],parent=group)=>{const mesh=new THREE.Mesh(shape,material);mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;};
    const torso=add(geometry.torso,silver,0,.94,0,[1.08,1,.78]);
    add(geometry.pelvis,dark,0,.69,0,[1.05,.72,.82]);
    this.box(0,.94,-.115,.105,.24,.025,'#090d12',{metalness:.72,roughness:.2},group);
    this.box(0,.95,.115,.055,.34,.02,'#ff8a2e',{metalness:.35,roughness:.18,emissive:'#ff5d00',emissiveIntensity:2},group);
    const core=add(geometry.core,warm,0,.96,-.145);add(geometry.core,warm,0,.96,.13,[.76,.76,.76]);
    add(geometry.joint,dark,0,1.145,0,[.72,.6,.72]);add(geometry.joint,warm,0,1.15,.012,[.38,.46,.38]);
    const head=add(geometry.head,silver,0,1.29,0,[.88,1.06,.8]);
    this.box(0,1.31,-.108,.13,.038,.014,'#160b06',{emissive:'#ff761c',emissiveIntensity:2.1},group);
    this.box(0,1.255,-.105,.09,.018,.014,'#231109',{emissive:'#ff5c00',emissiveIntensity:1.15},group);
    this.box(0,1.29,.105,.055,.13,.012,'#ff8528',{emissive:'#ff5a00',emissiveIntensity:1.7},group);
    [-1,1].forEach(side=>{
      add(geometry.joint,silver,side*.19,1.08,0,[1.42,1.42,1.42]);add(geometry.joint,specialty,side*.19,1.08,-.012,[.72,.72,.72]);
      const arm=new THREE.Group();arm.position.set(side*.19,1.08,0);group.add(arm);limbs.push(arm);
      add(geometry.upper,silver,0,-.12,0,[1,1,.9],arm);add(geometry.joint,warm,0,-.255,0,[.82,.82,.82],arm);add(geometry.lower,dark,0,-.37,0,[.92,1,.86],arm);add(geometry.hand,silver,0,-.51,-.008,[.82,1.05,.72],arm);
      const leg=new THREE.Group();leg.position.set(side*.077,.69,0);group.add(leg);limbs.push(leg);
      add(geometry.upper,silver,0,-.145,0,[1.16,1.16,1.05],leg);add(geometry.joint,warm,0,-.305,0,[.94,.8,.94],leg);add(geometry.lower,dark,0,-.43,0,[1.03,1.12,.95],leg);add(geometry.hand,silver,0,-.59,-.035,[1.2,.48,1.65],leg);
    });
    [torso,head].forEach(mesh=>mesh.userData.robotPart=true);
    return {head,core,phase:index*.63};
  }
  setAgents(agents){
    this.hideAgentTooltip();
    if(this.agentFlowGroup){this.clearAgentFlows();this.agentFlowKey='';}
    if(this.actorGroup){this.scene.remove(this.actorGroup);this.scene.remove(this.deskGroup);const disposable=new Set();[this.actorGroup,this.deskGroup].forEach(g=>g.traverse(o=>{if(o.isMesh&&o.geometry!==this.geometry)disposable.add(o.geometry);}));disposable.forEach(g=>g.dispose());this.robotGeometries=null;}
    this.needsRender=true;
    this.actorGroup=new THREE.Group();this.deskGroup=new THREE.Group();this.scene.add(this.actorGroup,this.deskGroup);this.actors=[];
    this.rooms.forEach(r=>r.agents=[]);agents.forEach(a=>this.rooms.find(r=>r.id===studioFor(a)).agents.push(a));
    this.rooms.forEach(r=>{
      const cols=Math.min(4,Math.max(2,Math.ceil(Math.sqrt(r.agents.length)))), rows=Math.ceil(r.agents.length/cols);
      r.agents.forEach((a,i)=>{
        const col=i%cols,row=Math.floor(i/cols);
        let x=r.x+.9+col*(r.w-1.8)/Math.max(1,cols-1),z=r.z+.95+row*(r.d-2.5)/Math.max(1,rows-1);
        this.desk(x,z,this.deskGroup);
        const id=a.id||a.agent_id,group=new THREE.Group();group.position.set(x,0,z+.9);group.userData.agent=id;
        const color=r.color,limbs=[];let robot=null;
        if(this.techVision)robot=this.robotAgent(group,color,i,limbs);
        else{
          // Figura humana articulada del visor clásico.
          const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.28,3,7),this.material(color));torso.position.y=.88;group.add(torso);
          const head=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),this.material(['#e9be9d','#c79678','#9b7561'][i%3]));head.position.y=1.22;group.add(head);
          for(const [sx,sy,h,w,c] of [[-.09,.5,.42,.075,'#42546a'],[.09,.5,.42,.075,'#42546a'],[-.21,.97,.35,.06,color],[.21,.97,.35,.06,color]]){const pivot=new THREE.Group();pivot.position.set(sx,sy,0);this.box(0,-h/2,0,w,h,w,c,{},pivot);group.add(pivot);limbs.push(pivot);}
        }
        if(this.techVision)group.scale.setScalar(1.13);
        group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.agent=id;}});
        const ring=new THREE.Mesh(new THREE.RingGeometry(.23,.3,20),this.material('#8ac8ff',{emissive:'#8ac8ff',emissiveIntensity:1}));ring.rotation.x=-Math.PI/2;ring.position.y=.19;ring.visible=false;group.add(ring);this.actorGroup.add(group);
        this.actors.push({id,data:a,room:r,group,limbs,ring,head:robot?.head,core:robot?.core,phase:robot?.phase||0,home:[x,z+.9],trip:null,status:'idle'});
      });
    });
    this.batchBoxes(this.deskGroup);
    if(!this.actors.some(a=>a.id===this.selected))this.selected=null;
  }
  access(actor){const r=actor.room,h=actor.home;if(r.id==='care')return [h,[h[0],16.9],[8,16.9],[8,8]];
    if(r.id==='relations')return [h,[r.x+r.w-.35,h[1]],[r.x+r.w-.35,r.door[1]],r.door,[8,r.door[1]],[8,8]];
    if(r.id==='tech')return [h,[r.x+.35,h[1]],[r.x+.35,r.door[1]],r.door,[16,r.door[1]],[16,8]];
    return [h,[r.x+.3,h[1]],[r.x+.3,r.z+r.d-.4],[r.door[0],r.z+r.d-.4],r.door,[r.door[0],8]];
  }
  invite(id,{resume=true}={}){const a=this.actors.find(a=>a.id===id);if(!a||a.status==='dispatched')return false;
    if(a.trip)return true;const path=[...this.access(a),[8,8],[8,15.7],[10.7+(this.cursor%3)*.55,15.7]];
    a.trip={path,length:length(path),start:this.elapsed};if(resume)this.setPaused(false);this.needsRender=true;this.cursor++;return true;
  }
  setStatuses(states){this.actors.forEach(a=>{a.status=states[a.id]||'idle';if(a.status==='dispatched'&&a.trip){a.trip=null;a.group.position.set(a.home[0],0,a.home[1]);a.limbs.forEach(l=>l.rotation.x=0);}});this.paintActors();}
  setSelected(id){if(id===this.selected)return;this.selected=id;this.paintActors();}
  paintActors(){this.actors.forEach(a=>{const selected=a.id===this.selected,color=selected?'#c9efff':a.status==='failed'?'#fa7189':a.status==='completed'?'#a5b4fc':'#53baff';a.ring.visible=selected||['dispatched','completed','failed'].includes(a.status);a.ring.scale.setScalar(selected?1.5:1);a.ring.material=this.material(color,{emissive:color,emissiveIntensity:1});});this.needsRender=true;}
  setPaused(paused){this.playing=!paused;this.last=0;this.needsRender=true;this.onPause(this.playing);}
  setRoomEmphasis(ids=[]){const active=new Set(ids);if(this.techVision)this.techActiveRooms=active;this.roomVisuals.forEach(({floor,lamp,color},id)=>{const dim=active.size>0&&!active.has(id);floor.material.color.copy(color).multiplyScalar(dim?.35:1);lamp.intensity=dim?1.1:this.techVision?7.4:5.5;});if(this.techVision)this.updateTechVision();this.needsRender=true;}
  setWorkRooms(ids){const unique=[...new Set(ids)].sort(),key=unique.join('|');if(key===this.workKey)return;this.workKey=key;this.workGroup.children.slice().forEach(m=>{this.workGroup.remove(m);m.geometry.dispose();m.material.dispose();});unique.forEach(id=>{const p=this.routePoints(id);if(p.length)this.tube(p.map(([x,z])=>[x,.18,z]),.03,'#1f8bff',this.workGroup,true);});this.needsRender=true;}
  agentEntryPath(id){
    if(id==='reception')return [[6.4,18]];
    const actor=this.actors.find(a=>a.id===id);if(!actor)return [];
    const access=this.access(actor),door=access.findIndex(p=>p[0]===actor.room.door[0]&&p[1]===actor.room.door[1]);
    return [...this.routePoints(actor.room.id),...access.slice(0,door).reverse()].filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  }
  clearAgentFlows(){
    this.agentFlowGroup.children.slice().forEach(m=>{this.agentFlowGroup.remove(m);m.geometry.dispose();m.material.dispose();});this.agentFlows=[];this.needsRender=true;
  }
  // Solo dependencias de pasos dispatched. El movimiento representa trabajo,
  // nunca progreso cuantitativo, mensajes de red ni paseos de avatares.
  setAgentFlows(links){
    const active=links.filter(l=>l.status==='dispatched'&&l.from!==l.to),key=JSON.stringify([this.selected,active]);
    if(key===this.agentFlowKey)return;this.agentFlowKey=key;this.clearAgentFlows();
    active.forEach(link=>{
      const from=this.agentEntryPath(link.from),to=this.agentEntryPath(link.to);if(!from.length||!to.length)return;
      let common=0;while(common<Math.min(from.length,to.length)&&from[common][0]===to[common][0]&&from[common][1]===to[common][1])common++;
      const path=[...from.slice(Math.max(0,common-1)).reverse(),...to.slice(common)],distance=length(path);if(!distance)return;
      const highlighted=this.selected===link.from||this.selected===link.to,color=highlighted?'#e0f7ff':'#00cfff';
      this.tube(path.map(([x,z])=>[x,.25,z]),highlighted?.065:.04,color,this.agentFlowGroup,true);
      const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.16),new THREE.MeshBasicMaterial({color,toneMapped:false}));this.agentFlowGroup.add(marker);
      this.agentFlows.push({...link,path,length:distance,marker,start:this.elapsed});
    });this.updateAgentFlows();
  }
  updateAgentFlows(){this.agentFlows.forEach(f=>{const p=pointAt(f.path,((this.elapsed-f.start)*2)%f.length);f.marker.position.set(p[0],.48,p[1]);f.marker.rotation.y=this.elapsed;});}
  routePoints(roomId){const r=[...this.rooms,PARK,RECEPTION].find(r=>r.id===roomId);if(!r)return [];
    if(r.id==='reception')return [[6.4,18]];
    if(r.id==='care')return [[6.4,18],[8,18],[8,15.7],[12,15.7]];
    if(r.id==='relations')return [[6.4,18],[8,18],[8,13.5],r.door];
    if(r.id==='tech')return [[6.4,18],[8,18],[8,8],[16,8],[16,13.5],r.door];
    return [[6.4,18],[8,18],[8,8],[r.door[0],8],r.door];
  }
  setRoute(id){const hadJourney=!!this.journey;this.journey=null;if(this.parcel)this.parcel.visible=false;if(id===this.routeKey&&!hadJourney)return;this.routeKey=id;this.needsRender=true;
    this.routeGroup.children.slice().forEach(m=>{this.routeGroup.remove(m);m.geometry.dispose();m.material.dispose();});
    if(id&&this.routePoints(id).length>1){const pts=this.routePoints(id).map(p=>[p[0],.2,p[1]]);this.tube(pts,.055,'#00d5ff',this.routeGroup,true);this.tube(pts,.16,'#0066ff',this.routeGroup,true);this.routeGroup.children.at(-1).material.transparent=true;this.routeGroup.children.at(-1).material.opacity=.38;}
    this.pins.forEach(p=>p.button.setAttribute('aria-pressed',String(p.room.id===id)));
  }
  // Recorrido ilustrativo: no modifica estados de agentes ni toca el backend.
  setJourney(from,to){
    this.setRoute(null);
    const start=this.routePoints(from),end=this.routePoints(to);
    if(!start.length||!end.length)return;
    let common=0;while(common<Math.min(start.length,end.length)&&start[common][0]===end[common][0]&&start[common][1]===end[common][1])common++;
    const path=[...start.slice(Math.max(0,common-1)).reverse(),...end.slice(common)];
    if(path.length<2){this.setRoute(to);return;}
    this.journey={path,length:length(path),start:this.elapsed,from,to};
    this.tube(path.map(([x,z])=>[x,.23,z]),.055,'#00d5ff',this.routeGroup,true);
    if(!this.parcel){this.parcel=new THREE.Mesh(new THREE.OctahedronGeometry(.23),new THREE.MeshBasicMaterial({color:'#e6f7ff'}));this.scene.add(this.parcel);}
    this.parcel.visible=true;this.updateJourney();this.needsRender=true;
    this.pins.forEach(p=>p.button.setAttribute('aria-pressed',String(p.room.id===to)));
  }
  updateJourney(){if(!this.journey)return;const j=this.journey,d=Math.min(j.length,(this.elapsed-j.start)*2),p=pointAt(j.path,d);this.parcel.position.set(p[0],.55,p[1]);this.parcel.rotation.y=this.elapsed;}
  cameraTo(pan,zoom,angle=this.angle){
    if(!this.techVision||!this.playing){this.pan={...pan};this.zoom=zoom;this.angle=angle;this.resize();return;}
    this.cameraMotion={from:{x:this.pan.x,z:this.pan.z,zoom:this.zoom,angle:this.angle},to:{x:pan.x,z:pan.z,zoom,angle},progress:0,duration:.72};this.needsRender=true;
  }
  updateCameraMotion(dt){if(!this.cameraMotion)return;const motion=this.cameraMotion;motion.progress=Math.min(1,motion.progress+dt/motion.duration);const t=1-Math.pow(1-motion.progress,3),mix=(a,b)=>a+(b-a)*t;this.pan={x:mix(motion.from.x,motion.to.x),z:mix(motion.from.z,motion.to.z)};this.zoom=mix(motion.from.zoom,motion.to.zoom);this.angle=mix(motion.from.angle,motion.to.angle);this.resize();if(motion.progress>=1)this.cameraMotion=null;}
  focusRoom(id){const r=[...this.rooms,PARK,RECEPTION].find(r=>r.id===id);if(!r)return;this.cameraTo({x:r.x+r.w/2-12,z:r.z+r.d/2-9},1.42,this.techVision?.62:this.angle);}
  reset(){this.cameraTo({x:0,z:0},1,this.techVision ? .69 : .75);}
  zoomBy(factor){this.zoom=Math.max(.65,Math.min(2.7,this.zoom*factor));this.resize();}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);
    const aspect=w/h;
    if(this.camera.isPerspectiveCamera){this.camera.aspect=aspect;this.camera.fov=aspect<.85?58:34;this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.cameraUpdate();return;}
    const span=(aspect<.85?17/aspect:13.1)/this.zoom,offset=aspect>1.15?.18:0;
    this.camera.left=-span*aspect*(1-offset);this.camera.right=span*aspect*(1+offset);this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();this.cameraUpdate();
  }
  cameraUpdate(){const lim=Math.max(0,4+16*(1-1/this.zoom));this.pan.x=Math.max(-lim,Math.min(lim,this.pan.x));this.pan.z=Math.max(-lim,Math.min(lim,this.pan.z));const target=v(12+this.pan.x,0,9+this.pan.z),distance=this.techVision?30:31,height=this.techVision?18.5:23;this.camera.position.set(target.x+Math.sin(this.angle)*distance,height,target.z+Math.cos(this.angle)*distance);this.camera.lookAt(target);this.needsRender=true;}
  agentAt(clientX,clientY){const b=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((clientX-b.left)/b.width*2-1,-(clientY-b.top)/b.height*2+1),this.camera);const hit=this.raycaster.intersectObjects(this.actorGroup.children,true).find(item=>item.object.userData.agent);return hit?this.actors.find(actor=>actor.id===hit.object.userData.agent):null;}
  hideAgentTooltip(){this.hoveredAgent=null;this.canvas?.classList.remove('has-agent-hover');if(this.agentTooltip)this.agentTooltip.hidden=true;}
  hoverAgent(event){if(!this.agentHoverEnabled)return;const now=performance.now();if(now-this.hoverChecked<34)return;this.hoverChecked=now;const actor=this.agentAt(event.clientX,event.clientY);if(!actor){this.hideAgentTooltip();return;}const bounds=this.canvas.getBoundingClientRect(),x=Math.max(12,Math.min(bounds.width-200,event.clientX-bounds.left)),y=Math.max(72,event.clientY-bounds.top);if(this.hoveredAgent!==actor.id){this.agentTooltip.querySelector('strong').textContent=actor.data.name||actor.data.role||'Agente de IA';this.hoveredAgent=actor.id;}this.agentTooltip.style.left=x+'px';this.agentTooltip.style.top=y+'px';this.agentTooltip.hidden=false;this.canvas.classList.add('has-agent-hover');}
  bind(){
    this.drag=null;this.canvas.addEventListener('pointerdown',e=>{if(e.button>0)return;this.hideAgentTooltip();this.drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,id:e.pointerId,moved:false};if(e.pointerType==='mouse')this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;if(!this.drag){this.hoverAgent(e);return;}const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(e.clientX-d.ox,e.clientY-d.oy)>5)d.moved=true;if(d.moved){this.hideAgentTooltip();this.angle-=dx*.006;this.pan.z-=dy*.025;this.cameraUpdate();}d.x=e.clientX;d.y=e.clientY;});
    this.canvas.addEventListener('pointerup',e=>{const d=this.drag;this.drag=null;if(!d)return;if(d.moved||Math.hypot(e.clientX-d.ox,e.clientY-d.oy)>8){this.hoverAgent(e);return;}
      const actor=this.agentAt(e.clientX,e.clientY);if(actor){this.onAgent(actor.id);return;}
      const b=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),this.camera);const room=this.raycaster.intersectObjects(this.pickables).find(hit=>hit.object.userData.room);if(room)this.onRoom(room.object.userData.room);
    });
    this.canvas.addEventListener('pointerleave',()=>this.hideAgentTooltip());
    this.canvas.addEventListener('pointercancel',()=>{this.drag=null;this.hideAgentTooltip();});
    this.canvas.addEventListener('keydown',e=>{if(['+','=','-','p','P','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')this.zoomBy(1.2);if(e.key==='-')this.zoomBy(1/1.2);if(e.key==='p'||e.key==='P')this.setPaused(this.playing);if(e.key==='Escape')this.reset();if(e.key==='ArrowLeft')this.pan.x-=1;if(e.key==='ArrowRight')this.pan.x+=1;if(e.key==='ArrowUp')this.pan.z-=1;if(e.key==='ArrowDown')this.pan.z+=1;this.cameraUpdate();});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.playing=false;this.onPause(false);this.host.dataset.renderError='true';});
    this.canvas.addEventListener('webglcontextrestored',()=>{delete this.host.dataset.renderError;this.resize();});
  }
  frame(t){if(this.disposed)return;this.raf=requestAnimationFrame(this.frame);if(document.hidden||!this.visible||this.host.closest('[hidden]')){this.last=0;return;}if(this.last&&t-this.last<33)return;
    const dt=this.last?Math.min((t-this.last)/1000,.1):0;this.last=t;this.onFrame(this,dt);if(this.playing)this.elapsed+=dt;this.updateCameraMotion(dt);
    if(this.playing){this.updateVisitors();this.updateJourney();this.updateAgentFlows();this.updateTechVision();}
    if(this.playing&&this.elapsed>=this.nextWalk){const available=this.actors.filter(a=>!a.trip&&a.status!=='dispatched');if(this.actors.filter(a=>a.trip).length<7&&available.length)this.invite(available[(this.cursor*7)%available.length].id);this.nextWalk=this.elapsed+3.1;}
    this.actors.forEach(a=>{let move=false;if(a.trip){const tr=a.trip,age=this.elapsed-tr.start,travel=tr.length/1.5,dwell=3;let dist=age<travel?age*1.5:age<travel+dwell?tr.length:tr.length-(age-travel-dwell)*1.5;
      if(age>=travel*2+dwell){a.trip=null;a.group.position.set(a.home[0],0,a.home[1]);}else{const p=pointAt(tr.path,Math.max(0,dist)),next=pointAt(tr.path,Math.max(0,dist+(age>travel+dwell?-.1:.1)));a.group.position.set(p[0],0,p[1]);a.group.rotation.y=Math.atan2(next[0]-p[0],next[1]-p[1]);move=age<travel||age>travel+dwell;}}
      a.limbs.forEach((limb,i)=>{if(this.techVision){const phases=[0,Math.PI,Math.PI,0],motion=move?Math.sin(this.elapsed*8+phases[i])*.58:Math.sin(this.elapsed*1.35+a.phase+phases[i])*.035;limb.rotation.x=motion;}else limb.rotation.x=move?Math.sin(this.elapsed*8+(i%2)*Math.PI)*.45:0;});
      if(this.techVision&&a.head){a.head.rotation.y=move?0:Math.sin(this.elapsed*.72+a.phase)*.18;const pulse=1+Math.sin(this.elapsed*2.4+a.phase)*.1;a.core.scale.setScalar(pulse);}
    });
    if(!this.playing&&!this.needsRender)return;this.needsRender=false;
    this.renderer.render(this.scene,this.camera);
    const w=this.host.clientWidth,h=this.host.clientHeight;this.pins.forEach(p=>{const pos=p.anchor.clone().project(this.camera);const x=(pos.x+1)*w/2,y=(1-pos.y)*h/2;p.button.style.transform=`translate(-50%,-100%) translate(${x}px,${y}px)`;p.button.hidden=pos.z>1||x<0||x>w||y<15||y>h-20;});
  }
  snapshot(){return {playing:this.playing,route:this.routeKey,vision:this.techVision?'tech':'classic',flows:this.agentFlows.map(f=>({key:f.key,from:f.from,to:f.to,status:f.status,x:f.marker.position.x,z:f.marker.position.z})),visitors:this.visitors.map(a=>({id:a.id,x:a.group.position.x,z:a.group.position.z})),actors:this.actors.map(a=>({id:a.id,x:a.group.position.x,z:a.group.position.z,moving:!!a.trip,status:a.status})),renderCalls:this.renderer.info.render.calls};}
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.intersection.disconnect();const materials=new Set(Object.values(this.materials));this.scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();materials.add(o.material);}});materials.forEach(m=>{m.map?.dispose();m.dispose();});this.renderer.dispose();this.canvas.remove();this.agentTooltip?.remove();this.pins.forEach(p=>p.button.remove());this.host.classList.remove('tech-vision');}
}
