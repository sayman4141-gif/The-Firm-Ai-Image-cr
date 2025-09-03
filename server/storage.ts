import { type User, type InsertUser, type ImageGeneration, type InsertImageGeneration } from "../shared/schema.js";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Image generation methods
  createImageGeneration(generation: InsertImageGeneration): Promise<ImageGeneration>;
  updateImageGeneration(id: string, updates: Partial<Omit<ImageGeneration, 'id'>>): Promise<void>;
  getImageGeneration(id: string): Promise<ImageGeneration | undefined>;
  getImageGenerationByUserAndPrompt(telegramUserId: string, prompt: string): Promise<ImageGeneration | undefined>;
  getRecentImageGenerations(limit: number): Promise<ImageGeneration[]>;
  getBotStats(): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    uniqueUsers: number;
    averageGenerationTime: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private imageGenerations: Map<string, ImageGeneration>;

  constructor() {
    this.users = new Map();
    this.imageGenerations = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createImageGeneration(insertGeneration: InsertImageGeneration): Promise<ImageGeneration> {
    const id = randomUUID();
    const generation: ImageGeneration = {
      id,
      ...insertGeneration,
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      imageUrl: null,
      errorMessage: null,
    };
    this.imageGenerations.set(id, generation);
    return generation;
  }

  async updateImageGeneration(id: string, updates: Partial<Omit<ImageGeneration, 'id'>>): Promise<void> {
    const existing = this.imageGenerations.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.imageGenerations.set(id, updated);
    }
  }

  async getImageGeneration(id: string): Promise<ImageGeneration | undefined> {
    return this.imageGenerations.get(id);
  }

  async getImageGenerationByUserAndPrompt(telegramUserId: string, prompt: string): Promise<ImageGeneration | undefined> {
    return Array.from(this.imageGenerations.values())
      .reverse() // Get most recent first
      .find(gen => gen.telegramUserId === telegramUserId && gen.prompt === prompt);
  }

  async getRecentImageGenerations(limit: number): Promise<ImageGeneration[]> {
    const generations = Array.from(this.imageGenerations.values())
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, limit);
    
    return generations;
  }

  async getBotStats(): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    uniqueUsers: number;
    averageGenerationTime: number;
  }> {
    const generations = Array.from(this.imageGenerations.values());
    const uniqueUsers = new Set(generations.map(g => g.telegramUserId)).size;
    const successfulGenerations = generations.filter(g => g.status === 'completed').length;
    const failedGenerations = generations.filter(g => g.status === 'failed').length;
    
    // Calculate average generation time for completed generations
    const completedWithTiming = generations.filter(g => 
      g.status === 'completed' && g.createdAt && g.completedAt
    );
    
    let averageGenerationTime = 0;
    if (completedWithTiming.length > 0) {
      const totalTime = completedWithTiming.reduce((sum, g) => {
        const start = new Date(g.createdAt!).getTime();
        const end = new Date(g.completedAt!).getTime();
        return sum + (end - start);
      }, 0);
      averageGenerationTime = totalTime / completedWithTiming.length / 1000; // Convert to seconds
    }

    return {
      totalGenerations: generations.length,
      successfulGenerations,
      failedGenerations,
      uniqueUsers,
      averageGenerationTime: Math.round(averageGenerationTime * 100) / 100, // Round to 2 decimal places
    };
  }
}

export const storage = new MemStorage();
