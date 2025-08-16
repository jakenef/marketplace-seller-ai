import { BuyerMessage, DraftReply, Classified, Appointment, SellerContext } from '@upseller/shared';

interface MasterAgentConfig {
  messengerBaseUrl: string;
  calendarBaseUrl: string;
  sellerContext?: SellerContext;
}

export class MasterAgent {
  private messengerBaseUrl: string;
  private calendarBaseUrl: string;
  private sellerContext?: SellerContext;
  private conversationHistories: Map<string, BuyerMessage[]> = new Map();

  constructor(config: MasterAgentConfig) {
    this.messengerBaseUrl = config.messengerBaseUrl;
    this.calendarBaseUrl = config.calendarBaseUrl;
    this.sellerContext = config.sellerContext;
  }

  setSellerContext(sellerContext: SellerContext) {
    this.sellerContext = sellerContext;
  }

  // Clear conversation histories (useful for testing)
  clearConversationHistories() {
    this.conversationHistories.clear();
    console.log('All conversation histories cleared');
  }

  // Get conversation history for debugging
  getConversationHistory(listingId: string, buyerId: string): BuyerMessage[] {
    const conversationId = `${listingId}-${buyerId}`;
    return this.conversationHistories.get(conversationId) || [];
  }

  async processMessage(message: BuyerMessage, mode: 'mock' | 'shadow'): Promise<DraftReply> {
    try {
      // Create conversation ID from listing + buyer
      const conversationId = `${message.listingId}-${message.buyerId}`;
      
      // Get or create conversation history for this specific conversation
      let conversationHistory = this.conversationHistories.get(conversationId) || [];
      
      // Add current message to this conversation's history
      conversationHistory.push(message);
      
      // Limit history to last 10 messages to prevent token bloat
      if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
      }
      
      // Store updated history
      this.conversationHistories.set(conversationId, conversationHistory);
      
      // Step 1: Classify the message
      const classification = await this.classifyMessage(message);
      
      // Step 2: Generate negotiation response (pass only this conversation's history)
      console.log(`Processing message for conversation ${conversationId}. History length: ${conversationHistory.length - 1} messages`);
      const draft = await this.negotiate(message, classification, conversationHistory);
      
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

  private async negotiate(message: BuyerMessage, classification: Classified, conversationHistory: BuyerMessage[]): Promise<DraftReply> {
    try {
      // Use default seller context if none provided
      const sellerContext = this.sellerContext || this.getDefaultSellerContext();
      
      const response = await fetch(`${this.messengerBaseUrl}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          classification, 
          sellerContext,
          conversationHistory: conversationHistory.slice(0, -1) // Exclude current message from history
        }),
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

  private getDefaultSellerContext(): SellerContext {
    return {
      sellerName: 'Alex',
      itemName: 'Demo Item',
      description: 'A great item for sale',
      condition: 'Like new',
      targetPrice: 75,
      lowestPrice: 60,
      sellTimeFrame: 'one week',
      meetingLocation: 'Downtown area',
    };
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
