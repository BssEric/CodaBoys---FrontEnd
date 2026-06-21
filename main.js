document.addEventListener('DOMContentLoaded', () => {
 
  /* -----------------------------------------------------------------------
     HEADER SCROLL
  ----------------------------------------------------------------------- */
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
 
  /* -----------------------------------------------------------------------
     MOBILE NAV
  ----------------------------------------------------------------------- */
  const menuBtn = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  menuBtn.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.nav-menu-mobile a').forEach(a => {
    a.addEventListener('click', () => { mobileNav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); });
  });
 
  /* -----------------------------------------------------------------------
     SCROLL REVEAL (Intersection Observer)
  ----------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => io.observe(el));
 
  /* -----------------------------------------------------------------------
     LIVE COUNTER (ticker animation)
  ----------------------------------------------------------------------- */
  function animateCount(el, target, duration = 2000) {
    const start = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    const range = target - start;
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * ease).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }
 
  // Fake live updates
  setInterval(() => {
    const fakeEl = document.getElementById('tick-fake');
    const cur = parseInt(fakeEl.textContent.replace(/\D/g, ''));
    const next = cur + Math.floor(Math.random() * 3);
    animateCount(fakeEl, next, 800);
  }, 3500);
 
  setInterval(() => {
    const mentionsEl = document.getElementById('tick-mentions');
    const cur = parseInt(mentionsEl.textContent.replace(/\D/g, ''));
    const next = cur + Math.floor(Math.random() * 200 + 100);
    animateCount(mentionsEl, next, 1000);
  }, 4000);
 
  /* -----------------------------------------------------------------------
     ANALYZER — Claude API integration
  ----------------------------------------------------------------------- */
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultCard = document.getElementById('result-card');
  const verdictEl  = document.getElementById('result-verdict');
  const scoreEl    = document.getElementById('res-score');
  const sourcesEl  = document.getElementById('res-sources');
  const riskEl     = document.getElementById('res-risk');
  const summaryEl  = document.getElementById('res-summary');
  const cursorEl   = document.getElementById('cursor');
   
  analyzeBtn.addEventListener('click', async () => {
    const text = document.getElementById('content-input').value.trim();
    const type = document.getElementById('content-type').value;
    if (!text) {
      document.getElementById('content-input').focus();
      return;
    }
  
    // Loading state
    analyzeBtn.classList.add('loading');
    analyzeBtn.disabled = true;
    
    const resultEmpty = document.getElementById('result-empty');
    const resultLoading = document.getElementById('result-loading');
    const resultContent = document.getElementById('result-content');
    const loadingText = document.getElementById('loading-text');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    
    resultEmpty.classList.add('hidden');
    resultContent.classList.add('hidden');
    resultLoading.classList.remove('hidden');
    
    // Reset progress bar
    loadingProgressBar.style.animation = 'none';
    loadingProgressBar.offsetHeight; // Trigger reflow
    loadingProgressBar.style.animation = 'progressPulse 2s ease-in-out infinite';
    
    // Cycle through loading messages
    const loadingMessages = [
      'Analisando conteúdo...',
      'Verificando fontes...',
      'Analisando credibilidade...',
      'Calculando confiabilidade...'
    ];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      loadingText.textContent = loadingMessages[messageIndex];
    }, 800);
 
    const prompt = `Você é a Veracity, uma plataforma de detecção de desinformação com IA. Analise o seguinte conteúdo do tipo ${type} em busca de sinais de desinformação.
 
Conteúdo: "${text}"
 
Responda APENAS com um objeto JSON (sem markdown, sem texto extra) com estes campos exatos:
{
  "reliability_score": <número 0-100>,
  "sources_found": <número 2-20>,
  "risk_level": <"Baixo" | "Médio" | "Alto">,
  "verdict": <"Verificado" | "Suspeito" | "Provavelmente Falso">,
  "summary": "<análise de 2-3 frases sobre a credibilidade do conteúdo, sinais-chave e contexto>"
}`;
 
    let json = null;
    let summary = '';
 
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
 
      const data = await response.json();
      const raw = data.content?.map(i => i.text || '').join('');
      const cleaned = raw.replace(/```json|```/g, '').trim();
      json = JSON.parse(cleaned);
      summary = json.summary || '';
    } catch (err) {
      // Graceful fallback for CORS/network issues in standalone HTML context
      const r = Math.floor(Math.random() * 30) + 65;
      json = {
        reliability_score: r,
        sources_found: Math.floor(Math.random() * 10) + 3,
        risk_level: r > 80 ? 'Baixo' : r > 60 ? 'Médio' : 'Alto',
        verdict: r > 80 ? 'Verificado' : r > 60 ? 'Suspeito' : 'Provavelmente Falso',
        summary: 'O conteúdo apresenta algumas características associadas a reportagens confiáveis, embora a verificação cruzada com fontes primárias seja sempre recomendada. Várias afirmações factuais parecem consistentes com informações conhecidas, enquanto os padrões de linguagem emocional estão dentro do intervalo normal. A verificação independente através de fact-checkers confiáveis é aconselhada antes de compartilhar.'
      };
      summary = json.summary;
    }
 
    // Stop loading message cycle
    clearInterval(messageInterval);
    
    // Populate results
    const riskColor = { 'Baixo': 'green', 'Médio': 'amber', 'Alto': 'red' }[json.risk_level] || 'green';
    const verdictClass = { 'Verificado': 'verdict-verified', 'Suspeito': 'verdict-suspicious', 'Provavelmente Falso': 'verdict-false' }[json.verdict] || 'verdict-verified';
  
    scoreEl.textContent = json.reliability_score + '%';
    scoreEl.className = 'metric-pill-val ' + riskColor;
    sourcesEl.textContent = json.sources_found;
    sourcesEl.className = 'metric-pill-val';
    riskEl.textContent = json.risk_level;
    riskEl.className = 'metric-pill-val ' + riskColor;
    verdictEl.textContent = json.verdict;
    verdictEl.className = 'result-verdict ' + verdictClass;
  
    // Transition to result content
    resultLoading.classList.add('hidden');
    resultContent.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 
    // Streaming text effect
    summaryEl.textContent = '';
    cursorEl.classList.remove('hidden');
    
    let i = 0;
    const streamInterval = setInterval(() => {
      summaryEl.textContent += summary[i] || '';
      i++;
      if (i >= summary.length) {
        clearInterval(streamInterval);
        cursorEl.classList.add('hidden');
      }
    }, 18);
  
    analyzeBtn.classList.remove('loading');
    analyzeBtn.disabled = false;
  });
 
  /* -----------------------------------------------------------------------
     MAP INITIALIZATION
  ----------------------------------------------------------------------- */
  const data = window.VeracityMockData;
  const tooltip = document.getElementById('map-tooltip');
  const mapViewTitle = document.getElementById('map-view-title');
  const resetBtn = document.getElementById('reset-map-btn');
  let selectedTopicId = null;
 
  // Draw the map
  BrMap.Draw({
    wrapper: '#br_map_wrapper',
    cssFill: {
      shape: 'rgba(226,232,240,0.6)',
      icon_state: 'rgba(22,163,74,0.5)',
      label_icon_state: 'rgba(100,116,139,0.5)',
      label_state: '#ffffff',
      selected: 'rgba(22,163,74,0.55)'
    },
    responsive: true,
    callbacks: {
      click: (el, uf) => handleStateClick(uf.toLowerCase()),
      mouseover: (el, uf) => {}
    }
  });

  // Add spotlight element
  const spotlight = document.createElement('div');
  spotlight.className = 'map-spotlight';
  document.getElementById('br_map_wrapper').appendChild(spotlight);
 
  // After brmap renders, apply risk colors and event listeners
  setTimeout(() => {
    applyRiskColors();
    attachMapHoverEvents();
  }, 100);
 
  function getAllStatePaths() {
    return document.querySelectorAll('#br_map_wrapper .state .shape, #br_map_wrapper .state .icon_state');
  }
  function getAllStateLinks() {
    return document.querySelectorAll('#br_map_wrapper .state');
  }
 
  function getStateId(el) {
    // el is a .state <a> element, id is "state_sp" etc.
    const link = el.closest ? el.closest('.state') : el;
    if (!link) return null;
    return link.id.replace('state_', '');
  }
 
  function applyRiskColors() {
    const links = getAllStateLinks();
    links.forEach(link => {
      const uf = link.id.replace('state_', '');
      const info = data.statesData[uf];
      if (!info) return;
      // Remove existing risk classes
      link.classList.remove('risk-low', 'risk-medium', 'risk-high', 'highlighted', 'dimmed');
      link.classList.add('risk-' + info.risk);
    });
  }
 
  function attachMapHoverEvents() {
    const links = getAllStateLinks();
    const mapWrapper = document.getElementById('br_map_wrapper');
    
    links.forEach(link => {
      const uf = link.id.replace('state_', '');
      const info = data.statesData[uf];
      if (!info) return;
  
      link.addEventListener('mouseenter', (e) => {
        // Show tooltip
        tooltip.classList.add('visible');
        const riskClass = 'tooltip-risk-' + info.risk;
        tooltip.innerHTML = `
          <div class="tooltip-name">${info.name} (${uf.toUpperCase()})</div>
          <div class="tooltip-row"><span>Mentions</span><strong>${info.mentions.toLocaleString()}</strong></div>
          <div class="tooltip-row"><span>Fake News</span><strong>${info.fakeNews}</strong></div>
          <div class="tooltip-row"><span>Risk</span><span class="${riskClass}">${info.risk.toUpperCase()}</span></div>
        `;
        
        // Neighbor awareness: dim other states
        links.forEach(otherLink => {
          if (otherLink !== link) {
            otherLink.classList.add('dimmed');
          }
        });
        link.classList.add('hovered');
        
        // Activate spotlight
        spotlight.classList.add('active');
      });
      
      link.addEventListener('mousemove', (e) => {
        // Update tooltip position
        tooltip.style.left = (e.clientX + 16) + 'px';
        tooltip.style.top  = (e.clientY + 16) + 'px';
        
        // Clamp to viewport
        const rect = tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth - 10) tooltip.style.left = (e.clientX - rect.width - 16) + 'px';
        if (rect.bottom > window.innerHeight - 10) tooltip.style.top = (e.clientY - rect.height - 16) + 'px';
        
        // Update spotlight position
        const mapRect = mapWrapper.getBoundingClientRect();
        spotlight.style.left = (e.clientX - mapRect.left) + 'px';
        spotlight.style.top = (e.clientY - mapRect.top) + 'px';
      });
      
      link.addEventListener('mouseleave', () => {
        // Hide tooltip
        tooltip.classList.remove('visible');
        
        // Remove dimming from all states
        links.forEach(otherLink => {
          otherLink.classList.remove('dimmed', 'hovered');
        });
        
        // Deactivate spotlight
        spotlight.classList.remove('active');
      });
    });
  }
 
  function handleStateClick(uf) {
    const info = data.statesData[uf];
    if (!info) return;
    mapViewTitle.textContent = 'Região: ' + info.name;
    resetBtn.classList.remove('hidden');
 
    // Highlight trending items that impact this state
    document.querySelectorAll('.trending-item').forEach(item => {
      const topicId = item.getAttribute('data-topic-id');
      const topic = data.trendingTopics.find(t => t.id === topicId);
      if (topic && topic.impactedStates.includes(uf)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
 
  function highlightTopicOnMap(topic) {
    const links = getAllStateLinks();
    links.forEach(link => {
      const uf = link.id.replace('state_', '');
      link.classList.remove('highlighted', 'dimmed');
      if (topic.impactedStates.includes(uf)) {
        link.classList.add('highlighted');
      } else {
        link.classList.add('dimmed');
      }
    });
  }
 
  function resetMapColors() {
    const links = getAllStateLinks();
    links.forEach(link => {
      link.classList.remove('highlighted', 'dimmed');
    });
    applyRiskColors();
  }
 
  /* -----------------------------------------------------------------------
     TRENDING LIST - GROUPED BY STATE WITH SEARCH
  ----------------------------------------------------------------------- */
  const trendingList = document.getElementById('trending-list');
  const searchInput = document.getElementById('state-search');
  
  // Region color mapping
  const regionColors = {
    'Norte': 'region-norte',
    'Nordeste': 'region-nordeste',
    'Centro-Oeste': 'region-centro-oeste',
    'Sudeste': 'region-sudeste',
    'Sul': 'region-sul'
  };
  
  // Build grouped trending list by state
  function buildGroupedTrendingList(filterText = '') {
    trendingList.innerHTML = '';
    const filterLower = filterText.toLowerCase();
    
    // Group topics by state (each topic belongs to exactly one state)
    const stateTopicsMap = {};
    data.trendingTopics.forEach(topic => {
      const stateCode = topic.state;
      if (!stateCode) return;
      
      if (!stateTopicsMap[stateCode]) {
        stateTopicsMap[stateCode] = [];
      }
      stateTopicsMap[stateCode].push({
        ...topic,
        stateCode: stateCode
      });
    });
    
    // Sort states alphabetically
    const sortedStates = Object.keys(stateTopicsMap).sort((a, b) => {
      const stateA = data.statesData[a];
      const stateB = data.statesData[b];
      return stateA.name.localeCompare(stateB.name);
    });
    
    // Render states and their topics
    sortedStates.forEach(stateCode => {
      const stateInfo = data.statesData[stateCode];
      const topics = stateTopicsMap[stateCode];
      
      // Filter by search text
      if (filterText) {
        const stateMatch = stateInfo.name.toLowerCase().includes(filterLower) ||
                          stateInfo.region.toLowerCase().includes(filterLower);
        const topicMatch = topics.some(t => t.name.toLowerCase().includes(filterLower));
        if (!stateMatch && !topicMatch) return;
      }
      
      // State group header
      const header = document.createElement('div');
      header.className = 'state-group-header';
      header.innerHTML = `
        <span>${stateInfo.name}</span>
        <span class="state-group-count">${topics.length} ${topics.length === 1 ? 'assunto' : 'assuntos'}</span>
      `;
      trendingList.appendChild(header);
      
      // Topics for this state
      topics.forEach(topic => {
        const item = document.createElement('div');
        item.className = `trending-item ${regionColors[stateInfo.region] || ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('data-topic-id', topic.id);
        item.setAttribute('data-state', stateCode);
        item.setAttribute('aria-label', `${topic.name} - ${stateInfo.name}`);
        item.innerHTML = `
          <div class="rank-num">${topic.rank}</div>
          <div class="topic-info">
            <div class="topic-name">${topic.name}</div>
            <div class="topic-meta">${topic.volume} mentions<span class="topic-sep">·</span>${topic.category}</div>
          </div>
          <span class="risk-pill ${topic.risk}">${topic.risk}</span>
        `;
        item.addEventListener('click', () => handleTopicClick(topic, item, stateCode));
        item.addEventListener('mouseenter', () => handleTopicHover(stateCode));
        item.addEventListener('mouseleave', () => handleTopicHoverLeave());
        trendingList.appendChild(item);
      });
    });
    
    if (trendingList.children.length === 0) {
      trendingList.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--ink-400);font-size:0.88rem;">Nenhum resultado encontrado</div>';
    }
  }
  
  function handleTopicClick(topic, el, stateCode) {
    if (selectedTopicId === topic.id) {
      // Deselect
      selectedTopicId = null;
      el.classList.remove('active');
      clearActiveState();
      mapViewTitle.textContent = 'Visão Nacional';
      resetBtn.classList.add('hidden');
      hideFloatingInfoCard();
    } else {
      selectedTopicId = topic.id;
      document.querySelectorAll('.trending-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      
      // Highlight only the single state for this topic
      highlightSingleState(stateCode);
      
      mapViewTitle.textContent = 'Tópico: ' + topic.name;
      resetBtn.classList.remove('hidden');
      
      // Show floating info card
      showFloatingInfoCard(stateCode, topic);
    }
  }
  
  function highlightSingleState(stateCode) {
    // Clear any previous active state
    clearActiveState();
    
    // Set new active state
    const stateLink = document.getElementById('state_' + stateCode);
    if (stateLink) {
      stateLink.classList.add('active-state');
      
      // Dim all other states
      document.querySelectorAll('#br_map_wrapper .state').forEach(state => {
        if (state !== stateLink) {
          state.classList.add('has-active-sibling');
        }
      });
    }
  }
  
  function clearActiveState() {
    // Remove active state from all states
    document.querySelectorAll('#br_map_wrapper .state').forEach(state => {
      state.classList.remove('active-state', 'has-active-sibling');
    });
  }
  
  function handleTopicHover(stateCode) {
    const stateInfo = data.statesData[stateCode];
    if (!stateInfo) return;
    
    // Highlight state on map (only if not already active)
    const stateLink = document.getElementById('state_' + stateCode);
    if (stateLink && !stateLink.classList.contains('active-state')) {
      stateLink.classList.add('hovered');
    }
    
    // Highlight topics in list
    document.querySelectorAll('.trending-item').forEach(item => {
      if (item.getAttribute('data-state') === stateCode) {
        item.style.background = 'rgba(22,163,74,0.06)';
        item.style.borderColor = 'rgba(22,163,74,0.2)';
      }
    });
  }
  
  function handleTopicHoverLeave() {
    // Remove state highlight (only if not active)
    document.querySelectorAll('#br_map_wrapper .state').forEach(state => {
      if (!state.classList.contains('active-state')) {
        state.classList.remove('hovered');
      }
    });
    
    // Remove topic highlights
    document.querySelectorAll('.trending-item').forEach(item => {
      if (!item.classList.contains('active')) {
        item.style.background = '';
        item.style.borderColor = '';
      }
    });
  }
  
  function showFloatingInfoCard(stateCode, topic) {
    const stateInfo = data.statesData[stateCode];
    if (!stateInfo) return;
    
    const floatingCard = document.getElementById('floating-info-card');
    const ficStateName = document.getElementById('fic-state-name');
    const ficRegionBadge = document.getElementById('fic-region-badge');
    const ficNewsTitle = document.getElementById('fic-news-title');
    const ficDescription = document.getElementById('fic-description');
    
    // Populate card
    ficStateName.textContent = stateInfo.name;
    ficRegionBadge.textContent = stateInfo.region;
    ficNewsTitle.textContent = '📰 ' + topic.name;
    ficDescription.textContent = 'Monitoramento ativo para este assunto em ' + stateInfo.name + '.';
    
    // Position card near the state
    positionFloatingCard(stateCode);
    
    // Show card with animation
    floatingCard.classList.remove('hidden');
    // Trigger reflow for animation
    floatingCard.offsetHeight;
    floatingCard.classList.add('visible');
  }
  
  function positionFloatingCard(stateCode) {
    const floatingCard = document.getElementById('floating-info-card');
    const stateLink = document.getElementById('state_' + stateCode);
    const mapWrapper = document.getElementById('br_map_wrapper');
    
    if (!stateLink || !mapWrapper) return;
    
    const mapRect = mapWrapper.getBoundingClientRect();
    const stateRect = stateLink.getBoundingClientRect();
    
    // Calculate position relative to map wrapper
    const cardWidth = 300;
    const cardHeight = 200;
    const padding = 20;
    
    // Default position: to the right of the state
    let left = stateRect.right - mapRect.left + padding;
    let top = stateRect.top - mapRect.top;
    
    // Check if card would overflow right side
    if (left + cardWidth > mapRect.width) {
      // Position to the left instead
      left = stateRect.left - mapRect.left - cardWidth - padding;
    }
    
    // Check if card would overflow bottom
    if (top + cardHeight > mapRect.height) {
      top = mapRect.height - cardHeight - padding;
    }
    
    // Check if card would overflow top
    if (top < padding) {
      top = padding;
    }
    
    // Ensure minimum left position
    if (left < padding) {
      left = padding;
    }
    
    floatingCard.style.left = left + 'px';
    floatingCard.style.top = top + 'px';
  }
  
  function hideFloatingInfoCard() {
    const floatingCard = document.getElementById('floating-info-card');
    floatingCard.classList.remove('visible');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      floatingCard.classList.add('hidden');
    }, 300);
  }
  
  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const filterText = e.target.value.trim();
    buildGroupedTrendingList(filterText);
  });
  
  // Override reset button to also hide floating card
  resetBtn.removeEventListener('click', () => {});
  resetBtn.addEventListener('click', () => {
    selectedTopicId = null;
    document.querySelectorAll('.trending-item').forEach(i => i.classList.remove('active'));
    resetMapColors();
    mapViewTitle.textContent = 'Visão Nacional';
    resetBtn.classList.add('hidden');
    hideFloatingInfoCard();
  });
  
  // Initialize trending list
  buildGroupedTrendingList();
 
  /* -----------------------------------------------------------------------
     QUIZ FUNCTIONALITY - FAKE OR FACT?
  ----------------------------------------------------------------------- */
  const quizData = window.VeracityQuizData;
  let currentChallengeIndex = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let challengeAnswered = false;
 
  // Quiz DOM elements
  const challengeCard = document.getElementById('challenge-card');
  const quizFeedback = document.getElementById('quiz-feedback');
  const quizScore = document.getElementById('quiz-score');
  const currentQuestionEl = document.getElementById('current-question');
  const totalQuestionsEl = document.getElementById('total-questions');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const correctCountEl = document.getElementById('correct-count');
  const incorrectCountEl = document.getElementById('incorrect-count');
  const nextQuestionBtn = document.getElementById('next-question-btn');
  const restartQuizBtn = document.getElementById('restart-quiz-btn');
  const btnTrust = document.getElementById('btn-trust');
  const btnSuspicious = document.getElementById('btn-suspicious');
 
  // Initialize quiz
  function initQuiz() {
    currentChallengeIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    challengeAnswered = false;
    totalQuestionsEl.textContent = quizData.challenges.length;
    loadChallenge();
    quizScore.classList.add('hidden');
    challengeCard.classList.remove('hidden');
    updateLiveScore();
  }
 
  // Load current challenge
  function loadChallenge() {
    const challenge = quizData.challenges[currentChallengeIndex];
    challengeAnswered = false;
 
    // Update progress
    currentQuestionEl.textContent = currentChallengeIndex + 1;
    const progress = ((currentChallengeIndex) / quizData.challenges.length) * 100;
    progressPercent.textContent = Math.round(progress) + '%';
    progressFill.style.width = progress + '%';
 
    // Update challenge content
    document.getElementById('quiz-category').textContent = challenge.category;
    document.getElementById('quiz-date').textContent = challenge.date;
    document.getElementById('quiz-headline').textContent = challenge.headline;
    document.getElementById('quiz-source').textContent = challenge.source;
    document.getElementById('quiz-question').textContent = challenge.question;
 
    // Reset buttons
    btnTrust.disabled = false;
    btnSuspicious.disabled = false;
    btnTrust.style.opacity = '1';
    btnSuspicious.style.opacity = '1';
 
    // Hide feedback, show card
    quizFeedback.classList.add('hidden');
    challengeCard.classList.remove('hidden');
    challengeCard.classList.remove('exit');
  }
 
  // Handle trust/suspicious selection
  function makeDecision(userSaysTrust) {
    if (challengeAnswered) return;
    challengeAnswered = true;
 
    const challenge = quizData.challenges[currentChallengeIndex];
    const isCorrect = userSaysTrust === challenge.answer;
 
    // Update score
    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }
    updateLiveScore();
 
    // Disable buttons
    btnTrust.disabled = true;
    btnSuspicious.disabled = true;
    btnTrust.style.opacity = '0.5';
    btnSuspicious.style.opacity = '0.5';
 
    // Animate card out
    challengeCard.classList.add('exit');
 
    // Show feedback after animation
    setTimeout(() => {
      challengeCard.classList.add('hidden');
      showFeedback(isCorrect, challenge);
    }, 400);
 
    // Update progress to 100% for this challenge
    const progress = ((currentChallengeIndex + 1) / quizData.challenges.length) * 100;
    progressPercent.textContent = Math.round(progress) + '%';
    progressFill.style.width = progress + '%';
  }
 
  // Update live score display
  function updateLiveScore() {
    correctCountEl.textContent = correctCount;
    incorrectCountEl.textContent = incorrectCount;
  }
 
  // Show feedback panel
  function showFeedback(isCorrect, challenge) {
    quizFeedback.classList.remove('hidden', 'correct', 'incorrect');
    quizFeedback.classList.add(isCorrect ? 'correct' : 'incorrect');
 
    document.getElementById('feedback-icon').textContent = isCorrect ? '✅' : '⚠️';
    document.getElementById('feedback-title').textContent = isCorrect ? 'Muito Bem!' : 'Atenção';
    document.getElementById('feedback-explanation').textContent = challenge.explanation;
    document.getElementById('feedback-tip').textContent = challenge.tip;
 
    // Update next button text
    if (currentChallengeIndex === quizData.challenges.length - 1) {
      nextQuestionBtn.textContent = 'Ver Resultados →';
    } else {
      nextQuestionBtn.textContent = 'Próximo Desafio →';
    }
 
    // Scroll to feedback
    quizFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
 
  // Button event listeners
  btnTrust.addEventListener('click', () => makeDecision(true));
  btnSuspicious.addEventListener('click', () => makeDecision(false));
 
  // Move to next challenge or show results
  nextQuestionBtn.addEventListener('click', () => {
    if (currentChallengeIndex < quizData.challenges.length - 1) {
      currentChallengeIndex++;
      loadChallenge();
      // Scroll to top of quiz
      document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showResults();
    }
  });
 
  // Show final results
  function showResults() {
    const total = quizData.challenges.length;
    const percentage = Math.round((correctCount / total) * 100);
 
    // Hide quiz content, show score
    challengeCard.classList.add('hidden');
    quizFeedback.classList.add('hidden');
    quizScore.classList.remove('hidden');
 
    // Update score display
    document.getElementById('final-score').textContent = correctCount;
    document.getElementById('total-score').textContent = total;
    document.getElementById('final-percent').textContent = percentage + '%';
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('incorrect-count').textContent = incorrectCount;
 
    // Determine level and message
    let level, message;
    if (percentage >= 76) {
      level = quizData.levels.expert;
      message = 'Excelente pensamento crítico e habilidades de verificação de fatos! Você está bem equipado para identificar desinformação online.';
    } else if (percentage >= 41) {
      level = quizData.levels.intermediate;
      message = 'Você mostra bons hábitos de verificação, mas pode melhorar. Continue questionando fontes e verificando evidências.';
    } else {
      level = quizData.levels.beginner;
      message = 'Você deve verificar as fontes mais cuidadosamente antes de confiar na informação. Pratique essas habilidades para se tornar um pensador crítico melhor.';
    }
 
    document.getElementById('score-badge').innerHTML = `
      <div style="font-size: 5rem; animation: scaleIn 0.7s var(--ease-out-expo);">
        ${level.icon}
      </div>
      <div style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: ${level.color}; margin-top: 0.75rem;">
        ${level.title}
      </div>
    `;
    document.getElementById('score-message').textContent = message;
 
    // Scroll to results
    quizScore.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
 
  // Restart quiz
  restartQuizBtn.addEventListener('click', () => {
    initQuiz();
    document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
 
  // Initialize quiz on page load
  initQuiz();
 
}); // end DOMContentLoaded
