import { GoogleGenAI, Type } from "@google/genai";
import { AIModelResponse, ProcessType, NodeType } from '../types';

export const generateFlowFromPrompt = async (prompt: string): Promise<AIModelResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  // Use 'any' or just standard object for schema if 'Schema' type is not exported by the SDK version
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Short description of what the flow does." },
      nodes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['input', 'default', 'output'] }, // ReactFlow generic types
            position: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
              }
            },
            data: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                type: { type: Type.STRING, enum: [NodeType.INPUT, NodeType.PROCESS, NodeType.OUTPUT, NodeType.EMITTER, NodeType.BRANCH, NodeType.MERGE, NodeType.BATCH, NodeType.SEQUENCE] },
                processType: { 
                    type: Type.STRING, 
                    enum: Object.values(ProcessType),
                    nullable: true 
                },
                params: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    pattern: { type: Type.STRING, nullable: true },
                    replacement: { type: Type.STRING, nullable: true },
                    delimiter: { type: Type.STRING, nullable: true },
                    fieldIndex: { type: Type.INTEGER, nullable: true },
                    batchSize: { type: Type.INTEGER, nullable: true },
                  }
                }
              }
            }
          }
        }
      },
      edges: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            source: { type: Type.STRING },
            target: { type: Type.STRING }
          }
        }
      }
    }
  };

  const systemInstruction = `
    You are a specialized architect for a data processing tool called "FlowPipe".
    Your goal is to translate user natural language requests into a valid graph of nodes and edges.
    
    The user will ask for a text processing task (e.g., "Extract all emails from the text and sort them").
    
    Available Node Types (in data.type):
    1. INPUT: Static text source.
    2. EMITTER: Real-time data stream.
    3. PROCESS: Transformations (Linear) -> 'grep', 'sed', 'awk', 'sort', 'uniq', 'wc'.
    4. BRANCH: Conditional routing.
    5. MERGE: Fan-in aggregation.
    6. BATCH: Windowing/Grouping.
    7. SEQUENCE: Stateful Sequence Matcher. Use this when searching for a specific ordered pattern in a noisy stream (e.g., "Find the sequence 'START' in random noise").
       - Set params.pattern to the sequence to match.
    8. OUTPUT: The end point.
    
    Layout Rules:
    - Nodes should be positioned logically from left to right (x:0, x:250, x:500...).
    
    Example: "Find 'ABC' in the random stream"
    -> Emitter -> Sequence(pattern="ABC") -> Output
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  return JSON.parse(text) as AIModelResponse;
};