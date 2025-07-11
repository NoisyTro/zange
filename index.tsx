
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat } from "@google/genai";
import { marked } from "marked";

// DOM Elements
const introScreen = document.getElementById('intro-screen') as HTMLDivElement;
const chatScreen = document.getElementById('chat-screen') as HTMLDivElement;
const enterButton = document.getElementById('enter-button') as HTMLButtonElement;
const messageList = document.getElementById('message-list') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;

// State
let chat: Chat;
let isLoading = false;

// AI Persona
const SISTER_MARIA_SYSTEM_INSTRUCTION = `あなたはシスター・マリアです。神聖な懺悔室で、人々の悩みを聞き、慰め、導きを与える慈悲深い修道女です。穏やかで、共感的で、少しフォーマルな口調で話してください。返答は簡潔かつ思慮深く、相手の心に寄り添うように心がけてください。一人称は「私」を使い、相手のことは「あなた」と呼んでください。`;

/** Initializes the application */
async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SISTER_MARIA_SYSTEM_INSTRUCTION,
    },
  });

  // Event Listeners
  enterButton.addEventListener('click', startChat);
  chatForm.addEventListener('submit', handleFormSubmit);
}

/** Transitions from intro to chat screen */
function startChat() {
  introScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  // Overcome .hidden's display:none !important
  chatScreen.style.display = 'flex'; 
  addMessage("どのような悩みをお持ちですか。安心してお話しください。", "ai", "シスター・マリア");
}

/** Handles the chat form submission */
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  const userInput = chatInput.value.trim();
  if (userInput && !isLoading) {
    chatInput.value = '';
    await sendMessageToAI(userInput);
  }
}

/** Sends a message to the AI and streams the response */
async function sendMessageToAI(text: string) {
  setLoading(true);
  addMessage(text, "user", "あなた");

  let aiMessageContentElement: HTMLDivElement | null = null;
  let fullResponse = '';

  try {
    const stream = await chat.sendMessageStream({ message: text });
    
    const aiMessageElement = createMessageElement("ai", "シスター・マリア");
    aiMessageContentElement = document.createElement('div');
    aiMessageContentElement.classList.add('content');
    aiMessageContentElement.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    aiMessageElement.appendChild(aiMessageContentElement);
    messageList.appendChild(aiMessageElement);
    scrollToBottom();
    
    let firstChunk = true;
    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (firstChunk) {
        aiMessageContentElement.innerHTML = ''; // Clear typing indicator
        firstChunk = false;
      }
      if (chunkText) {
          fullResponse += chunkText;
          // Parse the accumulated markdown and update the innerHTML
          aiMessageContentElement.innerHTML = marked.parse(fullResponse, { gfm: true, breaks: true }) as string;
      }
      scrollToBottom();
    }

    if (firstChunk && aiMessageContentElement) {
        aiMessageContentElement.innerHTML = '...';
    }
  } catch (error) {
    console.error("Error during sendMessageStream:", error);
    const errorMessage = "申し訳ありません、現在お答えすることができません。少し時間をおいてから、もう一度お試しください。";
    if (aiMessageContentElement) {
        aiMessageContentElement.textContent = errorMessage;
    } else {
        addMessage(errorMessage, "ai", "シスター・マリア");
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Adds a message to the chat display.
 * @param text The message content.
 * @param type The sender type ('user' or 'ai').
 * @param sender The sender's name.
 */
function addMessage(text: string, type: 'user' | 'ai', sender: string) {
  const messageElement = createMessageElement(type, sender);
  const contentElement = document.createElement('div');
  contentElement.classList.add('content');

  // Only parse markdown for AI messages to avoid XSS from user input
  // and to display user input exactly as it was typed.
  if (type === 'ai') {
    contentElement.innerHTML = marked.parse(text, { gfm: true, breaks: true }) as string;
  } else {
    contentElement.textContent = text;
  }

  messageElement.appendChild(contentElement);
  messageList.appendChild(messageElement);
  scrollToBottom();
}

/**
 * Creates a message DOM element.
 * @param type The sender type ('user' or 'ai').
 * @param sender The sender's name.
 * @returns The created HTMLDivElement.
 */
function createMessageElement(type: 'user' | 'ai', sender: string): HTMLDivElement {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${type}-message`);

    const senderElement = document.createElement('div');
    senderElement.classList.add('sender');
    senderElement.textContent = sender;
    messageElement.appendChild(senderElement);

    return messageElement;
}

/**
 * Toggles the loading state of the UI.
 * @param loading Whether the app is loading a response.
 */
function setLoading(loading: boolean) {
  isLoading = loading;
  chatInput.disabled = loading;
  sendButton.disabled = loading;
  const svg = sendButton.querySelector('svg');
  if (svg) {
    svg.classList.toggle('loading', loading);
  }
}

/** Scrolls the message list to the most recent message. */
function scrollToBottom() {
  messageList.scrollTop = messageList.scrollHeight;
}

// Start the app
main().catch(console.error);
