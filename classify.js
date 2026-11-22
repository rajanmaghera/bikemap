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
 toronto:{name:'Toronto',bbox:[43.581,-79.639,43.855,-79.115],center:[43.6629,-79.3957],zoom:13},
 edmonton:{name:'Edmonton',bbox:[53.395,-113.714,53.716,-113.271],center:[53.5444,-113.4909],zoom:13}
};
function query(b){const bb=b.join(',');const L1='lane|opposite_lane|track|opposite_track|shared_lane|share_busway|opposite_share_busway';
 return `[out:json][timeout:150];(way["highway"="cycleway"](${bb});way["highway"~"^(path|footway|pedestrian|track|bridleway)$"]["bicycle"~"^(designated|yes)$"](${bb});way["cycleway"~"^(${L1})$"](${bb});way["cycleway:both"~"^(${L1})$"](${bb});way["cycleway:left"~"^(${L1})$"](${bb});way["cycleway:right"~"^(${L1})$"](${bb}););out tags geom qt;`}
root.classifyBikeWay=classify;root.bikeQuery=query;root.BIKE_CITIES=CITIES;
if(typeof module!=='undefined')module.exports={classify,query,CITIES};
})(typeof globalThis!=='undefined'?globalThis:this);
