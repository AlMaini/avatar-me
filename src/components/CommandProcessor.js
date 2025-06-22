export class CommandProcessor {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/claude';
    this.outputInterface = null;
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
      
      const response = await this.sendToClaude(command);
      this.sendToOutput(response);
    } catch (error) {
      console.error('Error processing command:', error);
      this.sendToOutput(`Error: ${error.message}`);
    }
  }

  async sendToClaude(message) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
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