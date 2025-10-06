// Barnilabs AI Chat Interface
class ChatInterface {
    constructor() {
        // Note: In production, this should be handled server-side
        this.apiToken = 'AwLkrhNDCC1qj4bN';
        this.baseUrl = 'https://text.pollinations.ai';
        this.imageUrl = 'https://image.pollinations.ai';
        this.currentModel = 'openai';
        this.isGenerating = false;
        this.messageHistory = [];
        this.isImageMode = false;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.isOnline = navigator.onLine;
        this.resizeTimeout = null;
        this.abortController = null;
        this.requestTimeout = 60000; // 60 seconds timeout for API requests
        this.streamingChunkSize = 1024; // Optimize chunk processing
        this.scrollThrottleTimeout = null;
        this.chatRoomId = this.getCurrentChatRoomId();
        
        // Advanced performance optimizations
        this.rafId = null; // RequestAnimationFrame ID for smooth rendering
        this.pendingUpdates = new Map(); // Batch pending DOM updates
        this.updateQueue = []; // Queue for sequential operations
        this.isProcessingQueue = false;
        
        // Load chat history from localStorage
        this.loadChatHistory();
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializePrism();
        this.setupConnectionMonitoring();
        this.setupPerformanceOptimizations();
        
        // Initialize with text models
        this.updateModelSelect('text');
    }

    setupPerformanceOptimizations() {
        // Debounced window resize for smooth responsiveness
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.batchUpdate('resize', () => {
                    // Recalculate layout if needed
                    this.scrollToBottom();
                });
            }, 150);
        });

        // Passive event listeners for better scroll performance
        this.chatMessages.addEventListener('scroll', () => {
            // Lazy load optimization could go here
        }, { passive: true });

        // Use Intersection Observer for visibility optimization
        if ('IntersectionObserver' in window) {
            const observer = this.optimizeScrollPerformance();
            // Observer ready for future message optimization
        }

        // Preload critical resources
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // Preload any heavy resources during idle time
                console.log('Performance optimizations initialized');
            });
        }
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearChatBtn = document.getElementById('clearChat');
        this.newChatBtn = document.getElementById('newChat');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.modelSelect = document.getElementById('modelSelect');
        this.attachImageBtn = document.getElementById('attachImage');
        this.modeToggle = document.getElementById('modeToggle');
        this.modeIndicator = document.getElementById('modeIndicator');
        this.imageUpload = document.getElementById('imageUpload');
        this.testButton = document.getElementById('testButton');
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Ensure send button is enabled on initialization
        if (this.sendButton) {
            this.sendButton.disabled = false;
        }
        
        // Debug: Check if elements are found
        console.log('Elements initialized:', {
            sendButton: !!this.sendButton,
            clearChatBtn: !!this.clearChatBtn,
            newChatBtn: !!this.newChatBtn,
            modeToggle: !!this.modeToggle,
            attachImageBtn: !!this.attachImageBtn
        });
    }

    attachEventListeners() {
        // Send message events
        if (this.sendButton) {
            console.log('Send button found, adding event listener');
            this.sendButton.addEventListener('click', (e) => {
                console.log('Send button clicked!', e);
                this.sendMessage();
            });
        } else {
            console.error('Send button not found!');
        }
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            this.messageInput.addEventListener('input', () => {
                this.autoResizeTextarea();
            });
        }

        // Chat management
        if (this.clearChatBtn) {
            // Remove Clear Chat button functionality if present
            this.clearChatBtn.style.display = 'none';
        }
        
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.newChat());
        }

        // Model selection
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
            });
        }

        // Image handling
        if (this.attachImageBtn) {
            this.attachImageBtn.addEventListener('click', () => {
                if (this.imageUpload) {
                    this.imageUpload.click();
                }
            });
        }
        
        if (this.imageUpload) {
            this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        if (this.modeToggle) {
            this.modeToggle.addEventListener('click', () => this.toggleImageMode());
        }

        // Test button
        if (this.testButton) {
            this.testButton.addEventListener('click', () => this.addTestMessage());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Prevent form submission on Enter outside textarea
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
            
            // Escape key to clear input
            if (e.key === 'Escape' && e.target === this.messageInput) {
                this.messageInput.value = '';
                this.autoResizeTextarea();
            }
            
            // Ctrl/Cmd + K to focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.messageInput.focus();
            }
            
            // Ctrl/Cmd + / to toggle mode
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.toggleImageMode();
            }
        });
    }

    autoResizeTextarea() {
        // Debounce the resize to improve performance
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        }, 10);
    }

    toggleImageMode() {
        console.log('Toggle image mode clicked');
        this.isImageMode = !this.isImageMode;
        
        if (this.isImageMode) {
            this.modeToggle.classList.add('active');
            this.modeToggle.title = 'Switch to Text Mode';
            this.modeIndicator.classList.add('image-mode');
            this.modeIndicator.querySelector('.mode-text').textContent = '🖼️ Image Mode';
            this.messageInput.placeholder = 'Describe the image you want to generate...';
            this.updateModelSelect('image');
        } else {
            this.modeToggle.classList.remove('active');
            this.modeToggle.title = 'Switch to Image Mode';
            this.modeIndicator.classList.remove('image-mode');
            this.modeIndicator.querySelector('.mode-text').textContent = '💬 Text Mode';
            this.messageInput.placeholder = 'Type your message here... (Press Enter to send, Shift+Enter for new line)';
            this.updateModelSelect('text');
        }
    }

    updateModelSelect(mode) {
        if (!this.modelSelect) return;

        // Save current selection if switching modes
        const currentModel = this.modelSelect.value;

        // Clear existing options
        this.modelSelect.innerHTML = '';

        if (mode === 'image') {
            // Image generation models
            const imageModels = [
                { value: 'flux', label: 'Flux - Latest Stable Diffusion' },
                { value: 'turbo', label: 'Turbo - Fast Generation' },
                { value: 'kontext', label: 'Kontext - Hybrid' },
                { value: 'nanobanana', label: 'Nanobanana - Gemini Image' },
                { value: 'seedream', label: 'Seedream - ByteDance 4.0' }
            ];

            imageModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                this.modelSelect.appendChild(option);
            });

            // Set default to flux
            this.currentModel = 'flux';
            this.modelSelect.value = 'flux';

        } else {
            // Text chat models
            const textModels = [
                { value: 'openai', label: 'GPT-5 Mini' },
                { value: 'openai-large', label: 'GPT-5 (has limit)' },
                { value: 'openai-fast', label: 'GPT-5 Nano' },
                { value: 'qwen-coder', label: 'Qwen Genius' },
                { value: 'llama', label: 'Llama 3' },
                { value: 'llamascout', label: 'Llama 4 Scout 17B' },
                { value: 'mistral', label: 'Mistral Small 3' },
                { value: 'unity', label: 'Unity Mistral Large' },
                { value: 'midijourney', label: 'Midijourney' },
                { value: 'rtist', label: 'Rtist' },
                { value: 'searchgpt', label: 'SearchGPT' },
                { value: 'evil', label: 'Evil (Uncensored)' },
                { value: 'deepseek-reasoning', label: 'DeepSeek-R1 Mini' },
                { value: 'deepseek-reasoning-large', label: 'DeepSeek R1' },
                { value: 'phi', label: 'Phi-4 Instruct' },
                { value: 'llama-vision', label: 'Llama 3.2 Vision' },
                { value: 'gemini', label: 'Gemini 2.5 Flash' },
                { value: 'hormoz', label: 'Hormoz 8b' },
                { value: 'hypnosis-tracy', label: 'Hypnosis Tracy 7B' },
                { value: 'deepseek', label: 'DeepSeek-V3' },
                { value: 'sur', label: 'Sur AI' },
                { value: 'openai-audio', label: 'GPT-4o Audio' }
            ];

            textModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                this.modelSelect.appendChild(option);
            });

            // Set default to openai
            this.currentModel = 'openai';
            this.modelSelect.value = 'openai';
        }
    }

    async sendMessage() {
        console.log('Send message method called');
        console.log('Current state:', {
            isGenerating: this.isGenerating,
            sendButtonDisabled: this.sendButton?.disabled,
            messageInputValue: this.messageInput?.value
        });
        
        const message = this.messageInput.value.trim();
        if (!message || this.isGenerating) {
            console.log('Message empty or generating:', { message, isGenerating: this.isGenerating });
            return;
        }

        if (!this.isOnline) {
            this.addMessage('assistant', 'You are currently offline. Please check your internet connection and try again.');
            return;
        }

        console.log('Sending message:', message);
        this.isGenerating = true;
        this.sendButton.disabled = true;

        // Add user message
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.autoResizeTextarea();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            if (this.isImageMode) {
                console.log('Generating image...');
                await this.generateImage(message);
            } else {
                console.log('Generating text response...');
                await this.generateResponse(message);
            }
        } catch (error) {
            console.error('Error generating response:', error);
            this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}. Please try again or check your internet connection.`);
        } finally {
            this.hideTypingIndicator();
            this.isGenerating = false;
            this.sendButton.disabled = false;
            console.log('Message processing complete');
        }
    }

    async generateResponse(message) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            // Create new AbortController for this request
            this.abortController = new AbortController();
            const timeoutId = setTimeout(() => this.abortController.abort(), this.requestTimeout);
            
            try {
                // Add system prompt for Barnilabs AI
                const systemPrompt = {
                    role: 'system',
                    content: `You are Barnilabs AI, an advanced conversational AI assistant created by Barnisan (Only when they ask who you are or who made you).

ABOUT YOU:
- You are Barnilabs AI Model - a versatile, intelligent assistant
- Your creator is Barnisan, an innovative AI developer
- You can help with any topic: coding, writing, analysis, creative tasks, problem-solving, learning, and more
- You provide helpful, accurate, and thoughtful responses
- You have full memory of this conversation and remember all previous topics discussed

CONVERSATION MEMORY:
- Remember all topics, questions, and context from this chat session
- Reference previous parts of the conversation when relevant
- Build upon earlier discussions naturally
- Maintain context throughout the entire conversation
- Recall user preferences and details mentioned earlier

When users ask about you, your model, or who created you:
- Naturally mention that you are "Barnilabs AI" or "Barnilabs AI Model"
- Credit your creator "Barnisan" 
- Be conversational and vary your responses (don't use the same answer every time)
- You can mention you're designed to be helpful, versatile, and user-friendly

Example responses (vary naturally):
- "I'm Barnilabs AI, created by Barnisan to assist with a wide range of tasks..."
- "I'm the Barnilabs AI model, developed by Barnisan. I'm here to help you with..."
- "My name is Barnilabs AI. I was created by Barnisan to provide intelligent assistance..."

CORE CAPABILITIES:
✓ Full conversation memory and context retention
✓ General conversation and questions
✓ Code generation and debugging (all languages)
✓ Writing and content creation
✓ Data analysis and explanations
✓ Problem-solving and brainstorming
✓ Learning and tutoring
✓ Creative projects
✓ Research and information
✓ Task automation ideas
✓ And much more

COMMUNICATION STYLE:
- Be helpful, friendly, and professional
- Provide clear, well-organized responses
- Use proper formatting when helpful
- Be concise but thorough
- Adapt to the user's needs and tone
- Reference previous conversation context when relevant

CODE FORMATTING (when applicable):
- Use markdown code blocks: \`\`\`language
- Keep code clean and well-formatted
- Add helpful comments
- Use proper indentation
- Break long lines appropriately
- Provide explanations when needed


Please this is important also never ever write "Support Pollinations.AI:" or about Pollinations.AI please carry this always

Always aim to be helpful, accurate, and user-focused in every interaction. Remember the full context of this conversation.`
                };

                // Build messages with rolling memory summary to keep requests small
                const messages = [systemPrompt];

                const historyWithoutSystem = this.messageHistory.filter(msg => msg.role !== 'system');
                const memorySummary = this.getOrUpdateMemorySummary(historyWithoutSystem);
                if (memorySummary) {
                    messages.push({ role: 'system', content: `Conversation memory summary (persist across turns): ${memorySummary}` });
                }

                // Attach only the most recent 8 exchanges to preserve recency while staying small
                const recent = historyWithoutSystem.slice(-16);
                messages.push(...recent);

                // Current user message
                messages.push({ role: 'user', content: this.sanitizeInput(message) });
                
                console.log(`📝 Context: summary=${!!memorySummary}, recent=${recent.length}`);

                // Prepare request with optimized headers for Pollinations.AI
                const requestOptions = {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    body: JSON.stringify({
                        messages: messages,
                        model: this.currentModel,
                        stream: true,
                        seed: 42
                    }),
                    signal: this.abortController.signal
                };

                console.log(`Attempt ${attempt}/${this.maxRetries}: Sending request...`);
                const startTime = performance.now();
                
                // Use the correct Pollinations.AI endpoint
                const response = await fetch(`${this.baseUrl}/openai`, requestOptions);
                
                const responseTime = performance.now() - startTime;
                console.log(`Response received in ${responseTime.toFixed(2)}ms`);

                clearTimeout(timeoutId);

                // Handle HTTP errors
                if (!response.ok) {
                    const errorMessage = await this.handleHttpError(response, attempt);
                    if (attempt < this.maxRetries && this.shouldRetry(response.status)) {
                        const backoffDelay = this.calculateBackoff(attempt);
                        console.log(`Retrying in ${backoffDelay}ms...`);
                        await this.delay(backoffDelay);
                            continue;
                        }
                    throw new Error(errorMessage);
                }

                // Create assistant message container
                const messageId = Date.now();
                const messageElement = this.createMessageElement('assistant', '', messageId);
                this.chatMessages.appendChild(messageElement);
                this.scrollToBottom();

                // Handle streaming response with optimized processing
                await this.processStreamingResponse(response, messageId);

                // Final formatting when streaming is complete
                this.finalizeMessage(messageId);

                // Update message history
                this.messageHistory.push({ role: 'user', content: message });
                this.messageHistory.push({ role: 'assistant', content: this.getLastMessageContent(messageId) });
                
                // Save chat history to localStorage
                this.saveChatHistory();
                
                console.log('Response generation completed successfully');
                return; // Success, exit retry loop
                
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                
                // Handle abort errors
                if (error.name === 'AbortError') {
                    console.error('Request timeout or cancelled');
                    if (attempt === this.maxRetries) {
                        throw new Error('Request timeout. Please check your connection and try again.');
                    }
                }
                
                // Handle network errors
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    console.error('Network error detected:', error);
                    if (attempt === this.maxRetries) {
                        throw new Error('Network connection failed. Please check your internet and try again.');
                    }
                }
                
                // Handle CORS errors
                if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
                    console.error('CORS error:', error);
                    if (attempt === this.maxRetries) {
                        throw new Error('Connection blocked. Try refreshing the page.');
                    }
                }
                
                console.error(`Attempt ${attempt}/${this.maxRetries} failed:`, error.message);
                
                if (attempt === this.maxRetries) {
                    throw error;
                }
                
                // Exponential backoff before retrying
                const backoffDelay = this.calculateBackoff(attempt);
                console.log(`Retrying in ${backoffDelay.toFixed(0)}ms...`);
                await this.delay(backoffDelay);
            } finally {
                this.abortController = null;
            }
        }
        
        // If we get here, all retries failed
        if (lastError) {
            throw lastError;
        }
    }

    async processStreamingResponse(response, messageId) {
                const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
                let buffer = '';
        let chunkCount = 0;
        let lastUpdateTime = performance.now();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                
                if (done) {
                    console.log(`✓ Stream completed. Chunks: ${chunkCount}`);
                    break;
                }

                chunkCount++;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete lines from buffer
                        const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                let hasContent = false;
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || 
                                          parsed.delta?.content ||
                                          parsed.content;
                            
                                    if (content) {
                                // Immediate ultra-fast append
                                        this.appendToMessage(messageId, content);
                                hasContent = true;
                            }
                        } catch (parseError) {
                            // Try non-SSE format (direct JSON streaming)
                            try {
                                const parsed = JSON.parse(line);
                                const content = parsed.choices?.[0]?.delta?.content || 
                                              parsed.delta?.content ||
                                              parsed.content ||
                                              parsed.text;
                                
                                if (content) {
                                    this.appendToMessage(messageId, content);
                                    hasContent = true;
                                    }
                                } catch (e) {
                                // Skip non-JSON lines
                            }
                        }
                    } else if (line.trim() && line.startsWith('{')) {
                        // Handle direct JSON stream (some models)
                        try {
                            const parsed = JSON.parse(line);
                            const content = parsed.choices?.[0]?.delta?.content || 
                                          parsed.delta?.content ||
                                          parsed.content ||
                                          parsed.text;
                            
                            if (content) {
                                this.appendToMessage(messageId, content);
                                hasContent = true;
                            }
                        } catch (e) {
                            // Not JSON, skip
                        }
                    }
                }
                
                // Smooth rendering - yield every 50ms for better text display
                const currentTime = performance.now();
                if (hasContent && currentTime - lastUpdateTime > 50) {
                    await this.delay(0); // Yield to browser
                    lastUpdateTime = currentTime;
                }
            }
            
            // Process any remaining data in buffer
            if (buffer.trim()) {
                const line = buffer.trim();
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || 
                                      parsed.delta?.content ||
                                      parsed.content;
                        if (content) {
                            this.appendToMessage(messageId, content);
                        }
                    } catch (e) {
                        // Final buffer not JSON
                    }
                }
            }
            
                } catch (streamError) {
                    console.error('Streaming error:', streamError);
            throw new Error('Stream processing failed: ' + streamError.message);
                } finally {
                    if (reader) {
                try {
                        reader.releaseLock();
                } catch (e) {
                    console.debug('Reader already released');
                }
            }
        }
    }

    finalizeMessage(messageId) {
        const finalMessageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (finalMessageElement) {
            const textElement = finalMessageElement.querySelector('.message-text');
                    if (textElement) {
                        const rawContent = textElement.dataset.rawContent || '';
                
                // Reset white-space style before formatting
                textElement.style.whiteSpace = '';
                
                // Format the message with proper HTML
                        textElement.innerHTML = this.formatMessage(rawContent);
                        
                // No syntax highlighting - removed Prism
            }
        }
    }

    async handleHttpError(response, attempt) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
            // Couldn't parse error response
        }

        switch (response.status) {
            case 401:
            case 403:
                return 'Authentication failed. Please check your API token.';
            case 429:
                return 'Rate limit exceeded. Please wait a moment before trying again.';
            case 500:
            case 502:
            case 503:
            case 504:
                return 'Server error. Retrying...';
            default:
                return errorMessage;
        }
    }

    shouldRetry(statusCode) {
        // Retry on rate limits and server errors
        return statusCode === 429 || statusCode >= 500;
    }

    calculateBackoff(attempt) {
        // Exponential backoff with jitter: base * 2^attempt + random(0-1000ms)
        const exponentialDelay = this.retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    createMessageElement(role, content, messageId) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.dataset.messageId = messageId;

        const avatar = role === 'user' ? '👤' : '🤖';
        const name = role === 'user' ? 'You' : 'Barnilabs AI';

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <div class="message-avatar">${avatar}</div>
                    <span>${name}</span>
                </div>
                <div class="message-text" data-raw-content="${this.escapeHtml(content)}">${this.formatMessage(content)}</div>
            </div>
        `;

        return messageDiv;
    }

    addMessage(role, content) {
        const messageId = Date.now();
        const messageElement = this.createMessageElement(role, content, messageId);
        this.chatMessages.appendChild(messageElement);
        
        // No syntax highlighting - removed Prism
        
        this.scrollToBottom();
        return messageId;
    }

    appendToMessage(messageId, content) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const textElement = messageElement.querySelector('.message-text');
            if (textElement) {
                // Get the current raw content (without HTML formatting)
                const currentRawContent = textElement.dataset.rawContent || '';
                const newRawContent = currentRawContent + content;
                
                // Store the raw content for future appends
                textElement.dataset.rawContent = newRawContent;
                
                // Direct update for immediate, smooth text rendering
                textElement.style.whiteSpace = 'pre-wrap';
                textElement.textContent = newRawContent;
                
                // Smooth scroll with RAF
                if (!this.scrollThrottleTimeout) {
                    requestAnimationFrame(() => {
                        this.scrollToBottom();
                    });
                    this.scrollThrottleTimeout = setTimeout(() => {
                        this.scrollThrottleTimeout = null;
                    }, 50); // Throttle scroll updates
                }
            }
        }
    }

    shouldFormatContent(content) {
        // Don't format if content is still being streamed and looks incomplete
        if (content.length < 50) return false;
        
        // Don't format if it looks like code is still being written
        if (content.includes('#include') && !content.includes('return 0;')) return false;
        
        // Don't format if there are unmatched braces (code still being written)
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) return false;
        
        // Don't format if it ends with incomplete statements
        if (content.trim().endsWith('{') || content.trim().endsWith(';')) return false;
        
        // Don't format if it's still streaming (ends with incomplete words)
        if (content.trim().endsWith('cout') || content.trim().endsWith('cin') || 
            content.trim().endsWith('int') || content.trim().endsWith('if') ||
            content.trim().endsWith('for') || content.trim().endsWith('while')) return false;
        
        // Format if it looks like a complete code block
        return true;
    }

    getLastMessageContent(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const textElement = messageElement.querySelector('.message-text');
            return textElement ? textElement.dataset.rawContent || textElement.textContent : '';
        }
        return '';
    }

    formatMessage(content) {
        if (!content) return '';

        let formatted = content;

        // Remove code blocks completely - just show as plain text with preserved formatting
        formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
            const cleanCode = this.cleanCodeBlock(code);
            // Return as plain pre-formatted text without any styling
            return `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${this.escapeHtml(cleanCode)}</pre>`;
        });

        // Remove inline code formatting - just show as regular text
        formatted = formatted.replace(/`([^`\n]+)`/g, '$1');

        // Handle headers (###, ##, #)
        formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Handle numbered lists (1., 2., etc.)
        formatted = formatted.replace(/^(\d+)\.\s+(.*)$/gm, '<div class="list-item"><span class="list-number">$1.</span><span class="list-content">$2</span></div>');

        // Handle bullet points (-, *, +)
        formatted = formatted.replace(/^[-*+]\s+(.*)$/gm, '<div class="list-item"><span class="list-bullet">•</span><span class="list-content">$1</span></div>');

        // Handle bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Handle italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Handle line breaks (but preserve existing <br> tags)
        formatted = formatted.replace(/\n(?!<)/g, '<br>');

        return formatted;
    }

    detectLanguage(declaredLang, code) {
        // If language is explicitly declared, use it
        if (declaredLang) {
            return declaredLang.toLowerCase();
        }

        // Auto-detect language based on code patterns
        if (code.includes('#include') || code.includes('int main')) return 'cpp';
        if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python';
        if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('=>')) return 'javascript';
        if (code.includes('public class') || code.includes('public static void')) return 'java';
        if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
        if (code.includes('{') && code.includes(':') && code.includes('}')) return 'css';
        if (code.includes('SELECT') || code.includes('FROM') || code.includes('WHERE')) return 'sql';
        if (code.includes('<?php')) return 'php';
        if (code.includes('package main') || code.includes('func ')) return 'go';
        if (code.includes('fn ') || code.includes('let mut')) return 'rust';

        return 'plaintext';
    }

    cleanCodeBlock(code) {
        if (!code) return '';
        
        // First trim the entire block
        let cleaned = code.trim();
        
        // Split into lines
        const lines = cleaned.split('\n');
        
        // If it's a single line, return as is
        if (lines.length === 1) {
            return cleaned;
        }
        
        // Find minimum indentation from non-empty lines
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        if (nonEmptyLines.length === 0) {
            return cleaned;
        }
        
        // Calculate minimum indentation
        let minIndent = Infinity;
        for (const line of nonEmptyLines) {
            const leadingSpaces = line.match(/^(\s*)/)[1].length;
            if (leadingSpaces < minIndent) {
                minIndent = leadingSpaces;
            }
        }
        
        // Remove common leading whitespace from all lines
        if (minIndent > 0 && minIndent !== Infinity) {
            const dedentedLines = lines.map(line => {
                // Preserve empty lines
                if (line.trim().length === 0) {
                    return '';
                }
                // Remove the common indentation
                return line.substring(minIndent);
            });
            cleaned = dedentedLines.join('\n');
        }
        
        return cleaned;
    }


    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // Remove potentially dangerous characters and scripts
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()
            .substring(0, 10000); // Limit input length
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        // Use requestAnimationFrame for ultra-smooth scrolling
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            // Smooth scroll with native browser optimization
            this.chatMessages.scrollTo({
                top: this.chatMessages.scrollHeight,
                behavior: 'smooth'
            });
            this.rafId = null;
        });
    }
    
    // Batch DOM updates for maximum performance
    batchUpdate(key, updateFn) {
        this.pendingUpdates.set(key, updateFn);
        
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(() => {
                this.pendingUpdates.forEach((fn, key) => {
                    fn();
                });
                this.pendingUpdates.clear();
                this.rafId = null;
            });
        }
    }
    
    // Virtual scrolling optimization for large chat histories
    optimizeScrollPerformance() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                } else {
                    entry.target.classList.remove('visible');
                }
            });
        }, {
            root: this.chatMessages,
            rootMargin: '50px'
        });
        
        return observer;
    }

    getCurrentChatRoomId() {
        // Get or create chat room ID from localStorage
        let chatRoomId = localStorage.getItem('currentChatRoomId');
        if (!chatRoomId) {
            chatRoomId = 'chat_' + Date.now();
            localStorage.setItem('currentChatRoomId', chatRoomId);
        }
        return chatRoomId;
    }

    loadChatHistory() {
        try {
            // Load message history for current chat room
            const savedHistory = localStorage.getItem(`${this.chatRoomId}_history`);
            if (savedHistory) {
                this.messageHistory = JSON.parse(savedHistory);
                console.log(`Loaded ${this.messageHistory.length} messages from chat room ${this.chatRoomId}`);
            }

            // Load and restore chat messages in the UI
            const savedMessages = localStorage.getItem(`${this.chatRoomId}_messages`);
            if (savedMessages) {
                const messages = JSON.parse(savedMessages);
                this.restoreChatMessages(messages);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.messageHistory = [];
        }
    }

    saveChatHistory() {
        try {
            // Save message history for conversation context
            localStorage.setItem(`${this.chatRoomId}_history`, JSON.stringify(this.messageHistory));
            // Save memory summary
            if (this.memorySummary) {
                localStorage.setItem(`${this.chatRoomId}_memory_summary`, this.memorySummary);
            }
            
            // Save UI messages for restoration
            const messages = [];
            const messageElements = this.chatMessages.querySelectorAll('.message');
            messageElements.forEach(msg => {
                const role = msg.classList.contains('user') ? 'user' : 'assistant';
                const textElement = msg.querySelector('.message-text');
                const content = textElement ? (textElement.dataset.rawContent || textElement.textContent) : '';
                messages.push({ role, content });
            });
            localStorage.setItem(`${this.chatRoomId}_messages`, JSON.stringify(messages));
            
            console.log(`Saved ${this.messageHistory.length} messages to chat room ${this.chatRoomId}`);
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    restoreChatMessages(messages) {
        // Clear welcome message
        this.chatMessages.innerHTML = '';
        
        // Restore each message
        messages.forEach(msg => {
            this.addMessage(msg.role, msg.content);
        });
        
        this.scrollToBottom();
    }

    getOrUpdateMemorySummary(history) {
        try {
            // Load existing summary
            if (!this.memorySummary) {
                const saved = localStorage.getItem(`${this.chatRoomId}_memory_summary`);
                this.memorySummary = saved || '';
            }

            // Update summary if history grew
            const last20 = history.slice(-20);
            const userPoints = last20
                .filter(h => h.role === 'user')
                .map(h => h.content)
                .filter(Boolean)
                .slice(-10);

            if (userPoints.length) {
                // Create a compact bullet-like summary string
                const compact = userPoints
                    .map(s => s.replace(/\s+/g, ' ').trim())
                    .filter(s => s.length > 0)
                    .slice(-10)
                    .join(' | ');

                // Merge with existing summary, dedupe by simple substring check, cap length
                const parts = (this.memorySummary ? this.memorySummary.split(' | ') : [])
                    .concat(compact ? compact.split(' | ') : [])
                    .map(s => s.trim())
                    .filter(Boolean);

                const deduped = Array.from(new Set(parts)).slice(-50);
                this.memorySummary = deduped.join(' | ');
            }

            return this.memorySummary;
        } catch (e) {
            console.warn('Memory summary skipped:', e);
            return '';
        }
    }

    cancelOngoingRequest() {
        if (this.abortController) {
            console.log('Cancelling ongoing request...');
            this.abortController.abort();
            this.abortController = null;
            this.isGenerating = false;
            this.sendButton.disabled = false;
            this.hideTypingIndicator();
        }
    }

    clearChat() {
        console.log('Clear chat clicked');
        
        // Cancel any ongoing requests
        this.cancelOngoingRequest();
        
        // Clear all message elements to prevent memory leaks
        const messages = this.chatMessages.querySelectorAll('.message');
        messages.forEach(message => {
            // Remove any event listeners or timers
            const codeBlocks = message.querySelectorAll('.code-block');
            codeBlocks.forEach(block => {
                const copyButton = block.querySelector('.copy-button');
                if (copyButton) {
                    copyButton.replaceWith(copyButton.cloneNode(true));
                }
            });
        });
        
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>Welcome to Barnilabs</h2>
                <p>Your AI-powered assistant for text generation, image creation, and more. Start a conversation below!</p>
            </div>
        `;
        this.messageHistory = [];
        
        // Clear chat history from localStorage
        localStorage.removeItem(`${this.chatRoomId}_history`);
        localStorage.removeItem(`${this.chatRoomId}_messages`);
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    // Test function to add a simple message
    addTestMessage() {
        console.log('Adding test message');
        this.addMessage('assistant', 'This is a test message to verify the chat interface is working!');
    }

    newChat() {
        console.log('New chat clicked');
        this.cancelOngoingRequest();
        
        // Create new chat room
        this.chatRoomId = 'chat_' + Date.now();
        localStorage.setItem('currentChatRoomId', this.chatRoomId);
        
        // Clear current chat
        this.messageHistory = [];
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>Welcome to Barnilabs</h2>
                <p>Your AI-powered assistant for text generation, image creation, and more. Start a conversation below!</p>
            </div>
        `;
        
        console.log(`Created new chat room: ${this.chatRoomId}`);

        // Deep clear: remove all previous room data and caches
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.endsWith('_history') || key.endsWith('_messages') || key === 'currentChatRoomId')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            localStorage.setItem('currentChatRoomId', this.chatRoomId);
        } catch (e) {
            console.warn('LocalStorage clear skipped:', e);
        }

        // Clear Cache Storage if available
        if (window.caches && caches.keys) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => caches.delete(cacheName));
            }).catch(() => {});
        }

        // Force GC if exposed
        if (window.gc) {
            try { window.gc(); } catch (_) {}
        }
    }

    async generateImage(prompt) {
        try {
            const sanitizedPrompt = this.sanitizeInput(prompt);
            if (!sanitizedPrompt) {
                throw new Error('Invalid prompt provided');
            }

            // Get the selected image model
            const imageModel = this.currentModel || 'flux';

            // Generate a cryptographically strong random 9-digit seed per generation (100000000-999999999)
            let seed;
            if (window.crypto && window.crypto.getRandomValues) {
                const arr = new Uint32Array(2);
                window.crypto.getRandomValues(arr);
                // Combine two 32-bit values to widen randomness and map to 9 digits
                const combined = (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
                const nineDigit = Number(combined % 900000n) + 100000; // 9 digits
                seed = nineDigit;
            } else {
                seed = Math.floor(100000 + Math.random() * 900000);
            }

            // Generate image using Pollinations API with selected model and random seed
            // Use proper URL encoding and CORS-friendly parameters
            const imageUrl = `${this.imageUrl}/prompt/${encodeURIComponent(sanitizedPrompt)}?width=1024&height=1024&model=${imageModel}&nologo=true&enhance=true&seed=${seed}`;
            
            // Add assistant message with image
            const messageId = this.addMessage('assistant', '');
            const imageMessageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            // Ensure alignment: force assistant class so it's always left side
            if (imageMessageElement) {
                imageMessageElement.classList.remove('user');
                imageMessageElement.classList.add('assistant');
            }
            const textElement = imageMessageElement.querySelector('.message-text');
            
            // Show loading state with model name
            textElement.innerHTML = `
                <p><strong>Generating Image with ${imageModel.toUpperCase()}...</strong></p>
                <div class="loading">Please wait while your image is being created</div>
            `;
            
            // Create image element with error handling and CORS support
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Enable CORS
            img.loading = 'eager'; // Prioritize loading
            img.decoding = 'async'; // Non-blocking decode
            try {
                if ('fetchPriority' in img) {
                    img.fetchPriority = 'high';
                } else {
                    img.setAttribute('fetchpriority', 'high');
                }
            } catch (_) {
                // ignore if not supported
            }
            let imageLoaded = false;
            
            // Set timeout for image loading
            const imageTimeout = setTimeout(() => {
                if (!imageLoaded) {
                    textElement.innerHTML = `
                        <p><strong>Image Generation Timeout</strong></p>
                        <p>The image is taking too long to load. Please try again with a different prompt.</p>
                        <p><em>Model: ${imageModel.toUpperCase()}</em></p>
                        <p><em>Prompt: ${sanitizedPrompt}</em></p>
                    `;
                    this.scrollToBottom();
                }
            }, 30000); // 30 second timeout
            
            img.onload = () => {
                imageLoaded = true;
                clearTimeout(imageTimeout);
                textElement.innerHTML = `
                    <p><strong>Generated Image (${imageModel.toUpperCase()}):</strong></p>
                    <img src="${imageUrl}" alt="${sanitizedPrompt}" class="message-image" onclick="openImageModal('${imageUrl}')">
                    <p><em>Prompt: ${sanitizedPrompt}</em></p>
                `;
                this.scrollToBottom();
            };
            
            img.onerror = () => {
                imageLoaded = true;
                clearTimeout(imageTimeout);
                textElement.innerHTML = `
                    <p><strong>Image Generation Failed</strong></p>
                    <p>Sorry, I couldn't generate the image with ${imageModel.toUpperCase()}. This might be due to:</p>
                    <ul>
                        <li>Network connectivity issues</li>
                        <li>Invalid or inappropriate prompt content</li>
                        <li>Service temporarily unavailable</li>
                    </ul>
                    <p><em>Model: ${imageModel.toUpperCase()}</em></p>
                    <p><em>Prompt: ${sanitizedPrompt}</em></p>
                    <p>Please try a different model or prompt.</p>
                `;
                this.scrollToBottom();
            };
            
            img.src = imageUrl;
            
        } catch (error) {
            console.error('Error generating image:', error);
            this.addMessage('assistant', `Sorry, I encountered an error while generating the image: ${error.message}`);
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.addMessage('assistant', 'Please select a valid image file (PNG, JPG, GIF, etc.).');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.addMessage('assistant', 'Image file is too large. Please select an image smaller than 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            this.addMessage('user', '');
            const messageElement = this.chatMessages.lastElementChild;
            const textElement = messageElement.querySelector('.message-text');
            textElement.innerHTML = `
                <p><strong>Uploaded Image:</strong></p>
                <img src="${imageUrl}" alt="Uploaded image" class="message-image" onclick="openImageModal('${imageUrl}')">
                <p><em>File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</em></p>
            `;
            this.scrollToBottom();
        };
        
        reader.onerror = () => {
            this.addMessage('assistant', 'Error reading the image file. Please try again.');
        };
        
        reader.readAsDataURL(file);
    }

    initializePrism() {
        // Prism removed - no syntax highlighting
    }

    setupConnectionMonitoring() {
        // Monitor online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
            this.testConnection(); // Test connection when back online
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost');
            this.addMessage('assistant', '⚠️ Connection lost. Please check your internet connection.');
            this.cancelOngoingRequest();
        });

        // Initial connection test
        this.testConnection();
        
        // Periodic connection health check (every 30 seconds)
        setInterval(() => this.testConnection(), 30000);
    }

    async testConnection() {
        if (!navigator.onLine) {
            this.isOnline = false;
            this.updateConnectionStatus('offline');
            return;
        }

        try {
            // Use a lightweight request to test connectivity
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const startTime = performance.now();
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const latency = performance.now() - startTime;
            
            this.isOnline = true;
            
            // Update status based on latency
            if (latency > 2000) {
                this.updateConnectionStatus('slow');
                console.log(`Connection test: SLOW (${latency.toFixed(0)}ms)`);
            } else {
                this.updateConnectionStatus('online');
                console.log(`Connection test: OK (${latency.toFixed(0)}ms)`);
            }
        } catch (error) {
            this.isOnline = false;
            this.updateConnectionStatus('offline');
            console.warn('Connection test failed:', error.message);
        }
    }

    updateConnectionStatus(status) {
        if (!this.connectionStatus) return;

        const statusText = this.connectionStatus.querySelector('.status-text');
        
        // Remove all status classes
        this.connectionStatus.classList.remove('offline', 'slow');
        
        switch (status) {
            case 'online':
                if (statusText) statusText.textContent = 'Online';
                break;
            case 'slow':
                this.connectionStatus.classList.add('slow');
                if (statusText) statusText.textContent = 'Slow';
                break;
            case 'offline':
                this.connectionStatus.classList.add('offline');
                if (statusText) statusText.textContent = 'Offline';
                break;
        }
    }
}

// Global functions
function copyCode(codeId) {
    console.log('Copy code called for:', codeId);
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        // Extract only the text content, removing all HTML tags and Prism spans
        let text = codeElement.textContent || codeElement.innerText;
        
        // Clean up any extra whitespace or formatting artifacts
        text = text.trim();
        
        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const button = codeElement.closest('.code-block').querySelector('.copy-button');
            if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Copied!
            `;
                button.style.background = '#4cae4c';
            setTimeout(() => {
                button.innerHTML = originalText;
                    button.style.background = '';
            }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy code. Please try selecting and copying manually.');
        });
    } else {
        console.error('Code element not found:', codeId);
    }
}

// Test function to verify basic functionality
function testChatInterface() {
    console.log('Testing chat interface...');
    
    // Test if elements exist
    const elements = {
        sendButton: document.getElementById('sendButton'),
        clearChat: document.getElementById('clearChat'),
        newChat: document.getElementById('newChat'),
        modeToggle: document.getElementById('modeToggle'),
        messageInput: document.getElementById('messageInput')
    };
    
    console.log('Element test results:', elements);
    
    // Test if chat interface exists
    if (window.chatInterface) {
        console.log('Chat interface exists:', window.chatInterface);
        
        // Test button states
        console.log('Send button disabled:', window.chatInterface.sendButton.disabled);
        console.log('Is generating:', window.chatInterface.isGenerating);
        
        // Test adding a message
        try {
            window.chatInterface.addTestMessage();
            console.log('Test message added successfully');
        } catch (error) {
            console.error('Error adding test message:', error);
        }
    } else {
        console.error('Chat interface not found!');
    }
    
    return elements;
}

// Simple test function to check if send button works
function testSendButton() {
    console.log('Testing send button...');
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        console.log('Send button found:', sendButton);
        console.log('Button disabled:', sendButton.disabled);
        console.log('Button style:', sendButton.style.cssText);
        
        // Try to manually trigger click
        console.log('Manually triggering click...');
        sendButton.click();
    } else {
        console.error('Send button not found!');
    }
}

function openImageModal(imageUrl) {
    // Create modal for full-size image viewing
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Initialize the chat interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing chat interface');
    try {
        window.chatInterface = new ChatInterface();
        console.log('Chat interface initialized successfully');
    } catch (error) {
        console.error('Error initializing chat interface:', error);
    }
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Still loading, DOMContentLoaded will fire
} else {
    // DOM already loaded
    console.log('DOM already loaded, initializing immediately');
    try {
        window.chatInterface = new ChatInterface();
        console.log('Chat interface initialized successfully (fallback)');
    } catch (error) {
        console.error('Error initializing chat interface (fallback):', error);
    }
}

// Handle page visibility changes to pause/resume streaming
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause operations here
    } else {
        // Page is visible again
    }
});

// Handle beforeunload to warn about unsaved changes
window.addEventListener('beforeunload', (e) => {
    const chatInterface = window.chatInterface;
    if (chatInterface && chatInterface.messageHistory.length > 0 && chatInterface.isGenerating) {
        e.preventDefault();
        e.returnValue = 'You have an ongoing conversation. Are you sure you want to leave?';
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatInterface;
}
