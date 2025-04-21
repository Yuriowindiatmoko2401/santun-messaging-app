import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from "dotenv";

config();

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to check if a string is base64
const isBase64 = (str) => {
  try {
    return str.includes('data:image') && str.includes('base64');
  } catch (e) {
    return false;
  }
};

// Helper function to save base64 data to a file
const saveBase64ToFile = async (base64Data, filePath) => {
  // Extract the actual base64 content without the data:image prefix
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }
  
  // Decode base64 data
  const data = Buffer.from(matches[2], 'base64');
  
  // Write to file
  await fs.promises.writeFile(filePath, data);
};

// Local implementation to replace Cloudinary
const cloudinary = {
  uploader: {
    upload: async (filePathOrData, options = {}) => {
      try {
        const fileName = options.public_id || `image_${Date.now()}`;
        let extension = '.jpg'; // Default extension
        const newFileName = `${fileName}${extension}`;
        const destPath = path.join(uploadsDir, newFileName);
        
        // Check if the input is a base64 string or a file path
        if (isBase64(filePathOrData)) {
          // Handle base64 data
          await saveBase64ToFile(filePathOrData, destPath);
        } else {
          // Handle file path
          // Get the extension from the file path
          extension = path.extname(filePathOrData) || '.jpg';
          // Copy file to uploads directory
          await fs.promises.copyFile(filePathOrData, destPath);
        }
        
        return {
          secure_url: `/uploads/${newFileName}`,
          public_id: fileName,
          resource_type: 'image'
        };
      } catch (error) {
        console.error('Error in local file upload:', error);
        console.error(error.stack);
        throw error;
      }
    },
    destroy: async (publicId) => {
      try {
        // Find all files with the public_id prefix
        const files = fs.readdirSync(uploadsDir);
        const fileToDelete = files.find(file => file.startsWith(publicId));
        
        if (fileToDelete) {
          await fs.promises.unlink(path.join(uploadsDir, fileToDelete));
        }
        
        return { result: 'ok' };
      } catch (error) {
        console.error('Error in local file deletion:', error);
        throw error;
      }
    }
  }
};

export default cloudinary;
