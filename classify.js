/* Shared by the page (index.html) and the data build script (scripts/build-data.cjs).
   Sorts one OpenStreetMap way into a bike infrastructure category from its tags. */
(function(root){
const STREET=/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|crescent|cres|parkway|pkwy)\.?(\s+(north|south|east|west|n|s|e|w|nw|ne|sw|se))?$/i;
const PHYS=/^(kerb|bollard|flex_?post|vertical_panel|planter|jersey_barrier|guard_rail|fence|wall|parking_lane|separation_kerb|bump|grass_verge|tree_row)/;
const RANK={protected:4,buffered:3,painted:2,shared:1};
function classify(t){
 const hw=t.highway||'';
 if(hw==='cycleway'){
  if(t.is_sidepath==='yes'||t.cycleway==='track'||t.cycleway==='sidepath'||STREET.test(t.name||''))return 'protected';
  if((t.foot==='designated'||t.foot==='yes')&&t.segregated!=='yes')return 'multiuse';
  return 'path';
 }
 if(/^(path|footway|pedestrian|track|bridleway|service)$/.test(hw)&&/^(designated|yes)$/.test(t.bicycle||'')&&!/^(lane|track|shared_lane)/.test(t.cycleway||''))return 'multiuse';
 let best=null;
 for(const k of ['cycleway','cycleway:both','cycleway:left','cycleway:right']){
  const v=t[k];if(!v)continue;let c=null;
  if(/^(track|opposite_track)$/.test(v))c='protected';
  else if(/^(lane|opposite_lane)$/.test(v)){
   const extra=Object.keys(t).filter(x=>(x.startsWith(k+':')||k==='cycleway'&&x.startsWith('cycleway:both:'))&&/(separation|buffer)/.test(x)).map(x=>t[x]).filter(x=>x&&x!=='no');
   c=extra.some(x=>PHYS.test(x))?'protected':extra.length?'buffered':'painted';
  }
  else if(/^(shared_lane|share_busway|opposite_share_busway|shared)$/.test(v))c='shared';
  if(c&&(!best||RANK[c]>RANK[best]))best=c;
 }
 return best;
}
const CITIES={
 toronto:{name:'Toronto',bbox:[43.581, -79.639, 43.855, -79.115],center:[43.6629, -79.3957],zoom:13},
 montreal:{name:'Montréal',bbox:[45.4, -73.98, 45.71, -73.47],center:[45.5017, -73.5673],zoom:13},
 vancouver:{name:'Vancouver (with Burnaby and Richmond)',bbox:[49.1, -123.27, 49.36, -122.85],center:[49.2827, -123.1207],zoom:13},
 calgary:{name:'Calgary',bbox:[50.84, -114.32, 51.21, -113.86],center:[51.0447, -114.0719],zoom:13},
 edmonton:{name:'Edmonton',bbox:[53.395, -113.714, 53.716, -113.271],center:[53.5444, -113.4909],zoom:13},
 ottawa:{name:'Ottawa–Gatineau',bbox:[45.25, -75.95, 45.55, -75.45],center:[45.4215, -75.6972],zoom:13},
 winnipeg:{name:'Winnipeg',bbox:[49.71, -97.35, 49.99, -96.95],center:[49.8951, -97.1384],zoom:13},
 quebec:{name:'Québec City',bbox:[46.73, -71.45, 46.92, -71.13],center:[46.8139, -71.208],zoom:13},
 hamilton:{name:'Hamilton',bbox:[43.17, -80.05, 43.32, -79.7],center:[43.2557, -79.8711],zoom:13},
 mississauga:{name:'Mississauga',bbox:[43.47, -79.81, 43.74, -79.54],center:[43.589, -79.6441],zoom:13},
 kitchener:{name:'Kitchener–Waterloo–Cambridge',bbox:[43.33, -80.62, 43.53, -80.25],center:[43.4516, -80.4925],zoom:13},
 london:{name:'London, ON',bbox:[42.88, -81.39, 43.07, -81.12],center:[42.9849, -81.2453],zoom:13},
 halifax:{name:'Halifax',bbox:[44.58, -63.7, 44.72, -63.48],center:[44.6488, -63.5752],zoom:13},
 victoria:{name:'Victoria',bbox:[48.4, -123.48, 48.52, -123.29],center:[48.4284, -123.3656],zoom:13},
 saskatoon:{name:'Saskatoon',bbox:[52.06, -106.78, 52.21, -106.53],center:[52.1332, -106.67],zoom:13},
 regina:{name:'Regina',bbox:[50.38, -104.73, 50.52, -104.51],center:[50.4452, -104.6189],zoom:13},
 stjohns:{name:"St. John's",bbox:[47.48, -52.85, 47.63, -52.65],center:[47.5615, -52.7126],zoom:13}
};
function query(b){const bb=b.join(',');const L1='lane|opposite_lane|track|opposite_track|shared_lane|share_busway|opposite_share_busway';
 return `[out:json][timeout:150];(way["highway"="cycleway"](${bb});way["highway"~"^(path|footway|pedestrian|track|bridleway)$"]["bicycle"~"^(designated|yes)$"](${bb});way["cycleway"~"^(${L1})$"](${bb});way["cycleway:both"~"^(${L1})$"](${bb});way["cycleway:left"~"^(${L1})$"](${bb});way["cycleway:right"~"^(${L1})$"](${bb}););out tags geom qt;`}
root.classifyBikeWay=classify;root.bikeQuery=query;root.BIKE_CITIES=CITIES;
if(typeof module!=='undefined')module.exports={classify,query,CITIES};
})(typeof globalThis!=='undefined'?globalThis:this);
