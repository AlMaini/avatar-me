export class CommandProcessor {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/claude';
    this.outputInterface = null;
    this.conversationHistory = [];
    this.maxHistoryLength = 20; // Keep last 20 messages to prevent context overflow
  }

  setOutputInterface(outputInterface) {
    this.outputInterface = outputInterface;
  }

  async processCommand(command) {

    if (!this.outputInterface) {
      console.error('Output interface not configured');
      return;
    }

    try {
      this.sendToOutput('Processing command...');
      
      // Add user message to conversation history
      this.addToHistory('user', command);
      
      const response = await this.sendToClaude();
      
      // Add assistant response to conversation history
      this.addToHistory('assistant', response);
      
      this.sendToOutput(response);
    } catch (error) {
      console.error('Error processing command:', error);
      this.sendToOutput(`Error: ${error.message}`);
    }
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    
    // Trim history if it gets too long (keep recent messages)
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async sendToClaude() {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: this.conversationHistory })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.response) {
      return data.response;
    }
    
    throw new Error('Invalid response format from backend');
  }

  sendToOutput(text) {
    if (this.outputInterface) {
      this.outputInterface.streamText(text);
    } else {
      console.log('Output:', text);
    }
  }
}