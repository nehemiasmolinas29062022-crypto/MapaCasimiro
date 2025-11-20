const B=[12.1246,-86.2730,12.1273,-86.2686], SW=[B[0],B[1]], NE=[B[2],B[3]];
const map=L.map('map',{minZoom:16,maxZoom:19,attributionControl:false,zoomControl:false}).fitBounds([SW,NE]);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{opacity:1, maxNativeZoom:19}).addTo(map);

// overlay semitransparente 
const overlayUrl = 'sandbox:/mnt/data/f423e80c-5a47-4150-bfed-bd75bd52f9a6.jpeg';
L.imageOverlay(overlayUrl, [[B[0],B[1]],[B[2],B[3]]], {opacity:0.4, interactive:false}).addTo(map);

const I=L.icon({iconUrl:'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',iconSize:[25,41],iconAnchor:[12,41]});

// lugares de la Casimiro 
const lugares=[
  ["Biblioteca Jose Coronel Urtecho",[12.12626585228741,-86.26944024253993]],
  ["Edificio C",[12.125977388079734,-86.2698214119193]],
  ["Edificio B",[12.125713871801786,-86.26952445055429]],
  ["Rectoria",[12.126491945593362,-86.26972061722134]],
  ["Edificio Q",[12.125706670509452,-86.27154131321777]],
  ["Museo Heroes y Martires",[12.12526198120043,-86.27097915599218]],
  ["Edificio I",[12.12526198120043,-86.27097915599218]],
  ["Edificio G",[12.12526198120043,-86.27097915599218]],
  ["Sala de Escultura Japonesa",[12.124836979008021,-86.27201788096436]],
  ["Edificio P",[12.125037948223794,-86.27144997406525]],
  ["Edificio O",[12.125089150388387,-86.27160544011524]],
  ["Edificio K",[12.125192191158364,-86.26958434683225]],
  ["Aula Magna",[12.126483433596404,-86.27015977558463]],
  ["Cancha Deportiva",[12.126390435412691,-86.27075726052092]],
  ["Edificio S",[12.126193761794557,-86.27126976554443]]
];


const key = v => v[0].toFixed(6)+'|'+v[1].toFixed(6);
function build(paths){ const nodes={}, adj={}; paths.forEach(p=>{ for(let i=0;i<p.length;i++){ const K=key(p[i]); nodes[K]=p[i]; adj[K]=adj[K]||new Map(); if(i){ const A=key(p[i-1]); const d=map.distance(p[i-1],p[i]); adj[A].set(K,d); adj[K].set(A,d); }}}); return {nodes,adj}; }
function linkClose(nodes,adj,th=6){ const ks=Object.keys(nodes); for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const a=ks[i], b=ks[j], d=map.distance(nodes[a],nodes[b]); if(d<=th){ adj[a].set(b,d); adj[b].set(a,d); } } }
function dijkstra(adj,s,e){ const dist={},prev={},Q=new Set(Object.keys(adj)); Q.forEach(v=>dist[v]=1e12); dist[s]=0; while(Q.size){ let u=null,m=1e13; Q.forEach(v=>{ if(dist[v]<m){m=dist[v];u=v;} }); if(!u) break; Q.delete(u); if(u===e) break; adj[u].forEach((w,to)=>{ if(Q.has(to)){ const alt=dist[u]+w; if(alt<dist[to]){ dist[to]=alt; prev[to]=u; } } }); } const out=[]; let cur=e; if(!prev[cur] && cur!==s && dist[cur]===1e12) return []; while(cur){ out.unshift(cur); if(cur===s) break; cur=prev[cur]; } return out; }
function nearest(nodes,latlng){ let bk=null,bd=1e12; Object.keys(nodes).forEach(k=>{ const d=map.distance(latlng,nodes[k]); if(d<bd){bd=d;bk=k;} }); return bk; }
function attach(graph,coord,kN=3){ const p=key(coord); if(graph.nodes[p]) return p; graph.nodes[p]=coord; graph.adj[p]=new Map(); const others=Object.keys(graph.nodes).filter(x=>x!==p).map(x=>({k:x,d:map.distance(coord,graph.nodes[x])})).sort((a,b)=>a.d-b.d); for(let i=0;i<Math.min(kN,others.length);i++){ graph.adj[p].set(others[i].k,others[i].d); graph.adj[others[i].k].set(p,others[i].d); } return p; }


async function fetchOSM(){ const s=B[0],w=B[1],n=B[2],e=B[3]; const q=`[out:json][timeout:25];(way["highway"~"footway|path|pedestrian|track|steps"](${s},${w},${n},${e}););out geom;`; try{ const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:q,headers:{'Content-Type':'text/plain'}}); if(!r.ok) throw 0; const js=await r.json(); return js.elements.filter(x=>x.type==='way'&&x.geometry).map(w=>w.geometry.map(g=>[g.lat,g.lon])); }catch(e){ console.warn('OSM fail',e); return null; } }

(async()=>{
  let paths = await fetchOSM(); if(!paths){ paths = [ [[12.12695,-86.26905],[12.12650,-86.26935],[12.12615,-86.26970]], [[12.12615,-86.26970],[12.12595,-86.27005],[12.12570,-86.27045]] ]; console.warn('fallback used'); }
  const G = build(paths); linkClose(G.nodes,G.adj,6);

  
  const markers = lugares.map((l,i)=>({id:i,name:l[0],coords:l[1],m:L.marker(l[1],{icon:I}).addTo(map).bindPopup(`<b>${l[0]}</b>`) }));
 
  markers.forEach(p=>{ const n=nearest(G.nodes,p.coords); if(!n || map.distance(p.coords,G.nodes[n])>25) attach(G,p.coords,3); });

  let sel=[], route=null;
  markers.forEach(item=>item.m.on('click', ()=>{
    if(sel.length>=2){ sel.forEach(i=>markers[i].m.setIcon(I)); sel=[]; if(route) map.removeLayer(route); const ri=document.getElementById('route-info'); if(ri) ri.style.display='none'; }
    sel.push(item.id); markers[item.id].m.openPopup(); markers[item.id].m.setIcon(L.icon({iconUrl:'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',iconSize:[30,48],iconAnchor:[15,48]}));
    if(sel.length===2){
      const A=nearest(G.nodes,markers[sel[0]].coords), B=nearest(G.nodes,markers[sel[1]].coords);
      if(!A||!B){ alert('No hay vértices'); return; }
      const keys=dijkstra(G.adj,A,B); if(!keys.length){ alert('Ruta no disponible'); return; }
      const ll=keys.map(k0=>G.nodes[k0]); if(route) map.removeLayer(route); route=L.polyline(ll,{color:'#1976d2',weight:6,opacity:0.96}).addTo(map);
      let t=0; for(let i=1;i<ll.length;i++) t+=map.distance(ll[i-1],ll[i]);
      const ri=document.getElementById('route-info'); if(ri){ ri.style.display='block'; ri.innerHTML=`<b>${markers[sel[0]].name}</b> → <b>${markers[sel[1]].name}</b><br>Dist: ${(t/1000).toFixed(2)} km`; }
      map.fitBounds(L.latLngBounds(ll),{padding:[60,60]});
    }
  }));

  // search
  const si=document.getElementById('search-input'), sb=document.getElementById('search-btn');
  if(sb&&si) sb.onclick=()=>{ const q=si.value.trim().toLowerCase(); if(!q) return; const f=markers.find(m=>m.name.toLowerCase().includes(q)); if(f){ map.setView(f.coords,19); f.m.openPopup(); } else alert('No encontrado'); };

  // menu
  const menu=document.getElementById('menu-btn'); if(menu) menu.onclick=()=>document.getElementById('sidebar').classList.toggle('open');
  const c=document.getElementById('center-btn'); if(c) c.onclick=()=>map.fitBounds([SW,NE]);
})();
