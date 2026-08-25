import cloudinary from '../config/cloudinary.js';

export async function generateAndUploadCoverArt(title: string | null, content: string): Promise<string> {
  try {
    // We create a prompt based on the title and a snippet of the content
    const basePrompt = title 
      ? `A visually stunning book cover titled "${title}". ` 
      : `A beautifully designed, atmospheric book cover. `;
      
    const contextSnippet = content.substring(0, 300).replace(/\n/g, ' ').trim();
    
    const finalPrompt = `${basePrompt} The story is about: ${contextSnippet}. High quality digital art, trending on artstation, cinematic lighting, masterpiece, highly detailed, fantasy book cover style, elegant typography layout.`;

    // 1. Fetch image from Pollinations API
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=512&height=768&nologo=true`;
    
    console.log(`Generating cover art with prompt: ${pollinationsUrl}`);
    
    const response = await fetch(pollinationsUrl);
    
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
