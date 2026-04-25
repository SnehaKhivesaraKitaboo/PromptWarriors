/**
 * AI Learning Companion - Main Logic
 */

// --- State Management ---
const state = {
    score: 0,
    maxScore: 100,
    difficulty: 'beginner',
    topic: '',
    isEli5: false,
    history: [],
    currentQuizAnswer: null,
    isWaitingForQuizAnswer: false
};

// Load state from local storage
function loadState() {
    const saved = localStorage.getItem('learnAiState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.score = parsed.score || 0;
        state.history = parsed.history || [];
        updateScoreUI();
        renderHistory();
    }
}

function saveState() {
    localStorage.setItem('learnAiState', JSON.stringify({
        score: state.score,
        history: state.history
    }));
}

// --- DOM Elements ---
const DOM = {
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
    historyList: document.getElementById('history-list')
};

// --- Initialization ---
function init() {
    loadState();
    
    DOM.startBtn.addEventListener('click', startLearning);
    DOM.sendBtn.addEventListener('click', handleUserResponse);
    DOM.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserResponse();
    });
    
    setupVoiceRecognition();
}

// --- UI Updates ---
function updateScoreUI() {
    DOM.scoreDisplay.textContent = state.score;
    const progress = Math.min((state.score / state.maxScore) * 100, 100);
    DOM.progressBar.style.width = `${progress}%`;
    
    // Update badge visually
    DOM.levelDisplay.className = `level-badge ${state.difficulty}`;
    DOM.levelDisplay.textContent = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
}

function renderHistory() {
    DOM.historyList.innerHTML = '';
    // Show last 5
    const recent = state.history.slice(-5).reverse();
    recent.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.textContent = item;
        li.onclick = () => {
            DOM.topicInput.value = item;
            startLearning();
        };
        DOM.historyList.appendChild(li);
    });
}

function scrollToBottom() {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// Securely create HTML elements to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function appendMessage(sender, contentHTML) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    
    const avatarIcon = sender === 'ai' ? 'fa-robot' : 'fa-user';
    
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="message-content">${contentHTML}</div>
    `;
    
    DOM.chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ai-message typing-msg`;
    msgDiv.id = 'typing-indicator';
    
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    DOM.chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// --- Logic Flow ---
async function startLearning() {
    const topic = DOM.topicInput.value.trim();
    if (!topic) {
        alert("Please enter a topic to learn.");
        return;
    }
    
    state.topic = topic;
    state.difficulty = DOM.difficultySelect.value;
    state.isEli5 = DOM.eli5Toggle.checked;
    
    // Add to history
    if (!state.history.includes(topic)) {
        state.history.push(topic);
        saveState();
        renderHistory();
    }
    
    updateScoreUI();
    
    // Clear chat and start
    DOM.chatMessages.innerHTML = '';
    appendMessage('user', `<p>I want to learn about <strong>${escapeHTML(topic)}</strong> (${state.difficulty}${state.isEli5 ? ', ELI5' : ''}).</p>`);
    
    await fetchLesson();
}

// --- Mock AI API ---
// This acts as a placeholder for Google AI API
const MockAIApi = {
    generateLesson: async (topic, difficulty, eli5) => {
        return new Promise(resolve => {
            setTimeout(() => {
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
                    // Generic fallback response
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
            }, 1500); // simulate network delay
        });
    },
    
    evaluateAnswer: async (userAnswer, actualAnswer, keyword) => {
        return new Promise(resolve => {
            setTimeout(() => {
                const isCorrect = userAnswer.toLowerCase().includes(actualAnswer.toLowerCase()) || 
                                  userAnswer.toLowerCase().includes(keyword.toLowerCase());
                resolve({ isCorrect });
            }, 800);
        });
    }
};

async function fetchLesson() {
    showTypingIndicator();
    setInputsEnabled(false);
    
    try {
        // REPLACE THIS with real Google AI Gemini API fetch call later
        const lessonData = await MockAIApi.generateLesson(state.topic, state.difficulty, state.isEli5);
        
        hideTypingIndicator();
        
        let html = `
            <p>${escapeHTML(lessonData.explanation)}</p>
            <h4>Step-by-Step</h4>
            <ul>
                ${lessonData.steps.map(step => `<li>${escapeHTML(step)}</li>`).join('')}
            </ul>
            <h4>Example</h4>
            <p><em>${escapeHTML(lessonData.example)}</em></p>
            
            <div class="quiz-block">
                <h4>Pop Quiz!</h4>
                <p>${escapeHTML(lessonData.quiz.question)}</p>
                <ul>
                    ${lessonData.quiz.options.map(opt => `<li>${escapeHTML(opt)}</li>`).join('')}
                </ul>
                <p><small>Type your answer below...</small></p>
            </div>
        `;
        
        state.currentQuizAnswer = lessonData.quiz;
        state.isWaitingForQuizAnswer = true;
        
        appendMessage('ai', html);
        setInputsEnabled(true);
        DOM.chatInput.focus();
        
    } catch (error) {
        hideTypingIndicator();
        appendMessage('ai', `<p style="color: var(--danger-color)">Sorry, I encountered an error generating the lesson.</p>`);
        setInputsEnabled(true);
    }
}

async function handleUserResponse() {
    if (!state.isWaitingForQuizAnswer) return;
    
    const text = DOM.chatInput.value.trim();
    if (!text) return;
    
    DOM.chatInput.value = '';
    appendMessage('user', `<p>${escapeHTML(text)}</p>`);
    
    showTypingIndicator();
    setInputsEnabled(false);
    
    // Evaluate answer
    const evalResult = await MockAIApi.evaluateAnswer(text, state.currentQuizAnswer.answer, state.currentQuizAnswer.answerKeyword);
    
    hideTypingIndicator();
    
    if (evalResult.isCorrect) {
        // Adaptive Logic: Success
        state.score += 10;
        saveState();
        
        let difficultyMsg = "";
        if (state.difficulty === 'beginner') {
            state.difficulty = 'intermediate';
            difficultyMsg = "You got it! Let's level up to Intermediate.";
        } else if (state.difficulty === 'intermediate') {
            state.difficulty = 'advanced';
            difficultyMsg = "Excellent! You're ready for Advanced concepts.";
        } else {
            difficultyMsg = "Perfect! You've mastered this topic!";
        }
        
        DOM.difficultySelect.value = state.difficulty;
        updateScoreUI();
        
        appendMessage('ai', `<p style="color: var(--success-color)"><strong>Correct!</strong></p><p>${difficultyMsg}</p><p>Want to learn something else, or dive deeper? Enter a new topic or ask a follow up question.</p>`);
        state.isWaitingForQuizAnswer = false; // end loop, wait for new topic
    } else {
        // Adaptive Logic: Fail
        let simplifyMsg = "";
        if (state.difficulty === 'advanced') {
            state.difficulty = 'intermediate';
            simplifyMsg = "Not quite. Let's step back to Intermediate and break it down more.";
        } else if (state.difficulty === 'intermediate') {
            state.difficulty = 'beginner';
            simplifyMsg = "That's incorrect. Let's go back to Beginner basics.";
        } else {
            state.isEli5 = true;
            DOM.eli5Toggle.checked = true;
            simplifyMsg = "Nope! Let me explain it like you're 5 to make it super clear.";
        }
        
        DOM.difficultySelect.value = state.difficulty;
        updateScoreUI();
        
        appendMessage('ai', `<p style="color: var(--warning-color)"><strong>Not quite right.</strong></p><p>${simplifyMsg}</p>`);
        
        // Fetch simplified lesson
        await fetchLesson();
    }
    
    setInputsEnabled(true);
}

function setInputsEnabled(enabled) {
    DOM.chatInput.disabled = !enabled;
    DOM.sendBtn.disabled = !enabled;
    DOM.startBtn.disabled = !enabled;
    DOM.micBtn.disabled = !enabled;
}

// --- Voice Recognition (Bonus) ---
let recognition;

function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            DOM.micBtn.classList.add('recording');
            DOM.voiceStatus.classList.remove('hidden');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            DOM.chatInput.value = transcript;
            // Optionally auto-send
            // handleUserResponse();
        };
        
        recognition.onerror = function(event) {
            console.error("Speech recognition error", event.error);
            DOM.voiceStatus.textContent = "Error: " + event.error;
            setTimeout(() => DOM.voiceStatus.classList.add('hidden'), 2000);
        };
        
        recognition.onend = function() {
            DOM.micBtn.classList.remove('recording');
            DOM.voiceStatus.classList.add('hidden');
            DOM.voiceStatus.textContent = "Listening..."; // reset
        };
        
        DOM.micBtn.addEventListener('click', () => {
            if (DOM.micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        DOM.micBtn.style.display = 'none'; // hide if not supported
    }
}

// Run init
init();
