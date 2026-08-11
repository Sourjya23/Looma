import { AIService } from '../ai.service.js';
import {
  genres, characters, settings, situations, objects, constraints,
  words, openingSentences, endingSentences, visualSituations
} from './components.js';

export type ComponentType = 
  | 'genre' 
  | 'character' 
  | 'setting' 
  | 'situation' 
  | 'object' 
  | 'constraint' 
  | 'word' 
  | 'openingSentence' 
  | 'endingSentence' 
  | 'visualSituation';

class DynamicComponentCache {
  private queues: Record<ComponentType, string[]> = {
    genre: [...genres],
    character: [...characters],
    setting: [...settings],
    situation: [...situations],
    object: [...objects],
    constraint: [...constraints.advanced],
    word: [...words],
    openingSentence: [...openingSentences],
    endingSentence: [...endingSentences],
    visualSituation: [...visualSituations]
  };

  private fetching: Record<ComponentType, boolean> = {
    genre: false,
    character: false,
    setting: false,
    situation: false,
    object: false,
    constraint: false,
    word: false,
    openingSentence: false,
    endingSentence: false,
    visualSituation: false
  };

  /**
   * Pops a random item from the cache.
   * If the cache drops below a threshold (e.g. 3 items), it triggers a background replenishment.
   */
  public async getComponent(type: ComponentType): Promise<string> {
    const queue = this.queues[type];
    
    // Pick a random item instead of just popping the end, so even our seed list feels random
    const randomIndex = Math.floor(Math.random() * queue.length);
    const item = queue.splice(randomIndex, 1)[0] || 'Unknown';

    // If queue is getting low, trigger background fetch
    if (queue.length < 3 && !this.fetching[type]) {
      this.replenishQueue(type);
    }

    return item;
  }

  private async replenishQueue(type: ComponentType) {
    this.fetching[type] = true;
    try {
      console.log(`[ComponentCache] Replenishing queue for ${type}...`);
      // Ask LLM for 5 new items
      const newItems = await AIService.generateComponents(type, 5);
      
      if (newItems.length > 0) {
        this.queues[type].push(...newItems);
        console.log(`[ComponentCache] Replenished ${type} with ${newItems.length} items. Queue size: ${this.queues[type].length}`);
      }
    } catch (err) {
      console.error(`[ComponentCache] Failed to replenish ${type}:`, err);
    } finally {
      this.fetching[type] = false;
    }
  }
}

export const componentCache = new DynamicComponentCache();
