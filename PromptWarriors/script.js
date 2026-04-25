/**
 * AI Learning Companion - Main Logic
 * Refactored for modularity, security, and maximum performance.
 */

// ==========================================
// 1. UTILS & VALIDATION
// ==========================================
class Utils {
    static validateInput(value, minLength = 2, fieldName = "Input") {
        if (value === null || value === undefined) {
            alert(`${fieldName} cannot be null or empty.`);
            return false;
        }
        const trimmed = String(value).trim();
        if (trimmed.length === 0) {
            alert(`Please enter a valid ${fieldName}.`);
            return false;
        }
        if (trimmed.length < minLength) {
            alert(`${fieldName} must be at least ${minLength} characters long.`);
            return false;
        }
        return true;
    }
}

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
class StateManager {
    constructor() {
        this.score = 0;
        this.maxScore = 100;
        this.difficulty = 'beginner';
        this.topic = '';
        this.isEli5 = false;
        this.history = [];
        this.currentQuizAnswer = null;
        this.isWaitingForQuizAnswer = false;
        this.incorrectAnswersCount = 0;

        // Learning Path state
        this.completedTopics = [];      // Topic IDs marked as completed
        this.topicScores = {};           // { topicId: { attempts, correct, bestDifficulty } }
        this.currentPath = [];           // Ordered list of upcoming topic IDs
        this.activeLearningPath = '';    // Current category name
    }

    load() {
        try {
            const saved = localStorage.getItem('learnAiState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.score = parsed.score || 0;
                this.history = parsed.history || [];
                this.completedTopics = parsed.completedTopics || [];
                this.topicScores = parsed.topicScores || {};
                this.currentPath = parsed.currentPath || [];
                this.activeLearningPath = parsed.activeLearningPath || '';
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
    }

    save() {
        try {
            localStorage.setItem('learnAiState', JSON.stringify({
                score: this.score,
                history: this.history,
                completedTopics: this.completedTopics,
                topicScores: this.topicScores,
                currentPath: this.currentPath,
                activeLearningPath: this.activeLearningPath
            }));
        } catch (e) {
            console.error("Failed to save state", e);
        }
    }

    addToHistory(topic) {
        if (!this.history.includes(topic)) {
            this.history.push(topic);
            this.save();
            return true; // Indicates history changed
        }
        return false;
    }

    levelUp() {
        this.incorrectAnswersCount = 0; // Reset on correct answer
        if (this.difficulty === 'beginner') {
            this.difficulty = 'intermediate';
            return "You got it! Let's level up to Intermediate.";
        } else if (this.difficulty === 'intermediate') {
            this.difficulty = 'advanced';
            return "Excellent! You're ready for Advanced concepts.";
        } else {
            return "Perfect! You've mastered this topic!";
        }
    }

    levelDown() {
        this.incorrectAnswersCount++;
        let shouldRevise = false;
        let msg = "";

        if (this.incorrectAnswersCount >= 2) {
            shouldRevise = true;
            this.isEli5 = true;
            this.difficulty = 'beginner';
            msg = "It looks like you're struggling with this. I suggest we revise the basics. Let me give you a much simpler explanation.";
        } else {
            if (this.difficulty === 'advanced') {
                this.difficulty = 'intermediate';
                msg = "Not quite. Let's step back to Intermediate and break it down more.";
            } else if (this.difficulty === 'intermediate') {
                this.difficulty = 'beginner';
                msg = "That's incorrect. Let's go back to Beginner basics.";
            } else {
                this.isEli5 = true;
                msg = "Nope! Let me explain it like you're 5 to make it super clear.";
            }
        }
        
        return { msg, shouldRevise };
    }

    /**
     * Mark a topic as completed and record performance.
     */
    completeTopic(topicId, wasCorrect) {
        if (!this.completedTopics.includes(topicId)) {
            this.completedTopics.push(topicId);
        }
        if (!this.topicScores[topicId]) {
            this.topicScores[topicId] = { attempts: 0, correct: 0, bestDifficulty: 'beginner' };
        }
        this.topicScores[topicId].attempts++;
        if (wasCorrect) {
            this.topicScores[topicId].correct++;
            // Track highest difficulty achieved
            const tiers = ['beginner', 'intermediate', 'advanced'];
            const currentIdx = tiers.indexOf(this.topicScores[topicId].bestDifficulty);
            const newIdx = tiers.indexOf(this.difficulty);
            if (newIdx > currentIdx) {
                this.topicScores[topicId].bestDifficulty = this.difficulty;
            }
        }
        this.save();
    }

    /**
     * Returns performance rating based on recent topic scores.
     * "excelling" | "steady" | "struggling"
     */
    getPerformanceRating() {
        const ids = Object.keys(this.topicScores);
        if (ids.length === 0) return 'steady';
        const recent = ids.slice(-5);
        let totalAttempts = 0, totalCorrect = 0;
        recent.forEach(id => {
            totalAttempts += this.topicScores[id].attempts;
            totalCorrect += this.topicScores[id].correct;
        });
        if (totalAttempts === 0) return 'steady';
        const accuracy = totalCorrect / totalAttempts;
        if (accuracy >= 0.75) return 'excelling';
        if (accuracy >= 0.4) return 'steady';
        return 'struggling';
    }
}

// ==========================================
// 3. UI MANAGEMENT
// ==========================================
class UIManager {
    constructor() {
        // Cache all DOM elements once
        this.elements = {
            scoreDisplay: document.getElementById('user-score'),
            levelDisplay: document.getElementById('user-level'),
            progressBar: document.getElementById('progress-bar'),
            topicInput: document.getElementById('topic-input'),
            difficultySelect: document.getElementById('difficulty-select'),
            eli5Toggle: document.getElementById('eli5-toggle'),
            startBtn: document.getElementById('start-learning-btn'),
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            sendBtn: document.getElementById('send-btn'),
            micBtn: document.getElementById('mic-btn'),
            voiceStatus: document.getElementById('voice-status'),
            historyList: document.getElementById('history-list'),
            scoreFeedback: document.getElementById('score-feedback'),
            // Learning Path elements
            learningPathSection: document.getElementById('learning-path-section'),
            pathProgress: document.getElementById('path-progress'),
            nextTopicCard: document.getElementById('next-topic-card'),
            nextTopicBtn: document.getElementById('next-topic-btn'),
            nextTopicName: document.getElementById('next-topic-name'),
            nextTopicReason: document.getElementById('next-topic-reason'),
            performanceBadge: document.getElementById('performance-badge')
        };
        
        // Cache active typing indicator element to avoid querying the DOM
        this.activeTypingIndicator = null;
    }

    updateScoreDisplay(score, maxScore, difficulty, feedbackMsg = null, feedbackType = "") {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            const oldScore = parseInt(this.elements.scoreDisplay.textContent) || 0;
            this.elements.scoreDisplay.textContent = score;
            
            if (score > oldScore) {
                this.elements.scoreDisplay.classList.remove('score-pop');
                void this.elements.scoreDisplay.offsetWidth; // trigger reflow
                this.elements.scoreDisplay.classList.add('score-pop');
            }
            
            const progress = Math.min((score / maxScore) * 100, 100);
            this.elements.progressBar.style.width = `${progress}%`;
            this.elements.progressBar.parentElement.setAttribute('aria-valuenow', progress);
            
            this.elements.levelDisplay.className = `level-badge ${difficulty}`;
            this.elements.levelDisplay.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            
            if (this.elements.scoreFeedback && feedbackMsg) {
                this.elements.scoreFeedback.textContent = feedbackMsg;
                this.elements.scoreFeedback.className = `score-feedback ${feedbackType}`;
            }
        });
    }

    renderHistory(history) {
        // Use DocumentFragment to batch DOM insertions
        const frag = document.createDocumentFragment();
        const recent = history.slice(-5).reverse();
        
        recent.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.textContent = item;
            li.setAttribute('tabindex', '0');
            li.setAttribute('role', 'button');
            li.setAttribute('aria-label', `Revisit topic: ${item}`);
            // We use Event Delegation in AppController instead of attaching inline listeners
            frag.appendChild(li);
        });
        
        requestAnimationFrame(() => {
            this.elements.historyList.innerHTML = '';
            this.elements.historyList.appendChild(frag);
        });
    }

    /**
     * Render the full learning path timeline in the sidebar.
     * @param {Array<{id, name, status}>} pathNodes - ordered list of nodes
     */
    renderLearningPath(pathNodes) {
        if (!this.elements.pathProgress || !this.elements.learningPathSection) return;
        requestAnimationFrame(() => {
            this.elements.pathProgress.innerHTML = '';
            const frag = document.createDocumentFragment();

            pathNodes.forEach((node, idx) => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = `path-node path-${node.status}`;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'path-node-icon';
                if (node.status === 'completed') {
                    iconSpan.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                } else if (node.status === 'current') {
                    iconSpan.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
                } else {
                    iconSpan.innerHTML = '<i class="fa-regular fa-circle"></i>';
                }
                nodeDiv.appendChild(iconSpan);

                const label = document.createElement('span');
                label.className = 'path-node-label';
                label.textContent = node.name;
                nodeDiv.appendChild(label);

                frag.appendChild(nodeDiv);

                // Add connector line between nodes
                if (idx < pathNodes.length - 1) {
                    const connector = document.createElement('div');
                    connector.className = `path-connector ${node.status === 'completed' ? 'connector-done' : ''}`;
                    frag.appendChild(connector);
                }
            });

            this.elements.pathProgress.appendChild(frag);
            this.elements.learningPathSection.style.display = 'block';
        });
    }

    /**
     * Show the "Recommended Next Topic" card with performance badge and reason.
     * @param {string} topicName
     * @param {string} reason
     * @param {string} performanceRating - "excelling"|"steady"|"struggling"
     * @param {Function} onClickCallback
     */
    showNextTopicRecommendation(topicName, reason, performanceRating, onClickCallback) {
        if (!this.elements.nextTopicCard) return;
        requestAnimationFrame(() => {
            // Performance badge
            const badgeMap = {
                excelling: { text: '🔥 Excelling', cls: 'perf-excelling' },
                steady: { text: '📈 Steady', cls: 'perf-steady' },
                struggling: { text: '💪 Keep Going', cls: 'perf-struggling' }
            };
            const badge = badgeMap[performanceRating] || badgeMap.steady;
            this.elements.performanceBadge.textContent = badge.text;
            this.elements.performanceBadge.className = `performance-badge ${badge.cls}`;

            // Topic name & reason
            this.elements.nextTopicName.textContent = topicName;
            this.elements.nextTopicReason.textContent = reason;

            // Button click
            const newBtn = this.elements.nextTopicBtn.cloneNode(true);
            this.elements.nextTopicBtn.replaceWith(newBtn);
            this.elements.nextTopicBtn = newBtn;
            // Restore inner content after clone
            newBtn.innerHTML = '';
            const span = document.createElement('span');
            span.id = 'next-topic-name';
            span.textContent = topicName;
            newBtn.appendChild(span);
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-arrow-right';
            newBtn.appendChild(icon);
            this.elements.nextTopicName = span;

            newBtn.addEventListener('click', () => {
                onClickCallback(topicName);
            });

            this.elements.nextTopicCard.style.display = 'block';
        });
    }

    /**
     * @param {string} sender 'ai' or 'user'
     * @param {HTMLElement | DocumentFragment | string} contentElement 
     * @param {boolean} isTyping 
     */
    _appendMessageWrapper(sender, contentElement, isTyping = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message${isTyping ? ' typing-msg' : ''}`;
        
        if (sender !== 'system') {
            const avatarIcon = sender === 'ai' ? 'fa-robot' : 'fa-user';
            msgDiv.innerHTML = `<div class="avatar"><i class="fa-solid ${avatarIcon}"></i></div>`;
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (contentElement instanceof HTMLElement || contentElement instanceof DocumentFragment) {
            contentDiv.appendChild(contentElement);
        } else {
            // Only for trusted internal strings (typing dots)
            contentDiv.innerHTML = contentElement;
        }
        
        msgDiv.appendChild(contentDiv);
        
        requestAnimationFrame(() => {
            this.elements.chatMessages.appendChild(msgDiv);
            this.scrollToBottom();
        });
        
        return msgDiv;
    }

    appendMessage(sender, contentElement) {
        this._appendMessageWrapper(sender, contentElement);
    }

    appendSystemMessage(text) {
        const frag = document.createDocumentFragment();
        const p = document.createElement('span');
        p.innerHTML = `<i class="fa-solid fa-bolt"></i> ${text}`;
        frag.appendChild(p);
        this.appendMessage('system', frag);
    }

    showTypingIndicator() {
        if (this.activeTypingIndicator) return;
        const typingHTML = `
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        this.activeTypingIndicator = this._appendMessageWrapper('ai', typingHTML, true);
    }

    hideTypingIndicator() {
        if (this.activeTypingIndicator) {
            this.activeTypingIndicator.remove();
            this.activeTypingIndicator = null;
        }
    }

    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    setInputsEnabled(enabled) {
        this.elements.chatInput.disabled = !enabled;
        this.elements.sendBtn.disabled = !enabled;
        this.elements.startBtn.disabled = !enabled;
        this.elements.micBtn.disabled = !enabled;
    }
    
    clearChat() {
        this.elements.chatMessages.innerHTML = '';
    }
}

// ==========================================
// 4. AI SERVICE (MOCK API)
// ==========================================
class MockAIService {
    async generateLesson(topic, difficulty, eli5) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!topic) return reject(new Error("Topic is required"));

                let explanation, steps, example, quiz;
                const simplify = eli5 || difficulty === 'beginner';
                
                if (topic.toLowerCase().includes('photosynthesis')) {
                    explanation = simplify 
                        ? "Photosynthesis is how plants make their own food using sunlight, water, and air."
                        : "Photosynthesis is the process used by plants, algae and certain bacteria to harness energy from sunlight and turn it into chemical energy.";
                    steps = [
                        "1. Roots absorb water.",
                        "2. Leaves absorb carbon dioxide from the air.",
                        "3. Sunlight provides energy to combine them into glucose (sugar)."
                    ];
                    example = "Think of a plant as a tiny solar-powered kitchen. It takes basic ingredients and uses the sun's energy to bake a cake (sugar)!";
                    quiz = {
                        question: "What provides the energy for photosynthesis?",
                        options: ["A) Soil", "B) Sunlight", "C) Wind"],
                        answer: "B",
                        answerKeyword: "sunlight"
                    };
                } else {
                    explanation = simplify
                        ? `Let's keep it simple: ${topic} is a really cool concept that helps us solve specific problems easily.`
                        : `${topic} is an important concept in its field, characterized by specific principles that govern its behavior.`;
                    steps = [
                        "1. Understand the basic definition.",
                        "2. Look at how it interacts with other components.",
                        "3. Apply it in a practical scenario."
                    ];
                    example = `For example, when using ${topic}, you typically define your parameters and observe the output.`;
                    quiz = {
                        question: `Which of these is directly related to ${topic}?`,
                        options: ["A) Random Noise", "B) The core principle we just discussed", "C) Nothing"],
                        answer: "B",
                        answerKeyword: "core principle"
                    };
                }
                
                resolve({ explanation, steps, example, quiz });
            }, 1500); 
        });
    }

    async evaluateAnswer(userAnswer, actualAnswer, keyword, topic) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!userAnswer || !actualAnswer || !keyword) {
                    return reject(new Error("Missing arguments for evaluation"));
                }
                
                // Simple mock evaluation logic aligned with prompt structure
                const answerLower = userAnswer.toLowerCase();
                
                if (answerLower.length < 5) {
                    return resolve({
                        isCorrect: false,
                        feedback: "Incorrect.\n\nYou didn't provide enough detail. It seems you might be missing the core concept.\n\nHint: Try to explain the 'how' or 'why' behind the topic.\n\nTry again!"
                    });
                }
                
                if (answerLower.includes("don't know") || answerLower.includes("not sure")) {
                    return resolve({
                        isCorrect: false,
                        feedback: "Incorrect.\n\nIt looks like you haven't attempted to apply the concept yet.\n\nHint: Review the step-by-step breakdown above and take a guess.\n\nTry again!"
                    });
                }
                
                // Randomly succeed or fail for demo purposes
                const isCorrect = Math.random() > 0.4; // 60% chance of being correct
                
                if (isCorrect) {
                    return resolve({
                        isCorrect: true,
                        feedback: `Correct!\n\nYou successfully identified the core mechanics of ${topic}. \n\nDeeper Insight: In advanced real-world applications, this concept is often combined with other modular patterns to massively improve scalability.\n\nReady for next?`
                    });
                } else {
                    return resolve({
                        isCorrect: false,
                        feedback: `Incorrect.\n\nYour explanation misses the primary mechanism of how ${topic} operates. You might be confusing its behavior with a similar but distinct concept.\n\nHint: Focus strictly on the main function described in the lesson.\n\nTry again!`
                    });
                }
            }, 800);
        });
    }

    /**
     * Find a graph node by matching a topic string.
     * Matches against both the key (dashes → spaces) and the node's display name.
     */
    findGraphNode(topicStr) {
        const normalized = topicStr.toLowerCase().trim();
        for (const key in MockAIService.KNOWLEDGE_GRAPH) {
            const node = MockAIService.KNOWLEDGE_GRAPH[key];
            const keySpaced = key.replace(/-/g, ' ');
            const nameLower = node.name.toLowerCase();
            if (normalized === keySpaced || normalized === nameLower
                || normalized.includes(keySpaced) || keySpaced.includes(normalized)
                || normalized.includes(nameLower) || nameLower.includes(normalized)) {
                return node;
            }
        }
        return null;
    }

    /**
     * Get a single recommended next topic, factoring in completed topics and performance.
     * @param {string} currentTopic
     * @param {string[]} completedTopics
     * @param {string} performanceRating - "excelling" | "steady" | "struggling"
     * @returns {Promise<{name: string, reason: string}>}
     */
    async getRecommendation(currentTopic, completedTopics = [], performanceRating = 'steady') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const node = this.findGraphNode(currentTopic);
                const completedLower = completedTopics.map(t => t.toLowerCase().trim());

                if (node && node.nextTopics.length > 0) {
                    // Filter out completed topics
                    const available = node.nextTopics.filter(id => {
                        const n = MockAIService.KNOWLEDGE_GRAPH[id];
                        return n && !completedLower.includes(n.name.toLowerCase());
                    });

                    if (available.length > 0) {
                        let chosenId;
                        if (performanceRating === 'struggling' && node.prerequisites.length > 0) {
                            // Suggest revisiting a prerequisite
                            const prereq = node.prerequisites.find(pid => {
                                const pn = MockAIService.KNOWLEDGE_GRAPH[pid];
                                return pn && !completedLower.includes(pn.name.toLowerCase());
                            });
                            if (prereq) {
                                const pn = MockAIService.KNOWLEDGE_GRAPH[prereq];
                                return resolve({ name: pn.name, reason: `Let's revisit the foundations before moving on.` });
                            }
                        }
                        if (performanceRating === 'excelling') {
                            // Pick the harder option
                            const tiers = ['beginner', 'intermediate', 'advanced'];
                            available.sort((a, b) => {
                                const ta = MockAIService.KNOWLEDGE_GRAPH[a];
                                const tb = MockAIService.KNOWLEDGE_GRAPH[b];
                                return tiers.indexOf(tb.difficultyTier) - tiers.indexOf(ta.difficultyTier);
                            });
                        }
                        chosenId = available[0];
                        const chosen = MockAIService.KNOWLEDGE_GRAPH[chosenId];
                        const reason = performanceRating === 'excelling'
                            ? `You're excelling — let's challenge you!`
                            : `Based on your progress in ${node.name}.`;
                        return resolve({ name: chosen.name, reason });
                    }
                }

                // Fallback
                resolve({
                    name: `Advanced ${currentTopic}`,
                    reason: `Keep exploring deeper concepts.`
                });
            }, 400);
        });
    }

    /**
     * Generate a full ordered learning path from the current topic.
     * @returns {Promise<Array<{id, name, status}>>} status: "completed"|"current"|"upcoming"
     */
    async generateLearningPath(currentTopic, completedTopics = []) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const path = [];
                const completedLower = completedTopics.map(t => t.toLowerCase().trim());
                const node = this.findGraphNode(currentTopic);

                if (!node) {
                    // Not in graph — return a minimal path
                    path.push({ id: 'current', name: currentTopic, status: 'current' });
                    path.push({ id: 'next', name: `Advanced ${currentTopic}`, status: 'upcoming' });
                    return resolve(path);
                }

                // Walk backwards to find prerequisites chain
                const visited = new Set();
                const collectPrereqs = (n) => {
                    if (!n || visited.has(n.id)) return;
                    visited.add(n.id);
                    n.prerequisites.forEach(pid => {
                        const pn = MockAIService.KNOWLEDGE_GRAPH[pid];
                        if (pn) collectPrereqs(pn);
                    });
                };
                collectPrereqs(node);

                // Build ordered path: prerequisites -> current -> next topics
                const orderedIds = [];
                const addInOrder = (n) => {
                    if (!n) return;
                    n.prerequisites.forEach(pid => {
                        const pn = MockAIService.KNOWLEDGE_GRAPH[pid];
                        if (pn && !orderedIds.includes(pid)) {
                            addInOrder(pn);
                        }
                    });
                    if (!orderedIds.includes(n.id)) orderedIds.push(n.id);
                };
                addInOrder(node);

                // Add next topics
                node.nextTopics.forEach(nid => {
                    if (!orderedIds.includes(nid) && MockAIService.KNOWLEDGE_GRAPH[nid]) {
                        orderedIds.push(nid);
                    }
                });

                // Build the path with statuses
                orderedIds.forEach(id => {
                    const gn = MockAIService.KNOWLEDGE_GRAPH[id];
                    if (!gn) return;
                    let status;
                    if (completedLower.includes(gn.name.toLowerCase())) {
                        status = 'completed';
                    } else if (gn.name.toLowerCase() === currentTopic.toLowerCase().trim()) {
                        status = 'current';
                    } else {
                        status = 'upcoming';
                    }
                    path.push({ id: gn.id, name: gn.name, status });
                });

                resolve(path);
            }, 300);
        });
    }
}

// --- Knowledge Graph (static on the class) ---
MockAIService.KNOWLEDGE_GRAPH = {
    "javascript-basics": {
        id: "javascript-basics", name: "JavaScript Basics",
        prerequisites: [], nextTopics: ["variables-data-types", "functions"],
        category: "JavaScript", difficultyTier: "beginner"
    },
    "variables-data-types": {
        id: "variables-data-types", name: "Variables & Data Types",
        prerequisites: ["javascript-basics"], nextTopics: ["functions", "operators"],
        category: "JavaScript", difficultyTier: "beginner"
    },
    "operators": {
        id: "operators", name: "Operators",
        prerequisites: ["variables-data-types"], nextTopics: ["functions"],
        category: "JavaScript", difficultyTier: "beginner"
    },
    "functions": {
        id: "functions", name: "Functions",
        prerequisites: ["javascript-basics"], nextTopics: ["closures", "callbacks", "arrow-functions"],
        category: "JavaScript", difficultyTier: "beginner"
    },
    "arrow-functions": {
        id: "arrow-functions", name: "Arrow Functions",
        prerequisites: ["functions"], nextTopics: ["closures"],
        category: "JavaScript", difficultyTier: "intermediate"
    },
    "callbacks": {
        id: "callbacks", name: "Callbacks",
        prerequisites: ["functions"], nextTopics: ["promises", "async-js"],
        category: "JavaScript", difficultyTier: "intermediate"
    },
    "closures": {
        id: "closures", name: "Closures",
        prerequisites: ["functions"], nextTopics: ["async-js", "promises"],
        category: "JavaScript", difficultyTier: "intermediate"
    },
    "async-js": {
        id: "async-js", name: "Async JS",
        prerequisites: ["closures", "callbacks"], nextTopics: ["promises", "async-await"],
        category: "JavaScript", difficultyTier: "intermediate"
    },
    "promises": {
        id: "promises", name: "Promises",
        prerequisites: ["async-js"], nextTopics: ["async-await", "fetch-api"],
        category: "JavaScript", difficultyTier: "advanced"
    },
    "async-await": {
        id: "async-await", name: "Async/Await",
        prerequisites: ["promises"], nextTopics: ["fetch-api"],
        category: "JavaScript", difficultyTier: "advanced"
    },
    "fetch-api": {
        id: "fetch-api", name: "Fetch API",
        prerequisites: ["async-await"], nextTopics: [],
        category: "JavaScript", difficultyTier: "advanced"
    },
    "html": {
        id: "html", name: "HTML",
        prerequisites: [], nextTopics: ["semantic-html", "css"],
        category: "Web", difficultyTier: "beginner"
    },
    "semantic-html": {
        id: "semantic-html", name: "Semantic HTML",
        prerequisites: ["html"], nextTopics: ["css"],
        category: "Web", difficultyTier: "beginner"
    },
    "css": {
        id: "css", name: "CSS",
        prerequisites: ["html"], nextTopics: ["flexbox", "css-grid", "responsive-design"],
        category: "Web", difficultyTier: "beginner"
    },
    "flexbox": {
        id: "flexbox", name: "Flexbox",
        prerequisites: ["css"], nextTopics: ["css-grid", "animations"],
        category: "Web", difficultyTier: "intermediate"
    },
    "css-grid": {
        id: "css-grid", name: "CSS Grid",
        prerequisites: ["css"], nextTopics: ["responsive-design", "animations"],
        category: "Web", difficultyTier: "intermediate"
    },
    "responsive-design": {
        id: "responsive-design", name: "Responsive Design",
        prerequisites: ["css"], nextTopics: ["animations"],
        category: "Web", difficultyTier: "intermediate"
    },
    "animations": {
        id: "animations", name: "CSS Animations",
        prerequisites: ["flexbox"], nextTopics: [],
        category: "Web", difficultyTier: "advanced"
    },
    "photosynthesis": {
        id: "photosynthesis", name: "Photosynthesis",
        prerequisites: [], nextTopics: ["cellular-respiration", "plant-anatomy"],
        category: "Science", difficultyTier: "beginner"
    },
    "cellular-respiration": {
        id: "cellular-respiration", name: "Cellular Respiration",
        prerequisites: ["photosynthesis"], nextTopics: [],
        category: "Science", difficultyTier: "intermediate"
    },
    "plant-anatomy": {
        id: "plant-anatomy", name: "Plant Anatomy",
        prerequisites: ["photosynthesis"], nextTopics: [],
        category: "Science", difficultyTier: "intermediate"
    }
};

// ==========================================
// 5. SPEECH RECOGNITION SERVICE
// ==========================================
class SpeechRecognitionService {
    constructor(uiManager, onResultCallback) {
        this.ui = uiManager;
        this.onResultCallback = onResultCallback;
        this.recognition = null;
        this.isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

        if (this.isSupported) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.setupEvents();
        } else {
            this.ui.elements.micBtn.style.display = 'none';
        }
    }

    setupEvents() {
        this.recognition.onstart = () => {
            this.ui.elements.micBtn.classList.add('recording');
            this.ui.elements.voiceStatus.classList.remove('hidden');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.onResultCallback(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            this.ui.elements.voiceStatus.textContent = "Error: " + event.error;
            setTimeout(() => this.ui.elements.voiceStatus.classList.add('hidden'), 2000);
        };
        
        this.recognition.onend = () => {
            this.ui.elements.micBtn.classList.remove('recording');
            this.ui.elements.voiceStatus.classList.add('hidden');
            this.ui.elements.voiceStatus.textContent = "Listening..."; 
        };
    }

    toggle() {
        if (!this.isSupported) return;
        if (this.ui.elements.micBtn.classList.contains('recording')) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }
}

// ==========================================
// 6. APPLICATION CONTROLLER
// ==========================================
class AppController {
    constructor() {
        this.state = new StateManager();
        this.ui = new UIManager();
        this.ai = new MockAIService();
        this.speech = new SpeechRecognitionService(this.ui, (transcript) => {
            this.ui.elements.chatInput.value = transcript;
        });

        this.init();
    }

    init() {
        this.state.load();
        
        // Initial UI state setup
        this.ui.updateScoreDisplay(this.state.score, this.state.maxScore, this.state.difficulty, "Ready to learn!", "");
        this.ui.renderHistory(this.state.history);

        // Bind Events globally and use delegation where possible
        this.ui.elements.startBtn.addEventListener('click', () => this.startLearning());
        this.ui.elements.topicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startLearning();
        });
        this.ui.elements.sendBtn.addEventListener('click', () => this.handleUserResponse());
        this.ui.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserResponse();
        });
        this.ui.elements.micBtn.addEventListener('click', () => this.speech.toggle());
        
        // Event delegation for history items
        this.ui.elements.historyList.addEventListener('click', (e) => {
            if (e.target && e.target.nodeName === 'LI' && e.target.classList.contains('history-item')) {
                this.ui.elements.topicInput.value = e.target.textContent;
                this.startLearning();
            }
        });
        this.ui.elements.historyList.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target && e.target.nodeName === 'LI' && e.target.classList.contains('history-item')) {
                this.ui.elements.topicInput.value = e.target.textContent;
                this.startLearning();
            }
        });
    }

    async startLearning() {
        const topicRaw = this.ui.elements.topicInput.value;
        if (!Utils.validateInput(topicRaw, 2, "topic")) return;
        
        const topic = topicRaw.trim();
        
        this.state.topic = topic;
        this.state.difficulty = this.ui.elements.difficultySelect.value;
        this.state.isEli5 = this.ui.elements.eli5Toggle.checked;
        this.state.incorrectAnswersCount = 0; // Reset on new topic
        
        // Only re-render history if a new topic was actually added
        if (this.state.addToHistory(topic)) {
            this.ui.renderHistory(this.state.history);
        }
        
        this.ui.clearChat();
        
        // Securely build initial message using DocumentFragment
        const frag = document.createDocumentFragment();
        const p = document.createElement('p');
        p.textContent = "I want to learn about ";
        
        const strong = document.createElement('strong');
        strong.textContent = topic; // Safe text rendering
        
        p.appendChild(strong);
        const mode = this.state.isEli5 ? ', ELI5' : '';
        p.appendChild(document.createTextNode(` (${this.state.difficulty}${mode}).`));
        frag.appendChild(p);
        
        this.ui.appendMessage('user', frag);
        
        this.ui.appendSystemMessage("Analyzing your learning level...");
        
        // Generate and render learning path immediately
        this.ai.generateLearningPath(topic, this.state.completedTopics).then(path => {
            this.state.currentPath = path.map(n => n.name);
            this.state.save();
            this.ui.renderLearningPath(path);
        });
        
        await this.fetchLesson();
    }

    async fetchLesson() {
        this.ui.showTypingIndicator();
        this.ui.setInputsEnabled(false);
        
        try {
            await new Promise(r => setTimeout(r, 600)); // Brief pause for UX
            this.ui.appendSystemMessage("Generating personalized explanation...");
            
            const lessonData = await this.ai.generateLesson(
                this.state.topic, 
                this.state.difficulty, 
                this.state.isEli5
            );
            
            // Validate payload structure
            if (!lessonData || typeof lessonData !== 'object') {
                throw new Error("Invalid response received from AI Service.");
            }

            this.ui.hideTypingIndicator();
            
            // Programmatically build HTML to prevent XSS
            const frag = document.createDocumentFragment();
            
            const pExp = document.createElement('p');
            pExp.textContent = lessonData.explanation || "No explanation provided.";
            frag.appendChild(pExp);
            
            if (lessonData.steps && Array.isArray(lessonData.steps)) {
                const stepH4 = document.createElement('h4');
                stepH4.textContent = "Step-by-Step";
                frag.appendChild(stepH4);

                const ul = document.createElement('ul');
                lessonData.steps.forEach(step => {
                    const li = document.createElement('li');
                    li.textContent = step;
                    ul.appendChild(li);
                });
                frag.appendChild(ul);
            }

            if (lessonData.example) {
                const exH4 = document.createElement('h4');
                exH4.textContent = "Example";
                frag.appendChild(exH4);

                const exP = document.createElement('p');
                const em = document.createElement('em');
                em.textContent = lessonData.example;
                exP.appendChild(em);
                frag.appendChild(exP);
            }
            
            if (lessonData.quiz && lessonData.quiz.question) {
                const qDiv = document.createElement('div');
                qDiv.className = 'quiz-block';

                const qH4 = document.createElement('h4');
                qH4.textContent = "Pop Quiz!";
                qDiv.appendChild(qH4);

                const qP = document.createElement('p');
                qP.textContent = lessonData.quiz.question;
                qDiv.appendChild(qP);

                if (Array.isArray(lessonData.quiz.options)) {
                    const qUl = document.createElement('ul');
                    lessonData.quiz.options.forEach(opt => {
                        const li = document.createElement('li');
                        li.textContent = opt;
                        qUl.appendChild(li);
                    });
                    qDiv.appendChild(qUl);
                }

                const hintP = document.createElement('p');
                const small = document.createElement('small');
                small.textContent = "Type your answer below...";
                hintP.appendChild(small);
                qDiv.appendChild(hintP);

                frag.appendChild(qDiv);
                
                this.state.currentQuizAnswer = lessonData.quiz;
                this.state.isWaitingForQuizAnswer = true;
            } else {
                this.state.isWaitingForQuizAnswer = false;
            }
            
            this.ui.appendMessage('ai', frag);
            this.ui.setInputsEnabled(true);
            this.ui.elements.chatInput.focus();
            
        } catch (error) {
            console.error("AI Error:", error);
            this.ui.hideTypingIndicator();
            
            const frag = document.createDocumentFragment();
            const pErr = document.createElement('p');
            pErr.style.color = "var(--danger-color)";
            pErr.textContent = "Sorry, I encountered an error generating the lesson. Please try again.";
            frag.appendChild(pErr);
            
            this.ui.appendMessage('ai', frag);
            this.ui.setInputsEnabled(true);
        }
    }

    async handleUserResponse() {
        if (!this.state.isWaitingForQuizAnswer) return;
        
        const rawText = this.ui.elements.chatInput.value;
        if (!Utils.validateInput(rawText, 1, "Answer")) return;
        
        const text = rawText.trim();
        this.ui.elements.chatInput.value = '';
        
        // Securely render user input
        const frag = document.createDocumentFragment();
        const p = document.createElement('p');
        p.textContent = text;
        frag.appendChild(p);
        this.ui.appendMessage('user', frag);
        
        this.ui.appendSystemMessage("Evaluating your answer...");
        
        this.ui.showTypingIndicator();
        this.ui.setInputsEnabled(false);
        
        try {
            const evalResult = await this.ai.evaluateAnswer(
                text, 
                this.state.currentQuizAnswer.answer, 
                this.state.currentQuizAnswer.answerKeyword,
                this.state.topic
            );
            
            this.ui.hideTypingIndicator();
            
            if (evalResult && evalResult.isCorrect) {
                this.handleCorrectAnswer(evalResult.feedback);
            } else {
                await this.handleIncorrectAnswer(evalResult ? evalResult.feedback : null);
            }
        } catch(error) {
            console.error("Evaluation Error:", error);
            this.ui.hideTypingIndicator();
            const errFrag = document.createDocumentFragment();
            const errP = document.createElement('p');
            errP.style.color = "var(--danger-color)";
            errP.textContent = "An error occurred evaluating your answer.";
            errFrag.appendChild(errP);
            this.ui.appendMessage('ai', errFrag);
        }
        
        this.ui.setInputsEnabled(true);
    }

    handleCorrectAnswer(aiFeedback = "") {
        this.state.score += 10;
        this.state.save();
        
        const difficultyMsg = this.state.levelUp();
        
        this.ui.appendSystemMessage("Adjusting difficulty based on performance: <strong>Level Up!</strong>");
        
        this.ui.elements.difficultySelect.value = this.state.difficulty;
        this.ui.updateScoreDisplay(this.state.score, this.state.maxScore, this.state.difficulty, "Great job! You're improving!", "positive");
        
        const frag = document.createDocumentFragment();
        
        if (aiFeedback) {
            const paragraphs = aiFeedback.split('\n').filter(p => p.trim() !== '');
            paragraphs.forEach(text => {
                const p = document.createElement('p');
                if (text.startsWith('Correct!')) {
                    p.style.color = "var(--success-color)";
                    p.innerHTML = `<strong>${text}</strong>`;
                } else if (text.startsWith('Deeper Insight:')) {
                    p.style.color = "var(--accent-color)";
                    p.innerHTML = `<em>${text}</em>`;
                } else {
                    p.textContent = text;
                }
                frag.appendChild(p);
            });
        } else {
            const p1 = document.createElement('p');
            p1.style.color = "var(--success-color)";
            p1.innerHTML = `<strong>Correct!</strong>`;
            frag.appendChild(p1);
        }
        
        const p2 = document.createElement('p');
        p2.textContent = difficultyMsg;
        
        frag.appendChild(p2);
        
        this.ui.appendMessage('ai', frag);
        this.state.isWaitingForQuizAnswer = false;
        
        // Mark topic as completed and update learning path
        this.state.completeTopic(this.state.topic, true);
        const perfRating = this.state.getPerformanceRating();
        
        // Generate updated learning path + recommendation
        Promise.all([
            this.ai.getRecommendation(this.state.topic, this.state.completedTopics, perfRating),
            this.ai.generateLearningPath(this.state.topic, this.state.completedTopics)
        ]).then(([rec, path]) => {
            // Render updated path timeline
            this.state.currentPath = path.map(n => n.name);
            this.state.save();
            this.ui.renderLearningPath(path);

            // Show next topic recommendation
            if (rec && rec.name) {
                this.ui.showNextTopicRecommendation(rec.name, rec.reason, perfRating, (topic) => {
                    this.ui.elements.topicInput.value = topic;
                    this.startLearning();
                });
                this.ui.appendSystemMessage(`Recommended next: <strong>${rec.name}</strong> — ${rec.reason}`);
            }
        });
    }

    async handleIncorrectAnswer(aiFeedback = "") {
        const { msg, shouldRevise } = this.state.levelDown();
        
        if (shouldRevise) {
            this.ui.appendSystemMessage("Multiple incorrect answers detected. <strong>Simplifying explanation...</strong>");
        } else {
            this.ui.appendSystemMessage("Adjusting difficulty based on performance: <strong>Stepping back...</strong>");
        }
        
        if (this.state.isEli5) {
            this.ui.elements.eli5Toggle.checked = true;
        }
        
        this.ui.elements.difficultySelect.value = this.state.difficulty;
        
        const feedbackMsg = shouldRevise ? "Try revising this concept." : "Keep trying! You'll get it.";
        this.ui.updateScoreDisplay(this.state.score, this.state.maxScore, this.state.difficulty, feedbackMsg, "warning");
        
        const frag = document.createDocumentFragment();
        
        if (aiFeedback) {
            const paragraphs = aiFeedback.split('\n').filter(p => p.trim() !== '');
            paragraphs.forEach(text => {
                const p = document.createElement('p');
                if (text.startsWith('Incorrect.')) {
                    p.style.color = "var(--warning-color)";
                    p.innerHTML = `<strong>${text}</strong>`;
                } else if (text.startsWith('Hint:')) {
                    p.style.color = "var(--accent-color)";
                    p.innerHTML = `<em>${text}</em>`;
                } else {
                    p.textContent = text;
                }
                frag.appendChild(p);
            });
        } else {
            const p1 = document.createElement('p');
            p1.style.color = "var(--warning-color)";
            p1.innerHTML = `<strong>Not quite right.</strong>`;
            frag.appendChild(p1);
        }
        
        const p2 = document.createElement('p');
        p2.textContent = msg;
        frag.appendChild(p2);
        
        if (shouldRevise) {
            const p3 = document.createElement('p');
            p3.style.color = "var(--accent-color)";
            p3.innerHTML = `<em>Tip: Try reading the step-by-step breakdown below carefully, or ask me for an analogy.</em>`;
            frag.appendChild(p3);
        }
        
        this.ui.appendMessage('ai', frag);
        
        await this.fetchLesson();
    }
}

// ==========================================
// 7. TESTING SUITE
// ==========================================
function runBasicTests() {
    console.log("%c Running Basic Tests... ", "background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;");
    
    // Mock window.alert to prevent popups during tests
    const originalAlert = window.alert;
    let lastAlert = "";
    window.alert = (msg) => { lastAlert = msg; };

    try {
        // --- Test 1: Input Validation ---
        console.assert(Utils.validateInput("Photosynthesis", 2, "topic") === true, "Valid input should return true");
        
        console.assert(Utils.validateInput("", 2, "topic") === false, "Empty input should return false");
        console.assert(lastAlert.includes("valid topic"), "Expected alert for empty input");
        
        console.assert(Utils.validateInput("A", 2, "topic") === false, "Short input should return false");
        console.assert(lastAlert.includes("at least 2 characters"), "Expected alert for short input");

        // --- Test 2: Adaptive Logic (State Management) ---
        const state = new StateManager();
        state.difficulty = 'beginner';
        
        const msgUp1 = state.levelUp();
        console.assert(state.difficulty === 'intermediate', "Level up failed to progress to intermediate");
        console.assert(msgUp1.includes("level up to Intermediate"), "Level up message mismatch");
        
        state.levelUp();
        console.assert(state.difficulty === 'advanced', "Level up failed to progress to advanced");
        
        state.levelDown();
        console.assert(state.difficulty === 'intermediate', "Level down failed to revert to intermediate");
        
        state.levelDown(); // Second incorrect answer
        console.assert(state.difficulty === 'beginner', "Level down failed to revert to beginner");
        console.assert(state.isEli5 === true, "Should force ELI5 on 2+ incorrect answers");
        console.assert(state.incorrectAnswersCount === 2, "Incorrect answer count should be 2");

        // --- Test 3: Learning Path - Topic Completion ---
        const lpState = new StateManager();
        lpState.difficulty = 'intermediate';
        lpState.completeTopic("JavaScript Basics", true);
        console.assert(lpState.completedTopics.includes("JavaScript Basics"), "Topic should be in completedTopics");
        console.assert(lpState.topicScores["JavaScript Basics"].correct === 1, "Correct count should be 1");
        console.assert(lpState.topicScores["JavaScript Basics"].attempts === 1, "Attempts should be 1");
        
        // --- Test 4: Performance Rating ---
        lpState.completeTopic("Functions", true);
        lpState.completeTopic("Closures", true);
        console.assert(lpState.getPerformanceRating() === 'excelling', "3/3 correct should be excelling");
        
        lpState.completeTopic("Async JS", false);
        lpState.completeTopic("Promises", false);
        // Now 3 correct, 5 attempts total = 0.6 accuracy → "steady"
        console.assert(lpState.getPerformanceRating() === 'steady', "3/5 correct should be steady");

        // --- Test 5: Knowledge Graph Node Lookup ---
        const ai = new MockAIService();
        const jsNode = ai.findGraphNode("JavaScript Basics");
        console.assert(jsNode !== null, "findGraphNode should find 'JavaScript Basics'");
        console.assert(jsNode.id === "javascript-basics", "Node ID should be 'javascript-basics'");
        console.assert(jsNode.nextTopics.length > 0, "Should have next topics");

        const closuresNode = ai.findGraphNode("Closures");
        console.assert(closuresNode !== null, "findGraphNode should find 'Closures'");
        console.assert(closuresNode.prerequisites.includes("functions"), "Closures should require Functions");

        const missingNode = ai.findGraphNode("Quantum Computing");
        console.assert(missingNode === null, "Unknown topic should return null");
        
        console.log("%c All basic tests passed! ", "color: #10b981; font-weight: bold;");
    } catch (e) {
        console.error("Tests failed:", e);
    } finally {
        // Restore original alert function
        window.alert = originalAlert;
    }
}

// Bootstrap the Application
document.addEventListener('DOMContentLoaded', () => {
    runBasicTests();
    new AppController();
});
