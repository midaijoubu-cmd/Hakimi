
const {createApp}=Vue;

createApp({
data:()=>({
TMDB_KEY:"e128a499e22b91c343ea0b52f1a3271a",
TMDB:"https://api.themoviedb.org/3",
IMAGE:"https://image.tmdb.org/t/p/w500",
KITSU:"https://kitsu.io/api/edge",
WATCH_KEY:"wm_fm4L5b8jdw9i6Em9IZG_QPo016xFOjwdXGuOdal2kUc",
WATCH:"https://api.watchmode.com/v1",

navigation:[{label:"Movies",value:"movie"},{label:"TV Shows",value:"tv"},{label:"Anime",value:"anime"}],
currentType:"movie",search:"",selectedGenre:"all",currentPage:1,totalPages:1,
items:[],genreList:[],loading:false,errorMessage:"",
showModal:false,detailLoading:false,selectedItem:null,selectedActor:null,
cast:[],characters:[],actorCredits:[],trailerKey:null,
characterOffset:0,characterLimit:20,characterTotal:0,characterHasMore:false,
characterLoadingMore:false,characterLoading:false,
watchSources:[],watchLoading:false,watchMessage:"Select a title to check availability.",
searchHistory:JSON.parse(localStorage.getItem("movieSearchHistory")||"[]"),
heroBackgrounds:[],heroIndex:0,heroTimer:null
}),

computed:{
sectionTitle(){return{movie:"Popular Movies",tv:"Popular TV Shows",anime:"Popular Anime"}[this.currentType]},
visiblePages(){
let s=Math.max(1,this.currentPage-2),e=Math.min(this.totalPages,s+4);
s=Math.max(1,e-4);
return Array.from({length:e-s+1},(_,i)=>s+i)
}
},

mounted(){
this.loadGenres();
this.loadContent();
this.loadHeroBackgrounds();
this.heroTimer=setInterval(()=>{
if(this.heroBackgrounds.length>1)this.heroIndex=(this.heroIndex+1)%this.heroBackgrounds.length;
},5000);
},

beforeUnmount(){clearInterval(this.heroTimer)},

methods:{
scrollToContent(){document.getElementById("main-content").scrollIntoView({behavior:"smooth"})},

async changeType(t){
this.currentType=t;this.search="";this.selectedGenre="all";this.currentPage=1;this.errorMessage="";
await this.loadHeroBackgrounds();await this.loadGenres();await this.loadContent();
},

async loadHeroBackgrounds(){
const selectedType=this.currentType;
this.heroBackgrounds=[];this.heroIndex=0;
try{
let images=[];
if(selectedType==="movie"||selectedType==="tv"){
const d=await this.tmdbRequest("/"+selectedType+"/popular?page=1");
images=(d.results||[]).filter(x=>x.backdrop_path).map(x=>"https://image.tmdb.org/t/p/original"+x.backdrop_path);
}else{
const d=await this.kitsuRequest("/anime?page[limit]=20&sort=-userCount");
images=(d.data||[]).map(x=>x.attributes?.coverImage?.original||x.attributes?.posterImage?.original).filter(Boolean);
}
if(this.currentType===selectedType)this.heroBackgrounds=images;
}catch(e){console.error("Hero background error:",e)}
},

async changePage(p){
if(p<1||p>this.totalPages)return;
this.currentPage=p;await this.loadContent();
document.getElementById("main-content").scrollIntoView({behavior:"smooth"});
},

getTitle(i){
if(typeof i.title==="object"&&i.title)return i.title.english||i.title.romaji||"Untitled";
return i.title||i.name||i.attributes?.canonicalTitle||"Untitled";
},
getYear(i){
return i.release_date?.slice(0,4)||i.first_air_date?.slice(0,4)||i.startDate?.year||i.attributes?.startDate?.slice(0,4)||"N/A";
},
getRating(i){
if(i.vote_average!==undefined)return Number(i.vote_average).toFixed(1);
if(i.averageScore!==undefined)return(Number(i.averageScore)/10).toFixed(1);
if(i.attributes?.averageRating)return(Number(i.attributes.averageRating)/10).toFixed(1);
return"N/A";
},
getType(i){return{movie:"Movie",tv:"TV Show",anime:"Anime"}[i.media_type]||this.currentType},
poster(i){
return i.coverImage?.extraLarge||i.attributes?.posterImage?.large||(i.poster_path?this.IMAGE+i.poster_path:"https://placehold.co/500x750/151515/ffffff?text=No+Poster");
},
personImage(p){return p?this.IMAGE+p:"https://placehold.co/300x450/202020/ffffff?text=No+Image"},

async tmdbRequest(e){
let r=await fetch(this.TMDB+e+(e.includes("?")?"&":"?")+"api_key="+this.TMDB_KEY);
if(!r.ok)throw Error("TMDB error: "+r.status);
return r.json();
},
async kitsuRequest(e){
let r=await fetch(this.KITSU+e,{headers:{"Accept":"application/vnd.api+json"}});
if(!r.ok)throw Error("Kitsu API error: "+r.status);
return r.json();
},

async loadGenres(){
if(this.currentType==="anime"){
this.genreList=["Action","Adventure","Comedy","Drama","Fantasy","Horror","Romance","Science Fiction"].map(g=>({id:g,name:g==="Science Fiction"?"Sci-Fi":g}));
this.genreList.unshift({id:"all",name:"All Anime"});return;
}
try{this.genreList=(await this.tmdbRequest("/genre/"+this.currentType+"/list?language=en-US")).genres||[]}catch(e){console.error(e)}
},

async loadContent(){
this.loading=true;this.errorMessage="";this.items=[];
try{await(this.currentType==="anime"?this.loadAnime():this.loadTMDB())}
catch(e){console.error(e);this.errorMessage=e.message||"Unable to load content. Check your API or internet connection."}
finally{this.loading=false}
},

async loadTMDB(){
let t=this.currentType;
let e=this.search.trim()?"/search/"+t+"?query="+encodeURIComponent(this.search.trim()):"/discover/"+t+"?sort_by=popularity.desc";
let d=await this.tmdbRequest(e+"&page="+this.currentPage),r=d.results||[];
if(this.selectedGenre!=="all")r=r.filter(x=>(x.genre_ids||[]).includes(Number(this.selectedGenre)));
this.items=r.map(x=>({...x,media_type:t}));
this.totalPages=Math.min(d.total_pages||1,500);
},

async loadAnime(){
let l=20,o=(this.currentPage-1)*l;
let p=new URLSearchParams({"page[limit]":l,"page[offset]":o,sort:"-userCount",include:"categories"});
if(this.search.trim())p.set("filter[text]",this.search.trim());
let d=await this.kitsuRequest("/anime?"+p),inc=d.included||[];
let r=(d.data||[]).map(a=>{
let ids=(a.relationships?.categories?.data||[]).map(c=>c.id);
let genres=inc.filter(c=>c.type==="categories"&&ids.includes(c.id)).map(c=>c.attributes?.title).filter(Boolean);
return{id:a.id,title:a.attributes?.canonicalTitle||"Untitled",attributes:a.attributes,genres,media_type:"anime"};
});
if(this.selectedGenre!=="all")r=r.filter(a=>a.genres.some(g=>g.toLowerCase()===String(this.selectedGenre).toLowerCase()));
this.items=r;this.totalPages=Math.max(1,Math.ceil(Number(d.meta?.count||0)/l));
},

async searchContent(){
this.currentPage=1;
if(this.search.trim())this.addHistory(this.search.trim());
await this.loadContent();
},
addHistory(v){
this.searchHistory=[v,...this.searchHistory.filter(x=>x.toLowerCase()!==v.toLowerCase())].slice(0,8);
localStorage.setItem("movieSearchHistory",JSON.stringify(this.searchHistory));
},
useHistory(v){this.search=v;this.searchContent()},
clearHistory(){this.searchHistory=[];localStorage.removeItem("movieSearchHistory")},

async openDetails(i){
this.showModal=true;this.detailLoading=true;this.selectedActor=null;this.selectedItem=null;
this.cast=[];this.characters=[];this.actorCredits=[];this.trailerKey=null;this.watchSources=[];
this.characterOffset=0;this.characterTotal=0;this.characterHasMore=false;this.characterLoadingMore=false;this.characterLoading=false;
try{await(i.media_type==="anime"?this.loadKitsuDetails(i.id):this.loadTMDBDetails(i))}
catch(e){console.error(e)}finally{this.detailLoading=false}
},

async loadTMDBDetails(i){
let t=i.media_type||this.currentType;
let d=await this.tmdbRequest("/"+t+"/"+i.id+"?language=en-US&append_to_response=credits,videos,external_ids");
this.selectedItem={...d,media_type:t};
this.cast=(d.credits?.cast||[]).slice(0,18);
let v=d.videos?.results||[];
let tr=v.find(x=>x.site==="YouTube"&&x.type==="Trailer"&&x.official)||v.find(x=>x.site==="YouTube"&&x.type==="Trailer");
this.trailerKey=tr?.key||null;
await this.loadWatchAvailability(this.selectedItem);
},

async loadKitsuDetails(id){
let d=await this.kitsuRequest("/anime/"+id+"?include=categories"),a=d.data;
if(!a)throw Error("Anime not found.");
let x=a.attributes||{},inc=d.included||[];
let ids=(a.relationships?.categories?.data||[]).map(c=>c.id);
let genres=inc.filter(c=>c.type==="categories"&&ids.includes(c.id)).map(c=>c.attributes?.title).filter(Boolean);
this.selectedItem={id:a.id,title:x.canonicalTitle,description:x.synopsis,attributes:x,genres,episodes:x.episodeCount,averageScore:x.averageRating?Number(x.averageRating):null,media_type:"anime"};
this.trailerKey=x.youtubeVideoId||null;
await this.loadInitialCharacters(id);
},

async loadInitialCharacters(id){
this.characterLoading=true;this.characters=[];this.characterOffset=0;this.characterLimit=20;this.characterHasMore=false;
try{
this.processCharacters(await this.kitsuRequest("/anime/"+id+"/characters?page[limit]="+this.characterLimit+"&page[offset]=0&include=character"));
}catch(e){console.warn("Kitsu character data unavailable:",e);this.characters=[];this.characterHasMore=false}
finally{this.characterLoading=false}
},

processCharacters(d){
let inc=d.included||[];
let r=(d.data||[]).map(c=>{
let rel=c.relationships?.character?.data,x=inc.find(y=>y.id===rel?.id);
return{id:c.id,name:x?.attributes?.name||c.attributes?.name||"Anime Character",image:x?.attributes?.image?.original||x?.attributes?.image?.large||"https://placehold.co/300x450/202020/ffffff?text=Character",role:c.attributes?.role||"Character"};
});
let ids=new Set(this.characters.map(c=>c.id));
this.characters.push(...r.filter(c=>!ids.has(c.id)));
this.characterOffset+=(d.data||[]).length;this.characterTotal=Number(d.meta?.count||0);
this.characterHasMore=d.links?.next?true:this.characterTotal>0?this.characterOffset<this.characterTotal:(d.data||[]).length===this.characterLimit;
},

async loadMoreCharacters(){
if(this.characterLoadingMore||!this.characterHasMore||!this.selectedItem)return;
this.characterLoadingMore=true;
try{
let d=await this.kitsuRequest("/anime/"+this.selectedItem.id+"/characters?page[limit]="+this.characterLimit+"&page[offset]="+this.characterOffset+"&include=character");
this.processCharacters(d);
}catch(e){console.error("Unable to load more characters:",e);alert("Unable to load more characters. Please try again.")}
finally{this.characterLoadingMore=false}
},

async openActor(p){
this.detailLoading=true;this.selectedActor=null;
try{
this.selectedActor=await this.tmdbRequest("/person/"+p.id+"?language=en-US");
let d=await this.tmdbRequest("/person/"+p.id+"/combined_credits?language=en-US");
this.actorCredits=(d.cast||[]).filter(x=>x.poster_path).sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,20);
}catch(e){console.error(e)}
finally{this.detailLoading=false}
},

backToDetails(){this.selectedActor=null;this.actorCredits=[]},

async openActorFilm(f){
this.selectedActor=null;this.detailLoading=true;
try{
let t=f.media_type==="tv"?"tv":"movie";
let d=await this.tmdbRequest("/"+t+"/"+f.id+"?language=en-US&append_to_response=credits,videos,external_ids");
this.selectedItem={...d,media_type:t};
this.cast=(d.credits?.cast||[]).slice(0,18);
let v=d.videos?.results||[];
let tr=v.find(x=>x.site==="YouTube"&&x.type==="Trailer"&&x.official)||v.find(x=>x.site==="YouTube"&&x.type==="Trailer");
this.trailerKey=tr?.key||null;
await this.loadWatchAvailability(this.selectedItem);
this.characters=[];this.characterHasMore=false;
}catch(e){console.error(e)}
finally{this.detailLoading=false}
},

async watchRequest(e){
if(!this.WATCH_KEY)throw Error("Add your Watchmode API key in the code.");
let r=await fetch(this.WATCH+e+(e.includes("?")?"&":"?")+"apiKey="+encodeURIComponent(this.WATCH_KEY));
if(!r.ok)throw Error("Watchmode error: "+r.status);
return r.json();
},

async loadWatchAvailability(i){
this.watchSources=[];this.watchLoading=true;this.watchMessage="Searching streaming services in Malaysia...";
try{
let t=this.getTitle(i);
let d=await this.watchRequest("/search/?search_field=name&search_value="+encodeURIComponent(t));
let r=d.title_results||[];
let norm=x=>String(x||"").toLowerCase().replace(/[^a-z0-9]/g,"");
let m=r.find(x=>norm(x.name)===norm(t))||r[0];
if(!m){this.watchMessage="No matching title found.";return}
let s=await this.watchRequest("/title/"+m.id+"/sources/?regions=MY");
this.watchSources=Array.isArray(s)?s:[];
this.watchMessage=this.watchSources.length?"Available streaming services in Malaysia:":"No streaming services found in Malaysia.";
}catch(e){this.watchMessage=e.message||"Unable to load streaming availability.";console.error(e)}
finally{this.watchLoading=false}
},

closeModal(){
this.showModal=false;this.selectedItem=null;this.selectedActor=null;
this.cast=[];this.characters=[];this.actorCredits=[];this.trailerKey=null;this.watchSources=[];
this.characterOffset=0;this.characterTotal=0;this.characterHasMore=false;this.characterLoadingMore=false;this.characterLoading=false;
}
}
}).mount("#app");
