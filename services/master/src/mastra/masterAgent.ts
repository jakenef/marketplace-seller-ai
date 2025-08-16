import { BuyerMessage, DraftReply, Classified, Appointment } from '@upseller/shared';

interface MasterAgentConfig {
  messengerBaseUrl: string;
  calendarBaseUrl: string;
}

export class MasterAgent {
  private messengerBaseUrl: string;
  private calendarBaseUrl: string;

  constructor(config: MasterAgentConfig) {
    this.messengerBaseUrl = config.messengerBaseUrl;
    this.calendarBaseUrl = config.calendarBaseUrl;
  }

  async processMessage(message: BuyerMessage, mode: 'mock' | 'shadow'): Promise<DraftReply> {
    try {
      // Step 1: Classify the message
      const classification = await this.classifyMessage(message);
      
      // Step 2: Generate negotiation response
      const draft = await this.negotiate(message, classification);
      
      // Step 3: If scheduling is needed, get calendar slots
      if (draft.action === 'schedule_proposal' && !draft.proposedTimes) {
        const slots = await this.getSuggestedSlots();
        draft.proposedTimes = slots;
      }
      
      return draft;
    } catch (error) {
      console.error('Error in master agent:', error);
      // Return fallback response
      return {
        text: 'Thanks for your interest! Let me get back to you shortly.',
        requireHumanClick: true,
      };
    }
  }

  private async classifyMessage(message: BuyerMessage): Promise<Classified> {
    try {
      const response = await fetch(`${this.messengerBaseUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Classification error:', error);
      return { intent: 'availability_check' };
    }
  }

  private async negotiate(message: BuyerMessage, classification: Classified): Promise<DraftReply> {
    try {
      const response = await fetch(`${this.messengerBaseUrl}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, classification }),
      });
      
      if (!response.ok) {
        throw new Error(`Negotiation failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Negotiation error:', error);
      return {
        text: 'Thanks for your message! Let me check and get back to you.',
        requireHumanClick: true,
      };
    }
  }

  private async getSuggestedSlots(): Promise<string[]> {
    try {
      const response = await fetch(`${this.calendarBaseUrl}/suggest-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listing: { id: 'demo', title: 'Demo Listing' },
          windowCount: 2 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Calendar slots failed: ${response.status}`);
      }
      
      const result = await response.json();
      return result.suggested;
    } catch (error) {
      console.error('Calendar slots error:', error);
      return ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'];
    }
  }
}
