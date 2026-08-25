import cloudinary from '../config/cloudinary.js';
import { AIService } from './ai.service.js';
import OpenAI from 'openai';

export async function generateAndUploadCoverArt(title: string | null, content: string): Promise<string> {
  try {
    // Use the advanced AI pipeline to extract visual DNA and compile a prompt
    let finalPrompt = await AIService.generateCoverArtDesignSpec(title, content);
    
    let imageUrl = null;
    
    // 1. Try to use DALL-E 3 if OPENAI_API_KEY is present
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("Generating cover art using DALL-E 3...");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: "1024x1792",
          quality: "hd",
        });
        
        if (imageResponse.data && imageResponse.data[0] && imageResponse.data[0].url) {
          imageUrl = imageResponse.data[0].url;
          console.log("Successfully generated image with DALL-E 3");
        } else {
          console.warn("DALL-E 3 returned no image URL");
        }
      } catch (dalleError) {
        console.error("DALL-E 3 generation failed:", dalleError);
      }
    } 

    // 2. Fallback to Gemini (Imagen 3) if DALL-E 3 failed or skipped
    if (!imageUrl && process.env.GEMINI_API_KEY) {
      try {
        console.log("Falling back to Gemini (Imagen 3)...");
        // Direct REST call to Gemini Imagen endpoint
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`;
        
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instances: [ { prompt: finalPrompt } ],
            parameters: {
              sampleCount: 1,
              aspectRatio: "3:4"
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          // Gemini returns base64 image strings in predictions[0].bytesBase64Encoded
          if (geminiData.predictions && geminiData.predictions[0] && geminiData.predictions[0].bytesBase64Encoded) {
            const base64Data = geminiData.predictions[0].bytesBase64Encoded;
            imageUrl = `data:image/jpeg;base64,${base64Data}`;
            console.log("Successfully generated image with Gemini (Imagen 3)");
          } else {
            console.warn("Gemini returned invalid response structure");
          }
        } else {
          const errData = await geminiRes.text();
          console.error("Gemini Image generation failed:", errData);
        }
      } catch (geminiError) {
        console.error("Gemini generation failed:", geminiError);
      }
    }

    // 3. Ultimate Fallback to Pollinations AI
    if (!imageUrl) {
      console.log("Falling back to Pollinations AI...");
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=512&height=768&nologo=true`;
      console.log(`Generating cover art with Pollinations AI prompt: ${imageUrl}`);
    }

    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image from AI: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload the buffer directly to Cloudinary via stream
    const coverUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'looma_covers',
          resource_type: 'image',
          format: 'webp',
          transformation: [
            { width: 512, height: 768, crop: 'fill' }
          ]
        },
        (error: any, result: any) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Unknown upload error'));
          }
        }
      );

      // Write the buffer to the stream and close it
      uploadStream.end(buffer);
    });

    return coverUrl;
  } catch (error) {
    console.error('Error generating/uploading cover art:', error);
    throw error;
  }
}
