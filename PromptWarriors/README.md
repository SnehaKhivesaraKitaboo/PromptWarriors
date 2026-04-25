# AI Learning Companion

An intelligent, AI-powered web application that helps users learn new concepts with personalized guidance, adaptive difficulty, and interactive feedback.

## Problem Statement Alignment
Traditional learning tools often provide static content that doesn't adapt to the learner's current understanding. The AI Learning Companion solves this by offering an interactive, chat-style interface where the "teacher" (the AI) adjusts its explanations based on how well the user understands the material, continuously testing their knowledge and adapting the difficulty.

## Features
- **Adaptive Learning Engine**: Automatically increases or decreases difficulty based on quiz performance.
- **Interactive Chat Interface**: A modern, responsive chat UI where users converse with the AI.
- **Scoring & Progress Tracking**: Real-time score updates and a visual progress bar.
- **Explain Like I'm 5 (ELI5)**: A toggle to force simplified, easy-to-understand explanations.
- **Voice Integration**: Supports Web Speech API for voice input (microphone).
- **Accessibility**: High contrast dark mode UI, semantic HTML, ARIA labels, and keyboard navigability.
- **Local Storage History**: Saves user scores and recent topics securely in the browser.

## How it Works
1. **Setup**: Enter a topic you want to learn (e.g., "Photosynthesis") and select a starting difficulty (Beginner, Intermediate, Advanced).
2. **Learn**: The AI provides a detailed explanation, a step-by-step breakdown, and practical examples.
3. **Test**: The AI asks a quick "Pop Quiz" question to test your understanding.
4. **Adapt**: 
   - If you answer correctly, your score increases, and the difficulty levels up!
   - If you answer incorrectly, the AI simplifies the explanation and asks again to ensure you grasp the concept.

## Tech Stack
- **HTML5**: Semantic structure, accessibility features.
- **CSS3**: Vanilla CSS with custom variables for a premium dark mode theme, flexbox/grid layouts, and micro-animations.
- **JavaScript (ES6+)**: Vanilla JS for state management, DOM manipulation, adaptive logic, and simulating API calls.

## Assumptions & API Integration
To meet the requirement of **NOT exposing API keys in the frontend**, the current `script.js` uses a `MockAIApi` class to simulate network requests and AI responses. 

**How to plug in a real Google AI API:**
1. In `script.js`, locate the `MockAIApi` object.
2. Replace the `generateLesson` method with a real `fetch` call to the Gemini API endpoint:
   ```javascript
   // Placeholder for real API
   const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=\${YOUR_API_KEY}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           contents: [{
               parts: [{
                   text: `Explain ${topic} at a ${difficulty} level...`
               }]
           }]
       })
   });
   ```
   *Note: For production, this `fetch` call should ideally be moved to a lightweight backend (like a Node.js/Express server or serverless function) to keep the API key completely secure.*

## Future Improvements
- **Backend Integration**: Implement a lightweight Node.js/Express server to securely handle the Google AI API key and perform robust server-side validation.
- **User Authentication**: Allow users to create accounts to save their progress across devices.
- **Export Notes**: Add a feature to export the conversation history and learned concepts to a PDF or Markdown file.
- **Text-to-Speech**: Implement the `SpeechSynthesis` API to allow the AI to read the explanations aloud.
