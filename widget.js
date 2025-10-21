/* Optimized LiveMatchesWidget */
class LiveMatchesWidget {
  constructor(opts = {}) {
    this.matches = []; this.filteredMatches = []; this.currentViewMode = 'timing';
    this.uniqueMatchIds = new Set(); this.resizeTimer = null; this.currentDayOffset = 0;
    this.lazyLoadLimit = opts.lazyLoadLimit || 10; this.visibleMatches = {};
    this.tickInterval = null; this.lastKnownDate = new Date(); this.debug = !!opts.debug;
    this.$root = null; this.$containers = {};
  }
  init() {
    this.$root = document.getElementById('live-matches-widget'); if (!this.$root) return;
    this.extractMatches(); this.resetLazyLoading(); this.renderWidget(); this.cacheContainers();
    this.attachDelegatedListeners(); this.updateAllDisplays();
    this.tickInterval = setInterval(() => this.updateAllDisplays(), 30000);
    window.addEventListener('resize', () => { clearTimeout(this.resizeTimer); this.resizeTimer = setTimeout(() => this.updateAllDisplays(), 250); }, { passive: true });
    window.addEventListener('error', this.onGlobalError.bind(this), true);
  }
  onGlobalError(e) {
    const tgt = e.target; if (tgt && tgt.tagName === 'IMG') { tgt.removeEventListener('error', this.onGlobalError); tgt.src = 'https://via.placeholder.com/80/1a1a1a/ffffff?text=TEAM'; }
  }
  extractMatches() {
    const matchContainers = document.querySelectorAll('.match-data-container'); this.matches.length = 0; this.uniqueMatchIds.clear();
    matchContainers.forEach(container => container.querySelectorAll('.match-data').forEach(el => {
      const id = el.getAttribute('data-id'); if (!id || this.uniqueMatchIds.has(id)) return; this.uniqueMatchIds.add(id);
      const m = { id, team1: el.getAttribute('data-team1')||'', team2: el.getAttribute('data-team2')||'', logo1: el.getAttribute('data-logo1')||'', logo2: el.getAttribute('data-logo2')||'', score: el.getAttribute('data-score')||'0 - 0', startTime: el.getAttribute('data-start'), endTime: el.getAttribute('data-end'), broadcast: (el.getAttribute('data-broadcast')||'').split(',').map(s=>s.trim()).filter(Boolean), type: el.getAttribute('data-type')||'Friendly', streamUrl: el.getAttribute('data-stream')||'#', status:'upcoming', minute:'' };
      if (m.team1 && m.team2 && m.startTime) this.matches.push(m);
    }));
  }
  resetLazyLoading() { this.visibleMatches = { 'all-matches-list': this.lazyLoadLimit, 'live-matches-list': this.lazyLoadLimit, 'upcoming-matches-list': this.lazyLoadLimit, 'finished-matches-list': this.lazyLoadLimit }; }
  getDayDisplayName(offset=0){ const t=new Date(); t.setDate(t.getDate()+offset); return t.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
  generateWidgetHTML(){ const today=this.getDayDisplayName(this.currentDayOffset); return `
  <div class="live-matches-container">
    <h2 class="boxstitle">Football Matches</h2>
    <div class="current-date-display">${today}</div>
    <div class="day-tabs" aria-label="Day selector">
      <button class="day-tab ${this.currentDayOffset===-1?'active':''}" data-day="-1">Yesterday</button>
      <button class="day-tab ${this.currentDayOffset===0?'active':''}" data-day="0">Today</button>
      <button class="day-tab ${this.currentDayOffset===1?'active':''}" data-day="1">Tomorrow</button>
    </div>
    <div class="view-mode-selector">
      <button class="view-mode-btn ${this.currentViewMode==='timing'?'active':''}" data-mode="timing">Sort by Time</button>
      <button class="view-mode-btn ${this.currentViewMode==='league'?'active':''}" data-mode="league">Group by League</button>
    </div>
    <div class="live-matches-tabs">
      <button class="live-matches-tab active" data-tab="all">All Matches</button>
      <button class="live-matches-tab" data-tab="live">Live Now</button>
      <button class="live-matches-tab" data-tab="upcoming">Upcoming</button>
      <button class="live-matches-tab" data-tab="finished">Finished</button>
    </div>
    <div class="live-matches-section active" id="all-matches-section" data-section="all">
      <h2 class="live-matches-section-title">All Matches</h2>
      <div class="live-matches-list" id="all-matches-list"><div class="loading"><div class="loading-spinner"></div><div>Loading matches...</div></div></div>
      <div class="lazy-load-container" id="all-lazy-load"></div>
    </div>
    <div class="live-matches-section" id="live-matches-section" data-section="live">
      <h2 class="live-matches-section-title">Live Matches <span class="live-indicator">LIVE</span></h2>
      <div class="live-matches-list" id="live-matches-list"></div><div class="lazy-load-container" id="live-lazy-load"></div>
    </div>
    <div class="live-matches-section" id="upcoming-matches-section" data-section="upcoming">
      <h2 class="live-matches-section-title">Upcoming Matches</h2>
      <div class="live-matches-list" id="upcoming-matches-list"></div><div class="lazy-load-container" id="upcoming-lazy-load"></div>
    </div>
    <div class="live-matches-section" id="finished-matches-section" data-section="finished">
      <h2 class="live-matches-section-title">Finished Matches</h2>
      <div class="live-matches-list" id="finished-matches-list"></div><div class="lazy-load-container" id="finished-lazy-load"></div>
    </div>
  </div>`; }
  renderWidget(){ const work=()=>{ this.$root.innerHTML=this.generateWidgetHTML(); this.cacheContainers(); }; if('requestIdleCallback' in window) requestIdleCallback(work,{timeout:500}); else setTimeout(work,0); }
  cacheContainers(){ if(!this.$root) return; this.$containers={ allList: this.$root.querySelector('#all-matches-list'), liveList: this.$root.querySelector('#live-matches-list'), upcomingList: this.$root.querySelector('#upcoming-matches-list'), finishedList: this.$root.querySelector('#finished-matches-list'), dateDisplay: this.$root.querySelector('.current-date-display') }; }
  attachDelegatedListeners(){
    this.$root.addEventListener('click', (e)=>{ const btn=e.target.closest('button'); if(!btn) return;
      if(btn.classList.contains('day-tab')){ const off=parseInt(btn.getAttribute('data-day'),10); if(!Number.isNaN(off)&&off!==this.currentDayOffset){ this.currentDayOffset=off; this.resetLazyLoading(); this.updateAllDisplays(); } return; }
      if(btn.classList.contains('view-mode-btn')){ const mode=btn.getAttribute('data-mode'); if(mode&&mode!==this.currentViewMode){ this.currentViewMode=mode; Array.from(this.$root.querySelectorAll('.view-mode-btn')).forEach(b=>b.classList.toggle('active',b===btn)); this.updateAllDisplays(); } return; }
      if(btn.classList.contains('live-matches-tab')){ const tab=btn.getAttribute('data-tab'); Array.from(this.$root.querySelectorAll('.live-matches-tab')).forEach(b=>b.classList.toggle('active',b===btn)); Array.from(this.$root.querySelectorAll('.live-matches-section')).forEach(sec=>sec.classList.toggle('active',sec.getAttribute('data-section')===tab)); return; }
      if(btn.classList.contains('load-more-btn')){ const containerId=btn.getAttribute('data-container'); this.visibleMatches[containerId]=(this.visibleMatches[containerId]||this.lazyLoadLimit)+this.lazyLoadLimit; this.updateAllDisplays(); return; }
    }, { passive: true });
    this.$root.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&e.target&&e.target.classList.contains('day-tab')) e.target.click(); });
  }
  updateAllDisplays(){
    const now=new Date(); if(now.toDateString()!==this.lastKnownDate.toDateString()){ this.lastKnownDate=now; if(this.currentDayOffset!==0) this.currentDayOffset=0; }
    this.filterMatchesForDay(this.currentDayOffset);
    const categorized={ all:[], live:[], upcoming:[], finished:[] }; const isMobile=window.innerWidth<=768;
    for(let i=0;i<this.filteredMatches.length;i++){ const match=this.filteredMatches[i]; const start=new Date(match.startTime); const end=new Date(match.endTime||match.startTime); const toStart=(start-now)/60000; const toEnd=(end-now)/60000; match.displayTime=this.formatDisplayTime(start);
      if(toStart<=0 && toEnd>0){ match.status='live'; match.minute=Math.min(90,Math.max(1,Math.floor((now-start)/60000)))+"'"; categorized.live.push(match);
      } else if(toStart>0){ match.status = toStart<=30 ? 'soon' : 'upcoming'; match.minute = toStart<=30 ? 'SOON' : ''; categorized.upcoming.push(match);
      } else { match.status='finished'; match.minute='FT'; categorized.finished.push(match); }
      categorized.all.push(match);
    }
    const sortByStart=(a,b)=>new Date(a.startTime)-new Date(b.startTime); Object.keys(categorized).forEach(k=>categorized[k].sort(sortByStart));
    if(this.currentViewMode==='league') this.renderGroupedMatchesSection('all-matches-list',categorized.all); else this.renderMatchesSectionWithLazyLoad('all-matches-list',categorized.all,isMobile);
    this.renderMatchesSectionWithLazyLoad('live-matches-list',categorized.live,isMobile);
    this.renderMatchesSectionWithLazyLoad('upcoming-matches-list',categorized.upcoming,isMobile);
    this.renderMatchesSectionWithLazyLoad('finished-matches-list',categorized.finished,isMobile);
    this.updateSectionVisibility({ live:categorized.live.length, upcoming:categorized.upcoming.length, finished:categorized.finished.length });
    if(this.$containers.dateDisplay) this.$containers.dateDisplay.textContent=this.getDayDisplayName(this.currentDayOffset);
    Array.from(this.$root.querySelectorAll('.day-tab')).forEach(tab=>tab.classList.toggle('active',parseInt(tab.dataset.day,10)===this.currentDayOffset));
    if(typeof updateStreamInfo==='function') updateStreamInfo();
  }
  filterMatchesForDay(dayOffset) {
    const now=new Date(); const target=new Date(now); target.setDate(now.getDate()+dayOffset);
    const startOfDay=new Date(target.getFullYear(),target.getMonth(),target.getDate(),0,0,0,0);
    const endOfDay=new Date(target.getFullYear(),target.getMonth(),target.getDate(),23,59,59,999);
    this.filteredMatches=this.matches.filter(m=>{ const s=new Date(m.startTime); return s>=startOfDay&&s<=endOfDay; });
    this.resetLazyLoading();
  }
  renderMatchesSectionWithLazyLoad(containerId,matches,isMobile=false){
    const container=document.getElementById(containerId); const lazy=document.getElementById(containerId.replace('-list','-lazy-load')); if(!container) return;
    if(!matches||matches.length===0){ container.innerHTML='<div class="no-matches">No matches found in this category</div>'; if(lazy) lazy.innerHTML=''; return; }
    const limit=this.visibleMatches[containerId]||this.lazyLoadLimit; const toShow=matches.slice(0,limit);
    container.innerHTML=toShow.map(m=>this.createMatchCard(m,isMobile)).join('');
    if(lazy){ if(matches.length>limit) lazy.innerHTML=`<button class="load-more-btn" data-container="${containerId}">Load More Matches (${limit}/${matches.length})</button>`; else lazy.innerHTML=''; }
  }
  renderGroupedMatchesSection(containerId,matches){ const container=document.getElementById(containerId); if(!container) return; if(!matches||matches.length===0){ container.innerHTML='<div class="no-matches">No matches found in this category</div>'; return; }
    const groups=matches.reduce((acc,m)=>{ const k=(m.type||'UNKNOWN').toUpperCase(); (acc[k]||(acc[k]=[])).push(m); return acc; },{});
    const keys=Object.keys(groups).sort(); let html=''; keys.forEach(k=>{ groups[k].sort((a,b)=>new Date(a.startTime)-new Date(b.startTime)); html+=`<div class="league-group"><div class="league-group-header">${this.getLeagueDisplayName(k)}</div><div class="league-group-matches">`; html+=groups[k].map(m=>this.createMatchCard(m,window.innerWidth<=768)).join(''); html+='</div></div>'; }); container.innerHTML=html;
  }
  getLeagueDisplayName(type){ const map={'FRIENDLY':'International Friendly','WCQ':'World Cup Qualifiers','UCL':'UEFA Champions League','UEL':'UEFA Europa League','PL':'Premier League','LALIGA':'La Liga','SERIEA':'Serie A','BUNDESLIGA':'Bundesliga','LIGUE1':'Ligue 1'}; return map[type]||type; }
  createMatchCard(match,isMobile=false){
    const statusClass=`status-${match.status}`; const statusText=(match.status||'').toUpperCase(); const broadcastHTML=(match.broadcast||[]).map(b=>`<div class="broadcast-item">${b}</div>`).join('');
    const img1=`<img loading="lazy" src="${match.logo1}" alt="${match.team1}" />`; const img2=`<img loading="lazy" src="${match.logo2}" alt="${match.team2}" />`;
    if(isMobile){ const [s1='0',s2='0']=(match.score||'0 - 0').split(' - '); return `<div class="match-event" data-match-id="${match.id}" data-status="${match.status}"><div class="match-header"><div class="match-title">${match.team1} vs ${match.team2}</div><span class="match-type ${match.type.replace(/\s+/g,'-').toLowerCase()}">${match.type.toUpperCase()}</span></div><div class="match-content"><a href="${match.streamUrl}" class="match-link" title="Watch ${match.team1} vs ${match.team2}"></a><div class="team-container"><div class="team"><div class="team-logo">${img1}</div><div class="team-name">${match.team1}</div><div class="team-score">${s1}</div></div><div class="match-info"><div class="match-time">${match.displayTime}</div><div class="match-score">${match.score}</div><div class="match-status ${statusClass}">${statusText}</div>${match.minute?`<div class="match-minute">${match.minute}</div>`:''}</div><div class="team"><div class="team-score">${s2}</div><div class="team-name">${match.team2}</div><div class="team-logo">${img2}</div></div></div></div><div class="match-footer"><div class="match-broadcast">${broadcastHTML}</div></div></div>`; }
    return `<div class="match-event" data-match-id="${match.id}" data-status="${match.status}"><div class="match-header"><div class="match-title">${match.team1} vs ${match.team2}</div><span class="match-type ${match.type.replace(/\s+/g,'-').toLowerCase()}">${match.type.toUpperCase()}</span></div><div class="match-content"><a href="${match.streamUrl}" class="match-link" title="Watch ${match.team1} vs ${match.team2}"></a><div class="team-container"><div class="team"><div class="team-logo">${img1}</div><div class="team-name">${match.team1}</div></div><div class="match-info"><div class="match-time">${match.displayTime}</div><div class="match-score">${match.score}</div><div class="match-status ${statusClass}">${statusText}</div>${match.minute?`<div class="match-minute">${match.minute}</div>`:''}</div><div class="team"><div class="team-logo">${img2}</div><div class="team-name">${match.team2}</div></div></div></div><div class="match-footer"><div class="match-broadcast">${broadcastHTML}</div></div></div>`; }
  formatDisplayTime(date){ const d=new Date(date); let h=d.getHours(); const mins=d.getMinutes(); const ampm=h>=12?'PM':'AM'; h=h%12||12; const m=mins<10?'0'+mins:mins; return `${h}:${m} ${ampm}`; }
  updateSectionVisibility(counts){ const live=document.getElementById('live-matches-section'); const up=document.getElementById('upcoming-matches-section'); const fin=document.getElementById('finished-matches-section'); if(live){ live.style.display=counts.live>0?'block':'none'; const li=live.querySelector('.live-indicator'); if(li) li.style.display=counts.live>0?'inline-flex':'none'; } if(up) up.style.display=counts.upcoming>0?'block':'none'; if(fin) fin.style.display=counts.finished>0?'block':'none'; }
  getFirstFilteredMatch(){ return (this.filteredMatches&&this.filteredMatches.length)?this.filteredMatches[0]:null; }
  destroy(){ if(this.tickInterval) clearInterval(this.tickInterval); window.removeEventListener('error', this.onGlobalError); }
}

/* Stream info integration (uses widget getter) */
function updateStreamInfo(){
  if(window.liveMatchesWidgetInstance instanceof LiveMatchesWidget){
    const widget=window.liveMatchesWidgetInstance; const match=widget.getFirstFilteredMatch(); const infoCard=document.querySelector('.info-card');
    if(infoCard && match){ infoCard.innerHTML=`<h4>Stream Details</h4><p><strong>Match:</strong> ${match.team1} vs ${match.team2}</p><p><strong>Competition:</strong> ${match.type}</p><p><strong>Kick-off:</strong> ${match.displayTime}</p><p><strong>Status:</strong> <span id="matchStatus">${(match.status||'').charAt(0).toUpperCase()+(match.status||'').slice(1)}</span></p>`; return; }
  }
  updateStreamInfoFromPage();
}
function updateStreamInfoFromPage(){ const infoCard=document.querySelector('.info-card'); if(!infoCard) return; const pageTitle=document.title||''; let teams='Nottingham Forest vs Chelsea'; if(pageTitle.includes(' vs ')) teams=pageTitle.split(' vs ').slice(0,2).join(' vs '); infoCard.innerHTML=`<h4>Stream Details</h4><p><strong>Match:</strong> ${teams}</p><p><strong>Competition:</strong> Premier League</p><p><strong>Kick-off:</strong> 12:30 GMT</p><p><strong>Status:</strong> <span id="matchStatus">Live</span></p>`; }
function initializeStreamInfoIntegration(){ const start=Date.now(); const checker=setInterval(()=>{ if(window.liveMatchesWidgetInstance){ clearInterval(checker); updateStreamInfo(); setInterval(updateStreamInfo,30000); } else if(Date.now()-start>10000){ clearInterval(checker); updateStreamInfoFromPage(); } },1000); }

/* Init on DOM ready */
document.addEventListener('DOMContentLoaded', ()=>{ const widget=new LiveMatchesWidget({ lazyLoadLimit: 10, debug: false }); widget.init(); window.liveMatchesWidgetInstance = widget; initializeStreamInfoIntegration(); });
